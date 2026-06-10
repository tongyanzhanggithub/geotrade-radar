(() => {
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const demo = {
    events: clone(events),
    markets: clone(markets),
    policies: clone(policies),
    sanctions: clone(sanctions),
    industry: clone(industryPulseItems),
  };
  const periodMeta = {
    day: { label: "日", title: "近 24 小时全球风险总览", pulse: "DAILY RISK PULSE" },
    week: { label: "周", title: "近 7 日全球风险总览", pulse: "WEEKLY RISK PULSE" },
    month: { label: "月", title: "近 30 日全球风险总览", pulse: "MONTHLY RISK PULSE" },
  };
  const staticShareMode = Boolean(window.GEOTRADE_STATIC_SHARE);
  const apiBase = location.protocol === "file:" ? "http://127.0.0.1:4173" : "";
  let hasRealData = false;
  let syncing = false;
  let lastSnapshot = null;

  state.livePeriod = state.livePeriod || "day";
  state.liveMode = "loading";

  function averageScores(items, fallback = 55) {
    if (!items.length) return fallback;
    return Math.round(items.reduce((sum, item) => sum + Number(item.score || 0), 0) / items.length);
  }

  function replaceArray(target, next) {
    target.splice(0, target.length, ...next);
  }

  function normalizeEvent(event) {
    return {
      ...event,
      countries: Array.isArray(event.countries) ? event.countries : ["全球"],
      sectors: Array.isArray(event.sectors) ? event.sectors : ["跨境贸易"],
      commodities: Array.isArray(event.commodities) ? event.commodities : [],
      impact: Array.isArray(event.impact) && event.impact.length ? event.impact : [["实时事件", event.title]],
      confidence: Number(event.confidence || 70),
      score: Number(event.score || 55),
      lat: Number(event.lat || 0),
      lon: Number(event.lon || 0),
    };
  }

  function normalizeIndustryItem(item) {
    return {
      ...item,
      domainId: item.domainId || "ai",
      domain: item.domain || "AI",
      company: item.company || "行业",
      type: item.type || "行业动态",
      tags: Array.isArray(item.tags) ? item.tags : [],
      eventKeywords: Array.isArray(item.eventKeywords) ? item.eventKeywords : [],
      score: Number(item.score || 60),
      time: item.time || item.publishedAt || "实时更新",
    };
  }

  function setPeriodButtons() {
    document.querySelectorAll("[data-period]").forEach((button) => {
      button.classList.toggle("active", button.dataset.period === state.livePeriod);
    });
  }

  function formatSyncTime(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "未知";
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  }

  function setSyncState(mode, detail, updatedAt) {
    state.liveMode = mode;
    const stateNode = el("sync-state");
    const modeNode = el("sync-mode");
    const labels = {
      loading: "正在同步",
      live: "实时数据",
      partial: "部分实时",
      stale: "陈旧数据",
      demo: "演示数据",
    };
    stateNode.dataset.mode = mode;
    stateNode.title = detail;
    modeNode.textContent = labels[mode] || mode;
    el("updated-at").textContent = formatSyncTime(updatedAt);
    el("dock-status").textContent = `${labels[mode] || mode} · ${periodMeta[state.livePeriod].label}范围 · ${formatSyncTime(updatedAt)}`;
    document.body.dataset.dataMode = mode;
  }

  function renderSourceStrip(providers = {}) {
    const strip = el("data-sources");
    strip.textContent = "";
    const entries = [
      ["events", "全球事件"],
      ["industry", "产业企业"],
      ["markets", "市场行情"],
      ["sanctions", "官方制裁"],
    ];
    entries.forEach(([id, label]) => {
      const provider = providers[id];
      const link = document.createElement(provider?.sourceUrl?.startsWith("https://") ? "a" : "span");
      if (link.tagName === "A") {
        link.href = provider.sourceUrl;
        link.target = "_blank";
        link.rel = "noreferrer";
      }
      const available = Boolean(provider?.count || (provider?.fetchedAt && !provider?.error));
      const status = provider?.demo ? "演示" : available ? (provider.stale ? "陈旧" : "实时") : "不可用";
      link.className = `source-badge ${provider?.demo ? "demo" : available ? (provider.stale ? "stale" : "live") : "offline"}`;
      link.title = provider?.error || `${provider?.source || "本地演示"} · ${provider?.count || 0} 条`;
      link.innerHTML = `<i></i><span>${label}</span><strong>${status}</strong>`;
      strip.appendChild(link);
    });
  }

  function updateTabCounts() {
    tabConfig.forEach((tab) => {
      if (tab.id === "markets") tab.count = markets.length;
      if (tab.id === "policy") tab.count = policies.length;
      if (tab.id === "sanctions") tab.count = sanctions.length;
      if (tab.id === "industry-pulse") tab.count = industryPulseItems.length;
      if (tab.id === "brief") tab.count = Math.min(3, events.length);
    });
    if (typeof syncAshareStrategyTabCount === "function") syncAshareStrategyTabCount();
  }

  function updateOverview(snapshot) {
    const meta = periodMeta[state.livePeriod];
    const categoryCounts = new Map();
    events.forEach((event) => categoryCounts.set(event.categoryLabel, (categoryCounts.get(event.categoryLabel) || 0) + 1));
    const topCategories = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label]) => label);
    const geopolitical = events.filter((event) => ["sanctions", "energy"].includes(event.category));
    const policy = events.filter((event) => ["policy", "sanctions"].includes(event.category));
    const supply = events.filter((event) => event.category === "supply");
    const vix = markets.find((market) => market.symbol === "VIX");
    const marketRisk = vix?.numericValue
      ? Math.min(95, Math.round(40 + Math.max(0, vix.numericValue - 12) * 3))
      : Math.min(92, Math.round(48 + markets.reduce((sum, market) => sum + Math.abs(market.change || 0), 0)));

    el("risk-period-label").textContent = `${meta.pulse} · ${snapshot?.mode === "live" ? "REAL DATA" : "DATA MONITOR"}`;
    el("risk-overview-title").textContent = meta.title;
    el("risk-overview-summary").textContent = `${events.length} 条事件纳入当前范围，重点集中在${topCategories.join("、") || "全球贸易与市场"}。`;
    el("geopolitical-risk").textContent = averageScores(geopolitical);
    el("geopolitical-risk-note").textContent = `${geopolitical.length} 条能源 / 制裁事件`;
    el("policy-risk").textContent = averageScores(policy);
    el("policy-risk-note").textContent = `${policy.length} 条政策 / 管制事件`;
    el("supply-risk").textContent = averageScores(supply);
    el("supply-risk-note").textContent = `${supply.length} 条航运 / 供应链事件`;
    el("market-risk").textContent = marketRisk;
    el("market-risk-note").textContent = vix ? `VIX ${vix.value} · ${vix.change >= 0 ? "+" : ""}${vix.change.toFixed(2)}%` : `${markets.length} 项市场行情`;
    el("shipping-pressure").textContent = averageScores(supply);
    el("shipping-pressure-note").textContent = `${supply.length} 条事件`;
    el("policy-uncertainty").textContent = averageScores(policy);
    el("policy-uncertainty-note").textContent = `${policy.length} 条事件`;
    el("market-sentiment").textContent = marketRisk;
    el("market-sentiment-note").textContent = `${markets.length} 项行情`;
  }

  function applySourceLink() {
    const event = selectedEvent();
    const sourceNode = el("detail-source");
    if (!event?.sourceUrl?.startsWith("http")) return;
    sourceNode.textContent = "";
    const link = document.createElement("a");
    link.href = event.sourceUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = event.source || "查看原始来源";
    link.title = "打开原始报道";
    sourceNode.appendChild(link);
  }

  const previousLiveRenderSelectedEvent = renderSelectedEvent;
  renderSelectedEvent = function renderSelectedEventWithLiveSource() {
    previousLiveRenderSelectedEvent();
    applySourceLink();
  };

  function applySnapshot(snapshot) {
    const liveEvents = Array.isArray(snapshot.events) ? snapshot.events.map(normalizeEvent) : [];
    const liveIndustry = Array.isArray(snapshot.industry) ? snapshot.industry.map(normalizeIndustryItem) : [];
    const liveMarkets = Array.isArray(snapshot.markets) ? snapshot.markets : [];
    const liveSanctions = Array.isArray(snapshot.sanctions) ? snapshot.sanctions : [];

    if (liveEvents.length) {
      replaceArray(events, liveEvents);
      const livePolicies = liveEvents
        .filter((event) => event.category === "policy")
        .map((event) => [
          event.countries[0] || "全球",
          "全球",
          [...event.sectors, ...event.commodities].slice(0, 3).join(" / ") || "跨境贸易",
          event.categoryLabel,
          event.publishedAt || event.time,
          event.score,
        ]);
      replaceArray(policies, livePolicies);
      hasRealData = true;
    }
    if (liveMarkets.length) {
      replaceArray(markets, liveMarkets);
      hasRealData = true;
    }
    if (liveIndustry.length) {
      replaceArray(industryPulseItems, liveIndustry);
      hasRealData = true;
    }
    if (snapshot.providers?.sanctions?.fetchedAt && !snapshot.providers.sanctions.error) {
      replaceArray(
        sanctions,
        liveSanctions.map((item) => [item.name, item.country, item.program, item.action, item.sectors, item.date, item.score]),
      );
      hasRealData = true;
    }

    if (!events.some((event) => event.id === state.selectedEventId)) state.selectedEventId = events[0]?.id;
    if (state.category !== "all" && !events.some((event) => event.category === state.category)) state.category = "all";

    updateTabCounts();
    renderFilters();
    renderEventList();
    renderMarkers();
    renderSelectedEvent();
    renderTabs();
    if (typeof renderWatchCount === "function") renderWatchCount();
    const mapEventCount = document.querySelector('[data-layer="events"] b');
    if (mapEventCount) mapEventCount.textContent = events.length;
    const sanctionsLayerCount = document.getElementById("sanctions-layer-count");
    if (sanctionsLayerCount) sanctionsLayerCount.textContent = sanctions.length;
    const industryLayerCount = document.getElementById("industry-layer-count");
    if (industryLayerCount) industryLayerCount.textContent = industryPulseItems.length;
    updateOverview(snapshot);
    renderSourceStrip(snapshot.providers);
  }

  function resolveMode(snapshot) {
    const providerValues = Object.values(snapshot.providers || {});
    const available = providerValues.filter((provider) => provider.count > 0 || (provider.fetchedAt && !provider.error));
    const stale = available.filter((provider) => provider.stale);
    if (!available.length) return hasRealData ? "stale" : "demo";
    if (stale.length === available.length) return "stale";
    if (snapshot.mode === "live" && stale.length === 0) return "live";
    return "partial";
  }

  async function syncLiveData(force = false) {
    if (syncing) return;
    syncing = true;
    const refreshButton = el("refresh-data");
    refreshButton.classList.add("syncing");
    setSyncState("loading", "正在连接真实数据源", new Date());
    setPeriodButtons();

    if (staticShareMode) {
      const updatedAt = new Date().toISOString();
      const snapshot = {
        period: state.livePeriod,
        periodLabel: periodMeta[state.livePeriod].label,
        updatedAt,
        mode: "demo",
        providers: {
          events: { source: "单文件演示数据", sourceUrl: "", count: demo.events.length, stale: false, error: null, fetchedAt: updatedAt, demo: true },
          industry: { source: "单文件演示数据", sourceUrl: "", count: demo.industry.length, stale: false, error: null, fetchedAt: updatedAt, demo: true },
          markets: { source: "单文件演示数据", sourceUrl: "", count: demo.markets.length, stale: false, error: null, fetchedAt: updatedAt, demo: true },
          sanctions: { source: "单文件演示数据", sourceUrl: "", count: demo.sanctions.length, stale: false, error: null, fetchedAt: updatedAt, demo: true },
        },
        events: demo.events,
        industry: demo.industry,
        markets: demo.markets,
        sanctions: demo.sanctions,
      };
      lastSnapshot = snapshot;
      applySnapshot(snapshot);
      setSyncState("demo", "单文件分享版使用内置演示数据；实时数据请运行完整项目的 start-live.cmd", updatedAt);
      if (force) showToast("单文件分享版已刷新演示数据");
      refreshButton.classList.remove("syncing");
      syncing = false;
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch(`${apiBase}/api/snapshot?period=${state.livePeriod}&force=${force ? "1" : "0"}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`实时服务返回 ${response.status}`);
      const snapshot = await response.json();
      lastSnapshot = snapshot;
      applySnapshot(snapshot);
      const mode = resolveMode(snapshot);
      const failedSources = Object.values(snapshot.providers || {})
        .filter((provider) => !provider.count)
        .map((provider) => provider.source);
      const detail = failedSources.length ? `未同步：${failedSources.join("、")}` : "所有数据源已同步";
      setSyncState(mode, detail, snapshot.updatedAt);
      if (force) showToast(mode === "live" ? "真实数据同步完成" : `${detail}，已保留可用数据`);
    } catch (error) {
      const detail =
        location.protocol === "file:"
          ? "请先运行 start-live.cmd 或 node server.js，再打开 http://127.0.0.1:4173"
          : `实时服务连接失败：${error.message}`;
      setSyncState(hasRealData ? "stale" : "demo", detail, lastSnapshot?.updatedAt || new Date());
      if (!lastSnapshot) {
        updateOverview(null);
        renderSourceStrip({});
      }
      if (force) showToast(detail);
    } finally {
      window.clearTimeout(timeout);
      refreshButton.classList.remove("syncing");
      syncing = false;
    }
  }

  document.querySelectorAll("[data-period]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.livePeriod === button.dataset.period) return;
      state.livePeriod = button.dataset.period;
      syncLiveData(true);
    });
  });

  el("refresh-data").addEventListener("click", () => syncLiveData(true));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncLiveData(false);
  });

  renderSourceStrip({});
  updateOverview(null);
  setPeriodButtons();
  syncLiveData(false);
  window.setInterval(() => syncLiveData(false), 60 * 1000);
})();
