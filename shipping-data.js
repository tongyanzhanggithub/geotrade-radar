// ===========================================================
// 供应链与航运雷达 · Supply Chain & Shipping Radar
// 后端数据装配：复用 china-data 的 SCFI 实时运价，
// 叠加航线压力与关键节点（咽喉点）的运营态势数据。
// ===========================================================
const chinaData = require("./china-data.js");

// 关键节点（海峡 / 运河 / 绕行路线）——运营态势参考模型。
// level：0（顺畅）— 100（严重受阻）。lon/lat 预留给后续地图图层。
const CHOKEPOINTS = [
  {
    id: "suez-redsea",
    name: "苏伊士运河 / 红海",
    en: "Suez Canal / Red Sea",
    role: "亚欧海运主通道",
    status: "严重",
    level: 90,
    lon: 33.0,
    lat: 19.5,
    throughput: "约占全球集装箱贸易 12%",
    reason: "红海安全风险持续，多家承运商改走好望角绕行，船期与保险成本上升。",
  },
  {
    id: "hormuz",
    name: "霍尔木兹海峡",
    en: "Strait of Hormuz",
    role: "波斯湾能源出口咽喉",
    status: "严重",
    level: 86,
    lon: 56.4,
    lat: 26.6,
    throughput: "全球约 20% 石油、1/3 海运 LNG",
    reason: "地区局势紧张推高能源运输风险溢价，油轮保险与护航成本上升。",
  },
  {
    id: "panama",
    name: "巴拿马运河",
    en: "Panama Canal",
    role: "亚洲—美东走廊",
    status: "偏高",
    level: 72,
    lon: -79.9,
    lat: 9.1,
    throughput: "美国集装箱贸易约 14%",
    reason: "旱季水位与过闸配额限制，单船等待与转运成本周期性抬升。",
  },
  {
    id: "bosphorus",
    name: "博斯普鲁斯海峡",
    en: "Bosphorus Strait",
    role: "黑海粮食与能源出口",
    status: "偏高",
    level: 68,
    lon: 29.0,
    lat: 41.1,
    throughput: "黑海粮食外运主通道",
    reason: "港口检查、天气与安全形势共同扰动谷物与油品装运节奏。",
  },
  {
    id: "malacca",
    name: "马六甲海峡",
    en: "Strait of Malacca",
    role: "东亚—中东/欧洲主航道",
    status: "稳定",
    level: 38,
    lon: 100.3,
    lat: 2.5,
    throughput: "全球海运贸易约 25%",
    reason: "物流通畅，但原产地与转口合规审查趋严，部分货物清关周期延长。",
  },
  {
    id: "taiwan",
    name: "台湾海峡",
    en: "Taiwan Strait",
    role: "东亚集装箱与半导体走廊",
    status: "关注",
    level: 55,
    lon: 119.5,
    lat: 24.5,
    throughput: "东亚南北航线关键水道",
    reason: "地缘不确定性使部分航商评估替代航路，半导体物流时效敏感。",
  },
  {
    id: "cape",
    name: "好望角绕行",
    en: "Cape of Good Hope",
    role: "苏伊士替代绕行路线",
    status: "关注",
    level: 50,
    lon: 18.5,
    lat: -34.4,
    throughput: "亚欧绕行承接红海分流",
    reason: "绕行使亚欧航程增加约 10–14 天，燃油与船舶周转压力上升。",
  },
];

// 航线压力排行——评分越高，运营压力越大（参考模型）。
const ROUTES = [
  { id: "cn-eu", name: "中国—欧洲海运", score: 88, status: "严重", reason: "红海风险、苏伊士绕行和保险成本持续上升", change: "+18% 成本", chokepoint: "红海 / 苏伊士", commodities: ["电子产品", "机械设备", "光伏组件", "纺织服装"] },
  { id: "gulf-ea", name: "波斯湾—东亚能源", score: 86, status: "严重", reason: "霍尔木兹海峡能源运输风险溢价上升", change: "+9% 保险", chokepoint: "霍尔木兹", commodities: ["原油", "液化天然气 (LNG)", "石化产品"] },
  { id: "asia-usec", name: "亚洲—美国东海岸", score: 74, status: "偏高", reason: "巴拿马运河旱季配额限制与船期延误", change: "+6 天", chokepoint: "巴拿马运河", commodities: ["消费电子", "家具家居", "服装鞋帽", "汽车零部件"] },
  { id: "blacksea-med", name: "黑海—地中海粮食", score: 79, status: "偏高", reason: "港口检查、天气和安全风险共同扰动", change: "+7% 运费", chokepoint: "博斯普鲁斯", commodities: ["小麦", "玉米", "葵花籽油", "化肥"] },
  { id: "cafrica-io", name: "中非—印度洋矿产", score: 75, status: "偏高", reason: "道路运输与边境清关延误", change: "+12% 周期", chokepoint: "赞比亚边境", commodities: ["钴", "铜精矿", "锂辉石", "稀土精矿"] },
  { id: "cn-sea", name: "中国—东南亚制造", score: 42, status: "稳定", reason: "物流稳定，但原产地与转口合规审查加强", change: "+2% 合规", chokepoint: "马六甲", commodities: ["电子元件", "显示面板", "锂电池材料", "纺织原料"] },
  { id: "na-ea-semi", name: "北美—东亚半导体走廊", score: 70, status: "偏高", reason: "出口管制清单更新与晶圆产能调度调整物流路径", change: "+5% 时效", chokepoint: "横滨 / 高雄", commodities: ["半导体设备", "高端芯片", "精密仪器", "存储模组"] },
  { id: "au-ea-ore", name: "澳大利亚—东亚铁矿能源", score: 68, status: "偏高", reason: "钢铁需求周期与海岬型船运价波动影响装运节奏", change: "+4% 运费", chokepoint: "巽他海峡", commodities: ["铁矿石", "动力煤", "液化天然气 (LNG)"] },
  { id: "wafrica-eu", name: "西非—欧洲能源原料", score: 66, status: "关注", reason: "几内亚湾安全形势与北非管道供应影响补给", change: "+6% 保险", chokepoint: "几内亚湾", commodities: ["原油", "天然气", "铝土矿", "可可豆"] },
  { id: "imec", name: "印度—中东—欧洲经济走廊", score: 57, status: "关注", reason: "IMEC 多式联运基建进度决定新兴走廊承载能力", change: "+3 天", chokepoint: "海法 / 比雷埃夫斯", commodities: ["香料与农产品", "纺织原料", "原油", "化工中间体"] },
];

// 装配雷达快照：实时 SCFI 运价（失败则为 null）+ 航线压力 + 关键节点。
async function snapshot() {
  let composite = null;
  let routesLive = [];
  let routesUpdatedAt = null;
  try {
    const freight = await chinaData.freightIndex();
    composite = freight.composite || null;
    routesLive = Array.isArray(freight.routes) ? freight.routes : [];
    routesUpdatedAt = freight.routesUpdatedAt || null;
  } catch {
    composite = null;
  }

  const sorted = [...ROUTES].sort((a, b) => b.score - a.score);
  const high = sorted.filter((r) => r.score >= 70).length;
  const severe = CHOKEPOINTS.filter((c) => c.level >= 80).length;

  return {
    source: "上海航运交易所 SCFI · 运营态势参考模型",
    sourceUrl: "https://www.sse.net.cn/index/singleIndex?indexType=scfi",
    fetchedAt: new Date().toISOString(),
    composite, // 实时 SCFI 综合运价指数（可能为 null）
    freightRoutes: routesLive, // 分航线运价（data/freight-routes.json，可为空）
    freightRoutesUpdatedAt: routesUpdatedAt,
    routes: sorted,
    chokepoints: CHOKEPOINTS,
    summary: {
      routeCount: sorted.length,
      highPressureRoutes: high,
      severeChokepoints: severe,
      topRoute: sorted[0] ? sorted[0].name : null,
      topRouteScore: sorted[0] ? sorted[0].score : null,
    },
  };
}

module.exports = { snapshot, ROUTES, CHOKEPOINTS };
