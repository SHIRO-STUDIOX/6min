# SHISH — MVP Blueprint Pack

> **Version:** 1.0.0 · **Date:** 2026-11-15 · **Kind:** Implementation-ready product/engineering specification, **not deployed code** · **Language:** FA with TS/HTTP identifiers.
>
> **Evidence:** `references/CURRENT_PROJECT_STATE.md` is an agent-generated repository audit, **not independently rechecked against a live clone in this session**. Recheck paths/versions before first code change.

## هدف و شیوه استفاده
این بسته برای تحویل مرحله‌ای پروژه موجود شیش به ایجنت‌های توسعه است. هر سند **تصمیم مصوب محصول**، **پیشنهاد مهندسی موقت** و **جزئیات موکول به QC** را از هم جدا می‌کند. کامل بودن این بسته به معنی تصویب همه اعداد و ارائه‌دهنده‌های نامشخص نیست؛ ایجنت باید آن‌ها را در قرارداد قابل تنظیم نگه دارد.

## واژه‌نامه وضعیت تصمیم
- `APPROVED`: تصمیم صریح مالک محصول در گفت‌وگو؛ تغییر فقط با تأیید مالک.
- `BASELINE`: واقعیت گزارش‌شده از وضعیت مخزن؛ ممکن است نسبت به زمان ممیزی تغییر کرده باشد و باید بازسنجی شود.
- `PROVISIONAL`: پیشنهاد اجرایی قابل تعویض و قابل توسعه؛ برای انتشار یا تثبیت ADR لازم است.
- `UNRESOLVED`: وابستگی/ورودی مشخص‌نشده که باید در برش مناسب حل شود؛ مانع نوشتن سایر قراردادها نیست.
- `DEFERRED_QC`: ظاهر، انیمیشن و ریزتعامل‌هایی که پس از MVP عملکردی توسط مالک بازنگری می‌شود.
- `NON_GOAL`: خارج از محدوده MVP؛ صرفاً بودن کد نمونه، تصویب یک قابلیت نیست.

## مسیر مطالعه برای هر ایجنت
1. این `README.md` و `00-foundation/{mvp-scope,decision-register,assumptions-and-blockers}.md`.
2. قرارداد مالک حوزه مورد تغییر را از نقشه زیر بخواند؛ سپس قراردادهای وابسته.
3. پیش از تغییر، فایل‌های زنده مخزن، `AGENTS.md`، `CLAUDE.md` و `Workflow.md` را **واقعاً** بخواند و اختلافات را گزارش کند.
4. در PR ذکر کند: تصمیم‌های مصرف‌شده، فایل‌های تغییرکرده، migration، تست، ریسک، محدودیت و اقلام `DEFERRED_QC`.
5. هیچ مرحله‌ای را بدون معیارهای پذیرش آن تحویل‌شده اعلام نکند.

## نقشه مالکیت حقیقت و فایل‌ها
| فایل | مالک انحصاری تصمیم / قرارداد | وابسته به |
|---|---|---|
| `00-foundation/mvp-scope.md` | محدوده MVP و Non-goals | Decisions |
| `00-foundation/decision-register.md` | فهرست تصمیم‌های مالک محصول | مکالمه تأییدشده |
| `00-foundation/assumptions-and-blockers.md` | موارد باز، ADR و مانع استقرار | همه ماژول‌ها |
| `01-architecture/architecture-and-repository-map.md` | مرزبندی ماژول‌ها و قواعد تغییر مخزن | Audit |
| `01-architecture/domain-model-and-storage.md` | مدل دامنه، داده پایدار، تراکنش | Learning, Identity |
| `01-architecture/api-and-events.md` | HTTP، خطاها، authz، idempotency و events | Domain |
| `02-learning/content-contract.md` | قرارداد تعریف محتوا و fixtures | Domain |
| `02-learning/playback-and-exercise-runtime.md` | پلیر، playback events، FSM bridge | Content, API |
| `02-learning/progression-and-mistake-review.md` | **تنها مرجع فرمول امتیاز و اصلاح اشتباه** | Domain, Runtime |
| `03-identity-commerce/authentication-and-guest.md` | موبایل/OTP/Password/Guest/Merge | Domain, API |
| `03-identity-commerce/entitlement-and-payment.md` | **تنها مرجع خرید و کنترل مجوز** | Domain, Auth |
| `04-experience/app-shell-and-navigation.md` | رفتار Header، Action Center و Dock | API |
| `04-experience/screen-flows.md` | مسیرهای کاربر و رفتار صفحه‌ها | Navigation, Learning |
| `04-experience/design-guardrails-and-qc.md` | مرز استاندارد UI و مسائل باز QC | Audit |
| `05-delivery/implementation-slices.md` | ترتیب PR/برش‌های عمودی و Definition of Done | تمام قراردادها |
| `05-delivery/verification-and-recovery.md` | تست‌های پذیرش، خطا و بازیابی | تمام قراردادها |
| `05-delivery/agent-handoff.md` | شیوه واگذاری تغییر به ایجنت | Delivery |

> **اصل:** فرمول امتیاز را در فایل صفحه کپی نکنید؛ از `progression-and-mistake-review.md` ارجاع دهید. همچنین entitlement را از نمره جدا نگه دارید؛ نگارش بصری نباید قانون دامنه تعریف کند.

## خط پایه گزارش‌شده (با ارجاع به ممیزی)
- `app/page.tsx`: کلاس افقی پنج‌کارتِ نمونه؛ gap 6px و ماسک blur.
- `components/organisms/`: VideoCard، VideoPlayer ماک، Vocabulary، Grammar، Dictation، Pronunciation، Completion، FloatingHeader، PhoneLogin.
- `hooks/use-*-fsm.ts`: منطق تعاملی ارزشمند اما client-only.
- `app/sandbox`: محیط کاربردی QC کامپوننت‌ها.
- `styles/globals.css`: Tailwind v4، HeroUI v3، توکن‌های موجود، IRANYekanXVF.
- API، ORM، database، auth، payment، persistence یادگیری و تست خودکار گزارش نشده‌اند؛ TypeScript و Build موفق، ESLint خراب.

## ترتیب تألیف و اجرای قراردادها
`Foundation → Architecture/Data/API → Content/Runtime/Progress → Identity/Commerce → Experience/QC → Delivery`.
ترتیب **اجرای کد** در `05-delivery/implementation-slices.md` به برش‌های deployable تقسیم شده است؛ منتظر تمام شدن QC بصری نمانید.

## قالب مشترک برای تغییرات
هر برش باید پاسخ دهد: «کدام تصمیم APPROVED را اجرا می‌کند؟»، «چه فایل/ماژولی تغییر می‌کند؟»، «چه داده‌ای ذخیره می‌شود؟»، «موفقیت/خطا چه رفتاری دارد؟»، «با چه تستی پذیرفته می‌شود؟».

## محتویات بسته ZIP
- `docs/blueprints/`: ۱ README و ۱۷ Blueprint کامل.
- `references/`: دو سند ورودی، بدون هیچ فرضی درباره الحاق آن‌ها به مخزن اصلی.
- `PACKAGE_MANIFEST.md` و `FILE_HASHES.sha256`: شرح بسته و کنترل فایل‌ها.

## دستور استفاده
این بسته را در شاخه جداگانه از مخزن باز کنید و **فقط** `docs/blueprints/` را در مخزن کپی کنید؛ `references/` صرفاً برای ممیزی و تطبیق است. پیش از شروع تغییرات، اسامی فایل‌ها و امکانات مندرج در گزارش را با واقعیت کد بازبینی کنید؛ Blueprintها منبع پیاده‌سازی‌اند ولی جای بررسی سورس زنده را نمی‌گیرند.
