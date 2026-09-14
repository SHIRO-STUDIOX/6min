"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  CompletionCardState,
  PerformanceSummary,
  StreakData,
  LessonCompletionPayload,
  UseCompletionFsmOptions,
} from "@/types/completion";
import { useRewardAudio } from "./use-reward-audio";

/**
 * useCompletionFsm — پیاده‌سازی ماشین وضعیت متناهی (FSM) کارت پایان درس و پاداش
 * مدیریت چرخه حیات: ENTERING ⬅️ ANIMATING_REWARDS ⬅️ IDLE_READY ⬅️ SAVING ⬅️ NAVIGATING
 * با ذخیره‌سازی پس‌زمینه بدون مسدودسازی (Zero Friction / Optimistic UI)
 */
export function useCompletionFsm({
  lessonId,
  nextLessonId = null,
  performanceSummary,
  flaggedWords = [],
  streakData,
  rewardAnimationDurationMs = 600,
  onCompleteLesson,
  onNavigateNext,
  onAudioPlay,
  onStateChange,
}: UseCompletionFsmOptions) {
  // ۱. متغیرهای وضعیت اصلی FSM
  const [cardState, setCardState] = useState<CompletionCardState>("ENTERING");

  // مقادیر متحرک‌سازی شمارنده (Animated Counter Values)
  const [displayedScore, setDisplayedScore] = useState<number>(0);
  const [displayedStreak, setDisplayedStreak] = useState<number>(() => {
    if (streakData.isExtendedToday && typeof streakData.previousCount === "number") {
      return streakData.previousCount;
    }
    return streakData.isExtendedToday
      ? Math.max(1, streakData.currentCount - 1)
      : streakData.currentCount;
  });

  // مراجع تایمر و انیمیشن فریم
  const animationFrameRef = useRef<number | null>(null);
  const stateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasEnteredRef = useRef<boolean>(false);

  // هوک سنتز صوتی پاداش و استریک
  const { playRewardSound, playStreakSound } = useRewardAudio();

  // پاکسازی مراجع هنگام خروج
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (stateTimerRef.current) {
        clearTimeout(stateTimerRef.current);
      }
    };
  }, []);

  // ترنزیشن همراه با اطلاع‌رسانی
  const transitionTo = useCallback(
    (nextState: CompletionCardState) => {
      setCardState(nextState);
      if (onStateChange) {
        onStateChange(nextState);
      }
    },
    [onStateChange]
  );

  /**
   * اجرای انیمیشن افزایش نرم شمارنده اعداد (RAF Easing Counter)
   */
  const startCounterAnimation = useCallback(() => {
    const startTime = performance.now();
    const startScore = 0;
    const targetScore = Math.max(0, performanceSummary.totalScore);
    const startStreak =
      streakData.isExtendedToday && typeof streakData.previousCount === "number"
        ? streakData.previousCount
        : streakData.isExtendedToday
        ? Math.max(1, streakData.currentCount - 1)
        : streakData.currentCount;
    const targetStreak = streakData.currentCount;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / rewardAnimationDurationMs);

      // تابع Easing ملایم (Ease Out Quart)
      const easeProgress = 1 - Math.pow(1 - progress, 4);

      const currentScoreVal = Math.round(
        startScore + (targetScore - startScore) * easeProgress
      );
      setDisplayedScore(currentScoreVal);

      // در اواسط انیمیشن، استریک را فعال و به‌روزرسانی می‌کنیم
      if (progress >= 0.45 && streakData.isExtendedToday) {
        setDisplayedStreak(targetStreak);
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayedScore(targetScore);
        setDisplayedStreak(targetStreak);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [
    performanceSummary.totalScore,
    streakData.currentCount,
    streakData.isExtendedToday,
    streakData.previousCount,
    rewardAnimationDurationMs,
  ]);

  /**
   * فاز ۱: ترنزیشن خودکار از ENTERING به ANIMATING_REWARDS
   * و پخش صدای پاداش
   */
  useEffect(() => {
    if (cardState === "ENTERING" && !hasEnteredRef.current) {
      hasEnteredRef.current = true;

      // پخش افکت صوتی پاداش
      if (onAudioPlay) {
        onAudioPlay("reward");
      } else {
        playRewardSound();
      }

      // ترنزیشن سریع به فاز متحرک‌سازی پاداش
      stateTimerRef.current = setTimeout(() => {
        transitionTo("ANIMATING_REWARDS");
      }, 50);
    }
  }, [cardState, onAudioPlay, playRewardSound, transitionTo]);

  /**
   * فاز ۲: اجرای انیمیشن شمارنده در ANIMATING_REWARDS و انتقال به IDLE_READY
   */
  useEffect(() => {
    if (cardState === "ANIMATING_REWARDS") {
      // شروع انیمیشن عددی
      startCounterAnimation();

      // در صورت تمدید استریک، پخش نوای اشتعال آتش
      if (streakData.isExtendedToday) {
        stateTimerRef.current = setTimeout(() => {
          if (onAudioPlay) {
            onAudioPlay("streak");
          } else {
            playStreakSound();
          }
        }, Math.round(rewardAnimationDurationMs * 0.4));
      }

      // پس از پایان بازه ۶۰۰ میلی‌ثانیه‌ای، ورود به وضعیت آماده‌باش
      const completeTimer = setTimeout(() => {
        transitionTo("IDLE_READY");
      }, rewardAnimationDurationMs + 50);

      return () => {
        clearTimeout(completeTimer);
      };
    }
  }, [
    cardState,
    rewardAnimationDurationMs,
    startCounterAnimation,
    streakData.isExtendedToday,
    onAudioPlay,
    playStreakSound,
    transitionTo,
  ]);

  /**
   * ساخت پی‌لود نهایی جهت ارسال به سرور
   */
  const completionPayload: LessonCompletionPayload = useMemo(() => {
    return {
      lessonId,
      nextLessonId: nextLessonId || null,
      performanceSummary: {
        totalScore: performanceSummary.totalScore,
        mistakeCount: performanceSummary.mistakeCount,
        timeSpentSeconds: performanceSummary.timeSpentSeconds,
        accuracyPercentage:
          performanceSummary.accuracyPercentage ??
          Math.max(
            0,
            Math.min(
              100,
              Math.round(
                (1 -
                  performanceSummary.mistakeCount /
                    Math.max(1, performanceSummary.totalScore / 10)) *
                  100
              )
            )
          ),
      },
      flaggedWords,
      streakData,
      completedAt: new Date().toISOString(),
    };
  }, [lessonId, nextLessonId, performanceSummary, flaggedWords, streakData]);

  /**
   * فاز ۳ و ۴: لمس دکمه «درس بعدی ⚡»
   * ارسال ناهمگام در پس‌زمینه (SAVING) و انتقال بدون توقف به درس بعد (NAVIGATING)
   * رویکرد Zero Friction / Optimistic UI
   */
  const handleProceedNext = useCallback(() => {
    // جلوگیری از کلیک‌های مکرر
    if (cardState === "SAVING" || cardState === "NAVIGATING") {
      return;
    }

    // ۱. ورود به وضعیت SAVING
    transitionTo("SAVING");

    // ۲. ارسال پس‌زمینه بدون معطل کردن کاربر (Fire-and-Forget / Background Sync)
    if (onCompleteLesson) {
      try {
        Promise.resolve(onCompleteLesson(completionPayload)).catch((err) => {
          // ثبت خطای پس‌زمینه در سیستم پایش خطا بدون متوقف ساختن روت کاربر
          console.warn("[CompletionFSM] Background sync deferred error:", err);
        });
      } catch (err) {
        console.warn("[CompletionFSM] Sync error:", err);
      }
    }

    // ۳. تغییر بلافاصله به NAVIGATING جهت اتصال بی‌وقفه به درسنامه بعد
    transitionTo("NAVIGATING");

    if (onNavigateNext) {
      onNavigateNext(nextLessonId);
    }
  }, [
    cardState,
    transitionTo,
    onCompleteLesson,
    completionPayload,
    onNavigateNext,
    nextLessonId,
  ]);

  /**
   * اکشن ریست و اجرای مجدد جهت تست آسان در سندباکس
   */
  const replay = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (stateTimerRef.current) {
      clearTimeout(stateTimerRef.current);
    }
    hasEnteredRef.current = false;
    setDisplayedScore(0);
    setDisplayedStreak(
      streakData.isExtendedToday && typeof streakData.previousCount === "number"
        ? streakData.previousCount
        : streakData.isExtendedToday
        ? Math.max(1, streakData.currentCount - 1)
        : streakData.currentCount
    );
    transitionTo("ENTERING");
  }, [streakData, transitionTo]);

  return {
    cardState,
    displayedScore,
    displayedStreak,
    isAnimating: cardState === "ANIMATING_REWARDS",
    isReady: cardState === "IDLE_READY",
    isSaving: cardState === "SAVING",
    isNavigating: cardState === "NAVIGATING",
    completionPayload,
    handleProceedNext,
    replay,
  };
}
