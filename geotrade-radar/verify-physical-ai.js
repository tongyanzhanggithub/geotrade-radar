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
      markets: { source: "Yahoo Finance", sourceUrl: "https://finance.yahoo.com/", count: 2, stale: false, error: null, fetchedAt: updatedAt },
      sanctions: { source: "U.S. Treasury OFAC", sourceUrl: "https://ofac.treasury.gov/recent-actions", count: 0, stale: false, error: null, fetchedAt: updatedAt },
    },
    events: [
      {
        id: "physical-ai-edge-inference",
        title: "物理AI边缘推理芯片进入工厂验证",
        summary: "用于验证物理AI专题可以关联真实事件流。",
        category: "physical-ai",
        categoryLabel: "物理AI",
        countries: ["中国台湾"],
        sectors: ["物理AI", "边缘推理", "机器人控制器"],
        commodities: ["半导体"],
        route: "物理AI产业链与场景落地",
        score: 83,
        confidence: 82,
        source: "Fixture Physical AI",
        sourceUrl: "http://127.0.0.1:4173/physical-ai-report",
        time: "2026-06-05 02:00 UTC",
        lon: 121,
        lat: 24,
        impact: [["实时事件", "边缘推理需求上升"]],
        real: true,
      },
      {
        id: "fixture-shipping",
        title: "航运事件对照测试",
        summary: "用于确认物理AI分类不会吞掉其他事件。",
        category: "supply",
        categoryLabel: "供应链",
        countries: ["新加坡"],
        sectors: ["航运"],
        commodities: ["原油"],
        route: "全球关键贸易路线",
        score: 76,
        confidence: 79,
        source: "Fixture Shipping",
        sourceUrl: "http://127.0.0.1:4173/shipping-report",
        time: "2026-06-05 01:00 UTC",
        lon: 103,
        lat: 1,
        impact: [["实时事件", "航运压力上升"]],
        real: true,
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
    await page.locator('[data-tab="physical-ai"]').click();
    await page.waitForSelector(".physical-ai-radar", { timeout: 5000 });
    await page.locator('[data-physical-ai-filter="edge"]').click();
    await page.waitForFunction(() => document.querySelector(".ai-filter.active")?.dataset.physicalAiFilter === "edge", null, { timeout: 5000 });
    await page.locator('[data-physical-ai-signal="edge"]').click();
    await page.locator(".physical-ai-detail .open-linked-event").click();
    await page.waitForFunction(() => document.querySelector("#focus-title")?.textContent.includes("边缘推理"), null, { timeout: 5000 });

    const report = await page.evaluate(() => ({
      tabVisible: Boolean(document.querySelector('[data-tab="physical-ai"]')),
      activeTab: document.querySelector(".tab-button.active")?.dataset.tab,
      filter: document.querySelector(".ai-filter.active")?.dataset.physicalAiFilter,
      selectedTitle: document.querySelector(".physical-ai-detail h3")?.textContent || "",
      focusTitle: document.querySelector("#focus-title")?.textContent || "",
      category: state.category,
      eventCards: document.querySelectorAll(".event-card").length,
      loopSteps: document.querySelectorAll(".physical-ai-loop span").length,
      bodyOverflowX: document.body.scrollWidth > document.body.clientWidth,
    }));
    report.consoleErrors = consoleErrors;

    if (!report.tabVisible) throw new Error("Physical AI tab is missing");
    if (report.activeTab !== "physical-ai") throw new Error(`Unexpected active tab: ${report.activeTab}`);
    if (report.filter !== "edge") throw new Error(`Unexpected physical AI filter: ${report.filter}`);
    if (!report.selectedTitle.includes("端侧算力")) throw new Error(`Unexpected selected signal: ${report.selectedTitle}`);
    if (!report.focusTitle.includes("边缘推理")) throw new Error(`Linked event did not focus: ${report.focusTitle}`);
    if (report.category !== "physical-ai") throw new Error(`Linked event category mismatch: ${report.category}`);
    if (report.eventCards !== 1) throw new Error(`Expected physical AI event list to show 1 card, got ${report.eventCards}`);
    if (report.loopSteps !== 5) throw new Error(`Expected 5 loop steps, got ${report.loopSteps}`);
    if (report.bodyOverflowX) throw new Error("Page has horizontal overflow after Physical AI tab");

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
