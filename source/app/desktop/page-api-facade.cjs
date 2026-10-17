'use strict';

// The API resolves pages through the same workspace controller as the UI.
function createPageApiFacade(getBrowser) {
  function pages() {
    return getBrowser()?.pages() || [];
  }
  function owner(id) {
    const browser = getBrowser();
    if (!browser?.pages().some((page) => page.id === id)) {
      throw Object.assign(Error('Please open this page in Orbit first.'), {
        statusCode: 404,
        code: 'PAGE_NOT_FOUND',
      });
    }
    return browser;
  }
  const facade = { pages };
  for (const method of [
    'pageText',
    'readPageEditor',
    'writePageEditor',
    'uploadPageFiles',
    'clickPageElement',
    'describePageDom',
  ]) {
    facade[method] = (id, input) => owner(id)[method](id, input);
  }
  return facade;
}

module.exports = { createPageApiFacade };
