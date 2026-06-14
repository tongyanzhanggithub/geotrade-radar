// ===========================================================
// 国际产业雷达 · Global Industry Radar
// 顶层分 国内(China) / 国外(Overseas)，内部按产业划分，覆盖全产业分类。
// 每个产业一张中外对比画像 + 中国地位 + 自主可控度（参考模型，运营者可按季更新）。
// position: 领先 | 并跑 | 追赶 | 受制   autonomy: 0(完全受制)—100(完全自主)
// ===========================================================

const SECTORS = [
  { id: "ict", label: "信息技术", en: "ICT" },
  { id: "manufacturing", label: "先进制造", en: "Advanced Manufacturing" },
  { id: "energy-auto", label: "新能源与汽车", en: "New Energy & Auto" },
  { id: "materials", label: "材料与化工", en: "Materials & Chemicals" },
  { id: "health", label: "医药健康", en: "Healthcare" },
  { id: "resources", label: "能源资源", en: "Energy & Resources" },
  { id: "consumer", label: "消费与农业", en: "Consumer & Agriculture" },
  { id: "finance", label: "金融与服务", en: "Finance & Services" },
];

const INDUSTRIES = [
  // —— 信息技术 ICT ——
  { id: "ai", sector: "ict", name: "人工智能 / 大模型", en: "AI & Foundation Models", position: "追赶", autonomy: 55,
    domestic: ["字节豆包", "阿里通义", "DeepSeek", "智谱", "百度文心"], overseas: ["OpenAI", "Anthropic", "Google DeepMind"],
    dynamic: "国产大模型快速追赶，推理成本下降，但高端训练算力受限。", dependency: "训练算力受出口管制" },
  { id: "compute", sector: "ict", name: "算力芯片 / GPU", en: "AI Compute & GPU", position: "受制", autonomy: 25,
    domestic: ["华为昇腾", "寒武纪", "海光"], overseas: ["NVIDIA", "AMD", "Broadcom"],
    dynamic: "先进制程与 CUDA 生态双重受制，国产替代以推理为主。", dependency: "高（先进制程+EDA+管制）" },
  { id: "cloud", sector: "ict", name: "云与数据中心", en: "Cloud & Data Center", position: "并跑", autonomy: 70,
    domestic: ["阿里云", "华为云", "腾讯云"], overseas: ["AWS", "Azure", "Google Cloud"],
    dynamic: "国内份额稳固，出海与高端 AI 基础设施受地缘影响。", dependency: "中（依赖高端芯片）" },
  { id: "software", sector: "ict", name: "工业/基础软件 (EDA·CAD·数据库)", en: "Industrial Software", position: "受制", autonomy: 30,
    domestic: ["华大九天", "达梦", "中望", "华为欧拉"], overseas: ["Synopsys", "Cadence", "Microsoft", "Oracle"],
    dynamic: "EDA/CAD/数据库国产替代加速，但代差与生态壁垒明显。", dependency: "高（EDA 卡点）" },
  { id: "cybersecurity", sector: "ict", name: "网络安全", en: "Cybersecurity", position: "追赶", autonomy: 60,
    domestic: ["奇安信", "深信服", "启明星辰"], overseas: ["CrowdStrike", "Palo Alto", "Fortinet"],
    dynamic: "内需驱动增长，高端威胁情报与云原生安全仍在追赶。", dependency: "中" },
  { id: "telecom", sector: "ict", name: "通信与 5G 设备", en: "Telecom & 5G", position: "领先", autonomy: 85,
    domestic: ["华为", "中兴"], overseas: ["Ericsson", "Nokia", "Qualcomm"],
    dynamic: "5G 设备全球领先，受多国市场准入限制与基带芯片打压。", dependency: "中（高端射频/基带）" },
  { id: "consumer-electronics", sector: "ict", name: "消费电子", en: "Consumer Electronics", position: "并跑", autonomy: 75,
    domestic: ["小米", "OPPO", "vivo", "荣耀"], overseas: ["Apple", "Samsung"],
    dynamic: "出货量全球领先，利润与高端 SoC/影像仍受制。", dependency: "中（高端芯片）" },
  { id: "quantum", sector: "ict", name: "量子科技", en: "Quantum Tech", position: "并跑", autonomy: 65,
    domestic: ["本源量子", "国盾量子"], overseas: ["IBM", "Google", "IonQ"],
    dynamic: "量子通信领先、量子计算并跑，工程化竞速。", dependency: "中" },

  // —— 先进制造 ——
  { id: "semicon-equip", sector: "manufacturing", name: "半导体设备与材料", en: "Semiconductor Equipment & Materials", position: "受制", autonomy: 20,
    domestic: ["北方华创", "中微公司", "华海清科"], overseas: ["ASML", "Applied Materials", "Lam Research", "TEL"],
    dynamic: "光刻机为最大卡点，刻蚀/薄膜部分突破，材料(光刻胶/掩膜)受制。", dependency: "极高（光刻机+特材）" },
  { id: "machine-tools", sector: "manufacturing", name: "工业母机 / 机床", en: "Machine Tools", position: "追赶", autonomy: 45,
    domestic: ["科德数控", "海天精工", "纽威数控"], overseas: ["DMG MORI", "Mazak", "Fanuc"],
    dynamic: "中低端自给，高端五轴与数控系统依赖进口。", dependency: "高（高端数控系统）" },
  { id: "robotics", sector: "manufacturing", name: "机器人与自动化", en: "Robotics & Automation", position: "追赶", autonomy: 50,
    domestic: ["汇川", "埃斯顿", "绿的谐波", "宇树"], overseas: ["Fanuc", "ABB", "KUKA", "安川"],
    dynamic: "本体国产化提升，减速器/伺服/力矩传感器加速突破。", dependency: "中（核心零部件）" },
  { id: "construction-machinery", sector: "manufacturing", name: "工程机械", en: "Construction Machinery", position: "领先", autonomy: 88,
    domestic: ["三一重工", "徐工", "中联重科"], overseas: ["Caterpillar", "Komatsu"],
    dynamic: "全球份额领先，高端液压件持续国产化。", dependency: "低" },
  { id: "aerospace-defense", sector: "manufacturing", name: "航空航天与防务", en: "Aerospace & Defense", position: "追赶", autonomy: 55,
    domestic: ["中国商飞", "航发集团", "航天科技"], overseas: ["Boeing", "Airbus", "Lockheed", "SpaceX"],
    dynamic: "C919 商业化推进，航空发动机与商业航天追赶。", dependency: "高（航发/高端航材）" },

  // —— 新能源与汽车 ——
  { id: "nev", sector: "energy-auto", name: "新能源汽车", en: "New Energy Vehicles", position: "领先", autonomy: 85,
    domestic: ["比亚迪", "理想", "蔚来", "小鹏"], overseas: ["Tesla", "大众", "丰田"],
    dynamic: "整车、智能化与出口全球领先，面临关税与贸易壁垒。", dependency: "低（高端芯片例外）" },
  { id: "battery", sector: "energy-auto", name: "动力电池", en: "Power Battery", position: "领先", autonomy: 90,
    domestic: ["宁德时代", "比亚迪"], overseas: ["LG 新能源", "松下", "三星 SDI"],
    dynamic: "全球份额过半，固态电池与下一代材料竞速。", dependency: "低" },
  { id: "solar", sector: "energy-auto", name: "光伏", en: "Solar PV", position: "领先", autonomy: 92,
    domestic: ["隆基", "通威", "晶科"], overseas: ["First Solar"],
    dynamic: "全产业链主导，面临产能过剩与海外贸易壁垒。", dependency: "低" },
  { id: "wind", sector: "energy-auto", name: "风电", en: "Wind Power", position: "领先", autonomy: 85,
    domestic: ["金风科技", "远景能源", "明阳智能"], overseas: ["Vestas", "GE Vernova", "Siemens Gamesa"],
    dynamic: "整机与海上风电份额提升，主轴轴承等持续国产化。", dependency: "中（主轴承）" },
  { id: "storage", sector: "energy-auto", name: "储能", en: "Energy Storage", position: "领先", autonomy: 85,
    domestic: ["宁德时代", "阳光电源", "比亚迪"], overseas: ["Tesla", "Fluence"],
    dynamic: "电化学储能全球领先，海外大储市场快速拓展。", dependency: "低" },

  // —— 材料与化工 ——
  { id: "rare-earth", sector: "materials", name: "稀土与永磁", en: "Rare Earths & Magnets", position: "领先", autonomy: 90,
    domestic: ["北方稀土", "中国稀土", "金力永磁"], overseas: ["Lynas", "MP Materials"],
    dynamic: "开采冶炼全球主导，出口管制成为战略工具。", dependency: "低（主导方）" },
  { id: "adv-materials", sector: "materials", name: "关键/新材料 (光刻胶·碳纤维·特气)", en: "Advanced Materials", position: "受制", autonomy: 35,
    domestic: ["万华化学", "中复神鹰", "华特气体"], overseas: ["东丽", "信越化学", "JSR"],
    dynamic: "高端光刻胶、碳纤维、电子特气部分受制，加速突破。", dependency: "高（电子级材料）" },
  { id: "chemicals", sector: "materials", name: "基础化工", en: "Basic Chemicals", position: "并跑", autonomy: 70,
    domestic: ["万华化学", "荣盛石化"], overseas: ["BASF", "Dow"],
    dynamic: "大宗化工自给率高，高端聚合物与催化剂追赶。", dependency: "中" },
  { id: "steel-metals", sector: "materials", name: "钢铁与有色", en: "Steel & Base Metals", position: "领先", autonomy: 88,
    domestic: ["中国宝武", "紫金矿业"], overseas: ["ArcelorMittal", "Rio Tinto", "BHP"],
    dynamic: "产能与冶炼全球第一，上游铁矿石进口依赖高。", dependency: "高（铁矿石进口）" },

  // —— 医药健康 ——
  { id: "innovative-drug", sector: "health", name: "创新药", en: "Innovative Drugs", position: "追赶", autonomy: 50,
    domestic: ["恒瑞医药", "百济神州", "信达生物"], overseas: ["Pfizer", "Merck", "Roche", "Novo Nordisk"],
    dynamic: "License-out 出海加速，原创靶点与大分子仍在追赶。", dependency: "中" },
  { id: "medical-device", sector: "health", name: "医疗器械", en: "Medical Devices", position: "追赶", autonomy: 55,
    domestic: ["迈瑞医疗", "联影", "微创"], overseas: ["Medtronic", "GE 医疗", "西门子医疗"],
    dynamic: "中低端国产化高，高端影像与植介入器械追赶。", dependency: "中（高端核心部件）" },
  { id: "cxo-biotech", sector: "health", name: "生物科技 / CXO", en: "Biotech & CXO", position: "并跑", autonomy: 65,
    domestic: ["药明康德", "凯莱英"], overseas: ["Lonza", "Catalent"],
    dynamic: "CXO 全球产能领先，面临生物安全法案等政策风险。", dependency: "中（政策风险）" },

  // —— 能源资源 ——
  { id: "oil-gas", sector: "resources", name: "油气", en: "Oil & Gas", position: "受制", autonomy: 40,
    domestic: ["中石油", "中石化", "中海油"], overseas: ["ExxonMobil", "Saudi Aramco", "Shell"],
    dynamic: "勘探开发能力强，但原油对外依存度高、定价权弱。", dependency: "高（原油进口 70%+）" },
  { id: "power-grid", sector: "resources", name: "电力与电网", en: "Power & Grid", position: "领先", autonomy: 90,
    domestic: ["国家电网", "特变电工", "平高电气"], overseas: ["Siemens Energy", "GE Vernova", "Hitachi Energy"],
    dynamic: "特高压输电全球领先，电网装备出海加速。", dependency: "低" },
  { id: "critical-minerals", sector: "resources", name: "关键矿产 (锂钴镍)", en: "Critical Minerals", position: "并跑", autonomy: 60,
    domestic: ["赣锋锂业", "天齐锂业", "华友钴业"], overseas: ["Albemarle", "Glencore", "SQM"],
    dynamic: "冶炼加工主导，上游锂钴镍矿源部分海外依赖。", dependency: "高（矿源进口）" },

  // —— 消费与农业 ——
  { id: "brand-consumer", sector: "consumer", name: "品牌消费", en: "Branded Consumer", position: "并跑", autonomy: 70,
    domestic: ["海尔", "美的", "安踏"], overseas: ["Nike", "P&G", "LVMH"],
    dynamic: "家电出海领先，高端品牌力与奢侈品仍有差距。", dependency: "低" },
  { id: "ecommerce", sector: "consumer", name: "电商与跨境零售", en: "E-commerce & Cross-border", position: "领先", autonomy: 85,
    domestic: ["阿里", "拼多多", "抖音电商", "SHEIN", "Temu"], overseas: ["Amazon"],
    dynamic: "跨境电商强势出海，面临多国监管与关税审查。", dependency: "低（监管风险）" },
  { id: "agriculture", sector: "consumer", name: "农业与种业", en: "Agriculture & Seeds", position: "受制", autonomy: 45,
    domestic: ["隆平高科", "牧原股份"], overseas: ["Bayer", "Corteva", "ADM", "Cargill"],
    dynamic: "粮食基本自给，大豆进口与高端种业、农化受制。", dependency: "高（大豆进口+种业）" },

  // —— 金融与服务 ——
  { id: "fintech", sector: "finance", name: "金融科技", en: "Fintech", position: "并跑", autonomy: 75,
    domestic: ["蚂蚁集团", "微众银行", "银联"], overseas: ["Visa", "PayPal", "Stripe"],
    dynamic: "移动支付与数字人民币领先，跨境清算话语权待提升。", dependency: "中（跨境清算）" },
  { id: "gaming-media", sector: "finance", name: "文娱与游戏", en: "Gaming & Media", position: "并跑", autonomy: 70,
    domestic: ["腾讯", "网易", "米哈游"], overseas: ["Sony", "Nintendo", "Disney"],
    dynamic: "游戏出海成绩亮眼，3A 引擎与高端 IP 运营仍在追赶。", dependency: "中（游戏引擎）" },
];

const POSITION_ORDER = { 领先: 0, 并跑: 1, 追赶: 2, 受制: 3 };

async function snapshot() {
  const byPosition = { 领先: 0, 并跑: 0, 追赶: 0, 受制: 0 };
  let autonomySum = 0;
  for (const it of INDUSTRIES) {
    byPosition[it.position] = (byPosition[it.position] || 0) + 1;
    autonomySum += it.autonomy;
  }
  const chokepoints = INDUSTRIES.filter((i) => i.autonomy < 40)
    .sort((a, b) => a.autonomy - b.autonomy)
    .map((i) => ({ id: i.id, name: i.name, autonomy: i.autonomy, position: i.position, dependency: i.dependency }));
  const leading = INDUSTRIES.filter((i) => i.position === "领先").map((i) => i.name);

  const sectors = SECTORS.map((s) => ({
    ...s,
    items: INDUSTRIES.filter((i) => i.sector === s.id).sort(
      (a, b) => (POSITION_ORDER[a.position] ?? 9) - (POSITION_ORDER[b.position] ?? 9),
    ),
  }));

  return {
    source: "国际产业对比参考模型（运营者按季更新）",
    sourceUrl: "",
    fetchedAt: new Date().toISOString(),
    note: "中国地位与自主可控度为结构化研判，非实时行情；可叠加产业新闻与 Comtrade 贸易数据。",
    sectors,
    industries: INDUSTRIES,
    summary: {
      total: INDUSTRIES.length,
      sectorCount: SECTORS.length,
      avgAutonomy: Math.round(autonomySum / INDUSTRIES.length),
      byPosition,
      chokepointCount: chokepoints.length,
      chokepoints,
      leadingCount: byPosition["领先"],
      leading,
    },
  };
}

module.exports = { snapshot, SECTORS, INDUSTRIES };
