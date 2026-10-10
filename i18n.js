(() => {
  const messages = {"text0": {"en": "Feedback ↗", "zh": "反馈建议 ↗"}, "text1": {"en": "Free Download ↗", "zh": "免费下载 ↗"}, "text2": {"en": "A calmer space", "zh": "更从容的空间"}, "text3": {"en": "for your day.", "zh": "让每一天更专注。"}, "text4": {"en": "PDF reading, ChatGPT and Google tools, together in one desktop workspace.", "zh": "在一个桌面工作空间中，整合 PDF 阅读、ChatGPT 与 Google 工具。"}, "text5": {"en": "Free Download for Windows ↗", "zh": "免费下载 Windows 版 ↗"}, "text6": {"en": "Portable · Open source · English & Chinese", "zh": "免安装 · 开源 · 支持中英文"}, "text7": {"en": "Quality", "zh": "画质"}, "text8": {"en": "HD · 30 fps", "zh": "高清 · 30 帧/秒"}, "text9": {"en": "Standard · 24 fps", "zh": "标准 · 24 帧/秒"}, "text10": {"en": "Open the video", "zh": "打开视频"}, "text11": {"en": "Open the release page", "zh": "打开发布页面"}, "text12": {"en": "Why Orbit Workspace?", "zh": "为什么选择 Orbit Workspace？"}, "text13": {"en": "A dedicated paper-and-chat layout, shared sign-in and a resizable split keep the document in view.", "zh": "专为论文与对话设计的布局，共享登录状态，可调整分屏宽度，让文档始终在视线内。"}, "text14": {"en": "Optional Gmail and Calendar summaries, local plans and meeting reminders on one home screen.", "zh": "在一个主页查看可选的 Gmail 与日历摘要、本地计划和会议提醒。"}, "text15": {"en": "Custom navigation, focused reading controls and editable source, with an optional local API / MCP bridge.", "zh": "自定义导航、专注阅读工具与可修改的源码，并可选用本地 API / MCP 桥接。"}, "text16": {"en": "Project & third-party rights notice", "zh": "项目与第三方权益声明"}, "text17": {"en": "MIT License", "zh": "MIT 许可证"}, "text18": {"en": "Contact / rights concerns ↗", "zh": "联系作者 / 权益问题 ↗"}, "text19": {"en": "Read with ChatGPT.", "zh": "与 ChatGPT 一起阅读。"}, "text20": {"en": "Your day, at a glance.", "zh": "一天安排，一目了然。"}, "text21": {"en": "A workspace you can shape.", "zh": "由你塑造的工作空间。"}, "text22": {"en": "downloads", "zh": "下载"}, "text23": {"en": "visits", "zh": "访问"}, "text24": {"en": "Orbit Workspace home", "zh": "Orbit Workspace 主页"}, "text25": {"en": "Project links", "zh": "项目链接"}, "text26": {"en": "Share feedback or a customized Orbit build", "zh": "反馈建议或分享定制版 Orbit"}, "text27": {"en": "Orbit community statistics", "zh": "Orbit 社区统计"}, "text28": {"en": "Like Orbit", "zh": "为 Orbit 点赞"}, "text29": {"en": "Like Orbit — repeat likes welcome", "zh": "为 Orbit 点赞 — 可以重复点赞"}, "text30": {"en": "Orbit demonstration video", "zh": "Orbit 演示视频"}, "text31": {"en": "Orbit Workspace demonstration", "zh": "Orbit Workspace 演示"}, "text32": {"en": "Your browser does not support HTML video.", "zh": "您的浏览器不支持 HTML 视频。"}, "text33": {"en": "Unable to load the video.", "zh": "无法加载视频。"}, "likeError": {"en": "Couldn't save this like. Try again.", "zh": "点赞未能保存，请重试。"}, "visitsCached": {"en": "Last available page-visit count", "zh": "最近可用的页面访问次数"}, "downloadsLive": {"en": "Download button clicks · each click counts immediately", "zh": "下载按钮点击次数 · 每次点击立即计数"}, "downloadsCached": {"en": "Last available download-click count", "zh": "最近可用的下载按钮点击次数"}};
  messages.downloadError = { en: "Couldn't save this download click. Last saved count shown.", zh: "本次下载点击未能保存，当前显示最近保存的计数。" };
  messages.betaNotice = {"en": "Public beta · Features are still being refined. Expect frequent updates and maintenance. Last updated: 2026-10-10 09:43 (UTC−07:00), Vancouver.", "zh": "内测版 · 功能仍在完善，更新和维护会比较频繁。最后更新：2026-10-10 09:43（UTC−07:00），温哥华。"};
  messages.whatsNew = {"en": "What’s new?", "zh": "更新内容"};
  messages.update0 = {"en": "[2026-10-10] Fixed: PDFs open into the reader first while the document loads. Running Orbit receives file requests directly without unpacking the runtime again.", "zh": "[2026-10-10] 修复：先显示 PDF 阅读界面，再加载文档；文件请求直接交给运行中的 Orbit，不再重复解压运行文件。"};
  messages.update1 = {"en": "[2026-10-10] Added: Favorites, selection tools, Google profile defaults with custom avatars and reset, themes, home controls and verified updates.", "zh": "[2026-10-10] 新增：收藏、选中内容快捷操作、Google 默认姓名头像与自定义及恢复默认、主题、主页按钮和校验更新。"};
  messages.update2 = {"en": "[2026-10-10] Fixed: Download links no longer open extra pages. Avatars stay circular, favorites use an outline icon, and settings are simpler.", "zh": "[2026-10-10] 修复：下载不再打开多余网页；头像保持正圆，收藏改为镂空图标，精简设置选项。"};
  const storageKey = 'orbit-workspace:language';
  let language = 'en';
  try { if (localStorage.getItem(storageKey) === 'zh') language = 'zh'; } catch {}
  const t = key => messages[key]?.[language] || key;
  function videoMeta(quality = 'HD') {
    return `${quality === 'low' ? '1280 × 822' : '2560 × 1646'} · 81 ${language === 'zh' ? '秒' : 'seconds'}`;
  }
  function apply() {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    for (const attr of ['aria-label', 'title']) {
      document.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`))));
    }
    document.querySelectorAll('[data-notice]').forEach(el => { el.hidden = el.dataset.notice !== language; });
    const button = document.getElementById('language-toggle');
    button.setAttribute('aria-pressed', String(language === 'zh'));
    button.setAttribute('aria-label', language === 'zh' ? '切换为英文' : 'Switch to Chinese');
    const meta = document.getElementById('meta');
    meta.textContent = videoMeta(meta.dataset.quality);
    document.title = language === 'zh' ? 'Orbit Workspace · 让每一天更从容' : 'Orbit Workspace · A calmer space for your day';
    document.querySelector('meta[name="description"]').content = language === 'zh' ? 'Orbit 将 PDF 阅读、ChatGPT 与 Google 工具整合到一个开源桌面工作空间，在线观看演示。' : 'Orbit brings PDF reading, ChatGPT and Google tools into one open-source desktop workspace. Watch the demo online.';
  }
  messages.likeQueued = {en: 'Saved on this device · syncing automatically', zh: '已保存在此设备，正在自动同步'};
  messages.likeStorageError = {en: 'Unable to store this like. Please allow site storage and try again.', zh: '无法保存此点赞，请允许网站存储后重试。'};
  messages.downloadQueued = {en: 'Download click saved on this device · syncing automatically', zh: '下载点击已保存在此设备，正在自动同步'};
  window.OrbitI18n = { t, apply, videoMeta };
  document.getElementById('language-toggle').addEventListener('click', () => {
    language = language === 'en' ? 'zh' : 'en';
    try { localStorage.setItem(storageKey, language); } catch {}
    apply();
  });
  apply();
})();
