// 标题翻译层：把全球事件流的外文标题翻译成中文，附加到 event.titleZh。
// 前端展示时以中文为主、原文为辅，做到"每条新闻都看得懂"。
//
// 设计要点：
// - 按标题做持久化缓存（data/title-translations.json），同一标题只翻译一次，
//   控制成本与延迟；事件缓存 5 分钟，翻译几乎只在有新标题时触发。
// - 未配置 ANTHROPIC_API_KEY 时优雅降级：titleZh 留空，前端回退显示原文。
// - 任何失败都不抛出，不影响快照返回。
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const TRANSLATE_MODEL = "claude-haiku-4-5-20251001";
const CACHE_FILE = path.join(process.env.DATA_DIR || __dirname, "title-translations.json");
const MAX_PER_RUN = 100; // 单次快照最多翻译的新标题数
const MAX_CACHE = 5000; // 缓存条目上限，超出后按写入顺序淘汰

let cache = null; // Map<sha1(title), zh>
let inflight = false; // 防止同一批标题并发重复翻译

function keyOf(title) {
  return crypto.createHash("sha1").update(title).digest("hex");
}

// 判断标题是否已是中文（CJK 占比超过 30% 即视为无需翻译）
function isChinese(text) {
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  return cjk > 0 && cjk / text.length >= 0.3;
}

function loadCache() {
  if (cache) return cache;
  cache = new Map();
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    for (const [k, v] of Object.entries(raw)) cache.set(k, v);
  } catch {
    /* 文件不存在或损坏：从空缓存开始 */
  }
  return cache;
}

function persist() {
  try {
    // 超出上限时保留最近写入的 MAX_CACHE 条
    let entries = [...cache.entries()];
    if (entries.length > MAX_CACHE) {
      entries = entries.slice(entries.length - MAX_CACHE);
      cache = new Map(entries);
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(Object.fromEntries(entries)), "utf8");
  } catch {
    /* 持久化失败不影响运行，内存缓存仍有效 */
  }
}

async function translateBatch(titles, log) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const body = {
    model: TRANSLATE_MODEL,
    max_tokens: 4000,
    system:
      "你是专业财经新闻标题翻译。把用户给出的 JSON 字符串数组里每条外文新闻标题翻译成简洁、准确、地道的中文标题，" +
      "保留公司名/人名/地名/专有名词与数字，不要加引号或多余说明。只返回一个 JSON 字符串数组，" +
      "长度与输入完全一致、顺序一一对应。",
    messages: [{ role: "user", content: JSON.stringify(titles) }],
  };
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`翻译 API ${res.status}${t ? "：" + t.slice(0, 160) : ""}`);
  }
  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock) throw new Error("翻译未返回内容");
  // 容错：截取首个 JSON 数组
  const match = textBlock.text.match(/\[[\s\S]*\]/);
  const arr = JSON.parse(match ? match[0] : textBlock.text);
  if (!Array.isArray(arr)) throw new Error("翻译返回格式非数组");
  return arr.map((v) => (typeof v === "string" ? v.trim() : ""));
}

// 给一批事件补充 titleZh。命中缓存的立即赋值，未命中的批量翻译并缓存。
async function attachTitles(events, { log = console } = {}) {
  if (!Array.isArray(events) || !events.length) return events;
  const store = loadCache();
  const missing = new Map(); // title -> [event, ...]

  for (const event of events) {
    const title = event.title || "";
    if (!title) continue;
    if (isChinese(title)) {
      event.titleZh = title; // 已是中文，原样作为主标题
      continue;
    }
    const hit = store.get(keyOf(title));
    if (hit) {
      event.titleZh = hit;
    } else if (!missing.has(title)) {
      missing.set(title, [event]);
    } else {
      missing.get(title).push(event);
    }
  }

  if (!missing.size || inflight || !process.env.ANTHROPIC_API_KEY) return events;

  const titles = [...missing.keys()].slice(0, MAX_PER_RUN);
  inflight = true;
  try {
    const translated = await translateBatch(titles, log);
    if (translated) {
      titles.forEach((title, i) => {
        const zh = translated[i];
        if (!zh) return;
        store.set(keyOf(title), zh);
        for (const event of missing.get(title)) event.titleZh = zh;
      });
      persist();
    }
  } catch (error) {
    log.warn(`标题翻译失败（本轮回退原文）：${error.message}`);
  } finally {
    inflight = false;
  }
  return events;
}

module.exports = { attachTitles, isChinese };
