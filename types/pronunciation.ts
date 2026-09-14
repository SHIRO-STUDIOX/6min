/**
 * تایپ‌های وضعیت ماشین وضعیت متناهی (FSM) کارت تلفظ و شنیداری
 */
export type PronunciationCardState =
  | "IDLE"
  | "PLAYING_REFERENCE"
  | "AWAITING_PERMISSION"
  | "RECORDING"
  | "EVALUATING"
  | "SUCCESS"
  | "RETRY_FEEDBACK"
  | "COMPLETED";

/**
 * ساختار هر واژه یا عبارت تمرین صوتی و تلفظ
 */
export interface PronunciationItem {
  /** شناسه یکتای آیتم */
  id: string;
  /** متن واژه یا عبارت هدف به انگلیسی */
  text: string;
  /** تلفظ نوشتاری / آوانگاری بین‌المللی (IPA) */
  phonetic?: string;
  /** آدرس فایل صوتی استاندارد یا مرجع جهت پخش الگو */
  audioUrl: string;
  /** واج یا هجای کلیدی جهت هایلایت بصری و تمرکز تلفظ (مثلاً: /θ/ در think یا /r/ در word) */
  phonemeHighlight?: string;
  /** راهنمای وضعیت دهان، لب‌ها، زبان و دندان جهت اصلاح واجی */
  mouthHint?: string;
  /** ترجمه فارسی یا توضیح معنایی */
  translation?: string;
  /** سطح دشواری یا برچسب کمکی */
  difficulty?: "easy" | "medium" | "hard";
  /** متادیتای تکمیلی */
  metadata?: Record<string, unknown>;
}

/**
 * جزئیات ارزیابی هر آیتم برای گزارش نهایی عملکرد
 */
export interface PronunciationItemReport {
  itemId: string;
  text: string;
  attempts: number;
  passed: boolean;
  forgiven: boolean;
  recognizedText?: string;
}

/**
 * گزارش عملکرد ارسالی به رویداد onComplete
 */
export interface PronunciationResult {
  /** تعداد کل آیتم‌های کارت */
  totalItems: number;
  /** تعداد آیتم‌های با موفقیت سپری شده */
  completedItems: number;
  /** مجموع کل تلاش‌های ضبط صوت */
  totalAttempts: number;
  /** تعداد مواردی که با ۲ بار تلاش ناموفق و فیدبک اغماض عبور داده شدند */
  forgivenCount: number;
  /** درصد دقت کلی */
  accuracyPercentage: number;
  /** گزارش مجزا به ازای هر واژه */
  itemsSummary: PronunciationItemReport[];
  /** زمان تکمیل تمرین */
  completedAt: string;
}

/**
 * آپشن‌ها و تنظیمات هوک ماشین وضعیت usePronunciationFsm
 */
export interface UsePronunciationFsmOptions {
  /** لیست واژگان تمرین صوتی */
  items: PronunciationItem[];
  /** ایندکس اولیه آیتم در کارت */
  initialIndex?: number;
  /** پخش خودکار صدای الگو در زمان لود آیتم جدید */
  autoPlayReferenceOnLoad?: boolean;
  /** حداکثر مدت زمان مجاز ضبط صوت بر حسب میلی‌ثانیه (پیش‌فرض: ۶۰۰۰ میلی‌ثانیه) */
  maxRecordingMs?: number;
  /** مدت زمان مکث نمایش وضعیت موفقیت قبل از رفتن به آیتم بعد (پیش‌فرض: ۹۰۰ میلی‌ثانیه) */
  successFeedbackMs?: number;
  /** مدت زمان نمایش فیدبک راهنما در زمان خطای واجی (پیش‌فرض: ۲۲۰۰ میلی‌ثانیه) */
  retryFeedbackMs?: number;
  /** تابع اختیاری ارزیابی اختصاصی (به صورت خارجی یا هوش مصنوعی سرور) */
  customEvaluator?: (
    audioBlob: Blob | null,
    targetItem: PronunciationItem,
    speechTranscript?: string
  ) => Promise<{ isMatch: boolean; confidence?: number; recognizedText?: string }>;
  /** رویداد پخش فایل صوتی مرجع */
  onAudioPlay?: (audioUrl: string, item: PronunciationItem) => void;
  /** رویداد تغییر وضعیت FSM */
  onStateChange?: (state: PronunciationCardState) => void;
  /** رویداد تغییر ایندکس آیتم */
  onItemChange?: (item: PronunciationItem, index: number) => void;
  /** رویداد تکمیل موفقیت‌آمیز کل آیتم‌های کارت */
  onComplete?: (result: PronunciationResult) => void;
}

/**
 * پراپ‌های کامپوننت ارگانیسم PronunciationCard
 */
export interface PronunciationCardProps {
  /** برچسب متنی نوع درس در بالای هدر */
  cardLabel?: string;
  /** عنوان تمرین کارت */
  title?: string;
  /** توضیحات تکمیلی زیر عنوان */
  description?: string;
  /** لیست واژگان تمرین */
  items?: PronunciationItem[];
  /** پخش خودکار صدای الگو هنگام ورود */
  autoPlayReferenceOnLoad?: boolean;
  /** وضعیت قفل بودن جلسه از والد */
  isLocked?: boolean;
  /** پیام قفل بودن جلسه */
  lockMessage?: string;
  /** متن سفارشی دکمه ناوبری به کارت بعدی */
  nextButtonText?: string;
  /** رویداد کلیک روی دکمه کارت بعدی */
  onNext?: () => void;
  /** رویداد تکمیل کل تمرین صوتی همراه با کارنامه */
  onComplete?: (result: PronunciationResult) => void;
  /** رویداد پخش صدای الگو */
  onAudioPlay?: (audioUrl: string, item: PronunciationItem) => void;
  /** کلاس‌های اختیاری استایل */
  className?: string;
}

/**
 * اقلام پیش‌فرض تمرین کارت تلفظ و شنیداری (طراحی شده برای متد ۶دقیقه)
 */
export const DEFAULT_PRONUNCIATION_ITEMS: PronunciationItem[] = [
  {
    id: "pron-1",
    text: "Architecture",
    phonetic: "/ˈɑːr.kə.tek.tʃɚ/",
    audioUrl: "https://dict.youdao.com/dictvoice?audio=architecture&type=2",
    phonemeHighlight: "/k/ and /tʃ/",
    mouthHint: "توجه به صدای «ک» در هجای ch اول و تلفظ روان «چ» در هجای ture پایانی.",
    translation: "معماری نرم‌افزار و سامانه‌ها",
    difficulty: "medium",
  },
  {
    id: "pron-2",
    text: "Authentication",
    phonetic: "/ɑːˌθen.tɪˈkeɪ.ʃən/",
    audioUrl: "https://dict.youdao.com/dictvoice?audio=authentication&type=2",
    phonemeHighlight: "/θ/ phoneme",
    mouthHint: "نوک زبان را بین دندان‌های بالا و پایین قرار داده و هوای نرم خارج کنید.",
    translation: "احراز هویت و امنیت کاربری",
    difficulty: "hard",
  },
  {
    id: "pron-3",
    text: "Microlearning",
    phonetic: "/ˈmaɪ.kroʊˌlɝː.nɪŋ/",
    audioUrl: "https://dict.youdao.com/dictvoice?audio=microlearning&type=2",
    phonemeHighlight: "/aɪ/ and /ɝː/",
    mouthHint: "دهان ابتدا برای /aɪ/ باز شده و سپس زبان برای تلفظ نرم صدای /r/ به عقب خم می‌شود.",
    translation: "آموزش خُرد و هدفمند تک‌موضوعی",
    difficulty: "easy",
  },
];
