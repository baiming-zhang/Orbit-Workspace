const { closePage } = require('./page-lifecycle.cjs');
const { themeView } = require('./view-theme.cjs');
('use strict');
const { WebContentsView, ipcMain } = require('electron'),
  path = require('node:path');
const statusUrl = 'orbit://app/page-status.html';
function createPageStatus({ getLanguage, onChange, onFailure, onAction, onRemoveView = () => {} }) {
  const entries = new Map(),
    sessions = new Map(),
    blankScript = `(()=>{const b=document.body;if(!b)return true;return !b.innerText.trim()&&!b.querySelector('img,svg,canvas,video,audio,iframe,embed,object,input,textarea,button,select')&&!Array.from(b.querySelectorAll('*')).some(e=>e.tagName.includes('-'));})()`;
  function canBack(entry) {
    if (entry.wc.isDestroyed()) return false;
    return (
      entry.wc.navigationHistory.canGoBack() ||
      !!(entry.side === 'page' && entry.tab.parentId) ||
      !!(
        entry.wc.isLoadingMainFrame() &&
        entry.previousUrl &&
        entry.previousUrl !== 'about:blank' &&
        entry.previousUrl !== entry.url
      )
    );
  }
  function cancel(wc) {
    const entry = entries.get(wc);
    if (!entry) return;
    entry.generation++;
    clear(entry);
    entry.cancelled = true;
    wc.stop();
    notify(entry);
  }
  function notify(entry) {
    if (entry.tab.closing || entry.wc.isDestroyed()) return;
    if (
      entry.viewReady &&
      entry.problem &&
      entry.view?.webContents &&
      !entry.view.webContents.isDestroyed()
    )
      entry.view.webContents.send('orbit:page-status', {
        ...entry.problem,
        pane: entry.side,
        language: getLanguage(),
        canBack: canBack(entry),
      });
    onChange(entry.tab);
  }
  function clear(entry) {
    for (const timer of entry.timers) clearTimeout(timer);
    entry.timers = [];
    entry.problem = null;
    entry.dismissed = false;
    entry.tab[entry.side === 'page' ? 'pageProblem' : 'chatProblem'] = null;
  }
  function set(entry, kind, code = '', url = entry.url) {
    if (entry.cancelled || entry.wc.isDestroyed() || entry.tab.closing || entry.tab.downloading)
      return;
    entry.problem = { kind, code: String(code), url };
    entry.dismissed = false;
    entry.tab[entry.side === 'page' ? 'pageProblem' : 'chatProblem'] = entry.problem;
    notify(entry);
    if (entry.side === 'page' && kind !== 'loading') onFailure(entry.tab);
  }
  function schedule(entry, delay, callback) {
    const generation = entry.generation;
    const timer = setTimeout(() => {
      if (entry.generation === generation && !entry.wc.isDestroyed() && !entry.tab.downloading)
        callback();
    }, delay);
    timer.unref?.();
    entry.timers.push(timer);
  }
  async function blank(entry) {
    try {
      const url = entry.wc.getURL();
      if (!url || url === 'about:blank' || (url !== entry.url && entry.wc.isLoadingMainFrame()))
        return true;
      return await Promise.race([
        entry.wc.mainFrame.executeJavaScript(blankScript),
        new Promise((resolve) => {
          const timer = setTimeout(() => resolve(true), 500);
          timer.unref?.();
        }),
      ]);
    } catch {
      return true;
    }
  }
  function watchBlank(entry, attempt = 0) {
    schedule(entry, attempt ? 250 : 0, async () => {
      const gen = entry.generation;
      if (
        entry.downloadNavigation ||
        (entry.problem && !['loading', 'slow', 'empty'].includes(entry.problem.kind))
      )
        return;
      const empty = await blank(entry);
      if (gen !== entry.generation || entry.wc.isDestroyed()) return;
      if (!empty) {
        if (entry.problem) {
          clear(entry);
          notify(entry);
        }
        return;
      }
      if (!entry.problem) set(entry, 'loading');
      if (attempt < 600) watchBlank(entry, attempt + 1);
    });
  }
  function begin(entry, url) {
    clear(entry);
    entry.cancelled = false;
    entry.previousUrl = entry.wc.getURL();
    entry.url = url;
    entry.generation++;
    entry.downloadNavigation = false;
    if (url === 'about:blank' || url.startsWith('chrome-extension:')) {
      notify(entry);
      return;
    }
    if (!entry.previousUrl || entry.previousUrl === 'about:blank') set(entry, 'loading');
    else notify(entry);
    watchBlank(entry);
    schedule(entry, 30000, async () => {
      const gen = entry.generation;
      if (
        (await blank(entry)) &&
        gen === entry.generation &&
        (!entry.problem || entry.problem.kind === 'loading')
      )
        set(entry, 'slow', 'TIMEOUT');
    });
  }
  function attach(wc, tab, side = 'page') {
    const entry = {
      wc,
      tab,
      side,
      url: wc.getURL() || tab.pendingUrl || tab.url,
      generation: 0,
      timers: [],
      problem: null,
      dismissed: false,
      view: null,
      viewReady: false,
    };
    entries.set(wc, entry);
    if (!sessions.has(wc.session)) {
      const handler = (_event, _item, source) => {
        const downloaded = entries.get(source);
        if (downloaded) {
          clear(downloaded);
          downloaded.downloadNavigation = true;
          notify(downloaded);
        }
      };
      wc.session.on('will-download', handler);
      sessions.set(wc.session, handler);
    }
    wc.on('did-start-navigation', (_event, url, inPlace, main) => {
      if (main && !inPlace) begin(entry, url);
    });
    wc.on('did-redirect-navigation', (_event, url, _inPlace, main) => {
      if (main) entry.url = url;
    });
    wc.on('did-fail-provisional-load', (_event, code, _description, _url, main) => {
      if (main && code === -3 && !entry.cancelled)
        schedule(entry, 700, async () => {
          const gen = entry.generation;
          if (
            entry.downloadNavigation ||
            (entry.problem && !['loading', 'slow'].includes(entry.problem.kind)) ||
            entry.wc.isLoadingMainFrame()
          )
            return;
          if ((await blank(entry)) && gen === entry.generation && !entry.downloadNavigation)
            set(entry, 'empty');
        });
    });
    wc.on('did-fail-load', (_event, code, description, url, main) => {
      if (!main || code === -3) return;
      if (entry.url && url && entry.url !== url) return;
      clear(entry);
      entry.url = url || entry.url;
      set(entry, 'network', description || code);
    });
    wc.on('did-navigate', (_event, url, status) => {
      entry.url = url;
      if (status >= 400) {
        clear(entry);
        set(entry, 'http', status, url);
      }
    });
    wc.on('dom-ready', () => {
      if (entry.problem && ['loading', 'slow'].includes(entry.problem.kind)) watchBlank(entry);
    });
    wc.on('did-finish-load', () => {
      if (entry.problem && !['loading', 'slow', 'empty'].includes(entry.problem.kind)) return;
      const gen = entry.generation;
      schedule(entry, 1000, async () => {
        const isBlank = await blank(entry);
        if (gen !== entry.generation || entry.wc.isDestroyed() || entry.downloadNavigation) return;
        clear(entry);
        if (isBlank && entry.url !== 'about:blank' && !tab.pdf) {
          set(entry, 'empty');
          watchBlank(entry);
        } else notify(entry);
      });
    });
    wc.on('responsive', () => {
      if (entry.problem?.kind === 'unresponsive') {
        clear(entry);
        notify(entry);
      }
    });
    wc.on('unresponsive', () => set(entry, 'unresponsive'));
    wc.on('render-process-gone', (_event, details) => {
      clear(entry);
      set(entry, 'crash', details.reason);
    });
    wc.once('destroyed', () => {
      entry.generation++;
      clear(entry);
      entries.delete(wc);
      const view = entry.view;
      entry.view = null;
      if (view) onRemoveView(view);
      const statusContents = view?.webContents;
      if (statusContents && !statusContents.isDestroyed()) closePage(statusContents);
    });
  }
  function viewFor(tab, side) {
    const entry = entries.get(side === 'page' ? tab.view?.webContents : tab.chat?.webContents);
    if (!entry?.problem || entry.dismissed) return null;
    if (!entry.view) {
      entry.view = new WebContentsView({
        webPreferences: {
          preload: path.join(__dirname, 'page-status-preload.cjs'),
          backgroundThrottling: false,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true,
        },
      });
      themeView(entry.view);
      entry.view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      entry.view.webContents.on('will-navigate', (event) => event.preventDefault());
      entry.view.webContents.once('did-finish-load', () => {
        entry.viewReady = true;
        notify(entry);
      });
      entry.view.webContents.loadURL(statusUrl).catch(() => {});
    }
    if (entry.viewReady)
      entry.view.webContents.send('orbit:page-status', {
        ...entry.problem,
        pane: entry.side,
        language: getLanguage(),
        canBack: canBack(entry),
      });
    return entry.view;
  }
  ipcMain.handle('orbit:page-status-action', (event, action) => {
    const entry = [...entries.values()].find((item) => item.view?.webContents === event.sender);
    if (
      !entry ||
      event.senderFrame !== event.sender.mainFrame ||
      event.senderFrame.url !== statusUrl
    )
      return { ok: false };
    if (action === 'original') {
      entry.dismissed = true;
      onChange(entry.tab);
      return { ok: true };
    }
    return onAction(entry, action);
  });
  return {
    attach,
    viewFor,
    cancel,
    dispose() {
      ipcMain.removeHandler('orbit:page-status-action');
      for (const [session, handler] of sessions) session.removeListener('will-download', handler);
      sessions.clear();
      for (const entry of entries.values()) {
        clear(entry);
        if (entry.view?.webContents && !entry.view.webContents.isDestroyed())
          closePage(entry.view.webContents);
      }
      entries.clear();
    },
  };
}
module.exports = { createPageStatus };
