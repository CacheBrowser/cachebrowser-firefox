import { storage } from 'sdk/simple-storage';
import { URL } from 'sdk/url';

import Events from './lib/minivents';

export class WebsiteManager {
  constructor(ipc) {
    const self = this;
    Events(this);

    this.ipc = ipc;

    this.activeWebsites = new Set();
    this.loadFromStorage(activeWebsites => {
      if (activeWebsites) {
        self.activeWebsites = activeWebsites;
      }
    });
  }

  websiteFromUrl(url) {
    var url = URL(url);
    return url.host;
  }

  isWebsiteActive(website) {
    return this.activeWebsites.has(website);
  }

  toggleWebsite(website) {
    if (this.activeWebsites.has(website)) {
      this.activeWebsites.delete(website);
      this.saveToStorage(this.activeWebsites);
      this.emit('website-changed');
      return false;
    } else {
      this.activeWebsites.add(website);
      this.saveToStorage(this.activeWebsites);
      this.emit('website-changed');
      return true;
    }
  }

  setWebsite(website, active) {
    console.log("Setting active website ", website, active);
    if (!active && this.activeWebsites.has(website)) {
      this.activeWebsites.delete(website);
      this.saveToStorage(this.activeWebsites);
      this.emit('website-changed');
    } else if (active && !this.activeWebsites.has(website)) {
      this.activeWebsites.add(website);
      this.saveToStorage(this.activeWebsites);
      this.emit('website-changed');
    }
  }

  getActiveWebsites() {
    return Array.from(this.activeWebsites);
  }

  getActiveWebsiteCount() {
    return this.activeWebsites.size;
  }

  loadFromStorage(callback) {
    if (callback) {
      callback(storage.activeWebsites);
    }
  }

  saveToStorage(callback, activeWebsites){
    storage.activeWebsites = activeWebsites;
  }
}
