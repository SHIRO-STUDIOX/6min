"use client";

import React from "react";

export type StepVisualStatus =
  | "upcoming"
  | "active"
  | "success"
  | "warning"
  | "danger";

export interface StageDotProps {
  /** اندیس مرحله (صفر مبنا) */
  index: number;
  /** وضعیت بصری فیل داخلی دات */
  status: StepVisualStatus;
  /** آیا دات در وضعیت فعال جاری یا مرور فعال (Active Review) است؟ */
  isActive?: boolean;
  /** آیا کارت مربوطه تکمیل شده و قابلیت ناوبری با کلیک دارد؟ */
  isClickable?: boolean;
  /** رویداد کلیک ناوبری */
  onClick?: () => void;
  /** برچسب دسترسی‌پذیری جهت Screen Readerها */
  ariaLabel?: string;
  /** کلاس‌های استایل اختیاری */
  className?: string;
}

/**
 * StageDot — کامپوننت اتمیک دات نشانگر مراحل
 * ابعاد دقیق و تغییرناپذیر ۶ پیکسل در تمام ویوپورت‌ها با ترنزیشن نرم و عدم پرش چیدمان (No Layout Shift)
 */
export function StageDot({
  index,
  status,
  isActive = false,
  isClickable = false,
  onClick,
  ariaLabel,
  className = "",
}: StageDotProps) {
  // تفکیک رنگ فیل بر پایه توکن‌های سمنتیک سیستم
  let fillBg = "bg-white/25"; // حالت پیش‌رو / غیرفعال (Upcoming)
  if (status === "active") {
    fillBg = "bg-white"; // سفید مات کامل برای مرحله در حال حل
  } else if (status === "success") {
    fillBg = "bg-success"; // سبز سمنتیک موفقیت پروژه
  } else if (status === "warning") {
    fillBg = "bg-warning"; // نارنجی سمنتیک هشدار / نیاز به مرور پروژه
  } else if (status === "danger") {
    fillBg = "bg-danger"; // قرمز سمنتیک خطای پروژه
  }

  // نمایش حلقه خنثی با افست مشخص برای نشان دادن فوکوس زنده کاربر یا مرور کارت حل‌شده
  const showRing = isActive || status === "active";

  const defaultLabel =
    ariaLabel ||
    `کارت ${index + 1}: ${
      status === "success"
        ? "تکمیل شده با موفقیت"
        : status === "warning"
          ? "تکمیل شده، نیاز به مرور"
          : status === "danger"
            ? "عدم موفقیت"
            : status === "active" || isActive
              ? "در حال حل"
              : "پیش‌رو و قفل"
    }`;

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      aria-label={defaultLabel}
      aria-current={isActive || status === "active" ? "step" : undefined}
      className={`relative inline-flex items-center justify-center size-1.5 p-0 border-0 bg-transparent shrink-0 focus-visible:outline-none transition-all duration-200 ${
        isClickable
          ? "cursor-pointer before:absolute before:-inset-2 before:content-[''] opacity-100 hover:opacity-80"
          : "cursor-default pointer-events-none"
      } ${className}`}
    >
      {/* دایره اصلی با قطر قطعی و ثابت ۶ پیکسل (size-1.5 = 6px) */}
      <span
        className={`size-1.5 rounded-full ${fillBg} transition-colors duration-200 ease-out`}
      />

      {/* حلقه خنثی بیرونی با فاصله افست از لبه دایره بدون ایجاد تغییر در ابعاد اسکلتی */}
      {showRing && (
        <span
          aria-hidden="true"
          className="absolute -inset-[2.5px] rounded-full border border-white/40 dark:border-white/50 pointer-events-none transition-all duration-200 ease-out animate-in fade-in"
        />
      )}
    </button>
  );
}
