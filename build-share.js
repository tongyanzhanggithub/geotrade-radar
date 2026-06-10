const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const shareDir = path.join(root, "share");
const outFile = path.join(shareDir, "GeoTrade-Radar-朋友双击版.html");
const guideFile = path.join(shareDir, "使用说明.txt");

function read(name) {
  return fs.readFileSync(path.join(root, name), "utf8");
}

function inlineScript(name) {
  return `<script>\n${read(name).replace(/<\/script/gi, "<\\/script")}\n</script>`;
}

fs.mkdirSync(shareDir, { recursive: true });

let html = read("index.html");
html = html.replace(
  '<link rel="stylesheet" href="./styles.css" />',
  `<style>\n${read("styles.css")}\n</style>`,
);
html = html.replace(
  '<script src="./app.js"></script>\n    <script src="./upgrade.js"></script>\n    <script src="./live-data.js"></script>',
  `<script>window.GEOTRADE_STATIC_SHARE = true;</script>\n    ${inlineScript("app.js")}\n    ${inlineScript("upgrade.js")}\n    ${inlineScript("live-data.js")}`,
);

fs.writeFileSync(outFile, html, "utf8");
fs.writeFileSync(
  guideFile,
  [
    "GeoTrade Radar 分享说明",
    "",
    "1. 最简单：直接双击 GeoTrade-Radar-朋友双击版.html。",
    "   这个文件已经内置样式和脚本，朋友不用安装 Node，也不用保持项目目录结构。",
    "   它显示完整界面和演示数据，适合快速体验视觉和交互。",
    "",
    "2. 实时数据版：需要使用完整项目文件夹，不能只发 index.html。",
    "   对方需要先解压整个文件夹，再双击 start-live.cmd，浏览器打开 http://127.0.0.1:4173。",
    "   只在压缩包里直接点 index.html，或者只发送 index.html，都会出现白底裸页面或无实时数据。",
    "",
    "3. 如果想让任何朋友打开同一个网址就有实时数据，需要把完整项目部署到一台在线服务器。",
    "   本地的 127.0.0.1 只代表每个人自己的电脑，不能共享给别人。",
    "",
  ].join("\r\n"),
  "utf8",
);

console.log(`Wrote ${outFile}`);
console.log(`Wrote ${guideFile}`);
