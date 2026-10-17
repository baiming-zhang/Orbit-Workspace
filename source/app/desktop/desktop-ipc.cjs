'use strict';
const { ipcMain, shell, app, dialog, nativeImage, nativeTheme, clipboard } = require('electron');
const { parseMeetingLink } = require('./links.cjs');
const { zoomAppUrl } = require('./links.cjs');
const OrbitI18n = require('../dist/i18n.js');
const { chooseNavigationIcon } = require('./navigation.cjs');
const { portalForUrl } = require('./credentials.cjs');
const OrbitPalette = require('../dist/theme-palette.js');
const fs = require('node:fs');
const path = require('node:path');

// IPC is an adapter over explicit services; window and renderer owners are late-bound.
function registerDesktopIpc({
  credentials,
  downloads,
  downloadsFlyout,
  favorites,
  favoritesFlyout,
  getBackground,
  getBrowser,
  getWindow,
  google,
  launchTargets,
  localApi,
  localEvents,
  loginTracker,
  navigation,
  navigationContextMenu,
  openSafe,
  pendingLaunches,
  settings,
  trusted,
  updater,
  welcome,
}) {
  let latestGmailSummary = null;
  const channels = [];
  function handle(channel, handler) {
    ipcMain.handle(channel, handler);
    channels.push(channel);
  }
  handle('orbit:open-website', async (event, url) => {
    if (!trusted(event)) return { ok: false, error: '未经授权的窗口。' };
    try {
      return getBrowser().open(url, { reuseCurrent: true });
    } catch {
      return { ok: false, error: '无法打开此网页。' };
    }
  });
  handle('orbit:join-zoom', async (event, value, mode) => {
    if (!trusted(event)) return { ok: false, error: '未经授权的窗口。' };
    const meeting = parseMeetingLink(value);
    if (!meeting) return { ok: false, error: '请输入有效的 Zoom 会议链接。' };
    try {
      if (mode === 'app') {
        const deep = zoomAppUrl(meeting);
        if (!deep) return { ok: false, error: '此个人会议链接请使用浏览器加入。' };
        await shell.openExternal(deep);
        return { ok: true };
      }
      return await openSafe(meeting);
    } catch {
      return {
        ok: false,
        error: mode === 'app' ? '未能打开 Zoom 客户端，请使用浏览器加入。' : '未能打开会议链接。',
      };
    }
  });
  const guard =
    (handler) =>
    async (event, ...args) => {
      if (!trusted(event)) return { ok: false, error: '未经授权的窗口。' };
      try {
        return await handler(...args);
      } catch (error) {
        return {
          ok: false,
          error: OrbitI18n.text(error.message || '操作未完成，请重试。', settings.get().language),
        };
      }
    };
  handle(
    'orbit:welcome-claim',
    guard(() =>
      welcome.claim({
        external: launchTargets(process.argv).length > 0 || pendingLaunches.length > 0,
        language: settings.get().language,
      }),
    ),
  );
  handle(
    'orbit:welcome-complete',
    guard(() => welcome.complete()),
  );
  const downloadGuard =
    (handler) =>
    async (event, ...args) => {
      if (!trusted(event) && !downloadsFlyout.trusted(event))
        return { ok: false, error: 'Unauthorized download window.' };
      try {
        return await handler(...args);
      } catch (error) {
        return { ok: false, error: OrbitI18n.text(error.message, settings.get().language) };
      }
    };
  handle(
    'orbit:downloads-get',
    downloadGuard(() => ({ ...downloads.list(), language: settings.get().language })),
  );
  handle(
    'orbit:downloads-action',
    downloadGuard((id, action, value) => downloads.action(id, action, value)),
  );
  handle(
    'orbit:downloads-show',
    guard((bounds) => {
      favoritesFlyout.close();
      return downloadsFlyout.show(bounds);
    }),
  );
  handle(
    'orbit:downloads-menu',
    downloadGuard(() => downloads.menu()),
  );
  handle(
    'orbit:downloads-close',
    downloadGuard(() => downloadsFlyout.close()),
  );
  const favoriteGuard =
    (handler) =>
    async (event, ...args) => {
      if (!trusted(event) && !favoritesFlyout.trusted(event))
        return { ok: false, error: 'Unauthorized window.' };
      try {
        return await handler(...args);
      } catch (error) {
        return { ok: false, error: OrbitI18n.text(error.message, settings.get().language) };
      }
    };
  handle(
    'orbit:favorites-get',
    favoriteGuard(() => ({ ...favorites.list(), timeZone: settings.get().timeZone })),
  );
  handle(
    'orbit:favorites-action',
    favoriteGuard((id, action) => {
      const item = favorites.list().items.find((item) => item.id === id);
      if (!item)
        throw Error(settings.get().language === 'zh' ? '未找到收藏。' : 'Favorite not found.');
      if (action === 'remove') return favorites.remove(id);
      if (action === 'open') {
        favoritesFlyout.close();
        return getBrowser().open(item.sourceUrl, { reuseCurrent: true });
      }
      throw Error(
        settings.get().language === 'zh' ? '不支持此收藏操作。' : 'Unsupported favorite action.',
      );
    }),
  );
  handle(
    'orbit:favorites-show',
    guard((bounds) => {
      downloadsFlyout.close();
      return favoritesFlyout.show(bounds);
    }),
  );
  handle(
    'orbit:favorites-close',
    favoriteGuard(() => favoritesFlyout.close()),
  );
  handle(
    'orbit:navigation-get',
    guard(() => navigation.get()),
  );
  handle(
    'orbit:navigation-save',
    guard((input) => {
      const result = navigation.save(input);
      getBrowser()?.configure(result.items);
      return result;
    }),
  );
  handle(
    'orbit:navigation-delete',
    guard((id) => {
      const result = navigation.remove(id);
      getBrowser()?.remove(id);
      return result;
    }),
  );
  handle(
    'orbit:navigation-category-add',
    guard((input) => navigation.addCategory(input)),
  );
  handle(
    'orbit:navigation-reorder',
    guard((ids) => navigation.reorder(ids)),
  );
  handle(
    'orbit:navigation-icon',
    guard(() =>
      chooseNavigationIcon({
        app,
        dialog,
        nativeImage,
        window: getWindow(),
        language: settings.get().language,
      }),
    ),
  );
  handle(
    'orbit:navigation-menu',
    guard((id) => {
      if (!navigation.get().items.some((item) => item.id === id)) throw Error('导航项不存在。');
      navigationContextMenu(id).popup({ window: getWindow() });
      return { ok: true };
    }),
  );
  handle(
    'orbit:login-settings',
    guard(() => credentials.status()),
  );
  handle(
    'orbit:login-config',
    guard((input) => credentials.configure(input)),
  );
  handle(
    'orbit:login-forget',
    guard((id) => credentials.forget(id)),
  );
  function websiteSender(event) {
    for (const [id, view] of getBrowser()?.views || []) {
      const portal = portalForUrl(event.senderFrame?.url);
      if (
        view.webContents === event.sender &&
        portal &&
        event.senderFrame === event.sender.mainFrame
      )
        return { id, view, portal, url: event.senderFrame.url };
    }
    return null;
  }
  handle('orbit:website-read', (event, username) => {
    const source = websiteSender(event);
    if (!source) return null;
    const entry = loginTracker.read(event.sender, source.url, username);
    return entry ? { ...entry, language: settings.get().language } : null;
  });
  handle('orbit:website-username', (event, username) => {
    const source = websiteSender(event);
    return source ? loginTracker.username(event.sender, source.url, username) : { ok: false };
  });
  handle('orbit:website-stage', (event, input) => {
    const source = websiteSender(event);
    return source ? loginTracker.stage(event.sender, source.url, input) : { ok: false };
  });
  handle('orbit:website-save', (event, input) => {
    const source = websiteSender(event);
    if (!source) return { ok: false };
    try {
      return credentials.remember(source.url, input);
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });
  handle('orbit:website-attempt', (event) => {
    const source = websiteSender(event);
    if (!source || source.view.orbitLoginAttempted || !credentials.read(source.url)?.autoLogin)
      return { ok: false };
    source.view.orbitLoginAttempted = true;
    return { ok: true };
  });
  handle(
    'orbit:language-save',
    guard((language) => {
      const result = settings.saveLanguage(language);
      getBackground()?.updatePresentation();
      downloadsFlyout.update();
      favoritesFlyout.update();
      getBrowser()?.refresh();
      for (const view of getBrowser()?.views.values() || []) {
        if (!view.webContents.isDestroyed())
          view.webContents.send('orbit:language-changed', language);
      }
      return result;
    }),
  );
  handle('orbit:reminder-settings', (event) =>
    getBackground()?.trustedPopup(event) ? settings.get() : null,
  );
  function presentation() {
    return {
      theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
      preference: settings.get().theme,
    };
  }
  function refreshPresentation() {
    const data = presentation();
    if (getWindow() && !getWindow().isDestroyed())
      getWindow().setTitleBarOverlay({
        color: OrbitPalette[data.theme].paper,
        symbolColor: OrbitPalette[data.theme].ink,
        height: 48,
      });
    for (const wc of require('electron').webContents.getAllWebContents()) {
      if (!wc.isDestroyed() && wc.getURL().startsWith('orbit://app/'))
        wc.send('orbit:theme-changed', data);
    }
  }
  nativeTheme.on('updated', refreshPresentation);
  handle('orbit:theme-get', (event) =>
    event.senderFrame === event.sender.mainFrame && event.senderFrame.url.startsWith('orbit://app/')
      ? presentation()
      : null,
  );
  handle(
    'orbit:pdf-preferences-get',
    guard(() => getBrowser().getPdfPreferences()),
  );
  handle(
    'orbit:pdf-preferences-save',
    guard((input) => getBrowser().savePdfPreferences(input)),
  );
  handle(
    'orbit:preferences-save',
    guard((input) => {
      const result = settings.savePreferences(input);
      nativeTheme.themeSource = result.theme;
      getBackground()?.updatePresentation();
      getBackground()?.refreshRemote();
      downloadsFlyout.update();
      favoritesFlyout.update();
      getBrowser()?.refresh();
      for (const wc of require('electron').webContents.getAllWebContents())
        if (!wc.isDestroyed()) wc.send('orbit:language-changed', result.language);
      getBrowser()?.refreshPdf();
      refreshPresentation();
      return result;
    }),
  );
  handle(
    'orbit:profile-save',
    guard((input) => settings.saveProfile(input)),
  );
  handle(
    'orbit:avatar-pick',
    guard(async () => {
      const result = await dialog.showOpenDialog(getWindow(), {
        title: settings.get().language === 'en' ? 'Choose your avatar' : '选择头像',
        properties: ['openFile'],
        filters: [
          {
            name: settings.get().language === 'en' ? 'Images' : '图片',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'],
          },
        ],
      });
      if (result.canceled) return { ok: true, canceled: true };
      if (fs.statSync(result.filePaths[0]).size > 20 * 1024 * 1024)
        throw Error(
          settings.get().language === 'en'
            ? 'Choose an image smaller than 20 MB.'
            : '请选择小于 20 MB 的图片。',
        );
      let image = nativeImage.createFromPath(result.filePaths[0]);
      if (image.isEmpty())
        throw Error(
          settings.get().language === 'en' ? 'Unable to read this image.' : '无法读取此图片。',
        );
      const size = image.getSize(),
        edge = Math.min(size.width, size.height);
      image = image
        .crop({
          x: Math.floor((size.width - edge) / 2),
          y: Math.floor((size.height - edge) / 2),
          width: edge,
          height: edge,
        })
        .resize({ width: 256, height: 256, quality: 'best' });
      return { ok: true, avatar: image.toDataURL() };
    }),
  );
  handle(
    'orbit:update-check',
    guard(() => updater.check()),
  );
  handle(
    'orbit:software-update-state',
    guard(() => updater.getState()),
  );
  handle(
    'orbit:time-zone',
    guard(() => settings.get()),
  );
  handle(
    'orbit:save-time-zone',
    guard((zone) => {
      const result = settings.save(zone);
      getBackground()?.refreshRemote();
      return { ok: true, ...result };
    }),
  );
  handle(
    'orbit:google-connection',
    guard(() => google.connection()),
  );
  handle(
    'orbit:google-config',
    guard((input) => google.saveConnection(input)),
  );
  handle(
    'orbit:google-connect',
    guard(async (options) => {
      const result = await google.connect({ calendarWrite: options?.calendarWrite === true });
      getBackground()?.refreshRemote();
      return result;
    }),
  );
  handle(
    'orbit:google-disconnect',
    guard(async () => {
      const result = await google.disconnect();
      getBackground()?.clearRemote();
      return result;
    }),
  );
  handle(
    'orbit:google-meetings',
    guard(() => google.getMeetings()),
  );
  handle(
    'orbit:gmail-action',
    guard(async (input) => {
      const ids = input?.ids;
      if (
        !Array.isArray(ids) ||
        ids.some(
          (id) =>
            !(
              latestGmailSummary?.unreadIds ||
              latestGmailSummary?.mails?.filter((m) => !m.demo).map((m) => m.id) ||
              []
            ).includes(id),
        )
      )
        throw Error('请刷新概览后重新处理这封邮件。');
      const result = await google.processGmail(input);
      if (result.ids?.length) {
        const done = new Set(result.ids);
        latestGmailSummary = {
          ...latestGmailSummary,
          mails: latestGmailSummary.mails.filter((m) => !done.has(m.id)),
          unreadIds: (latestGmailSummary.unreadIds || []).filter((id) => !done.has(id)),
          count: Math.max(0, latestGmailSummary.count - done.size),
        };
      }
      return result;
    }),
  );
  handle(
    'orbit:calendar-day',
    guard((date) => google.getSchedule(date)),
  );
  handle(
    'orbit:google-summary',
    guard(async () => {
      const result = await google.getSummary();
      latestGmailSummary = result.gmail;
      return result;
    }),
  );
  handle(
    'orbit:open-gmail-message',
    guard((id) => {
      const mail = latestGmailSummary?.mails?.find((m) => m.id === id && !m.demo);
      const thread = mail?.threadId || mail?.id;
      if (!mail || typeof thread !== 'string' || !/^[-A-Za-z0-9_]{1,256}$/.test(thread))
        throw Error(
          settings.get().language === 'en'
            ? 'Refresh Overview and try this message again.'
            : '请刷新概览后重新打开这封邮件。',
        );
      const url = new URL(
        latestGmailSummary.emailAddress
          ? 'https://mail.google.com/mail/'
          : 'https://mail.google.com/mail/u/0/',
      );
      if (latestGmailSummary.emailAddress)
        url.searchParams.set('authuser', latestGmailSummary.emailAddress);
      url.hash = 'all/' + thread;
      return getBrowser().open(url.href, {
        workspace: 'gmail',
        reuseCurrent: true,
        reuseWorkspace: true,
      });
    }),
  );
  handle(
    'orbit:local-events',
    guard(() => localEvents.get()),
  );
  handle(
    'orbit:sync-meetings',
    guard((events) => localEvents.replace(events)),
  );
  handle(
    'orbit:api-status',
    guard(() => localApi.status()),
  );
  handle(
    'orbit:api-config',
    guard((input) => localApi.configure(input)),
  );
  handle(
    'orbit:api-copy',
    guard((kind) => {
      if (!localApi.status().enabled) throw Error('请先开启本机 API。');
      const portable = process.env.PORTABLE_EXECUTABLE_FILE;
      const bridge = app.isPackaged
        ? path.join(path.dirname(portable || app.getPath('exe')), 'orbit-api-bridge.cjs')
        : path.join(__dirname, 'mcp-bridge.cjs');
      const value =
        kind === 'codex'
          ? localApi.codexConfig()
          : kind === 'mcp'
            ? localApi.mcpConfig()
            : kind === 'chatgpt'
              ? localApi.chatgptConfig()
              : localApi.clientConfig();
      clipboard.writeText(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
      return { ok: true };
    }),
  );
  handle('orbit:reminder-data', (event) =>
    getBackground()?.trustedPopup(event) ? getBackground().items() : [],
  );
  handle('orbit:reminder-action', (event, action, id) =>
    getBackground()?.action(event, action, id),
  );
  handle(
    'orbit:show-service',
    guard((id, bounds) => {
      if (id === null) {
        getBrowser().hide();
        return { ok: true };
      }
      return getBrowser().show(bounds, id);
    }),
  );
  handle(
    'orbit:reload-service',
    guard((id) => getBrowser().navigate(id, 'reload')),
  );
  handle(
    'orbit:navigate-website',
    guard((id, action) => getBrowser().navigate(id, action)),
  );
  handle(
    'orbit:workspace-action',
    guard((mode, action, value) => getBrowser().navigate(mode, action, value)),
  );
  handle(
    'orbit:pdf-open',
    guard(() => getBrowser().pick('pdf')),
  );

  return {
    refreshPresentation,
    dispose() {
      for (const channel of channels) ipcMain.removeHandler(channel);
      nativeTheme.removeListener('updated', refreshPresentation);
    },
  };
}
module.exports = { registerDesktopIpc };
