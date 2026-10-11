window.OrbitChangelog = [
  {
    "version": "1.8.25",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Welcome new users once with a smooth, localized introduction to three core workflows. Later launches and external PDF/web requests bypass it.",
    "zh": "新用户首次启动显示流畅的双语欢迎动画，介绍三条核心功能；后续启动及外部 PDF／网页请求跳过动画。"
  },
  {
    "version": "1.8.25",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Recycle downloads immediately with the trash button, then restore through its slashed icon, including after restarting. The X still confirms recycling and removing the record; restoration never overwrites an existing file.",
    "zh": "垃圾桶直接回收文件，变为斜杠图标后可恢复，重启后仍可恢复；X 仍需确认后回收并清除记录，恢复不会覆盖原目录已有文件。"
  },
  {
    "version": "1.8.24",
    "date": "2026-10-10",
    "kind": "fix",
    "en": "The download-row X now confirms recycling the file and removes its record only after recycling succeeds. Missing files are cleared directly; moved files use their current location and failures keep the record.",
    "zh": "下载栏 X 现在确认将文件放入回收站，并仅在成功后清除记录；文件已不存在时直接清除，已移动文件使用新目录，操作失败保留记录。"
  },
  {
    "version": "1.8.23",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Start Orbit maximized by default, while keeping normal restore and resize controls.",
    "zh": "Orbit 默认最大化启动，保留正常还原和调整窗口大小的操作。"
  },
  {
    "version": "1.8.23",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Group all changes for each version in one card, with numbered additions followed by numbered fixes.",
    "zh": "完整更新日志按版本合并为一个卡片，先列编号新增，再列编号修复。"
  },
  {
    "version": "1.8.23",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Show a playful animated thank-you when either download button is clicked, following the website language and preserving downloads and click counts.",
    "zh": "两个下载按钮点击后均显示可爱的感谢动画，跟随网页语言，保留原下载与计数。"
  },
  {
    "version": "1.8.22",
    "date": "2026-10-10",
    "kind": "fix",
    "en": "Use a single Pin to top / Unpin menu action that changes with the tab state, removing duplicate pin actions.",
    "zh": "右键菜单仅保留一个置顶／取消置顶操作，并随当前状态切换，移除重复置顶选项。"
  },
  {
    "version": "1.8.21",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Identify pinned tabs with yellow stars.",
    "zh": "以黄色五角星标识置顶标签。"
  },
  {
    "version": "1.8.20",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Sidebar tabs support Pin to top, Unpin, Move to bottom and categories: Work (red), Study (blue), Life (yellow) and custom additions, shown as rounded color bars before icons. Pinned tabs have their own upper section; ordinary and bottom tabs share the section below. Order and colors persist across restarts, with dragging and keyboard reordering respecting group boundaries.",
    "zh": "侧栏标签支持置顶、取消置顶、置底及分类（工作红色、学习蓝色、生活黄色及自定义新增），图标左侧以圆角颜色竖线显示。置顶标签独立列在上方，普通和置底标签共同列在下方；顺序与颜色在重启后保留，拖动及键盘排序遵守分组边界。"
  },
  {
    "version": "1.8.19",
    "date": "2026-10-10",
    "kind": "fix",
    "en": "Ordinary links continue in the current tab with Back history. Reuse existing destinations, including pages still loading. Ctrl-click or middle-click opens a background tab; Ctrl+Shift-click and the context menu explicitly open a foreground tab. Downloads retain the source page, and external PDFs and links keep their dedicated workspaces.",
    "zh": "普通链接在当前标签继续浏览并保留后退历史；已有网址及正在加载的页面直接复用。Ctrl 点击或中键在后台新开，Ctrl+Shift 点击及右键明确新开则切换过去；下载保留原页，外部 PDF 和网址仍按工作台分类。"
  },
  {
    "version": "1.8.18",
    "date": "2026-10-10",
    "kind": "fix",
    "en": "External PDFs open in PDF Reader and external web links in Browser. Links and PDFs opened inside a workspace remain in that workspace, including during startup.",
    "zh": "外部 PDF 进入 PDF 阅读器，外部网址进入浏览器；工作台内部打开的链接和 PDF 留在原工作台，启动期间也遵循这一规则。"
  },
  {
    "version": "1.8.17",
    "date": "2026-10-10",
    "kind": "fix",
    "en": "Show the reading interface before loading and rendering the PDF. Forward external requests directly to running Orbit and cache the portable runtime instead of unpacking it each time.",
    "zh": "先显示阅读界面，再加载和渲染 PDF。外部请求直接交给运行中的 Orbit，缓存便携运行环境，避免每次重复解压。"
  },
  {
    "version": "1.8.17",
    "date": "2026-10-10",
    "kind": "fix",
    "en": "Queue requests received during startup and prevent duplicate tabs from fallback delivery. Running-app tests showed the reader in 211–250 ms; first extraction and cold startup are not guaranteed within 500 ms.",
    "zh": "启动期间的请求排队处理，避免回退投递产生重复标签。运行中测试显示阅读界面需 211–250 毫秒；首次解压及冷启动不保证在 500 毫秒内完成。"
  },
  {
    "version": "1.8.16",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Save text, images and pages as local favorites with their source and date. Selection menus support copying, Google search and ChatGPT drafts in a sidebar or a new tab.",
    "zh": "新增文字、图片和网页收藏，记录来源与日期；选中内容可复制、在 Google 查询，或在侧栏及新标签页创建 ChatGPT 草稿。"
  },
  {
    "version": "1.8.16",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Use the connected Google name and avatar by default; upload a custom avatar, edit the display name, or reset both to defaults.",
    "zh": "登录后默认使用 Google 姓名和头像；支持上传自定义头像、修改显示名称，以及恢复默认。"
  },
  {
    "version": "1.8.16",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Add Light, Dark and Follow system themes, regional daylight-saving time and fixed UTC offsets. Move Close and Save and close to the top-right of settings.",
    "zh": "新增浅色、深色和跟随系统主题，支持地区夏令时及固定 UTC 偏移；设置的关闭与保存并关闭按钮移到右上角。"
  },
  {
    "version": "1.8.16",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Check for updates, verify SHA-256, replace the existing EXE and restart while preserving settings and sign-in data. Edition-aware updates retain optional application-management modules.",
    "zh": "支持检查更新、SHA-256 校验、原位替换程序并重启，保留设置和登录；按版本选择更新包，保留附加申请管理模块。"
  },
  {
    "version": "1.8.16",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Add compact Refresh and Home controls to every workspace, including built-in pages and the Orbit project page.",
    "zh": "所有工作台新增小型刷新和主页按钮，包括内置页面及 Orbit 项目页。"
  },
  {
    "version": "1.8.16",
    "date": "2026-10-10",
    "kind": "fix",
    "en": "Keep header avatars circular, use an outline bookmark icon, and simplify settings and profile menus by removing interface density and redundant appearance shortcuts.",
    "zh": "头像保持正圆，收藏使用镂空图标；移除界面密度及重复的外观快捷项，精简设置和个人菜单。"
  },
  {
    "version": "1.8.15",
    "date": "2026-10-10",
    "kind": "fix",
    "en": "Download links start a transfer without opening an extra webpage; redirected attachments behave the same way, while ordinary links still open a new workspace tab.",
    "zh": "下载链接直接开始传输，不再打开多余网页；重定向附件同样处理，普通链接仍在工作台内打开新标签。"
  },
  {
    "version": "1.8.15",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Show a Vancouver update timestamp and three grouped recent changes on the project homepage, with gray fixes and green additions.",
    "zh": "项目主页显示温哥华更新时间和最近三组更新，修复为灰色，新增为绿色。"
  },
  {
    "version": "1.8.14",
    "date": "2026-10-09",
    "kind": "fix",
    "en": "Closing the last browser tab opens a fresh Google homepage. Opening a PDF closes the PDF Reader welcome tab, which returns only after the last document is closed.",
    "zh": "关闭最后一个浏览器标签后打开新的 Google 主页；打开 PDF 自动关闭阅读器欢迎页，最后一个文档关闭后才恢复欢迎页。"
  },
  {
    "version": "1.8.14",
    "date": "2026-10-09",
    "kind": "feature",
    "en": "Confirm file recycling in a compact panel beneath the trash button. An X button clears finished download records without deleting the file.",
    "zh": "垃圾桶按钮下方展开简洁的回收确认面板；新增 X 按钮，可清除已结束的下载记录而保留文件。"
  },
  {
    "version": "1.8.13",
    "date": "2026-10-09",
    "kind": "fix",
    "en": "Local PDFs start loading without waiting for website cookie restoration. Start workspace navigation immediately and avoid redundant PDF styling and resize retries.",
    "zh": "本地 PDF 无需等待网页登录会话恢复即可加载；立即跳转工作台，减少重复的 PDF 样式与尺寸调整。"
  },
  {
    "version": "1.8.13",
    "date": "2026-10-09",
    "kind": "feature",
    "en": "Use compact two-line download rows with clickable filenames, a folder icon, native file icons and right-click Open, Rename and Move actions. PDFs use the Orbit icon.",
    "zh": "下载记录改为两行，文件名可点击打开，配文件夹及原生文件图标；右键支持打开、重命名和移动，PDF 使用 Orbit 图标。"
  },
  {
    "version": "1.8.13",
    "date": "2026-10-09",
    "kind": "feature",
    "en": "Recycle downloaded files after confirmation. Deleted and cancelled entries are gray and crossed out; moved files retain their new path and show Moved.",
    "zh": "确认后可将下载文件放入回收站；已删除和已取消记录显示灰色删除线，移动文件记住新目录并显示已移动。"
  },
  {
    "version": "1.8.12",
    "date": "2026-10-09",
    "kind": "feature",
    "en": "Rename downloads or move them to another folder. Change the default download folder and optionally confirm file size, source and destination before downloading.",
    "zh": "支持重命名下载文件及移动到新文件夹、更改默认下载目录；可选择下载前确认大小、来源与保存位置。"
  },
  {
    "version": "1.8.12",
    "date": "2026-10-09",
    "kind": "fix",
    "en": "Fix copy buttons on ChatGPT and secure webpages by restoring focus and allowing clipboard writes. Preserve page and address-bar focus while resizing or switching splits.",
    "zh": "恢复焦点并允许写入剪贴板，修复 ChatGPT 及安全网页的复制按钮；调整分屏或尺寸时保留网页及地址栏焦点。"
  },
  {
    "version": "1.8.11",
    "date": "2026-10-09",
    "kind": "feature",
    "en": "Enable microphone access on secure webpages, including ChatGPT and reading/chat splits, subject to Windows microphone permission.",
    "zh": "安全网页支持麦克风访问，包括 ChatGPT 和阅读分屏；仍需 Windows 麦克风权限。"
  },
  {
    "version": "1.8.10",
    "date": "2026-10-09",
    "kind": "fix",
    "en": "Attach the current PDF when opening ChatGPT in any workspace. Re-check the composer after removal, reload or a PDF change and never send the prompt automatically.",
    "zh": "任何工作台打开 ChatGPT 时附加当前 PDF；附件移除、页面重载或更换 PDF 后重新检查输入框，不会自动发送提问。"
  },
  {
    "version": "1.8.10",
    "date": "2026-10-09",
    "kind": "fix",
    "en": "Complete English and Chinese labels across settings, navigation, downloads and PDF attachment status. Only the language selector remains bilingual.",
    "zh": "完善设置、导航、下载和 PDF 附加状态的中英文文字；只有语言选择器保持双语。"
  },
  {
    "version": "1.8.9",
    "date": "2026-10-09",
    "kind": "fix",
    "en": "Automatically add https:// to protocol-free website addresses, including custom navigation editing, while preserving explicit HTTP, searches and local file paths.",
    "zh": "输入无协议的网址时自动补全 https://，自定义导航编辑也适用；保留显式 HTTP、搜索及本地文件路径。"
  },
  {
    "version": "1.8.9",
    "date": "2026-10-09",
    "kind": "feature",
    "en": "Identify the project homepage as a public beta with frequent updates and maintenance.",
    "zh": "主页标注内测阶段，说明更新与维护较为频繁。"
  },
  {
    "version": "1.8.8",
    "date": "2026-10-09",
    "kind": "fix",
    "en": "Clicking the address bar selects the entire URL. Tabs have equal widths and shrink together; navigation editing stays open when selecting text beyond the dialog edge.",
    "zh": "点击地址栏自动全选网址；标签等宽并随数量一起缩短；选中文字越过编辑窗口边缘时不再意外关闭窗口。"
  },
  {
    "version": "1.8.8",
    "date": "2026-10-09",
    "kind": "feature",
    "en": "Show download progress in a flyout beneath Downloads while retaining the current page. Closing the flyout keeps it closed during progress updates.",
    "zh": "下载按钮下方展开进度栏，保留当前网页；关闭后不会因进度刷新而反复弹出。"
  },
  {
    "version": "1.8.7",
    "date": "2026-10-08",
    "kind": "feature",
    "en": "Add addresses and multi-tab browsing to all workspaces, including built-in pages. Links open in new tabs within their originating workspace.",
    "zh": "所有工作台支持地址和多标签浏览，包括内置页面；链接在原工作台的新标签中打开。"
  },
  {
    "version": "1.8.7",
    "date": "2026-10-08",
    "kind": "feature",
    "en": "Link menus can open in the current tab, copy the address, or pin an editable shortcut to the sidebar. Retain shared sign-in, PDF/chat splits and local page-text APIs.",
    "zh": "链接右键可在当前标签打开、复制地址或固定为可编辑侧栏入口；保留共享登录、PDF 对话分屏和本机页面文本接口。"
  },
  {
    "version": "1.8.6",
    "date": "2026-10-08",
    "kind": "fix",
    "en": "Complete English interface text, including account and API settings, event details, PDF menus and tray reminders. Keep only the language selector bilingual.",
    "zh": "完善账户、接口设置、日程详情、PDF 菜单及托盘提醒的英文文字；仅 Language / 语言 保持双语。"
  },
  {
    "version": "1.8.5",
    "date": "2026-10-08",
    "kind": "feature",
    "en": "Add a download manager beside notifications to view transfer progress and locate downloaded files.",
    "zh": "通知旁新增下载管理入口，可查看传输进度及定位下载文件。"
  },
  {
    "version": "1.8.5",
    "date": "2026-10-08",
    "kind": "fix",
    "en": "Complete remaining English labels in download and navigation controls.",
    "zh": "补全下载及导航控件中的英文文字。"
  },
  {
    "version": "1.8.4",
    "date": "2026-10-08",
    "kind": "feature",
    "en": "Move Browser and PDF addresses, history, refresh and file opening into a shared workspace header. Ctrl+L focuses the active address; remove the duplicate address row.",
    "zh": "浏览器与 PDF 的地址、历史、刷新和打开文件统一到工作台顶栏；Ctrl+L 聚焦当前地址，移除重复地址行。"
  },
  {
    "version": "1.8.3",
    "date": "2026-10-06",
    "kind": "fix",
    "en": "Greet the connected Google account by name, with Orbit User as the fallback.",
    "zh": "使用已连接 Google 账户的姓名问候，未获取姓名时使用 Orbit User。"
  },
  {
    "version": "1.8.2",
    "date": "2026-10-06",
    "kind": "feature",
    "en": "Publish the initial public Orbit Workspace with English defaults, Google tools, ChatGPT, web/PDF workspaces and editable MIT-licensed source.",
    "zh": "首次公开发布 Orbit Workspace：默认英文，整合 Google 工具、ChatGPT、网页与 PDF 工作台，并提供 MIT 许可的可编辑源码。"
  }
];
