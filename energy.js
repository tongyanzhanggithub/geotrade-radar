(() => {
  "use strict";

  // ===========================================================
  // 能源与大宗商品雷达 · Energy & Commodities Radar
  // 单页应用：会话校验 + 哈希路由 + 5 个商品情报模块
  // 数据：/api/energy/snapshot（Yahoo Finance 实时报价，失败降级演示）
  // ===========================================================

  const guard = document.getElementById("en-guard");
  const app = document.getElementById("en-app");
  const main = document.getElementById("en-main");
  const nav = document.getElementById("en-nav");
  const logoutButton = document.getElementById("en-logout");
  const updated = document.getElementById("en-updated");
  const toast = document.getElementById("en-toast");

  const VIEWS = ["home", "overview", "energy", "metals", "agri", "events"];
  const state = { view: "home" };
  const liveData = { snapshot: null, loading: false, failed: false, events: null, eventsLoading: false };

  // ----------------------- 工具函数 -----------------------
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "")) ? String(u) : "");

  function pct(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return "<b>—</b>";
    const cls = n >= 0 ? "cn-pos" : "cn-neg";
    return `<b class="${cls}">${n >= 0 ? "+" : ""}${n}%</b>`;
  }

  const RISK_KEY = { 高: "high", 偏高: "high", 关注: "mid", 低: "low" };
  function riskTag(level) {
    return `<span class="cn-risk cn-risk--${RISK_KEY[level] || "mid"}">${esc(level)}</span>`;
  }

  function viewHead(title, sub) {
    return `<div class="cn-view-head"><h2>${esc(title)}</h2><p>${esc(sub)}</p></div>`;
  }
  function panel(title, body) {
    return `<section class="cn-panel"><h3 class="cn-panel-title">${esc(title)}</h3>${body}</section>`;
  }

  function spark(points, change) {
    if (!points || points.length < 2) return "";
    const color = change >= 0 ? "var(--cn-green, #2bbb6b)" : "var(--cn-red, #e0564f)";
    const n = points.length;
    const pts = points.map((y, i) => `${((i / (n - 1)) * 100).toFixed(1)},${y.toFixed(1)}`).join(" ");
    return `<svg class="cn-spark" viewBox="0 0 100 28" preserveAspectRatio="none" style="height:28px;width:90px"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
  }

  function commodityCard(c) {
    return `
      <section class="cn-panel cn-route-card">
        <div class="cn-route-head">
          <div>
            <h3 class="cn-panel-title">${esc(c.name)}</h3>
            <small class="cn-muted">${esc(c.unit)}${c.real ? "" : " · 演示"}</small>
          </div>
          ${spark(c.points, c.change)}
        </div>
        <div class="cn-route-meta">
          <strong style="font-size:20px">${esc(c.value)}</strong>
          ${pct(c.change)}
          ${riskTag(c.risk)}
        </div>
        <p>${esc(c.driver)}</p>
      </section>`;
  }

  function groupCards(group) {
    if (!group || !group.items.length) return `<p class="cn-muted">暂无数据。</p>`;
    return `<div class="cn-grid cn-grid--2">${group.items.map(commodityCard).join("")}</div>`;
  }

  function modeBanner(mode) {
    if (mode === "live") return "";
    const text =
      mode === "demo"
        ? "Yahoo Finance 实时报价暂不可用，当前为演示数据。"
        : "部分品种实时报价暂不可用，已用演示值补足（卡片标注「演示」）。";
    return `<div class="cn-banner cn-banner--warn" style="margin:8px 0;padding:10px 14px;border-radius:8px;background:rgba(224,86,79,.1);color:var(--cn-red,#e0564f);font-size:13px">${esc(text)}</div>`;
  }

  function groupOf(s, id) {
    return (s.groups || []).find((g) => g.id === id);
  }

  // ----------------------- 视图 -----------------------
  function viewHome() {
    const s = liveData.snapshot;
    const sum = s ? s.summary : null;
    const kpis = sum
      ? [
          { k: "监测品种", v: `${sum.realCount} / ${sum.count}`, note: "实时 / 总数" },
          { k: "高波动品种", v: String(sum.highRisk), note: "单日波动 ≥ 2%" },
          {
            k: "领涨",
            v: sum.topGainers[0] ? sum.topGainers[0].name : "—",
            note: sum.topGainers[0] ? `+${sum.topGainers[0].change}%` : "",
          },
        ]
      : [];
    return `
      <div class="cn-home">
        <section class="cn-hero">
          <span class="cn-eyebrow">ENERGY &amp; COMMODITIES</span>
          <h1>追踪能源与大宗商品的价格与风险</h1>
          <p>覆盖原油天然气、贵金属、工业金属与农产品的实时报价、驱动因素与地缘供给风险，第一时间捕捉价格异动与传导链条。</p>
          <div class="cn-hero-actions">
            <button class="cn-cta" data-go="overview" type="button">进入商品总览 →</button>
            <button class="cn-cta cn-cta--ghost" data-go="energy" type="button">查看能源板块</button>
          </div>
        </section>
        ${
          kpis.length
            ? panel(
                "今日商品概览",
                `${modeBanner(s.mode)}<div class="cn-mini-kpis">${kpis
                  .map((t) => `<div class="cn-mini-kpi"><span>${esc(t.k)}</span><strong>${esc(t.v)}</strong><small>${esc(t.note)}</small></div>`)
                  .join("")}</div>`
              )
            : panel("正在加载商品数据", `<p class="cn-muted">正在同步 Yahoo Finance 报价…</p>`)
        }
      </div>`;
  }

  function viewOverview() {
    const s = liveData.snapshot;
    if (!s) return viewHead("商品总览", "正在同步…") + loadingPanel();
    const moverRow = (arr, sign) =>
      arr.length
        ? `<ul class="cn-list">${arr.map((m) => `<li>${esc(m.name)} ${pct(m.change)}</li>`).join("")}</ul>`
        : `<p class="cn-muted">无${sign}</p>`;
    return (
      viewHead("商品总览", "能源 / 贵金属 / 工业金属 / 农产品 全景报价") +
      modeBanner(s.mode) +
      `<div class="cn-grid cn-grid--2">
        ${panel("领涨品种", moverRow(s.summary.topGainers, "上涨"))}
        ${panel("领跌品种", moverRow(s.summary.topLosers, "下跌"))}
      </div>` +
      (s.groups || [])
        .map((g) => panel(`${g.label}（${g.items.length}）`, `<div class="cn-grid cn-grid--2">${g.items.map(commodityCard).join("")}</div>`))
        .join("")
    );
  }

  function viewEnergy() {
    const s = liveData.snapshot;
    if (!s) return viewHead("能源", "正在同步…") + loadingPanel();
    return viewHead("能源", "原油、天然气与成品油（实时报价 + 驱动因素）") + modeBanner(s.mode) + groupCards(groupOf(s, "energy"));
  }

  function viewMetals() {
    const s = liveData.snapshot;
    if (!s) return viewHead("金属", "正在同步…") + loadingPanel();
    return (
      viewHead("金属", "贵金属与工业金属") +
      modeBanner(s.mode) +
      panel("贵金属", groupCards(groupOf(s, "precious"))) +
      panel("工业金属", groupCards(groupOf(s, "base")))
    );
  }

  function viewAgri() {
    const s = liveData.snapshot;
    if (!s) return viewHead("农产品", "正在同步…") + loadingPanel();
    return viewHead("农产品", "谷物与软商品（粮食、糖、咖啡等）") + modeBanner(s.mode) + groupCards(groupOf(s, "agri"));
  }

  const DEMO_EVENTS = [
    { title: "OPEC+ 维持自愿减产，油价获支撑", node: "原油", impact: "布伦特 +1~2%", risk: "偏高", time: "30 分钟前" },
    { title: "黑海出口扰动，小麦买家寻替代来源", node: "小麦", impact: "运费与升贴水上行", risk: "偏高", time: "1 小时前" },
    { title: "AI 数据中心与电网用铜需求预期上调", node: "铜", impact: "支撑中长期价格", risk: "关注", time: "2 小时前" },
    { title: "暖冬压制取暖需求，天然气走弱", node: "天然气", impact: "NG −2%", risk: "偏高", time: "3 小时前" },
    { title: "实际利率回落，黄金避险买盘升温", node: "黄金", impact: "金价站稳高位", risk: "关注", time: "5 小时前" },
  ];

  function liveEventCard(e) {
    const u = safeUrl(e.sourceUrl);
    const sev = e.score >= 80 ? "高" : e.score >= 65 ? "偏高" : "关注";
    return `
      <section class="cn-panel cn-route-card">
        <div class="cn-route-head">
          <div><h3 class="cn-panel-title">${esc(e.title)}</h3><small class="cn-muted">${esc(e.source || "公开来源")} · ${esc(e.time || "实时")}</small></div>
          ${riskTag(sev)}
        </div>
        ${e.summary ? `<p>${esc(e.summary)}</p>` : ""}
        ${u ? `<div class="cn-route-meta"><a class="cn-chip" href="${esc(u)}" target="_blank" rel="noopener noreferrer">查看原文 ↗</a></div>` : ""}
      </section>`;
  }

  function demoEventCard(e) {
    return `
      <section class="cn-panel cn-route-card">
        <div class="cn-route-head">
          <div><h3 class="cn-panel-title">${esc(e.title)}</h3><small class="cn-muted">品种：${esc(e.node)} · ${esc(e.time)} · 示例</small></div>
          ${riskTag(e.risk)}
        </div>
        <div class="cn-route-meta"><span class="cn-chip">${esc(e.impact)}</span></div>
      </section>`;
  }

  function viewEvents() {
    const live = liveData.events;
    if (live && live.length) {
      return (
        viewHead("大宗事件", `影响能源与大宗商品的实时事件（${live.length} 条 · 来源 GDELT/公开新闻）`) +
        `<div class="cn-grid cn-grid--2">${live.map(liveEventCard).join("")}</div>`
      );
    }
    const note = liveData.eventsLoading ? "正在同步实时事件…" : "实时大宗事件暂无，以下为示例：";
    return (
      viewHead("大宗事件", `影响能源与大宗商品价格的事件 · ${note}`) +
      `<div class="cn-grid cn-grid--2">${DEMO_EVENTS.map(demoEventCard).join("")}</div>`
    );
  }

  function loadingPanel() {
    if (liveData.failed) return panel("数据暂不可用", `<p class="cn-muted">商品数据同步失败，请稍后刷新页面重试。</p>`);
    return panel("加载中", `<p class="cn-muted">正在同步商品报价…</p>`);
  }

  const RENDERERS = {
    home: viewHome,
    overview: viewOverview,
    energy: viewEnergy,
    metals: viewMetals,
    agri: viewAgri,
    events: viewEvents,
  };

  // 顶栏状态徽章：由实时报价计算
  function setStatus(s) {
    const pulse = document.getElementById("en-pulse");
    const risk = document.getElementById("en-risk");
    const up = s.commodities.filter((c) => c.change > 0).length;
    const down = s.commodities.filter((c) => c.change < 0).length;
    if (pulse) pulse.textContent = up > down ? `多数上涨（${up}↑）` : up < down ? `多数下跌（${down}↓）` : "涨跌分化";
    if (risk) {
      const h = s.summary.highRisk;
      risk.textContent = h >= 4 ? `高（${h} 个高波动）` : h >= 1 ? `偏高（${h} 个）` : "平稳";
    }
  }

  // 实时大宗事件：从全局快照按 energy 分类拉取（月窗口取更多）
  function ensureEvents() {
    if (liveData.events || liveData.eventsLoading) return;
    liveData.eventsLoading = true;
    fetch("/api/snapshot?period=month", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((snap) => {
        liveData.events = (snap.events || []).filter((e) => e.category === "energy");
      })
      .catch(() => {
        liveData.events = [];
      })
      .finally(() => {
        liveData.eventsLoading = false;
        if (state.view === "events") render();
      });
  }

  // ----------------------- 数据加载 -----------------------
  function ensureSnapshot() {
    if (liveData.snapshot || liveData.loading || liveData.failed) return;
    liveData.loading = true;
    fetch("/api/energy/snapshot", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        liveData.snapshot = data;
        if (updated) {
          updated.textContent =
            data.mode === "live" ? "实时报价" : data.mode === "partial" ? "部分实时" : "演示数据";
        }
        setStatus(data);
      })
      .catch(() => {
        liveData.failed = true;
        if (updated) updated.textContent = "同步失败";
      })
      .finally(() => {
        liveData.loading = false;
        render();
      });
  }

  // ----------------------- 路由 / 渲染 -----------------------
  function render() {
    const fn = RENDERERS[state.view] || viewHome;
    main.innerHTML = fn();
    window.scrollTo(0, 0);
    updateNav();
    ensureSnapshot();
    if (state.view === "events") ensureEvents();
  }

  function updateNav() {
    nav.querySelectorAll("a[data-nav]").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("data-nav") === state.view);
    });
  }

  function go(view) {
    if (!VIEWS.includes(view)) view = "home";
    if ("#" + view !== window.location.hash) window.location.hash = view;
    else {
      state.view = view;
      render();
    }
  }

  function syncFromHash() {
    const h = (window.location.hash || "#home").replace(/^#/, "");
    state.view = VIEWS.includes(h) ? h : "home";
    render();
  }

  function bindGlobalEvents() {
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-go]");
      if (t && main.contains(t)) go(t.getAttribute("data-go"));
    });
    window.addEventListener("hashchange", syncFromHash);
    if (logoutButton) {
      logoutButton.addEventListener("click", async () => {
        try {
          await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
        } catch {
          // ignore
        }
        window.location.href = "index.html";
      });
    }
  }

  // ----------------------- 会话校验 + 启动 -----------------------
  async function boot() {
    let user = null;
    try {
      const res = await fetch("/api/me", { credentials: "same-origin" });
      const data = await res.json();
      user = data.user || null;
    } catch {
      user = null;
    }
    if (!user) {
      window.location.replace("index.html");
      return;
    }
    guard.hidden = true;
    app.hidden = false;
    bindGlobalEvents();
    syncFromHash();
  }

  boot();
})();
