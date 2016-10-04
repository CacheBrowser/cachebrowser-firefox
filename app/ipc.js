import { Page } from 'sdk/page-worker';

import Events from './lib/minivents';
import Reconnector from './lib/websocket.js';

export class IPCManager {
  constructor() {
    Events(this);
    this.handlers = {};
    this.rpcResponseHandlers = {};
    this.rpcRequestCounter = 0;

    this.rpcRequestMethods = {};

    this.connected = false;

    this.initializePageWorker();
  }

  initializePageWorker() {
    const self = this;

    var pw = Page({
      contentURL: './ipc.html',
    });

    pw.on('error', err => {
      console.log("PageWorker Error ", err);
    });

    pw.port.on('open', () => {
      console.log("IPC connection opened");
      self.connected = true;
      self.emit('connect');
    });

    pw.port.on('close', () => {
      console.log("IPC connection closed");
      self.connected = false;
      self.emit('disconnect');
    });

    pw.port.on('message', message => {
      try {
        message = JSON.parse(message);
      } catch(e) {}
      self.onMessage(message);
    });


    this._send = (message) => {
      if (typeof message !== 'string') {
        message = JSON.stringify(message);
      }
      pw.port.emit('send_message', message);
    };

    this._connect = () => {
      pw.port.emit('connect', 'ws://127.0.0.1:9000')
    };

    pw.port.on('loaded', this._connect);
  }

  onMessage(message) {
    console.log(message);
    if (message.type == 'pub') {
      this.onPublishReceived(message.channel, message.message);
    } else if (message.type == 'rpc_resp') {
      this.onRPCResponseReceived(message);
    } else if (message.type == 'rpc_req') {
      this.onRPCRequestReceived(message);
    }
  }

  onPublishReceived(channel, message) {
    if (!this.handlers[channel]) {
      return;
    }

    for (var i = 0; i < this.handlers[channel].length; i++) {
      this.handlers[channel][i](message, channel);
    }
  }

  onRPCResponseReceived(message) {
    var requestId = message.request_id;
    var response = message.message;

    if (this.rpcResponseHandlers[requestId]) {
      this.rpcResponseHandlers[requestId](response);
      delete this.rpcResponseHandlers[requestId];
    }
  }

  onRPCRequestReceived(message) {
    const self = this;
    var requestId = message.request_id;
    var method = message.method;
    var params = message.params;

    if (this.rpcRequestMethods[method]) {
      var done = response => {
        self.send({
          type: 'rpc_resp',
          request_id: requestId,
          message: response
        });
      }
      this.rpcRequestMethods[method](params, done);
    } else {
      // TODO give error
    }
  }

  subscribe(channel, callback) {
    if (!this.handlers[channel]) {
      this.handlers[channel] = [];
    }

    this.handlers[channel].push(callback);

    return this.send({
      type: 'sub',
      channel: channel
    });
  }

  publish(channel, message) {
    return this.send({
      type: 'pub',
      channel: channel,
      message: message
    });
  }

  request(method, params) {
    const self = this;
    return new Promise((resolve, reject) => {
      var requestId = 10000 + this.rpcRequestCounter++;
      self.rpcResponseHandlers[requestId] = resolve;
      self.send({
        type: 'rpc_req',
        request_id: requestId,
        method: method,
        params: params
      }).catch(err => {
        reject(err);
      });
    });
  }

  registerRPC(method, func) {
    const self = this;
    this.rpcRequestMethods[method] = func;

    return this.send({
      type: 'rpc_reg',
      method: method
    });
  }

  send(message) {
    const self = this;
    return new Promise((resolve, reject) => {
      if (self.connected) {
        try {
          self._send(message);
          resolve();
        } catch (e) {
          reject(e);
        }
      } else {
        reject('not connected');
      }
    });
  }

  connect() {
    this._connect();
  }
}
