# وضعیت فعلی پروژه شیش (SHISH / 6min) — گزارش ارزیابی فنی و معماری کدبیس

> **نوع سند:** ممیزی فنی و مستندسازی وضع موجود (Codebase Technical Snapshot & Architecture Audit)  
> **مسیر مخزن:** `d:\Projects\6min`  
> **تاریخ بازرسی:** ۱۵ نوامبر ۲۰۲۶ (۲۴ آبان ۱۴۰۵)  
> **روش ارزیابی:** بازرسی استاتیک عمیق کد، تحلیل وابستگی‌ها و اجرای فرامین غیراختلالی تایید سلامت  
> **هدف:** ارائه مبنای فنی دقیق و مبتنی بر شواهد از آنچه **امروز وجود دارد** جهت تدوین بلوپرینت‌های آینده MVP  

---

## ۱. چکیده مدیریتی (Executive Summary)

### ۱.۱. مرحله توسعه فعلی
پروژه در حال حاضر در مرحله **نمونه اولیه پیشرفته فرانت‌اند (Advanced Frontend Prototype / UI Workbench Stage)** قرار دارد. اگرچه بخش‌های متعددی از رابط کاربری و تعاملات آموزشی به صورت کارت‌های ایزوله توسعه یافته‌اند، اما معماری پلتفرم هنوز یک سیستم کامل و متصل به بک‌اند نیست، بلکه یک برنامه کلاینت‌محور با تمرکز بر تعاملات انیمیشنی، ماشین‌های وضعیت متناهی (FSM) کلاینتی و یک استودیوی اختصاصی بازرسی کامپوننت‌ها (UI Sandbox) است.

### ۱.۲. معماری موجود برنامه
معماری پروژه مبتنی بر **Next.js 16 (App Router)** با کامپوننت‌های سمت کلاینت (`"use client"`) است. تقریباً ۱۰۰٪ منطق تعاملی در لایه کلاینت اجرا می‌شود. لایه‌بندی به روش طراحی اتمیک (Atomic Design) سازماندهی شده و شامل اتم‌ها (`components/atoms`)، مولکول‌ها (`components/molecules`)، ارگانیسم‌ها (`components/organisms`) و بخش استودیو سندباکس (`components/sandbox`) است.

### ۱.۳. فناوری‌های اصلی
- **هسته فریم‌ورک:** Next.js 16.2.6، React 19.2.6، TypeScript 5.6.3
- **کتابخانه کامپوننت:** HeroUI v3 (نسخه 3.2.4 با معماری کامپوننت‌های ترکیبی Compound Components)
- **موتور استایل‌دهی:** Tailwind CSS v4.1.11 همراه با `@tailwindcss/postcss`
- **تایپوگرافی و فونت:** وب‌فونت متغیر ایران‌یکان X متغیر (`IRANYekanXVF`) با ویژگی‌های OpenType راست‌چین و ارقام فارسی
- **آیکون‌ها:** تلفیق دوتایی از `@solar-icons/react` و `lucide-react`
- **صدا و چندرسانه‌ای:** سنتز صوتی بومی مرورگر با Web Audio API و پخش صوتی تحت وب

### ۱.۴. قابلیت‌های عمده پیاده‌سازی‌شده
- **صفحه کلاس درس (`app/page.tsx`):** چیدمان اسکرول افقی ۵ کارت آموزشی با افکت Progressive Blur و هدایت پیوسته کارت به کارت.
- **ماشین‌های وضعیت متناهی تمرین‌ها (Exercise FSMs):**
  - کارت تطبیق واژگان (`VocabularyCard` + `useVocabularyFsm`) با شافل دوطرفه و ارزیابی خطا.
  - کارت پازل کلمات و گرامر (`GrammarCard` + `useGrammarFsm`) با کلمات گمراه‌کننده (Distractors) و اعتبارسنجی چیدمان.
  - کارت املای سریع صوتی (`DictationCard` + `useDictationFsm`) با الگوریتم فاصله لون‌اشتاین (Levenshtein Distance) برای تشخیص خطاهای تایپی جزئی (Typo).
  - کارت تلفظ و شنیداری (`PronunciationCard` + `usePronunciationFsm`) با دریافت استریم میکروفون، آنالایزر فرکانسی و اتصال به Web Speech API.
  - کارت پایان درس و پاداش (`CompletionCard` + `useCompletionFsm`) با سنتز آکورد صوتی از طریق Web Audio API و انیمیشن شمارنده اعداد.
- **استودیو سندباکس کامپوننت‌ها (`app/sandbox`):** محیط کامل توسعه و آزمایش کامپوننت‌ها با قابلیت تغییر ویوپورت (Mobile/Tablet/Desktop)، سوییچ پالت‌های رنگی هفت‌گانه برندی، دستکاری زنده پراپ‌ها و اینسپکتور تعاملی ابعاد به سبک Figma.

### ۱.۵. قابلیت‌های عمده ناقص یا غایب
- **بک‌اند و سرویس‌های سرور:** هیچ مسیر API (`app/api`)، سرور اکشن (`"use server"`) یا سرویس ذخیره‌سازی ابری وجود ندارد.
- **پایگاه داده و پایداری داده‌ها:** دیتابیس، ORM (مانند Prisma/Drizzle) و مدل‌های ذخیره‌سازی سمت سرور کاملاً غایب هستند. داده‌های پیشرفت درس پس از رفرش صفحه پاک می‌شوند.
- **احراز هویت و مدیریت کاربران:** کامپوننت ورود (`PhoneLogin`) صرفاً یک فرم کلاینتی ساده با اعتبارسنجی Regex شماره موبایل ایران است؛ هیچ مرحله ارسال OTP، نشست کاربری (Session/JWT) یا پروفایل واقعی وجود ندارد.
- **سیستم‌های کلیدی محصول:** مرکز اقدام (Action Center)، ناوبری پایین (Bottom Navigation)، نقشه یادگیری (My Path)، مرور اشتباهات و جعبه لایتنر (Mistake Review)، تجربه مهمان (Guest Mode) و سیستم خرید/پرداخت (Commerce) وجود خارجی ندارند.
- **پخش ویدیو:** هیچ ویدیو پلیر استریم واقعی یا اتصال به کتابخانه‌های ویدیو پلیر وجود ندارد. کامپوننت `VideoPlayer` و `VideoCard` هر دو پیشرفت ویدیو را با تایمرهای مصنوعی (`setInterval`) شبیه‌سازی می‌کنند.

### ۱.۶. آمادگی بک‌اند و پایداری داده
**صفر درصد (Not Ready)**. هیچ زیرساختی برای ذخیره‌سازی سمت سرور، احراز هویت توکن‌محور، مدیریت سشن، اتصال به درگاه پرداخت یا پایگاه داده رابطه‌ای/غیررابطه‌ای در مخزن وجود ندارد.

### ۱.۷. ارزیابی کلی آمادگی جهت توسعه MVP
کدبیس فعلی پایه‌ای غنی و باکیفیت از منظر کامپوننت‌های تعاملی UI، سیستم دیزاین منطبق بر Tailwind CSS v4 و تایپوگرافی فارسی، و منطق ماشین وضعیت کلاینتی برای ۴ نوع تمرین آموزشی فراهم کرده است. با این حال، به دلیل فقدان کامل لایه بک‌اند، پایگاه داده، احراز هویت، و بخش‌های هویتی محصول (Action Center، My Path، Bottom Navigation)، پروژه هنوز در فاز پروتوتایپ کامپوننت‌ها قرار داشته و برای تبدیل به MVP نیازمند طراحی و پیاده‌سازی معماری داده، بک‌اند، احراز هویت و ناوبری جامع است.

---

## ۲. نمای کلی مخزن (Repository Overview)

### ۲.۱. ساختار مخزن
- **مسیر ریشه مخزن:** `d:\Projects\6min`
- **نوع معماری:** تک‌برنامه مستقل (Single Application) بر پایه Next.js؛ مونو‌ریپو نیست و هیچ تنظیمات ورکسپیسی (مانند `pnpm-workspace.yaml` یا Turborepo) ندارد.
- **مدیر بسته‌ها:** `npm` (وجود فایل قفل `package-lock.json` به حجم ۲۷۲ کیلوبایت و تنظیمات `.npmrc`).
- **کنترل نسخه (Git):** مخزن محلی فعال روی شاخه `main` متصل به ریموت `https://github.com/SHIRO-STUDIOX/6min.git` با آخرین کامیت ثبت‌شده `7a82ac0 classroom added`.

### ۲.۲. فایل‌های پیکربندی اصلی
| نام فایل | نقش و کاربرد در مخزن |
| :--- | :--- |
| `package.json` | تعریف مشخصات بسته (`name: "next-app-template"`), اسکریپت‌ها و وابستگی‌های پروژه |
| `package-lock.json` | نسخه دقیق وابستگی‌های نصب‌شده قفل‌شده با npm |
| `tsconfig.json` | پیکربندی TypeScript با ماژول باندلر، مسیرهای مستعار (`@/* -> ./*`) و تارگت ES5 |
| `next.config.mjs` | پیکربندی پیش‌فرض Next.js بدون تنظیمات سفارشی خاص |
| `postcss.config.mjs` | پیکربندی افزونه `@tailwindcss/postcss` برای Tailwind CSS v4 |
| `eslint.config.mjs` | پیکربندی فلت کانفیگ ESLint 9 با استفاده از `@eslint/eslintrc` FlatCompat |
| `.npmrc` | تنظیمات بسته با فلگ `engine-strict=true` |
| `.gitignore` | نادیده گرفتن `node_modules`، `.next`، لاگ‌ها و متغیرهای محلی |
| `mcp_config.json` | تنظیمات ابزارهای پروتکل MCP برای توسعه در محیط ایجنت |
| `skills-lock.json` | قفل نسخه‌های اسکیل‌های توسعه هوش مصنوعی |

### ۲.۳. مستندات موجود در مخزن
- `README.md`: فایل راهنمای قالب اولیه HeroUI (`next-app-template`) بدون مستندات اختصاصی پروژه ۶دقیقه.
- `Project.md`: مستند تحلیلی مفصل و تاریخی پروژه به تاریخ ۲۰۲۶-۰۸-۳۱ که معماری سندباکس و وضعیت قبلی را شرح داده است.
- `Workflow.md`: راهنمای توسعه کامپوننت‌های اتمیک بر پایه HeroUI v3 و ثبت آن‌ها در استودیو سندباکس.
- `AGENTS.md` / `CLAUDE.md`: راهنماها و قوانین ایجنت برای کار با کامپوننت‌های HeroUI v3 و استایل‌ها.
- `LICENSE`: مجوز متن‌باز نرم‌افزار (MIT License).

### ۲.۴. اسکریپت‌های پروژه در `package.json`
- `npm run dev`: اجرای سرور توسعه روی پورت سفارشی `next dev -p 6006`
- `npm run sandbox`: اسکریپت هم‌ارز برای اجرای محیط روی پورت ۶۰۰۶ (`next dev -p 6006`)
- `npm run build`: اجرای بیلد بهینه‌سازی شده تجاری (`next build`)
- `npm run start`: اجرای بیلد نهایی سمت سرور (`next start`)
- `npm run lint`: اجرای بازرسی و اصلاح کد با لینتر (`eslint --fix`) — *توجه: اجرای آن با خطا مواجه می‌شود (به بخش آزمون و کیفیت مراجعه شود)*

### ۲.۵. ساختار دایرکتوری‌های پروژه
```text
d:/Projects/6min/
├── app/                                    # روت‌ها و صفحات Next.js App Router
│   ├── layout.tsx                          # لی‌اوت ریشه با راست‌چین، تم پیش‌فرض و متادیتا
│   ├── page.tsx                            # روت اصلی: کلاس درس و اسکرول کارت‌ها
│   ├── providers.tsx                       # کانتکست‌های NextThemesProvider و I18nProvider
│   ├── error.tsx                           # مرز خطای صفحه (Error Boundary)
│   └── sandbox/                            # ماژول استودیو سندباکس
│       ├── page.tsx                        # صفحه اصلی استودیو سندباکس کامپوننت‌ها
│       └── preview/                        # روت پیش‌نمایش ایزوله کامپوننت‌ها
│           └── page.tsx
├── components/                             # کامپوننت‌های پروژه بر اساس معماری اتمیک
│   ├── atoms/                              # اتم‌های بصری پایه
│   │   └── stage-dot.tsx                   # دات نشانگر موقعیت مراحل (۶ پیکسلی)
│   ├── molecules/                          # مولکول‌ها و ساختارهای ترکیبی
│   │   ├── base-card.tsx                   # کانتینر مشترک کارت‌های آموزشی (۵۰۰px)
│   │   └── StageIndicator/                 # نشانگر کپسولی ۵ مرحله‌ای کلاس درس
│   │       ├── index.ts
│   │       ├── stage-indicator.tsx
│   │       └── types.ts
│   ├── organisms/                          # ارگانیسم‌ها و بخش‌های تعاملی مستقل
│   │   ├── completion-card.tsx             # کارت پایان درس و پاداش با انیمیشن و صوت
│   │   ├── dictation-card.tsx              # کارت املای سریع صوتی با سنجش Typo
│   │   ├── floating-header.tsx             # هدر شناور شیشه‌ای با منوی پروفایل
│   │   ├── grammar-card.tsx                # کارت پازل کلمات و گرامر با کلمات انحرافی
│   │   ├── phone-login.tsx                 # فرم مینیمال ورود با شماره موبایل
│   │   ├── pronunciation-card.tsx          # کارت تلفظ و شنیداری با ضبط میکروفون
│   │   ├── video-card.tsx                  # کارت پخش ویدیو ویژه کلاس درس
│   │   ├── video-player.tsx                # ارگانیسم کامل ویدیو پلیر با سنسور تمرکز
│   │   └── vocabulary-card.tsx             # کارت تطبیق دوطرفه واژگان تخصصی
│   └── sandbox/                            # ماژول‌های فنی و UI استودیو سندباکس
│       ├── sandbox-canvas.tsx              # بوم مرکزی رندر کامپوننت با تغییر ابعاد درگ
│       ├── sandbox-context.tsx             # مدیریت استیت سراسری سندباکس و LocalStorage
│       ├── sandbox-controls.tsx            # پنل دستکاری پویا و پریست‌های پراپ‌ها
│       ├── sandbox-header.tsx              # نوار ابزار بالا، پالت رنگ، زوم و ویوپورت
│       ├── sandbox-inspect-drawer.tsx      # دراور پایینی بازرسی کد و کپی JSX
│       ├── sandbox-inspector-overlay.tsx   # اینسپکتور تعاملی ابعاد و فواصل سبک فیگما
│       ├── sandbox-registry.tsx            # رجیستری متادیتا، پراپ‌ها و رندر کامپوننت‌ها
│       ├── sandbox-sidebar-catalog.tsx     # سایدبار کاتالوگ و نشان‌گذاری علاقه‌مندی‌ها
│       └── sandbox-types.ts                # تعاریف تایپ‌های داده سندباکس
├── config/                                 # پیکربندی‌های عمومی برنامه
│   ├── fonts.ts                            # تعاریف استفاده‌نشده فونت‌های Inter / Fira Code
│   └── site.ts                             # متادیتای سایت، عناوین و لینک‌های ناوبری
├── hooks/                                  # هوک‌های تعاملی و ماشین‌های وضعیت
│   ├── use-completion-fsm.ts               # ماشین وضعیت کارت پاداش و پایان درس
│   ├── use-dictation-fsm.ts                # ماشین وضعیت کارت دیکته صوتی با لون‌اشتاین
│   ├── use-grammar-fsm.ts                  # ماشین وضعیت کارت پازل ساختار جمله
│   ├── use-pronunciation-fsm.ts            # ماشین وضعیت کارت تلفظ، ضبط و Speech API
│   ├── use-reward-audio.ts                 # هوک سنتز صوتی پیروزی با Web Audio API
│   └── use-vocabulary-fsm.ts               # ماشین وضعیت کارت تطبیق واژگان
├── public/                                 # فایل‌های استاتیک عمومی
│   ├── favicon.ico
│   └── fonts/                              # فایل‌های فونت رسمی ایران‌یکان X
│       ├── IRANYekanXVF.woff
│       ├── IRANYekanXVF.woff2
│       └── staticfonts/
│           ├── IRANYekanX-Bold.woff
│           └── IRANYekanX-Regular.woff
├── styles/                                 # استایل‌های سراسری
│   └── globals.css                         # پیکربندی Tailwind v4، فونت متغیر، تم‌ها و گلاس
└── types/                                  # تعاریف تایپ‌های مشترک دامنه
    ├── completion.ts                       # تایپ‌های کارنامه، پاداش و استریک
    ├── dictation.ts                        # تایپ‌های پرامپت‌ها و نتایج دیکته صوتی
    ├── grammar.ts                          # تایپ‌های توکن‌ها، جملات و ارزیابی گرامر
    ├── index.ts                            # اکسپورت تجمیعی تایپ‌ها و SVGProps
    └── pronunciation.ts                    # تایپ‌های واژگان صوتی و ارزیابی تلفظ
```

---

## ۳. پشته فناوری (Technology Stack)

جدول جامع فناوری‌های نصب‌شده و شواهد به‌کارگیری آن‌ها در کدبیس:

| فناوری | نسخه | هدف و کاربرد | شواهد استفاده در کد | وضعیت در مخزن |
| :--- | :--- | :--- | :--- | :--- |
| **Next.js** | `16.2.6` | فریم‌ورک فول‌استک وب (App Router) | فراخوانی در `app/layout.tsx`, `app/page.tsx`, `package.json` | پیاده‌سازی شده |
| **React** | `19.2.6` | هسته کامپوننت‌های رابط کاربری | فراخوانی در تمام کامپوننت‌های `components/` با هوک‌های مدرن | پیاده‌سازی شده |
| **TypeScript** | `5.6.3` | کنترل ایستای نوع داده‌ها | وجود تعاریف جامع در `types/` و پاس شدن بیلد `tsc` | پیاده‌سازی شده |
| **HeroUI React** | `3.2.4` | کامپوننت‌های آماده رابط کاربری (v3) | استفاده از `Button`, `Card`, `Chip`, `TextField`, `ProgressBar` در تمام ارگانیسم‌ها | پیاده‌سازی شده |
| **HeroUI Styles** | `3.2.4` | تعاریف پایه و توکن‌های استایل HeroUI | فراخوانی `@import "@heroui/styles";` در `styles/globals.css` | پیاده‌سازی شده |
| **Tailwind CSS** | `4.1.11` | موتور استایل‌دهی یوتیلیتی-محور v4 | فراخوانی `@import "tailwindcss";` در `styles/globals.css` | پیاده‌سازی شده |
| **@tailwindcss/postcss** | `4.1.11` | پلاگین کامپایلر PostCSS برای Tailwind v4 | تنظیم در `postcss.config.mjs` | پیاده‌سازی شده |
| **next-themes** | `0.4.6` | مدیریت تغییر تم تاریک و روشن | فراخوانی در `app/providers.tsx` و `floating-header.tsx` | پیاده‌سازی شده |
| **@solar-icons/react** | `^2.1.0` | آیکون‌های خطی و بولد سبک Solar | استفاده در `base-card.tsx`, `video-card.tsx`, `completion-card.tsx` | پیاده‌سازی شده |
| **lucide-react** | `^1.31.0` | آیکون‌های مدرن Lucide | استفاده در `video-player.tsx`, `floating-header.tsx`, کارت‌های تمرین | پیاده‌سازی شده |
| **clsx** | `2.1.1` | ترکیب کلاس‌های شرطی استایل | استفاده در `app/layout.tsx` | پیاده‌سازی شده |
| **tailwind-variants** | `3.3.0` | ساخت واریانت‌های استایل تایپ‌سیف | در `devDependencies` قرار دارد اما در هیچ کامپوننتی ایمپورت نشده | نصب‌شده اما بلااستفاده |
| **intl-messageformat** | `10.7.16` | قالب‌بندی پیام‌های چندزبانه ICU | در `dependencies` قرار دارد اما در هیچ فایلی استفاده مستقیم نشده | نصب‌شده اما بلااستفاده |
| **Web Audio API** | Native Browser | سنتز نوای صوتی پاداش و فایر استریک | استفاده کامل در `hooks/use-reward-audio.ts` با Oscillator و Gain | پیاده‌سازی شده |
| **Web Speech API** | Native Browser | تشخیص گفتار در مرورگرهای سازگار | شواهد پیاده‌سازی SpeechRecognition در `hooks/use-pronunciation-fsm.ts` | تا حدی پیاده‌سازی شده (فال‌بک شبیه‌سازی دارد) |
| **MediaRecorder API** | Native Browser | ضبط صدای کاربر از طریق میکروفون | استفاده در `hooks/use-pronunciation-fsm.ts` برای نمونه‌برداری صوت | پیاده‌سازی شده |
| **ESLint** | `9.25.1` | کنترل کیفیت و صحت کد | تنظیمات در `eslint.config.mjs` | شکسته (دارای خطای پیکربندی) |
| **کتابخانه ویدیو پلیر** | — | پلیر اختصاصی (مانند Video.js, Plyr) | هیچ پکیجی در `package.json` وجود ندارد | پیاده‌سازی نشده |
| **دیتابیس و ORM** | — | ذخیره‌سازی داده‌ها (Prisma/Drizzle) | هیچ پکیجی در وابستگی‌ها وجود ندارد | پیاده‌سازی نشده |
| **فریم‌ورک تست** | — | تست خودکار (Jest/Vitest/Playwright) | هیچ پکیجی در وابستگی‌ها وجود ندارد | پیاده‌سازی نشده |
| **مدیریت وضعیت سراسری** | — | ریداکس، Zustand یا Jotai | هیچ پکیجی نصب نشده؛ از React Context محلی استفاده شده | پیاده‌سازی نشده |

---

## ۴. معماری برنامه (Application Architecture)

### ۴.۱. روتینگ و ساختار App Router
برنامه بر اساس **Next.js 16 App Router** سازماندهی شده است. کلیه روت‌ها داخل پوشه `app/` قرار دارند:
- هیچ Route Group (مانند `(marketing)` یا `(dashboard)`) در پروژه تعریف نشده است.
- ساختار صفحات کاملاً تخت است (`app/page.tsx` و `app/sandbox/page.tsx` و `app/sandbox/preview/page.tsx`).
- روت‌های داینامیک (مانند `app/lessons/[id]/page.tsx`) وجود ندارند.

### ۴.۲. تفکیک Server Components و Client Components
- **Client Components:** تقریباً تمامی کامپوننت‌های معنادار برنامه دارای دستور `"use client"` هستند (`app/page.tsx`, `app/providers.tsx`, `app/error.tsx`, تمام فایل‌های `components/` و تمام فایل‌های `hooks/`).
- **Server Components:** تنها کامپوننت سروری واقعی پروژه، روت لی‌اوت ریشه `app/layout.tsx` است که تگ‌های اولیه HTML، تزریق وب‌فونت و کانتکست‌های کلاینتی را فراهم می‌سازد.

### ۴.۳. سلسله‌مراتب لی‌اوت و فراهم‌کننده‌ها (Layout & Providers)
سلسله‌مراتب کامپوننت‌ها در سطح برنامه:
```text
RootLayout (app/layout.tsx - Server)
└── <html> (dir="rtl", lang="fa")
    └── <body> (font-sans, bg-background, text-foreground)
        └── Providers (app/providers.tsx - Client)
            └── NextThemesProvider (attribute="class", defaultTheme="dark")
                └── I18nProvider (locale="fa-IR-u-ca-persian")
                    └── {children} (ClassroomPage یا SandboxStudioPage)
```
*نکته فنی:* در `app/providers.tsx`، کدی برای فیلتر کردن هشدار محیط توسعه React 19 در ارتباط با تگ اسکریپت `next-themes` قرار داده شده است.

### ۴.۴. مدیریت وضعیت (State Management Approach)
هیچ کتابخانه مدیریت وضعیت خارجی (Redux, Zustand, TanStack Query) در پروژه وجود ندارد:
1. **وضعیت کاتالوگ سندباکس:** توسط React Context در `components/sandbox/sandbox-context.tsx` مدیریت شده و فهرست علاقه‌مندی‌ها در `localStorage` با کلید `heroui_sandbox_favs` ذخیره می‌شود.
2. **وضعیت تمرین‌ها و کارت‌ها:** هر کارت آموزشی به یک **ماشین وضعیت متناهی (Finite State Machine)** در لایه هوک (`hooks/use-*-fsm.ts`) مجهز است که با `useState` و `useCallback` ترنزیشن‌های دقیق وضعیتی را اعمال می‌کند.
3. **وضعیت کلاس درس:** در `app/page.tsx` وضعیت تعاملی به ارجاعات اسکرول افقی DOM (`useRef`) و کنترل پیمایش خلاصه شده است.

### ۴.۵. دریافت داده و اکشن‌های سمت سرور (Data Fetching & Server Actions)
- هیچ تماس `fetch()` به بک‌اند یا روت API وجود ندارد.
- هیچ Server Action (دستور `"use server"`) در پروژه نوشته نشده است.
- هیچ سرویس داده، ریپازیتوری (Repository Pattern) یا لایه یکپارچه دسترسی به داده وجود ندارد.
- تمام محتواها به شکل ثابت‌های محلی (`DEFAULT_*`) درون کدهای TypeScript ذخیره شده‌اند.

### ۴.۶. مرزهای خطا (Error Boundaries)
فایل `app/error.tsx` به عنوان مرز خطای کلاینتی تعریف شده که با دکمه HeroUI `Button` و فراخوانی متد `reset()`، بازنشانی صفحه را در صورت رخداد استثنا امکان‌پذیر می‌کند. علاوه بر آن، در استودیو سندباکس (`components/sandbox/sandbox-canvas.tsx`) یک کامپوننت داخلی کلاس‌محور `CanvasErrorBoundary` تعبیه شده تا کرش احتمالی یک کامپوننت، کل محیط سندباکس را متوقف نکند.

### ۴.۷. تفکیک لایه نمایش (UI) و منطق تجاری (Business Logic)
پروژه در تفکیک منطق کارت‌های تمرینی از لایه ارائه بصری بسیار خوب عمل کرده است:
- منطق تجاری هر کارت (تغییر وضعیت، ارزیابی، شمارش خطا، تایمرها، فاصله لون‌اشتاین، اتصال به میکروفون) به هوک‌های اختصاصی FSM در پوشه `hooks/` منتقل شده است.
- کامپوننت‌های نمایشی در `components/organisms/` صرفاً به عنوان مصرف‌کننده هوک عمل کرده و مسئولیت رندر المان‌های بصری را بر عهده دارند.
- با این وجود، به دلیل عدم وجود لایه API و کش سراسری، داده‌های خروجی FSMها پس از پایان تمرین به هیچ انباره پایداری ارسال نمی‌شوند.

---

## ۵. مسیرها و صفحات (Routes and Screens)

موجودی تمامی روت‌های کشف‌شده در برنامه:

| مسیر (Path) | فایل مبدأ | هدف و کارکرد | کامپوننت‌های اصلی | وضعیت در ناوبری | منبع داده | وضعیت پیاده‌سازی |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `app/page.tsx` | کلاس درس اصلی (اسکرول افقی ۵ کارت) | `VideoCard`, `VocabularyCard`, `GrammarCard`, `DictationCard`, `PronunciationCard` | روت اصلی برنامه؛ در `siteConfig` لینک شده | ثابت‌های هاردکد شده | **تا حدی پیاده‌سازی شده (UI و تعامل محلی)** |
| `/sandbox` | `app/sandbox/page.tsx` | استودیو سندباکس و آزمایشگاه کامپوننت‌ها | `SandboxHeader`, `SandboxSidebarCatalog`, `SandboxCanvas`, `SandboxControls`, `SandboxInspectDrawer` | لینک مستقیم در `siteConfig` و هدر سندباکس | ریجستری کامپوننت‌ها و `localStorage` | **پیاده‌سازی شده (کامل در اسکوپ سندباکس)** |
| `/sandbox/preview` | `app/sandbox/preview/page.tsx` | روت پیش‌نمایش مستقل و ایزوله هر کامپوننت | `Suspense`, تابع `getComponentById` | فراخوانی از طریق آی‌فریم و URL مستقیم | پارامترهای کوئری URL (`?id=...&brand=...`) | **پیاده‌سازی شده** |
| `/_not-found` | Built-in Next.js | صفحه خطای ۴۰۴ خودکار فریم‌ورک | کامپوننت خطای پیش‌فرض Next.js | خودکار هنگام روت‌های ناموجود | فریم‌ورک | **پیاده‌سازی شده** |

### مسیرهای مفقود، تک‌افتاده و پیش‌بینی‌نشده
1. **مسیرهای مفقود محصول:** روت‌های `/login`, `/auth`, `/path`, `/roadmap`, `/profile`, `/mistakes`, `/pricing` کاملاً مفقود هستند.
2. **کامپوننت‌های تک‌افتاده (Orphaned Components):**
   - کامپوننت `FloatingHeader` در هیچ صفحه‌ای از `app/` رندر نشده و صرفاً در سندباکس قابل مشاهده است.
   - کامپوننت `PhoneLogin` در هیچ روتی قرار نگرفته و صرفاً در سندباکس تست می‌شود.
   - کامپوننت `CompletionCard` (کارت پاداش و پایان درس) در روت کلاس درس (`app/page.tsx`) قرار داده نشده است.
   - مولکول `StageIndicator` (نشانگر مراحل ۵ تایی) در روت کلاس درس (`app/page.tsx`) استفاده نشده است.
   - ارگانیسم `VideoPlayer` (پلیر پیشرفته ۶۸۳ خطی) در هیچ صفحه‌ای لود نشده و به جای آن کارت سبک‌تر `VideoCard` در صفحه اصلی نشسته است.

---

## ۶. موجودی مؤلفه‌ها و قابلیت‌ها (Components and Features)

بررسی دقیق مؤلفه‌های موجود در سیستم و ارزیابی آن‌ها در ارتباط با حوزه‌های محصول SHISH:

| بخش محصول | فایل‌های کلیدی | رفتار و کارکرد فعلی | منبع داده | وضعیت | بخش‌های مفقود یا ناقص |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **کلاس درس (Classroom)** | `app/page.tsx`<br>`components/molecules/base-card.tsx` | چیدمان افقی ۵ کارت با `gap-[6px]`، پشتیبانی از اسکرول با چرخ ماوس، افکت Progressive Blur روی لبه راست، اسکرول متمرکز به کارت بعد | پراپ‌های هاردکد شده در `page.tsx` | تا حدی پیاده‌سازی شده | عدم بارگذاری داینامیک درس، عدم نمایش StageIndicator، نبود هدر و فوتر ناوبری |
| **هدر (Header)** | `components/organisms/floating-header.tsx` | هدر شناور شیشه‌ای با افکت `glass-rim`، نمایش برند و بج PRO، منوی پروفایل کشویی، سوییچ تم تاریک/روشن | پراپ‌های ورودی ماک | رابط کاربری ماک (UI Only) | در هیچ روتی رندر نشده؛ لینک‌ها به `#` اشاره دارند؛ منوی کاربری ماک است |
| **مرکز اقدام (Action Center)** | *هیچ فایلی وجود ندارد* | عملکردی تعریف نشده است | — | پیاده‌سازی نشده | به طور کامل در مخزن غایب است |
| **ناوبری مراحل (Stage Indicator)** | `components/molecules/StageIndicator/`<br>`components/atoms/stage-dot.tsx` | کپسول شناور شیشه‌ای با ۵ دات ۶ پیکسلی؛ تفکیک رنگ‌های سمنتیک (upcoming, active, success, warning, danger) و قابلیت کلیک روی مراحل حل‌شده | آرایه وضعیت‌های ورودی (`statuses`) | تا حدی پیاده‌سازی شده | در صفحه کلاس درس (`app/page.tsx`) متصل نشده و تنها در سندباکس ثبت است |
| **ناوبری پایین (Bottom Navigation)** | *هیچ فایلی وجود ندارد* | عملکردی تعریف نشده است | — | پیاده‌سازی نشده | به طور کامل در مخزن غایب است |
| **کارت ویدیو (Video Card)** | `components/organisms/video-card.tsx` | کارت مربعی ۵۰۰px با ابعاد ویدیو 16:9، شبیه‌سازی پخش با تایمر ۱ ثانیه‌ای، دکمه Play/Pause، ریست و نشان اتمام گام | تایمر مصنوعی با `setInterval` | تا حدی پیاده‌سازی شده (UI با تایمر ماک) | با تگ واقعی ویدیو یا استریم HLS/DASH کار نمی‌کند؛ به ارگانیسم `VideoPlayer` متصل نیست |
| **ویدیو پلیر (Video Player)** | `components/organisms/video-player.tsx` | پلیر شیشه‌ای ۶۸۳ خطی با زیرنویس دوزبانه، مد Strict (جلوگیری از پرش به جلو)، سنسور جریمه تمرکز (بازگشت ۳۰ ثانیه‌ای با تغییر تب)، پیش‌نمایش هاور | تایمر مصنوعی، آرایه `DEFAULT_SUBTITLES` | رابط کاربری ماک (UI Only) | فاقد تگ `<video>` است (از تگ `<img>` برای پوستر استفاده می‌کند)، در هیچ روتی لود نشده |
| **کارت واژگان (Vocabulary Card)** | `components/organisms/vocabulary-card.tsx`<br>`hooks/use-vocabulary-fsm.ts` | تطبیق ستونی کلمات انگلیسی و فارسی، پخش صوت کلمه، فیدبک سبز/قرمز، شافل خودکار | آرایه `DEFAULT_VOCABULARY_PAIRS` | پیاده‌سازی شده (کلاینتی) | فاقد ذخیره نتایج در سرور یا ارسال کلمات مشکل‌دار به لایتنر |
| **کارت گرامر (Grammar Card)** | `components/organisms/grammar-card.tsx`<br>`hooks/use-grammar-fsm.ts` | پازل چیدمان بلوک‌های کلمات جمله، انتخاب و حذف کلمات، بررسی درستی با شافل کلمات فریبنده (Distractors) | آرایه `DEFAULT_GRAMMAR_SENTENCES` | پیاده‌سازی شده (کلاینتی) | داده‌ها استاتیک هستند و خطاها در پروفایل کاربر ثبت دائمی نمی‌شوند |
| **کارت دیکته صوتی (Dictation Card)** | `components/organisms/dictation-card.tsx`<br>`hooks/use-dictation-fsm.ts` | پخش صوت کلمه/جمله، فیلد ورودی متن HeroUI، ارزیابی هوشمند با فاصله لون‌اشتاین، دکمه‌های درج کاراکتر خاص | آرایه `DEFAULT_DICTATION_PROMPTS` | پیاده‌سازی شده (کلاینتی) | فقدان اتصال به سرویس TTS اختصاصی؛ وابسته به آدرس Youdao دیکشنری |
| **کارت تلفظ (Pronunciation Card)** | `components/organisms/pronunciation-card.tsx`<br>`hooks/use-pronunciation-fsm.ts` | پخش صوت مرجع، اخذ دسترسی میکروفون، ضبط با MediaRecorder، نمایش سطح صدا با AnalyserNode، اعتبارسنجی با Web Speech API | آرایه `DEFAULT_PRONUNCIATION_ITEMS` | تا حدی پیاده‌سازی شده | وابستگی Web Speech API به مرورگرهای کرومیوم؛ ثبت دائمی صوت در سرور وجود ندارد |
| **کارت پایان درس و پاداش (Completion Card)** | `components/organisms/completion-card.tsx`<br>`hooks/use-completion-fsm.ts`<br>`hooks/use-reward-audio.ts` | انیمیشن شمارشگر XP و روزهای استریک، نواختن صدای پیروزی و آتش استریک با Web Audio API، آماده‌سازی پی‌لود ذخیره سرور | پراپ‌های ماک ورودی | تا حدی پیاده‌سازی شده | در صفحه کلاس درس رندر نشده؛ کال‌بک ذخیره سرور به بک‌اند واقعی وصل نیست |
| **مسیر من (My Path)** | *هیچ فایلی وجود ندارد* | وجود خارجی ندارد (تنها عنوان "نقشه یادگیری" در لینک هدر آمده) | — | پیاده‌سازی نشده | به طور کامل مفقود است |
| **پروفایل کاربری (Profile)** | `components/organisms/floating-header.tsx` | دراپ‌داون بصری نام کاربر، نقش و سطح در هدر شناور | متغیرهای ماک در هدر | رابط کاربری ماک (UI Only) | صفحه اختصاصی پروفایل، آمار کاربر، تاریخچه یادگیری وجود ندارد |
| **مرور اشتباهات (Mistake Review)** | `types/completion.ts`<br>`types/dictation.ts` | در تایپ‌ها آرایه‌های `flaggedWords` و `mistakenPromptIds` تعریف شده‌اند | — | پیاده‌سازی نشده | هیچ صفحه، کامپوننت، یا موتور تکرار بافاصله‌ای (Spaced Repetition) ساخته نشده است |
| **ورود و احراز هویت (Login / Auth)** | `components/organisms/phone-login.tsx` | فیلد ورودی شماره موبایل با اعتبارسنجی فرمت ایران (`09...`)، تبدیل ارقام فارسی به انگلیسی | وضعیت فرم محلی | رابط کاربری ماک (UI Only) | فقدان فیلد OTP، عدم ارسال SMS، عدم اتصال به سرویس احراز هویت، عدم رندر در روت |
| **تجربه مهمان (Guest Experience)** | *هیچ فایلی وجود ندارد* | عملکردی تعریف نشده است | — | پیاده‌سازی نشده | به طور کامل مفقود است |
| **تجارت و پرداخت (Commerce / Purchase)** | `components/organisms/floating-header.tsx` | تنها یک لینک "اشتراک PRO" با آیکون کارت اعتباری و `href="#"` در هدر شناور | — | پیاده‌سازی نشده | هیچ مدل، درگاه، فاکتور یا منطق اشتراکی پیاده‌سازی نشده است |
| **تنظیمات و کنترل ظاهر (Settings)** | `app/providers.tsx`<br>`styles/globals.css` | سوییچ تم تاریک و روشن با `next-themes` و انتخاب ۷ پالت رنگی oklch در سندباکس | `next-themes` و استایل‌های oklch | تا حدی پیاده‌سازی شده | سوییچ رنگ برندی تنها در سندباکس با اتریبیوت `data-brand` کار می‌کند و در اپ اصلی اعمال نشده |

---

## ۷. سیستم طراحی فعلی (Current Design System)

### ۷.۱. پیکربندی استایل‌ها و معماری CSS
- استایل‌دهی بر پایه **Tailwind CSS v4** پیاده‌سازی شده است. در این نسخه فایل سنتی `tailwind.config.js` حذف شده و تنظیمات مستقیماً در `styles/globals.css` با دستور `@import "tailwindcss";` و دایرکتیوهای `@theme` و `@layer` تعریف شده‌اند.
- استایل‌های مؤلفه‌های HeroUI v3 از طریق `@import "@heroui/styles";` فراخوانی می‌شوند.
- واریانت تاریک به صورت صریح تعریف شده است: `@custom-variant dark (&:is(.dark *));`.

### ۷.۲. تایپوگرافی و پیکربندی فونت
- **فونت اصلی برنامه:** وب‌فونت متغیر **ایران‌یکان X متغیر (`IRANYekanXVF`)** است که در `styles/globals.css` با وزن‌های ۱۰۰ تا ۱۰۰۰ بارگذاری شده است:
  ```css
  @theme {
    --font-sans: "IRANYekanXVF", "IRANYekanX", tahoma, sans-serif;
    --font-mono: "IRANYekanXVF", monospace;
  }
  ```
- **فونت‌های پشتیبان استاتیک:** فایل‌های `IRANYekanX-Regular.woff` و `IRANYekanX-Bold.woff` در مسیر `/fonts/staticfonts/` به عنوان فال‌بک تعریف شده‌اند.
- **بهینه‌سازی فارسی و اعداد:**
  - فعال‌سازی سراسری فیچر OpenType برای اعداد فارسی: `font-feature-settings: "ss02"` روی تگ‌های `:root, body`.
  - کلاس اختصاصی `.font-tabular` با فعال‌سازی `"ss02", "ss03"` و `font-variant-numeric: tabular-nums` جهت تراز اعداد در تایمرها، شمارنده‌ها و جدول‌ها.
  - استثنا برای فیلدهای LTR: در فیلدهای `input[type="email"]`, `input[type="password"]`, `input[type="tel"]`, `input[type="url"]`, `[dir="ltr"]` ویژگی `font-feature-settings: normal;` فعال شده تا ارقام و کاراکترها در حالت انگلیسی استاندارد نمایش داده شوند.
- **کد مرده فونت:** فایل `config/fonts.ts` فونت‌های گوگل `Inter` و `Fira_Code` را ایمپورت کرده، اما در هیچ‌کجای برنامه استفاده نشده‌اند.

### ۷.۳. پالت رنگی برندی HeroUI (بر پایه فضای رنگی OKLCH)
پروژه مجهز به ۷ پالت رنگی برندی است که بر روی سلکتورهای `[data-brand="..."]` در لایه پایه `styles/globals.css` تعریف شده‌اند:
1. `default`: `--primary: oklch(0.58 0.22 260);` (آبی متمایل به بنفش استاندارد HeroUI)
2. `emerald`: `--primary: oklch(0.65 0.20 155);` (سبز زمردی)
3. `indigo`: `--primary: oklch(0.58 0.23 275);` (نیلی)
4. `violet`: `--primary: oklch(0.60 0.25 300);` (بنفش)
5. `amber`: `--primary: oklch(0.75 0.18 65);` (کهربایی)
6. `rose`: `--primary: oklch(0.62 0.24 15);` (رز)
7. `cyan`: `--primary: oklch(0.70 0.16 210);` (فیروزه‌ای)

هر پالت رنگی متغیرهای `--accent`, `--accent-foreground`, `--primary`, `--primary-foreground`, `--focus`, `--link` را بازتعریف می‌کند.

### ۷.۴. متغیرهای رنگی سمنتیک HeroUI
کامپوننت‌ها به توکن‌های سمنتیک پیش‌فرض HeroUI وابسته‌اند:
- سطوح: `bg-background`, `bg-surface`, `bg-surface-secondary`, `bg-content1`, `bg-content2`
- متون: `text-foreground`, `text-muted`
- جداکننده‌ها: `border-separator`, `border-divider`
- فیدبک‌ها: `bg-success`, `bg-warning`, `bg-danger`, `text-success`, `text-warning`, `text-danger`

### ۷.۵. پیاده‌سازی Liquid Glass و افکت‌های بصری شیشه‌ای
1. **Specular Glass Rim (`.glass-rim`):** یک کلاس کاربردی در `styles/globals.css` که با استفاده از شبه‌المان `::before`، گرادیانت خطی با اوپسیتی نزولی و ماسک کامپوزیت (`mask-composite: exclude` یا `-webkit-mask-composite: xor`)، بازتاب نوری درخشان در لبه‌های بالایی کانتینر شیشه‌ای ایجاد می‌کند. این افکت در `FloatingHeader` و دکمه‌های Play شیشه‌ای استفاده شده است.
2. **Progressive Blur:** در روت کلاس درس (`app/page.tsx`) روی لبه سمت راست ناحیه اسکرول، با تلفیق `backdropFilter: blur(16px)` و `maskImage: linear-gradient(...)` افکت محو تدریجی بدون مسدودسازی رویدادهای ماوس (`pointer-events-none`) پیاده‌سازی شده است.
3. **Corner Smoothing سبک iOS:** کلاس‌های `.rounded-ios-player` و `.ios-radius-player` با ویژگی `corner-smoothing: 60%` و `-webkit-corner-smoothing: 0.6` جهت ایجاد انحنای نرم اسکوارکل (Squircle) در ویدیو پلیر تعریف شده‌اند.

### ۷.۶. قراردادهای هندسی و فاصله‌گذاری
- ابعاد استاندارد کارت‌ها در `BaseCard`: دقیقاً `max-w-[500px]` با نسبت ابعاد مربعی `aspect-square`.
- فاصله بین کارت‌ها در کلاس درس: دقیقاً ۶ پیکسل (`gap-[6px]`).
- اندازه دات‌های نشانگر مرحله در `StageDot`: دقیقاً ۶ پیکسل (`size-1.5 = 6px`).
- ارتفاع هدر شناور در موبایل: دقیقاً ۴۲ پیکسل (`h-[42px]`).

### ۷.۷. دوگانگی و تناقض در آیکون‌گرافی
کدبیس به صورت همزمان از دو پکیج آیکون استفاده می‌کند:
- `@solar-icons/react`: استفاده برای آیکون‌های بولد و خطی مانند `RestartIcon`, `CheckCircleIcon`, `StarsIcon`, `PlayIcon`, `LockIcon`.
- `lucide-react`: استفاده برای آیکون‌های عمومی مانند `Volume2`, `AlertCircle`, `Sparkles`, `Mic`, `Headphones`.
در برخی فایل‌ها (نظیر `components/organisms/completion-card.tsx` و `components/organisms/dictation-card.tsx`) آیکون‌ها از هر دو کتابخانه در کنار هم فراخوانی شده‌اند که ناهماهنگی در ضخامت خطوط (Stroke Width) و سبک بصری ایجاد می‌کند.

---

## ۸. مدل‌های داده و تایپ‌ها (Data Models and Types)

بررسی تایپ‌ها و اینترفیس‌های موجود در کدبیس:

| نام مدل / تایپ | مسیر مبدأ | فیلدهای کلیدی | روابط با سایر مدل‌ها | مکانیزم پایداری | وضعیت در کد زمان اجرا |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GrammarToken` | `types/grammar.ts` | `id`, `text`, `isDistractor`, `orderIndex`, `metadata` | استفاده درون `GrammarSentence` | متغیر حافظه (In-Memory) | استفاده‌شده در `useGrammarFsm` و `GrammarCard` |
| `GrammarSentence` | `types/grammar.ts` | `id`, `targetSentence`, `tokens`, `distractors`, `translation`, `audioUrl`, `hint` | والد `GrammarToken` | متغیر حافظه | استفاده‌شده در ثابت `DEFAULT_GRAMMAR_SENTENCES` |
| `GrammarResult` | `types/grammar.ts` | `mistakeCount`, `totalSentences`, `completedSentences`, `accuracyPercentage`, `mistakenSentenceIds`, `completedAt` | خروجی کال‌بک `onComplete` | ارسال به رویداد | استفاده‌شده در خروجی FSM گرامر |
| `DictationPrompt` | `types/dictation.ts` | `id`, `audioUrl`, `targetText`, `acceptableVariants`, `hint`, `translation`, `specialCharacters` | داده ورودی هر مرحله دیکته | متغیر حافظه | استفاده‌شده در ثابت `DEFAULT_DICTATION_PROMPTS` |
| `DictationAttemptRecord` | `types/dictation.ts` | `promptId`, `userInput`, `targetText`, `isCorrect`, `hasTypoWarning`, `mistakes` | گزارش هر تلاش کاربر | متغیر حافظه | استفاده‌شده در هوک دیکته |
| `DictationResult` | `types/dictation.ts` | `mistakeCount`, `totalPrompts`, `completedPrompts`, `accuracyPercentage`, `flaggedWords`, `mistakenPromptIds`, `completedAt` | کارنامه اتمام دیکته | ارسال به رویداد | استفاده‌شده در خروجی FSM دیکته |
| `PronunciationItem` | `types/pronunciation.ts` | `id`, `text`, `phonetic`, `audioUrl`, `phonemeHighlight`, `mouthHint`, `translation`, `difficulty` | آیتم تمرین صوتی | متغیر حافظه | استفاده‌شده در ثابت `DEFAULT_PRONUNCIATION_ITEMS` |
| `PronunciationItemReport` | `types/pronunciation.ts` | `itemId`, `text`, `attempts`, `passed`, `forgiven`, `recognizedText` | ارزیابی هر واژه | متغیر حافظه | استفاده‌شده در تحلیل گزارش تلفظ |
| `PronunciationResult` | `types/pronunciation.ts` | `totalItems`, `completedItems`, `totalAttempts`, `forgivenCount`, `accuracyPercentage`, `itemsSummary`, `completedAt` | کارنامه پایانی تلفظ | ارسال به رویداد | استفاده‌شده در خروجی FSM تلفظ |
| `VocabularyPair` | `hooks/use-vocabulary-fsm.ts` | `id`, `source { text, subText, audioSrc }`, `target { text, subText }` | جفت واژگان متناظر | متغیر حافظه | استفاده‌شده در ثابت `DEFAULT_VOCABULARY_PAIRS` |
| `VocabularyResult` | `hooks/use-vocabulary-fsm.ts` | `mistakeCount`, `totalPairs`, `matchedCount`, `mistakenPairs`, `accuracyPercentage` | گزارش تطبیق واژگان | ارسال به رویداد | استفاده‌شده در خروجی FSM واژگان |
| `PerformanceSummary` | `types/completion.ts` | `totalScore`, `mistakeCount`, `timeSpentSeconds`, `accuracyPercentage` | خلاصه آماری عملکرد درس | متغیر حافظه | استفاده‌شده در کارت پایان درس |
| `StreakData` | `types/completion.ts` | `currentCount`, `isExtendedToday`, `previousCount` | اطلاعات استریک متوالی کاربر | متغیر حافظه | استفاده‌شده در کارت پاداش |
| `LessonCompletionPayload` | `types/completion.ts` | `lessonId`, `nextLessonId`, `performanceSummary`, `flaggedWords`, `streakData`, `completedAt` | پی‌لود همگام‌سازی سرور | ارسال به رویداد | تولید در `useCompletionFsm` برای ارسال سرور |
| `VideoSubtitle` | `components/organisms/video-player.tsx` | `id`, `sourceText`, `targetText`, `startTime`, `endTime` | زیرنویس دوزبانه ویدیو | متغیر حافظه | استفاده‌شده در `DEFAULT_SUBTITLES` |
| `SandboxComponent` | `components/sandbox/sandbox-types.ts` | `id`, `name`, `category`, `description`, `defaultProps`, `render`, `dependencies` | متادیتای رجیستری سندباکس | متغیر حافظه | استفاده‌شده در استودیو سندباکس |

### مدل‌های دامنه اصلی که کاملاً مفقود هستند
هیچ اینترفیس یا مدلی برای موارد زیر در کدبیس وجود ندارد:
- `User` و `UserProfile`
- `Lesson`, `Course`, `Topic`, `Chapter`
- `Mistake` یا مدل جعبه لایتنر (`LeitnerCard`, `ReviewQueue`)
- `GuestSession` یا مشخصات مهمان
- `Purchase`, `Invoice`, `PaymentTransaction`, `Subscription`
- `Permission` یا سطح دسترسی RBAC

---

## ۹. بک‌اند، APIها و پایداری داده (Backend, APIs, and Persistence)

### ۹.۱. معماری بک‌اند
**وجود ندارد**. در پروژه هیچ پوشه `app/api/` یا `pages/api/` و هیچ فریم‌ورک بک‌اند مستقلی (مانند NestJS، Express یا Fastify) تعریف نشده است.

### ۹.۲. اندپوینت‌های API و سرور اکشن‌ها
تعداد اندپوینت‌های API پیاده‌سازی‌شده در مخزن: **۰ (صفر)**.  
تعداد سرور اکشن‌های (`"use server"`) پیاده‌سازی‌شده در مخزن: **۰ (صفر)**.

### ۹.۳. اعتبارسنجی درخواست و پاسخ
هیچ لایه اعتبارسنجی اسکیما (مانند Zod Schema Validation برای APIها) در کدهای پروژه فعال نیست. اعتبارسنجی تنها محدود به بررسی‌های کلاینتی ساده است (مانند Regex شماره موبایل در `PhoneLogin` و نرمال‌سازی رشته‌ها در هوک‌های FSM).

### ۹.۴. پایگاه داده و ORM
هیچ فایل کانفیگی برای اتصال به دیتابیس (نظیر `prisma/schema.prisma`، `drizzle.config.ts` یا تنظیمات Mongoose) در مخزن وجود ندارد.

### ۹.۵. وضعیت استفاده از حافظه کلاینت (LocalStorage / Cookies / SessionStorage)
- **`sessionStorage`:** صفر بار استفاده شده است.
- **`document.cookie`:** صفر بار استفاده شده است.
- **`localStorage`:** در سراسر مخزن منحصراً در یک بخش استفاده شده است:
  - در فایل `components/sandbox/sandbox-context.tsx` (سطرهای ۱۴۶ و ۱۶۰) جهت ذخیره لیست شناسه‌های کامپوننت‌های علاقه‌مندی کاربر تحت کلید `"heroui_sandbox_favs"`.
  - همچنین پکیج `next-themes` به صورت خودکار مقدار تم را تحت کلید `"theme"` در LocalStorage نگه می‌دارد.
  - هیچ داده‌ای از پیشرفت دروس، عملکرد کاربر یا لاگین در LocalStorage ذخیره نمی‌شود.

### ۹.۶. پایداری سمت سرور (Server-Side Persistence)
در فایل `hooks/use-completion-fsm.ts`، تابع `handleProceedNext` پی‌لود کاملی تحت عنوان `LessonCompletionPayload` می‌سازد و کال‌بک `onCompleteLesson(payload)` را صدا می‌زند:
```typescript
if (onCompleteLesson) {
  try {
    Promise.resolve(onCompleteLesson(completionPayload)).catch((err) => {
      console.warn("[CompletionFSM] Background sync deferred error:", err);
    });
  } catch (err) {
    console.warn("[CompletionFSM] Sync error:", err);
  }
}
```
این کد یک الگوی ارسال بهینه و غیرمسدودکننده (Optimistic UI / Background Sync) است، اما از آنجا که هیچ متد ارسالی (`fetch` یا سرور اکشن) به آن پاس داده نشده و کامپوننت در روت اصلی برنامه سوار نشده، این پی‌لود در عمل در فضا رها می‌شود.

### ۹.۷. لاگین و ره‌گیری خطا
هیچ سیستم مانیتورینگ خطا (نظیر Sentry یا LogRocket) نصب نشده است. لاگ‌ها محدود به `console.error` در `app/error.tsx` و `console.warn` در هوک‌های FSM هستند.

---

## ۱۰. زیرساخت ویدیو و تمرین‌ها (Video and Exercise Infrastructure)

### ۱۰.۱. زیرساخت پخش ویدیو
در کدبیس دو کامپوننت مستقل برای ویدیو وجود دارد:
1. **ارگانیسم `VideoPlayer` (`components/organisms/video-player.tsx`):**
   - **پلیر:** از هیچ کتابخانه خارجی (مانند Plyr یا Video.js) استفاده نمی‌کند.
   - **المان ویدیو:** فاقد تگ `<video>` است! یک تگ `<img>` برای تصویر پوستر دارد و رفتار پخش و زمان را به صورت مصنوعی با تایمر `setInterval(() => setCurrentTime(...), 1000)` شبیه‌سازی می‌کند.
   - **قابلیت‌های تعاملی شبیه‌سازی‌شده:**
     - نوار پیشرفت سفارشی با قابلیت Scrubbing و پیش‌نمایش زمان در حالت هاور (`hoverTime`).
     - دکمه پرش ۱۰ ثانیه به عقب و جلو.
     - حالت `isStrict`: جلوگیری از اسکیپ به جلو پیش از زمان مشاهده‌شده (`maxWatchedTime`).
     - سنسور جریمه تمرکز (Focus Penalty): گوش دادن به رویداد `visibilitychange` سند مرورگر؛ در صورتی که کاربر تب را عوض کند، پخش متوقف شده و تایمر معکوس ۱۰ ثانیه‌ای شروع می‌شود که پس از اتمام، ۳۰ ثانیه از ویدیو را به عقب بازمی‌گرداند.
     - زیرنویس دوزبانه همگام (`activeSubtitle`): محاسبه لحظه‌ای با فیلتر روی آرایه زمان‌بندی‌شده `subtitles`.
     - تمام‌صفحه: استفاده از Fullscreen API مرورگر روی رفرنس کانتینر (`containerRef.current.requestFullscreen()`).
2. **ارگانیسم `VideoCard` (`components/organisms/video-card.tsx`):**
   - در صورت ارسال پراپ `videoSrc` یک تگ HTML5 `<video>` رندر می‌کند، اما تعاملات Play/Pause و پیشرفت زمانی آن را با متدهای نیتیو ویدیو (`video.play()`, `video.currentTime`) هماهنگ نمی‌سازد و از تایمر مصنوعی ۱ ثانیه‌ای استفاده می‌کند.

### ۱۰.۲. زیرساخت تمرین‌ها و سنجش یادگیری
سیستم دارای ۴ پیاده‌سازی مستقل تمرین با معماری ماشین وضعیت متناهی (FSM) است:
1. **تطبیق واژگان (`VocabularyCard` + `useVocabularyFsm`):**
   - دو ستون مبدأ و مقصد.
   - وضعیت‌های FSM: `IDLE` -> `SOURCE_SELECTED` -> `EVALUATING` -> `MATCH_SUCCESS` / `MISMATCH_ERROR` -> `COMPLETED`.
   - شافل آرایه با الگوریتم استاندارد Fisher-Yates.
   - پخش صوت کلمه با ارجاع به آدرس دیکشنری Youdao.
2. **پازل کلمات و گرامر (`GrammarCard` + `useGrammarFsm`):**
   - مخزن توکن‌ها شامل توکن‌های جمله صحیح به همراه کلمات انحرافی (`distractors`).
   - وضعیت‌های FSM: `IDLE` -> `BUILDING` -> `READY_TO_CHECK` -> `CHECKING` -> `SUCCESS` / `ERROR` -> `COMPLETED`.
   - نرمال‌سازی متنی و حذف علائم نگارشی برای مقایسه عادلانه.
3. **املای سریع صوتی (`DictationCard` + `useDictationFsm`):**
   - پخش صوت خودکار یا دستی.
   - اعتبارسنجی با **الگوریتم فاصله ویرایشی لون‌اشتاین (`calculateLevenshteinDistance`)**: اگر فاصله ویرایشی کاربر نسبت به کلمه هدف کمتر یا مساوی آستانه باشد (`getTypoThreshold`)، وضعیت به جای خطای کامل به `TYPO_WARNING` تغییر یافته و با نوار هشدار زرد رنگ به کاربر فرصت اصلاح می‌دهد.
   - نرمال‌سازی کاراکترهای یونیکد (NFC)، یکسان‌سازی انواع آپوستروف‌ها (`’`, `‘`, `'`) و حذف علائم نگارشی.
   - وضعیت‌های FSM: `IDLE` -> `PLAYING_AUDIO` -> `TYPING` -> `EVALUATING` -> `SUCCESS` / `TYPO_WARNING` / `ERROR` -> `COMPLETED`.
4. **تلفظ و شنیداری (`PronunciationCard` + `usePronunciationFsm`):**
   - پخش صوت استاندارد الگو.
   - دسترسی به میکروفون با `navigator.mediaDevices.getUserMedia({ audio: true })`.
   - تحلیل سطح صدای ورودی زنده با Web Audio API (`AudioContext` و `AnalyserNode`) و رندر اکولایزر ۵ خطی.
   - ضبط صوت از طریق `MediaRecorder` و ایجاد `Blob`.
   - ارزیابی متن بیان‌شده از طریق Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) با امکان انتخاب حالت‌های شبیه‌سازی (`mock-match` و `mock-mismatch`).
   - مکانیزم اغماض: در صورت ۲ بار تلاش ناموفق، وضعیت عبور داده شده (`forgiven: true`) تا کاربر متوقف نشود.

---

## ۱۱. احراز هویت، دسترسی مهمان و تجارت/پرداخت (Authentication, Guest Access, and Commerce)

| قابلیت | وضعیت کد در مخزن | جزئیات شواهد فنی |
| :--- | :--- | :--- |
| **احراز هویت با شماره موبایل** | رابط کاربری ماک (UI Only) | کامپوننت `PhoneLogin` در `components/organisms/phone-login.tsx` فرمت شماره ایران (`^09\d{9}$`) را با ارقام فارسی/انگلیسی اعتبارسنجی می‌کند، اما دکمه فقط تابع `onSubmit(phone)` محلی را صدا می‌زند. |
| **ارسال و تایید پیامک OTP** | پیاده‌سازی نشده | هیچ کدی برای اتصال به پنل پیامکی (مانند کاوه‌نگار یا فراپیامک)، فیلد دریافت کد OTP، یا تایمر ارسال مجدد وجود ندارد. |
| **احراز هویت با پسورد** | پیاده‌سازی نشده | هیچ فرم، فیلد، یا مدل ذخیره پسورد و هشینگی (مانند bcrypt/argon2) در مخزن وجود ندارد. |
| **بازیابی کلمه عبور** | پیاده‌سازی نشده | وجود خارجی ندارد. |
| **دسترسی کاربر مهمان (Guest)** | پیاده‌سازی نشده | هیچ شناسه‌ای تحت عنوان مهمان (Guest ID) تولید یا در حافظه ذخیره نمی‌شود. |
| **پایداری پیشرفت کاربر مهمان** | پیاده‌سازی نشده | عملکرد مهمان در جایی ثبت نمی‌شود. |
| **انتقال داده مهمان به حساب رسمی** | پیاده‌سازی نشده | مکانیزم مهاجرت داده مهمان وجود ندارد. |
| **مدیریت سطح دسترسی و اشتراک** | پیاده‌سازی نشده | پراپ‌های `isLocked` و `lockMessage` صرفاً ظاهر قفل را نشان می‌دهند و هیچ توکن، نقش (Role) یا کنترلی در کار نیست. |
| **اتصال به درگاه پرداخت** | پیاده‌سازی نشده | هیچ کدی برای اتصال به درگاه‌های زرین‌پال، نکست‌پی یا سداد وجود ندارد. |
| **کال‌بک و وریفای پرداخت** | پیاده‌سازی نشده | هیچ مسیر بازگشت و تایید تراکنشی در پروژه وجود ندارد. |

---

## ۱۲. آزمون و کیفیت (Testing and Quality)

### ۱۲.۱. زیرساخت آزمون خودکار
- **تست‌های واحد (Unit Tests):** صفر تست. هیچ فایلی با پسوند `.test.ts`, `.spec.tsx` در کد منبع وجود ندارد.
- **تست‌های سرتاسری (E2E Tests):** وجود ندارد (نه Playwright و نه Cypress پیکربندی نشده است).
- **فریم‌ورک‌های تست:** هیچ پکیجی نظیر `jest`، `vitest`، یا `@testing-library/react` در وابستگی‌های پروژه قرار ندارد.

### ۱۲.۲. نتایج اجرای فرامین راستی‌آزمایی (Verification Commands)

در جریان بازرسی، فرامین غیراختلالی زیر در ترمینال پروژه اجرا گردید و نتایج دقیق آن‌ها به شرح زیر ثبت شد:

#### فرمان ۱: بررسی تایپ‌ها با کامپایلر تایپ‌اسکریپت
- **دستور دقیق:** `npx tsc --noEmit`
- **کد خروجی:** `0` (موفقیت‌آمیز)
- **خطاها و هشدارها:** هیچ خطایی گزارش نشد.
- **قابلیت اعتماد نتیجه:** بالا. تمامی تایپ‌ها، اینترفیس‌ها و پراپ‌های کامپوننت‌ها سازگار بوده و صحت کامپایل استاتیک تایید شد.

#### فرمان ۲: اجرای بیلد رسمی Next.js
- **دستور دقیق:** `npx next build`
- **کد خروجی:** `0` (موفقیت‌آمیز در زمان ۱۳.۵ ثانیه با کامپایلر Turbopack)
- **خروجی روت‌ها:**
  ```text
  Route (app)
  ┌ ○ /
  ├ ○ /_not-found
  ├ ○ /sandbox
  └ ○ /sandbox/preview
  ○ (Static) prerendered as static content
  ```
- **قابلیت اعتماد نتیجه:** بالا. تمام روت‌های موجود به عنوان صفحات استاتیک با موفقیت بیلد شدند.

#### فرمان ۳: بررسی اعتبارسنجی با لینتر
- **دستور دقیق:** `npx eslint app components config hooks types`
- **کد خروجی:** `1` (شکست و خروج با خطا)
- **پیام خطا:**
  ```text
  Oops! Something went wrong! :(
  ESLint: 9.25.1
  Error: ESLint configuration in » plugin:@next/next/recommended is invalid:
      - Unexpected top-level property "name".
  ```
- **تحلیل علت خطا:** این خطا ناشی از ناسازگاری نسخه ESLint 9 با لایه سازگاری `FlatCompat` در فایل `eslint.config.mjs` در زمان گسترش `plugin:@next/next/recommended` است. پلاگین جدید Next.js مشخصه سطح بالای `name` را ارسال می‌کند که برای اسکیما ولیدیتور قدیمی `@eslint/eslintrc` ناشناخته بوده و مانع از اجرای لینتر در پروژه می‌شود.
- **توضیح تعهد به قوانین:** بر اساس قانون اکید «عدم دستکاری کدهای موجود»، این فایل اصلاح نشد و این خطا به عنوان بدهی فنی موجود در مخزن ثبت گردید.

---

## ۱۳. بدهی فنی و ریسک‌ها (Technical Debt and Risks)

جدول جامع ریسک‌ها و بدهی‌های فنی ثبت‌شده به همراه شدت، شواهد و اثرات بر MVP:

| عنوان بدهی فنی / ریسک | رده شدت | فایل‌های متاثر | شواهد عینی | اثر بالقوه بر محصول | آیا مانع MVP است؟ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **شکسته بودن کانفیگ ESLint** | **High** | `eslint.config.mjs`<br>`package.json` | اجرای `npx eslint` با خطای اسکیما کرش می‌کند | جلوگیری از اجرای تست‌های لینت در پایپ‌لاین CI/CD | خیر (مانع اجرای کد نیست اما بدهی است) |
| **فقدان کامل لایه پایداری داده** | **Critical** | کل پروژه | عدم وجود دیتابیس، API و ذخیره‌سازی LocalStorage دروس | از دست رفتن ۱۰۰٪ اطلاعات و پیشرفت کاربر پس از رفرش صفحه | **بله (مانع اصلی MVP)** |
| **اتکای کامل به داده‌های ماک در صفحه اصلی** | **Critical** | `app/page.tsx` | مقادیر هاردکد شده دروس و عدم اتصال به آیدی جلسه | عدم امکان ارائه دوره‌ها و سرفصل‌های واقعی به زبان‌آموز | **بله (مانع اصلی MVP)** |
| **ویدیو پلیر بدون تگ ویدیوی واقعی** | **High** | `components/organisms/video-player.tsx` | استفاده از تگ `<img>` و شبیه‌سازی پیشرفت با `setInterval` | عدم امکان پخش ویدیوی واقعی آموزشی، عدم پشتیبانی از HLS/DASH | **بله (مانع اصلی بخش ویدیو)** |
| **دوگانگی در پکیج‌های آیکون‌گرافی** | **Medium** | تمام ارگانیسم‌های `components/organisms/` | وارد کردن همزمان `@solar-icons/react` و `lucide-react` در یک فایل | ناهماهنگی در ضخامت خطوط و زبان بصری و افزایش حجم باندل | خیر (مسئله کیفیت دیزاین) |
| **کدهای متروکه و بلااستفاده** | **Low** | `config/fonts.ts`<br>`package.json` | فونت‌های Inter/FiraCode و پکیج‌های `intl-messageformat` و `tailwind-variants` استفاده نشده‌اند | هدررفت منابع و ایجاد سردرگمی در معماری پروژه | خیر |
| **وابستگی به سرویس صوتی غیررسمی Youdao** | **Medium** | `types/dictation.ts`<br>`types/pronunciation.ts`<br>`hooks/use-grammar-fsm.ts` | لینک‌های مستقیم صوتی به دامنه چینی `dict.youdao.com` | ریسک مسدود شدن دامنه، تحریم، فیلترینگ یا قطعی صوت در محیط پروداکشن | **بله (برای پایداری صوت)** |
| **ناسازگاری مرورگر با Web Speech API** | **Medium** | `hooks/use-pronunciation-fsm.ts` | اتکا به `webkitSpeechRecognition` بدون سرویس هوش مصنوعی سمت سرور | عدم کارکرد ضبط و تشخیص گفتار در مرورگرهای فایرفاکس، سافاری iOS و وب‌ویوهای خاص | خیر (فال‌بک شبیه‌سازی دارد) |
| **نبود سازوکار احراز هویت و امنیت** | **Critical** | `components/organisms/phone-login.tsx` | عدم وجود سشن، توکن، یا سیستم OTP | عدم امکان تفکیک هویت کاربران و مدیریت دسترسی‌ها | **بله (مانع اصلی MVP)** |

---

## ۱۴. دارایی‌ها و محتواهای موجود (Existing Assets and Content)

### ۱۴.۱. وب‌فونت‌ها (`public/fonts/`)
- فایل‌های وریبل فونت مدرن فارسی:
  - `IRANYekanXVF.woff2` (حجم بهینه‌سازی‌شده برای مرورگرهای مدرن)
  - `IRANYekanXVF.woff`
- فایل‌های فونت استاتیک پشتیبان:
  - `staticfonts/IRANYekanX-Regular.woff`
  - `staticfonts/IRANYekanX-Bold.woff`
- اسناد فنی فونت در `.agents/fonts/`:
  - `IranYekanX Help.html`: مستندات ویژگی‌های اوپن‌تایپ
  - `IRANYekanXV test.html`: فایل تست بصری وزن‌ها و ویژگی‌های وریبل فونت

### ۱۴.۲. آیکون‌ها و لوگو
- `public/favicon.ico`: آیکون استاندارد وب‌سایت.
- لوگوی اختصاصی: در کامپوننت `FloatingHeader` به صورت کدگذاری شده با ترکیب المان SVG، دایره با گرادیانت `from-accent to-accent/70` و حرف «۶» با فونت بولد تبولار پیاده‌سازی شده است. هیچ فایل لوگوی SVG یا PNG مجزایی در پوشه `public` وجود ندارد.

### ۱۴.۳. تصاویر، ویدیوها و آواتارها
- هیچ فایل ویدیویی محلی (`.mp4`, `.webm`) در مخزن وجود ندارد.
- هیچ فایل تصویر یا پوستر محلی در مخزن وجود ندارد.
- تصاویر پوسترها و کاورها از CDN آنسپلش لود می‌شوند:
  - `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?...`
- آواتارهای کاربران از سرویس پراواتار دریافت می‌شوند:
  - `https://i.pravatar.cc/150?u=a042581f4e29026024d`

### ۱۴.۴. محتوای آموزشی نمونه (Mock Course Content)
تمام محتوای درسی موجود در قالب ثابت‌های هاردکد شده TypeScript ذخیره شده است:
- **دیکته صوتی (۳ پرامپت):** "continuous integration", "developer experience", "it's raining outside" در `types/dictation.ts`.
- **گرامر و ساختار جمله (۳ جمله):** جملات تمرینی زمان حال استمراری و حال ساده در `hooks/use-grammar-fsm.ts`.
- **واژگان تخصصی (۴ جفت):** جفت‌های واژگان مفهومی نظیر "Microlearning", "State Machine", "Cognitive Load", "Atomic Design" در `components/organisms/vocabulary-card.tsx`.
- **تلفظ و آواشناسی (۳ واژه):** واژه‌های "Architecture", "Authentication", "Microlearning" همراه با نمادهای فونتیک IPA در `types/pronunciation.ts`.
- **زیرنویس ویدیوی نمونه (۴ خط):** متن‌های دوزبانه معرفی سامانه ۶دقیقه در `components/organisms/video-player.tsx`.

---

## ۱۵. پیکربندی و محیط اجرا (Configuration and Environment)

### ۱۵.۱. متغیرهای محیطی مورد نیاز
در سراسر کدهای مخزن، هیچ ارجاعی به متغیرهای اختصاصی محیطی (Custom Environment Variables) وجود ندارد.  
تنها متغیر استاندارد فراخوانی‌شده عبارت است از:
- `process.env.NODE_ENV`: استفاده‌شده در `app/providers.tsx` جهت فیلتر کردن هشدارهای محیط توسعه.

### ۱۵.۲. وضعیت فایل‌های محیطی
- فایل `.env`: در مخزن وجود ندارد.
- فایل `.env.example`: در مخزن وجود ندارد.
- فایل `.env.local`: در مخزن وجود ندارد.

### ۱۵.۳. تفکیک محیط‌ها و یکپارچگی با سرویس‌های خارجی
- هیچ سرویس ابری خارجی (Supabase, Firebase, AWS S3, Cloudflare R2) پیکربندی نشده است.
- هیچ ارائه‌دهنده پیامک، ایمیل، یا پایگاه داده تعریف نشده است.
- تنظیمات مربوط به تفکیک محیط‌های Staging و Production وجود ندارد.

### ۱۵.۴. پیکربندی استقرار (Deployment)
- هیچ فایل کانفیگ استقرار نظیر `Dockerfile`، `docker-compose.yml` یا `vercel.json` در مخزن وجود ندارد.
- پروژه برای اجرا صرفاً نیازمند اجرای `npm run build` و `npm run start` روی یک سرور دارای Node.js است.

### ۱۵.۵. پیش‌نیازهای ساخت و زمان اجرا
- **محیط اجرایی:** Node.js نسخه 20.x یا بالاتر (توصیه شده طبق `@types/node: 20.9.0`).
- **مدیر بسته:** npm (با توجه به وجود `package-lock.json`).

---

## ۱۶. ماتریس وضعیت پیاده‌سازی (Current Implementation Status Matrix)

ماتریس تجمیعی زیر وضعیت تمامی ماژول‌های فنی و بخش‌های کلیدی محصول شیش را طبق شواهد کدهای موجود دسته‌بندی می‌کند:

| ماژول | پیاده‌سازی شده (Implemented) | ناقص / نیمه‌کاره (Partial) | صرفاً رابط بصری / ماک (Mock/UI Only) | غایب / ناموجود (Missing) | نامشخص / تاییدنشده (Unknown) | شواهد عینی مخزن و توضیحات |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **پوسته برنامه (App Shell)** | | | ✅ | | | لی‌اوت ریشه در `app/layout.tsx` با فونت و راست‌چین پیاده شده اما فاقد هدر و فوتر پیوسته در صفحات است |
| **هدر شناور (Header)** | | | ✅ | | | کامپوننت `FloatingHeader` کامل است اما منو و داده‌های آن ماک بوده و در هیچ صفحه‌ای رندر نشده است |
| **مرکز اقدام (Action Center)** | | | | ✅ | | هیچ فایل یا کدی برای Action Center در مخزن یافت نشد |
| **ناوبری پایین (Bottom Nav)** | | | | ✅ | | هیچ فایل یا کدی برای ناوبری پایین صفحه وجود ندارد |
| **ناوبری مراحل (Stage Indicator)** | | ✅ | | | | کامپوننت `StageIndicator` در `components/molecules/` کامل است اما به روت کلاس درس متصل نشده |
| **توکن‌های دیزاین سیستم** | ✅ | | | | | توکن‌های oklch، تنظیمات فونت ایران‌یکان X و کلاس‌های `.glass-rim` در `styles/globals.css` موجود است |
| **شخصی‌سازی HeroUI** | ✅ | | | | | ۷ پالت برندی و استفاده استاندارد از کامپوننت‌های ترکیبی v3 بدون اشکال کار می‌کند |
| **پخش ویدیو (Video Playback)** | | | ✅ | | | ارگانیسم `VideoPlayer` فاقد تگ ویدیو بوده و با اینتروال شبیه‌سازی می‌شود؛ به کلاس درس وصل نیست |
| **کارت ویدیوی کلاس درس** | | ✅ | | | | کامپوننت `VideoCard` در صفحه اول نشسته اما پیشرفت آن تایمر ماک است و کنترل‌های حرفه‌ای ندارد |
| **موتور تمرین‌ها (Exercise System)** | ✅ | | | | | ماشین‌های وضعیت تطبیق، گرامر، دیکته و تلفظ با تعاملات کامل در پوشه‌های `hooks/` و `components/` موجودند |
| **موتور پیشرفت و پاداش** | | ✅ | | | | هوک `useCompletionFsm` و افکت صوتی Web Audio کامل است اما پی‌لود خروجی به بک‌اند وصل نیست |
| **مسیر من (My Path)** | | | | ✅ | | صفحه و ساختاری برای مسیر یادگیری در مخزن وجود ندارد |
| **مرور اشتباهات (Mistake Review)** | | | | ✅ | | هیچ منطق لایتنر، الگوریتم مرور بافاصله یا دیتابیس اشتباهاتی تعریف نشده است |
| **پروفایل کاربری (Profile)** | | | ✅ | | | تنها یک دراپ‌داون نمایشی در هدر شناور وجود دارد و صفحه مستقل پروفایل موجود نیست |
| **احراز هویت (Auth)** | | | ✅ | | | کامپوننت `PhoneLogin` شماره موبایل را اعتبارسنجی فرمت می‌کند اما بدون OTP، بک‌اند و لاگین واقعی است |
| **حالت مهمان (Guest Mode)** | | | | ✅ | | هیچ مدل، نشست یا فرآیندی برای شناسایی و حفظ داده کاربر مهمان وجود ندارد |
| **تجارت و پرداخت (Commerce)** | | | | ✅ | | هیچ درگاه، مدل مالی، پلن اشتراک یا اندپوینت تراکنشی در پروژه وجود ندارد |
| **پایداری داده‌ها (Persistence)** | | | | ✅ | | هیچ دیتابیس یا سروری وجود ندارد؛ LocalStorage فقط برای علاقه‌مندی‌های سندباکس به کار رفته است |
| **آزمون‌های خودکار (Tests)** | | | | ✅ | | صفر تست خودکار در مخزن وجود دارد؛ کانفیگ لینتر نیز شکسته است |
| **استودیو سندباکس (UI Sandbox)** | ✅ | | | | | استودیو کامل `app/sandbox` با تمام ابزارهای بازرسی، ویوپورت‌ها و کنترل‌ها به صورت کامل کار می‌کند |

---

## ۱۷. محدودیت‌ها و الزامات معماری برای طرح‌های آینده (Architecture Constraints for Future Blueprints)

> **توجه مهم:** این بخش صرفاً مشاهدات تحلیلی و الزامات استخراج‌شده از کدبیس فعلی است و به هیچ عنوان به منزله تصمیمات تاییدشده برای بازطراحی تلقی نمی‌شود.

در زمان تدوین بلوپرینت‌های آینده MVP، تصمیمات مهندسی باید با در نظر گرفتن چارچوب‌ها و ساختارهای موجود اتخاذ شوند:

### ۱۷.۱. ساختارهای باارزش جهت حفظ و استفاده مجدد
1. **ماشین‌های وضعیت متناهی تمرین‌ها (FSM Hooks):** کدهای نوشته‌شده در `use-vocabulary-fsm.ts`, `use-grammar-fsm.ts`, `use-dictation-fsm.ts`, `use-pronunciation-fsm.ts` و `use-completion-fsm.ts` دارای منطق کلاینتی بسیار تمیز، نرمال‌سازی‌های دقیق متنی و مدیریت وضعیت استاندارد هستند. توصیه می‌شود ساختار این هوک‌ها حفظ شده و فقط لایه ورودی داده (پراپ‌ها) و خروجی داده (ارسال به سرور) به آن‌ها متصل گردد.
2. **الگوریتم فاصله لون‌اشتاین:** تابع پیاده‌سازی‌شده در `hooks/use-dictation-fsm.ts` دارایی فنی باارزشی برای تشخیص خطاهای تایپی جزئی است و باید در سیستم ارزشیابی حفظ شود.
3. **سنتز صوتی Web Audio API (`useRewardAudio`):** تولید آکوردهای صوتی شاداب با اسیلاتورهای مرورگر یک راهکار سبک، بدون تاخیر شبکه و بدون وابستگی به دانلود فایل صوتی است که ارزش استفاده مجدد در کل چرخه گیمیفیکیشن پلتفرم را دارد.
4. **استودیو سندباکس (`app/sandbox`):** یک دارایی توسعه عالی جهت تست سریع کامپوننت‌ها و هماهنگی بصری در ویوپورت‌های مختلف است که می‌تواند به عنوان محیط توسعه کامپوننت‌ها حفظ شود.

### ۱۷.۲. الزامات وابستگی‌ها و فریم‌ورک
1. **معماری HeroUI v3:** تمامی کامپوننت‌های پایه پروژه از HeroUI v3 به صورت Compound Component استفاده می‌کنند (`Card.Header`, `TextField`, `Label`, `InputGroup`). هرگونه کامپوننت جدید باید بر مبنای همین استاندارد طراحی شود. همچنین در HeroUI v3 نیازی به تعریف `HeroUIProvider` در روت نیست.
2. **موتور Tailwind CSS v4:** عدم استفاده از فایل `tailwind.config.js` سنتی؛ هرگونه توکن یا استایل جدید باید مستقیماً در `styles/globals.css` با دستورات `@theme` یا متغیرهای CSS تعریف شود.
3. **انحصار فونت ایران‌یکان X متغیر:** حفظ کلاس `.font-tabular` و ویژگی‌های اوپن‌تایپ `"ss02"` برای ارقام فارسی و ایزوله‌سازی فیلدهای انگلیسی با `[dir="ltr"]` از الزامات قطعی دیزاین سیستم است.

### ۱۷.۳. مرزهای بالقوه مهاجرت و تغییر
1. **یکپارچه‌سازی پلیر ویدیو:** دوگانگی میان `VideoCard` (سوار بر صفحه کلاس درس) و `VideoPlayer` (پلیر پیشرفته اما ماک در پوشه ارگانیسم‌ها) باید رفع شود. سیستم نیازمند یکپارچه‌سازی با یک پلیر استریم استاندارد (پشتیبانی‌کننده از تگ واقعی ویدیو و HLS) است که ویژگی‌های تعاملی `VideoPlayer` (سنسور تمرکز و زیرنویس دوزبانه) روی آن سوار شود.
2. **یکپارچه‌سازی آیکون‌ها:** ضرورت تصمیم‌گیری برای انتخاب یک کتابخانه مرجع واحد میان `@solar-icons/react` و `lucide-react` جهت حذف سربار باندل و یکدستی ضخامت خطوط.
3. **رفع خطای ESLint 9:** پیکربندی `eslint.config.mjs` نیازمند بازبینی برای هماهنگی کامل پلاگین Next.js با Flat Config نسخه ۹ است.

---

## ۱۸. ناشناخته‌ها و شکاف‌های راستی‌آزمایی (Unknowns and Verification Gaps)

در طول ارزیابی، مواردی که با شواهد موجود در مخزن قابل تایید قطعی نبودند ثبت شدند:

| موضوع ناشناخته | بخش بازرسی‌شده | علت عدم تایید و ابهام | شواهد مورد نیاز برای حل ابهام |
| :--- | :--- | :--- | :--- |
| **سرویس پیامک و ارائه‌دهنده OTP آینده** | تمام کدهای احراز هویت | در کدبیس هیچ نامی از سرویس پیامکی (کاوه‌نگار، ملی‌پیامک و...) نیامده است | مشخص شدن ارائه‌دهنده سرویس پیامک و کلیدهای API آن در مستندات محصول |
| **استراتژی استریم و میزبانی ویدیوها** | `video-player.tsx`, `video-card.tsx` | هیچ اشاره‌ای به نحوه استریم ویدیوها (HLS/DASH/VOD)، ارائه‌دهنده CDN (آروان، ابر دراک و...) در کد نشده است | ارائه سند معماری چندرسانه‌ای و زیرساخت استریم ویدیو |
| **پایگاه داده و استک نهایی بک‌اند** | ریشه مخزن و وابستگی‌ها | هیچ نشانه‌ای از اینکه آیا بک‌اند با Next.js Server Actions پیاده می‌شود یا سرور مجزا (مانند NestJS/FastAPI/Go) وجود ندارد | تصمیم‌گیری معماری در مورد استک بک‌اند در بلوپرینت |
| **پایداری داده‌های Web Speech API در دیوایس‌های مختلف** | `use-pronunciation-fsm.ts` | به صورت استاتیک تست شد، اما رفتار دقیق مرورگرهای موبایل iOS و اندروید ایرانی روی لهجه‌های انگلیسی بدون اجرای تست میدانی در دستگاه‌های فیزیکی قابل اثبات نیست | تست‌های میدانی تجربه کاربر (Device Lab Testing) روی دستگاه‌های واقعی |
| **مدل تجاری و فرمول محاسبه XP و استریک** | `types/completion.ts` | کدهای انیمیشن و شمارشگر موجودند، اما منطق تجاری اینکه هر تمرین چند XP تولید می‌کند و قوانین انجماد استریک چیست در کد نیامده است | مستندات محصول در خصوص مکانیک‌های گیمیفیکیشن |

---

## ۱۹. تصویر کلی و جمع‌بندی نهایی (Final Snapshot)

### ۱. آنچه واقعاً وجود دارد:
- روت کلاس درس (`/`) با چیدمان اسکرول افقی ۵ کارت، فاصله ۶ پیکسلی، اسکرول متمرکز و ماسک بلور تدریجی.
- ۴ کارت تمرینی فوق‌العاده با ماشین‌های وضعیت متناهی (FSM) کلاینتی فعال: تطبیق واژگان، پازل جمله‌سازی گرامر، املای سریع صوتی با الگوریتم لون‌اشتاین، و تمرین تلفظ صوتی با ضبط میکروفون.
- کارت پاداش و پایان درس با سنتز صوتی Web Audio API و انیمیشن شمارنده اعداد.
- استودیو سندباکس (`/sandbox`) با بازرسی کاتالوگ، تغییر ویوپورت‌ها، اعمال ۷ تم برندی oklch و ابزار بازرسی تعاملی شبیه Figma.
- دیزاین سیستم مبتنی بر Tailwind CSS v4، مؤلفه‌های HeroUI v3 و تایپوگرافی اختصاصی وب‌فونت ایران‌یکان X متغیر با ارقام فارسی و تبولار.

### ۲. آنچه به صورت ناقص پیاده‌سازی شده است:
- پخش ویدیو: در قالب دو کامپوننت مجزا با تایمر شبیه‌سازی‌شده کار می‌کند و هیچ‌کدام به استریم واقعی ویدیو متصل نیستند.
- نشانگر مراحل (`StageIndicator`): به عنوان یک مولکول کامل در سندباکس کار می‌کند، اما در صفحه اصلی کلاس درس مونتاژ نشده است.
- فرم لاگین (`PhoneLogin`): فیلد شماره موبایل را اعتبارسنجی می‌کند، اما در هیچ روت واقعی قرار نگرفته و به سیستم OTP یا بک‌اند وصل نیست.
- هدر شناور (`FloatingHeader`): طراحی شیشه‌ای و زیبایی دارد، اما در صفحات اصلی رندر نشده و اطلاعات آن ماک است.

### ۳. آنچه کاملاً غایب است:
- پایگاه داده، ORM، مدل‌های داده سمت سرور و روت‌های API.
- احراز هویت واقعی (ارسال و اعتبارسنجی پیامک OTP، سشن‌ها، توکن‌های JWT).
- قابلیت‌های حیاتی محصول: Action Center، Bottom Navigation، My Path، Mistake Review (لایتنر)، Guest Mode، Commerce (خرید و اشتراک).
- تست‌های خودکار (Unit, Integration, E2E)؛ به همراه شکسته بودن کانفیگ ESLint 9.

### ۴. آنچه باید حفظ شود:
- هوک‌های FSM تمرین‌ها در `hooks/` به همراه الگوریتم‌های اعتبارسنجی و نرمال‌سازی.
- هوک سنتز صوتی `useRewardAudio`.
- سیستم تایپوگرافی، افکت شیشه‌ای `.glass-rim` و توکن‌های برندی oklch در `styles/globals.css`.
- ساختار کامپوننت پایه `BaseCard` و ابعاد هندسی دقیق آن (۵۰۰px).
- استودیو سندباکس به عنوان محیط کارگاهی توسعه کامپوننت‌ها.

### ۵. آنچه باید پیش از تدوین بلوپرینت‌های آینده درک شود:
پروژه شیش در وضعیت کنونی یک **کتابخانه کامپوننت تعاملی و پیش‌نمایش تجربه کاربری کلاس درس** است، نه یک نرم‌افزار فول‌استک فعال. هرگونه طرح معماری برای MVP باید تمرکز خود را بر طراحی لایه داده و بک‌اند، پیاده‌سازی احراز هویت با پیامک، اتصال وضعیت پیشرفت تمرین‌ها به دیتابیس، تبدیل پخش‌کننده ویدیو به یک سیستم واقعی چندرسانه‌ای، و ایجاد صفحات و بخش‌های مفقود محصول (مرکز اقدام، نقشه یادگیری، ناوبری پایین و مرور اشتباهات) معطوف سازد.
