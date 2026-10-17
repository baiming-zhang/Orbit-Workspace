'use strict';
const fs = require('node:fs'),
  path = require('node:path');
function createTabPersistence({
  tabs,
  specs,
  lastActive,
  getWorkspace,
  getActive,
  setSelection,
  create,
  load,
  restoreChat,
  onError = () => {},
}) {
  const { app, safeStorage } = require('electron'),
    filename = path.join(app.getPath('userData'), 'workspace-tabs.enc');
  let timer = null,
    poll = null,
    closed = false,
    failed = false,
    collecting = false,
    waiters = [];
  const valid = (value) => {
    try {
      return (
        typeof value === 'string' &&
        value.length <= 65536 &&
        ['https:', 'http:', 'file:', 'orbit:', 'about:'].includes(new URL(value).protocol)
      );
    } catch {
      return false;
    }
  };
  let saved = null;
  try {
    if (fs.existsSync(filename)) {
      saved = JSON.parse(safeStorage.decryptString(fs.readFileSync(filename)));
      if (saved.version !== 1 || !Array.isArray(saved.tabs))
        throw Error('Invalid saved tab session');
    }
  } catch (error) {
    failed = true;
    onError(error);
  }
  function history(wc) {
    try {
      if (!wc || wc.isDestroyed()) return null;
      const entries = wc.navigationHistory
        .getAllEntries()
        .map(({ url, title }) => ({ url, title }));
      if (!entries.length || entries.some((e) => !valid(e.url))) return null;
      return { entries, index: wc.navigationHistory.getActiveIndex() };
    } catch {
      return null;
    }
  }
  function pane(wc, fallback) {
    try {
      return wc && !wc.isDestroyed()
        ? {
            url: wc.getURL() || fallback || 'about:blank',
            zoom: wc.getZoomFactor(),
            history: history(wc),
          }
        : null;
    } catch {
      return null;
    }
  }
  function snapshot() {
    return {
      version: 1,
      savedAt: Date.now(),
      workspace: getWorkspace(),
      activeKey: getActive(),
      lastActive: Object.fromEntries(lastActive),
      tabs: tabs
        .filter((t) => !t.provisional)
        .map((t) => ({
          key: t.id,
          workspace: t.workspace,
          url: t.url,
          homeUrl: t.homeUrl || t.url,
          title: t.title,
          internal: !!t.internal,
          parentKey: t.parentId || null,
          chatVisible: !!t.chatVisible,
          ratio: t.ratio,
          focusedPane: t.focusedPane || 'page',
          scroll: t.savedViewport || null,
          page: pane(t.view?.webContents),
          chat: pane(t.chat?.webContents, 'https://chatgpt.com/'),
          chatUrl:
            t.chat?.webContents && !t.chat.webContents.isDestroyed()
              ? t.chat.webContents.getURL()
              : null,
        })),
    };
  }
  function save() {
    clearTimeout(timer);
    timer = null;
    if (failed || !safeStorage.isEncryptionAvailable()) return;
    try {
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      fs.writeFileSync(filename + '.tmp', safeStorage.encryptString(JSON.stringify(snapshot())));
      fs.renameSync(filename + '.tmp', filename);
    } catch (error) {
      onError(error);
    }
  }
  function changed() {
    if (closed) return;
    clearTimeout(timer);
    timer = setTimeout(save, 250);
    timer.unref?.();
  }
  async function collect() {
    if (closed) return;
    if (collecting) return new Promise((resolve) => waiters.push(resolve));
    collecting = true;
    try {
      await Promise.all(
        tabs
          .filter((t) => !t.provisional && t.view && !t.view.webContents.isDestroyed())
          .map(async (t) => {
            const wc = t.view.webContents;
            try {
              const frame = wc.mainFrame.framesInSubtree.find((f) =>
                f.url.startsWith('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai'),
              );
              let timeout;
              const result = await Promise.race([
                (frame || wc.mainFrame).executeJavaScript(
                  frame
                    ? `(()=>{const viewer=document.querySelector('pdf-viewer'),v=viewer?.viewport_;return viewer?.loadState_==='success'?{pdf:true,x:v.position.x,y:v.position.y,zoom:v.getZoom(),rotation:v.getClockwiseRotations()}:null})()`
                    : '({x:scrollX,y:scrollY})',
                ),
                new Promise((resolve) => {
                  timeout = setTimeout(() => resolve(null), 1200);
                  timeout.unref?.();
                }),
              ]);
              clearTimeout(timeout);
              if (result) t.savedViewport = result;
            } catch {}
          }),
      );
      if (!closed) save();
    } finally {
      collecting = false;
      for (const resolve of waiters.splice(0)) resolve();
    }
  }
  function applyPosition(t, s) {
    const wc = t.view?.webContents;
    if (!wc || !s) return;
    let attempts = 0;
    const apply = () => {
      if (closed || wc.isDestroyed()) return;
      const frame = s.pdf
        ? wc.mainFrame.framesInSubtree.find((f) =>
            f.url.startsWith('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai'),
          )
        : wc.mainFrame;
      if (!frame) {
        if (attempts++ < 100) setTimeout(apply, 150).unref?.();
        return;
      }
      const expression = s.pdf
        ? `(()=>{const v=document.querySelector('pdf-viewer');if(!v?.viewport_||v.loadState_!=='success')return false;v.viewport_.setZoom(${JSON.stringify(s.zoom || 1)});v.viewport_.scrollTo({x:${Number(s.x) || 0},y:${Number(s.y) || 0}});return true;})()`
        : `scrollTo(${Number(s.x) || 0},${Number(s.y) || 0});true`;
      frame
        .executeJavaScript(expression)
        .then((ok) => {
          if (ok === false && attempts++ < 100) setTimeout(apply, 150).unref?.();
        })
        .catch(() => {});
    };
    wc.once('did-finish-load', apply);
  }
  function restore() {
    if (!saved || failed) return;
    const map = new Map(),
      pending = [];
    for (const s of saved.tabs.slice(0, 4096)) {
      if (!s || typeof s.key !== 'string' || !specs.has(s.workspace) || !valid(s.url)) continue;
      try {
        const t = create(s);
        if (!t) continue;
        map.set(s.key, t.id);
        t.title = typeof s.title === 'string' ? s.title : t.title;
        t.ratio = Number.isFinite(s.ratio) ? Math.max(0.3, Math.min(0.75, s.ratio)) : 0.62;
        t.focusedPane = s.focusedPane === 'chat' ? 'chat' : 'page';
        t.savedViewport = s.scroll || null;
        applyPosition(t, s.scroll);
        pending.push([t, s]);
      } catch (error) {
        onError(error);
      }
    }
    for (const [t, s] of pending) {
      t.parentId = map.get(s.parentKey) || null;
      const wc = t.view?.webContents;
      if (wc) {
        if (Number.isFinite(s.page?.zoom)) wc.setZoomFactor(s.page.zoom);
        const h = s.page?.history;
        const canHistory =
          !t.pdf &&
          h &&
          Array.isArray(h.entries) &&
          h.entries.length &&
          h.entries.every((e) => valid(e.url)) &&
          Number.isInteger(h.index) &&
          h.index >= 0 &&
          h.index < h.entries.length &&
          h.entries[h.index].url === s.url &&
          h.entries[h.index].url !== 'about:blank';
        if (canHistory)
          t.ready
            .then(() => {
              if (!closed && !t.closing && !wc.isDestroyed())
                return wc.navigationHistory.restore(h);
            })
            .catch(() => {
              if (!closed && !t.closing && !wc.isDestroyed()) load(t, s.url);
            });
        else load(t, s.url);
      }
      if (valid(s.chat?.url || s.chatUrl)) {
        restoreChat(t, s.chat?.url || s.chatUrl);
        t.chatVisible = !!s.chatVisible;
        if (Number.isFinite(s.chat?.zoom)) t.chat?.webContents.setZoomFactor(s.chat.zoom);
      }
    }
    for (const [mode, key] of Object.entries(saved.lastActive || {}))
      if (map.has(key)) lastActive.set(mode, map.get(key));
    const mode = specs.has(saved.workspace) ? saved.workspace : pending[0]?.[0].workspace,
      key =
        map.get(saved.activeKey) ||
        lastActive.get(mode) ||
        pending.find(([t]) => t.workspace === mode)?.[0].id;
    if (mode && key) setSelection(mode, key);
  }
  restore();
  poll = setInterval(collect, 5000);
  poll.unref?.();
  return {
    changed,
    save,
    collect,
    snapshot,
    close() {
      if (closed) return;
      clearInterval(poll);
      clearTimeout(timer);
      save();
      closed = true;
    },
  };
}
module.exports = { createTabPersistence };
