"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  GrammarCardState,
  GrammarToken,
  GrammarSentence,
  GrammarResult,
  UseGrammarFsmOptions,
} from "@/types/grammar";

/**
 * جملات پیش‌فرض آموزش گرامر و ساختار جمله (Present Continuous & Active Usage)
 */
export const DEFAULT_GRAMMAR_SENTENCES: GrammarSentence[] = [
  {
    id: "sent-1",
    targetSentence: "I am learning English grammar",
    tokens: ["I", "am", "learning", "English", "grammar"],
    distractors: ["is", "learn", "reads"],
    translation: "من در حال یادگیری گرامر انگلیسی هستم",
    audioUrl: "https://dict.youdao.com/dictvoice?audio=I+am+learning+English+grammar&type=2",
    hint: "برای فاعل I از فعل کمکی am و فرم ing استفاده می‌شود.",
  },
  {
    id: "sent-2",
    targetSentence: "She reads new books every day",
    tokens: ["She", "reads", "new", "books", "every", "day"],
    distractors: ["reading", "is", "novel"],
    translation: "او هر روز کتاب‌های جدید می‌خواند",
    audioUrl: "https://dict.youdao.com/dictvoice?audio=She+reads+new+books+every+day&type=2",
    hint: "در حال ساده برای سوم‌شخص مفرد (She) فعل s می‌گیرد.",
  },
  {
    id: "sent-3",
    targetSentence: "They are designing a modern application",
    tokens: ["They", "are", "designing", "a", "modern", "application"],
    distractors: ["is", "designed", "an"],
    translation: "آن‌ها در حال طراحی یک اپلیکیشن مدرن هستند",
    audioUrl: "https://dict.youdao.com/dictvoice?audio=They+are+designing+a+modern+application&type=2",
    hint: "برای فاعل جمع They از فعل کمکی are استفاده می‌شود.",
  },
];

/**
 * تابع شافل آرایه به روش استاندارد Fisher-Yates
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * ایجاد توکن‌های مجزا و یکتا از جمله و کلمات انحرافی
 */
function buildSentenceTokens(
  sentence: GrammarSentence,
  autoShuffle: boolean
): GrammarToken[] {
  const correctTokens: GrammarToken[] = sentence.tokens.map((text, idx) => ({
    id: `token-${sentence.id}-c-${idx}-${text}`,
    text,
    isDistractor: false,
    orderIndex: idx,
  }));

  const distractorTokens: GrammarToken[] = (sentence.distractors || []).map(
    (text, idx) => ({
      id: `token-${sentence.id}-d-${idx}-${text}`,
      text,
      isDistractor: true,
      orderIndex: -1,
    })
  );

  const combined = [...correctTokens, ...distractorTokens];
  return autoShuffle ? shuffleArray(combined) : combined;
}

/**
 * نرمال‌سازی رشته برای مقایسه بدون وابستگی به حروف بزرگ/کوچک یا علائم نگارشی پایانی
 */
function normalizeSentence(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * useGrammarFsm — هوک ماشین وضعیت متناهی (FSM) تعاملی پازل کلمات و کارت گرامر
 */
export function useGrammarFsm({
  sentences = DEFAULT_GRAMMAR_SENTENCES,
  initialSentenceIndex = 0,
  autoShuffleBank = true,
  successFeedbackMs = 900,
  errorFeedbackMs = 1000,
  autoPlayAudioOnSuccess = true,
  onAudioPlay,
  onSentenceComplete,
  onComplete,
  onStateChange,
}: UseGrammarFsmOptions) {
  // ۱. متغیرهای وضعیت (State Variables)
  const [currentSentenceIndex, setCurrentSentenceIndex] =
    useState<number>(initialSentenceIndex);
  const [cardState, setCardState] = useState<GrammarCardState>("IDLE");
  const [selectedTokens, setSelectedTokens] = useState<GrammarToken[]>([]);
  const [allBankTokens, setAllBankTokens] = useState<GrammarToken[]>(() => {
    const initialSentence = sentences[initialSentenceIndex] || sentences[0];
    // رندر اولیه قطعی بدون شافل برای هماهنگی با SSR و پیشگیری از خطای Hydration Mismatch
    return initialSentence
      ? buildSentenceTokens(initialSentence, false)
      : [];
  });
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [mistakeCount, setMistakeCount] = useState<number>(0);
  const [mistakenSentenceIds, setMistakenSentenceIds] = useState<Set<string>>(
    new Set()
  );

  // مراجع تایمرها و پلیر صوتی
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // جمله جاری
  const currentSentence: GrammarSentence | undefined = useMemo(() => {
    return sentences[currentSentenceIndex] || sentences[0];
  }, [sentences, currentSentenceIndex]);

  // توکن‌های موجود و قابل انتخاب در مخزن (availableBankTokens)
  const availableBankTokens: GrammarToken[] = useMemo(() => {
    const selectedIds = new Set(selectedTokens.map((t) => t.id));
    return allBankTokens.filter((token) => !selectedIds.has(token.id));
  }, [allBankTokens, selectedTokens]);

  // پاکسازی تایمرها و صوت هنگام Unmount
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

  // بازتنظیم هنگام تغییر لیست sentences از بیرون
  useEffect(() => {
    if (!sentences || sentences.length === 0) return;
    const initialSentence = sentences[0];
    setCurrentSentenceIndex(0);
    setAllBankTokens(buildSentenceTokens(initialSentence, autoShuffleBank));
    setSelectedTokens([]);
    setCardState("IDLE");
    setIsLocked(false);
    setMistakeCount(0);
    setMistakenSentenceIds(new Set());
  }, [sentences, autoShuffleBank]);

  // تغییر وضعیت همراه با اطلاع‌رسانی به والد
  const updateState = useCallback(
    (nextState: GrammarCardState) => {
      setCardState(nextState);
      if (onStateChange) {
        onStateChange(nextState);
      }
    },
    [onStateChange]
  );

  // پخش ایمن فایل صوتی
  const playAudio = useCallback(
    (audioUrl?: string, sentence?: GrammarSentence) => {
      if (!audioUrl) return;
      try {
        if (onAudioPlay && sentence) {
          onAudioPlay(audioUrl, sentence);
        }
        if (activeAudioRef.current) {
          activeAudioRef.current.pause();
        }
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;
        audio.play().catch(() => {
          // جلوگیری از خطای پالیسی Autoplay مرورگر
        });
      } catch {
        // نادیده‌گیری خطا در محیط‌های SSR یا فاقد خروجی صوت
      }
    },
    [onAudioPlay]
  );

  // پخش صدای جمله فعال توسط کاربر
  const playCurrentSentenceAudio = useCallback(() => {
    if (currentSentence?.audioUrl) {
      playAudio(currentSentence.audioUrl, currentSentence);
    }
  }, [currentSentence, playAudio]);

  // بارگذاری جمله بر اساس ایندکس
  const loadSentence = useCallback(
    (index: number) => {
      if (!sentences[index]) return;
      const targetSentence = sentences[index];
      setCurrentSentenceIndex(index);
      setAllBankTokens(buildSentenceTokens(targetSentence, autoShuffleBank));
      setSelectedTokens([]);
      setIsLocked(false);
      updateState("IDLE");
    },
    [sentences, autoShuffleBank, updateState]
  );

  // ۱. انتخاب توکن از مخزن و انتقال به خط جمله
  const selectBankToken = useCallback(
    (token: GrammarToken) => {
      if (
        isLocked ||
        cardState === "CHECKING" ||
        cardState === "SUCCESS" ||
        cardState === "COMPLETED"
      ) {
        return;
      }

      // بررسی عدم وجود قبلی در selectedTokens
      if (selectedTokens.some((t) => t.id === token.id)) {
        return;
      }

      const nextSelected = [...selectedTokens, token];
      setSelectedTokens(nextSelected);

      // بررسی رسیدن تعداد توکن‌ها به حدنصاب جمله هدف
      const targetCount = currentSentence?.tokens.length ?? 0;
      if (targetCount > 0 && nextSelected.length >= targetCount) {
        updateState("READY_TO_CHECK");
      } else {
        updateState("BUILDING");
      }
    },
    [isLocked, cardState, selectedTokens, currentSentence, updateState]
  );

  // ۲. لمس توکن از خط جمله و بازگرداندن آن به مخزن
  const deselectSentenceToken = useCallback(
    (token: GrammarToken) => {
      if (
        isLocked ||
        cardState === "CHECKING" ||
        cardState === "SUCCESS" ||
        cardState === "COMPLETED"
      ) {
        return;
      }

      const nextSelected = selectedTokens.filter((t) => t.id !== token.id);
      setSelectedTokens(nextSelected);

      const targetCount = currentSentence?.tokens.length ?? 0;
      if (nextSelected.length === 0) {
        updateState("IDLE");
      } else if (targetCount > 0 && nextSelected.length >= targetCount) {
        updateState("READY_TO_CHECK");
      } else {
        updateState("BUILDING");
      }
    },
    [isLocked, cardState, selectedTokens, currentSentence, updateState]
  );

  // ۳. اعتبارسنجی جمله در فاز CHECKING
  const checkSentence = useCallback(() => {
    if (
      isLocked ||
      cardState === "CHECKING" ||
      cardState === "SUCCESS" ||
      cardState === "COMPLETED" ||
      !currentSentence
    ) {
      return;
    }

    setIsLocked(true);
    updateState("CHECKING");

    const builtSentence = selectedTokens.map((t) => t.text).join(" ");
    const normalizedBuilt = normalizeSentence(builtSentence);
    const normalizedTarget = normalizeSentence(currentSentence.targetSentence);
    const normalizedTokens = normalizeSentence(currentSentence.tokens.join(" "));

    const isMatch =
      normalizedBuilt === normalizedTarget || normalizedBuilt === normalizedTokens;

    if (isMatch) {
      // شاخه موفقیت (SUCCESS)
      updateState("SUCCESS");

      if (autoPlayAudioOnSuccess && currentSentence.audioUrl) {
        playAudio(currentSentence.audioUrl, currentSentence);
      }

      if (onSentenceComplete) {
        onSentenceComplete(currentSentence, currentSentenceIndex);
      }

      const isLastSentence = currentSentenceIndex >= sentences.length - 1;

      transitionTimerRef.current = setTimeout(() => {
        if (isLastSentence) {
          // اتمام کلیه تمرینات کارت (COMPLETED)
          updateState("COMPLETED");
          setIsLocked(false);

          if (onComplete) {
            const totalAttempts = sentences.length + mistakeCount;
            const accuracy =
              totalAttempts > 0
                ? Math.round((sentences.length / totalAttempts) * 100)
                : 100;

            onComplete({
              mistakeCount,
              totalSentences: sentences.length,
              completedSentences: sentences.length,
              accuracyPercentage: accuracy,
              mistakenSentenceIds: Array.from(mistakenSentenceIds),
              completedAt: new Date().toISOString(),
            });
          }
        } else {
          // انتقال روان به جمله بعدی و بازگشت به IDLE
          loadSentence(currentSentenceIndex + 1);
        }
      }, successFeedbackMs);
    } else {
      // شاخه خطا (ERROR)
      updateState("ERROR");
      setMistakeCount((prev) => prev + 1);
      setMistakenSentenceIds((prev) => {
        const nextSet = new Set(prev);
        nextSet.add(currentSentence.id);
        return nextSet;
      });

      transitionTimerRef.current = setTimeout(() => {
        // بازگشت به حالت تعاملی جهت اصلاح توسط کاربر
        const targetCount = currentSentence.tokens.length;
        if (selectedTokens.length >= targetCount) {
          updateState("READY_TO_CHECK");
        } else {
          updateState("BUILDING");
        }
        setIsLocked(false);
      }, errorFeedbackMs);
    }
  }, [
    isLocked,
    cardState,
    currentSentence,
    selectedTokens,
    autoPlayAudioOnSuccess,
    currentSentenceIndex,
    sentences.length,
    successFeedbackMs,
    errorFeedbackMs,
    mistakeCount,
    mistakenSentenceIds,
    updateState,
    playAudio,
    onSentenceComplete,
    onComplete,
    loadSentence,
  ]);

  // بازنشانی جمله جاری (برگشت تمام کلمات به مخزن)
  const resetCurrentSentence = useCallback(() => {
    if (isLocked) return;
    setSelectedTokens([]);
    updateState("IDLE");
  }, [isLocked, updateState]);

  // بازنشانی کامل کارت از ابتدا
  const resetAll = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }
    setCurrentSentenceIndex(0);
    setMistakeCount(0);
    setMistakenSentenceIds(new Set());
    const firstSentence = sentences[0];
    if (firstSentence) {
      setAllBankTokens(buildSentenceTokens(firstSentence, autoShuffleBank));
    }
    setSelectedTokens([]);
    setIsLocked(false);
    updateState("IDLE");
  }, [sentences, autoShuffleBank, updateState]);

  // محاسبه درصد پیشرفت کارت
  const progressPercentage = useMemo(() => {
    if (cardState === "COMPLETED") return 100;
    if (sentences.length === 0) return 0;
    const completedCount = currentSentenceIndex;
    return (completedCount / sentences.length) * 100;
  }, [sentences.length, currentSentenceIndex, cardState]);

  return {
    // متغیرهای وضعیت درخواستی FSM
    sentences,
    currentSentenceIndex,
    currentSentence,
    selectedTokens,
    availableBankTokens,
    allBankTokens,
    isLocked,
    cardState,
    mistakeCount,
    mistakenSentenceIds,
    progressPercentage,
    isCompleted: cardState === "COMPLETED",

    // اکشن‌ها و هندلرهای تعاملی
    selectBankToken,
    deselectSentenceToken,
    checkSentence,
    resetCurrentSentence,
    resetAll,
    loadSentence,
    playCurrentSentenceAudio,
  };
}
