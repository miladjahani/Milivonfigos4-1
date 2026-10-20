// ============================================================================
// MiliconfigOS v4.0 - هندلرهای REST API (مدیریت کاربران D1، تنظیمات، نودهای ترجیحی، وضعیت سیستم)
// ============================================================================

import {
  BRAND_NAME,
  CONFIG_DEFAULTS,
  COUNTRY_PROXY_SOURCES,
  DIRECT_DOMAINS,
  MAX_USERS_LIMIT,
  analyzeConfigConflicts,
  OFFICIAL_DIRECT_IPS
} from '../config/defaults.js';
import { USER_PRESETS } from '../config/presets.js';
import { isValidDomain, isValidIpAddress, parseAddressAndPort } from '../core/utils.js';
import { connect as cfConnect } from 'cloudflare:sockets';
import {
  addAuditLog,
  changeAdminPassword,
  createUser,
  deleteUser,
  ensureD1Schema,
  getStorageDiagnostics,
  getUserByIdOrToken,
  getUserBySubscriptionToken,
  hasAdminPassword,
  initializeAdminPassword,
  createAdminSessionToken,
  isAdminSessionValid,
  listUsers,
  loadGlobalConfig,
  resetGlobalConfig,
  resetUserStats,
  rotateUserSubscriptionToken,
  saveGlobalConfig,
  updateUser,
  verifyAdminPassword
} from '../db/d1.js';
import { fetchPreferredFromUrls, generateUserNodesList } from '../subscription/generator.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin'
    }
  });
}

function parseYxArray(yxStr = '') {
  if (!yxStr || !String(yxStr).trim()) return [];
  const items = String(yxStr)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const res = [];
  for (const item of items) {
    let name = '';
    let addrPart = item;
    if (item.includes('#')) {
      const parts = item.split('#');
      addrPart = parts[0].trim();
      name = parts.slice(1).join('#').trim();
    }
    const { address, port } = parseAddressAndPort(addrPart);
    if (!address) continue;
    if (!name) name = `${address}:${port || 443}`;
    res.push({
      ip: address,
      port: port || 443,
      name,
      addedAt: new Date().toISOString()
    });
  }
  return res;
}

function serializeYxArray(arr = []) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr.map(item => `${item.ip}:${item.port || 443}#${item.name || item.ip}`).join(',');
}

// ۱. مدیریت تنظیمات سراسری پنل (/api/config)
export async function handleConfigApi(request, env) {
  if (request.method === 'OPTIONS') return jsonResponse({ ok: true });
  const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

  if (request.method === 'GET') {
    const cfg = await loadGlobalConfig(env);
    const diag = await getStorageDiagnostics(env);
    return jsonResponse({
      ...cfg,
      kvEnabled: diag.kvEnabled,
      d1Enabled: diag.d1Enabled,
      d1BindingName: diag.d1BindingName,
      storageMode: diag.d1Enabled ? 'D1' : diag.kvEnabled ? 'KV' : 'Memory'
    });
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      if (body && body._reset === true) {
        const cfg = await resetGlobalConfig(env);
        await addAuditLog(env, 'بازنشانی تنظیمات پنل', 'Reset to defaults', clientIp);
        return jsonResponse({
          success: true,
          message: 'تمام تنظیمات به مقادیر پیش‌فرض بازنشانی شد',
          config: cfg
        });
      }
      const current = await loadGlobalConfig(env);
      const proposed = { ...current, ...(body || {}) };
      const conflicts = analyzeConfigConflicts(proposed);
      const blocking = conflicts.filter(issue => issue.severity === 'ERROR');
      if (blocking.length) {
        return jsonResponse({ success: false, error: 'CONFIG_CONFLICT', message: 'تنظیمات دارای خطای سازگاری است؛ ابتدا موارد قرمز را اصلاح کنید.', conflicts }, 400);
      }
      const allowedKeys = new Set(Object.keys(CONFIG_DEFAULTS));
      const safeBody = Object.fromEntries(Object.entries(body || {}).filter(([key]) => allowedKeys.has(key)));
      const updated = await saveGlobalConfig(env, safeBody);
      await addAuditLog(env, 'ذخیره تنظیمات پنل', 'بروزرسانی پیکربندی سراسری', clientIp);
      return jsonResponse({
        success: true,
        message: 'تنظیمات با موفقیت ذخیره شد',
        config: updated,
        warnings: conflicts.filter(issue => issue.severity !== 'ERROR')
      });
    } catch (err) {
      return jsonResponse({
        success: false,
        message: 'خطا در ذخیره تنظیمات: ' + (err?.message || String(err))
      }, 500);
    }
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ۲. مدیریت کامل کاربران در دیتابیس D1 (/api/users)
export async function handleUsersApi(request, env) {
  if (request.method === 'OPTIONS') return jsonResponse({ ok: true });
  const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const users = await listUsers(env);
    const globalCfg = await loadGlobalConfig(env);
    return jsonResponse({
      success: true,
      brand: BRAND_NAME,
      defaults: {
        ...CONFIG_DEFAULTS,
        ...globalCfg
      },
      presets: USER_PRESETS,
      count: users.length,
      users
    });
  }

  if (request.method === 'POST') {
    try {
      const currentUsers = await listUsers(env);
      if (currentUsers.length >= MAX_USERS_LIMIT) {
        return jsonResponse({
          success: false,
          error: 'LIMIT_REACHED',
          message: `حداکثر ظرفیت ${MAX_USERS_LIMIT} کاربر عادی تکمیل شده است.`
        }, 409);
      }
      const body = await request.json();
      const created = await createUser(env, body || {}, clientIp);
      return jsonResponse({
        success: true,
        message: `کاربر «${created.username}» با موفقیت ساخته شد`,
        user: created
      });
    } catch (err) {
      const message = err?.message || String(err);
      const limitReached = message.includes('سقف مجاز') || message.includes('USER_LIMIT_REACHED');
      return jsonResponse({
        success: false,
        error: limitReached ? 'LIMIT_REACHED' : 'USER_CREATE_FAILED',
        message: limitReached ? `حداکثر ظرفیت ${MAX_USERS_LIMIT} کاربر عادی تکمیل شده است.` : ('خطا در ساخت کاربر: ' + message)
      }, limitReached ? 409 : 500);
    }
  }

  if (request.method === 'PUT') {
    try {
      const body = await request.json();
      const targetId = body.id || url.searchParams.get('id');
      if (!targetId) {
        return jsonResponse({ success: false, message: 'شناسه کاربر الزامی است' }, 400);
      }
      if (body.action === 'rotate-subscription') {
        const rotated = await rotateUserSubscriptionToken(env, targetId, clientIp);
        if (!rotated) return jsonResponse({ success: false, message: 'کاربر یافت نشد' }, 404);
        return jsonResponse({ success: true, message: 'توکن اشتراک با موفقیت تغییر کرد؛ لینک قبلی دیگر معتبر نیست.', user: rotated });
      }
      if (body.action === 'reset') {
        const resetObj = await resetUserStats(env, targetId, clientIp);
        if (!resetObj) return jsonResponse({ success: false, message: 'کاربر یافت نشد' }, 404);
        return jsonResponse({
          success: true,
          message: `مصرف کاربر «${resetObj.username}» صفر شد`,
          user: resetObj
        });
      }
      const updated = await updateUser(env, targetId, body, clientIp);
      if (!updated) {
        return jsonResponse({ success: false, message: 'کاربر مورد نظر یافت نشد' }, 404);
      }
      return jsonResponse({
        success: true,
        message: `تنظیمات کاربر «${updated.username}» بروزرسانی شد`,
        user: updated
      });
    } catch (err) {
      return jsonResponse({
        success: false,
        message: 'خطا در ویرایش کاربر: ' + (err?.message || String(err))
      }, 500);
    }
  }

  if (request.method === 'DELETE') {
    try {
      let targetId = url.searchParams.get('id');
      if (!targetId) {
        try {
          const body = await request.json();
          targetId = body?.id;
        } catch (_e) {}
      }
      if (!targetId) {
        return jsonResponse({ success: false, message: 'شناسه کاربر الزامی است' }, 400);
      }
      const ok = await deleteUser(env, targetId, clientIp);
      if (!ok) {
        return jsonResponse({ success: false, message: 'کاربر یافت نشد' }, 404);
      }
      return jsonResponse({
        success: true,
        message: 'کاربر با موفقیت حذف شد'
      });
    } catch (err) {
      return jsonResponse({
        success: false,
        message: 'خطا در حذف کاربر: ' + (err?.message || String(err))
      }, 500);
    }
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ۳. مدیریت لیست IP ترجیحی (/api/preferred-ips) - سازگار با yx-tools و پنل گرافیکی
export async function handlePreferredIpsApi(request, env, bypassAeCheck = false) {
  if (request.method === 'OPTIONS') return jsonResponse({ ok: true });
  const cfg = await loadGlobalConfig(env);
  if (!bypassAeCheck && cfg.ae !== 'yes' && request.headers.get('X-Mili-Admin') !== '1') {
    return jsonResponse({
      success: false,
      error: 'API غیرفعال است',
      message: 'برای استفاده از API خارجی، گزینه «اجازه مدیریت API (ae)» را در تنظیمات فعال کنید.'
    }, 403);
  }

  try {
    if (request.method === 'GET') {
      const list = parseYxArray(cfg.yx || '');
      return jsonResponse({
        success: true,
        count: list.length,
        data: list
      });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const itemsToAdd = Array.isArray(body) ? body : [body];
      if (!itemsToAdd.length) {
        return jsonResponse({ success: false, message: 'لیست IP ارسالی خالی است' }, 400);
      }
      const currentList = parseYxArray(cfg.yx || '');
      const added = [];
      const skipped = [];
      const errors = [];

      for (const item of itemsToAdd) {
        const rawIp = String(item?.ip || item?.domain || '').trim();
        if (!rawIp) {
          errors.push({ ip: 'نامشخص', reason: 'آدرس IP یا دامنه الزامی است' });
          continue;
        }
        const port = parseInt(item.port || 443, 10) || 443;
        const name = String(item.name || `${rawIp}:${port}`).trim();
        if (!isValidIpAddress(rawIp) && !isValidDomain(rawIp)) {
          errors.push({ ip: rawIp, reason: 'فرمت IP یا دامنه نامعتبر است' });
          continue;
        }
        if (currentList.some(x => x.ip === rawIp && x.port === port)) {
          skipped.push({ ip: rawIp, port, reason: 'قبلاً ثبت شده است' });
          continue;
        }
        const entry = { ip: rawIp, port, name, addedAt: new Date().toISOString() };
        currentList.push(entry);
        added.push(entry);
      }

      if (added.length > 0) {
        await saveGlobalConfig(env, { yx: serializeYxArray(currentList) });
      }

      return jsonResponse({
        success: added.length > 0,
        message: `${added.length} نود ترجیحی با موفقیت اضافه شد`,
        added: added.length,
        skipped: skipped.length,
        errors: errors.length,
        data: { addedIPs: added, skippedIPs: skipped, errors }
      });
    }

    if (request.method === 'DELETE') {
      const body = await request.json();
      if (body?.all === true) {
        const currentList = parseYxArray(cfg.yx || '');
        await saveGlobalConfig(env, { yx: '' });
        return jsonResponse({
          success: true,
          message: `تمام ${currentList.length} نود ترجیحی پاک شدند`,
          deletedCount: currentList.length
        });
      }
      if (!body?.ip) {
        return jsonResponse({ success: false, message: 'فیلد ip برای حذف الزامی است' }, 400);
      }
      const port = parseInt(body.port || 443, 10) || 443;
      const currentList = parseYxArray(cfg.yx || '');
      const nextList = currentList.filter(x => !(x.ip === body.ip && x.port === port));
      await saveGlobalConfig(env, { yx: serializeYxArray(nextList) });
      return jsonResponse({
        success: true,
        message: 'نود ترجیحی حذف شد',
        deleted: { ip: body.ip, port }
      });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (err) {
    return jsonResponse({
      success: false,
      error: 'خطا در پردازش درخواست',
      message: err?.message || String(err)
    }, 500);
  }
}

// ۴. وضعیت زنده داشبورد و دیتابیس D1 (/api/stats & /api/d1)
export async function handleDashboardStatsApi(request, env) {
  if (request.method === 'OPTIONS') return jsonResponse({ ok: true });
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname.endsWith('/d1-init')) {
    const res = await ensureD1Schema(env, true);
    const diag = await getStorageDiagnostics(env);
    return jsonResponse({
      success: true,
      message: res.d1Enabled
        ? `جداول دیتابیس D1 (${res.bindingName}) با موفقیت بررسی و آماده شدند.`
        : 'اتصال D1 در تنظیمات Worker/Pages یافت نشد؛ سیستم بدون خطا در حالت حافظه پشتیبان فعال است.',
      d1: res,
      diagnostics: diag
    });
  }

  const globalCfg = await loadGlobalConfig(env);
  const diag = await getStorageDiagnostics(env);
  const users = await listUsers(env);
  const customNodes = parseYxArray(globalCfg.yx || '');
  const candidateEndpointCount = customNodes.length + DIRECT_DOMAINS.length + OFFICIAL_DIRECT_IPS.length;

  return jsonResponse({
    success: true,
    brand: BRAND_NAME,
    timestamp: new Date().toISOString(),
    config: globalCfg,
    diagnostics: {
      ...diag,
      healthyCfIps: 0,
      candidateEndpointCount,
      healthVerified: false,
      customPreferredCount: customNodes.length,
      builtinDomainCount: DIRECT_DOMAINS.length,
      officialDirectCount: OFFICIAL_DIRECT_IPS.length
    },
    users
  });
}

// ۵. اطلاعات عمومی وضعیت یک کاربر برای صفحه وضعیت (/api/status/:token)
export async function handlePublicUserStatusApi(request, env, token) {
  if (request.method === 'OPTIONS') return jsonResponse({ ok: true });
  const url = new URL(request.url);
  const user = await getUserBySubscriptionToken(env, token);
  if (!user) {
    return jsonResponse({ success: false, message: 'توکن وضعیت نامعتبر یا لغوشده است.' }, 404);
  }
  const nodes = await generateUserNodesList(user, url.hostname, {
    limit: user.subNodeCount
  });
  return jsonResponse({
    success: true,
    brand: BRAND_NAME,
    user: {
      id: user.id,
      username: user.username,
      uuid: user.uuid,
      subNodeCount: user.subNodeCount,
      enabled: user.enabled,
      status: user.status,
      dataLimitGb: user.dataLimitGb,
      usedBytes: user.usedBytes,
      lifetimeBytes: user.lifetimeBytes,
      requestCount: user.requestCount,
      expireDays: user.expireDays,
      expireAt: user.expireAt,
      startOnFirstUse: user.startOnFirstUse,
      ipLimit: user.ipLimit,
      nodeScope: user.nodeScope,
      preset: user.preset,
      protocols: {
        vless: user.config?.ev === 'yes',
        trojan: user.config?.et === 'yes',
        xhttp: user.config?.ex === 'yes',
        ech: user.config?.ech === 'yes',
        jk: user.config?.jk === 'yes'
      }
    },
    nodeCount: nodes.length,
    nodes
  });
}


// ۶. مدیریت احراز هویت و رمز عبور مدیر (/api/admin/...)
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

function takeLoginAttempt(request) {
  const key = getClientIp(request);
  const now = Date.now();
  const current = loginAttempts.get(key) || { count: 0, resetAt: now + LOGIN_WINDOW_MS };
  if (current.resetAt <= now) {
    current.count = 0;
    current.resetAt = now + LOGIN_WINDOW_MS;
  }
  if (current.count >= LOGIN_MAX_ATTEMPTS) return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  current.count += 1;
  loginAttempts.set(key, current);
  // Keep this best-effort local map bounded in long-lived test/dev runtimes.
  if (loginAttempts.size > 2000) {
    for (const [ip, item] of loginAttempts) if (item.resetAt <= now) loginAttempts.delete(ip);
  }
  return { allowed: true };
}

function passwordCookie(request, token, clear = false) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  if (clear) return `mili_auth=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure}`;
  return `mili_auth=${encodeURIComponent(token)}; Path=/; Max-Age=43200; HttpOnly; SameSite=Strict${secure}`;
}

function sameOriginMutation(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch (_e) { return false; }
}

export async function handleAuthApi(request, env) {
  if (request.method === 'OPTIONS') return jsonResponse({ ok: true });
  const url = new URL(request.url);
  const path = url.pathname.replace(/^.*\/api\/admin\/?/, '');
  const clientIp = getClientIp(request);

  if (path === 'auth-status' && request.method === 'GET') {
    const initialized = await hasAdminPassword(env);
    return jsonResponse({ success: true, initialized, brand: BRAND_NAME, minimumPasswordLength: 8 });
  }

  if (path === 'setup-password' && request.method === 'POST') {
    if (!sameOriginMutation(request)) return jsonResponse({ success: false, message: 'درخواست بین‌مبدأ پذیرفته نشد.' }, 403);
    const body = await request.json().catch(() => ({}));
    const password = String(body.password ?? '');
    if (password.length < 8) {
      return jsonResponse({ success: false, message: 'رمز عبور باید حداقل ۸ نویسه باشد.' }, 400);
    }
    try {
      const won = await initializeAdminPassword(env, password, clientIp);
      if (!won) return jsonResponse({ success: false, message: 'راه‌اندازی قبلاً انجام شده است؛ صفحه را تازه‌سازی کنید و وارد شوید.' }, 409);
      const token = await createAdminSessionToken(env);
      return new Response(JSON.stringify({ success: true, message: 'مدیر با موفقیت راه‌اندازی شد.' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Set-Cookie': passwordCookie(request, token)
        }
      });
    } catch (err) {
      return jsonResponse({ success: false, message: err?.message || 'راه‌اندازی امن انجام نشد.' }, 503);
    }
  }

  if (path === 'login' && request.method === 'POST') {
    if (!sameOriginMutation(request)) return jsonResponse({ success: false, message: 'درخواست بین‌مبدأ پذیرفته نشد.' }, 403);
    const attempt = takeLoginAttempt(request);
    if (!attempt.allowed) {
      return new Response(JSON.stringify({ success: false, message: 'تعداد تلاش‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': String(attempt.retryAfter) }
      });
    }
    const body = await request.json().catch(() => ({}));
    const password = String(body.password ?? '');
    const ok = await verifyAdminPassword(env, password);
    if (!ok) return jsonResponse({ success: false, message: 'رمز عبور وارد شده اشتباه است.' }, 401);
    loginAttempts.delete(clientIp);
    const token = await createAdminSessionToken(env);
    return new Response(JSON.stringify({ success: true, message: 'ورود با موفقیت انجام شد.' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Set-Cookie': passwordCookie(request, token)
      }
    });
  }

  if (path === 'logout' && request.method === 'POST') {
    return new Response(JSON.stringify({ success: true, message: 'از حساب خارج شدید.' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Set-Cookie': passwordCookie(request, '', true)
      }
    });
  }

  if (path === 'change-password' && request.method === 'POST') {
    if (!sameOriginMutation(request)) return jsonResponse({ success: false, message: 'درخواست بین‌مبدأ پذیرفته نشد.' }, 403);
    if (!(await isAdminSessionValid(request, env))) return jsonResponse({ success: false, message: 'نشست مدیر معتبر نیست؛ دوباره وارد شوید.' }, 401);
    const body = await request.json().catch(() => ({}));
    const oldPass = String(body.oldPassword ?? '');
    const newPass = String(body.newPassword ?? '');
    if (newPass.length < 8) return jsonResponse({ success: false, message: 'رمز عبور جدید باید حداقل ۸ نویسه باشد.' }, 400);
    try {
      const ok = await changeAdminPassword(env, oldPass, newPass, clientIp);
      if (!ok) return jsonResponse({ success: false, message: 'رمز عبور تغییر نکرد.' }, 400);
      return new Response(JSON.stringify({ success: true, message: 'رمز عبور مدیر بروزرسانی شد؛ برای ادامه دوباره وارد شوید.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Set-Cookie': passwordCookie(request, '', true) }
      });
    } catch (err) {
      return jsonResponse({ success: false, message: err?.message || 'تغییر رمز انجام نشد.' }, 400);
    }
  }

  return jsonResponse({ error: 'Endpoint not found' }, 404);
}

// Only test explicitly listed public proxy candidates. A successful TCP dial proves
// port reachability only; it does not prove SOCKS/VLESS/Trojan functionality.
const SCANNER_ALLOWED_PORTS = new Set([80, 443, 1080, 3128, 4145, 8080, 8081, 8888, 8443, 2053, 2083, 2087, 2096, 7890, 10808]);

function isPublicScanIp(value) {
  const host = String(value || '').trim().replace(/^\[|\]$/g, '');
  if (!isValidIpAddress(host)) return false;
  if (host.includes(':')) {
    const h = host.toLowerCase();
    if (h === '::' || h === '::1' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return false;
    return true;
  }
  const octets = host.split('.').map(Number);
  if (octets.length !== 4 || octets.some(n => n < 0 || n > 255)) return false;
  const [a,b] = octets;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 192 && b === 0) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51) return false;
  if (a === 203 && b === 0) return false;
  return true;
}

async function testTcpEndpoint(host, port, timeoutMs = 2500) {
  const startedAt = Date.now();
  let socket;
  let timer;
  try {
    socket = cfConnect({ hostname: host, port });
    // Cloudflare socket adapters expose `opened`; if unavailable (for example in
    // a local mock runtime), report not-testable rather than a fake success.
    if (!socket || !socket.opened || typeof socket.close !== 'function') {
      return { status: 'not-testable', latencyMs: null, reason: 'TCP probe API unavailable in this runtime' };
    }
    await Promise.race([
      socket.opened,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs); })
    ]);
    return { status: 'tcp-reachable', latencyMs: Date.now() - startedAt, reason: 'TCP connect succeeded; proxy handshake not tested' };
  } catch (err) {
    return {
      status: String(err?.message || '').includes('TIMEOUT') ? 'tcp-timeout' : 'tcp-failed',
      latencyMs: Date.now() - startedAt,
      reason: String(err?.message || 'TCP connection failed').slice(0, 180)
    };
  } finally {
    if (timer) clearTimeout(timer);
    try { socket?.close(); } catch (_e) {}
  }
}

// ۷. اسکنر زنده پروکسی‌های کشوری و ساخت سابلینک مولتی‌لوکیشن (/api/scanner/...)
export async function handleScannerApi(request, env) {
  if (request.method === 'OPTIONS') return jsonResponse({ ok: true });
  const url = new URL(request.url);
  const action = url.pathname.replace(/^.*\/api\/scanner\/?/, '');

  if (action === 'countries' && request.method === 'GET') {
    const countries = Object.keys(COUNTRY_PROXY_SOURCES).map(code => ({
      code,
      name: COUNTRY_PROXY_SOURCES[code].name,
      flag: COUNTRY_PROXY_SOURCES[code].flag,
      sourceCount: COUNTRY_PROXY_SOURCES[code].urls.length
    }));
    return jsonResponse({ success: true, countries });
  }

  if (action === 'fetch-and-test' && request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const requestedCountry = String(body.country || 'DE').toUpperCase();
      const countryObj = COUNTRY_PROXY_SOURCES[requestedCountry] || COUNTRY_PROXY_SOURCES.DE;
      const limit = Math.min(Math.max(parseInt(body.limit || '10', 10) || 10, 1), 25);
      const rawUrls = countryObj.urls.join(',');
      const candidates = await fetchPreferredFromUrls(rawUrls, '443', 3500);
      const eligible = candidates
        .map(p => ({ ...p, port: Number(p.port || 443), ip: String(p.ip || '').replace(/^\[|\]$/g, '') }))
        .filter(p => isPublicScanIp(p.ip) && Number.isInteger(p.port) && SCANNER_ALLOWED_PORTS.has(p.port));
      const unique = [...new Map(eligible.map(p => [`${p.ip}:${p.port}`, p])).values()].slice(0, limit);
      const results = [];
      // Small sequential batches keep socket use bounded. The output never claims
      // a proxy handshake or end-to-end service test from a TCP dial alone.
      for (const p of unique) {
        const tested = await testTcpEndpoint(p.ip, p.port, 2500);
        results.push({
          ip: p.ip,
          port: p.port,
          name: p.name || `${p.ip}:${p.port}`,
          country: countryObj.name,
          flag: countryObj.flag,
          candidateType: p.port === 1080 || p.port === 10808 ? 'SOCKS candidate' : (p.port === 3128 || p.port === 8080 || p.port === 8081 || p.port === 8888 ? 'HTTP proxy candidate' : 'Endpoint candidate'),
          testLevel: 'TCP_CONNECT_ONLY',
          latencyMs: tested.latencyMs,
          status: tested.status,
          reason: tested.reason
        });
      }
      return jsonResponse({
        success: true,
        country: countryObj.name,
        flag: countryObj.flag,
        count: results.length,
        testedCount: results.filter(x => x.status !== 'not-testable').length,
        proxies: results,
        notice: 'این آزمون فقط دسترسی TCP به IP/Port را می‌سنجد؛ سالم بودن پروتکل Proxy یا اتصال سرتاسری تأیید نشده است.'
      });
    } catch (err) {
      return jsonResponse({ success: false, message: 'خطا در اسکنر: ' + (err?.message || err) }, 500);
    }
  }

  return jsonResponse({ error: 'Endpoint not found' }, 404);
}
