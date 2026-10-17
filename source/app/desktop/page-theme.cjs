'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { BrowserWindow } = require('electron');
const palette = require('../dist/theme-palette.js');
const { isPageOpen } = require('./page-lifecycle.cjs');
const { withTimeout } = require('./async-tasks.cjs');

function installPageTheme({ app, nativeTheme }) {
  const script = fs.readFileSync(path.join(__dirname, 'page-dark.js'), 'utf8');
  const entries = new Map();
  let disposed = false;
  const active = (entry) =>
    !disposed && entries.get(entry.contents) === entry && isPageOpen(entry.contents);

  function isPdf(contents) {
    return (
      /\.pdf(?:[?#]|$)/i.test(contents.getURL()) ||
      contents.mainFrame.framesInSubtree.some((frame) =>
        frame.url.startsWith('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/'),
      )
    );
  }

  function command(contents, method, parameters) {
    return withTimeout(
      contents.debugger.sendCommand(method, parameters),
      1500,
      'Page theme preparation timed out.',
    );
  }

  async function paint(entry) {
    if (!active(entry)) return;
    const contents = entry.contents;
    const address = contents.getURL();
    if (!/^(https?:|file:)/.test(address)) return;
    const pdf = isPdf(contents);
    const dark = nativeTheme.shouldUseDarkColors;
    const current = () => active(entry) && contents.getURL() === address;

    // Presentation is best-effort and always follows navigation. It never owns it.
    try {
      if (!contents.debugger.isAttached() && !contents.isDevToolsOpened())
        contents.debugger.attach('1.3');
      if (contents.debugger.isAttached()) {
        await command(contents, 'Page.enable');
        if (!current()) return;
        await command(contents, 'Emulation.setAutoDarkModeOverride', { enabled: dark && !pdf });
        if (!current()) return;
        if (!pdf && (!entry.scriptId || entry.dark !== dark)) {
          if (entry.scriptId) {
            await command(contents, 'Page.removeScriptToEvaluateOnNewDocument', {
              identifier: entry.scriptId,
            }).catch(() => {});
            if (!current()) return;
          }
          const installed = await command(contents, 'Page.addScriptToEvaluateOnNewDocument', {
            source: 'window.__orbitPageDark=' + dark + ';' + script,
          });
          if (!current()) return;
          entry.scriptId = installed.identifier;
          entry.dark = dark;
        }
      }
    } catch {
      // A page may decline DevTools or close while a command is pending.
    }
    if (!current() || isPdf(contents)) return;
    for (const frame of contents.mainFrame.framesInSubtree) {
      if (/^(https?:|file:)/.test(frame.url))
        frame.executeJavaScript('window.__orbitPageDark=' + dark + ';' + script).catch(() => {});
    }
  }

  function schedule(entry) {
    if (!active(entry)) return;
    entry.pending = true;
    if (entry.running) return;
    entry.running = true;
    (async () => {
      try {
        // Coalesce frame/theme notifications instead of growing a promise chain.
        while (entry.pending && active(entry)) {
          entry.pending = false;
          await paint(entry);
        }
      } finally {
        entry.running = false;
      }
    })().catch(() => {});
  }

  function release(entry) {
    entries.delete(entry.contents);
    entry.pending = false;
    for (const [emitter, event, listener] of entry.listeners)
      emitter.removeListener(event, listener);
    entry.listeners.length = 0;
  }

  function attach(_event, contents) {
    if (disposed || entries.has(contents) || !isPageOpen(contents)) return;
    const entry = {
      contents,
      scriptId: null,
      dark: null,
      pending: false,
      running: false,
      listeners: [],
    };
    entries.set(contents, entry);
    const on = (emitter, event, listener) => {
      emitter.on(event, listener);
      entry.listeners.push([emitter, event, listener]);
    };
    on(contents, 'dom-ready', () => schedule(entry));
    on(contents, 'did-frame-finish-load', () => schedule(entry));
    on(contents, 'devtools-closed', () => schedule(entry));
    on(contents.debugger, 'detach', () => {
      entry.scriptId = null;
    });
    on(contents, 'destroyed', () => release(entry));
  }

  function background(window) {
    if (!window.isDestroyed())
      window.setBackgroundColor(palette[nativeTheme.shouldUseDarkColors ? 'dark' : 'light'].bg);
  }
  const newWindow = (_event, window) => background(window);
  function refresh() {
    for (const entry of entries.values()) schedule(entry);
    for (const window of BrowserWindow.getAllWindows()) background(window);
  }
  app.on('web-contents-created', attach);
  app.on('browser-window-created', newWindow);
  nativeTheme.on('updated', refresh);

  return {
    refresh,
    dispose() {
      if (disposed) return;
      disposed = true;
      app.removeListener('web-contents-created', attach);
      app.removeListener('browser-window-created', newWindow);
      nativeTheme.removeListener('updated', refresh);
      for (const entry of [...entries.values()]) release(entry);
    },
  };
}

module.exports = { installPageTheme };
