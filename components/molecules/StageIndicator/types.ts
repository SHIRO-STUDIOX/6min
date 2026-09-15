export type StepStatus =
  | "upcoming"
  | "active"
  | "success"
  | "warning"
  | "danger";

export interface StageIndicatorProps {
  /** تعداد مراحل (به صورت پیش‌فرض قفل روی ۵) */
  totalSteps?: number;
  /** اندیس کارت جاری در مرکز دید (۰ تا ۴) */
  currentIndex: number;
  /** آرایه وضعیت‌های مراحل */
  statuses?: StepStatus[];
  /** رویداد کلیک جهت ناوبری به کارت‌های تکمیل‌شده */
  onStepClick?: (index: number) => void;
  /** کلاس‌های سفارشی Tailwind */
  className?: string;
}
