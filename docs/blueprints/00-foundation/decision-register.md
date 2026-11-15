# Decision Register — SHISH MVP

**Truth labels:** `APPROVED` = explicit product-owner decision in discussion. `PROVISIONAL` = engineering proposal. `DEFERRED_QC` = deliberate visual deferral. **Do not infer approval from pre-existing prototype code.**

| ID | Status | Domain | Decision / exact operational meaning | Reference |
|---|---|---|---|---|
| DEC-001 | APPROVED | Program | ۶۰ درس زبان آلمانی با ویدیوهای حدود ۶ دقیقه‌ای و تمرین‌های مرتبط؛ تکرار چرخه تا درس بعد | Scope |
| DEC-002 | APPROVED | Cards | طراحی اختصاصی و interactive هر کارت در مرحله توسعه/QC نهایی می‌شود؛ در blueprint عملکرد و placeholder حداقلی کافی است | Design |
| DEC-003 | APPROVED | Progress | وزن و حدنصاب درس با default مشترک و override per lesson | Progress |
| DEC-004 | APPROVED | Progress | وزن باقی‌مانده پس از ویدیو به‌طور برابر میان تمرین‌های همان درس تقسیم شود | Progress |
| DEC-005 | APPROVED | Progress | پس از مشاهده کافی ویدیو سهم کامل آن یکجا اعمال شود | Playback |
| DEC-006 | APPROVED | Progress | مشاهده کافی = پخش واقعی حداقل ۸۰٪ بخش‌های زمانی **منحصربه‌فرد** ویدیو؛ Seek به پایان کافی نیست | Playback |
| DEC-007 | APPROVED | Progress | امتیاز تلاش کامل به نسبت پاسخ صحیح است، بهترین تلاش معتبر مبنای محاسبه است؛ آخرین تلاش جدا ذخیره/نمایش می‌شود | Progress |
| DEC-008 | APPROVED | Progress | نتیجه درس پس از تلاش کامل و احراز مشاهده ویدیو به‌روز شود؛ آستانه «آماده ادامه» مستقل از نقص تمرین‌ها | Progress |
| DEC-009 | APPROVED | Progress | بازشدن درس بعد پایدار است؛ تلاش بعدی ضعیف‌تر آن را دوباره قفل نمی‌کند | Progress |
| DEC-010 | APPROVED | Progress | باز شدن درس بعد بازخورد کوتاه + اقدام اختیاری «درس بعدی» دارد، بدون انتقال خودکار | Screen Flows |
| DEC-011 | APPROVED | Mistakes | دو مسیر: مرور سریع مستقل و بازگشت به تمرین اصلی | Mistakes |
| DEC-012 | APPROVED | Mistakes | مرور سریع فقط سؤال‌های غلط را نشان می‌دهد | Mistakes |
| DEC-013 | APPROVED | Mistakes | لیست اشتباهات زمانی از جدیدترین به قدیمی‌ترین است | Mistakes |
| DEC-014 | APPROVED | Mistakes | یک پاسخ صحیح معتبر در مرور سریع یا تمرین اصلی اشتباه را اصلاح می‌کند؛ همه تاریخچه‌ها حفظ می‌شوند | Mistakes |
| DEC-015 | APPROVED | Mistakes | امتیاز مرور: بهترین تلاش **کامل** مبنا و پاسخ درست مرور، سؤال‌های غلط آن تلاش را اصلاح می‌کند | Progress |
| DEC-016 | APPROVED | Mistakes | پس از مرور، نتیجه کوتاه + انتخاب «ادامه مرور» یا «بازگشت به محل قبلی» | Screen Flows |
| DEC-017 | APPROVED | Classroom | ۳ ناحیه اصلی: Header مجزا، Action Center و Dock شناور | App Shell |
| DEC-018 | APPROVED | Header | برند راست؛ جزایر glass مستقل چپ برای Streak، Mistakes، More؛ ۴ آیتم دقیق More: ظاهر و محیط کلاس، راهنما، گزارش مشکل، خروج از کلاس | App Shell |
| DEC-019 | APPROVED | Action Center | کارت‌های هم‌اندازه در track واحد با gap 6px؛ انتخاب فیزیکی از چپ به راست، حرکت پیشروی track به چپ، ماسک blur/fade ثابت؛ preview بعدی تا حدود ۳۰٪ در صورت فضا | App Shell |
| DEC-020 | APPROVED | Action Center | swipe/drag با snap حداکثر یک کارت در هر gesture، انتخاب مستقیم با dots/arrows؛ کارت قفل نیز قابل انتخاب است ولی فعالیت آن نه | App Shell |
| DEC-021 | APPROVED | Action Center | dots بالای کارت فعال، یک dot برای هر stage واقعی، هر dot قابل انتخاب؛ وضعیت آموزشی و انتخاب باید جدا باشند؛ پیکان‌ها پایین و راست، روی موبایل مخفی | App Shell |
| DEC-022 | APPROVED | Card Shell | سطوح روشن و تقریباً ماتِ soft digital paper؛ title بزرگ بالا راست؛ outer geometry ثابت در Focus؛ حالت موفقیت/نیازمند توجه accent ملایم و فعالیت قفل overlay دارد | Design |
| DEC-023 | APPROVED | Video | از پخش‌کننده آماده استفاده و custom می‌کنیم؛ پلیر تازه توسعه نمی‌دهیم؛ پوستر/تامنیل بخش اصلی کارت، ویدیو بالایی با inset پیشنهادی ۴px، progress زنده پایین | Playback/Design |
| DEC-024 | APPROVED | Dock | pill شیشه‌ای شناور در پایین؛ ترتیب فیزیکی چپ «مسیر من»، مرکز «کلاس»، راست «پروفایل»، active morph، حرکت صفحه نرم، کنترل back/scroll/keyboard | App Shell |
| DEC-025 | APPROVED | My Path | فهرست عمودی مرکزی ۶۰ درس با کارت‌های معمولی باریک، فشرده و اتصال نقطه‌ای؛ ترتیب نمایش از بالا ۶۰→۱ | Screen Flows |
| DEC-026 | APPROVED | My Path | درس فعلی = **جدیدترین درس بازشده** نه آخرین بازدید؛ به‌صورت شاخص‌تر از بقیه | Screen Flows |
| DEC-027 | APPROVED | My Path | ورود اول نزدیک درس فعلی، بازگشت restore scroll، انتخاب درس باز → ورود مستقیم کلاس | Screen Flows |
| DEC-028 | APPROVED | My Path | لمس درس قفل، همان آیتم را باز و علت + درس پیش‌نیاز را نشان دهد | Screen Flows |
| DEC-029 | APPROVED | My Path | Summary کوتاه «درس X از ۶۰»؛ هر آیتم شماره، عنوان کوتاه، وضعیت؛ علامت کوچک نیاز به تمرین | Screen Flows |
| DEC-030 | APPROVED | My Path | ناوبر نقطه‌ای عمودی کنار صفحه برای jump در فهرست، و کنترل «برو به درس من» هنگام دور شدن از موقعیت | Screen Flows |
| DEC-031 | APPROVED | Profile | نام و تصویر قابل ویرایش + خلاصه مسیر و ناوبری؛ بدون داشبورد پیشرفته | Screen Flows |
| DEC-032 | APPROVED | Auth | ورود با موبایل+رمز **یا** موبایل+OTP؛ بازیابی رمز از طریق OTP | Auth |
| DEC-033 | APPROVED | Guest | مهمان بدون حساب می‌تواند دروس رایگان را تجربه کند؛ درس ۱–۳ رایگان‌اند | Guest |
| DEC-034 | APPROVED | Onboarding | کاربر جدید معرفی خیلی کوتاه و دکمه «شروع درس اول» دارد؛ کاربر بازگشتی به آخرین فعالیت کلاس می‌رود | Screen Flows |
| DEC-035 | APPROVED | Guest Merge | انتقال خودکار پیشرفت مهمان برای حساب تازه، ادغام به حساب موجود **فقط با تأیید** | Auth |
| DEC-036 | APPROVED | Guest Prompt | پیشنهاد ثبت‌نام پس از پایان بخش سه‌درس رایگان؛ قبل از خرید حساب لازم است | Auth |
| DEC-037 | APPROVED | Commerce | خرید یک‌باره تمام دوره؛ صفحه پرداخت خارجی + برگشت به شیش، verify سروری | Commerce |
| DEC-038 | APPROVED | Architecture | Next.js 16 + Node.js/TypeScript + PostgreSQL، modular API-first؛ AI بیرونی از سرور؛ برنامه نصبی شاید بعداً | Architecture |
| DEC-039 | APPROVED | Content | فعلاً محتوا نمونه است؛ ۶۰ درس نهایی آماده نیست | Content |
| DEC-040 | APPROVED | Infra | زیرساخت استقرار انتخاب شده اما جزئیات به مستندساز ارائه نشده است | Blockers |
| DEC-041 | APPROVED | Progress Config | اعداد پیش‌فرض سهم ویدیو و حدنصاب فعلاً تعیین نشده‌اند؛ در توسعه نمونه config قابل تغییر استفاده شود | Progress |
| DEC-042 | APPROVED | Design | HeroUI v3 موجود با API اصلی و accessibility حفظ؛ توکن‌های موجود منبع؛ Liquid Glass برای controls مصوب؛ QC بصری پس از functional MVP | Design |
| DEC-043 | APPROVED | Persistence | در بازگشت به کلاس، پاسخ‌ها، پیشرفت، selected stage و موقعیت قابل بازیابی؛ بارگذاری «آخرین stage قابل اقدام» در بازگشت عادی به کلاس، نه لزوماً last visited | App Shell |

## مسائل ظاهری عمداً تصویب‌نشده
- طراحی هر نوع کارت تمرین، مقدار دقیق radius/blur/glow، پوستر lesson-specific، placement دقیق sticker و badge.
- UI جزئی header popover و Mistakes sheet؛ انیمیشن‌های نهایی morph و gesture.
- تعداد دقیق نقاطِ قابل نمایش Lesson Navigator در موبایل، search/filter مسیر.
- اینکه در fullscreen یا Focus کدام کنترل پیشرفته پلیر از package ارائه شود.

## مواردی که **تصمیم محصول محسوب نمی‌شوند**
- `VideoPlayer` قدیمی: `isStrict` و جریمه focus با بازگرداندن ۳۰ ثانیه.
- `CompletionCard` قدیمی: XP، پاداش صوتی و streak totals.
- ۷ پالت رنگی موجود: وجودشان دلیل فعال‌بودن هفت theme در MVP نیست.
- آمار پیش‌فرضِ کامل شدن تمرین‌های demo یا مدل تسلط هوشمند.

## تغییر تصمیم
برای تغییر هر `DEC-xxx`: سند PR یا Change Request با «تصمیم قبلی / تصمیم جدید / اثر روی داده/API/UI / تست / تأیید مالک» ایجاد شود. نسخه را افزایشی و مرجع مصرف‌کننده را به‌روز کنید؛ به‌صورت بی‌صدا تاریخچه را بازنویسی نکنید.
