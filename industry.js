(() => {
  "use strict";

  // ===========================================================
  // 国际产业雷达 · Global Industry Radar
  // 会话校验 + 哈希路由 + 5 视图：全景 / 国内 / 国外 / 中外对比 / 自主可控榜
  // 数据：/api/industry/snapshot（中外产业对比参考模型）
  // ===========================================================

  const guard = document.getElementById("in-guard");
  const app = document.getElementById("in-app");
  const main = document.getElementById("in-main");
  const nav = document.getElementById("in-nav");
  const logoutButton = document.getElementById("in-logout");
  const updated = document.getElementById("in-updated");
  const toast = document.getElementById("in-toast");

  const VIEWS = ["home", "overview", "domestic", "overseas", "compare", "autonomy"];
  const state = { view: "home" };
  const liveData = { snapshot: null, loading: false, failed: false };

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // 中国地位配色
  const POS_COLOR = { 领先: "#2bbb6b", 并跑: "#3a8ee6", 追赶: "#d9a441", 受制: "#e0564f" };
  function posTag(p) {
    return `<span class="in-pos" style="background:${POS_COLOR[p] || "#888"}1f;color:${POS_COLOR[p] || "#888"};border:1px solid ${POS_COLOR[p] || "#888"}55;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600">${esc(p)}</span>`;
  }
  function autonomyColor(a) {
    return a >= 75 ? "#2bbb6b" : a >= 50 ? "#d9a441" : "#e0564f";
  }
  function autonomyBar(a, label) {
    return `<div class="in-auto"><span class="in-auto-track" style="display:inline-block;height:8px;width:120px;background:#8884;border-radius:6px;overflow:hidden;vertical-align:middle"><i style="display:block;height:100%;width:${a}%;background:${autonomyColor(a)}"></i></span> <b style="color:${autonomyColor(a)}">${a}</b><small class="cn-muted"> ${esc(label || "自主可控度")}</small></div>`;
  }

  function viewHead(title, sub) {
    return `<div class="cn-view-head"><h2>${esc(title)}</h2><p>${esc(sub)}</p></div>`;
  }
  function panel(title, body) {
    return `<section class="cn-panel"><h3 class="cn-panel-title">${esc(title)}</h3>${body}</section>`;
  }
  function chips(arr, cls) {
    return `<div class="cn-tags">${(arr || []).map((t) => `<span class="${cls || ""}">${esc(t)}</span>`).join("")}</div>`;
  }

  // ----------------------- 视图 -----------------------
  function viewHome() {
    const s = liveData.snapshot;
    const sum = s ? s.summary : null;
    const kpis = sum
      ? [
          { k: "覆盖产业", v: `${sum.total}`, note: `${sum.sectorCount} 大类` },
          { k: "平均自主可控度", v: `${sum.avgAutonomy}`, note: "0—100" },
          { k: "领先产业", v: `${sum.leadingCount}`, note: "全球领先" },
          { k: "卡脖子环节", v: `${sum.chokepointCount}`, note: "自主度 < 40" },
        ]
      : [];
    return `
      <div class="cn-home">
        <section class="cn-hero">
          <span class="cn-eyebrow">GLOBAL INDUSTRY RADAR</span>
          <h1>一张图看清中外产业格局</h1>
          <p>把全产业分类拆成 国内 / 国外 两侧对比，标注每个产业的中国地位与自主可控度，快速定位领先优势与“卡脖子”环节。</p>
          <div class="cn-hero-actions">
            <button class="cn-cta" data-go="overview" type="button">进入产业全景 →</button>
            <button class="cn-cta cn-cta--ghost" data-go="autonomy" type="button">查看卡脖子榜</button>
          </div>
        </section>
        ${
          kpis.length
            ? panel(
                "产业格局概览",
                `<div class="cn-mini-kpis">${kpis
                  .map((t) => `<div class="cn-mini-kpi"><span>${esc(t.k)}</span><strong>${esc(t.v)}</strong><small>${esc(t.note)}</small></div>`)
                  .join("")}</div>${posLegend(sum.byPosition)}`,
              )
            : panel("正在加载产业数据", `<p class="cn-muted">正在同步中外产业对比…</p>`)
        }
      </div>`;
  }

  function posLegend(byPos) {
    const order = ["领先", "并跑", "追赶", "受制"];
    return `<div class="in-legend" style="display:flex;gap:14px;flex-wrap:wrap;margin-top:10px">${order
      .map((p) => `<span>${posTag(p)} <b>${byPos[p] || 0}</b></span>`)
      .join("")}</div>`;
  }

  function industryChip(it) {
    return `<button class="in-chip" data-go="compare" data-focus="${esc(it.id)}" type="button"
      style="text-align:left;border:1px solid ${POS_COLOR[it.position]}44;border-left:4px solid ${POS_COLOR[it.position]};background:transparent;border-radius:8px;padding:8px 10px;cursor:pointer;display:flex;flex-direction:column;gap:4px">
      <strong style="font-size:13px">${esc(it.name)}</strong>
      <span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${posTag(it.position)}<small class="cn-muted">自主 ${it.autonomy}</small></span>
    </button>`;
  }

  function viewOverview() {
    const s = liveData.snapshot;
    if (!s) return viewHead("产业全景", "正在同步…") + loadingPanel();
    const sectorPanels = s.sectors
      .map(
        (sec) =>
          panel(
            `${sec.label} · ${sec.en}（${sec.items.length}）`,
            `<div class="in-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px">${sec.items
              .map(industryChip)
              .join("")}</div>`,
          ),
      )
      .join("");
    return viewHead("产业全景", "全产业分类 × 中国地位 × 自主可控度（点击产业看中外对比）") + posLegend(s.summary.byPosition) + sectorPanels;
  }

  function sideList(it, side) {
    const arr = side === "domestic" ? it.domestic : it.overseas;
    return `
      <section class="cn-panel cn-route-card">
        <div class="cn-route-head">
          <div><h3 class="cn-panel-title">${esc(it.name)}</h3><small class="cn-muted">${esc(it.en)}</small></div>
          ${posTag(it.position)}
        </div>
        ${chips(arr, "entity sector")}
        <p>${esc(it.dynamic)}</p>
      </section>`;
  }

  function viewSide(side) {
    const s = liveData.snapshot;
    const title = side === "domestic" ? "国内产业" : "国外产业";
    const sub = side === "domestic" ? "各产业的国内代表企业与中国地位" : "各产业的国外代表企业与竞争格局";
    if (!s) return viewHead(title, "正在同步…") + loadingPanel();
    return (
      viewHead(title, sub) +
      s.sectors
        .map((sec) => panel(`${sec.label}`, `<div class="cn-grid cn-grid--2">${sec.items.map((it) => sideList(it, side)).join("")}</div>`))
        .join("")
    );
  }

  function compareCard(it) {
    return `
      <section class="cn-panel cn-route-card" id="cmp-${esc(it.id)}">
        <div class="cn-route-head">
          <div><h3 class="cn-panel-title">${esc(it.name)}</h3><small class="cn-muted">${esc(it.en)}</small></div>
          ${posTag(it.position)}
        </div>
        <div class="in-vs" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:8px 0">
          <div style="border-right:1px solid #8883;padding-right:12px">
            <small class="cn-muted">国内代表</small>
            ${chips(it.domestic, "entity sector")}
          </div>
          <div>
            <small class="cn-muted">国外代表</small>
            ${chips(it.overseas, "entity commodity")}
          </div>
        </div>
        ${autonomyBar(it.autonomy)}
        <p>${esc(it.dynamic)}</p>
        <div class="cn-route-meta"><span class="cn-chip">对外依赖：${esc(it.dependency)}</span></div>
      </section>`;
  }

  function viewCompare() {
    const s = liveData.snapshot;
    if (!s) return viewHead("中外对比", "正在同步…") + loadingPanel();
    return (
      viewHead("中外对比", "逐产业 国内 vs 国外 代表企业、中国地位与自主可控度") +
      s.sectors.map((sec) => panel(`${sec.label}`, `<div class="cn-grid cn-grid--2">${sec.items.map(compareCard).join("")}</div>`)).join("")
    );
  }

  function viewAutonomy() {
    const s = liveData.snapshot;
    if (!s) return viewHead("自主可控榜", "正在同步…") + loadingPanel();
    const sorted = [...s.industries].sort((a, b) => a.autonomy - b.autonomy);
    const rows = sorted
      .map(
        (it) => `
      <div class="in-rank-row" style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #8882">
        <span style="flex:0 0 200px"><strong>${esc(it.name)}</strong></span>
        <span style="flex:0 0 auto">${posTag(it.position)}</span>
        <span style="flex:1">${autonomyBar(it.autonomy, "")}</span>
        <small class="cn-muted" style="flex:0 0 auto">${esc(it.dependency)}</small>
      </div>`,
      )
      .join("");
    return (
      viewHead("自主可控榜 · 卡脖子地图", "按自主可控度升序——越靠前越受制（红色为卡脖子环节）") +
      panel("全产业自主可控度排行", rows)
    );
  }

  function loadingPanel() {
    if (liveData.failed) return panel("数据暂不可用", `<p class="cn-muted">产业数据同步失败，请稍后刷新页面重试。</p>`);
    return panel("加载中", `<p class="cn-muted">正在同步产业数据…</p>`);
  }

  const RENDERERS = {
    home: viewHome,
    overview: viewOverview,
    domestic: () => viewSide("domestic"),
    overseas: () => viewSide("overseas"),
    compare: viewCompare,
    autonomy: viewAutonomy,
  };

  // ----------------------- 数据 / 路由 -----------------------
  function ensureSnapshot() {
    if (liveData.snapshot || liveData.loading || liveData.failed) return;
    liveData.loading = true;
    fetch("/api/industry/snapshot", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        liveData.snapshot = data;
        if (updated) updated.textContent = `${data.summary.total} 产业 · ${data.summary.sectorCount} 大类`;
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

  function render() {
    const fn = RENDERERS[state.view] || viewHome;
    main.innerHTML = fn();
    window.scrollTo(0, 0);
    updateNav();
    ensureSnapshot();
    // 从全景点击产业 → 对比视图滚动定位
    if (state.view === "compare" && state.focus) {
      const target = document.getElementById("cmp-" + state.focus);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      state.focus = null;
    }
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
      if (t && main.contains(t)) {
        if (t.hasAttribute("data-focus")) state.focus = t.getAttribute("data-focus");
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
