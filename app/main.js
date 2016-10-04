import * as buttons from 'sdk/ui/button/action';
import tabs from 'sdk/tabs';
import { Cc, Ci } from 'chrome';
import { WebsiteManager } from './websitemanager';
import { ProxyManager } from './proxy';
import { IPCManager } from './ipc';

const websiteManager = new WebsiteManager();
const proxy = new ProxyManager();
const ipc = new IPCManager();


var cacheBrowseButton = buttons.ActionButton({
  id: 'cachebrowser-button',
  label: 'CacheBrowser this website',
  icon: './images/icon.png',
  onClick: onCacheBrowseClick
});

function setTabIcon(tab) {
  var website = websiteManager.websiteFromUrl(tab.url);
  var active = websiteManager.isWebsiteActive(website);

  var icon = active ? './images/icon.png' : './images/icon-disabled.png';

  cacheBrowseButton.icon = icon;
}

function onCacheBrowseClick(state) {
  let website = websiteManager.websiteFromUrl(tabs.activeTab.url);
  if (!website) {
    // TODO show message
    return;
  }

  var active = websiteManager.isWebsiteActive(website);
  var route = active ? '/website/disable' : '/website/enable';

  ipc.request(route, {website: website})
    .then(response => {
      if (response.result == 'success') {
        websiteManager.setWebsite(website, !active);
        setTabIcon(tabs.activeTab);
        tabs.activeTab.reload();
      }
    });
}

tabs.on('ready', tab => {
  var website = websiteManager.websiteFromUrl(tab.url);
  if (!website) {
    return;
  }

  setTabIcon(tab);
  ipc.request('/website/enabled', {website: website})
    .then(response => {
      if (response.result != 'success') {
        return;
      }
      websiteManager.setWebsite(website, !!response.enabled);
      setTabIcon(tab);
    });
});

tabs.on('activate', tab => {
  setTabIcon(tab);
});

websiteManager.on('website-changed', () => {
  if (websiteManager.getActiveWebsiteCount() > 0) {
    proxy.enableProxy();
  } else {
    proxy.disableProxy();
  }
});


ipc.on('connect', () => {
  /*ipc.subscribe('request-log', function(message, channel) {
    console.log(message);
  });*/

  ipc.registerRPC('/browser/open', params => {
    tabs.open(params.url);
  });
});
