const categories = [
  { id: "all", label: "全部" },
  { id: "policy", label: "政策" },
  { id: "supply", label: "供应链" },
  { id: "sanctions", label: "制裁" },
  { id: "market", label: "市场" },
  { id: "energy", label: "能源" },
];

const events = [
  {
    id: "red-sea",
    title: "红海航运风险再度上升",
    summary: "多家承运商延长绕行计划，亚洲至欧洲航线成本与保险溢价同步上升。",
    category: "supply",
    categoryLabel: "供应链",
    countries: ["也门", "埃及", "中国", "欧盟"],
    sectors: ["航运", "保险", "跨境电商"],
    commodities: ["原油", "集装箱运价"],
    route: "亚洲—欧洲海运",
    score: 88,
    confidence: 86,
    source: "Lloyd's List",
    time: "18 分钟前",
    lon: 42,
    lat: 18,
    impact: [
      ["安全事件", "红海商船通行风险升高"],
      ["路线变化", "承运商延长好望角绕行"],
      ["成本传导", "燃油、保险与船期成本上升"],
      ["市场影响", "航运股与运价指数获得支撑"],
    ],
  },
  {
    id: "us-battery-tariff",
    title: "美国上调电池材料进口关税",
    summary: "新税率覆盖部分锂电材料与关键矿物，北美进口成本和供应链迁移压力增加。",
    category: "policy",
    categoryLabel: "关税政策",
    countries: ["美国", "中国", "加拿大"],
    sectors: ["新能源汽车", "储能", "电池材料"],
    commodities: ["锂", "镍", "石墨"],
    route: "中国—北美太平洋航线",
    score: 84,
    confidence: 91,
    source: "USTR",
    time: "32 分钟前",
    lon: -77,
    lat: 38,
    impact: [
      ["政策变化", "电池材料进口税率上调"],
      ["贸易成本", "美国进口商采购成本上升"],
      ["供应链", "墨西哥与东南亚替代产能受关注"],
      ["市场影响", "锂电材料企业估值分化"],
    ],
  },
  {
    id: "copper-chile",
    title: "智利铜矿劳资谈判进入关键阶段",
    summary: "大型矿山潜在罢工风险推高现货升水，冶炼厂原料紧张预期升温。",
    category: "market",
    categoryLabel: "大宗商品",
    countries: ["智利", "中国"],
    sectors: ["矿业", "电网", "新能源"],
    commodities: ["铜"],
    route: "智利—东亚矿产航线",
    score: 77,
    confidence: 78,
    source: "Mining Weekly",
    time: "49 分钟前",
    lon: -70,
    lat: -24,
    impact: [
      ["劳资事件", "铜矿供应中断概率上升"],
      ["现货市场", "铜精矿加工费承压"],
      ["产业链", "线缆与电气设备成本敏感"],
      ["市场影响", "铜价波动率上升"],
    ],
  },
  {
    id: "eu-chip-controls",
    title: "欧盟讨论扩大先进芯片出口管制",
    summary: "拟议规则可能覆盖更多设备与技术服务，并强化最终用户审查。",
    category: "sanctions",
    categoryLabel: "出口管制",
    countries: ["欧盟", "中国", "荷兰"],
    sectors: ["半导体", "设备", "工业软件"],
    commodities: ["特种气体"],
    route: "欧亚高科技贸易",
    score: 81,
    confidence: 72,
    source: "European Commission",
    time: "1 小时前",
    lon: 4,
    lat: 50,
    impact: [
      ["监管变化", "出口许可范围可能扩大"],
      ["技术供应", "关键设备交付周期不确定"],
      ["产业响应", "国产替代投入有望增加"],
      ["市场影响", "设备板块风险溢价上升"],
    ],
  },
  {
    id: "hormuz",
    title: "霍尔木兹海峡保险报价明显上调",
    summary: "能源运输风险溢价升高，海湾地区原油与液化天然气装运成本增加。",
    category: "energy",
    categoryLabel: "能源运输",
    countries: ["伊朗", "阿联酋", "沙特阿拉伯"],
    sectors: ["能源", "航运", "化工"],
    commodities: ["原油", "LNG"],
    route: "波斯湾—东亚能源航线",
    score: 86,
    confidence: 82,
    source: "S&P Global",
    time: "1 小时前",
    lon: 56,
    lat: 26,
    impact: [
      ["地区风险", "能源航线安全成本上升"],
      ["运输成本", "油轮与 LNG 船保险上涨"],
      ["商品价格", "原油风险溢价抬升"],
      ["企业影响", "炼化与航空利润率承压"],
    ],
  },
  {
    id: "panama-canal",
    title: "巴拿马运河上调旱季通行限制",
    summary: "大型船舶预约配额收紧，亚洲至美东路线面临延误和改道风险。",
    category: "supply",
    categoryLabel: "航运瓶颈",
    countries: ["巴拿马", "美国", "中国"],
    sectors: ["航运", "零售", "农业"],
    commodities: ["LNG", "谷物"],
    route: "亚洲—美国东海岸",
    score: 74,
    confidence: 88,
    source: "Panama Canal Authority",
    time: "2 小时前",
    lon: -80,
    lat: 9,
    impact: [
      ["气候约束", "运河水位限制船舶吃水"],
      ["通行能力", "预约配额与船期减少"],
      ["成本传导", "改道与排队成本上升"],
      ["市场影响", "美东进口补库节奏放缓"],
    ],
  },
  {
    id: "turkey-lira",
    title: "土耳其里拉波动加剧",
    summary: "通胀预期与外汇流动性变化推高套保成本，进口企业付款风险升高。",
    category: "market",
    categoryLabel: "汇率风险",
    countries: ["土耳其"],
    sectors: ["零售", "制造", "银行"],
    commodities: ["黄金"],
    route: "欧洲—土耳其贸易",
    score: 69,
    confidence: 83,
    source: "Central Bank of Türkiye",
    time: "2 小时前",
    lon: 32,
    lat: 39,
    impact: [
      ["宏观变化", "通胀与利率预期反复"],
      ["汇率风险", "进口结算成本波动"],
      ["企业现金流", "美元负债压力升高"],
      ["市场影响", "银行与零售板块承压"],
    ],
  },
  {
    id: "indonesia-nickel",
    title: "印尼评估镍矿出口与配额新规",
    summary: "配额调整预期影响镍矿供应节奏，亚洲不锈钢和电池材料企业密切关注。",
    category: "policy",
    categoryLabel: "资源政策",
    countries: ["印度尼西亚", "中国"],
    sectors: ["不锈钢", "电池材料", "矿业"],
    commodities: ["镍"],
    route: "东南亚矿产航线",
    score: 76,
    confidence: 75,
    source: "Indonesia ESDM",
    time: "3 小时前",
    lon: 117,
    lat: -3,
    impact: [
      ["政策评估", "镍矿配额与出口规则调整"],
      ["原料供应", "亚洲镍矿到港节奏波动"],
      ["产业成本", "不锈钢与电池材料成本敏感"],
      ["市场影响", "镍价获得短期支撑"],
    ],
  },
  {
    id: "russia-sanctions",
    title: "新一轮俄罗斯金属制裁清单发布",
    summary: "新增实体涉及金属贸易与物流服务，欧洲采购和结算路径复杂度上升。",
    category: "sanctions",
    categoryLabel: "制裁",
    countries: ["俄罗斯", "英国", "欧盟"],
    sectors: ["金属", "物流", "金融"],
    commodities: ["铝", "镍", "钯"],
    route: "俄罗斯—欧洲陆海联运",
    score: 83,
    confidence: 94,
    source: "UK OFSI",
    time: "3 小时前",
    lon: 37,
    lat: 55,
    impact: [
      ["制裁新增", "金属贸易相关实体受限"],
      ["结算风险", "银行与保险审查加强"],
      ["贸易流向", "亚洲转口与折价交易增加"],
      ["市场影响", "欧洲金属供应风险溢价升高"],
    ],
  },
  {
    id: "vietnam-fdi",
    title: "越南更新高科技产业投资激励",
    summary: "新激励覆盖半导体和高端制造，区域供应链转移和产业园需求有望加速。",
    category: "policy",
    categoryLabel: "产业政策",
    countries: ["越南"],
    sectors: ["半导体", "先进制造", "工业地产"],
    commodities: [],
    route: "中国—东南亚产业链",
    score: 62,
    confidence: 89,
    source: "Vietnam MPI",
    time: "4 小时前",
    lon: 106,
    lat: 16,
    impact: [
      ["政策激励", "高科技项目税收优惠增加"],
      ["资本流动", "区域 FDI 竞争加剧"],
      ["供应链", "制造环节继续向东南亚布局"],
      ["市场影响", "工业园与物流需求改善"],
    ],
  },
  {
    id: "black-sea-grain",
    title: "黑海粮食港口装运出现延误",
    summary: "港口检查和天气共同影响装运，谷物买家开始评估替代来源。",
    category: "supply",
    categoryLabel: "港口风险",
    countries: ["乌克兰", "土耳其", "埃及"],
    sectors: ["农业", "食品", "航运"],
    commodities: ["小麦", "玉米"],
    route: "黑海—地中海粮食航线",
    score: 79,
    confidence: 81,
    source: "Reuters Commodities",
    time: "4 小时前",
    lon: 31,
    lat: 46,
    impact: [
      ["港口延误", "检查与天气影响装船"],
      ["贸易流", "买家转向南美与欧洲货源"],
      ["成本传导", "粮食进口成本抬升"],
      ["市场影响", "谷物期货波动上升"],
    ],
  },
  {
    id: "china-cny",
    title: "人民币中间价释放稳定信号",
    summary: "汇率政策强调双向波动，出口企业远期结汇与套保需求升温。",
    category: "market",
    categoryLabel: "汇率政策",
    countries: ["中国"],
    sectors: ["出口制造", "银行", "航空"],
    commodities: ["美元指数"],
    route: "中国全球贸易结算",
    score: 58,
    confidence: 93,
    source: "PBOC",
    time: "5 小时前",
    lon: 116,
    lat: 40,
    impact: [
      ["政策信号", "稳定汇率预期"],
      ["企业结算", "远期结汇与套保活跃"],
      ["贸易成本", "进口与出口利润分化"],
      ["市场影响", "人民币资产情绪改善"],
    ],
  },
  {
    id: "india-rice",
    title: "印度延长部分大米出口限制",
    summary: "全球大米贸易供应持续偏紧，亚洲与非洲进口国食品通胀压力增加。",
    category: "policy",
    categoryLabel: "出口限制",
    countries: ["印度", "菲律宾", "尼日利亚"],
    sectors: ["农业", "食品"],
    commodities: ["大米"],
    route: "南亚—非洲粮食航线",
    score: 71,
    confidence: 90,
    source: "India DGFT",
    time: "5 小时前",
    lon: 78,
    lat: 21,
    impact: [
      ["出口限制", "大米可贸易供应收缩"],
      ["采购替代", "进口国转向泰国与越南"],
      ["食品通胀", "新兴市场价格压力上升"],
      ["市场影响", "农业贸易商利润分化"],
    ],
  },
  {
    id: "mexico-nearshore",
    title: "墨西哥加强原产地合规审查",
    summary: "近岸制造项目面临更严格的文件与本地增值审核，转口贸易合规成本上升。",
    category: "policy",
    categoryLabel: "贸易合规",
    countries: ["墨西哥", "美国", "中国"],
    sectors: ["汽车零部件", "家电", "物流"],
    commodities: [],
    route: "亚洲—墨西哥—美国",
    score: 68,
    confidence: 80,
    source: "Mexico SAT",
    time: "6 小时前",
    lon: -99,
    lat: 19,
    impact: [
      ["合规审查", "原产地文件要求强化"],
      ["贸易成本", "转口与近岸项目成本增加"],
      ["企业响应", "本地采购比例需要提升"],
      ["市场影响", "墨西哥工业地产需求分化"],
    ],
  },
  {
    id: "japan-yen",
    title: "日元快速升值触发套息交易平仓",
    summary: "汇率波动传导至亚洲资产和大宗商品融资交易，风险偏好短期承压。",
    category: "market",
    categoryLabel: "市场波动",
    countries: ["日本", "美国"],
    sectors: ["金融", "出口制造", "汽车"],
    commodities: ["黄金"],
    route: "亚洲资本市场",
    score: 73,
    confidence: 84,
    source: "BOJ Watch",
    time: "6 小时前",
    lon: 139,
    lat: 36,
    impact: [
      ["汇率波动", "日元快速升值"],
      ["资金交易", "套息头寸被动平仓"],
      ["风险偏好", "亚洲资产波动扩大"],
      ["市场影响", "出口股与高杠杆资产承压"],
    ],
  },
  {
    id: "australia-lng",
    title: "澳大利亚 LNG 设施检修延长",
    summary: "部分装置复产推迟，东北亚现货 LNG 采购需求与价格预期升高。",
    category: "energy",
    categoryLabel: "能源供应",
    countries: ["澳大利亚", "日本", "韩国"],
    sectors: ["能源", "公用事业", "化工"],
    commodities: ["LNG"],
    route: "澳大利亚—东北亚能源航线",
    score: 72,
    confidence: 79,
    source: "EnergyQuest",
    time: "7 小时前",
    lon: 115,
    lat: -22,
    impact: [
      ["设施检修", "LNG 装置复产推迟"],
      ["区域供应", "东北亚现货采购增加"],
      ["成本传导", "公用事业燃料成本抬升"],
      ["市场影响", "亚洲 LNG 现货价格偏强"],
    ],
  },
  {
    id: "drc-cobalt",
    title: "刚果（金）钴矿运输节点受阻",
    summary: "道路和边境清关延误影响钴原料外运，电池材料供应风险上升。",
    category: "supply",
    categoryLabel: "矿产物流",
    countries: ["刚果（金）", "赞比亚", "中国"],
    sectors: ["电池材料", "矿业", "物流"],
    commodities: ["钴", "铜"],
    route: "中非—印度洋矿产路线",
    score: 75,
    confidence: 70,
    source: "Africa Mining Intelligence",
    time: "8 小时前",
    lon: 26,
    lat: -10,
    impact: [
      ["物流受阻", "矿区至港口运输延误"],
      ["原料供应", "钴中间品到港节奏放缓"],
      ["产业成本", "电池材料采购风险上升"],
      ["市场影响", "钴价短期获得支撑"],
    ],
  },
  {
    id: "brazil-soy",
    title: "巴西港口大豆排队时间延长",
    summary: "出口旺季与降雨导致装船延误，中国买家到港节奏可能受到影响。",
    category: "supply",
    categoryLabel: "港口拥堵",
    countries: ["巴西", "中国"],
    sectors: ["农业", "饲料", "航运"],
    commodities: ["大豆"],
    route: "巴西—中国粮食航线",
    score: 64,
    confidence: 77,
    source: "Datamar",
    time: "9 小时前",
    lon: -46,
    lat: -24,
    impact: [
      ["港口拥堵", "大豆装船排队延长"],
      ["到港节奏", "中国油厂采购计划调整"],
      ["运输成本", "船期与滞期费上升"],
      ["市场影响", "豆粕近月价格波动"],
    ],
  },
  {
    id: "africa-payment",
    title: "西非跨境支付规则调整",
    summary: "外汇申报与付款文件要求强化，区域贸易商结算周期可能延长。",
    category: "policy",
    categoryLabel: "支付监管",
    countries: ["尼日利亚", "加纳"],
    sectors: ["贸易金融", "零售", "物流"],
    commodities: [],
    route: "亚洲—西非贸易",
    score: 61,
    confidence: 76,
    source: "ECOWAS",
    time: "10 小时前",
    lon: 7,
    lat: 9,
    impact: [
      ["监管变化", "跨境付款申报要求强化"],
      ["结算效率", "贸易付款周期延长"],
      ["企业现金流", "经销商备货能力承压"],
      ["市场影响", "区域贸易融资需求增加"],
    ],
  },
  {
    id: "korea-export",
    title: "韩国半导体出口订单持续改善",
    summary: "AI 服务器和存储芯片需求增强，亚洲电子供应链景气度获得支撑。",
    category: "market",
    categoryLabel: "产业信号",
    countries: ["韩国", "美国", "中国"],
    sectors: ["半导体", "服务器", "电子制造"],
    commodities: [],
    route: "东北亚电子供应链",
    score: 55,
    confidence: 87,
    source: "Korea Customs Service",
    time: "11 小时前",
    lon: 127,
    lat: 37,
    impact: [
      ["订单改善", "先进存储与服务器需求增强"],
      ["产能利用", "亚洲晶圆与封测环节回升"],
      ["贸易流", "电子元件出口增速改善"],
      ["市场影响", "半导体周期情绪偏强"],
    ],
  },
];

const markets = [
  { symbol: "SPX", name: "标普 500", value: "5,982.14", change: -0.42, risk: "关注", points: [25, 22, 23, 18, 20, 15, 12, 14] },
  { symbol: "HSI", name: "恒生指数", value: "19,476.32", change: 0.78, risk: "中性", points: [24, 23, 19, 20, 16, 14, 11, 9] },
  { symbol: "USDCNY", name: "美元 / 人民币", value: "7.2648", change: 0.18, risk: "偏高", points: [15, 17, 14, 18, 20, 19, 22, 24] },
  { symbol: "EURUSD", name: "欧元 / 美元", value: "1.0712", change: -0.21, risk: "关注", points: [13, 12, 14, 17, 16, 20, 21, 24] },
  { symbol: "DXY", name: "美元指数", value: "105.44", change: 0.36, risk: "偏高", points: [23, 21, 19, 20, 16, 14, 13, 10] },
  { symbol: "BRENT", name: "布伦特原油", value: "$84.18", change: 1.42, risk: "高", points: [26, 24, 22, 19, 21, 15, 11, 8] },
  { symbol: "GOLD", name: "黄金", value: "$2,348.60", change: 0.64, risk: "避险", points: [24, 22, 23, 18, 16, 17, 12, 10] },
  { symbol: "COPPER", name: "LME 铜", value: "$9,742", change: 1.08, risk: "偏高", points: [25, 24, 21, 22, 17, 14, 16, 11] },
  { symbol: "SCFI", name: "上海集运指数", value: "3,476", change: 4.86, risk: "高", points: [28, 27, 24, 21, 20, 15, 11, 7] },
  { symbol: "VIX", name: "波动率指数", value: "17.82", change: 2.34, risk: "偏高", points: [26, 24, 25, 20, 16, 18, 11, 8] },
];

const policies = [
  ["美国", "中国", "电池材料 / HS 8507", "提高进口关税", "2026-07-01", 84],
  ["欧盟", "全球", "先进芯片设备", "扩大出口许可", "评估中", 81],
  ["印度", "全球", "大米 / HS 1006", "延长出口限制", "立即生效", 71],
  ["印度尼西亚", "中国 / 日本", "镍矿 / HS 2604", "配额规则调整", "征求意见", 76],
  ["墨西哥", "亚洲", "汽车零部件", "强化原产地审查", "2026-06-15", 68],
  ["越南", "全球", "半导体投资", "新增投资激励", "2026-08-01", 62],
];

const sanctions = [
  ["Baltic Metals Trading", "俄罗斯", "UK / EU", "资产冻结", "金属 / 物流", "2026-06-04", 86],
  ["Pars Maritime Services", "伊朗", "OFAC", "SDN", "航运 / 能源", "2026-06-03", 91],
  ["North Star Components", "白俄罗斯", "EU", "出口管制", "电子 / 设备", "2026-06-02", 78],
  ["Aquila Trade Finance", "阿联酋", "OFAC", "二级制裁风险", "金融 / 贸易", "2026-06-01", 74],
  ["Pacific Dual-Use Tech", "中国", "BIS", "实体清单", "半导体 / 工业", "2026-05-30", 82],
];

const routes = [
  { name: "中国—欧洲海运", score: 88, status: "严重", reason: "红海风险、苏伊士绕行和保险成本持续上升", change: "+18% 成本", chokepoint: "红海 / 苏伊士", commodities: ["电子产品", "机械设备", "光伏组件", "纺织服装"] },
  { name: "波斯湾—东亚能源", score: 86, status: "严重", reason: "霍尔木兹海峡能源运输风险溢价上升", change: "+9% 保险", chokepoint: "霍尔木兹", commodities: ["原油", "液化天然气 (LNG)", "石化产品"] },
  { name: "亚洲—美国东海岸", score: 74, status: "偏高", reason: "巴拿马运河旱季配额限制与船期延误", change: "+6 天", chokepoint: "巴拿马运河", commodities: ["消费电子", "家具家居", "服装鞋帽", "汽车零部件"] },
  { name: "黑海—地中海粮食", score: 79, status: "偏高", reason: "港口检查、天气和安全风险共同扰动", change: "+7% 运费", chokepoint: "博斯普鲁斯", commodities: ["小麦", "玉米", "葵花籽油", "化肥"] },
  { name: "中非—印度洋矿产", score: 75, status: "偏高", reason: "道路运输与边境清关延误", change: "+12% 周期", chokepoint: "赞比亚边境", commodities: ["钴", "铜精矿", "锂辉石", "稀土精矿"] },
  { name: "中国—东南亚制造", score: 42, status: "稳定", reason: "物流稳定，但原产地与转口合规审查加强", change: "+2% 合规", chokepoint: "马六甲", commodities: ["电子元件", "显示面板", "锂电池材料", "纺织原料"] },
  { name: "北美—东亚半导体走廊", score: 70, status: "偏高", reason: "出口管制清单更新与晶圆产能调度调整物流路径", change: "+5% 时效", chokepoint: "横滨 / 高雄", commodities: ["半导体设备", "高端芯片", "精密仪器", "存储模组"] },
  { name: "澳大利亚—东亚铁矿能源", score: 68, status: "偏高", reason: "钢铁需求周期与海岬型船运价波动影响装运节奏", change: "+4% 运费", chokepoint: "巽他海峡", commodities: ["铁矿石", "动力煤", "液化天然气 (LNG)"] },
  { name: "西非—欧洲能源原料", score: 66, status: "关注", reason: "几内亚湾安全形势与北非管道供应影响补给", change: "+6% 保险", chokepoint: "几内亚湾", commodities: ["原油", "天然气", "铝土矿", "可可豆"] },
  { name: "印度—中东—欧洲经济走廊", score: 57, status: "关注", reason: "IMEC多式联运基建进度决定新兴走廊承载能力", change: "+3 天", chokepoint: "海法 / 比雷埃夫斯", commodities: ["香料与农产品", "纺织原料", "原油", "化工中间体"] },
];

const countryRisks = [
  { name: "俄罗斯", region: "欧洲 / 欧亚", score: 89 },
  { name: "伊朗", region: "中东", score: 87 },
  { name: "土耳其", region: "欧洲 / 中东", score: 74 },
  { name: "印度尼西亚", region: "东南亚", score: 63 },
  { name: "越南", region: "东南亚", score: 38 },
];

const tabConfig = [
  { id: "markets", label: "市场雷达", count: markets.length },
  { id: "policy", label: "贸易政策", count: policies.length },
  { id: "supply", label: "供应链", count: routes.length },
  { id: "sanctions", label: "制裁追踪", count: sanctions.length },
  { id: "brief", label: "AI 简报", count: 3 },
];

const state = {
  selectedEventId: "red-sea",
  category: "all",
  query: "",
  highRiskOnly: false,
  myRadarOnly: false,
  activeTab: "markets",
  watchlist: new Set(["red-sea", "us-battery-tariff", "hormuz"]),
};

const el = (id) => document.getElementById(id);
const scoreClass = (score) => (score >= 80 ? "critical" : score >= 65 ? "elevated" : "guarded");
const scoreColor = (score) => (score >= 80 ? "var(--red)" : score >= 65 ? "var(--amber)" : "var(--teal)");
const markerX = (lon) => ((lon + 180) / 360) * 100;
const markerY = (lat) => ((90 - lat) / 180) * 100;

// 事件是否命中用户画像（品类关键词 / 出口市场 / 航线），画像由 profile.js 写入 window.geoProfile
function matchesProfile(event) {
  const profile = window.geoProfile;
  if (!profile) return true;
  const terms = [...(profile.hsCodes || []), ...(profile.countries || []), ...(profile.routes || [])]
    .map((term) => term.toLowerCase())
    .filter(Boolean);
  if (!terms.length) return true;
  const haystack = [event.title, event.summary, ...event.countries, ...event.sectors, ...event.commodities, event.route]
    .join(" ")
    .toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function filteredEvents() {
  const query = state.query.trim().toLowerCase();
  return events.filter((event) => {
    const matchesCategory = state.category === "all" || event.category === state.category;
    const matchesRisk = !state.highRiskOnly || event.score >= 80;
    if (state.myRadarOnly && !matchesProfile(event)) return false;
    const haystack = [
      event.title,
      event.summary,
      event.categoryLabel,
      ...event.countries,
      ...event.sectors,
      ...event.commodities,
      event.route,
    ]
      .join(" ")
      .toLowerCase();
    return matchesCategory && matchesRisk && (!query || haystack.includes(query));
  });
}

function renderFilters() {
  el("category-filters").innerHTML = categories
    .map(
      (category) =>
        `<button class="filter-button ${state.category === category.id ? "active" : ""}" data-category="${category.id}" type="button">${category.label}</button>`,
    )
    .join("");
}

function renderEventList() {
  const list = filteredEvents();
  el("event-count").textContent = list.length;
  el("high-risk-count").textContent = events.filter((event) => event.score >= 80).length;

  if (!list.length) {
    el("event-list").innerHTML = `<div class="empty-state">没有匹配的事件。尝试切换分类或清除搜索条件。</div>`;
    return;
  }

  el("event-list").innerHTML = list
    .map(
      (event) => `
        <button class="event-card ${state.selectedEventId === event.id ? "active" : ""}" data-event-id="${event.id}" type="button">
          <span class="risk-score ${scoreClass(event.score)}">${event.score}</span>
          <span>
            <span class="event-meta">
              <span class="category">${event.categoryLabel}</span>
              <span>·</span>
              <span>${event.time}</span>
              ${state.watchlist.has(event.id) ? '<span>· 已观察</span>' : ""}
            </span>
            <h3>${event.title}</h3>
            <p>${event.summary}</p>
            <span class="event-tags">
              ${event.countries.slice(0, 2).map((item) => `<span>${item}</span>`).join("")}
              ${event.commodities.slice(0, 1).map((item) => `<span>${item}</span>`).join("")}
            </span>
          </span>
        </button>
      `,
    )
    .join("");
}

function renderMarkers() {
  const visibleIds = new Set(filteredEvents().map((event) => event.id));
  el("map-markers").innerHTML = events
    .filter((event) => visibleIds.has(event.id))
    .map(
      (event) => `
        <button
          class="map-marker ${state.selectedEventId === event.id ? "active" : ""}"
          data-event-id="${event.id}"
          type="button"
          title="${event.title} · 风险 ${event.score}"
          aria-label="${event.title}"
          style="
            left:${markerX(event.lon)}%;
            top:${markerY(event.lat)}%;
            --marker-size:${Math.max(7, event.score / 7)}px;
            --marker-color:${scoreColor(event.score)};
          "
        ></button>
      `,
    )
    .join("");
}

function selectedEvent() {
  return events.find((event) => event.id === state.selectedEventId) || events[0];
}

function renderSelectedEvent() {
  const event = selectedEvent();
  el("focus-score").textContent = event.score;
  el("focus-category").textContent = `${event.categoryLabel} · ${event.route}`;
  el("focus-title").textContent = event.title;
  el("focus-summary").textContent = event.summary;
  el("impact-chain").innerHTML = event.impact
    .map(
      ([label, text], index) =>
        `<li data-step="0${index + 1}"><span><strong>${label}</strong><br />${text}</span></li>`,
    )
    .join("");
  el("detail-confidence").textContent = `${event.confidence}%`;
  el("detail-source").textContent = event.source;
  el("detail-time").textContent = event.time;

  const isWatched = state.watchlist.has(event.id);
  el("focus-watch").textContent = isWatched ? "✓" : "＋";
  el("focus-watch").title = isWatched ? "移出观察列表" : "加入观察列表";
  el("detail-watch").textContent = isWatched ? "移出观察" : "加入观察";
}

function renderCountryRisks() {
  el("country-risk-list").innerHTML = countryRisks
    .map(
      (country) => `
        <div class="country-row" style="--bar-color:${scoreColor(country.score)}">
          <div class="country-name">${country.name}<span>${country.region}</span></div>
          <div class="risk-bar"><i style="width:${country.score}%"></i></div>
          <strong>${country.score}</strong>
        </div>
      `,
    )
    .join("");
}

function sparkline(points, positive) {
  const coords = points.map((point, index) => `${(index / (points.length - 1)) * 58},${point}`).join(" ");
  return `<svg class="sparkline ${positive ? "positive" : "negative"}" viewBox="0 0 58 34" aria-hidden="true"><polyline points="${coords}" /></svg>`;
}

function renderMarketTab() {
  return `
    <div class="market-grid">
      ${markets
        .map(
          (market) => `
            <article class="market-card">
              <header>
                <div>
                  <span class="market-symbol">${market.symbol}</span>
                  <h3>${market.name}</h3>
                </div>
                <span class="market-risk">${market.risk}</span>
              </header>
              <div>
                <div class="market-value">${market.value}</div>
                <div class="market-change ${market.change >= 0 ? "positive" : "negative"}">${market.change >= 0 ? "+" : ""}${market.change.toFixed(2)}%</div>
              </div>
              ${sparkline(market.points, market.change >= 0)}
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function impactCell(value) {
  return `<div class="impact-cell"><strong>${value}</strong><span><i style="width:${value}%"></i></span></div>`;
}

function renderPolicyTab() {
  return `
    <table class="data-table">
      <thead>
        <tr><th>实施方</th><th>受影响地区</th><th>产品 / HS Code</th><th>政策类型</th><th>生效日期</th><th>影响分</th></tr>
      </thead>
      <tbody>
        ${policies
          .map(
            (row) =>
              `<tr>${row.slice(0, 5).map((cell) => `<td>${cell}</td>`).join("")}<td>${impactCell(row[5])}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderSupplyTab() {
  return `
    <div class="route-grid">
      ${routes
        .map(
          (route) => `
            <article class="route-card">
              <header><h3>${route.name}</h3><span style="color:${scoreColor(route.score)}">${route.score}</span></header>
              <p>${route.reason}</p>
              ${
                Array.isArray(route.commodities) && route.commodities.length
                  ? `<div class="route-commodities">主要商品：${route.commodities.map((item) => `<span>${item}</span>`).join("")}</div>`
                  : ""
              }
              <div class="route-meta">
                <span>${route.status} · ${route.chokepoint}</span>
                <strong class="${route.score >= 65 ? "negative" : "positive"}">${route.change}</strong>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderSanctionsTab() {
  return `
    <table class="data-table">
      <thead>
        <tr><th>实体</th><th>关联国家</th><th>项目 / 名单</th><th>措施</th><th>受影响行业</th><th>日期</th><th>压力分</th></tr>
      </thead>
      <tbody>
        ${sanctions
          .map(
            (row) =>
              `<tr>${row.slice(0, 6).map((cell) => `<td>${cell}</td>`).join("")}<td>${impactCell(row[6])}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderBriefTab() {
  const sorted = [...events].sort((a, b) => b.score - a.score);
  const topEvents = sorted.slice(0, 3);
  const lead = topEvents[0];
  const dateLabel = new Date().toISOString().slice(0, 10);

  const uniqueFrom = (key, limit = 4) => {
    const seen = new Set();
    const out = [];
    for (const event of topEvents) {
      for (const value of event[key] || []) {
        if (!seen.has(value)) {
          seen.add(value);
          out.push(value);
          if (out.length >= limit) return out;
        }
      }
    }
    return out;
  };

  const sectors = uniqueFrom("sectors");
  const commodities = uniqueFrom("commodities");
  const countries = uniqueFrom("countries");
  const routeNames = [...new Set(topEvents.map((event) => event.route).filter(Boolean))];

  const headline = lead ? lead.title : "全球风险信号保持平稳";
  const summary = topEvents.length
    ? `今日需优先关注${topEvents.map((event) => event.title).join("、")}。风险正在从${
        sectors.slice(0, 2).join("、") || "相关行业"
      }向运输成本、原料采购与汇率套保传导，当前信号更偏向成本冲击与供应链再配置，而非单一市场方向判断。`
    : "当前暂无突出的高风险事件，全球贸易与市场信号整体保持稳定运行节奏。";

  const investorPoints = [
    sectors.length && `${sectors.join("、")}相关板块风险溢价上升，关注盈利弹性与估值兑现。`,
    commodities.length && `${commodities.join("、")}等商品价格波动可能加剧，关注套保与库存节奏。`,
    routeNames.length && `${routeNames.join("、")}沿线风险溢价上升，航运与物流相关标的表现或将分化。`,
  ].filter(Boolean);

  const traderPoints = [
    routeNames.length
      ? `${routeNames.join("、")}需重新核算燃油、保险、滞期费与交货承诺。`
      : "主要贸易路线运行平稳，可按常规节奏推进采购与交付安排。",
    commodities.length && `关注${commodities.join("、")}的到港节奏，提前评估替代采购来源。`,
    countries.length && `加强对${countries.join("、")}相关交易方的原产地证明、出口许可与制裁名单筛查。`,
  ].filter(Boolean);

  const executivePoints = [
    topEvents.length
      ? `将${topEvents.map((event) => event.title).join("、")}纳入季度压力测试与情景推演。`
      : "当前风险水平较低，可维持现有压力测试假设，按计划推进既定布局。",
    sectors.length && `评估${sectors.join("、")}领域的供应商结构、合规要求与本地化布局节奏。`,
    "优先建立可追溯的供应商、商品与物流路线风险图谱，及时同步关键信号变化。",
  ].filter(Boolean);

  const renderList = (points) => points.map((point) => `<li>${point}</li>`).join("");

  return `
    <div class="brief-layout">
      <article class="brief-lead">
        <span class="eyebrow">DAILY EXECUTIVE BRIEF · ${dateLabel}</span>
        <h3>${headline}</h3>
        <p>${summary}</p>
        <div class="event-tags">
          ${topEvents.map((event) => `<span>${event.title} · ${event.score}</span>`).join("")}
        </div>
      </article>
      <article class="brief-column">
        <span class="eyebrow">FOR INVESTORS</span>
        <h3>投资人视角</h3>
        <ul>${renderList(investorPoints)}</ul>
      </article>
      <article class="brief-column">
        <span class="eyebrow">FOR TRADERS</span>
        <h3>贸易商视角</h3>
        <ul>${renderList(traderPoints)}</ul>
      </article>
      <article class="brief-column">
        <span class="eyebrow">FOR EXECUTIVES</span>
        <h3>管理层视角</h3>
        <ul>${renderList(executivePoints)}</ul>
      </article>
    </div>
  `;
}

function renderTabs() {
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
  };
  el("dock-content").innerHTML = renders[state.activeTab]();
}

function renderWatchCount() {
  el("watch-count").textContent = state.watchlist.size;
}

function renderAll() {
  renderFilters();
  renderEventList();
  renderMarkers();
  renderSelectedEvent();
  renderCountryRisks();
  renderTabs();
  renderWatchCount();
}

function selectEvent(id) {
  state.selectedEventId = id;
  renderEventList();
  renderMarkers();
  renderSelectedEvent();
  if (window.innerWidth <= 920) {
    el("event-rail").classList.remove("open");
  }
}

let toastTimer;
function showToast(message) {
  window.clearTimeout(toastTimer);
  el("toast").textContent = message;
  el("toast").classList.add("visible");
  toastTimer = window.setTimeout(() => el("toast").classList.remove("visible"), 2200);
}

function toggleWatchSelected() {
  const event = selectedEvent();
  if (state.watchlist.has(event.id)) {
    state.watchlist.delete(event.id);
    showToast(`已将“${event.title}”移出观察列表`);
  } else {
    state.watchlist.add(event.id);
    showToast(`已将“${event.title}”加入观察列表`);
  }
  renderWatchCount();
  renderEventList();
  renderSelectedEvent();
}

document.addEventListener("click", (event) => {
  const eventTarget = event.target.closest("[data-event-id]");
  if (eventTarget) {
    selectEvent(eventTarget.dataset.eventId);
    return;
  }

  const categoryTarget = event.target.closest("[data-category]");
  if (categoryTarget) {
    state.category = categoryTarget.dataset.category;
    renderFilters();
    renderEventList();
    renderMarkers();
    return;
  }

  const tabTarget = event.target.closest("[data-tab]");
  if (tabTarget) {
    state.activeTab = tabTarget.dataset.tab;
    renderTabs();
  }
});

el("global-search").addEventListener("input", (event) => {
  state.query = event.target.value;
  renderEventList();
  renderMarkers();
});

el("high-risk-only").addEventListener("change", (event) => {
  state.highRiskOnly = event.target.checked;
  renderEventList();
  renderMarkers();
});

el("focus-watch").addEventListener("click", toggleWatchSelected);
el("detail-watch").addEventListener("click", toggleWatchSelected);
el("watch-button").addEventListener("click", () => {
  const names = events
    .filter((event) => state.watchlist.has(event.id))
    .map((event) => event.title)
    .join("、");
  showToast(`观察列表：${names}`);
});

el("refresh-data").addEventListener("click", () => {
  const now = new Date();
  el("updated-at").textContent = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} CST`;
  el("dock-status").textContent = "模拟数据 · 刚刚更新";
  showToast("风险信号与市场数据已刷新");
});

el("expand-dock").addEventListener("click", () => {
  const expanded = el("expand-dock").closest(".analysis-dock").classList.toggle("expanded");
  el("expand-dock").textContent = expanded ? "↙" : "↗";
  el("expand-dock").title = expanded ? "收起面板" : "展开面板";
});

el("mobile-menu").addEventListener("click", () => el("event-rail").classList.toggle("open"));

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== el("global-search")) {
    event.preventDefault();
    el("global-search").focus();
  }
  if (event.key === "Escape") {
    el("event-rail").classList.remove("open");
    el("global-search").blur();
  }
});

renderAll();
