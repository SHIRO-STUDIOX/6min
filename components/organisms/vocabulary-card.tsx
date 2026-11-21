"use client";

import React, { useMemo, type ReactNode } from "react";
import { Button, Chip } from "@heroui/react";
import { RotateCcw as RestartIcon } from "lucide-react";
import { CircleCheck as CheckCircleIcon } from "lucide-react";
import { Sparkles as StarsIcon } from "lucide-react";
import { Volume2, AlertCircle } from "lucide-react";
import { BaseCard } from "@/components/molecules/base-card";
import {
  useVocabularyFsm,
  VocabularyPair,
  VocabularyResult,
  VocabularyColumnItem,
} from "@/hooks/use-vocabulary-fsm";

export interface VocabularyCardProps {
  /** برچسب نوع کارت */
  cardLabel?: string;
  /** عنوان تمرین */
  title?: string;
  /** توضیحات راهنما */
  description?: string;
  /** جفت‌های واژگان مبدأ و مقصد */
  pairs?: VocabularyPair[];
  /** شافل خودکار ستون مقصد */
  autoShuffleTarget?: boolean;
  /** قفل بودن کلی جلسه از والد */
  isLocked?: boolean;
  /** پیام قفل بودن جلسه */
  lockMessage?: string;
  /** رویداد کلیک روی دکمه کارت بعدی */
  onNext?: () => void;
  /** رویداد اتمام موفقیت‌آمیز تمام جفت‌ها همراه با گزارش عملکرد */
  onComplete?: (result: VocabularyResult) => void;
  /** رویداد پخش فایل صوتی */
  onAudioPlay?: (audioSrc: string, item: VocabularyColumnItem) => void;
  /** کلاس‌های اضافی CSS */
  className?: string;
}

/**
 * جفت‌های پیش‌فرض واژگان تخصصی مهندسی و دیزاین میکرولرنینگ
 */
export const DEFAULT_VOCABULARY_PAIRS: VocabularyPair[] = [
  {
    id: "v-1",
    source: {
      text: "Microlearning",
      subText: "/ˈmaɪ.kroʊ/",
      audioSrc: "https://dict.youdao.com/dictvoice?audio=microlearning&type=2",
    },
    target: {
      text: "یادگیری خُرد",
      subText: "آموزش گام‌به‌گام و متمرکز",
    },
  },
  {
    id: "v-2",
    source: {
      text: "State Machine",
      subText: "/steɪt məˈʃiːn/",
      audioSrc: "https://dict.youdao.com/dictvoice?audio=state+machine&type=2",
    },
    target: {
      text: "ماشین وضعیت",
      subText: "مدل متناهی ترنزیشن‌ها",
    },
  },
  {
    id: "v-3",
    source: {
      text: "Cognitive Load",
      subText: "/ˈkɑːɡ.nə.tɪv/",
      audioSrc: "https://dict.youdao.com/dictvoice?audio=cognitive+load&type=2",
    },
    target: {
      text: "بار شناختی",
      subText: "میزان پردازش ذهن",
    },
  },
  {
    id: "v-4",
    source: {
      text: "Atomic Design",
      subText: "/əˈtɑː.mɪk/",
      audioSrc: "https://dict.youdao.com/dictvoice?audio=atomic+design&type=2",
    },
    target: {
      text: "طراحی اتمیک",
      subText: "معماری ماژولار کامپوننت",
    },
  },
];

/**
 * VocabularyCard — کارت تعاملی تطبیق واژگان بر پایه ماشین وضعیت متناهی (FSM)
 * تزریق‌شده در ساختار پایه BaseCard بدون بازنویسی ابعاد یا استایل‌های کانتینر.
 */
export function VocabularyCard(props: VocabularyCardProps) {
  const fsm = useVocabularyFsm({
    pairs: props.pairs ?? DEFAULT_VOCABULARY_PAIRS,
    autoShuffleTarget: props.autoShuffleTarget ?? true,
    onAudioPlay: props.onAudioPlay,
    onComplete: props.onComplete,
  });
  return <VocabularyCardView {...props} fsm={fsm} />;
}

/** The dev card presentation can also consume the live deferred FSM. */
export function VocabularyCardView({
  cardLabel = "کارت ۲: تطبیق واژگان",
  title = "واژه‌نامه تخصصی درس",
  description = "کلمات انگلیسی را به معادل فارسی صحیح متصل کنید",
  pairs = DEFAULT_VOCABULARY_PAIRS,
  isLocked: externalIsLocked = false,
  lockMessage,
  onNext,
  className = "",
  fsm,
  deferred = false,
  assessed = false,
  actions,
  status,
  onInteract,
  onReset,
}: VocabularyCardProps & {
  fsm: ReturnType<typeof useVocabularyFsm>;
  deferred?: boolean;
  assessed?: boolean;
  actions?: ReactNode;
  status?: ReactNode;
  onInteract?: () => void;
  onReset?: () => void;
}) {
  // ۱. اتصال به ماشین وضعیت متناهی (FSM)
  const {
    cardState,
    sourceItems,
    targetItems,
    selectedSourceId,
    selectedTargetId,
    matchedIds,
    isLocked: fsmLocked,
    mistakeCount,
    progressPercentage,
    isCompleted: locallyCompleted,
    selectItem,
    reset,
    playAudio,
  } = fsm;
  const isCompleted = deferred ? assessed : locallyCompleted;

  // قفل کلیک ترکیبی از وضعیت والد و وضعیت داخلی ارزیابی FSM
  const effectiveLocked = externalIsLocked || fsmLocked;

  // استایل‌های وضعیت هر آیتم در ستون مبدأ یا مقصد
  const getItemVisualState = useMemo(() => {
    return (column: "source" | "target", item: VocabularyColumnItem) => {
      // Public option order is not an answer key. Mark the actual selected IDs.
      if (
        deferred &&
        fsm.deferredAnswers.some((answer) =>
          column === "source"
            ? answer.sourceId === item.id
            : answer.targetId === item.id,
        )
      ) {
        return {
          containerClass:
            "bg-accent/10 text-accent border-accent/30 opacity-75",
          badgeClass: "bg-accent/20 text-accent",
          isDone: true,
          status: "recorded" as const,
        };
      }
      const isMatched = !deferred && matchedIds.has(item.pairId);
      const isSelected =
        column === "source"
          ? selectedSourceId === item.id
          : selectedTargetId === item.id;

      // ۱. حالت جفت تطبیق‌یافته موفق قبلی
      if (isMatched && !isSelected) {
        return {
          containerClass:
            "bg-success/10 text-success/80 border-success/30 shadow-none cursor-default opacity-75 dark:bg-success/15",
          badgeClass: "bg-success/20 text-success",
          isDone: true,
          status: "matched" as const,
        };
      }

      // ۲. حالت ارزیابی در فاز MATCH_SUCCESS
      if (isSelected && cardState === "MATCH_SUCCESS") {
        return {
          containerClass:
            "bg-success/20 text-success border-success shadow-md shadow-success/20 scale-[1.02] ring-2 ring-success/30",
          badgeClass: "bg-success text-success-foreground",
          isDone: true,
          status: "success" as const,
        };
      }

      // ۳. حالت خطا در فاز MISMATCH_ERROR
      if (isSelected && cardState === "MISMATCH_ERROR") {
        return {
          containerClass:
            "bg-danger/15 text-danger border-danger shadow-md shadow-danger/20 animate-pulse ring-2 ring-danger/30",
          badgeClass: "bg-danger text-danger-foreground",
          isDone: false,
          status: "error" as const,
        };
      }

      // ۴. حالت انتخاب‌شده (در انتظار آیتم دوم یا در حال ارزیابی)
      if (isSelected) {
        return {
          containerClass:
            "bg-primary/15 text-primary border-primary shadow-sm shadow-primary/20 scale-[1.01] ring-2 ring-primary/25",
          badgeClass: "bg-primary text-primary-foreground",
          isDone: false,
          status: "selected" as const,
        };
      }

      // ۵. حالت پیش‌فرض و آماده تعامل
      return {
        containerClass:
          "bg-surface-secondary/70 hover:bg-surface-secondary text-foreground border-separator/70 hover:border-separator shadow-xs",
        badgeClass: "bg-surface-tertiary text-muted",
        isDone: false,
        status: "idle" as const,
      };
    };
  }, [
    matchedIds,
    selectedSourceId,
    selectedTargetId,
    cardState,
    deferred,
    fsm.deferredAnswers,
  ]);

  // متن و وضعیت پیشرفت
  const progressLabel = deferred
    ? "پاسخ‌های ثبت موقت:"
    : isCompleted
      ? "تکمیل تمام جفت‌ها:"
      : "جفت‌های متصل شده:";
  const progressText = `${matchedIds.size} از ${pairs.length}`;

  return (
    <BaseCard
      cardLabel={cardLabel}
      title={title}
      description={description}
      progressPercentage={progressPercentage}
      progressLabel={progressLabel}
      progressText={progressText}
      isCompleted={isCompleted}
      completedStatusText={
        deferred ? "تلاش کامل ثبت شد" : "واژگان با موفقیت تطبیق یافتند"
      }
      isLocked={externalIsLocked}
      lockMessage={lockMessage}
      progressBarAriaLabel="میزان پیشرفت تطبیق واژگان"
      nextButtonText="کارت بعدی"
      onNext={onNext}
      className={className}
      scrollContent={deferred}
      footerEnd={actions}
      footerStart={
        !deferred && (
          <div className="flex items-center gap-2">
            {/* دکمه شروع مجدد / ریست */}
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              onPress={onReset ?? reset}
              aria-label="شروع مجدد تمرین واژگان"
              isDisabled={effectiveLocked}
              className="text-muted hover:text-foreground"
            >
              <RestartIcon className="size-4" />
            </Button>

            {/* شمارنده خطاهای کاربر */}
            {mistakeCount > 0 && (
              <Chip
                size="sm"
                variant="soft"
                color="danger"
                className="font-tabular text-[11px] font-medium h-6 px-2 border border-danger/20"
              >
                <Chip.Label className="flex items-center gap-1">
                  <AlertCircle className="size-3 text-danger" />
                  <span>{mistakeCount} خطا</span>
                </Chip.Label>
              </Chip>
            )}

            {/* نشانگر اتمام کامل */}
            {isCompleted && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-success bg-success/10 px-2.5 py-1 rounded-lg border border-success/20">
                <StarsIcon className="size-3.5" />
                <span className="hidden sm:inline">آفرین! تکمیل شد</span>
              </div>
            )}
          </div>
        )
      }
    >
      {/* ======================================================== */}
      {/* بدنه محتوایی: گرید ۲ ستونه تطبیق واژگان */}
      {/* ======================================================== */}
      <div className="w-full flex flex-col gap-2.5 py-1">
        {/* هدر ستون‌ها */}
        <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold text-default-400 px-1">
          <div className="text-start flex items-center justify-between">
            <span>{deferred ? "واژگان درس" : "واژگان انگلیسی"}</span>
            <span className="text-[10px] opacity-60">Source</span>
          </div>
          <div className="text-start flex items-center justify-between">
            <span>معادل‌های فارسی</span>
            <span className="text-[10px] opacity-60">Target</span>
          </div>
        </div>

        {/* سطرها و کلیدهای تعاملی دو ستون */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {/* ستون ۱: واژگان مبدأ (انگلیسی) */}
          <div className="flex flex-col gap-2">
            {sourceItems.map((item) => {
              const visual = getItemVisualState("source", item);
              const isItemLocked = effectiveLocked || visual.isDone;

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isItemLocked}
                  onClick={() => {
                    onInteract?.();
                    selectItem("source", item.id);
                  }}
                  aria-pressed={selectedSourceId === item.id}
                  className={`group relative w-full h-[54px] px-3 py-1.5 rounded-2xl border transition-all duration-200 flex items-center justify-between text-start outline-none focus-visible:ring-2 focus-visible:ring-primary ${visual.containerClass}`}
                >
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <span
                      className="font-medium text-xs sm:text-[13px] tracking-tight truncate leading-tight"
                      dir="ltr"
                    >
                      {item.text}
                    </span>
                    {item.subText && (
                      <span
                        className="text-[10px] text-default-400 truncate leading-none mt-0.5"
                        dir="ltr"
                      >
                        {item.subText}
                      </span>
                    )}
                  </div>

                  {/* آیکون وضعیت یا کلید پخش صدا */}
                  <div className="ms-1.5 shrink-0 flex items-center">
                    {visual.status === "matched" ? (
                      <CheckCircleIcon className="size-4 text-success" />
                    ) : item.audioSrc ? (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(item.audioSrc, item);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            playAudio(item.audioSrc, item);
                          }
                        }}
                        className="p-1 rounded-full text-muted hover:text-primary transition-colors cursor-pointer"
                        title="پخش تلفظ صوتی"
                      >
                        <Volume2 className="size-3.5" />
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ستون ۲: واژگان مقصد (فارسی، شافل شده) */}
          <div className="flex flex-col gap-2">
            {targetItems.map((item) => {
              const visual = getItemVisualState("target", item);
              const isItemLocked = effectiveLocked || visual.isDone;

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isItemLocked}
                  onClick={() => {
                    onInteract?.();
                    selectItem("target", item.id);
                  }}
                  aria-pressed={selectedTargetId === item.id}
                  className={`group relative w-full h-[54px] px-3 py-1.5 rounded-2xl border transition-all duration-200 flex items-center justify-between text-start outline-none focus-visible:ring-2 focus-visible:ring-primary ${visual.containerClass}`}
                >
                  <div className="flex flex-col justify-center min-w-0 flex-1 text-start">
                    <span className="font-semibold text-xs sm:text-[13px] tracking-tight truncate leading-tight">
                      {item.text}
                    </span>
                    {item.subText && (
                      <span className="text-[10px] text-muted truncate leading-none mt-0.5">
                        {item.subText}
                      </span>
                    )}
                  </div>

                  {/* آیکون وضعیت مچ شدن */}
                  <div className="ms-1.5 shrink-0 flex items-center">
                    {visual.status === "matched" && (
                      <CheckCircleIcon className="size-4 text-success" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        {status}
      </div>
    </BaseCard>
  );
}
