(() => {
  "use strict";

  // ===========================================================
  // 供应链与航运雷达 · Supply Chain & Shipping Radar
  // 单页应用：会话校验 + 哈希路由 + 5 个航运情报模块
  // 数据：/api/shipping/snapshot（SCFI 实时运价 + 航线/节点参考模型）
  // ===========================================================

  const guard = document.getElementById("sp-guard");
  const app = document.getElementById("sp-app");
  const main = document.getElementById("sp-main");
  const nav = document.getElementById("sp-nav");
  const logoutButton = document.getElementById("sp-logout");
  const updated = document.getElementById("sp-updated");
  const toast = document.getElementById("sp-toast");

  const VIEWS = ["home", "overview", "routes", "chokepoints", "freight", "events"];

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

  // 状态 → 风险色（复用 cn-risk）
  const STATUS_KEY = { 严重: "high", 偏高: "high", 关注: "mid", 稳定: "low" };
  function statusTag(status) {
    return `<span class="cn-risk cn-risk--${STATUS_KEY[status] || "mid"}">${esc(status)}</span>`;
  }
  function levelColor(level) {
    return level >= 80 ? "var(--cn-red)" : level >= 60 ? "var(--cn-gold)" : "var(--cn-green)";
  }

  function viewHead(title, sub) {
    return `<div class="cn-view-head"><h2>${esc(title)}</h2><p>${esc(sub)}</p></div>`;
  }
  function panel(title, body) {
    return `<section class="cn-panel"><h3 class="cn-panel-title">${esc(title)}</h3>${body}</section>`;
  }
  function tagList(arr) {
    return `<div class="cn-tags">${arr.map((t) => `<span>${esc(t)}</span>`).join("")}</div>`;
  }
  function ring(score, label) {
    const color = score >= 80 ? "var(--cn-red)" : score >= 65 ? "var(--cn-gold)" : "var(--cn-green)";
    return `<div class="cn-ring" style="--p:${score};--ring:${color}">
      <div class="cn-ring-core"><strong>${score}</strong><span>${esc(label || "压力指数")}</span></div>
    </div>`;
  }

  // 横向压力条：items = [{label, value(0-100), note, color?}]
  function bars(items) {
    const max = Math.max(...items.map((i) => i.value)) || 1;
    return `<div class="cn-bars">${items
      .map(
        (i) => `
      <div class="cn-bar-row">
        <span class="cn-bar-label">${esc(i.label)}</span>
        <span class="cn-bar-track"><i style="width:${Math.round((i.value / max) * 100)}%;background:${
          i.color || levelColor(i.value)
        }"></i></span>
        <span class="cn-bar-val">${esc(i.note != null ? i.note : i.value)}</span>
      </div>`
      )
      .join("")}</div>`;
  }

  // ----------------------- 演示数据（供应链事件，待接入实时流） -----------------------
  const DEMO_EVENTS = [
    {
      title: "红海航运风险再度上升",
      summary: "多家承运商延长好望角绕行计划，亚洲至欧洲航线成本与保险溢价同步上升。",
      node: "红海 / 苏伊士",
      impact: "成本 +18% · 船期 +12 天",
      status: "严重",
      time: "18 分钟前",
    },
    {
      title: "巴拿马运河旱季配额限制延续",
      summary: "通行船舶数量受限，亚洲—美东航线等待时间拉长，转运与铁路联运需求上升。",
      node: "巴拿马运河",
      impact: "船期 +6 天",
      status: "偏高",
      time: "1 小时前",
    },
    {
      title: "黑海粮食港口装运出现延误",
      summary: "港口检查和天气共同影响装运，谷物买家开始评估替代来源。",
      node: "博斯普鲁斯",
      impact: "运费 +7%",
      status: "偏高",
      time: "2 小时前",
    },
    {
      title: "霍尔木兹海峡能源运输保险报价上调",
      summary: "地区局势推高油轮风险溢价，部分货主提前锁定运力与保险。",
      node: "霍尔木兹",
      impact: "保险 +9%",
      status: "严重",
      time: "3 小时前",
    },
    {
      title: "马六甲转口合规审查趋严",
      summary: "原产地与转口审查加强，部分电子与锂电材料货物清关周期延长。",
      node: "马六甲",
      impact: "合规 +2%",
      status: "稳定",
      time: "5 小时前",
    },
  ];

  // ----------------------- 视图 -----------------------
  function viewHome() {
    const s = liveData.snapshot;
    const sum = s ? s.summary : null;
    const kpis = sum
      ? [
          { k: "高压航线", v: `${sum.highPressureRoutes} / ${sum.routeCount}`, note: "评分 ≥ 70" },
          { k: "严重节点", v: String(sum.severeChokepoints), note: "受阻指数 ≥ 80" },
          { k: "压力最高航线", v: sum.topRoute || "—", note: `指数 ${sum.topRouteScore ?? "—"}` },
        ]
      : [];
    const scfi = s && s.composite ? s.composite : null;
    return `
      <div class="cn-home">
        <section class="cn-hero">
          <span class="cn-eyebrow">SUPPLY CHAIN &amp; SHIPPING</span>
          <h1>掌握全球航运咽喉与航线压力</h1>
          <p>整合上海航交所 SCFI 实时运价、关键海峡与运河的运营态势、以及全球贸易航线压力，第一时间发现供应链中断与成本传导。</p>
          <div class="cn-hero-actions">
            <button class="cn-cta" data-go="overview" type="button">进入航运总览 →</button>
            <button class="cn-cta cn-cta--ghost" data-go="routes" type="button">查看航线压力</button>
          </div>
        </section>
        ${
          kpis.length
            ? panel(
                "今日航运概览",
                `<div class="cn-mini-kpis">${kpis
                  .map((t) => `<div class="cn-mini-kpi"><span>${esc(t.k)}</span><strong>${esc(t.v)}</strong><small>${esc(t.note)}</small></div>`)
                  .join("")}</div>${
                  scfi
                    ? `<small class="cn-spark-note">SCFI 综合运价 ${scfi.current} · 较上期 ${pct(scfi.changePct)}（${esc(scfi.date || "")}）</small>`
                    : `<small class="cn-spark-note">SCFI 实时运价同步中或暂不可用，下方模块以参考模型展示。</small>`
                }`
              )
            : panel("正在加载航运数据", `<p class="cn-muted">正在同步 SCFI 运价与航线压力…</p>`)
        }
      </div>`;
  }

  function viewOverview() {
    const s = liveData.snapshot;
    if (!s) return viewHead("航运总览", "正在同步…") + loadingPanel();
    const topRoutes = s.routes.slice(0, 6).map((r) => ({ label: r.name, value: r.score, note: `${r.score} · ${r.change}` }));
    const topNodes = [...s.chokepoints].sort((a, b) => b.level - a.level).slice(0, 6).map((c) => ({ label: c.name, value: c.level, note: `${c.level} · ${c.status}` }));
    const scfi = s.composite;
    return (
      viewHead("航运总览", "SCFI 实时运价 + 关键节点与航线压力态势") +
      `<div class="cn-grid cn-grid--2">
        ${panel(
          "SCFI 综合运价指数",
          scfi
            ? `<div class="cn-metric-row">
                 <div class="cn-metric"><span>当前</span><strong>${scfi.current}</strong></div>
                 <div class="cn-metric"><span>上期</span><strong>${scfi.previous}</strong></div>
                 <div class="cn-metric"><span>变化</span><strong>${pct(scfi.changePct)}</strong></div>
               </div>
               <small class="cn-muted">${esc(scfi.index || "SCFI")} · 数据日期 ${esc(scfi.date || "—")} · 来源 上海航运交易所</small>`
            : `<p class="cn-muted">SCFI 实时运价同步中或暂不可用。可在 <code>data/freight-routes.json</code> 补充分航线运价。</p>`
        )}
        ${panel("航线压力 Top 6", bars(topRoutes))}
        ${panel("关键节点受阻指数 Top 6", bars(topNodes))}
        ${panel(
          "态势提示",
          `<ul class="cn-list">
            <li>共监测 <b>${s.summary.routeCount}</b> 条主要贸易航线，其中 <b>${s.summary.highPressureRoutes}</b> 条处于高压状态。</li>
            <li><b>${s.summary.severeChokepoints}</b> 个关键节点受阻指数达严重级别（≥80）。</li>
            <li>压力最高航线：<b>${esc(s.summary.topRoute || "—")}</b>（指数 ${s.summary.topRouteScore ?? "—"}）。</li>
          </ul>`
        )}
      </div>`
    );
  }

  function viewRoutes() {
    const s = liveData.snapshot;
    if (!s) return viewHead("航线压力", "正在同步…") + loadingPanel();
    const cards = s.routes
      .map(
        (r) => `
      <section class="cn-panel cn-route-card">
        <div class="cn-route-head">
          <div><h3 class="cn-panel-title">${esc(r.name)}</h3><small class="cn-muted">咽喉点：${esc(r.chokepoint)}</small></div>
          ${ring(r.score, "压力")}
        </div>
        <div class="cn-route-meta">${statusTag(r.status)}<span class="cn-chip">${esc(r.change)}</span></div>
        <p>${esc(r.reason)}</p>
        ${tagList(r.commodities)}
      </section>`
      )
      .join("");
    return viewHead("航线压力", "全球主要贸易航线运营压力排行（参考模型）") + `<div class="cn-grid cn-grid--2">${cards}</div>`;
  }

  function viewChokepoints() {
    const s = liveData.snapshot;
    if (!s) return viewHead("关键节点", "正在同步…") + loadingPanel();
    const sorted = [...s.chokepoints].sort((a, b) => b.level - a.level);
    const cards = sorted
      .map(
        (c) => `
      <section class="cn-panel cn-route-card">
        <div class="cn-route-head">
          <div><h3 class="cn-panel-title">${esc(c.name)}</h3><small class="cn-muted">${esc(c.en)} · ${esc(c.role)}</small></div>
          ${ring(c.level, "受阻")}
        </div>
        <div class="cn-route-meta">${statusTag(c.status)}<span class="cn-chip">${esc(c.throughput)}</span></div>
        <p>${esc(c.reason)}</p>
      </section>`
      )
      .join("");
    return viewHead("关键节点（海峡 / 运河）", "全球航运咽喉点运营态势（参考模型）") + `<div class="cn-grid cn-grid--2">${cards}</div>`;
  }

  function viewFreight() {
    const s = liveData.snapshot;
    if (!s) return viewHead("运价指数", "正在同步…") + loadingPanel();
    const scfi = s.composite;
    const routeRows =
      s.freightRoutes && s.freightRoutes.length
        ? bars(s.freightRoutes.map((r) => ({ label: r.name || r.route, value: Number(r.current) || 0, note: r.current })))
        : `<p class="cn-muted">尚未配置分航线运价。按 <code>data/README.md</code> 从上海航交所 SCFI 更新 <code>data/freight-routes.json</code> 即可显示。</p>`;
    return (
      viewHead("运价指数", "上海出口集装箱运价指数 SCFI") +
      `<div class="cn-grid cn-grid--2">
        ${panel(
          "SCFI 综合运价",
          scfi
            ? `<div class="cn-metric-row">
                 <div class="cn-metric"><span>当前</span><strong>${scfi.current}</strong></div>
                 <div class="cn-metric"><span>上期</span><strong>${scfi.previous}</strong></div>
                 <div class="cn-metric"><span>变化</span><strong>${pct(scfi.changePct)}</strong></div>
                 <div class="cn-metric"><span>日期</span><strong>${esc(scfi.date || "—")}</strong></div>
               </div>
               <small class="cn-muted">来源：上海航运交易所（实时抓取）</small>`
            : `<p class="cn-muted">SCFI 实时运价同步中或暂不可用。</p>`
        )}
        ${panel("分航线运价", routeRows)}
      </div>`
    );
  }

  function liveEventCard(e) {
    const u = safeUrl(e.sourceUrl);
    const sev = e.score >= 80 ? "high" : e.score >= 65 ? "mid" : "low";
    return `
      <section class="cn-panel cn-route-card">
        <div class="cn-route-head">
          <div><h3 class="cn-panel-title">${esc(e.title)}</h3><small class="cn-muted">${esc(e.source || "公开来源")} · ${esc(e.time || "实时")}${e.route ? " · " + esc(e.route) : ""}</small></div>
          <span class="cn-risk cn-risk--${sev}">风险 ${Number(e.score) || "—"}</span>
        </div>
        ${e.summary ? `<p>${esc(e.summary)}</p>` : ""}
        ${u ? `<div class="cn-route-meta"><a class="cn-chip" href="${esc(u)}" target="_blank" rel="noopener noreferrer">查看原文 ↗</a></div>` : ""}
      </section>`;
  }

  function demoEventCard(e) {
    return `
      <section class="cn-panel cn-route-card">
        <div class="cn-route-head">
          <div><h3 class="cn-panel-title">${esc(e.title)}</h3><small class="cn-muted">节点：${esc(e.node)} · ${esc(e.time)} · 示例</small></div>
          ${statusTag(e.status)}
        </div>
        <p>${esc(e.summary)}</p>
        <div class="cn-route-meta"><span class="cn-chip">${esc(e.impact)}</span></div>
      </section>`;
  }

  function viewEvents() {
    const live = liveData.events;
    if (live && live.length) {
      return (
        viewHead("供应链事件", `影响航运与供应链的实时事件（${live.length} 条 · 来源 GDELT/公开新闻）`) +
        `<div class="cn-grid cn-grid--2">${live.map(liveEventCard).join("")}</div>`
      );
    }
    const loadingNote = liveData.eventsLoading ? "正在同步实时事件…" : "实时供应链事件暂无，以下为示例：";
    return (
      viewHead("供应链事件", `影响航运与供应链的事件 · ${loadingNote}`) +
      `<div class="cn-grid cn-grid--2">${DEMO_EVENTS.map(demoEventCard).join("")}</div>`
    );
  }

  function loadingPanel() {
    if (liveData.failed) return panel("数据暂不可用", `<p class="cn-muted">航运数据同步失败，请稍后刷新页面重试。</p>`);
    return panel("加载中", `<p class="cn-muted">正在同步航运数据…</p>`);
  }

  const RENDERERS = {
    home: viewHome,
    overview: viewOverview,
    routes: viewRoutes,
    chokepoints: viewChokepoints,
    freight: viewFreight,
    events: viewEvents,
  };

  // 顶栏状态徽章：由实时快照计算
  function setStatus(s) {
    const pulse = document.getElementById("sp-pulse");
    const risk = document.getElementById("sp-risk");
    if (pulse) {
      const c = s.composite;
      pulse.textContent = c && c.changePct != null ? `运价${c.changePct >= 0 ? "上行" : "回落"} ${Math.abs(c.changePct)}%` : "运营态势参考";
    }
    if (risk) {
      const hp = s.summary.highPressureRoutes;
      risk.textContent = `${hp >= 5 ? "高" : hp >= 3 ? "偏高" : "中"}（${hp}/${s.summary.routeCount} 高压）`;
    }
  }

  // 实时供应链事件：从全局快照按 supply 分类拉取（月窗口取更多）
  function ensureEvents() {
    if (liveData.events || liveData.eventsLoading) return;
    liveData.eventsLoading = true;
    fetch("/api/snapshot?period=month", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((snap) => {
        liveData.events = (snap.events || []).filter((e) => e.category === "supply");
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
    fetch("/api/shipping/snapshot", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        liveData.snapshot = data;
        if (updated) {
          const scfi = data.composite;
          updated.textContent = scfi && scfi.date ? `SCFI ${scfi.date}` : "运营态势参考";
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
    // 所有数据驱动视图都依赖同一份快照
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

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function bindGlobalEvents() {
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-go]");
      if (t && main.contains(t)) {
        go(t.getAttribute("data-go"));
      }
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
