const path = require("node:path");
const fs = require("node:fs/promises");
const { chromium } = require("playwright");

function snapshotFixture() {
  const updatedAt = new Date().toISOString();
  return {
    period: "day",
    periodLabel: "日",
    updatedAt,
    mode: "live",
    providers: {
      events: { source: "GDELT", sourceUrl: "https://www.gdeltproject.org/", count: 4, stale: false, error: null, fetchedAt: updatedAt },
      markets: { source: "Yahoo Finance", sourceUrl: "https://finance.yahoo.com/", count: 2, stale: false, error: null, fetchedAt: updatedAt },
      sanctions: { source: "U.S. Treasury OFAC", sourceUrl: "https://ofac.treasury.gov/recent-actions", count: 0, stale: false, error: null, fetchedAt: updatedAt },
    },
    events: [
      {
        id: "rail-physical-ai",
        title: "物理AI边缘推理芯片进入工厂验证",
        summary: "用于验证事件流顶部筛选区域不会被截断。",
        category: "physical-ai",
        categoryLabel: "物理AI",
        countries: ["中国台湾"],
        sectors: ["物理AI", "边缘推理"],
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
      },
      {
        id: "rail-ai",
        title: "AI芯片供应链对照事件",
        summary: "用于验证 AI 与机器人分类按钮显示。",
        category: "ai-robotics",
        categoryLabel: "AI 与机器人",
        countries: ["美国"],
        sectors: ["AI 硬件"],
        commodities: ["半导体"],
        route: "全球 AI 供应链",
        score: 78,
        confidence: 80,
        source: "Fixture AI",
        sourceUrl: "http://127.0.0.1:4173/ai-report",
        time: "2026-06-05 01:00 UTC",
        lon: -97,
        lat: 38,
        impact: [["实时事件", "算力供应变化"]],
      },
      {
        id: "rail-supply",
        title: "航运事件对照测试",
        summary: "用于确认供应链分类。",
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
      },
      {
        id: "rail-policy",
        title: "贸易政策事件对照测试",
        summary: "用于确认筛选按钮换行后仍保持可读。",
        category: "policy",
        categoryLabel: "贸易政策",
        countries: ["欧盟"],
        sectors: ["跨境贸易"],
        commodities: [],
        route: "全球贸易与产业链",
        score: 70,
        confidence: 75,
        source: "Fixture Policy",
        sourceUrl: "http://127.0.0.1:4173/policy-report",
        time: "2026-06-05 00:30 UTC",
        lon: 10,
        lat: 50,
        impact: [["实时事件", "政策变化"]],
      },
    ],
    markets: [
      { symbol: "SPX", name: "标普 500", value: "6,100.20", numericValue: 6100.2, change: 0.42, risk: "关注", points: [25, 22, 20, 18, 16, 14, 12, 10] },
      { symbol: "VIX", name: "波动率指数", value: "18.50", numericValue: 18.5, change: -0.2, risk: "关注", points: [10, 12, 14, 16, 15, 18, 20, 22] },
    ],
    sanctions: [],
  };
}

async function inspectRail(page, name) {
  return page.evaluate((scenario) => {
    const rect = (selector) => {
      const node = document.querySelector(selector);
      const box = node.getBoundingClientRect();
      return {
        top: Math.round(box.top),
        right: Math.round(box.right),
        bottom: Math.round(box.bottom),
        left: Math.round(box.left),
        width: Math.round(box.width),
        height: Math.round(box.height),
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth,
        scrollHeight: node.scrollHeight,
        clientHeight: node.clientHeight,
      };
    };
    const rail = rect(".event-rail");
    const heading = rect(".rail-heading");
    const filters = rect(".filter-row");
    const toggle = rect(".risk-toggle");
    const list = rect(".event-list");
    const buttons = [...document.querySelectorAll(".filter-button")].map((button) => {
      const box = button.getBoundingClientRect();
      return {
        text: button.textContent.trim(),
        top: Math.round(box.top),
        bottom: Math.round(box.bottom),
        left: Math.round(box.left),
        right: Math.round(box.right),
        scrollWidth: button.scrollWidth,
        clientWidth: button.clientWidth,
        scrollHeight: button.scrollHeight,
        clientHeight: button.clientHeight,
      };
    });
    return {
      scenario,
      rail,
      heading,
      filters,
      toggle,
      list,
      buttons,
      title: document.querySelector(".rail-heading h1")?.textContent || "",
      categoryCount: buttons.length,
      railOpen: document.querySelector(".event-rail")?.classList.contains("open") || false,
      bodyOverflowX: document.body.scrollWidth > document.body.clientWidth,
    };
  }, name);
}

function assertRail(report) {
  const gap = 2;
  if (!report.title.includes("全球事件流")) throw new Error(`${report.scenario}: title missing`);
  if (report.categoryCount < 7) throw new Error(`${report.scenario}: expected all category buttons, got ${report.categoryCount}`);
  if (report.scenario !== "desktop" && !report.railOpen) throw new Error(`${report.scenario}: drawer class is not open`);
  if (report.scenario !== "desktop" && report.rail.left < -gap) throw new Error(`${report.scenario}: drawer is still outside viewport`);
  if (report.heading.bottom > report.filters.top + gap) throw new Error(`${report.scenario}: heading overlaps filters`);
  if (report.filters.bottom > report.toggle.top + gap) throw new Error(`${report.scenario}: filters overlap risk toggle`);
  if (report.toggle.bottom > report.list.top + gap) throw new Error(`${report.scenario}: risk toggle overlaps event list`);
  if (report.bodyOverflowX) throw new Error(`${report.scenario}: body has horizontal overflow`);
  for (const button of report.buttons) {
    if (button.top < report.filters.top - gap || button.bottom > report.filters.bottom + gap) {
      throw new Error(`${report.scenario}: filter button clipped vertically: ${button.text}`);
    }
    if (button.scrollWidth > button.clientWidth + 1 || button.scrollHeight > button.clientHeight + 1) {
      throw new Error(`${report.scenario}: filter button text clipped: ${button.text}`);
    }
  }
}

async function run() {
  const artifacts = path.join(__dirname, "artifacts");
  await fs.mkdir(artifacts, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });

  try {
    const viewports = [
      ["desktop", 1920, 1080, false],
      ["compact", 1366, 768, true],
      ["mobile", 390, 844, true],
    ];
    const reports = [];
    for (const [name, width, height, openDrawer] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      await page.route("**/api/snapshot**", async (route) => {
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(snapshotFixture()) });
      });
      await page.goto("http://127.0.0.1:4173");
      await page.waitForFunction(() => document.body.dataset.dataMode === "live", null, { timeout: 15000 });
      if (openDrawer) {
        await page.locator("#mobile-menu").click();
        await page.waitForFunction(() => document.querySelector(".event-rail")?.classList.contains("open"), null, { timeout: 5000 });
        await page.waitForTimeout(260);
      }
      const report = await inspectRail(page, name);
      assertRail(report);
      await page.screenshot({ path: path.join(artifacts, `event-rail-${name}.png`), fullPage: true });
      reports.push(report);
      await page.close();
    }
    console.log(
      JSON.stringify(
        reports.map((report) => ({
          scenario: report.scenario,
          categoryCount: report.categoryCount,
          railOpen: report.railOpen,
          rail: report.rail,
          heading: report.heading,
          filters: report.filters,
          toggle: report.toggle,
          listTop: report.list.top,
          bodyOverflowX: report.bodyOverflowX,
        })),
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
