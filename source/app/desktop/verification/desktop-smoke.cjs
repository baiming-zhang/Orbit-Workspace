'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { withTimeout } = require('../async-tasks.cjs');

async function verifyDesktop({ app, window, getBrowser, getApi, getBackground, output }) {
  let server;
  const result = { passed: false };
  try {
    assert(
      app.getPath('userData').includes('orbit-build-verification-'),
      'Desktop verification requires an isolated profile.',
    );
    if (output) fs.mkdirSync(output, { recursive: true });
    await window.webContents.executeJavaScript('document.fonts.ready');
    result.ui = await window.webContents.executeJavaScript(
      `({bridge:!!window.orbitDesktop,navigation:document.querySelectorAll('#main-nav [data-nav-id]').length,overflow:document.body.scrollWidth>innerWidth,scrollController:typeof OrbitScheduleScroll==='object'})`,
    );
    assert(
      result.ui.bridge &&
        result.ui.navigation > 0 &&
        !result.ui.overflow &&
        result.ui.scrollController,
    );
    server = http.createServer((_request, response) => {
      response.setHeader('Content-Type', 'text/html');
      response.end('<title>Orbit verification</title><h1>Workspace page ready</h1>');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const browser = getBrowser();
    const target = 'http://127.0.0.1:' + server.address().port + '/';
    const opened = browser.open(target, { workspace: 'browser', reveal: false });
    const tab = browser.tabs.find((item) => item.id === opened.tabId);
    await withTimeout(
      new Promise((resolve) => tab.view.webContents.once('did-finish-load', resolve)),
      8000,
    );
    assert.equal(
      await tab.view.webContents.executeJavaScript('document.querySelector("h1").textContent'),
      'Workspace page ready',
    );
    const api = getApi().clientConfig();
    assert.equal((await fetch(api.url + '/v1/control')).status, 401);
    const control = await fetch(api.url + '/v1/control', { headers: api.headers }).then(
      (response) => response.json(),
    );
    assert(control.pages.some((page) => page.id === tab.id));
    result.apiAndWorkspaceShareOwner = true;
    await browser.automate('close', { id: tab.id });
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert(!browser.tabs.includes(tab) && !window.isDestroyed());
    result.nativePageOpenedAndClosed = true;
    result.singleBrowserController = true;
    result.profileIsolated = true;
    result.passed = true;
    if (output)
      fs.writeFileSync(
        path.join(output, 'desktop-verification.json'),
        JSON.stringify(result, null, 2),
      );
    server.close();
    getBackground()?.dispose();
    getApi().stop();
    app.quit();
  } catch (error) {
    result.error = String(error.stack || error);
    if (output)
      fs.writeFileSync(
        path.join(output, 'desktop-verification.json'),
        JSON.stringify(result, null, 2),
      );
    server?.close();
    app.exit(1);
  }
}

module.exports = { verifyDesktop };
