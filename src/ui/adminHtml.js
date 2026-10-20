// ============================================================================
// MiliconfigOS v4.0 - مرکز کنترل سیستم‌عامل مدیریت (Z-E-U-S Inspired OS Desktop)
// تم سبک و روان، حالت روز/شب، سبز نئونی، قفل ۵ کاربر، تنظیمات گام‌به‌گام و اسکنر کشوری
// ============================================================================

import {
  BRAND_NAME,
  BRAND_UPPER,
  CONFIG_DEFAULTS,
  COUNTRY_PROXY_SOURCES,
  ECH_DOMAINS,
  FINGERPRINT_PRESETS,
  FRAGMENT_PRESETS,
  MAX_USERS_LIMIT,
  PATH_PATTERNS,
  TELEGRAM_SUPPORT,
  VERSION
} from '../config/defaults.js';
import { USER_PRESETS } from '../config/presets.js';
import { CLOUD_LOGO_SVG, FAVICON_DATA_URI, SHIELD_LOGO_SVG } from './icons.js';

export function renderAdminDashboardHtml(initialData = {}) {
  const safeInitialJson = JSON.stringify({
    brand: BRAND_NAME,
    version: VERSION,
    defaults: CONFIG_DEFAULTS,
    presets: USER_PRESETS,
    config: initialData.config || CONFIG_DEFAULTS,
    users: initialData.users || [],
    diagnostics: initialData.diagnostics || {},
    adminPath: initialData.adminPath || '',
    countrySources: COUNTRY_PROXY_SOURCES,
    fragmentPresets: FRAGMENT_PRESETS,
    fingerprintPresets: FINGERPRINT_PRESETS,
    echDomains: ECH_DOMAINS,
    pathPatterns: PATH_PATTERNS,
    maxUsersLimit: MAX_USERS_LIMIT,
    telegramSupport: TELEGRAM_SUPPORT
  }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND_UPPER} ${VERSION} — سیستم‌عامل مرکز کنترل</title>
  <link rel="icon" href="${FAVICON_DATA_URI}">
  <style>
    :root {
      --bg: #090d14;
      --card-bg: rgba(14, 20, 30, 0.82);
      --card-solid: #0e141e;
      --glass-border: rgba(181, 255, 77, 0.22);
      --glass-border-subtle: rgba(255, 255, 255, 0.08);
      --neon: #b5ff4d;
      --neon-hover: #c9ff7a;
      --neon-glow: rgba(181, 255, 77, 0.35);
      --neon-soft: rgba(181, 255, 77, 0.12);
      --cyan: #00f0ff;
      --cyan-soft: rgba(0, 240, 255, 0.12);
      --purple: #a855f7;
      --text: #f0f6fc;
      --text-muted: #8b949e;
      --input-bg: rgba(9, 13, 20, 0.9);
      --danger: #ff5555;
      --warn: #ffb86c;
      --shadow-os: 0 20px 60px rgba(0, 0, 0, 0.7);
    }
    body.light-theme {
      --bg: #f1f5f9;
      --card-bg: rgba(255, 255, 255, 0.88);
      --card-solid: #ffffff;
      --glass-border: rgba(16, 185, 129, 0.32);
      --glass-border-subtle: rgba(0, 0, 0, 0.08);
      --neon: #059669;
      --neon-hover: #10b981;
      --neon-glow: rgba(16, 185, 129, 0.25);
      --neon-soft: rgba(16, 185, 129, 0.1);
      --cyan: #0284c7;
      --cyan-soft: rgba(2, 132, 199, 0.1);
      --purple: #7c3aed;
      --text: #0f172a;
      --text-muted: #64748b;
      --input-bg: #f8fafc;
      --danger: #dc2626;
      --warn: #d97706;
      --shadow-os: 0 15px 40px rgba(0, 0, 0, 0.1);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Vazirmatn", Tahoma, sans-serif; }
    body {
      min-height: 100vh;
      background: radial-gradient(circle at 10% 15%, rgba(181, 255, 77, 0.08) 0%, transparent 40%),
                  radial-gradient(circle at 90% 85%, rgba(0, 240, 255, 0.08) 0%, transparent 40%),
                  var(--bg);
      color: var(--text);
      overflow-x: hidden;
      padding-top: 44px;
      padding-bottom: 96px;
      transition: background 0.3s ease, color 0.3s ease;
    }

    /* ۱. نوار سیستم بالای صفحه (OS Menu Bar) */
    .os-topbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 42px;
      background: rgba(10, 14, 22, 0.8);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--glass-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 18px;
      font-size: 0.83rem;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }
    body.light-theme .os-topbar {
      background: rgba(255, 255, 255, 0.85);
    }
    .topbar-left, .topbar-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-badge {
      display: flex;
      align-items: center;
      gap: 7px;
      font-weight: 800;
      color: var(--neon);
      text-shadow: 0 0 12px var(--neon-glow);
    }
    .cf-quota-meter {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 3px 10px;
      background: var(--neon-soft);
      border: 1px solid var(--glass-border);
      border-radius: 999px;
      font-size: 0.77rem;
      color: var(--neon);
      font-weight: 600;
    }
    .cf-progress-bar {
      width: 50px;
      height: 6px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 999px;
      overflow: hidden;
    }
    .cf-progress-fill {
      width: 4%;
      height: 100%;
      background: var(--neon);
      border-radius: 999px;
      box-shadow: 0 0 8px var(--neon);
    }
    .topbar-btn {
      background: transparent;
      border: 1px solid var(--glass-border);
      color: var(--text);
      padding: 4px 11px;
      border-radius: 999px;
      font-size: 0.8rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s;
      text-decoration: none;
    }
    .topbar-btn:hover {
      background: var(--neon-soft);
      border-color: var(--neon);
      color: var(--neon);
    }
    .topbar-btn-glowing {
      background: linear-gradient(135deg, rgba(181, 255, 77, 0.2), rgba(0, 240, 255, 0.2));
      border-color: var(--neon);
      color: var(--neon);
      font-weight: 700;
      box-shadow: 0 0 12px var(--neon-glow);
    }

    /* ۲. داک شناور پایین صفحه (macOS / Zeus Style Floating Dock) */
    .os-dock-container {
      position: fixed;
      bottom: 14px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      z-index: 1000;
      pointer-events: none;
    }
    .os-dock {
      pointer-events: auto;
      background: rgba(14, 20, 30, 0.85);
      backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: 22px;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6), 0 0 20px rgba(181, 255, 77, 0.15);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    body.light-theme .os-dock {
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
    }
    .dock-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      padding: 7px 12px;
      border-radius: 14px;
      cursor: pointer;
      color: var(--text-muted);
      font-size: 0.76rem;
      font-weight: 600;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .dock-item:hover {
      transform: translateY(-5px) scale(1.08);
      color: var(--neon);
    }
    .dock-item.active {
      color: var(--neon);
      background: var(--neon-soft);
      box-shadow: 0 0 15px var(--neon-glow);
    }
    .dock-item.active::after {
      content: "";
      position: absolute;
      bottom: -4px;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--neon);
      box-shadow: 0 0 6px var(--neon);
    }
    .dock-icon {
      font-size: 1.45rem;
    }

    /* ۳. محفظه دسکتاپ و پنجره‌های اصلی */
    .os-desktop {
      max-width: 1400px;
      margin: 18px auto;
      padding: 0 18px;
    }
    .os-window {
      background: var(--card-bg);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      box-shadow: var(--shadow-os);
      backdrop-filter: blur(20px);
      overflow: hidden;
      margin-bottom: 24px;
      animation: fadeIn 0.35s ease;
    }
    @keyframes fadeIn {
      0% { opacity: 0; transform: translateY(14px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .window-header {
      background: rgba(0, 0, 0, 0.25);
      border-bottom: 1px solid var(--glass-border);
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    body.light-theme .window-header {
      background: rgba(0, 0, 0, 0.04);
    }
    .window-controls {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .window-dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      display: inline-block;
    }
    .window-dot-red { background: #ff5f56; }
    .window-dot-yellow { background: #ffbd2e; }
    .window-dot-green { background: #27c93f; }
    .window-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--neon);
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .window-body {
      padding: 24px;
    }

    /* ۴. بخش‌های گام‌به‌گام آکاردئونی تنظیمات (Accordion Stepper) */
    .stepper-nav {
      display: flex;
      gap: 10px;
      margin-bottom: 22px;
      border-bottom: 1px solid var(--glass-border-subtle);
      padding-bottom: 12px;
      overflow-x: auto;
    }
    .step-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--glass-border-subtle);
      border-radius: 12px;
      color: var(--text-muted);
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .step-tab:hover {
      border-color: var(--neon);
      color: var(--neon);
    }
    .step-tab.active {
      background: var(--neon-soft);
      border-color: var(--neon);
      color: var(--neon);
      box-shadow: 0 0 15px var(--neon-glow);
    }
    .step-num {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
    }
    .step-tab.active .step-num {
      background: var(--neon);
      color: #070a0e;
      font-weight: 800;
    }
    .step-panel {
      display: none;
      animation: fadeIn 0.3s ease;
    }
    .step-panel.active {
      display: block;
    }

    /* گرید گزینه‌ها در هر گام تنظیمات */
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 18px;
    }
    .setting-card {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--glass-border-subtle);
      border-radius: 14px;
      padding: 16px;
      transition: border-color 0.2s;
    }
    .setting-card:hover {
      border-color: var(--glass-border);
    }
    .setting-label {
      font-size: 0.88rem;
      font-weight: 700;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .setting-desc {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-bottom: 12px;
      line-height: 1.5;
    }
    .form-control {
      width: 100%;
      padding: 10px 14px;
      background: var(--input-bg);
      border: 1px solid var(--glass-border-subtle);
      border-radius: 10px;
      color: var(--text);
      font-size: 0.88rem;
      outline: none;
      transition: border-color 0.2s;
      direction: ltr;
    }
    .form-control:focus {
      border-color: var(--neon);
      box-shadow: 0 0 10px var(--neon-glow);
    }
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 46px;
      height: 24px;
    }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(255, 255, 255, 0.15);
      border-radius: 24px;
      transition: 0.25s;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: #fff;
      border-radius: 50%;
      transition: 0.25s;
    }
    input:checked + .slider {
      background-color: var(--neon);
      box-shadow: 0 0 10px var(--neon-glow);
    }
    input:checked + .slider:before {
      transform: translateX(22px);
      background-color: #070a0e;
    }

    /* ۵. کارت‌های آمار داشبورد (Real Metrics) */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--glass-border);
      border-radius: 16px;
      padding: 18px;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(12px);
    }
    .metric-card::before {
      content: "";
      position: absolute;
      top: 0; right: 0; width: 4px; height: 100%;
      background: var(--neon);
      box-shadow: 0 0 10px var(--neon);
    }
    .metric-title {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 600;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .metric-val {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--text);
    }
    .metric-sub {
      font-size: 0.76rem;
      color: var(--neon);
      margin-top: 5px;
    }

    /* ۶. کارت‌های مدیریت کاربران (سقف پنج کاربر) */
    .user-limit-banner {
      background: rgba(181, 255, 77, 0.08);
      border: 1px solid var(--glass-border);
      border-radius: 14px;
      padding: 14px 18px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .limit-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 4px 12px;
      border-radius: 999px;
      background: var(--neon-soft);
      border: 1px solid var(--neon);
      color: var(--neon);
      font-size: 0.82rem;
      font-weight: 700;
    }
    .user-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 18px;
    }
    .user-card {
      background: var(--card-bg);
      border: 1px solid var(--glass-border);
      border-radius: 18px;
      padding: 20px;
      position: relative;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .user-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(181, 255, 77, 0.15);
    }
    .user-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .user-name {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text);
    }
    .user-status-pill {
      font-size: 0.74rem;
      padding: 3px 9px;
      border-radius: 999px;
      font-weight: 700;
    }
    .status-active { background: rgba(39, 201, 63, 0.15); border: 1px solid #27c93f; color: #27c93f; }
    .status-disabled { background: rgba(255, 95, 86, 0.15); border: 1px solid #ff5f56; color: #ff5f56; }
    .config-conflict-panel { margin: 0 0 18px; border: 1px solid var(--glass-border); border-radius: 14px; padding: 12px 14px; background: var(--panel-bg, rgba(255,255,255,.035)); }
    .config-conflict-panel[hidden] { display: none; }
    .config-conflict-item { padding: 10px 0; border-bottom: 1px solid var(--glass-border); }
    .config-conflict-item:last-child { border-bottom: 0; }
    .config-conflict-title { font-weight: 800; margin-bottom: 3px; }
    .config-conflict-message { color: var(--text-muted); font-size: .86rem; line-height: 1.8; }
    .config-conflict-item[data-severity="ERROR"], .config-conflict-item[data-severity="CRITICAL"] { color: var(--danger); }
    .config-conflict-item[data-severity="WARNING"] { color: #d97706; }
    .usage-progress-bar {
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 999px;
      overflow: hidden;
      margin: 10px 0 6px;
    }
    .usage-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--neon), var(--cyan));
      border-radius: 999px;
    }
    .proto-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 14px 0;
    }
    .proto-tag {
      font-size: 0.72rem;
      padding: 2px 7px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--glass-border-subtle);
      color: var(--text-muted);
    }
    .proto-tag.active {
      background: var(--neon-soft);
      border-color: var(--neon);
      color: var(--neon);
      font-weight: 600;
    }
    .card-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }
    .btn-action {
      flex: 1;
      padding: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--glass-border-subtle);
      border-radius: 10px;
      color: var(--text);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: all 0.2s;
    }
    .btn-action:hover {
      background: var(--neon-soft);
      border-color: var(--neon);
      color: var(--neon);
    }

    /* ۷. جدول اسکنر زنده پروکسی کشوری */
    .scanner-controls {
      display: flex;
      gap: 12px;
      margin-bottom: 18px;
      flex-wrap: wrap;
    }
    .scanner-table-wrapper {
      overflow-x: auto;
      border: 1px solid var(--glass-border-subtle);
      border-radius: 14px;
    }
    .scanner-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.84rem;
      text-align: right;
    }
    .scanner-table th {
      background: rgba(0, 0, 0, 0.3);
      padding: 12px 16px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--glass-border-subtle);
    }
    .scanner-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--glass-border-subtle);
      direction: ltr;
      text-align: left;
    }
    .ping-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 0.76rem;
    }
    .ping-fast { background: rgba(39, 201, 63, 0.2); color: #27c93f; }
    .ping-med { background: rgba(255, 189, 46, 0.2); color: #ffbd2e; }

    /* ۸. مودال‌های سیستم‌عامل (Glass Modals) */
    .os-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      z-index: 2000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .os-modal {
      width: 100%;
      max-width: 640px;
      max-height: 90vh;
      overflow-y: auto;
      background: var(--card-solid);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      box-shadow: var(--shadow-os);
      animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .toast-msg {
      position: fixed;
      bottom: 84px;
      left: 50%;
      transform: translateX(-50%);
      background: #0e141e;
      border: 1px solid var(--neon);
      color: var(--neon);
      padding: 10px 24px;
      border-radius: 999px;
      font-size: 0.88rem;
      font-weight: 700;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 15px var(--neon-glow);
      z-index: 3000;
      display: none;
      animation: fadeIn 0.2s ease;
    }

    /* Miliconfig signature desktop UI refresh — fast, vector-first, no emoji UI */
    :root {
      color-scheme: dark;
      --accent-a: #9bff57;
      --accent-b: #32d7ff;
      --accent-c: #b18cff;
      --accent-d: #ff7bbd;
      --surface-1: color-mix(in srgb, var(--card-solid) 92%, var(--accent-b) 8%);
      --surface-2: color-mix(in srgb, var(--card-solid) 84%, var(--accent-c) 16%);
      --focus-ring: 0 0 0 3px color-mix(in srgb, var(--cyan) 35%, transparent);
    }
    html { scroll-behavior: smooth; scrollbar-gutter: stable; }
    body { isolation: isolate; background-attachment: fixed; }
    body::before {
      content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
      background:
        radial-gradient(ellipse at 12% 8%, color-mix(in srgb, var(--neon) 12%, transparent), transparent 34%),
        radial-gradient(ellipse at 88% 18%, color-mix(in srgb, var(--cyan) 10%, transparent), transparent 32%),
        radial-gradient(ellipse at 60% 100%, color-mix(in srgb, var(--purple) 9%, transparent), transparent 40%);
      transform: translateZ(0);
    }
    .os-topbar { height: 48px; padding-inline: clamp(12px, 2vw, 28px); border-bottom-color: color-mix(in srgb, var(--cyan) 22%, var(--glass-border)); }
    .brand-badge { position: relative; isolation: isolate; letter-spacing: .035em; }
    .brand-badge::before {
      content: "M"; display: inline-grid; place-items: center; width: 25px; height: 25px;
      border-radius: 8px; margin-inline-end: 7px; color: #07110b; font-weight: 950;
      background: linear-gradient(135deg, var(--neon), var(--cyan) 58%, var(--purple));
      box-shadow: 0 0 22px color-mix(in srgb, var(--cyan) 25%, transparent);
      animation: mili-mark-pulse 4s ease-in-out infinite;
    }
    @keyframes mili-mark-pulse { 0%,100% { transform: rotate(0) scale(1); } 50% { transform: rotate(-4deg) scale(1.045); } }
    .os-desktop { max-width: 1540px; padding-inline: clamp(12px, 2.2vw, 34px); margin-top: 24px; }
    .os-window {
      position: relative; border-radius: 18px; border-color: color-mix(in srgb, var(--glass-border) 72%, var(--cyan) 28%);
      box-shadow: 0 18px 48px rgba(0,0,0,.18), inset 0 1px rgba(255,255,255,.045);
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
      animation: mili-window-in .32s cubic-bezier(.2,.75,.25,1) both;
    }
    .os-window:hover { border-color: color-mix(in srgb, var(--cyan) 38%, var(--glass-border)); box-shadow: 0 22px 54px rgba(0,0,0,.22), 0 0 0 1px color-mix(in srgb, var(--cyan) 7%, transparent); }
    @keyframes mili-window-in { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
    .window-header { min-height: 52px; padding: 11px clamp(13px, 1.8vw, 24px); background: linear-gradient(100deg, color-mix(in srgb, var(--neon) 5%, transparent), color-mix(in srgb, var(--cyan) 4%, transparent), transparent 70%); }
    .window-title { letter-spacing: 0; font-size: .91rem; }
    .window-body { padding: clamp(14px, 2vw, 28px); }
    .metrics-row { gap: 13px; }
    .metric-card { border-radius: 14px; background: linear-gradient(145deg, var(--surface-1), var(--card-bg)); transition: transform .18s ease, border-color .18s ease; }
    .metric-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--cyan) 42%, var(--glass-border)); }
    .metric-card:nth-child(4n+2)::before { background: var(--cyan); box-shadow: 0 0 12px color-mix(in srgb, var(--cyan) 55%, transparent); }
    .metric-card:nth-child(4n+3)::before { background: var(--purple); box-shadow: 0 0 12px color-mix(in srgb, var(--purple) 55%, transparent); }
    .metric-card:nth-child(4n+4)::before { background: var(--accent-d); box-shadow: 0 0 12px color-mix(in srgb, var(--accent-d) 55%, transparent); }
    .topbar-btn, .submit-btn, .theme-toggle-btn, button, select, input { -webkit-tap-highlight-color: transparent; }
    .topbar-btn, .submit-btn { transition: transform .16s ease, filter .16s ease, box-shadow .16s ease; }
    .topbar-btn:hover, .submit-btn:hover { filter: brightness(1.07); transform: translateY(-1px); }
    .topbar-btn:active, .submit-btn:active { transform: translateY(0) scale(.985); }
    .form-control { min-height: 43px; border-radius: 10px; transition: border-color .16s ease, box-shadow .16s ease, background .16s ease; }
    .form-control:focus, button:focus-visible, a:focus-visible { outline: none; box-shadow: var(--focus-ring); }
    .os-modal { border-radius: 18px; border-color: color-mix(in srgb, var(--cyan) 22%, var(--glass-border)); }
    .os-modal-backdrop { backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
    .os-dock { gap: 5px; border-radius: 18px; padding: 7px; }
    .dock-item { min-width: 68px; padding: 8px 10px; }
    .dock-icon { font-size: 1.1rem; }
    .user-cards-grid { gap: 14px; }
    .user-limit-banner { background: linear-gradient(110deg, color-mix(in srgb, var(--neon) 9%, transparent), color-mix(in srgb, var(--cyan) 6%, transparent)); }
    body.light-theme { color-scheme: light; }
    body.light-theme .os-window { box-shadow: 0 14px 40px rgba(36,52,82,.09), inset 0 1px rgba(255,255,255,.8); }
    body.light-theme .os-window:hover { box-shadow: 0 18px 44px rgba(36,52,82,.13); }
    body.light-theme .metric-card { background: linear-gradient(145deg, #fff, #f4f8ff); }
    @media (max-width: 760px) {
      body { padding-top: 54px; padding-bottom: 90px; }
      .os-topbar { height: 50px; padding-inline: 10px; gap: 8px; }
      .topbar-left, .topbar-right { gap: 6px; }
      .cf-quota-meter { display: none; }
      .topbar-btn { padding: 7px 9px; font-size: .75rem; }
      .os-desktop { margin-top: 12px; padding-inline: 9px; }
      .window-header { flex-wrap: wrap; gap: 9px; }
      .window-title { flex: 1 1 60%; font-size: .82rem; }
      .window-body { padding: 13px; }
      .metrics-row { grid-template-columns: repeat(2, minmax(0,1fr)); gap: 9px; }
      .metric-card { padding: 13px 12px; }
      .metric-val { font-size: 1.25rem; }
      .os-dock { max-width: calc(100vw - 16px); overflow-x: auto; justify-content: flex-start; }
      .dock-item { min-width: 58px; padding-inline: 7px; font-size: .68rem; }
    }
    @media (max-width: 390px) { .metrics-row { grid-template-columns: 1fr; } .brand-badge { font-size: .78rem; } }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; }
    }

  </style>
</head>
<body>
  <!-- نوار سیستم بالایی (OS Menu Bar) -->
  <header class="os-topbar">
    <div class="topbar-left">
      <div class="brand-badge"> ${BRAND_NAME} ${VERSION}</div>
      <div class="cf-quota-meter">
        <span>وضعیت سرویس</span>
        <div class="cf-progress-bar"><div class="cf-progress-fill"></div></div>
      </div>
      <span id="osClock" style="color: var(--text-muted);"></span>
    </div>
    <div class="topbar-right">
      <button class="topbar-btn topbar-btn-glowing" onclick="openMultiLocModal()">
         ساخت سابلینک چندلوکیشن کشوری
      </button>
      <a href="https://t.me/miliconfig" target="_blank" class="topbar-btn">
         پشتیبانی @miliconfig
      </a>
      <button class="topbar-btn" onclick="openChangePwdModal()">
         تغییر پسورد
      </button>
      <button class="topbar-btn" onclick="toggleTheme()" id="themeToggleBtn" aria-label="تغییر حالت روشن، تاریک یا خودکار">
        حالت خودکار
      </button>
      <button class="topbar-btn" onclick="handleLogout()" style="color: var(--danger); border-color: rgba(255,85,85,0.3);">
         خروج
      </button>
    </div>
  </header>

  <!-- فضای دسکتاپ -->
  <main class="os-desktop">
    <!-- بخش داشبورد وضعیت -->
    <div class="os-window" id="windowDashboard">
      <div class="window-header">
        <div class="window-controls">
          <span class="window-dot window-dot-red"></span>
          <span class="window-dot window-dot-yellow"></span>
          <span class="window-dot window-dot-green"></span>
        </div>
        <div class="window-title"> داشبورد وضعیت و مصرف واقعی داده</div>
        <div style="font-size: 0.78rem; color: var(--text-muted);" id="d1StatusLabel">اتصال D1: فعال</div>
      </div>
      <div class="window-body">
        <div class="metrics-row">
          <div class="metric-card">
            <div class="metric-title">کاربران فعال (سقف ۵ کاربر) <span></span></div>
            <div class="metric-val" id="metricUserCount">۰ / ۵</div>
            <div class="metric-sub" id="metricUserSub">ظرفیت آزاد است</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">کل حجم مصرف‌شده <span></span></div>
            <div class="metric-val" id="metricTotalBytes">۰.۰۰ GB</div>
            <div class="metric-sub">مصرف زنده از سرورهای CF</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">استخر IPهای سالم <span></span></div>
            <div class="metric-val" id="metricIpsCount">۲۴ نود</div>
            <div class="metric-sub">CFnew + VIP کشوری</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">پروتکل‌های فعال <span></span></div>
            <div class="metric-val" id="metricProtos">VLESS + SS</div>
            <div class="metric-sub">ضد DPI و فرگمنت آماده</div>
          </div>
        </div>

        <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--glass-border-subtle); border-radius: 16px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div style="font-weight: 700; font-size: 0.92rem; color: var(--neon);">نمودار جریان ترافیک ۲۴ ساعت گذشته</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">بروزرسانی زنده بر اساس درخواست کلاینت‌ها</div>
          </div>
          <svg viewBox="0 0 600 120" style="width: 100%; height: 120px; overflow: visible;">
            <defs>
              <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#b5ff4d" stop-opacity="0.4"/>
                <stop offset="100%" stop-color="#b5ff4d" stop-opacity="0.0"/>
              </linearGradient>
            </defs>
            <path d="M 0,90 Q 75,30 150,60 T 300,40 T 450,70 T 600,30 L 600,120 L 0,120 Z" fill="url(#chartGrad)"/>
            <path d="M 0,90 Q 75,30 150,60 T 300,40 T 450,70 T 600,30" fill="none" stroke="#b5ff4d" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- بخش مدیریت کاربران (حداکثر ۵ کاربر) -->
    <div class="os-window" id="windowUsers">
      <div class="window-header">
        <div class="window-controls">
          <span class="window-dot window-dot-red"></span>
          <span class="window-dot window-dot-yellow"></span>
          <span class="window-dot window-dot-green"></span>
        </div>
        <div class="window-title"> مدیریت کاربران (سقف امنیتی حداکثر ۵ کاربر)</div>
        <button class="topbar-btn topbar-btn-glowing" id="btnAddNewUser" onclick="openCreateUserModal()">
           ایجاد کاربر جدید
        </button>
      </div>
      <div class="window-body">
        <div class="user-limit-banner">
          <div>
            <b>سیاست اختصاصی miliconfig:</b> ظرفیت محصول حداکثر پنج کاربر عادی است و این محدودیت در بک‌اند و لایهٔ دیتابیس نیز اعمال می‌شود.
          </div>
          <div class="limit-badge" id="limitBadge">
            ظرفیت: ۰ / ۵
          </div>
        </div>

        <div class="user-cards-grid" id="usersGrid">
          <!-- با جاوااسکریپت پر می‌شود -->
        </div>
      </div>
    </div>

    <!-- بخش تنظیمات گام‌به‌گام آکاردئونی (Settings Stepper) -->
    <div class="os-window" id="windowSettings">
      <div class="window-header">
        <div class="window-controls">
          <span class="window-dot window-dot-red"></span>
          <span class="window-dot window-dot-yellow"></span>
          <span class="window-dot window-dot-green"></span>
        </div>
        <div class="window-title"> مرکز پیکربندی گام‌به‌گام سرور و هسته</div>
        <button class="topbar-btn topbar-btn-glowing" onclick="saveSettings()">
           ذخیره تمام تنظیمات در D1
        </button>
      </div>
      <div class="window-body">
        <div id="configConflictPanel" class="config-conflict-panel" hidden aria-live="polite"></div>
        <!-- تب‌های گام‌ها -->
        <div class="stepper-nav">
          <div class="step-tab active" onclick="switchStep(1)">
            <span class="step-num">۱</span>
            <span>پروتکل‌ها و شادوساکس</span>
          </div>
          <div class="step-tab" onclick="switchStep(2)">
            <span class="step-num">۲</span>
            <span>ضد فیلترینگ، ECH و فرگمنت</span>
          </div>
          <div class="step-tab" onclick="switchStep(3)">
            <span class="step-num">۳</span>
            <span>استخر آی‌پی و چرخش خودکار</span>
          </div>
          <div class="step-tab" onclick="switchStep(4)">
            <span class="step-num">۴</span>
            <span>دامنه، مسیریابی و DoH</span>
          </div>
        </div>

        <!-- گام ۱: پروتکل‌ها و هسته -->
        <div class="step-panel active" id="stepPanel1">
          <div class="settings-grid">
            <div class="setting-card">
              <div class="setting-label">
                <span>پروتکل VLESS</span>
                <label class="toggle-switch">
                  <input type="checkbox" id="cfg_ev">
                  <span class="slider"></span>
                </label>
              </div>
              <div class="setting-desc">پروتکل پایه فوق‌سریع با رمزنگاری TLS و WebSocket.</div>
            </div>

            <div class="setting-card">
              <div class="setting-label">
                <span>هسته شادوساکس (Shadowsocks)</span>
                <label class="toggle-switch">
                  <input type="checkbox" id="cfg_es">
                  <span class="slider"></span>
                </label>
              </div>
              <div class="setting-desc">فعال‌سازی هسته Shadowsocks (SS-WS) با رمزنگاری AEAD مدرن.</div>
              <div style="margin-top: 10px;">
                <label style="font-size: 0.76rem; color: var(--text-muted);">متد رمزنگاری شادوساکس:</label>
                <select id="cfg_ssmethod" class="form-control" style="margin-top: 4px;">
                  <option value="chacha20-ietf-poly1305">chacha20-ietf-poly1305 (پیشنهادی)</option>
                  <option value="aes-128-gcm">aes-128-gcm</option>
                  <option value="aes-256-gcm">aes-256-gcm</option>
                </select>
              </div>
            </div>

            <div class="setting-card">
              <div class="setting-label">
                <span>پروتکل Trojan</span>
                <label class="toggle-switch">
                  <input type="checkbox" id="cfg_et">
                  <span class="slider"></span>
                </label>
              </div>
              <div class="setting-desc">پروتکل تروجان شبیه‌ساز رفتار ترافیک HTTPS معتبر.</div>
              <input type="text" id="cfg_tp" class="form-control" placeholder="رمز عبور تروجان (اختیاری)" style="margin-top: 8px;">
            </div>

            <div class="setting-card">
              <div class="setting-label">
                <span>پروتکل xhttp (استریمینگ نسل جدید)</span>
                <label class="toggle-switch">
                  <input type="checkbox" id="cfg_ex">
                  <span class="slider"></span>
                </label>
              </div>
              <div class="setting-desc">مبتنی بر HTTP POST Streaming با پدینگ نامتقارن برای دور زدن فیلترینگ شدید.</div>
            </div>
          </div>
        </div>

        <!-- گام ۲: تکنولوژی ضد فیلترینگ -->
        <div class="step-panel" id="stepPanel2">
          <div class="settings-grid">
            <div class="setting-card">
              <div class="setting-label">
                <span>تکنولوژی ECH (Encrypted Client Hello)</span>
                <label class="toggle-switch">
                  <input type="checkbox" id="cfg_ech">
                  <span class="slider"></span>
                </label>
              </div>
              <div class="setting-desc">پیکربندی ECH فقط در صورت پشتیبانی کلاینت، DNS و مسیر TLS مؤثر است؛ تولید لینک به‌تنهایی فعال‌بودن ECH را ثابت نمی‌کند.</div>
              <div style="margin-top: 8px;">
                <label style="font-size: 0.76rem; color: var(--text-muted);">دامنه مرجع ECH:</label>
                <select id="cfg_customECHDomain" class="form-control" style="margin-top: 4px;">
                  <option value="cloudflare-ech.com">cloudflare-ech.com</option>
                  <option value="crypto.cloudflare.com">crypto.cloudflare.com</option>
                  <option value="cloudflare-dns.com">cloudflare-dns.com</option>
                  <option value="deflect.ca">deflect.ca</option>
                </select>
              </div>
            </div>

            <div class="setting-card">
              <div class="setting-label">
                <span>فرگمنت‌های آماده اپراتورها</span>
                <label class="toggle-switch">
                  <input type="checkbox" id="cfg_fragment">
                  <span class="slider"></span>
                </label>
              </div>
              <div class="setting-desc">پروفایل تنظیمات Fragment برای خروجی‌ها و کلاینت‌های سازگار. این گزینه به‌تنهایی Fragment را در Worker اجرا نمی‌کند و هنگام ذخیره، محدودیت سازگاری یادآوری می‌شود.</div>
              <div style="margin-top: 8px;">
                <label style="font-size: 0.76rem; color: var(--text-muted);">پروفایل اپراتور:</label>
                <select id="cfg_fragmentPreset" class="form-control" style="margin-top: 4px;">
                  <option value="mci">همراه اول (MCI) — 100-200, 10-20ms</option>
                  <option value="irancell">ایرانسل (Irancell) — 50-100, 5-10ms</option>
                  <option value="rightel">رایتل و مخابرات (Rightel/TCI) — 1-3, 1-5ms</option>
                  <option value="anti-dpi">ضد فیلترینگ شدید (Anti-DPI) — 10-30, 20-40ms</option>
                </select>
              </div>
            </div>

            <div class="setting-card">
              <div class="setting-label">
                <span>فینگرپرینت uTLS (Fingerprint)</span>
              </div>
              <div class="setting-desc">شبیه‌سازی اثر انگشت رمزنگاری کلاینت‌های استاندارد مرورگرها.</div>
              <select id="cfg_fp" class="form-control">
                <option value="chrome">Chrome (پیشنهادی)</option>
                <option value="firefox">Firefox</option>
                <option value="safari">Safari (iOS / macOS)</option>
                <option value="edge">Microsoft Edge</option>
                <option value="ios">iOS Device</option>
                <option value="randomized">Randomized (تصادفی)</option>
              </select>
            </div>

            <div class="setting-card">
              <div class="setting-label">
                <span>الگوهای مسیر و پدینگ (Patt)</span>
              </div>
              <div class="setting-desc">تنظیم ساختار Path جهت هماهنگی با پروکسی‌های شبکه و بسته‌بندی داده‌ها.</div>
              <select id="cfg_patt" class="form-control">
                <option value="/?ed=2048">استاندارد (/?ed=2048)</option>
                <option value="/mili-live">مسیر زنده (/mili-live)</option>
                <option value="/ws-secure">وب‌سوکت امن (/ws-secure)</option>
                <option value="/stream-pad">استریم با پدینگ خودکار (/stream-pad)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- گام ۳: استخر آی‌پی و چرخش خودکار -->
        <div class="step-panel" id="stepPanel3">
          <div class="settings-grid">
            <div class="setting-card">
              <div class="setting-label">
                <span>چرخش خودکار آی‌پی (Auto IP Rotation)</span>
              </div>
              <div class="setting-desc">چرخش دوره‌ای و هوشمند آی‌پی‌ها در سابلینک برای جلوگیری از مسدودسازی مداوم.</div>
              <select id="cfg_ipRotation" class="form-control">
                <option value="off">غیرفعال (ثابت)</option>
                <option value="5m">هر ۵ دقیقه</option>
                <option value="15m">هر ۱۵ دقیقه (پیشنهادی)</option>
                <option value="30m">هر ۳۰ دقیقه</option>
                <option value="1h">هر ۱ ساعت</option>
                <option value="24h">هر ۲۴ ساعت</option>
              </select>
            </div>

            <div class="setting-card">
              <div class="setting-label">
                <span>استخر آی‌پی رسمی و ترجیحی CFnew</span>
                <label class="toggle-switch">
                  <input type="checkbox" id="cfg_epi">
                  <span class="slider"></span>
                </label>
              </div>
              <div class="setting-desc">فهرست Endpointهای کاندیدا؛ سلامت و سازگاری اتصال باید جداگانه آزمایش شود.</div>
            </div>

            <div class="setting-card">
              <div class="setting-label">
                <span>زنجیره اینترنت خانگی (Residential - jk)</span>
                <label class="toggle-switch">
                  <input type="checkbox" id="cfg_jk">
                  <span class="slider"></span>
                </label>
              </div>
              <div class="setting-desc">زنجیره کردن اتصال کلودفلر به آی‌پی‌های مسکونی واقعی خانگی و شرکتی.</div>
            </div>

            <div class="setting-card">
              <div class="setting-label">
                <span>نودهای تمیز سفارشی دستی (yx)</span>
              </div>
              <div class="setting-desc">وارد کردن IP یا دامنه‌های تمیز دستی با کاما (مانند 1.1.1.1:443#Mili).</div>
              <input type="text" id="cfg_yx" class="form-control" placeholder="104.16.1.1#CleanIP, 172.67.1.1#CF">
            </div>
          </div>
        </div>

        <!-- گام ۴: دامنه و مسیریابی -->
        <div class="step-panel" id="stepPanel4">
          <div class="settings-grid">
            <div class="setting-card">
              <div class="setting-label">
                <span>مسیر اختصاصی ورود مدیر (d)</span>
              </div>
              <div class="setting-desc">مسیر پنهان پنل مدیریت برای افزایش امنیت در صورت نیاز.</div>
              <input type="text" id="cfg_d" class="form-control" placeholder="مسیر سفارشی مانند my-secret-panel">
            </div>

            <div class="setting-card">
              <div class="setting-label">
                <span>لینک صفحه آغازین (Intro)</span>
              </div>
              <div class="setting-desc">پس از سه ثانیه پنجره ورود باز می‌شود؛ آدرس واردشده فقط به‌صورت لینک امن HTTPS نمایش داده می‌شود و Worker سایت خارجی را Reverse Proxy نمی‌کند.</div>
              <input type="text" id="cfg_homepage" class="form-control" placeholder="https://www.wikipedia.org">
            </div>

            <div class="setting-card">
              <div class="setting-label">
                <span>سرور DNS رمزنگاری‌شده (DoH)</span>
              </div>
              <div class="setting-desc">از گزینه‌های شناخته‌شده انتخاب کنید یا یک HTTPS DoH endpoint معتبر وارد کنید. امکان دسترسی از شبکه کاربر جداگانه باید بررسی شود.</div>
              <select id="cfg_dnsPreset" class="form-control" onchange="selectDnsPreset()" style="margin-bottom:8px;">
                <option value="custom">سفارشی / واردکردن دستی</option>
                <option value="cloudflare">Cloudflare — استاندارد</option>
                <option value="cloudflare-security">Cloudflare — مسدودسازی بدافزار</option>
                <option value="cloudflare-family">Cloudflare — حفاظت خانواده</option>
                <option value="google">Google Public DNS</option>
                <option value="quad9">Quad9 — مسدودسازی تهدیدها</option>
                <option value="quad9-unfiltered">Quad9 — بدون مسدودسازی تهدیدها</option>
                <option value="adguard">AdGuard — مسدودسازی تبلیغات</option>
                <option value="adguard-family">AdGuard — حفاظت خانواده</option>
                <option value="adguard-unfiltered">AdGuard — بدون فیلتر محتوا</option>
              </select>
              <input type="url" id="cfg_customDNS" class="form-control" list="dnsEndpointOptions" placeholder="https://cloudflare-dns.com/dns-query" inputmode="url">
              <datalist id="dnsEndpointOptions">
                <option value="https://cloudflare-dns.com/dns-query"></option>
                <option value="https://security.cloudflare-dns.com/dns-query"></option>
                <option value="https://family.cloudflare-dns.com/dns-query"></option>
                <option value="https://dns.google/dns-query"></option>
                <option value="https://dns.quad9.net/dns-query"></option>
                <option value="https://dns10.quad9.net/dns-query"></option>
                <option value="https://dns.adguard-dns.com/dns-query"></option>
                <option value="https://family.adguard-dns.com/dns-query"></option>
                <option value="https://unfiltered.adguard-dns.com/dns-query"></option>
              </datalist>
            </div>

            <div class="setting-card">
              <div class="setting-label">
                <span>Endpoint خروجی / ProxyIP</span>
              </div>
              <div class="setting-desc">Endpoint باید توسط سرویس واقعی پشتیبانی شود؛ تغییر IP به‌تنهایی موقعیت یا اتصال فعال را تضمین نمی‌کند.</div>
              <input type="text" id="cfg_p" class="form-control" placeholder="ip:port یا domain:port">
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- بخش اسکنر زنده کشوری پروکسی‌ها -->
    <div class="os-window" id="windowScanner">
      <div class="window-header">
        <div class="window-controls">
          <span class="window-dot window-dot-red"></span>
          <span class="window-dot window-dot-yellow"></span>
          <span class="window-dot window-dot-green"></span>
        </div>
        <div class="window-title"> اسکنر نامزدهای Endpoint و آزمون اتصال TCP</div>
        <button class="topbar-btn topbar-btn-glowing" onclick="openMultiLocModal()">
           ساخت سابلینک چندلوکیشن کشوری
        </button>
      </div>
      <div class="window-body">
        <div class="scanner-controls">
          <select id="scannerCountry" class="form-control" style="max-width: 200px;">
            <option value="DE"> آلمان (Germany)</option>
            <option value="NL"> هلند (Netherlands)</option>
            <option value="US"> آمریکا (United States)</option>
            <option value="GB"> بریتانیا (United Kingdom)</option>
            <option value="TR"> ترکیه (Turkey)</option>
            <option value="AE"> امارات (UAE)</option>
            <option value="CA"> کانادا (Canada)</option>
            <option value="IT"> ایتالیا (Italy)</option>
            <option value="SE"> سوئد (Sweden)</option>
            <option value="NO"> نروژ (Norway)</option>
            <option value="KZ"> قزاقستان (Kazakhstan)</option>
            <option value="UZ"> ازبکستان (Uzbekistan)</option>
          </select>
          <select id="scannerLimit" class="form-control" style="max-width: 120px;">
            <option value="8">۸ پروکسی</option>
            <option value="12" selected>۱۲ پروکسی</option>
            <option value="16">۱۶ پروکسی</option>
          </select>
          <button class="topbar-btn topbar-btn-glowing" onclick="runLiveProxyScan()" id="btnRunScan">
             دریافت پروکسی تصادفی و تست زنده
          </button>
        </div>

        <div class="scanner-table-wrapper">
          <table class="scanner-table">
            <thead>
              <tr>
                <th>کشور</th>
                <th>آدرس سرور و پورت</th>
                <th>پروتکل</th>
                <th>پینگ (میلی‌ثانیه)</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody id="scannerTableBody">
              <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
                  برای دریافت پروکسی‌های VIP و تست زنده، کشور مورد نظر را انتخاب و دکمه را بزنید.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>

  <!-- داک شناور سیستم‌عامل (macOS / Zeus Dock) -->
  <div class="os-dock-container">
    <div class="os-dock">
      <div class="dock-item active" onclick="scrollToWindow('windowDashboard', this)">
        <span class="dock-icon"></span>
        <span>داشبورد</span>
      </div>
      <div class="dock-item" onclick="scrollToWindow('windowUsers', this)">
        <span class="dock-icon"></span>
        <span>کاربران</span>
      </div>
      <div class="dock-item" onclick="scrollToWindow('windowSettings', this)">
        <span class="dock-icon"></span>
        <span>تنظیمات</span>
      </div>
      <div class="dock-item" onclick="scrollToWindow('windowScanner', this)">
        <span class="dock-icon"></span>
        <span>اسکنر کشوری</span>
      </div>
      <div class="dock-item" onclick="openMultiLocModal()">
        <span class="dock-icon"></span>
        <span>چندلوکیشن</span>
      </div>
    </div>
  </div>

  <!-- مودال ساخت سابلینک چندلوکیشن کشوری -->
  <div class="os-modal-backdrop" id="multiLocModal">
    <div class="os-modal">
      <div class="window-header">
        <div class="window-title"> سابلینک‌های چندلوکیشن کشوری (Multi-Location Sublinks)</div>
        <button class="topbar-btn" onclick="closeModal('multiLocModal')"> بستن</button>
      </div>
      <div class="window-body">
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
          تمام این سابلینک‌ها به طور خودکار شامل ۳ نود هاردکدشده اطلاع‌رسانی هستند و بر اساس لیست‌های پروکسی VIP هر کشور تلفیق شده‌اند.
        </p>

        <div style="background: var(--neon-soft); border: 1px solid var(--neon); border-radius: 12px; padding: 14px; margin-bottom: 18px;">
          <div style="font-weight: 700; color: var(--neon); margin-bottom: 6px;"> سابلینک ترکیبی تمام کشورها (Multi-Country VIP):</div>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="multiAllUrl" readonly class="form-control" style="font-size: 0.8rem;">
            <button class="topbar-btn topbar-btn-glowing" onclick="copyInput('multiAllUrl')">کپی</button>
          </div>
        </div>

        <div style="font-size: 0.86rem; font-weight: 700; margin-bottom: 10px;">سابلینک‌های تفکیک‌شده بر اساس کشور:</div>
        <div id="countrySublist" style="display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto;">
          <!-- با جاوااسکریپت پر می‌شود -->
        </div>
      </div>
    </div>
  </div>

  <!-- مودال تغییر رمز عبور مدیر -->
  <div class="os-modal-backdrop" id="changePwdModal">
    <div class="os-modal" style="max-width: 440px;">
      <div class="window-header">
        <div class="window-title"> تغییر رمز عبور پنل مدیریت</div>
        <button class="topbar-btn" onclick="closeModal('changePwdModal')"></button>
      </div>
      <div class="window-body">
        <form onsubmit="handleChangePassword(event)">
          <div style="margin-bottom: 14px;">
            <label style="font-size: 0.82rem; color: var(--text-muted); display: block; margin-bottom: 6px;">رمز عبور فعلی:</label>
            <input type="password" id="curPwdInput" class="form-control" required>
          </div>
          <div style="margin-bottom: 14px;">
            <label style="font-size: 0.82rem; color: var(--text-muted); display: block; margin-bottom: 6px;">رمز عبور جدید (حداقل ۸ نویسه):</label>
            <input type="password" id="newPwdInput" class="form-control" required>
          </div>
          <button type="submit" class="submit-btn" style="margin-top: 10px; width: 100%; padding: 12px; background: var(--neon); border: none; border-radius: 10px; font-weight: 700; cursor: pointer;">
            ذخیره رمز عبور جدید
          </button>
        </form>
      </div>
    </div>
  </div>

  <!-- مودال افزودن کاربر جدید -->
  <div class="os-modal-backdrop" id="createUserModal">
    <div class="os-modal" style="max-width: 480px;">
      <div class="window-header">
        <div class="window-title"> ایجاد کاربر جدید (حداکثر تا ۵ کاربر)</div>
        <button class="topbar-btn" onclick="closeModal('createUserModal')"></button>
      </div>
      <div class="window-body">
        <form onsubmit="handleCreateUser(event)">
          <div style="margin-bottom: 14px;">
            <label style="font-size: 0.82rem; color: var(--text-muted); display: block; margin-bottom: 6px;">نام کاربر:</label>
            <input type="text" id="newUserName" class="form-control" placeholder="User1" required>
          </div>
          <div style="margin-bottom: 14px;">
            <label style="font-size: 0.82rem; color: var(--text-muted); display: block; margin-bottom: 6px;">محدودیت حجم (GB - عدد ۰ برای نامحدود):</label>
            <input type="number" id="newUserLimitGb" class="form-control" value="0" min="0">
          </div>
          <div style="margin-bottom: 14px;">
            <label style="font-size: 0.82rem; color: var(--text-muted); display: block; margin-bottom: 6px;">تعداد روزهای اعتبار (عدد ۰ برای نامحدود):</label>
            <input type="number" id="newUserExpireDays" class="form-control" value="0" min="0">
          </div>
          <div style="margin-bottom: 14px;">
            <label style="font-size: 0.82rem; color: var(--text-muted); display: block; margin-bottom: 6px;">سقف نودها در سابلینک (subNodeCount):</label>
            <input type="number" id="newUserSubCount" class="form-control" value="50" min="5" max="150">
          </div>
          <button type="submit" class="submit-btn" id="btnSubmitUser" style="width: 100%; padding: 12px; background: var(--neon); border: none; border-radius: 10px; font-weight: 700; cursor: pointer;">
            ساخت و فعال‌سازی کاربر
          </button>
        </form>
      </div>
    </div>
  </div>

  <div class="toast-msg" id="osToast"></div>

  <script>
    var INITIAL_DATA = JSON.parse(${safeInitialJson});
    var appConfig = INITIAL_DATA.config || {};
    var appUsers = INITIAL_DATA.users || [];
    var MAX_LIMIT = INITIAL_DATA.maxUsersLimit || 5;

    function showToast(msg) {
      var t = document.getElementById('osToast');
      t.textContent = msg;
      t.style.display = 'block';
      setTimeout(function() { t.style.display = 'none'; }, 2600);
    }

    function updateClock() {
      var d = new Date();
      document.getElementById('osClock').textContent = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    }
    setInterval(updateClock, 1000);
    updateClock();

    function applyTheme(mode) {
      var effective = mode;
      if (mode === 'system') effective = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.body.classList.toggle('light-theme', effective === 'light');
      document.documentElement.dataset.theme = mode;
      var btn = document.getElementById('themeToggleBtn');
      if (btn) { btn.textContent = mode === 'light' ? 'روشن' : mode === 'dark' ? 'تاریک' : 'خودکار'; btn.setAttribute('title', 'تغییر پوسته؛ وضعیت فعلی: ' + (mode === 'light' ? 'روشن' : mode === 'dark' ? 'تاریک' : 'هماهنگ با سیستم')); }
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

    function switchStep(num) {
      document.querySelectorAll('.step-tab').forEach(function(tab, idx) {
        tab.classList.toggle('active', idx + 1 === num);
      });
      document.querySelectorAll('.step-panel').forEach(function(panel, idx) {
        panel.classList.toggle('active', idx + 1 === num);
      });
    }

    function scrollToWindow(id, el) {
      document.querySelectorAll('.dock-item').forEach(function(d) { d.classList.remove('active'); });
      el.classList.add('active');
      var target = document.getElementById(id);
      if (target) {
        window.scrollTo({ top: target.offsetTop - 60, behavior: 'smooth' });
      }
    }

    function renderDashboardMetrics() {
      document.getElementById('metricUserCount').textContent = appUsers.length + ' / ' + MAX_LIMIT;
      var badge = document.getElementById('limitBadge');
      badge.textContent = 'ظرفیت کاربران: ' + appUsers.length + ' از ' + MAX_LIMIT;

      var addBtn = document.getElementById('btnAddNewUser');
      if (appUsers.length >= MAX_LIMIT) {
        addBtn.disabled = true;
        addBtn.style.opacity = '0.5';
        addBtn.title = 'حداکثر سقف ۵ کاربر تکمیل است';
        addBtn.textContent = ' سقف ۵ کاربر تکمیل است';
      } else {
        addBtn.disabled = false;
        addBtn.style.opacity = '1';
        addBtn.textContent = ' ایجاد کاربر جدید';
      }

      var totalBytes = 0;
      appUsers.forEach(function(u) { totalBytes += Number(u.usedBytes || 0); });
      var gb = (totalBytes / 1073741824).toFixed(2);
      document.getElementById('metricTotalBytes').textContent = gb + ' GB';
    }

    function escapeHtml(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
      });
    }

    function renderUsers() {
      var grid = document.getElementById('usersGrid');
      grid.innerHTML = '';
      appUsers.forEach(function(u, idx) {
        var usedGb = (Number(u.usedBytes || 0) / 1073741824).toFixed(2);
        var limitGb = u.dataLimitGb > 0 ? (u.dataLimitGb + ' GB') : 'نامحدود';
        var pct = u.dataLimitGb > 0 ? Math.min(100, Math.round((u.usedBytes / (u.dataLimitGb * 1073741824)) * 100)) : 2;
        var subBase = window.location.origin + '/sub/' + (u.subscriptionToken || '');

        var card = document.createElement('div');
        card.className = 'user-card';
        card.innerHTML = [
          '<div class="user-card-head">',
            '<div>',
              '<div class="user-name">' + escapeHtml(u.username || ('کاربر ' + (idx + 1))) + '</div>',
              '<div style="font-size: 0.76rem; color: var(--text-muted); direction: ltr; margin-top: 2px;">UUID: ' + (u.uuid ? u.uuid.substring(0, 13) + '...' : '---') + '</div>',
            '</div>',
            '<div class="user-status-pill ' + (u.enabled ? 'status-active' : 'status-disabled') + '">',
              (u.enabled ? ' فعال' : ' غیرفعال'),
            '</div>',
          '</div>',

          '<div style="font-size: 0.8rem; display: flex; justify-content: space-between; color: var(--text-muted);">',
            '<span>مصرف: ' + usedGb + ' GB</span>',
            '<span>سقف: ' + limitGb + '</span>',
          '</div>',
          '<div class="usage-progress-bar">',
            '<div class="usage-fill" style="width: ' + pct + '%;"></div>',
          '</div>',

          '<div class="proto-tags">',
            '<span class="proto-tag ' + (appConfig.ev === 'yes' ? 'active' : '') + '">VLESS</span>',
            '<span class="proto-tag ' + (appConfig.es === 'yes' ? 'active' : '') + '">Shadowsocks</span>',
            '<span class="proto-tag ' + (appConfig.et === 'yes' ? 'active' : '') + '">Trojan</span>',
            '<span class="proto-tag ' + (appConfig.ex === 'yes' ? 'active' : '') + '">xhttp</span>',
            '<span class="proto-tag ' + (appConfig.ech === 'yes' ? 'active' : '') + '">ECH</span>',
          '</div>',

          '<div style="font-size: 0.78rem; color: var(--neon); margin-bottom: 8px;">',
            ' نام‌گذاری نودها در کلاینت: <b>1+' + INITIAL_DATA.brand + '</b>, <b>2+' + INITIAL_DATA.brand + '</b>...',
          '</div>',

          '<div class="card-actions">',
            '<button class="btn-action" onclick="copyText(\'' + subBase + '\')"> کپی ساب‌لینک</button>',
            '<button class="btn-action" onclick="copyText(\'' + subBase + '?target=clash\')"> Clash</button>',
            '<button class="btn-action" onclick="copyText(\'' + subBase + '?target=singbox\')"> Singbox</button>',
            '<button class="btn-action" onclick="resetUserStats(\'' + u.id + '\')" title="صفر کردن مصرف"> ریست</button>',
            '<button class="btn-action" onclick="deleteUser(\'' + u.id + '\')" style="color: var(--danger);" title="حذف کاربر"></button>',
          '</div>'
        ].join('');
        grid.appendChild(card);
      });
      renderDashboardMetrics();
    }

    var DNS_PRESETS = {
      cloudflare: 'https://cloudflare-dns.com/dns-query',
      'cloudflare-security': 'https://security.cloudflare-dns.com/dns-query',
      'cloudflare-family': 'https://family.cloudflare-dns.com/dns-query',
      google: 'https://dns.google/dns-query',
      quad9: 'https://dns.quad9.net/dns-query',
      'quad9-unfiltered': 'https://dns10.quad9.net/dns-query',
      adguard: 'https://dns.adguard-dns.com/dns-query',
      'adguard-family': 'https://family.adguard-dns.com/dns-query',
      'adguard-unfiltered': 'https://unfiltered.adguard-dns.com/dns-query'
    };
    function selectDnsPreset() {
      var preset = document.getElementById('cfg_dnsPreset').value;
      if (DNS_PRESETS[preset]) document.getElementById('cfg_customDNS').value = DNS_PRESETS[preset];
    }
    function syncDnsPreset(url) {
      var select = document.getElementById('cfg_dnsPreset');
      var found = Object.keys(DNS_PRESETS).find(function(key) { return DNS_PRESETS[key] === url; });
      select.value = found || 'custom';
    }

    function populateSettingsForm() {
      document.getElementById('cfg_ev').checked = appConfig.ev === 'yes';
      document.getElementById('cfg_es').checked = appConfig.es === 'yes';
      document.getElementById('cfg_et').checked = appConfig.et === 'yes';
      document.getElementById('cfg_ex').checked = appConfig.ex === 'yes';
      document.getElementById('cfg_ech').checked = appConfig.ech === 'yes';
      document.getElementById('cfg_fragment').checked = appConfig.fragment === 'yes';
      document.getElementById('cfg_epi').checked = appConfig.epi === 'yes';
      document.getElementById('cfg_jk').checked = appConfig.jk === 'yes';

      document.getElementById('cfg_ssmethod').value = appConfig.ssmethod || 'chacha20-ietf-poly1305';
      document.getElementById('cfg_tp').value = appConfig.tp || '';
      document.getElementById('cfg_customECHDomain').value = appConfig.customECHDomain || 'cloudflare-ech.com';
      document.getElementById('cfg_fragmentPreset').value = appConfig.fragmentPreset || 'mci';
      document.getElementById('cfg_fp').value = appConfig.fp || 'chrome';
      document.getElementById('cfg_patt').value = appConfig.patt || '/?ed=2048';
      document.getElementById('cfg_ipRotation').value = appConfig.ipRotation || 'off';
      document.getElementById('cfg_yx').value = appConfig.yx || '';
      document.getElementById('cfg_d').value = appConfig.d || '';
      document.getElementById('cfg_homepage').value = appConfig.homepage || '';
      document.getElementById('cfg_customDNS').value = appConfig.customDNS || 'https://cloudflare-dns.com/dns-query';
      syncDnsPreset(document.getElementById('cfg_customDNS').value);
      document.getElementById('cfg_p').value = appConfig.p || '';
    }

    function renderConfigConflicts(issues) {
      var panel = document.getElementById('configConflictPanel');
      if (!panel) return;
      panel.replaceChildren();
      if (!Array.isArray(issues) || !issues.length) { panel.hidden = true; return; }
      panel.hidden = false;
      var heading = document.createElement('div');
      heading.className = 'config-conflict-title';
      heading.textContent = 'بررسی سازگاری تنظیمات';
      panel.appendChild(heading);
      issues.forEach(function(issue) {
        var row = document.createElement('div');
        row.className = 'config-conflict-item';
        row.dataset.severity = String(issue.severity || 'INFO');
        var title = document.createElement('div');
        title.className = 'config-conflict-title';
        title.textContent = (issue.severity ? '[' + issue.severity + '] ' : '') + (issue.title || issue.code || 'هشدار تنظیمات');
        var message = document.createElement('div');
        message.className = 'config-conflict-message';
        message.textContent = [issue.message, issue.recommendation].filter(Boolean).join(' پیشنهاد: ');
        row.append(title, message);
        panel.appendChild(row);
      });
    }

    async function saveSettings() {
      var payload = {
        ev: document.getElementById('cfg_ev').checked ? 'yes' : 'no',
        es: document.getElementById('cfg_es').checked ? 'yes' : 'no',
        et: document.getElementById('cfg_et').checked ? 'yes' : 'no',
        ex: document.getElementById('cfg_ex').checked ? 'yes' : 'no',
        ech: document.getElementById('cfg_ech').checked ? 'yes' : 'no',
        fragment: document.getElementById('cfg_fragment').checked ? 'yes' : 'no',
        epi: document.getElementById('cfg_epi').checked ? 'yes' : 'no',
        jk: document.getElementById('cfg_jk').checked ? 'yes' : 'no',
        ssmethod: document.getElementById('cfg_ssmethod').value,
        tp: document.getElementById('cfg_tp').value.trim(),
        customECHDomain: document.getElementById('cfg_customECHDomain').value,
        fragmentPreset: document.getElementById('cfg_fragmentPreset').value,
        fp: document.getElementById('cfg_fp').value,
        patt: document.getElementById('cfg_patt').value,
        ipRotation: document.getElementById('cfg_ipRotation').value,
        yx: document.getElementById('cfg_yx').value.trim(),
        d: document.getElementById('cfg_d').value.trim(),
        homepage: document.getElementById('cfg_homepage').value.trim(),
        customDNS: document.getElementById('cfg_customDNS').value.trim(),
        p: document.getElementById('cfg_p').value.trim()
      };

      try {
        var res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data.success) {
          appConfig = Object.assign({}, appConfig, data.config || payload);
          renderConfigConflicts(data.warnings || []);
          showToast(data.warnings && data.warnings.length ? ' تنظیمات ذخیره شد؛ هشدارهای سازگاری را بررسی کنید.' : ' تنظیمات با موفقیت ذخیره شد.');
        } else {
          renderConfigConflicts(data.conflicts || []);
          showToast(' خطا در ذخیره تنظیمات: ' + data.message);
        }
      } catch (err) {
        showToast(' خطای ارتباط با سرور');
      }
    }

    async function handleCreateUser(e) {
      e.preventDefault();
      if (appUsers.length >= MAX_LIMIT) {
        showToast(' سقف حداکثر ۵ کاربر تکمیل است.');
        return;
      }
      var username = document.getElementById('newUserName').value.trim();
      var dataLimitGb = parseFloat(document.getElementById('newUserLimitGb').value) || 0;
      var expireDays = parseInt(document.getElementById('newUserExpireDays').value, 10) || 0;
      var subNodeCount = parseInt(document.getElementById('newUserSubCount').value, 10) || 50;

      try {
        var res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username, dataLimitGb: dataLimitGb, expireDays: expireDays, subNodeCount: subNodeCount })
        });
        var data = await res.json();
        if (data.success) {
          appUsers.push(data.user);
          renderUsers();
          closeModal('createUserModal');
          showToast(' کاربر «' + username + '» با موفقیت افزوده شد.');
        } else {
          showToast(' ' + data.message);
        }
      } catch (err) {
        showToast(' خطا در ارتباط با سرور');
      }
    }

    async function rotateSubscriptionToken(userId) {
      if (!confirm('با چرخش توکن، همه لینک‌های اشتراک و صفحه وضعیت قبلی این کاربر باطل می‌شوند. ادامه می‌دهید؟')) return;
      try {
        var res = await fetch('/api/users', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: userId, action: 'rotate-subscription' })
        });
        var data = await res.json();
        if (!res.ok || !data.success) { showToast(' ' + (data.message || 'چرخش توکن ناموفق بود.')); return; }
        var idx = appUsers.findIndex(function(u) { return u.id === userId; });
        if (idx >= 0 && data.user) appUsers[idx] = data.user;
        renderUsers();
        showToast(' توکن جدید ساخته شد؛ لینک قبلی دیگر معتبر نیست.');
      } catch (_e) { showToast(' خطا در چرخش توکن اشتراک'); }
    }

    async function resetUserStats(userId) {
      if (!confirm('آیا مطمئن هستید که ترافیک مصرفی این کاربر ریست شود؟')) return;
      try {
        var res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: userId, action: 'reset' })
        });
        var data = await res.json();
        if (data.success) {
          var u = appUsers.find(function(x) { return x.id === userId; });
          if (u) u.usedBytes = 0;
          renderUsers();
          showToast(' مصرف ترافیک کاربر صفر شد.');
        }
      } catch (_e) {
        showToast(' خطا در ریست مصرف');
      }
    }

    async function deleteUser(userId) {
      if (!confirm('آیا مطمئن هستید که این کاربر حذف شود؟')) return;
      try {
        var res = await fetch('/api/users?id=' + encodeURIComponent(userId), { method: 'DELETE' });
        var data = await res.json();
        if (data.success) {
          appUsers = appUsers.filter(function(x) { return x.id !== userId; });
          renderUsers();
          showToast(' کاربر با موفقیت حذف شد.');
        }
      } catch (_e) {
        showToast(' خطا در حذف کاربر');
      }
    }

    async function runLiveProxyScan() {
      var country = document.getElementById('scannerCountry').value;
      var limit = document.getElementById('scannerLimit').value;
      var btn = document.getElementById('btnRunScan');
      var tbody = document.getElementById('scannerTableBody');

      btn.disabled = true;
      btn.textContent = '⏳ در حال دریافت و تست دسترسی TCP...';
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px;">در حال آزمون دسترسی TCP...</td></tr>';

      try {
        var res = await fetch('/api/scanner/fetch-and-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: country, limit: limit })
        });
        var data = await res.json();
        if (data.success && data.proxies && data.proxies.length > 0) {
          tbody.innerHTML = '';
          data.proxies.forEach(function(p) {
            var tr = document.createElement('tr');
            var statusLabel = p.status === 'tcp-reachable' ? 'TCP قابل اتصال' : p.status === 'not-testable' ? 'آزمون‌ناپذیر' : p.status === 'tcp-timeout' ? 'مهلت اتصال تمام شد' : 'TCP ناموفق';
            var statusColor = p.status === 'tcp-reachable' ? '#27c93f' : p.status === 'not-testable' ? '#d9a441' : '#ef6a70';
            tr.innerHTML = [
              '<td style="direction: rtl; text-align: right;">' + p.flag + ' ' + p.country + '</td>',
              '<td><b>' + p.ip + ':' + p.port + '</b></td>',
              '<td><span class="proto-tag active">' + (p.candidateType || 'Endpoint candidate') + '</span></td>',
              '<td><span class="ping-badge ' + (typeof p.latencyMs === 'number' && p.status === 'tcp-reachable' && p.latencyMs < 120 ? 'ping-fast' : 'ping-med') + '">' + (typeof p.latencyMs === 'number' ? p.latencyMs + ' ms' : 'نامشخص') + '</span></td>',
              '<td><span style="color:' + statusColor + '; font-weight:700;">' + statusLabel + '</span><br><small>فقط اتصال TCP؛ نه تست پروتکل</small></td>',
              '<td><button class="topbar-btn" onclick="copyText(\'' + p.ip + ':' + p.port + '\', \'آدرس کپی شد\')"> کپی آدرس</button></td>'
            ].join('');
            tbody.appendChild(tr);
          });
          showToast('نتیجه آزمون TCP برای ' + data.proxies.length + ' نامزد ثبت شد؛ سلامت پروکسی سرتاسری بررسی نشده است.');
        } else {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 20px;">خطا در دریافت لیست یا پروکسی در دسترس نیست.</td></tr>';
        }
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 20px;">خطای شبکه در اجرای اسکنر.</td></tr>';
      } finally {
        btn.disabled = false;
        btn.textContent = ' دریافت نامزدها و آزمون TCP';
      }
    }

    function addProxyToYx(entry) {
      showToast('این نامزدِ SOCKS/HTTP با نود Worker یکی نیست؛ ابتدا باید سرویس و پروتکل سازگار جداگانه تأیید شود.');
    }


    function openMultiLocModal() {
      var subToken = (appUsers[0] && appUsers[0].subscriptionToken) || '';
      if (!subToken) { showToast('برای ساخت لینک Multi-Location ابتدا یک کاربر ایجاد کنید.'); return; }
      var base = window.location.origin + '/sub/' + subToken;
      document.getElementById('multiAllUrl').value = base + '?country=MULTI';

      var listDiv = document.getElementById('countrySublist');
      listDiv.innerHTML = '';
      var topCountries = [
        { code: 'DE', flag: '', name: 'آلمان' },
        { code: 'NL', flag: '', name: 'هلند' },
        { code: 'US', flag: '', name: 'آمریکا' },
        { code: 'GB', flag: '', name: 'انگلستان' },
        { code: 'TR', flag: '', name: 'ترکیه' },
        { code: 'AE', flag: '', name: 'امارات' },
        { code: 'CA', flag: '', name: 'کانادا' },
        { code: 'SE', flag: '', name: 'سوئد' }
      ];

      topCountries.forEach(function(c) {
        var row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid var(--glass-border-subtle);';
        var url = base + '?country=' + c.code;
        row.innerHTML = [
          '<div style="font-size: 0.84rem; font-weight: 700;">' + c.flag + ' ' + c.name + ' (' + c.code + ')</div>',
          '<button class="topbar-btn" onclick="copyText(\'' + url + '\')">کپی سابلینک</button>'
        ].join('');
        listDiv.appendChild(row);
      });

      document.getElementById('multiLocModal').style.display = 'flex';
    }

    function openChangePwdModal() {
      document.getElementById('changePwdModal').style.display = 'flex';
    }

    function openCreateUserModal() {
      if (appUsers.length >= MAX_LIMIT) {
        showToast(' حداکثر سقف ۵ کاربر تکمیل است.');
        return;
      }
      document.getElementById('createUserModal').style.display = 'flex';
    }

    function closeModal(id) {
      document.getElementById(id).style.display = 'none';
    }

    function copyText(txt) {
      navigator.clipboard.writeText(txt).then(function() {
        showToast(' لینک با موفقیت کپی شد.');
      });
    }

    function copyInput(id) {
      var el = document.getElementById(id);
      el.select();
      navigator.clipboard.writeText(el.value).then(function() {
        showToast(' لینک ترکیبی چندلوکیشن کپی شد.');
      });
    }

    async function handleChangePassword(e) {
      e.preventDefault();
      var oldPassword = document.getElementById('curPwdInput').value;
      var newPassword = document.getElementById('newPwdInput').value;
      if (newPassword.length < 8) {
        showToast(' رمز عبور جدید باید حداقل ۸ نویسه باشد.');
        return;
      }
      try {
        var res = await fetch('/api/admin/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPassword: oldPassword, newPassword: newPassword })
        });
        var data = await res.json();
        if (data.success) {
          closeModal('changePwdModal');
          showToast(' رمز عبور مدیر تغییر کرد؛ دوباره وارد شوید.');
          setTimeout(function() { window.location.href = '/'; }, 900);
        } else {
          showToast(' ' + (data.message || 'خطا در تغییر رمز'));
        }
      } catch (_e) {
        showToast(' خطای ارتباط با سرور');
      }
    }

    async function handleLogout() {
      try {
        await fetch('/api/admin/logout', { method: 'POST' });
        window.location.href = '/';
      } catch (_e) {
        window.location.href = '/';
      }
    }

    // مقداردهی اولیه
    populateSettingsForm();
    renderUsers();
  </script>
</body>
</html>`;
}
