// ============================================================================
// MiliconfigOS v4.0 - صفحه وضعیت و اشتراک اختصاصی کاربر (ارسالی به کاربر)
// رابط اختصاصی صفحه وضعیت با برند Miliconfig
// ============================================================================

import { BRAND_NAME, BRAND_UPPER, REGION_MAP } from '../config/defaults.js';
import { CLOUD_LOGO_SVG, FAVICON_DATA_URI, SHIELD_LOGO_SVG } from './icons.js';
import { formatBytes } from '../core/utils.js';

export function renderUserStatusPageHtml(user, nodes = [], originUrl = '') {
  const urlObj = new URL(originUrl || 'https://miliconfig.workers.dev');
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
  const userToken = String(user.subscriptionToken || '');
  const baseSubUrl = `${baseUrl}/sub/${encodeURIComponent(userToken)}`;
  const statusUrl = `${baseUrl}/status/${encodeURIComponent(userToken)}`;
  const totalNodes = nodes.length;

  const usedBytes = Number(user.usedBytes || 0);
  const lifetimeBytes = Number(user.lifetimeBytes || 0);
  const limitGb = Number(user.dataLimitGb || 0);
  const limitBytes = limitGb > 0 ? limitGb * 1073741824 : 0;
  const usagePercent = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;

  let expireLabel = 'بدون انقضا';
  if (user.expireAt > 0) {
    const diffDays = Math.ceil((user.expireAt - Date.now()) / 86400000);
    expireLabel = diffDays > 0 ? `${diffDays} روز باقی‌مانده` : 'منقضی شده';
  } else if (user.startOnFirstUse && user.expireDays > 0) {
    expireLabel = `${user.expireDays} روز (شروع با اولین اتصال)`;
  }

  const locationsList = Object.entries(REGION_MAP)
    .filter(([code]) => ['CF', 'HK', 'US', 'SG', 'JP', 'KR', 'DE', 'SE', 'NL', 'FI', 'GB'].includes(code))
    .map(([code, labels]) => ({
      code,
      title: labels[0],
      url: `${baseSubUrl}?wk=${code}`
    }));

  const protoCombos = [
    { title: 'اتصال هوشمند (همه نودها × همه پروتکل‌ها)', badge: 'Base64', url: baseSubUrl },
    { title: 'فقط پروتکل VLESS (WebSocket + TLS)', badge: 'VLESS', url: `${baseSubUrl}?proto=vless` },
    { title: 'فقط پروتکل Trojan (WebSocket + TLS)', badge: 'Trojan', url: `${baseSubUrl}?proto=trojan` },
    { title: 'فقط پروتکل xhttp (ضد فیلتر پیشرفته)', badge: 'xhttp', url: `${baseSubUrl}?proto=xhttp` },
    { title: 'فقط نودهای لبه CDN (Multi-Location)', badge: 'Edge', url: `${baseSubUrl}?scope=edge` },
    { title: 'فقط سرور اصلی (بدون CDN)', badge: 'Origin', url: `${baseSubUrl}?scope=origin` },
    { title: 'کانفیگ اختصاصی Clash Meta / Mihomo', badge: 'YAML', url: `${baseSubUrl}?target=clash` },
    { title: 'کانفیگ اختصاصی Sing-box / Hiddify', badge: 'JSON', url: `${baseSubUrl}?target=singbox` },
    { title: 'کانفیگ اختصاصی Surge', badge: 'INI', url: `${baseSubUrl}?target=surge` },
    { title: 'کانفیگ اختصاصی Quantumult X', badge: 'QuanX', url: `${baseSubUrl}?target=quanx` },
    { title: 'کانفیگ اختصاصی Loon', badge: 'Loon', url: `${baseSubUrl}?target=loon` },
    { title: 'متن خام لینک‌ها (Raw Plaintext)', badge: 'RAW', url: `${baseSubUrl}?target=raw` }
  ];

  const safeNodesJson = JSON.stringify(nodes).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>وضعیت اشتراک ${user.username} — ${BRAND_UPPER}</title>
  <link rel="icon" href="${FAVICON_DATA_URI}">
  <style>
    :root {
      --bg-0: #070d07;
      --bg-1: #0c160c;
      --card: rgba(15, 26, 15, 0.90);
      --card-inner: rgba(9, 16, 9, 0.92);
      --border: rgba(163, 230, 53, 0.18);
      --border-hi: rgba(181, 255, 77, 0.48);
      --neon: #b5ff4d;
      --neon-dim: rgba(181, 255, 77, 0.14);
      --text: #f3f8f1;
      --muted: #93a88a;
      --danger: #f87171;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Vazirmatn", Tahoma, sans-serif;
      background:
        radial-gradient(circle at 20% 0%, rgba(132, 204, 22, 0.18) 0%, transparent 48%),
        radial-gradient(circle at 85% 90%, rgba(101, 163, 13, 0.14) 0%, transparent 45%),
        var(--bg-0);
      color: var(--text);
      padding: 18px 14px 90px;
      line-height: 1.6;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(163, 230, 53, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(163, 230, 53, 0.04) 1px, transparent 1px);
      background-size: 36px 36px;
      pointer-events: none;
      z-index: 0;
    }
    .container {
      position: relative;
      z-index: 1;
      max-width: 680px;
      margin: 0 auto;
    }
    .status-hero {
      background: var(--card);
      border: 1px solid var(--border-hi);
      border-radius: 22px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 16px 44px rgba(0, 0, 0, 0.6);
    }
    .hero-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .hero-user {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .hero-logo {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }
    .hero-logo svg { width: 100%; height: 100%; }
    .hero-name {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--text);
    }
    .hero-brand {
      font-size: 0.76rem;
      color: var(--neon);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
      background: var(--neon-dim);
      border: 1px solid var(--border-hi);
      color: var(--neon);
    }
    .pill-off {
      background: rgba(248, 113, 113, 0.14);
      border-color: rgba(248, 113, 113, 0.4);
      color: var(--danger);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    @media (min-width: 520px) {
      .stats-grid { grid-template-columns: repeat(4, 1fr); }
    }
    .stat-box {
      background: var(--card-inner);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 11px 12px;
    }
    .stat-label {
      font-size: 0.75rem;
      color: var(--muted);
      margin-bottom: 4px;
    }
    .stat-val {
      font-size: 0.96rem;
      font-weight: 800;
      color: var(--text);
    }
    .url-copy-box {
      background: #060b06;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 10px;
    }
    .url-text {
      font-family: "JetBrains Mono", monospace;
      font-size: 0.8rem;
      color: #d7e8cf;
      direction: ltr;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    .copy-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 12px;
      padding: 9px 16px;
      cursor: pointer;
      font-size: 0.84rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.18s;
      flex-shrink: 0;
    }
    .copy-btn:hover {
      border-color: var(--neon);
      color: var(--neon);
      background: var(--neon-dim);
    }
    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 22px 4px 10px;
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--text);
    }
    .section-head .sub-meta {
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--muted);
    }
    .acc-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      margin-bottom: 12px;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .acc-card.open {
      border-color: var(--border-hi);
    }
    .acc-header {
      width: 100%;
      background: transparent;
      border: none;
      color: var(--text);
      padding: 16px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      font-family: inherit;
      text-align: right;
    }
    .acc-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .acc-title {
      font-size: 0.96rem;
      font-weight: 800;
    }
    .acc-count {
      font-size: 0.78rem;
      color: var(--muted);
    }
    .acc-arrow {
      font-size: 0.9rem;
      color: var(--muted);
      transition: transform 0.22s;
    }
    .acc-card.open .acc-arrow {
      transform: rotate(180deg);
      color: var(--neon);
    }
    .acc-body {
      display: none;
      padding: 0 18px 18px;
      border-top: 1px solid rgba(163, 230, 53, 0.1);
    }
    .acc-card.open .acc-body {
      display: block;
    }
    .client-desc {
      font-size: 0.82rem;
      color: var(--muted);
      margin: 12px 0 14px;
      line-height: 1.65;
    }
    .client-item {
      padding: 14px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .client-item:first-of-type { border-top: none; }
    .client-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    .client-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .client-name {
      font-size: 0.98rem;
      font-weight: 800;
      color: #fff;
    }
    .client-os {
      font-size: 0.76rem;
      color: var(--muted);
    }
    .tag-green {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 700;
      color: var(--neon);
      background: rgba(163, 230, 53, 0.12);
      border: 1px solid rgba(163, 230, 53, 0.35);
    }
    .dl-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 11px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text);
      text-decoration: none;
      font-size: 0.78rem;
      font-weight: 600;
      transition: all 0.2s;
    }
    .dl-btn:hover {
      border-color: var(--neon);
      color: var(--neon);
    }
    .node-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      background: var(--card-inner);
      border: 1px solid var(--border);
      margin-top: 8px;
    }
    .node-tag {
      font-family: "JetBrains Mono", monospace;
      font-size: 0.86rem;
      font-weight: 700;
      color: var(--neon);
      direction: ltr;
    }
    .node-proto {
      font-size: 0.74rem;
      color: var(--muted);
    }
    .fab-refresh {
      position: fixed;
      bottom: 22px;
      left: 22px;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: #060a06;
      border: 1px solid var(--border-hi);
      color: var(--text);
      font-size: 1.2rem;
      cursor: pointer;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
      transition: all 0.2s;
    }
    .fab-refresh:hover {
      color: var(--neon);
      transform: rotate(90deg);
    }
    .toast {
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      background: #112211;
      border: 1px solid var(--neon);
      color: var(--neon);
      padding: 10px 20px;
      border-radius: 999px;
      font-size: 0.86rem;
      font-weight: 700;
      z-index: 100;
      display: none;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
    }
  </style>
</head>
<body>
  <div id="toast" class="toast"></div>

  <div class="container">
    <!-- کارت اصلی وضعیت کاربر -->
    <div class="status-hero">
      <div class="hero-top">
        <div class="hero-user">
          <div class="hero-logo">${SHIELD_LOGO_SVG}</div>
          <div>
            <div class="hero-name">${user.username}</div>
            <div class="hero-brand">${BRAND_UPPER} SUBSCRIPTION PORTAL</div>
          </div>
        </div>
        <span class="pill ${user.enabled ? '' : 'pill-off'}">
          ● ${user.enabled ? (user.startOnFirstUse && !user.firstConnectedAt ? 'شروع با اولین اتصال' : 'فعال' ) : 'غیرفعال'}
        </span>
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">مصرف فعلی</div>
          <div class="stat-val">${formatBytes(usedBytes)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">سهمیه حجم</div>
          <div class="stat-val">${limitGb > 0 ? `${limitGb} GB (${usagePercent}%)` : '∞ نامحدود'}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">تعداد نود در ساب</div>
          <div class="stat-val">${totalNodes} نود (${BRAND_NAME})</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">وضعیت انقضا</div>
          <div class="stat-val">${expireLabel}</div>
        </div>
      </div>

      <div style="font-size:0.8rem;color:var(--muted);margin-bottom:4px;">لینک مستقیم صفحه وضعیت و اشتراک شما:</div>
      <div class="url-copy-box">
        <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}', 'لینک اشتراک هوشمند کپی شد')"> کپی ساب‌لینک</button>
        <div class="url-text">${baseSubUrl}</div>
      </div>
    </div>

    <!-- محدوده نودها -->
    <div class="section-head">
      <span> محدودهٔ نودها</span>
      <span class="sub-meta">همه نودها (${totalNodes} نود با فرمت number+${BRAND_NAME})</span>
    </div>
    <div class="acc-card" id="accScope">
      <button type="button" class="acc-header" onclick="toggleAcc('accScope')">
        <div class="acc-title-wrap">
          <span class="acc-title">فقط بخشی از نودها را می‌خواهید؟</span>
          <span class="acc-count">4 گزینه · ${totalNodes} نود در کل</span>
        </div>
        <span class="acc-arrow">⌄</span>
      </button>
      <div class="acc-body">
        <p class="client-desc">می‌توانید تعداد نودهای خروجی یا محدوده نودها را در لینک اشتراک خود فیلتر کنید:</p>
        <div class="client-item">
          <div class="client-top">
            <span class="client-name">همه نودهای کاربر (${totalNodes} نود)</span>
            <span class="tag-green">پیش‌فرض کاربر</span>
          </div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}', 'کپی شد')"></button>
            <div class="url-text">${baseSubUrl}</div>
          </div>
        </div>
        <div class="client-item">
          <div class="client-top">
            <span class="client-name">۱۰ نود اول (1+${BRAND_NAME} تا 10+${BRAND_NAME})</span>
            <span class="tag-green">سبک و سریع</span>
          </div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}?limit=10', 'کپی شد')"></button>
            <div class="url-text">${baseSubUrl}?limit=10</div>
          </div>
        </div>
        <div class="client-item">
          <div class="client-top">
            <span class="client-name">فقط نودهای لبه CDN</span>
            <span class="tag-green">Multi-Location</span>
          </div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}?scope=edge', 'کپی شد')"></button>
            <div class="url-text">${baseSubUrl}?scope=edge</div>
          </div>
        </div>
        <div class="client-item">
          <div class="client-top">
            <span class="client-name">فقط سرور اصلی (بدون CDN)</span>
            <span class="tag-green">Direct Origin</span>
          </div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}?scope=origin', 'کپی شد')"></button>
            <div class="url-text">${baseSubUrl}?scope=origin</div>
          </div>
        </div>
      </div>
    </div>

    <!-- لوکیشن‌ها -->
    <div class="section-head">
      <span> لوکیشن‌ها</span>
      <span class="sub-meta">هر کشور یک سابلینک جدا</span>
    </div>
    <div class="acc-card" id="accLocations">
      <button type="button" class="acc-header" onclick="toggleAcc('accLocations')">
        <div class="acc-title-wrap">
          <span class="acc-title">سابلینک لوکیشن‌محور</span>
          <span class="acc-count">${locationsList.length} لوکیشن</span>
        </div>
        <span class="acc-arrow">⌄</span>
      </button>
      <div class="acc-body">
        <p class="client-desc">با استفاده از هر لینک، مسیر خروجی روی همان منطقه تنظیم می‌شود:</p>
        ${locationsList
          .map(
            loc => `
          <div class="client-item">
            <div class="client-top">
              <span class="client-name">${loc.title}</span>
              <span class="tag-green">${loc.code}</span>
            </div>
            <div class="url-copy-box">
              <button type="button" class="copy-btn" onclick="copyText('${loc.url}', 'لینک لوکیشن ${loc.code} کپی شد')"></button>
              <div class="url-text">${loc.url}</div>
            </div>
          </div>`
          )
          .join('')}
      </div>
    </div>

    <!-- سابلینک اختصاصی هر کلاینت -->
    <div class="section-head">
      <span> سابلینک اختصاصی هر کلاینت</span>
      <span class="sub-meta">16 کلاینت در 5 خانواده</span>
    </div>

    <!-- شروع سریع -->
    <div class="acc-card open" id="accQuickStart">
      <button type="button" class="acc-header" onclick="toggleAcc('accQuickStart')">
        <div class="acc-title-wrap">
          <span class="acc-title">شروع سریع</span>
          <span class="acc-count">1 کلاینت</span>
          <span class="tag-green">پیشنهادی</span>
        </div>
        <span class="acc-arrow">⌄</span>
      </button>
      <div class="acc-body">
        <p class="client-desc">یک لینک برای همه‌چیز؛ سریع‌ترین نود بر اساس پینگ، مناسب هر کلاینتی.</p>
        <div class="client-top">
          <div class="client-name-row">
            <span class="client-name">اتصال هوشمند</span>
            <span class="client-os">همه پلتفرم‌ها</span>
          </div>
          <span class="tag-green">اتصال هوشمند (همه نودها × همه پروتکل‌ها)</span>
        </div>
        <div class="url-copy-box">
          <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}', 'سابلینک هوشمند کپی شد')"></button>
          <div class="url-text">${baseSubUrl}</div>
        </div>
        <div style="font-size:0.78rem;color:var(--muted);margin-top:8px;">سریع‌ترین نود بر اساس پینگ واقعی؛ مناسب شروع سریع.</div>
      </div>
    </div>

    <!-- خانواده 1: Xray / Base64 -->
    <div class="acc-card open" id="accXray">
      <button type="button" class="acc-header" onclick="toggleAcc('accXray')">
        <div class="acc-title-wrap">
          <span class="acc-title">خانواده Xray / متن ساده — Base64</span>
          <span class="acc-count">7 کلاینت</span>
        </div>
        <span class="acc-arrow">⌄</span>
      </button>
      <div class="acc-body">
        <p class="client-desc">v2rayNG، Exclusive، Amnezia، Streisand، Shadowrocket، V2Box و FoXray سابلینک Base64 (یا متن ساده) می‌خوانند.</p>

        <div class="client-item">
          <div class="client-top">
            <div class="client-name-row">
              <span class="client-name">v2rayNG</span>
              <span class="client-os">Android</span>
              <span class="tag-green">Base64 (V2Ray)</span>
            </div>
            <a class="dl-btn" href="https://github.com/2dust/v2rayNG/releases" target="_blank" rel="noopener">⬇ دانلود کلاینت</a>
          </div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}', 'لینک v2rayNG کپی شد')"></button>
            <div class="url-text">${baseSubUrl}</div>
          </div>
          <div style="font-size:0.78rem;color:var(--muted);margin-top:6px;">پرکاربردترین کلاینت اندروید؛ فرگمنت، sni و vless را کامل پشتیبانی می‌کند.</div>
        </div>

        <div class="client-item">
          <div class="client-top">
            <div class="client-name-row">
              <span class="client-name">Exclusive</span>
              <span class="client-os">Android</span>
              <span class="tag-green">Base64 (V2Ray)</span>
            </div>
            <a class="dl-btn" href="https://github.com/GFW-knocker/MahsaNG/releases" target="_blank" rel="noopener">⬇ دانلود کلاینت</a>
          </div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}', 'لینک Exclusive کپی شد')"></button>
            <div class="url-text">${baseSubUrl}</div>
          </div>
          <div style="font-size:0.78rem;color:var(--muted);margin-top:6px;">کلاینت اندروید؛ از سابلینک استاندارد Base64 استفاده می‌کند.</div>
        </div>

        <div class="client-item">
          <div class="client-top">
            <div class="client-name-row">
              <span class="client-name">Amnezia VPN</span>
              <span class="client-os">Android · iOS · دسکتاپ</span>
              <span class="tag-green">Base64 (V2Ray)</span>
            </div>
            <a class="dl-btn" href="https://amnezia.org/en/downloads" target="_blank" rel="noopener">⬇ دانلود کلاینت</a>
          </div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}', 'لینک Amnezia کپی شد')"></button>
            <div class="url-text">${baseSubUrl}</div>
          </div>
        </div>

        <div class="client-item">
          <div class="client-top">
            <div class="client-name-row">
              <span class="client-name">Streisand</span>
              <span class="client-os">iOS · macOS</span>
              <span class="tag-green">Base64 (V2Ray)</span>
            </div>
            <a class="dl-btn" href="https://apps.apple.com/app/streisand/id6450534064" target="_blank" rel="noopener">⬇ دانلود کلاینت</a>
          </div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}', 'لینک Streisand کپی شد')"></button>
            <div class="url-text">${baseSubUrl}</div>
          </div>
        </div>

        <div class="client-item">
          <div class="client-top">
            <div class="client-name-row">
              <span class="client-name">Shadowrocket</span>
              <span class="client-os">iOS</span>
              <span class="tag-green">Base64 (V2Ray)</span>
            </div>
            <a class="dl-btn" href="https://apps.apple.com/app/shadowrocket/id932747118" target="_blank" rel="noopener">⬇ دانلود کلاینت</a>
          </div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}', 'لینک Shadowrocket کپی شد')"></button>
            <div class="url-text">${baseSubUrl}</div>
          </div>
        </div>

        <div class="client-item">
          <div class="client-top">
            <div class="client-name-row">
              <span class="client-name">V2Box</span>
              <span class="client-os">Android · iOS</span>
              <span class="tag-green">Base64 (V2Ray)</span>
            </div>
            <a class="dl-btn" href="https://apps.apple.com/app/v2box-v2ray-client/id6446814690" target="_blank" rel="noopener">⬇ دانلود کلاینت</a>
          </div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}', 'لینک V2Box کپی شد')"></button>
            <div class="url-text">${baseSubUrl}</div>
          </div>
        </div>

        <div class="client-item">
          <div class="client-top">
            <div class="client-name-row">
              <span class="client-name">v2rayN / Nekoray</span>
              <span class="client-os">Windows · Linux · macOS</span>
              <span class="tag-green">Base64 (V2Ray)</span>
            </div>
            <a class="dl-btn" href="https://github.com/2dust/v2rayN/releases" target="_blank" rel="noopener">⬇ دانلود کلاینت</a>
          </div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}', 'لینک v2rayN کپی شد')"></button>
            <div class="url-text">${baseSubUrl}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- خانواده 2: sing-box — JSON -->
    <div class="acc-card" id="accSingbox">
      <button type="button" class="acc-header" onclick="toggleAcc('accSingbox')">
        <div class="acc-title-wrap">
          <span class="acc-title">خانواده sing-box — JSON</span>
          <span class="acc-count">5 کلاینت</span>
        </div>
        <span class="acc-arrow">⌄</span>
      </button>
      <div class="acc-body">
        <p class="client-desc">مناسب Hiddify، Sing-box (نسخه 1.12 به بالا)، Karing، NekoBox و Exclave:</p>
        <div class="client-item">
          <div class="client-top">
            <div class="client-name-row">
              <span class="client-name">Hiddify / Sing-box</span>
              <span class="client-os">همه پلتفرم‌ها</span>
              <span class="tag-green">JSON (Sing-box)</span>
            </div>
            <a class="dl-btn" href="https://github.com/hiddify/hiddify-app/releases" target="_blank" rel="noopener">⬇ دانلود کلاینت</a>
          </div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}?target=singbox', 'لینک Sing-box کپی شد')"></button>
            <div class="url-text">${baseSubUrl}?target=singbox</div>
          </div>
        </div>
      </div>
    </div>

    <!-- خانواده 3: Clash / Mihomo — فقط YAML -->
    <div class="acc-card" id="accClash">
      <button type="button" class="acc-header" onclick="toggleAcc('accClash')">
        <div class="acc-title-wrap">
          <span class="acc-title">خانواده Clash / Mihomo — فقط YAML</span>
          <span class="acc-count">2 کلاینت</span>
        </div>
        <span class="acc-arrow">⌄</span>
      </button>
      <div class="acc-body">
        <p class="client-desc">مناسب Clash Meta for Android (CMFA)، Clash Verge Rev، FlClash و Stash:</p>
        <div class="client-item">
          <div class="client-top">
            <div class="client-name-row">
              <span class="client-name">Clash Meta / Verge / FlClash</span>
              <span class="client-os">Android · Windows · macOS</span>
              <span class="tag-green">YAML (Mihomo)</span>
            </div>
            <a class="dl-btn" href="https://github.com/MetaCubeX/ClashMetaForAndroid/releases" target="_blank" rel="noopener">⬇ دانلود کلاینت</a>
          </div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}?target=clash', 'لینک Clash کپی شد')"></button>
            <div class="url-text">${baseSubUrl}?target=clash</div>
          </div>
        </div>
        ${
          user.config?.jk === 'yes'
            ? `<div class="client-item">
          <div class="client-top">
            <div class="client-name-row">
              <span class="client-name">CLASH زنجیره اینترنت خانگی</span>
              <span class="client-os">Mihomo 1.19.25+</span>
              <span class="tag-green">Residential IP</span>
            </div>
          </div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}?target=vg', 'لینک CLASH خانگی کپی شد')"></button>
            <div class="url-text">${baseSubUrl}?target=vg</div>
          </div>
        </div>`
            : ''
        }
      </div>
    </div>

    <!-- خانواده 4: هسته‌ها و ابزارها -->
    <div class="acc-card" id="accTools">
      <button type="button" class="acc-header" onclick="toggleAcc('accTools')">
        <div class="acc-title-wrap">
          <span class="acc-title">هسته‌ها و ابزارها (Surge / QuanX / Loon)</span>
          <span class="acc-count">3 کلاینت</span>
        </div>
        <span class="acc-arrow">⌄</span>
      </button>
      <div class="acc-body">
        <div class="client-item">
          <div class="client-top"><span class="client-name">Surge</span><span class="tag-green">INI</span></div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}?target=surge', 'لینک Surge کپی شد')"></button>
            <div class="url-text">${baseSubUrl}?target=surge</div>
          </div>
        </div>
        <div class="client-item">
          <div class="client-top"><span class="client-name">Quantumult X</span><span class="tag-green">QuanX</span></div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}?target=quanx', 'لینک Quantumult X کپی شد')"></button>
            <div class="url-text">${baseSubUrl}?target=quanx</div>
          </div>
        </div>
        <div class="client-item">
          <div class="client-top"><span class="client-name">Loon</span><span class="tag-green">Loon</span></div>
          <div class="url-copy-box">
            <button type="button" class="copy-btn" onclick="copyText('${baseSubUrl}?target=loon', 'لینک Loon کپی شد')"></button>
            <div class="url-text">${baseSubUrl}?target=loon</div>
          </div>
        </div>
      </div>
    </div>

    <!-- سابلینک به تفکیک پروتکل و ترنسپورت -->
    <div class="section-head">
      <span> سابلینک به تفکیک پروتکل و ترنسپورت</span>
      <span class="sub-meta">${protoCombos.length} ترکیب</span>
    </div>
    <div class="acc-card" id="accCombos">
      <button type="button" class="acc-header" onclick="toggleAcc('accCombos')">
        <div class="acc-title-wrap">
          <span class="acc-title">لیست ترکیب‌های نود × پروتکل</span>
          <span class="acc-count">${protoCombos.length} لینک</span>
        </div>
        <span class="acc-arrow">⌄</span>
      </button>
      <div class="acc-body">
        ${protoCombos
          .map(
            c => `
          <div class="client-item">
            <div class="client-top">
              <span class="client-name">${c.title}</span>
              <span class="tag-green">${c.badge}</span>
            </div>
            <div class="url-copy-box">
              <button type="button" class="copy-btn" onclick="copyText('${c.url}', 'کپی شد')"></button>
              <div class="url-text">${c.url}</div>
            </div>
          </div>`
          )
          .join('')}
      </div>
    </div>

    <!-- لیست تکی نودهای خروجی با فرمت number+miliconfig -->
    <div class="section-head">
      <span> نودها</span>
      <span class="sub-meta">${totalNodes} کانفیگ تولیدشده · سلامت اتصال هنوز سرتاسری تأیید نشده</span>
    </div>
    <div class="acc-card open" id="accNodes">
      <button type="button" class="acc-header" onclick="toggleAcc('accNodes')">
        <div class="acc-title-wrap">
          <span class="acc-title">لیست کانفیگ‌های خروجی (1+${BRAND_NAME} تا ${totalNodes}+${BRAND_NAME})</span>
          <span class="acc-count">${totalNodes} کانفیگ</span>
        </div>
        <span class="acc-arrow">⌄</span>
      </button>
      <div class="acc-body">
        <div style="margin:12px 0;">
          <button type="button" class="copy-btn" style="width:100%;justify-content:center;" onclick="copyAllNodes()">
             کپی یکجای همه ${totalNodes} کانفیگ (1+${BRAND_NAME} تا ${totalNodes}+${BRAND_NAME})
          </button>
        </div>
        <div id="nodesContainer"></div>
      </div>
    </div>
  </div>

  <button type="button" class="fab-refresh" onclick="window.location.reload()" title="بروزرسانی وضعیت">⇄</button>

  <script>
    var ALL_NODES = ${safeNodesJson};

    function showToast(msg) {
      var t = document.getElementById('toast');
      if (!t) return;
      t.textContent = msg;
      t.style.display = 'block';
      clearTimeout(window._toastTimer);
      window._toastTimer = setTimeout(function() {
        t.style.display = 'none';
      }, 2500);
    }

    function copyText(text, msg) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
          showToast(msg || 'کپی شد');
        });
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(msg || 'کپی شد');
      }
    }

    function copyAllNodes() {
      copyText(ALL_NODES.join('\\n'), 'همه کانفیگ‌ها کپی شدند');
    }

    function toggleAcc(id) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle('open');
    }

    function renderNodes() {
      var container = document.getElementById('nodesContainer');
      if (!container) return;
      var html = '';
      for (var i = 0; i < ALL_NODES.length; i++) {
        var link = ALL_NODES[i];
        var hashIdx = link.indexOf('#');
        var name = hashIdx > -1 ? decodeURIComponent(link.substring(hashIdx + 1)) : ((i + 1) + '+${BRAND_NAME}');
        var proto = link.split('://')[0].toUpperCase();
        html += '<div class="node-row">' +
          '<div><div class="node-tag">' + name + '</div><div class="node-proto">' + proto + ' · Cloudflare Edge</div></div>' +
          '<button type="button" class="copy-btn" onclick="copyNodeByIndex(' + i + ')"> کپی کانفیگ</button>' +
          '</div>';
      }
      container.innerHTML = html;
    }

    function copyNodeByIndex(idx) {
      var link = ALL_NODES[idx];
      if (!link) return;
      copyText(link, 'کانفیگ ' + (idx + 1) + '+${BRAND_NAME} کپی شد');
    }

    renderNodes();
  </script>
</body>
</html>`;
}
