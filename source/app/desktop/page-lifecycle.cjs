'use strict';

// Every renderer has one lifetime, shared by navigation, presentation and teardown.
// Keep Electron methods intact; owners explicitly retire a page through closePage.
const pages = new WeakMap();

function pageState(contents) {
  let state = pages.get(contents);
  if (!state) {
    state = { phase: contents.isDestroyed() ? 'closed' : 'open' };
    pages.set(contents, state);
    if (state.phase === 'open') {
      contents.once('destroyed', () => {
        state.phase = 'closed';
      });
    }
  }
  return state;
}

function isPageOpen(contents) {
  return !!contents && pageState(contents).phase === 'open' && !contents.isDestroyed();
}

function closePage(contents, { defer = false } = {}) {
  if (!isPageOpen(contents)) return false;
  const state = pageState(contents);
  // Invalidate asynchronous work before native teardown starts, not after destroyed.
  state.phase = 'closing';
  const finish = () => {
    if (!contents.isDestroyed()) contents.close();
  };
  if (defer) setImmediate(finish);
  else finish();
  return true;
}

module.exports = { isPageOpen, closePage };
