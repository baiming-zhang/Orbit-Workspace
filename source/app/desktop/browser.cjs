'use strict';

// Retain the historical module entry point without retaining a second browser engine.
const { createTabbedBrowser, webUrl } = require('./tabbed-browser.cjs');

function createBrowser(options) {
  const workspaceItems =
    options.workspaceItems ||
    Object.entries(options.serviceUrls || {}).map(([id, url]) => ({
      id,
      url,
      name: options.portals?.find((portal) => portal.id === id)?.name || id,
    }));
  const browser = createTabbedBrowser({ ...options, workspaceItems });
  return {
    ...browser,
    show(id, bounds) {
      return id === null ? browser.hide() : browser.show(bounds, id);
    },
  };
}

module.exports = { createBrowser, webUrl };
