# اجرای لوکال بدون Docker

پیش‌نیاز فقط **Node.js24 یا جدیدتر همراه npm** است. SQLite همراه Node اجرا می‌شود؛ نصب Docker، PostgreSQL، سرویس SMS یا درگاه پرداخت لازم نیست.

از PowerShell داخل پوشهٔ پروژه:

```powershell
git switch feat/shish-mvp
git pull --ff-only
.\start.ps1
```

فایل به ترتیب نسخهٔ Node و تنظیمات را بررسی می‌کند، در صورت نیاز `npm ci` می‌زند، فایل SQLite را آماده می‌کند، migration و seed تکرارپذیر را اجرا می‌کند و Next.js را روی `http://localhost:3000` بالا می‌آورد. اولین نصب بسته‌ها ممکن است زمان ببرد. برای توقف `Ctrl+C` بزن؛ دیتابیس باقی می‌ماند. اگر پورت اشغال باشد، سرویس دیگری را نمی‌بندد و پیام مشخص می‌دهد.

```powershell
.\start.ps1 -Port 3001
.\start.ps1 -SetupOnly
.\start.ps1 -RefreshDependencies
```

اگر سیاست اجرای PowerShell فایل محلی را مسدود کرد، اجرای همان فایل در یک پردازش جدا بدون تغییر دائمی سیاست سیستم:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1
```

## فایل‌ها و داده‌ها

- `.env.sqlite.local`: پروفایل خصوصی همین حالت؛ کلید آزمایشی محلی خودکار تولید می‌شود.
- `.local-data/shish-dev.sqlite`: دیتابیس توسعه.
- `.local-data/shish-test.sqlite`: دیتابیس جدا برای تست؛ مسیر آن نباید با توسعه یکی باشد.
- فایل‌های `-wal` و `-shm` ممکن است کنار SQLite باشند؛ این‌ها بخشی از کار عادی SQLite هستند.

این فایل‌ها ignored هستند. `.env`، `.env.local` و داده‌های PostgreSQL قبلی تغییر نمی‌کنند و هیچ انتقال خودکاری بین دو دیتابیس انجام نمی‌شود. در اولین تست این حالت از پنجرهٔ خصوصی مرورگر استفاده کن تا نشست‌های حالت قبلی مزاحم نشوند. فایل‌های env یا دیتابیس را در Git یا پیام عمومی نگذار.

## تست فلوها

صفحهٔ اصلی → شروع مهمان → پخش واقعی کلیپ آزمایشی → واژگان/گرامر → مسیر من/مرور اشتباهات. برای ورود mock کد `000000` است. صفحهٔ `/checkout` شبیه‌ساز پرداخت است و پولی منتقل نمی‌کند. فقط۳ درس مصنوعی منتشرشده‌اند؛۵۷ جایگاه بعدی آمادهٔ یادگیری نیستند. باقی رفتارها مثل امتیازدهی و انتقال سابقه توسط همان منطق سرور انجام می‌شوند.

پس از setup، این فرمان‌ها تست‌های SQLite را اجرا می‌کنند:

```powershell
npm test
npm run test:integration:sqlite
node --import ./scripts/load-local-sqlite.mjs node_modules/next/dist/bin/next build
npm run typecheck
npx playwright install chromium
npm run test:e2e:sqlite
```

## Production و PostgreSQL

Production همچنان PostgreSQL است: `SHISH_DB_DRIVER=postgres` و `DATABASE_URL` واقعی از تنظیمات امن همان محیط؛ `SHISH_ENV=production`. فایل start.ps1 یا پروفایل SQLite برای Production نیست و انتخاب SQLite با SHISH_ENV=production رد می‌شود. migrationهای PostgreSQL موجود تغییر نکرده‌اند؛ SQLite مسیر schema مستقل دارد. داده و بکاپ هر دیتابیس جداست. برای بکاپ SQLite از backup API یا توقف کامل برنامه/اتصال و روش معتبر SQLite استفاده کن؛ کپی فایل اصلیِ درحال‌نوشتن به‌تنهایی بکاپ معتبر نیست. دستور قدیمی backup:drill مخصوص محیط تست PostgreSQL/Docker است.

معیارهای انتشار واقعی، سرویس‌های بیرونی و QC پروژه همچنان در docs/reports/mvp/RELEASE_GATES.md ثبت شده‌اند.
