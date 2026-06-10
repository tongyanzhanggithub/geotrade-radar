const path = require("node:path");
const { chromium } = require("playwright");

const viewports = [
  ["wide", 1920, 1080],
  ["desktop", 1440, 900],
  ["laptop", 1366, 768],
  ["small-laptop", 1180, 720],
  ["tablet-landscape", 1024, 768],
  ["tablet-portrait", 768, 1024],
  ["mobile", 390, 844],
];

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  const reports = [];

  for (const [name, width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto("http://127.0.0.1:4173");
    await page.waitForSelector(".event-card");
    await page.waitForTimeout(1200);
    const report = await page.evaluate(() => {
      const box = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scrollWidth: node.scrollWidth,
          scrollHeight: node.scrollHeight,
          overflowX: node.scrollWidth > node.clientWidth + 1,
          overflowY: node.scrollHeight > node.clientHeight + 1,
        };
      };
      return {
        body: box("body"),
        topbar: box(".topbar"),
        actions: box(".topbar-actions"),
        workspace: box(".workspace"),
        overview: box(".risk-overview"),
        map: box(".map-stage"),
        eventRail: box(".event-rail"),
        insightRail: box(".insight-rail"),
        dock: box(".analysis-dock"),
        marketCardOverflow: [...document.querySelectorAll(".market-card")].some((node) => node.scrollWidth > node.clientWidth + 1),
        titleFont: getComputedStyle(document.querySelector(".event-card h3")).fontSize,
        summaryFont: getComputedStyle(document.querySelector(".event-card p")).fontSize,
        mobileMenu: getComputedStyle(document.querySelector("#mobile-menu")).display,
      };
    });
    if (report.mobileMenu !== "none") {
      await page.locator("#mobile-menu").click();
      await page.waitForTimeout(220);
      report.drawer = await page.locator("#event-rail").evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return { open: node.classList.contains("open"), left: Math.round(rect.left), width: Math.round(rect.width) };
      });
      await page.screenshot({ path: path.join(__dirname, "artifacts", `responsive-${name}-drawer.png`), fullPage: false });
      await page.locator(".event-card").first().click();
      report.drawer.closedAfterSelection = !(await page.locator("#event-rail").evaluate((node) => node.classList.contains("open")));
      await page.waitForTimeout(220);
    }
    if (name === "laptop") {
      await page.locator("#expand-dock").click();
      await page.waitForTimeout(180);
      report.expandedDock = await page.locator(".analysis-dock").evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return { left: Math.round(rect.left), right: Math.round(innerWidth - rect.right), top: Math.round(rect.top) };
      });
      await page.locator("#expand-dock").click();
      await page.locator("#font-decrease").click();
      await page.locator("#font-decrease").click();
      await page.waitForTimeout(180);
      report.manualFontLayout = await page.evaluate(() => ({
        readingSize: document.body.dataset.readingSize,
        bodyOverflowX: document.body.scrollWidth > document.body.clientWidth + 1,
        bodyOverflowY: document.body.scrollHeight > document.body.clientHeight + 1,
        workspaceOverflowY: document.querySelector(".workspace").scrollHeight > document.querySelector(".workspace").clientHeight + 1,
        mapWidth: Math.round(document.querySelector(".map-stage").getBoundingClientRect().width),
      }));
    }
    reports.push({ name, width, height, ...report });
    await page.screenshot({ path: path.join(__dirname, "artifacts", `responsive-${name}-after.png`), fullPage: false });
    await page.close();
  }

  console.log(JSON.stringify(reports, null, 2));
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
