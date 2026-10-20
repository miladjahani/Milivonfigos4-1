// ============================================================================
// MiliconfigOS v4.0 - درگاه ورود و راه‌اندازی سیستم‌عامل (Z-E-U-S Inspired OS Gateway)
// دارای حالت‌های روز/شب، راه‌اندازی تعیین رمز عبور مدیر و ورود امن
// ============================================================================

import { BRAND_NAME, BRAND_UPPER, VERSION } from '../config/defaults.js';
import { CLOUD_LOGO_SVG, FAVICON_DATA_URI, SHIELD_LOGO_SVG } from './icons.js';

export function renderLoginGatewayHtml(options = {}) {
  const initialized = options.initialized !== false;
  const customPath = String(options.customPath || '').replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9._~-]/g, '');
  const adminPath = String(options.adminPath || customPath || '').replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9._~-]/g, '');
  const adminTarget = adminPath ? '/' + adminPath : '/';
  const introUrl = (() => { try { const u = new URL(options.introUrl || 'https://nginx.com/'); return u.protocol === 'https:' ? u.href : 'https://nginx.com/'; } catch (_e) { return 'https://nginx.com/'; } })();

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND_UPPER} ${VERSION} — درگاه سیستم‌عامل مدیریت</title>
  <link rel="icon" href="${FAVICON_DATA_URI}">
  <style>
    :root {
      --bg: #070a0e;
      --card-bg: rgba(13, 18, 25, 0.88);
      --glass-border: rgba(181, 255, 77, 0.25);
      --neon: #b5ff4d;
      --neon-glow: rgba(181, 255, 77, 0.4);
      --cyan: #00f0ff;
      --text: #f0f6fc;
      --text-muted: #8b949e;
      --input-bg: rgba(7, 10, 14, 0.9);
      --danger: #ff5555;
      --shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
    }
    body.light-theme {
      --bg: #f1f5f9;
      --card-bg: rgba(255, 255, 255, 0.92);
      --glass-border: rgba(16, 185, 129, 0.35);
      --neon: #059669;
      --neon-glow: rgba(5, 150, 105, 0.3);
      --cyan: #0284c7;
      --text: #0f172a;
      --text-muted: #64748b;
      --input-bg: #f8fafc;
      --shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Vazirmatn", Tahoma, sans-serif; }
    body {
      min-height: 100vh;
      background: radial-gradient(circle at 20% 20%, rgba(181, 255, 77, 0.12) 0%, transparent 45%),
                  radial-gradient(circle at 80% 80%, rgba(0, 240, 255, 0.1) 0%, transparent 45%),
                  var(--bg);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
      overflow: hidden;
      transition: background 0.3s ease, color 0.3s ease;
    }
    .intro-backdrop {
      position: fixed;
      inset: 0;
      z-index: 3;
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        radial-gradient(circle at 18% 20%, rgba(181,255,77,.18), transparent 42%),
        radial-gradient(circle at 80% 78%, rgba(0,240,255,.16), transparent 44%),
        linear-gradient(135deg, #071018, #101827 55%, #071018);
      transition: opacity .55s ease, filter .55s ease, transform .55s ease;
    }
    .intro-panel {
      width: min(680px, 100%);
      border: 1px solid rgba(181,255,77,.28);
      background: rgba(14,22,32,.62);
      backdrop-filter: blur(18px);
      border-radius: 28px;
      padding: clamp(28px, 6vw, 56px);
      text-align: center;
      box-shadow: 0 30px 100px rgba(0,0,0,.3);
    }
    .intro-orbit {
      width: 72px; height: 72px; margin: 0 auto 22px; border-radius: 24px;
      display: grid; place-items: center; color: var(--neon); font-size: 30px;
      border: 1px solid var(--glass-border);
      background: linear-gradient(135deg, rgba(181,255,77,.14), rgba(0,240,255,.08));
      box-shadow: 0 0 45px rgba(181,255,77,.12);
    }
    .intro-panel h2 { font-size: clamp(1.6rem, 4vw, 2.6rem); margin-bottom: 10px; letter-spacing: .02em; }
    .intro-panel p { color: var(--text-muted); line-height: 1.9; max-width: 520px; margin: 0 auto 24px; }
    .intro-link { color: var(--cyan); text-decoration: none; border: 1px solid var(--glass-border); padding: 10px 16px; display: inline-flex; border-radius: 12px; }
    .intro-progress { width: min(250px, 85%); height: 4px; border-radius: 99px; overflow: hidden; background: rgba(255,255,255,.1); margin: 24px auto 0; }
    .intro-progress::after { content: ''; display: block; width: 35%; height: 100%; background: linear-gradient(90deg,var(--neon),var(--cyan)); animation: introProgress 3s linear forwards; }
    @keyframes introProgress { from { transform: translateX(0); } to { transform: translateX(190%); } }
    body.gateway-ready .intro-backdrop { opacity: .28; filter: blur(9px); transform: scale(1.025); pointer-events: none; }
    body.gateway-ready .os-window { opacity: 1; filter: blur(0); transform: translateY(0) scale(1); pointer-events: auto; }
    .os-window { animation: none; opacity: 0; filter: blur(12px); transform: translateY(16px) scale(.97); pointer-events: none; transition: opacity .55s ease, filter .55s ease, transform .55s cubic-bezier(.2,.8,.2,1); }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
    }
    .os-top-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 38px;
      background: rgba(10, 14, 20, 0.7);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--glass-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      font-size: 0.82rem;
      z-index: 10;
    }
    body.light-theme .os-top-bar {
      background: rgba(255, 255, 255, 0.8);
    }
    .top-left, .top-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      color: var(--neon);
      text-decoration: none;
    }
    .support-link {
      color: var(--cyan);
      text-decoration: none;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .support-link:hover { text-decoration: underline; }
    .theme-toggle-btn {
      background: transparent;
      border: 1px solid var(--glass-border);
      color: var(--text);
      padding: 3px 9px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .os-window {
      width: 100%;
      max-width: 480px;
      background: var(--card-bg);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(20px);
      overflow: hidden;
      animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      z-index: 5;
    }
    @keyframes popIn {
      0% { opacity: 0; transform: scale(0.92) translateY(20px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .window-header {
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--glass-border);
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .traffic-lights {
      display: flex;
      gap: 6px;
    }
    .dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
    }
    .dot-red { background: #ff5f56; }
    .dot-yellow { background: #ffbd2e; }
    .dot-green { background: #27c93f; }
    .window-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.05em;
    }
    .window-body {
      padding: 32px 28px;
    }
    .logo-center {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo-box {
      width: 64px;
      height: 64px;
      margin: 0 auto 12px;
      background: rgba(181, 255, 77, 0.12);
      border: 1px solid var(--neon);
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px var(--neon-glow);
    }
    .logo-box svg { width: 38px; height: 38px; }
    .app-title {
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: 0.04em;
    }
    .app-subtitle {
      font-size: 0.82rem;
      color: var(--neon);
      margin-top: 4px;
    }
    .form-group {
      margin-bottom: 18px;
    }
    label {
      display: block;
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    input {
      width: 100%;
      padding: 12px 16px;
      background: var(--input-bg);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      color: var(--text);
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      direction: ltr;
      text-align: left;
    }
    input:focus {
      border-color: var(--neon);
      box-shadow: 0 0 10px var(--neon-glow);
    }
    .submit-btn {
      width: 100%;
      padding: 14px;
      background: var(--neon);
      border: none;
      border-radius: 12px;
      color: #070a0e;
      font-size: 0.98rem;
      font-weight: 700;
      cursor: pointer;
      margin-top: 10px;
      transition: transform 0.15s, box-shadow 0.2s;
      box-shadow: 0 4px 15px var(--neon-glow);
    }
    .submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px var(--neon-glow);
    }
    .info-box {
      margin-top: 20px;
      padding: 12px 14px;
      background: rgba(0, 240, 255, 0.08);
      border: 1px solid rgba(0, 240, 255, 0.25);
      border-radius: 10px;
      font-size: 0.82rem;
      color: var(--text-muted);
      line-height: 1.6;
    }
    .error-msg {
      margin-top: 12px;
      padding: 10px;
      background: rgba(255, 85, 85, 0.12);
      border: 1px solid var(--danger);
      border-radius: 8px;
      color: var(--danger);
      font-size: 0.84rem;
      display: none;
      text-align: center;
    }

    /* Miliconfig login visual identity */
    :root { --accent-violet: #a78bfa; --accent-pink: #f472b6; }
    body { background-attachment: fixed; }
    body::before { content:""; position:fixed; inset:0; z-index:-1; pointer-events:none; background: radial-gradient(ellipse at 18% 20%, color-mix(in srgb, var(--neon) 14%, transparent), transparent 38%), radial-gradient(ellipse at 82% 72%, color-mix(in srgb, var(--accent-violet) 14%, transparent), transparent 40%); }
    .os-top-bar { border-bottom-color: color-mix(in srgb, var(--cyan) 25%, var(--glass-border)); }
    .brand-pill { display:inline-flex; align-items:center; gap:9px; }
    .brand-pill::before { content:"M"; display:inline-grid; place-items:center; width:25px; height:25px; border-radius:8px; color:#07110b; font-weight:950; background:linear-gradient(135deg,var(--neon),var(--cyan) 58%,var(--accent-violet)); box-shadow:0 0 22px color-mix(in srgb,var(--cyan) 25%,transparent); animation:mili-mark-pulse 4s ease-in-out infinite; }
    @keyframes mili-mark-pulse { 0%,100% { transform:rotate(0) scale(1); } 50% { transform:rotate(-4deg) scale(1.045); } }
    .os-window { border-radius:20px; border-color:color-mix(in srgb,var(--cyan) 20%,var(--glass-border)); box-shadow:0 24px 72px rgba(0,0,0,.3), inset 0 1px rgba(255,255,255,.05); }
    .logo-box { filter: drop-shadow(0 0 22px color-mix(in srgb,var(--cyan) 22%,transparent)); }
    .app-title { letter-spacing:.07em; }
    input, button { -webkit-tap-highlight-color:transparent; }
    button, .submit-btn { transition:transform .16s ease,filter .16s ease,box-shadow .16s ease; }
    button:hover, .submit-btn:hover { filter:brightness(1.06); transform:translateY(-1px); }
    button:active, .submit-btn:active { transform:scale(.985); }
    input:focus-visible, button:focus-visible, a:focus-visible { outline:2px solid var(--cyan); outline-offset:3px; }
    body.light-theme .os-window { box-shadow:0 24px 65px rgba(36,52,82,.13); }
    @media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; } }

  </style>
</head>
<body>
  <div class="intro-backdrop" id="introBackdrop" aria-label="صفحه آغازین Miliconfig">
    <div class="intro-panel">
      <div class="intro-orbit" aria-hidden="true">M</div>
      <h2>MILICONFIG OS</h2>
      <p>در حال آماده‌سازی فضای مدیریت شبکه؛ محیطی یکپارچه برای تنظیمات، اشتراک‌ها و سلامت اتصال.</p>
      <a class="intro-link" href="${introUrl}" target="_blank" rel="noopener noreferrer">بازکردن صفحه مرجع nginx.com ↗</a>
      <div class="intro-progress" aria-hidden="true"></div>
    </div>
  </div>
  <div class="os-top-bar">
    <div class="top-left">
      <span class="brand-pill"> ${BRAND_NAME} ${VERSION}</span>
      <span id="liveClock" style="color: var(--text-muted);"></span>
    </div>
    <div class="top-right">
      <a href="https://t.me/miliconfig" target="_blank" class="support-link">
         پشتیبانی @miliconfig
      </a>
      <button class="theme-toggle-btn" onclick="toggleTheme()" id="themeBtn" aria-label="تغییر حالت روشن، تاریک یا خودکار">حالت خودکار</button>
    </div>
  </div>

  <div class="os-window">
    <div class="window-header">
      <div class="traffic-lights">
        <span class="dot dot-red"></span>
        <span class="dot dot-yellow"></span>
        <span class="dot dot-green"></span>
      </div>
      <div class="window-title">${initialized ? 'LOGIN GATEWAY' : 'FIRST RUN SETUP'}</div>
      <div style="width: 40px;"></div>
    </div>
    <div class="window-body">
      <div class="logo-center">
        <div class="logo-box">
          ${SHIELD_LOGO_SVG}
        </div>
        <h1 class="app-title">${BRAND_UPPER} OS</h1>
        <div class="app-subtitle">${initialized ? 'درگاه ورود امن مدیر به مرکز کنترل' : 'راه‌اندازی اولیه و تعیین رمز عبور مدیر'}</div>
      </div>

      <div class="error-msg" id="errBox"></div>

      ${initialized ? `
      <form id="loginForm" onsubmit="handleLogin(event)">
        <div class="form-group">
          <label>رمز عبور پنل مدیریت:</label>
          <input type="password" id="pwdInput" placeholder="رمز عبور خود را وارد کنید..." required autofocus>
        </div>
        <button type="submit" class="submit-btn" id="subBtn">ورود به مرکز مدیریت</button>
      </form>
      ` : `
      <form id="setupForm" onsubmit="handleSetup(event)">
        <div class="form-group">
          <label>تعیین رمز عبور مدیر (حداقل ۸ نویسه):</label>
          <input type="password" id="newPwd" placeholder="رمز عبور جدید..." required autofocus>
        </div>
        <div class="form-group">
          <label>تکرار رمز عبور:</label>
          <input type="password" id="confirmPwd" placeholder="تکرار رمز عبور..." required>
        </div>
        <button type="submit" class="submit-btn" id="subBtn">ذخیره رمز عبور و راه‌اندازی پنل</button>
      </form>
      `}

      <div class="info-box">
         <b>راهنما:</b> ${initialized
          ? 'ورود با نشست امضاشده و کوکی HttpOnly انجام می‌شود. برای حفظ نشست پس از راه‌اندازی مجدد، اتصال D1 یا KV لازم است.'
          : 'این اولین استقرار شماست! لطفاً یک رمز عبور برای ورود به مرکز کنترل تعیین کنید. تمام تنظیمات و نودها در مراحل بعدی آماده خواهند بود.'}
      </div>
    </div>
  </div>

  <script>
    function updateClock() {
      const now = new Date();
      document.getElementById('liveClock').textContent = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    }
    setInterval(updateClock, 1000);
    updateClock();

    function applyTheme(mode) {
      var effective = mode;
      if (mode === 'system') effective = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.body.classList.toggle('light-theme', effective === 'light');
      document.documentElement.dataset.theme = mode;
      var btn = document.getElementById('themeBtn');
      if (btn) btn.textContent = mode === 'light' ? 'حالت روز' : mode === 'dark' ? 'حالت شب' : 'حالت خودکار';
    }
    function toggleTheme() {
      var current = localStorage.getItem('mili_theme') || 'system';
      var next = current === 'system' ? 'dark' : current === 'dark' ? 'light' : 'system';
      localStorage.setItem('mili_theme', next);
      applyTheme(next);
    }
    applyTheme(localStorage.getItem('mili_theme') || 'system');
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function() {
      if ((localStorage.getItem('mili_theme') || 'system') === 'system') applyTheme('system');
    });
    window.setTimeout(function() { document.body.classList.add('gateway-ready'); }, window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 3000);

    function showErr(msg) {
      const b = document.getElementById('errBox');
      b.textContent = msg;
      b.style.display = 'block';
    }

    async function handleLogin(e) {
      e.preventDefault();
      const pwd = document.getElementById('pwdInput').value;
      const btn = document.getElementById('subBtn');
      btn.disabled = true;
      btn.textContent = 'در حال اعتبارسنجی...';
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd })
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = ${JSON.stringify(adminTarget)};
        } else {
          showErr(data.message || 'رمز عبور اشتباه است.');
          btn.disabled = false;
          btn.textContent = 'ورود به مرکز مدیریت';
        }
      } catch (err) {
        showErr('خطای شبکه در برقراری ارتباط');
        btn.disabled = false;
        btn.textContent = 'ورود به مرکز مدیریت';
      }
    }

    async function handleSetup(e) {
      e.preventDefault();
      const p1 = document.getElementById('newPwd').value;
      const p2 = document.getElementById('confirmPwd').value;
      if (p1 !== p2) {
        showErr('رمزهای عبور وارد شده یکسان نیستند.');
        return;
      }
      if (p1.length < 8) {
        showErr('رمز عبور باید حداقل ۸ نویسه باشد.');
        return;
      }
      const btn = document.getElementById('subBtn');
      btn.disabled = true;
      btn.textContent = 'در حال ذخیره‌سازی...';
      try {
        const res = await fetch('/api/admin/setup-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: p1 })
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = ${JSON.stringify(adminTarget)};
        } else {
          showErr(data.message || 'خطا در ثبت رمز عبور');
          btn.disabled = false;
          btn.textContent = 'ذخیره رمز عبور و راه‌اندازی پنل';
        }
      } catch (err) {
        showErr('خطای شبکه در برقراری ارتباط');
        btn.disabled = false;
        btn.textContent = 'ذخیره رمز عبور و راه‌اندازی پنل';
      }
    }
  </script>
</body>
</html>`;
}
