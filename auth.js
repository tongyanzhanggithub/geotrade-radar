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
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!row) throw new Error("邮箱或密码错误");

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

function userFromToken(token) {
  if (!token) return null;
  const session = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user_id);
  if (!row) return null;
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

function setUserStatus(userId, status) {
  if (!["active", "disabled"].includes(status)) throw new Error("无效的账号状态");
  const row = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!row) throw new Error("用户不存在");
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, userId);
  if (status === "disabled") db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  return publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(userId));
}

setInterval(() => {
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
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
  VALID_MEMBER_LEVELS,
  SESSION_TTL_MS,
};
