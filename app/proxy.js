import * as io from 'sdk/io/file';
import * as system from 'sdk/system';
import { Cc, Ci } from 'chrome';
import { URL } from 'sdk/url';
import * as prefsvc from 'sdk/preferences/service';

export class ProxyManager{
  constructor() {
    this.proxySettings = {
      host: '127.0.0.1',
      port: 8080
    };

    this.filters = {};
  }


  enableProxy() {
    console.debug("Enabling Proxy");
    prefsvc.set("network.proxy.http", this.proxySettings.host);
    prefsvc.set("network.proxy.http_port", this.proxySettings.port);
    prefsvc.set("network.proxy.ssl", this.proxySettings.host);
    prefsvc.set("network.proxy.ssl_port", this.proxySettings.port);
    prefsvc.set("network.proxy.type", 1);
  }

  disableProxy() {
    console.debug("Disabling Proxy");
    prefsvc.set("network.proxy.type", 5);
  }
}
