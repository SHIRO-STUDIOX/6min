/**
 * تایپ‌های وضعیت ماشین وضعیت متناهی (FSM) کارت گرامر
 */
export type GrammarCardState =
  | "IDLE"
  | "BUILDING"
  | "READY_TO_CHECK"
  | "CHECKING"
  | "SUCCESS"
  | "ERROR"
  | "COMPLETED";

/**
 * ساختار هر توکن کلمه در پازل گرامر
 */
export interface GrammarToken {
  id: string;
  text: string;
  isDistractor?: boolean;
  orderIndex?: number;
  metadata?: Record<string, unknown>;
}

/**
 * ساختار هر تمرین جمله‌سازی در کارت گرامر
 */
export interface GrammarSentence {
  id: string;
  /** جمله صحیح و نهایی به انگلیسی */
  targetSentence: string;
  /** توکن‌های تشکیل‌دهنده جمله صحیح به ترتیب */
  tokens: string[];
  /** کلمات انحرافی و گمراه‌کننده */
  distractors?: string[];
  /** ترجمه فارسی یا پیام راهنمای جمله */
  translation?: string;
  /** فایل صوتی تلفظ جمله */
  audioUrl?: string;
  /** نکته گرامری یا توضیح آموزشی */
  hint?: string;
  metadata?: Record<string, unknown>;
}

/**
 * گزارش عملکرد ارسالی به رویداد onComplete
 */
export interface GrammarResult {
  mistakeCount: number;
  totalSentences: number;
  completedSentences: number;
  accuracyPercentage: number;
  mistakenSentenceIds: string[];
  completedAt: string;
}

/**
 * تنظیمات و پراپ‌های هوک useGrammarFsm
 */
export interface UseGrammarFsmOptions {
  sentences: GrammarSentence[];
  initialSentenceIndex?: number;
  autoShuffleBank?: boolean;
  successFeedbackMs?: number;
  errorFeedbackMs?: number;
  autoPlayAudioOnSuccess?: boolean;
  onAudioPlay?: (audioUrl: string, sentence: GrammarSentence) => void;
  onSentenceComplete?: (sentence: GrammarSentence, index: number) => void;
  onComplete?: (result: GrammarResult) => void;
  onStateChange?: (state: GrammarCardState) => void;
}

/**
 * پراپ‌های کامپوننت ارگانیسم GrammarCard
 */
export interface GrammarCardProps {
  /** برچسب متنی نوع کارت */
  cardLabel?: string;
  /** عنوان تمرین */
  title?: string;
  /** توضیحات راهنما */
  description?: string;
  /** تمرینات جمله‌سازی کارت */
  sentences?: GrammarSentence[];
  /** شافل خودکار توکن‌های مخزن */
  autoShuffleBank?: boolean;
  /** پخش خودکار صوت در زمان موفقیت */
  autoPlayAudioOnSuccess?: boolean;
  /** قفل بودن کلی جلسه از والد */
  isLocked?: boolean;
  /** پیام قفل بودن جلسه */
  lockMessage?: string;
  /** رویداد کلیک روی دکمه کارت بعدی */
  onNext?: () => void;
  /** رویداد تکمیل موفقیت‌آمیز تمام جملات با گزارش عملکرد */
  onComplete?: (result: GrammarResult) => void;
  /** رویداد پخش فایل صوتی */
  onAudioPlay?: (audioUrl: string, sentence: GrammarSentence) => void;
  /** کلاس‌های اختیاری CSS */
  className?: string;
}
