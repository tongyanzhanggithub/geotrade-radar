const path = require("node:path");
const fs = require("node:fs/promises");
const { chromium } = require("playwright");

const root = __dirname;
const sourceUrl = "http://127.0.0.1:4173/original-report";

function fixtureSnapshot() {
  const updatedAt = new Date().toISOString();
  return {
    period: "day",
    periodLabel: "日",
    updatedAt,
    mode: "live",
    providers: {
      events: { source: "GDELT", sourceUrl: "https://www.gdeltproject.org/", count: 2, stale: false, error: null, fetchedAt: updatedAt },
      markets: { source: "Yahoo Finance", sourceUrl: "https://finance.yahoo.com/", count: 2, stale: false, error: null, fetchedAt: updatedAt },
      sanctions: {
        source: "U.S. Treasury OFAC",
        sourceUrl: "https://ofac.treasury.gov/recent-actions",
        count: 0,
        stale: false,
        error: null,
        fetchedAt: updatedAt,
      },
    },
    events: [
      {
        id: "source-link-shipping",
        title: "原文链接航运事件测试",
        summary: "用于验证事件卡片和详情栏可以打开原始报道。",
        category: "supply",
        categoryLabel: "供应链",
        countries: ["新加坡"],
        sectors: ["航运"],
        commodities: ["原油"],
        route: "亚洲航线",
        score: 88,
        confidence: 82,
        source: "Fixture News",
        sourceUrl,
        time: "2026-06-05 02:00 UTC",
        lon: 103,
        lat: 1,
        impact: [["实时事件", "航运压力上升"]],
        real: true,
      },
      {
        id: "source-link-ai",
        title: "原文链接 AI 事件测试",
        summary: "用于验证切换事件后详情原文入口会同步更新。",
        category: "ai-robotics",
        categoryLabel: "AI 与机器人",
        countries: ["美国"],
        sectors: ["AI 硬件"],
        commodities: [],
        route: "全球 AI 供应链",
        score: 76,
        confidence: 80,
        source: "Fixture AI",
        sourceUrl: "http://127.0.0.1:4173/ai-original-report",
        time: "2026-06-05 01:00 UTC",
        lon: -97,
        lat: 38,
        impact: [["实时事件", "算力供应变化"]],
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
  const artifacts = path.join(root, "artifacts");
  await fs.mkdir(artifacts, { recursive: true });

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
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(fixtureSnapshot()) });
    });

    await page.goto("http://127.0.0.1:4173");
    await page.waitForFunction(() => document.body.dataset.dataMode === "live", null, { timeout: 15000 });
    await page.waitForSelector(".event-source-link", { timeout: 5000 });
    await page.waitForSelector("#detail-source-action:not([hidden])", { timeout: 5000 });

    const popupPromise = page.waitForEvent("popup", { timeout: 7000 }).catch(() => null);
    await page.locator(".event-source-link").first().click();
    const popup = await popupPromise;
    const popupUrl = popup?.url() || null;
    if (popup) await popup.close();

    await page.locator(".event-card").nth(1).click();
    await page.waitForFunction(() => document.querySelector("#focus-title")?.textContent.includes("AI"), null, { timeout: 5000 });

    const report = await page.evaluate(() => {
      const firstCardSource = document.querySelector(".event-source-link");
      const detailAction = document.querySelector("#detail-source-action");
      const detailSource = document.querySelector("#detail-source a");
      const body = document.body;
      return {
        dataMode: body.dataset.dataMode,
        cards: document.querySelectorAll(".event-card").length,
        sourceLinks: document.querySelectorAll(".event-source-link").length,
        cardTag: document.querySelector(".event-card")?.tagName,
        selectButtons: document.querySelectorAll(".event-select[data-event-id]").length,
        firstCardHref: firstCardSource?.href || null,
        firstCardTarget: firstCardSource?.target || null,
        detailHref: detailAction?.href || null,
        detailTarget: detailAction?.target || null,
        detailSourceHref: detailSource?.href || null,
        selectedTitle: document.querySelector("#focus-title")?.textContent || "",
        bodyOverflowX: body.scrollWidth > body.clientWidth,
      };
    });
    const medium = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
    await medium.route("**/api/snapshot**", async (route) => {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(fixtureSnapshot()) });
    });
    await medium.goto("http://127.0.0.1:4173");
    await medium.waitForFunction(() => document.body.dataset.dataMode === "live", null, { timeout: 15000 });
    await medium.locator("#mobile-menu").click();
    await medium.waitForSelector(".event-rail.open .event-source-link", { timeout: 5000 });
    report.mediumDrawer = await medium.evaluate(() => {
      const rail = document.querySelector(".event-rail");
      const link = document.querySelector(".event-rail.open .event-source-link");
      return {
        open: rail?.classList.contains("open") || false,
        sourceVisible: Boolean(link && getComputedStyle(link).visibility !== "hidden"),
        href: link?.href || null,
        bodyOverflowX: document.body.scrollWidth > document.body.clientWidth,
      };
    });
    await medium.close();

    report.popupUrl = popupUrl;
    report.consoleErrors = consoleErrors;

    await page.screenshot({ path: path.join(artifacts, "geotrade-source-links.png"), fullPage: true });

    if (report.sourceLinks !== 2) throw new Error(`Expected 2 source links, got ${report.sourceLinks}`);
    if (report.cardTag !== "ARTICLE") throw new Error(`Expected event card article, got ${report.cardTag}`);
    if (report.selectButtons !== 2) throw new Error(`Expected 2 select buttons, got ${report.selectButtons}`);
    if (report.firstCardHref !== sourceUrl) throw new Error(`Unexpected card href: ${report.firstCardHref}`);
    if (report.firstCardTarget !== "_blank") throw new Error("Card source link must open in a new tab");
    if (!report.detailHref.includes("ai-original-report")) throw new Error(`Detail href did not update after selecting AI event: ${report.detailHref}`);
    if (report.detailTarget !== "_blank") throw new Error("Detail source action must open in a new tab");
    if (!report.detailSourceHref.includes("ai-original-report")) throw new Error(`Detail source text link did not update: ${report.detailSourceHref}`);
    if (!report.popupUrl?.startsWith(sourceUrl)) throw new Error(`Source link did not open the expected popup: ${report.popupUrl}`);
    if (report.bodyOverflowX) throw new Error("Page has horizontal overflow after source-link controls");
    if (!report.mediumDrawer.open || !report.mediumDrawer.sourceVisible) throw new Error("Medium drawer source link is not visible");
    if (report.mediumDrawer.href !== sourceUrl) throw new Error(`Medium drawer href mismatch: ${report.mediumDrawer.href}`);
    if (report.mediumDrawer.bodyOverflowX) throw new Error("Medium drawer has horizontal overflow");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
