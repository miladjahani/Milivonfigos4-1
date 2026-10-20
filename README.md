# MiliconfigOS v4.0

پنل مدیریت و تولید پیکربندی اشتراک بر پایه Cloudflare Workers با رابط فارسی/راست‌چین، مدیریت کاربر محدود به ۵ حساب عادی، تنظیمات DNS، ساخت اشتراک چندفرمتی و بررسی سلامت Endpoint.

> **وضعیت صادقانه قابلیت‌ها:** موفقیت Build یا تولید URI به‌تنهایی نشان نمی‌دهد هر پروتکل روی یک استقرار واقعی کار می‌کند. برای جزئیات پوشش تست و محدودیت‌های فعلی، فایل `FINAL_REPORT_FA.md` را ببینید.

## امکانات اصلاح‌شده

- راه‌اندازی نخستین مدیر با رمز دلخواه خود مدیر؛ بدون رمز مدیر پیش‌فرض و با الزام D1 برای عملیات اتمیک و ماندگار.
- هش رمز با PBKDF2-SHA-256 و نشست امضاشده ۱۲ ساعته در کوکی `HttpOnly`.
- شناسه مسیر مدیریت تصادفی و ذخیره‌شده در D1؛ شناسه مدیر از متغیر UUID پروکسی جدا است.
- سقف حداکثر ۵ کاربر عادی در منطق برنامه و با Trigger پایگاه داده D1.
- توکن اشتراک تصادفی ۲۵۶‌بیتی مستقل از UUID پروکسی؛ چرخش توکن لینک قبلی اشتراک و صفحه وضعیت را باطل می‌کند.
- لینک‌های قدیمی مبتنی بر UUID برای دریافت اشتراک پس از این ارتقا عمداً غیرفعال شده‌اند؛ لینک‌های جدید را از پنل کپی کنید.
- حفاظت APIهای مدیریتی با نشست و بررسی درخواست‌های cross-origin.
- حالت ظاهری روشن، تاریک و خودکار؛ حفظ انتخاب تم در مرورگر.
- صفحه آغازین محلی با انتقال نرم حدود سه‌ثانیه‌ای به فرم ورود. آدرس خارجیِ تنظیم‌شده به‌صورت لینک باز می‌شود؛ Worker سایت دیگری را Reverse Proxy نمی‌کند.
- تشخیص تعارض برخی تنظیمات، پیام هشدار درباره ECH/Fragment و نیاز Shadowsocks به هسته سازگار.
- فهرست گزینه‌های DNS DoH شناخته‌شده برای Cloudflare، Google Public DNS، Quad9 و AdGuard.
- اسکنر محدودشده برای بررسی اتصال TCP به IP/Portهای عمومی مجاز؛ نتیجه TCP به‌عنوان تست کامل پروکسی معرفی نمی‌شود.
- اعتبارسنجی تعدادی از تداخل‌های رایج تنظیمات و توکن اشتراک مستقل قابل چرخش.
- حذف کانفیگ‌های ساختگی localhost و جلوگیری از بسته‌بندی Endpointهای مستقل SOCKS/HTTP به‌عنوان VLESS یا Trojan.
- مبدل‌های خروجی موجود پروژه حفظ شده‌اند و آزمون‌های ساختاری برای نمونه‌های اصلی دارند.

## معماری

- **Runtime:** Cloudflare Workers
- **Storage تولیدی:** Cloudflare D1 با Binding به نام `DB`
- **KV:** می‌تواند برای برخی تنظیمات فرعی استفاده شود، اما جایگزین D1 برای مدیریت ماندگار کاربران و راه‌اندازی اتمیک مدیر نیست
- **Source of truth:** فایل‌های ماژولار داخل `src/`
- **Build artifacts:** خروجی‌های تولیدشده توسط `scripts/build.js`

ساختار مهم:

```text
src/
  index.js
  api/handlers.js
  config/defaults.js
  config/presets.js
  core/runtime.js
  core/utils.js
  db/d1.js
  subscription/generator.js
  subscription/converters.js
  ui/adminHtml.js
  ui/loginHtml.js
  ui/statusHtml.js
  ui/icons.js
scripts/
  build.js
  obfuscate.js
  test-worker.js
migrations/0001_init_miliconfig.sql
migrations/0002_subscription_tokens.sql
schema.sql
wrangler.toml
package.json
FINAL_REPORT_FA.md
```

## ساخت و آزمون محلی

نیازمندی: Node.js که از ES Modules و Web Crypto پشتیبانی کند.

```bash
npm run build
npm test
```

`npm run build` خروجی‌های Worker را تولید و Bundle را مبهم‌سازی می‌کند. فایل‌های اصلی داخل `src/` مرجع تغییرات هستند؛ فایل‌های Bundle را دستی ویرایش نکن.

`npm test` بسته ساخته‌شده را با D1 شبیه‌سازی‌شده اجرا می‌کند و مسیرهای مهم ورود، مجوزها، ساخت کاربر، سقف پنج حساب، توکن مستقل اشتراک و چرخش/ابطال لینک قبلی، چند مبدل اشتراک و اعتبارسنجی تنظیمات را می‌آزماید. این آزمون معادل استقرار در حساب واقعی Cloudflare یا آزمایش End-to-End تمام پروتکل‌ها نیست.

## استقرار در Cloudflare Workers

1. مخزن را به حساب GitHub خود منتقل کن و در Cloudflare از مسیر **Workers & Pages** یک Worker بساز/مخزن را متصل کن.
2. دیتابیس D1 بساز.
3. در **Worker → Settings → Bindings → Add → D1 database** متغیر را `DB` بگذار و دیتابیس ساخته‌شده را متصل کن.
4. در صورت استفاده از مهاجرت‌های نسخه‌بندی‌شده، `0001_init_miliconfig.sql` و سپس `0002_subscription_tokens.sql` را اجرا کن؛ یا از `schema.sql` کامل برای ایجاد دیتابیس تازه استفاده کن. Worker نیز در شروع، مهاجرت افزایشی توکن‌های اشتراک را بررسی می‌کند.
5. Build و تست را اجرا کن. سپس در داشبورد Cloudflare استقرار را انجام بده.
6. بار اول آدرس Worker را باز کن و رمز مدیریت را در Setup Wizard تعیین کن.

راه‌اندازی اولیه مدیر بدون D1 عمداً رد می‌شود؛ KV فاقد عملیات اتمیک مناسب برای جلوگیری قطعی از رقابت درخواست‌های اولین مدیر است و حافظه موقت نیز پس از Restart پایدار نیست.

### استقرار از طریق Wrangler

`wrangler.toml` ورودی اصلی `src/index.js` را تنظیم می‌کند. برای استقرار مستقیم با Wrangler باید حساب Cloudflare و مجوز معتبر Wrangler خود را تنظیم کرده باشی. هیچ Token واقعی در این پروژه قرار داده نشده است.

برای استقرار Pages، مطمئن شو پروژه در حالت پشتیبانی از `_worker.js` تنظیم شده و Bindingهای D1/KV موردنیاز نیز در محیط Pages متصل شده‌اند؛ Workers و Pages را بدون بررسی تنظیمات به‌جای هم در نظر نگیر.

## DNSهای قابل انتخاب

گزینه‌های موجود در تنظیمات از آدرس‌های مستندشده عمومی اقتباس شده‌اند. وجود در فهرست به معنی تست زنده از شبکه یا دستگاه شما نیست؛ دسترسی و سازگاری کلاینت باید جداگانه آزمایش شود.

- Cloudflare DoH: `https://cloudflare-dns.com/dns-query`
- Cloudflare Security DoH: `https://security.cloudflare-dns.com/dns-query`
- Cloudflare Family DoH: `https://family.cloudflare-dns.com/dns-query`
- Google Public DNS: `https://dns.google/dns-query`
- Quad9 Secure: `https://dns.quad9.net/dns-query`
- Quad9 no-threat-blocking: `https://dns10.quad9.net/dns-query`
- AdGuard Default: `https://dns.adguard-dns.com/dns-query`
- AdGuard Family: `https://family.adguard-dns.com/dns-query`
- AdGuard Unfiltered: `https://unfiltered.adguard-dns.com/dns-query`

مستندات رسمی: [Cloudflare](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/)، [Google](https://developers.google.com/speed/public-dns/docs/doh/)، [Quad9](https://docs.quad9.net/services/) و [AdGuard](https://adguard-dns.io/kb/general/dns-providers/).

## محدودیت‌های فنی مهم

- **Shadowsocks:** بخش فعلی Worker پیاده‌سازی کامل handshake رمزنگاری AEAD و Data Plane عمومی Shadowsocks نیست. تولید URI به‌تنهایی سرور SS واقعی نمی‌سازد؛ تا زمان اتصال/پیاده‌سازی هسته سازگار، خروجی SS به‌عنوان اتصال عملیاتی تضمین نمی‌شود.
- **ECH:** مقدار دامنه یا گزینه ECH اثبات نمی‌کند که ECH از کلاینت تا مقصد عملیاتی است. باید DNS، کلاینت، هسته و endpoint واقعی با هم آزمایش شوند.
- **Fragment:** گزینه‌ها/پریست‌ها به‌تنهایی Fragment واقعی ترافیک TLS را در همه کلاینت‌ها اعمال نمی‌کنند.
- **Scanner:** اسکنر اتصال TCP به آدرس و پورت را بررسی می‌کند؛ handshake پروتکل یا اتصال سرتاسری را اثبات نمی‌کند.
- **چندمکانی:** فهرست کشور به‌تنهایی ثابت نمی‌کند که سرور فیزیکی در همان کشور است. هرجا مکان تأیید نشده، نباید آن را مکان قطعی معرفی کرد.
- **ترافیک:** شمارنده فعلی بایت کل را در مسیرهای مشخص Worker ثبت می‌کند؛ upload/download را به‌صورت قابل اتکا تفکیک نمی‌کند. ترافیک هسته‌ها یا سرویس‌های خارجی باید از طریق Accounting Adapter مناسب وارد شود.
- **AI Connectivity Lab:** در این نسخه ماژول کامل تشخیص مسیر Gemini/AI از داخل یک تونل واقعی پیاده‌سازی نشده است؛ تست DNS/HTTPS یا TLS سمت Worker به‌تنهایی مسیر دستگاه کاربر را اثبات نمی‌کند.
- **موتور ترکیب و Fixed IP:** اعتبارسنجی و بعضی هشدارهای سازگاری وجود دارند، اما بهینه‌ساز خودکار جامع برای همه ترکیب‌ها و یک Fixed IP Studio کامل با تخصیص خودکار IP هنوز تکمیل نشده‌اند.
- **محدودیت Rate Limit ورود:** شمارش تلاش‌های ورود در حافظه هر Worker isolate نگهداری می‌شود و جایگزین یک قانون Rate Limiting سراسری Cloudflare نیست؛ برای انتشار عمومی، محدودیت لبه‌ای Cloudflare نیز فعال کن.
- **استقرار واقعی:** در این محیط به حساب Cloudflare شما دسترسی نداشتم؛ پس Deploy واقعی، DNS زنده از مسیر Worker و اتصال End-to-End پروتکل‌ها آزمایش نشده‌اند.

## امنیت

- رمز عبور اولیه باید توسط مدیر تعیین شود.
- رمز، Token و Secret واقعی را وارد Git نکن.
- Bindingهای D1/KV را در Cloudflare تنظیم کن.
- از HTTPS برای محیط واقعی استفاده کن.
- برای تغییرات حساس و پیش از استفاده تولیدی، Backup بگیر و تست‌های رگرسیون را اجرا کن.
