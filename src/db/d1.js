// ============================================================================
// MiliconfigOS v4.0 - لایه دیتابیس Cloudflare D1 با Auto-Migration،
// محدودیت سقف ۵ کاربر، سیستم رمز عبور مدیر و Fallback هوشمند
// ============================================================================

import {
  BRAND_NAME,
  CONFIG_DEFAULTS,
  MAX_USERS_LIMIT,
  getEnvConfigSnapshot,
  normalizeEffectiveConfig
} from '../config/defaults.js';
import { buildUserDefaultConfig } from '../config/presets.js';
import { generateOpaqueToken, generateShortId, generateUuidV4, isValidUuid, sha256Hex } from '../core/utils.js';

// حافظه کش داخلی هر Isolate جهت کارکرد بدون وقفه و حداکثر سرعت
const memoryStore = {
  initialized: false,
  d1SchemaReady: false,
  bootTime: Date.now(),
  globalConfig: {},
  users: new Map(),
  auditLogs: [],
  trafficHourly: new Map(),
  lastSyncAt: 0,
  adminPasswordHash: '',
  adminUuid: '',
  schemaDatabase: null
};

export function detectD1Binding(env) {
  if (!env || typeof env !== 'object') return null;
  const priorityNames = ['DB', 'D1', 'db', 'd1', 'MILICONFIG_DB', 'miliconfig_db', 'DATABASE', 'database'];
  for (const name of priorityNames) {
    const candidate = env[name];
    if (candidate && typeof candidate === 'object' && typeof candidate.prepare === 'function') {
      return { db: candidate, bindingName: name };
    }
  }
  for (const [key, val] of Object.entries(env)) {
    if (val && typeof val === 'object' && typeof val.prepare === 'function') {
      return { db: val, bindingName: key };
    }
  }
  return null;
}

export function detectKvBinding(env) {
  if (!env || typeof env !== 'object') return null;
  const priorityNames = ['C', 'c', 'KV', 'kv', 'MILICONFIG_KV'];
  for (const name of priorityNames) {
    const candidate = env[name];
    if (
      candidate &&
      typeof candidate === 'object' &&
      typeof candidate.get === 'function' &&
      typeof candidate.put === 'function' &&
      typeof candidate.prepare !== 'function'
    ) {
      return { kv: candidate, bindingName: name };
    }
  }
  for (const [key, val] of Object.entries(env)) {
    if (
      val &&
      typeof val === 'object' &&
      typeof val.get === 'function' &&
      typeof val.put === 'function' &&
      typeof val.prepare !== 'function'
    ) {
      return { kv: val, bindingName: key };
    }
  }
  return null;
}

function safeBind(stmt, ...params) {
  const sanitized = params.map(p => {
    if (p === undefined) return null;
    if (typeof p === 'number' && !Number.isFinite(p)) return 0;
    if (typeof p === 'boolean') return p ? 1 : 0;
    return p;
  });
  return stmt.bind(...sanitized);
}

export async function getAdminUuid(env = {}) {
  // Keep the dashboard route identity separate from legacy proxy UUID env vars.
  // Reusing a proxy UUID here would expose that credential in a browser URL.
  const detectedD1 = detectD1Binding(env);
  if (detectedD1) {
    await ensureD1Schema(env);
    if (memoryStore.adminUuid) return memoryStore.adminUuid;
  }

  const detectedKv = detectKvBinding(env);
  if (detectedKv) {
    try {
      const existing = String(await detectedKv.kv.get('admin_uuid') || '').trim().toLowerCase();
      if (existing) {
        memoryStore.adminUuid = existing;
        return existing;
      }
      const candidate = generateUuidV4();
      await detectedKv.kv.put('admin_uuid', candidate);
      const stored = String(await detectedKv.kv.get('admin_uuid') || candidate).trim().toLowerCase();
      memoryStore.adminUuid = stored;
      return stored;
    } catch (_e) {
      // A KV failure must not silently claim durable identity.
    }
  }

  if (!memoryStore.adminUuid) memoryStore.adminUuid = generateUuidV4();
  return memoryStore.adminUuid;
}


// ساخت خودکار جداول D1 (Auto-Migration)
export async function ensureD1Schema(env = {}, force = false) {
  const detected = detectD1Binding(env);
  if (!detected) {
    ensureMemorySeeded(env);
    return { d1Enabled: false, bindingName: null, migrated: false };
  }
  const { db, bindingName } = detected;
  if (memoryStore.d1SchemaReady && memoryStore.schemaDatabase === db && !force) {
    return { d1Enabled: true, bindingName, migrated: true };
  }

  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      uuid TEXT NOT NULL UNIQUE,
      sub_node_count INTEGER NOT NULL DEFAULT 50,
      status TEXT NOT NULL DEFAULT 'active',
      enabled INTEGER NOT NULL DEFAULT 1,
      data_limit_gb REAL NOT NULL DEFAULT 0,
      used_bytes INTEGER NOT NULL DEFAULT 0,
      lifetime_bytes INTEGER NOT NULL DEFAULT 0,
      request_count INTEGER NOT NULL DEFAULT 0,
      expire_days INTEGER NOT NULL DEFAULT 0,
      expire_at INTEGER NOT NULL DEFAULT 0,
      start_on_first_use INTEGER NOT NULL DEFAULT 1,
      first_connected_at INTEGER NOT NULL DEFAULT 0,
      ip_limit INTEGER NOT NULL DEFAULT 50,
      node_scope TEXT NOT NULL DEFAULT 'all',
      preset TEXT NOT NULL DEFAULT 'iran-fast',
      note TEXT DEFAULT '',
      config_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS preferred_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 443,
      name TEXT NOT NULL,
      colo TEXT DEFAULT '',
      latency INTEGER DEFAULT 0,
      source TEXT DEFAULT 'manual',
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      detail TEXT NOT NULL,
      ip TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS traffic_hourly (
      hour_key TEXT PRIMARY KEY,
      bytes INTEGER NOT NULL DEFAULT 0,
      requests INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TRIGGER IF NOT EXISTS miliconfig_user_capacity_guard
      BEFORE INSERT ON users
      WHEN (SELECT COUNT(*) FROM users) >= 5
      BEGIN SELECT RAISE(ABORT, 'USER_LIMIT_REACHED'); END`
  ];

  try {
    for (const sql of ddlStatements) {
      await db.prepare(sql).run();
    }
    // Idempotently upgrade older installations with a separate high-entropy
    // subscription access token. The token is never derived from the proxy UUID.
    try {
      await db.prepare('ALTER TABLE users ADD COLUMN subscription_token TEXT').run();
    } catch (migrationError) {
      if (!/duplicate column|already exists/i.test(String(migrationError?.message || migrationError))) {
        throw migrationError;
      }
    }
    const tokenRows = await db.prepare('SELECT id, subscription_token FROM users ORDER BY created_at ASC').all();
    const seenSubscriptionTokens = new Set();
    for (const legacyUser of (tokenRows?.results || [])) {
      if (!legacyUser?.id) continue;
      const existingToken = String(legacyUser.subscription_token || '');
      if (!existingToken || seenSubscriptionTokens.has(existingToken)) {
        const replacementToken = generateOpaqueToken(32);
        await safeBind(
          db.prepare('UPDATE users SET subscription_token = ? WHERE id = ?'),
          replacementToken, String(legacyUser.id)
        ).run();
        seenSubscriptionTokens.add(replacementToken);
      } else {
        seenSubscriptionTokens.add(existingToken);
      }
    }
    await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS users_subscription_token_unique ON users(subscription_token)').run();
    // Persist an unpredictable admin/proxy identity instead of using a public constant.
    let storedAdmin = await safeBind(db.prepare(`SELECT value FROM system_config WHERE key = ?`), 'admin_uuid').first();
    let adminUuid = String(storedAdmin?.value || '').trim().toLowerCase();
    if (!adminUuid) {
      adminUuid = generateUuidV4();
      await safeBind(
        db.prepare(`INSERT OR IGNORE INTO system_config (key, value, updated_at) VALUES (?, ?, ?)`),
        'admin_uuid', adminUuid, Date.now()
      ).run();
      storedAdmin = await safeBind(db.prepare(`SELECT value FROM system_config WHERE key = ?`), 'admin_uuid').first();
      adminUuid = String(storedAdmin?.value || adminUuid).trim().toLowerCase();
    }
    memoryStore.adminUuid = adminUuid;
    memoryStore.d1SchemaReady = true;
    memoryStore.schemaDatabase = db;

    return { d1Enabled: true, bindingName, migrated: true };
  } catch (err) {
    ensureMemorySeeded(env);
    return {
      d1Enabled: false,
      bindingName,
      migrated: false,
      error: err?.message || String(err)
    };
  }
}

function ensureMemorySeeded(env = {}) {
  if (memoryStore.initialized) return;
  memoryStore.initialized = true;
  memoryStore.adminUuid = String(memoryStore.adminUuid || generateUuidV4()).trim().toLowerCase();
  const envSnap = getEnvConfigSnapshot(env);
  memoryStore.globalConfig = { ...envSnap };
  // The administrator is not an ordinary user. Do not seed a default customer
  // account or a fake proxy identity during first-run setup.
  memoryStore.auditLogs.unshift({
    id: 1,
    action: 'آماده‌سازی حافظه موقت',
    detail: 'بدون D1/KV، داده‌ها ماندگار نیستند.',
    ip: 'system',
    createdAt: Date.now()
  });
}

function mapUserRow(row) {
  if (!row) return null;
  let parsedConfig = {};
  try {
    parsedConfig = typeof row.config_json === 'string' ? JSON.parse(row.config_json) : (row.config_json || row.config || {});
  } catch (_e) {
    parsedConfig = {};
  }
  const subNodeCount = Number.isFinite(Number(row.sub_node_count ?? row.subNodeCount))
    ? Number(row.sub_node_count ?? row.subNodeCount)
    : Number(parsedConfig.subNodeCount ?? 50);
  const effectiveConfig = normalizeEffectiveConfig({
    ...CONFIG_DEFAULTS,
    ...parsedConfig,
    subNodeCount
  });
  return {
    id: String(row.id),
    username: String(row.username || row.id),
    uuid: String(row.uuid || '').toLowerCase(),
    subscriptionToken: String(row.subscription_token ?? row.subscriptionToken ?? ''),
    subNodeCount,
    status: String(row.status || 'active'),
    enabled: Boolean(row.enabled === undefined ? true : Number(row.enabled) !== 0),
    dataLimitGb: Number(row.data_limit_gb ?? row.dataLimitGb ?? 0),
    usedBytes: Number(row.used_bytes ?? row.usedBytes ?? 0),
    lifetimeBytes: Number(row.lifetime_bytes ?? row.lifetimeBytes ?? 0),
    requestCount: Number(row.request_count ?? row.requestCount ?? 0),
    expireDays: Number(row.expire_days ?? row.expireDays ?? 0),
    expireAt: Number(row.expire_at ?? row.expireAt ?? 0),
    startOnFirstUse: Boolean(row.start_on_first_use === undefined ? (row.startOnFirstUse ?? true) : Number(row.start_on_first_use) !== 0),
    firstConnectedAt: Number(row.first_connected_at ?? row.firstConnectedAt ?? 0),
    ipLimit: Number(row.ip_limit ?? row.ipLimit ?? 50),
    nodeScope: String(row.node_scope || row.nodeScope || 'all'),
    preset: String(row.preset || 'iran-fast'),
    note: String(row.note || ''),
    config: effectiveConfig,
    createdAt: Number(row.created_at ?? row.createdAt ?? Date.now()),
    updatedAt: Number(row.updated_at ?? row.updatedAt ?? Date.now())
  };
}

// ============================================================================
// مدیریت سیستم رمز عبور مدیر (بررسی، راه‌اندازی اول، تغییر پسورد)
// ============================================================================
function bytesToBase64Url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlToBytes(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function createPasswordHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, material, 256);
  return `pbkdf2-sha256$100000$${bytesToBase64Url(salt)}$${bytesToBase64Url(new Uint8Array(bits))}`;
}

function constantTimeEqual(a, b) {
  const aa = new TextEncoder().encode(String(a));
  const bb = new TextEncoder().encode(String(b));
  let diff = aa.length ^ bb.length;
  const max = Math.max(aa.length, bb.length);
  for (let i = 0; i < max; i++) diff |= (aa[i % Math.max(aa.length, 1)] || 0) ^ (bb[i % Math.max(bb.length, 1)] || 0);
  return diff === 0;
}

async function verifyPasswordHash(password, storedHash) {
  const hash = String(storedHash || '');
  if (hash.startsWith('pbkdf2-sha256$')) {
    try {
      const [, , iterationsRaw, saltRaw, expectedRaw] = hash.match(/^(pbkdf2-sha256)\$(\d+)\$([^$]+)\$([^$]+)$/) || [];
      if (!iterationsRaw || !saltRaw || !expectedRaw) return false;
      const iterations = Number(iterationsRaw);
      if (!Number.isInteger(iterations) || iterations < 50000 || iterations > 500000) return false;
      const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: base64UrlToBytes(saltRaw), iterations }, material, 256);
      return constantTimeEqual(bytesToBase64Url(new Uint8Array(bits)), expectedRaw);
    } catch (_e) {
      return false;
    }
  }
  // Backward compatibility with installations that used the old SHA-256 digest.
  if (/^[a-f0-9]{64}$/i.test(hash)) {
    const candidate = await sha256Hex(password);
    return constantTimeEqual(candidate, hash.toLowerCase());
  }
  return false;
}

export async function getAdminPasswordHash(env = {}) {
  await ensureD1Schema(env);
  const detectedD1 = detectD1Binding(env);
  if (detectedD1) {
    try {
      const row = await safeBind(detectedD1.db.prepare(`SELECT value FROM system_config WHERE key = ?`), 'admin_password_hash').first();
      return String(row?.value || '');
    } catch (err) {
      throw new Error(`امکان خواندن وضعیت رمز مدیر از D1 وجود ندارد: ${err?.message || err}`);
    }
  }

  const detectedKv = detectKvBinding(env);
  if (detectedKv) {
    try {
      return String((await detectedKv.kv.get('admin_password_hash')) || '');
    } catch (err) {
      throw new Error(`امکان خواندن رمز مدیر از KV وجود ندارد: ${err?.message || err}`);
    }
  }
  return memoryStore.adminPasswordHash || '';
}

export async function hasAdminPassword(env = {}) {
  const hash = await getAdminPasswordHash(env);
  return Boolean(hash && hash.length > 0);
}

export async function initializeAdminPassword(env = {}, plainPassword, clientIp = '') {
  const password = String(plainPassword ?? '');
  if (password.length < 8) throw new Error('رمز عبور باید حداقل ۸ نویسه باشد.');
  const hash = await createPasswordHash(password);
  const now = Date.now();
  const detectedD1 = detectD1Binding(env);
  if (detectedD1) {
    await ensureD1Schema(env);
    await safeBind(
      detectedD1.db.prepare(`INSERT OR IGNORE INTO system_config (key, value, updated_at) VALUES (?, ?, ?)`),
      'admin_password_hash', hash, now
    ).run();
    const saved = await safeBind(detectedD1.db.prepare(`SELECT value FROM system_config WHERE key = ?`), 'admin_password_hash').first();
    memoryStore.adminPasswordHash = String(saved?.value || '');
    const won = constantTimeEqual(memoryStore.adminPasswordHash, hash);
    if (won) await addAuditLog(env, 'راه‌اندازی اولیه مدیر', 'Initial administrator password set', clientIp);
    return won;
  }
  // KV is eventually consistent and does not offer an atomic compare-and-set
  // for first-admin provisioning. Require D1 for the one-time bootstrap and
  // for durable user data rather than allowing a concurrent first-run takeover.
  throw new Error('برای راه‌اندازی امن و ماندگار مدیر، دیتابیس Cloudflare D1 را با Binding نام DB متصل کنید. KV یا حافظه موقت برای ایجاد اتمیک حساب مدیر و داده‌های کاربران کافی نیست.');
}

export async function setAdminPassword(env = {}, plainPassword, clientIp = '') {
  const password = String(plainPassword ?? '');
  if (password.length < 8) throw new Error('رمز عبور باید حداقل ۸ نویسه باشد.');
  const hash = await createPasswordHash(password);
  const now = Date.now();
  const detectedD1 = detectD1Binding(env);
  if (detectedD1) {
    await ensureD1Schema(env);
    await safeBind(
      detectedD1.db.prepare(
        `INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      ),
      'admin_password_hash', hash, now
    ).run();
  } else {
    const detectedKv = detectKvBinding(env);
    if (detectedKv) await detectedKv.kv.put('admin_password_hash', hash);
    else throw new Error('برای ذخیره امن رمز مدیر باید D1 یا KV متصل باشد.');
  }
  memoryStore.adminPasswordHash = hash;
  await addAuditLog(env, 'تغییر رمز عبور مدیر', 'Admin password updated', clientIp);
  return true;
}

export async function verifyAdminPassword(env = {}, candidatePassword) {
  const password = String(candidatePassword ?? '');
  if (!password) return false;
  const hash = await getAdminPasswordHash(env);
  if (!hash) return false;
  const valid = await verifyPasswordHash(password, hash);
  if (valid && /^[a-f0-9]{64}$/i.test(hash)) {
    // Upgrade legacy unsalted SHA-256 hashes after successful authentication.
    await setAdminPassword(env, password, 'system-migration');
  }
  return valid;
}

async function signSessionPayload(passwordHash, expiresAt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(passwordHash), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`miliconfig-admin-session:v1:${expiresAt}`));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createAdminSessionToken(env = {}, maxAgeSeconds = 43200) {
  const hash = await getAdminPasswordHash(env);
  if (!hash) throw new Error('رمز مدیر راه‌اندازی نشده است.');
  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  return `${expiresAt}.${await signSessionPayload(hash, expiresAt)}`;
}

export async function verifyAdminSessionToken(env = {}, token = '') {
  const [expiresRaw, signature, extra] = String(token || '').split('.');
  if (!expiresRaw || !signature || extra !== undefined) return false;
  const expiresAt = Number(expiresRaw);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + 43200 + 60) return false;
  const hash = await getAdminPasswordHash(env);
  if (!hash) return false;
  const expected = await signSessionPayload(hash, expiresAt);
  return constantTimeEqual(expected, signature);
}

export async function isAdminSessionValid(request, env = {}) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)mili_auth=([^;]+)/);
  if (!match) return false;
  try { return await verifyAdminSessionToken(env, decodeURIComponent(match[1])); }
  catch (_e) { return false; }
}

export async function changeAdminPassword(env = {}, currentPassword, newPassword, clientIp = '') {
  const isMatch = await verifyAdminPassword(env, currentPassword);
  if (!isMatch) throw new Error('رمز عبور فعلی نادرست است.');
  return await setAdminPassword(env, newPassword, clientIp);
}

// تنظیمات سراسری پنل
export async function loadGlobalConfig(env = {}, force = false) {
  await ensureD1Schema(env);
  const envSnap = getEnvConfigSnapshot(env);
  const detectedD1 = detectD1Binding(env);
  const detectedKv = detectKvBinding(env);

  if (!force && memoryStore.lastSyncAt > 0 && Date.now() - memoryStore.lastSyncAt < 15000) {
    return normalizeEffectiveConfig({
      ...CONFIG_DEFAULTS,
      ...envSnap,
      ...memoryStore.globalConfig
    });
  }

  let stored = {};
  if (detectedKv) {
    try {
      const kvRaw = await detectedKv.kv.get('c');
      if (kvRaw) stored = { ...stored, ...JSON.parse(kvRaw) };
    } catch (_e) {}
  }

  if (detectedD1 && memoryStore.d1SchemaReady) {
    try {
      const res = await detectedD1.db.prepare(`SELECT key, value FROM system_config`).all();
      const rows = res?.results || [];
      for (const r of rows) {
        if (r && r.key && !['admin_password_hash', 'admin_uuid'].includes(String(r.key))) {
          stored[r.key] = r.value;
        }
      }
    } catch (_e) {}
  }

  // Defensive filtering: reserved authentication material must never enter
  // the settings model or be returned by the config API.
  const reservedAuthKeys = [
    'admin_password_hash', 'admin_uuid', 'adminPasswordHash', 'adminPassword',
    'passwordHash', 'password_hash', 'sessionSecret', 'session_secret',
    'subscription_token', 'subscriptionToken'
  ];
  for (const key of reservedAuthKeys) delete stored[key];
  memoryStore.globalConfig = { ...memoryStore.globalConfig, ...stored };
  for (const key of reservedAuthKeys) delete memoryStore.globalConfig[key];
  memoryStore.lastSyncAt = Date.now();
  return normalizeEffectiveConfig({
    ...CONFIG_DEFAULTS,
    ...envSnap,
    ...memoryStore.globalConfig
  });
}

export async function saveGlobalConfig(env = {}, newValues = {}) {
  await ensureD1Schema(env);
  const detectedD1 = detectD1Binding(env);
  const detectedKv = detectKvBinding(env);
  const now = Date.now();
  const previousConfig = { ...memoryStore.globalConfig };
  const nextConfig = { ...previousConfig };

  for (const [key, value] of Object.entries(newValues || {})) {
    if (value === '' || value === null || value === undefined) delete nextConfig[key];
    else nextConfig[key] = String(value);
  }

  try {
    if (detectedD1 && memoryStore.d1SchemaReady) {
      const statements = [];
      for (const [key, value] of Object.entries(newValues || {})) {
        if (value === '' || value === null || value === undefined) {
          statements.push(safeBind(detectedD1.db.prepare(`DELETE FROM system_config WHERE key = ?`), key));
        } else {
          statements.push(safeBind(
            detectedD1.db.prepare(
              `INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, ?)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
            ), key, String(value), now
          ));
        }
      }
      if (statements.length) {
        if (typeof detectedD1.db.batch === 'function') await detectedD1.db.batch(statements);
        else for (const statement of statements) await statement.run();
      }
    }

    if (detectedKv) {
      await detectedKv.kv.put('c', JSON.stringify(nextConfig));
      await detectedKv.kv.put('c_ver', String(now));
    }
  } catch (err) {
    memoryStore.globalConfig = previousConfig;
    throw new Error(`ذخیره تنظیمات کامل نشد؛ وضعیت قبلی حفظ شد: ${err?.message || err}`);
  }

  memoryStore.globalConfig = nextConfig;
  memoryStore.lastSyncAt = now;
  return await loadGlobalConfig(env, true);
}

export async function resetGlobalConfig(env = {}) {
  await ensureD1Schema(env);
  const detectedD1 = detectD1Binding(env);
  const detectedKv = detectKvBinding(env);
  memoryStore.globalConfig = {};

  if (detectedD1 && memoryStore.d1SchemaReady) {
    try {
      await detectedD1.db.prepare(`DELETE FROM system_config WHERE key NOT IN ('admin_password_hash', 'admin_uuid')`).run();
    } catch (_e) {}
  }
  if (detectedKv) {
    try {
      await detectedKv.kv.put('c', JSON.stringify({}));
      await detectedKv.kv.put('c_ver', String(Date.now()));
    } catch (_e) {}
  }
  memoryStore.lastSyncAt = Date.now();
  return await loadGlobalConfig(env, true);
}

// لیست کاربران
export async function listUsers(env = {}) {
  await ensureD1Schema(env);
  const detectedD1 = detectD1Binding(env);

  if (detectedD1 && memoryStore.d1SchemaReady) {
    try {
      const res = await detectedD1.db.prepare(`SELECT * FROM users ORDER BY created_at DESC`).all();
      const users = (res?.results || []).map(mapUserRow).filter(Boolean);
      memoryStore.users.clear();
      for (const u of users) memoryStore.users.set(u.id, u);
      return users;
    } catch (_e) {}
  }

  ensureMemorySeeded(env);
  return Array.from(memoryStore.users.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getUserBySubscriptionToken(env = {}, token = '') {
  if (!token) return null;
  const clean = String(token).trim();
  // Subscription routes accept only the independent opaque token, never a UUID,
  // username, database ID, or administrative path.
  const users = await listUsers(env);
  return users.find(user => user.subscriptionToken && user.subscriptionToken === clean) || null;
}

export async function rotateUserSubscriptionToken(env = {}, userId, clientIp = '') {
  const existing = await getUserByIdOrToken(env, userId);
  if (!existing) return null;
  const nextToken = generateOpaqueToken(32);
  const detectedD1 = detectD1Binding(env);
  if (detectedD1 && memoryStore.d1SchemaReady) {
    await safeBind(
      detectedD1.db.prepare('UPDATE users SET subscription_token = ?, updated_at = ? WHERE id = ?'),
      nextToken, Date.now(), existing.id
    ).run();
  }
  const updated = { ...existing, subscriptionToken: nextToken, updatedAt: Date.now() };
  memoryStore.users.set(existing.id, updated);
  await addAuditLog(env, 'چرخش توکن اشتراک', `${existing.username}`, clientIp);
  return updated;
}

export async function getUserByIdOrToken(env = {}, token = '') {
  if (!token) return null;
  const clean = String(token).trim();
  const cleanLower = clean.toLowerCase().replace(/^\/+|\/+$/g, '');
  const users = await listUsers(env);
  for (const u of users) {
    if (
      u.id.toLowerCase() === cleanLower ||
      u.uuid.toLowerCase() === cleanLower ||
      u.username.toLowerCase() === cleanLower ||
      (u.config?.d && u.config.d.trim().replace(/^\/+|\/+$/g, '').toLowerCase() === cleanLower)
    ) {
      return u;
    }
  }
  return null;
}

// ایجاد کاربر جدید با قفل سخت‌گیرانه حداکثر ۵ کاربر
export async function createUser(env = {}, payload = {}, clientIp = '') {
  await ensureD1Schema(env);

  // Enforce the five-user product limit in backend logic; D1 trigger is the final concurrency guard.
  const currentUsers = await listUsers(env);
  if (currentUsers.length >= MAX_USERS_LIMIT) {
    throw new Error(`سقف مجاز ایجاد کاربر (حداکثر ${MAX_USERS_LIMIT} کاربر) پر شده است. برای افزودن کاربر جدید، لطفاً یکی از کاربران قبلی را حذف کنید.`);
  }

  const globalCfg = await loadGlobalConfig(env);
  const now = Date.now();

  const presetId = payload.preset || 'iran-fast';
  const rawName = String(payload.username || payload.name || '').trim();
  const id = generateShortId('mili'); // IDs are server-generated; never accept user-controlled primary keys.
  const username = rawName || id;
  const uuid = isValidUuid(payload.uuid) ? String(payload.uuid).trim().toLowerCase() : generateUuidV4();

  const subNodeCountRaw = parseInt(payload.subNodeCount ?? payload.config?.subNodeCount ?? globalCfg.subNodeCount ?? 50, 10);
  const subNodeCount = Number.isFinite(subNodeCountRaw) && subNodeCountRaw >= 0 ? subNodeCountRaw : 50;

  const mergedUserConfig = buildUserDefaultConfig(
    payload.usePanelDefaults !== false ? globalCfg : CONFIG_DEFAULTS,
    presetId,
    {
      ...(payload.config || {}),
      wk: payload.wk ?? payload.config?.wk ?? globalCfg.wk ?? CONFIG_DEFAULTS.wk,
      ev: payload.ev ?? payload.config?.ev ?? globalCfg.ev ?? CONFIG_DEFAULTS.ev,
      et: payload.et ?? payload.config?.et ?? globalCfg.et ?? CONFIG_DEFAULTS.et,
      ex: payload.ex ?? payload.config?.ex ?? globalCfg.ex ?? CONFIG_DEFAULTS.ex,
      es: payload.es ?? payload.config?.es ?? globalCfg.es ?? CONFIG_DEFAULTS.es,
      sspass: payload.sspass ?? payload.config?.sspass ?? globalCfg.sspass ?? '',
      ssmethod: payload.ssmethod ?? payload.config?.ssmethod ?? globalCfg.ssmethod ?? 'chacha20-ietf-poly1305',
      ech: payload.ech ?? payload.config?.ech ?? globalCfg.ech ?? CONFIG_DEFAULTS.ech,
      tp: payload.tp ?? payload.config?.tp ?? globalCfg.tp ?? CONFIG_DEFAULTS.tp,
      customDNS: payload.customDNS ?? payload.config?.customDNS ?? globalCfg.customDNS ?? CONFIG_DEFAULTS.customDNS,
      customECHDomain: payload.customECHDomain ?? payload.config?.customECHDomain ?? globalCfg.customECHDomain ?? CONFIG_DEFAULTS.customECHDomain,
      alpn: payload.alpn ?? payload.config?.alpn ?? globalCfg.alpn ?? CONFIG_DEFAULTS.alpn,
      d: payload.d ?? payload.config?.d ?? '',
      p: payload.p ?? payload.config?.p ?? globalCfg.p ?? CONFIG_DEFAULTS.p,
      yx: payload.yx ?? payload.config?.yx ?? globalCfg.yx ?? CONFIG_DEFAULTS.yx,
      yxURL: payload.yxURL ?? payload.config?.yxURL ?? globalCfg.yxURL ?? CONFIG_DEFAULTS.yxURL,
      s: payload.s ?? payload.config?.s ?? globalCfg.s ?? CONFIG_DEFAULTS.s,
      homepage: payload.homepage ?? payload.config?.homepage ?? globalCfg.homepage ?? CONFIG_DEFAULTS.homepage,
      scu: payload.scu ?? payload.config?.scu ?? globalCfg.scu ?? CONFIG_DEFAULTS.scu,
      ena: payload.ena ?? payload.config?.ena ?? globalCfg.ena ?? CONFIG_DEFAULTS.ena,
      epd: payload.epd ?? payload.config?.epd ?? globalCfg.epd ?? CONFIG_DEFAULTS.epd,
      epi: payload.epi ?? payload.config?.epi ?? globalCfg.epi ?? CONFIG_DEFAULTS.epi,
      egi: payload.egi ?? payload.config?.egi ?? globalCfg.egi ?? CONFIG_DEFAULTS.egi,
      ae: payload.ae ?? payload.config?.ae ?? globalCfg.ae ?? CONFIG_DEFAULTS.ae,
      rm: payload.rm ?? payload.config?.rm ?? globalCfg.rm ?? CONFIG_DEFAULTS.rm,
      qj: payload.qj ?? payload.config?.qj ?? globalCfg.qj ?? CONFIG_DEFAULTS.qj,
      dkby: payload.dkby ?? payload.config?.dkby ?? globalCfg.dkby ?? CONFIG_DEFAULTS.dkby,
      yxby: payload.yxby ?? payload.config?.yxby ?? globalCfg.yxby ?? CONFIG_DEFAULTS.yxby,
      ipv4: payload.ipv4 ?? payload.config?.ipv4 ?? globalCfg.ipv4 ?? CONFIG_DEFAULTS.ipv4,
      ipv6: payload.ipv6 ?? payload.config?.ipv6 ?? globalCfg.ipv6 ?? CONFIG_DEFAULTS.ipv6,
      ispMobile: payload.ispMobile ?? payload.config?.ispMobile ?? globalCfg.ispMobile ?? CONFIG_DEFAULTS.ispMobile,
      ispUnicom: payload.ispUnicom ?? payload.config?.ispUnicom ?? globalCfg.ispUnicom ?? CONFIG_DEFAULTS.ispUnicom,
      ispTelecom: payload.ispTelecom ?? payload.config?.ispTelecom ?? globalCfg.ispTelecom ?? CONFIG_DEFAULTS.ispTelecom,
      jk: payload.jk ?? payload.config?.jk ?? globalCfg.jk ?? CONFIG_DEFAULTS.jk,
      fp: payload.fp ?? payload.config?.fp ?? globalCfg.fp ?? 'chrome',
      patt: payload.patt ?? payload.config?.patt ?? globalCfg.patt ?? '/?ed=2048',
      fragmentPreset: payload.fragmentPreset ?? payload.config?.fragmentPreset ?? globalCfg.fragmentPreset ?? 'mci',
      fragmentLength: payload.fragmentLength ?? payload.config?.fragmentLength ?? globalCfg.fragmentLength ?? '100-200',
      fragmentInterval: payload.fragmentInterval ?? payload.config?.fragmentInterval ?? globalCfg.fragmentInterval ?? '10-20',
      fragmentPackets: payload.fragmentPackets ?? payload.config?.fragmentPackets ?? globalCfg.fragmentPackets ?? 'tlshello',
      ipRotation: payload.ipRotation ?? payload.config?.ipRotation ?? globalCfg.ipRotation ?? 15,
      subNodeCount
    }
  );

  const dataLimitGb = Math.max(0, Number(payload.dataLimitGb ?? 0) || 0);
  const expireDays = Math.max(0, parseInt(payload.expireDays ?? 0, 10) || 0);
  const startOnFirstUse = payload.startOnFirstUse !== undefined ? Boolean(payload.startOnFirstUse) : true;
  const expireAt = !startOnFirstUse && expireDays > 0 ? now + expireDays * 86400 * 1000 : 0;
  const ipLimit = Math.max(1, parseInt(payload.ipLimit ?? 50, 10) || 50);
  const nodeScope = String(payload.nodeScope || 'all');
  const enabled = payload.enabled !== undefined ? Boolean(payload.enabled) : true;
  const note = String(payload.note || '');

  const userObj = {
    id,
    username,
    uuid,
    subscriptionToken: generateOpaqueToken(32),
    subNodeCount,
    status: enabled ? 'active' : 'disabled',
    enabled,
    dataLimitGb,
    usedBytes: 0,
    lifetimeBytes: 0,
    requestCount: 0,
    expireDays,
    expireAt,
    startOnFirstUse,
    firstConnectedAt: 0,
    ipLimit,
    nodeScope,
    preset: presetId,
    note,
    config: mergedUserConfig,
    createdAt: now,
    updatedAt: now
  };

  const detectedD1 = detectD1Binding(env);
  if (detectedD1 && memoryStore.d1SchemaReady) {
    try {
      await safeBind(
        detectedD1.db.prepare(
          `INSERT INTO users (
            id, username, uuid, subscription_token, sub_node_count, status, enabled,
            data_limit_gb, used_bytes, lifetime_bytes, request_count,
            expire_days, expire_at, start_on_first_use, first_connected_at,
            ip_limit, node_scope, preset, note, config_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ),
        userObj.id, userObj.username, userObj.uuid, userObj.subscriptionToken, userObj.subNodeCount,
        userObj.status, userObj.enabled ? 1 : 0, userObj.dataLimitGb,
        0, 0, 0, userObj.expireDays, userObj.expireAt,
        userObj.startOnFirstUse ? 1 : 0, 0, userObj.ipLimit,
        userObj.nodeScope, userObj.preset, userObj.note,
        JSON.stringify(userObj.config), now, now
      ).run();
    } catch (err) {
      if (String(err?.message || err).includes('USER_LIMIT_REACHED')) {
        throw new Error(`سقف مجاز ${MAX_USERS_LIMIT} کاربر عادی تکمیل شده است.`);
      }
      throw new Error(`ذخیره کاربر در D1 ناموفق بود: ${err?.message || err}`);
    }
  } else {
    memoryStore.users.set(id, userObj);
  }

  await addAuditLog(env, 'ساخت کاربر جدید', `${userObj.username} (${currentUsers.length + 1}/${MAX_USERS_LIMIT})`, clientIp);
  return userObj;
}

export async function updateUser(env = {}, userId, payload = {}, clientIp = '') {
  const existing = await getUserByIdOrToken(env, userId);
  if (!existing) return null;
  const now = Date.now();

  const subNodeCountRaw = parseInt(
    payload.subNodeCount ?? payload.config?.subNodeCount ?? existing.subNodeCount ?? 50,
    10
  );
  const subNodeCount = Number.isFinite(subNodeCountRaw) && subNodeCountRaw >= 0 ? subNodeCountRaw : existing.subNodeCount;

  const updatedConfig = normalizeEffectiveConfig({
    ...existing.config,
    ...(payload.config || {}),
    ...(payload.wk !== undefined ? { wk: payload.wk } : {}),
    ...(payload.ev !== undefined ? { ev: payload.ev } : {}),
    ...(payload.et !== undefined ? { et: payload.et } : {}),
    ...(payload.ex !== undefined ? { ex: payload.ex } : {}),
    ...(payload.es !== undefined ? { es: payload.es } : {}),
    ...(payload.sspass !== undefined ? { sspass: payload.sspass } : {}),
    ...(payload.ssmethod !== undefined ? { ssmethod: payload.ssmethod } : {}),
    ...(payload.ech !== undefined ? { ech: payload.ech } : {}),
    ...(payload.tp !== undefined ? { tp: payload.tp } : {}),
    ...(payload.customDNS !== undefined ? { customDNS: payload.customDNS } : {}),
    ...(payload.customECHDomain !== undefined ? { customECHDomain: payload.customECHDomain } : {}),
    ...(payload.alpn !== undefined ? { alpn: payload.alpn } : {}),
    ...(payload.d !== undefined ? { d: payload.d } : {}),
    ...(payload.p !== undefined ? { p: payload.p } : {}),
    ...(payload.yx !== undefined ? { yx: payload.yx } : {}),
    ...(payload.yxURL !== undefined ? { yxURL: payload.yxURL } : {}),
    ...(payload.s !== undefined ? { s: payload.s } : {}),
    ...(payload.homepage !== undefined ? { homepage: payload.homepage } : {}),
    ...(payload.scu !== undefined ? { scu: payload.scu } : {}),
    ...(payload.ena !== undefined ? { ena: payload.ena } : {}),
    ...(payload.epd !== undefined ? { epd: payload.epd } : {}),
    ...(payload.epi !== undefined ? { epi: payload.epi } : {}),
    ...(payload.egi !== undefined ? { egi: payload.egi } : {}),
    ...(payload.ae !== undefined ? { ae: payload.ae } : {}),
    ...(payload.rm !== undefined ? { rm: payload.rm } : {}),
    ...(payload.qj !== undefined ? { qj: payload.qj } : {}),
    ...(payload.dkby !== undefined ? { dkby: payload.dkby } : {}),
    ...(payload.yxby !== undefined ? { yxby: payload.yxby } : {}),
    ...(payload.ipv4 !== undefined ? { ipv4: payload.ipv4 } : {}),
    ...(payload.ipv6 !== undefined ? { ipv6: payload.ipv6 } : {}),
    ...(payload.ispMobile !== undefined ? { ispMobile: payload.ispMobile } : {}),
    ...(payload.ispUnicom !== undefined ? { ispUnicom: payload.ispUnicom } : {}),
    ...(payload.ispTelecom !== undefined ? { ispTelecom: payload.ispTelecom } : {}),
    ...(payload.jk !== undefined ? { jk: payload.jk } : {}),
    ...(payload.fp !== undefined ? { fp: payload.fp } : {}),
    ...(payload.patt !== undefined ? { patt: payload.patt } : {}),
    ...(payload.fragmentPreset !== undefined ? { fragmentPreset: payload.fragmentPreset } : {}),
    ...(payload.fragmentLength !== undefined ? { fragmentLength: payload.fragmentLength } : {}),
    ...(payload.fragmentInterval !== undefined ? { fragmentInterval: payload.fragmentInterval } : {}),
    ...(payload.fragmentPackets !== undefined ? { fragmentPackets: payload.fragmentPackets } : {}),
    ...(payload.ipRotation !== undefined ? { ipRotation: payload.ipRotation } : {}),
    subNodeCount
  });

  const enabled = payload.enabled !== undefined ? Boolean(payload.enabled) : existing.enabled;
  const expireDays = payload.expireDays !== undefined ? Math.max(0, parseInt(payload.expireDays, 10) || 0) : existing.expireDays;
  const startOnFirstUse = payload.startOnFirstUse !== undefined ? Boolean(payload.startOnFirstUse) : existing.startOnFirstUse;
  let expireAt = existing.expireAt;
  if (payload.expireDays !== undefined) {
    expireAt = !startOnFirstUse && expireDays > 0 ? now + expireDays * 86400 * 1000 : 0;
  }

  const updated = {
    ...existing,
    username: payload.username !== undefined && String(payload.username).trim() ? String(payload.username).trim() : existing.username,
    uuid: payload.uuid && isValidUuid(payload.uuid) ? String(payload.uuid).trim().toLowerCase() : existing.uuid,
    subNodeCount,
    enabled,
    status: enabled ? 'active' : 'disabled',
    dataLimitGb: payload.dataLimitGb !== undefined ? Math.max(0, Number(payload.dataLimitGb) || 0) : existing.dataLimitGb,
    expireDays,
    expireAt,
    startOnFirstUse,
    ipLimit: payload.ipLimit !== undefined ? Math.max(1, parseInt(payload.ipLimit, 10) || 50) : existing.ipLimit,
    nodeScope: payload.nodeScope !== undefined ? String(payload.nodeScope) : existing.nodeScope,
    preset: payload.preset !== undefined ? String(payload.preset) : existing.preset,
    note: payload.note !== undefined ? String(payload.note) : existing.note,
    config: updatedConfig,
    updatedAt: now
  };

  memoryStore.users.set(existing.id, updated);

  const detectedD1 = detectD1Binding(env);
  if (detectedD1 && memoryStore.d1SchemaReady) {
    try {
      await safeBind(
        detectedD1.db.prepare(
          `UPDATE users SET
            username = ?, uuid = ?, sub_node_count = ?, status = ?, enabled = ?,
            data_limit_gb = ?, expire_days = ?, expire_at = ?, start_on_first_use = ?,
            ip_limit = ?, node_scope = ?, preset = ?, note = ?, config_json = ?, updated_at = ?
           WHERE id = ?`
        ),
        updated.username,
        updated.uuid,
        updated.subNodeCount,
        updated.status,
        updated.enabled ? 1 : 0,
        updated.dataLimitGb,
        updated.expireDays,
        updated.expireAt,
        updated.startOnFirstUse ? 1 : 0,
        updated.ipLimit,
        updated.nodeScope,
        updated.preset,
        updated.note,
        JSON.stringify(updated.config),
        now,
        existing.id
      ).run();
    } catch (_e) {}
  }

  await addAuditLog(env, 'ویرایش کاربر', `${updated.username}`, clientIp);
  return updated;
}

export async function resetUserStats(env = {}, userId, clientIp = '') {
  const existing = await getUserByIdOrToken(env, userId);
  if (!existing) return null;
  const now = Date.now();
  const updated = {
    ...existing,
    usedBytes: 0,
    requestCount: 0,
    firstConnectedAt: 0,
    expireAt: !existing.startOnFirstUse && existing.expireDays > 0 ? now + existing.expireDays * 86400 * 1000 : 0,
    updatedAt: now
  };
  memoryStore.users.set(existing.id, updated);

  const detectedD1 = detectD1Binding(env);
  if (detectedD1 && memoryStore.d1SchemaReady) {
    try {
      await safeBind(
        detectedD1.db.prepare(
          `UPDATE users SET used_bytes = 0, request_count = 0, first_connected_at = 0, expire_at = ?, updated_at = ? WHERE id = ?`
        ),
        updated.expireAt,
        now,
        existing.id
      ).run();
    } catch (_e) {}
  }
  await addAuditLog(env, 'صفر کردن مصرف کاربر', `${existing.username}`, clientIp);
  return updated;
}

export async function deleteUser(env = {}, userId, clientIp = '') {
  const existing = await getUserByIdOrToken(env, userId);
  if (!existing) return false;
  memoryStore.users.delete(existing.id);

  const detectedD1 = detectD1Binding(env);
  if (detectedD1 && memoryStore.d1SchemaReady) {
    try {
      await safeBind(detectedD1.db.prepare(`DELETE FROM users WHERE id = ?`), existing.id).run();
    } catch (_e) {}
  }
  await addAuditLog(env, 'حذف کاربر', `${existing.username}`, clientIp);
  return true;
}

export async function recordUserActivity(env = {}, userId, bytesDelta = 0, reqDelta = 1) {
  if (!userId) return;
  const now = Date.now();
  const hourKey = new Date(now).toISOString().slice(0, 13);
  const prevHour = memoryStore.trafficHourly.get(hourKey) || { bytes: 0, requests: 0 };
  prevHour.bytes += Math.max(0, Number(bytesDelta) || 0);
  prevHour.requests += Math.max(0, Number(reqDelta) || 0);
  memoryStore.trafficHourly.set(hourKey, prevHour);

  const u = memoryStore.users.get(userId);
  if (u) {
    u.usedBytes = (u.usedBytes || 0) + Math.max(0, Number(bytesDelta) || 0);
    u.lifetimeBytes = (u.lifetimeBytes || 0) + Math.max(0, Number(bytesDelta) || 0);
    u.requestCount = (u.requestCount || 0) + Math.max(0, Number(reqDelta) || 0);
    if (!u.firstConnectedAt) {
      u.firstConnectedAt = now;
      if (u.startOnFirstUse && u.expireDays > 0 && !u.expireAt) {
        u.expireAt = now + u.expireDays * 86400 * 1000;
      }
    }
    u.updatedAt = now;
  }

  const detectedD1 = detectD1Binding(env);
  if (detectedD1 && memoryStore.d1SchemaReady) {
    try {
      await safeBind(
        detectedD1.db.prepare(
          `UPDATE users SET
            used_bytes = used_bytes + ?,
            lifetime_bytes = lifetime_bytes + ?,
            request_count = request_count + ?,
            first_connected_at = CASE WHEN first_connected_at = 0 THEN ? ELSE first_connected_at END,
            expire_at = CASE WHEN start_on_first_use = 1 AND expire_days > 0 AND expire_at = 0 THEN ? + (expire_days * 86400000) ELSE expire_at END,
            updated_at = ?
           WHERE id = ?`
        ),
        Math.max(0, Number(bytesDelta) || 0),
        Math.max(0, Number(bytesDelta) || 0),
        Math.max(0, Number(reqDelta) || 0),
        now,
        now,
        now,
        userId
      ).run();
    } catch (_e) {}
  }
}

export async function addAuditLog(env = {}, action, detail = '', ip = '') {
  const now = Date.now();
  memoryStore.auditLogs.unshift({
    id: memoryStore.auditLogs.length + 1,
    action: String(action || ''),
    detail: String(detail || ''),
    ip: String(ip || ''),
    createdAt: now
  });
  if (memoryStore.auditLogs.length > 50) {
    memoryStore.auditLogs.length = 50;
  }
  const detectedD1 = detectD1Binding(env);
  if (detectedD1 && memoryStore.d1SchemaReady) {
    try {
      await safeBind(
        detectedD1.db.prepare(`INSERT INTO audit_logs (action, detail, ip, created_at) VALUES (?, ?, ?, ?)`),
        String(action || ''),
        String(detail || ''),
        String(ip || ''),
        now
      ).run();
    } catch (_e) {}
  }
}

export async function getAuditLogs(env = {}, limit = 15) {
  await ensureD1Schema(env);
  const detectedD1 = detectD1Binding(env);
  if (detectedD1 && memoryStore.d1SchemaReady) {
    try {
      const res = await safeBind(
        detectedD1.db.prepare(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?`),
        limit
      ).all();
      if (res?.results?.length) {
        return res.results.map(r => ({
          id: r.id,
          action: r.action,
          detail: r.detail,
          ip: r.ip,
          createdAt: r.created_at
        }));
      }
    } catch (_e) {}
  }
  return memoryStore.auditLogs.slice(0, limit);
}

export async function getStorageDiagnostics(env = {}) {
  const d1State = await ensureD1Schema(env);
  const kvDetected = detectKvBinding(env);
  const users = await listUsers(env);
  const logs = await getAuditLogs(env, 12);
  const hasPass = await hasAdminPassword(env);

  let totalUsedBytes = 0;
  let totalLifetimeBytes = 0;
  let totalRequests = 0;
  let activeUsers = 0;
  for (const u of users) {
    totalUsedBytes += u.usedBytes || 0;
    totalLifetimeBytes += u.lifetimeBytes || 0;
    totalRequests += u.requestCount || 0;
    if (u.enabled) activeUsers += 1;
  }

  return {
    d1Enabled: d1State.d1Enabled,
    d1BindingName: d1State.bindingName || 'DB',
    d1Migrated: d1State.migrated,
    d1Error: d1State.error || null,
    kvEnabled: Boolean(kvDetected),
    kvBindingName: kvDetected?.bindingName || 'C',
    hasPassword: hasPass,
    maxUsersLimit: MAX_USERS_LIMIT,
    uptimeMs: Date.now() - memoryStore.bootTime,
    bootTime: memoryStore.bootTime,
    totalUsers: users.length,
    activeUsers,
    disabledUsers: Math.max(0, users.length - activeUsers),
    totalUsedBytes,
    totalLifetimeBytes,
    totalRequests,
    recentLogs: logs
  };
}
