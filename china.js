(() => {
  "use strict";

  // ===========================================================
  // 华贸雷达 China Trade Radar
  // 单页应用：会话校验 + 哈希路由 + 8 个情报模块（演示数据）
  // ===========================================================

  const guard = document.getElementById("cn-guard");
  const app = document.getElementById("cn-app");
  const main = document.getElementById("cn-main");
  const nav = document.getElementById("cn-nav");
  const logoutButton = document.getElementById("cn-logout");
  const toast = document.getElementById("cn-toast");

  const VIEWS = [
    "home",
    "dashboard",
    "products",
    "markets",
    "import",
    "regions",
    "policy",
    "freight",
    "reports",
  ];

  const state = {
    view: "home",
    product: "摩托车零配件",
    market: "印度尼西亚",
    region: "重庆",
    report: "摩托车零配件 · 东盟出口机会",
  };

  // 中国省级地图（Leaflet + DataV GeoJSON）
  const GEO_URL = "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json";
  let cnGeoCache = null; // 缓存省界数据，避免重复请求
  let cnMap = null;
  let cnGeoLayer = null;
  let cnSelected = null;

  // ----------------------- 工具函数 -----------------------
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function pct(n) {
    const cls = n >= 0 ? "cn-pos" : "cn-neg";
    const sign = n >= 0 ? "+" : "";
    return `<b class="${cls}">${sign}${n}%</b>`;
  }

  function riskTag(level) {
    const map = { 高: "high", 较高: "high", 中: "mid", 中等: "mid", 低: "low" };
    return `<span class="cn-risk cn-risk--${map[level] || "mid"}">${esc(level)}</span>`;
  }

  // 横向条形：items = [{label, value, note}]
  function bars(items, accent) {
    const max = Math.max(...items.map((i) => i.value)) || 1;
    return `<div class="cn-bars">${items
      .map(
        (i) => `
      <div class="cn-bar-row">
        <span class="cn-bar-label">${esc(i.label)}</span>
        <span class="cn-bar-track"><i style="width:${Math.round((i.value / max) * 100)}%;${
          accent ? `background:${accent}` : ""
        }"></i></span>
        <span class="cn-bar-val">${esc(i.note || i.value)}</span>
      </div>`
      )
      .join("")}</div>`;
  }

  // 环形评分
  function ring(score, label) {
    const color = score >= 80 ? "var(--cn-green)" : score >= 65 ? "var(--cn-gold)" : "var(--cn-red)";
    return `<div class="cn-ring" style="--p:${score};--ring:${color}">
      <div class="cn-ring-core"><strong>${score}</strong><span>${esc(label || "机会评分")}</span></div>
    </div>`;
  }

  function tagList(arr) {
    return `<div class="cn-tags">${arr.map((t) => `<span>${esc(t)}</span>`).join("")}</div>`;
  }

  function chainFlow(steps) {
    return `<div class="cn-chain">${steps
      .map((s) => `<span>${esc(s)}</span>`)
      .join('<b aria-hidden="true">→</b>')}</div>`;
  }

  // ----------------------- 演示数据 -----------------------
  const PULSE = [
    { k: "进出口总额(年化)", v: "¥43.8万亿", note: "同比 +5.0%", tone: "neutral" },
    { k: "出口风险等级", v: "较高", note: "关税摩擦 / 绿色壁垒上升", tone: "risk" },
    { k: "机会信号", v: "东盟新能源出海", note: "机会分 86 · 持续走强", tone: "opp" },
  ];

  const DASHBOARD = {
    totals: [
      { k: "进出口总额", v: "¥43.8万亿", yoy: 5.0 },
      { k: "出口总额", v: "¥25.6万亿", yoy: 6.7 },
      { k: "进口总额", v: "¥18.2万亿", yoy: 2.8 },
    ],
    trend: [88, 90, 86, 92, 95, 93, 98, 101, 99, 104, 108, 112],
    topExports: [
      { label: "机电产品", value: 100, note: "¥15.1万亿" },
      { label: "锂电池", value: 64, note: "+18%" },
      { label: "电动汽车", value: 58, note: "+22%" },
      { label: "光伏组件", value: 47, note: "-9%" },
      { label: "家用电器", value: 41, note: "+7%" },
      { label: "纺织服装", value: 38, note: "+1%" },
    ],
    topImports: [
      { label: "集成电路", value: 100, note: "¥2.6万亿" },
      { label: "原油", value: 92, note: "¥2.3万亿" },
      { label: "铁矿砂", value: 61, note: "+4%" },
      { label: "天然气", value: 44, note: "+6%" },
      { label: "大豆", value: 39, note: "-3%" },
      { label: "汽车零部件", value: 31, note: "+5%" },
    ],
    exportMarkets: [
      { label: "东盟", value: 100, note: "16.2%" },
      { label: "欧盟", value: 84, note: "13.8%" },
      { label: "美国", value: 80, note: "13.1%" },
      { label: "中国香港", value: 49, note: "8.0%" },
      { label: "日本", value: 36, note: "5.9%" },
      { label: "韩国", value: 28, note: "4.6%" },
    ],
    importSources: [
      { label: "中国台湾", value: 100, note: "芯片为主" },
      { label: "韩国", value: 86, note: "存储 / 面板" },
      { label: "美国", value: 71, note: "农产品 / 设备" },
      { label: "澳大利亚", value: 65, note: "铁矿 / 天然气" },
      { label: "日本", value: 58, note: "设备 / 零件" },
      { label: "巴西", value: 44, note: "大豆 / 铁矿" },
    ],
    anomalies: [
      { name: "电动汽车", change: 22, why: "东盟与中东需求放量，新能源出海加速", risk: "中" },
      { name: "光伏组件", change: -9, why: "海外产能竞争与价格战，单价快速下行", risk: "较高" },
      { name: "稀土永磁", change: -14, why: "出口管制与许可审查趋严", risk: "高" },
      { name: "船舶", change: 31, why: "全球替换周期与绿色船舶订单增长", risk: "低" },
    ],
  };

  const SIGNALS = [
    { k: "出口景气指数", v: 108, note: "近12月整体上行", tone: "pos" },
    { k: "政策不确定性", v: 71, note: "关税 / 出口管制升温", tone: "neg" },
    { k: "人民币汇率压力", v: 58, note: "双向波动、整体可控", tone: "mid" },
    { k: "供应链外移压力", v: 64, note: "部分产能转向东盟/墨", tone: "neg" },
  ];

  // 地图热点：机会(opp) / 风险(risk)，province 用于在地图按省质心定位
  const HOTSPOTS = [
    { province: "重庆", type: "opp", title: "新能源汽摩出海", note: "东盟 / 非洲 / 拉美" },
    { province: "广东", type: "opp", title: "电子与新能源整链", note: "消费电子 + 储能" },
    { province: "安徽", type: "opp", title: "新能源汽车整车", note: "整车出口高增" },
    { province: "浙江", type: "opp", title: "跨境电商 + 光伏", note: "小商品出海" },
    { province: "江西", type: "risk", title: "稀土出口管制", note: "许可审查趋严" },
    { province: "河北", type: "risk", title: "CBAM 碳关税", note: "钢铁出口承压" },
    { province: "江苏", type: "risk", title: "光伏反倾销", note: "新兴市场加税" },
    { province: "上海", type: "risk", title: "高端芯片进口依赖", note: "先进制程受限" },
  ];

  const PRODUCTS = {
    摩托车零配件: {
      hs: "8714",
      scale: "¥1,180亿",
      yoy: 12,
      dest: ["印度尼西亚", "尼日利亚", "菲律宾", "越南", "巴西"],
      fastest: ["尼日利亚 +34%", "印度尼西亚 +26%", "墨西哥 +19%"],
      rivals: ["印度", "泰国", "越南"],
      barrier: "印尼本地化(TKDN)比例要求上升；部分非洲国家提高进口关税与认证门槛。",
      barrierLevel: "中",
      score: 82,
    },
    光伏组件: {
      hs: "854143",
      scale: "¥2,940亿",
      yoy: -9,
      dest: ["荷兰", "巴西", "印度", "西班牙", "沙特阿拉伯"],
      fastest: ["沙特阿拉伯 +41%", "巴基斯坦 +37%", "南非 +22%"],
      rivals: ["越南(转口)", "印度", "马来西亚"],
      barrier: "欧盟与美国双反及本土制造补贴；价格战导致单瓦利润大幅压缩。",
      barrierLevel: "高",
      score: 61,
    },
    机器人减速器: {
      hs: "848340",
      scale: "¥86亿(出口)",
      yoy: 8,
      dest: ["越南", "韩国", "印度", "墨西哥", "泰国"],
      fastest: ["印度 +29%", "墨西哥 +24%"],
      rivals: ["日本", "德国"],
      barrier: "高端 RV / 谐波减速器仍依赖日系进口，出口以中低端为主，高端认证壁垒高。",
      barrierLevel: "中",
      score: 68,
    },
    锂电池: {
      hs: "850760",
      scale: "¥4,260亿",
      yoy: 18,
      dest: ["美国", "德国", "韩国", "越南", "西班牙"],
      fastest: ["西班牙 +52%", "匈牙利 +44%", "墨西哥 +33%"],
      rivals: ["韩国", "日本"],
      barrier: "美国 IRA 本土化要求与关税；欧盟电池法案碳足迹与回收要求。",
      barrierLevel: "较高",
      score: 79,
    },
    汽车零部件: {
      hs: "8708",
      scale: "¥6,820亿",
      yoy: 9,
      dest: ["美国", "墨西哥", "日本", "德国", "韩国"],
      fastest: ["墨西哥 +27%", "波兰 +21%", "泰国 +16%"],
      rivals: ["墨西哥", "德国", "日本"],
      barrier: "美墨加原产地规则；电动化转型下传统零部件需求结构变化。",
      barrierLevel: "中",
      score: 80,
    },
  };

  const MARKETS = {
    印度尼西亚: {
      code: 360,
      region: "东盟",
      share: 28,
      topFromCN: ["机电产品", "钢铁制品", "手机及零件", "纺织面料"],
      fastest: ["电动两轮车 +38%", "光伏组件 +33%", "锂电池 +29%"],
      niches: ["新能源摩托车", "家电本地组装", "光伏 EPC 与储能", "镍基电池材料"],
      barrier: "本地化(TKDN)比例要求、镍矿出口与下游绑定政策、清真认证。",
      barrierLevel: "中",
      score: 85,
    },
    越南: {
      code: 704,
      region: "东盟",
      share: 32,
      topFromCN: ["机电零部件", "面料辅料", "钢铁", "塑料原料"],
      fastest: ["太阳能设备 +31%", "电子元件 +28%", "纺织机械 +17%"],
      niches: ["电子代工配套", "纺织上游面料", "光伏与储能", "工业自动化"],
      barrier: "原产地与转口审查趋严；美国对经越南转口的反规避调查。",
      barrierLevel: "较高",
      score: 81,
    },
    墨西哥: {
      code: 484,
      region: "北美",
      share: 21,
      topFromCN: ["汽车零部件", "机电产品", "电子元件", "家电"],
      fastest: ["新能源汽车零件 +34%", "锂电池 +33%", "家电 +18%"],
      niches: ["近岸制造配套", "汽车电动化零部件", "家电整机组装"],
      barrier: "USMCA 原产地规则；美国对经墨西哥转口的关注上升。",
      barrierLevel: "较高",
      score: 77,
    },
    沙特阿拉伯: {
      code: 682,
      region: "中东",
      share: 19,
      topFromCN: ["机电产品", "钢铁", "光伏组件", "工程机械"],
      fastest: ["光伏组件 +41%", "储能 +39%", "电动汽车 +27%"],
      niches: ["新能源与储能 EPC", "智慧城市设备", "工程机械与建材"],
      barrier: "Vision 2030 本地化采购要求；项目回款与合规审查。",
      barrierLevel: "中",
      score: 83,
    },
    巴西: {
      code: 76,
      region: "拉美",
      share: 24,
      topFromCN: ["机电产品", "化工", "汽车零部件", "手机"],
      fastest: ["电动汽车 +46%", "光伏 +30%", "农机 +14%"],
      niches: ["新能源汽车整车与零件", "光伏与农村电力", "农业机械"],
      barrier: "进口关税较高与本地组装要求；汇率与物流成本波动。",
      barrierLevel: "中",
      score: 78,
    },
  };

  const DEPENDENCY = [
    {
      hs: "8542",
      name: "集成电路(高端芯片)",
      amount: "¥2.6万亿",
      sources: ["中国台湾", "韩国", "美国", "日本"],
      concentration: "高 (前三占比 78%)",
      difficulty: "极高",
      domestic: "成熟制程加速国产替代，先进制程受设备与 EDA 限制",
      risk: "高",
    },
    {
      hs: "848340",
      name: "工业机器人减速器(RV/谐波)",
      amount: "¥210亿",
      sources: ["日本"],
      concentration: "极高 (日系约 70%)",
      difficulty: "高",
      domestic: "国产谐波已突破，RV 高精度与寿命仍在追赶",
      risk: "较高",
    },
    {
      hs: "2709",
      name: "原油",
      amount: "¥2.3万亿",
      sources: ["沙特阿拉伯", "俄罗斯", "伊拉克", "阿联酋"],
      concentration: "中 (来源较分散)",
      difficulty: "高",
      domestic: "战略储备 + 进口多元化，难以本土替代",
      risk: "中",
    },
    {
      hs: "1201",
      name: "大豆",
      amount: "¥4,100亿",
      sources: ["巴西", "美国", "阿根廷"],
      concentration: "高 (巴西+美国 80%+)",
      difficulty: "中",
      domestic: "国产扩种 + 巴西占比提升以对冲美国风险",
      risk: "中",
    },
    {
      hs: "8457",
      name: "高端数控机床",
      amount: "¥780亿",
      sources: ["日本", "德国", "瑞士"],
      concentration: "高",
      difficulty: "高",
      domestic: "中低端国产化高，五轴高端仍依赖进口",
      risk: "较高",
    },
    {
      hs: "370790",
      name: "光刻胶(高端)",
      amount: "¥120亿",
      sources: ["日本", "韩国"],
      concentration: "极高 (日系主导)",
      difficulty: "极高",
      domestic: "KrF/ArF 部分突破，EUV 光刻胶基本空白",
      risk: "高",
    },
  ];

  const REGIONS = {
    list: [
      { name: "广东", heat: 100, adv: ["电子信息", "家电", "新能源汽车"], opp: "消费电子与新能源整链出海", risk: "外需波动、用工成本" },
      { name: "浙江", heat: 88, adv: ["小商品", "纺织", "光伏"], opp: "跨境电商与光伏储能", risk: "贸易摩擦、价格战" },
      { name: "江苏", heat: 92, adv: ["装备制造", "光伏", "电子"], opp: "高端装备与新能源", risk: "光伏双反、产能过剩" },
      { name: "山东", heat: 74, adv: ["化工", "农产品", "机械"], opp: "化工新材料与农机出海", risk: "环保合规、原料进口依赖" },
      { name: "四川", heat: 70, adv: ["电子信息", "动力电池", "白酒"], opp: "动力电池与电子配套", risk: "物流成本、外向度偏低" },
      { name: "上海", heat: 90, adv: ["集成电路", "汽车", "高端装备"], opp: "高端制造与离岸贸易枢纽", risk: "高端零件进口依赖" },
      { name: "安徽", heat: 76, adv: ["新能源汽车", "家电", "光伏"], opp: "新能源汽车整车出海", risk: "供应链外移、外需依赖" },
      { name: "重庆", heat: 95, adv: ["汽车", "摩托车", "电子信息"], opp: "汽摩与智能制造一体化出海", risk: "整车出口壁垒、零件升级压力" },
    ],
    detail: {
      重庆: {
        title: "重庆 · 汽摩与智能制造样板",
        intro:
          "重庆是中国西部最重要的汽车、摩托车与电子信息制造基地，正从传统燃油汽摩向新能源、智能制造与机器人产业链升级。",
        pillars: [
          { k: "汽车", d: "整车+零部件全链条，新能源转型与智能网联加速" },
          { k: "摩托车", d: "全球最大摩托车出口集群之一，零配件出海优势突出" },
          { k: "电子信息", d: "笔电与智能终端代工重镇，配套完整" },
          { k: "装备制造", d: "通用装备与工程机械，向高端化升级" },
          { k: "新材料", d: "镁铝合金、电池材料配套汽摩与新能源" },
          { k: "机器人与智能制造", d: "工业机器人本体与系统集成，服务本地制造升级" },
        ],
        export: [
          { label: "摩托车及零配件", value: 100, note: "核心出口" },
          { label: "汽车及零部件", value: 78, note: "+11%" },
          { label: "笔电与电子", value: 64, note: "+6%" },
          { label: "通用机械", value: 41, note: "+9%" },
        ],
        opp: ["新能源摩托车出海(东盟/非洲/拉美)", "汽车电动化零部件", "机器人系统集成出口"],
        risk: ["整车出口的关税与认证壁垒", "传统燃油汽摩需求结构变化", "高端零件与芯片进口依赖"],
        score: 88,
      },
    },
  };

  const POLICY = [
    {
      type: "反补贴 / 关税",
      title: "欧盟对中国电动汽车加征反补贴税",
      level: "高",
      goods: "纯电动乘用车",
      sectors: "新能源汽车、动力电池、汽车零部件",
      provinces: "广东、上海、安徽、陕西",
      chain: ["反补贴终裁加税", "对欧整车出口成本上升", "车企转向本地建厂/第三国", "零部件随产能外移"],
      watch: ["欧盟终裁税率与价格承诺谈判", "中国车企欧洲建厂进度", "东盟/拉美替代市场放量"],
    },
    {
      type: "出口管制",
      title: "稀土、镓锗及相关技术出口管制趋严",
      level: "高",
      goods: "稀土永磁、镓、锗、相关冶炼分离技术",
      sectors: "新能源、半导体、军工、磁材",
      provinces: "江西、内蒙古、四川、广东",
      chain: ["出口许可审查趋严", "海外供应紧张、价格波动", "下游寻求替代与库存", "倒逼海外本土产能"],
      watch: ["出口许可发放节奏", "海外稀土/镓锗价格", "下游磁材与芯片厂库存"],
    },
    {
      type: "337 调查",
      title: "美国 ITC 对中国某消费电子产品发起 337 调查",
      level: "较高",
      goods: "智能终端及相关组件",
      sectors: "消费电子、电子元件",
      provinces: "广东、江苏、福建",
      chain: ["专利侵权指控立案", "潜在排除令风险", "对美出口受阻", "供应链与品牌转向"],
      watch: ["ITC 初裁时间表", "和解与交叉授权可能", "对美渠道替代方案"],
    },
    {
      type: "绿色贸易壁垒",
      title: "欧盟碳边境调节机制(CBAM)进入实施过渡",
      level: "中",
      goods: "钢铁、铝、化肥、水泥等高碳产品",
      sectors: "钢铁、有色、化工",
      provinces: "河北、山东、江苏、辽宁",
      chain: ["碳排放申报要求", "高碳产品出口成本上升", "倒逼低碳改造", "重塑出口竞争力"],
      watch: ["CBAM 申报与缴费时间表", "国内碳市场与欧盟价差", "钢铝企业低碳认证进度"],
    },
    {
      type: "反倾销",
      title: "新兴市场对中国光伏与钢铁发起反倾销",
      level: "较高",
      goods: "光伏组件、热轧钢卷",
      sectors: "光伏、钢铁",
      provinces: "江苏、浙江、河北",
      chain: ["反倾销立案/加税", "单一市场出口受限", "产能转向新兴市场", "全球价格与利润承压"],
      watch: ["各国立案与税率", "海外建厂与本地化", "组件价格与库存"],
    },
  ];

  const REPORTS = {
    "摩托车零配件 · 东盟出口机会": {
      conclusion:
        "东盟(尤其印尼、菲律宾、越南)对摩托车零配件需求旺盛，叠加电动两轮车渗透，是中国摩配企业出海的核心机会区，但需提前布局本地化与认证以对冲政策风险。",
      data: [
        "中国摩托车零配件年出口约 ¥1,180亿，同比 +12%",
        "东盟占中国摩配出口约 31%，为第一大区域",
        "电动两轮车相关零部件增速领先(印尼 +38%)",
      ],
      markets: ["印度尼西亚", "菲律宾", "越南", "尼日利亚(非洲对照)"],
      oppGoods: ["电动两轮车电机与控制器", "传动与制动系统", "锂电与 BMS 配套"],
      risks: ["印尼 TKDN 本地化比例要求", "部分国家提高关税与认证门槛", "本地组装竞争加剧"],
      compliance: ["TKDN / 本地含量证明", "目标国摩配安全与排放认证", "原产地与转口合规"],
      next: ["在印尼/越南布局本地组装或合资", "切入电动化高附加值零部件", "建立海外认证与售后网络"],
      future: ["东盟电动两轮车补贴政策", "印尼镍-电池产业链绑定", "非洲市场关税与购买力变化"],
    },
    "光伏组件 · 出口风险": {
      conclusion:
        "光伏组件出口规模大但风险高：欧美双反与本土补贴叠加价格战，单一发达市场风险上升，机会正向中东、拉美、南亚等新兴市场迁移。",
      data: [
        "光伏组件年出口约 ¥2,940亿，同比 -9%(量增价跌)",
        "对欧盟出口占比下滑，对中东/南亚快速上升",
        "组件单价持续下行，行业利润大幅压缩",
      ],
      markets: ["沙特阿拉伯", "巴基斯坦", "巴西", "南非"],
      oppGoods: ["组件+储能一体化方案", "分布式与户用系统", "EPC 与运维服务"],
      risks: ["欧美双反与本土制造补贴", "新兴市场反倾销蔓延", "价格战与产能过剩"],
      compliance: ["目标国碳足迹与回收要求", "反倾销/反规避应对", "项目融资与合规审查"],
      next: ["从卖组件转向卖系统与储能方案", "新兴市场本地化建厂或合资", "锁定优质 EPC 与运维订单"],
      future: ["欧盟电池/碳足迹法规", "中东大型新能源项目招标", "全球组件价格触底信号"],
    },
    "重庆 · 汽车产业链": {
      conclusion:
        "重庆汽摩与电子产业链完整，正向新能源、智能制造与机器人升级，是西部出海与产业替代的样板，机会集中在新能源汽摩与高附加值零部件。",
      data: [
        "重庆为全球最大摩托车出口集群之一，汽摩出口持续增长",
        "新能源汽车与智能网联快速放量",
        "笔电与电子信息配套完整，机器人系统集成起步",
      ],
      markets: ["东盟", "非洲", "拉美", "中东"],
      oppGoods: ["新能源摩托车整车与三电", "汽车电动化零部件", "工业机器人系统集成"],
      risks: ["整车出口关税与认证壁垒", "传统燃油汽摩需求结构变化", "高端零件与芯片进口依赖"],
      compliance: ["目标国汽摩准入与排放认证", "原产地规则", "新能源补贴与本地化要求"],
      next: ["推动新能源摩托车海外本地组装", "升级高附加值汽车电子零部件", "以机器人提升本地制造效率并对外输出"],
      future: ["东盟/非洲电动两轮车政策", "西部陆海新通道物流成本", "本地芯片与高端零件国产化进度"],
    },
  };

  // ----------------------- 渲染：各视图 -----------------------
  function viewHome() {
    return `
    <section class="cn-hero">
      <div class="cn-hero-glow" aria-hidden="true"></div>
      <span class="cn-eyebrow">CHINA TRADE INTELLIGENCE</span>
      <h1>洞察中国贸易、产业与出海机会</h1>
      <p class="cn-hero-sub">连接中国进出口数据、区域产业链、全球市场变化与政策风险，为投资、外贸和产业研究提供决策信号。</p>

      <form class="cn-search" id="cn-search">
        <span class="cn-search-icon" aria-hidden="true">⌕</span>
        <input id="cn-search-input" type="search" autocomplete="off"
          placeholder="搜索商品、HS编码、出口市场、省份、行业或政策事件…" />
        <button type="submit">检索</button>
      </form>

      <div class="cn-chips">
        <button class="cn-chip-btn" data-go="products" data-product="摩托车零配件">摩托车零配件</button>
        <button class="cn-chip-btn" data-go="regions" data-region="重庆">重庆汽车产业链</button>
        <button class="cn-chip-btn" data-go="markets" data-market="印度尼西亚">东盟出口机会</button>
        <button class="cn-chip-btn" data-go="products" data-product="光伏组件">光伏出口风险</button>
        <button class="cn-chip-btn" data-go="import">机器人减速器进口依赖</button>
      </div>

      <div class="cn-hero-actions">
        <button class="cn-btn cn-btn--primary" data-go="dashboard">进入中国贸易总览</button>
        <button class="cn-btn cn-btn--ghost" data-go="reports">生成 AI 贸易简报</button>
      </div>

      <div class="cn-pulse">
        ${PULSE.map(
          (p) => `
        <article class="cn-pulse-card cn-pulse-card--${p.tone}">
          <span>${esc(p.k)}</span>
          <strong>${esc(p.v)}</strong>
          <small>${esc(p.note)}</small>
        </article>`
        ).join("")}
      </div>
    </section>`;
  }

  function viewDashboard() {
    const d = liveData.overview || DASHBOARD;
    // 实时 overview 的 trend 可能为空（某年 Comtrade 缺数据）→ Math.max(...[]) 会得 -Infinity 致 NaN，回退演示趋势
    const trend = Array.isArray(d.trend) && d.trend.length ? d.trend : DASHBOARD.trend;
    const trendMax = Math.max(...trend);
    const trendMin = Math.min(...trend);
    const pts = trend
      .map((v, i) => {
        const x = (i / (trend.length - 1)) * 100;
        const y = 100 - ((v - trendMin) / (trendMax - trendMin || 1)) * 100;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return `
    ${viewHead("中国贸易总览", "进出口态势、省市热力、实时信号与异常波动")}
    ${sourceBadge(liveData.overview, "总额与商品/市场为实时；信号、异常、热点为参考演示")}
    ${customsSection()}
    <div class="cn-terminal">
      <aside class="cn-rail">
        <section class="cn-panel">
          <h3 class="cn-panel-title">中国贸易脉搏</h3>
          <div class="cn-mini-kpis">
            ${d.totals
              .map(
                (t) =>
                  `<div class="cn-mini-kpi"><span>${esc(t.k)}</span><strong>${esc(t.v)}</strong><small>同比 ${pct(
                    t.yoy
                  )}</small></div>`
              )
              .join("")}
          </div>
          <svg class="cn-spark" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${pts}" /></svg>
          <small class="cn-spark-note">出口景气近12月整体上行 ${pct(8)}</small>
        </section>
        <section class="cn-panel">
          <h3 class="cn-panel-title">实时关键信号</h3>
          <div class="cn-signals">
            ${SIGNALS.map(
              (s) =>
                `<div class="cn-signal-row"><span>${esc(s.k)}</span><strong>${s.v}</strong><b class="cn-${esc(
                  s.tone
                )}">${esc(s.note)}</b></div>`
            ).join("")}
          </div>
        </section>
      </aside>

      <div class="cn-map-stage cn-map-stage--terminal">
        <div id="cn-map" aria-label="中国贸易态势图"></div>
        <div class="cn-map-legend">
          <span class="cn-legend-title">出口热度</span>
          <span><i style="background:#e5564a"></i>高</span>
          <span><i style="background:#f3934b"></i>较高</span>
          <span><i style="background:#f3b44b"></i>中</span>
          <span><i style="background:#2a3233"></i>低</span>
          <span class="cn-legend-sep"></span>
          <span><i class="cn-dot cn-dot--opp"></i>机会热点</span>
          <span><i class="cn-dot cn-dot--risk"></i>风险热点</span>
        </div>
        <div class="cn-map-focus" id="cn-map-focus" hidden></div>
      </div>

      <aside class="cn-rail">
        <section class="cn-panel">
          <h3 class="cn-panel-title">异常波动商品</h3>
          <div class="cn-anomaly cn-anomaly--compact">
            ${d.anomalies
              .map(
                (a) =>
                  `<div class="cn-anomaly-row"><strong>${esc(a.name)}</strong>${pct(a.change)}${riskTag(a.risk)}</div>`
              )
              .join("")}
          </div>
        </section>
        <section class="cn-panel">
          <h3 class="cn-panel-title">机会 / 风险热点</h3>
          <div class="cn-hotspots">
            ${HOTSPOTS.map(
              (h) =>
                `<button class="cn-hotspot-row cn-hotspot-row--${h.type}" data-hot="${esc(
                  h.province
                )}" type="button"><i></i><span><b>${esc(h.title)}</b>${esc(h.province)} · ${esc(h.note)}</span></button>`
            ).join("")}
          </div>
        </section>
      </aside>
    </div>

    <div class="cn-grid-2">
      ${panel("主要出口商品", bars(d.topExports, "var(--cn-red)"))}
      ${panel("主要进口商品", bars(d.topImports, "var(--cn-gold)"))}
      ${panel("主要出口市场(占比)", bars(d.exportMarkets, "var(--cn-red)"))}
      ${panel("主要进口来源", bars(d.importSources, "var(--cn-gold)"))}
    </div>`;
  }

  function viewProducts() {
    const keys = Object.keys(PRODUCTS);
    const p = liveData.products[state.product] || PRODUCTS[state.product];
    return `
    ${viewHead("商品机会雷达", "输入商品或 HS 编码，定位中国出口机会与准入风险")}
    ${sourceBadge(liveData.products[state.product], "出口规模/目的国/增长为实时；竞争国与准入风险为定性参考")}
    <div class="cn-selector" role="tablist">
      ${keys
        .map(
          (k) =>
            `<button class="cn-pill ${k === state.product ? "active" : ""}" data-product="${esc(k)}">${esc(k)}</button>`
        )
        .join("")}
    </div>
    <div class="cn-result">
      <div class="cn-result-head">
        <div>
          <span class="cn-result-tag">商品 · HS ${esc(p.hs)}</span>
          <h3>${esc(state.product)}</h3>
        </div>
        ${ring(p.score)}
      </div>
      <div class="cn-result-grid">
        ${field("中国出口规模", `${esc(p.scale)} · 同比 ${pct(p.yoy)}`)}
        ${field("主要出口目的国", tagList(p.dest))}
        ${field("增长最快市场", tagList(p.fastest))}
        ${field("主要竞争国家", tagList(p.rivals))}
        ${field("关税与准入风险", `${riskTag(p.barrierLevel)}<p class="cn-note">${esc(p.barrier)}</p>`)}
      </div>
    </div>`;
  }

  function viewMarkets() {
    const keys = Object.keys(MARKETS);
    const m = liveData.markets[state.market] || MARKETS[state.market];
    return `
    ${viewHead("出口市场雷达", "选择目标国家，评估中国企业进入机会与政策风险")}
    ${sourceBadge(liveData.markets[state.market], "进口商品/增长/份额为实时；准入风险为定性参考")}
    <div class="cn-selector" role="tablist">
      ${keys
        .map(
          (k) =>
            `<button class="cn-pill ${k === state.market ? "active" : ""}" data-market="${esc(k)}">${esc(k)}</button>`
        )
        .join("")}
    </div>
    <div class="cn-result">
      <div class="cn-result-head">
        <div>
          <span class="cn-result-tag">出口市场 · ${esc(m.region)}</span>
          <h3>${esc(state.market)}</h3>
        </div>
        ${ring(m.score)}
      </div>
      <div class="cn-result-grid">
        ${field("从中国进口最多的商品", tagList(m.topFromCN))}
        ${field("增长最快商品", tagList(m.fastest))}
        ${field(
          "中国对该国出口额",
          `<strong class="cn-bignum">${esc(m.exportText || "—")}</strong><p class="cn-note">中国市场份额约 ${esc(
            m.shareText || (m.share != null ? m.share + "%" : "—")
          )}（参考）</p>`
        )}
        ${field("适合中国企业进入的细分品类", tagList(m.niches))}
        ${field("关税与政策风险", `${riskTag(m.barrierLevel)}<p class="cn-note">${esc(m.barrier)}</p>`)}
      </div>
    </div>
    ${riskSection()}`;
  }

  // 信保国别风险评级区块（data/sinosure-risk.json 配置后显示）
  function riskSection() {
    const data = liveData.countryRisk;
    if (!data || !data.configured) return "";
    return `
    <h3 class="cn-section-sub">国别风险评级（${esc(data.edition || "最新版")}）</h3>
    <div class="cn-source cn-source--live"><i></i>数据来源：${esc(data.source)} · 评级 ${esc(data.scale)}</div>
    <div class="cn-map-metrics">
      ${data.countries
        .slice(0, 12)
        .map(
          (c) =>
            `<div class="cn-mini-kpi"><span>${esc(c.name)}${c.trend && c.trend !== "稳定" ? " · " + esc(c.trend) : ""}</span><strong>${esc(String(c.rating))} 级</strong><small>${esc(c.note || (c.rating <= 3 ? "风险较低" : c.rating <= 6 ? "风险中等" : "风险较高"))}</small></div>`
        )
        .join("")}
    </div>`;
  }

  function viewImport() {
    const items = liveData.dependency || DEPENDENCY;
    const depLive = (liveData.dependency || []).find((d) => d.live);
    return `
    ${viewHead("进口依赖雷达", "中国关键进口依赖商品、来源集中度与国产替代机会")}
    ${sourceBadge(depLive ? { period: depLive.period } : null, "进口额/来源国/集中度为实时；替代难度与中断风险为定性参考")}
    <div class="cn-dep">
      ${items.map(
        (it) => `
        <article class="cn-dep-card">
          <div class="cn-dep-head">
            <h3>${esc(it.name)}</h3>
            ${riskTag(it.risk)}
          </div>
          <div class="cn-dep-grid">
            ${field("进口金额(年化)", `<strong>${esc(it.amount)}</strong>`)}
            ${field("主要来源国", tagList(it.sources))}
            ${field("来源国集中度", esc(it.concentration))}
            ${field("替代难度", riskTag(it.difficulty))}
          </div>
          <div class="cn-dep-foot">
            <span>国产替代机会</span>
            <p>${esc(it.domestic)}</p>
          </div>
        </article>`
      ).join("")}
    </div>`;
  }

  function viewRegions() {
    const lr = liveData.regions;
    const top = lr ? lr.list[0] : [...REGIONS.list].sort((a, b) => b.heat - a.heat)[0];
    const cr5 = lr ? Math.round(lr.list.slice(0, 5).reduce((s, p) => s + p.share, 0)) : null;
    return `
    ${viewHead("省市产业雷达", "各省出口规模、产业优势与机会 · 交互式中国地图")}
    ${sourceBadge(lr ? { source: lr.source, period: lr.period } : null, "出口额为海关口径；产业优势/机会为分析观点")}
    <div class="cn-map-metrics">
      ${metric("出口第一大省", top.name, lr ? top.exportText : "热度 " + top.heat)}
      ${metric("前五省合计占比", cr5 != null ? cr5 + "%" : "—", "出口集中度 CR5")}
      ${metric("覆盖省市", (lr ? lr.list.length : 31) + " 个", "全口径省级出口")}
      ${metric("数据口径", lr ? "海关 · 2024" : "省级热力", "点击省份查看详情")}
    </div>
    <div class="cn-region-wrap">
      <div class="cn-map-stage">
        <div id="cn-map" aria-label="中国省市产业热力地图"></div>
        <div class="cn-map-legend">
          <span class="cn-legend-title">出口热度</span>
          <span><i style="background:#e5564a"></i>高</span>
          <span><i style="background:#f3934b"></i>较高</span>
          <span><i style="background:#f3b44b"></i>中</span>
          <span><i style="background:#2a3233"></i>低 / 暂无</span>
        </div>
        <div class="cn-map-focus" id="cn-map-focus" hidden></div>
      </div>
      <aside class="cn-region-detail" id="cn-region-detail">${regionDetailHtml(state.region)}</aside>
    </div>`;
  }

  function regionTradeBlock(name) {
    const rg = liveData.regions && liveData.regions.byName[name];
    if (!rg) return "";
    return `<div class="cn-region-trade">
      <span>出口额 · ${esc(liveData.regions.period)}</span>
      <strong>${esc(rg.exportText)}</strong>
      <small>全国第 ${rg.rank} 位 · 占全国 ${rg.share}%</small>
    </div>`;
  }
  function regionDetailHtml(name) {
    const head = regionTradeBlock(name);
    const d = REGIONS.detail[name];
    if (d) return head + renderChongqing(d);
    const p = REGIONS.list.find((x) => x.name === name);
    if (p) {
      return (
        head +
        `
        <span class="cn-result-tag">省市产业</span>
        <h3>${esc(p.name)}</h3>
        <div class="cn-field"><span>优势产业</span>${tagList(p.adv)}</div>
        <div class="cn-field"><span>产业机会</span><p class="cn-note">${esc(p.opp)}</p></div>
        <div class="cn-field"><span>主要风险</span><p class="cn-note">${esc(p.risk)}</p></div>
        <p class="cn-hint">出口额为海关口径真实数据；产业优势/机会/风险为分析观点。</p>`
      );
    }
    return (
      head +
      `
      <span class="cn-result-tag">省市产业</span>
      <h3>${esc(name)}</h3>
      <p class="cn-hint">出口额为海关口径真实数据。该省份产业专题样板建设中，重点样板见「重庆」。</p>`
    );
  }

  function renderChongqing(d) {
    return `
      <div class="cn-result-head">
        <div><span class="cn-result-tag">省市样板</span><h3>${esc(d.title)}</h3></div>
        ${ring(d.score, "产业活力")}
      </div>
      <p class="cn-note">${esc(d.intro)}</p>
      <div class="cn-pillars">
        ${d.pillars.map((p) => `<div class="cn-pillar"><strong>${esc(p.k)}</strong><span>${esc(p.d)}</span></div>`).join("")}
      </div>
      <div class="cn-field"><span>出口结构</span>${bars(d.export, "var(--cn-red)")}</div>
      <div class="cn-region-cols">
        <div class="cn-field"><span>产业机会</span>${tagList(d.opp)}</div>
        <div class="cn-field"><span>主要风险</span>${tagList(d.risk)}</div>
      </div>`;
  }

  function metric(label, val, note) {
    return `<div class="cn-metric"><span>${esc(label)}</span><strong>${esc(val)}</strong><small>${esc(note)}</small></div>`;
  }

  // -------- 中国地图：着色 / 选择 / 焦点 --------
  function shortName(full) {
    return full.replace(/(维吾尔自治区|壮族自治区|回族自治区|特别行政区|自治区|省|市)$/, "");
  }
  function heatFor(full) {
    const sn = shortName(full);
    if (liveData.regions && liveData.regions.byName[sn]) return liveData.regions.byName[sn].heat;
    const p = REGIONS.list.find((x) => x.name === sn);
    return p ? p.heat : null;
  }
  function heatColor(h) {
    if (h == null) return "#2a3233";
    if (h >= 90) return "#e5564a";
    if (h >= 80) return "#ef7a5f";
    if (h >= 70) return "#f3934b";
    if (h >= 55) return "#f3b44b";
    return "#6b5a3a";
  }
  function geoStyle(feature) {
    const h = heatFor(feature.properties.name);
    return { color: "#0b0e0f", weight: 1, fillColor: heatColor(h), fillOpacity: h == null ? 0.32 : 0.82 };
  }
  function showFocus(name, heat) {
    const el = document.getElementById("cn-map-focus");
    if (!el) return;
    const p = REGIONS.list.find((x) => x.name === name);
    const rg = liveData.regions && liveData.regions.byName[name];
    const sub = rg
      ? `<span>出口 ${esc(rg.exportText)} · 全国第 ${rg.rank}</span>`
      : heat == null
      ? `<span>暂无数据</span>`
      : `<span>出口热度 ${heat}</span>`;
    el.hidden = false;
    el.innerHTML =
      `<strong>${esc(name)}</strong>` + sub + (p ? `<div class="cn-focus-tags">${p.adv.map((a) => `<b>${esc(a)}</b>`).join("")}</div>` : "");
  }
  function selectProvince(layer, full) {
    const sn = shortName(full);
    if (cnSelected && cnSelected !== layer && cnGeoLayer) cnGeoLayer.resetStyle(cnSelected);
    cnSelected = layer;
    layer.setStyle({ weight: 2.5, color: "#fff" });
    layer.bringToFront();
    state.region = REGIONS.list.find((p) => p.name === sn) ? sn : full;
    const detail = document.getElementById("cn-region-detail");
    if (detail) detail.innerHTML = regionDetailHtml(state.region);
    showFocus(sn, heatFor(full));
  }
  function onEachProvince(feature, layer) {
    layer.on({
      mouseover: () => {
        layer.setStyle({ weight: 2, color: "#fff" });
        layer.bringToFront();
        showFocus(shortName(feature.properties.name), heatFor(feature.properties.name));
      },
      mouseout: () => {
        if (layer !== cnSelected && cnGeoLayer) cnGeoLayer.resetStyle(layer);
      },
      click: () => selectProvince(layer, feature.properties.name),
    });
  }
  function destroyMap() {
    if (cnMap) {
      cnMap.remove();
      cnMap = null;
      cnGeoLayer = null;
      cnSelected = null;
    }
  }
  function renderHeatFallback() {
    const stage = document.querySelector(".cn-map-stage");
    if (!stage) return;
    const maxHeat = Math.max(...REGIONS.list.map((p) => p.heat));
    stage.innerHTML = `<div class="cn-heatgrid">${REGIONS.list
      .map((p) => {
        const op = (0.2 + (p.heat / maxHeat) * 0.8).toFixed(2);
        return `<button class="cn-province ${p.name === state.region ? "active" : ""}" data-region="${esc(
          p.name
        )}" style="--heat:${op}"><strong>${esc(p.name)}</strong><span>出口热度 ${p.heat}</span></button>`;
      })
      .join("")}</div>`;
  }
  function selectByName(sn) {
    if (!cnGeoLayer) return;
    cnGeoLayer.eachLayer((layer) => {
      if (shortName(layer.feature.properties.name) === sn) {
        selectProvince(layer, layer.feature.properties.name);
        const c = layer.feature.properties.centroid || layer.feature.properties.center;
        if (c && cnMap) cnMap.panTo([c[1], c[0]], { animate: true });
      }
    });
  }

  function addLabelsAndMarkers(geo) {
    // 省份常驻名称标签
    cnGeoLayer.eachLayer((layer) => {
      const sn = shortName(layer.feature.properties.name);
      const isKey = REGIONS.list.some((p) => p.name === sn);
      layer.bindTooltip(sn, {
        permanent: true,
        direction: "center",
        className: "cn-prov-label" + (isKey ? " cn-prov-label--key" : ""),
      });
    });
    // 机会 / 风险热点 markers（按省质心定位）
    HOTSPOTS.forEach((h) => {
      const feat = geo.features.find((f) => shortName(f.properties.name) === h.province);
      const c = feat && (feat.properties.centroid || feat.properties.center);
      if (!c) return;
      const icon = L.divIcon({ className: "cn-marker cn-marker--" + h.type, html: "<i></i>", iconSize: [12, 12] });
      const marker = L.marker([c[1], c[0]], { icon }).addTo(cnMap);
      marker.bindTooltip(`<b>${esc(h.title)}</b><span>${esc(h.province)} · ${esc(h.note)}</span>`, {
        className: "cn-marker-tip",
        direction: "top",
        offset: [0, -6],
      });
      marker.on("click", () => selectByName(h.province));
    });
  }

  function mountChinaMap() {
    const mapEl = document.getElementById("cn-map");
    if (!mapEl || typeof L === "undefined") return renderHeatFallback();
    cnMap = L.map(mapEl, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
      minZoom: 2,
      maxZoom: 7,
    });
    cnMap.attributionControl.setPrefix("");
    const draw = (geo) => {
      if (!cnMap) return;
      cnGeoLayer = L.geoJSON(geo, { style: geoStyle, onEachFeature: onEachProvince }).addTo(cnMap);
      cnMap.fitBounds(cnGeoLayer.getBounds(), { padding: [12, 12] });
      cnMap.attributionControl.addAttribution("省界 © DataV.GeoAtlas");
      addLabelsAndMarkers(geo);
      // 预选当前省份
      cnGeoLayer.eachLayer((layer) => {
        if (shortName(layer.feature.properties.name) === state.region) selectProvince(layer, layer.feature.properties.name);
      });
      window.setTimeout(() => cnMap && cnMap.invalidateSize(), 80);
    };
    if (cnGeoCache) {
      draw(cnGeoCache);
    } else {
      fetch(GEO_URL)
        .then((r) => r.json())
        .then((geo) => {
          cnGeoCache = geo;
          draw(geo);
        })
        .catch(() => {
          destroyMap();
          renderHeatFallback();
        });
    }
  }

  function viewPolicy() {
    return liveData.policy ? viewPolicyLive(liveData.policy) : viewPolicyDemo();
  }
  function viewPolicyLive(p) {
    const s = p.summary;
    const m0 = (arr) => (arr[0] ? arr[0].label : "—");
    const n0 = (arr) => (arr[0] ? arr[0].note : "");
    return `
    ${viewHead("政策与合规雷达", "中国遭遇的反倾销 / 反补贴贸易救济调查 · 实时案件")}
    ${sourceBadge({ source: p.source, period: "2020 年至今" }, "WTO 成员通报的对华贸易救济调查")}
    <div class="cn-map-metrics">
      ${metric("对华救济案件(累计)", s.total + " 起", "反倾销 " + s.ad + " · 反补贴 " + s.cv)}
      ${metric("近两年新增", s.recent + " 起", s.recentCut + " 年起")}
      ${metric("主要发起方", m0(s.topInitiators), n0(s.topInitiators))}
      ${metric("主要涉案行业", m0(s.topSectors), n0(s.topSectors))}
    </div>
    <div class="cn-grid-2">
      ${panel("主要发起方（对华）", bars(s.topInitiators, "var(--cn-red)"))}
      ${panel("主要涉案行业", bars(s.topSectors, "var(--cn-gold)"))}
    </div>
    <h3 class="cn-section-sub">近期对华贸易救济案件</h3>
    <div class="cn-policy">
      ${p.cases
        .map(
          (c) => `
        <article class="cn-policy-card cn-policy--${c.type === "反倾销" ? "high" : "mid"}">
          <header>
            <span class="cn-policy-type">${esc(c.type)}</span>
            <span class="cn-risk cn-risk--${c.type === "反倾销" ? "high" : "mid"}">${esc(c.date)}</span>
          </header>
          <h3>${esc(c.product)}</h3>
          <div class="cn-policy-meta">
            <div><span>发起方</span><b>${esc(c.reporter)}</b></div>
            <div><span>涉案行业</span><b>${esc(c.sector)}</b></div>
            <div><span>当前状态</span><b>${esc(c.status)}</b></div>
          </div>
        </article>`
        )
        .join("")}
    </div>
    ${mofcomSection()}`;
  }
  function viewPolicyDemo() {
    return `
    ${viewHead("政策与合规雷达", "反倾销、反补贴、关税、出口管制、337调查与绿色壁垒")}
    ${sourceBadge(null)}
    <div class="cn-policy">
      ${POLICY.map(
        (e) => `
        <article class="cn-policy-card cn-policy--${riskKey(e.level)}">
          <header>
            <span class="cn-policy-type">${esc(e.type)}</span>
            ${riskTag(e.level)}
          </header>
          <h3>${esc(e.title)}</h3>
          <div class="cn-policy-meta">
            <div><span>影响商品</span><b>${esc(e.goods)}</b></div>
            <div><span>影响行业</span><b>${esc(e.sectors)}</b></div>
            <div><span>影响省份</span><b>${esc(e.provinces)}</b></div>
          </div>
          <div class="cn-field"><span>影响路径</span>${chainFlow(e.chain)}</div>
          <div class="cn-field"><span>建议观察点</span>${tagList(e.watch)}</div>
        </article>`
      ).join("")}
    </div>
    ${mofcomSection()}`;
  }

  function viewReports() {
    const keys = Object.keys(REPORTS);
    const live = liveData.report;
    const r = live ? live.data : REPORTS[state.report];
    const title = live ? live.query : state.report;
    const badge = live
      ? `<div class="cn-source cn-source--live"><i></i>Claude ${esc(live.model)} 实时生成 · 基于 UN Comtrade / WTO 真实数据</div>`
      : `<div class="cn-source"><i></i>示例报告 · 在上方输入框输入商品/国家/省份/政策事件，由 AI 基于真实数据生成</div>`;
    const reportBody = liveData.reportLoading
      ? `<div class="cn-report-loading"><i></i>AI 正在综合真实贸易与政策数据生成简报…（约 10–20 秒）</div>`
      : `<article class="cn-report">
      <div class="cn-report-head">
        <span class="cn-result-tag">${live ? "AI 实时简报" : "示例简报"}</span>
        <h3>${esc(title)}</h3>
      </div>
      ${reportBlock("核心结论", `<p>${esc(r.conclusion)}</p>`)}
      <div class="cn-grid-2">
        ${reportBlock("贸易数据概览", list(r.data))}
        ${reportBlock("主要市场", tagList(r.markets))}
        ${reportBlock("机会商品", tagList(r.oppGoods))}
        ${reportBlock("风险因素", list(r.risks), "loss")}
        ${reportBlock("政策合规", list(r.compliance))}
        ${reportBlock("建议跟进方向", list(r.next), "win")}
      </div>
      ${reportBlock("未来观察点", tagList(r.future), "watch")}
    </article>`;
    return `
    ${viewHead("AI 贸易产业简报", "输入商品、国家、省份或政策事件，由 AI 基于真实数据生成结构化报告")}
    <form class="cn-report-input" id="cn-report-form">
      <input id="cn-report-q" type="text" autocomplete="off" value="${esc(live ? live.query : "")}" placeholder="例如：摩托车零配件 / 印度尼西亚 / 欧盟电动车关税…" />
      <button type="submit" class="cn-btn cn-btn--primary"${liveData.reportLoading ? " disabled" : ""}>${liveData.reportLoading ? "生成中…" : "生成简报"}</button>
    </form>
    <div class="cn-selector">
      ${keys
        .map(
          (k) => `<button class="cn-pill ${!live && k === state.report ? "active" : ""}" data-report="${esc(k)}">${esc(k)}</button>`
        )
        .join("")}
    </div>
    ${badge}
    ${liveData.reportError ? `<div class="cn-report-error">生成失败：${esc(liveData.reportError)}（下方为示例，可重试）</div>` : ""}
    ${reportBody}`;
  }

  // ----------------------- 小组件 -----------------------
  function viewHead(title, sub) {
    return `<div class="cn-view-head"><h2>${esc(title)}</h2><p>${esc(sub)}</p></div>`;
  }
  function panel(title, body) {
    return `<section class="cn-panel"><h3 class="cn-panel-title">${esc(title)}</h3>${body}</section>`;
  }
  function field(label, body) {
    return `<div class="cn-field"><span>${esc(label)}</span>${body}</div>`;
  }
  function list(arr) {
    return `<ul class="cn-list">${arr.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  }
  function reportBlock(title, body, tone) {
    return `<div class="cn-report-block ${tone ? "cn-report-block--" + tone : ""}"><h4>${esc(title)}</h4>${body}</div>`;
  }
  function riskKey(level) {
    return { 高: "high", 较高: "high", 中: "mid", 低: "low" }[level] || "mid";
  }

  // ----------------------- 真实数据接入（UN Comtrade）-----------------------
  const liveData = {
    overview: null,
    overviewLoading: false,
    overviewFailed: false,
    products: {},
    productLoading: {},
    productFailed: {},
    markets: {},
    marketLoading: {},
    marketFailed: {},
    dependency: null,
    dependencyLoading: false,
    dependencyFailed: false,
    policy: null,
    policyLoading: false,
    policyFailed: false,
    regions: null,
    regionsLoading: false,
    regionsFailed: false,
    report: null,
    reportLoading: false,
    reportError: null,
  };

  function adaptOverview(o) {
    const m = (arr) => (arr || []).map((x) => ({ label: x.label, value: x.value, note: x.valueText }));
    return {
      live: true,
      period: o.period,
      source: o.source,
      updatedAt: o.updatedAt,
      totals: o.totals,
      trend: (o.trend || []).map((t) => t.value),
      topExports: m(o.topExports),
      topImports: m(o.topImports),
      exportMarkets: m(o.exportMarkets),
      importSources: m(o.importSources),
      anomalies: DASHBOARD.anomalies, // 异常波动暂为参考演示
    };
  }
  function adaptProduct(api, name) {
    const preset = PRODUCTS[name] || {};
    return {
      live: true,
      period: api.period,
      hs: api.hs,
      desc: api.desc,
      scale: api.scale,
      yoy: api.yoy,
      score: api.score,
      dest: (api.dest || []).map((d) => `${d.name}（${d.valueText}）`),
      fastest: api.fastest && api.fastest.length ? api.fastest : preset.fastest || [],
      rivals: preset.rivals || [],
      barrier: preset.barrier || "需结合目标国关税、认证与准入政策综合评估。",
      barrierLevel: preset.barrierLevel || "中",
    };
  }
  function ensureOverview() {
    if (liveData.overview || liveData.overviewLoading || liveData.overviewFailed) return;
    liveData.overviewLoading = true;
    fetch("/api/china/overview")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((o) => {
        liveData.overview = adaptOverview(o);
      })
      .catch(() => {
        liveData.overviewFailed = true;
      })
      .finally(() => {
        liveData.overviewLoading = false;
        if (state.view === "dashboard") render();
      });
  }
  function ensureProduct(name) {
    const preset = PRODUCTS[name];
    if (!preset || liveData.products[name] || liveData.productLoading[name] || liveData.productFailed[name]) return;
    liveData.productLoading[name] = true;
    fetch("/api/china/product?hs=" + encodeURIComponent(preset.hs))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((api) => {
        liveData.products[name] = adaptProduct(api, name);
      })
      .catch(() => {
        liveData.productFailed[name] = true;
      })
      .finally(() => {
        liveData.productLoading[name] = false;
        if (state.view === "products" && state.product === name) render();
      });
  }
  function adaptMarket(api, name) {
    const preset = MARKETS[name] || {};
    return {
      live: true,
      period: api.period,
      region: preset.region || "",
      exportText: api.totalToCountry || "—",
      shareText: preset.share != null ? preset.share + "%" : "—",
      topFromCN: api.topFromCN && api.topFromCN.length ? api.topFromCN : preset.topFromCN || [],
      fastest: api.fastest && api.fastest.length ? api.fastest : preset.fastest || [],
      niches: api.niches && api.niches.length ? api.niches : preset.niches || [],
      barrier: preset.barrier || "需结合目标国关税、本地化与准入政策综合评估。",
      barrierLevel: preset.barrierLevel || "中",
      score: api.score,
    };
  }
  function adaptDependency(api) {
    const items = api.items || [];
    return DEPENDENCY.map((preset) => {
      const live = items.find((i) => i.hs === preset.hs);
      if (!live) return preset;
      return {
        live: true,
        hs: preset.hs,
        name: preset.name,
        amount: live.amount,
        sources: live.sources && live.sources.length ? live.sources : preset.sources,
        concentration: live.concentration,
        difficulty: preset.difficulty,
        domestic: preset.domestic,
        risk: preset.risk,
        period: live.period,
      };
    });
  }
  function ensureMarket(name) {
    const preset = MARKETS[name];
    if (!preset || !preset.code || liveData.markets[name] || liveData.marketLoading[name] || liveData.marketFailed[name]) return;
    liveData.marketLoading[name] = true;
    fetch("/api/china/market?partner=" + preset.code)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((api) => {
        liveData.markets[name] = adaptMarket(api, name);
      })
      .catch(() => {
        liveData.marketFailed[name] = true;
      })
      .finally(() => {
        liveData.marketLoading[name] = false;
        if (state.view === "markets" && state.market === name) render();
      });
  }
  function ensureDependency() {
    if (liveData.dependency || liveData.dependencyLoading || liveData.dependencyFailed) return;
    liveData.dependencyLoading = true;
    const hs = DEPENDENCY.map((d) => d.hs).filter(Boolean).join(",");
    fetch("/api/china/dependency?hs=" + encodeURIComponent(hs))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((api) => {
        liveData.dependency = adaptDependency(api);
      })
      .catch(() => {
        liveData.dependencyFailed = true;
      })
      .finally(() => {
        liveData.dependencyLoading = false;
        if (state.view === "import") render();
      });
  }
  function generateReport(q) {
    liveData.reportLoading = true;
    liveData.reportError = null;
    render();
    fetch("/api/china/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ query: q }),
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "生成失败");
        return d;
      })
      .then((d) => {
        liveData.report = { query: d.query || q, data: d.report, model: d.model || "Sonnet 4.6" };
      })
      .catch((err) => {
        liveData.reportError = err.message;
      })
      .finally(() => {
        liveData.reportLoading = false;
        if (state.view === "reports") render();
      });
  }
  function ensureRegions() {
    if (liveData.regions || liveData.regionsLoading || liveData.regionsFailed) return;
    liveData.regionsLoading = true;
    fetch("/api/china/regions")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const byName = {};
        (d.provinces || []).forEach((p) => (byName[p.name] = p));
        liveData.regions = { source: d.source, period: d.period, list: d.provinces || [], byName };
      })
      .catch(() => {
        liveData.regionsFailed = true;
      })
      .finally(() => {
        liveData.regionsLoading = false;
        if (state.view === "regions") render();
      });
  }
  function ensurePolicy() {
    ensureMofcom();
    if (liveData.policy || liveData.policyLoading || liveData.policyFailed) return;
    liveData.policyLoading = true;
    fetch("/api/china/trade-remedies")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        liveData.policy = d;
      })
      .catch(() => {
        liveData.policyFailed = true;
      })
      .finally(() => {
        liveData.policyLoading = false;
        if (state.view === "policy") render();
      });
  }
  // 海关总署月度数据区块（data/customs-monthly.json 配置后显示在总览顶部）
  function customsSection() {
    const data = liveData.customs;
    if (!data || !data.configured) return "";
    return `
    <div class="cn-map-metrics">
      ${data.entries
        .slice(0, 4)
        .map(
          (e) =>
            `<div class="cn-mini-kpi"><span>${esc(e.period)} 出口</span><strong>${esc(String(e.exports))} ${esc(data.unit)}</strong><small>同比 ${esc(e.exportsYoy || "—")} · 进口 ${esc(String(e.imports))}（${esc(e.importsYoy || "—")}）</small></div>`
        )
        .join("")}
    </div>
    <div class="cn-source cn-source--live"><i></i>数据来源：${esc(data.source)}${data.updatedAt ? " · 更新于 " + esc(data.updatedAt) : ""}</div>`;
  }
  function ensureCustoms() {
    if (liveData.customs || liveData.customsLoading) return;
    liveData.customsLoading = true;
    fetch("/api/china/customs-monthly")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        liveData.customs = d;
        if (d.configured && state.view === "dashboard") render();
      })
      .catch(() => {})
      .finally(() => {
        liveData.customsLoading = false;
      });
  }
  function ensureCountryRisk() {
    if (liveData.countryRisk || liveData.countryRiskLoading) return;
    liveData.countryRiskLoading = true;
    fetch("/api/china/country-risk")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        liveData.countryRisk = d;
        if (d.configured && state.view === "markets") render();
      })
      .catch(() => {})
      .finally(() => {
        liveData.countryRiskLoading = false;
      });
  }
  function ensureFreight() {
    if (liveData.freight || liveData.freightLoading || liveData.freightFailed) return;
    liveData.freightLoading = true;
    fetch("/api/china/freight")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        liveData.freight = d;
      })
      .catch(() => {
        liveData.freightFailed = true;
      })
      .finally(() => {
        liveData.freightLoading = false;
        if (state.view === "freight") render();
      });
  }
  function viewFreight() {
    const d = liveData.freight;
    if (!d) {
      const msg = liveData.freightFailed ? "运价数据暂不可用，请稍后再试" : "正在接入上海航运交易所运价数据…";
      return `${viewHead("运价与航线雷达", "海运集装箱运价指数、分航线成本与异动预警")}<div class="cn-report-loading"><i></i>${msg}</div>`;
    }
    const c = d.composite || {};
    const up = (c.change || 0) > 0;
    const dir = c.change > 0 ? "▲" : c.change < 0 ? "▼" : "—";
    return `
    ${viewHead("运价与航线雷达", "海运集装箱运价指数、分航线成本与异动预警")}
    ${sourceBadge({ source: d.source, period: c.date }, "综合指数实时抓取，分航线按周更新")}
    <div class="cn-map-metrics">
      ${metric("SCFI 综合指数", c.current != null ? String(c.current) : "—", c.date ? c.date + " 发布" : "")}
      ${metric("环比涨跌", `${dir} ${c.change != null ? Math.abs(c.change) : "—"}`, c.changePct != null ? (up ? "+" : "") + c.changePct + "%" : "")}
      ${metric("上期指数", c.previous != null ? String(c.previous) : "—", "上一发布周期")}
      ${metric("运价方向", up ? "上行" : c.change < 0 ? "下行" : "持平", up ? "出口成本上升，关注订舱时机" : c.change < 0 ? "出口成本回落" : "暂稳")}
    </div>
    ${
      d.routes && d.routes.length
        ? `<h3 class="cn-section-sub">分航线运价（${esc(d.routesUpdatedAt || "最新")}）</h3>
    <div class="cn-map-metrics">
      ${d.routes
        .slice(0, 12)
        .map((r) => {
          const rUp = (r.changePct || 0) > 0;
          return `<div class="cn-mini-kpi"><span>${esc(r.route)}${r.unit ? " · " + esc(r.unit) : ""}</span><strong>${esc(String(r.rate))}</strong><small style="color:${rUp ? "var(--cn-red)" : "var(--cn-teal,#4cd9b0)"}">${rUp ? "+" : ""}${esc(String(r.changePct))}% ${r.note ? "· " + esc(r.note) : ""}</small></div>`;
        })
        .join("")}
    </div>`
        : `<div class="cn-source"><i></i>分航线运价待运营者按周更新（见 data/README.md）</div>`
    }`;
  }
  function ensureMofcom() {
    if (liveData.mofcom || liveData.mofcomLoading || liveData.mofcomFailed) return;
    liveData.mofcomLoading = true;
    fetch("/api/china/mofcom")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        liveData.mofcom = d;
      })
      .catch(() => {
        liveData.mofcomFailed = true;
      })
      .finally(() => {
        liveData.mofcomLoading = false;
        if (state.view === "policy") render();
      });
  }
  // 商务部公告区块（接在政策视图底部）
  function mofcomSection() {
    const data = liveData.mofcom;
    if (!data || !data.announcements || !data.announcements.length) return "";
    return `
    <h3 class="cn-section-sub">商务部贸易救济公告（中国发起 · 官方原文）</h3>
    <div class="cn-source cn-source--live"><i></i>数据来源：${esc(data.source)}</div>
    <div class="cn-policy">
      ${data.announcements
        .slice(0, 10)
        .map(
          (item) => `
        <article class="cn-policy-card cn-policy--${item.type.includes("反倾销") ? "high" : "mid"}">
          <header>
            <span class="cn-policy-type">${esc(item.type)}</span>
            <span class="cn-risk cn-risk--mid">${esc(item.date)}</span>
          </header>
          <h3><a href="${esc(item.url)}" target="_blank" rel="noopener" style="color:inherit">${esc(item.title)}</a></h3>
        </article>`
        )
        .join("")}
    </div>`;
  }
  function sourceBadge(live, note) {
    if (live && (live.period != null || live.source)) {
      const src = live.source || "UN Comtrade";
      const per = live.period != null ? " · " + live.period + (typeof live.period === "number" ? " 年度" : "") : "";
      return `<div class="cn-source cn-source--live"><i></i>数据来源：${esc(src)}${per}${note ? " · " + esc(note) : ""}</div>`;
    }
    return `<div class="cn-source"><i></i>正在接入实时数据…（暂显示示例值，稍候自动刷新）</div>`;
  }

  // ----------------------- 路由 + 渲染 -----------------------
  const RENDERERS = {
    home: viewHome,
    dashboard: viewDashboard,
    products: viewProducts,
    markets: viewMarkets,
    import: viewImport,
    regions: viewRegions,
    policy: viewPolicy,
    freight: viewFreight,
    reports: viewReports,
  };

  function render() {
    destroyMap();
    const fn = RENDERERS[state.view] || viewHome;
    main.innerHTML = fn();
    window.scrollTo(0, 0);
    updateNav();
    bindViewEvents();
    if (state.view === "regions") ensureRegions();
    if (state.view === "regions" || state.view === "dashboard") mountChinaMap();
    if (state.view === "dashboard") ensureOverview();
    if (state.view === "dashboard") ensureCustoms();
    if (state.view === "products") ensureProduct(state.product);
    if (state.view === "markets") ensureMarket(state.market);
    if (state.view === "markets") ensureCountryRisk();
    if (state.view === "import") ensureDependency();
    if (state.view === "policy") ensurePolicy();
    if (state.view === "freight") ensureFreight();
  }

  function updateNav() {
    nav.querySelectorAll("a[data-nav]").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("data-nav") === state.view);
    });
  }

  function go(view) {
    if (!VIEWS.includes(view)) view = "home";
    if (("#" + view) !== window.location.hash) {
      window.location.hash = view;
    } else {
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

  // 首页搜索的轻量关键词路由
  function routeSearch(query) {
    const q = query.trim();
    if (!q) return;
    const lower = q.toLowerCase();
    for (const k of Object.keys(PRODUCTS)) {
      if (q.includes(k) || lower.includes(PRODUCTS[k].hs)) {
        state.product = k;
        showToast(`已为「${q}」定位商品机会`);
        return go("products");
      }
    }
    for (const k of Object.keys(MARKETS)) {
      if (q.includes(k)) {
        state.market = k;
        showToast(`已为「${q}」定位出口市场`);
        return go("markets");
      }
    }
    for (const p of REGIONS.list) {
      if (q.includes(p.name)) {
        state.region = p.name;
        showToast(`已为「${q}」定位省市产业`);
        return go("regions");
      }
    }
    if (/依赖|进口|芯片|减速器|机床|光刻/.test(q)) return go("import");
    if (/政策|关税|管制|反倾销|反补贴|壁垒|摩擦/.test(q)) return go("policy");
    showToast(`正在为「${q}」检索中国贸易数据…`);
    go("dashboard");
  }

  // 视图内事件（每次渲染后绑定到当前 main 内的元素）
  function bindViewEvents() {
    const searchForm = document.getElementById("cn-search");
    if (searchForm) {
      searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        routeSearch(document.getElementById("cn-search-input").value);
      });
    }
    const reportForm = document.getElementById("cn-report-form");
    if (reportForm) {
      reportForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = document.getElementById("cn-report-q").value.trim();
        if (!q || liveData.reportLoading) return;
        generateReport(q);
      });
    }
  }

  // 全局委托：导航/选择/跳转
  function bindGlobalEvents() {
    document.addEventListener("click", (e) => {
      // 热点行：仅在地图上选中省份，不重新渲染(保留地图)
      const hot = e.target.closest("[data-hot]");
      if (hot && main.contains(hot)) {
        selectByName(hot.getAttribute("data-hot"));
        return;
      }
      const t = e.target.closest("[data-go],[data-product],[data-market],[data-region],[data-report]");
      if (!t || !main.contains(t)) return;
      if (t.hasAttribute("data-product")) state.product = t.getAttribute("data-product");
      if (t.hasAttribute("data-market")) state.market = t.getAttribute("data-market");
      if (t.hasAttribute("data-region")) state.region = t.getAttribute("data-region");
      if (t.hasAttribute("data-report")) {
        state.report = t.getAttribute("data-report");
        liveData.report = null; // 切回示例
        liveData.reportError = null;
      }
      if (t.hasAttribute("data-go")) {
        return go(t.getAttribute("data-go"));
      }
      // 同视图内的选择切换：重新渲染当前视图
      render();
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
      // 未登录：回到落地页
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
