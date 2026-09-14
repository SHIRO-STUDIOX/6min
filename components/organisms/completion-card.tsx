"use client";

import React, { useMemo } from "react";
import { Button, Chip, Spinner } from "@heroui/react";
import { RestartIcon } from "@solar-icons/react/linear/restart";
import { CupFirstIcon } from "@solar-icons/react/bold/cup-first";
import { FireIcon } from "@solar-icons/react/bold/fire";
import { StarsIcon } from "@solar-icons/react/bold/stars";
import { AltArrowLeftIcon } from "@solar-icons/react/linear/alt-arrow-left";
import {
  Clock,
  Target,
  AlertCircle,
  CheckCircle2,
  Zap,
  Bookmark,
  Sparkles,
} from "lucide-react";
import { BaseCard } from "@/components/molecules/base-card";
import { useCompletionFsm } from "@/hooks/use-completion-fsm";
import {
  CompletionCardProps,
  PerformanceSummary,
  StreakData,
} from "@/types/completion";

/**
 * تبدیل ثانیه به فرمت دقیقه و ثانیه (mm:ss)
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * خلاصه عملکرد پیش‌فرض جهت تست در سندباکس و فال‌بک
 */
export const DEFAULT_PERFORMANCE_SUMMARY: PerformanceSummary = {
  totalScore: 120,
  mistakeCount: 1,
  timeSpentSeconds: 155,
  accuracyPercentage: 92,
};

/**
 * داده‌های استریک پیش‌فرض
 */
export const DEFAULT_STREAK_DATA: StreakData = {
  currentCount: 5,
  isExtendedToday: true,
  previousCount: 4,
};

/**
 * CompletionCard — کارت پایان درس و پاداش با ماشین وضعیت متناهی (FSM)
 * پیاده‌سازی شده منحصراً بر بستر کامپوننت پایه BaseCard طبق اصول HeroUI v3 و Atomic Design.
 */
export function CompletionCard({
  cardLabel = "کارت ۵: پایان درسنامه و پاداش",
  title = "پایان درسنامه و ثبت امتیاز",
  description = "عملکرد شما با موفقیت در سیستم ذخیره گردید",
  lessonId = "lesson-1",
  nextLessonId = null,
  nextLessonTitle,
  performanceSummary = DEFAULT_PERFORMANCE_SUMMARY,
  flaggedWords = [],
  streakData = DEFAULT_STREAK_DATA,
  rewardAnimationDurationMs = 600,
  onCompleteLesson,
  onNavigateNext,
  onAudioPlay,
  className = "",
}: CompletionCardProps) {
  // ۱. اتصال به هوک ماشین وضعیت متناهی (FSM)
  const {
    cardState,
    displayedScore,
    displayedStreak,
    isAnimating,
    isReady,
    isSaving,
    isNavigating,
    handleProceedNext,
    replay,
  } = useCompletionFsm({
    lessonId,
    nextLessonId,
    performanceSummary,
    flaggedWords,
    streakData,
    rewardAnimationDurationMs,
    onCompleteLesson,
    onNavigateNext,
    onAudioPlay,
  });

  // محاسبه درصد دقت
  const accuracy = useMemo(() => {
    if (typeof performanceSummary.accuracyPercentage === "number") {
      return Math.round(performanceSummary.accuracyPercentage);
    }
    const mistakes = performanceSummary.mistakeCount;
    if (mistakes === 0) return 100;
    // تخمین بر مبنای امتیاز کل
    const baseAttempts = Math.max(1, Math.round(performanceSummary.totalScore / 15));
    return Math.max(50, Math.min(99, Math.round((baseAttempts / (baseAttempts + mistakes)) * 100)));
  }, [performanceSummary]);

  // آیا دکمه بعدی در حالت لودینگ / در حال انتقال است
  const isPendingTransition = isSaving || isNavigating;

  return (
    <BaseCard
      cardLabel={cardLabel}
      title={title}
      description={description}
      progressPercentage={100}
      progressLabel="میزان پیشرفت کل درس:"
      progressText="۱۰۰٪ تکمیل"
      isCompleted={true}
      completedStatusText="درسنامه با موفقیت به پایان رسید"
      progressBarAriaLabel="میزان پیشرفت کامل درسنامه"
      className={className}
      footerStart={
        <div className="flex items-center gap-1.5">
          {/* دکمه بازپخش انیمیشن پاداش جهت تست آسان */}
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            onClick={replay}
            aria-label="بازپخش انیمیشن پاداش"
            isDisabled={isPendingTransition}
            className="text-default-500 hover:text-foreground"
          >
            <RestartIcon className="size-4" />
          </Button>

          {/* نشانگر وضعیت ذخیره‌سازی */}
          <div className="flex items-center gap-1 text-[11px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-lg border border-success/20">
            <CheckCircle2 className="size-3.5 text-success" />
            <span className="hidden xs:inline">ذخیره خودکار</span>
          </div>
        </div>
      }
      footerEnd={
        <Button
          variant="primary"
          size="sm"
          isDisabled={cardState === "ENTERING" || isPendingTransition}
          isPending={isPendingTransition}
          onClick={handleProceedNext}
          className={`font-semibold text-xs sm:text-sm px-4 h-9 sm:h-10 transition-all ${
            isReady ? "shadow-md shadow-primary/25 scale-[1.02]" : ""
          }`}
        >
          {({ isPending }) =>
            isPending ? (
              <span className="flex items-center gap-1.5">
                <Spinner size="sm" color="current" />
                <span>در حال بارگذاری درس بعد...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span>درس بعدی</span>
                <Zap className="size-3.5 fill-current" />
                <AltArrowLeftIcon className="size-3.5 ms-0.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            )
          }
        </Button>
      }
    >
      {/* ======================================================== */}
      {/* بدنه محتوایی: خلاصه پاداش، استریک و کارت‌های عملکرد */}
      {/* ======================================================== */}
      <div className="w-full flex flex-col gap-2.5 py-0.5">
        {/* ۱. گرید کارت‌های اصلی پاداش (XP و استریک روزانه) */}
        <div className="grid grid-cols-2 gap-2.5 w-full">
          {/* تایل ۱: امتیاز و XP کسب‌شده */}
          <div className="relative overflow-hidden bg-gradient-to-br from-warning/10 via-surface-secondary/70 to-surface-secondary/40 border border-warning/20 rounded-2xl p-3 flex flex-col justify-between text-start transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted flex items-center gap-1">
                <StarsIcon className="size-3.5 text-warning" />
                <span>امتیاز درس</span>
              </span>
              <div className="size-6 rounded-full bg-warning/20 flex items-center justify-center text-warning">
                <CupFirstIcon className="size-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1 mt-1.5" dir="ltr">
              <span
                className={`text-2xl sm:text-3xl font-extrabold font-mono font-tabular tracking-tight text-warning transition-all ${
                  isAnimating ? "scale-105" : ""
                }`}
              >
                +{displayedScore}
              </span>
              <span className="text-xs font-bold text-warning/80 font-mono">
                XP
              </span>
            </div>

            <span className="text-[10px] text-muted mt-0.5 truncate">
              افزایش مهارت آموزشی
            </span>
          </div>

          {/* تایل ۲: نشانگر استریک روزانه (Streak Flame) */}
          <div
            className={`relative overflow-hidden border rounded-2xl p-3 flex flex-col justify-between text-start transition-all ${
              streakData.isExtendedToday
                ? "bg-gradient-to-br from-danger/10 via-warning/10 to-surface-secondary/50 border-warning/30 ring-1 ring-warning/20"
                : "bg-surface-secondary/50 border-separator/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted flex items-center gap-1">
                <FireIcon
                  className={`size-3.5 ${
                    streakData.isExtendedToday
                      ? "text-warning animate-pulse"
                      : "text-muted"
                  }`}
                />
                <span>استریک یادگیری</span>
              </span>
              {streakData.isExtendedToday && (
                <Chip
                  size="sm"
                  variant="soft"
                  color="warning"
                  className="h-5 px-1.5 text-[9px] font-bold border border-warning/30"
                >
                  <Chip.Label>تمدید شد 🔥</Chip.Label>
                </Chip>
              )}
            </div>

            <div className="flex items-baseline gap-1.5 mt-1.5" dir="rtl">
              <span
                className={`text-2xl sm:text-3xl font-extrabold font-mono font-tabular tracking-tight ${
                  streakData.isExtendedToday ? "text-warning" : "text-foreground"
                }`}
                dir="ltr"
              >
                {displayedStreak}
              </span>
              <span className="text-xs font-medium text-muted">
                روز متوالی
              </span>
            </div>

            <span className="text-[10px] text-muted mt-0.5 truncate">
              {streakData.isExtendedToday
                ? "استریک امروز فعال شد!"
                : "جلسه امروز کامل است"}
            </span>
          </div>
        </div>

        {/* ۲. نوار مشخصات عملکرد درس (زمان، دقت، تعداد اشتباهات) */}
        <div className="w-full bg-surface-secondary/50 border border-separator/70 rounded-2xl px-3 py-2 grid grid-cols-3 divide-x divide-x-reverse divide-separator/50 text-center">
          {/* زمان صرف‌شده */}
          <div className="flex flex-col items-center justify-center px-1">
            <span className="text-[10px] text-muted flex items-center gap-1 mb-0.5">
              <Clock className="size-3 text-muted" />
              <span>زمان مطالعه</span>
            </span>
            <span className="text-xs sm:text-[13px] font-bold font-mono font-tabular text-foreground" dir="ltr">
              {formatDuration(performanceSummary.timeSpentSeconds)}
            </span>
          </div>

          {/* درصد دقت کلی */}
          <div className="flex flex-col items-center justify-center px-1">
            <span className="text-[10px] text-muted flex items-center gap-1 mb-0.5">
              <Target className="size-3 text-muted" />
              <span>دقت پاسخ‌ها</span>
            </span>
            <span className="text-xs sm:text-[13px] font-bold font-mono font-tabular text-success" dir="ltr">
              {accuracy}%
            </span>
          </div>

          {/* تعداد خطاها */}
          <div className="flex flex-col items-center justify-center px-1">
            <span className="text-[10px] text-muted flex items-center gap-1 mb-0.5">
              <AlertCircle className="size-3 text-muted" />
              <span>اشتباهات</span>
            </span>
            <span
              className={`text-xs sm:text-[13px] font-bold font-mono font-tabular ${
                performanceSummary.mistakeCount > 0 ? "text-danger" : "text-success"
              }`}
              dir="ltr"
            >
              {performanceSummary.mistakeCount === 0
                ? "۰ خطا"
                : `${performanceSummary.mistakeCount}`}
            </span>
          </div>
        </div>

        {/* ۳. بخش واژگان نیازمند مرور با فاصله (Spaced Repetition / Flagged Words) */}
        <div className="w-full flex flex-col gap-1.5 text-start">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-medium text-muted flex items-center gap-1">
              <Bookmark className="size-3 text-accent" />
              <span>واژگان نیازمند مرور (Spaced Repetition):</span>
            </span>
            <span className="text-[10px] text-muted font-mono font-tabular" dir="ltr">
              {flaggedWords.length} کلمه
            </span>
          </div>

          {flaggedWords.length > 0 ? (
            <div className="w-full min-h-[50px] p-2 bg-surface-secondary/40 border border-separator/60 rounded-2xl flex flex-wrap gap-1.5 items-center">
              {flaggedWords.map((word, idx) => (
                <Chip
                  key={`flagged-${word}-${idx}`}
                  size="sm"
                  variant="soft"
                  color="warning"
                  className="font-mono text-xs font-semibold h-7 px-2 border border-warning/30"
                  dir="ltr"
                >
                  <Chip.Label>{word}</Chip.Label>
                </Chip>
              ))}
            </div>
          ) : (
            <div className="w-full min-h-[50px] px-3 py-2 bg-success/5 border border-success/20 rounded-2xl flex items-center gap-2">
              <Sparkles className="size-4 text-success shrink-0" />
              <div className="flex flex-col text-start">
                <span className="text-xs font-semibold text-success">
                  تسلط کامل روی واژگان!
                </span>
                <span className="text-[10px] text-muted leading-tight">
                  تمامی سوالات بدون نیاز به نشان‌گذاری پاسخ داده شدند.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ۴. راهنمای درسنامه بعدی در صورت وجود عنوان */}
        {nextLessonTitle && (
          <div className="w-full px-2 text-start flex items-center gap-1.5 text-[10px] text-muted">
            <span className="font-medium">درس بعدی:</span>
            <span className="text-foreground font-semibold truncate">
              {nextLessonTitle}
            </span>
          </div>
        )}
      </div>
    </BaseCard>
  );
}
