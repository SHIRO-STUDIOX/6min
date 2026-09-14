"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  DictationCardState,
  DictationPrompt,
  DictationResult,
  UseDictationFsmOptions,
  DEFAULT_DICTATION_PROMPTS,
} from "@/types/dictation";

/**
 * الگوریتم محاسبه فاصله لون‌اشتاین (Levenshtein Distance)
 * برای سنجش میزان شباهت و تشخیص خطاهای تایپی جزئی (Typo)
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * تابع استاندارد نرمال‌سازی رشته برای تطبیق هوشمند ورودی با متن هدف
 * یکسان‌سازی کاراکترهای یونیکد، آپوستروف‌های مختلف، حذف علائم نگارشی پایانی و فاصله‌های اضافی
 */
export function normalizeDictationString(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFC")
    .trim()
    .toLowerCase()
    // یکسان‌سازی انواع آپوستروف و گیومه‌های تکی
    .replace(/[’‘`´‛]/g, "'")
    // یکسان‌سازی انواع گیومه‌های دوتایی
    .replace(/[“”„‟]/g, '"')
    // حذف علائم نگارشی پایانی معمول (نقطه، کاما، علامت سوال و تعجب)
    .replace(/[.,!?;:]+$/g, "")
    // یکپارچه‌سازی فواصل خالی مکرر
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * تعیین آستانه مجاز فاصله لون‌اشتاین بر مبنای طول متن
 */
export function getTypoThreshold(textLength: number, customThreshold?: number): number {
  if (typeof customThreshold === "number") {
    return customThreshold;
  }
  if (textLength <= 3) return 0; // برای کلمات ۳ حرفی یا کوتاه‌تر، خطای تایپی مجاز نیست
  if (textLength <= 7) return 1; // ۱ تغییر کاراکتر مجاز
  return 2; // برای عبارات طولانی‌تر تا ۲ تغییر مجاز
}

/**
 * useDictationFsm — پیاده‌سازی ماشین وضعیت متناهی (FSM) کارت املای سریع صوتی
 */
export function useDictationFsm({
  prompts = DEFAULT_DICTATION_PROMPTS,
  initialIndex = 0,
  autoPlayOnLoad = false,
  typoLevenshteinThreshold,
  successFeedbackMs = 900,
  typoFeedbackMs = 1500,
  errorFeedbackMs = 1200,
  onAudioPlay,
  onPromptComplete,
  onComplete,
  onStateChange,
}: UseDictationFsmOptions) {
  // ۱. متغیرهای وضعیت FSM (State Variables)
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [inputBuffer, setInputBuffer] = useState<string>("");
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [cardState, setCardState] = useState<DictationCardState>("IDLE");
  const [mistakeCount, setMistakeCount] = useState<number>(0);
  const [completedPromptsCount, setCompletedPromptsCount] = useState<number>(0);
  const [flaggedWords, setFlaggedWords] = useState<string[]>([]);
  const [mistakenPromptIds, setMistakenPromptIds] = useState<Set<string>>(
    new Set()
  );

  // پیام راهنمای بازخورد پویا (برای نمایش هشدار تایپی یا پاسخ صحیح)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // مراجع تایمرها، صوت و فیلد اینپوت
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // پرامپت فعال جاری
  const currentPrompt: DictationPrompt | undefined = useMemo(() => {
    return prompts[currentIndex] || prompts[0];
  }, [prompts, currentIndex]);

  // اطلاع‌رسانی و به‌روزرسانی وضعیت
  const updateState = useCallback(
    (nextState: DictationCardState) => {
      setCardState(nextState);
      if (onStateChange) {
        onStateChange(nextState);
      }
    },
    [onStateChange]
  );

  // پاکسازی تایمرها و پلیر صدا در Unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, []);

  // تمرکز مجدد روی فیلد متن
  const focusInput = useCallback(() => {
    // جلوگیری از تداخل تا پایان رندر جاری
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  }, []);

  // پخش ایمن صوت با مدیریت وضعیت‌های PLAYING_AUDIO و بازگشت به IDLE
  const playAudio = useCallback(
    (customUrl?: string) => {
      const urlToPlay = customUrl || currentPrompt?.audioUrl;
      if (!urlToPlay || !currentPrompt) return;

      try {
        if (onAudioPlay) {
          onAudioPlay(urlToPlay, currentPrompt);
        }

        if (activeAudioRef.current) {
          activeAudioRef.current.pause();
          activeAudioRef.current = null;
        }

        const audio = new Audio(urlToPlay);
        activeAudioRef.current = audio;
        updateState("PLAYING_AUDIO");

        audio.onended = () => {
          activeAudioRef.current = null;
          // با اتمام صدا، بازگشت به IDLE و فوکوس روی فیلد متن
          updateState("IDLE");
          focusInput();
        };

        audio.onerror = () => {
          activeAudioRef.current = null;
          updateState("IDLE");
          focusInput();
        };

        audio.play().catch(() => {
          // در صورت بلاک شدن Autoplay مرورگر، به حالت IDLE بازمی‌گردد
          updateState("IDLE");
          focusInput();
        });
      } catch {
        updateState("IDLE");
        focusInput();
      }
    },
    [currentPrompt, onAudioPlay, updateState, focusInput]
  );

  // بارگذاری پرامپت با ایندکس مشخص
  const loadPrompt = useCallback(
    (index: number, shouldPlayAudio = false) => {
      if (!prompts[index]) return;
      setCurrentIndex(index);
      setInputBuffer("");
      setFeedbackMessage(null);
      setIsLocked(false);
      updateState("IDLE");

      if (shouldPlayAudio && prompts[index].audioUrl) {
        // تاخیر کوتاه برای روان‌بودن ترنزیشن
        setTimeout(() => {
          playAudio(prompts[index].audioUrl);
        }, 150);
      } else {
        focusInput();
      }
    },
    [prompts, playAudio, updateState, focusInput]
  );

  // بازنشانی هنگام تغییر لیست پرامپت‌ها از والد
  useEffect(() => {
    if (!prompts || prompts.length === 0) return;
    setCurrentIndex(0);
    setInputBuffer("");
    setIsLocked(false);
    setMistakeCount(0);
    setCompletedPromptsCount(0);
    setFlaggedWords([]);
    setMistakenPromptIds(new Set());
    setFeedbackMessage(null);
    updateState("IDLE");

    if (autoPlayOnLoad && prompts[0]?.audioUrl) {
      setTimeout(() => {
        playAudio(prompts[0].audioUrl);
      }, 300);
    } else {
      focusInput();
    }
  }, [prompts, autoPlayOnLoad, playAudio, updateState, focusInput]);

  // به‌روزرسانی محتوای ورودی توسط کاربر (TYPING)
  const handleInputChange = useCallback(
    (newText: string) => {
      if (isLocked || cardState === "COMPLETED" || cardState === "EVALUATING") {
        return;
      }

      setInputBuffer(newText);
      if (feedbackMessage) {
        setFeedbackMessage(null);
      }

      if (
        cardState === "IDLE" ||
        cardState === "ERROR" ||
        cardState === "TYPO_WARNING"
      ) {
        updateState("TYPING");
      }
    },
    [isLocked, cardState, feedbackMessage, updateState]
  );

  // درج سریع کاراکتر ویژه در موقعیت کرسر یا انتهای متن
  const insertSpecialCharacter = useCallback(
    (char: string) => {
      if (isLocked || cardState === "COMPLETED" || cardState === "EVALUATING") {
        return;
      }

      const inputEl = inputRef.current;
      if (inputEl) {
        const start = inputEl.selectionStart ?? inputBuffer.length;
        const end = inputEl.selectionEnd ?? inputBuffer.length;
        const updated =
          inputBuffer.substring(0, start) + char + inputBuffer.substring(end);
        setInputBuffer(updated);
        updateState("TYPING");

        setTimeout(() => {
          inputEl.focus();
          const nextPos = start + char.length;
          inputEl.setSelectionRange(nextPos, nextPos);
        }, 20);
      } else {
        setInputBuffer((prev) => prev + char);
        updateState("TYPING");
        focusInput();
      }
    },
    [isLocked, cardState, inputBuffer, updateState, focusInput]
  );

  // ارزیابی و سابمیت مقدار ورودی (EVALUATING)
  const submitAnswer = useCallback(() => {
    if (
      isLocked ||
      cardState === "EVALUATING" ||
      cardState === "SUCCESS" ||
      cardState === "COMPLETED" ||
      !currentPrompt
    ) {
      return;
    }

    const rawInput = inputBuffer.trim();
    if (!rawInput) {
      focusInput();
      return;
    }

    // تغییر وضعیت به EVALUATING و قفل تعامل
    setIsLocked(true);
    updateState("EVALUATING");

    const normalizedInput = normalizeDictationString(rawInput);
    const normalizedTarget = normalizeDictationString(currentPrompt.targetText);
    const normalizedVariants = (currentPrompt.acceptableVariants || []).map((v) =>
      normalizeDictationString(v)
    );

    // ۱. بررسی تطابق کامل (Exact Match)
    const isExactMatch =
      normalizedInput === normalizedTarget ||
      normalizedVariants.includes(normalizedInput);

    if (isExactMatch) {
      // شاخه موفقیت (SUCCESS)
      updateState("SUCCESS");
      setFeedbackMessage("آفرین! املا کاملاً صحیح بود.");
      const nextCompletedCount = completedPromptsCount + 1;
      setCompletedPromptsCount(nextCompletedCount);

      if (onPromptComplete) {
        onPromptComplete(currentPrompt, currentIndex, false);
      }

      const isLastPrompt = currentIndex >= prompts.length - 1;

      transitionTimerRef.current = setTimeout(() => {
        if (isLastPrompt) {
          // اتمام کلیه پرامپت‌ها (COMPLETED)
          updateState("COMPLETED");
          setIsLocked(false);

          if (onComplete) {
            const totalPrompts = prompts.length;
            const totalAttempts = totalPrompts + mistakeCount;
            const accuracy =
              totalAttempts > 0
                ? Math.round((totalPrompts / totalAttempts) * 100)
                : 100;

            onComplete({
              mistakeCount,
              totalPrompts,
              completedPrompts: totalPrompts,
              accuracyPercentage: accuracy,
              flaggedWords,
              mistakenPromptIds: Array.from(mistakenPromptIds),
              completedAt: new Date().toISOString(),
            });
          }
        } else {
          // انتقال به پرامپت بعدی و بازگشت به IDLE
          loadPrompt(currentIndex + 1, autoPlayOnLoad);
        }
      }, successFeedbackMs);

      return;
    }

    // ۲. بررسی خطای تایپی جزئی (Typo Warning) با الگوریتم لون‌اشتاین
    const targetDistance = calculateLevenshteinDistance(
      normalizedInput,
      normalizedTarget
    );
    const minVariantDistance = normalizedVariants.length > 0
      ? Math.min(
          ...normalizedVariants.map((v) =>
            calculateLevenshteinDistance(normalizedInput, v)
          )
        )
      : Infinity;

    const minDistance = Math.min(targetDistance, minVariantDistance);
    const threshold = getTypoThreshold(
      normalizedTarget.length,
      typoLevenshteinThreshold
    );

    const isTypo = minDistance > 0 && minDistance <= threshold;

    if (isTypo) {
      // شاخه هشدار تایپی جزئی (TYPO_WARNING)
      updateState("TYPO_WARNING");
      setFeedbackMessage(
        `پاسخ پذیرفته شد، اما دقت کنید: املای دقیق «${currentPrompt.targetText}» است.`
      );

      // ثبت در لیست کلمات نیازمند توجه (flaggedWords)
      setFlaggedWords((prev) =>
        prev.includes(currentPrompt.targetText)
          ? prev
          : [...prev, currentPrompt.targetText]
      );

      const nextCompletedCount = completedPromptsCount + 1;
      setCompletedPromptsCount(nextCompletedCount);

      if (onPromptComplete) {
        onPromptComplete(currentPrompt, currentIndex, true);
      }

      const isLastPrompt = currentIndex >= prompts.length - 1;

      transitionTimerRef.current = setTimeout(() => {
        if (isLastPrompt) {
          updateState("COMPLETED");
          setIsLocked(false);

          if (onComplete) {
            const totalPrompts = prompts.length;
            const totalAttempts = totalPrompts + mistakeCount;
            const accuracy =
              totalAttempts > 0
                ? Math.round((totalPrompts / totalAttempts) * 100)
                : 100;

            onComplete({
              mistakeCount,
              totalPrompts,
              completedPrompts: totalPrompts,
              accuracyPercentage: accuracy,
              flaggedWords: [
                ...flaggedWords,
                currentPrompt.targetText,
              ],
              mistakenPromptIds: Array.from(mistakenPromptIds),
              completedAt: new Date().toISOString(),
            });
          }
        } else {
          loadPrompt(currentIndex + 1, autoPlayOnLoad);
        }
      }, typoFeedbackMs);

      return;
    }

    // ۳. شاخه خطا (ERROR)
    updateState("ERROR");
    setMistakeCount((prev) => prev + 1);
    setMistakenPromptIds((prev) => {
      const next = new Set(prev);
      next.add(currentPrompt.id);
      return next;
    });
    setFlaggedWords((prev) =>
      prev.includes(currentPrompt.targetText)
        ? prev
        : [...prev, currentPrompt.targetText]
    );

    setFeedbackMessage(
      `املای صحیح: ${currentPrompt.targetText}${
        currentPrompt.hint ? ` (${currentPrompt.hint})` : ""
      }`
    );

    // آزادسازی ورودی پس از تاخیر فیدبک جهت اصلاح توسط کاربر
    transitionTimerRef.current = setTimeout(() => {
      setIsLocked(false);
      focusInput();
    }, errorFeedbackMs);
  }, [
    isLocked,
    cardState,
    currentPrompt,
    inputBuffer,
    completedPromptsCount,
    onPromptComplete,
    currentIndex,
    prompts.length,
    successFeedbackMs,
    typoLevenshteinThreshold,
    flaggedWords,
    autoPlayOnLoad,
    mistakeCount,
    mistakenPromptIds,
    onComplete,
    loadPrompt,
    typoFeedbackMs,
    errorFeedbackMs,
    focusInput,
    updateState,
  ]);

  // بازنشانی پرامپت جاری
  const resetCurrent = useCallback(() => {
    if (isLocked) return;
    setInputBuffer("");
    setFeedbackMessage(null);
    updateState("IDLE");
    focusInput();
  }, [isLocked, focusInput, updateState]);

  // بازنشانی کامل کارت
  const resetAll = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setCurrentIndex(0);
    setInputBuffer("");
    setIsLocked(false);
    setMistakeCount(0);
    setCompletedPromptsCount(0);
    setFlaggedWords([]);
    setMistakenPromptIds(new Set());
    setFeedbackMessage(null);
    updateState("IDLE");
    focusInput();
  }, [focusInput, updateState]);

  // محاسبه درصد پیشرفت بر مبنای اقلام تکمیل‌شده
  const progressPercentage = useMemo(() => {
    if (cardState === "COMPLETED") return 100;
    if (prompts.length === 0) return 0;
    return (completedPromptsCount / prompts.length) * 100;
  }, [cardState, completedPromptsCount, prompts.length]);

  return {
    // متغیرهای وضعیت FSM
    prompts,
    currentIndex,
    currentPrompt,
    inputBuffer,
    isLocked,
    cardState,
    mistakeCount,
    completedPromptsCount,
    flaggedWords,
    mistakenPromptIds,
    feedbackMessage,
    progressPercentage,
    isCompleted: cardState === "COMPLETED",

    // مراجع
    inputRef,

    // اکشن‌ها و هندلرها
    handleInputChange,
    submitAnswer,
    playAudio,
    insertSpecialCharacter,
    resetCurrent,
    resetAll,
    loadPrompt,
    focusInput,
  };
}
