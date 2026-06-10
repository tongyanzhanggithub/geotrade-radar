// AI 周报：每周一为付费用户生成基于其画像的专属周报（市场动态 + 风险 + 建议），
// 通过邮件和/或企业微信机器人送达。weekly_log 表保证每人每周只发一次。
//
// 依赖环境变量：ANTHROPIC_API_KEY（生成）；SMTP_*（邮件通道，见 alerts.js）。
const auth = require("./auth.js");
const alerts = require("./alerts.js");

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const WEEKLY_MODEL = "claude-sonnet-4-6";

// 本周一的日期（UTC+8 视角），作为周报去重键
function currentWeekKey(now = new Date()) {
  const cn = new Date(now.getTime() + 8 * 3600 * 1000);
  const day = cn.getUTCDay() || 7; // 周日=7
  cn.setUTCDate(cn.getUTCDate() - (day - 1));
  return cn.toISOString().slice(0, 10);
}

function profileSummary(profile) {
  const parts = [];
  if (profile.hsCodes?.length) parts.push(`品类：${profile.hsCodes.join("、")}`);
  if (profile.countries?.length) parts.push(`出口市场：${profile.countries.join("、")}`);
  if (profile.routes?.length) parts.push(`关注航线：${profile.routes.join("、")}`);
  return parts.join("；") || "未填写";
}

async function generateWeeklyText(profile, matchedItems, markets) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const error = new Error("AI 周报未启用：服务器未设置 ANTHROPIC_API_KEY");
    error.code = "NO_KEY";
    throw error;
  }
  const context = {
    用户画像: profileSummary(profile),
    本周相关事件: matchedItems.slice(0, 20).map((item) => ({
      类型: item.kind,
      标题: item.title,
      摘要: (item.summary || "").slice(0, 120),
    })),
    市场行情: (markets || []).slice(0, 10).map((m) => ({ 名称: m.name, 最新: m.price, 涨跌: m.changePercent })),
  };
  const body = {
    model: WEEKLY_MODEL,
    max_tokens: 2500,
    system:
      "你是 GeoTrade Radar 的贸易风险分析师。根据用户画像和本周事件写一份中文周报，纯文本（不用 markdown 符号），结构：1)本周概览(2-3句) 2)与你相关的风险(逐条,每条1-2句) 3)市场动态(2-3句) 4)下周建议(2-3条,具体可执行)。总长 400-600 字。只依据提供的数据，不要编造事件。",
    messages: [{ role: "user", content: `数据(JSON)：\n${JSON.stringify(context)}` }],
  };
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Claude API ${response.status}${text ? "：" + text.slice(0, 200) : ""}`);
  }
  const data = await response.json();
  const textBlock = (data.content || []).find((block) => block.type === "text");
  if (!textBlock) throw new Error("AI 未返回有效内容");
  return textBlock.text.trim();
}

// 主入口（“每周一”的日期检查在调度器里，这里调用即执行）。
// dryRun=true 时跳过 AI 生成与发送，只返回符合条件的用户数（测试用）。
async function runWeekly(getSnapshotFn, { dryRun = false, log = console } = {}) {
  const week = currentWeekKey();
  const subscribers = auth
    .listAlertSubscribers()
    .filter((s) => (s.profile.emailAlerts || s.profile.webhook) && !auth.weeklyAlreadySent(s.id, week));
  if (!subscribers.length) return { week, eligible: 0, sent: 0 };
  if (dryRun) return { week, eligible: subscribers.length, sent: 0, dryRun: true };

  const snapshot = await getSnapshotFn("week");
  const items = [
    ...alerts.collectItems(snapshot),
    ...(await alerts.collectMofcomItems()),
    ...(await alerts.collectFreightItems()),
  ];
  let sent = 0;

  for (const subscriber of subscribers) {
    const matched = items.filter((item) => alerts.matchesProfile(item, subscriber.profile));
    try {
      const text = await generateWeeklyText(subscriber.profile, matched, snapshot.markets);
      const subject = `GeoTrade 雷达周报 · ${week} 当周`;
      let delivered = false;
      if (subscriber.profile.emailAlerts && process.env.SMTP_HOST) {
        try {
          await alerts.sendEmail(subscriber.email, subject, text);
          delivered = true;
        } catch (error) {
          log.warn(`周报邮件失败 user=${subscriber.id}: ${error.message}`);
        }
      }
      if (subscriber.profile.webhook) {
        try {
          await alerts.sendWebhook(subscriber.profile.webhook, [`**${subject}**`, text.slice(0, 3500)]);
          delivered = true;
        } catch (error) {
          log.warn(`周报 webhook 失败 user=${subscriber.id}: ${error.message}`);
        }
      }
      if (delivered) {
        auth.markWeeklySent(subscriber.id, week);
        sent += 1;
      }
    } catch (error) {
      log.warn(`周报生成失败 user=${subscriber.id}: ${error.message}`);
      if (error.code === "NO_KEY") break; // 没配 key 时不必逐个重试
    }
  }
  return { week, eligible: subscribers.length, sent };
}

// 调度判断：当前是否处于"周一 8 点后"（UTC+8）
function isMondayMorning(now = new Date()) {
  const cn = new Date(now.getTime() + 8 * 3600 * 1000);
  return cn.getUTCDay() === 1 && cn.getUTCHours() >= 8;
}

module.exports = { runWeekly, currentWeekKey, isMondayMorning, generateWeeklyText };
