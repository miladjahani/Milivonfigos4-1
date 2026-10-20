// ============================================================================
// MiliconfigOS v4.0 - تنظیمات پیش‌فرض پایه (الهام‌گرفته از Z-E-U-S و CFnew)
// مجهز به شادوساکس، فرگمنت، ECH، لیست‌های کشوری، قفل ۵ کاربر و چرخش خودکار آی‌پی
// ============================================================================

export const BRAND_NAME = 'miliconfig';
export const BRAND_UPPER = 'MILICONFIG';
export const VERSION = 'v4.0';
// Admin/proxy identity is generated during initialization or explicitly supplied by deployment.
export const DEFAULT_ADMIN_UUID = '';
export const MAX_USERS_LIMIT = 5;
export const TELEGRAM_SUPPORT = '@miliconfig';

// Never inject dummy localhost configurations into real subscriptions.
export const HARDCODED_INFO_NODES = [];

export const CONFIG_DEFAULTS = {
  wk: '',
  ev: 'yes',
  et: 'no',
  ex: 'no',
  es: 'no', // شادوساکس (Shadowsocks)
  sspass: '',
  ssmethod: 'chacha20-ietf-poly1305',
  ech: 'no',
  fragment: 'no',
  tp: '',
  customDNS: 'https://cloudflare-dns.com/dns-query',
  customECHDomain: 'cloudflare-ech.com',
  alpn: '',
  d: '',
  p: '',
  yx: '',
  yxURL: '',
  s: '',
  homepage: '',
  scu: 'https://url.v1.mk/sub',
  ena: 'no',
  epd: 'yes',
  epi: 'yes',
  egi: 'yes',
  ae: '',
  rm: '',
  qj: '',
  dkby: 'no',
  yxby: '',
  ipv4: 'yes',
  ipv6: 'yes',
  ispMobile: 'yes',
  ispUnicom: 'yes',
  ispTelecom: 'yes',
  jk: 'no',
  subNodeCount: 50,
  brand: BRAND_NAME,
  // تنظیمات جدید الهام‌گرفته از ZEUS:
  fp: 'chrome', // فینگرپرینت: chrome, firefox, safari, edge, ios, randomized
  patt: '/?ed=2048', // الگوهای مسیر
  fragmentPreset: 'mci', // پریست‌های فرگمنت
  fragmentLength: '100-200',
  fragmentInterval: '10-20',
  fragmentPackets: 'tlshello',
  ipRotation: '15m', // چرخش فهرست Endpointها؛ به معنی تغییر IP واقعی سرور نیست
  supportChannel: TELEGRAM_SUPPORT
};

export const BOOLEAN_CONFIG_KEYS = [
  'ev', 'et', 'ex', 'es', 'ech', 'fragment', 'ena', 'epd', 'epi', 'egi',
  'ipv4', 'ipv6', 'ispMobile', 'ispUnicom', 'ispTelecom', 'jk'
];

export const ENV_KEY_MAPPING = {
  wk: ['wk', 'WK'],
  ev: ['ev', 'EV'],
  et: ['et', 'ET'],
  ex: ['ex', 'EX'],
  es: ['es', 'ES', 'SS', 'ss'],
  sspass: ['sspass', 'SSPASS', 'SS_PASSWORD'],
  ssmethod: ['ssmethod', 'SSMETHOD', 'SS_METHOD'],
  ech: ['ech', 'ECH'],
  fragment: ['fragment', 'FRAGMENT'],
  tp: ['tp', 'TP'],
  customDNS: ['customDNS', 'CUSTOMDNS', 'CUSTOM_DNS'],
  customECHDomain: ['customECHDomain', 'CUSTOMECHDOMAIN', 'CUSTOM_ECH_DOMAIN'],
  alpn: ['alpn', 'ALPN'],
  d: ['d', 'D'],
  p: ['p', 'P'],
  yx: ['yx', 'YX'],
  yxURL: ['yxURL', 'YXURL', 'YX_URL'],
  s: ['s', 'S'],
  homepage: ['homepage', 'HOMEPAGE'],
  scu: ['scu', 'SCU'],
  ena: ['ena', 'ENA'],
  epd: ['epd', 'EPD'],
  epi: ['epi', 'EPI'],
  egi: ['egi', 'EGI'],
  ae: ['ae', 'AE'],
  rm: ['rm', 'RM'],
  qj: ['qj', 'QJ'],
  dkby: ['dkby', 'DKBY'],
  yxby: ['yxby', 'YXBY'],
  ipv4: ['ipv4', 'IPV4'],
  ipv6: ['ipv6', 'IPV6'],
  ispMobile: ['ispMobile', 'ISPMOBILE', 'ISP_MOBILE'],
  ispUnicom: ['ispUnicom', 'ISPUNICOM', 'ISP_UNICOM'],
  ispTelecom: ['ispTelecom', 'ISPTELECOM', 'ISP_TELECOM'],
  jk: ['jk', 'JK'],
  subNodeCount: ['subNodeCount', 'SUB_NODE_COUNT', 'nodeCount', 'NODE_COUNT'],
  fp: ['fp', 'FP', 'FINGERPRINT'],
  patt: ['patt', 'PATT', 'PATH_PATTERN'],
  fragmentPreset: ['fragmentPreset', 'FRAGMENT_PRESET'],
  ipRotation: ['ipRotation', 'IP_ROTATION', 'ROTATION_MINUTES']
};

export const FRAGMENT_PRESETS = {
  'mci': { name: 'همراه اول (MCI)', length: '100-200', interval: '10-20', packets: 'tlshello' },
  'irancell': { name: 'ایرانسل (MTN Irancell)', length: '50-100', interval: '5-10', packets: 'tlshello' },
  'rightel': { name: 'مخابرات و رایتل (Rightel / TCI)', length: '1-3', interval: '1-5', packets: '1-1' },
  'anti-dpi': { name: 'ضد فیلترینگ شدید (Anti-DPI)', length: '10-30', interval: '20-40', packets: 'tlshello' },
  'custom': { name: 'سفارشی (Custom)', length: '100-200', interval: '10-20', packets: 'tlshello' }
};

export const FINGERPRINT_PRESETS = [
  { id: 'chrome', name: 'Chrome (پیشنهادی)' },
  { id: 'firefox', name: 'Firefox' },
  { id: 'safari', name: 'Safari (iOS/macOS)' },
  { id: 'edge', name: 'Microsoft Edge' },
  { id: 'ios', name: 'iOS Device' },
  { id: 'randomized', name: 'Randomized (تصادفی)' }
];

export const ECH_DOMAINS = [
  'cloudflare-ech.com',
  'crypto.cloudflare.com',
  'cloudflare-dns.com',
  'deflect.ca'
];

export const PATH_PATTERNS = [
  { id: '/?ed=2048', name: 'استاندارد (/?ed=2048)' },
  { id: '/mili/{random}?ed=2048', name: 'مسیر رندوم (/mili/{random}?ed=2048)' },
  { id: '/api/v1/stream', name: 'استتار API (/api/v1/stream)' },
  { id: '/grpc', name: 'gRPC پث (/grpc)' }
];

// لیست پروکسی‌های کشوری VIP (مطابق لینک‌های ارسالی کاربر و ZEUS)
export const COUNTRY_PROXY_SOURCES = {
  'DE': {
    name: 'آلمان',
    flag: '🇩🇪',
    urls: [
      'https://raw.githubusercontent.com/panel-zeus/Z-E-U-S/main/proxy_vip/DE.txt',
      'https://raw.githubusercontent.com/trio666/proxy-checker/main/country/DE/socks5.txt',
      'https://raw.githubusercontent.com/dimzon/scaling-sniffle/main/by-country/DE.txt'
    ]
  },
  'NL': {
    name: 'هلند',
    flag: '🇳🇱',
    urls: [
      'https://raw.githubusercontent.com/panel-zeus/Z-E-U-S/main/proxy_vip/NL.txt',
      'https://raw.githubusercontent.com/trio666/proxy-checker/main/country/NL/socks5.txt',
      'https://raw.githubusercontent.com/dimzon/scaling-sniffle/main/by-country/NL.txt'
    ]
  },
  'US': {
    name: 'ایالات متحده آمریکا',
    flag: '🇺🇸',
    urls: [
      'https://raw.githubusercontent.com/panel-zeus/Z-E-U-S/main/proxy_vip/US.txt',
      'https://raw.githubusercontent.com/trio666/proxy-checker/main/country/US/socks5.txt',
      'https://raw.githubusercontent.com/dimzon/scaling-sniffle/main/by-country/US.txt'
    ]
  },
  'GB': {
    name: 'بریتانیا / انگلستان',
    flag: '🇬🇧',
    urls: [
      'https://raw.githubusercontent.com/panel-zeus/Z-E-U-S/main/proxy_vip/GB.txt',
      'https://raw.githubusercontent.com/dimzon/scaling-sniffle/main/by-country/GB.txt'
    ]
  },
  'CA': {
    name: 'کانادا',
    flag: '🇨🇦',
    urls: [
      'https://raw.githubusercontent.com/panel-zeus/Z-E-U-S/main/proxy_vip/CA.txt'
    ]
  },
  'TR': {
    name: 'ترکیه',
    flag: '🇹🇷',
    urls: [
      'https://raw.githubusercontent.com/panel-zeus/Z-E-U-S/main/proxy_vip/TR.txt',
      'https://raw.githubusercontent.com/dimzon/scaling-sniffle/main/by-country/TR.txt'
    ]
  },
  'AE': {
    name: 'امارات متحده عربی',
    flag: '🇦🇪',
    urls: [
      'https://raw.githubusercontent.com/panel-zeus/Z-E-U-S/main/proxy_vip/AE.txt'
    ]
  },
  'FR': {
    name: 'فرانسه',
    flag: '🇫🇷',
    urls: [
      'https://raw.githubusercontent.com/dimzon/scaling-sniffle/main/by-country/FR.txt'
    ]
  },
  'FI': {
    name: 'فنلاند',
    flag: '🇫🇮',
    urls: [
      'https://raw.githubusercontent.com/trio666/proxy-checker/main/country/FI/socks5.txt',
      'https://raw.githubusercontent.com/dimzon/scaling-sniffle/main/by-country/FI.txt'
    ]
  },
  'SE': {
    name: 'سوئد',
    flag: '🇸🇪',
    urls: [
      'https://raw.githubusercontent.com/panel-zeus/Z-E-U-S/main/proxy_vip/SE.txt'
    ]
  },
  'NO': {
    name: 'نروژ',
    flag: '🇳🇴',
    urls: [
      'https://raw.githubusercontent.com/panel-zeus/Z-E-U-S/main/proxy_vip/NO.txt'
    ]
  },
  'IT': {
    name: 'ایتالیا',
    flag: '🇮🇹',
    urls: [
      'https://raw.githubusercontent.com/panel-zeus/Z-E-U-S/main/proxy_vip/IT.txt'
    ]
  },
  'BG': {
    name: 'بلغارستان',
    flag: '🇧🇬',
    urls: [
      'https://raw.githubusercontent.com/panel-zeus/Z-E-U-S/main/proxy_vip/BG.txt'
    ]
  },
  'KZ': {
    name: 'قزاقستان',
    flag: '🇰🇿',
    urls: [
      'https://raw.githubusercontent.com/panel-zeus/Z-E-U-S/main/proxy_vip/KZ.txt'
    ]
  },
  'LV': {
    name: 'لتونی',
    flag: '🇱🇻',
    urls: [
      'https://raw.githubusercontent.com/panel-zeus/Z-E-U-S/main/proxy_vip/LV.txt'
    ]
  },
  'TH': {
    name: 'تایلند',
    flag: '🇹🇭',
    urls: [
      'https://raw.githubusercontent.com/panel-zeus/Z-E-U-S/main/proxy_vip/TH.txt',
      'https://raw.githubusercontent.com/trio666/proxy-checker/main/country/TH/socks5.txt'
    ]
  },
  'UZ': {
    name: 'ازبکستان',
    flag: '🇺🇿',
    urls: [
      'https://raw.githubusercontent.com/panel-zeus/Z-E-U-S/main/proxy_vip/UZ.txt'
    ]
  },
  'SG': {
    name: 'سنگاپور',
    flag: '🇸🇬',
    urls: [
      'https://raw.githubusercontent.com/trio666/proxy-checker/main/country/SG/socks5.txt'
    ]
  }
};

export const REGION_MAP = {
  CF: ['🌐 مستقیم رسمی CF', 'CF', 'Cloudflare Direct'],
  HK: ['🇭🇰 هنگ‌کنگ', 'HK', 'Hong Kong'],
  US: ['🇺🇸 آمریکا', 'US', 'United States'],
  SG: ['🇸🇬 سنگاپور', 'SG', 'Singapore'],
  JP: ['🇯🇵 ژاپن', 'JP', 'Japan'],
  KR: ['🇰🇷 کره‌جنوبی', 'KR', 'South Korea'],
  DE: ['🇩🇪 آلمان', 'DE', 'Germany'],
  SE: ['🇸🇪 سوئد', 'SE', 'Sweden'],
  NL: ['🇳🇱 هلند', 'NL', 'Netherlands'],
  FI: ['🇫🇮 فنلاند', 'FI', 'Finland'],
  GB: ['🇬🇧 بریتانیا', 'GB', 'United Kingdom'],
  CA: ['🇨🇦 کانادا', 'CA', 'Canada'],
  TR: ['🇹🇷 ترکیه', 'TR', 'Turkey'],
  FR: ['🇫🇷 فرانسه', 'FR', 'France'],
  AE: ['🇦🇪 امارات', 'AE', 'United Arab Emirates'],
  Oracle: ['☁️ Oracle', 'Oracle'],
  DigitalOcean: ['🌊 DigitalOcean', 'DigitalOcean'],
  Vultr: ['⚡ Vultr', 'Vultr'],
  Multacom: ['🏢 Multacom', 'Multacom']
};

export const OFFICIAL_DIRECT_IPS = [
  '172.71.218.190',
  '162.158.228.87',
  '162.158.189.134',
  '162.158.26.63',
  '162.158.25.86',
  '162.158.29.216',
  '162.158.218.160',
  '162.158.227.214',
  '172.69.118.198',
  '172.69.119.150'
];

export const FALLBACK_PROXY_IPS = [
  { domain: 'ProxyIP.HK.CMLiussss.net', region: 'HK', regionCode: 'HK', port: 443 },
  { domain: 'ProxyIP.US.CMLiussss.net', region: 'US', regionCode: 'US', port: 443 },
  { domain: 'ProxyIP.SG.CMLiussss.net', region: 'SG', regionCode: 'SG', port: 443 },
  { domain: 'ProxyIP.JP.CMLiussss.net', region: 'JP', regionCode: 'JP', port: 443 },
  { domain: 'ProxyIP.KR.CMLiussss.net', region: 'KR', regionCode: 'KR', port: 443 },
  { domain: 'ProxyIP.DE.CMLiussss.net', region: 'DE', regionCode: 'DE', port: 443 },
  { domain: 'ProxyIP.SE.CMLiussss.net', region: 'SE', regionCode: 'SE', port: 443 },
  { domain: 'ProxyIP.NL.CMLiussss.net', region: 'NL', regionCode: 'NL', port: 443 },
  { domain: 'ProxyIP.FI.CMLiussss.net', region: 'FI', regionCode: 'FI', port: 443 },
  { domain: 'ProxyIP.GB.CMLiussss.net', region: 'GB', regionCode: 'GB', port: 443 },
  { domain: 'ProxyIP.Oracle.cmliussss.net', region: 'Oracle', regionCode: 'Oracle', port: 443 },
  { domain: 'ProxyIP.DigitalOcean.CMLiussss.net', region: 'DigitalOcean', regionCode: 'DigitalOcean', port: 443 },
  { domain: 'ProxyIP.Vultr.CMLiussss.net', region: 'Vultr', regionCode: 'Vultr', port: 443 },
  { domain: 'ProxyIP.Multacom.CMLiussss.net', region: 'Multacom', regionCode: 'Multacom', port: 443 }
];

export const DIRECT_DOMAINS = [
  { name: 'cloudflare.182682.xyz', domain: 'cloudflare.182682.xyz' },
  { name: 'speed.marisalnc.com', domain: 'speed.marisalnc.com' },
  { domain: 'freeyx.cloudflare88.eu.org' },
  { domain: 'bestcf.top' },
  { domain: 'cdn.2020111.xyz' },
  { domain: 'cfip.cfcdn.vip' },
  { domain: 'cf.0sm.com' },
  { domain: 'cf.090227.xyz' },
  { domain: 'cf.zhetengsha.eu.org' },
  { domain: 'cloudflare.9jy.cc' },
  { domain: 'cf.zerone-cdn.pp.ua' },
  { domain: 'cfip.1323123.xyz' },
  { domain: 'cnamefuckxxs.yuchen.icu' },
  { domain: 'cloudflare-ip.mofashi.ltd' },
  { domain: '115155.xyz' },
  { domain: 'cname.xirancdn.us' },
  { domain: 'f3058171cad.002404.xyz' },
  { domain: '8.889288.xyz' },
  { domain: 'cdn.tzpro.xyz' },
  { domain: 'cf.877771.xyz' },
  { domain: 'xn--b6gac.eu.org' }
];

export const CF_HTTP_PORTS = [80, 8080, 8880, 2052, 2082, 2086, 2095];
export const CF_HTTPS_PORTS = [443, 2053, 2083, 2087, 2096, 8443];
export const ALLOWED_ALPN = ['', 'h3', 'h2', 'http/1.1', 'h3,h2', 'h2,http/1.1', 'h3,h2,http/1.1'];
export const REMOTE_CONFIG_URL = 'https://raw.githubusercontent.com/byJoey/test/refs/heads/main/tist.ini';

export function isEnabledValue(val, defaultEnabled = false) {
  if (val === undefined || val === null || val === '') return defaultEnabled;
  if (val === true || val === false) return val;
  const text = String(val).trim().toLowerCase();
  if (text === 'yes' || text === 'true' || text === '1' || text === 'on') return true;
  if (text === 'no' || text === 'false' || text === '0' || text === 'off') return false;
  return defaultEnabled;
}

export function normalizeSwitch(val, defaultEnabled = false) {
  return isEnabledValue(val, defaultEnabled) ? 'yes' : 'no';
}

export function normalizeAlpn(val) {
  const s = String(val || '').trim();
  return ALLOWED_ALPN.includes(s) ? s : '';
}

export function normalizeEffectiveConfig(rawConfig = {}) {
  const snap = {
    ...CONFIG_DEFAULTS,
    ...(rawConfig || {})
  };
  for (const key of BOOLEAN_CONFIG_KEYS) {
    snap[key] = normalizeSwitch(snap[key], isEnabledValue(CONFIG_DEFAULTS[key]));
  }
  if (snap.ev === 'no' && snap.et === 'no' && snap.ex === 'no' && snap.es === 'no') {
    snap.ev = 'yes';
  }
  if (snap.ech === 'yes') {
    snap.dkby = 'yes';
  }
  snap.alpn = normalizeAlpn(snap.alpn);
  const parsedCount = parseInt(snap.subNodeCount, 10);
  snap.subNodeCount = Number.isFinite(parsedCount) && parsedCount >= 0 ? parsedCount : 50;
  const rotationText = String(snap.ipRotation ?? '15m').trim().toLowerCase();
  if (['off', '5m', '15m', '30m', '1h', '6h', '24h'].includes(rotationText)) {
    snap.ipRotation = rotationText;
  } else {
    const legacyMinutes = Number.parseInt(rotationText, 10);
    snap.ipRotation = Number.isFinite(legacyMinutes) && legacyMinutes > 0
      ? (legacyMinutes >= 60 && legacyMinutes % 60 === 0 ? `${legacyMinutes / 60}h` : `${legacyMinutes}m`)
      : '15m';
  }
  snap.fp = snap.fp || 'chrome';
  snap.patt = snap.patt || '/?ed=2048';
  snap.supportChannel = TELEGRAM_SUPPORT;
  snap.brand = BRAND_NAME;
  return snap;
}


export function analyzeConfigConflicts(rawConfig = {}) {
  const cfg = normalizeEffectiveConfig(rawConfig);
  const issues = [];
  const add = (severity, code, title, message, recommendation = '') => issues.push({ severity, code, title, message, recommendation });
  const enabled = ['ev', 'et', 'ex', 'es'].some(key => isEnabledValue(rawConfig?.[key] ?? cfg[key], false));
  if (!enabled) add('ERROR', 'NO_PROTOCOL_ENABLED', 'هیچ پروتکلی انتخاب نشده', 'تنظیمات نرمال‌شده ممکن است VLESS را به‌صورت پیش‌فرض فعال کند.', 'حداقل یک پروتکل واقعاً پشتیبانی‌شده را انتخاب کنید.');
  if (cfg.ipv4 !== 'yes' && cfg.ipv6 !== 'yes') add('ERROR', 'NO_IP_FAMILY', 'هیچ خانواده IP فعال نیست', 'هر دو گزینه IPv4 و IPv6 غیرفعال هستند؛ ممکن است هیچ Endpoint قابل استفاده‌ای باقی نماند.', 'IPv4 یا IPv6 را فعال کنید.');
  if (cfg.es === 'yes' && !['chacha20-ietf-poly1305', 'aes-128-gcm', 'aes-256-gcm'].includes(String(cfg.ssmethod || ''))) {
    add('ERROR', 'INVALID_SS_CIPHER', 'روش رمزنگاری Shadowsocks نامعتبر است', 'روش انتخاب‌شده در فهرست مجاز این پروژه وجود ندارد.', 'یکی از روش‌های رمزنگاری نمایش‌داده‌شده در فهرست را انتخاب کنید.');
  }
  if (cfg.customDNS) {
    try {
      const dnsUrl = new URL(String(cfg.customDNS));
      if (dnsUrl.protocol !== 'https:' || !dnsUrl.hostname) add('ERROR', 'INVALID_DOH_URL', 'نشانی DoH معتبر نیست', 'نشانی DNS سفارشی باید یک HTTPS endpoint معتبر باشد.', 'نشانی رسمی DoH ارائه‌دهنده را وارد کنید.');
    } catch (_e) {
      add('ERROR', 'INVALID_DOH_URL', 'نشانی DoH معتبر نیست', 'مقدار DNS سفارشی قابل‌تجزیه به URL نیست.', 'نشانی کامل HTTPS را وارد کنید.');
    }
  }
  if (cfg.es === 'yes') add('WARNING', 'SS_DATAPLANE_REQUIRED', 'Shadowsocks به هستهٔ سرور سازگار نیاز دارد', 'بخش فعلی Worker پیاده‌سازی کامل handshake رمزنگاری AEAD شادوساکس ندارد؛ انتخاب این گزینه به‌تنهایی سرویس SS واقعی ایجاد نمی‌کند.', 'یک server-side data plane واقعی متصل کنید یا پروتکل را تا زمان اتصال آن غیرفعال نگه دارید.');
  if (cfg.ech === 'yes') {
    const domain = String(cfg.customECHDomain || '').trim();
    const validDomain = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain);
    if (!validDomain) add('ERROR', 'INVALID_ECH_DOMAIN', 'دامنه ECH نامعتبر است', 'مقدار دامنه ECH از نظر ساختاری معتبر نیست.', 'یک hostname معتبر که واقعاً ECH را ارائه می‌کند انتخاب کنید.');
    else add('WARNING', 'ECH_END_TO_END_UNVERIFIED', 'ECH هنوز تأیید سرتاسری نشده است', 'ثبت دامنه در کانفیگ به‌تنهایی ثابت نمی‌کند کلاینت، DNS و مسیر TLS واقعاً از ECH استفاده می‌کنند.', 'پیش از استفاده عملی، خروجی را با کلاینت و endpoint واقعی آزمایش کنید.');
  }
  if (cfg.fragment === 'yes') add('WARNING', 'FRAGMENT_CLIENT_DEPENDENT', 'Fragment به کلاینت وابسته است', 'این Worker به‌تنهایی Fragment ترافیک TLS را برای همه کلاینت‌ها اعمال نمی‌کند؛ اثر گزینه به قابلیت خروجی و کلاینت مقصد وابسته است.', 'پشتیبانی واقعی کلاینت را جداگانه تأیید کنید و این گزینه را تضمین عبور در نظر نگیرید.');
  if (!['chrome', 'firefox', 'safari', 'edge', 'ios', 'randomized'].includes(String(cfg.fp || ''))) add('WARNING', 'UNKNOWN_FINGERPRINT', 'Fingerprint ناشناخته است', 'گزینه TLS fingerprint در فهرست شناخته‌شده این پروژه نیست.', 'از مقدار سازگار با کلاینت و هسته انتخاب‌شده استفاده کنید.');
  if (!['off', '5m', '15m', '30m', '1h', '6h', '24h'].includes(String(cfg.ipRotation))) {
    add('WARNING', 'ROTATION_VALUE', 'بازه چرخش نامعتبر است', 'بازه چرخش در فهرست مقادیر پشتیبانی‌شده نیست.', 'یکی از مقدارهای off، 5m، 15m، 30m، 1h، 6h یا 24h را انتخاب کنید.');
  }
  return issues;
}

export function readEnvConfigValue(env, ...names) {
  if (!env) return undefined;
  for (const name of names) {
    if (env[name] !== undefined && env[name] !== null && env[name] !== '' && typeof env[name] !== 'object') {
      return env[name];
    }
  }
  return undefined;
}

export function getEnvConfigSnapshot(env = {}) {
  const snap = {};
  for (const [key, names] of Object.entries(ENV_KEY_MAPPING)) {
    const val = readEnvConfigValue(env, ...names);
    if (val !== undefined) snap[key] = val;
  }
  return snap;
}
