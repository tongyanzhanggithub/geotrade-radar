// =====================================================================
// china-data.js — 华贸雷达真实数据源（UN Comtrade 免 key preview 接口）
//   - overview():  中国进出口总额 / 多年趋势 / 同比 / Top 出口·进口商品 / Top 市场·来源
//   - product(hs): 指定 HS 编码的中国出口规模 / 目的国 / 增长最快市场 / 同比 / 机会分
// 数据来源：UN Comtrade（comtradeapi.un.org/public/v1/preview），单次最多 500 行，免密钥。
// 贸易额单位为美元（USD）。年度数据通常滞后 1-2 年（2026 年时最新为 2024）。
//
// preview 接口的两条硬限制（详见 comtrade() 注释）：
//   - 每次请求只能查 1 个期间，多年必须逐年查询
//   - 限流约 1 次/秒，需串行 + 退避重试
// 冷启动 overview() 需串行十余次请求（约 30-40 秒），故结果缓存 12 小时并落盘，
// server.js 启动后会在后台预热。
// =====================================================================
const fs = require("node:fs");
const path = require("node:path");

const PREVIEW = "https://comtradeapi.un.org/public/v1/preview/C/A/HS";
const CHINA = 156;
const WORLD = 0;
const CACHE_FILE = path.join(process.env.DATA_DIR || __dirname, "china-cache.json");
const TTL_MS = 12 * 60 * 60 * 1000; // 12 小时

// ---------- 缓存（内存 + 磁盘，贸易数据基本静态，尽量少打 API）----------
let cache = {};
try {
  cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
} catch {
  cache = {};
}
function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  } catch {
    /* 忽略写盘失败 */
  }
}
async function cached(key, fn) {
  const hit = cache[key];
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const data = await fn();
  cache[key] = { at: Date.now(), data };
  saveCache();
  return data;
}

// ---------- Comtrade 请求 ----------
// preview 接口有两条硬限制，违反任一条都拿不到数据：
//   1) 每次请求只能查 1 个期间（多年逗号拼接会返回 400
//      "Maximum number of periods for preview is 1"）→ 多年数据必须逐年查询
//   2) 限流约 1 次/秒，并发或密集请求会返回 429
// 因此所有请求串行排队 + 最小间隔，并对 429 按其提示的秒数退避重试。
const MIN_GAP_MS = 1100;
const MAX_RETRY = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastCallAt = 0;
let queue = Promise.resolve();

// 串行执行：前一个失败也要继续跑后面的，避免一次失败卡死整条队列
function enqueue(fn) {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => {},
    () => {}
  );
  return run;
}

async function comtradeFetch(params) {
  const qs = new URLSearchParams({ includeDesc: "TRUE", ...params }).toString();
  const url = `${PREVIEW}?${qs}`;
  for (let attempt = 0; ; attempt++) {
    const gap = Date.now() - lastCallAt;
    if (gap < MIN_GAP_MS) await sleep(MIN_GAP_MS - gap);
    lastCallAt = Date.now();
    const res = await fetch(url, {
      headers: { "User-Agent": "GeoTradeRadar/1.0" },
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 429 && attempt < MAX_RETRY) {
      const body = await res.text().catch(() => "");
      const secs = Number((body.match(/again in (\d+)/) || [])[1]) || attempt + 1;
      await sleep(secs * 1000 + 300);
      continue;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let detail = "";
      try {
        const j = JSON.parse(body);
        detail = j.error || j.message || "";
      } catch {
        /* 非 JSON 错误体，忽略 */
      }
      throw new Error(`Comtrade HTTP ${res.status}${detail ? "：" + detail : ""}`);
    }
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  }
}

function comtrade(params) {
  return enqueue(() => comtradeFetch(params));
}

// 逐年查询并合并（preview 每次只允许 1 个期间）。单年失败不影响其他年份。
async function comtradeYears(params, years) {
  const out = [];
  for (const year of years) {
    try {
      out.push(...(await comtrade({ ...params, period: String(year) })));
    } catch {
      /* 该年缺数据或临时失败：跳过，用其余年份继续 */
    }
  }
  return out;
}

// 年度数据通常滞后 1-2 年（例如 2026 年时最新可用为 2024）。
// 从去年往前探测第一个有数据的年份，结果单独缓存，避免每次都探。
async function latestDataYear() {
  return cached("latestYear", async () => {
    const now = new Date().getFullYear();
    for (const candidate of [now - 1, now - 2, now - 3]) {
      const rows = await comtrade({
        reporterCode: CHINA,
        partnerCode: WORLD,
        flowCode: "X",
        cmdCode: "TOTAL",
        period: String(candidate),
      });
      if (rows.length) return candidate;
    }
    throw new Error("Comtrade 暂无可用年度数据");
  });
}

// ---------- 中文名映射 ----------
const PARTNER_ZH = {
  0: "全球", 842: "美国", 344: "中国香港", 392: "日本", 410: "韩国", 704: "越南",
  // Comtrade 专用码（与 ISO 不同）：印度=699、中国台湾=490(Other Asia,nes)、法国=251、意大利=381
  699: "印度", 490: "中国台湾", 251: "法国", 381: "意大利",
  276: "德国", 356: "印度", 528: "荷兰", 826: "英国", 484: "墨西哥", 458: "马来西亚",
  764: "泰国", 360: "印度尼西亚", 643: "俄罗斯", 36: "澳大利亚", 124: "加拿大", 76: "巴西",
  608: "菲律宾", 702: "新加坡", 158: "中国台湾", 784: "阿联酋", 682: "沙特阿拉伯",
  250: "法国", 380: "意大利", 724: "西班牙", 616: "波兰", 792: "土耳其", 56: "比利时",
  372: "爱尔兰", 752: "瑞典", 348: "匈牙利", 203: "捷克", 818: "埃及", 710: "南非",
  586: "巴基斯坦", 50: "孟加拉国", 144: "斯里兰卡", 104: "缅甸", 116: "柬埔寨",
  414: "科威特", 634: "卡塔尔", 512: "阿曼", 364: "伊朗", 368: "伊拉克", 32: "阿根廷",
  152: "智利", 604: "秘鲁", 170: "哥伦比亚", 554: "新西兰", 757: "瑞士", 40: "奥地利",
  300: "希腊", 620: "葡萄牙", 208: "丹麦", 246: "芬兰", 578: "挪威", 100: "保加利亚",
  642: "罗马尼亚", 191: "克罗地亚", 705: "斯洛文尼亚", 703: "斯洛伐克", 442: "卢森堡",
  858: "乌拉圭", 600: "巴拉圭", 862: "委内瑞拉", 218: "厄瓜多尔", 188: "哥斯达黎加",
};
const HS2_ZH = {
  "01": "活动物", "02": "肉类", "03": "鱼及水产", "04": "乳蛋制品", "07": "蔬菜",
  "08": "水果坚果", "09": "咖啡茶香料", "10": "谷物", "12": "油籽(大豆等)", "15": "动植物油脂",
  "16": "肉鱼制品", "17": "糖及糖食", "18": "可可制品", "19": "谷物制品", "20": "蔬果制品",
  "21": "杂项食品", "22": "饮料酒", "23": "饲料", "24": "烟草", "25": "盐石膏水泥",
  "26": "矿砂矿渣", "27": "矿物燃料(原油等)", "28": "无机化学品", "29": "有机化学品", "30": "药品",
  "31": "肥料", "32": "鞣料染料", "33": "精油化妆品", "34": "洗涤用品", "38": "杂项化工",
  "39": "塑料制品", "40": "橡胶制品", "41": "生皮革", "42": "皮革制品", "44": "木及木制品",
  "47": "纸浆", "48": "纸及纸板", "49": "印刷品", "52": "棉", "54": "化纤长丝",
  "55": "化纤短纤", "58": "特种织物", "60": "针织物", "61": "针织服装", "62": "梭织服装",
  "63": "其他纺织制品", "64": "鞋靴", "68": "石料制品", "69": "陶瓷", "70": "玻璃制品",
  "71": "珠宝贵金属", "72": "钢铁", "73": "钢铁制品", "74": "铜及制品", "76": "铝及制品",
  "82": "工具器具", "83": "贱金属杂项", "84": "机械设备", "85": "电机电气设备(含芯片)",
  "86": "铁道车辆", "87": "车辆", "88": "航空器", "89": "船舶", "90": "光学医疗仪器",
  "91": "钟表", "92": "乐器", "93": "武器弹药", "94": "家具寝具灯具", "95": "玩具运动用品",
  "96": "杂项制品", "97": "艺术品", "99": "未分类商品",
};
function partnerName(code, fallback) {
  return PARTNER_ZH[code] || fallback || `地区 ${code}`;
}
function shortCmd(desc) {
  if (!desc) return "";
  return String(desc).split(/[;,]/)[0].slice(0, 18);
}
function cmdName(code, fallback) {
  if (HS2_ZH[code]) return HS2_ZH[code];
  return shortCmd(fallback) || `HS ${code}`;
}

// ---------- 金额格式化（美元）----------
function fmtUsd(v) {
  if (v == null) return "—";
  if (v >= 1e12) return (v / 1e12).toFixed(2) + " 万亿美元";
  if (v >= 1e8) return Math.round(v / 1e8).toLocaleString("en-US") + " 亿美元";
  if (v >= 1e4) return Math.round(v / 1e4).toLocaleString("en-US") + " 万美元";
  return Math.round(v).toLocaleString("en-US") + " 美元";
}
function yoy(cur, prev) {
  if (!prev || prev <= 0 || cur == null) return null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

// 取某流向、指定分组的最新年 Top 列表
function topList(rows, latestYear, { byPartner }, limit = 6) {
  return rows
    .filter((r) => r.refYear === latestYear && (byPartner ? r.partnerCode !== WORLD : r.cmdCode !== "TOTAL"))
    .sort((a, b) => b.primaryValue - a.primaryValue)
    .slice(0, limit)
    .map((r) =>
      byPartner
        ? { label: partnerName(r.partnerCode, r.partnerDesc), value: r.primaryValue, valueText: fmtUsd(r.primaryValue) }
        : { code: r.cmdCode, label: cmdName(r.cmdCode, r.cmdDesc), value: r.primaryValue, valueText: fmtUsd(r.primaryValue) }
    );
}

// =====================================================================
// 总览
// =====================================================================
async function overview() {
  return cached("overview", async () => {
    const latest = await latestDataYear();
    const prev = latest - 1;
    // 1) 出口总额取 5 年画趋势；进口只需最新年与上一年（用于同比），少打 3 次接口
    const trendYears = [latest - 4, latest - 3, latest - 2, latest - 1, latest];
    const expTotals = await comtradeYears(
      { reporterCode: CHINA, partnerCode: WORLD, flowCode: "X", cmdCode: "TOTAL" },
      trendYears
    );
    const impTotals = await comtradeYears(
      { reporterCode: CHINA, partnerCode: WORLD, flowCode: "M", cmdCode: "TOTAL" },
      [prev, latest]
    );

    const byYear = (rows) => {
      const m = {};
      rows.forEach((r) => (m[r.refYear] = r.primaryValue));
      return m;
    };
    const exp = byYear(expTotals);
    const imp = byYear(impTotals);
    const yearsAvail = Object.keys(exp).map(Number).sort((a, b) => a - b);

    const expLatest = exp[latest] || 0;
    const impLatest = imp[latest] || 0;

    // 2) 最新年 Top 出口/进口商品（HS2）、Top 出口市场/进口来源（各 1 次）
    const expCmd = await comtrade({ reporterCode: CHINA, partnerCode: WORLD, flowCode: "X", cmdCode: "AG2", period: String(latest) });
    const impCmd = await comtrade({ reporterCode: CHINA, partnerCode: WORLD, flowCode: "M", cmdCode: "AG2", period: String(latest) });
    const expPartner = await comtrade({ reporterCode: CHINA, flowCode: "X", cmdCode: "TOTAL", period: String(latest) });
    const impPartner = await comtrade({ reporterCode: CHINA, flowCode: "M", cmdCode: "TOTAL", period: String(latest) });

    return {
      source: "UN Comtrade",
      period: latest,
      updatedAt: new Date().toISOString(),
      totals: [
        { k: "进出口总额", value: expLatest + impLatest, v: fmtUsd(expLatest + impLatest), yoy: yoy(expLatest + impLatest, (exp[prev] || 0) + (imp[prev] || 0)) },
        { k: "出口总额", value: expLatest, v: fmtUsd(expLatest), yoy: yoy(expLatest, exp[prev]) },
        { k: "进口总额", value: impLatest, v: fmtUsd(impLatest), yoy: yoy(impLatest, imp[prev]) },
      ],
      trend: yearsAvail.map((y) => ({ year: y, value: exp[y] })),
      topExports: topList(expCmd, latest, { byPartner: false }),
      topImports: topList(impCmd, latest, { byPartner: false }),
      exportMarkets: topList(expPartner, latest, { byPartner: true }),
      importSources: topList(impPartner, latest, { byPartner: true }),
    };
  });
}

// =====================================================================
// 商品机会（指定 HS 编码，4 或 6 位）
// =====================================================================
async function product(hs) {
  const code = String(hs || "").replace(/[^0-9]/g, "");
  if (!code) throw new Error("缺少 HS 编码");
  return cached("product:" + code, async () => {
    // 最新年 + 上一年即可（同比与"增长最快市场"都只需这两年）
    const latest = await latestDataYear();
    const prev = latest - 1;
    const rows = await comtradeYears({ reporterCode: CHINA, flowCode: "X", cmdCode: code }, [prev, latest]);
    if (!rows.length) throw new Error("无该 HS 编码的出口数据");
    const desc = rows[0].cmdDesc || `HS ${code}`;

    const world = rows.find((r) => r.refYear === latest && r.partnerCode === WORLD);
    const worldPrev = rows.find((r) => r.refYear === prev && r.partnerCode === WORLD);
    const scaleVal = world ? world.primaryValue : 0;
    const growth = yoy(scaleVal, worldPrev ? worldPrev.primaryValue : null);

    // Top 目的国（排除全球）
    const dest = rows
      .filter((r) => r.refYear === latest && r.partnerCode !== WORLD)
      .sort((a, b) => b.primaryValue - a.primaryValue)
      .slice(0, 8)
      .map((r) => ({ name: partnerName(r.partnerCode, r.partnerDesc), value: r.primaryValue, valueText: fmtUsd(r.primaryValue) }));

    // 增长最快市场（按同比，需上年有数据、且规模够）
    const prevMap = {};
    rows.filter((r) => r.refYear === prev).forEach((r) => (prevMap[r.partnerCode] = r.primaryValue));
    const fastest = rows
      .filter((r) => r.refYear === latest && r.partnerCode !== WORLD && prevMap[r.partnerCode] > 0 && r.primaryValue > scaleVal * 0.01)
      .map((r) => ({ name: partnerName(r.partnerCode, r.partnerDesc), g: yoy(r.primaryValue, prevMap[r.partnerCode]) }))
      .filter((x) => x.g != null)
      .sort((a, b) => b.g - a.g)
      .slice(0, 4)
      .map((x) => `${x.name} ${x.g >= 0 ? "+" : ""}${x.g}%`);

    // 机会分（派生）：增长 + 目的国分散度 的简单加权
    const top3Share = dest.slice(0, 3).reduce((s, d) => s + d.value, 0) / (scaleVal || 1);
    const diversify = Math.max(0, 1 - top3Share); // 越分散越高
    let score = 50 + (growth || 0) * 1.2 + diversify * 40;
    score = Math.max(30, Math.min(95, Math.round(score)));

    return {
      source: "UN Comtrade",
      period: latest,
      updatedAt: new Date().toISOString(),
      hs: code,
      desc,
      scaleValue: scaleVal,
      scale: fmtUsd(scaleVal),
      yoy: growth,
      dest,
      fastest,
      score,
    };
  });
}

// =====================================================================
// 出口市场（指定伙伴国代码）
// =====================================================================
async function market(partnerCode) {
  const code = Number(partnerCode);
  if (!code) throw new Error("缺少国家代码");
  return cached("market:" + code, async () => {
    const latest = await latestDataYear();
    const prev = latest - 1;

    // A) 中国对该国出口，按 HS2 分组（商品 / 增长 / 细分机会）
    const ex = await comtradeYears(
      { reporterCode: CHINA, flowCode: "X", partnerCode: code, cmdCode: "AG2" },
      [prev, latest]
    );
    if (!ex.length) throw new Error("无对该国出口数据");
    const latestRows = ex.filter((r) => r.refYear === latest);
    const prevMap = {};
    ex.filter((r) => r.refYear === prev).forEach((r) => (prevMap[r.cmdCode] = r.primaryValue));
    const totalToCountry = latestRows.reduce((s, r) => s + r.primaryValue, 0);

    const topFromCN = latestRows
      .slice()
      .sort((a, b) => b.primaryValue - a.primaryValue)
      .slice(0, 6)
      .map((r) => cmdName(r.cmdCode, r.cmdDesc));

    const growthList = latestRows
      .filter((r) => prevMap[r.cmdCode] > 0 && r.primaryValue > totalToCountry * 0.01)
      .map((r) => ({ name: cmdName(r.cmdCode, r.cmdDesc), g: yoy(r.primaryValue, prevMap[r.cmdCode]) }))
      .filter((x) => x.g != null)
      .sort((a, b) => b.g - a.g);
    const fastest = growthList.slice(0, 4).map((x) => `${x.name} ${x.g >= 0 ? "+" : ""}${x.g}%`);
    const niches = growthList.filter((x) => x.g > 0).slice(0, 4).map((x) => x.name);

    // 注：中国市场份额需双边镜像数据，伙伴国报送常滞后/不对称，易失真，
    //     因此这里只输出"中国对该国出口额"（中国报送，可靠）作为真实指标，
    //     份额由前端以预置值标注为"参考"。
    const totalPrev = ex.filter((r) => r.refYear === prev).reduce((s, r) => s + r.primaryValue, 0);
    const totGrowth = yoy(totalToCountry, totalPrev) || 0;
    let score = 55 + totGrowth * 0.8 + Math.min(niches.length, 4) * 3;
    score = Math.max(35, Math.min(95, Math.round(score)));

    return {
      source: "UN Comtrade",
      period: latest,
      updatedAt: new Date().toISOString(),
      code,
      totalToCountry: fmtUsd(totalToCountry),
      totalGrowth: totGrowth,
      topFromCN,
      fastest,
      niches,
      score,
    };
  });
}

// =====================================================================
// 进口依赖（传入 HS 编码列表，逗号分隔）
// =====================================================================
async function dependency(hsList) {
  const codes = String(hsList || "")
    .split(",")
    .map((s) => s.replace(/[^0-9]/g, ""))
    .filter(Boolean);
  if (!codes.length) throw new Error("缺少 HS 列表");
  const latestYear = await latestDataYear();
  // 各 HS 并行发起，实际请求由 comtrade() 的串行队列限速，不会触发 429
  const results = await Promise.all(
    codes.map((code) =>
      cached("dep:" + code, async () => {
        const rows = await comtradeYears({ reporterCode: CHINA, flowCode: "M", cmdCode: code }, [latestYear]);
        if (!rows.length) return null;
        const latest = Math.max(...rows.map((r) => r.refYear));
        const latestRows = rows.filter((r) => r.refYear === latest);
        const world = latestRows.find((r) => r.partnerCode === WORLD);
        const partners = latestRows
          .filter((r) => r.partnerCode !== WORLD && r.partnerCode !== CHINA) // 排除"从自身进口"(加工返进口)
          .sort((a, b) => b.primaryValue - a.primaryValue);
        const total = world ? world.primaryValue : partners.reduce((s, r) => s + r.primaryValue, 0);
        const top3 = partners.slice(0, 3).reduce((s, r) => s + r.primaryValue, 0);
        const top3Share = total > 0 ? Math.round((top3 / total) * 100) : null;
        const level = top3Share == null ? "" : top3Share >= 75 ? "极高" : top3Share >= 55 ? "高" : top3Share >= 35 ? "中" : "低";
        return {
          hs: code,
          period: latest,
          amount: fmtUsd(total),
          sources: partners.slice(0, 4).map((r) => partnerName(r.partnerCode, r.partnerDesc)),
          concentration: top3Share != null ? `${level} (前三占比 ${top3Share}%)` : "—",
        };
      }).catch(() => null)
    )
  );
  return { source: "UN Comtrade", updatedAt: new Date().toISOString(), items: results.filter(Boolean) };
}

// =====================================================================
// 政策与合规：WTO 贸易救济（反倾销 / 反补贴）对华案件
// 数据源：WTO Trade Remedies Data Portal（trade-remedies.wto.org，免密钥）
// =====================================================================
const WTO_AD = "https://trade-remedies.wto.org/api/antidumping/investigations/charts";
const WTO_CV = "https://trade-remedies.wto.org/api/cv/investigations/charts";

const REPORTER_ZH = {
  "United States": "美国", India: "印度", "European Union": "欧盟", Brazil: "巴西",
  Argentina: "阿根廷", "Türkiye": "土耳其", Turkey: "土耳其", Australia: "澳大利亚",
  Canada: "加拿大", Mexico: "墨西哥", Indonesia: "印度尼西亚", "South Africa": "南非",
  Egypt: "埃及", Colombia: "哥伦比亚", Peru: "秘鲁", Ukraine: "乌克兰", Chile: "智利",
  "Eurasian Economic Union": "欧亚经济联盟", "Russian Federation": "俄罗斯", Japan: "日本",
  "Republic of Korea": "韩国", "Korea, Republic of": "韩国", Pakistan: "巴基斯坦",
  Thailand: "泰国", Malaysia: "马来西亚", "Viet Nam": "越南", Philippines: "菲律宾",
  "United Kingdom": "英国", "Gulf Cooperation Council": "海湾合作委员会", "Saudi Arabia": "沙特阿拉伯",
  "New Zealand": "新西兰", Israel: "以色列", Morocco: "摩洛哥", Tunisia: "突尼斯",
  "Costa Rica": "哥斯达黎加", Taiwan: "中国台湾", "Chinese Taipei": "中国台湾",
};
const HS_SECTION_ZH = {
  I: "活动物及动物产品", II: "植物产品", III: "动植物油脂", IV: "食品、饮料、烟草",
  V: "矿产品", VI: "化学工业产品", VII: "塑料、橡胶及制品", VIII: "皮革毛皮制品",
  IX: "木及木制品", X: "木浆、纸张", XI: "纺织原料及制品", XII: "鞋帽伞等",
  XIII: "石料、陶瓷、玻璃制品", XIV: "珠宝、贵金属", XV: "贱金属及制品", XVI: "机电、音像设备",
  XVII: "车辆、航空器、船舶", XVIII: "光学、医疗、精密仪器", XIX: "武器、弹药",
  XX: "杂项制品(家具玩具等)", XXI: "艺术品、收藏品",
};
const reporterZh = (n) => REPORTER_ZH[n] || n || "未知";
const sectionZh = (code, label) => HS_SECTION_ZH[code] || (label ? label.slice(0, 14) : "其他");
const isChinaExporter = (m) =>
  typeof m === "string" && m.indexOf("China") >= 0 && !/Taipei|Hong|Macao/.test(m);
function parseDt(s) {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s || "");
  return m ? Number(m[3] + m[2] + m[1]) : 0;
}
function groupTop(arr, keyFn, n) {
  const map = {};
  arr.forEach((r) => {
    const k = keyFn(r);
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, value: count, note: count + " 起" }));
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "GeoTradeRadar/1.0", Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function tradeRemedies() {
  return cached("remedies", async () => {
    const [ad, cv] = await Promise.all([
      fetchJson(WTO_AD).catch(() => []),
      fetchJson(WTO_CV).catch(() => []),
    ]);
    const tag = (arr, type) => (Array.isArray(arr) ? arr : []).filter((r) => isChinaExporter(r.exporting_member)).map((r) => ({ ...r, _type: type }));
    const all = [...tag(ad, "反倾销"), ...tag(cv, "反补贴")];
    if (!all.length) throw new Error("无对华贸易救济数据");

    const maxYear = Math.max(new Date().getFullYear() - 1, ...all.map((r) => r.initiation_dt_year || 0));
    const recentCut = maxYear - 1;
    const adCount = all.filter((r) => r._type === "反倾销").length;
    const cvCount = all.filter((r) => r._type === "反补贴").length;

    const cases = all
      .sort((a, b) => parseDt(b.initiation_dt) - parseDt(a.initiation_dt))
      .slice(0, 18)
      .map((r) => ({
        type: r._type,
        reporter: reporterZh(r.reporting_member),
        product: r.subject_product || "—",
        sector: sectionZh(r.hs_section_code, r.hs_section_label),
        date: r.initiation_dt,
        year: r.initiation_dt_year,
        status: r.conclusion ? r.conclusion : "进行中 / 调查阶段",
      }));

    return {
      source: "WTO 贸易救济数据门户",
      updatedAt: new Date().toISOString(),
      summary: {
        total: all.length,
        ad: adCount,
        cv: cvCount,
        recent: all.filter((r) => (r.initiation_dt_year || 0) >= recentCut).length,
        recentCut,
        topInitiators: groupTop(all, (r) => reporterZh(r.reporting_member), 6),
        topSectors: groupTop(all, (r) => sectionZh(r.hs_section_code, r.hs_section_label), 6),
      },
      cases,
    };
  });
}

// =====================================================================
// 省市产业：各省出口额（官方海关口径，内置年度数据）
// 说明：UN Comtrade 无中国省级数据；省级数据源为中国海关总署，
//      无稳定免费 API 且海外服务器访问受限，故内置最新官方年度数据，
//      标注来源与年份；地图按真实出口额着色。
// 数据：2024 年 1-11 月各省出口总额（亿元人民币，海关总署）
// =====================================================================
const PROVINCE_EXPORT_2024 = {
  广东: 53752.1, 浙江: 35721.8, 江苏: 32926.9, 山东: 18680.9, 上海: 16418.5,
  福建: 11201.2, 北京: 5549.0, 四川: 5498.8, 安徽: 5221.3, 河南: 4681.3,
  重庆: 4454.1, 湖北: 4309.0, 广西: 3810.1, 天津: 3558.9, 新疆: 3430.4,
  辽宁: 3416.2, 河北: 3402.8, 湖南: 3003.5, 陕西: 2800.5, 江西: 2775.6,
  山西: 983.2, 海南: 974.3, 云南: 843.1, 内蒙古: 767.1, 黑龙江: 763.0,
  吉林: 615.9, 贵州: 442.9, 宁夏: 132.6, 甘肃: 110.1, 西藏: 99.9, 青海: 38.2,
};
function fmtYi(v) {
  return v >= 10000 ? (v / 10000).toFixed(2) + " 万亿元" : Math.round(v).toLocaleString("en-US") + " 亿元";
}
async function regions() {
  const entries = Object.entries(PROVINCE_EXPORT_2024).sort((a, b) => b[1] - a[1]);
  const max = entries[0][1];
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const provinces = entries.map(([name, v], i) => ({
    name,
    exportYi: v,
    exportText: fmtYi(v),
    rank: i + 1,
    share: Math.round((v / total) * 1000) / 10,
    heat: Math.max(4, Math.round(Math.sqrt(v / max) * 100)), // 平方根标度，便于中小省份可见
  }));
  return {
    source: "中国海关总署（各省出口）",
    period: "2024年1-11月",
    unit: "亿元人民币",
    // 真实官方数据，但为内置的固定版本快照（非每次请求实时抓取）——
    // 前端据此标注为"存档数据"，不冒充实时。
    tier: "static",
    vintageNote: "内置官方年度快照，非实时抓取",
    provinces,
  };
}

// =====================================================================
// AI 贸易产业简报：基于真实数据，调用 Claude(Sonnet 4.6)生成结构化报告
// 零依赖：原生 fetch 调 Anthropic /v1/messages（与项目其它外部数据源一致）
// =====================================================================
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const REPORT_MODEL = "claude-sonnet-4-6";

// 常见中文商品名 → HS 编码（用于把查询里的商品对应到真实出口数据）
const PRODUCT_HS = {
  摩托车零配件: "8714", 摩配: "8714", 摩托车: "8711", 光伏组件: "854143", 光伏: "854143",
  机器人减速器: "848340", 减速器: "848340", 锂电池: "850760", 动力电池: "850760",
  汽车零部件: "8708", 汽车配件: "8708", 汽配: "8708", 集成电路: "8542", 芯片: "8542",
  大豆: "1201", 原油: "2709", 数控机床: "8457", 光刻胶: "370790",
};

const REPORT_SCHEMA = {
  type: "object",
  properties: {
    conclusion: { type: "string" },
    data: { type: "array", items: { type: "string" } },
    markets: { type: "array", items: { type: "string" } },
    oppGoods: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    compliance: { type: "array", items: { type: "string" } },
    next: { type: "array", items: { type: "string" } },
    future: { type: "array", items: { type: "string" } },
  },
  required: ["conclusion", "data", "markets", "oppGoods", "risks", "compliance", "next", "future"],
  additionalProperties: false,
};

const REPORT_SYSTEM = `你是"华贸雷达"的中国外贸与产业链情报分析师。基于下方提供的【真实数据】(来源：UN Comtrade 2024 年度贸易数据、WTO 贸易救济案件、中国海关省级出口)，针对用户查询生成一份结构化决策简报。

要求：
- 只依据提供的真实数据与公认的产业常识进行分析；引用数字时使用数据中的真实值，不要编造数据中不存在的具体数字。
- 面向投资人、外贸企业与产业研究者，语言专业、简洁、可执行。
- 全部使用中文。
- 严格按给定 JSON 结构输出 8 个字段：conclusion(核心结论，一段话)、data(贸易数据概览，3-5 条)、markets(主要市场，3-6 个)、oppGoods(机会商品，3-5 个)、risks(风险因素，3-5 条)、compliance(政策合规，2-4 条)、next(建议跟进方向，3-5 条)、future(未来观察点，3-5 个)。`;

async function buildReportContext(q) {
  const ctx = {};
  try {
    const o = await overview();
    ctx.中国贸易总览 = {
      年份: o.period,
      进出口: o.totals,
      主要出口商品: o.topExports.slice(0, 6),
      主要进口商品: o.topImports.slice(0, 6),
      主要出口市场: o.exportMarkets.slice(0, 6),
      主要进口来源: o.importSources.slice(0, 6),
    };
  } catch {
    /* ignore */
  }
  // 商品：查询含 HS 数字或命中中文商品名
  let hs = (q.match(/\d{4,6}/) || [])[0] || null;
  if (!hs) {
    for (const [name, code] of Object.entries(PRODUCT_HS)) {
      if (q.includes(name)) {
        hs = code;
        break;
      }
    }
  }
  if (hs) {
    try {
      ctx.商品出口 = await product(hs);
    } catch {
      /* ignore */
    }
  }
  // 出口市场：查询命中国家名
  for (const [code, name] of Object.entries(PARTNER_ZH)) {
    if (code !== "0" && name.length >= 2 && q.includes(name)) {
      try {
        ctx.出口市场 = await market(Number(code));
      } catch {
        /* ignore */
      }
      break;
    }
  }
  // 贸易救济概览
  try {
    ctx.贸易救济 = (await tradeRemedies()).summary;
  } catch {
    /* ignore */
  }
  return ctx;
}

async function generateReport(query) {
  const q = String(query || "").trim();
  if (!q) throw new Error("请输入查询内容");
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const e = new Error("AI 简报未启用：服务器未设置 ANTHROPIC_API_KEY");
    e.code = "NO_KEY";
    throw e;
  }
  return cached("report:" + q, async () => {
    const ctx = await buildReportContext(q);
    const body = {
      model: REPORT_MODEL,
      max_tokens: 6000,
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type: "json_schema", schema: REPORT_SCHEMA } },
      system: [{ type: "text", text: REPORT_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `用户查询：${q}\n\n可用真实数据(JSON)：\n${JSON.stringify(ctx)}` }],
    };
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Claude API ${res.status}${t ? "：" + t.slice(0, 200) : ""}`);
    }
    const data = await res.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    if (!textBlock) throw new Error("AI 未返回有效内容");
    let report;
    try {
      report = JSON.parse(textBlock.text);
    } catch {
      throw new Error("AI 返回内容解析失败");
    }
    return {
      source: "Claude Sonnet 4.6",
      model: "Sonnet 4.6",
      query: q,
      generatedAt: new Date().toISOString(),
      dataSources: ["UN Comtrade", "WTO 贸易救济", "海关省级出口"],
      report,
    };
  });
}

// =====================================================================
// 本土数据源：商务部贸易救济公告(实时抓取) / 海关月度数据 / 信保国别风险
// 后两者来自 data/ 目录下的结构化数据文件（官网有反爬或仅发布年报，
// 由运营者按 data/README.md 的说明定期从官方发布页更新，代码不编造数字）。
// =====================================================================

// 中国贸易救济信息网（商务部贸易救济调查局主办）首页公告列表
// 结构：<li class="clearfix"><i>日期</i><em>类型</em><a href="...">标题</a></li>
async function mofcomAnnouncements() {
  return cached("mofcom-announcements", async () => {
    const response = await fetch("https://cacs.mofcom.gov.cn/", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept-Language": "zh-CN" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`cacs.mofcom.gov.cn ${response.status}`);
    const html = await response.text();
    const pattern = /<li class="clearfix">\s*<i>(20\d{2}-\d{2}-\d{2})<\/i><em>\s*([^<]+?)\s*<\/em><a href="(\/cacscms\/article\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const seen = new Set();
    const items = [];
    for (const match of html.matchAll(pattern)) {
      const url = "https://cacs.mofcom.gov.cn" + match[3].replace(/&amp;/g, "&");
      const title = match[4].replace(/&hellip;/g, "…").replace(/\s+/g, " ").trim();
      if (seen.has(url) || seen.has(title)) continue;
      seen.add(url);
      seen.add(title);
      items.push({ date: match[1], type: match[2].trim(), title, url });
    }
    items.sort((a, b) => (a.date < b.date ? 1 : -1));
    return {
      source: "中国贸易救济信息网（商务部）",
      sourceUrl: "https://cacs.mofcom.gov.cn/",
      fetchedAt: new Date().toISOString(),
      announcements: items.slice(0, 20),
    };
  });
}

// 运价与航线雷达：上海航运交易所 SCFI 综合指数（实时抓取）+ 分航线运价
// （官网分航线为动态加载，由运营者按 data/README.md 维护 data/freight-routes.json）
async function freightIndex() {
  const live = await cached("scfi-index", async () => {
    const response = await fetch("https://www.sse.net.cn/index/singleIndex?indexType=scfi", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`sse.net.cn ${response.status}`);
    const html = await response.text();
    const idx = html.indexOf("综合指数");
    const after = idx >= 0 ? html.slice(idx, idx + 400) : "";
    const nums = [...after.matchAll(/<td[^>]*>\s*([\d.]+)\s*<\/td>/g)].map((m) => Number(m[1]));
    const dateMatch = html.match(/(20\d{2}-\d{1,2}-\d{1,2})/);
    if (nums.length < 2) throw new Error("SCFI 解析失败");
    const current = nums[0];
    const previous = nums[1];
    return {
      index: "SCFI 上海出口集装箱运价指数（综合）",
      current,
      previous,
      change: Math.round((current - previous) * 100) / 100,
      changePct: previous ? Math.round(((current - previous) / previous) * 1000) / 10 : null,
      date: dateMatch ? dateMatch[1] : null,
    };
  });
  const routesFile = readDataFile("freight-routes.json");
  return {
    source: "上海航运交易所 SCFI",
    sourceUrl: "https://www.sse.net.cn/index/singleIndex?indexType=scfi",
    fetchedAt: new Date().toISOString(),
    composite: live,
    routes: routesFile && Array.isArray(routesFile.routes) ? routesFile.routes : [],
    routesUpdatedAt: routesFile ? routesFile.updatedAt || null : null,
  };
}

function readDataFile(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "data", name), "utf8"));
  } catch {
    return null;
  }
}

// 海关总署月度进出口数据（data/customs-monthly.json，运营者每月更新）
async function customsMonthly() {
  const file = readDataFile("customs-monthly.json");
  if (!file || !Array.isArray(file.entries) || !file.entries.length) {
    return { configured: false, note: "尚未配置海关月度数据，请按 data/README.md 从海关总署官网更新" };
  }
  return {
    configured: true,
    source: file.source || "中国海关总署",
    sourceUrl: file.sourceUrl || "http://www.customs.gov.cn/",
    unit: file.unit || "亿元人民币",
    updatedAt: file.updatedAt || null,
    entries: file.entries,
  };
}

// 中国信保国别风险评级（data/sinosure-risk.json，运营者按年度报告更新）
async function countryRisk() {
  const file = readDataFile("sinosure-risk.json");
  if (!file || !Array.isArray(file.countries) || !file.countries.length) {
    return { configured: false, note: "尚未配置国别风险数据，请按 data/README.md 从中国信保年度报告更新" };
  }
  return {
    configured: true,
    source: file.source || "中国出口信用保险公司《国家风险分析报告》",
    sourceUrl: file.sourceUrl || "https://www.sinosure.com.cn/",
    edition: file.edition || null,
    scale: file.scale || "1（风险最低）— 9（风险最高）",
    countries: file.countries,
  };
}

module.exports = { overview, product, market, dependency, tradeRemedies, regions, generateReport, mofcomAnnouncements, customsMonthly, countryRisk, freightIndex };
