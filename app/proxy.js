import * as io from 'sdk/io/file';
import * as system from 'sdk/system';
import { Cc, Ci } from 'chrome';
import { URL } from 'sdk/url';

export class ProxyManager{
  constructor() {
    this.proxySettings = {
      host: '127.0.0.1',
      port: '8080'
    };

    this.filters = {};
  }

  registerFilter(website) {
    if (this.filters[website]) {
      return;
    }

    const pps = this.getProxyService();

    let httpProxyInfo = pps.newProxyInfo(
      'http',
      this.proxySettings.host,
      this.proxySettings.port,
      0, -1, null
    );
    let httpsProxyInfo = pps.newProxyInfo(
      'https',
      this.proxySettings.host,
      this.proxySettings.port,
      0, -1, null
    );

    var filter = {
      applyFilter: function(pps, uri, proxy)
      {
        let url = URL(uri.spec);
        if (url.host === website) {
          return url.protocol === 'https' ? httpsProxyInfo : httpProxyInfo;
        } else {
          return proxy;
        }
      }
    };

    pps.registerFilter(filter, 100);
    this.filters[website] = filter;
  }

  unregisterFilter(website) {
    if (!this.filters[website]) {
      return;
    }

    const pps = this.getProxyService();
    pps.unregisterFilter(this.filters[website]);
    delete this.filters[website];
  }

  getProxyService() {
    let pps = Cc['@mozilla.org/network/protocol-proxy-service;1'];
    return pps.getService(Ci['nsIProtocolProxyService']);
  }

  generatePAC(activeWebsites) {
    var condition = activeWebsites.length
      ? 'host == "' + activeWebsites.join('" || host == "') + '"'
      : 'false';

      return `
      function FindProxyForURL(url, host) {
      if (${condition}) {
      return "PROXY ${this.proxySettings.host}:${this.proxySettings.port}";
      }
      return "DIRECT";
      }
      `
  }


  updatePAC(activeWebsites, callback) {
    let pacPath = {
      darwin: system.env.HOME + '/Library/Application Support/CacheBrowser/Firefox/proxy.pac',
      winnt: system.env.APPDATA + "\\CacheBrowser\\Firefox\\proxy.pac",
      linux: '/var/local/cachebrowser/firefox/proxy.pac'
    }[system.platform];

    let pac = this.generatePAC(activeWebsites);

    io.mkpath(io.dirname(pacPath));
    let stream = io.open(pacPath, 'w');
    stream.write(pac);
    stream.close();



    if (callback) {
      callback();
    }
  }
}
