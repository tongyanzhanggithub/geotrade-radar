const path = require("node:path");
const fs = require("node:fs/promises");
const { chromium } = require("playwright");

async function run() {
  const root = __dirname;
  const artifacts = path.join(root, "artifacts");
  await fs.mkdir(artifacts, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(`file://${path.join(root, "index.html").replace(/\\/g, "/")}`);
  await page.waitForSelector(".event-card");
  await page.waitForTimeout(2500);

  const initialEventCount = await page.locator(".event-card").count();
  const initialMarkerCount = await page.locator(".map-marker").count();
  const leafletReady = await page.locator("#map-canvas").evaluate((node) => node.classList.contains("leaflet-ready"));
  const interactiveMapElements = await page.locator(".leaflet-interactive").count();
  const eventTitleFontSize = await page.locator(".event-card h3").first().evaluate((node) => getComputedStyle(node).fontSize);
  const eventSummaryFontSize = await page.locator(".event-card p").first().evaluate((node) => getComputedStyle(node).fontSize);
  await page.locator("#font-decrease").click();
  const reducedEventTitleFontSize = await page.locator(".event-card h3").first().evaluate((node) => getComputedStyle(node).fontSize);
  await page.locator("#font-increase").click();

  await page.locator('[data-category="supply"]').click();
  const supplyEventCount = await page.locator(".event-card").count();
  await page.locator('[data-category="ai-robotics"]').click();
  const aiRoboticsEventCount = await page.locator(".event-card").count();

  await page.locator("#global-search").fill("红海");
  await page.locator('[data-category="all"]').click();
  const searchResultCount = await page.locator(".event-card").count();
  const searchResultTitle = await page.locator(".event-card h3").innerText();

  await page.locator("#global-search").fill("");
  await page.locator('[data-category="all"]').click();
  await page.locator(".risk-toggle").click();
  const highRiskEventCount = await page.locator(".event-card").count();
  await page.locator(".risk-toggle").click();
  await page.locator('[data-event-id="us-battery-tariff"]').first().click();
  const focusedTitle = await page.locator("#focus-title").innerText();
  const watchCountBefore = await page.locator("#watch-count").innerText();
  await page.locator("#focus-watch").click();
  const watchCountAfter = await page.locator("#watch-count").innerText();

  const tabResults = {};
  for (const id of ["markets", "policy", "supply", "sanctions", "brief", "ai-robotics", "matrix", "opportunities", "scenarios"]) {
    await page.locator(`[data-tab="${id}"]`).click();
    tabResults[id] = (await page.locator("#dock-content").innerText()).length;
  }

  await page.locator('[data-tab="ai-robotics"]').click();
  await page.locator('[data-ai-filter="robotics"]').click();
  const aiFilteredSignals = await page.locator(".ai-signal").count();
  await page.locator(".ai-signal").first().click();
  const aiSelectedDetail = await page.locator(".ai-signal-detail h3").innerText();
  await page.screenshot({ path: path.join(artifacts, "geotrade-ai-robotics.png"), fullPage: true });
  await page.locator(".open-linked-event").click();
  const aiLinkedEventTitle = await page.locator("#focus-title").innerText();
  const aiCategoryActive = await page.locator('[data-category="ai-robotics"]').evaluate((node) => node.classList.contains("active"));
  await page.locator('[data-layer="ports"]').click();
  const portsLayerActive = await page.locator('[data-layer="ports"]').evaluate((node) => node.classList.contains("active"));
  await page.locator('[data-tab="matrix"]').click();
  await page.screenshot({ path: path.join(artifacts, "geotrade-matrix.png"), fullPage: true });
  await page.locator('[data-tab="scenarios"]').click();
  await page.screenshot({ path: path.join(artifacts, "geotrade-scenarios.png"), fullPage: true });
  await page.locator('[data-tab="markets"]').click();
  await page.screenshot({ path: path.join(artifacts, "geotrade-desktop.png"), fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobile.goto(`file://${path.join(root, "index.html").replace(/\\/g, "/")}`);
  await mobile.waitForSelector("#mobile-menu");
  await mobile.screenshot({ path: path.join(artifacts, "geotrade-mobile.png"), fullPage: true });
  await mobile.locator("#mobile-menu").click();
  const mobileRailOpen = await mobile.locator("#event-rail").evaluate((node) => node.classList.contains("open"));
  await mobile.screenshot({ path: path.join(artifacts, "geotrade-mobile-menu.png"), fullPage: true });

  const report = {
    initialEventCount,
    initialMarkerCount,
    leafletReady,
    interactiveMapElements,
    eventTitleFontSize,
    eventSummaryFontSize,
    reducedEventTitleFontSize,
    supplyEventCount,
    aiRoboticsEventCount,
    searchResultCount,
    searchResultTitle,
    highRiskEventCount,
    focusedTitle,
    watchCountBefore,
    watchCountAfter,
    tabResults,
    aiFilteredSignals,
    aiSelectedDetail,
    aiLinkedEventTitle,
    aiCategoryActive,
    portsLayerActive,
    mobileRailOpen,
    consoleErrors,
  };

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
