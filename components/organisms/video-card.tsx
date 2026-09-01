"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  Button,
  ProgressBar,
} from "@heroui/react";
import { PlayIcon } from "@solar-icons/react/bold/play";
import { RestartIcon } from "@solar-icons/react/linear/restart";
import { CheckCircleIcon } from "@solar-icons/react/bold/check-circle";
import { LockIcon } from "@solar-icons/react/bold/lock";
import { AltArrowLeftIcon } from "@solar-icons/react/linear/alt-arrow-left";
import { StarsIcon } from "@solar-icons/react/bold/stars";

export interface VideoCardProps {
  /** برچسب نوع کارت (مثلاً کارت ۱: ویدیوی آموزشی) */
  cardLabel?: string;
  /** عنوان جلسه آموزشی */
  title?: string;
  /** توضیحات کوتاه جلسه */
  description?: string;
  /** تصویر کاور / پیش‌نمایش ویدیو */
  poster?: string;
  /** آدرس فایل ویدیویی (اختیاری) */
  videoSrc?: string;
  /** مدت زمان کل ویدیو به ثانیه (پیش‌فرض: ۱۸۰ ثانیه / ۳ دقیقه) */
  duration?: number;
  /** درصد پیش‌فرض مشاهده (۰ تا ۱۰۰) */
  initialProgress?: number;
  /** وضعیت تکمیل بودن کارت */
  isCompleted?: boolean;
  /** وضعیت قفل بودن جلسه */
  isLocked?: boolean;
  /** پیام قفل بودن جلسه */
  lockMessage?: string;
  /** رویداد کلیک روی دکمه کارت بعدی (Forward Navigation) */
  onNext?: () => void;
  /** رویداد کلیک روی کارت قبلی */
  onPrev?: () => void;
  /** رویداد تغییر درصد پیشرفت */
  onProgressChange?: (percentage: number, currentTime: number) => void;
  /** رویداد تکمیل ۱۰۰٪ ویدیو */
  onComplete?: () => void;
  /** کلاس‌های اضافی CSS */
  className?: string;
}

/**
 * تبدیل ثانیه به فرمت دقیقه:ثانیه با ارقام استاندارد
 */
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "۰۰:۰۰";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const padMins = mins < 10 ? `۰${mins}` : mins.toLocaleString("fa-IR");
  const padSecs = secs < 10 ? `۰${secs}` : secs.toLocaleString("fa-IR");
  return `${padMins}:${padSecs}`;
}

export function VideoCard({
  cardLabel = "کارت ۱: ویدیوی آموزشی",
  title = "کلاس درس",
  description = "بریم توی این ویدیو الفبا رو یادبگیریم",
  poster = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
  videoSrc,
  duration = 180,
  initialProgress = 0,
  isCompleted: initialIsCompleted = false,
  isLocked = false,
  lockMessage = "برای شروع این جلسه باید پیش‌نیازهای قبلی را کامل کنید.",
  onNext,
  onPrev,
  onProgressChange,
  onComplete,
  className = "",
}: VideoCardProps) {
  // ۱. استیت‌های پخش ویدیو
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => (initialProgress / 100) * duration);
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted || initialProgress >= 100);

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // همگام‌سازی استیت تکمیل از بیرون
  useEffect(() => {
    if (initialIsCompleted) {
      setIsCompleted(true);
    }
  }, [initialIsCompleted]);

  // محاسبه درصد پیشرفت
  const progressPercentage = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  // شبیه‌سازی یا مدیریت پخش ویدیو
  useEffect(() => {
    if (isPlaying && !isLocked) {
      playbackTimerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1;
          if (next >= duration) {
            setIsPlaying(false);
            setIsCompleted(true);
            if (onComplete) onComplete();
            if (onProgressChange) onProgressChange(100, duration);
            return duration;
          }
          const currentPct = (next / duration) * 100;
          if (onProgressChange) onProgressChange(currentPct, next);
          return next;
        });
      }, 1000);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, isLocked, duration, onComplete, onProgressChange]);

  // توگل پلی/پاز
  const handleTogglePlay = () => {
    if (isLocked) return;
    if (currentTime >= duration) {
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying(!isPlaying);
  };

  // ریست و مشاهده مجدد
  const handleRestart = () => {
    if (isLocked) return;
    setCurrentTime(0);
    setIsPlaying(true);
  };

  return (
    <Card
      className={`w-full max-w-[500px] aspect-square flex flex-col justify-between p-6 bg-content1/90 backdrop-blur-xl border-none shadow-none rounded-3xl overflow-hidden transition-all duration-300 select-none ${className}`}
    >
      {/* ======================================================== */}
      {/* ۱. هدر کارت (Card Header) */}
      {/* ======================================================== */}
      <Card.Header className="p-0 flex flex-col gap-0.5 shrink-0 text-start">
        <Card.Title
          render={(props) => <h4 {...props} />}
          className="text-xl font-semibold text-foreground tracking-tight leading-[1.33] line-clamp-1"
        >
          {title}
        </Card.Title>
        {description && (
          <Card.Description className="text-xs font-normal text-default-500 leading-tight line-clamp-1">
            {description}
          </Card.Description>
        )}
      </Card.Header>

      {/* ======================================================== */}
      {/* ۲. بخش ویدیو و پیش‌نمایش (Video Preview / Playback Area) */}
      {/* نسبت دقیق 16:9 */}
      {/* ======================================================== */}
      <Card.Content className="p-0 my-auto w-full flex flex-col justify-center">
        <div
          ref={videoContainerRef}
          onClick={handleTogglePlay}
          className="relative w-full aspect-video rounded-2xl overflow-hidden border border-divider bg-black/90 group/video shadow-md transition-all duration-300 isolate cursor-pointer"
        >
          {/* المان ویدیویی در صورت وجود سورس */}
          {videoSrc && (
            <video
              ref={videoElementRef}
              src={videoSrc}
              className="w-full h-full object-cover"
            />
          )}

          {/* لایه گرادیانت و افکت نوری شیشه‌ای */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/30 pointer-events-none" />

          {/* پترن مدرن ذرات */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff12_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          {/* وضعیت قفل بودن */}
          {isLocked ? (
            <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center pointer-events-auto">
              <div className="size-10 rounded-full bg-default-800 border border-white/10 flex items-center justify-center text-default-400 mb-2">
                <LockIcon className="size-5" />
              </div>
              <span className="text-xs font-bold text-white mb-1">جلسه قفل است</span>
              <span className="text-[10px] text-default-400 max-w-[220px] leading-tight line-clamp-2">
                {lockMessage}
              </span>
            </div>
          ) : (
            /* دکمه Play مرکزی شیشه‌ای در حالت توقف */
            !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center z-20 group/playbtn pointer-events-none">
                <div className="size-12 sm:size-14 rounded-full glass-rim bg-white/20 dark:bg-black/50 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white shadow-2xl transition-all duration-300 group-hover/video:scale-110 group-hover/video:bg-white/30 active:scale-95">
                  {currentTime >= duration ? (
                    <RestartIcon className="size-5 sm:size-6 drop-shadow" />
                  ) : (
                    <PlayIcon className="size-5 sm:size-6 fill-white ms-0.5 drop-shadow" />
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </Card.Content>

      {/* ======================================================== */}
      {/* ۳. بخش پیشرفت و وضعیت تماشا (Progress Indicator) */}
      {/* ======================================================== */}
      <div className="shrink-0 flex flex-col gap-1.5 my-1">
        <div className="w-full flex items-center justify-between text-[11px] sm:text-xs">
          <span className="font-medium text-default-500 flex items-center gap-1">
            {isCompleted ? (
              <span className="text-success font-bold flex items-center gap-1">
                <CheckCircleIcon className="size-3.5" />
                آماده برای کارت بعدی
              </span>
            ) : (
              <span>میزان تماشا:</span>
            )}
          </span>

          <span
            className={`font-mono font-bold font-tabular ${
              isCompleted ? "text-success" : "text-accent"
            }`}
            dir="ltr"
          >
            {Math.round(progressPercentage)}% watched
          </span>
        </div>

        {/* نوار پیشرفت با HeroUI ProgressBar */}
        <ProgressBar
          aria-label="میزان مشاهده ویدیو"
          minValue={0}
          maxValue={100}
          value={progressPercentage}
          className="w-full"
          dir="ltr"
        >
          <ProgressBar.Track className="h-1.5 sm:h-2 bg-default-200/70 dark:bg-default-800/80 rounded-full overflow-hidden w-full">
            <ProgressBar.Fill
              className={`!start-0 !left-0 left-0 rounded-full transition-all duration-300 ${
                isCompleted
                  ? "bg-gradient-to-r from-success to-success/80"
                  : "bg-gradient-to-r from-accent to-accent/80"
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </ProgressBar.Track>
        </ProgressBar>
      </div>

      {/* ======================================================== */}
      {/* ۴. ناوبری و اکشن‌های کارت (Card Actions / Navigation) */}
      {/* حرکت به سمت راست و دکمه Forward در سمت راست */}
      {/* ======================================================== */}
      <Card.Footer className="p-0 pt-2 flex items-center justify-between shrink-0">
        {/* سمت راست: دکمه‌های کنترل جانبی یا شروع مجدد */}
        <div className="flex items-center gap-1.5">
          {currentTime > 0 && (
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              onClick={handleRestart}
              aria-label="مشاهده مجدد ویدیو"
            >
              <RestartIcon className="size-3.5" />
            </Button>
          )}

          {isCompleted && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-success bg-success/10 px-2.5 py-1 rounded-lg border border-success/20">
              <StarsIcon className="size-3" />
              <span className="hidden sm:inline">گام ۱ انجام شد</span>
            </div>
          )}
        </div>

        {/* سمت چپ: اکشن اصلی به کارت بعدی */}
        <div className="flex items-center gap-2">
          <Button
            variant={isCompleted ? "primary" : "secondary"}
            size="sm"
            isDisabled={!isCompleted || isLocked}
            onClick={onNext}
          >
            <span>کارت بعدی</span>
            <AltArrowLeftIcon className="size-3.5 sm:size-4 ms-1 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </Card.Footer>
    </Card>
  );
}
