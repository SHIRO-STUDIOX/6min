"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

/**
 * تایپ‌های وضعیت ماشین وضعیت متناهی (FSM)
 */
export type VocabularyCardState =
  | "IDLE"
  | "SOURCE_SELECTED"
  | "EVALUATING"
  | "MATCH_SUCCESS"
  | "MISMATCH_ERROR"
  | "COMPLETED";

/**
 * آیتم مبدأ یا مقصد
 */
export interface VocabularyColumnItem {
  id: string;
  pairId: string;
  text: string;
  subText?: string;
  audioSrc?: string;
  phonetic?: string;
  metadata?: Record<string, unknown>;
}

/**
 * ساختار داده‌ای هر جفت واژگان
 */
export interface VocabularyPair {
  id: string;
  source: {
    id?: string;
    text: string;
    subText?: string;
    audioSrc?: string;
    phonetic?: string;
    metadata?: Record<string, unknown>;
  };
  target: {
    id?: string;
    text: string;
    subText?: string;
    audioSrc?: string;
    metadata?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

/**
 * گزارش عملکرد ارسالی به رویداد onComplete
 */
export interface VocabularyResult {
  mistakeCount: number;
  totalPairs: number;
  matchedCount: number;
  mistakenPairs: VocabularyPair[];
  accuracyPercentage: number;
}

export interface UseVocabularyFsmOptions {
  pairs: VocabularyPair[];
  autoShuffleTarget?: boolean;
  successFeedbackMs?: number;
  errorFeedbackMs?: number;
  onAudioPlay?: (audioSrc: string, item: VocabularyColumnItem) => void;
  onComplete?: (result: VocabularyResult) => void;
  onStateChange?: (state: VocabularyCardState) => void;
}

/**
 * تابع شافل آرایه به روش Fisher-Yates
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
 * useVocabularyFsm — پیاده‌سازی ماشین وضعیت متناهی (FSM) تعاملی کارت واژگان
 */
export function useVocabularyFsm({
  pairs,
  autoShuffleTarget = true,
  successFeedbackMs = 650,
  errorFeedbackMs = 850,
  onAudioPlay,
  onComplete,
  onStateChange,
}: UseVocabularyFsmOptions) {
  // ۱. متغیرهای وضعیت (State Variables)
  const [cardState, setCardState] = useState<VocabularyCardState>("IDLE");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [mistakeCount, setMistakeCount] = useState<number>(0);
  const [mistakenPairIds, setMistakenPairIds] = useState<Set<string>>(new Set());

  // مرجع تایمرهای ترنزیشن
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // پاکسازی تایمرها هنگام Unmount
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

  // آماده‌سازی آیتم‌های ستون مبدأ
  const sourceItems: VocabularyColumnItem[] = useMemo(() => {
    return pairs.map((pair) => ({
      id: pair.source.id || `src-${pair.id}`,
      pairId: pair.id,
      text: pair.source.text,
      subText: pair.source.subText,
      audioSrc: pair.source.audioSrc,
      phonetic: pair.source.phonetic,
      metadata: pair.source.metadata,
    }));
  }, [pairs]);

  // آماده‌سازی و شافل آیتم‌های ستون مقصد
  const [targetItems, setTargetItems] = useState<VocabularyColumnItem[]>(() => {
    const rawTargets: VocabularyColumnItem[] = pairs.map((pair) => ({
      id: pair.target.id || `tgt-${pair.id}`,
      pairId: pair.id,
      text: pair.target.text,
      subText: pair.target.subText,
      audioSrc: pair.target.audioSrc,
      metadata: pair.target.metadata,
    }));
    return autoShuffleTarget ? shuffleArray(rawTargets) : rawTargets;
  });

  // در صورت تغییر لیست pairs از بیرون، بازتنظیم داده‌ها
  useEffect(() => {
    const rawTargets: VocabularyColumnItem[] = pairs.map((pair) => ({
      id: pair.target.id || `tgt-${pair.id}`,
      pairId: pair.id,
      text: pair.target.text,
      subText: pair.target.subText,
      audioSrc: pair.target.audioSrc,
      metadata: pair.target.metadata,
    }));
    setTargetItems(autoShuffleTarget ? shuffleArray(rawTargets) : rawTargets);
    setCardState("IDLE");
    setSelectedSourceId(null);
    setSelectedTargetId(null);
    setMatchedIds(new Set());
    setIsLocked(false);
    setMistakeCount(0);
    setMistakenPairIds(new Set());
  }, [pairs, autoShuffleTarget]);

  // پخش ایمن صدا
  const playAudio = useCallback(
    (audioSrc?: string, item?: VocabularyColumnItem) => {
      if (!audioSrc) return;
      try {
        if (onAudioPlay && item) {
          onAudioPlay(audioSrc, item);
        }
        if (activeAudioRef.current) {
          activeAudioRef.current.pause();
        }
        const audio = new Audio(audioSrc);
        activeAudioRef.current = audio;
        audio.play().catch(() => {
          // جلوگیری از خطای مرورگر به دلیل پالیسی Autoplay
        });
      } catch {
        // نادیده‌گیری خطای صدا در محیط‌های بدون کارت صدا یا SSR
      }
    },
    [onAudioPlay]
  );

  // تغییر وضعیت همراه با اطلاع‌رسانی
  const updateState = useCallback(
    (nextState: VocabularyCardState) => {
      setCardState(nextState);
      if (onStateChange) {
        onStateChange(nextState);
      }
    },
    [onStateChange]
  );

  // محاسبه پیشرفت کارت
  const progressPercentage =
    pairs.length > 0 ? (matchedIds.size / pairs.length) * 100 : 0;

  // بررسی تطابق جفت‌ها در فاز EVALUATING
  const evaluateMatch = useCallback(
    (sourceId: string, targetId: string) => {
      const srcItem = sourceItems.find((item) => item.id === sourceId);
      const tgtItem = targetItems.find((item) => item.id === targetId);

      if (!srcItem || !tgtItem) {
        setIsLocked(false);
        updateState("IDLE");
        return;
      }

      const isMatch = srcItem.pairId === tgtItem.pairId;

      if (isMatch) {
        // شاخه تطابق موفق (MATCH_SUCCESS)
        updateState("MATCH_SUCCESS");
        const nextMatched = new Set(matchedIds);
        nextMatched.add(srcItem.pairId);
        setMatchedIds(nextMatched);

        const isAllCompleted = nextMatched.size === pairs.length;

        transitionTimerRef.current = setTimeout(() => {
          setSelectedSourceId(null);
          setSelectedTargetId(null);

          if (isAllCompleted) {
            updateState("COMPLETED");
            setIsLocked(false);

            // ارسال رویداد اتمام همراه با خروجی عملکرد
            if (onComplete) {
              const mistakenPairs = pairs.filter((p) =>
                mistakenPairIds.has(p.id)
              );
              const totalAttempts = pairs.length + mistakeCount;
              const accuracy =
                totalAttempts > 0
                  ? Math.round((pairs.length / totalAttempts) * 100)
                  : 100;

              onComplete({
                mistakeCount,
                totalPairs: pairs.length,
                matchedCount: nextMatched.size,
                mistakenPairs,
                accuracyPercentage: accuracy,
              });
            }
          } else {
            updateState("IDLE");
            setIsLocked(false);
          }
        }, successFeedbackMs);
      } else {
        // شاخه عدم تطابق (MISMATCH_ERROR)
        updateState("MISMATCH_ERROR");
        setMistakeCount((prev) => prev + 1);
        setMistakenPairIds((prev) => {
          const nextSet = new Set(prev);
          nextSet.add(srcItem.pairId);
          return nextSet;
        });

        transitionTimerRef.current = setTimeout(() => {
          setSelectedSourceId(null);
          setSelectedTargetId(null);
          updateState("IDLE");
          setIsLocked(false);
        }, errorFeedbackMs);
      }
    },
    [
      sourceItems,
      targetItems,
      matchedIds,
      pairs,
      mistakeCount,
      mistakenPairIds,
      successFeedbackMs,
      errorFeedbackMs,
      updateState,
      onComplete,
    ]
  );

  // انتخاب آیتم توسط کاربر
  const selectItem = useCallback(
    (column: "source" | "target", itemId: string) => {
      // اگر تعامل قفل باشد یا آیتم قبلاً مچ شده باشد، کلیک مسدود است
      if (isLocked || cardState === "COMPLETED") return;

      const item =
        column === "source"
          ? sourceItems.find((i) => i.id === itemId)
          : targetItems.find((i) => i.id === itemId);

      if (!item) return;

      // بررسی اینکه آیا جفت قبلاً مچ شده است
      if (matchedIds.has(item.pairId)) return;

      // پخش صدای آیتم در صورت وجود
      if (item.audioSrc) {
        playAudio(item.audioSrc, item);
      }

      if (column === "source") {
        if (cardState === "IDLE") {
          setSelectedSourceId(itemId);
          updateState("SOURCE_SELECTED");
        } else if (cardState === "SOURCE_SELECTED") {
          if (selectedSourceId !== null && selectedTargetId === null) {
            // همان ستون: جایگزینی انتخاب بدون خطا
            setSelectedSourceId(itemId);
          } else if (selectedTargetId !== null && selectedSourceId === null) {
            // ستون مقابل قبلاً انتخاب شده بود: شروع ارزیابی
            setSelectedSourceId(itemId);
            setIsLocked(true);
            updateState("EVALUATING");
            evaluateMatch(itemId, selectedTargetId);
          }
        }
      } else {
        // column === 'target'
        if (cardState === "IDLE") {
          setSelectedTargetId(itemId);
          updateState("SOURCE_SELECTED");
        } else if (cardState === "SOURCE_SELECTED") {
          if (selectedTargetId !== null && selectedSourceId === null) {
            // همان ستون: جایگزینی انتخاب بدون خطا
            setSelectedTargetId(itemId);
          } else if (selectedSourceId !== null && selectedTargetId === null) {
            // ستون مقابل قبلاً انتخاب شده بود: شروع ارزیابی
            setSelectedTargetId(itemId);
            setIsLocked(true);
            updateState("EVALUATING");
            evaluateMatch(selectedSourceId, itemId);
          }
        }
      }
    },
    [
      isLocked,
      cardState,
      sourceItems,
      targetItems,
      matchedIds,
      selectedSourceId,
      selectedTargetId,
      playAudio,
      updateState,
      evaluateMatch,
    ]
  );

  // بازنشانی کامل کارت
  const reset = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    const rawTargets: VocabularyColumnItem[] = pairs.map((pair) => ({
      id: pair.target.id || `tgt-${pair.id}`,
      pairId: pair.id,
      text: pair.target.text,
      subText: pair.target.subText,
      audioSrc: pair.target.audioSrc,
      metadata: pair.target.metadata,
    }));
    setTargetItems(autoShuffleTarget ? shuffleArray(rawTargets) : rawTargets);
    setSelectedSourceId(null);
    setSelectedTargetId(null);
    setMatchedIds(new Set());
    setIsLocked(false);
    setMistakeCount(0);
    setMistakenPairIds(new Set());
    updateState("IDLE");
  }, [pairs, autoShuffleTarget, updateState]);

  return {
    cardState,
    sourceItems,
    targetItems,
    selectedSourceId,
    selectedTargetId,
    matchedIds,
    isLocked,
    mistakeCount,
    mistakenPairIds,
    progressPercentage,
    isCompleted: cardState === "COMPLETED" || (pairs.length > 0 && matchedIds.size === pairs.length),
    selectItem,
    reset,
    playAudio,
  };
}
