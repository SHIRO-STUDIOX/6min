"use client";

import React from "react";
import { StageDot, StepVisualStatus } from "@/components/atoms/stage-dot";
import { StageIndicatorProps, StepStatus } from "./types";

/**
 * StageIndicator — نشانگر موقعیتی ۵ مرحله‌ای کلاس درس ۶دقیقه
 * کپسول شیشه‌ای شناور در مرکز افقی با دات‌های ۶ پیکسلی، ماتریس وضعیت‌های حل و مرور و پایداری هندسی کامل
 */
export function StageIndicator({
  totalSteps = 5,
  currentIndex,
  statuses = [],
  onStepClick,
  className = "",
}: StageIndicatorProps) {
  // ساخت آرایه دات‌ها بر اساس تعداد کل مراحل (قفل روی ۵ مرحله طبق سناریو)
  const steps = Array.from({ length: totalSteps }, (_, index) => {
    const rawStatus: StepStatus = statuses[index] || "upcoming";
    const isActive = index === currentIndex;

    // تفکیک وضعیت نهایی بصری و تعیین وضعیت فعال / مرور فعال (Active Review)
    const visualStatus: StepVisualStatus = rawStatus;

    // انتخاب مرحله از مجاز بودن فعالیت آن مستقل است.
    const isClickable = Boolean(onStepClick);

    return {
      index,
      rawStatus,
      visualStatus,
      isActive,
      isClickable,
    };
  });

  return (
    <nav
      aria-label="نشانگر مراحل کلاس درس"
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/60 dark:bg-surface/50 backdrop-blur-md border border-separator/40 dark:border-white/10 shadow-xs transition-all duration-200 select-none mx-auto ${className}`}
    >
      {steps.map((step) => (
        <StageDot
          key={step.index}
          index={step.index}
          ariaLabel={`کارت ${step.index + 1}: ${step.rawStatus === "upcoming" ? "فعالیت قفل؛ انتخاب کارت مجاز" : step.rawStatus === "success" ? "تکمیل‌شده" : step.rawStatus === "warning" ? "نیازمند مرور" : "آماده تمرین"}${step.isActive ? "؛ انتخاب‌شده" : ""}`}
          status={step.visualStatus}
          isActive={step.isActive}
          isClickable={step.isClickable}
          onClick={() => onStepClick?.(step.index)}
        />
      ))}
    </nav>
  );
}
