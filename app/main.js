import * as buttons from 'sdk/ui/button/action';
import tabs from 'sdk/tabs';
import { Cc, Ci } from 'chrome';
import { WebsiteManager } from './websitemanager';
import { ProxyManager } from './proxy';

const websiteManager = new WebsiteManager();
const proxy = new ProxyManager();

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
  let active = websiteManager.toggleWebsite(website);

  setTabIcon(tabs.activeTab);

  if (active) {
    proxy.registerFilter(website);
  } else {
    proxy.unregisterFilter(website);
  }

  tabs.activeTab.reload();
}

tabs.on('ready', tab => {
  setTabIcon(tab);
});

websiteManager.getActiveWebsites().forEach(website => {
  proxy.registerFilter(website);
});
