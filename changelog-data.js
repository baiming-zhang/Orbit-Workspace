window.OrbitChangelog = [
  {
    "version": "1.8.48",
    "date": "2026-10-15",
    "kind": "feature",
    "en": "Center the PDF ribbon on each docked edge, use one column on the sides, rotate only the six-dot grip, and animate moving and unfolding. Right-click the grip to fold or expand; the folded grip can move freely and expands on click. Add six editable circular color presets and a custom color wheel. Tool sizes and styles live in right-click settings.",
    "zh": "PDF 工具栏吸附到各边中心，左右单列排列，仅六点手柄随方向旋转；平移和展开加入顺滑动画。右键手柄折叠或展开，折叠后可自由移动，左键也可展开。新增六个可改色圆形预置及自定义色盘，粗细、字号等统一放入工具右键设置。"
  },
  {
    "version": "1.8.48",
    "date": "2026-10-15",
    "kind": "fix",
    "en": "Use uniform neutral icons with active backgrounds and custom tool colors, simplify the boxed T and highlighter, fill and soften the inset arrow head, and remove its former width cap. Remove triangle and diamond tools and persistent tips. Top docking follows a collapsed PDF toolbar. Text mode edits existing boxes, and cached page groups track native viewport changes for smoother synchronized scrolling. Match the current page, slash and total page count colors in both themes.",
    "zh": "未选中图标统一颜色，选中项以背景提示，自定义颜色同步至图标；简化圆框 T 和荧光笔，箭头头部实心并放钝，取消原来的头宽限制。移除三角形、菱形和常驻提示，顶部吸附随顶栏收起上移。文本模式点击旧文字框直接编辑，标注采用整页缓存和原生视口同步，改善滚动时文字滞后。明暗主题下当前页、斜杠和总页数统一颜色，确保清晰可见。"
  },
  {
    "version": "1.8.47",
    "date": "2026-10-15",
    "kind": "feature",
    "en": "The native Draw button toggles a compact icon ribbon with selected-state colors. Drag it to dock at any edge; tools reflow while icons remain upright. Add transparent inline text with a gray dashed editing outline. Symbols stay fixed and can be erased by clicking or dragging; text remains editable. Highlight selected PDF text with the highlighter beside the pen, scroll while editing, save all notes, or exit with the final ×.",
    "zh": "原涂鸦图标切换编辑并高亮选中；图标工具栏可拖动吸附到四边，自适应横竖排列，图标始终正向。透明文字框直接输入，编辑时显示灰色虚线；图形落笔固定，可点擦或滑动轨迹擦除，文字可再次编辑。钢笔旁的荧光笔沿选中文字高亮，编辑时仍可滚动；保存全部笔记，末端 × 退出。"
  },
  {
    "version": "1.8.47",
    "date": "2026-10-15",
    "kind": "fix",
    "en": "Right-click drawing tools for individual colors, line widths, text size, rectangle corners, highlighter opacity, and eraser range. Arrows use an inset kite head capped at 3× the shaft width. Add new-tab shortcuts beside Open file and after the final tab; the right-side action is labeled New tab, and the address field is 30% narrower.",
    "zh": "绘图工具右键可分别设置颜色、粗细、字号、方框圆角、荧光笔透明度及擦除范围，并自动保留。箭头为内收风筝形，头宽最多为箭杆最粗处的 3 倍。打开文件左侧和末尾标签右侧新增 +，右侧入口改为“新增标签页”，网址输入框缩窄 30%。"
  },
  {
    "version": "1.8.46",
    "date": "2026-10-15",
    "kind": "feature",
    "en": "PDFs open in read mode. Enter Edit mode to add editable Chinese or English text, rectangles, ellipses, tapered arrows, lines, triangles, diamonds, highlights, and underlines. Select, edit, or erase individual Orbit annotations, including after saving and reopening the PDF.",
    "zh": "PDF 默认以阅读模式打开；进入编辑模式后可添加中英文文字、方框、椭圆、尖尾锥形箭头、直线、三角形、菱形、记号笔与下划线。Orbit 批注可独立选择、编辑或擦除，保存并重新打开后仍可修改。"
  },
  {
    "version": "1.8.46",
    "date": "2026-10-15",
    "kind": "fix",
    "en": "Restore accurate drawing color swatches in light and dark themes, retain each annotation as a separate PDF object, and rename the schedule reset button to Current.",
    "zh": "修复明暗主题下绘制色板被主题背景覆盖的问题，批注保存为独立 PDF 对象；行程日期按钮改为“回到当前”。"
  },
  {
    "version": "1.8.43",
    "date": "2026-10-15",
    "kind": "feature",
    "en": "Browse yesterday, tomorrow, or any date directly in the Overview schedule. Use the arrows, date picker, and Today button; new local meetings use the selected date.",
    "zh": "概览行程支持左右切换昨日、明日及其他日期，也可直接选日期或回到今天；新增本地会议自动使用当前查看日期。"
  },
  {
    "version": "1.8.43",
    "date": "2026-10-15",
    "kind": "fix",
    "en": "Load all connected Google calendars for the selected day in your configured time zone, including daylight-saving boundaries. Keep the chosen date when refreshing and prevent old responses from replacing a newer selection.",
    "zh": "按所选日期和软件时区读取所有已连接 Google 日历，正确处理夏令时边界；刷新保留查看日期，快速切换时避免旧请求覆盖新日期。"
  },
  {
    "version": "1.8.40",
    "date": "2026-10-13",
    "kind": "feature",
    "en": "Mark messages as read or move them to Gmail Trash directly from Overview; marking the mail notification as read also updates Gmail. Zoom links saved with a meeting time appear in both Today’s schedule and the Zoom list, including meetings from all connected calendars. Existing Google connections may need renewed mail permission.",
    "zh": "概览新增邮件已读和删除按钮，直接同步 Gmail；铃铛邮件通知标为已读时也同步处理邮件。带时间的 Zoom 链接自动显示在今日日程和 Zoom 列表，并同步所有已连接日历的会议；已有 Google 连接可能需要重新授权邮件处理权限。"
  },
  {
    "version": "1.8.40",
    "date": "2026-10-13",
    "kind": "fix",
    "en": "Refresh summaries whenever Overview is revisited so processed mail does not stay unread. Strike through finished events and dim their color markers; ongoing and all-day events remain active.",
    "zh": "每次切回概览自动刷新汇总，避免已处理邮件仍显示未读；已结束的日程显示划线并淡化颜色，正在进行和当天全天日程保持正常。"
  },
  {
    "version": "1.8.39",
    "date": "2026-10-12",
    "kind": "fix",
    "en": "Make every webpage zoom input redraw immediately, fixing the case where the stored zoom changed but the visible page did not. Ctrl +/−, Ctrl+0 and Ctrl+wheel now update the actual page layout; website scale memory and native PDF zoom are preserved.",
    "zh": "修复缩放比例已改变但网页画面没有更新的问题；Ctrl 加减、Ctrl+0 与 Ctrl+滚轮每次输入都会立即更新实际页面布局，保留网站比例记忆和 PDF 原生缩放。"
  },
  {
    "version": "1.8.38",
    "date": "2026-10-12",
    "kind": "fix",
    "en": "Restore webpage zoom with Ctrl +/−, Ctrl+0 and Ctrl+wheel, enable touchpad pinch zoom and remember each website’s scale across navigation and restarts. The ChatGPT side pane supports the same controls; native PDF zoom is preserved.",
    "zh": "修复网页 Ctrl 加减、Ctrl+0 和 Ctrl+滚轮缩放，启用触控板双指缩放，网站比例在跳转与重启后保留；ChatGPT 侧栏支持相同操作，PDF 继续使用原生缩放。"
  },
  {
    "version": "1.8.37",
    "date": "2026-10-12",
    "kind": "fix",
    "en": "Fit PDF thumbnails to the sidebar width and render visible thumbnails more sharply in the background. Hiding the sidebar removes its divider and expands the reading area; PDF zoom follows the layout.",
    "zh": "PDF 缩略图随侧栏宽度适配，并在后台提高可见缩略图的渲染清晰度；隐藏侧栏时同步收起分隔线并展开阅读区域，正文缩放跟随布局。"
  },
  {
    "version": "1.8.35",
    "date": "2026-10-12",
    "kind": "feature",
    "en": "Zoom PDF thumbnails independently and drag the divider to resize the sidebar. Remember the layout and separate light/dark reading backgrounds; dark mode offers six Dark tones.",
    "zh": "PDF 缩略图可独立缩放，拖动分隔线调整侧栏宽度；记住布局与深浅阅读背景，深色模式提供六种 Dark 色系。"
  },
  {
    "version": "1.8.35",
    "date": "2026-10-12",
    "kind": "feature",
    "en": "Use gentle rising bubbles while a website loads. Waiting pages offer Go back and Return home and respect reduced-motion preferences.",
    "zh": "网页加载时显示柔和上浮气泡；等待页提供返回上一级和返回主页，并支持减少动态效果。"
  },
  {
    "version": "1.8.35",
    "date": "2026-10-12",
    "kind": "fix",
    "en": "Unify dark mode in black and gray across workspaces, dialogs, reminders, PDF controls and reading surfaces. Apply the selected theme before showing a new surface to prevent light/dark flashes, and restore blank PDF pages with the compatible native renderer.",
    "zh": "工作台、弹窗、提醒、PDF 控件和阅读区域统一黑灰深色；新界面显示前应用主题，修复深浅色跳转闪屏，并使用兼容原生渲染恢复 PDF 空白正文。"
  },
  {
    "version": "1.8.35",
    "date": "2026-10-12",
    "kind": "fix",
    "en": "Preserve maximized and normal window states when opening files and links; restore minimized windows before revealing them. Waiting-page navigation cancels pending requests and returns to the previous page or workspace home.",
    "zh": "打开文件或链接时保留最大化与普通窗口状态，显示前恢复最小化窗口；等待页跳转会取消待处理请求并返回上一级或工作台主页。"
  },
  {
    "version": "1.8.35",
    "date": "2026-10-12",
    "kind": "fix",
    "en": "Keep download records available while renaming or moving files, avoiding a transient missing path being marked as deleted.",
    "zh": "重命名或移动文件时保留下载记录，避免将操作期间暂时消失的旧路径误标为已删除。"
  },
  {
    "version": "1.8.33",
    "date": "2026-10-12",
    "kind": "fix",
    "en": "Restore PDF page rendering and thumbnail navigation using the compatible native viewer. Keep GPU acceleration, reading controls, files and preferences.",
    "zh": "使用兼容的原生阅读器恢复 PDF 正文及缩略图跳页，保留硬件加速、阅读控制、文件和偏好设置。"
  },
  {
    "version": "1.8.32",
    "date": "2026-10-11",
    "kind": "feature",
    "en": "Enable full local control in the general edition: edit webpage fields, run page scripts, click, type, drag, scroll and upload readable local files. Orbit UI/native methods, tabs, navigation, settings, avatars, downloads, favorites, clipboard and local plans are available to authenticated clients.",
    "zh": "通用版开放完整本机控制：网页编辑、脚本、点击、输入、拖动、滚动和可读取文件上传；已认证客户端可调用 Orbit 界面及原生方法，管理标签、导航、设置、头像、下载、收藏、剪贴板及本地日程。"
  },
  {
    "version": "1.8.32",
    "date": "2026-10-11",
    "kind": "feature",
    "en": "Add 15 MCP tools, a bundled Node-free Windows bridge with a stable update-safe path, and a streaming HTTP MCP endpoint. Copy the Codex/local configuration or a private ChatGPT tunnel connection from API settings; access rotation revokes previous credentials and connection URLs.",
    "zh": "新增 15 个 MCP 工具、无需 Node 的 Windows 桥接及稳定更新路径，并提供 HTTP MCP 入口；设置中可复制 Codex/本地配置或 ChatGPT 私有隧道连接。重置访问权限会撤销旧令牌及连接地址。"
  },
  {
    "version": "1.8.32",
    "date": "2026-10-11",
    "kind": "fix",
    "en": "Keep the foreground workspace in place during background opening and input. ChatGPT side-pane navigation and closing preserve the document; queued input rechecks the page address. Temporary input hosts and isolated verification processes are cleaned after use.",
    "zh": "后台打开和输入保持前台工作台不变；ChatGPT 侧栏导航、关闭保留文档，排队输入会重新核对网址。临时输入窗口和隔离验证进程在使用后清理。"
  },
  {
    "version": "1.8.31",
    "date": "2026-10-11",
    "kind": "feature",
    "en": "Show a clear page-status panel with retry, address editing, workspace home and original-response controls. The panel replaces only the affected page or ChatGPT side pane and follows the selected language and theme.",
    "zh": "新增清晰的网页状态面板，可重试、修改网址、回到工作台首页或查看原网页响应；仅替换出错的网页或 ChatGPT 侧栏，并跟随界面语言和主题。"
  },
  {
    "version": "1.8.31",
    "date": "2026-10-11",
    "kind": "fix",
    "en": "Display connection failures, HTTP errors, empty responses, long waits and renderer crashes instead of a blank page. Pending requests can still recover when content arrives; downloads and PDF opening remain available.",
    "zh": "连接失败、HTTP 错误、空响应、长时间等待及页面崩溃不再只显示空白；内容到达后可自动恢复，正常下载和 PDF 打开保持可用。"
  },
  {
    "version": "1.8.30",
    "date": "2026-10-11",
    "kind": "feature",
    "en": "Reorder top tabs in every workspace by holding and dragging left or right. Preview the order while dragging, retain it when switching workspaces and press Escape to cancel. The active page stays open; normal clicks and close buttons continue to work.",
    "zh": "所有工作台的顶部标签均支持长按后左右拖动排序，拖动时实时预览，切换工作台保留顺序，按 Esc 可取消；保留正在查看的页面，普通点击及关闭按钮正常使用。"
  },
  {
    "version": "1.8.30",
    "date": "2026-10-11",
    "kind": "fix",
    "en": "Allow closing built-in initial tabs, including the PDF Reader start tab. Closing the final tab creates one initialized tab for that workspace; closing an initial tab while other tabs remain no longer recreates it on workspace switches.",
    "zh": "PDF Reader 等内置初始标签也可通过 × 关闭；关闭最后一个标签后生成该工作台的一个初始标签。仍有其他标签时，已关闭的初始标签不会在切换工作台后重新出现。"
  },
  {
    "version": "1.8.29",
    "date": "2026-10-11",
    "kind": "feature",
    "en": "Make the titlebar breadcrumb actionable: Workspace returns to Overview and expands the sidebar; the workspace name and Home button return to that workspace’s initial page while retaining other open tabs and PDFs.",
    "zh": "顶部路径支持点击：工作空间返回概览并展开侧栏；工作台名称及主页按钮返回该工作台初始页面，保留其他已打开的网页和 PDF。"
  },
  {
    "version": "1.8.29",
    "date": "2026-10-11",
    "kind": "fix",
    "en": "Remove both full Recycle Bin scans from deletion, update Deleted status after the native recycle operation, and show immediate working feedback. Look up the recycled file only when Restore is clicked; retain restoration after restart, legacy records and moved locations, and reject conflicting or ambiguous matches.",
    "zh": "删除不再等待两次全量回收站扫描，系统回收完成后立即显示已删除，并即时显示处理状态；只在点击恢复时查找回收站文件。保留重启后恢复、旧版记录及移动目录，拒绝覆盖同名文件或恢复不明确的匹配项。"
  },
  {
    "version": "1.8.28",
    "date": "2026-10-11",
    "kind": "feature",
    "en": "Show current download speed and estimated time remaining beside the received and total sizes. Paused or stalled transfers never retain a stale speed estimate.",
    "zh": "下载栏在已下载大小和总大小旁显示当前速度与预计剩余时间；暂停或停滞时不保留过期速度。"
  },
  {
    "version": "1.8.28",
    "date": "2026-10-11",
    "kind": "fix",
    "en": "Decode native ICO, PNG and SVG website icons, refresh icons after page load and save them to sidebar workspaces. If the website has no usable icon, use the uploaded workspace icon, then a dot. Simplify web-tab menus to Reload, Copy link, Close tab and Add to sidebar workspace.",
    "zh": "修复网页原生 ICO、PNG 和 SVG 图标解析，加载完成后更新并保存到左侧工作台；无可用网页图标时使用工作台上传图标，否则显示圆点。网页标签右键统一为刷新、复制链接、关闭标签页及加入左侧工作台。"
  },
  {
    "version": "1.8.28",
    "date": "2026-10-11",
    "kind": "fix",
    "en": "Open outgoing ChatGPT webpage links in new workspace tabs, preserving the conversation in browser, ChatGPT workspace and side panes. Reuse an existing tab for the same address; downloads remain in the downloads panel.",
    "zh": "ChatGPT 外部网页链接在新标签页打开，保留浏览器、ChatGPT 工作台和侧栏中的对话；同网址复用已有标签，下载仍进入下载栏。"
  },
  {
    "version": "1.8.28",
    "date": "2026-10-11",
    "kind": "fix",
    "en": "Clear gray deleted download records immediately with X, without another confirmation or touching replacement files. Downloads with remaining files still require confirmation before recycling and removing the record.",
    "zh": "灰色已删除下载记录点击 × 直接清除，不重复确认，也不影响原目录的替代文件；仍有文件的记录继续确认后回收文件并清除。"
  },
  {
    "version": "1.8.28",
    "date": "2026-10-11",
    "kind": "fix",
    "en": "Open the selected unread Overview email directly in its Gmail conversation, selecting the connected mailbox and reusing the existing Gmail workspace tab.",
    "zh": "点击概览中的未读邮件直接打开对应 Gmail 邮件会话，选择已连接的邮箱并复用已有 Gmail 工作台标签。"
  },
  {
    "version": "1.8.26",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Add the current webpage to a sidebar workspace from address-bar, page and tab context menus. Save its own title and favicon; reuse existing shortcuts without overwriting custom names.",
    "zh": "网址、网页及顶部标签右键可加入左侧工作台，自动保存当前网页标题和图标；同网址复用已有入口，保留自定义名称。"
  },
  {
    "version": "1.8.26",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Remove category directly below Category in the sidebar menu. Clear its color while retaining the workspace’s pinned or bottom position.",
    "zh": "工作台右键菜单在分类下方新增独立取消分类选项，清除分类及颜色，并保留置顶或置底位置。"
  },
  {
    "version": "1.8.26",
    "date": "2026-10-10",
    "kind": "feature",
    "en": "Check for software updates automatically every week while Orbit is running, or on the next launch when due. New versions show red dots on the avatar and the explicitly named software-update button in Your profile. Automatic checks only notify; manual checking retains the verified installation workflow.",
    "zh": "软件运行时每周自动检查更新；关闭期间到期则在下次启动检查。有新版时头像和个人页面的检查软件更新按钮显示红点；自动检查仅提示，手动点击保留校验后安装流程。"
  },
  {
    "version": "1.8.26",
    "date": "2026-10-10",
    "kind": "fix",
    "en": "Show native PNG, SVG and ICO favicons in top tabs, with a dot only when no usable icon exists. Follow navigation and live page titles, ignore stale icons and retain icons across same-document routing.",
    "zh": "顶部标签显示 PNG、SVG、ICO 原生图标，无有效图标时回退圆点；标题跟随跳转和实时变化，忽略旧网页图标返回，同文档路由保留图标。"
  },
  {
    "version": "1.8.26",
    "date": "2026-10-10",
    "kind": "fix",
    "en": "Clear inactive address-bar selection when clicking the webpage or other controls. Clicking the address still selects the entire URL for replacement.",
    "zh": "点击网页或其他控件后清除地址栏非活动选区；点击网址仍全选，便于替换。"
  },
  {
    "version": "1.8.26",
    "date": "2026-10-10",
    "kind": "fix",
    "en": "Display each language option in its native name, regardless of the current interface language, so users can recognize how to switch.",
    "zh": "语言选项始终用对应母语显示，英文为 English，中文为简体中文，不随当前界面语言翻译，方便识别切换。"
  },
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
