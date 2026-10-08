# Orbit Workspace

**A clean, Google-friendly desktop workspace for reading, planning, and working with ChatGPT.**

Designed by **Baiming Zhang** · Windows · English by default · [MIT License](LICENSE)

Orbit brings your everyday web tools and research reading into one calm workspace. Search with Google, keep useful pages open, read papers alongside ChatGPT, and use the home dashboard as a small personal assistant for your day.

**You can download only [Orbit.exe](https://github.com/baiming-zhang/Orbit-Workspace/releases/latest/download/Orbit.exe)** if you just want to use the app. Place it anywhere convenient and double-click it; the source-code folder is not required for normal use.

![Orbit Workspace home screen](docs/home-window-v1.8.3.png)

## Highlights

- **Google-friendly workflow.** Quick access to Google Search, Gmail, Calendar, and Analytics. Optional Gmail and Calendar summaries use official Google APIs, with OAuth authorization completed in your system browser.
- **Multiple ways to work with ChatGPT.** Use a dedicated ChatGPT page, open several conversation tabs, or keep ChatGPT beside a PDF or website. ChatGPT views share the same local sign-in session.
- **Literature-friendly reading.** Open local or online PDFs, switch between papers, resize the reading/chat split, and attach the current PDF to ChatGPT when its upload interface and your account support it.
- **One navigation bar.** Browser and PDF addresses, Back, Forward, Refresh, and Open File share the top workspace bar. The inner row keeps document/page tabs, the + button, and ChatGPT controls.
- **A clean interface.** Compact controls, adjustable text size, a collapsible/resizable sidebar, and customizable website shortcuts keep the focus on your work.
- **A fast PDF workflow.** Direct PDF opening and a compact reader aim to make paper reading feel quicker than opening a full browser window. In the author's everyday workflow it feels faster than Edge; no controlled rendering-speed benchmark has been published. Actual performance depends on the PDF, hardware, and cache state.
- **Pages that stay with you.** Frequently used pages can remain open while you switch workspace sections or keep Orbit in the system tray. Persistent sessions retain login state across launches, subject to each website's session expiry and security checks.
- **A homepage that acts like a small personal assistant.** See today's schedule and unread-email summary, add local plans or meeting links, and receive reminders five minutes before events. Google summaries are optional; local planning works independently.
- **Useful extras.** Zoom meeting links, browser tabs, time-zone preferences, English/Chinese interface settings, and an optional local API/MCP bridge.

## A programmable workspace that keeps your desktop free

Orbit's application source is open and editable, so you can adapt the workspace's own commands, integrations, and page behavior to your workflow. Supported API tasks can run while Orbit stays in the background or system tray: a local assistant can read a page's text, retrieve authorized Gmail and Calendar data, or manage local plans without driving the foreground with mouse clicks. This reduces desktop interruptions for workflows that already have an interface.

The current release includes an optional, token-authenticated localhost HTTP API and a Node.js MCP bridge. See [the API implementation](source/app/desktop/local-api.cjs) and [the bridge](source/app/desktop/mcp-bridge.cjs). Developers can extend Orbit's [embedded page host](source/app/desktop/tabbed-browser.cjs) and add narrowly scoped commands to open a page, navigate it, or adapt its presentation, then expose those commands through their own integrations. Opening web addresses and PDF paths through the executable is already supported. Custom website interaction commands require implementation; the shipped API currently provides page listing/text reading, Google summaries and authorized calendar operations, and local-event management.

For example, an assistant can retrieve authorized calendar events through the local API while you continue reading a PDF, instead of repeatedly switching the active window. Developers can build additional ChatGPT webpage workflows around the embedded views, subject to the website's supported interfaces and the user's permission. This release does not ship a general-purpose ChatGPT webpage editing or message-sending API.

Chrome and Edge also support browser automation and are based on the [open-source Chromium project](https://www.chromium.org/Home/). Orbit's advantage is that the entire workspace application and its integration layer are editable in this repository. Background workflows reduce foreground interaction when an API is available; they do not guarantee faster execution or unrestricted access to a website. Website sign-in, authorization, security checks, and service terms still apply.

## Download and run

For editing or redistribution, download the complete **Windows + source ZIP** from [Releases](https://github.com/baiming-zhang/Orbit-Workspace/releases/latest). Its top-level layout is:

```text
Orbit/
  Orbit.exe
  source/
  README.md
  LICENSE
  THIRD-PARTY-NOTICES.txt
  orbit-api-bridge.cjs
```

The executable, source-code folder, README, and license are side by side. The MCP bridge is optional and only needed for local MCP integration.

Double-click `Orbit.exe`. No installation or separate Node.js runtime is needed for the desktop app. Sign in to your own Google and ChatGPT accounts in their pages. English is selected on a fresh launch; existing saved language preferences are respected. The home greeting uses the name returned by your connected Google account, or **Orbit User** when no name is available.

Closing the main window keeps Orbit in the system tray. Right-click its tray icon and choose **Quit** to exit completely.

### Optional Google dashboard connection

Google webpages work independently of the dashboard connection. To enable Gmail/Calendar summaries, create your own Google **Desktop OAuth** client, enable the relevant Gmail and Calendar APIs, and enter the configuration in Orbit's account settings. If your Google Cloud project is in testing mode, add your account as a test user. Calendar write access requires an additional authorization. Account-name greetings use Google's [OpenID Connect profile information](https://developers.google.com/identity/openid-connect/openid-connect); an existing connection may need reauthorization to grant profile access.

### Optional local API and MCP

Enable the local API in Settings when needed. The desktop app runs without Node.js; the separate `orbit-api-bridge.cjs` MCP bridge requires Node.js. Keep the bridge beside the executable and use the configuration copied from Orbit.

## Edit and build

The complete Orbit application source and EXE packaging scripts are available here:

```text
source/app/           HTML, CSS, JavaScript, and Electron application code
source/build.ps1      Windows EXE build entry point
source/build/pack_asar.py  Packs the editable app into an Electron ASAR archive
source/build/Orbit.nsi    Portable EXE launcher source
source/BUILD.md       Build prerequisites and instructions
LICENSE               MIT License
THIRD-PARTY-NOTICES.txt
```

See [source/BUILD.md](source/BUILD.md) to rebuild. The complete release ZIP also includes the Electron runtime template. Large binary files are distributed as release assets rather than committed to Git.

## Personal use and copyright

**Orbit is intended for personal, non-commercial productivity, learning, and research. The author shares it as a personal project and does not operate it as a commercial product.** Please use it responsibly and respect the rights of service providers and content owners.

Google integration only references official service webpages and APIs. Google, ChatGPT, and Zoom names, logos, and services belong to their respective owners. This independent project is not affiliated with or endorsed by those providers. Do not use Orbit to bypass access controls, redistribute copyrighted papers without permission, or infringe trademarks or other rights. Follow each service's terms and the applicable content licenses.

**Copyright concerns / removal requests:** please [open an issue](https://github.com/baiming-zhang/Orbit-Workspace/issues/new) with the affected material and evidence of ownership. The author will review the request and remove or replace infringing material where appropriate. Contact for removal is welcome.

## License

The Orbit project source is fully open source under the [MIT License](LICENSE). Preserve the copyright and license notice when distributing copies or substantial portions. The personal-use statement above describes the project's purpose and is not an additional restriction on the MIT License, which also permits commercial use. Third-party components retain their own licenses; see [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).
