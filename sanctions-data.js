// ===========================================================
// 制裁与合规雷达 · Sanctions & Compliance Radar
// 实时数据复用 server.js 的 loadSanctions()（美国财政部 OFAC Recent Actions），
// 本模块提供合规参考模型（制裁项目 / 清单 / 红旗信号 / 筛查清单）并装配快照。
// ===========================================================

// 主要制裁项目（intensity：近期强度 高/中/低，参考研判）
const PROGRAMS = [
  { id: "russia", name: "俄罗斯相关", en: "Russia-related (EO 14024)", authority: "OFAC / BIS / EU / UK", intensity: "高",
    scope: "能源、金融、军工、规避网络、二级制裁", note: "持续扩列，重点打击第三国规避与价格上限规避。" },
  { id: "iran", name: "伊朗", en: "Iran", authority: "OFAC", intensity: "高",
    scope: "石油出口、无人机/导弹、航运影子船队、金融", note: "聚焦石油影子船队与无人机供应链。" },
  { id: "china-tech", name: "涉华科技与出口管制", en: "China Tech & Export Controls", authority: "BIS Entity List / UFLPA / OFAC", intensity: "高",
    scope: "先进半导体、AI 算力、超算、军民融合实体、强迫劳动", note: "实体清单+出口管制+UFLPA 三重叠加，企业尽调压力大。" },
  { id: "dprk", name: "朝鲜", en: "DPRK", authority: "OFAC / UN", intensity: "中",
    scope: "核导、IT 劳工、加密货币盗取、转运", note: "关注朝鲜 IT 外包与加密资产洗钱。" },
  { id: "counter-terror", name: "反恐 (SDGT)", en: "Counter-Terrorism", authority: "OFAC (EO 13224)", intensity: "中",
    scope: "恐怖组织、资助网络、便利者", note: "全球反恐指定，含金融便利者。" },
  { id: "narcotics", name: "毒品/芬太尼", en: "Narcotics (Fentanyl)", authority: "OFAC (EO 14059)", intensity: "高",
    scope: "芬太尼前体、贩毒集团、化工与物流便利方", note: "芬太尼前体化学品与支付便利方为新重点。" },
  { id: "cyber", name: "网络与勒索软件", en: "Cyber & Ransomware", authority: "OFAC (EO 13694)", intensity: "中",
    scope: "勒索软件团伙、混币器、恶意基础设施", note: "向勒索软件付款可能违反制裁。" },
  { id: "venezuela", name: "委内瑞拉/其他地区", en: "Venezuela & Regional", authority: "OFAC", intensity: "低",
    scope: "石油、政府关联实体、西巴尔干、缅甸等", note: "随政治进程动态调整许可。" },
];

// 主要清单与筛查依据
const LISTS = [
  { name: "SDN 清单", en: "Specially Designated Nationals List", authority: "美国财政部 OFAC",
    scope: "被冻结资产、禁止美国人交易的个人/实体/船舶/飞机", url: "https://sanctionssearch.ofac.treas.gov/" },
  { name: "50% 规则", en: "OFAC 50 Percent Rule", authority: "OFAC 指引",
    scope: "被 SDN 直接或间接持股≥50% 的实体即使未列名也视同受制裁", url: "https://ofac.treasury.gov/faqs" },
  { name: "实体清单", en: "BIS Entity List", authority: "美国商务部 BIS",
    scope: "受出口管制(EAR)许可要求的实体，常用于科技与军民融合", url: "https://www.bis.gov/" },
  { name: "UFLPA 清单", en: "UFLPA Entity List", authority: "美国国土安全部",
    scope: "维吾尔强迫劳动相关，输美货物可被推定扣留", url: "https://www.dhs.gov/uflpa" },
  { name: "被拒绝人员清单", en: "Denied Persons List", authority: "BIS",
    scope: "被剥夺出口特权的个人/实体", url: "https://www.bis.gov/" },
  { name: "欧盟/联合国清单", en: "EU & UN Consolidated Lists", authority: "EU / UN",
    scope: "跨境业务需并行筛查欧盟与联合国制裁名单", url: "https://www.sanctionsmap.eu/" },
];

// 合规红旗信号
const RED_FLAGS = [
  "交易对手或其受益所有人命中 SDN / 实体清单 / 50% 规则",
  "经第三国（如部分中亚、海湾、高加索国家）异常转口、最终用户不清",
  "受控物项(双用途、先进芯片、军民两用)出口至高风险目的地",
  "对手方刻意规避美元清算、使用加密货币或影子船队/关闭 AIS",
  "短期内频繁更换收货人、付款人或货代，文件最终用户存疑",
  "价格、数量与正常贸易背离，或要求拆分以规避申报阈值",
];

// 出口与交易合规筛查清单
const CHECKLIST = [
  "对交易各方(买方、收货人、最终用户、银行、货代)进行制裁名单筛查",
  "穿透受益所有权，应用 OFAC 50% 规则",
  "核验物项 HS/ECCN 编码与出口管制(EAR/双用途清单)许可要求",
  "确认目的国与最终用途，留存最终用户声明",
  "对高风险交易保留尽职调查与决策记录(可审计)",
  "建立持续监控与名单更新复筛机制",
];

function snapshot(actions, meta = {}) {
  const list = Array.isArray(actions) ? actions : [];
  const updates = list.filter((a) => a.action !== "名单移除").length;
  const removals = list.filter((a) => a.action === "名单移除").length;
  const highRisk = list.filter((a) => Number(a.score) >= 85).length;
  const countryCount = {};
  for (const a of list) {
    const c = a.country || "全球";
    countryCount[c] = (countryCount[c] || 0) + 1;
  }
  const topCountries = Object.entries(countryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  return {
    source: "美国财政部 OFAC Recent Actions + 合规参考模型",
    sourceUrl: "https://ofac.treasury.gov/recent-actions",
    fetchedAt: meta.fetchedAt || new Date().toISOString(),
    stale: !!meta.stale,
    error: meta.error || null,
    actions: list,
    programs: PROGRAMS,
    lists: LISTS,
    redFlags: RED_FLAGS,
    checklist: CHECKLIST,
    summary: {
      actionCount: list.length,
      updates,
      removals,
      highRisk,
      programCount: PROGRAMS.length,
      highIntensityPrograms: PROGRAMS.filter((p) => p.intensity === "高").map((p) => p.name),
      topCountries,
    },
  };
}

module.exports = { snapshot, PROGRAMS, LISTS, RED_FLAGS, CHECKLIST };
