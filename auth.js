const crypto = require("node:crypto");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync(path.join(__dirname, "users.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    member_level TEXT NOT NULL DEFAULT 'free',
    member_expires_at TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
  CREATE TABLE IF NOT EXISTS user_profile (
    user_id INTEGER PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS alert_log (
    user_id INTEGER NOT NULL,
    item_key TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    PRIMARY KEY (user_id, item_key)
  );
  CREATE TABLE IF NOT EXISTS usage_stats (
    day TEXT NOT NULL,
    metric TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, metric)
  );
  CREATE TABLE IF NOT EXISTS weekly_log (
    user_id INTEGER NOT NULL,
    week TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    PRIMARY KEY (user_id, week)
  );
  CREATE TABLE IF NOT EXISTS report_usage (
    user_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
  );
`);

const userColumns = db.prepare("PRAGMA table_info(users)").all().map((column) => column.name);
if (!userColumns.includes("status")) {
  db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    memberLevel: row.member_level,
    memberExpiresAt: row.member_expires_at,
    status: row.status || "active",
    createdAt: row.created_at,
  };
}

function register(email, password) {
  if (!isValidEmail(email)) throw new Error("邮箱格式不正确");
  if (typeof password !== "string" || password.length < 8) throw new Error("密码至少需要 8 位");

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) throw new Error("该邮箱已被注册");

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const createdAt = new Date().toISOString();

  const result = db
    .prepare("INSERT INTO users (email, password_hash, salt, member_level, created_at) VALUES (?, ?, ?, 'free', ?)")
    .run(email, passwordHash, salt, createdAt);

  return createSession(Number(result.lastInsertRowid));
}

function login(email, password) {
  let row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!row) throw new Error("邮箱或密码错误");
  row = downgradeIfExpired(row);

  const candidateHash = hashPassword(password, row.salt);
  const expected = Buffer.from(row.password_hash, "hex");
  const candidate = Buffer.from(candidateHash, "hex");
  if (expected.length !== candidate.length || !crypto.timingSafeEqual(expected, candidate)) {
    throw new Error("邮箱或密码错误");
  }
  if (row.status === "disabled") throw new Error("该账号已被禁用，请联系管理员");

  return createSession(row.id);
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  db.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
    token,
    userId,
    new Date(now).toISOString(),
    new Date(now + SESSION_TTL_MS).toISOString(),
  );
  return { token, user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(userId)) };
}

// 会员到期 → 自动降级为 free（单个用户即时检查；expireMembers 做全表扫）
function downgradeIfExpired(row) {
  if (!row || row.member_level === "free" || !row.member_expires_at) return row;
  if (new Date(row.member_expires_at).getTime() >= Date.now()) return row;
  db.prepare("UPDATE users SET member_level = 'free', member_expires_at = NULL WHERE id = ?").run(row.id);
  return db.prepare("SELECT * FROM users WHERE id = ?").get(row.id);
}

function expireMembers() {
  db.prepare(
    "UPDATE users SET member_level = 'free', member_expires_at = NULL WHERE member_level != 'free' AND member_expires_at IS NOT NULL AND member_expires_at < ?",
  ).run(new Date().toISOString());
}

function userFromToken(token) {
  if (!token) return null;
  const session = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  let row = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user_id);
  if (!row) return null;
  row = downgradeIfExpired(row);
  if (row.status === "disabled") {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return publicUser(row);
}

function logout(token) {
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

const VALID_MEMBER_LEVELS = ["free", "member", "pro"];

function listUsers({ search = "", level = "", page = 1, pageSize = 50 } = {}) {
  const offset = (Math.max(1, page) - 1) * pageSize;
  const term = `%${search.trim()}%`;
  const hasSearch = Boolean(search.trim());
  const hasLevel = VALID_MEMBER_LEVELS.includes(level);

  const conditions = [];
  const params = [];
  if (hasSearch) {
    conditions.push("email LIKE ?");
    params.push(term);
  }
  if (hasLevel) {
    conditions.push("member_level = ?");
    params.push(level);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = db.prepare(`SELECT COUNT(*) AS count FROM users ${where}`).get(...params).count;
  const rows = db
    .prepare(`SELECT * FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset);
  return { users: rows.map(publicUser), total, page, pageSize };
}

function userStats() {
  const total = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  const byLevel = {};
  for (const level of VALID_MEMBER_LEVELS) {
    byLevel[level] = db.prepare("SELECT COUNT(*) AS count FROM users WHERE member_level = ?").get(level).count;
  }
  const disabled = db.prepare("SELECT COUNT(*) AS count FROM users WHERE status = 'disabled'").get().count;
  const since = (days) => new Date(Date.now() - days * 86400000).toISOString();
  const newToday = db.prepare("SELECT COUNT(*) AS count FROM users WHERE created_at >= ?").get(since(1)).count;
  const newThisWeek = db.prepare("SELECT COUNT(*) AS count FROM users WHERE created_at >= ?").get(since(7)).count;
  return { total, byLevel, disabled, newToday, newThisWeek };
}

function setMemberLevel(userId, level, expiresAt) {
  if (!VALID_MEMBER_LEVELS.includes(level)) throw new Error("无效的会员等级");
  const row = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!row) throw new Error("用户不存在");
  db.prepare("UPDATE users SET member_level = ?, member_expires_at = ? WHERE id = ?").run(
    level,
    expiresAt || null,
    userId,
  );
  return publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(userId));
}

// 管理员重置密码：生成临时密码并踢掉所有会话，返回明文给管理员人工转交用户
function adminResetPassword(userId) {
  const row = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!row) throw new Error("用户不存在");
  const tempPassword = crypto.randomBytes(6).toString("base64url"); // 8 位
  const salt = crypto.randomBytes(16).toString("hex");
  db.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?").run(
    hashPassword(tempPassword, salt),
    salt,
    userId,
  );
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  return tempPassword;
}

// 开通/续费会员 N 个月：未到期则在原到期日上顺延
function grantMembership(userId, level, months) {
  if (!VALID_MEMBER_LEVELS.includes(level) || level === "free") throw new Error("无效的会员等级");
  const monthCount = Number(months);
  if (!Number.isInteger(monthCount) || monthCount < 1 || monthCount > 36) throw new Error("月数需为 1-36 的整数");
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!row) throw new Error("用户不存在");
  const base =
    row.member_level !== "free" && row.member_expires_at && new Date(row.member_expires_at).getTime() > Date.now()
      ? new Date(row.member_expires_at)
      : new Date();
  base.setMonth(base.getMonth() + monthCount);
  return setMemberLevel(userId, level, base.toISOString());
}

function setUserStatus(userId, status) {
  if (!["active", "disabled"].includes(status)) throw new Error("无效的账号状态");
  const row = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!row) throw new Error("用户不存在");
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, userId);
  if (status === "disabled") db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  return publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(userId));
}

// 极简用量统计：按天 × 指标计数（指标=规整后的 API 路径）。出错不影响业务。
function recordUsage(metric) {
  try {
    db.prepare(
      "INSERT INTO usage_stats (day, metric, count) VALUES (?, ?, 1) ON CONFLICT(day, metric) DO UPDATE SET count = count + 1",
    ).run(new Date().toISOString().slice(0, 10), String(metric).slice(0, 80));
  } catch {
    /* 统计失败静默忽略 */
  }
}

function usageSummary(days = 14) {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const rows = db
    .prepare("SELECT day, metric, count FROM usage_stats WHERE day >= ? ORDER BY day DESC, count DESC")
    .all(since);
  const totals = db
    .prepare("SELECT metric, SUM(count) AS total FROM usage_stats WHERE day >= ? GROUP BY metric ORDER BY total DESC")
    .all(since);
  return { since, days, totals, daily: rows };
}

// 每会员等级的 AI 简报每日生成次数上限
const REPORT_DAILY_LIMITS = { free: 0, member: 5, pro: 20 };

// 检查并占用一次当日简报额度。额度足够时计数 +1 并返回 { ok: true, used, limit }；
// 不足时不计数，返回 { ok: false, used, limit }。
function consumeReportQuota(userId, memberLevel) {
  const limit = REPORT_DAILY_LIMITS[memberLevel] ?? 0;
  const day = new Date().toISOString().slice(0, 10);
  const row = db.prepare("SELECT count FROM report_usage WHERE user_id = ? AND day = ?").get(userId, day);
  const used = row ? row.count : 0;
  if (used >= limit) return { ok: false, used, limit };
  db.prepare(
    "INSERT INTO report_usage (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1",
  ).run(userId, day);
  return { ok: true, used: used + 1, limit };
}

// 用户画像：品类（HS 编码或关键词）、出口市场、关注航线。所有字段都是字符串数组。
const PROFILE_FIELDS = ["hsCodes", "countries", "routes"];

function sanitizeProfile(input) {
  const profile = {};
  for (const field of PROFILE_FIELDS) {
    const raw = Array.isArray(input?.[field]) ? input[field] : [];
    profile[field] = raw
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 20)
      .map((item) => item.slice(0, 40));
  }
  // 预警通道：企业微信群机器人 webhook（仅允许官方域名，防 SSRF）与邮件开关
  const webhook = String(input?.webhook || "").trim();
  profile.webhook = webhook.startsWith("https://qyapi.weixin.qq.com/") ? webhook.slice(0, 300) : "";
  profile.emailAlerts = Boolean(input?.emailAlerts);
  return profile;
}

// 所有可接收预警的用户：状态正常、付费会员、有画像
function listAlertSubscribers() {
  const rows = db
    .prepare(
      "SELECT u.id, u.email, u.member_level, p.data FROM users u JOIN user_profile p ON p.user_id = u.id WHERE u.status = 'active' AND u.member_level != 'free' AND (u.member_expires_at IS NULL OR u.member_expires_at >= ?)",
    )
    .all(new Date().toISOString());
  return rows
    .map((row) => {
      try {
        return { id: row.id, email: row.email, memberLevel: row.member_level, profile: sanitizeProfile(JSON.parse(row.data)) };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function weeklyAlreadySent(userId, week) {
  return Boolean(db.prepare("SELECT 1 FROM weekly_log WHERE user_id = ? AND week = ?").get(userId, week));
}

function markWeeklySent(userId, week) {
  db.prepare("INSERT OR IGNORE INTO weekly_log (user_id, week, sent_at) VALUES (?, ?, ?)").run(
    userId,
    week,
    new Date().toISOString(),
  );
}

function alertAlreadySent(userId, itemKey) {
  return Boolean(db.prepare("SELECT 1 FROM alert_log WHERE user_id = ? AND item_key = ?").get(userId, itemKey));
}

function markAlertSent(userId, itemKey) {
  db.prepare("INSERT OR IGNORE INTO alert_log (user_id, item_key, sent_at) VALUES (?, ?, ?)").run(
    userId,
    itemKey,
    new Date().toISOString(),
  );
}

function getProfile(userId) {
  const row = db.prepare("SELECT data FROM user_profile WHERE user_id = ?").get(userId);
  if (!row) return null;
  try {
    return sanitizeProfile(JSON.parse(row.data));
  } catch {
    return null;
  }
}

function saveProfile(userId, input) {
  const profile = sanitizeProfile(input);
  db.prepare(
    "INSERT INTO user_profile (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
  ).run(userId, JSON.stringify(profile), new Date().toISOString());
  return profile;
}

// 生成失败（API 报错等）时退还本次占用的额度
function refundReportQuota(userId) {
  const day = new Date().toISOString().slice(0, 10);
  db.prepare("UPDATE report_usage SET count = count - 1 WHERE user_id = ? AND day = ? AND count > 0").run(userId, day);
}

setInterval(() => {
  expireMembers();
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
  db.prepare("DELETE FROM report_usage WHERE day < ?").run(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  db.prepare("DELETE FROM alert_log WHERE sent_at < ?").run(new Date(Date.now() - 90 * 86400000).toISOString());
}, 60 * 60 * 1000).unref();

module.exports = {
  register,
  login,
  logout,
  userFromToken,
  listUsers,
  userStats,
  setMemberLevel,
  setUserStatus,
  adminResetPassword,
  grantMembership,
  recordUsage,
  usageSummary,
  consumeReportQuota,
  refundReportQuota,
  getProfile,
  saveProfile,
  listAlertSubscribers,
  alertAlreadySent,
  markAlertSent,
  weeklyAlreadySent,
  markWeeklySent,
  REPORT_DAILY_LIMITS,
  VALID_MEMBER_LEVELS,
  SESSION_TTL_MS,
};
