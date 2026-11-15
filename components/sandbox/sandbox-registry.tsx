import React from "react";
import { GuestDraftField } from "@/components/molecules/guest-draft-field";
import { LessonVideo } from "@/components/organisms/lesson-video";
import { SandboxComponent } from "./sandbox-types";
import { FloatingHeader } from "@/components/organisms/floating-header";
import { PhoneLogin } from "@/components/organisms/phone-login";
import { VideoPlayer } from "@/components/organisms/video-player";
import { VideoCard } from "@/components/organisms/video-card";
import { VocabularyCard } from "@/components/organisms/vocabulary-card";
import { GrammarCard } from "@/components/organisms/grammar-card";
import { DictationCard } from "@/components/organisms/dictation-card";
import { PronunciationCard } from "@/components/organisms/pronunciation-card";
import { CompletionCard } from "@/components/organisms/completion-card";
import { StageIndicator } from "@/components/molecules/StageIndicator";

export const sandboxRegistry: SandboxComponent[] = [
  {
    id: "guest-draft", name: "GuestDraftField", persianName: "پیش‌نویس مهمان (ذخیره محلی آزمایشی)", category: "molecules",
    description: "ورودی نمونه برای بررسی بازیابی پیش‌نویس؛ بدون امتیاز و بدون تماس با دیتابیس.",
    filePath: "components/molecules/guest-draft-field.tsx", dependencies: ["@heroui/react TextField", "idb"],
    defaultProps: {}, propDefinitions: [],
    render: () => <GuestDraftField scope="sandbox" lessonId="sandbox" revisionId="sandbox-v1" stageId="sandbox-draft" />,
  },
  {
    id: "lesson-video", name: "LessonVideo", persianName: "پخش واقعی ویدیو (پیش‌نمایش بدون دیتابیس)", category: "organisms",
    description: "پخش‌کننده آماده با کنترل بومی و زیرنویس؛ نمونه آزمایشی بدون ثبت امتیاز.",
    filePath: "components/organisms/lesson-video.tsx", dependencies: ["react-player", "@heroui/react Card"],
    defaultProps: {}, propDefinitions: [],
    render: () => <LessonVideo lessonId="de-01" revisionId="de-01-v1" assetId="de-01-video" src="/demo/synthetic.mp4" captionsUrl="/demo/synthetic.vtt" durationMs={10000} />,
  },
  // ==========================================
  // ORGANISMS
  // ==========================================
  {
    id: "video-card",
    name: "VideoCard",
    persianName: "کارت ویدیویی درس ۱ (Video Card)",
    category: "organisms",
    description: "کارت اول سیستم آموزشی ۶دقیقه با فرمت مربعی در دسکتاپ، پیش‌نمایش و پخش ویدیو ۱۶:۹، محاسبه درصد تماشا، استیت تکمیل و ناوبری رو به جلو در سمت راست.",
    filePath: "components/organisms/video-card.tsx",
    dependencies: [
      "@heroui/react Card",
      "@heroui/react Button",
      "@heroui/react ProgressBar",
      "lucide-react",
    ],
    defaultViewport: "desktop",
    defaultProps: {
      cardLabel: "کارت ۱: ویدیوی آموزشی",
      title: "کلاس درس",
      description: "بریم توی این ویدیو الفبا رو یادبگیریم",
      poster: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
      duration: 180,
      initialProgress: 0,
      isCompleted: false,
      isLocked: false,
      lockMessage: "برای شروع این جلسه باید پیش‌نیازهای قبلی را کامل کنید.",
    },
    propDefinitions: [
      {
        name: "cardLabel",
        label: "برچسب کارت",
        type: "string",
        defaultValue: "کارت ۱: ویدیوی آموزشی",
        category: "content",
      },
      {
        name: "title",
        label: "عنوان جلسه / ویدیو",
        type: "string",
        defaultValue: "کلاس درس",
        category: "content",
      },
      {
        name: "description",
        label: "توضیحات کوتاه",
        type: "string",
        defaultValue: "بریم توی این ویدیو الفبا رو یادبگیریم",
        category: "content",
      },
      {
        name: "poster",
        label: "تصویر کاور / پیش‌نمایش",
        type: "select",
        options: [
          { label: "فلوئید گلس رنگارنگ (بنفش و نارنجی)", value: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80" },
          { label: "منشور نوری بلورین (سیان و نئون)", value: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=80" },
          { label: "امواج گرادیانت تیره مینیمال", value: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80" },
        ],
        defaultValue: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
        category: "content",
      },
      {
        name: "duration",
        label: "مدت زمان کل (ثانیه)",
        type: "number",
        defaultValue: 180,
        category: "content",
      },
      {
        name: "initialProgress",
        label: "درصد پیش‌فرض مشاهده",
        type: "number",
        min: 0,
        max: 100,
        step: 5,
        defaultValue: 0,
        category: "state",
      },
      {
        name: "isCompleted",
        label: "وضعیت تکمیل شده (Completed)",
        type: "boolean",
        defaultValue: false,
        category: "state",
        description: "آزادسازی دکمه کارت بعدی و نمایش نشانگر موفقیت",
      },
      {
        name: "isLocked",
        label: "وضعیت قفل بودن (Locked)",
        type: "boolean",
        defaultValue: false,
        category: "state",
      },
    ],
    presets: [
      {
        name: "default",
        label: "حالت پیش‌نمایش اولیه",
        props: { initialProgress: 0, isCompleted: false, isLocked: false },
      },
      {
        name: "in-progress",
        label: "در حال مشاهده (۴۵٪ پیشرفت)",
        props: { initialProgress: 45, isCompleted: false, isLocked: false },
      },
      {
        name: "completed",
        label: "جلسه تکمیل شده (۱۰۰٪)",
        props: { initialProgress: 100, isCompleted: true, isLocked: false },
      },
      {
        name: "locked",
        label: "جلسه قفل شده",
        props: { isLocked: true },
      },
    ],
    render: (props) => (
      <div className="w-full flex items-center justify-center p-2 sm:p-6">
        <VideoCard {...props} />
      </div>
    ),
    getCodeSnippet: (props) =>
      `import { VideoCard } from "@/components/organisms/video-card";\n\n<VideoCard\n  cardLabel="${props.cardLabel || "کارت ۱: ویدیوی آموزشی"}"\n  title="${props.title || "معماری یادگیری عمیق در ۶ دقیقه"}"\n  description="${props.description || "مدل‌های ذهنی تک‌موضوعی و حفظ تمرکز شناختی بدون خستگی"}"\n  poster="${props.poster || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80"}"\n  duration={${props.duration || 180}}\n  initialProgress={${props.initialProgress ?? 0}}\n  isCompleted={${props.isCompleted ?? false}}\n  isLocked={${props.isLocked ?? false}}\n  onNext={() => console.log("Next Card")}\n/>`,
    tags: ["Organism", "Card", "Video", "Lesson", "HeroUI", "Interactive", "Square"],
  },
  {
    id: "vocabulary-card",
    name: "VocabularyCard",
    persianName: "کارت واژگان و تطبیق اصطلاحات (Vocabulary Card)",
    category: "organisms",
    description: "کارت دوم آموزش میکرولرنینگ با معماری ماشین وضعیت متناهی (FSM)، تطبیق دو ستونه واژگان تخصصی، پخش صوتی، اعتبارسنجی خطا و موفقیت، محاسبه پیشرفت و ارسال گزارش عملکرد.",
    filePath: "components/organisms/vocabulary-card.tsx",
    dependencies: [
      "@heroui/react Card",
      "@heroui/react Button",
      "@heroui/react ProgressBar",
      "@heroui/react Chip",
      "lucide-react",
    ],
    defaultViewport: "desktop",
    defaultProps: {
      cardLabel: "کارت ۲: تطبیق واژگان",
      title: "واژه‌نامه تخصصی درس",
      description: "کلمات انگلیسی را به معادل فارسی صحیح متصل کنید",
      autoShuffleTarget: true,
      isLocked: false,
      lockMessage: "برای شروع این بخش باید پیش‌نیازهای قبلی را کامل کنید.",
    },
    propDefinitions: [
      {
        name: "cardLabel",
        label: "برچسب کارت",
        type: "string",
        defaultValue: "کارت ۲: تطبیق واژگان",
        category: "content",
      },
      {
        name: "title",
        label: "عنوان تمرین",
        type: "string",
        defaultValue: "واژه‌نامه تخصصی درس",
        category: "content",
      },
      {
        name: "description",
        label: "توضیحات راهنما",
        type: "string",
        defaultValue: "کلمات انگلیسی را به معادل فارسی صحیح متصل کنید",
        category: "content",
      },
      {
        name: "autoShuffleTarget",
        label: "شافل خودکار گزینه‌ها",
        type: "boolean",
        defaultValue: true,
        category: "behavior",
        description: "به‌هم‌ریختن تصادفی ستون معانی برای جلوگیری از قرارگیری متناظر",
      },
      {
        name: "isLocked",
        label: "وضعیت قفل بودن (Locked)",
        type: "boolean",
        defaultValue: false,
        category: "state",
        description: "قفل کردن تعامل تا تکمیل کارت قبلی",
      },
    ],
    presets: [
      {
        name: "default",
        label: "حالت اولیه آماده پاسخ‌دهی",
        props: { isLocked: false, autoShuffleTarget: true },
      },
      {
        name: "locked",
        label: "جلسه قفل شده",
        props: { isLocked: true, lockMessage: "ابتدا ویدیوی آموزشی درس را تا انتها مشاهده کنید." },
      },
    ],
    render: (props) => (
      <div className="w-full flex items-center justify-center p-2 sm:p-6">
        <VocabularyCard
          {...props}
          onComplete={(res) => console.log("Vocabulary Card Completed:", res)}
          onNext={() => console.log("Navigate to Next Card")}
        />
      </div>
    ),
    getCodeSnippet: (props) =>
      `import { VocabularyCard } from "@/components/organisms/vocabulary-card";\n\n<VocabularyCard\n  cardLabel="${props.cardLabel || "کارت ۲: تطبیق واژگان"}"\n  title="${props.title || "واژه‌نامه تخصصی درس"}"\n  description="${props.description || "کلمات انگلیسی را به معادل فارسی صحیح متصل کنید"}"\n  autoShuffleTarget={${props.autoShuffleTarget ?? true}}\n  isLocked={${props.isLocked ?? false}}\n  onComplete={(result) => console.log("Completed:", result)}\n  onNext={() => console.log("Next Card")}\n/>`,
    tags: ["Organism", "Card", "Vocabulary", "Matching", "FSM", "HeroUI", "Interactive", "Square"],
  },
  {
    id: "grammar-card",
    name: "GrammarCard",
    persianName: "کارت گرامر و پازل کلمات (Grammar Card)",
    category: "organisms",
    description: "کارت سوم آموزش میکرولرنینگ با ماشین وضعیت متناهی (FSM)، پازل چینش کلمات انگلیسی، اعتبارسنجی خطا و موفقیت، پخش صوتی تلفظ، شمارش خطاها، اسلات‌های حفظ چیدمان و گزارش عملکرد.",
    filePath: "components/organisms/grammar-card.tsx",
    dependencies: [
      "@heroui/react Card",
      "@heroui/react Button",
      "@heroui/react ProgressBar",
      "@heroui/react Chip",
      "@heroui/react Spinner",
      "lucide-react",
    ],
    defaultViewport: "desktop",
    defaultProps: {
      cardLabel: "کارت ۳: ساختار جمله و گرامر",
      title: "پازل کلمات و گرامر",
      description: "کلمات انگلیسی را برای ساخت جمله صحیح به ترتیب لمس کنید",
      autoShuffleBank: true,
      autoPlayAudioOnSuccess: true,
      isLocked: false,
      lockMessage: "برای شروع این بخش باید پیش‌نیازهای قبلی را کامل کنید.",
    },
    propDefinitions: [
      {
        name: "cardLabel",
        label: "برچسب کارت",
        type: "string",
        defaultValue: "کارت ۳: ساختار جمله و گرامر",
        category: "content",
      },
      {
        name: "title",
        label: "عنوان تمرین",
        type: "string",
        defaultValue: "پازل کلمات و گرامر",
        category: "content",
      },
      {
        name: "description",
        label: "توضیحات راهنما",
        type: "string",
        defaultValue: "کلمات انگلیسی را برای ساخت جمله صحیح به ترتیب لمس کنید",
        category: "content",
      },
      {
        name: "autoShuffleBank",
        label: "شافل خودکار کلمات مخزن",
        type: "boolean",
        defaultValue: true,
        category: "behavior",
        description: "به‌هم‌ریختن تصادفی کلمات مخزن برای به چالش کشیدن زبان‌آموز",
      },
      {
        name: "autoPlayAudioOnSuccess",
        label: "پخش خودکار صوت هنگام موفقیت",
        type: "boolean",
        defaultValue: true,
        category: "behavior",
      },
      {
        name: "isLocked",
        label: "وضعیت قفل بودن (Locked)",
        type: "boolean",
        defaultValue: false,
        category: "state",
        description: "قفل کردن تعامل تا تکمیل کارت قبلی",
      },
    ],
    presets: [
      {
        name: "default",
        label: "حالت اولیه آماده پاسخ‌دهی",
        props: { isLocked: false, autoShuffleBank: true, autoPlayAudioOnSuccess: true },
      },
      {
        name: "locked",
        label: "جلسه قفل شده",
        props: { isLocked: true, lockMessage: "ابتدا واژگان و ویدیوی آموزشی درس را کامل کنید." },
      },
    ],
    render: (props) => (
      <div className="w-full flex items-center justify-center p-2 sm:p-6">
        <GrammarCard
          {...props}
          onComplete={(res) => console.log("Grammar Card Completed:", res)}
          onNext={() => console.log("Navigate to Next Card")}
        />
      </div>
    ),
    getCodeSnippet: (props) =>
      `import { GrammarCard } from "@/components/organisms/grammar-card";\n\n<GrammarCard\n  cardLabel="${props.cardLabel || "کارت ۳: ساختار جمله و گرامر"}"\n  title="${props.title || "پازل کلمات و گرامر"}"\n  description="${props.description || "کلمات انگلیسی را برای ساخت جمله صحیح به ترتیب لمس کنید"}"\n  autoShuffleBank={${props.autoShuffleBank ?? true}}\n  autoPlayAudioOnSuccess={${props.autoPlayAudioOnSuccess ?? true}}\n  isLocked={${props.isLocked ?? false}}\n  onComplete={(result) => console.log("Completed:", result)}\n  onNext={() => console.log("Next Card")}\n/>`,
    tags: ["Organism", "Card", "Grammar", "Puzzle", "FSM", "HeroUI", "Interactive", "Square"],
  },
  {
    id: "dictation-card",
    name: "DictationCard",
    persianName: "کارت املای سریع صوتی (Dictation Card)",
    category: "organisms",
    description: "کارت چهارم میکرولرنینگ با ماشین وضعیت متناهی (FSM)، پخش تلفظ صوتی عبارات تخصصی مهندسی، اعتبارسنجی املای ورودی، تشخیص خطای تایپی جزئی با الگوریتم لون‌اشتاین (Typo Warning)، چیپ‌های کاراکتر ویژه، بهینه‌سازی کیبورد موبایل و گزارش عملکرد پایانی.",
    filePath: "components/organisms/dictation-card.tsx",
    dependencies: [
      "@heroui/react Card",
      "@heroui/react Button",
      "@heroui/react ProgressBar",
      "@heroui/react Chip",
      "@heroui/react Spinner",
      "@heroui/react TextField",
      "@heroui/react InputGroup",
      "lucide-react",
    ],
    defaultViewport: "desktop",
    defaultProps: {
      cardLabel: "کارت ۴: املای سریع صوتی",
      title: "املای سریع صوتی",
      description: "به تلفظ صوتی گوش دهید و عبارت صحیح را تایپ کنید",
      autoPlayOnLoad: false,
      isLocked: false,
      lockMessage: "برای شروع این بخش باید تمرین گرامر را کامل کنید.",
    },
    propDefinitions: [
      {
        name: "cardLabel",
        label: "برچسب کارت",
        type: "string",
        defaultValue: "کارت ۴: املای سریع صوتی",
        category: "content",
      },
      {
        name: "title",
        label: "عنوان تمرین",
        type: "string",
        defaultValue: "املای سریع صوتی",
        category: "content",
      },
      {
        name: "description",
        label: "توضیحات راهنما",
        type: "string",
        defaultValue: "به تلفظ صوتی گوش دهید و عبارت صحیح را تایپ کنید",
        category: "content",
      },
      {
        name: "autoPlayOnLoad",
        label: "پخش خودکار صوت در شروع",
        type: "boolean",
        defaultValue: false,
        category: "behavior",
        description: "پخش اتوماتیک فایل صوتی هنگام ورود به هر آیتم",
      },
      {
        name: "isLocked",
        label: "وضعیت قفل بودن (Locked)",
        type: "boolean",
        defaultValue: false,
        category: "state",
        description: "قفل کردن تعامل تا تکمیل کارت‌های پیش‌نیاز",
      },
    ],
    presets: [
      {
        name: "default",
        label: "حالت اولیه آماده تایپ",
        props: { isLocked: false, autoPlayOnLoad: false },
      },
      {
        name: "autoplay",
        label: "حالت پخش خودکار صوتی",
        props: { isLocked: false, autoPlayOnLoad: true },
      },
      {
        name: "locked",
        label: "جلسه قفل شده",
        props: {
          isLocked: true,
          lockMessage: "ابتدا پازل کلمات و گرامر درس را با موفقیت پشت سر بگذارید.",
        },
      },
    ],
    render: (props) => (
      <div className="w-full flex items-center justify-center p-2 sm:p-6">
        <DictationCard
          {...props}
          onComplete={(res) => console.log("Dictation Card Completed:", res)}
          onNext={() => console.log("Navigate to Next Lesson / Card")}
        />
      </div>
    ),
    getCodeSnippet: (props) =>
      `import { DictationCard } from "@/components/organisms/dictation-card";\n\n<DictationCard\n  cardLabel="${props.cardLabel || "کارت ۴: املای سریع صوتی"}"\n  title="${props.title || "املای سریع صوتی"}"\n  description="${props.description || "به تلفظ صوتی گوش دهید و عبارت صحیح را تایپ کنید"}"\n  autoPlayOnLoad={${props.autoPlayOnLoad ?? false}}\n  isLocked={${props.isLocked ?? false}}\n  onComplete={(result) => console.log("Completed:", result)}\n  onNext={() => console.log("Next Step")}\n/>`,
    tags: ["Organism", "Card", "Dictation", "Audio", "Typing", "FSM", "HeroUI", "Interactive", "Square"],
  },
  {
    id: "pronunciation-card",
    name: "PronunciationCard",
    persianName: "کارت تلفظ و شنیداری (Pronunciation Card)",
    category: "organisms",
    description: "کارت تعاملی سنجش تلفظ و شنیداری بر پایه ماشین وضعیت متناهی (FSM)، چرخه حیات استریم صوتی، ویژوالایزر امواج فرکانسی (Waveform Indicator)، راهنمای بصری دهان و واج (Mouth & Phoneme Hint) و مدیریت تلاش مجدد.",
    filePath: "components/organisms/pronunciation-card.tsx",
    dependencies: [
      "@heroui/react Card",
      "@heroui/react Button",
      "@heroui/react ProgressBar",
      "@heroui/react Chip",
      "@heroui/react Alert",
      "@heroui/react Spinner",
      "lucide-react",
    ],
    defaultViewport: "desktop",
    defaultProps: {
      cardLabel: "کارت ۳: تلفظ و شنیداری",
      title: "کارت تلفظ و شنیداری",
      description: "به تلفظ صوتی گوش دهید و سپس واژه را با صدای واضح بیان کنید",
      autoPlayReferenceOnLoad: false,
      isLocked: false,
      lockMessage: "برای شروع این بخش باید تمرینات قبلی را کامل کنید.",
    },
    propDefinitions: [
      {
        name: "cardLabel",
        label: "برچسب کارت",
        type: "string",
        defaultValue: "کارت ۳: تلفظ و شنیداری",
        category: "content",
      },
      {
        name: "title",
        label: "عنوان تمرین",
        type: "string",
        defaultValue: "کارت تلفظ و شنیداری",
        category: "content",
      },
      {
        name: "description",
        label: "توضیحات راهنما",
        type: "string",
        defaultValue: "به تلفظ صوتی گوش دهید و سپس واژه را با صدای واضح بیان کنید",
        category: "content",
      },
      {
        name: "autoPlayReferenceOnLoad",
        label: "پخش خودکار صدای الگو",
        type: "boolean",
        defaultValue: false,
        category: "behavior",
      },
      {
        name: "isLocked",
        label: "وضعیت قفل بودن (Locked)",
        type: "boolean",
        defaultValue: false,
        category: "state",
      },
    ],
    presets: [
      {
        name: "default",
        label: "حالت اولیه آماده ضبط",
        props: { isLocked: false, autoPlayReferenceOnLoad: false },
      },
      {
        name: "autoplay",
        label: "پخش خودکار الگو",
        props: { isLocked: false, autoPlayReferenceOnLoad: true },
      },
      {
        name: "locked",
        label: "جلسه قفل شده",
        props: {
          isLocked: true,
          lockMessage: "برای باز شدن این بخش، کارت‌های قبلی را کامل کنید.",
        },
      },
    ],
    render: (props) => (
      <div className="w-full flex items-center justify-center p-2 sm:p-6">
        <PronunciationCard
          {...props}
          onComplete={(res) => console.log("Pronunciation Card Completed:", res)}
          onNext={() => console.log("Navigate to Next Card")}
        />
      </div>
    ),
    getCodeSnippet: (props) =>
      `import { PronunciationCard } from "@/components/organisms/pronunciation-card";\n\n<PronunciationCard\n  cardLabel="${props.cardLabel || "کارت ۳: تلفظ و شنیداری"}"\n  title="${props.title || "کارت تلفظ و شنیداری"}"\n  description="${props.description || "به تلفظ صوتی گوش دهید و سپس واژه را با صدای واضح بیان کنید"}"\n  autoPlayReferenceOnLoad={${props.autoPlayReferenceOnLoad ?? false}}\n  isLocked={${props.isLocked ?? false}}\n  onComplete={(result) => console.log("Completed:", result)}\n  onNext={() => console.log("Next Step")}\n/>`,
    tags: ["Organism", "Card", "Pronunciation", "Speech", "Audio", "Waveform", "FSM", "HeroUI", "Interactive", "Square"],
  },
  {
    id: "completion-card",
    name: "CompletionCard",
    persianName: "کارت پایان درس و پاداش (Completion Card)",
    category: "organisms",
    description: "کارت پایانی درس با ماشین وضعیت متناهی (FSM)، انیمیشن پاداش و شمارنده اعداد XP، نشانگر استریک روزانه، آمار عملکرد، واژگان نیازمند مرور (Spaced Repetition) و خروج فوری بدون مسدودسازی (Optimistic UI).",
    filePath: "components/organisms/completion-card.tsx",
    dependencies: [
      "@heroui/react Card",
      "@heroui/react Button",
      "@heroui/react ProgressBar",
      "@heroui/react Chip",
      "@heroui/react Spinner",
      "lucide-react",
    ],
    defaultViewport: "desktop",
    defaultProps: {
      cardLabel: "کارت ۵: پایان درسنامه و پاداش",
      title: "پایان درسنامه و ثبت امتیاز",
      description: "عملکرد شما با موفقیت در سیستم ذخیره گردید",
      lessonId: "lesson-deep-learning-101",
      nextLessonId: "lesson-deep-learning-102",
      nextLessonTitle: "درس ۲: الگوهای حافظه فعال و تکرار فضادار",
      performanceSummary: {
        totalScore: 120,
        mistakeCount: 1,
        timeSpentSeconds: 155,
        accuracyPercentage: 92,
      },
      flaggedWords: ["Cognitive", "Architecture"],
      streakData: {
        currentCount: 5,
        isExtendedToday: true,
        previousCount: 4,
      },
      rewardAnimationDurationMs: 600,
    },
    propDefinitions: [
      {
        name: "cardLabel",
        label: "برچسب کارت",
        type: "string",
        defaultValue: "کارت ۵: پایان درسنامه و پاداش",
        category: "content",
      },
      {
        name: "title",
        label: "عنوان کارت",
        type: "string",
        defaultValue: "پایان درسنامه و ثبت امتیاز",
        category: "content",
      },
      {
        name: "description",
        label: "توضیحات راهنما",
        type: "string",
        defaultValue: "عملکرد شما با موفقیت در سیستم ذخیره گردید",
        category: "content",
      },
      {
        name: "nextLessonTitle",
        label: "عنوان درس بعدی",
        type: "string",
        defaultValue: "درس ۲: الگوهای حافظه فعال و تکرار فضادار",
        category: "content",
      },
      {
        name: "rewardAnimationDurationMs",
        label: "مدت زمان انیمیشن (ms)",
        type: "number",
        defaultValue: 600,
        category: "behavior",
      },
    ],
    presets: [
      {
        name: "default",
        label: "حالت استاندارد با استریک تمدید شده",
        props: {
          performanceSummary: {
            totalScore: 120,
            mistakeCount: 1,
            timeSpentSeconds: 155,
            accuracyPercentage: 92,
          },
          flaggedWords: ["Cognitive", "Architecture"],
          streakData: {
            currentCount: 5,
            isExtendedToday: true,
            previousCount: 4,
          },
        },
      },
      {
        name: "perfect-score",
        label: "عملکرد بی‌نقص (۱۰۰٪ دقت بدون خطا)",
        props: {
          performanceSummary: {
            totalScore: 150,
            mistakeCount: 0,
            timeSpentSeconds: 110,
            accuracyPercentage: 100,
          },
          flaggedWords: [],
          streakData: {
            currentCount: 12,
            isExtendedToday: true,
            previousCount: 11,
          },
        },
      },
      {
        name: "first-streak",
        label: "روز اول استریک کاربر",
        props: {
          performanceSummary: {
            totalScore: 90,
            mistakeCount: 2,
            timeSpentSeconds: 210,
            accuracyPercentage: 85,
          },
          flaggedWords: ["Grammar", "Syntax"],
          streakData: {
            currentCount: 1,
            isExtendedToday: true,
            previousCount: 0,
          },
        },
      },
      {
        name: "streak-already-extended",
        label: "استریک از قبل تمدید شده",
        props: {
          performanceSummary: {
            totalScore: 100,
            mistakeCount: 0,
            timeSpentSeconds: 95,
            accuracyPercentage: 100,
          },
          flaggedWords: [],
          streakData: {
            currentCount: 7,
            isExtendedToday: false,
          },
        },
      },
    ],
    render: (props) => (
      <div className="w-full flex items-center justify-center p-2 sm:p-6">
        <CompletionCard
          {...props}
          onCompleteLesson={(payload) => {
            console.log("Sync to backend payload (Optimistic background):", payload);
          }}
          onNavigateNext={(nextId) => {
            console.log("Navigating to next lesson:", nextId);
          }}
        />
      </div>
    ),
    getCodeSnippet: (props) =>
      `import { CompletionCard } from "@/components/organisms/completion-card";\n\n<CompletionCard\n  lessonId="${props.lessonId || "lesson-1"}"\n  nextLessonId="${props.nextLessonId || "lesson-2"}"\n  performanceSummary={${JSON.stringify(props.performanceSummary || { totalScore: 120, mistakeCount: 1, timeSpentSeconds: 155 })}}\n  flaggedWords={${JSON.stringify(props.flaggedWords || ["Cognitive"])}}\n  streakData={${JSON.stringify(props.streakData || { currentCount: 5, isExtendedToday: true })}}\n  onCompleteLesson={async (payload) => await syncLessonProgress(payload)}\n  onNavigateNext={(nextId) => router.push(\`/lessons/\${nextId}\`)}\n/>`,
    tags: ["Organism", "Card", "Completion", "Reward", "FSM", "Streak", "HeroUI", "Interactive", "Square"],
  },
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
  // ==========================================
  // MOLECULES
  // ==========================================
  {
    id: "stage-indicator",
    name: "StageIndicator",
    persianName: "نشانگر مراحل کلاس درس (Stage Indicator)",
    category: "molecules",
    description: "نشانگر ۵ دات مینیمال با کپسول شیشه‌ای فلوئید، ماتریس وضعیت‌های حل و مرور و ابعاد ثابت ۶ پیکسل بدون جهش اسکلتی.",
    filePath: "components/molecules/StageIndicator/stage-indicator.tsx",
    dependencies: [
      "@heroui/react",
    ],
    defaultViewport: "desktop",
    defaultProps: {
      currentIndex: 0,
      step1Status: "upcoming",
      step2Status: "upcoming",
      step3Status: "upcoming",
      step4Status: "upcoming",
      step5Status: "upcoming",
    },
    propDefinitions: [
      {
        name: "currentIndex",
        label: "موقعیت کارت جاری (۰ تا ۴)",
        type: "number",
        min: 0,
        max: 4,
        step: 1,
        defaultValue: 0,
        category: "state",
        description: "تعیین کارتی که هم‌اکنون در مرکز دید قرار دارد",
      },
      {
        name: "step1Status",
        label: "وضعیت مرحله ۱",
        type: "select",
        options: [
          { label: "پیش‌رو / دست‌نخورده (Upcoming)", value: "upcoming" },
          { label: "موفقیت کامل (Success)", value: "success" },
          { label: "نیاز به مرور (Warning)", value: "warning" },
          { label: "عدم موفقیت (Danger)", value: "danger" },
        ],
        defaultValue: "upcoming",
        category: "state",
      },
      {
        name: "step2Status",
        label: "وضعیت مرحله ۲",
        type: "select",
        options: [
          { label: "پیش‌رو / دست‌نخورده (Upcoming)", value: "upcoming" },
          { label: "موفقیت کامل (Success)", value: "success" },
          { label: "نیاز به مرور (Warning)", value: "warning" },
          { label: "عدم موفقیت (Danger)", value: "danger" },
        ],
        defaultValue: "upcoming",
        category: "state",
      },
      {
        name: "step3Status",
        label: "وضعیت مرحله ۳",
        type: "select",
        options: [
          { label: "پیش‌رو / دست‌نخورده (Upcoming)", value: "upcoming" },
          { label: "موفقیت کامل (Success)", value: "success" },
          { label: "نیاز به مرور (Warning)", value: "warning" },
          { label: "عدم موفقیت (Danger)", value: "danger" },
        ],
        defaultValue: "upcoming",
        category: "state",
      },
      {
        name: "step4Status",
        label: "وضعیت مرحله ۴",
        type: "select",
        options: [
          { label: "پیش‌رو / دست‌نخورده (Upcoming)", value: "upcoming" },
          { label: "موفقیت کامل (Success)", value: "success" },
          { label: "نیاز به مرور (Warning)", value: "warning" },
          { label: "عدم موفقیت (Danger)", value: "danger" },
        ],
        defaultValue: "upcoming",
        category: "state",
      },
      {
        name: "step5Status",
        label: "وضعیت مرحله ۵",
        type: "select",
        options: [
          { label: "پیش‌رو / دست‌نخورده (Upcoming)", value: "upcoming" },
          { label: "موفقیت کامل (Success)", value: "success" },
          { label: "نیاز به مرور (Warning)", value: "warning" },
          { label: "عدم موفقیت (Danger)", value: "danger" },
        ],
        defaultValue: "upcoming",
        category: "state",
      },
    ],
    presets: [
      {
        name: "initial-step",
        label: "شروع کلاس (کارت اول فعال)",
        props: {
          currentIndex: 0,
          step1Status: "upcoming",
          step2Status: "upcoming",
          step3Status: "upcoming",
          step4Status: "upcoming",
          step5Status: "upcoming",
        },
      },
      {
        name: "in-progress",
        label: "در حال پیشرفت (کارت ۳ فعال)",
        props: {
          currentIndex: 2,
          step1Status: "success",
          step2Status: "success",
          step3Status: "upcoming",
          step4Status: "upcoming",
          step5Status: "upcoming",
        },
      },
      {
        name: "active-review",
        label: "مرور کارت حل‌شده (Active Review)",
        props: {
          currentIndex: 0,
          step1Status: "success",
          step2Status: "success",
          step3Status: "warning",
          step4Status: "upcoming",
          step5Status: "upcoming",
        },
      },
      {
        name: "mixed-outcomes",
        label: "ترکیب نتایج (موفقیت، هشدار، خطا)",
        props: {
          currentIndex: 3,
          step1Status: "success",
          step2Status: "warning",
          step3Status: "danger",
          step4Status: "upcoming",
          step5Status: "upcoming",
        },
      },
      {
        name: "all-completed",
        label: "پایان کلاس (همه موفقیت‌آمیز)",
        props: {
          currentIndex: 4,
          step1Status: "success",
          step2Status: "success",
          step3Status: "success",
          step4Status: "success",
          step5Status: "success",
        },
      },
    ],
    render: (props) => {
      const statuses = [
        props.step1Status || "upcoming",
        props.step2Status || "upcoming",
        props.step3Status || "upcoming",
        props.step4Status || "upcoming",
        props.step5Status || "upcoming",
      ];
      return (
        <div className="w-full min-h-[300px] relative rounded-3xl overflow-hidden bg-background flex flex-col items-center justify-center p-8 border border-default-200/60 shadow-inner">
          {/* پس‌زمینه ابری/آسمان کلاس درس برای سنجش ترنسپرنسی کپسول شیشه‌ای */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            <div className="absolute top-4 right-1/4 size-72 rounded-full bg-gradient-to-br from-blue-500/25 via-indigo-500/20 to-sky-400/20 blur-3xl" />
            <div className="absolute bottom-4 left-1/4 size-64 rounded-full bg-gradient-to-tr from-cyan-400/30 via-emerald-400/20 to-teal-500/15 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] opacity-35" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-4">
            <StageIndicator
              currentIndex={Number(props.currentIndex ?? 0)}
              statuses={statuses}
              onStepClick={(idx) => {
                console.log("Navigating to completed card index:", idx);
              }}
            />
            <span className="text-xs text-muted font-mono dir-ltr">
              Active Card: {Number(props.currentIndex ?? 0) + 1} of 5
            </span>
          </div>
        </div>
      );
    },
    getCodeSnippet: (props) =>
      `import { StageIndicator } from "@/components/molecules/StageIndicator";\n\n<StageIndicator\n  currentIndex={${props.currentIndex ?? 0}}\n  statuses={["${props.step1Status || "upcoming"}", "${props.step2Status || "upcoming"}", "${props.step3Status || "upcoming"}", "${props.step4Status || "upcoming"}", "${props.step5Status || "upcoming"}"]}\n  onStepClick={(index) => handleNavigate(index)}\n/>`,
    tags: ["Molecule", "StageIndicator", "Dots", "Progress", "Classroom", "Navigation", "Minimal"],
  },
];

export function getComponentById(id: string): SandboxComponent | undefined {
  return sandboxRegistry.find((comp) => comp.id === id);
}
