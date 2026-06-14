// ===========================================================
// 能源与大宗商品雷达 · Energy & Commodities Radar
// 后端数据装配：扩展的大宗商品宇宙（能源 / 贵金属 / 工业金属 / 农产品），
// 复用 Yahoo Finance 报价管道；抓取失败时按品种降级到演示值。
// ===========================================================

// 商品宇宙：symbol = Yahoo 期货代码；demo = 抓取失败时的兜底值
const COMMODITIES = [
  // —— 能源 ——
  { symbol: "BZ=F", name: "布伦特原油", unit: "美元/桶", group: "energy", driver: "霍尔木兹/红海地缘风险与 OPEC+ 产量决定油价中枢", demo: { value: 82.4, change: 1.2 } },
  { symbol: "CL=F", name: "WTI 原油", unit: "美元/桶", group: "energy", driver: "美国页岩供给与库存数据主导价差", demo: { value: 78.6, change: 1.0 } },
  { symbol: "NG=F", name: "天然气", unit: "美元/MMBtu", group: "energy", driver: "气温、LNG 出口与库存波动放大价格弹性", demo: { value: 2.85, change: -2.1 } },
  { symbol: "RB=F", name: "RBOB 汽油", unit: "美元/加仑", group: "energy", driver: "炼厂开工与出行旺季需求", demo: { value: 2.42, change: 0.6 } },
  { symbol: "HO=F", name: "取暖油/柴油", unit: "美元/加仑", group: "energy", driver: "馏分油库存与工业、运输需求", demo: { value: 2.55, change: 0.4 } },
  // —— 贵金属 ——
  { symbol: "GC=F", name: "黄金", unit: "美元/盎司", group: "precious", driver: "实际利率、美元与避险情绪三因素定价", demo: { value: 2360, change: 0.5 } },
  { symbol: "SI=F", name: "白银", unit: "美元/盎司", group: "precious", driver: "兼具贵金属避险与光伏工业需求", demo: { value: 30.8, change: 0.9 } },
  { symbol: "PL=F", name: "铂金", unit: "美元/盎司", group: "precious", driver: "汽车催化与氢能需求预期", demo: { value: 1010, change: 0.3 } },
  { symbol: "PA=F", name: "钯金", unit: "美元/盎司", group: "precious", driver: "燃油车催化需求受电动化挤压", demo: { value: 980, change: -0.7 } },
  // —— 工业金属 ——
  { symbol: "HG=F", name: "铜", unit: "美元/磅", group: "base", driver: "电网、电动车与 AI 数据中心用铜支撑长期需求", demo: { value: 4.55, change: 1.4 } },
  { symbol: "ALI=F", name: "铝", unit: "美元/吨", group: "base", driver: "电解铝能耗成本与新能源用铝需求", demo: { value: 2520, change: 0.8 } },
  // —— 农产品 ——
  { symbol: "ZW=F", name: "小麦", unit: "美分/蒲式耳", group: "agri", driver: "黑海出口与天气主导全球供给", demo: { value: 620, change: -1.1 } },
  { symbol: "ZC=F", name: "玉米", unit: "美分/蒲式耳", group: "agri", driver: "美国种植季天气与乙醇、饲料需求", demo: { value: 445, change: -0.5 } },
  { symbol: "ZS=F", name: "大豆", unit: "美分/蒲式耳", group: "agri", driver: "南美产量与中国进口节奏", demo: { value: 1180, change: 0.7 } },
  { symbol: "SB=F", name: "原糖", unit: "美分/磅", group: "agri", driver: "巴西、印度产量与原油带动的乙醇需求", demo: { value: 19.5, change: 1.6 } },
  { symbol: "KC=F", name: "咖啡", unit: "美分/磅", group: "agri", driver: "巴西、越南天气与库存偏紧", demo: { value: 225, change: 2.3 } },
];

const GROUPS = [
  { id: "energy", label: "能源" },
  { id: "precious", label: "贵金属" },
  { id: "base", label: "工业金属" },
  { id: "agri", label: "农产品" },
];

function riskOf(change) {
  const a = Math.abs(change);
  return a >= 2 ? "高" : a >= 0.8 ? "偏高" : "关注";
}

function formatValue(v) {
  if (!Number.isFinite(v)) return "—";
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 10) return v.toFixed(2);
  return v.toFixed(2);
}

async function fetchYahoo(symbol) {
  // 依次尝试 query1 / query2 主机：某个主机被限流时仍有机会取到实时报价
  let payload = null;
  let lastStatus = 0;
  for (const host of ["query1", "query2"]) {
    const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1h`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Accept: "application/json" },
        signal: AbortSignal.timeout(12000),
      });
      lastStatus = res.status;
      if (res.ok) {
        payload = await res.json();
        break;
      }
    } catch {
      // 尝试下一个主机
    }
  }
  if (!payload) throw new Error(`yahoo ${lastStatus || "unreachable"}`);
  const result = payload?.chart?.result?.[0];
  if (!result) throw new Error("no result");
  const closes = (result.indicators?.quote?.[0]?.close || []).filter(Number.isFinite);
  const latest = result.meta?.regularMarketPrice ?? closes.at(-1);
  const base = closes[0] ?? result.meta?.chartPreviousClose ?? result.meta?.previousClose;
  if (!Number.isFinite(latest)) throw new Error("no price");
  const change = Number.isFinite(base) && base !== 0 ? ((latest - base) / base) * 100 : 0;
  const series = closes.length ? closes : [latest, latest];
  const sampled = series.length > 8 ? Array.from({ length: 8 }, (_, i) => series[Math.floor((i * (series.length - 1)) / 7)]) : series;
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const points = sampled.map((v) => 28 - ((v - min) / (max - min || 1)) * 20);
  return { numericValue: latest, change: Number(change.toFixed(2)), points, currency: result.meta?.currency || "" };
}

// 60 秒内存缓存：避免每次请求都打 16 次 Yahoo，降低限流概率并加速响应
let cache = { at: 0, data: null };
const CACHE_TTL = 60 * 1000;

async function snapshot() {
  if (cache.data && Date.now() - cache.at < CACHE_TTL) return cache.data;
  const settled = await Promise.allSettled(COMMODITIES.map((c) => fetchYahoo(c.symbol)));
  let realCount = 0;
  const commodities = COMMODITIES.map((c, i) => {
    const r = settled[i];
    const live = r.status === "fulfilled";
    if (live) realCount += 1;
    const numericValue = live ? r.value.numericValue : c.demo.value;
    const change = live ? r.value.change : c.demo.change;
    return {
      symbol: c.symbol,
      name: c.name,
      unit: c.unit,
      group: c.group,
      driver: c.driver,
      value: formatValue(numericValue),
      numericValue,
      change,
      risk: riskOf(change),
      points: live ? r.value.points : null,
      real: live,
    };
  });

  const mode = realCount === 0 ? "demo" : realCount < COMMODITIES.length ? "partial" : "live";
  const gainers = [...commodities].filter((c) => c.change > 0).sort((a, b) => b.change - a.change).slice(0, 4);
  const losers = [...commodities].filter((c) => c.change < 0).sort((a, b) => a.change - b.change).slice(0, 4);
  const highRisk = commodities.filter((c) => c.risk === "高").length;

  const result = {
    source: mode === "demo" ? "演示数据（Yahoo Finance 暂不可用）" : "Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/commodities",
    fetchedAt: new Date().toISOString(),
    mode, // live | partial | demo
    groups: GROUPS.map((g) => ({ ...g, items: commodities.filter((c) => c.group === g.id) })),
    commodities,
    summary: {
      count: commodities.length,
      realCount,
      highRisk,
      topGainers: gainers.map((c) => ({ name: c.name, change: c.change })),
      topLosers: losers.map((c) => ({ name: c.name, change: c.change })),
    },
  };

  // 仅缓存含实时数据的结果；纯演示（全失败）不缓存，便于下次请求重试 Yahoo
  if (mode !== "demo") cache = { at: Date.now(), data: result };
  return result;
}

module.exports = { snapshot, COMMODITIES, GROUPS };
