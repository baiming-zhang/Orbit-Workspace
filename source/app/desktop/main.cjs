let desktopIpc;
const { revealWindow } = require('./window-visibility.cjs');
const { createPageApiFacade } = require('./page-api-facade.cjs');
const { createAutomation } = require('./automation-controller.cjs');
const { enableMicrophone } = require('./media-permissions.cjs');
const {
  app,
  BrowserWindow,
  WebContentsView,
  protocol,
  net,
  shell,
  ipcMain,
  Menu,
  safeStorage,
  clipboard,
  dialog,
  nativeImage,
  nativeTheme,
} = require('electron');
require('./pdf-compatibility.cjs').configurePdfRendering(app);
const OrbitPalette = require('../dist/theme-palette.js');
const pageTheme = require('./page-theme.cjs').installPageTheme({ app, nativeTheme });
app.once('will-quit', () => pageTheme.dispose());
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { externalUrl, parseMeetingLink, zoomAppUrl } = require('./links.cjs');
const { createGoogle } = require('./google.cjs');
const { createTabbedBrowser, launchTargets, webUrl } = require('./tabbed-browser.cjs');
let tabbedBrowser, launchBridge;
const pendingLaunches = [];
const { createLaunchBridge, acceptLaunchRequest } = require('./launch-bridge.cjs');
const { createSettings } = require('./settings.cjs');
const { createUpdater } = require('./updater.cjs');
const { createEvents } = require('./events.cjs');
const { createNavigation, chooseNavigationIcon } = require('./navigation.cjs');
const { createLocalApi } = require('./local-api.cjs');
const { createBackground } = require('./background.cjs');

const { createBrowserSessions } = require('./browser-sessions.cjs');
const { configureBranding, brandWindow, registerShortcut } = require('./windows-branding.cjs');
const OrbitI18n = require('../dist/i18n.js');
const { createDownloads } = require('./downloads.cjs');
const { createDownloadsFlyout } = require('./downloads-flyout.cjs');
const { createFavorites } = require('./favorites.cjs');
const { createFavoritesFlyout } = require('./favorites-flyout.cjs');
let downloads, downloadsFlyout, favorites, favoritesFlyout;

const { createCredentials, portalForUrl } = require('./credentials.cjs');
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'orbit',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);
configureBranding();
// Chromium-owned PDF controls use English; Orbit language labels are handled separately.
app.commandLine.appendSwitch('lang', 'en-US');
const verify = process.argv.includes('--verify-build');
if (verify) {
  app.disableHardwareAcceleration();
  app.setPath('userData', path.join(app.getPath('temp'), 'orbit-build-verification-' + Date.now()));
}
if (!app.requestSingleInstanceLock()) {
  app.quit();
  return;
}
acceptLaunchRequest(process.argv);
const welcome = require('./welcome.cjs').createWelcome(app);
let mainWindow;
downloads = createDownloads({
  app,
  shell,
  dialog,
  Menu,
  getWindow: () => mainWindow,
  getLanguage: () => settings?.get().language || 'en',
  onChange: (data) => {
    downloadsFlyout?.update();
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send('orbit:downloads-changed', data);
  },
});
let google;
let settings;
let localEvents;
let localApi;
let background;
let credentials;
let quitting = false;

let browserSessions;
let quitFlushed = false,
  quitSaving = false;
let navigation;
function navigationContextMenu(id) {
  const item = navigation.get().items.find((item) => item.id === id);
  if (!item) return Menu.buildFromTemplate([]);
  const en = settings?.get().language === 'en',
    label = (zh, english) => (en ? english : zh);
  const send = (action) => mainWindow.webContents.send('orbit:navigation-action', { action, id });
  const update = (patch) => {
    try {
      const result = navigation.save({ id, ...patch });
      tabbedBrowser?.configure(result.items);
      mainWindow.webContents.send('orbit:navigation-action', { action: 'saved', result });
    } catch (error) {
      mainWindow.webContents.send(
        'orbit:notice',
        OrbitI18n.text(error.message, settings?.get().language),
      );
    }
  };
  const categories = navigation.get().categories;
  return Menu.buildFromTemplate([
    { id: 'edit', label: label('编辑', 'Edit'), click: () => send('edit') },
    { type: 'separator' },
    {
      id: 'pin-top',
      label: item.position === 'pinned' ? label('取消置顶', 'Unpin') : label('置顶', 'Pin to top'),
      click: () => update({ position: item.position === 'pinned' ? 'normal' : 'pinned' }),
    },
    {
      id: 'move-bottom',
      label: label('置底', 'Move to bottom'),
      type: 'checkbox',
      checked: item.position === 'bottom',
      click: () => update({ position: item.position === 'bottom' ? 'normal' : 'bottom' }),
    },
    {
      id: 'category',
      label: label('分类', 'Category'),
      submenu: [
        {
          id: 'category-none',
          label: label('未分类', 'Uncategorized'),
          type: 'radio',
          checked: !item.category,
          click: () => update({ category: '' }),
        },
        ...categories.map((category) => ({
          id: 'category-' + category.id,
          label:
            category.id === 'work'
              ? label('工作 · 红色', 'Work · Red')
              : category.id === 'study'
                ? label('学习 · 蓝色', 'Study · Blue')
                : category.id === 'life'
                  ? label('生活 · 黄色', 'Life · Yellow')
                  : category.name,
          type: 'radio',
          checked: item.category === category.id,
          click: () => update({ category: category.id }),
        })),
        { type: 'separator' },
        {
          id: 'new-category',
          label: label('新增分类…', 'Add category…'),
          click: () => send('new-category'),
        },
      ],
    },
    {
      id: 'clear-category',
      label: label('取消分类', 'Remove category'),
      enabled: !!(item.category || item.color),
      click: () => update({ category: '' }),
    },
    { type: 'separator' },
    { id: 'delete', label: label('删除', 'Delete'), click: () => send('delete') },
  ]);
}

function trusted(event) {
  return (
    mainWindow &&
    !mainWindow.isDestroyed() &&
    event.sender === mainWindow.webContents &&
    event.senderFrame?.url.startsWith('orbit://app/')
  );
}
async function openSafe(url) {
  const safe = webUrl(url);
  if (!safe) throw new Error('不支持此链接。');
  return tabbedBrowser.open(safe, { reuseCurrent: true });
}
function createWindow() {
  const startupTargets = launchTargets(process.argv),
    welcomePending = welcome.shouldShow({
      external: startupTargets.length > 0 || pendingLaunches.length > 0,
    });
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 1000,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: OrbitPalette[nativeTheme.shouldUseDarkColors ? 'dark' : 'light'].bg,
    title: 'Orbit Workspace',
    icon: path.join(__dirname, 'assets/icon.png'),
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: OrbitPalette[nativeTheme.shouldUseDarkColors ? 'dark' : 'light'].paper,
      symbolColor: OrbitPalette[nativeTheme.shouldUseDarkColors ? 'dark' : 'light'].ink,
      height: 48,
    },
    show: false,
    webPreferences: {
      additionalArguments: welcomePending ? ['--orbit-welcome-pending'] : [],
      backgroundThrottling: !verify,
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  brandWindow(mainWindow);
  if (!verify) {
    registerShortcut();
    mainWindow.once('ready-to-show', () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.maximize();
      mainWindow.show();
    });
  }
  enableMicrophone(mainWindow.webContents.session);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openSafe(url).catch(() => {});
    return { action: 'deny' };
  });
  mainWindow.webContents.on('context-menu', async (event, params) => {
    const wc = mainWindow?.webContents;
    if (!wc || wc.isDestroyed()) return;
    try {
      if (
        params.isEditable &&
        (await wc.executeJavaScript(
          "document.activeElement?.id==='workspace-address'&&!document.getElementById('workspace-address-form').hidden",
        ))
      ) {
        tabbedBrowser?.showAddressMenu();
        return;
      }
    } catch {}
    if (!wc.isDestroyed()) tabbedBrowser?.showLinkMenu(wc, params, event);
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('orbit://app/')) {
      event.preventDefault();
      openSafe(url).catch(() => {});
    }
  });
  mainWindow.loadURL(
    'orbit://app/index.html' +
      (startupTargets.length
        ? /\.pdf(?:[?#]|$)/i.test(startupTargets[0])
          ? '#pdf'
          : '#browser'
        : ''),
  );
  mainWindow.on('close', (event) => {
    if (!quitting && background) {
      event.preventDefault();
      background.closeToTray();
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  if (verify) {
    const output = process.argv
      .find((value) => value.startsWith('--verify-output='))
      ?.slice('--verify-output='.length);
    mainWindow.webContents.once('did-finish-load', () =>
      require('./verification/desktop-smoke.cjs').verifyDesktop({
        app,
        window: mainWindow,
        getBrowser: () => tabbedBrowser,
        getApi: () => localApi,
        getBackground: () => background,
        output,
      }),
    );
  }
}

app.whenReady().then(() => {
  // Use the persisted appearance after loading settings.
  Menu.setApplicationMenu(null);
  settings = createSettings(app);
  nativeTheme.themeSource = settings.get().theme;
  const updater = createUpdater({
    app,
    net,
    getLanguage: () => settings.get().language,
    onStatus: (data) => mainWindow?.webContents.send('orbit:update-status', data),
    onAvailability: (data) => {
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed())
        mainWindow.webContents.send('orbit:software-update-state', data);
    },
  });
  updater.startAutomaticChecks();
  app.once('will-quit', () => updater.dispose());
  downloadsFlyout = createDownloadsFlyout({
    getWindow: () => mainWindow,
    getData: () => downloads.list(),
    getLanguage: () => settings.get().language,
    onVisibility: (visible) => {
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('orbit:downloads-visibility', visible);
    },
  });
  favorites = createFavorites({
    app,
    getLanguage: () => settings.get().language,
    onChange: () => favoritesFlyout?.update(),
  });
  favoritesFlyout = createFavoritesFlyout({
    getWindow: () => mainWindow,
    getData: () => ({ ...favorites.list(), timeZone: settings.get().timeZone }),
    getLanguage: () => settings.get().language,
    onVisibility: (visible) => {
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('orbit:favorites-visibility', visible);
    },
  });
  navigation = createNavigation({ app });
  google = createGoogle({
    app,
    safeStorage,
    shell,
    getLanguage: () => settings.get().language,
    getTimeZone: () => settings.get().timeZone,
  });
  credentials = createCredentials({ app, safeStorage });
  const loginTracker = require('./login-tracker.cjs').createLoginTracker(credentials);
  browserSessions = createBrowserSessions({ app, safeStorage });
  localEvents = createEvents({
    app,
    safeStorage,
    getTimeZone: () => settings.get().timeZone,
    onChange: (events) => {
      background?.syncLocal(events);
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('orbit:events-changed', events);
    },
  });
  localApi = createLocalApi({
    automation: createAutomation({
      app,
      getBrowser: () => tabbedBrowser,
      getWindow: () => mainWindow,
      downloads,
      favorites,
      navigation,
      settings,
      google,
      onNavigation: (result) => {
        tabbedBrowser?.configure(result.items);
        mainWindow?.webContents.send('orbit:navigation-action', { action: 'saved', result });
      },
    }),
    app,
    safeStorage,
    google,
    events: localEvents,
    browser: createPageApiFacade(() => tabbedBrowser),
    pageActions: createPageApiFacade(() => tabbedBrowser),
    uploadRoots: ['*'],
    getSettings: () => settings.get(),
    onCalendarChange: () => {
      background?.refreshRemote();
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('orbit:data-changed');
    },
  });
  const root = path.resolve(__dirname, '../dist');
  protocol.handle('orbit', (request) => {
    let parsed;
    try {
      parsed = new URL(request.url);
    } catch {
      return new Response('Bad request', { status: 400 });
    }
    if (parsed.hostname === 'favorites') {
      const id = parsed.pathname.match(/^\/([\da-f-]{36})\.png$/)?.[1],
        file = id && favorites.imagePath(id);
      return file && fs.existsSync(file)
        ? net.fetch(pathToFileURL(file).href)
        : new Response('Not found', { status: 404 });
    }
    if (parsed.hostname !== 'app') return new Response('Not found', { status: 404 });
    let pathname;
    try {
      pathname = decodeURIComponent(parsed.pathname);
    } catch {
      return new Response('Bad request', { status: 400 });
    }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).href);
  });
  desktopIpc = require('./desktop-ipc.cjs').registerDesktopIpc({
    credentials,
    downloads,
    downloadsFlyout,
    favorites,
    favoritesFlyout,
    getBackground: () => background,
    getBrowser: () => tabbedBrowser,
    getWindow: () => mainWindow,
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
  });
  app.once('will-quit', () => desktopIpc.dispose());
  createWindow();
  desktopIpc.refreshPresentation();
  tabbedBrowser = createTabbedBrowser({
    onIcon: ({ url, iconData }) => {
      const item = navigation.get().items.find((n) => n.custom && n.url === url && !n.iconData);
      if (!item) return;
      try {
        const result = navigation.save({ id: item.id, iconData });
        tabbedBrowser?.configure(result.items);
        mainWindow?.webContents.send('orbit:navigation-action', { action: 'saved', result });
      } catch {}
    },
    favorites,
    onNotice: (message) => {
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('orbit:notice', message);
    },
    onPin: (input) => {
      const existing = navigation.get().items.find((item) => item.url === input.url);
      const result = existing
        ? input.iconData && input.iconData !== existing.iconData
          ? navigation.save({ id: existing.id, iconData: input.iconData })
          : { ...navigation.get(), item: existing }
        : navigation.save(input);
      tabbedBrowser.configure(result.items);
      mainWindow.webContents.send('orbit:navigation-action', { action: 'saved', result });
      return result;
    },
    workspaceItems: navigation.get().items,
    getLanguage: () => settings.get().language,
    getWindow: () => mainWindow,
    sessions: browserSessions,
    onState: (state) => {
      downloadsFlyout.raise();
      favoritesFlyout.raise();
      if (
        !quitting &&
        mainWindow &&
        !mainWindow.isDestroyed() &&
        !mainWindow.webContents.isDestroyed()
      )
        mainWindow.webContents.send('orbit:workspace-state', state);
    },
    onPage: (page) => {
      if (
        !quitting &&
        mainWindow &&
        !mainWindow.isDestroyed() &&
        mainWindow.webContents &&
        !mainWindow.webContents.isDestroyed()
      )
        mainWindow.webContents.send('orbit:open-page', page);
    },
  });
  const initialTargets = launchTargets(process.argv);
  let initialSelection;
  for (const target of initialTargets)
    initialSelection = tabbedBrowser.open(target, {
      workspace: externalWorkspace(target),
      reveal: false,
    });
  if (initialSelection) {
    const { width, height } = mainWindow.getContentBounds();
    tabbedBrowser.show(
      { x: 0, y: 48, width, height: Math.max(1, height - 48) },
      initialSelection.id,
    );
  }
  mainWindow.webContents.once('did-finish-load', () => {
    const id = initialSelection?.id || tabbedBrowser.current()?.workspace;
    if (id) mainWindow.webContents.send('orbit:open-page', { id });
    tabbedBrowser.warmUp();
  });
  for (const request of pendingLaunches.splice(0)) receiveLaunch(request.argv, request.cwd);
  launchBridge = createLaunchBridge({ app, onOpen: receiveLaunch });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'o') {
      event.preventDefault();
      tabbedBrowser.pick();
    }
  });
  background = createBackground({
    app,
    safeStorage,
    shell,
    google,
    getWindow: () => mainWindow,
    getTimeZone: () => settings.get().timeZone,
    getLanguage: () => settings.get().language,
    openWebsite: async (url) => {
      revealWindow(mainWindow);
      return tabbedBrowser.open(url);
    },
    verify,
  });
  background.start();
  if (localEvents.get().initialized) background.syncLocal(localEvents.get().events);
  localApi.start();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
function externalWorkspace(target) {
  return /\.pdf(?:[?#]|$)/i.test(target) ? 'pdf' : 'browser';
}
function receiveLaunch(argv, cwd) {
  if (!tabbedBrowser) {
    if (pendingLaunches.length < 64) pendingLaunches.push({ argv, cwd });
    return;
  }
  if (!acceptLaunchRequest(argv)) return;
  const maximized = mainWindow?.isMaximized(),
    targets = launchTargets(argv, cwd);
  for (const target of targets) {
    try {
      tabbedBrowser.open(target, { workspace: externalWorkspace(target), reveal: false });
    } catch (error) {
      mainWindow?.webContents.send(
        'orbit:notice',
        OrbitI18n.text(error.message, settings?.get().language),
      );
    }
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    revealWindow(mainWindow, { focus: true, maximized });
  }
}
app.on('second-instance', (_event, argv, cwd) => receiveLaunch(argv, cwd));
app.on('will-quit', () => launchBridge?.dispose());
app.on('before-quit', (event) => {
  quitting = true;
  if (quitFlushed) return;
  event.preventDefault();
  if (quitSaving) return;
  quitSaving = true;
  const shutdownError = (error) => {
    try {
      fs.appendFileSync(
        path.join(app.getPath('userData'), 'orbit-shutdown.log'),
        new Date().toISOString() + ' ' + (error?.stack || error) + '\n',
      );
    } catch {}
  };
  // before-quit fires again after saving the sessions. Destroy each view once.
  for (const cleanup of [
    () => favoritesFlyout?.dispose(),
    () => downloadsFlyout?.dispose(),
    () => background?.dispose(),
    () => google?.dispose(),
    () => localApi?.stop(),
  ])
    try {
      cleanup();
    } catch (error) {
      shutdownError(error);
    }
  Promise.resolve()
    .then(() => tabbedBrowser?.saveSession())
    .catch(shutdownError)
    .then(() => {
      try {
        tabbedBrowser?.dispose();
      } catch (error) {
        shutdownError(error);
      }
      return browserSessions?.flush();
    })
    .catch(shutdownError)
    .finally(() => {
      try {
        browserSessions?.dispose();
      } catch (error) {
        shutdownError(error);
      }
      quitFlushed = true;
      app.quit();
    });
});
app.on('window-all-closed', () => {
  if (quitting) app.quit();
});
