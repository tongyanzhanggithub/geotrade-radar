// 预警引擎：把最新事件/制裁与付费用户画像匹配，命中且未推送过的条目
// 通过企业微信群机器人 webhook 和（可选）SMTP 邮件推送。
//
// 邮件需配置环境变量：SMTP_HOST、SMTP_PORT(默认465)、SMTP_USER、SMTP_PASS、
// SMTP_FROM(默认同 SMTP_USER)。未配置时只走 webhook 通道。
const crypto = require("node:crypto");
const tls = require("node:tls");
const auth = require("./auth.js");

const MAX_ALERTS_PER_USER_PER_RUN = 5;

function itemKey(item) {
  return crypto.createHash("sha1").update(`${item.title}|${item.source || ""}`).digest("hex");
}

// 与前端 app.js 的 matchesProfile 同一套规则
function matchesProfile(item, profile) {
  const terms = [...(profile.hsCodes || []), ...(profile.countries || []), ...(profile.routes || [])]
    .map((term) => term.toLowerCase())
    .filter(Boolean);
  if (!terms.length) return false;
  const haystack = [item.title, item.summary, ...(item.countries || []), ...(item.sectors || []), ...(item.commodities || []), item.route || ""]
    .join(" ")
    .toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

// 把快照数据拍平成统一的候选条目
function collectItems(snapshot) {
  const items = [];
  for (const event of snapshot.events || []) {
    items.push({
      kind: "全球事件",
      title: event.title,
      summary: event.summary || "",
      countries: event.countries,
      sectors: event.sectors,
      commodities: event.commodities,
      route: event.route,
      url: event.sourceUrl || event.url || "",
      source: event.source || "",
    });
  }
  for (const sanction of snapshot.sanctions || []) {
    items.push({
      kind: "官方制裁",
      title: sanction.title || sanction.program || "OFAC 制裁更新",
      summary: sanction.summary || sanction.note || "",
      countries: sanction.countries || (sanction.country ? [sanction.country] : []),
      url: sanction.url || "",
      source: "OFAC",
    });
  }
  return items;
}

async function sendWebhook(webhookUrl, lines) {
  const body = JSON.stringify({ msgtype: "markdown", markdown: { content: lines.join("\n") } });
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`webhook ${response.status}`);
}

// 极简 SMTPS(465) 客户端，零依赖。仅支持 AUTH LOGIN。
function sendEmail(to, subject, text) {
  const host = process.env.SMTP_HOST;
  if (!host) return Promise.resolve(false);
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const b64 = (value) => Buffer.from(value, "utf8").toString("base64");

  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, timeout: 15000 });
    let buffer = "";
    let step = 0;
    const steps = [
      { expect: 220, send: () => `EHLO geotrade-radar\r\n` },
      { expect: 250, send: () => `AUTH LOGIN\r\n` },
      { expect: 334, send: () => `${b64(user)}\r\n` },
      { expect: 334, send: () => `${b64(pass)}\r\n` },
      { expect: 235, send: () => `MAIL FROM:<${from}>\r\n` },
      { expect: 250, send: () => `RCPT TO:<${to}>\r\n` },
      { expect: 250, send: () => `DATA\r\n` },
      {
        expect: 354,
        send: () =>
          [
            `From: GeoTrade Radar <${from}>`,
            `To: <${to}>`,
            `Subject: =?UTF-8?B?${b64(subject)}?=`,
            `MIME-Version: 1.0`,
            `Content-Type: text/plain; charset=utf-8`,
            `Content-Transfer-Encoding: base64`,
            ``,
            b64(text),
            `.`,
            ``,
          ].join("\r\n"),
      },
      { expect: 250, send: () => `QUIT\r\n` },
    ];
    const fail = (message) => {
      socket.destroy();
      reject(new Error(message));
    };
    socket.on("error", (error) => reject(error));
    socket.on("timeout", () => fail("SMTP 连接超时"));
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      if (!/\r\n$/.test(buffer)) return;
      // 多行响应（如 EHLO 的 250-xxx）要等到末行 "250 " 才算结束
      const lines = buffer.trimEnd().split("\r\n");
      const lastLine = lines[lines.length - 1];
      if (!/^\d{3}( |$)/.test(lastLine)) return;
      const code = Number(lastLine.slice(0, 3));
      buffer = "";
      if (step >= steps.length) {
        socket.end();
        resolve(true);
        return;
      }
      const current = steps[step];
      if (code !== current.expect) {
        fail(`SMTP 第 ${step + 1} 步返回 ${code}（期望 ${current.expect}）`);
        return;
      }
      step += 1;
      if (step <= steps.length) socket.write(steps[step - 1].send());
      if (step === steps.length) {
        // 最后一步（QUIT）发出后即可视为成功
        socket.end();
        resolve(true);
      }
    });
  });
}

function formatWebhookLines(matches) {
  const lines = ["**GeoTrade Radar 预警**：与你的画像相关的新动态"];
  for (const item of matches) {
    lines.push(`> 【${item.kind}】${item.url ? `[${item.title}](${item.url})` : item.title}`);
    if (item.summary) lines.push(`> ${item.summary.slice(0, 100)}`);
  }
  return lines;
}

function formatEmailText(matches) {
  return matches
    .map((item) => `【${item.kind}】${item.title}\n${item.summary || ""}\n${item.url || ""}`)
    .join("\n\n");
}

// 主入口：getSnapshotFn 由 server.js 注入，避免循环依赖
async function runAlertCheck(getSnapshotFn, { log = console } = {}) {
  const subscribers = auth.listAlertSubscribers();
  if (!subscribers.length) return { subscribers: 0, sent: 0 };

  const snapshot = await getSnapshotFn("day");
  const items = collectItems(snapshot);
  let totalSent = 0;

  for (const subscriber of subscribers) {
    const { profile } = subscriber;
    if (!profile.webhook && !profile.emailAlerts) continue;

    const matches = [];
    for (const item of items) {
      if (matches.length >= MAX_ALERTS_PER_USER_PER_RUN) break;
      if (!matchesProfile(item, profile)) continue;
      const key = itemKey(item);
      if (auth.alertAlreadySent(subscriber.id, key)) continue;
      matches.push({ ...item, key });
    }
    if (!matches.length) continue;

    let delivered = false;
    if (profile.webhook) {
      try {
        await sendWebhook(profile.webhook, formatWebhookLines(matches));
        delivered = true;
      } catch (error) {
        log.warn(`预警 webhook 推送失败 user=${subscriber.id}: ${error.message}`);
      }
    }
    if (profile.emailAlerts && process.env.SMTP_HOST) {
      try {
        await sendEmail(subscriber.email, `GeoTrade 预警：${matches[0].title}`, formatEmailText(matches));
        delivered = true;
      } catch (error) {
        log.warn(`预警邮件发送失败 user=${subscriber.id}: ${error.message}`);
      }
    }
    if (delivered) {
      for (const match of matches) auth.markAlertSent(subscriber.id, match.key);
      totalSent += matches.length;
    }
  }
  return { subscribers: subscribers.length, sent: totalSent };
}

module.exports = { runAlertCheck, matchesProfile, collectItems, itemKey };
