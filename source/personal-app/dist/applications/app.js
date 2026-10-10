(() => {
  "use strict";

  const data = window.APP_DATA;
  const tabStrip = document.querySelector("#tab-strip");
  const appMain = document.querySelector("#app-main");
  const browserTemplate = document.querySelector("#browser-template");
  const newTabButton = document.querySelector("#new-tab");

  const tabs = [
    {id:"plan",type:"plan",title:"申请选择与预算",icon:"✓"},
    { id: "outreach", type: "outreach", title: "博士联络档案", icon: "◆" },
    { id: "masters", type: "masters", title: "北美 TOP 50 硕士", icon: "◇" },
  ];
  let activeTabId = "plan";
  let selectedProfessorId = localStorage.getItem("orbit:application-professor");
  let selectedMasterId = localStorage.getItem("orbit:application-master");
  let browserSequence = 0;

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const parseDeadline = (dateText) => new Date(`${dateText}T23:59:59`);

  function daysUntil(dateText) {
    if (!dateText) return null;
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Vancouver',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    return Math.round((Date.parse(dateText+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
  }

  function formatDate(dateText) {
    if (!dateText) return "待公布";
    const [year, month, day] = dateText.split("-");
    return `${year}.${month}.${day}`;
  }

  function countdown(dateText, compact = false) {
    const days = daysUntil(dateText);
    if (days === null) {
      return { text: compact ? "待公布" : "截止日期待公布", className: "unknown" };
    }
    if (days < 0) {
      return { text: compact ? "已截止" : `已截止 ${Math.abs(days)} 天`, className: "closed" };
    }
    if (days === 0) {
      return { text: compact ? "今天截止" : "今天截止", className: "urgent" };
    }
    return {
      text: compact ? `剩 ${days} 天` : `距离截止还有 ${days} 天`,
      className: days < 10 ? "urgent" : days < 30 ? "watch" : "safe",
    };
  }

  function listMarkup(items) {
    return `<ul class="clean-list">${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
  }

  function linkButton(url, label, primary = false) {
    return `<button class="action-button open-link${primary ? " primary" : ""}" type="button" data-url="${esc(url)}" data-title="${esc(label)}">${primary ? "→" : "↗"} ${esc(label)}</button>`;
  }

  function formatUsd(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "金额待确认";
    return `US$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }

  function formatCnyFromUsd(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "人民币待确认";
    const converted = Math.round(amount * data.finance.usdCny);
    return `≈ ¥${converted.toLocaleString("en-US")}`;
  }

  function financeRateNote() {
    return `<p class="source-note">${esc(data.finance.note)} · 汇率快照 ${esc(data.finance.asOf)}</p>`;
  }

  function applicationFeeCard(finance) {
    const isFree = Number(finance.applicationFeeUsd) === 0;
    return `
      <div class="finance-card accent">
        <h4>申请费 · Application fee</h4>
        <div class="finance-primary">${esc(formatUsd(finance.applicationFeeUsd))}${isFree ? " · 免费" : ""}</div>
        <div class="finance-secondary">${esc(formatCnyFromUsd(finance.applicationFeeUsd))}</div>
        ${finance.applicationFeeOriginal ? `<p class="finance-original">原币标价：${esc(finance.applicationFeeOriginal)}</p>` : ""}
        ${finance.applicationFeeNote ? `<p class="finance-note">${esc(finance.applicationFeeNote)}</p>` : ""}
      </div>
    `;
  }

  function masterFinanceMarkup(finance) {
    return `
      <div class="finance-grid">
        ${applicationFeeCard(finance)}
        <div class="finance-card">
          <h4>学费 · Tuition</h4>
          <div class="finance-primary">${esc(formatUsd(finance.tuitionUsd))}</div>
          <div class="finance-secondary">${esc(formatCnyFromUsd(finance.tuitionUsd))}</div>
          <p class="finance-original">官方原币/计费口径：${esc(finance.tuitionOriginal)}</p>
          <p class="finance-note">${esc(finance.tuitionNote)}</p>
        </div>
      </div>
      ${financeRateNote()}
    `;
  }

  function phdFinanceMarkup(finance) {
    const stipend = finance.stipendUsd !== undefined ? `
      <div class="finance-primary">${esc(formatUsd(finance.stipendUsd))}/年</div>
      <div class="finance-secondary">${esc(formatCnyFromUsd(finance.stipendUsd))}/年</div>
    ` : `<div class="finance-primary">${esc(finance.stipendText || "金额随 offer 确定")}</div>`;
    return `
      <div class="finance-grid">
        ${applicationFeeCard(finance)}
        <div class="finance-card">
          <h4>博士工资 / Stipend · 税前</h4>
          ${stipend}
          ${finance.stipendOriginal ? `<p class="finance-original">原始口径：${esc(finance.stipendOriginal)}</p>` : ""}
          <p class="finance-note">${esc(finance.stipendNote)}</p>
        </div>
      </div>
      <div class="status-note"><strong>学费与资助覆盖</strong>${esc(finance.tuitionCoverage)}</div>
      ${financeRateNote()}
    `;
  }

  function waiverMarkup(waiver) {
    if (!waiver?.recommended) return "";
    const safeTimer = countdown(waiver.recommendedDeadline);
    return `
      <section class="waiver-banner">
        <div class="waiver-banner-head">
          <span class="waiver-mark">${esc(waiver.label || "建议申请 WAIVER")}</span>
          <strong>Financial hardship · 不影响录取审查</strong>
        </div>
        <p>${esc(waiver.basis)}</p>
        <p class="waiver-no-impact">${esc(waiver.noImpact)}</p>
        <div class="waiver-date-grid">
          <div><span>个人安全截止</span><strong>${esc(formatDate(waiver.recommendedDeadline))}</strong><small class="waiver-countdown ${safeTimer.className}">${esc(safeTimer.text)}</small></div>
          <div><span>官网规则推算最晚</span><strong>${esc(formatDate(waiver.officialRequestDeadline))}</strong><small>不要拖到这一天</small></div>
          <div><span>申请最终截止</span><strong>${esc(formatDate(waiver.finalApplicationDeadline))}</strong><small>${esc(waiver.finalDeadlineNote || "以项目官网时区为准")}</small></div>
        </div>
        <p><strong>官网规则：</strong>${esc(waiver.officialRule)}</p>
        <p class="source-note">${esc(waiver.deadlineNote)}</p>
        <details class="waiver-prep">
          <summary>Waiver 填写与证明材料建议</summary>
          <div>${listMarkup(waiver.preparation)}</div>
        </details>
        <div class="button-row">${linkButton(waiver.policyUrl, waiver.policyLabel || "查看官方 Waiver 政策", true)}</div>
      </section>
    `;
  }

  const professorWaiver = (person) => person.admissions?.waiver || person.waiver;
  const professorActionDeadline = (person) => professorWaiver(person)?.recommendedDeadline || person.admissions?.deadline;

  function renderTabs() {
    tabStrip.innerHTML = tabs.map((tab) => `
      <button class="top-tab${tab.id === activeTabId ? " active" : ""}" type="button" data-tab-id="${esc(tab.id)}" title="${esc(tab.title)}">
        <span class="tab-icon">${esc(tab.icon || "○")}</span>
        <span class="tab-title">${esc(tab.title)}</span>
        ${tab.type === "browser" ? `<span class="tab-close" data-close-tab="${esc(tab.id)}" title="关闭标签">×</span>` : ""}
      </button>
    `).join("");

    tabStrip.querySelectorAll(".top-tab").forEach((button) => {
      button.addEventListener("click", (event) => {
        const closeTarget = event.target.closest("[data-close-tab]");
        if (closeTarget) {
          event.stopPropagation();
          closeBrowserTab(closeTarget.dataset.closeTab);
          return;
        }
        activateTab(button.dataset.tabId);
      });
    });
  }

  function activateTab(tabId) {
    const tab = tabs.find((item) => item.id === tabId);
    if (!tab) return;
    appMain.dataset.applicationPlan=String(tab.type==="plan");
    activeTabId = tabId;
    renderTabs();
    renderActiveTab();
    parent.OrbitApplications?.setTab(tabId);
  }

  function renderActiveTab() {
    const tab = tabs.find((item) => item.id === activeTabId);
    if (!tab) return;
    appMain.dataset.applicationPlan=String(tab.type==="plan");
    if (tab.type === "plan") window.ApplicationPlan.render(appMain);
    if (tab.type === "outreach") renderOutreach();
    if (tab.type === "masters") renderMasters();
    if (tab.type === "browser") renderBrowser(tab);
  }

  function renderOutreach() {
    const groupLabels = {
      "已回复": "已回复 · 仍有实质机会",
      "未回复": "未回复 · 等待或待追信",
      "基本拒绝": "基本拒绝 · 置于最后",
    };

    const groups=window.SelectionDirectory.groups("PhD",data.professors,professorDirectoryItem);

    appMain.innerHTML = `
      <section class="dashboard">
        <aside class="directory">
          <div class="directory-head">
            <p class="eyebrow">RESEARCH OUTREACH · ${esc(data.snapshot)}</p>
            <h1>教授联络目录</h1>
            <div class="directory-meta">
              <span>21 位教授</span><span>11 已回复</span><span>默认全部收起</span>
            </div>
            <div class="response-legend" aria-label="回复质量色阶">
              <span><i class="tone-dot strong"></i>最积极</span>
              <span><i class="tone-dot positive"></i>实质积极</span>
              <span><i class="tone-dot mixed"></i>一般/受限</span>
              <span><i class="tone-dot template"></i>模板回复</span>
              <span><i class="tone-dot priority"></i>重点必申</span>
            </div>
          </div>
          <div class="directory-groups">${groups}</div>
        </aside>
        <article id="outreach-content" class="content-pane"></article>
      </section>
    `;

    appMain.querySelectorAll("[data-professor-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedProfessorId = button.dataset.professorId;localStorage.setItem("orbit:application-professor",selectedProfessorId);
        appMain.querySelectorAll("[data-professor-id]").forEach((item) => item.classList.toggle("selected", item === button));
        renderProfessorDetail(data.professors.find((person) => person.id === selectedProfessorId));
      });
    });

    const selected = data.professors.find((person) => person.id === selectedProfessorId);
    if (selected) {
      const selectedButton = appMain.querySelector(`[data-professor-id="${CSS.escape(selected.id)}"]`);
      if (selectedButton) {
        selectedButton.classList.add("selected");
        selectedButton.closest("details").open = true;
      }
      renderProfessorDetail(selected);
    } else {
      renderOutreachWelcome();
    }
  }

  function professorDirectoryItem(person) {
    const waiver = professorWaiver(person);
    const deadline = person.admissions?.deadline||person.waiver?.finalApplicationDeadline;
    const timer = deadline ? countdown(deadline, true) : null;
    const toneClass = person.responseTone ? ` response-tone-${esc(person.responseTone)}` : "";
    return `
      <button class="record-button${toneClass}${person.priorityApplicant ? " priority-target" : ""}" type="button" data-professor-id="${esc(person.id)}">
        <span class="record-top">
          <span class="rank">#${esc(person.rank)}</span>
          <span class="record-name">${esc(person.name)}</span>
          ${person.priorityApplicant ? `<span class="priority-badge">${esc(person.priorityLabel || "重点必申")}</span>` : ""}
          ${timer ? `<span class="countdown ${timer.className}" title="申请截止 ${formatDate(deadline)}">${esc(timer.text)}</span>` : ""}
        </span>
        <span class="record-bottom">
          <span class="school-short">${esc(person.schoolShort)} · ${esc(person.positivity)}</span>
          ${person.responseTone ? `<span class="response-tone-badge ${esc(person.responseTone)}">${esc(person.responseLabel)}</span>` : ""}
          ${window.CompletionFinance.badge("phd-"+person.id)}
        </span>
      </button>
    `;
  }

  function renderOutreachWelcome() {
    const content = document.querySelector("#outreach-content");
    const deadlines = data.professors
      .map((person) => ({ person, deadline: professorActionDeadline(person) }))
      .filter((entry) => entry.deadline)
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 4);
    const nearest = deadlines[0];
    const nearestTimer = countdown(nearest?.deadline);
    content.innerHTML = `
      <section class="detail-hero">
        <div>
          <p class="hero-kicker">FALL 2027 · PHD OUTREACH</p>
          <h2>联络档案与申请节点</h2>
          <p class="subtitle">左侧三类目录默认收起。展开分类并选择老师后，邮件、指标和申请材料才会分层出现。</p>
        </div>
        <div class="deadline-panel ${nearestTimer.className}">
          <div class="deadline-label">${professorWaiver(nearest.person) ? "最近 WAIVER 安全截止" : "最近一批重点截止"}</div>
          <div class="deadline-date">${esc(formatDate(nearest.deadline))}</div>
          <div class="deadline-countdown ${nearestTimer.className}">${esc(nearestTimer.text)}</div>
          <div class="deadline-context">${esc(nearest.person.schoolShort)} · ${esc(nearest.person.name)}</div>
        </div>
      </section>
      <div class="quick-grid">
        <div class="metric"><div class="metric-label">已回复</div><div class="metric-value">11</div></div>
        <div class="metric"><div class="metric-label">未回复</div><div class="metric-value">9</div></div>
        <div class="metric"><div class="metric-label">基本拒绝</div><div class="metric-value">1</div></div>
        <div class="metric"><div class="metric-label">非常积极</div><div class="metric-value">1</div></div>
      </div>
      <details class="fold-card">
        <summary>最近截止项目（默认收起）</summary>
        <div class="fold-content">
          ${deadlines.map(({ person, deadline }) => `<p><strong>${esc(formatDate(deadline))}</strong> · ${esc(person.schoolShort)} · ${esc(person.name)} · ${professorWaiver(person) ? "WAIVER 安全截止 · " : ""}${esc(countdown(deadline).text)}</p>`).join("")}
        </div>
      </details>
      <div class="source-note">积极程度口径：只有已经明确约面试/会议且没有明显负面限制，才标为“非常积极”。通用鼓励、实验室模板与 AI 套话不会被抬高等级。</div>
    `;
  }

  function renderProfessorDetail(person) {
    return window.ApplicationDetails.professor(person,document.querySelector("#outreach-content"));
    const content = document.querySelector("#outreach-content");
    if (!content || !person) return;
    const admission = person.admissions;
    const waiver = professorWaiver(person);
    const actionDeadline = professorActionDeadline(person);
    const timer = actionDeadline ? countdown(actionDeadline) : null;
    const keywords = person.keywords.split(",").map((item) => item.trim()).filter(Boolean);

    content.innerHTML = `
      <section class="detail-hero">
        <div>
          <p class="hero-kicker">GLOBAL RANK #${esc(person.rank)} · ${esc(person.category)}${person.priorityApplicant ? ` · <span class="priority-inline">${esc(person.priorityLabel || "重点必申")}</span>` : ""}</p>
          <h2>${esc(person.name)}</h2>
          <p class="subtitle">${esc(person.school)} · ${esc(person.department)}</p>
        </div>
        ${admission || waiver ? `
          <div class="deadline-panel ${timer.className}">
            <div class="deadline-label">${waiver ? "WAIVER 安全截止" : "申请截止"}</div>
            <div class="deadline-date">${esc(formatDate(actionDeadline))}</div>
            <div class="deadline-countdown ${timer.className}">${esc(timer.text)}</div>
            <div class="deadline-context">${waiver ? `官网规则推算最晚 ${esc(formatDate(waiver.officialRequestDeadline))} · 申请最终 ${esc(formatDate(waiver.finalApplicationDeadline))}` : esc(admission.deadlineContext)}</div>
          </div>
        ` : `
          <div class="deadline-panel">
            <div class="deadline-label">申请入口</div>
            <div class="deadline-date">未配置</div>
            <div class="deadline-context">按既定规则，仅为仍有实质机会的已回复院校整理申请信息。</div>
          </div>
        `}
      </section>

      <div class="quick-grid">
        <div class="metric"><div class="metric-label">引用量（约）</div><div class="metric-value">${esc(person.citations)}</div></div>
        <div class="metric"><div class="metric-label">H-index（约）</div><div class="metric-value">${esc(person.hIndex)}</div></div>
        <div class="metric"><div class="metric-label">i10-index（约）</div><div class="metric-value">${esc(person.i10Index)}</div></div>
        <div class="metric"><div class="metric-label">匹配度</div><div class="metric-value">${esc(person.match)}</div></div>
      </div>

      <div class="status-block">
        <div class="status-note">
          <strong>当前状态 / 结果</strong>
          ${esc(person.state)}
        </div>
        <div class="status-note positive">
          <strong>教授积极程度</strong>
          ${esc(person.positivity)}
        </div>
      </div>

      ${waiverMarkup(waiver)}

      <details class="fold-card">
        <summary>Excel 完整字段</summary>
        <div class="fold-content">
          <dl class="field-grid">
            <div class="field"><dt>排序</dt><dd>${esc(person.order)}</dd></div>
            <div class="field"><dt>回复分类</dt><dd>${esc(person.category)}</dd></div>
            <div class="field"><dt>U.S. News 全球排名</dt><dd>#${esc(person.rank)}</dd></div>
            <div class="field"><dt>教授全名</dt><dd>${esc(person.name)}</dd></div>
            <div class="field"><dt>学校 / 机构</dt><dd>${esc(person.school)}</dd></div>
            <div class="field"><dt>院系 / 项目</dt><dd>${esc(person.department)}</dd></div>
            <div class="field"><dt>研究关键词</dt><dd>${esc(person.keywords)}</dd></div>
            <div class="field"><dt>引用量（约）</dt><dd>${esc(person.citations)}</dd></div>
            <div class="field"><dt>H-index（约）</dt><dd>${esc(person.hIndex)}</dd></div>
            <div class="field"><dt>i10-index（约）</dt><dd>${esc(person.i10Index)}</dd></div>
            <div class="field"><dt>匹配度</dt><dd>${esc(person.match)}</dd></div>
            <div class="field"><dt>当前状态 / 结果</dt><dd>${esc(person.state)}</dd></div>
            <div class="field"><dt>教授积极程度</dt><dd>${esc(person.positivity)}</dd></div>
            <div class="field"><dt>备注 / 证据</dt><dd>${esc(person.note)}</dd></div>
          </dl>
          <div class="chip-row">${keywords.map((keyword) => `<span class="chip">${esc(keyword)}</span>`).join("")}</div>
        </div>
      </details>

      <details class="fold-card" id="email-fold">
        <summary>邮件原文 · 最新且最完整版本</summary>
        <div class="fold-content" id="email-content">
          ${person.emailFile ? `<div class="empty-note">展开后读取本地邮件原文…</div>` : `<div class="empty-note">当前 mail 目录中没有 ${esc(person.name)} 的 .eml 原件；此处仅保留 Excel 证据摘要。</div>`}
        </div>
      </details>

      ${admission ? `
        <details class="fold-card">
          <summary>PhD 项目、材料与门槛</summary>
          <div class="fold-content">
            <h3>${esc(admission.program)}</h3>
            <p><strong>截止：</strong>${esc(formatDate(admission.deadline))} · ${esc(admission.deadlineContext)}</p>
            <h4>需要准备</h4>
            ${listMarkup(admission.materials)}
            <h4>官网硬性门槛与政策</h4>
            ${listMarkup(admission.hardThresholds || admission.thresholds)}
            ${admission.softThresholds ? `
              <h4>软性竞争指标 · 非官方最低线</h4>
              ${listMarkup(admission.softThresholds)}
              <p class="advisory-note">软性指标用于判断冲刺强度和完善材料，不代表达到数字即可录取，也不应覆盖官网硬性要求。</p>
            ` : ""}
            <p class="source-note">来源：${esc(admission.sourceLabel)}。政策可能继续更新，提交前应在内置网页中再次核对。</p>
            <div class="button-row">
              ${linkButton(admission.applyUrl, "打开申请系统", true)}
              ${linkButton(admission.programUrl, "查看官方项目要求")}
            </div>
          </div>
        </details>
        <details class="fold-card">
          <summary>申请费用、学费与博士工资 / Stipend</summary>
          <div class="fold-content">${phdFinanceMarkup(admission.finance)}</div>
        </details>
      ` : ""}

      <details class="fold-card">
        <summary>判断依据与备注</summary>
        <div class="fold-content"><p>${esc(person.note)}</p></div>
      </details>
    `;

    wireLinks(content);
    const emailFold = content.querySelector("#email-fold");
    if (emailFold && person.emailFile) {
      emailFold.addEventListener("toggle", () => {
        if (emailFold.open && !emailFold.dataset.loaded) {
          emailFold.dataset.loaded = "true";
          loadEmail(person);
        }
      });
    }
  }

  async function loadEmail(person) {
    const target = document.querySelector("#email-content");
    if (!target) return;
    if (!window.desktopAPI?.readEmail) {
      target.innerHTML = `<div class="empty-note">邮件原文读取功能仅在 Electron 桌面版中可用。</div>`;
      return;
    }
    target.innerHTML = `<div class="empty-note">正在解析 ${esc(person.emailFile)}…</div>`;
    try {
      const email = await window.desktopAPI.readEmail(person.emailFile);
      target.innerHTML = `
        <div class="email-meta">
          <strong>主题</strong><span>${esc(email.subject)}</span>
          <strong>日期</strong><span>${esc(email.date ? new Date(email.date).toLocaleString("zh-CN") : "未识别")}</span>
          <strong>发件人</strong><span>${esc(email.from || "未识别")}</span>
          <strong>收件人</strong><span>${esc(email.to || "未识别")}</span>
        </div>
        <pre class="email-body">${esc(email.text || "邮件没有可提取的纯文本正文。")}</pre>
      `;
    } catch (error) {
      target.innerHTML = `<div class="empty-note">读取失败：${esc(error.message || error)}</div>`;
    }
  }

  function renderMasters() {
    const feeFreePrograms = data.masters
      .filter((program) => Number(program.finance.applicationFeeUsd) === 0)
      .sort((a, b) => a.deadline.localeCompare(b.deadline) || a.priority - b.priority);
    const paidPrograms = data.masters.filter((program) => Number(program.finance.applicationFeeUsd) !== 0);
    const monthOrder = [...new Set(paidPrograms.map((program) => program.deadline.slice(0, 7)))].sort();
    const monthLabel = (month) => {
      const [year, monthNumber] = month.split("-");
      return `${year} 年 ${Number(monthNumber)} 月截止`;
    };

    const feeFreeGroup = feeFreePrograms.length ? (() => {
      const firstDeadline = feeFreePrograms[0].deadline;
      const groupTimer = countdown(firstDeadline, true);
      return `
        <details class="directory-group fee-free-group">
          <summary>
            <span class="group-name">免申请费 · TOP 50 增补</span>
            <span class="group-count">${feeFreePrograms.length} 项</span>
            <span class="countdown ${groupTimer.className}" title="本组最早截止 ${formatDate(firstDeadline)}">${esc(groupTimer.text)}</span>
          </summary>
          <div class="directory-items">
            ${feeFreePrograms.map(masterDirectoryItem).join("")}
          </div>
        </details>
      `;
    })() : "";

    const paidGroups = monthOrder.map((month) => {
      const programs = paidPrograms.filter((program) => program.deadline.startsWith(month));
      if (!programs.length) return "";
      const firstDeadline = [...programs]
        .map((program) => program.waiver?.recommendedDeadline || program.deadline)
        .sort()[0];
      const groupTimer = countdown(firstDeadline, true);
      return `
        <details class="directory-group">
          <summary>
            <span class="group-name">${esc(monthLabel(month))}</span>
            <span class="group-count">${programs.length} 项</span>
            <span class="countdown ${groupTimer.className}" title="本组最早截止 ${formatDate(firstDeadline)}">${esc(groupTimer.text)}</span>
          </summary>
          <div class="directory-items">
            ${programs.map(masterDirectoryItem).join("")}
          </div>
        </details>
      `;
    }).join("");
    const groups=window.SelectionDirectory.groups("MS",data.masters,masterDirectoryItem);

    appMain.innerHTML = `
      <section class="dashboard">
        <aside class="directory">
          <div class="directory-head">
            <p class="eyebrow">NORTH AMERICA · FALL 2027</p>
            <h1>北美硕士 TOP 50</h1>
            <div class="directory-meta">
              <span>${data.masters.length} 个项目</span><span>${feeFreePrograms.length} 个免申请费</span><span>无强制 GRE</span>
            </div>
          </div>
          <div class="directory-groups">${groups}</div>
        </aside>
        <article id="masters-content" class="content-pane"></article>
      </section>
    `;

    appMain.querySelectorAll("[data-master-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedMasterId = button.dataset.masterId;localStorage.setItem("orbit:application-master",selectedMasterId);
        appMain.querySelectorAll("[data-master-id]").forEach((item) => item.classList.toggle("selected", item === button));
        renderMasterDetail(data.masters.find((program) => program.id === selectedMasterId));
      });
    });

    const selected = data.masters.find((program) => program.id === selectedMasterId);
    if (selected) {
      const selectedButton = appMain.querySelector(`[data-master-id="${CSS.escape(selected.id)}"]`);
      if (selectedButton) {
        selectedButton.classList.add("selected");
        selectedButton.closest("details").open = true;
      }
      renderMasterDetail(selected);
    } else {
      renderMastersWelcome();
    }
  }

  function masterDirectoryItem(program) {
    const actionDeadline = program.deadline;
    const timer = countdown(actionDeadline, true);
    const isFree = Number(program.finance.applicationFeeUsd) === 0;
    return `
      <button class="record-button master-card" type="button" data-master-id="${esc(program.id)}">
        <span class="record-top">
          <span class="program-index">${String(program.priority).padStart(2, "0")}</span>
          <span class="record-name">${esc(program.university)}</span>
          <span class="countdown ${timer.className}" title="申请截止 ${formatDate(actionDeadline)}">${esc(timer.text)}</span>
        </span>
        ${window.CompletionFinance.summary(program)}
        <span class="master-bottom">
          <span class="school-short">${esc(program.program)}</span>
          <span class="gre-badge">GRE ${esc(program.gre.split("（")[0])}</span>
          <span class="fee-badge${isFree ? " free" : ""}">${isFree ? "申请费 $0" : `申请 ${esc(formatUsd(program.finance.applicationFeeUsd))}`}</span>
          ${window.CompletionFinance.badge(program.id)}
        </span>
      </button>
    `;
  }

  function renderMastersWelcome() {
    const content = document.querySelector("#masters-content");
    const nearest = [...data.masters].sort((a, b) =>
      (a.waiver?.recommendedDeadline || a.deadline).localeCompare(b.waiver?.recommendedDeadline || b.deadline)
    )[0];
    const nearestDeadline = nearest.waiver?.recommendedDeadline || nearest.deadline;
    const nearestTimer = countdown(nearestDeadline);
    const feeFreeCount = data.masters.filter((program) => Number(program.finance.applicationFeeUsd) === 0).length;
    content.innerHTML = `
      <section class="detail-hero">
        <div>
          <p class="hero-kicker">CURATED MASTER'S SHORTLIST</p>
          <h2>北美名校硕士 · ${data.masters.length} 项</h2>
          <p class="subtitle">扩展到北美 TOP 50 范围，并把与你的技术背景相符、官网明确申请费为 0 的项目集中列出。</p>
        </div>
        <div class="deadline-panel ${nearestTimer.className}">
          <div class="deadline-label">${nearest.waiver ? "最早 WAIVER 安全截止" : "最早截止"}</div>
          <div class="deadline-date">${esc(formatDate(nearestDeadline))}</div>
          <div class="deadline-countdown ${nearestTimer.className}">${esc(nearestTimer.text)}</div>
          <div class="deadline-context">${esc(nearest.university)} · ${esc(nearest.program)}</div>
        </div>
      </section>
      <div class="quick-grid">
        <div class="metric"><div class="metric-label">项目总数</div><div class="metric-value">${data.masters.length}</div></div>
        <div class="metric"><div class="metric-label">免申请费</div><div class="metric-value">${feeFreeCount}</div></div>
        <div class="metric"><div class="metric-label">强制 GRE</div><div class="metric-value">0</div></div>
        <div class="metric"><div class="metric-label">12 月截止</div><div class="metric-value">${data.masters.filter((p) => p.deadline.startsWith("2026-12")).length}</div></div>
      </div>
      <details class="fold-card">
        <summary>筛选与使用说明</summary>
        <div class="fold-content">
          <p>这里的“TOP 50”沿用综合大学与工程项目声誉的申请池口径，面向你的科学计算、流体、图形学、机器人与 SciML 背景筛选，不声称是某一单一榜单的机械 1–50 排名。</p>
          <p>“免申请费”只收录官网对当前招生周期明确写明 $0 的项目；活动码、说明会减免和仅限美国本土申请人的 waiver 不计入。</p>
          <p>申请费为 0 不代表申请完全零成本：TOEFL 送分、成绩认证和推荐信沟通仍可能产生费用或时间成本。</p>
          <p>目录显示的是优先或主要截止日；有滚动轮次或国际生 final deadline 的项目，会在详情中单独标注。</p>
        </div>
      </details>
      <div class="source-note">申请政策可能变化。每个项目都附官方项目页和申请入口；在提交前请在同一窗口的内置浏览器里复核最新日期、语言成绩和材料要求。</div>
    `;
  }

  function renderMasterDetail(program) {
    return window.ApplicationDetails.master(program,document.querySelector("#masters-content"));
    const content = document.querySelector("#masters-content");
    if (!content || !program) return;
    const actionDeadline = program.deadline;
    const timer = countdown(actionDeadline);
    content.innerHTML = `
      <section class="detail-hero">
        <div>
          <p class="hero-kicker">${Number(program.finance.applicationFeeUsd) === 0 ? "FEE-FREE · " : ""}${program.rankingTier ? `${esc(program.rankingTier)} · ` : ""}PRIORITY ${String(program.priority).padStart(2, "0")}</p>
          <h2>${esc(program.university)}</h2>
          <p class="subtitle">${esc(program.program)} · ${esc(program.focus)}</p>
        </div>
        <div class="deadline-panel ${timer.className}">
          <div class="deadline-label">${program.waiver ? "WAIVER 安全截止" : "申请截止"}</div>
          <div class="deadline-date">${esc(formatDate(actionDeadline))}</div>
          <div class="deadline-countdown ${timer.className}">${esc(timer.text)}</div>
          <div class="deadline-context">${program.waiver ? `官网规则推算最晚 ${esc(formatDate(program.waiver.officialRequestDeadline))} · 申请最终 ${esc(formatDate(program.deadline))}` : esc(program.deadlineContext)}</div>
        </div>
      </section>

      <div class="quick-grid">
        <div class="metric"><div class="metric-label">推荐序</div><div class="metric-value">${String(program.priority).padStart(2, "0")}</div></div>
        <div class="metric"><div class="metric-label">GRE 政策</div><div class="metric-value">${esc(program.gre)}</div></div>
        <div class="metric"><div class="metric-label">申请费</div><div class="metric-value">${Number(program.finance.applicationFeeUsd) === 0 ? "$0 · 免费" : esc(formatUsd(program.finance.applicationFeeUsd))}</div></div>
        <div class="metric"><div class="metric-label">剩余时间</div><div class="metric-value">${esc(countdown(program.deadline, true).text)}</div></div>
      </div>

      ${waiverMarkup(program.waiver)}

      <details class="fold-card">
        <summary>申请材料</summary>
        <div class="fold-content">${listMarkup(program.requirements)}</div>
      </details>
      <details class="fold-card">
        <summary>门槛与适配方向</summary>
        <div class="fold-content">
          ${program.hardThresholds ? `
            <h4>官网硬性门槛与政策</h4>
            ${listMarkup(program.hardThresholds)}
          ` : `<p><strong>门槛：</strong>${esc(program.threshold)}</p>`}
          ${program.softThresholds ? `
            <h4>软性竞争指标 · 非官方最低线</h4>
            ${listMarkup(program.softThresholds)}
            <p class="advisory-note">建议线综合学校公开竞争数据、项目规模与研究型申请常见评价维度，仅用于准备材料；不是 Princeton 官方录取分数线。</p>
          ` : ""}
          <p><strong>适配方向：</strong>${esc(program.focus)}</p>
          <p><strong>GRE：</strong>${esc(program.gre)}</p>
        </div>
      </details>
      <details class="fold-card">
        <summary>申请费用与学费</summary>
        <div class="fold-content">${masterFinanceMarkup(program.finance)}</div>
      </details>
      <details class="fold-card">
        <summary>官方入口</summary>
        <div class="fold-content">
          <p class="source-note">点击后在当前软件窗口上方新增浏览器标签，不会跳出到外部浏览器。</p>
          <div class="button-row">
            ${linkButton(program.applyUrl, "直接进入申请", true)}
            ${linkButton(program.programUrl, "查看官方要求")}
          </div>
        </div>
      </details>
    `;
    wireLinks(content);
  }

  function wireLinks(root) {
    root.querySelectorAll(".open-link").forEach((button) => {
      button.addEventListener("click", () => openBrowserTab(button.dataset.url, button.dataset.title));
    });
  }

  function normalizeUrl(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "https://www.google.com/";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  }

  function openBrowserTab(url, title = "申请网页") {
    window.desktopAPI.openWebsite(normalizeUrl(url));return;
    const normalized = normalizeUrl(url);
    const existing = tabs.find((tab) => tab.type === "browser" && tab.url === normalized);
    if (existing) {
      activateTab(existing.id);
      return;
    }
    const tab = {
      id: `browser-${++browserSequence}`,
      type: "browser",
      title: title || "申请网页",
      icon: "●",
      url: normalized,
    };
    tabs.push(tab);
    activeTabId = tab.id;
    renderTabs();
    renderBrowser(tab);
  }

  function closeBrowserTab(tabId) {
    const index = tabs.findIndex((tab) => tab.id === tabId && tab.type === "browser");
    if (index < 0) return;
    const wasActive = activeTabId === tabId;
    tabs.splice(index, 1);
    if (wasActive) {
      activeTabId = tabs[Math.max(0, index - 1)]?.id || "outreach";
    }
    renderTabs();
    renderActiveTab();
  }

  function renderBrowser(tab) {
    appMain.replaceChildren(browserTemplate.content.cloneNode(true));
    const webview = appMain.querySelector("webview");
    const address = appMain.querySelector(".address-input");
    const status = appMain.querySelector(".browser-status");
    const back = appMain.querySelector(".browser-back");
    const forward = appMain.querySelector(".browser-forward");
    const reload = appMain.querySelector(".browser-reload");
    const go = appMain.querySelector(".browser-go");

    address.value = tab.url;
    webview.src = tab.url;
    status.textContent = "正在载入…";

    const navigate = () => {
      const url = normalizeUrl(address.value);
      tab.url = url;
      webview.loadURL(url);
    };

    back.addEventListener("click", () => webview.canGoBack() && webview.goBack());
    forward.addEventListener("click", () => webview.canGoForward() && webview.goForward());
    reload.addEventListener("click", () => webview.reload());
    go.addEventListener("click", navigate);
    address.addEventListener("keydown", (event) => {
      if (event.key === "Enter") navigate();
    });

    webview.addEventListener("did-start-loading", () => {
      status.textContent = "正在载入…";
    });
    webview.addEventListener("did-stop-loading", () => {
      status.textContent = "已载入";
      address.value = webview.getURL() || tab.url;
      back.disabled = !webview.canGoBack();
      forward.disabled = !webview.canGoForward();
    });
    ["did-navigate", "did-navigate-in-page"].forEach((eventName) => {
      webview.addEventListener(eventName, (event) => {
        address.value = event.url;
        tab.url = event.url;
      });
    });
    webview.addEventListener("page-title-updated", (event) => {
      tab.title = event.title || tab.title;
      renderTabs();
    });
    webview.addEventListener("did-fail-load", (event) => {
      if (event.errorCode === -3) return;
      status.textContent = `载入失败：${event.errorDescription}`;
    });
  }

  newTabButton.addEventListener("click", () => openBrowserTab("https://www.google.com/", "新标签页"));

  window.addEventListener("keydown", (event) => {
    const tab = tabs.find((item) => item.id === activeTabId);
    if (!tab || tab.type !== "browser") return;
    const webview = appMain.querySelector("webview");
    const address = appMain.querySelector(".address-input");
    if (event.ctrlKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      address?.focus();
      address?.select();
    }
    if (event.ctrlKey && event.key.toLowerCase() === "r") {
      event.preventDefault();
      webview?.reload();
    }
    if (event.altKey && event.key === "ArrowLeft" && webview?.canGoBack()) webview.goBack();
    if (event.altKey && event.key === "ArrowRight" && webview?.canGoForward()) webview.goForward();
  });

  window.SelectionDirectory.setOnChange(()=>{if(activeTabId==="outreach")renderOutreach();if(activeTabId==="masters")renderMasters();});
  window.ApplicationDetails.showPlan=()=>activateTab("plan");
  window.ApplicationPlan.viewRecord=id=>{if(id.startsWith("phd-")){selectedProfessorId=id.slice(4);localStorage.setItem("orbit:application-professor",selectedProfessorId);activateTab("outreach");}else{selectedMasterId=id;localStorage.setItem("orbit:application-master",selectedMasterId);activateTab("masters");}};
  window.ApplicationNavigation={activate:activateTab,active:()=>activeTabId};
  window.desktopAPI?.onOpenBrowserTab((url) => openBrowserTab(url, "网页"));

  activateTab(parent.OrbitApplications?.activeTab()||"plan");
})();
