const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

async function waitForServer(url, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Server did not start within ${timeout}ms`);
}

async function run() {
  const root = __dirname;
  const artifacts = path.join(root, "artifacts");
  await fs.mkdir(artifacts, { recursive: true });
  const server = spawn(process.execPath, ["server.js"], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  let browser;
  try {
    const health = await waitForServer("http://127.0.0.1:4173/api/health");
    const snapshotResponse = await fetch("http://127.0.0.1:4173/api/snapshot?period=day");
    const snapshot = await snapshotResponse.json();

    browser = await chromium.launch({
      headless: true,
      executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.goto("http://127.0.0.1:4173");
    await page.waitForSelector(".event-card");
    await page.waitForFunction(() => document.body.dataset.dataMode && document.body.dataset.dataMode !== "loading", null, {
      timeout: 45000,
    });

    const desktop = {
      dataMode: await page.locator("body").getAttribute("data-data-mode"),
      syncMode: await page.locator("#sync-mode").innerText(),
      activePeriod: await page.locator(".period-button.active").innerText(),
      eventCount: await page.locator(".event-card").count(),
      marketCount: await page.locator(".market-card").count(),
      sourceBadges: await page.locator(".source-badge").allInnerTexts(),
      eventTitleFontSize: await page.locator(".event-card h3").first().evaluate((node) => getComputedStyle(node).fontSize),
      eventSummaryFontSize: await page.locator(".event-card p").first().evaluate((node) => getComputedStyle(node).fontSize),
      sectionTitleFontSize: await page.locator(".rail-heading h1").evaluate((node) => getComputedStyle(node).fontSize),
      topbarFit: await page.locator(".topbar").evaluate((node) => node.scrollWidth <= node.clientWidth),
      actionFit: await page.locator(".topbar-actions").evaluate((node) => node.scrollWidth <= node.clientWidth),
    };
    await page.screenshot({ path: path.join(artifacts, "geotrade-live-desktop.png"), fullPage: true });

    await page.locator('[data-period="week"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-period="week"]').classList.contains("active") &&
        document.body.dataset.dataMode !== "loading" &&
        document.querySelector("#risk-overview-title").textContent.includes("7 日"),
      null,
      { timeout: 45000 },
    );
    desktop.weekTitle = await page.locator("#risk-overview-title").innerText();

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await mobile.goto("http://127.0.0.1:4173");
    await mobile.waitForSelector(".period-selector");
    await mobile.screenshot({ path: path.join(artifacts, "geotrade-live-mobile.png"), fullPage: true });
    const mobileReport = {
      periodVisible: await mobile.locator(".period-selector").isVisible(),
      bodyWidth: await mobile.locator("body").evaluate((node) => ({ scroll: node.scrollWidth, client: node.clientWidth })),
      eventTitleFontSize: await mobile.locator(".event-card h3").first().evaluate((node) => getComputedStyle(node).fontSize),
    };

    const fixturePage = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await fixturePage.route("**/api/snapshot**", async (route) => {
      const period = new URL(route.request().url()).searchParams.get("period") || "day";
      const updatedAt = new Date().toISOString();
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          period,
          periodLabel: { day: "日", week: "周", month: "月" }[period],
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
              id: "live-shipping",
              title: "真实航运事件测试",
              summary: "来自实时事件源的测试记录。",
              category: "supply",
              categoryLabel: "供应链",
              countries: ["新加坡"],
              sectors: ["航运"],
              commodities: ["原油"],
              route: "亚洲航线",
              score: 88,
              confidence: 82,
              source: "GDELT",
              sourceUrl: "https://www.gdeltproject.org/",
              time: "2026-06-04 03:00 UTC",
              lon: 103,
              lat: 1,
              impact: [["实时事件", "航运压力上升"]],
              real: true,
            },
            {
              id: "live-ai",
              title: "真实 AI 事件测试",
              summary: "来自实时事件源的 AI 与机器人记录。",
              category: "ai-robotics",
              categoryLabel: "AI 与机器人",
              countries: ["美国"],
              sectors: ["AI 硬件"],
              commodities: [],
              route: "全球 AI 供应链",
              score: 76,
              confidence: 80,
              source: "GDELT",
              sourceUrl: "https://www.gdeltproject.org/",
              time: "2026-06-04 02:00 UTC",
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
        }),
      });
    });
    await fixturePage.goto("http://127.0.0.1:4173");
    await fixturePage.waitForFunction(() => document.body.dataset.dataMode === "live", null, { timeout: 15000 });
    const fixture = {
      mode: await fixturePage.locator("#sync-mode").innerText(),
      eventCount: await fixturePage.locator(".event-card").count(),
      marketCount: await fixturePage.locator(".market-card").count(),
      sourceBadges: await fixturePage.locator(".source-badge").allInnerTexts(),
    };
    await fixturePage.locator('[data-period="month"]').click();
    await fixturePage.waitForFunction(() => document.querySelector("#risk-overview-title").textContent.includes("30 日"));
    fixture.monthTitle = await fixturePage.locator("#risk-overview-title").innerText();
    await fixturePage.screenshot({ path: path.join(artifacts, "geotrade-live-fixture.png"), fullPage: true });

    console.log(
      JSON.stringify(
        {
          health,
          snapshot: {
            mode: snapshot.mode,
            counts: Object.fromEntries(Object.entries(snapshot.providers).map(([key, provider]) => [key, provider.count])),
            errors: Object.fromEntries(Object.entries(snapshot.providers).map(([key, provider]) => [key, provider.error])),
          },
          desktop,
          mobile: mobileReport,
          fixture,
          consoleErrors,
        },
        null,
        2,
      ),
    );
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
