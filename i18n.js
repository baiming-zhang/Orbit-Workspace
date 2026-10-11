(() => {
  const messages = {"text0": {"en": "Feedback ↗", "zh": "反馈建议 ↗"}, "text1": {"en": "Free Download ↗", "zh": "免费下载 ↗"}, "text2": {"en": "A calmer space", "zh": "更从容的空间"}, "text3": {"en": "for your day.", "zh": "让每一天更专注。"}, "text4": {"en": "PDF reading, ChatGPT and Google tools, together in one desktop workspace.", "zh": "在一个桌面工作空间中，整合 PDF 阅读、ChatGPT 与 Google 工具。"}, "text5": {"en": "Free Download for Windows ↗", "zh": "免费下载 Windows 版 ↗"}, "text6": {"en": "Portable · Open source · English & Chinese", "zh": "免安装 · 开源 · 支持中英文"}, "text7": {"en": "Quality", "zh": "画质"}, "text8": {"en": "HD · 30 fps", "zh": "高清 · 30 帧/秒"}, "text9": {"en": "Standard · 24 fps", "zh": "标准 · 24 帧/秒"}, "text10": {"en": "Open the video", "zh": "打开视频"}, "text11": {"en": "Open the release page", "zh": "打开发布页面"}, "text12": {"en": "Why Orbit Workspace?", "zh": "为什么选择 Orbit Workspace？"}, "text13": {"en": "Keep your PDF beside ChatGPT, with automatic PDF attachment and a resizable split.", "zh": "PDF 与 ChatGPT 并排阅读，自动附加当前 PDF，自由调整分屏宽度。"}, "text14": {"en": "Optional Gmail and Calendar summaries, local plans and meeting reminders on one home screen.", "zh": "在一个主页查看可选的 Gmail 与日历摘要、本地计划和会议提醒。"}, "text15": {"en": "Pin and categorize workspaces, save text/image favorites, and use the optional local API / MCP bridge.", "zh": "置顶与分类工作台，收藏文字和图片，并可选用本地 API / MCP 桥接。"}, "text16": {"en": "Project & third-party rights notice", "zh": "项目与第三方权益声明"}, "text17": {"en": "MIT License", "zh": "MIT 许可证"}, "text18": {"en": "Contact / rights concerns ↗", "zh": "联系作者 / 权益问题 ↗"}, "text19": {"en": "Read with ChatGPT.", "zh": "与 ChatGPT 一起阅读。"}, "text20": {"en": "Your day, at a glance.", "zh": "一天安排，一目了然。"}, "text21": {"en": "A workspace you can shape.", "zh": "由你塑造的工作空间。"}, "text22": {"en": "downloads", "zh": "下载"}, "text23": {"en": "visits", "zh": "访问"}, "text24": {"en": "Orbit Workspace home", "zh": "Orbit Workspace 主页"}, "text25": {"en": "Project links", "zh": "项目链接"}, "text26": {"en": "Share feedback or a customized Orbit build", "zh": "反馈建议或分享定制版 Orbit"}, "text27": {"en": "Orbit community statistics", "zh": "Orbit 社区统计"}, "text28": {"en": "Like Orbit", "zh": "为 Orbit 点赞"}, "text29": {"en": "Like Orbit — repeat likes welcome", "zh": "为 Orbit 点赞 — 可以重复点赞"}, "text30": {"en": "Orbit demonstration video", "zh": "Orbit 演示视频"}, "text31": {"en": "Orbit Workspace demonstration", "zh": "Orbit Workspace 演示"}, "text32": {"en": "Your browser does not support HTML video.", "zh": "您的浏览器不支持 HTML 视频。"}, "text33": {"en": "Unable to load the video.", "zh": "无法加载视频。"}, "likeError": {"en": "Couldn't save this like. Try again.", "zh": "点赞未能保存，请重试。"}, "visitsCached": {"en": "Last available page-visit count", "zh": "最近可用的页面访问次数"}, "downloadsLive": {"en": "Download button clicks · each click counts immediately", "zh": "下载按钮点击次数 · 每次点击立即计数"}, "downloadsCached": {"en": "Last available download-click count", "zh": "最近可用的下载按钮点击次数"}};
  messages.downloadError = { en: "Couldn't save this download click. Last saved count shown.", zh: "本次下载点击未能保存，当前显示最近保存的计数。" };
  messages.betaNotice = {"en": "Public beta · Features are still being refined. Expect frequent updates and maintenance. Last updated: 2026-10-10 18:14 (UTC-7), Vancouver.", "zh": "内测版 · 功能仍在完善，更新和维护会比较频繁。最后更新：2026-10-10 18:14（UTC-7），温哥华。"};
  messages.fullLog = {en:"Full changelog ↗",zh:"完整更新日志 ↗"};
  messages.whatsNew = {"en": "What’s new?", "zh": "更新内容"};
  messages.update0 = {"en": "[2026-10-10] Added: Add webpages to sidebar workspaces with their titles and favicons. Remove category directly from the workspace menu without changing its pinned or bottom position.", "zh": "[2026-10-10] 新增：网页可带标题和图标加入左侧工作台；工作台菜单增加独立取消分类，保留置顶或置底位置。"};
  messages.update1 = {"en": "[2026-10-10] Added: Weekly software update checks show red dots on your avatar and the software-update button when a new version is available.", "zh": "[2026-10-10] 新增：每周自动检查软件更新；有新版时头像和个人页面的检查软件更新按钮显示红点。"};
  messages.update2 = {"en": "[2026-10-10] Fixed: Native tab icons and live titles, URL selection cleared on blur, and language choices displayed in their native names.", "zh": "[2026-10-10] 修复：标签原生图标与实时标题、离开地址栏取消选区，语言选项始终显示对应母语名称。"};
  messages.thanksTitle = {"en": "You found a little treasure!", "zh": "恭喜你发现宝藏啦！"};
  messages.thanksBody = {"en": "Thanks for choosing Orbit. May your day be full of bright ideas ✨", "zh": "感谢使用 Orbit，祝你今天灵感满满 ✨"};
  messages.thanksClose = {"en": "Close", "zh": "关闭"};
  Object.assign(messages, {"securityTitle": {"en": "Windows download & security notice", "zh": "Windows 下载与安全提示"}, "securityUnsigned": {"en": "Orbit has not yet obtained a code-signing certificate, and its current Windows executable is unsigned. Some users have reported that Microsoft Smart App Control blocks it.", "zh": "Orbit 尚未申请代码签名证书，目前发布的 Windows 程序没有数字签名。有用户反馈，Microsoft 智能应用控制会拦截 Orbit。"}, "securityChoice": {"en": "You can decide whether to turn this protection off. Doing so reduces protection against untrusted applications; first confirm that your download comes from the official release page.", "zh": "是否关闭这项保护，由使用者自行决定。关闭后会降低对不受信任应用的防护，请先确认下载来自官方发布页面。"}, "securityPath": {"en": "Windows Security → App & browser control → Smart App Control → Off.", "zh": "Windows 安全中心 → 应用和浏览器控制 → 智能应用控制 → 关闭。"}, "securityRestore": {"en": "After successfully starting Orbit once, you can turn Smart App Control back on to continue protecting your computer. Based on reported usage experience, Orbit generally is not blocked again after its first successful launch; Windows determines whether each launch is allowed.", "zh": "成功启动过一次 Orbit 后，你可以重新开启智能应用控制，继续保护你的电脑。根据使用反馈，一般成功启动一次后就不会再次被拦截；实际放行结果以 Windows 检查为准。"}, "securitySource": {"en": "You can also download the source code, review it and build Orbit yourself. A self-built unsigned application may still be blocked.", "zh": "你也可以直接下载源码，自行审阅并打包。自行打包的未签名程序仍可能受到拦截。"}, "securityDownloadSource": {"en": "Download source code ↗", "zh": "下载源码 ↗"}, "securityBuild": {"en": "Build instructions ↗", "zh": "自行打包说明 ↗"}, "securityMicrosoft": {"en": "Microsoft Smart App Control FAQ ↗", "zh": "微软智能应用控制说明 ↗"}, "securityVersion": {"en": "Re-enabling depends on your Windows version. Recent updates support turning Smart App Control back on; older versions may require resetting or reinstalling Windows.", "zh": "重新开启功能取决于 Windows 版本：较新的更新支持重新开启；旧版系统可能需要重置或重装 Windows。"}});
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
    const summary=document.querySelector('.whats-new summary');
    if(summary)summary.parentElement.parentElement.style.setProperty('--summary-width', summary.getBoundingClientRect().width+'px');
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
