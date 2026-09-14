/**
 * تایپ‌های وضعیت ماشین وضعیت متناهی (FSM) کارت پایان درس و پاداش
 */
export type CompletionCardState =
  | "ENTERING"
  | "ANIMATING_REWARDS"
  | "IDLE_READY"
  | "SAVING"
  | "NAVIGATING";

/**
 * خلاصه عملکرد زبان‌آموز در طول درس دریافتی از کنترلر والد
 */
export interface PerformanceSummary {
  /** مجموع امتیاز / XP کسب‌شده در این درس */
  totalScore: number;
  /** تعداد خطاهای صورت‌گرفته در کل تمرین‌های درس */
  mistakeCount: number;
  /** مدت زمان صرف‌شده برای یادگیری و حل تمرین‌ها (بر حسب ثانیه) */
  timeSpentSeconds: number;
  /** درصد دقت کلی محاسبه‌شده (اختیاری) */
  accuracyPercentage?: number;
}

/**
 * وضعیت استریک و روزهای متوالی فعالیت کاربر
 */
export interface StreakData {
  /** تعداد روزهای متوالی استریک کاربر */
  currentCount: number;
  /** آیا استریک با اتمام این جلسه در روز جاری تمدید/ثبت شده است؟ */
  isExtendedToday: boolean;
  /** تعداد روزهای استریک قبل از افزایش (اختیاری جهت انیمیشن انتقال) */
  previousCount?: number;
}

/**
 * بسته داده‌های خروجی هنگام اتمام درس برای ذخیره‌سازی سروری (Sync Payload)
 */
export interface LessonCompletionPayload {
  /** شناسه درس تکمیل‌شده */
  lessonId: string;
  /** شناسه درس بعدی */
  nextLessonId: string | null;
  /** خلاصه آماری عملکرد */
  performanceSummary: PerformanceSummary;
  /** کلمات دارای خطا ثبت‌شده برای Spaced Repetition */
  flaggedWords: string[];
  /** وضعیت استریک روزانه */
  streakData: StreakData;
  /** برچسب زمانی اتمام به فرمت ISO */
  completedAt: string;
}

/**
 * تنظیمات و گزینه‌های ورودی هوک ماشین وضعیت متناهی کارت پاداش
 */
export interface UseCompletionFsmOptions {
  /** شناسه درس جاری */
  lessonId: string;
  /** شناسه درس بعدی */
  nextLessonId?: string | null;
  /** خلاصه عملکرد درس */
  performanceSummary: PerformanceSummary;
  /** لیست واژگان نیازمند مرور مجدد */
  flaggedWords?: string[];
  /** داده‌های استریک */
  streakData: StreakData;
  /** مدت زمان انیمیشن پاداش به میلی‌ثانیه (پیش‌فرض ۶۰۰ میلی‌ثانیه طبق مستندات) */
  rewardAnimationDurationMs?: number;
  /** اکشن ذخیره‌سازی اتمام درس در سرور (غیرمسدودکننده / Optimistic) */
  onCompleteLesson?: (payload: LessonCompletionPayload) => Promise<void> | void;
  /** اکشن ناوبری به درس بعد */
  onNavigateNext?: (nextLessonId: string | null) => void;
  /** رویداد فراخوانی پخش صوت پاداش یا استریک */
  onAudioPlay?: (type: "reward" | "streak") => void;
  /** تغییر وضعیت FSM */
  onStateChange?: (state: CompletionCardState) => void;
}

/**
 * مشخصات و پراپ‌های کامپوننت CompletionCard
 */
export interface CompletionCardProps {
  /** برچسب بالای کارت */
  cardLabel?: string;
  /** عنوان کارت */
  title?: string;
  /** توضیحات تکمیلی */
  description?: string;
  /** شناسه درس تکمیل‌شده */
  lessonId?: string;
  /** شناسه درس بعدی جهت پیش‌بارگذاری و اتصال پیوسته */
  nextLessonId?: string | null;
  /** عنوان درس بعدی جهت نمایش در راهنما (اختیاری) */
  nextLessonTitle?: string;
  /** خلاصه آماری عملکرد درس */
  performanceSummary?: PerformanceSummary;
  /** لیست واژگان دارای خطا جهت ثبت در سیستم مرور با فاصله */
  flaggedWords?: string[];
  /** وضعیت استریک کاربر */
  streakData?: StreakData;
  /** مدت زمان انیمیشن شمارش پاداش (پیش‌فرض ۶۰۰ میلی‌ثانیه) */
  rewardAnimationDurationMs?: number;
  /** اکشن ارسال و ذخیره گزارش درس در بک‌اند (پس‌زمینه / بدون اصطکاک) */
  onCompleteLesson?: (payload: LessonCompletionPayload) => Promise<void> | void;
  /** اکشن هدایت بلافاصله به درس بعد */
  onNavigateNext?: (nextLessonId: string | null) => void;
  /** پخش صوت سفارشی */
  onAudioPlay?: (type: "reward" | "streak") => void;
  /** آدرس فایل صوتی اختصاصی پاداش (اختیاری) */
  rewardSoundUrl?: string;
  /** کلاس‌های اختیاری Tailwind */
  className?: string;
}
