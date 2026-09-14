/**
 * تایپ‌های وضعیت ماشین وضعیت متناهی (FSM) کارت املای سریع صوتی
 */
export type DictationCardState =
  | "IDLE"
  | "PLAYING_AUDIO"
  | "TYPING"
  | "EVALUATING"
  | "SUCCESS"
  | "TYPO_WARNING"
  | "ERROR"
  | "COMPLETED";

/**
 * ساختار هر سوال یا عبارت دیکته صوتی
 */
export interface DictationPrompt {
  id: string;
  /** فایل صوتی عبارت یا کلمه جهت پخش */
  audioUrl: string;
  /** متن املای هدف و صحیح به انگلیسی */
  targetText: string;
  /** پاسخ‌های جایگزین و قابل قبول (مثلاً فرم‌های اختصاری، املای بریتانیایی/آمریکایی) */
  acceptableVariants?: string[];
  /** پیام راهنما یا راهنمای دستوری */
  hint?: string;
  /** ترجمه فارسی جمله یا کلمه */
  translation?: string;
  /** کاراکترها یا حروف کمکی خاص جهت درج سریع (نظیر آپوستروف، خط‌تیره یا آکسان‌ها) */
  specialCharacters?: string[];
  /** متادیتای تکمیلی */
  metadata?: Record<string, unknown>;
}

/**
 * تاریخچه تلاش کاربر برای ارزیابی عملکرد
 */
export interface DictationAttemptRecord {
  promptId: string;
  userInput: string;
  targetText: string;
  isCorrect: boolean;
  hasTypoWarning: boolean;
  mistakes: number;
}

/**
 * گزارش عملکرد ارسالی به رویداد onComplete
 */
export interface DictationResult {
  /** تعداد کل اشتباهات ثبت‌شده */
  mistakeCount: number;
  /** تعداد کل پرامپت‌های کارت */
  totalPrompts: number;
  /** تعداد پرامپت‌های موفقیت‌آمیز */
  completedPrompts: number;
  /** درصد دقت کلی */
  accuracyPercentage: number;
  /** کلمات یا عبارات دارای خطا یا هشدار تایپی جهت مرور مجدد */
  flaggedWords: string[];
  /** شناسه‌های پرامپت‌های دارای خطا */
  mistakenPromptIds: string[];
  /** تاریخ و زمان تکمیل کارت */
  completedAt: string;
}

/**
 * آپشن‌ها و تنظیمات هوک useDictationFsm
 */
export interface UseDictationFsmOptions {
  /** لیست پرامپت‌های صوتی */
  prompts: DictationPrompt[];
  /** ایندکس اولیه پرامپت */
  initialIndex?: number;
  /** پخش خودکار صدا هنگام ورود به پرامپت جدید */
  autoPlayOnLoad?: boolean;
  /** آستانه فاصله ویرایشی لون‌اشتاین برای اخطار تایپی جزئی (پیش‌فرض: ۱ برای کلمات، ۲ برای عبارات طولانی‌تر) */
  typoLevenshteinThreshold?: number;
  /** مدت زمان نمایش فیدبک موفقیت (میلی‌ثانیه) */
  successFeedbackMs?: number;
  /** مدت زمان نمایش فیدبک هشدار تایپی (میلی‌ثانیه) */
  typoFeedbackMs?: number;
  /** مدت زمان نمایش فیدبک خطا قبل از آزادسازی ورودی (میلی‌ثانیه) */
  errorFeedbackMs?: number;
  /** کالبک هنگام شروع پخش صوت */
  onAudioPlay?: (audioUrl: string, prompt: DictationPrompt) => void;
  /** کالبک تکمیل یک پرامپت */
  onPromptComplete?: (
    prompt: DictationPrompt,
    index: number,
    isTypo: boolean
  ) => void;
  /** کالبک پایان کلیه پرامپت‌های کارت همراه با کارنامه */
  onComplete?: (result: DictationResult) => void;
  /** کالبک تغییر وضعیت FSM */
  onStateChange?: (state: DictationCardState) => void;
}

/**
 * پراپ‌های کامپوننت ارگانیسم DictationCard
 */
export interface DictationCardProps {
  /** برچسب متنی نوع کارت در بالای هدر */
  cardLabel?: string;
  /** عنوان تمرین دیکته صوتی */
  title?: string;
  /** توضیحات تکمیلی زیر عنوان */
  description?: string;
  /** لیست پرامپت‌های صوتی کارت */
  prompts?: DictationPrompt[];
  /** پخش خودکار صدا هنگام ورود */
  autoPlayOnLoad?: boolean;
  /** وضعیت قفل بودن جلسه از والد */
  isLocked?: boolean;
  /** پیام قفل بودن جلسه */
  lockMessage?: string;
  /** زبان هدف جهت تنظیم ویژگی‌های فیلد (پیش‌فرض: en) */
  targetLanguage?: string;
  /** تنظیم خودکار حروف بزرگ در موبایل (پیش‌فرض: none) */
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  /** اصلاح خودکار کیبورد در موبایل (پیش‌فرض: off) */
  autoCorrect?: "on" | "off";
  /** بررسی املای کیبورد موبایل (پیش‌فرض: false) */
  spellCheck?: boolean;
  /** متن سفارشی دکمه ناوبری به کارت بعدی */
  nextButtonText?: string;
  /** رویداد کلیک روی دکمه کارت بعدی */
  onNext?: () => void;
  /** رویداد اتمام موفق تمام پرامپت‌ها با کارنامه عملکرد */
  onComplete?: (result: DictationResult) => void;
  /** رویداد پخش فایل صوتی */
  onAudioPlay?: (audioUrl: string, prompt: DictationPrompt) => void;
  /** کلاس‌های اختیاری Tailwind */
  className?: string;
}

/**
 * پرامپت‌های پیش‌فرض آموزش دیکته و املای صوتی
 */
export const DEFAULT_DICTATION_PROMPTS: DictationPrompt[] = [
  {
    id: "dict-1",
    targetText: "continuous integration",
    acceptableVariants: ["continuous-integration", "Continuous Integration"],
    translation: "ادغام مداوم کدها در مهندسی نرم‌افزار",
    audioUrl:
      "https://dict.youdao.com/dictvoice?audio=continuous+integration&type=2",
    hint: "به املای ous در کلمه اول و tion در کلمه دوم دقت کنید.",
    specialCharacters: ["-", "'", "/"],
  },
  {
    id: "dict-2",
    targetText: "developer experience",
    acceptableVariants: ["Developer Experience", "developer-experience", "DX"],
    translation: "تجربه توسعه‌دهنده در کار با ابزارها",
    audioUrl:
      "https://dict.youdao.com/dictvoice?audio=developer+experience&type=2",
    hint: "کلمه اول با de شروع شده و کلمه دوم دارای x و ce در پایان است.",
    specialCharacters: ["-", "'", "/"],
  },
  {
    id: "dict-3",
    targetText: "it's raining outside",
    acceptableVariants: ["its raining outside", "It's raining outside"],
    translation: "بیرون باران می‌بارد",
    audioUrl:
      "https://dict.youdao.com/dictvoice?audio=it%27s+raining+outside&type=2",
    hint: "فرم کوتاه it is به همراه آپوستروف استفاده شده است.",
    specialCharacters: ["'", "-", ",", "."],
  },
];
