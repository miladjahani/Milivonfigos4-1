// ============================================================================
// MiliconfigOS v4.0 - نقطه ورود اصلی Cloudflare Workers & Pages
// با لایه D1، مدیریت چندکاربره و بررسی خطاهای runtime
// ============================================================================

import { BRAND_NAME, DIRECT_DOMAINS, OFFICIAL_DIRECT_IPS } from './config/defaults.js';
import {
  ensureD1Schema,
  getAdminUuid,
  getStorageDiagnostics,
  getUserByIdOrToken,
  getUserBySubscriptionToken,
  hasAdminPassword,
  isAdminSessionValid,
  listUsers,
  loadGlobalConfig,
  recordUserActivity
} from './db/d1.js';
import { handleWebSocketUpgrade, handleXhttpPostRequest } from './core/runtime.js';
import { generateUserNodesList, handleSubscriptionResponse } from './subscription/generator.js';
import {
  handleAuthApi,
  handleConfigApi,
  handleDashboardStatsApi,
  handlePreferredIpsApi,
  handlePublicUserStatusApi,
  handleScannerApi,
  handleUsersApi
} from './api/handlers.js';
import { renderLoginGatewayHtml } from './ui/loginHtml.js';
import { renderUserStatusPageHtml } from './ui/statusHtml.js';
import { renderAdminDashboardHtml } from './ui/adminHtml.js';

function normalizeCleanPath(p = '') {
  return String(p || '').trim().replace(/^\/+|\/+$/g, '').toLowerCase();
}

function isSameOriginMutation(request, url = new URL(request.url)) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) return true;
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try { return new URL(origin).origin === url.origin; } catch (_e) { return false; }
}

function isAdminAuthorizedPath(prefixPath, adminUuid, customPath) {
  const cleanPrefix = normalizeCleanPath(prefixPath);
  if (!cleanPrefix) return false;
  const cleanAdmin = normalizeCleanPath(adminUuid);
  const cleanCustom = normalizeCleanPath(customPath);
  if (cleanCustom) {
    return cleanPrefix === cleanCustom || cleanPrefix === cleanAdmin;
  }
  return cleanPrefix === cleanAdmin;
}

export default {
  async fetch(request, env = {}, ctx = {}) {
    try {
      const url = new URL(request.url);
      const upgradeHeader = (request.headers.get('Upgrade') || '').toLowerCase();
      const isWebSocket = upgradeHeader === 'websocket';

      // تلاش برای آماده‌سازی D1؛ وضعیت واقعی Storage از Diagnostics مشخص می‌شود
      await ensureD1Schema(env);
      const adminUuid = await getAdminUuid(env);
      const globalCfg = await loadGlobalConfig(env);
      const allUsers = await listUsers(env);

      // ۱. هندل کردن مسیر WebSocket برای پروتکل‌ها و قابلیت‌های موجود؛ پوشش هر قابلیت تابع runtime است
      if (isWebSocket) {
        return await handleWebSocketUpgrade(request, env, ctx, globalCfg, allUsers, adminUuid);
      }

      const pathParts = url.pathname.split('/').filter(Boolean);

      // ۲. هندل کردن APIهای احراز هویت، اسکنر، مدیریتی و عمومی
      if (url.pathname.includes('/api/')) {
        if (url.pathname.startsWith('/api/admin/')) {
          return await handleAuthApi(request, env);
        }
        if (url.pathname.startsWith('/api/scanner/')) {
          if (!isSameOriginMutation(request, url)) {
            return new Response(JSON.stringify({ success: false, error: 'CROSS_ORIGIN_BLOCKED' }), { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
          }
          if (!(await isAdminSessionValid(request, env))) {
            return new Response(JSON.stringify({ success: false, error: 'UNAUTHORIZED', message: 'برای استفاده از اسکنر وارد پنل مدیریت شوید.' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
            });
          }
          return await handleScannerApi(request, env);
        }
        const apiIdx = pathParts.indexOf('api');
        const prefix = pathParts.slice(0, apiIdx).join('/');
        const apiSubPath = pathParts.slice(apiIdx + 1).join('/');

        // API عمومی صفحه وضعیت کاربر
        if (apiSubPath.startsWith('status/')) {
          const token = decodeURIComponent(apiSubPath.slice('status/'.length));
          return await handlePublicUserStatusApi(request, env, token);
        }

        // API access is authorized by a signed, HttpOnly session, not by an obscure URL alone.
        if (!isSameOriginMutation(request, url)) {
          return new Response(JSON.stringify({ success: false, error: 'CROSS_ORIGIN_BLOCKED' }), { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
        }
        if (!(await isAdminSessionValid(request, env))) {
          return new Response(JSON.stringify({ success: false, error: 'UNAUTHORIZED', message: 'نشست مدیر معتبر نیست؛ دوباره وارد شوید.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
          });
        }

        if (apiSubPath === 'config') {
          return await handleConfigApi(request, env);
        }
        if (apiSubPath === 'users') {
          return await handleUsersApi(request, env);
        }
        if (apiSubPath === 'preferred-ips') {
          return await handlePreferredIpsApi(request, env, true);
        }
        if (apiSubPath === 'stats' || apiSubPath === 'd1-init') {
          return await handleDashboardStatsApi(request, env);
        }

        return new Response(JSON.stringify({ error: 'مسیر API یافت نشد' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      }

      // ۳. هندل کردن پروتکل xhttp (درخواست‌های POST غیر API)
      if (request.method === 'POST') {
        return await handleXhttpPostRequest(request, env, ctx, globalCfg, allUsers, adminUuid);
      }

      // ۴. هندل کردن درخواست‌های GET
      if (request.method === 'GET' || request.method === 'HEAD') {
        // ۴-الف: صفحه اصلی /
        if (url.pathname === '/' || pathParts.length === 0) {
          const isInitialized = await hasAdminPassword(env);
          if (isInitialized && await isAdminSessionValid(request, env)) {
            const target = String(globalCfg.d || adminUuid).replace(/^\/+|\/+$/g, '');
            return Response.redirect(new URL('/' + target, url), 302);
          }
          return new Response(renderLoginGatewayHtml({
            initialized: isInitialized,
            customPath: globalCfg.d,
            adminPath: globalCfg.d || adminUuid,
            introUrl: globalCfg.homepage || 'https://nginx.com/'
          }), {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store',
              'X-Content-Type-Options': 'nosniff',
              'Referrer-Policy': 'same-origin',
              'X-Frame-Options': 'DENY'
            }
          });
        }

        // ۴-ب: مسیرهای سازگار با کد پایه /{prefix}/region و /{prefix}/test-api
        if (pathParts.length === 2 && (pathParts[1] === 'region' || pathParts[1] === 'test-api')) {
          const prefix = pathParts[0];
          if (!isAdminAuthorizedPath(prefix, adminUuid, globalCfg.d) || !(await isAdminSessionValid(request, env))) {
            return new Response(JSON.stringify({ error: 'Access Denied' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
            });
          }
          if (pathParts[1] === 'region') {
            return new Response(
              JSON.stringify({
                region: globalCfg.wk ? globalCfg.wk.toUpperCase() : globalCfg.p ? 'CUSTOM' : 'CF',
                detectionMethod: globalCfg.wk ? 'تعیین دستی منطقه' : globalCfg.p ? 'ProxyIP سفارشی' : 'اتصال مستقیم رسمی CF',
                timestamp: new Date().toISOString()
              }),
              { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
            );
          }
          return new Response(
            JSON.stringify({
              detectedRegion: 'CF',
              message: 'API تست با موفقیت انجام شد',
              timestamp: new Date().toISOString()
            }),
            { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
          );
        }

        // ۴-ج: صفحه وضعیت خصوصی کاربر با توکن اشتراک مستقل از UUID پروکسی.
        if ((pathParts[0] === 'status' && pathParts[1]) || (pathParts.length === 2 && pathParts[1] === 'status')) {
          const canonicalStatusRoute = pathParts[0] === 'status';
          const token = decodeURIComponent(canonicalStatusRoute ? pathParts.slice(1).join('/') : pathParts[0]);
          const userObj = canonicalStatusRoute ? await getUserBySubscriptionToken(env, token) : null;
          if (!userObj) {
            return new Response('لینک وضعیت نامعتبر یا منقضی است. لینک جدید را از پنل مدیریت دریافت کنید.', {
              status: 404,
              headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
            });
          }
          const nodes = await generateUserNodesList(userObj, url.hostname, { limit: userObj.subNodeCount });
          return new Response(renderUserStatusPageHtml(userObj, nodes, request.url), {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store',
              'X-Content-Type-Options': 'nosniff',
              'Referrer-Policy': 'no-referrer'
            }
          });
        }

        // ۴-د: اشتراک فقط با توکن تصادفی مستقل ارائه می‌شود.
        // مسیرهای قدیمی مبتنی بر UUID/نام کاربری عمداً دسترسی ندارند تا چرخش توکن،
        // لینک قبلی را واقعاً باطل کند.
        if ((pathParts.length >= 2 && pathParts[pathParts.length - 1] === 'sub') ||
            (pathParts[0] === 'sub' && pathParts[1])) {
          if (pathParts[0] !== 'sub' || pathParts.length !== 2) {
            return new Response('این ساختار قدیمی اشتراک دیگر معتبر نیست. لینک جدید را از پنل دریافت کنید.', {
              status: 410,
              headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
            });
          }
          const token = decodeURIComponent(pathParts[1]);
          const targetUser = await getUserBySubscriptionToken(env, token);
          if (!targetUser) {
            return new Response(JSON.stringify({ error: 'توکن اشتراک نامعتبر یا لغوشده است.' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
            });
          }
          if (targetUser.id) {
            const p = recordUserActivity(env, targetUser.id, 0, 1).catch(() => {});
            if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(p);
          }
          return await handleSubscriptionResponse(request, targetUser, url);
        }

        // ۴-هـ: دسترسی به پنل مدیریت ادمین یا صفحه وضعیت کاربر با /{token}
        const fullCleanPath = normalizeCleanPath(url.pathname);
        if (isAdminAuthorizedPath(fullCleanPath, adminUuid, globalCfg.d)) {
          if (!(await isAdminSessionValid(request, env))) {
            return Response.redirect(new URL('/', url), 302);
          }
          if (url.searchParams.get('view') === 'status') {
            const adminUser = allUsers[0] || {
              id: 'mili-admin',
              username: BRAND_NAME,
              uuid: adminUuid,
              subNodeCount: globalCfg.subNodeCount || 50,
              enabled: true,
              config: globalCfg
            };
            const nodes = await generateUserNodesList(adminUser, url.hostname, {
              limit: adminUser.subNodeCount
            });
            return new Response(renderUserStatusPageHtml(adminUser, nodes, request.url), {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          }

          const diag = await getStorageDiagnostics(env);
          const customYxCount = (globalCfg.yx || '').split(',').filter(Boolean).length;
          return new Response(
            renderAdminDashboardHtml({
              config: globalCfg,
              users: allUsers,
              diagnostics: {
                ...diag,
                healthyCfIps: 0,
                candidateEndpointCount: customYxCount + DIRECT_DOMAINS.length + OFFICIAL_DIRECT_IPS.length,
                healthVerified: false
              },
              adminPath: fullCleanPath
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store'
              }
            }
          );
        }

        // اگر توکن متعلق به یکی از کاربران ثبت‌شده در D1 باشد، صفحه وضعیت اختصاصی همان کاربر نمایش داده می‌شود
        const matchedUser = await getUserByIdOrToken(env, fullCleanPath);
        if (matchedUser) {
          const nodes = await generateUserNodesList(matchedUser, url.hostname, {
            limit: matchedUser.subNodeCount
          });
          return new Response(renderUserStatusPageHtml(matchedUser, nodes, request.url), {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store'
            }
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    } catch (err) {
      // محافظ سطح بالا برای مدیریت خطاهای غیرمنتظره؛ تضمین حذف تمام خطاهای Runtime ممکن نیست
      return new Response(
        JSON.stringify({
          status: 'recovered',
          brand: BRAND_NAME,
          message: err?.message || String(err)
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
        }
      );
    }
  }
};
