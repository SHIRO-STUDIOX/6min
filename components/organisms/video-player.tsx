"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Button,
  ProgressBar,
  Spinner,
  Chip,
} from "@heroui/react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Clock,
  Flame,
} from "lucide-react";

export interface VideoSubtitle {
  id: string;
  sourceText: string; // متن زبان مبدأ (درشت و برجسته)
  targetText: string; // ترجمه زبان مقصد (کوچکتر و خنثی)
  startTime: number;
  endTime: number;
}

export interface VideoPlayerProps {
  /** آدرس سورس ویدیو */
  src?: string;
  /** تصویر کاور پیش‌نمایش */
  poster?: string;
  /** عنوان ویدیو یا درس */
  title?: string;
  /** مدت زمان کل ویدیو (ثانیه) */
  duration?: number;
  /** زمان فعلی شروع (ثانیه) */
  initialTime?: number;
  /** حالت مشاهده اول (Strict: غیرفعال‌سازی پرش به جلو) */
  isStrict?: boolean;
  /** وضعیت قفل بودن ویدیو */
  isLocked?: boolean;
  /** پیام قفل بودن */
  lockMessage?: string;
  /** نمایش زیرنویس دوزبانه */
  hasSubtitles?: boolean;
  /** لیست زیرنویس‌ها */
  subtitles?: VideoSubtitle[];
  /** فعال‌سازی جریمه تمرکز هنگام توقف طولانی یا تغییر تب */
  enableFocusPenalty?: boolean;
  /** فعال‌سازی اعلان بازگشت مجدد */
  enableReentry?: boolean;
  /** وضعیت بافرینگ پیش‌فرض */
  isBuffering?: boolean;
  /** رویداد اتمام ویدیو */
  onEnded?: () => void;
  /** رویداد تغییر زمان */
  onTimeUpdate?: (currentTime: number) => void;
}

const DEFAULT_SUBTITLES: VideoSubtitle[] = [
  {
    id: "sub-1",
    sourceText: "Welcome to the Six-Minute Micro-Learning System.",
    targetText: "به سیستم یادگیری خرد ۶دقیقه خوش آمدید.",
    startTime: 0,
    endTime: 8,
  },
  {
    id: "sub-2",
    sourceText: "Each lesson is strictly focused on one core mental model.",
    targetText: "هر جلسه دقیقاً روی یک مدل ذهنی بنیادین متمرکز است.",
    startTime: 8,
    endTime: 18,
  },
  {
    id: "sub-3",
    sourceText: "Retaining high cognitive attention without mental fatigue.",
    targetText: "حفظ حداکثر توجه شناختی بدون احساس خستگی ذهنی.",
    startTime: 18,
    endTime: 30,
  },
  {
    id: "sub-4",
    sourceText: "Let's dive directly into practical implementation.",
    targetText: "بیایید مستقیماً وارد پیاده‌سازی عملی شویم.",
    startTime: 30,
    endTime: 45,
  },
];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "۰۰:۰۰";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const padMins = mins < 10 ? `۰${mins}` : mins.toLocaleString("fa-IR");
  const padSecs = secs < 10 ? `۰${secs}` : secs.toLocaleString("fa-IR");
  return `${padMins}:${padSecs}`;
}

export function VideoPlayer({
  poster = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80",
  title = "جلسه اول: معماری یادگیری عمیق در ۶ دقیقه",
  duration = 180,
  initialTime = 0,
  isStrict = false,
  isLocked = false,
  lockMessage = "برای دسترسی به این ویدیو باید پیش‌نیازهای جلسه قبل را کامل کنید.",
  hasSubtitles = true,
  subtitles = DEFAULT_SUBTITLES,
  enableFocusPenalty = true,
  enableReentry = false,
  isBuffering = false,
  onEnded,
  onTimeUpdate,
}: VideoPlayerProps) {
  // ۱. استیت‌های زمان و پخش ویدیو
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [maxWatchedTime, setMaxWatchedTime] = useState(initialTime);
  const [isMuted, setIsMuted] = useState(false);
  const [isBufferingState, setIsBufferingState] = useState(isBuffering);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSubtitlesActive, setIsSubtitlesActive] = useState(hasSubtitles);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // ۲. استیت‌های تعاملی و هوشمند (State Machine)
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isFocusPenaltyActive, setIsFocusPenaltyActive] = useState(false);
  const [focusPenaltyCountdown, setFocusPenaltyCountdown] = useState(10);
  const [reentryToastVisible, setReentryToastVisible] = useState(enableReentry);
  const [isEnded, setIsEnded] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const focusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // همگام‌سازی بافرینگ از بیرون
  useEffect(() => {
    setIsBufferingState(isBuffering);
  }, [isBuffering]);

  // ۳. مدیریت تایمر پخش شبیه‌سازی شده یا واقعی
  useEffect(() => {
    if (isPlaying && !isBufferingState && !isLocked && !isEnded && !isFocusPenaltyActive) {
      playbackIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1 * playbackSpeed;
          if (next >= duration) {
            setIsPlaying(false);
            setIsEnded(true);
            if (onEnded) onEnded();
            return duration;
          }
          setMaxWatchedTime((m) => Math.max(m, next));
          if (onTimeUpdate) onTimeUpdate(next);
          return next;
        });
      }, 1000);
    } else {
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    }

    return () => {
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    };
  }, [isPlaying, isBufferingState, isLocked, isEnded, isFocusPenaltyActive, duration, playbackSpeed, onEnded, onTimeUpdate]);

  // ۴. مدیریت ناپدید شدن نوار کنترل در حالت پخش
  const resetControlsTimer = () => {
    setIsControlsVisible(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3500);
    }
  };

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, [isPlaying]);

  // ۵. سنسور عدم تمرکز (تغییر تب یا توقف طولانی)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying && enableFocusPenalty) {
        setIsPlaying(false);
        setIsFocusPenaltyActive(true);
        setFocusPenaltyCountdown(10);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isPlaying, enableFocusPenalty]);

  // ۶. تایمر جریمه تمرکز
  useEffect(() => {
    if (isFocusPenaltyActive) {
      focusTimerRef.current = setInterval(() => {
        setFocusPenaltyCountdown((prev) => {
          if (prev <= 1) {
            // اعمال جریمه: بازگشت زمان به عقب
            setCurrentTime((t) => Math.max(0, t - 30));
            setIsFocusPenaltyActive(false);
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (focusTimerRef.current) clearInterval(focusTimerRef.current);
    }

    return () => {
      if (focusTimerRef.current) clearInterval(focusTimerRef.current);
    };
  }, [isFocusPenaltyActive]);

  // ۷. یافتن زیرنویس فعال در ثانیه فعلی
  const activeSubtitle = useMemo(() => {
    if (!isSubtitlesActive) return null;
    return subtitles.find(
      (s) => currentTime >= s.startTime && currentTime <= s.endTime
    );
  }, [isSubtitlesActive, subtitles, currentTime]);

  // هندلرهای کنترلی
  const togglePlay = () => {
    if (isLocked) return;
    if (isEnded) {
      setCurrentTime(0);
      setIsEnded(false);
      setIsPlaying(true);
      return;
    }
    setIsPlaying(!isPlaying);
  };

  // هندلرهای پیشرفت و تایم‌لاین (Seek & Scrubbing)
  const seekToPosition = (clientX: number) => {
    if (!progressBarRef.current || duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const percentage = clickX / (rect.width || 1);
    const targetTime = percentage * duration;

    if (isStrict && targetTime > maxWatchedTime) {
      setCurrentTime(maxWatchedTime);
      if (onTimeUpdate) onTimeUpdate(maxWatchedTime);
      return;
    }

    setCurrentTime(targetTime);
    setIsEnded(false);
    if (onTimeUpdate) onTimeUpdate(targetTime);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekToPosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const hoverX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percentage = hoverX / (rect.width || 1);
    setHoverPosition(hoverX);
    setHoverTime(percentage * duration);

    if (e.buttons === 1) {
      seekToPosition(e.clientX);
    }
  };

  const handleSkipBackward = () => {
    setCurrentTime((prev) => Math.max(0, prev - 10));
  };

  const handleSkipForward = () => {
    if (isStrict) return;
    setCurrentTime((prev) => Math.min(duration, prev + 10));
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const dismissFocusPenalty = () => {
    setIsFocusPenaltyActive(false);
    setIsPlaying(true);
  };

  // محاسبه درصد پیشرفت و حداکثر مشاهده با ایزولاسیون کامل بازه ۰ تا ۱۰۰
  const progressPercentage = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const maxWatchedPercentage = duration > 0 ? Math.min(100, Math.max(0, (maxWatchedTime / duration) * 100)) : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => isPlaying && setIsControlsVisible(false)}
      className={`group relative w-full ${
        isFullscreen
          ? "fixed inset-0 z-50 h-screen w-screen rounded-none"
          : "aspect-video rounded-ios-player"
      } border border-divider bg-content1 shadow-none overflow-hidden select-none flex flex-col justify-between isolate transform-gpu`}
    >
      {/* ======================================================== */}
      {/* لایه پس‌زمینه ویدیو با تصویر فلوئید گلس و افکت‌های انکسار نوری */}
      {/* ======================================================== */}
      <div
        onClick={togglePlay}
        className="absolute inset-0 bg-default-950 flex items-center justify-center cursor-pointer overflow-hidden"
      >
        {/* تصویر پوستر پس‌زمینه با کیفیت بالا و استایل فلوئید گلس */}
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-85"
          />
        )}

        {/* لایه گرادیانت و بلور برای جلوه عمق بصری و تست المان‌های شیشه‌ای */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 mix-blend-multiply pointer-events-none" />

        {/* افکت نوری فلوئید گلس (Fluid Glass Blobs) */}
        <div className="absolute -top-10 -right-10 size-80 rounded-full bg-accent/25 blur-3xl mix-blend-screen pointer-events-none animate-pulse" />
        <div className="absolute -bottom-10 -left-10 size-80 rounded-full bg-purple-500/25 blur-3xl mix-blend-screen pointer-events-none" />

        {/* پترن شبکه خطی مدرن */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

        {/* دکمه Play مرکزی شیشه‌ای با افکت Specular Glass Rim در زمان توقف */}
        {!isPlaying && !isBufferingState && !isLocked && !isEnded && !isFocusPenaltyActive && (
          <div className="relative size-12 sm:size-18 rounded-full glass-rim bg-white/15 dark:bg-black/40 backdrop-blur-2xl border border-white/30 flex items-center justify-center text-white shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:scale-110 group-hover:bg-white/25 active:scale-95 z-10">
            <Play className="size-5 sm:size-8 fill-white ms-0.5 sm:ms-1 drop-shadow" />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* نوار بالایی شناور (اطلاعات درس و نشان وضعیت Strict/Review) */}
      {/* ======================================================== */}
      <div
        className={`relative z-20 w-full p-2 sm:p-4 flex items-center justify-between transition-opacity duration-300 ${
          isControlsVisible || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 max-w-[65%] sm:max-w-[70%]">
          <div className="size-5 sm:size-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shrink-0">
            <span className="font-black text-[9px] sm:text-xs font-tabular">۶</span>
          </div>
          <span className="text-[10px] sm:text-sm font-bold text-white truncate drop-shadow-md">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {isStrict ? (
            <Chip
              size="sm"
              variant="soft"
              color="warning"
              className="h-5 sm:h-6 text-[8px] sm:text-[10px] font-bold border border-warning/30 bg-black/40 backdrop-blur-md text-warning px-1.5 sm:px-2"
            >
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Flame className="size-2.5 sm:size-3" />
                <span className="hidden sm:inline">مشاهده اول (Strict)</span>
                <span className="sm:hidden">Strict</span>
              </div>
            </Chip>
          ) : (
            <Chip
              size="sm"
              variant="soft"
              color="success"
              className="h-5 sm:h-6 text-[8px] sm:text-[10px] font-bold border border-success/30 bg-black/40 backdrop-blur-md text-success px-1.5 sm:px-2"
            >
              <div className="flex items-center gap-0.5 sm:gap-1">
                <CheckCircle2 className="size-2.5 sm:size-3" />
                <span className="hidden sm:inline">حالت بازبینی (Review)</span>
                <span className="sm:hidden">Review</span>
              </div>
            </Chip>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* اعلان بازگشت مجدد کاربر به ویدیو (Re-entry Toast) */}
      {/* ======================================================== */}
      {reentryToastVisible && !isLocked && !isEnded && (
        <div className="absolute top-9 sm:top-14 inset-x-2 sm:inset-x-8 z-30 flex items-center justify-between p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl bg-black/85 backdrop-blur-xl border border-white/20 text-white shadow-2xl animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="size-5 sm:size-6 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shrink-0">
              <Sparkles className="size-2.5 sm:size-3" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-xs font-bold text-white leading-tight">خوش آمدید مجدد!</span>
              <span className="text-[7.5px] sm:text-[10px] text-default-300 leading-tight">پخش از آخرین ثانیه تنظیم شد.</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReentryToastVisible(false)}
            className="text-[8px] sm:text-xs h-5 sm:h-6 px-1.5 sm:px-2 rounded-full text-white/80 hover:text-white"
          >
            متوجه شدم
          </Button>
        </div>
      )}

      {/* ======================================================== */}
      {/* نمایش زیرنویس هوشمند دوزبانه (Subtitles Overlay) */}
      {/* ======================================================== */}
      {activeSubtitle && isPlaying && !isLocked && !isEnded && (
        <div className="absolute bottom-9 sm:bottom-14 inset-x-2 sm:inset-x-8 z-20 flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-200">
          <div className="max-w-xs sm:max-w-lg px-2 py-0.5 sm:px-4 sm:py-1.5 rounded-lg sm:rounded-xl bg-black/75 backdrop-blur-md border border-white/15 text-white shadow-2xl flex flex-col gap-0.5">
            <span className="text-[9px] sm:text-xs md:text-sm font-bold text-white leading-tight drop-shadow-md">
              {activeSubtitle.sourceText}
            </span>
            <span className="text-[8px] sm:text-[11px] font-medium text-white/80 leading-tight">
              {activeSubtitle.targetText}
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* وضعیت لودینگ و بافرینگ (Buffering Spinner) */}
      {/* ======================================================== */}
      {isBufferingState && !isLocked && !isEnded && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 sm:gap-2 bg-black/40 backdrop-blur-sm pointer-events-none animate-in fade-in duration-200">
          <Spinner size="sm" color="accent" className="sm:hidden" />
          <Spinner size="md" color="accent" className="hidden sm:inline-flex" />
          <span className="text-[10px] sm:text-xs font-bold text-white/90">
            در حال بارگذاری جریان ویدیو...
          </span>
        </div>
      )}

      {/* ======================================================== */}
      {/* لایه وضعیت قفل بودن (Locked State) */}
      {/* ======================================================== */}
      {isLocked && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-3 sm:p-6 text-center animate-in fade-in duration-300">
          <div className="size-8 sm:size-14 rounded-full bg-default-800/80 border border-white/10 flex items-center justify-center text-default-400 mb-1.5 sm:mb-3 shadow-2xl">
            <Lock className="size-4 sm:size-6" />
          </div>
          <h3 className="text-xs sm:text-base font-black text-white mb-0.5">
            این جلسه آموزشی قفل است
          </h3>
          <p className="text-[9px] sm:text-xs text-default-400 max-w-[280px] sm:max-w-sm leading-relaxed mb-2 sm:mb-4 font-medium line-clamp-1 sm:line-clamp-2">
            {lockMessage}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full px-3 sm:px-5 font-bold text-[9px] sm:text-xs h-6 sm:h-8"
          >
            مشاهده پیش‌نیازها
          </Button>
        </div>
      )}

      {/* ======================================================== */}
      {/* لایه هشدار جریمه تمرکز (Focus Penalty State) */}
      {/* ======================================================== */}
      {isFocusPenaltyActive && !isLocked && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-xl flex flex-col items-center justify-center p-3 sm:p-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="size-8 sm:size-14 rounded-full bg-warning/20 border border-warning/40 text-warning flex items-center justify-center mb-1 sm:mb-3 animate-bounce">
            <AlertTriangle className="size-4 sm:size-6" />
          </div>
          <h3 className="text-xs sm:text-base font-black text-white mb-0.5">
            عدم تمرکز روی ویدیو
          </h3>
          <p className="text-[8.5px] sm:text-xs text-default-300 max-w-xs leading-tight mb-1.5 sm:mb-3 line-clamp-1">
            شما صفحه را ترک کردید یا ویدیو متوقف شد.
          </p>

          <div className="flex items-center gap-1 mb-2 sm:mb-4 text-[9px] sm:text-xs text-warning font-mono font-bold bg-warning/10 px-2 py-0.5 rounded-full border border-warning/20">
            <Clock className="size-2.5 sm:size-3.5" />
            <span>زمان تأیید: {focusPenaltyCountdown} ثانیه</span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={dismissFocusPenalty}
            className="rounded-full px-3.5 sm:px-6 font-bold text-[9px] sm:text-xs h-6 sm:h-8 shadow-lg shadow-accent/30"
          >
            ادامه یادگیری
          </Button>
        </div>
      )}

      {/* ======================================================== */}
      {/* لایه اتمام موفق ویدیو (Ended State) */}
      {/* ======================================================== */}
      {isEnded && !isLocked && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-3 sm:p-6 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="size-8 sm:size-14 rounded-full bg-success/20 border border-success/40 text-success flex items-center justify-center mb-1.5 sm:mb-3 shadow-2xl">
            <Sparkles className="size-4 sm:size-6" />
          </div>
          <h3 className="text-xs sm:text-base font-black text-white mb-0.5">
            تبریک! جلسه تکمیل شد
          </h3>
          <p className="text-[8.5px] sm:text-xs text-default-400 max-w-xs leading-tight mb-2 sm:mb-4 font-medium">
            امتیاز یادگیری به پروفایل شما اضافه شد.
          </p>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePlay}
              className="rounded-full px-2.5 sm:px-4 font-bold text-[9px] sm:text-xs h-6 sm:h-8 text-white border-white/20"
            >
              <RotateCcw className="size-2.5 sm:size-3.5 me-1" />
              مشاهده مجدد
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="rounded-full px-3 sm:px-5 font-bold text-[9px] sm:text-xs h-6 sm:h-8 shadow-lg shadow-accent/30"
            >
              جلسه بعدی
            </Button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* نوار کنترل شناور تک‌خطی و کاملاً مینیمال */}
      {/* ======================================================== */}
      <div
        className={`relative z-30 w-full px-2 sm:px-5 pb-1.5 sm:pb-3.5 transition-all duration-300 ${
          isControlsVisible || !isPlaying ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
        }`}
      >
        <div className="w-full flex items-center gap-1 sm:gap-2.5 text-white drop-shadow-md">
          {/* سمت چپ: دکمه‌های پخش/توقف و کنترل صدا */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {/* دکمه پخش / توقف */}
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              onClick={togglePlay}
              className="size-6 sm:size-9 min-w-6 sm:min-w-9 rounded-full text-white hover:bg-white/20 active:scale-95 transition-all"
              aria-label={isPlaying ? "توقف ویدیو" : "پخش ویدیو"}
            >
              {isPlaying ? <Pause className="size-3.5 sm:size-5 fill-white" /> : <Play className="size-3.5 sm:size-5 fill-white ms-0.5" />}
            </Button>

            {/* قطع / وصل صدا */}
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              onClick={() => setIsMuted(!isMuted)}
              className="size-5 sm:size-8 min-w-5 sm:min-w-8 rounded-full text-white/90 hover:text-white hover:bg-white/20 active:scale-95 transition-all"
              aria-label={isMuted ? "وصل صدا" : "قطع صدا"}
            >
              {isMuted ? <VolumeX className="size-3 sm:size-4" /> : <Volume2 className="size-3 sm:size-4" />}
            </Button>
          </div>

          {/* مرکز: تایم‌لاین و نوار پیشرفت با HeroUI ProgressBar */}
          <div
            ref={progressBarRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverTime(null)}
            className="flex-1 py-1.5 sm:py-3 cursor-pointer group/progress relative flex items-center select-none touch-none"
            dir="ltr"
          >
            <ProgressBar
              aria-label="پیشرفت ویدیو"
              minValue={0}
              maxValue={duration}
              value={currentTime}
              color="accent"
              className="w-full"
              dir="ltr"
            >
              <ProgressBar.Track className="h-1 sm:h-1.5 group-hover/progress:h-1.5 sm:group-hover/progress:h-2 bg-white/20 group-hover/progress:bg-white/30 rounded-full relative overflow-hidden transition-all duration-200 w-full" dir="ltr">
                {/* هایلایت محدوده مجاز تماشا در حالت Strict */}
                {isStrict && (
                  <div
                    className="absolute start-0 left-0 top-0 bottom-0 bg-white/20 rounded-full pointer-events-none transition-all duration-150"
                    style={{ width: `${maxWatchedPercentage}%` }}
                  />
                )}
                {/* نوار اصلی پر شده با استایل‌های رسمی HeroUI */}
                <ProgressBar.Fill className="rounded-full" />
              </ProgressBar.Track>
            </ProgressBar>

            {/* پلی‌هد متحرک (نمایش در هاور یا تعامل) */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2.5 sm:size-3.5 rounded-full bg-white shadow-xl border sm:border-2 border-accent pointer-events-none opacity-0 group-hover/progress:opacity-100 transition-all duration-100 group-hover/progress:scale-125 z-10"
              style={{ left: `${progressPercentage}%` }}
            />

            {/* پیش‌نمایش شناور زمان در هاور */}
            {hoverTime !== null && (
              <div
                className="absolute -top-6 sm:-top-7 -translate-x-1/2 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-black/90 backdrop-blur-md text-[8.5px] sm:text-[10px] font-mono font-bold text-white border border-white/20 pointer-events-none shadow-2xl animate-in fade-in zoom-in-95 duration-150 z-20"
                style={{ left: `${hoverPosition}px` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* سمت راست: تایمر ویدیو، دکمه سرعت و دکمه تمام‌صفحه */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
            {/* نمایشگر زمان جاری و کل ویدیو */}
            <div className="text-[9px] sm:text-xs font-mono font-bold text-white/95 flex items-center gap-0.5 sm:gap-1 select-none" dir="ltr">
              <span className="text-accent">{formatTime(currentTime)}</span>
              <span className="text-white/40">/</span>
              <span className="text-white/70">{formatTime(duration)}</span>
            </div>

            {/* تغییر سرعت پخش */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const speeds = [1, 1.25, 1.5, 2];
                const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                setPlaybackSpeed(speeds[nextIdx]);
              }}
              className="h-5 sm:h-7 px-1 sm:px-2 min-w-5 sm:min-w-7 rounded-md sm:rounded-full text-white/90 hover:text-white hover:bg-white/20 text-[9px] sm:text-[11px] font-mono font-bold active:scale-95 transition-all"
              aria-label="سرعت پخش"
            >
              {playbackSpeed}x
            </Button>

            {/* تمام صفحه */}
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              onClick={toggleFullscreen}
              className="size-5 sm:size-8 min-w-5 sm:min-w-8 rounded-full text-white/90 hover:text-white hover:bg-white/20 active:scale-95 transition-all"
              aria-label={isFullscreen ? "خروج از تمام‌صفحه" : "تمام‌صفحه"}
            >
              {isFullscreen ? <Minimize2 className="size-3 sm:size-4" /> : <Maximize2 className="size-3 sm:size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
