"use client";

import React, { ReactNode } from "react";
import { Card, Button, ProgressBar } from "@heroui/react";
import { CheckCircleIcon } from "@solar-icons/react/bold/check-circle";
import { AltArrowLeftIcon } from "@solar-icons/react/linear/alt-arrow-left";
import { LockIcon } from "@solar-icons/react/bold/lock";

export interface BaseCardProps {
  /** برچسب متنی بالای کارت یا نوع درس */
  cardLabel?: string;
  /** عنوان اصلی کارت */
  title: string;
  /** توضیحات تکمیلی زیر عنوان */
  description?: string;
  /** محتوای اصلی بخش بدنه کارت (تزریق شده) */
  children: ReactNode;
  /** درصد پیشرفت (بین ۰ تا ۱۰۰) */
  progressPercentage?: number;
  /** برچسب وضعیت در حال پیشرفت */
  progressLabel?: string;
  /** متن سفارشی روبروی نوار پیشرفت */
  progressText?: string;
  /** وضعیت تکمیل بودن کل فعالیت کارت */
  isCompleted?: boolean;
  /** متن نشانگر وضعیت پس از اتمام فعالیت */
  completedStatusText?: string;
  /** وضعیت قفل بودن تعامل کل کارت */
  isLocked?: boolean;
  /** پیام راهنما در زمان قفل بودن جلسه */
  lockMessage?: string;
  /** برچسب دسترسی‌پذیری برای نوار پیشرفت */
  progressBarAriaLabel?: string;
  /** عناصر یا دکمه‌های سمت راست فوتر (مثل ریست، بج وضعیت، خطاها) */
  footerStart?: ReactNode;
  /** دکمه یا اکشن سفارشی سمت چپ فوتر */
  footerEnd?: ReactNode;
  /** متن دکمه انتقال به گام بعدی */
  nextButtonText?: string;
  /** رویداد کلیک جهت هدایت به کارت بعدی */
  onNext?: () => void;
  /** کلاس‌های اختیاری Tailwind جهت افزودن استایل */
  className?: string;
}

/**
 * BaseCard — کامپوننت پایه و استاندارد کارت‌های آموزشی پلتفرم ۶دقیقه
 * کانتینر مشترک برای کلیه کارت‌ها با ابعاد استاندارد ۵۰۰px مربعی، هدر، نوار پیشرفت و فوتر ناوبری.
 */
export function BaseCard({
  cardLabel,
  title,
  description,
  children,
  progressPercentage = 0,
  progressLabel = "میزان پیشرفت:",
  progressText,
  isCompleted = false,
  completedStatusText = "آماده برای کارت بعدی",
  isLocked = false,
  lockMessage = "برای شروع این بخش باید پیش‌نیازهای قبلی را کامل کنید.",
  progressBarAriaLabel = "میزان پیشرفت کارت",
  footerStart,
  footerEnd,
  nextButtonText = "کارت بعدی",
  onNext,
  className = "",
}: BaseCardProps) {
  const clampedProgress = Math.min(100, Math.max(0, progressPercentage));

  return (
    <Card
      className={`w-full max-w-[500px] aspect-square flex flex-col justify-between p-6 bg-surface/90 backdrop-blur-xl border border-separator/40 shadow-none rounded-3xl overflow-hidden transition-all duration-300 select-none relative ${className}`}
    >
      {/* ======================================================== */}
      {/* ۱. هدر کارت (Card Header) */}
      {/* ======================================================== */}
      <Card.Header className="p-0 flex flex-col gap-0.5 shrink-0 text-start">
        {cardLabel && (
          <span className="text-[11px] font-medium text-muted leading-none mb-0.5">
            {cardLabel}
          </span>
        )}
        <Card.Title
          render={(props) => <h4 {...props} />}
          className="text-xl font-semibold text-foreground tracking-tight leading-[1.33] line-clamp-1"
        >
          {title}
        </Card.Title>
        {description && (
          <Card.Description className="text-xs font-normal text-muted leading-tight line-clamp-1">
            {description}
          </Card.Description>
        )}
      </Card.Header>

      {/* ======================================================== */}
      {/* ۲. بدنه محتوایی کارت (Injected Content Area) */}
      {/* ======================================================== */}
      <Card.Content className="p-0 my-auto w-full flex flex-col justify-center relative">
        {children}

        {/* لایه قفل سراسری کارت در صورت فعال بودن isLocked عمومی */}
        {isLocked && lockMessage && (
          <div className="absolute inset-0 z-40 bg-background/80 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 text-center">
            <div className="size-10 rounded-full bg-surface-secondary border border-separator flex items-center justify-center text-muted mb-2">
              <LockIcon className="size-5" />
            </div>
            <span className="text-xs font-bold text-foreground mb-1">جلسه قفل است</span>
            <span className="text-[11px] text-muted max-w-[240px] leading-tight line-clamp-2">
              {lockMessage}
            </span>
          </div>
        )}
      </Card.Content>

      {/* ======================================================== */}
      {/* ۳. بخش پیشرفت (Progress Indicator) */}
      {/* ======================================================== */}
      <div className="shrink-0 flex flex-col gap-1.5 my-1">
        <div className="w-full flex items-center justify-between text-[11px] sm:text-xs">
          <span className="font-medium text-muted flex items-center gap-1">
            {isCompleted ? (
              <span className="text-success font-bold flex items-center gap-1">
                <CheckCircleIcon className="size-3.5" />
                {completedStatusText}
              </span>
            ) : (
              <span>{progressLabel}</span>
            )}
          </span>

          <span
            className={`font-mono font-bold font-tabular ${
              isCompleted ? "text-success" : "text-accent"
            }`}
            dir="ltr"
          >
            {progressText || `${Math.round(clampedProgress)}%`}
          </span>
        </div>

        {/* نوار پیشرفت با HeroUI ProgressBar */}
        <ProgressBar
          aria-label={progressBarAriaLabel}
          minValue={0}
          maxValue={100}
          value={clampedProgress}
          color={isCompleted ? "success" : "accent"}
          className="w-full"
          dir="ltr"
        >
          <ProgressBar.Track className="h-1.5 sm:h-2 bg-surface-secondary rounded-full overflow-hidden w-full">
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </div>

      {/* ======================================================== */}
      {/* ۴. فوتر و اکشن‌های ناوبری کارت (Card Actions / Navigation) */}
      {/* ======================================================== */}
      <Card.Footer className="p-0 pt-2 flex items-center justify-between shrink-0">
        {/* سمت راست: اکشن‌های شروع مجدد یا وضعیت */}
        <div className="flex items-center gap-1.5">{footerStart}</div>

        {/* سمت چپ: دکمه ناوبری به کارت بعدی */}
        <div className="flex items-center gap-2">
          {footerEnd || (
            <Button
              variant={isCompleted ? "primary" : "secondary"}
              size="sm"
              isDisabled={!isCompleted || isLocked}
              onClick={onNext}
            >
              <span>{nextButtonText}</span>
              <AltArrowLeftIcon className="size-3.5 sm:size-4 ms-1 transition-transform group-hover:translate-x-0.5" />
            </Button>
          )}
        </div>
      </Card.Footer>
    </Card>
  );
}
