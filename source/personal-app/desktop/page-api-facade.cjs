'use strict';

/** Share page operations between sidebar websites and the browser workspace. */
function createPageApiFacade(serviceBrowser, getTabbedBrowser) {
  const providers = () => [serviceBrowser, getTabbedBrowser?.()].filter(Boolean);
  function pages() {
    return providers().flatMap(provider => provider.pages());
  }
  function owner(id) {
    const matches = providers().filter(provider => provider.pages().some(page => page.id === id));
    if (matches.length !== 1) {
      const error = new Error(matches.length ? 'The page identifier is ambiguous.' : 'Please open this page in Orbit first.');
      error.statusCode = matches.length ? 409 : 404;
      error.code = matches.length ? 'PAGE_ID_AMBIGUOUS' : 'PAGE_NOT_FOUND';
      throw error;
    }
    return matches[0];
  }
  const facade = { pages };
  for (const method of ['pageText', 'readPageEditor', 'writePageEditor', 'uploadPageFiles', 'clickPageElement', 'describePageDom']) {
    facade[method] = (id, input) => owner(id)[method](id, input);
  }
  return facade;
}

module.exports = { createPageApiFacade };
