import React from "react";
import { SandboxComponent } from "./sandbox-types";
import { FloatingHeader } from "@/components/organisms/floating-header";
import { PhoneLogin } from "@/components/organisms/phone-login";
import { VideoPlayer } from "@/components/organisms/video-player";

export const sandboxRegistry: SandboxComponent[] = [
  // ==========================================
  // ORGANISMS
  // ==========================================
  {
    id: "video-player",
    name: "VideoPlayer",
    persianName: "ویدیو پلیر هوشمند و کپسولی (HeroUI)",
    category: "organisms",
    description: "پلیر ویدیویی ماژولار مبتنی بر HeroUI و Tailwind CSS با نوار کنترل کپسولی شیشه‌ای، زیرنویس دوزبانه، جریمه عدم تمرکز، ماشین حالت‌های Strict/Review، بافرینگ و قفل پیش‌نیاز.",
    filePath: "components/organisms/video-player.tsx",
    dependencies: [
      "@heroui/react Button",
      "@heroui/react Slider",
      "@heroui/react Spinner",
      "@heroui/react Chip",
      "lucide-react",
    ],
    defaultViewport: "desktop",
    defaultProps: {
      poster: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80",
      title: "جلسه اول: معماری یادگیری عمیق در ۶ دقیقه",
      duration: 180,
      initialTime: 12,
      isStrict: false,
      isLocked: false,
      lockMessage: "برای مشاهده این ویدیو باید پیش‌نیازهای جلسه قبل را کامل کنید.",
      hasSubtitles: true,
      isBuffering: false,
      enableFocusPenalty: false,
      enableReentry: false,
    },
    propDefinitions: [
      {
        name: "poster",
        label: "تصویر پوستر ویدیو (Fluid Glass Art)",
        type: "select",
        options: [
          { label: "فلوئید گلس رنگارنگ (بنفش و نارنجی)", value: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80" },
          { label: "منشور نوری بلورین و شیشه‌ای (سیان)", value: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1920&q=80" },
          { label: "امواج سیال تاریک و نئونی", value: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80" },
          { label: "بدون تصویر (گرادیانت تاریک)", value: "" },
        ],
        defaultValue: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80",
        category: "content",
      },
      {
        name: "title",
        label: "عنوان جلسه / درس",
        type: "string",
        defaultValue: "جلسه اول: معماری یادگیری عمیق در ۶ دقیقه",
        category: "content",
      },
      {
        name: "isStrict",
        label: "حالت مشاهده اول (Strict Mode)",
        type: "boolean",
        defaultValue: false,
        category: "behavior",
        description: "غیرفعال‌سازی پرش به جلو در نخستین بار مشاهده جلسه",
      },
      {
        name: "hasSubtitles",
        label: "زیرنویس دوزبانه (فارسی / انگلیسی)",
        type: "boolean",
        defaultValue: true,
        category: "content",
      },
      {
        name: "isBuffering",
        label: "وضعیت در حال بارگذاری / بافرینگ",
        type: "boolean",
        defaultValue: false,
        category: "state",
      },
      {
        name: "isLocked",
        label: "حالت قفل بودن جلسه (Locked)",
        type: "boolean",
        defaultValue: false,
        category: "state",
        description: "نمایش لایه شیشه‌ای قفل و عدم دسترسی به ویدیو بدون پیش‌نیاز",
      },
      {
        name: "enableFocusPenalty",
        label: "جریمه عدم تمرکز (Focus Penalty)",
        type: "boolean",
        defaultValue: false,
        category: "behavior",
        description: "هشدار و بازگشت زمان در صورت ترک صفحه یا توقف طولانی",
      },
      {
        name: "enableReentry",
        label: "اعلان بازگشت مجدد (Re-entry)",
        type: "boolean",
        defaultValue: false,
        category: "behavior",
      },
      {
        name: "duration",
        label: "مدت زمان کل (ثانیه)",
        type: "number",
        defaultValue: 180,
        category: "content",
      },
    ],
    presets: [
      {
        name: "default",
        label: "پخش استاندارد + فلوئید گلس",
        props: { isStrict: false, isLocked: false, isBuffering: false },
      },
      {
        name: "strict-mode",
        label: "مشاهده اول (Strict)",
        props: { isStrict: true, isLocked: false, isBuffering: false },
      },
      {
        name: "buffering",
        label: "در حال بافرینگ جریان",
        props: { isBuffering: true },
      },
      {
        name: "locked",
        label: "جلسه قفل شده (عدم پیش‌نیاز)",
        props: { isLocked: true },
      },
      {
        name: "reentry",
        label: "اعلان بازگشت مجدد",
        props: { enableReentry: true },
      },
    ],
    render: (props) => (
      <div className="w-full max-w-4xl p-2 flex items-center justify-center">
        <VideoPlayer {...props} />
      </div>
    ),
    getCodeSnippet: (props) =>
      `import { VideoPlayer } from "@/components/organisms/video-player";\n\n<VideoPlayer\n  title="${props.title || "جلسه اول: معماری یادگیری عمیق در ۶ دقیقه"}"\n  duration={${props.duration || 180}}\n  isStrict={${props.isStrict ?? false}}\n  isLocked={${props.isLocked ?? false}}\n  hasSubtitles={${props.hasSubtitles ?? true}}\n/>`,
    tags: ["Organism", "Media", "VideoPlayer", "HeroUI", "Subtitles", "Interactive"],
  },
  {
    id: "phone-login",
    name: "PhoneLogin",
    persianName: "فرم ورود با شماره موبایل (مینیمال)",
    category: "organisms",
    description: "فرم ورود و ثبت‌نام با شماره موبایل، بدون کادر و کارت محدودکننده، با عنوان برند سیکسمین، پیشوند +۹۸، اعتبارسنجی ارقام فارسی و وضعیت لودینگ.",
    filePath: "components/organisms/phone-login.tsx",
    dependencies: [
      "@heroui/react Button",
      "@heroui/react Spinner",
      "lucide-react",
    ],
    defaultViewport: "mobile",
    defaultProps: {
      title: "سیکسمین",
      description: "برای ورود یا ثبت‌نام، شماره موبایل خود را وارد کنید",
      buttonText: "دریافت کد تأیید",
      phonePlaceholder: "۰۹۱۲۳۴۵۶۷۸۹",
      defaultValue: "",
      isLoading: false,
      isInvalid: false,
      errorMessage: "شماره موبایل وارد شده معتبر نمی‌باشد (مثال: ۰۹۱۲۳۴۵۶۷۸۹)",
    },
    propDefinitions: [
      {
        name: "title",
        label: "عنوان تایتل",
        type: "string",
        defaultValue: "سیکسمین",
        category: "content",
      },
      {
        name: "description",
        label: "توضیحات زیر عنوان",
        type: "string",
        defaultValue: "برای ورود یا ثبت‌نام، شماره موبایل خود را وارد کنید",
        category: "content",
      },
      {
        name: "buttonText",
        label: "متن دکمه ورود",
        type: "string",
        defaultValue: "دریافت کد تأیید",
        category: "content",
      },
      {
        name: "phonePlaceholder",
        label: "متن نگهدارنده شماره",
        type: "string",
        defaultValue: "۰۹۱۲۳۴۵۶۷۸۹",
        category: "content",
      },
      {
        name: "defaultValue",
        label: "مقدار پیش‌فرض شماره",
        type: "string",
        defaultValue: "",
        category: "content",
      },
      {
        name: "isLoading",
        label: "وضعیت در حال بارگذاری (Loading)",
        type: "boolean",
        defaultValue: false,
        category: "state",
      },
      {
        name: "isInvalid",
        label: "نمایش اجباری خطا (Invalid)",
        type: "boolean",
        defaultValue: false,
        category: "state",
      },
      {
        name: "errorMessage",
        label: "پیام خطای شماره نامعتبر",
        type: "string",
        defaultValue: "شماره موبایل وارد شده معتبر نمی‌باشد (مثال: ۰۹۱۲۳۴۵۶۷۸۹)",
        category: "content",
      },
    ],
    presets: [
      {
        name: "default",
        label: "حالت خالی پیش‌فرض",
        props: { defaultValue: "", isLoading: false, isInvalid: false },
      },
      {
        name: "filled",
        label: "شماره وارد شده معتبر",
        props: { defaultValue: "09123456789", isLoading: false, isInvalid: false },
      },
      {
        name: "loading",
        label: "در حال ارسال پیامک",
        props: { defaultValue: "09123456789", isLoading: true },
      },
      {
        name: "error",
        label: "شماره نامعتبر",
        props: { defaultValue: "09999", isInvalid: true },
      },
    ],
    render: (props) => (
      <div className="w-full min-h-[420px] py-8 px-4 flex items-center justify-center">
        <PhoneLogin {...props} />
      </div>
    ),
    getCodeSnippet: (props) =>
      `import { PhoneLogin } from "@/components/organisms/phone-login";\n\n<PhoneLogin\n  title="${props.title || "سیکسمین"}"\n  description="${props.description || "برای ورود یا ثبت‌نام، شماره موبایل خود را وارد کنید"}"\n  buttonText="${props.buttonText || "دریافت کد تأیید"}"\n  isLoading={${props.isLoading ?? false}}\n  isInvalid={${props.isInvalid ?? false}}\n  onSubmit={(phone) => console.log("Phone:", phone)}\n/>`,
    tags: ["Organism", "Auth", "Login", "Phone", "Minimal", "Cardless"],
  },
  {
    id: "floating-header",
    name: "FloatingHeader",
    persianName: "هدر شناور اصلی (دسکتاپ و موبایل)",
    category: "organisms",
    description: "نوار ناوبری شیشه‌ای و شناور با فاصله ۲۴ پیکسل از بالا، افکت بلور پیشرفته، برند ۶دقیقه، آواتار پروفایل و منوی واکنش‌گرا.",
    filePath: "components/organisms/floating-header.tsx",
    dependencies: [
      "@heroui/react Button",
      "@heroui/react Chip",
      "@heroui/react Avatar",
      "next-themes",
      "lucide-react",
    ],
    defaultViewport: "desktop",
    defaultProps: {
      brandTitle: "۶دقیقه",
      isLoggedIn: true,
      userName: "علی رضوانی",
      userRole: "دانشجوی سطح پیشرفته",
      activeNavItem: "home",
      isCompact: false,
    },
    propDefinitions: [
      {
        name: "isCompact",
        label: "حالت فشرده / اسکرول (Morphing)",
        type: "boolean",
        defaultValue: false,
        category: "behavior",
        description: "انیمیشن فیزیکی تغییر نرم ابعاد و پدینگ هدر با منحنی cubic-bezier(0.23, 1, 0.32, 1)",
      },
      {
        name: "isLoggedIn",
        label: "وضعیت ورود کاربر",
        type: "boolean",
        defaultValue: true,
        category: "state",
        description: "سوئیچ بین حالت لاگین (نمایش آواتار) و مهمان (دکمه ورود)",
      },
      {
        name: "brandTitle",
        label: "عنوان برند",
        type: "string",
        defaultValue: "۶دقیقه",
        category: "content",
      },
      {
        name: "userName",
        label: "نام کاربر",
        type: "string",
        defaultValue: "علی رضوانی",
        category: "content",
      },
      {
        name: "userRole",
        label: "نقش / سطح کاربر",
        type: "string",
        defaultValue: "دانشجوی سطح پیشرفته",
        category: "content",
      },
      {
        name: "activeNavItem",
        label: "آیتم فعال منو",
        type: "select",
        options: [
          { label: "خانه", value: "home" },
          { label: "سرفصل‌های دوره", value: "courses" },
          { label: "نقشه یادگیری", value: "roadmap" },
          { label: "اشتراک PRO", value: "pricing" },
        ],
        defaultValue: "home",
        category: "behavior",
      },
    ],
    presets: [
      {
        name: "logged-in",
        label: "کاربر وارد شده",
        props: { isLoggedIn: true },
      },
      {
        name: "guest-user",
        label: "کاربر مهمان (ثبت‌نام)",
        props: { isLoggedIn: false },
      },
    ],
    render: (props) => (
      <div className="w-full min-h-[360px] relative rounded-3xl overflow-hidden bg-background flex flex-col items-center justify-start pb-12 border border-default-200/60 shadow-inner">
        {/* ۱. پس‌زمینه رنگارنگ برای تست افکت گلس و بلور */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <div className="absolute -top-10 right-10 size-72 rounded-full bg-gradient-to-br from-accent/40 via-purple-500/30 to-pink-500/20 blur-3xl" />
          <div className="absolute top-20 left-12 size-64 rounded-full bg-gradient-to-tr from-cyan-400/40 via-emerald-400/30 to-blue-600/20 blur-3xl" />
          <div className="absolute top-64 right-1/3 size-80 rounded-full bg-gradient-to-r from-amber-400/30 to-rose-500/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
        </div>

        {/* ۲. هدر شناور کپسولی */}
        <div className="w-full relative z-10">
          <FloatingHeader {...props} />
        </div>
      </div>
    ),
    getCodeSnippet: (props) =>
      `import { FloatingHeader } from "@/components/organisms/floating-header";\n\n<FloatingHeader\n  brandTitle="${props.brandTitle || "۶دقیقه"}"\n  isLoggedIn={${props.isLoggedIn ?? true}}\n  userName="${props.userName || "علی رضوانی"}"\n  userRole="${props.userRole || "دانشجوی سطح پیشرفته"}"\n  activeNavItem="${props.activeNavItem || "home"}"\n/>`,
    tags: ["Organism", "Header", "Navigation", "Profile", "Floating", "Pill", "Glassmorphic"],
  },
];

export function getComponentById(id: string): SandboxComponent | undefined {
  return sandboxRegistry.find((comp) => comp.id === id);
}
