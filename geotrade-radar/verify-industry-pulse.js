const { chromium } = require("playwright");

function snapshotFixture() {
  const updatedAt = new Date().toISOString();
  return {
    period: "day",
    periodLabel: "日",
    updatedAt,
    mode: "live",
    providers: {
      events: { source: "GDELT", sourceUrl: "https://www.gdeltproject.org/", count: 2, stale: false, error: null, fetchedAt: updatedAt },
      industry: { source: "GDELT Technology Industry", sourceUrl: "https://www.gdeltproject.org/", count: 6, stale: false, error: null, fetchedAt: updatedAt },
      markets: { source: "Yahoo Finance", sourceUrl: "https://finance.yahoo.com/", count: 2, stale: false, error: null, fetchedAt: updatedAt },
      sanctions: { source: "U.S. Treasury OFAC", sourceUrl: "https://ofac.treasury.gov/recent-actions", count: 0, stale: false, error: null, fetchedAt: updatedAt },
    },
    events: [
      {
        id: "industry-linked-physical-ai",
        title: "物理AI边缘推理芯片进入工厂验证",
        summary: "用于验证产业企业动态可以跳转关联全球事件。",
        category: "physical-ai",
        categoryLabel: "物理AI",
        countries: ["中国台湾"],
        sectors: ["物理AI", "边缘推理"],
        commodities: ["半导体"],
        route: "物理AI产业链与场景落地",
        score: 84,
        confidence: 82,
        source: "Fixture Physical AI",
        sourceUrl: "http://127.0.0.1:4173/physical-ai-report",
        time: "2026-06-05 02:00 UTC",
        lon: 121,
        lat: 24,
        impact: [["实时事件", "边缘推理需求上升"]],
      },
      {
        id: "industry-linked-ai",
        title: "AI基础模型企业级部署加速",
        summary: "用于验证 AI 产业动态关联。",
        category: "ai-robotics",
        categoryLabel: "AI 与机器人",
        countries: ["美国"],
        sectors: ["AI", "云服务"],
        commodities: ["GPU"],
        route: "全球 AI 供应链",
        score: 78,
        confidence: 80,
        source: "Fixture AI",
        sourceUrl: "http://127.0.0.1:4173/ai-report",
        time: "2026-06-05 01:00 UTC",
        lon: -97,
        lat: 38,
        impact: [["实时事件", "企业AI商业化"]],
      },
    ],
    industry: [
      {
        id: "fixture-industry-openai",
        domainId: "ai",
        domain: "AI",
        company: "OpenAI",
        ticker: "",
        type: "企业动态",
        title: "OpenAI expands enterprise AI deployment",
        summary: "企业级 AI 部署继续加速，云服务和行业软件生态同步受益。",
        source: "Fixture News",
        sourceUrl: "http://127.0.0.1:4173/openai-industry-report",
        publishedAt: "2026-06-05 02:30 UTC",
        time: "2026-06-05 02:30 UTC",
        score: 79,
        sentiment: "商业化加速",
        region: "美国 / 全球",
        tags: ["基础模型", "企业AI", "云服务"],
        eventKeywords: ["AI", "企业"],
      },
      {
        id: "fixture-industry-nvidia-physical",
        domainId: "physical-ai",
        domain: "物理AI",
        company: "NVIDIA",
        ticker: "NVDA",
        type: "企业动态",
        title: "NVIDIA physical AI edge platform gains factory pilots",
        summary: "边缘推理和仿真训练推动物理AI进入工厂试点。",
        source: "Fixture News",
        sourceUrl: "http://127.0.0.1:4173/nvidia-physical-ai-report",
        publishedAt: "2026-06-05 02:00 UTC",
        time: "2026-06-05 02:00 UTC",
        score: 88,
        sentiment: "高影响",
        region: "美国 / 全球",
        tags: ["物理AI", "边缘推理", "仿真训练"],
        eventKeywords: ["物理AI", "边缘推理"],
      },
      {
        id: "fixture-industry-tesla-robotics",
        domainId: "robotics",
        domain: "机器人",
        company: "Tesla",
        ticker: "TSLA",
        type: "企业动态",
        title: "Tesla humanoid robot supply chain enters validation",
        summary: "人形机器人供应链进入量产验证。",
        source: "Fixture News",
        sourceUrl: "http://127.0.0.1:4173/tesla-robotics-report",
        publishedAt: "2026-06-05 01:40 UTC",
        time: "2026-06-05 01:40 UTC",
        score: 82,
        sentiment: "量产验证",
        region: "美国 / 中国",
        tags: ["人形机器人", "执行器", "量产"],
        eventKeywords: ["人形机器人", "机器人"],
      },
      {
        id: "fixture-industry-qualcomm-edge",
        domainId: "compute",
        domain: "算力芯片",
        company: "Qualcomm",
        ticker: "QCOM",
        type: "行业动态",
        title: "Edge AI chips expand into robotics controllers",
        summary: "端侧 AI 芯片从手机扩展到机器人控制器。",
        source: "Fixture News",
        sourceUrl: "http://127.0.0.1:4173/edge-ai-chip-report",
        publishedAt: "2026-06-05 01:10 UTC",
        time: "2026-06-05 01:10 UTC",
        score: 76,
        sentiment: "需求外溢",
        region: "美国 / 亚洲",
        tags: ["边缘AI", "芯片", "控制器"],
        eventKeywords: ["边缘AI", "芯片"],
      },
      {
        id: "fixture-industry-cloud",
        domainId: "cloud",
        domain: "云与数据中心",
        company: "AWS",
        ticker: "AMZN",
        type: "企业动态",
        title: "AWS expands AI data center capacity",
        summary: "AI基础设施投资继续向数据中心、电力和网络设备外溢。",
        source: "Fixture News",
        sourceUrl: "http://127.0.0.1:4173/aws-cloud-report",
        publishedAt: "2026-06-05 00:50 UTC",
        time: "2026-06-05 00:50 UTC",
        score: 80,
        sentiment: "资本开支扩张",
        region: "美国 / 全球",
        tags: ["云计算", "数据中心", "AI基础设施"],
        eventKeywords: ["云计算", "数据中心"],
      },
      {
        id: "fixture-industry-cyber",
        domainId: "cybersecurity",
        domain: "网络安全",
        company: "CrowdStrike",
        ticker: "CRWD",
        type: "企业动态",
        title: "CrowdStrike security demand rises with AI workloads",
        summary: "企业AI部署提升身份安全、终端防护和漏洞响应需求。",
        source: "Fixture News",
        sourceUrl: "http://127.0.0.1:4173/crowdstrike-security-report",
        publishedAt: "2026-06-05 00:30 UTC",
        time: "2026-06-05 00:30 UTC",
        score: 75,
        sentiment: "需求稳健",
        region: "美国 / 全球",
        tags: ["网络安全", "身份安全", "漏洞响应"],
        eventKeywords: ["网络安全", "漏洞"],
      },
    ],
    markets: [
      { symbol: "SPX", name: "标普 500", value: "6,100.20", numericValue: 6100.2, change: 0.42, risk: "关注", points: [25, 22, 20, 18, 16, 14, 12, 10] },
      { symbol: "VIX", name: "波动率指数", value: "18.50", numericValue: 18.5, change: -0.2, risk: "关注", points: [10, 12, 14, 16, 15, 18, 20, 22] },
    ],
    sanctions: [],
  };
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.route("**/api/snapshot**", async (route) => {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(snapshotFixture()) });
    });

    await page.goto("http://127.0.0.1:4173");
    await page.waitForFunction(() => document.body.dataset.dataMode === "live", null, { timeout: 15000 });
    await page.locator('[data-tab="industry-pulse"]').click();
    await page.waitForSelector(".industry-pulse", { timeout: 5000 });
    await page.locator('[data-industry-filter="physical-ai"]').click();
    await page.waitForFunction(() => document.querySelector(".ai-filter.active")?.dataset.industryFilter === "physical-ai", null, { timeout: 5000 });
    await page.locator('[data-industry-id="fixture-industry-nvidia-physical"]').click();
    await page.waitForSelector(".industry-source-link", { timeout: 5000 });

    const popupPromise = page.waitForEvent("popup", { timeout: 7000 }).catch(() => null);
    await page.locator(".industry-source-link").click();
    const popup = await popupPromise;
    const popupUrl = popup?.url() || null;
    if (popup) await popup.close();

    await page.locator(".industry-detail .open-linked-event").click();
    await page.waitForFunction(() => document.querySelector("#focus-title")?.textContent.includes("物理AI"), null, { timeout: 5000 });

    const report = await page.evaluate(() => ({
      activeTab: document.querySelector(".tab-button.active")?.dataset.tab,
      industryTabCount: document.querySelector('[data-tab="industry-pulse"] b')?.textContent || "",
      filter: document.querySelector(".ai-filter.active")?.dataset.industryFilter,
      visibleCards: document.querySelectorAll(".industry-card").length,
      selectedTitle: document.querySelector(".industry-detail h3")?.textContent || "",
      sourceHref: document.querySelector(".industry-source-link")?.href || "",
      sourceBadges: [...document.querySelectorAll(".source-badge")].map((node) => node.textContent.trim()),
      focusTitle: document.querySelector("#focus-title")?.textContent || "",
      category: state.category,
      bodyOverflowX: document.body.scrollWidth > document.body.clientWidth,
    }));
    report.popupUrl = popupUrl;
    report.consoleErrors = consoleErrors;

    if (report.activeTab !== "industry-pulse") throw new Error(`Unexpected active tab: ${report.activeTab}`);
    if (report.industryTabCount !== "6") throw new Error(`Unexpected industry count: ${report.industryTabCount}`);
    if (report.filter !== "physical-ai") throw new Error(`Unexpected filter: ${report.filter}`);
    if (report.visibleCards !== 1) throw new Error(`Expected 1 visible physical AI industry card, got ${report.visibleCards}`);
    if (!report.selectedTitle.includes("NVIDIA")) throw new Error(`Unexpected selected title: ${report.selectedTitle}`);
    if (!report.sourceHref.includes("nvidia-physical-ai-report")) throw new Error(`Unexpected source href: ${report.sourceHref}`);
    if (!report.popupUrl?.includes("nvidia-physical-ai-report")) throw new Error(`Source link did not open expected popup: ${report.popupUrl}`);
    if (!report.sourceBadges.some((text) => text.includes("产业企业"))) throw new Error(`Industry source badge missing: ${report.sourceBadges.join(" | ")}`);
    if (!report.focusTitle.includes("物理AI")) throw new Error(`Linked global event did not focus: ${report.focusTitle}`);
    if (report.category !== "physical-ai") throw new Error(`Expected physical-ai category after linked event, got ${report.category}`);
    if (report.bodyOverflowX) throw new Error("Page has horizontal overflow after industry pulse");

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
