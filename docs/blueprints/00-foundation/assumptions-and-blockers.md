# Assumptions, Blockers & ADR Queue

**Status:** decisions recorded, assumptions not product approvals. Read alongside `decision-register.md`.

## موارد باز و سیاست برخورد
| ID | Status | موضوع | مقدار فعلی | کار مجاز قبل از تعیین | آخرین زمان تصمیم / مالک |
|---|---|---|---|---|---|
| UN-01 | UNRESOLVED | `defaultVideoWeight` | عدد نامعلوم | فیلد config اجباری + fixture `DEMO_ONLY`; fail-closed در نبود تنظیم انتشار | پیش از publish lesson / Product |
| UN-02 | UNRESOLVED | `defaultUnlockThreshold` | عدد نامعلوم | fixture با مقدار تستِ صریح؛ تست مرزی به‌صورت پارامتریک | قبل از acceptance unlock / Product |
| UN-03 | UNRESOLVED | مشخصات زیرساخت استقرار انتخاب‌شده | مالک گفته انتخاب شده، اما OS/runtime/network/DB/SSL نامعلوم | معماری portable، بدون ادعای production-ready | پیش از migration Production و callbackها / Owner+DevOps |
| UN-04 | PROVISIONAL | ORM | Prisma یا Drizzle | ADR کوتاه و انتخاب دقیقاً یکی پیش از schema | قبل از migration نخست / Tech lead |
| UN-05 | PROVISIONAL | سرویس OTP | provider نامعلوم | `SmsProvider` interface + fake dev-only | قبل از استفاده با شماره حقیقی / Owner+Tech |
| UN-06 | PROVISIONAL | سرویس پرداخت، پول/قیمت | provider، amount، currency نامعلوم | `PaymentGateway` interface، fake test-only؛ prohibit live checkout | قبل از اتصال واقعی / Owner |
| UN-07 | PROVISIONAL | video package/host | بدون provider واقعی | compare supported player libraries, use native events; `VideoAdapter` | قبل از vertical slice playback / Tech lead |
| UN-08 | PROVISIONAL | میزبانی آواتار/فایل | storage نامعلوم | object-storage interface، avatar placeholder | قبل از آپلود حقیقی / Tech lead |
| UN-09 | PROVISIONAL | guest draft storage | local browser storage | IndexedDB برای داده‌های غیرحساس پیشنهاد است؛ migration با transaction و consent | قبل از guest rollout / Tech lead |
| UN-10 | PROVISIONAL | منطقه شماره موبایل | فرم فعلی IR (`09…`) | امکان normalize در UI و canonical E.164 در سرور بدون قفل کشور تا تأیید | قبل از OTP واقعی / Owner |
| UN-11 | PROVISIONAL | scoring در صورت offline و تعارض نسخه | سرور authoritative | append-only attempts، idempotency، contentVersion، retry معقول | قبل از انتشار / Tech lead |
| UN-12 | PROVISIONAL | AI pronunciation grading | endpoint و کیفیت نامعلوم | mock فقط dev؛ عدم اعطای score واقعی بر اساس mock | قبل از پذیرش آن تمرین / Owner+Tech |
| UN-13 | UNRESOLVED | محتوای ۶۰ درس | فعلاً صرفاً sample | fixture سه درس آلمانی و metadata ۶۰ جایگاه؛ unpublished blocked | قبل از انتشار هر درس / Content owner |
| UN-14 | PROVISIONAL | مقداردهی اولیه محتوا و تغییر نسخه | seed tooling | immutable published version؛ migration صریح و audit | قبل از content edit در prod / Content+Tech |
| UN-15 | PROVISIONAL | گواه واقعی مشاهده ویدیو | event-based و client-reported | heartbeat و plausibility سمت سرور؛ **بدون ادعای اثبات ضدتقلب مطلق** | هنگام security review / Tech lead |
| UN-16 | PROVISIONAL | سیاست حریم خصوصی و حفظ داده | هنوز تعیین نشده | least-privilege، عدم ذخیره صدای خام، عدم لاگ OTP/answer حساس | قبل از جمع‌آوری داده واقعی / Owner+Legal |
| UN-17 | DEFERRED_QC | UI نهایی کارت‌ها/Focus/Progress glow | باز | عملکرد حداقلی با tokens موجود | پس از vertical slice / Product |
| UN-18 | PROVISIONAL | presentation progress سرور | best full + corrected amendments | component-level display metric مستقل از score | قبل از analytics release / Tech lead |
| UN-19 | UNRESOLVED | fallback failure of speech/browser support | بدون سیاست قطعی | ارائه unavailable state، بدون grade جعلی | پیش از release مربوط به Pronunciation / Product |

## مسدودکننده واقعی در مقابل امکان آغاز
**می‌توان حالا شروع کرد:** مستندکردن دامنه، اصلاح lint، route skeleton، PostgreSQL local + ORM ADR، fixture، test infrastructure، endpointهای خواندن، pure-score calculator، UI حداقلی.

**ممنوع برای اعلام Production-ready تا حل ورودی‌ها:** SMS حقیقی بدون ارائه‌دهنده و کشور/نرخ، پرداخت حقیقی بدون gateway/price، rollout روی سرور بدون مشخصات میزبان، حدنصاب انتشار واقعی بدون اعداد مصوب، نمره pronunciation متکی به شبیه‌ساز، درس فاقد محتوا.

## ADRهای لازم (یک صفحه برای هر تصمیم)
- ADR-001: انتخاب ORM بر اساس schema migration، transaction، support و حجم توسعه.
- ADR-002: احراز هویت و session storage strategy برای web و clients future.
- ADR-003: انتخاب video player package و مصدر eventها؛ عدم بازنویسی player.
- ADR-004: local guest storage / merge strategy، privacy و حجم داده.
- ADR-005: SMS gateway adapter، region normalization و محدودیت هزینه.
- ADR-006: payment gateway + idempotent verification.
- ADR-007: hosting constraints، runtime Node، PostgreSQL، secret management، backup.

هر ADR باید `Context / Options / Decision / Consequences / Rollback / Approval` داشته باشد. **تصمیم فنی برگشت‌پذیر** را Tech Lead می‌تواند مستند کند؛ **مقدار محصول** مثل حدنصاب یا تعداد درس رایگان فقط با مالک محصول.

## ریسک‌ها و اقدامات
1. **اطلاعات ممیزی قدیمی یا ناقص:** به هر برش، reconfirm واقعی فایل‌ها قبل از coding افزوده شود.
2. **داده progress کلاینتی غیرقابل اعتماد:** همواره server recompute، immutable attempt، question correctness server-side.
3. **تقلب پرداخت:** هرگز از query `?success=true` برای grant استفاده نشود.
4. **تداخل برنامه demo با Production:** `DEMO_ONLY` در fixture و seed، flag مشخص + test fail اگر منتشر شود.
5. **Content drift:** شناسه و نسخهٔ منتشرشده ثابت بماند؛ questionId عوض‌شده مجوز reuse score قدیمی ندهد.
6. **Guest privacy:** local data قابل حذف و فقط non-secret؛ هنگام ثبت حساب حتماً merge ack پایدار.
7. **مشکلات cross-device video resume:** server snapshot پیشرفت ویدیو، merge بازه‌های unique.

## تغییرات قابل تصمیم‌گیری حین توسعه
- مسیر دقیق ذخیره فایل‌های جدید، نام adapter، و انتخاب library پس از ADR.
- tokenهای جدید فقط با درخواست مرکزی و تأیید مالک؛ بدون کد رنگ پراکنده.
- آمار و dashboard غیراجباری نباید مانع بسته‌شدن vertical slice شوند.

## قالب کار ثبت مسئله
`ID | Requirement/Question | Product or Engineering | Impact | Assumption | Owner | Deadline/Gate | Resolution | Link-to-ADR`.
