(() => {
  "use strict";

  // ===========================================================
  // 制裁与合规雷达 · Sanctions & Compliance Radar
  // 会话校验 + 哈希路由 + 5 视图：合规总览 / 制裁动态 / 制裁项目 / 清单筛查 / 合规要点
  // 数据：/api/sanctions/snapshot（OFAC Recent Actions 实时 + 合规参考模型）
  // 注意：actions 来自外部(OFAC)，全部经 esc() 转义防 XSS。
  // ===========================================================

  const guard = document.getElementById("sc-guard");
  const app = document.getElementById("sc-app");
  const main = document.getElementById("sc-main");
  const nav = document.getElementById("sc-nav");
  const logoutButton = document.getElementById("sc-logout");
  const updated = document.getElementById("sc-updated");
  const toast = document.getElementById("sc-toast");

  const VIEWS = ["home", "overview", "actions", "programs", "screening", "compliance"];
  const state = { view: "home" };
  const liveData = { snapshot: null, loading: false, failed: false };

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "")) ? String(u) : "");

  const INTENSITY = { 高: "#e0564f", 中: "#d9a441", 低: "#2bbb6b" };
  function intensityTag(level) {
    const c = INTENSITY[level] || "#888";
    return `<span class="sc-int" style="background:${c}1f;color:${c};border:1px solid ${c}55;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600">强度 ${esc(level)}</span>`;
  }

  function viewHead(title, sub) {
    return `<div class="cn-view-head"><h2>${esc(title)}</h2><p>${esc(sub)}</p></div>`;
  }
  function panel(title, body) {
    return `<section class="cn-panel"><h3 class="cn-panel-title">${esc(title)}</h3>${body}</section>`;
  }
  function list(arr) {
    return `<ul class="cn-list">${(arr || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  }
  function chips(arr, cls) {
    return `<div class="cn-tags">${(arr || []).map((t) => `<span class="${cls || ""}">${esc(t)}</span>`).join("")}</div>`;
  }

  function staleBanner(s) {
    if (!s || (!s.stale && s.actionCount !== 0)) return "";
    const text = s.error
      ? "OFAC 实时动态暂不可用，已展示合规参考模型(制裁项目/清单/要点照常)。"
      : "OFAC 实时动态可能为缓存或陈旧数据。";
    return `<div class="sc-banner" style="margin:8px 0;padding:10px 14px;border-radius:8px;background:rgba(217,164,65,.12);color:#d9a441;font-size:13px">${esc(text)}</div>`;
  }

  // ----------------------- 视图 -----------------------
  function viewHome() {
    const s = liveData.snapshot;
    const sum = s ? s.summary : null;
    const kpis = sum
      ? [
          { k: "近期制裁动态", v: `${sum.actionCount}`, note: `更新 ${sum.updates} · 移除 ${sum.removals}` },
          { k: "高危动态", v: `${sum.highRisk}`, note: "涉伊朗/俄罗斯/恐怖主义" },
          { k: "重点制裁项目", v: `${sum.programCount}`, note: `${sum.highIntensityPrograms.length} 个高强度` },
        ]
      : [];
    return `
      <div class="cn-home">
        <section class="cn-hero">
          <span class="cn-eyebrow">SANCTIONS &amp; COMPLIANCE</span>
          <h1>把握全球制裁动态与合规风险</h1>
          <p>实时跟踪美国财政部 OFAC 制裁更新，结合主要制裁项目、筛查清单与出口合规要点，帮助识别交易对手与供应链的制裁风险。</p>
          <div class="cn-hero-actions">
            <button class="cn-cta" data-go="actions" type="button">查看制裁动态 →</button>
            <button class="cn-cta cn-cta--ghost" data-go="compliance" type="button">合规筛查清单</button>
          </div>
        </section>
        ${
          kpis.length
            ? panel(
                "合规风险概览",
                `${staleBanner(s.summary && { ...s.summary, stale: s.stale, error: s.error })}<div class="cn-mini-kpis">${kpis
                  .map((t) => `<div class="cn-mini-kpi"><span>${esc(t.k)}</span><strong>${esc(t.v)}</strong><small>${esc(t.note)}</small></div>`)
                  .join("")}</div><small class="cn-spark-note">高强度项目：${esc(sum.highIntensityPrograms.join("、") || "—")}</small>`,
              )
            : panel("正在加载制裁数据", `<p class="cn-muted">正在同步 OFAC 制裁动态…</p>`)
        }
      </div>`;
  }

  function bannerFor(s) {
    return staleBanner({ stale: s.stale, error: s.error, actionCount: s.summary.actionCount });
  }

  function viewOverview() {
    const s = liveData.snapshot;
    if (!s) return viewHead("合规总览", "正在同步…") + loadingPanel();
    const countries = s.summary.topCountries.length
      ? `<ul class="cn-list">${s.summary.topCountries.map((c) => `<li>${esc(c.name)} · <b>${c.count}</b> 条</li>`).join("")}</ul>`
      : `<p class="cn-muted">暂无可归属地区的实时动态。</p>`;
    return (
      viewHead("合规总览", "OFAC 实时动态 + 制裁项目强度 + 重点地区") +
      bannerFor(s) +
      `<div class="cn-grid cn-grid--2">
        ${panel("近期动态分布", `<div class="cn-metric-row">
          <div class="cn-metric"><span>总动态</span><strong>${s.summary.actionCount}</strong></div>
          <div class="cn-metric"><span>名单更新</span><strong>${s.summary.updates}</strong></div>
          <div class="cn-metric"><span>名单移除</span><strong>${s.summary.removals}</strong></div>
          <div class="cn-metric"><span>高危</span><strong>${s.summary.highRisk}</strong></div>
        </div>`)}
        ${panel("涉及地区 Top", countries)}
        ${panel("高强度制裁项目", chips(s.summary.highIntensityPrograms, "entity commodity"))}
        ${panel("最新动态", s.actions.length
          ? `<ul class="cn-list">${s.actions.slice(0, 5).map((a) => `<li>${esc(a.date)} · ${esc(a.name)}</li>`).join("")}</ul>`
          : `<p class="cn-muted">OFAC 实时动态暂不可用。</p>`)}
      </div>`
    );
  }

  function viewActions() {
    const s = liveData.snapshot;
    if (!s) return viewHead("制裁动态", "正在同步…") + loadingPanel();
    if (!s.actions.length) {
      return viewHead("制裁动态", "美国财政部 OFAC Recent Actions") + bannerFor(s) +
        panel("暂无实时动态", `<p class="cn-muted">OFAC 实时动态暂不可用(可能为网络或源限制)。制裁项目、清单与合规要点不受影响。</p>`);
    }
    const cards = s.actions
      .map((a) => {
        const u = safeUrl(a.sourceUrl);
        return `
      <section class="cn-panel cn-route-card">
        <div class="cn-route-head">
          <div><h3 class="cn-panel-title">${esc(a.name)}</h3><small class="cn-muted">${esc(a.date)} · ${esc(a.country || "全球")} · ${esc(a.program || "OFAC")}</small></div>
          <span class="cn-risk cn-risk--${Number(a.score) >= 85 ? "high" : "mid"}">${esc(a.action || "名单更新")}</span>
        </div>
        ${u ? `<div class="cn-route-meta"><a class="cn-chip" href="${esc(u)}" target="_blank" rel="noopener noreferrer">查看原文 ↗</a></div>` : ""}
      </section>`;
      })
      .join("");
    return viewHead("制裁动态", "美国财政部 OFAC Recent Actions(实时)") + bannerFor(s) + `<div class="cn-grid cn-grid--2">${cards}</div>`;
  }

  function viewPrograms() {
    const s = liveData.snapshot;
    if (!s) return viewHead("制裁项目", "正在同步…") + loadingPanel();
    const cards = s.programs
      .map(
        (p) => `
      <section class="cn-panel cn-route-card">
        <div class="cn-route-head">
          <div><h3 class="cn-panel-title">${esc(p.name)}</h3><small class="cn-muted">${esc(p.en)} · ${esc(p.authority)}</small></div>
          ${intensityTag(p.intensity)}
        </div>
        <p>${esc(p.note)}</p>
        <div class="cn-route-meta"><span class="cn-chip">范围：${esc(p.scope)}</span></div>
      </section>`,
      )
      .join("");
    return viewHead("制裁项目", "主要制裁项目与近期强度(参考研判)") + `<div class="cn-grid cn-grid--2">${cards}</div>`;
  }

  function viewScreening() {
    const s = liveData.snapshot;
    if (!s) return viewHead("清单筛查", "正在同步…") + loadingPanel();
    const cards = s.lists
      .map((l) => {
        const u = safeUrl(l.url);
        return `
      <section class="cn-panel cn-route-card">
        <div class="cn-route-head">
          <div><h3 class="cn-panel-title">${esc(l.name)}</h3><small class="cn-muted">${esc(l.en)} · ${esc(l.authority)}</small></div>
        </div>
        <p>${esc(l.scope)}</p>
        ${u ? `<div class="cn-route-meta"><a class="cn-chip" href="${esc(u)}" target="_blank" rel="noopener noreferrer">官方入口 ↗</a></div>` : ""}
      </section>`;
      })
      .join("");
    return viewHead("清单与筛查", "主要制裁/出口管制清单与筛查依据") + `<div class="cn-grid cn-grid--2">${cards}</div>`;
  }

  function viewCompliance() {
    const s = liveData.snapshot;
    if (!s) return viewHead("合规要点", "正在同步…") + loadingPanel();
    return (
      viewHead("合规要点", "红旗信号与出口/交易合规筛查清单(非法律意见)") +
      `<div class="cn-grid cn-grid--2">
        ${panel("⚠ 红旗信号", list(s.redFlags))}
        ${panel("✓ 筛查清单", list(s.checklist))}
      </div>`
    );
  }

  function loadingPanel() {
    if (liveData.failed) return panel("数据暂不可用", `<p class="cn-muted">制裁数据同步失败，请稍后刷新页面重试。</p>`);
    return panel("加载中", `<p class="cn-muted">正在同步制裁数据…</p>`);
  }

  const RENDERERS = {
    home: viewHome,
    overview: viewOverview,
    actions: viewActions,
    programs: viewPrograms,
    screening: viewScreening,
    compliance: viewCompliance,
  };

  // ----------------------- 数据 / 路由 -----------------------
  function ensureSnapshot() {
    if (liveData.snapshot || liveData.loading || liveData.failed) return;
    liveData.loading = true;
    // 默认月窗口：OFAC 动态较稀疏，按月展示更有信息量
    fetch("/api/sanctions/snapshot?period=month", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        liveData.snapshot = data;
        if (updated) updated.textContent = data.error ? "参考模型(OFAC暂不可用)" : `OFAC · ${data.summary.actionCount} 条动态`;
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

  // 顶栏状态徽章：由制裁快照计算
  function setStatus(s) {
    const pulse = document.getElementById("sc-pulse");
    const risk = document.getElementById("sc-risk");
    if (pulse) pulse.textContent = s.error ? "参考模型" : `近 30 天 ${s.summary.actionCount} 条`;
    if (risk) risk.textContent = `${s.summary.highIntensityPrograms.length} 个`;
  }

  function render() {
    const fn = RENDERERS[state.view] || viewHome;
    main.innerHTML = fn();
    window.scrollTo(0, 0);
    updateNav();
    ensureSnapshot();
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
