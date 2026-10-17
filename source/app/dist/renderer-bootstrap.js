'use strict';
// Register UI and native events once, then hydrate and render the workspace.
let rendererInitialized = false;
function registerRendererUiEvents() {
  window.addEventListener('resize', syncNativeView);
  $('#modal').addEventListener('close', () => {
    applyNavigationSpacing();
    applyFontScale();
    syncNativeView();
  });
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const id = el.dataset.id;
    switch (el.dataset.action) {
      case 'check-update':
        checkOrbitUpdate();
        break;
      case 'upload-avatar':
        uploadProfileAvatar();
        break;
      case 'remove-avatar':
        removeProfileAvatar();
        break;
      case 'profile-google':
        connectionChoice();
        break;
      case 'workspace-overview':
        prefs.sidebarCollapsed = false;
        applySidebarState();
        saveUiPreferences();
        if (location.hash === '#overview') {
          render();
          refreshSummary();
          refreshMeetings();
        } else location.hash = 'overview';
        break;
      case 'workspace-home':
        window.orbitDesktop?.navigateWebsite(state.page, 'home');
        break;
      case 'account':
        accountModal();
        break;
      case 'api-settings':
        apiSettingsModal();
        break;
      case 'copy-api':
        copyApiConfig(el.dataset.kind);
        break;
      case 'rotate-api':
        configureApi({ rotate: true });
        break;
      case 'calendar-write':
        enableCalendarWrite();
        break;
      case 'refresh-meetings':
        refreshMeetings();
        break;
      case 'refresh-summary':
        refreshSummary();
        break;
      case 'join-zoom':
        joinZoom(id, el.dataset.mode);
        break;
      case 'connect-google':
      case 'connect-google-default':
        beginGoogleConnection();
        break;
      case 'edit-google-config':
        connectionModal();
        break;
      case 'disconnect-google':
        disconnectGoogle();
        break;
      case 'native-back':
        window.orbitDesktop?.navigateWebsite(state.page, 'back');
        break;
      case 'native-forward':
        window.orbitDesktop?.navigateWebsite(state.page, 'forward');
        break;
      case 'reload-native':
        window.orbitDesktop?.reloadService(state.page);
        break;
      case 'settings':
        settingsModal();
        break;
      case 'login-settings':
        loginSettingsModal();
        break;
      case 'forget-login':
        forgetLogin(el.dataset.site);
        break;
      case 'close-modal':
        closeModal();
        break;
      case 'new-navigation':
        navigationModal();
        break;
      case 'navigation-icon':
        pickNavigationIcon();
        break;
      case 'navigation-icon-default':
        if (navigationDraft) {
          navigationDraft.iconData = '';
          updateNavigationPreview();
        }
        break;
      case 'menu':
        $('#sidebar').classList.toggle('open');
        break;
      case 'notifications':
        notificationsModal();
        break;
      case 'notifications-read-all':
        markNotificationsRead();
        break;
      case 'notification-read':
        markNotificationsRead(el.dataset.id);
        break;
      case 'toggle-sidebar':
        toggleSidebar();
        break;
      case 'live-mail-read':
        processLiveMail('read', id);
        break;
      case 'live-mail-trash':
        processLiveMail('trash', id);
        break;
      case 'open-live-mail': {
        e.preventDefault();
        window.orbitDesktop
          ?.openGmailMessage(id)
          .then((result) => {
            if (!result.ok) toast(result.error);
          })
          .catch(() =>
            toast(
              prefs.language === 'en'
                ? 'Unable to open this Gmail message.'
                : '无法打开这封 Gmail 邮件。',
            ),
          );
        break;
      }
      case 'read-mail':
        readMail(id);
        break;
      case 'compose':
        composeModal();
        break;
      case 'reply':
        composeModal(
          null,
          state.mails.find((m) => String(m.id) === id),
        );
        break;
      case 'star': {
        e.stopPropagation();
        const m = state.mails.find((m) => String(m.id) === id);
        if (m) {
          m.starred = !m.starred;
          persist();
          render();
        }
        break;
      }
      case 'archive-mail': {
        const m = state.mails.find((m) => String(m.id) === id);
        if (m) {
          m.archived = !m.archived;
          persist();
          closeModal();
          render();
          toast(m.archived ? '邮件已归档至本地归档箱。' : '邮件已移回收件箱。');
        }
        break;
      }
      case 'mail-filter':
        state.mailFilter = el.dataset.filter;
        render();
        break;

      case 'calendar-prev':
      case 'calendar-next': {
        const step = el.dataset.action === 'calendar-next' ? 1 : -1;
        if (state.calendarView === 'week')
          state.calendarDate.setDate(state.calendarDate.getDate() + 7 * step);
        else
          state.calendarDate = new Date(
            state.calendarDate.getFullYear(),
            state.calendarDate.getMonth() + step,
            1,
          );
        render();
        break;
      }
      case 'calendar-today':
        state.calendarDate = new Date(currentDate);
        render();
        break;
      case 'calendar-view':
        state.calendarView = el.dataset.view;
        render();
        break;
      case 'schedule-remove':
        removeScheduleRecord(id);
        break;
      case 'schedule-complete':
        toggleScheduleCompleted(id);
        break;
      case 'schedule-prev':
        selectScheduleDate(shiftScheduleDate(selectedScheduleDate(), -1));
        break;
      case 'schedule-next':
        selectScheduleDate(shiftScheduleDate(selectedScheduleDate(), 1));
        break;
      case 'schedule-today':
        selectScheduleDate(today);
        break;
      case 'schedule-retry':
        refreshSchedule();
        break;
      case 'new-event':
        eventModal(state.page === 'overview' ? selectedScheduleDate() : today);
        break;
      case 'new-event-date':
        eventModal(el.dataset.date);
        break;
      case 'view-event':
        viewEvent(id);
        break;
      case 'edit-event':
        eventModal(today, findEvent(id));
        break;
      case 'delete-event':
        state.events = state.events.filter((e) => e.id !== id);
        persist();
        closeModal();
        render();
        toast('本地日程已删除。');
        break;
      case 'search-submit':
        $('#google-search')?.requestSubmit();
        break;
      case 'search-chip':
        searchGoogle(el.dataset.query);
        break;
      case 'clear-history':
        state.history = [];
        persist();
        render();
        toast('搜索记录已清除。');
        break;
    }
  });
  document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (!form.dataset.form) return;
    e.preventDefault();
    const f = new FormData(form);
    switch (form.dataset.form) {
      case 'navigation':
        await saveNavigationForm(form, f);
        break;
      case 'search':
        searchGoogle(f.get('query'));
        break;
      case 'compose': {
        const existing = state.mails.find((m) => String(m.id) === form.dataset.id);
        const m = {
          id: existing?.id || Date.now(),
          sender: '我 · 草稿',
          initial: 'U',
          email: f.get('to'),
          subject: f.get('subject'),
          body: f.get('body'),
          preview: f.get('body').slice(0, 50),
          time: '刚刚',
          color: 'green',
          draft: true,
          unread: false,
          starred: existing?.starred || false,
        };
        if (existing) Object.assign(existing, m);
        else state.mails.unshift(m);
        persist();
        closeModal();
        state.mailFilter = 'draft';
        location.hash = 'gmail';
        render();
        toast('草稿已保存到当前浏览器。');
        break;
      }
      case 'event': {
        const existing = state.events.find((e) => e.id === form.dataset.id);
        const event = {
          id: existing?.id || 'e' + Date.now(),
          title: f.get('title'),
          date: f.get('date'),
          time: f.get('time'),
          duration: Number(f.get('duration')),
          type: f.get('type'),
          location: f.get('location'),
          notes: f.get('notes'),
          zoomLink:
            (f.get('zoomLink') || '').trim() ||
            OrbitSchedule.zoomLink({ location: f.get('location'), notes: f.get('notes') }),
        };
        if (event.zoomLink && !validateZoom(event.zoomLink)) {
          toast('请输入有效的 HTTPS Zoom 会议邀请链接。');
          return;
        }
        try {
          event.startAt = OrbitTime.localInstant(event.date, event.time, prefs.timeZone);
          event.timeZone = prefs.timeZone;
        } catch (error) {
          toast(error.message);
          return;
        }
        if (existing) Object.assign(existing, event);
        else state.events.push(event);
        state.calendarDate = dateObject(event.date);
        persist();
        closeModal();
        render();
        toast(existing ? '日程已更新。' : '日程已保存，开始前 5 分钟会提醒你。');
        break;
      }
      case 'api-settings':
        configureApi({ enabled: f.has('enabled') });
        break;
      case 'connection':
        saveConnection(form, f);
        break;
      case 'login-settings':
        saveLoginPreferences(f);
        break;
      case 'profile':
        await savePersonalProfile(f);
        break;
      case 'settings': {
        let zone;
        try {
          zone = OrbitTime.normalize(
            f.get('timeZone') === 'custom' ? f.get('utcOffset') : f.get('timeZone'),
          );
        } catch (error) {
          toast(error.message);
          return;
        }
        const language = f.get('language') === 'en' ? 'en' : 'zh',
          theme = f.get('theme') || 'system';
        if (window.orbitDesktop) {
          const result = await window.orbitDesktop.savePreferences({
            timeZone: zone,
            language,
            theme,
          });
          if (!result.ok) {
            toast(result.error);
            return;
          }
        }
        prefs.language = language;
        prefs.theme = theme;
        applyTimeZone(zone);
        futureMeetings = { status: 'loading', events: [] };
        prefs.navigationSpacing = Math.max(
          -20,
          Math.min(24, Number(f.get('navigationSpacing')) || 0),
        );
        prefs.fontScale = Number(f.get('fontScale'));
        prefs.weekStart = f.get('weekStart');
        persist();
        closeModal();
        render();
        toast('偏好设置已保存。');
        refreshSummary();
        refreshMeetings();
        break;
      }
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if ($('#modal').open) return;
      const input = $('.hero-search input');
      if (input) input.focus();
      else {
        location.hash = 'search';
        requestAnimationFrame(() => $('.hero-search input')?.focus());
      }
    }
    if (e.key === 'Enter' && e.target.matches('[role="button"][data-action]')) {
      e.preventDefault();
      e.target.click();
    }
  });
  modalDialog.addEventListener('pointerdown', (event) => {
    backdropPress = event.button === 0 && outsideModal(event);
  });
  modalDialog.addEventListener('pointercancel', () => {
    backdropPress = false;
  });
  modalDialog.addEventListener('close', () => {
    backdropPress = false;
  });
  modalDialog.addEventListener('click', (event) => {
    const dismiss = backdropPress && outsideModal(event);
    backdropPress = false;
    if (dismiss) closeModal();
  });
  document.addEventListener(
    'click',
    (e) => {
      const link = e.target.closest('a[href]');
      if (link && /^https?:/i.test(link.getAttribute('href'))) {
        e.preventDefault();
        openWebsite(link.href);
      }
    },
    true,
  );
  document.addEventListener('input', (e) => {
    if (e.target.id === 'ui-font-scale') {
      $('#font-scale-value').textContent = e.target.value + '%';
      applyFontScale(e.target.value);
    }
  });
  window.addEventListener('hashchange', route);
  document.addEventListener('change', (e) => {
    if (e.target.id === 'calendar-time-zone')
      $('#custom-zone-field').hidden = e.target.value !== 'custom';
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'navigation-spacing') {
      $('#navigation-spacing-value').textContent = e.target.value + ' px';
      applyNavigationSpacing(e.target.value);
    }
  });
  window.addEventListener('focus', () => {});
  document.addEventListener('change', (event) => {
    if (event.target.matches('.schedule-date-input')) selectScheduleDate(event.target.value);
  });
}
function registerRendererDesktopEvents() {
  window.orbitDesktop?.onOpenPage(acceptBrowserPage);
  window.orbitDesktop?.onEventsChanged((events) => {
    state.events = events;
    applyTimeZone(prefs.timeZone);
    try {
      localStorage.setItem(
        'orbit:state',
        JSON.stringify({ mails: state.mails, events: state.events, history: state.history }),
      );
    } catch {}
    if (!$('#modal').open) render();
  });
  window.orbitDesktop?.onDataChanged(() => {
    refreshSummary();
    refreshMeetings();
  });
}
function startRendererTimers() {
  setInterval(() => {
    if (!document.querySelector('#modal').open) {
      if (state.page === 'zoom') {
        refreshMeetings();
        refreshSummary();
      }
    }
  }, 300000);
  setInterval(() => {
    if (!$('#modal').open) {
      if (state.page === 'zoom') render();
      else updateScheduleChecks();
    }
  }, 30000);
}
function hydrateDesktopState() {
  if (!window.orbitDesktop) return;
  return Promise.all([window.orbitDesktop.getTimeZone(), window.orbitDesktop.getLocalEvents()])
    .then(([r, saved]) => {
      if (saved.initialized) state.events = saved.events;
      for (const key of ['theme', 'displayName', 'avatar'])
        if (r[key] !== undefined) prefs[key] = r[key];
      if (r.language) prefs.language = r.language;
      if (r.timeZone) applyTimeZone(r.timeZone);
      if (!saved.initialized) window.orbitDesktop.syncMeetings(state.events);
      render();
      refreshSummary();
    })
    .catch((error) => toast(error?.message || '无法读取桌面数据，请稍后重试。'));
}
function initializeRenderer() {
  if (rendererInitialized) return;
  rendererInitialized = true;
  registerRendererUiEvents();
  registerRendererDesktopEvents();
  injectIcons();
  route();
  loadNavigation();
  hydrateDesktopState();
  startRendererTimers();
}
initializeRenderer();
