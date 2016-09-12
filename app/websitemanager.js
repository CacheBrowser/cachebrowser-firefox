import { storage } from 'sdk/simple-storage';
import { URL } from 'sdk/url';

export class WebsiteManager {
  constructor(ipc) {
    const self = this;
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
      return false;
    } else {
      this.activeWebsites.add(website);
      return true;
    }
    this.saveToStorage(this.activeWebsites);
  }

  getActiveWebsites() {
    return Array.from(this.activeWebsites);
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
