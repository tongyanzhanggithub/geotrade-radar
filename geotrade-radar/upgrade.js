const chokepoints = [
  { name: "苏伊士运河", lat: 30.4, lon: 32.5, score: 88, note: "红海绕行持续，欧洲进口成本上升" },
  { name: "曼德海峡", lat: 12.6, lon: 43.3, score: 91, note: "商船安全与保险溢价高位" },
  { name: "霍尔木兹海峡", lat: 26.6, lon: 56.3, score: 86, note: "原油与 LNG 运输风险上升" },
  { name: "马六甲海峡", lat: 2.5, lon: 101.2, score: 46, note: "流量高位，当前运行稳定" },
  { name: "巴拿马运河", lat: 9.1, lon: -79.7, score: 74, note: "旱季配额与船期延误" },
  { name: "博斯普鲁斯海峡", lat: 41.1, lon: 29.1, score: 68, note: "黑海粮食装运受扰" },
  { name: "台湾海峡", lat: 24.2, lon: 119.5, score: 67, note: "电子供应链需持续关注" },
  { name: "好望角", lat: -34.4, lon: 18.5, score: 63, note: "绕行流量与燃油成本增加" },
];

const strategicPorts = [
  { name: "上海港", lat: 31.2, lon: 121.5, note: "集装箱与制造出口枢纽" },
  { name: "新加坡港", lat: 1.26, lon: 103.84, note: "亚洲转运与燃油补给中心" },
  { name: "鹿特丹港", lat: 51.95, lon: 4.14, note: "欧洲能源与集装箱门户" },
  { name: "杰贝阿里港", lat: 25.0, lon: 55.06, note: "中东贸易中转枢纽" },
  { name: "桑托斯港", lat: -23.96, lon: -46.3, note: "巴西农产品出口枢纽" },
  { name: "洛杉矶港", lat: 33.74, lon: -118.27, note: "美国亚洲进口门户" },
  { name: "丹戎帕拉帕斯港", lat: 1.36, lon: 103.55, note: "东南亚制造与转运枢纽" },
  { name: "康斯坦察港", lat: 44.17, lon: 28.65, note: "黑海粮食替代出口节点" },
];

// 国家/地区中文名 → 地理中心坐标 [纬度, 经度]，用于把制裁名单、产业企业动态等按国家归属的
// 实时数据投射到地图上。坐标取首都或地理中心，仅用于近似定位，不代表精确边界。
const countryGeo = {
  中国: [35.0, 105.0],
  美国: [39.8, -98.6],
  俄罗斯: [61.5, 105.3],
  伊朗: [32.4, 53.7],
  沙特阿拉伯: [24.0, 45.0],
  阿联酋: [24.0, 54.0],
  卡塔尔: [25.3, 51.2],
  科威特: [29.3, 47.5],
  伊拉克: [33.0, 44.0],
  叙利亚: [35.0, 38.5],
  以色列: [31.0, 35.0],
  土耳其: [39.0, 35.0],
  印度: [22.0, 79.0],
  巴基斯坦: [30.0, 70.0],
  孟加拉国: [23.7, 90.4],
  印度尼西亚: [-2.5, 118.0],
  越南: [16.0, 108.0],
  菲律宾: [13.0, 122.0],
  日本: [36.2, 138.3],
  韩国: [36.5, 127.8],
  朝鲜: [40.3, 127.5],
  新加坡: [1.35, 103.8],
  澳大利亚: [-25.0, 133.0],
  英国: [54.0, -2.0],
  欧盟: [50.8, 4.4],
  德国: [51.2, 10.4],
  法国: [46.6, 2.2],
  意大利: [42.5, 12.5],
  西班牙: [40.0, -4.0],
  荷兰: [52.1, 5.3],
  乌克兰: [48.4, 31.2],
  白俄罗斯: [53.7, 27.9],
  加拿大: [56.1, -106.3],
  墨西哥: [23.6, -102.5],
  巴西: [-10.0, -55.0],
  智利: [-35.7, -71.5],
  阿根廷: [-34.0, -64.0],
  哥伦比亚: [4.0, -74.0],
  秘鲁: [-10.0, -76.0],
  巴拿马: [8.5, -80.8],
  也门: [15.5, 48.5],
  埃及: [26.8, 30.8],
  尼日利亚: [9.1, 8.7],
  加纳: [7.9, -1.0],
  南非: [-29.0, 24.0],
  "刚果（金）": [-4.0, 21.8],
  赞比亚: [-13.1, 27.9],
  全球: [10, 12],
};

function countryCoord(name) {
  if (!name) return null;
  const key = String(name).trim();
  if (countryGeo[key]) return countryGeo[key];
  const alias = Object.keys(countryGeo).find((item) => key.includes(item) || item.includes(key));
  return alias ? countryGeo[alias] : null;
}

const routeGeography = [
  {
    name: "中国—欧洲海运",
    score: 88,
    points: [[31.2, 121.5], [1.3, 103.8], [12.6, 43.3], [30.4, 32.5], [51.95, 4.14]],
    commodities: ["电子产品", "机械设备", "光伏组件", "纺织服装", "家具家居"],
    reason: "苏伊士运河绕行、红海护航成本与欧洲需求波动共同推高时效与保费",
  },
  {
    name: "波斯湾—东亚能源",
    score: 86,
    points: [[25.0, 55.1], [26.6, 56.3], [2.5, 101.2], [31.2, 121.5]],
    commodities: ["原油", "液化天然气 (LNG)", "石脑油 / 石化产品"],
    reason: "霍尔木兹海峡通行风险与OPEC+产量政策直接影响能源到岸成本",
  },
  {
    name: "亚洲—美国东海岸",
    score: 74,
    points: [[31.2, 121.5], [9.1, -79.7], [32.1, -80.9]],
    commodities: ["消费电子", "家具家居", "服装鞋帽", "汽车零部件"],
    reason: "巴拿马运河水位限制、美国关税调整与港口拥堵推升周转风险",
  },
  {
    name: "黑海—地中海粮食",
    score: 79,
    points: [[46.5, 30.7], [41.1, 29.1], [31.2, 29.9]],
    commodities: ["小麦", "玉米", "葵花籽油", "化肥"],
    reason: "黑海港口安全与博斯普鲁斯海峡通行节奏影响全球粮食与化肥供给",
  },
  {
    name: "巴西—中国粮食",
    score: 64,
    points: [[-24.0, -46.3], [-34.4, 18.5], [1.3, 103.8], [31.2, 121.5]],
    commodities: ["大豆", "铁矿石", "原油", "蔗糖"],
    reason: "南美收获季节、海运运价与中国采购节奏决定大宗商品到港波动",
  },
  {
    name: "中非—印度洋矿产",
    score: 75,
    points: [[-10.7, 25.5], [-14.0, 33.8], [-6.8, 39.3], [1.3, 103.8]],
    commodities: ["钴", "铜精矿", "锂辉石", "稀土精矿"],
    reason: "矿区政局、出口许可与电池材料需求共同左右关键矿产流向",
  },
  {
    name: "北美—东亚半导体走廊",
    score: 70,
    points: [[47.6, -122.3], [35.6, 139.7], [25.0, 121.5], [31.2, 121.5]],
    commodities: ["半导体设备", "高端芯片", "精密仪器", "存储模组"],
    reason: "出口管制清单更新与晶圆产能调度持续改变高科技物流路径",
  },
  {
    name: "澳大利亚—东亚铁矿能源",
    score: 68,
    points: [[-31.9, 115.9], [1.3, 103.8], [31.2, 121.5]],
    commodities: ["铁矿石", "动力煤", "液化天然气 (LNG)"],
    reason: "中澳贸易关系、钢铁需求周期与海岬型船运价波动影响装运节奏",
  },
  {
    name: "中国—东南亚电子供应链",
    score: 62,
    points: [[22.5, 114.1], [21.0, 105.8], [13.7, 100.5], [-6.2, 106.8]],
    commodities: ["电子元件", "显示面板", "锂电池材料", "半成品组件"],
    reason: "产能转移、原产地规则收紧与区域自贸协定持续重塑供应链布局",
  },
  {
    name: "西非—欧洲能源原料",
    score: 66,
    points: [[6.5, 3.4], [36.7, 3.1], [51.95, 4.14]],
    commodities: ["原油", "天然气", "铝土矿", "可可豆"],
    reason: "几内亚湾安全形势与北非管道供应共同影响欧洲能源与原料补给",
  },
  {
    name: "中国—中亚能源走廊",
    score: 60,
    points: [[43.8, 87.6], [43.2, 76.9], [35.7, 51.4], [41.0, 28.9]],
    commodities: ["天然气", "原油", "有色金属", "化肥"],
    reason: "跨境管道运维、过境清关效率与区域汇率波动影响陆路能源贸易",
  },
  {
    name: "印度—中东—欧洲经济走廊",
    score: 57,
    points: [[19.1, 72.9], [25.2, 55.3], [32.8, 35.0], [37.9, 23.6], [45.6, 13.8]],
    commodities: ["香料与农产品", "纺织原料", "原油", "化工与医药中间体"],
    reason: "IMEC多式联运基建进度与海湾港口枢纽地位决定该新兴走廊承载力",
  },
];

const countrySectorMatrix = [
  ["越南", "电子制造", 46, 24, 43, 32, 88, 82],
  ["阿联酋", "贸易中转", 25, 18, 22, 20, 84, 86],
  ["沙特阿拉伯", "新能源", 37, 26, 29, 31, 86, 81],
  ["哈萨克斯坦", "金属贸易", 55, 58, 46, 52, 72, 69],
  ["土耳其", "制造业", 66, 45, 86, 57, 61, 58],
  ["印度尼西亚", "电池材料", 52, 31, 48, 45, 82, 76],
  ["墨西哥", "汽车零部件", 47, 35, 39, 42, 78, 74],
  ["德国", "先进制造", 34, 28, 22, 26, 65, 73],
];

const opportunities = [
  { title: "东南亚先进制造承接", score: 81, horizon: "12—36 个月", driver: "关税与供应链多元化", action: "跟踪越南、马来西亚产业园与本地配套能力" },
  { title: "中东能源与工程服务", score: 78, horizon: "6—24 个月", driver: "能源投资与本地化采购", action: "关注海湾国家设备、工程与新能源项目" },
  { title: "关键矿产回收与替代材料", score: 76, horizon: "12—48 个月", driver: "出口管制与原料集中度", action: "评估铜、镍、钴回收及替代技术" },
  { title: "航运风险管理与数字化", score: 72, horizon: "3—18 个月", driver: "绕行、保险与合规成本", action: "关注货代可视化、保险科技和多式联运" },
  { title: "贸易合规与原产地服务", score: 70, horizon: "3—24 个月", driver: "转口审查与出口管制强化", action: "构建 HS Code、实体名单与供应商穿透能力" },
];

const scenarios = [
  {
    title: "红海长期绕行",
    probability: "中高",
    severity: 88,
    trigger: "主要承运商继续暂停苏伊士航线超过 90 天",
    exposure: "欧洲进口商、航运、保险、跨境电商、原油",
    response: "重算交付周期；锁定舱位与保险；评估铁路和空运替代。",
  },
  {
    title: "美国扩大关键产业关税",
    probability: "中高",
    severity: 84,
    trigger: "电池、光伏、半导体和先进制造税目进一步扩大",
    exposure: "中国出口企业、北美进口商、墨西哥和东南亚产能",
    response: "校验 HS Code；模拟毛利变化；审查替代市场与本地化路径。",
  },
  {
    title: "霍尔木兹能源冲击",
    probability: "中",
    severity: 92,
    trigger: "油轮通行受限或保险费率短期跃升",
    exposure: "原油、LNG、炼化、航空、化工与亚洲进口国",
    response: "压力测试能源成本；提高库存；分散采购和套期保值。",
  },
  {
    title: "关键矿产出口收紧",
    probability: "中",
    severity: 79,
    trigger: "镍、钴、石墨或稀土新增配额与许可要求",
    exposure: "电池材料、先进制造、汽车与电子供应链",
    response: "锁定长协；建设回收能力；评估替代材料和供应国。",
  },
];

if (!categories.some((category) => category.id === "ai-robotics")) {
  categories.splice(1, 0, { id: "ai-robotics", label: "AI / 机器人" });
}
if (!categories.some((category) => category.id === "physical-ai")) {
  const aiIndex = categories.findIndex((category) => category.id === "ai-robotics");
  categories.splice(aiIndex >= 0 ? aiIndex + 1 : 2, 0, { id: "physical-ai", label: "物理AI" });
}

const aiRoboticsEvents = [
  {
    id: "china-humanoid-policy",
    title: "中国多地加快人形机器人产业集群建设",
    summary: "地方产业基金、场景开放和供应链配套同步加速，核心零部件与整机量产验证成为重点。",
    category: "ai-robotics",
    categoryLabel: "人形机器人",
    countries: ["中国"],
    sectors: ["人形机器人", "精密制造", "工业自动化"],
    commodities: ["稀土永磁", "铜"],
    route: "中国先进制造供应链",
    score: 79,
    confidence: 88,
    source: "产业政策汇总",
    time: "22 分钟前",
    lon: 121,
    lat: 31,
    impact: [
      ["政策与资本", "产业基金和示范场景加速落地"],
      ["核心零部件", "减速器、丝杠、传感器需求提升"],
      ["量产验证", "成本、可靠性与供应链能力受检验"],
      ["投资影响", "具备量产能力的核心部件企业受关注"],
    ],
  },
  {
    id: "us-ai-chip-controls",
    title: "美国评估扩大 AI 加速器出口许可范围",
    summary: "先进算力芯片、互连和相关云服务可能面临更严格许可要求，区域算力部署路径受到影响。",
    category: "ai-robotics",
    categoryLabel: "AI 算力政策",
    countries: ["美国", "中国", "新加坡"],
    sectors: ["AI 芯片", "云计算", "数据中心"],
    commodities: ["铜", "电力"],
    route: "全球 AI 硬件供应链",
    score: 87,
    confidence: 82,
    source: "BIS Policy Watch",
    time: "41 分钟前",
    lon: -77,
    lat: 38,
    impact: [
      ["出口许可", "先进 AI 芯片销售范围可能收紧"],
      ["算力部署", "区域数据中心建设方案需要调整"],
      ["供应链替代", "国产算力与替代芯片投入增加"],
      ["市场影响", "AI 硬件估值与订单预期分化"],
    ],
  },
  {
    id: "japan-robot-orders",
    title: "日本工业机器人订单出现回升信号",
    summary: "汽车、电子和半导体客户自动化投资改善，精密减速器与伺服系统订单同步回暖。",
    category: "ai-robotics",
    categoryLabel: "工业机器人",
    countries: ["日本", "中国", "韩国"],
    sectors: ["工业机器人", "汽车", "半导体"],
    commodities: ["铜"],
    route: "东北亚机器人供应链",
    score: 66,
    confidence: 86,
    source: "JARA",
    time: "1 小时前",
    lon: 139,
    lat: 36,
    impact: [
      ["订单回升", "制造业自动化投资改善"],
      ["部件需求", "减速器、伺服与控制器订单提升"],
      ["区域贸易", "东北亚机器人零部件流动增加"],
      ["市场影响", "自动化产业链景气预期改善"],
    ],
  },
  {
    id: "eu-ai-act",
    title: "欧盟 AI 法规进入企业合规实施阶段",
    summary: "高风险 AI 系统需要强化数据、透明度与责任管理，工业 AI 和机器人供应商合规成本增加。",
    category: "ai-robotics",
    categoryLabel: "AI 监管",
    countries: ["欧盟"],
    sectors: ["企业软件", "工业 AI", "机器人"],
    commodities: [],
    route: "欧洲数字服务贸易",
    score: 72,
    confidence: 94,
    source: "European Commission",
    time: "2 小时前",
    lon: 4,
    lat: 50,
    impact: [
      ["法规实施", "高风险 AI 系统合规要求增加"],
      ["产品管理", "数据、模型与责任链需要可审计"],
      ["贸易影响", "进入欧洲市场的认证周期延长"],
      ["机会信号", "AI 治理与合规服务需求提升"],
    ],
  },
  {
    id: "robot-magnet-risk",
    title: "机器人伺服电机关注稀土永磁供应风险",
    summary: "高性能磁材供应集中度与出口政策变化，使机器人电机厂商加强库存和替代材料评估。",
    category: "ai-robotics",
    categoryLabel: "机器人供应链",
    countries: ["中国", "日本", "德国"],
    sectors: ["机器人", "伺服电机", "稀土材料"],
    commodities: ["稀土永磁"],
    route: "亚洲—欧洲先进制造",
    score: 78,
    confidence: 76,
    source: "Industry Supply Chain Monitor",
    time: "3 小时前",
    lon: 112,
    lat: 35,
    impact: [
      ["原料集中", "高性能永磁材料供应集中度较高"],
      ["成本风险", "电机与执行器采购成本敏感"],
      ["企业响应", "库存、回收与替代材料投入增加"],
      ["投资影响", "磁材和高效电机技术受关注"],
    ],
  },
  {
    id: "gulf-ai-infrastructure",
    title: "海湾国家扩大 AI 数据中心与机器人投资",
    summary: "主权资本加大算力基础设施、能源配套和机器人应用投资，设备与工程服务机会增加。",
    category: "ai-robotics",
    categoryLabel: "AI 基础设施",
    countries: ["阿联酋", "沙特阿拉伯"],
    sectors: ["数据中心", "能源", "服务机器人"],
    commodities: ["铜", "天然气"],
    route: "亚洲—海湾科技贸易",
    score: 74,
    confidence: 84,
    source: "Gulf Investment Monitor",
    time: "4 小时前",
    lon: 54,
    lat: 24,
    impact: [
      ["资本投入", "算力与机器人项目融资增加"],
      ["基础设施", "电力、冷却与数据中心需求提升"],
      ["贸易机会", "设备、工程与系统集成出口增加"],
      ["本地化要求", "项目落地需要本地伙伴和服务能力"],
    ],
  },
  {
    id: "sea-smart-factory",
    title: "东南亚制造商加快智能工厂与机器人部署",
    summary: "电子、汽车零部件和消费品工厂提高自动化投入，以应对劳动力成本和质量一致性要求。",
    category: "ai-robotics",
    categoryLabel: "智能制造",
    countries: ["越南", "泰国", "马来西亚"],
    sectors: ["工业机器人", "机器视觉", "电子制造"],
    commodities: [],
    route: "东南亚制造供应链",
    score: 68,
    confidence: 81,
    source: "ASEAN Manufacturing Survey",
    time: "5 小时前",
    lon: 104,
    lat: 14,
    impact: [
      ["需求变化", "自动化投资和机器人密度提升"],
      ["设备贸易", "视觉、控制器与机器人进口增加"],
      ["服务需求", "本地集成、维护与培训成为瓶颈"],
      ["机会信号", "具备海外交付能力的供应商受益"],
    ],
  },
  {
    id: "ai-power-bottleneck",
    title: "AI 数据中心电力与冷却瓶颈持续显现",
    summary: "高密度算力集群推高电力、铜缆、变压器和冷却系统需求，项目交付周期面临约束。",
    category: "ai-robotics",
    categoryLabel: "算力基础设施",
    countries: ["美国", "欧盟", "新加坡"],
    sectors: ["数据中心", "电网设备", "液冷"],
    commodities: ["铜", "天然气"],
    route: "全球算力基础设施供应链",
    score: 82,
    confidence: 90,
    source: "Data Center Infrastructure Watch",
    time: "6 小时前",
    lon: -96,
    lat: 33,
    impact: [
      ["算力需求", "高密度 AI 集群建设加速"],
      ["基础设施", "电力、变压器与液冷需求上升"],
      ["交付约束", "并网和设备交期成为项目瓶颈"],
      ["市场影响", "电网设备与冷却产业链景气提升"],
    ],
  },
];

const physicalAiEvents = [
  {
    id: "physical-ai-vla-factory",
    title: "视觉语言动作模型进入智能工厂验证",
    summary: "多模态模型开始从文本与图像理解走向真实设备控制，产线分拣、质检和柔性装配成为首批验证场景。",
    category: "physical-ai",
    categoryLabel: "物理AI",
    countries: ["美国", "中国", "德国"],
    sectors: ["具身智能", "智能制造", "机器视觉"],
    commodities: ["传感器", "边缘算力"],
    route: "全球智能制造执行层",
    score: 84,
    confidence: 84,
    source: "Physical AI Monitor",
    time: "35 分钟前",
    lon: -122,
    lat: 37,
    impact: [
      ["模型能力", "视觉语言动作模型从任务规划延伸到真实动作执行"],
      ["工厂场景", "分拣、质检、拧紧和搬运等低风险环节先落地"],
      ["硬件需求", "边缘 GPU、深度相机、力控传感器和安全控制器需求上升"],
      ["商业化路径", "从单机演示转向多设备编排和持续数据闭环"],
    ],
  },
  {
    id: "physical-ai-sim-data",
    title: "仿真数据与数字孪生成为机器人训练瓶颈突破口",
    summary: "物理世界数据采集成本高，企业加大仿真环境、合成数据和真实反馈闭环投入，以提高机器人泛化能力。",
    category: "physical-ai",
    categoryLabel: "仿真训练",
    countries: ["美国", "日本", "新加坡"],
    sectors: ["仿真平台", "机器人训练", "工业软件"],
    commodities: ["GPU", "数据中心"],
    route: "物理AI训练数据链",
    score: 79,
    confidence: 82,
    source: "Embodied AI Lab Watch",
    time: "1 小时前",
    lon: 103,
    lat: 1,
    impact: [
      ["训练数据", "真实采集与合成数据需要组合使用"],
      ["仿真平台", "数字孪生、物理引擎和场景随机化价值提升"],
      ["部署风险", "仿真到现实偏差仍是规模化落地主要约束"],
      ["机会信号", "工业软件、仿真工具链和机器人数据服务受关注"],
    ],
  },
  {
    id: "physical-ai-edge-inference",
    title: "边缘推理芯片成为物理AI落地关键约束",
    summary: "机器人和工业设备需要低延迟、高可靠、低功耗的本地推理能力，边缘 AI 芯片与传感器融合方案进入重点评估。",
    category: "physical-ai",
    categoryLabel: "边缘推理",
    countries: ["美国", "韩国", "中国台湾"],
    sectors: ["边缘 AI", "机器人控制器", "工业物联网"],
    commodities: ["半导体", "电力"],
    route: "边缘AI硬件供应链",
    score: 81,
    confidence: 80,
    source: "Edge AI Supply Chain",
    time: "2 小时前",
    lon: 121,
    lat: 24,
    impact: [
      ["实时控制", "端侧推理决定动作响应和安全冗余"],
      ["芯片需求", "低功耗 NPU、工业控制器和传感器融合模块需求上升"],
      ["供应链影响", "先进封装、存储和工业级认证周期影响交付"],
      ["投资影响", "端侧 AI 硬件、模组和工业软件栈形成新竞争点"],
    ],
  },
  {
    id: "physical-ai-safety-standard",
    title: "物理AI安全认证压力开始前置到产品设计阶段",
    summary: "当 AI 直接控制机械动作，功能安全、责任边界、远程接管和数据记录将成为客户采购前置条件。",
    category: "physical-ai",
    categoryLabel: "安全合规",
    countries: ["欧盟", "美国", "日本"],
    sectors: ["功能安全", "工业机器人", "AI 治理"],
    commodities: [],
    route: "物理AI安全合规链",
    score: 73,
    confidence: 86,
    source: "Industrial Safety Review",
    time: "3 小时前",
    lon: 10,
    lat: 50,
    impact: [
      ["认证前置", "安全设计、日志审计和远程接管能力提前进入招标条件"],
      ["部署周期", "高风险场景从试点到规模部署需要更长验证周期"],
      ["服务机会", "安全测试、合规咨询和保险定价模型需求提升"],
      ["市场分化", "具备安全工程能力的系统集成商更容易拿到订单"],
    ],
  },
];

physicalAiEvents.forEach((event) => {
  if (!events.some((item) => item.id === event.id)) events.push(event);
});

aiRoboticsEvents.forEach((event) => {
  if (!events.some((item) => item.id === event.id)) events.push(event);
});

const aiRoboticsSignals = [
  {
    id: "compute",
    domain: "算力与芯片",
    title: "先进 AI 加速器出口许可风险升高",
    score: 87,
    status: "高风险",
    direction: "供应受限",
    region: "美国 / 中国 / 新加坡",
    summary: "许可范围扩大可能改变区域算力采购、云服务部署与数据中心建设计划。",
    companies: ["GPU 供应商", "云服务商", "数据中心运营商"],
    indicators: ["出口许可政策文本", "先进芯片交期", "区域云算力价格", "数据中心项目延期"],
    eventId: "us-ai-chip-controls",
  },
  {
    id: "humanoid",
    domain: "人形机器人",
    title: "量产验证进入成本与可靠性竞争阶段",
    score: 81,
    status: "高机会",
    direction: "需求上行",
    region: "中国 / 美国",
    summary: "产业重点正从概念验证转向小批量量产，核心部件的一致性、成本和交付能力成为关键。",
    companies: ["减速器企业", "丝杠企业", "传感器企业", "整机厂商"],
    indicators: ["量产订单", "单机 BOM 成本", "示范场景数量", "核心部件国产化率"],
    eventId: "china-humanoid-policy",
  },
  {
    id: "automation",
    domain: "工业机器人",
    title: "东北亚工业机器人订单温和复苏",
    score: 69,
    status: "景气改善",
    direction: "订单回升",
    region: "日本 / 中国 / 韩国",
    summary: "汽车、电子和半导体行业自动化资本开支回升，机器人核心部件订单改善。",
    companies: ["机器人本体", "伺服系统", "机器视觉", "系统集成商"],
    indicators: ["日本机器人订单", "中国工业机器人产量", "制造业资本开支", "核心部件交期"],
    eventId: "japan-robot-orders",
  },
  {
    id: "regulation",
    domain: "AI 治理",
    title: "欧盟 AI 法规提升工业 AI 合规门槛",
    score: 72,
    status: "合规压力",
    direction: "成本上行",
    region: "欧盟",
    summary: "进入欧洲市场的工业 AI 和机器人系统需要更完整的风险管理、数据记录和责任机制。",
    companies: ["工业软件商", "机器人厂商", "AI 治理服务商"],
    indicators: ["实施细则", "认证周期", "企业合规预算", "高风险系统清单"],
    eventId: "eu-ai-act",
  },
  {
    id: "materials",
    domain: "机器人供应链",
    title: "稀土永磁与精密部件供应集中度偏高",
    score: 78,
    status: "供应风险",
    direction: "波动上升",
    region: "中国 / 日本 / 德国",
    summary: "机器人执行器和伺服电机依赖高性能磁材、精密减速器和传感器，供应链集中度值得持续跟踪。",
    companies: ["稀土磁材", "精密减速器", "伺服电机", "力矩传感器"],
    indicators: ["稀土出口政策", "磁材价格", "减速器交期", "机器人 BOM 成本"],
    eventId: "robot-magnet-risk",
  },
  {
    id: "infrastructure",
    domain: "AI 基础设施",
    title: "电力、铜缆与液冷成为算力扩张瓶颈",
    score: 84,
    status: "高机会",
    direction: "需求上行",
    region: "全球",
    summary: "AI 数据中心的投资机会正从芯片向电网设备、铜连接、冷却和能源保障扩散。",
    companies: ["变压器企业", "铜连接企业", "液冷企业", "能源服务商"],
    indicators: ["数据中心并网周期", "变压器交期", "铜需求", "液冷渗透率"],
    eventId: "ai-power-bottleneck",
  },
];

const physicalAiSignals = [
  {
    id: "vla",
    domain: "具身模型",
    title: "视觉语言动作模型从演示走向可复制任务库",
    score: 84,
    status: "高机会",
    direction: "能力上行",
    region: "美国 / 中国 / 德国",
    summary: "物理AI的核心不是聊天，而是把感知、推理、规划和动作执行接到真实设备上。最值得跟踪的是模型能否在新场景里复用技能，而不是单次演示是否惊艳。",
    companies: ["具身模型团队", "机器人整机厂", "工业视觉厂商", "系统集成商"],
    indicators: ["跨场景任务成功率", "远程接管次数", "动作延迟", "单位任务训练成本"],
    keywords: ["视觉语言动作", "VLA", "具身", "智能工厂"],
    eventId: "physical-ai-vla-factory",
  },
  {
    id: "simulation",
    domain: "仿真与数据",
    title: "仿真训练、合成数据和真实反馈闭环成为护城河",
    score: 79,
    status: "重点建设",
    direction: "投入增加",
    region: "美国 / 日本 / 新加坡",
    summary: "物理AI很难只靠互联网数据训练，真实世界数据昂贵且有安全边界。数字孪生、物理引擎、合成数据和现场反馈闭环会决定模型迭代速度。",
    companies: ["仿真平台", "工业软件", "数据采集服务", "机器人云平台"],
    indicators: ["仿真到现实误差", "场景库数量", "合成数据占比", "现场回传数据质量"],
    keywords: ["仿真", "数字孪生", "合成数据", "机器人训练"],
    eventId: "physical-ai-sim-data",
  },
  {
    id: "edge",
    domain: "边缘推理",
    title: "端侧算力决定物理AI能否进入高频现场",
    score: 81,
    status: "供应链瓶颈",
    direction: "需求上行",
    region: "美国 / 韩国 / 中国台湾",
    summary: "一旦 AI 要控制机械动作，就不能完全依赖云端。低延迟、低功耗、工业级可靠性的边缘推理芯片和控制器会成为落地速度的关键。",
    companies: ["边缘 AI 芯片", "工业控制器", "传感器模组", "机器人控制软件"],
    indicators: ["端侧 TOPS/W", "工业级认证周期", "推理延迟", "控制器交期"],
    keywords: ["边缘", "端侧", "推理", "控制器"],
    eventId: "physical-ai-edge-inference",
  },
  {
    id: "safety",
    domain: "安全与责任",
    title: "功能安全、审计日志和远程接管变成商业化门槛",
    score: 73,
    status: "合规前置",
    direction: "门槛提高",
    region: "欧盟 / 美国 / 日本",
    summary: "物理AI连接真实机器后，错误不再只是生成一段错话。客户会要求安全冗余、可审计日志、远程接管和责任划分，这会改变产品设计和销售周期。",
    companies: ["安全认证机构", "机器人保险", "工业客户", "系统集成商"],
    indicators: ["安全事故率", "接管响应时间", "认证通过周期", "责任条款变化"],
    keywords: ["安全", "认证", "接管", "审计"],
    eventId: "physical-ai-safety-standard",
  },
  {
    id: "fieldops",
    domain: "现场运营",
    title: "从单机智能转向多设备编排和现场运营系统",
    score: 77,
    status: "商业化加速",
    direction: "系统化部署",
    region: "全球",
    summary: "真正的价值会出现在多机器人、多传感器、多工序协同里。调度、维护、远程运营和数据回流将把物理AI从设备采购变成持续运营系统。",
    companies: ["机器人调度系统", "工业物联网平台", "远程运维服务", "设备租赁商"],
    indicators: ["设备利用率", "平均无故障时间", "远程运维成本", "多设备协同任务量"],
    keywords: ["调度", "运维", "多设备", "现场运营"],
    eventId: "sea-smart-factory",
  },
];

const physicalAiStack = [
  ["世界模型 / VLA", "核心突破", "从感知理解走向动作规划和技能复用"],
  ["仿真 / 合成数据", "训练底座", "解决真实世界数据稀缺和长尾场景问题"],
  ["传感器 / 机器视觉", "现场入口", "把空间、力、温度和工况反馈给模型"],
  ["边缘算力 / 控制器", "硬件瓶颈", "决定低延迟执行、安全冗余和部署成本"],
  ["执行器 / 电池 / 本体", "制造约束", "影响动作精度、续航、可靠性和维护成本"],
  ["安全认证 / 远程接管", "商业门槛", "决定能否进入工厂、仓储、医疗等真实场景"],
];

const industryPulseDomains = [
  { id: "ai", label: "AI", hint: "基础模型 / 企业AI" },
  { id: "robotics", label: "机器人", hint: "人形 / 工业自动化" },
  { id: "physical-ai", label: "物理AI", hint: "具身智能 / VLA" },
  { id: "compute", label: "算力芯片", hint: "GPU / HBM / 先进封装" },
  { id: "cloud", label: "云与数据中心", hint: "云厂商 / AI基础设施" },
  { id: "cybersecurity", label: "网络安全", hint: "漏洞 / 勒索 / 防护" },
  { id: "ev-battery", label: "智能汽车与电池", hint: "EV / 电池 / 自动驾驶" },
  { id: "quantum", label: "量子科技", hint: "量子计算 / 通信" },
  { id: "space-defense", label: "航天与防务科技", hint: "卫星 / 无人机 / 防务AI" },
  { id: "consumer-devices", label: "消费电子", hint: "端侧AI / 智能终端" },
  { id: "biotech", label: "生物科技", hint: "AI制药 / 基因编辑" },
  { id: "fintech-crypto", label: "金融科技", hint: "支付 / 稳定币 / 加密" },
];

const industryPulseItems = [
  {
    id: "industry-nvidia-physical-ai",
    domainId: "physical-ai",
    domain: "物理AI",
    company: "NVIDIA",
    ticker: "NVDA",
    type: "企业动态",
    title: "NVIDIA 将物理AI训练与边缘推理作为机器人生态重点",
    summary: "机器人基础模型、仿真训练和边缘推理硬件形成组合方案，推动物理AI从演示走向工厂、仓储和巡检场景。",
    source: "Industry Monitor",
    sourceUrl: "https://www.nvidia.com/en-us/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 86,
    sentiment: "机会上行",
    region: "美国 / 全球",
    tags: ["物理AI", "边缘推理", "仿真训练"],
    eventKeywords: ["物理AI", "边缘推理", "机器人"],
  },
  {
    id: "industry-openai-enterprise",
    domainId: "ai",
    domain: "AI",
    company: "OpenAI",
    ticker: "",
    type: "企业动态",
    title: "基础模型公司加速企业级部署与生态合作",
    summary: "模型能力竞争开始转向企业工作流、数据安全和行业应用，云厂商、软件公司与咨询服务商同步受益。",
    source: "Industry Monitor",
    sourceUrl: "https://openai.com/news/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 78,
    sentiment: "商业化加速",
    region: "美国 / 全球",
    tags: ["基础模型", "企业AI", "云服务"],
    eventKeywords: ["AI", "基础模型", "企业"],
  },
  {
    id: "industry-tesla-humanoid",
    domainId: "robotics",
    domain: "机器人",
    company: "Tesla",
    ticker: "TSLA",
    type: "企业动态",
    title: "人形机器人量产验证带动核心部件与制造工艺关注",
    summary: "市场开始关注从演示样机到小批量部署的成本、可靠性和供应链能力，执行器、传感器和电池系统成为观察重点。",
    source: "Industry Monitor",
    sourceUrl: "https://www.tesla.com/AI",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 81,
    sentiment: "量产验证",
    region: "美国 / 中国",
    tags: ["人形机器人", "执行器", "量产"],
    eventKeywords: ["人形机器人", "执行器", "量产"],
  },
  {
    id: "industry-abb-fanuc-automation",
    domainId: "robotics",
    domain: "机器人",
    company: "ABB / FANUC",
    ticker: "",
    type: "行业动态",
    title: "工业机器人订单关注汽车、电子和半导体资本开支",
    summary: "传统工业机器人景气度仍取决于制造业资本开支和自动化改造节奏，系统集成和维护服务比单机销量更能解释利润弹性。",
    source: "Industry Monitor",
    sourceUrl: "https://new.abb.com/products/robotics",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 70,
    sentiment: "温和复苏",
    region: "欧洲 / 日本 / 中国",
    tags: ["工业机器人", "自动化", "资本开支"],
    eventKeywords: ["工业机器人", "自动化", "订单"],
  },
  {
    id: "industry-edge-ai-chip",
    domainId: "compute",
    domain: "算力芯片",
    company: "Qualcomm / Arm",
    ticker: "",
    type: "行业动态",
    title: "端侧AI芯片竞争从手机扩展到机器人和工业设备",
    summary: "物理AI需要低延迟、本地推理和安全冗余，边缘AI芯片、工业控制器和传感器融合模组成为新一轮硬件竞争点。",
    source: "Industry Monitor",
    sourceUrl: "https://www.qualcomm.com/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 76,
    sentiment: "需求外溢",
    region: "美国 / 亚洲",
    tags: ["边缘AI", "芯片", "控制器"],
    eventKeywords: ["边缘AI", "芯片", "控制器"],
  },
];

industryPulseItems.push(
  {
    id: "industry-cloud-datacenter",
    domainId: "cloud",
    domain: "云与数据中心",
    company: "AWS / Azure / Google Cloud",
    ticker: "",
    type: "行业动态",
    title: "AI基础设施投资继续向数据中心、电力和网络设备外溢",
    summary: "大模型训练与推理需求推动云厂商资本开支上行，服务器、交换机、液冷、电力设备和数据中心REITs成为联动观察对象。",
    source: "Industry Monitor",
    sourceUrl: "https://aws.amazon.com/ai/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 79,
    sentiment: "资本开支扩张",
    region: "美国 / 全球",
    tags: ["云计算", "数据中心", "AI基础设施"],
    eventKeywords: ["云计算", "数据中心", "AI基础设施"],
  },
  {
    id: "industry-cybersecurity",
    domainId: "cybersecurity",
    domain: "网络安全",
    company: "CrowdStrike / Palo Alto Networks",
    ticker: "",
    type: "行业动态",
    title: "AI应用扩散提升身份安全、终端防护和漏洞响应需求",
    summary: "企业AI部署增加数据接入面，安全预算从传统边界防护转向身份、云工作负载、终端遥测和自动化响应。",
    source: "Industry Monitor",
    sourceUrl: "https://www.crowdstrike.com/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 74,
    sentiment: "需求稳健",
    region: "美国 / 全球",
    tags: ["网络安全", "身份安全", "漏洞响应"],
    eventKeywords: ["网络安全", "漏洞", "企业AI"],
  },
  {
    id: "industry-ev-battery",
    domainId: "ev-battery",
    domain: "智能汽车与电池",
    company: "BYD / CATL / Tesla",
    ticker: "",
    type: "行业动态",
    title: "智能汽车竞争从整车价格扩展到电池、算力和自动驾驶软件",
    summary: "电池成本、自动驾驶功能、车载芯片和区域政策同时影响整车厂利润率，也改变供应链议价结构。",
    source: "Industry Monitor",
    sourceUrl: "https://www.catl.com/en/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 73,
    sentiment: "竞争加剧",
    region: "中国 / 美国 / 欧洲",
    tags: ["智能汽车", "动力电池", "自动驾驶"],
    eventKeywords: ["电动车", "电池", "自动驾驶"],
  },
  {
    id: "industry-quantum",
    domainId: "quantum",
    domain: "量子科技",
    company: "IBM / IonQ / D-Wave",
    ticker: "",
    type: "行业动态",
    title: "量子计算进入技术验证与政策投入并行阶段",
    summary: "量子硬件、纠错、量子通信和密码迁移仍处早期，但政府投入和企业试点会持续制造产业信号。",
    source: "Industry Monitor",
    sourceUrl: "https://www.ibm.com/quantum",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 68,
    sentiment: "前沿观察",
    region: "美国 / 欧洲 / 中国",
    tags: ["量子计算", "量子通信", "研发投入"],
    eventKeywords: ["量子计算", "量子科技", "密码"],
  },
  {
    id: "industry-space-defense",
    domainId: "space-defense",
    domain: "航天与防务科技",
    company: "SpaceX / Palantir / Anduril",
    ticker: "",
    type: "行业动态",
    title: "卫星、无人机和防务AI成为地缘风险下的科技支出重点",
    summary: "商业航天和防务科技把硬件交付、遥感数据、边缘AI和政府采购连接在一起，订单节奏比概念热度更关键。",
    source: "Industry Monitor",
    sourceUrl: "https://www.rocketlabusa.com/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 77,
    sentiment: "订单驱动",
    region: "美国 / 全球",
    tags: ["商业航天", "卫星", "防务AI"],
    eventKeywords: ["卫星", "无人机", "防务科技"],
  },
  {
    id: "industry-consumer-devices",
    domainId: "consumer-devices",
    domain: "消费电子",
    company: "Apple / Samsung / Huawei",
    ticker: "",
    type: "行业动态",
    title: "端侧AI推动手机、PC和可穿戴设备进入新一轮规格竞争",
    summary: "模型本地推理、存储容量、NPU性能和生态入口共同决定终端换机动力，也影响上游零部件拉货节奏。",
    source: "Industry Monitor",
    sourceUrl: "https://www.apple.com/newsroom/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 71,
    sentiment: "产品周期",
    region: "美国 / 亚洲",
    tags: ["端侧AI", "智能终端", "消费电子"],
    eventKeywords: ["端侧AI", "手机", "PC"],
  },
  {
    id: "industry-biotech",
    domainId: "biotech",
    domain: "生物科技",
    company: "Moderna / BioNTech / CRISPR",
    ticker: "",
    type: "行业动态",
    title: "AI制药和基因编辑继续围绕临床进展与监管审批定价",
    summary: "平台能力需要通过临床里程碑和合作收入验证，算力、数据、专利和监管路径共同决定商业化速度。",
    source: "Industry Monitor",
    sourceUrl: "https://www.modernatx.com/en-US/media-center",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 69,
    sentiment: "里程碑驱动",
    region: "美国 / 欧洲",
    tags: ["AI制药", "基因编辑", "临床进展"],
    eventKeywords: ["AI制药", "基因编辑", "临床"],
  },
  {
    id: "industry-fintech-crypto",
    domainId: "fintech-crypto",
    domain: "金融科技",
    company: "Stripe / PayPal / Coinbase",
    ticker: "",
    type: "行业动态",
    title: "稳定币、支付网络和加密监管改变金融科技竞争边界",
    summary: "支付公司、交易平台和传统金融机构围绕合规、清算效率和资产入口展开竞争，监管节奏决定估值弹性。",
    source: "Industry Monitor",
    sourceUrl: "https://www.coinbase.com/blog",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 72,
    sentiment: "政策敏感",
    region: "美国 / 全球",
    tags: ["支付科技", "稳定币", "加密资产"],
    eventKeywords: ["稳定币", "金融科技", "加密"],
  },
);

const eventInsightOverrides = {
  "red-sea": {
    why: "红海风险并不只影响船期。它会通过绕行里程、保险费率和库存周期，直接压缩欧洲进口商与中国出口企业的利润空间。",
    assets: ["SCFI 集运指数", "布伦特原油", "航运 ETF", "欧洲零售股", "VIX"],
    indicators: ["承运商苏伊士复航公告", "战争险与船体险报价", "亚洲—欧洲即期运价", "欧洲港口到港延误"],
    horizon: "短期 · 成本上行",
  },
  "us-battery-tariff": {
    why: "关税将改变北美电池材料的到岸成本和供应商选择，并可能加速墨西哥、加拿大与东南亚的替代产能布局。",
    assets: ["USD/CNY", "锂价", "镍价", "清洁能源 ETF", "汽车零部件"],
    indicators: ["USTR 最终税目", "HS 8507 进口量", "北美电池材料价格", "墨西哥近岸投资公告"],
    horizon: "中期 · 供应链重构",
  },
  hormuz: {
    why: "霍尔木兹承担全球重要能源运输流量，任何保险与通行成本变化都会迅速传导至亚洲炼化、航空与化工企业。",
    assets: ["布伦特原油", "亚洲 LNG", "黄金", "航空股", "炼化利润"],
    indicators: ["油轮通行量", "能源船战争险", "迪拜原油升贴水", "亚洲 LNG 现货价"],
    horizon: "短期 · 能源上行",
  },
};

const additionalMarkets = [
  { symbol: "CSI300", name: "沪深 300", value: "3,688.42", change: 0.32, risk: "中性", points: [24, 22, 23, 19, 20, 16, 15, 12] },
  { symbol: "STOXX", name: "欧洲 STOXX 600", value: "514.20", change: -0.38, risk: "关注", points: [13, 14, 16, 15, 19, 21, 22, 25] },
  { symbol: "USDJPY", name: "美元 / 日元", value: "154.62", change: -0.72, risk: "高", points: [10, 12, 14, 15, 18, 20, 22, 26] },
  { symbol: "NATGAS", name: "天然气", value: "$2.86", change: 1.84, risk: "偏高", points: [25, 22, 24, 19, 17, 14, 12, 8] },
  { symbol: "ALUMINUM", name: "LME 铝", value: "$2,612", change: 0.58, risk: "关注", points: [21, 22, 20, 18, 19, 16, 14, 12] },
  { symbol: "LITHIUM", name: "碳酸锂", value: "¥102,500", change: -1.12, risk: "偏高", points: [12, 14, 15, 17, 19, 21, 23, 25] },
  { symbol: "US10Y", name: "美国十年期国债", value: "4.38%", change: 0.06, risk: "关注", points: [22, 20, 21, 18, 16, 17, 13, 11] },
  { symbol: "BTC", name: "比特币", value: "$67,840", change: -1.36, risk: "高", points: [11, 14, 12, 18, 17, 22, 20, 26] },
];

additionalMarkets.forEach((market) => {
  if (!markets.some((item) => item.symbol === market.symbol)) markets.push(market);
});

[
  ["英国", "中国 / 全球", "先进制造设备", "强化最终用户审查", "2026-06-20", 72],
  ["巴西", "全球", "绿色钢铁", "新增碳认证要求", "2026-09-01", 59],
  ["沙特阿拉伯", "全球", "新能源设备", "本地化采购规则", "2026-08-15", 64],
  ["欧盟", "中国", "电动车 / HS 8703", "反补贴复审", "审议中", 79],
].forEach((item) => {
  if (!policies.some((row) => row[0] === item[0] && row[2] === item[2])) policies.push(item);
});

[
  ["Meridian Industrial Supply", "土耳其", "EU", "强化尽调", "机械 / 金属", "2026-05-29", 69],
  ["Caspian Logistics Network", "哈萨克斯坦", "UK / EU", "转运风险", "物流 / 设备", "2026-05-27", 67],
  ["Gulf Petrochem Intermediary", "阿联酋", "OFAC", "交易审查", "能源 / 化工", "2026-05-25", 76],
].forEach((item) => {
  if (!sanctions.some((row) => row[0] === item[0])) sanctions.push(item);
});

[
  { name: "中国—中亚陆路", score: 58, status: "关注", reason: "边境清关、制裁合规与汇率风险", change: "+3 天", chokepoint: "霍尔果斯 / 里海" },
  { name: "中国—中东海运", score: 71, status: "偏高", reason: "红海与霍尔木兹风险共同影响", change: "+8% 保险", chokepoint: "马六甲 / 霍尔木兹" },
  { name: "中国—拉美海运", score: 53, status: "关注", reason: "巴拿马运河配额与港口排队波动", change: "+4 天", chokepoint: "巴拿马运河" },
].forEach((item) => {
  if (!routes.some((route) => route.name === item.name)) routes.push(item);
});

[
  { name: "阿联酋", region: "中东", score: 29 },
  { name: "哈萨克斯坦", region: "中亚", score: 57 },
  { name: "墨西哥", region: "北美", score: 52 },
].forEach((item) => {
  if (!countryRisks.some((country) => country.name === item.name)) countryRisks.push(item);
});

tabConfig.forEach((tab) => {
  if (tab.id === "markets") tab.count = markets.length;
  if (tab.id === "policy") tab.count = policies.length;
  if (tab.id === "supply") tab.count = routes.length;
  if (tab.id === "sanctions") tab.count = sanctions.length;
  if (tab.id === "brief") tab.count = Math.min(3, events.length);
});
[
  { id: "industry-pulse", label: "产业企业", count: industryPulseItems.length },
  { id: "ai-robotics", label: "AI 与机器人", count: aiRoboticsSignals.length },
  { id: "physical-ai", label: "物理AI", count: physicalAiSignals.length },
  { id: "matrix", label: "国家—行业矩阵", count: countrySectorMatrix.length },
  { id: "opportunities", label: "机会雷达", count: opportunities.length },
  { id: "ashare-strategy", label: "A股策略", count: 0 },
  { id: "scenarios", label: "情景推演", count: scenarios.length },
].forEach((tab) => {
  if (!tabConfig.some((item) => item.id === tab.id)) tabConfig.push(tab);
});

function insightFor(event) {
  const defaultIndicators = {
    supply: ["相关路线即期运价", "港口等待时间", "保险与燃油附加费", "承运商运营公告"],
    policy: ["最终政策文本", "相关 HS Code 贸易量", "进口到岸成本", "替代供应国订单"],
    sanctions: ["官方名单更新", "银行合规口径", "贸易流向变化", "相关商品升贴水"],
    market: ["价格与波动率", "成交与持仓变化", "汇率套保成本", "相关行业订单"],
    energy: ["现货升贴水", "库存与装运量", "船舶通行量", "炼化与化工利润"],
    "ai-robotics": ["量产订单与交付周期", "核心部件成本", "政策与出口许可", "终端行业资本开支"],
    "physical-ai": ["跨场景任务成功率", "端侧推理延迟", "仿真到现实误差", "安全认证与远程接管数据"],
  };
  const defaultAssets = [
    ...event.commodities,
    ...event.sectors.slice(0, 2).map((sector) => `${sector}板块`),
    event.countries.includes("中国") ? "USD/CNY" : "美元指数",
  ].filter(Boolean);
  const override = eventInsightOverrides[event.id] || {};
  return {
    why:
      override.why ||
      `${event.summary} 该事件会通过“${event.route}”向${event.sectors.slice(0, 2).join("、")}等环节传导，需结合成本、交期与合规变化判断实际影响。`,
    assets: override.assets || defaultAssets.slice(0, 5),
    indicators: override.indicators || defaultIndicators[event.category] || defaultIndicators.market,
    horizon: override.horizon || (event.score >= 80 ? "短中期 · 高影响" : "短期 · 持续观察"),
  };
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function escapeMarkup(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character];
  });
}

function eventSourceUrl(event) {
  const sourceUrl = String(event?.sourceUrl || "").trim();
  return isHttpUrl(sourceUrl) ? sourceUrl : "";
}

function eventSourceActionMarkup(event) {
  const sourceUrl = eventSourceUrl(event);
  if (!sourceUrl) return "";
  const source = event.source || "原始来源";
  return `
    <div class="event-card-actions">
      <a
        class="event-source-link"
        href="${escapeMarkup(sourceUrl)}"
        target="_blank"
        rel="noreferrer"
        title="打开原文：${escapeMarkup(source)}"
      >原文 ↗</a>
    </div>
  `;
}

function renderDetailSourceAction(event) {
  const detailPanel = document.querySelector(".selected-detail");
  const metaNode = detailPanel?.querySelector(".detail-meta");
  if (!detailPanel || !metaNode) return;

  let action = document.getElementById("detail-source-action");
  if (!action) {
    action = document.createElement("a");
    action.id = "detail-source-action";
    action.className = "detail-source-action";
    action.target = "_blank";
    action.rel = "noreferrer";
    metaNode.insertAdjacentElement("afterend", action);
  }

  const sourceUrl = eventSourceUrl(event);
  if (!sourceUrl) {
    action.hidden = true;
    action.removeAttribute("href");
    return;
  }

  const source = event.source || "原始来源";
  action.hidden = false;
  action.href = sourceUrl;
  action.textContent = `查看原文：${source} ↗`;
  action.title = `打开原始报道：${event.title}`;
}

const previousRenderSelectedEvent = renderSelectedEvent;
renderSelectedEvent = function renderSelectedEventUpgraded() {
  previousRenderSelectedEvent();
  const event = selectedEvent();
  const insight = insightFor(event);
  renderDetailSourceAction(event);
  el("why-text").textContent = insight.why;
  el("detail-horizon").textContent = insight.horizon;
  el("affected-entities").innerHTML = [
    ...event.countries.map((item) => `<span class="entity country">${item}</span>`),
    ...event.sectors.map((item) => `<span class="entity sector">${item}</span>`),
    ...event.commodities.map((item) => `<span class="entity commodity">${item}</span>`),
    `<span class="entity route">${event.route}</span>`,
  ].join("");
  el("related-assets").innerHTML = insight.assets
    .map((asset, index) => `<span><b>${index % 3 === 0 ? "↑" : index % 3 === 1 ? "↕" : "!"}</b>${asset}</span>`)
    .join("");
  el("watch-indicators").innerHTML = insight.indicators.map((indicator) => `<li>${indicator}</li>`).join("");
};

renderEventList = function renderEventListUpgraded() {
  const list = filteredEvents();
  el("event-count").textContent = list.length;
  el("high-risk-count").textContent = events.filter((event) => event.score >= 80).length;

  if (!list.length) {
    el("event-list").innerHTML = `<div class="empty-state">没有匹配的事件。尝试切换分类或清除搜索条件。</div>`;
    return;
  }

  el("event-list").innerHTML = list
    .map((event) => {
      const insight = insightFor(event);
      return `
        <article class="event-card ${state.selectedEventId === event.id ? "active" : ""} ${eventSourceUrl(event) ? "has-source" : ""}" data-event-card-id="${event.id}">
          <button class="event-select" data-event-id="${event.id}" type="button">
            <span class="risk-score ${scoreClass(event.score)}">${event.score}</span>
            <span>
              <span class="event-meta">
                <span class="category">${event.categoryLabel}</span>
                <span>·</span>
                <span>${event.time}</span>
                <span>· ${event.confidence}% 可信</span>
                ${state.watchlist.has(event.id) ? '<span>· 已观察</span>' : ""}
              </span>
              <h3>${event.title}</h3>
              <p>${event.summary}</p>
              <span class="event-context">${insight.horizon} · ${event.route}</span>
              <span class="event-tags">
                ${event.countries.slice(0, 2).map((item) => `<span>${item}</span>`).join("")}
                ${event.sectors.slice(0, 2).map((item) => `<span>${item}</span>`).join("")}
                ${event.commodities.slice(0, 1).map((item) => `<span>${item}</span>`).join("")}
              </span>
            </span>
          </button>
          ${eventSourceActionMarkup(event)}
        </article>
      `;
    })
    .join("");
};

state.watchPanelOpen = state.watchPanelOpen || false;

function watchedEvents() {
  return events.filter((event) => state.watchlist.has(event.id));
}

function topItemsFromWatched(items, limit = 5) {
  const counts = new Map();
  items.filter(Boolean).forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function watchActionFor(event) {
  const categoryActions = {
    supply: ["核算替代航线", "检查承运商公告", "重估交付承诺"],
    policy: ["核对 HS Code", "测算到岸成本", "筛选替代供应国"],
    sanctions: ["跑交易对手筛查", "复核银行合规口径", "检查转运路径"],
    energy: ["跟踪现货升贴水", "检查库存与装运", "评估套保窗口"],
    market: ["设置价格警戒", "查看波动率", "复核敞口"],
    "ai-robotics": ["跟踪订单与交付", "检查出口许可", "观察资本开支"],
    "physical-ai": ["跟踪试点落地", "观察端侧算力", "核验安全认证"],
  };
  return categoryActions[event.category] || ["打开原文核验", "加入后续提醒", "观察价格反应"];
}

function watchOpportunityFor(items) {
  const corpus = items.map((event) => `${event.title} ${event.summary} ${event.category} ${event.sectors.join(" ")}`).join(" ");
  if (/ai|robot|physical|chip|semiconductor|data center|算力|机器人|物理AI/i.test(corpus)) {
    return {
      title: "AI 基础设施外溢",
      summary: "观察算力、电力、液冷、网络设备和工业自动化链条的二阶机会。",
      score: 84,
    };
  }
  if (/shipping|port|supply|航运|供应链|红海|suez/i.test(corpus)) {
    return {
      title: "替代路线与东南亚制造",
      summary: "当航线压力上升，替代产能、近岸仓储和多式联运服务会变得更有价值。",
      score: 81,
    };
  }
  if (/tariff|policy|sanction|关税|政策|制裁/i.test(corpus)) {
    return {
      title: "合规服务与替代供应",
      summary: "政策冲击会放大报关、原产地、名单筛查和替代供应商筛选的需求。",
      score: 78,
    };
  }
  return {
    title: "等待更清晰的组合信号",
    summary: "继续观察高分事件、原文更新与市场价格确认，避免只凭单条新闻行动。",
    score: 68,
  };
}

function ensureWatchPanel() {
  if (document.getElementById("watch-panel")) return;
  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div class="watch-backdrop" id="watch-backdrop" data-watch-close></div>
      <aside class="watch-panel" id="watch-panel" aria-label="观察列表工作台" aria-hidden="true">
        <header class="watch-panel-header">
          <div>
            <span class="eyebrow">WATCHLIST COMMAND CENTER</span>
            <h2>观察列表工作台</h2>
          </div>
          <button class="icon-button" data-watch-close type="button" title="关闭观察列表">×</button>
        </header>
        <div class="watch-panel-body" id="watch-panel-body"></div>
      </aside>
    `,
  );
}

function renderWatchPanel() {
  ensureWatchPanel();
  const panel = el("watch-panel");
  const backdrop = el("watch-backdrop");
  const body = el("watch-panel-body");
  const items = watchedEvents();
  const missingCount = Math.max(0, state.watchlist.size - items.length);
  const average = items.length ? Math.round(items.reduce((sum, event) => sum + Number(event.score || 0), 0) / items.length) : 0;
  const critical = items.filter((event) => event.score >= 80).length;
  const countries = topItemsFromWatched(items.flatMap((event) => event.countries), 4);
  const sectors = topItemsFromWatched(items.flatMap((event) => event.sectors), 5);
  const routes = topItemsFromWatched(items.map((event) => event.route), 4);
  const assets = topItemsFromWatched(items.flatMap((event) => insightFor(event).assets), 5);
  const opportunity = watchOpportunityFor(items);
  const nextItems = items
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  panel.classList.toggle("open", state.watchPanelOpen);
  backdrop.classList.toggle("visible", state.watchPanelOpen);
  panel.setAttribute("aria-hidden", state.watchPanelOpen ? "false" : "true");

  if (!items.length) {
    const selected = selectedEvent();
    body.innerHTML = `
      <div class="watch-empty">
        <strong>${missingCount ? "旧观察项不在当前范围内" : "还没有可用的观察事件"}</strong>
        <p>${
          missingCount
            ? `${missingCount} 条观察项没有出现在当前日/周/月实时事件范围。可以把当前事件加入观察，工作台会重新生成风险组合。`
            : "把当前事件加入观察后，这里会自动生成风险组合、后续指标、行动清单和机会提示。"
        }</p>
        <button class="watch-primary" data-watch-add-selected type="button">加入当前事件：${escapeMarkup(selected.title)}</button>
      </div>
    `;
    return;
  }

  body.innerHTML = `
    <section class="watch-scoreboard">
      <div>
        <span>组合风险</span>
        <strong style="color:${scoreColor(average)}">${average}</strong>
        <small>${items.length} 条观察 · ${critical} 条严重</small>
      </div>
      <div>
        <span>暴露国家</span>
        <strong>${countries.length}</strong>
        <small>${countries.map((item) => item.name).join(" / ") || "暂无"}</small>
      </div>
      <div>
        <span>行业暴露</span>
        <strong>${sectors.length}</strong>
        <small>${sectors.map((item) => item.name).join(" / ") || "暂无"}</small>
      </div>
    </section>

    <section class="watch-spotlight">
      <div>
        <span class="eyebrow">OPPORTUNITY PAIRING</span>
        <h3>${escapeMarkup(opportunity.title)}</h3>
        <p>${escapeMarkup(opportunity.summary)}</p>
      </div>
      <strong style="color:${scoreColor(opportunity.score)}">${opportunity.score}</strong>
    </section>

    <section class="watch-grid">
      <article>
        <h3>重点观察事件</h3>
        <div class="watch-event-list">
          ${items
            .slice()
            .sort((a, b) => b.score - a.score)
            .map(
              (event) => `
                <div class="watch-event-card">
                  <button data-watch-focus="${escapeMarkup(event.id)}" type="button">
                    <span class="risk-score ${scoreClass(event.score)}">${event.score}</span>
                    <span>
                      <small>${escapeMarkup(event.categoryLabel)} · ${escapeMarkup(event.time)}</small>
                      <strong>${escapeMarkup(event.title)}</strong>
                      <em>${escapeMarkup(insightFor(event).horizon)} · ${escapeMarkup(event.route)}</em>
                    </span>
                  </button>
                  <div>
                    ${eventSourceUrl(event) ? `<a href="${escapeMarkup(eventSourceUrl(event))}" target="_blank" rel="noreferrer">原文 ↗</a>` : ""}
                    <button data-watch-remove="${escapeMarkup(event.id)}" type="button">移除</button>
                  </div>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>

      <article>
        <h3>自动提醒规则</h3>
        <div class="watch-rule-list">
          ${nextItems
            .map(
              (event) => `
                <div>
                  <span>${event.score >= 80 ? "严重风险" : "重点跟踪"}</span>
                  <strong>${escapeMarkup(event.title)}</strong>
                  <small>${escapeMarkup(watchActionFor(event).join(" · "))}</small>
                </div>
              `,
            )
            .join("")}
        </div>
        <h3>关联资产 / 指标</h3>
        <div class="watch-chip-board">
          ${assets.map((item) => `<span>${escapeMarkup(item.name)}<b>${item.count}</b></span>`).join("")}
        </div>
        <h3>路线与区域</h3>
        <div class="watch-chip-board">
          ${[...routes, ...countries].map((item) => `<span>${escapeMarkup(item.name)}<b>${item.count}</b></span>`).join("")}
        </div>
      </article>
    </section>

    <footer class="watch-panel-footer">
      <span>${missingCount ? `${missingCount} 条旧观察项未出现在当前实时范围内 · ` : ""}日/周/月切换后会按当前范围重算</span>
      <button data-watch-clear type="button">清空观察</button>
    </footer>
  `;
}

function openWatchPanel() {
  state.watchPanelOpen = true;
  renderWatchPanel();
}

function closeWatchPanel() {
  state.watchPanelOpen = false;
  renderWatchPanel();
}

renderWatchCount = function renderWatchCountUpgraded() {
  el("watch-count").textContent = watchedEvents().length;
  if (state.watchPanelOpen) renderWatchPanel();
};

el("watch-button").addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    openWatchPanel();
  },
  true,
);

document.addEventListener("click", (event) => {
  const closeTarget = event.target.closest("[data-watch-close]");
  if (closeTarget) {
    closeWatchPanel();
    return;
  }

  const addSelectedTarget = event.target.closest("[data-watch-add-selected]");
  if (addSelectedTarget) {
    state.watchlist.add(selectedEvent().id);
    renderWatchCount();
    renderEventList();
    renderSelectedEvent();
    showToast("已加入观察列表");
    return;
  }

  const focusTarget = event.target.closest("[data-watch-focus]");
  if (focusTarget) {
    selectEvent(focusTarget.dataset.watchFocus);
    closeWatchPanel();
    return;
  }

  const removeTarget = event.target.closest("[data-watch-remove]");
  if (removeTarget) {
    state.watchlist.delete(removeTarget.dataset.watchRemove);
    renderWatchCount();
    renderEventList();
    renderSelectedEvent();
    showToast("已移出观察列表");
    return;
  }

  const clearTarget = event.target.closest("[data-watch-clear]");
  if (clearTarget) {
    state.watchlist.clear();
    renderWatchCount();
    renderEventList();
    renderSelectedEvent();
    showToast("观察列表已清空");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.watchPanelOpen) closeWatchPanel();
});

renderWatchCount();

function matrixCell(value, inverse = true) {
  const color = inverse ? scoreColor(value) : value >= 78 ? "var(--teal)" : value >= 65 ? "var(--amber)" : "var(--muted)";
  return `<td><span class="matrix-score" style="--score-color:${color}; --score-width:${value}%"><b>${value}</b><i></i></span></td>`;
}

function renderMatrixTab() {
  return `
    <div class="panel-intro">
      <div><span class="eyebrow">COUNTRY × SECTOR SCREENING</span><h3>国家—行业风险与机会筛选</h3></div>
      <p>综合政治、制裁、汇率、物流和产业机会信号，适用于投资目的地与供应链备选地初筛。</p>
    </div>
    <table class="data-table matrix-table">
      <thead><tr><th>国家</th><th>行业</th><th>政治风险</th><th>制裁风险</th><th>汇率风险</th><th>物流风险</th><th>政策支持</th><th>机会分</th></tr></thead>
      <tbody>
        ${countrySectorMatrix
          .map(
            (row) => `<tr><td><strong>${row[0]}</strong></td><td>${row[1]}</td>${matrixCell(row[2])}${matrixCell(row[3])}${matrixCell(row[4])}${matrixCell(row[5])}${matrixCell(row[6], false)}${matrixCell(row[7], false)}</tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderOpportunityTab() {
  return `
    <div class="panel-intro">
      <div><span class="eyebrow">INVESTMENT & TRADE OPPORTUNITY</span><h3>由风险事件触发的机会信号</h3></div>
      <p>机会分不是收益预测，而是对政策支持、供应链替代和需求强度的可解释初筛。</p>
    </div>
    <div class="opportunity-grid">
      ${opportunities
        .map(
          (item) => `
            <article class="opportunity-card">
              <header><div><span>${item.horizon}</span><h3>${item.title}</h3></div><strong>${item.score}</strong></header>
              <div class="opportunity-bar"><i style="width:${item.score}%"></i></div>
              <p><b>驱动：</b>${item.driver}</p>
              <p><b>行动：</b>${item.action}</p>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderScenarioTab() {
  return `
    <div class="panel-intro">
      <div><span class="eyebrow">SCENARIO ENGINE</span><h3>重点情景压力测试</h3></div>
      <p>围绕触发条件、暴露对象和行动预案，帮助团队把新闻风险转化为可执行准备。</p>
    </div>
    <div class="scenario-grid">
      ${scenarios
        .map(
          (item) => `
            <article class="scenario-card">
              <header><div><span>发生概率 · ${item.probability}</span><h3>${item.title}</h3></div><strong style="color:${scoreColor(item.severity)}">${item.severity}</strong></header>
              <dl>
                <div><dt>触发条件</dt><dd>${item.trigger}</dd></div>
                <div><dt>主要暴露</dt><dd>${item.exposure}</dd></div>
                <div><dt>建议动作</dt><dd>${item.response}</dd></div>
              </dl>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

state.aiRoboticsFilter = state.aiRoboticsFilter || "all";
state.selectedAiSignalId = state.selectedAiSignalId || aiRoboticsSignals[0].id;

function aiSignalMatchesFilter(signal) {
  if (state.aiRoboticsFilter === "all") return true;
  const mapping = {
    compute: ["算力", "芯片", "基础设施"],
    robotics: ["机器人", "自动化", "供应链"],
    policy: ["治理", "监管", "政策"],
    investment: ["人形", "基础设施", "工业机器人"],
  };
  return (mapping[state.aiRoboticsFilter] || []).some((keyword) => signal.domain.includes(keyword) || signal.title.includes(keyword));
}

function renderAiRoboticsTab() {
  const filteredSignals = aiRoboticsSignals.filter(aiSignalMatchesFilter);
  const selected =
    filteredSignals.find((signal) => signal.id === state.selectedAiSignalId) ||
    filteredSignals[0] ||
    aiRoboticsSignals[0];
  state.selectedAiSignalId = selected.id;
  const linkedEvent = events.find((event) => event.id === selected.eventId);

  return `
    <div class="ai-radar">
      <div class="ai-radar-header">
        <div>
          <span class="eyebrow">AI & ROBOTICS INTELLIGENCE</span>
          <h3>AI 与机器人产业情报雷达</h3>
          <p>跟踪算力、核心部件、机器人量产、政策合规和产业投资信号，并关联全球事件影响。</p>
        </div>
        <div class="ai-radar-metrics">
          <div><span>算力供应风险</span><strong class="negative">87</strong><small>出口许可与电力瓶颈</small></div>
          <div><span>机器人景气度</span><strong class="positive">74</strong><small>订单与场景持续改善</small></div>
          <div><span>核心部件风险</span><strong class="status-high">78</strong><small>磁材与精密部件集中</small></div>
          <div><span>投资机会热度</span><strong class="positive">82</strong><small>人形机器人与基础设施</small></div>
        </div>
      </div>

      <div class="ai-radar-toolbar">
        <div class="ai-filter-group">
          ${[
            ["all", "全部信号"],
            ["compute", "算力与芯片"],
            ["robotics", "机器人"],
            ["policy", "政策合规"],
            ["investment", "投资机会"],
          ]
            .map(
              ([id, label]) =>
                `<button class="ai-filter ${state.aiRoboticsFilter === id ? "active" : ""}" data-ai-filter="${id}" type="button">${label}</button>`,
            )
            .join("")}
        </div>
        <span>共 ${filteredSignals.length} 条重点信号 · 点击信号查看影响链</span>
      </div>

      <div class="ai-radar-body">
        <div class="ai-signal-list">
          ${filteredSignals
            .map(
              (signal) => `
                <button class="ai-signal ${signal.id === selected.id ? "active" : ""}" data-ai-signal="${signal.id}" type="button">
                  <span class="ai-signal-score" style="color:${scoreColor(signal.score)}">${signal.score}</span>
                  <span>
                    <span class="ai-signal-meta">${signal.domain} · ${signal.region}</span>
                    <strong>${signal.title}</strong>
                    <small>${signal.status} · ${signal.direction}</small>
                  </span>
                </button>
              `,
            )
            .join("")}
        </div>

        <article class="ai-signal-detail">
          <header>
            <div>
              <span class="eyebrow">${selected.domain.toUpperCase()} · ${selected.region}</span>
              <h3>${selected.title}</h3>
            </div>
            <strong style="color:${scoreColor(selected.score)}">${selected.score}</strong>
          </header>
          <p>${selected.summary}</p>
          <div class="ai-detail-grid">
            <section>
              <h4>重点暴露环节</h4>
              <div class="entity-chips">${selected.companies.map((item) => `<span class="entity sector">${item}</span>`).join("")}</div>
            </section>
            <section>
              <h4>需要跟踪的指标</h4>
              <ul>${selected.indicators.map((item) => `<li>${item}</li>`).join("")}</ul>
            </section>
          </div>
          ${
            linkedEvent
              ? `<button class="open-linked-event" data-ai-open-event="${linkedEvent.id}" type="button"><span>查看关联全球事件</span><strong>${linkedEvent.title}</strong><b>风险 ${linkedEvent.score} →</b></button>`
              : ""
          }
        </article>

        <div class="ai-dependency-grid">
          <div><span>AI 加速器 / HBM</span><strong class="negative">高风险</strong><small>出口许可、先进封装、供给集中</small></div>
          <div><span>电力 / 变压器 / 液冷</span><strong class="positive">高机会</strong><small>算力基础设施需求外溢</small></div>
          <div><span>精密减速器 / 丝杠</span><strong class="status-high">重点跟踪</strong><small>人形机器人量产瓶颈</small></div>
          <div><span>伺服电机 / 稀土永磁</span><strong class="negative">供应风险</strong><small>原料与高性能部件集中</small></div>
          <div><span>机器视觉 / 传感器</span><strong class="positive">景气改善</strong><small>智能工厂与机器人渗透</small></div>
          <div><span>AI 治理 / 合规服务</span><strong class="positive">需求上行</strong><small>欧盟 AI 法规进入实施阶段</small></div>
        </div>
      </div>
    </div>
  `;
}

state.physicalAiFilter = state.physicalAiFilter || "all";
state.selectedPhysicalAiSignalId = state.selectedPhysicalAiSignalId || physicalAiSignals[0].id;

function physicalAiSignalMatchesFilter(signal) {
  if (state.physicalAiFilter === "all") return true;
  const mapping = {
    embodiment: ["具身", "世界模型", "VLA"],
    simulation: ["仿真", "数据", "数字孪生"],
    edge: ["边缘", "端侧", "控制器"],
    safety: ["安全", "认证", "责任"],
    ops: ["现场", "运营", "编排", "调度"],
  };
  return (mapping[state.physicalAiFilter] || []).some((keyword) => signal.domain.includes(keyword) || signal.title.includes(keyword));
}

function linkedEventForPhysicalSignal(signal) {
  const direct = events.find((event) => event.id === signal.eventId);
  if (direct) return direct;
  const keywords = signal.keywords || [];
  return (
    events.find((event) => {
      if (!["physical-ai", "ai-robotics"].includes(event.category)) return false;
      const corpus = [event.title, event.summary, event.categoryLabel, event.route, ...event.sectors, ...event.commodities].join(" ");
      return keywords.some((keyword) => corpus.includes(keyword));
    }) || events.find((event) => event.category === "physical-ai")
  );
}

function renderPhysicalAiTab() {
  const filteredSignals = physicalAiSignals.filter(physicalAiSignalMatchesFilter);
  const selected =
    filteredSignals.find((signal) => signal.id === state.selectedPhysicalAiSignalId) ||
    filteredSignals[0] ||
    physicalAiSignals[0];
  state.selectedPhysicalAiSignalId = selected.id;
  const linkedEvent = linkedEventForPhysicalSignal(selected);

  return `
    <div class="ai-radar physical-ai-radar">
      <div class="ai-radar-header physical-ai-header">
        <div>
          <span class="eyebrow">PHYSICAL AI EXECUTION LAYER</span>
          <h3>物理AI产业执行层雷达</h3>
          <p>跟踪具身模型、仿真训练、边缘推理、机器人本体、安全认证和现场运营，把 AI 从屏幕带到真实世界的动作闭环。</p>
        </div>
        <div class="ai-radar-metrics">
          <div><span>具身模型成熟度</span><strong class="positive">84</strong><small>VLA 与技能复用加速</small></div>
          <div><span>场景落地强度</span><strong class="positive">81</strong><small>工厂、仓储与巡检优先</small></div>
          <div><span>硬件瓶颈压力</span><strong class="status-high">78</strong><small>边缘芯片、传感器与执行器</small></div>
          <div><span>安全合规压力</span><strong class="negative">73</strong><small>认证、审计与远程接管前置</small></div>
        </div>
      </div>

      <div class="ai-radar-toolbar">
        <div class="ai-filter-group">
          ${[
            ["all", "全部"],
            ["embodiment", "具身模型"],
            ["simulation", "仿真数据"],
            ["edge", "边缘推理"],
            ["safety", "安全合规"],
            ["ops", "现场运营"],
          ]
            .map(
              ([id, label]) =>
                `<button class="ai-filter ${state.physicalAiFilter === id ? "active" : ""}" data-physical-ai-filter="${id}" type="button">${label}</button>`,
            )
            .join("")}
        </div>
        <span>共 ${filteredSignals.length} 条物理AI信号 · 从模型能力看到真实场景落地</span>
      </div>

      <div class="ai-radar-body physical-ai-body">
        <div class="ai-signal-list">
          ${filteredSignals
            .map(
              (signal) => `
                <button class="ai-signal ${signal.id === selected.id ? "active" : ""}" data-physical-ai-signal="${signal.id}" type="button">
                  <span class="ai-signal-score" style="color:${scoreColor(signal.score)}">${signal.score}</span>
                  <span>
                    <span class="ai-signal-meta">${signal.domain} · ${signal.region}</span>
                    <strong>${signal.title}</strong>
                    <small>${signal.status} · ${signal.direction}</small>
                  </span>
                </button>
              `,
            )
            .join("")}
        </div>

        <article class="ai-signal-detail physical-ai-detail">
          <header>
            <div>
              <span class="eyebrow">${selected.domain.toUpperCase()} · ${selected.region}</span>
              <h3>${selected.title}</h3>
            </div>
            <strong style="color:${scoreColor(selected.score)}">${selected.score}</strong>
          </header>
          <p>${selected.summary}</p>
          <div class="physical-ai-loop" aria-label="物理AI能力闭环">
            ${["感知", "理解", "规划", "执行", "反馈"].map((step, index) => `<span><b>${index + 1}</b>${step}</span>`).join("")}
          </div>
          <div class="ai-detail-grid">
            <section>
              <h4>重点暴露环节</h4>
              <div class="entity-chips">${selected.companies.map((item) => `<span class="entity sector">${item}</span>`).join("")}</div>
            </section>
            <section>
              <h4>需要跟踪的指标</h4>
              <ul>${selected.indicators.map((item) => `<li>${item}</li>`).join("")}</ul>
            </section>
          </div>
          ${
            linkedEvent
              ? `<button class="open-linked-event" data-ai-open-event="${linkedEvent.id}" type="button"><span>查看关联全球事件</span><strong>${linkedEvent.title}</strong><b>风险 ${linkedEvent.score} →</b></button>`
              : ""
          }
        </article>

        <div class="ai-dependency-grid physical-ai-stack">
          ${physicalAiStack
            .map(
              ([name, status, note]) => `
                <div>
                  <span>${name}</span>
                  <strong>${status}</strong>
                  <small>${note}</small>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

state.industryPulseFilter = state.industryPulseFilter || "all";
state.selectedIndustryPulseId = state.selectedIndustryPulseId || industryPulseItems[0].id;

function industryPulseMatchesFilter(item) {
  return state.industryPulseFilter === "all" || item.domainId === state.industryPulseFilter;
}

function relatedEventForIndustryItem(item) {
  const keywords = item.eventKeywords || item.tags || [item.company, item.domain];
  return (
    events.find((event) => item.sourceUrl && event.sourceUrl === item.sourceUrl) ||
    events.find((event) => {
      const corpus = [event.title, event.summary, event.categoryLabel, event.route, ...event.countries, ...event.sectors, ...event.commodities].join(" ");
      const normalizedCorpus = corpus.toLowerCase();
      return keywords.some((keyword) => keyword && normalizedCorpus.includes(String(keyword).toLowerCase()));
    }) ||
    events.find((event) => ["ai-robotics", "physical-ai"].includes(event.category))
  );
}

function industryDomainStats() {
  const knownIds = new Set(industryPulseDomains.map((item) => item.id));
  const dynamicDomains = industryPulseItems
    .filter((item) => item.domainId && !knownIds.has(item.domainId))
    .map((item) => ({ id: item.domainId, label: item.domain || item.domainId, hint: "实时归类" }));
  return [...industryPulseDomains, ...dynamicDomains].map(({ id, label, hint }) => {
    const items = industryPulseItems.filter((item) => item.domainId === id);
    const average = items.length ? Math.round(items.reduce((sum, item) => sum + Number(item.score || 0), 0) / items.length) : 0;
    const latest = items
      .slice()
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];
    return { id, label, hint, count: items.length, average, latest };
  });
}

function renderIndustryPulseTab() {
  const filteredItems = industryPulseItems.filter(industryPulseMatchesFilter);
  const selected =
    filteredItems.find((item) => item.id === state.selectedIndustryPulseId) ||
    filteredItems[0] ||
    industryPulseItems[0];
  state.selectedIndustryPulseId = selected.id;
  const relatedEvent = relatedEventForIndustryItem(selected);
  const stats = industryDomainStats();
  const metricStats = stats
    .filter((item) => item.count)
    .sort((a, b) => b.count - a.count || b.average - a.average)
    .slice(0, 6);
  const visibleMetricStats = metricStats.length ? metricStats : stats.slice(0, 6);
  const filterOptions = [{ id: "all", label: "全部", count: industryPulseItems.length }, ...stats];
  const companyItems = industryPulseItems
    .filter((item) => item.company && item.company !== "行业")
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .slice(0, 8);

  return `
    <div class="industry-pulse">
      <div class="industry-pulse-header">
        <div>
          <span class="eyebrow">REAL-TIME INDUSTRY & COMPANY PULSE</span>
          <h3>科技产业与企业实时动态</h3>
          <p>把宏观事件流之外的行业新闻、代表性公司动作、产品发布、订单、融资、监管和供应链信号单独拉出来，覆盖 AI、机器人、物理AI、芯片、云、安全、智能汽车、量子、航天防务、消费电子、生物科技和金融科技。</p>
        </div>
        <div class="industry-pulse-metrics">
          ${visibleMetricStats
            .map(
              (item) => `
                <div>
                  <span>${item.label}</span>
                  <strong class="${item.average >= 80 ? "positive" : item.average >= 70 ? "status-high" : ""}">${item.average || "—"}</strong>
                  <small>${item.count} 条 · ${escapeMarkup(item.hint || "实时动态")}</small>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>

      <div class="industry-toolbar">
        <div class="ai-filter-group">
          ${filterOptions
            .map(
              (item) =>
                `<button class="ai-filter ${state.industryPulseFilter === item.id ? "active" : ""}" data-industry-filter="${item.id}" type="button">${item.label}<b>${item.count || 0}</b></button>`,
            )
            .join("")}
        </div>
        <span>${filteredItems.length} 条实时行业/企业动态 · 日/周/月同步筛选 · 可打开原文核验</span>
      </div>

      <div class="industry-body">
        <div class="industry-feed">
          ${filteredItems
            .map(
              (item) => `
                <button class="industry-card ${item.id === selected.id ? "active" : ""}" data-industry-id="${escapeMarkup(item.id)}" type="button">
                  <span class="industry-score" style="color:${scoreColor(item.score)}">${item.score}</span>
                  <span>
                    <span class="industry-meta">${escapeMarkup(item.domain)} · ${escapeMarkup(item.company || "行业")} · ${escapeMarkup(item.time || item.publishedAt || "实时")}</span>
                    <strong>${escapeMarkup(item.title)}</strong>
                    <small>${escapeMarkup(item.sentiment || item.type || "行业动态")} · ${escapeMarkup(item.source || "公开来源")}</small>
                  </span>
                </button>
              `,
            )
            .join("")}
        </div>

        <article class="industry-detail">
          <header>
            <div>
              <span class="eyebrow">${escapeMarkup(selected.domain)} · ${escapeMarkup(selected.region || "全球")}</span>
              <h3>${escapeMarkup(selected.title)}</h3>
            </div>
            <strong style="color:${scoreColor(selected.score)}">${selected.score}</strong>
          </header>
          <p>${escapeMarkup(selected.summary)}</p>
          <div class="industry-detail-grid">
            <section>
              <h4>公司 / 行业</h4>
              <div class="entity-chips">
                <span class="entity country">${escapeMarkup(selected.company || "行业动态")}</span>
                ${selected.ticker ? `<span class="entity sector">${escapeMarkup(selected.ticker)}</span>` : ""}
                <span class="entity route">${escapeMarkup(selected.type || "企业动态")}</span>
              </div>
            </section>
            <section>
              <h4>信号标签</h4>
              <div class="entity-chips">${(selected.tags || []).map((tag) => `<span class="entity commodity">${escapeMarkup(tag)}</span>`).join("")}</div>
            </section>
          </div>
          <div class="industry-actions">
            ${
              selected.sourceUrl
                ? `<a class="industry-source-link" href="${escapeMarkup(selected.sourceUrl)}" target="_blank" rel="noreferrer">打开原文 ↗</a>`
                : ""
            }
            ${
              relatedEvent
                ? `<button class="open-linked-event" data-ai-open-event="${relatedEvent.id}" type="button"><span>关联全球事件</span><strong>${escapeMarkup(relatedEvent.title)}</strong><b>风险 ${relatedEvent.score} →</b></button>`
                : ""
            }
          </div>
        </article>

        <aside class="industry-side">
          <section class="industry-sector-board">
            <h4>科技类别覆盖</h4>
            ${stats
              .map(
                (item) => `
                  <button class="${state.industryPulseFilter === item.id ? "active" : ""}" data-industry-filter="${item.id}" type="button">
                    <span>${escapeMarkup(item.label)}</span>
                    <strong>${item.count || 0}</strong>
                    <small>${escapeMarkup(item.latest?.company || item.hint || "等待实时信号")}</small>
                  </button>
                `,
              )
              .join("")}
          </section>
          <section class="company-watch-grid">
            ${companyItems
              .map(
                (item) => `
                  <div>
                    <span>${escapeMarkup(item.domain)}</span>
                    <strong>${escapeMarkup(item.company || "行业")}</strong>
                    <small>${escapeMarkup(item.sentiment || item.title)}</small>
                  </div>
                `,
              )
              .join("")}
          </section>
        </aside>
      </div>
    </div>
  `;
}

const ashareStrategyUniverse = [
  {
    id: "ai-compute",
    label: "AI算力 / 半导体",
    group: "hardtech",
    aShare: "国产算力、半导体设备、先进封装、PCB/光模块、电源与液冷",
    usImpact: "美股AI链的资本开支、芯片出口许可和云厂商指引会先影响全球风险偏好，再传导到A股算力链估值。",
    chinaImpact: "中国市场更看重国产替代订单、运营商集采、服务器交付与数据中心电力瓶颈的落地确认。",
    keywords: ["AI", "artificial intelligence", "NVIDIA", "GPU", "HBM", "semiconductor", "chip", "data center", "cloud", "算力", "芯片", "半导体", "服务器", "数据中心", "光模块", "液冷", "先进封装", "云计算"],
    confirm: ["海外云厂商资本开支指引", "国内服务器与运营商集采", "HBM、PCB、光模块订单能见度"],
  },
  {
    id: "robotics-physical-ai",
    label: "机器人 / 物理AI",
    group: "hardtech",
    aShare: "工业机器人、人形机器人、减速器、丝杠、伺服、电机、机器视觉与传感器",
    usImpact: "特斯拉、Figure AI、英伟达机器人平台与工业自动化订单会影响全球机器人叙事强度。",
    chinaImpact: "A股重点看量产节奏、核心零部件国产化率、整机出货和工厂场景验证，概念扩散后需要订单过滤。",
    keywords: ["robot", "robotics", "humanoid", "physical AI", "embodied AI", "automation", "Tesla", "Figure AI", "机器人", "人形机器人", "物理AI", "具身智能", "自动化", "减速器", "丝杠", "伺服", "机器视觉"],
    confirm: ["整机量产与交付公告", "核心零部件产能利用率", "工厂/仓储/巡检场景真实订单"],
  },
  {
    id: "power-datacenter",
    label: "电力设备 / 数据中心",
    group: "infrastructure",
    aShare: "变压器、储能、液冷、UPS、电源、温控、铜缆与电网设备",
    usImpact: "美国数据中心扩建、电网接入和电力短缺会支撑全球AI基础设施链条的二阶需求。",
    chinaImpact: "国内更关注东数西算、绿色电力、储能配套和大客户订单，利润弹性来自交付能力而非单纯概念。",
    keywords: ["power", "electricity", "grid", "datacenter", "data center", "cooling", "transformer", "liquid cooling", "电力", "电网", "变压器", "储能", "液冷", "温控", "数据中心", "东数西算", "UPS"],
    confirm: ["数据中心开工与电力接入", "变压器/温控/液冷订单", "铜价与毛利率变化"],
  },
  {
    id: "rare-metals",
    label: "稀土 / 工业金属",
    group: "resources",
    aShare: "稀土永磁、铜铝、钨钼、锂镍钴、回收与替代材料",
    usImpact: "美股硬科技、军工和新能源需求会强化关键矿产议题，出口管制会放大资源安全溢价。",
    chinaImpact: "A股更敏感于价格、配额、出口许可和下游补库节奏，资源股需要跟踪现货价与库存而不是只看新闻。",
    keywords: ["rare earth", "copper", "aluminum", "lithium", "nickel", "critical minerals", "magnet", "metal", "稀土", "永磁", "铜", "铝", "锂", "镍", "钨", "钼", "关键矿产", "金属"],
    confirm: ["现货价格与库存", "出口许可/配额变化", "下游磁材、电池与军工补库"],
  },
  {
    id: "ev-battery",
    label: "智能汽车 / 电池",
    group: "manufacturing",
    aShare: "整车、动力电池、固态电池、热管理、汽车电子、智能驾驶",
    usImpact: "美股电动车和自动驾驶链受关税、销量、软件订阅和特斯拉节奏影响较大。",
    chinaImpact: "中国市场看价格战边际变化、出口政策、电池材料成本和智能驾驶渗透率，需避开盈利继续下修的环节。",
    keywords: ["EV", "electric vehicle", "battery", "Tesla", "BYD", "CATL", "autonomous driving", "电动车", "智能汽车", "动力电池", "固态电池", "汽车电子", "自动驾驶", "新能源车", "电池"],
    confirm: ["月度销量与出口数据", "电池材料价格", "智能驾驶订单和装车率"],
  },
  {
    id: "export-consumer",
    label: "出口链 / 消费电子",
    group: "manufacturing",
    aShare: "消费电子、端侧AI、苹果链、家电、跨境电商、外贸制造",
    usImpact: "美国消费、关税和大型科技产品周期会影响海外需求和订单能见度。",
    chinaImpact: "A股关注汇率、库存周期、终端新品拉货和关税风险，外需改善需要订单验证。",
    keywords: ["Apple", "consumer", "smartphone", "PC", "wearable", "tariff", "export", "消费电子", "手机", "PC", "端侧AI", "苹果", "家电", "出口", "跨境电商", "关税"],
    confirm: ["品牌新品拉货节奏", "出口订单与PMI新出口订单", "人民币汇率和关税进展"],
  },
  {
    id: "shipping-energy",
    label: "航运 / 能源安全",
    group: "defensive",
    aShare: "油气、煤炭、电力、炼化、航运港口、保险与物流",
    usImpact: "油价、红海/霍尔木兹风险和通胀预期会直接影响美股周期、航空和消费板块。",
    chinaImpact: "中国市场一方面承受成本压力，另一方面油气、电力、航运和资源安全主题可能获得防守溢价。",
    keywords: ["oil", "energy", "LNG", "shipping", "port", "Suez", "Red Sea", "Hormuz", "freight", "原油", "能源", "天然气", "LNG", "航运", "港口", "红海", "霍尔木兹", "运费", "保险"],
    confirm: ["布伦特油价与成品油裂解价差", "集运/油运运价", "地缘冲突与航线复航公告"],
  },
  {
    id: "cyber-software",
    label: "网络安全 / 企业软件",
    group: "digital",
    aShare: "网络安全、信创、工业软件、数据要素、AI应用",
    usImpact: "美股软件估值受AI商业化、网络攻击事件和企业IT预算影响，风险偏好传导明显。",
    chinaImpact: "A股更看重政企预算、信创招标、数据安全合规和可复制的AI应用收入。",
    keywords: ["cybersecurity", "ransomware", "software", "enterprise AI", "cloud security", "data", "网络安全", "勒索", "软件", "信创", "数据安全", "企业AI", "工业软件", "数据要素"],
    confirm: ["政企招标与续费率", "重大安全事件", "AI应用收入和毛利率"],
  },
  {
    id: "defense-space",
    label: "防务 / 卫星低空",
    group: "defensive",
    aShare: "军工电子、卫星互联网、无人机、低空经济、遥感与边缘AI",
    usImpact: "美国防务科技、无人机和商业航天订单会强化全球安全支出主线。",
    chinaImpact: "A股关注订单兑现、军贸/民用场景扩展、低空政策落地和估值纪律。",
    keywords: ["defense", "drone", "satellite", "space", "Palantir", "Anduril", "防务", "军工", "无人机", "卫星", "低空", "遥感", "商业航天", "边缘AI"],
    confirm: ["政府采购与军贸订单", "低空空域与运营政策", "卫星/无人机交付进度"],
  },
  {
    id: "biotech-health",
    label: "生物科技 / AI医疗",
    group: "health",
    aShare: "创新药、AI制药、CXO、基因编辑、医疗器械",
    usImpact: "美股生物科技受FDA审批、并购和利率影响大，临床里程碑会带动风险偏好。",
    chinaImpact: "中国市场更看重医保谈判、出海授权、临床数据和现金流，AI制药需要商业验证。",
    keywords: ["biotech", "drug", "FDA", "clinical", "CRISPR", "AI drug", "生物科技", "创新药", "AI制药", "基因编辑", "临床", "医疗器械", "医保"],
    confirm: ["临床数据与审批节点", "BD授权和海外合作", "医保/集采政策变化"],
  },
];

state.ashareStrategyFilter = state.ashareStrategyFilter || "all";
state.selectedAshareThemeId = state.selectedAshareThemeId || ashareStrategyUniverse[0].id;

function clampScore(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizedSignalSources() {
  const eventSources = events.map((event) => ({
    id: event.id,
    type: "全球事件",
    title: event.title,
    summary: event.summary,
    category: event.categoryLabel || event.category,
    score: Number(event.score || 55),
    time: event.time || event.publishedAt || "实时",
    source: event.source || "公开来源",
    sourceUrl: eventSourceUrl(event),
    countries: event.countries || [],
    sectors: event.sectors || [],
    commodities: event.commodities || [],
    text: [event.title, event.summary, event.categoryLabel, event.route, ...(event.countries || []), ...(event.sectors || []), ...(event.commodities || [])].join(" "),
  }));
  const industrySources = industryPulseItems.map((item) => ({
    id: item.id,
    type: "产业企业",
    title: item.title,
    summary: item.summary,
    category: item.domain || item.type || "产业动态",
    score: Number(item.score || 58),
    time: item.time || item.publishedAt || "实时",
    source: item.source || "公开来源",
    sourceUrl: isHttpUrl(item.sourceUrl) ? item.sourceUrl : "",
    countries: item.region ? [item.region] : [],
    sectors: [item.domain, item.company, ...(item.tags || [])].filter(Boolean),
    commodities: [],
    text: [item.title, item.summary, item.domain, item.company, item.region, ...(item.tags || []), ...(item.eventKeywords || [])].join(" "),
  }));
  return [...eventSources, ...industrySources];
}

function keywordMatchScore(text, keywords) {
  const normalized = String(text || "").toLowerCase();
  return keywords.reduce((count, keyword) => {
    if (!keyword) return count;
    return normalized.includes(String(keyword).toLowerCase()) ? count + 1 : count;
  }, 0);
}

function marketBySymbol(symbol) {
  return markets.find((market) => market.symbol === symbol);
}

function marketChange(symbol) {
  const change = Number(marketBySymbol(symbol)?.change);
  return Number.isFinite(change) ? change : 0;
}

function marketValueLabel(symbol) {
  const market = marketBySymbol(symbol);
  if (!market) return "暂无";
  const sign = Number(market.change || 0) >= 0 ? "+" : "";
  return `${market.name} ${market.value} (${sign}${Number(market.change || 0).toFixed(2)}%)`;
}

function ashareRecommendations() {
  const sources = normalizedSignalSources();
  const spx = marketChange("SPX");
  const csi300 = marketChange("CSI300");
  const hsi = marketChange("HSI");
  const vix = marketChange("VIX");
  const usdCny = marketChange("USDCNY");
  const brent = marketChange("BRENT");
  const copper = marketChange("COPPER");
  const riskOff = Math.max(0, vix) * 4 + Math.max(0, usdCny) * 3 + Math.max(0, -spx) * 2;
  const chinaMarketPulse = csi300 * 4 + hsi * 2 - Math.max(0, usdCny) * 2;

  return ashareStrategyUniverse
    .map((theme) => {
      const matched = sources
        .map((source) => ({ source, matches: keywordMatchScore(source.text, theme.keywords) }))
        .filter((item) => item.matches)
        .sort((a, b) => b.matches - a.matches || b.source.score - a.source.score)
        .map((item) => item.source);
      const signalCount = matched.length;
      const averageSignal = signalCount ? matched.reduce((sum, item) => sum + item.score, 0) / signalCount : 52;
      const severeSignals = matched.filter((item) => item.score >= 80).length;
      const usHits = matched.filter((item) => /美国|U\.S\.|US|United States|NVIDIA|Tesla|Apple|Microsoft|OpenAI|Meta|Google/i.test(`${item.text} ${item.source}`)).length;
      const chinaHits = matched.filter((item) => /中国|China|A股|沪深|BYD|CATL|Huawei|Xiaomi|Unitree|UBTECH/i.test(`${item.text} ${item.source}`)).length;
      const commodityBoost = theme.group === "resources" ? Math.max(0, copper) * 5 : theme.id === "shipping-energy" ? Math.max(0, brent) * 4 : 0;
      const opportunity = clampScore(46 + signalCount * 5 + averageSignal * 0.28 + chinaMarketPulse + commodityBoost - riskOff * 0.18, 30, 96);
      const risk = clampScore(34 + averageSignal * 0.42 + severeSignals * 6 + riskOff + (theme.group === "defensive" ? -4 : 0), 25, 95);
      const usTransmission = clampScore(45 + usHits * 7 + Math.abs(spx) * 5 + riskOff * 0.6, 25, 96);
      const chinaTransmission = clampScore(46 + chinaHits * 7 + Math.abs(csi300) * 5 + Math.abs(hsi) * 2 + Math.max(0, usdCny) * 4, 25, 96);
      const stance =
        opportunity >= 80 && risk < 78
          ? "积极跟踪"
          : opportunity >= 72
            ? "分批观察"
            : risk >= 82
              ? "防守等待"
              : risk >= 74
                ? "降低预期"
                : "观察确认";
      const action =
        stance === "积极跟踪"
          ? "优先看订单、业绩和产能利用率已经验证的细分龙头，避免只追概念扩散。"
          : stance === "分批观察"
            ? "适合放入观察池，等价格回调、原文确认或市场量能改善后再提高权重。"
            : stance === "防守等待"
              ? "先控制仓位和估值假设，等待风险源缓和或盈利预期修复。"
              : "保持小样本跟踪，用更多实时信号确认趋势方向。";
      return {
        ...theme,
        signalCount,
        averageSignal: Math.round(averageSignal),
        opportunity,
        risk,
        usTransmission,
        chinaTransmission,
        stance,
        action,
        evidence: matched.slice(0, 5),
      };
    })
    .sort((a, b) => b.opportunity - a.opportunity || b.signalCount - a.signalCount);
}

function ashareFilteredRecommendations() {
  const recommendations = ashareRecommendations();
  const filter = state.ashareStrategyFilter;
  if (filter === "all") return recommendations;
  if (filter === "attack") return recommendations.filter((item) => item.opportunity >= 72);
  if (filter === "defense") return recommendations.filter((item) => item.risk >= 74 || item.group === "defensive");
  if (filter === "us") return recommendations.filter((item) => item.usTransmission >= 65);
  if (filter === "china") return recommendations.filter((item) => item.chinaTransmission >= 65);
  return recommendations.filter((item) => item.group === filter);
}

function syncAshareStrategyTabCount() {
  const tab = tabConfig.find((item) => item.id === "ashare-strategy");
  if (tab) tab.count = ashareRecommendations().filter((item) => item.signalCount || item.opportunity >= 65).length;
}

function renderAshareStrategyTab() {
  const allRecommendations = ashareRecommendations();
  const filtered = ashareFilteredRecommendations();
  const visibleRecommendations = filtered.length ? filtered : allRecommendations;
  const selected =
    visibleRecommendations.find((item) => item.id === state.selectedAshareThemeId) ||
    allRecommendations.find((item) => item.id === state.selectedAshareThemeId) ||
    visibleRecommendations[0] ||
    allRecommendations[0];
  state.selectedAshareThemeId = selected.id;
  const averageOpportunity = allRecommendations.length
    ? Math.round(allRecommendations.reduce((sum, item) => sum + item.opportunity, 0) / allRecommendations.length)
    : 0;
  const averageRisk = allRecommendations.length ? Math.round(allRecommendations.reduce((sum, item) => sum + item.risk, 0) / allRecommendations.length) : 0;
  const topOpportunities = allRecommendations.filter((item) => item.opportunity >= 72).length;
  const highRiskThemes = allRecommendations.filter((item) => item.risk >= 78).length;
  const sourceCount = normalizedSignalSources().length;
  const filters = [
    ["all", "全部"],
    ["attack", "进攻观察"],
    ["defense", "防守风险"],
    ["us", "美股传导"],
    ["china", "中国传导"],
    ["hardtech", "硬科技"],
    ["manufacturing", "制造出口"],
    ["resources", "资源"],
  ];

  return `
    <div class="ashare-strategy">
      <div class="ashare-header">
        <div>
          <span class="eyebrow">A-SHARE STRATEGY RADAR</span>
          <h3>A股实时策略观察</h3>
          <p>基于当前日/周/月范围内的实时全球新闻、产业动态、企业新闻和市场行情，生成对 A股板块、美股传导与中国市场传导的研究型建议。</p>
        </div>
        <div class="ashare-metrics">
          <div><span>机会温度</span><strong class="positive">${averageOpportunity}</strong><small>${topOpportunities} 个主题进入观察区</small></div>
          <div><span>风险压力</span><strong style="color:${scoreColor(averageRisk)}">${averageRisk}</strong><small>${highRiskThemes} 个主题需要降预期</small></div>
          <div><span>实时信号</span><strong>${sourceCount}</strong><small>事件 + 产业企业 + 行情</small></div>
          <div><span>市场锚点</span><strong>${marketChange("CSI300") >= 0 ? "偏暖" : "承压"}</strong><small>${marketValueLabel("CSI300")}</small></div>
        </div>
      </div>

      <div class="ashare-toolbar">
        <div class="ai-filter-group">
          ${filters
            .map(
              ([id, label]) =>
                `<button class="ai-filter ${state.ashareStrategyFilter === id ? "active" : ""}" data-ashare-filter="${id}" type="button">${label}</button>`,
            )
            .join("")}
        </div>
        <span>研究提示：这是基于公开实时信号的板块筛选，不构成个股买卖建议。</span>
      </div>

      <div class="ashare-body">
        <div class="ashare-list">
          ${visibleRecommendations
            .map(
              (item) => `
                <button class="ashare-theme ${item.id === selected.id ? "active" : ""}" data-ashare-theme="${escapeMarkup(item.id)}" type="button">
                  <span class="ashare-score" style="color:${scoreColor(item.opportunity)}">${item.opportunity}</span>
                  <span>
                    <span class="ashare-meta">${item.stance} · 风险 ${item.risk} · ${item.signalCount} 条信号</span>
                    <strong>${escapeMarkup(item.label)}</strong>
                    <small>${escapeMarkup(item.aShare)}</small>
                  </span>
                </button>
              `,
            )
            .join("")}
        </div>

        <article class="ashare-detail">
          <header>
            <div>
              <span class="eyebrow">${selected.group.toUpperCase()} · ${selected.signalCount} LIVE SIGNALS</span>
              <h3>${escapeMarkup(selected.label)}</h3>
            </div>
            <strong style="color:${scoreColor(selected.opportunity)}">${selected.opportunity}</strong>
          </header>
          <div class="ashare-stance-row">
            <span>${escapeMarkup(selected.stance)}</span>
            <b>风险 ${selected.risk}</b>
            <b>美股传导 ${selected.usTransmission}</b>
            <b>中国传导 ${selected.chinaTransmission}</b>
          </div>
          <p>${escapeMarkup(selected.action)}</p>
          <div class="ashare-impact-grid">
            <section>
              <h4>A股关注方向</h4>
              <p>${escapeMarkup(selected.aShare)}</p>
            </section>
            <section>
              <h4>对美股的未来影响</h4>
              <p>${escapeMarkup(selected.usImpact)}</p>
            </section>
            <section>
              <h4>对中国股市的未来影响</h4>
              <p>${escapeMarkup(selected.chinaImpact)}</p>
            </section>
            <section>
              <h4>需要确认的指标</h4>
              <ul>${selected.confirm.map((item) => `<li>${escapeMarkup(item)}</li>`).join("")}</ul>
            </section>
          </div>
        </article>

        <aside class="ashare-evidence">
          <section>
            <h4>实时证据链</h4>
            ${
              selected.evidence.length
                ? selected.evidence
                    .map(
                      (item) => `
                        <div class="ashare-evidence-item">
                          <span>${escapeMarkup(item.type)} · ${escapeMarkup(item.time)} · 风险 ${item.score}</span>
                          <strong>${escapeMarkup(item.title)}</strong>
                          <small>${escapeMarkup(item.category)} · ${escapeMarkup(item.source)}</small>
                          ${
                            item.sourceUrl
                              ? `<a href="${escapeMarkup(item.sourceUrl)}" target="_blank" rel="noreferrer">打开原文 ↗</a>`
                              : ""
                          }
                        </div>
                      `,
                    )
                    .join("")
                : `<div class="ashare-empty"><strong>当前范围信号不足</strong><p>切换到周/月，或等待实时源同步更多产业与企业新闻。</p></div>`
            }
          </section>
          <section class="ashare-market-board">
            <h4>市场变量</h4>
            ${["SPX", "CSI300", "HSI", "USDCNY", "VIX", "BRENT", "COPPER"]
              .map(
                (symbol) => `
                  <div>
                    <span>${marketBySymbol(symbol)?.name || symbol}</span>
                    <strong class="${marketChange(symbol) >= 0 ? "positive" : "negative"}">${marketChange(symbol) >= 0 ? "+" : ""}${marketChange(symbol).toFixed(2)}%</strong>
                  </div>
                `,
              )
              .join("")}
          </section>
        </aside>
      </div>
    </div>
  `;
}

renderTabs = function renderTabsUpgraded() {
  syncAshareStrategyTabCount();
  el("dock-tabs").innerHTML = tabConfig
    .map(
      (tab) =>
        `<button class="tab-button ${state.activeTab === tab.id ? "active" : ""}" data-tab="${tab.id}" type="button">${tab.label}<b>${tab.count}</b></button>`,
    )
    .join("");
  const renders = {
    markets: renderMarketTab,
    policy: renderPolicyTab,
    supply: renderSupplyTab,
    sanctions: renderSanctionsTab,
    brief: renderBriefTab,
    "industry-pulse": renderIndustryPulseTab,
    "ai-robotics": renderAiRoboticsTab,
    "physical-ai": renderPhysicalAiTab,
    matrix: renderMatrixTab,
    opportunities: renderOpportunityTab,
    "ashare-strategy": renderAshareStrategyTab,
    scenarios: renderScenarioTab,
  };
  el("dock-content").innerHTML = (renders[state.activeTab] || renderMarketTab)();
};

let geoMap;
let geoLayers = {};
let fallbackScale = 1;
const layerState = { events: true, routes: true, chokepoints: true, ports: false, sanctions: false, industry: false, heatmap: false };

function leafletColor(score) {
  return score >= 80 ? "#f06f62" : score >= 65 ? "#f3b44b" : "#58d5bc";
}

function geoTooltipMarkup(title, meta, route = "", commodities = null) {
  const commoditiesLine =
    Array.isArray(commodities) && commodities.length
      ? `<span class="geo-tooltip-commodities">主要商品：${escapeMarkup(commodities.join(" / "))}</span>`
      : "";
  return `
    <span class="geo-tooltip">
      <strong>${escapeMarkup(title)}</strong>
      <span class="geo-tooltip-meta">${escapeMarkup(meta)}</span>
      ${route ? `<span class="geo-tooltip-route">${escapeMarkup(route)}</span>` : ""}
      ${commoditiesLine}
    </span>
  `;
}

function initializeGeoMap() {
  if (typeof L === "undefined") return;
  try {
    geoMap = L.map("leaflet-map", {
      center: [18, 15],
      zoom: 2,
      minZoom: 1,
      maxZoom: 7,
      zoomControl: false,
      worldCopyJump: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: "&copy; OpenStreetMap &copy; CARTO",
    }).addTo(geoMap);
    el("map-canvas").classList.add("leaflet-ready");
    renderGeoLayers();
    window.setTimeout(() => geoMap.invalidateSize(), 150);
  } catch (error) {
    console.warn("Interactive map fallback active", error);
  }
}

function renderGeoLayers() {
  if (!geoMap) return;
  Object.values(geoLayers).forEach((layer) => geoMap.removeLayer(layer));
  geoLayers = {};

  if (layerState.routes) {
    geoLayers.routes = L.layerGroup(
      routeGeography.map((route) =>
        L.polyline(route.points, {
          color: leafletColor(route.score),
          weight: route.score >= 80 ? 2.4 : 1.8,
          opacity: 0.75,
          dashArray: "7 7",
          className: "trade-route-line",
        }).bindTooltip(geoTooltipMarkup(route.name, `路线风险 ${route.score}`, route.reason, route.commodities), {
          sticky: true,
          className: "geo-map-tooltip",
        }),
      ),
    ).addTo(geoMap);
  }

  if (layerState.events) {
    const visibleIds = new Set(filteredEvents().map((event) => event.id));
    const eventMarkers = events
      .filter((event) => visibleIds.has(event.id))
      .map((event) => {
        const marker = L.circleMarker([event.lat, event.lon], {
          radius: event.id === state.selectedEventId ? 8 : Math.max(4.5, event.score / 14),
          color: "#f4f7f5",
          weight: event.id === state.selectedEventId ? 2 : 1,
          fillColor: leafletColor(event.score),
          fillOpacity: 0.92,
          riskScore: event.score,
          className: event.id === state.selectedEventId ? "selected-geo-event" : "geo-event",
        });
        marker.bindTooltip(geoTooltipMarkup(event.title, `${event.categoryLabel} · 风险 ${event.score}`, event.route), {
          sticky: true,
          className: "geo-map-tooltip",
        });
        marker.on("click", () => {
          selectEvent(event.id);
          geoMap.flyTo([event.lat, event.lon], Math.max(geoMap.getZoom(), 3), { duration: 0.45 });
        });
        return marker;
      });
    geoLayers.events =
      typeof L.markerClusterGroup === "function"
        ? L.markerClusterGroup({
            maxClusterRadius: 42,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            iconCreateFunction(cluster) {
              const childMarkers = cluster.getAllChildMarkers();
              const avgScore = childMarkers.length
                ? Math.round(childMarkers.reduce((sum, marker) => sum + Number(marker.options.riskScore || 60), 0) / childMarkers.length)
                : 60;
              return L.divIcon({
                html: `<span style="background:${leafletColor(avgScore)}">${cluster.getChildCount()}</span>`,
                className: "geo-cluster-icon",
                iconSize: L.point(34, 34),
              });
            },
          }).addLayers(eventMarkers)
        : L.layerGroup(eventMarkers);
    geoLayers.events.addTo(geoMap);
  }

  if (layerState.chokepoints) {
    geoLayers.chokepoints = L.layerGroup(
      chokepoints.map((node) =>
        L.circleMarker([node.lat, node.lon], {
          radius: 5,
          color: leafletColor(node.score),
          weight: 2,
          fillColor: "#0d1213",
          fillOpacity: 1,
          className: "chokepoint-node",
        }).bindTooltip(`<strong>${node.name}</strong><br>风险 ${node.score} · ${node.note}`, { direction: "top" }),
      ),
    ).addTo(geoMap);
  }

  if (layerState.ports) {
    geoLayers.ports = L.layerGroup(
      strategicPorts.map((port) =>
        L.circleMarker([port.lat, port.lon], {
          radius: 4,
          color: "#70aef3",
          weight: 2,
          fillColor: "#0d1213",
          fillOpacity: 1,
          className: "port-node",
        }).bindTooltip(`<strong>${port.name}</strong><br>${port.note}`, { direction: "top" }),
      ),
    ).addTo(geoMap);
  }

  if (layerState.sanctions) {
    const seen = {};
    geoLayers.sanctions = L.layerGroup(
      sanctions
        .map((row) => {
          const [name, country, program, action, sectors, date, score] = row;
          const base = countryCoord(country);
          if (!base) return null;
          seen[country] = (seen[country] || 0) + 1;
          const offset = (seen[country] - 1) * 1.6;
          const angle = ((seen[country] - 1) * 47 * Math.PI) / 180;
          const lat = base[0] + offset * Math.cos(angle);
          const lon = base[1] + offset * Math.sin(angle);
          return L.circleMarker([lat, lon], {
            radius: 6,
            color: "#f06f62",
            weight: 2,
            fillColor: "#06231d",
            fillOpacity: 0.85,
            dashArray: "2 3",
            className: "sanction-node",
          }).bindTooltip(
            `<strong>${escapeMarkup(name)}</strong><br>${escapeMarkup(country)} · ${escapeMarkup(program)} · ${escapeMarkup(action)}<br>涉及行业：${escapeMarkup(sectors)}<br>生效日期：${escapeMarkup(date)} · 风险 ${score}`,
            { direction: "top", className: "geo-map-tooltip" },
          );
        })
        .filter(Boolean),
    ).addTo(geoMap);
  }

  if (layerState.industry) {
    const seen = {};
    geoLayers.industry = L.layerGroup(
      industryPulseItems
        .map((item) => {
          const primaryRegion = String(item.region || "").split(/[\/、,，\s]/)[0].trim();
          const base = countryCoord(primaryRegion) || countryCoord(item.region);
          if (!base) return null;
          const key = primaryRegion || item.region;
          seen[key] = (seen[key] || 0) + 1;
          const offset = (seen[key] - 1) * 1.4;
          const angle = ((seen[key] - 1) * 63 * Math.PI) / 180;
          const lat = base[0] + offset * Math.cos(angle);
          const lon = base[1] + offset * Math.sin(angle);
          return L.circleMarker([lat, lon], {
            radius: 4.5,
            color: "#9b8cff",
            weight: 1.5,
            fillColor: "#1c1633",
            fillOpacity: 0.9,
            className: "industry-node",
          }).bindTooltip(
            `<strong>${escapeMarkup(item.title)}</strong><br>${escapeMarkup(item.domain)} · ${escapeMarkup(item.company || "行业")}<br>${escapeMarkup(item.source || "公开来源")} · ${escapeMarkup(item.time || "实时")}`,
            { direction: "top", className: "geo-map-tooltip" },
          );
        })
        .filter(Boolean),
    ).addTo(geoMap);
  }

  if (layerState.heatmap && typeof L.heatLayer === "function") {
    const visibleIds = new Set(filteredEvents().map((event) => event.id));
    const heatPoints = events
      .filter((event) => visibleIds.has(event.id) && Number.isFinite(event.lat) && Number.isFinite(event.lon))
      .map((event) => [event.lat, event.lon, Math.max(0.25, Number(event.score || 55) / 100)]);
    geoLayers.heatmap = L.heatLayer(heatPoints, {
      radius: 34,
      blur: 26,
      maxZoom: 5,
      max: 1,
      gradient: { 0.2: "#3a7bd5", 0.4: "#3ad6c6", 0.6: "#f4d35e", 0.8: "#f0934a", 1.0: "#f0625a" },
    }).addTo(geoMap);
  }
}

const previousRenderMarkers = renderMarkers;
renderMarkers = function renderMarkersUpgraded() {
  previousRenderMarkers();
  if (!geoMap) {
    const nodeMarkup = [];
    if (layerState.chokepoints) {
      chokepoints.forEach((node) => {
        nodeMarkup.push(`
          <button
            class="fallback-node chokepoint-fallback"
            type="button"
            title="${node.name} · 风险 ${node.score} · ${node.note}"
            style="left:${markerX(node.lon)}%; top:${markerY(node.lat)}%; --node-color:${scoreColor(node.score)}"
          ><i></i><span>${node.name}</span></button>
        `);
      });
    }
    if (layerState.ports) {
      strategicPorts.forEach((port) => {
        nodeMarkup.push(`
          <button
            class="fallback-node port-fallback"
            type="button"
            title="${port.name} · ${port.note}"
            style="left:${markerX(port.lon)}%; top:${markerY(port.lat)}%; --node-color:var(--blue)"
          ><i></i><span>${port.name}</span></button>
        `);
      });
    }
    if (layerState.sanctions) {
      const seen = {};
      sanctions.forEach((row) => {
        const [name, country, program, action, , , score] = row;
        const base = countryCoord(country);
        if (!base) return;
        seen[country] = (seen[country] || 0) + 1;
        const offset = (seen[country] - 1) * 1.6;
        const angle = ((seen[country] - 1) * 47 * Math.PI) / 180;
        const lat = base[0] + offset * Math.cos(angle);
        const lon = base[1] + offset * Math.sin(angle);
        nodeMarkup.push(`
          <button
            class="fallback-node sanction-fallback"
            type="button"
            title="${name} · ${country} · ${program} / ${action} · 风险 ${score}"
            style="left:${markerX(lon)}%; top:${markerY(lat)}%; --node-color:#f06f62"
          ><i></i><span>${name}</span></button>
        `);
      });
    }
    if (layerState.industry) {
      const seen = {};
      industryPulseItems.forEach((item) => {
        const primaryRegion = String(item.region || "").split(/[\/、,，\s]/)[0].trim();
        const base = countryCoord(primaryRegion) || countryCoord(item.region);
        if (!base) return;
        const key = primaryRegion || item.region;
        seen[key] = (seen[key] || 0) + 1;
        const offset = (seen[key] - 1) * 1.4;
        const angle = ((seen[key] - 1) * 63 * Math.PI) / 180;
        const lat = base[0] + offset * Math.cos(angle);
        const lon = base[1] + offset * Math.sin(angle);
        nodeMarkup.push(`
          <button
            class="fallback-node industry-fallback"
            type="button"
            title="${item.title} · ${item.domain} · ${item.company || "行业"}"
            style="left:${markerX(lon)}%; top:${markerY(lat)}%; --node-color:#9b8cff"
          ><i></i><span>${item.title}</span></button>
        `);
      });
    }
    el("map-markers").insertAdjacentHTML("beforeend", nodeMarkup.join(""));
  }
  renderGeoLayers();
};

document.querySelectorAll("[data-layer]").forEach((button) => {
  button.addEventListener("click", () => {
    const layer = button.dataset.layer;
    layerState[layer] = !layerState[layer];
    button.classList.toggle("active", layerState[layer]);
    if (geoMap) renderGeoLayers();
    else renderMarkers();
    if (!geoMap) showToast("交互地图加载后可切换该图层；当前保留离线地图视图");
  });
});

function fallbackZoom(delta) {
  fallbackScale = Math.min(1.7, Math.max(0.85, fallbackScale + delta));
  document.querySelector(".world-map").style.transform = `scale(${fallbackScale})`;
  el("map-markers").style.transform = `scale(${fallbackScale})`;
}

el("map-zoom-in").addEventListener("click", () => (geoMap ? geoMap.zoomIn() : fallbackZoom(0.15)));
el("map-zoom-out").addEventListener("click", () => (geoMap ? geoMap.zoomOut() : fallbackZoom(-0.15)));
el("map-reset").addEventListener("click", () => {
  if (geoMap) geoMap.flyTo([18, 15], 2, { duration: 0.45 });
  else {
    fallbackScale = 1;
    document.querySelector(".world-map").style.transform = "";
    el("map-markers").style.transform = "";
  }
});

document.addEventListener("click", (event) => {
  const industryFilterTarget = event.target.closest("[data-industry-filter]");
  if (industryFilterTarget) {
    state.industryPulseFilter = industryFilterTarget.dataset.industryFilter;
    renderTabs();
    return;
  }

  const industryTarget = event.target.closest("[data-industry-id]");
  if (industryTarget) {
    state.selectedIndustryPulseId = industryTarget.dataset.industryId;
    renderTabs();
    return;
  }

  const filterTarget = event.target.closest("[data-ai-filter]");
  if (filterTarget) {
    state.aiRoboticsFilter = filterTarget.dataset.aiFilter;
    renderTabs();
    return;
  }

  const signalTarget = event.target.closest("[data-ai-signal]");
  if (signalTarget) {
    state.selectedAiSignalId = signalTarget.dataset.aiSignal;
    renderTabs();
    return;
  }

  const physicalFilterTarget = event.target.closest("[data-physical-ai-filter]");
  if (physicalFilterTarget) {
    state.physicalAiFilter = physicalFilterTarget.dataset.physicalAiFilter;
    renderTabs();
    return;
  }

  const physicalSignalTarget = event.target.closest("[data-physical-ai-signal]");
  if (physicalSignalTarget) {
    state.selectedPhysicalAiSignalId = physicalSignalTarget.dataset.physicalAiSignal;
    renderTabs();
    return;
  }

  const ashareFilterTarget = event.target.closest("[data-ashare-filter]");
  if (ashareFilterTarget) {
    state.ashareStrategyFilter = ashareFilterTarget.dataset.ashareFilter;
    renderTabs();
    return;
  }

  const ashareThemeTarget = event.target.closest("[data-ashare-theme]");
  if (ashareThemeTarget) {
    state.selectedAshareThemeId = ashareThemeTarget.dataset.ashareTheme;
    renderTabs();
    return;
  }

  const linkedEventTarget = event.target.closest("[data-ai-open-event]");
  if (linkedEventTarget) {
    state.selectedEventId = linkedEventTarget.dataset.aiOpenEvent;
    const linked = events.find((event) => event.id === state.selectedEventId) || selectedEvent();
    state.category = linked?.category || "ai-robotics";
    renderFilters();
    renderEventList();
    renderMarkers();
    renderSelectedEvent();
    if (geoMap) geoMap.flyTo([linked.lat, linked.lon], 3, { duration: 0.45 });
    showToast(`已聚焦关联事件：${linked.title}`);
  }
});

const readingSizes = ["comfortable", "large", "xlarge", "max"];
let readingSizeIndex = 3;
try {
  const savedReadingSize = localStorage.getItem("geotrade-reading-size-v2");
  const savedIndex = readingSizes.indexOf(savedReadingSize);
  if (savedIndex >= 0) readingSizeIndex = savedIndex;
} catch {}

function applyReadingSize() {
  const size = readingSizes[readingSizeIndex];
  document.body.dataset.readingSize = size;
  el("font-decrease").disabled = readingSizeIndex === 0;
  el("font-increase").disabled = readingSizeIndex === readingSizes.length - 1;
  el("font-decrease").classList.toggle("active", readingSizeIndex === 0);
  el("font-increase").classList.toggle("active", readingSizeIndex > 0);
  try {
    localStorage.setItem("geotrade-reading-size-v2", size);
  } catch {}
  if (geoMap) window.setTimeout(() => geoMap.invalidateSize(), 120);
}

function readingSizeLabel(size) {
  return {
    comfortable: "舒适",
    large: "大字",
    xlarge: "特大",
    max: "超大",
  }[size];
}

el("font-decrease").addEventListener("click", () => {
  readingSizeIndex = Math.max(0, readingSizeIndex - 1);
  applyReadingSize();
  showToast(`阅读字号：${readingSizeLabel(readingSizes[readingSizeIndex])}`);
});

el("font-increase").addEventListener("click", () => {
  readingSizeIndex = Math.min(readingSizes.length - 1, readingSizeIndex + 1);
  applyReadingSize();
  showToast(`阅读字号：${readingSizeLabel(readingSizes[readingSizeIndex])}`);
});

const mapEventCount = document.querySelector('[data-layer="events"] b');
if (mapEventCount) mapEventCount.textContent = events.length;
const sanctionsLayerCountEl = document.getElementById("sanctions-layer-count");
if (sanctionsLayerCountEl) sanctionsLayerCountEl.textContent = sanctions.length;
const industryLayerCountEl = document.getElementById("industry-layer-count");
if (industryLayerCountEl) industryLayerCountEl.textContent = industryPulseItems.length;

let adaptiveResizeTimer;
function applyAdaptiveLayout() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const layout = width <= 620 ? "mobile" : width <= 920 ? "tablet" : width <= 1640 ? "compact" : "wide";
  document.body.dataset.screenLayout = layout;
  document.body.dataset.screenHeight = height <= 800 ? "short" : height >= 1000 ? "tall" : "standard";
  if (layout === "wide") el("event-rail").classList.remove("open");
  el("mobile-menu").setAttribute("aria-expanded", String(el("event-rail").classList.contains("open")));
  if (geoMap) window.setTimeout(() => geoMap.invalidateSize(), 120);
}

el("mobile-menu").addEventListener("click", () => {
  window.setTimeout(() => {
    el("mobile-menu").setAttribute("aria-expanded", String(el("event-rail").classList.contains("open")));
  });
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".event-source-link, .detail-source-action")) return;
  const eventTarget = event.target.closest("[data-event-id]");
  const cardTarget = event.target.closest("[data-event-card-id]");
  if (cardTarget && !eventTarget) selectEvent(cardTarget.dataset.eventCardId);
  if ((eventTarget || cardTarget) && window.innerWidth <= 1640) {
    el("event-rail").classList.remove("open");
    el("mobile-menu").setAttribute("aria-expanded", "false");
  }
});

window.addEventListener("resize", () => {
  window.clearTimeout(adaptiveResizeTimer);
  adaptiveResizeTimer = window.setTimeout(applyAdaptiveLayout, 100);
});

renderFilters();
renderEventList();
renderSelectedEvent();
renderCountryRisks();
renderTabs();
renderMarkers();
applyReadingSize();
applyAdaptiveLayout();
initializeGeoMap();
