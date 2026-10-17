'use strict';

const { nativeTheme } = require('electron');
const palette = require('../dist/theme-palette.js');
const { isPageOpen } = require('./page-lifecycle.cjs');
const entries = new Map();

function refreshAll() {
  for (const { view, contents } of entries.values()) {
    if (isPageOpen(contents) && view.webContents === contents)
      view.setBackgroundColor(palette[nativeTheme.shouldUseDarkColors ? 'dark' : 'light'].bg);
  }
}

function themeView(view) {
  if (entries.has(view)) return view;
  const contents = view.webContents;
  const refresh = () => {
    if (isPageOpen(contents))
      view.setBackgroundColor(palette[nativeTheme.shouldUseDarkColors ? 'dark' : 'light'].bg);
  };
  const release = () => {
    entries.delete(view);
    contents.removeListener('did-start-navigation', refresh);
    if (!entries.size) nativeTheme.removeListener('updated', refreshAll);
  };
  if (!entries.size) nativeTheme.on('updated', refreshAll);
  entries.set(view, { view, contents });
  contents.on('did-start-navigation', refresh);
  contents.once('destroyed', release);
  refresh();
  return view;
}

module.exports = { themeView };
