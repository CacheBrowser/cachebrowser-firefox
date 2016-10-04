// MIT License:
//
// Copyright (c) 2010-2012, Joe Walnes
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/* eslint-disable */

(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module !== 'undefined' && module.exports){
        module.exports = factory();
    } else {
        global.Reconnector = factory();
    }
})(this, function () {
    function Reconnector(ws, options) {

        var Events = require('./minivents');
        Events(this);
        this.CONNECTING = ws.CONNECTING;
        this.OPEN = ws.OPEN;
        this.CLOSING = ws.CLOSING;
        this.CLOSED = ws.CLOSED;

        // Default settings
        var settings = {

            /** Whether this instance should log debug messages. */
            debug: false,

            /** Whether or not the websocket should attempt to connect immediately upon instantiation. */
            automaticOpen: true,

            /** The number of milliseconds to delay before attempting to reconnect. */
            reconnectInterval: 1000,

            /** The maximum number of milliseconds to delay a reconnection attempt. */
            maxReconnectInterval: 30000,

            /** The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. */
            reconnectDecay: 1.5,

            /** The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. */
            timeoutInterval: 2000,

            /** The maximum number of reconnection attempts to make. Unlimited if null. */
            maxReconnectAttempts: null,

            /** The binary type, possible values 'blob' or 'arraybuffer', default 'blob'. */
            binaryType: 'blob'
        }
        if (!options) { options = {}; }

        // Overwrite and define settings with options if they exist.
        for (var key in settings) {
            if (typeof options[key] !== 'undefined') {
                this[key] = options[key];
            } else {
                this[key] = settings[key];
            }
        }

        // These should be treated as read-only properties

        /** The original Websocket object. Read only. */
        this.ws = ws;

        this.url = ws.url;

        /** The number of attempted reconnects since starting, or the last successful connection. Read only. */
        this.reconnectAttempts = 0;

        /**
         * The current state of the connection.
         * Can be one of: WebSocket.CONNECTING, WebSocket.OPEN, WebSocket.CLOSING, WebSocket.CLOSED
         * Read only.
         */
        this.readyState = this.CONNECTING;

        /**
         * A string indicating the name of the sub-protocol the server selected; this will be one of
         * the strings specified in the protocols parameter when creating the WebSocket object.
         * Read only.
         */
        this.protocol = ws.protocol || null;

        // Private state variables

        var self = this;
        var forcedClose = false;
        var timedOut = false;
        var wsConstructor = ws.constructor;
        var connectionTimeout = null;
        var delayTimeout = null;

        const WS_WC3 = ws.on === undefined;

        this.open = function (reconnectAttempt) {
            if (ws == null) {
                ws = new wsConstructor(self.url, self.protocol || []);
                self.ws = ws;
            }
            ws.binaryType = this.binaryType;

            if (reconnectAttempt) {
                if (this.maxReconnectAttempts && this.reconnectAttempts > this.maxReconnectAttempts) {
                    return;
                }
            } else {
                self.emitEvent('connecting');
                this.reconnectAttempts = 0;
            }

            if (self.debug || Reconnector.debugAll) {
                console.debug('Reconnector', 'attempt-connect', self.url);
            }

            var localWs = ws;

            connectionTimeout = setTimeout(function() {
                if (self.debug || Reconnector.debugAll) {
                    console.debug('Reconnector', 'connection-timeout', self.url);
                }
                connectionTimeout = null;
                timedOut = true;
                localWs.close();
                timedOut = false;
            }, self.timeoutInterval);

            const wsEventHandlers = {
                open: function() {
                    clearTimeout(connectionTimeout);
                    if (self.debug || Reconnector.debugAll) {
                        console.debug('Reconnector', 'onopen', self.url);
                    }
                    self.protocol = ws.protocol;
                    self.readyState = self.OPEN;
                    self.reconnectAttempts = 0;

                    var e = { isReconnect: reconnectAttempt };
                    reconnectAttempt = false;

                    self.emitEvent('open', e);
                },
                close: function(code, reason, wasClean) {
                    clearTimeout(connectionTimeout);
                    ws = null;
                    if (forcedClose) {
                        self.readyState = self.CLOSED;
                        self.emitEvent('close');
                    } else {
                        self.readyState = self.CONNECTING;

                        self.emitEvent('connecting', ['code', code], ['reason', reason], ['wasClean', wasClean]);

                        if (!reconnectAttempt && !timedOut) {
                            if (self.debug || Reconnector.debugAll) {
                                console.debug('Reconnector', 'onclose', self.url);
                            }
                            self.emitEvent('close', ['code', code], ['reason', reason], ['wasClean', wasClean]);
                        }

                        var timeout = self.reconnectInterval * Math.pow(self.reconnectDecay, self.reconnectAttempts);
                        delayTimeout = setTimeout(function() {
                            delayTimeout = null;
                            self.reconnectAttempts++;
                            self.open(true);
                        }, timeout > self.maxReconnectInterval ? self.maxReconnectInterval : timeout);
                    }
                },
                message: function(data) {
                    if (self.debug || Reconnector.debugAll) {
                        console.debug('Reconnector', 'onmessage', self.url, data);
                    }
                    self.emitEvent('message', ['data', data]);
                },
                error: function() {
                    if (self.debug || Reconnector.debugAll) {
                            console.debug('Reconnector', 'onerror', self.url, event);
                    }
                    self.emitEvent('error');
                }
            };

            const EVENTS = ['open', 'close', 'message', 'error'];
            for (var i = 0; i < EVENTS.length; i++) {
                if (!WS_WC3) {
                    ws.on(EVENTS[i], wsEventHandlers[EVENTS[i]]);
                } else {
                    ws['on' + EVENTS[i]] = function(eventType) {
                        return function(event) {
                            switch(eventType) {
                                case 'open':
                                    return wsEventHandlers['open']();
                                case 'close':
                                    return wsEventHandlers['close'](event.code, event.reason, event.wasClean);
                                case 'message':
                                    return wsEventHandlers['message'](event.data);
                                case 'error':
                                    return wsEventHandlers['error']();
                            }
                        }
                    }(EVENTS[i]);
                }
            }
        }

        /**
         * Transmits data to the server over the WebSocket connection.
         *
         * @param data a text string, ArrayBuffer or Blob to send to the server.
         */
        this.send = function(data) {
            if (ws) {
                if (self.debug || Reconnector.debugAll) {
                    console.debug('Reconnector', 'send', self.url, data);
                }
                return ws.send(data);
            } else {
                throw 'INVALID_STATE_ERR : Pausing to reconnect websocket';
            }
        };

        /**
         * Closes the WebSocket connection or connection attempt, if any.
         * If the connection is already CLOSED, this method does nothing.
         */
        this.close = function(code, reason) {
            // Default CLOSE_NORMAL code
            if (typeof code == 'undefined') {
                code = 1000;
            }
            forcedClose = true;
            if (ws) {
                ws.close(code, reason);
            }
        };

        /**
         * Additional public API method to refresh the connection if still open (close, re-open).
         * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
         */
        this.refresh = function() {
            if (ws) {
                ws.close();
            }
        };

        this.refreshDelay = function() {
            this.reconnectAttempts = 0;
        }

        this.forceReconnect = function() {
            var reconnect = false;
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                reconnect = true;
            }
            if (delayTimeout) {
                clearTimeout(delayTimeout);
                reconnect = true;
            }
            ws = null;
            this.open(reconnect);
        }

        this.emitEvent = function(type) {
            var args = [type];
            for (var i = 1; i < arguments.length; i++) {
                args.push(arguments[i][1]);
            }
            this.emit.apply(this, args);
        }


        if (Reconnector.EventEmitter) {
            // Reconnector.EventEmitter.call(this);
            this.on('error', function() {});
        }

        // Whether or not to create a websocket upon instantiation
        if (this.automaticOpen == true) {
            this.open(false);
        }
    }


    Reconnector.debugAll = false;

    return Reconnector;
});
