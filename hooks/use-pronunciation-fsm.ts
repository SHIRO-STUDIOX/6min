"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  PronunciationCardState,
  PronunciationItem,
  PronunciationResult,
  PronunciationItemReport,
  UsePronunciationFsmOptions,
  DEFAULT_PRONUNCIATION_ITEMS,
} from "@/types/pronunciation";

/**
 * نرمال‌سازی رشته برای مقایسه دقیق متنی در ارزیابی تلفظ
 */
export function normalizePronunciationText(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[’‘`´‛]/g, "'")
    .replace(/[.,!?;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * usePronunciationFsm — ماشین وضعیت متناهی (FSM) و معماری تعاملی استریم صوتی کارت تلفظ
 */
export function usePronunciationFsm({
  items = DEFAULT_PRONUNCIATION_ITEMS,
  initialIndex = 0,
  autoPlayReferenceOnLoad = false,
  maxRecordingMs = 6000,
  successFeedbackMs = 950,
  retryFeedbackMs = 2400,
  customEvaluator,
  onAudioPlay,
  onStateChange,
  onItemChange,
  onComplete,
}: UsePronunciationFsmOptions) {
  // ========================================================
  // ۱. متغیرهای وضعیت (State Variables)
  // ========================================================
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [cardState, setCardState] = useState<PronunciationCardState>("IDLE");
  const [attemptCount, setAttemptCount] = useState<number>(0);

  // متغیرهای وضعیت تکمیلی و کمکی
  const [audioLevels, setAudioLevels] = useState<number[]>([0.15, 0.2, 0.25, 0.2, 0.15]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [itemsReports, setItemsReports] = useState<Map<string, PronunciationItemReport>>(
    new Map()
  );
  const [simulationMode, setSimulationMode] = useState<"real" | "mock-match" | "mock-mismatch">("real");

  // ========================================================
  // ۲. مراجع چرخه حیات رسانه (Audio Stream Refs & Cleanup)
  // ========================================================
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<unknown>(null);
  const recognizedTranscriptRef = useRef<string>("");

  // کلمه جاری
  const currentItem: PronunciationItem | undefined = useMemo(() => {
    return items[currentIndex] || items[0];
  }, [items, currentIndex]);

  // اطلاع‌رسانی و تغییر وضعیت FSM
  const updateState = useCallback(
    (nextState: PronunciationCardState) => {
      setCardState(nextState);
      if (onStateChange) {
        onStateChange(nextState);
      }
    },
    [onStateChange]
  );

  // ========================================================
  // ۳. توقف قطعی و آزادسازی استریم صوتی (Audio Stream Lifecycle)
  // ========================================================
  const stopAudioStream = useCallback(() => {
    // ۱. متوقف‌سازی ترک‌های فعال رسانه‌ای جهت جلوگیری از اشغال میکروفون
    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks();
        tracks.forEach((track) => {
          track.stop();
        });
      } catch {
        // نادیده‌گیری خطای احتمالی مرورگر
      }
      streamRef.current = null;
    }

    // ۲. توقف ریکوردر در صورت فعال بودن
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // نادیده‌گیری
      }
      mediaRecorderRef.current = null;
    }

    // ۳. قطع انیمیشن ویژوالایزر امواج
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // ۴. بستن AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch {
        // نادیده‌گیری
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    // ۵. توقف تشخیص گفتار Web Speech API در صورت وجود
    if (recognitionRef.current) {
      try {
        (recognitionRef.current as { abort: () => void }).abort();
      } catch {
        // نادیده‌گیری
      }
      recognitionRef.current = null;
    }

    // ۶. پاکسازی تایم‌اوت خودکار ضبط
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    // بازنشانی مقادیر امواج صوتی به حالت پایه
    setAudioLevels([0.15, 0.2, 0.25, 0.2, 0.15]);
    setIsRecording(false);
  }, []);

  // پاکسازی کلی در زمان خروج یا تغییر کامپوننت (Unmount Lifecycle)
  useEffect(() => {
    return () => {
      stopAudioStream();
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, [stopAudioStream]);

  // ========================================================
  // ۴. پخش صدای الگو و مرجع (PLAYING_REFERENCE)
  // ========================================================
  const playReferenceAudio = useCallback(
    (customUrl?: string) => {
      // اگر در حال ضبط یا ارزیابی هستیم، پخش مرجع مسدود است
      if (isRecording || isAnalyzing || cardState === "RECORDING" || cardState === "EVALUATING") {
        return;
      }

      const urlToPlay = customUrl || currentItem?.audioUrl;
      if (!urlToPlay || !currentItem) return;

      try {
        if (onAudioPlay) {
          onAudioPlay(urlToPlay, currentItem);
        }

        if (activeAudioRef.current) {
          activeAudioRef.current.pause();
          activeAudioRef.current = null;
        }

        const audio = new Audio(urlToPlay);
        activeAudioRef.current = audio;
        updateState("PLAYING_REFERENCE");

        audio.onended = () => {
          activeAudioRef.current = null;
          updateState("IDLE");
        };

        audio.onerror = () => {
          activeAudioRef.current = null;
          updateState("IDLE");
        };

        audio.play().catch(() => {
          // جلوگیری از خطای پالیسی Autoplay در مرورگرها
          activeAudioRef.current = null;
          updateState("IDLE");
        });
      } catch {
        activeAudioRef.current = null;
        updateState("IDLE");
      }
    },
    [isRecording, isAnalyzing, cardState, currentItem, onAudioPlay, updateState]
  );

  // ========================================================
  // ۵. پردازش و ارزیابی نتیجه صوتی (EVALUATING)
  // ========================================================
  const evaluateVoiceSubmission = useCallback(
    async (audioBlob: Blob | null, transcript: string) => {
      if (!currentItem) return;

      setIsAnalyzing(true);
      updateState("EVALUATING");

      let isMatch = false;
      const normalizedTarget = normalizePronunciationText(currentItem.text);
      const normalizedTranscript = normalizePronunciationText(transcript);

      // الف) حالت شبیه‌سازی جهت تست دقیق در سندباکس
      if (simulationMode === "mock-match") {
        isMatch = true;
      } else if (simulationMode === "mock-mismatch") {
        isMatch = false;
      } else if (customEvaluator) {
        // ب) ارزیاب اختصاصی تزریق‌شده از خارج
        try {
          const evalResult = await customEvaluator(audioBlob, currentItem, transcript);
          isMatch = evalResult.isMatch;
        } catch {
          isMatch = false;
        }
      } else {
        // ج) ارزیابی استاندارد با Web Speech و تطبیق مستقیم یا کلمات کلیدی
        if (normalizedTranscript) {
          isMatch =
            normalizedTranscript === normalizedTarget ||
            normalizedTranscript.includes(normalizedTarget) ||
            normalizedTarget.includes(normalizedTranscript);
        } else {
          // در صورتی که مرورگر فاقد وب اسپیچ باشد، اگر کاربر ضبط صوتی انجام داده باشد تطابق تخمین زده می‌شود
          isMatch = true;
        }
      }

      // شاخه ۱: تطابق موفقیت‌آمیز (SUCCESS)
      if (isMatch) {
        updateState("SUCCESS");
        setIsAnalyzing(false);
        setFeedbackMessage("آفرین! تلفظ کاملاً صحیح و شفاف بود.");

        // ثبت در کارنامه عملکرد
        setItemsReports((prev) => {
          const next = new Map(prev);
          next.set(currentItem.id, {
            itemId: currentItem.id,
            text: currentItem.text,
            attempts: attemptCount + 1,
            passed: true,
            forgiven: false,
            recognizedText: transcript || undefined,
          });
          return next;
        });

        const isLastItem = currentIndex >= items.length - 1;

        transitionTimerRef.current = setTimeout(() => {
          if (isLastItem) {
            // اتمام کلیه آیتم‌های کارت (COMPLETED)
            updateState("COMPLETED");
            setFeedbackMessage("تمامی واژگان با موفقیت تلفظ شدند!");

            if (onComplete) {
              const allReports: PronunciationItemReport[] = items.map((item) => {
                return (
                  itemsReports.get(item.id) || {
                    itemId: item.id,
                    text: item.text,
                    attempts: item.id === currentItem.id ? attemptCount + 1 : 1,
                    passed: true,
                    forgiven: false,
                  }
                );
              });

              const totalAttempts = allReports.reduce((acc, r) => acc + r.attempts, 0);
              const forgivenCount = allReports.filter((r) => r.forgiven).length;
              const accuracy =
                totalAttempts > 0
                  ? Math.round((items.length / totalAttempts) * 100)
                  : 100;

              onComplete({
                totalItems: items.length,
                completedItems: items.length,
                totalAttempts,
                forgivenCount,
                accuracyPercentage: accuracy,
                itemsSummary: allReports,
                completedAt: new Date().toISOString(),
              });
            }
          } else {
            // انتقال به کلمه بعد و بازگشت به IDLE
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            setAttemptCount(0);
            setFeedbackMessage(null);
            updateState("IDLE");

            if (onItemChange && items[nextIdx]) {
              onItemChange(items[nextIdx], nextIdx);
            }

            if (autoPlayReferenceOnLoad && items[nextIdx]?.audioUrl) {
              setTimeout(() => {
                playReferenceAudio(items[nextIdx].audioUrl);
              }, 200);
            }
          }
        }, successFeedbackMs);

        return;
      }

      // شاخه ۲: عدم تطابق واجی (RETRY_FEEDBACK)
      const nextAttempt = attemptCount + 1;
      setAttemptCount(nextAttempt);
      updateState("RETRY_FEEDBACK");
      setIsAnalyzing(false);

      if (nextAttempt < 2) {
        // کمتر از ۲ تلاش: نمایش راهنمای دهان و واج و بازگشت به IDLE
        setFeedbackMessage(
          currentItem.mouthHint || "به نحوه حرکت زبان و دهان دقت کنید و دوباره تلفظ نمایید."
        );

        transitionTimerRef.current = setTimeout(() => {
          setFeedbackMessage(null);
          updateState("IDLE");
        }, retryFeedbackMs);
      } else {
        // ۲ تلاش یا بیشتر: فیدبک اغماض و عبور روان به واژه بعد
        setFeedbackMessage(
          "تلاش بسیار خوبی بود! برای حفظ ریتم و انگیزه آموزشی، به واژه بعدی می‌رویم."
        );

        // ثبت در کارنامه با برچسب اغماض (forgiven: true)
        setItemsReports((prev) => {
          const next = new Map(prev);
          next.set(currentItem.id, {
            itemId: currentItem.id,
            text: currentItem.text,
            attempts: nextAttempt,
            passed: true,
            forgiven: true,
            recognizedText: transcript || undefined,
          });
          return next;
        });

        const isLastItem = currentIndex >= items.length - 1;

        transitionTimerRef.current = setTimeout(() => {
          if (isLastItem) {
            updateState("COMPLETED");
            setFeedbackMessage("تمرین کارت تلفظ با موفقیت به پایان رسید.");

            if (onComplete) {
              const allReports: PronunciationItemReport[] = items.map((item) => {
                return (
                  itemsReports.get(item.id) || {
                    itemId: item.id,
                    text: item.text,
                    attempts: item.id === currentItem.id ? nextAttempt : 1,
                    passed: true,
                    forgiven: true,
                  }
                );
              });

              const totalAttempts = allReports.reduce((acc, r) => acc + r.attempts, 0);
              const forgivenCount = allReports.filter((r) => r.forgiven).length;
              const accuracy =
                totalAttempts > 0
                  ? Math.round(((items.length - forgivenCount * 0.5) / totalAttempts) * 100)
                  : 100;

              onComplete({
                totalItems: items.length,
                completedItems: items.length,
                totalAttempts,
                forgivenCount,
                accuracyPercentage: Math.max(0, Math.min(100, accuracy)),
                itemsSummary: allReports,
                completedAt: new Date().toISOString(),
              });
            }
          } else {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            setAttemptCount(0);
            setFeedbackMessage(null);
            updateState("IDLE");

            if (onItemChange && items[nextIdx]) {
              onItemChange(items[nextIdx], nextIdx);
            }

            if (autoPlayReferenceOnLoad && items[nextIdx]?.audioUrl) {
              setTimeout(() => {
                playReferenceAudio(items[nextIdx].audioUrl);
              }, 200);
            }
          }
        }, retryFeedbackMs);
      }
    },
    [
      currentItem,
      updateState,
      simulationMode,
      customEvaluator,
      attemptCount,
      currentIndex,
      items,
      successFeedbackMs,
      onComplete,
      itemsReports,
      onItemChange,
      autoPlayReferenceOnLoad,
      playReferenceAudio,
      retryFeedbackMs,
    ]
  );

  // ========================================================
  // ۶. قطع ضبط توسط کاربر یا تایم‌اوت (Stop Recording Action)
  // ========================================================
  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    // استخراج رونوشت و بلوک صوتی قبل از بستن استریم
    const transcript = recognizedTranscriptRef.current;
    let audioBlob: Blob | null = null;
    if (recordedChunksRef.current.length > 0) {
      audioBlob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
    }

    // بستن قطعی تمام ترک‌های مدیا و آزادسازی حافظه
    stopAudioStream();

    // شروع ارزیابی
    evaluateVoiceSubmission(audioBlob, transcript);
  }, [isRecording, stopAudioStream, evaluateVoiceSubmission]);

  // ========================================================
  // ۷. شروع ضبط و تحلیل صوت (RECORDING & AWAITING_PERMISSION)
  // ========================================================
  const startRecording = useCallback(async () => {
    // جلوگیری از استارت مجدد در زمان‌های غیر مجاز
    if (
      isRecording ||
      isAnalyzing ||
      cardState === "EVALUATING" ||
      cardState === "SUCCESS" ||
      cardState === "COMPLETED"
    ) {
      return;
    }

    // توقف هرگونه صدای پخش جاری
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    // تغییر موقت به وضعیت درخواست دسترسی
    updateState("AWAITING_PERMISSION");
    setPermissionError(null);
    recognizedTranscriptRef.current = "";
    recordedChunksRef.current = [];

    // بررسی پشتیبانی مرورگر از مدیا دیوایس‌ها
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setHasMicPermission(false);
      setPermissionError("مرورگر شما از قابلیت ضبط صدا پشتیبانی نمی‌کند.");
      updateState("IDLE");
      return;
    }

    try {
      // درخواست فعال‌سازی میکروفون
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setHasMicPermission(true);
      setIsRecording(true);
      updateState("RECORDING");

      // راه‌اندازی ریکوردر صوتی در صورت وجود
      try {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        mediaRecorder.start(100);
      } catch {
        // فال‌بک در مرورگرهای بدون MediaRecorder کامل
      }

      // راه‌اندازی Web Speech API SpeechRecognition برای تشخیص گفتار در مرورگرهای پشتیبانی‌کننده
      const WindowSpeechRecognition =
        (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
          .SpeechRecognition ||
        (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
          .webkitSpeechRecognition;

      if (WindowSpeechRecognition) {
        try {
          type SpeechInstance = {
            continuous: boolean;
            interimResults: boolean;
            lang: string;
            onresult: (e: { results: Array<Array<{ transcript: string }>> }) => void;
            onerror: () => void;
            start: () => void;
          };
          const recognition = new (WindowSpeechRecognition as new () => SpeechInstance)();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          recognition.onresult = (e) => {
            if (e.results && e.results[0] && e.results[0][0]) {
              recognizedTranscriptRef.current = e.results[0][0].transcript;
            }
          };

          recognition.onerror = () => {
            // نادیده‌گیری خطای تایم‌اوت وب‌اسپیچ
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch {
          // نادیده‌گیری
        }
      }

      // راه‌اندازی Web Audio API AnalyserNode جهت ایجاد انیمیشن دینامیک امواج صوتی
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 32;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateWaveform = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            // استخراج ۵ باند فرکانسی اصلی برای میله‌های ویژوالایزر
            const sample1 = Math.max(0.15, (dataArray[1] || 0) / 255);
            const sample2 = Math.max(0.2, (dataArray[3] || 0) / 255);
            const sample3 = Math.max(0.25, (dataArray[5] || 0) / 255);
            const sample4 = Math.max(0.2, (dataArray[7] || 0) / 255);
            const sample5 = Math.max(0.15, (dataArray[9] || 0) / 255);

            setAudioLevels([sample1, sample2, sample3, sample4, sample5]);
            animationFrameRef.current = requestAnimationFrame(updateWaveform);
          };

          animationFrameRef.current = requestAnimationFrame(updateWaveform);
        }
      } catch {
        // فال‌بک به امواج شبیه‌سازی‌شده در صورت عدم دسترسی به AudioContext
      }

      // تنظیم تایم‌اوت حداکثر مجاز ضبط
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, maxRecordingMs);
    } catch (err: unknown) {
      stopAudioStream();
      setHasMicPermission(false);
      const isPermissionDenied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");

      setPermissionError(
        isPermissionDenied
          ? "دسترسی به میکروفون رد شد. لطفاً برای ضبط صدا، دسترسی میکروفون را در تنظیمات مرورگر فعال کنید."
          : "امکان دسترسی به ورودی میکروفون وجود ندارد."
      );
      updateState("IDLE");
    }
  }, [
    isRecording,
    isAnalyzing,
    cardState,
    updateState,
    maxRecordingMs,
    stopAudioStream,
    stopRecording,
  ]);

  // کلید دوکاره ضبط (تاگل شروع و پایان)
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, stopRecording, startRecording]);

  // بارگذاری مجدد یک آیتم مشخص
  const loadItem = useCallback(
    (index: number, shouldPlayAudio = false) => {
      if (!items[index]) return;
      stopAudioStream();
      setCurrentIndex(index);
      setAttemptCount(0);
      setFeedbackMessage(null);
      setPermissionError(null);
      updateState("IDLE");

      if (onItemChange) {
        onItemChange(items[index], index);
      }

      if (shouldPlayAudio && items[index].audioUrl) {
        setTimeout(() => {
          playReferenceAudio(items[index].audioUrl);
        }, 150);
      }
    },
    [items, stopAudioStream, updateState, onItemChange, playReferenceAudio]
  );

  // بازنشانی کامل کارت
  const resetAll = useCallback(() => {
    stopAudioStream();
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setCurrentIndex(0);
    setAttemptCount(0);
    setFeedbackMessage(null);
    setPermissionError(null);
    setItemsReports(new Map());
    updateState("IDLE");
  }, [stopAudioStream, updateState]);

  // محاسبه پیشرفت کارت
  const progressPercentage = useMemo(() => {
    if (cardState === "COMPLETED") return 100;
    if (items.length === 0) return 0;
    const completedCount = itemsReports.size;
    return (completedCount / items.length) * 100;
  }, [cardState, items.length, itemsReports.size]);

  return {
    // وضعیت‌های اصلی FSM
    items,
    currentIndex,
    currentItem,
    hasMicPermission,
    isRecording,
    isAnalyzing,
    cardState,
    attemptCount,

    // خروجی‌های کمکی و بصری
    audioLevels,
    feedbackMessage,
    permissionError,
    progressPercentage,
    isCompleted: cardState === "COMPLETED",
    simulationMode,

    // متدها و اکشن‌ها
    startRecording,
    stopRecording,
    toggleRecording,
    playReferenceAudio,
    loadItem,
    resetAll,
    setSimulationMode,
  };
}
