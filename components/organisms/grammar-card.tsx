"use client";

import React, { useMemo, type ReactNode } from "react";
import { Button, Chip, Spinner } from "@heroui/react";
import { RotateCcw as RestartIcon } from "lucide-react";
import { CircleCheck as CheckCircleIcon } from "lucide-react";
import { Sparkles as StarsIcon } from "lucide-react";
import { Volume2, AlertCircle, Check, Sparkles, RefreshCw } from "lucide-react";
import { BaseCard } from "@/components/molecules/base-card";
import {
  useGrammarFsm,
  DEFAULT_GRAMMAR_SENTENCES,
} from "@/hooks/use-grammar-fsm";
import {
  GrammarCardProps,
  GrammarToken,
  GrammarSentence,
} from "@/types/grammar";

/**
 * GrammarCard — کارت تعاملی پازل کلمات و گرامر (Word-Block Puzzle)
 * پیاده‌سازی شده در فریم استاندارد BaseCard بدون بازنویسی ابعاد یا ساختار کانتینر.
 */
export function GrammarCard(props: GrammarCardProps) {
  const fsm = useGrammarFsm({
    sentences: props.sentences ?? DEFAULT_GRAMMAR_SENTENCES,
    autoShuffleBank: props.autoShuffleBank ?? true,
    autoPlayAudioOnSuccess: props.autoPlayAudioOnSuccess ?? true,
    onAudioPlay: props.onAudioPlay,
    onComplete: props.onComplete,
  });
  return <GrammarCardView {...props} fsm={fsm} />;
}

export function GrammarCardView({
  cardLabel = "کارت ۳: ساختار جمله و گرامر",
  title = "پازل کلمات و گرامر",
  description = "کلمات انگلیسی را برای ساخت جمله صحیح به ترتیب لمس کنید",
  sentences = DEFAULT_GRAMMAR_SENTENCES,
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
}: GrammarCardProps & {
  fsm: ReturnType<typeof useGrammarFsm>;
  deferred?: boolean;
  assessed?: boolean;
  actions?: ReactNode;
  status?: ReactNode;
  onInteract?: () => void;
  onReset?: () => void;
}) {
  // ۱. اتصال به ماشین وضعیت متناهی (FSM)
  const {
    currentSentenceIndex,
    currentSentence,
    selectedTokens,
    allBankTokens,
    isLocked: fsmLocked,
    cardState,
    mistakeCount,
    progressPercentage,
    isCompleted: answersComplete,
    selectBankToken,
    deselectSentenceToken,
    checkSentence,
    resetCurrentSentence,
    resetAll,
    playCurrentSentenceAudio,
  } = fsm;
  const isCompleted = deferred ? assessed : answersComplete;

  // قفل کلیک ترکیبی از وضعیت والد و ارزیابی داخلی FSM
  const effectiveLocked = externalIsLocked || fsmLocked;

  // مجموعه شناسه‌های توکن‌های انتخاب شده برای بررسی سریع
  const selectedTokenIds = useMemo(
    () => new Set(selectedTokens.map((t) => t.id)),
    [selectedTokens],
  );

  // استایل‌های پویا بر اساس وضعیت ارزیابی FSM
  const lineStateStyles = useMemo(() => {
    switch (cardState) {
      case "SUCCESS":
        return "border-success/60 bg-success/10 ring-2 ring-success/20";
      case "ERROR":
        return "border-danger/60 bg-danger/10 ring-2 ring-danger/20 animate-pulse";
      case "CHECKING":
        return "border-primary/50 bg-primary/5 ring-1 ring-primary/20";
      case "READY_TO_CHECK":
        return "border-primary/40 bg-surface-secondary/60";
      default:
        return "border-separator/70 bg-surface-secondary/40 hover:border-separator";
    }
  }, [cardState]);

  // متن دکمه اکشن بررسی
  const checkButtonContent = useMemo(() => {
    if (cardState === "CHECKING") {
      return (
        <span className="flex items-center gap-1.5">
          <Spinner size="sm" color="current" />
          <span>در حال بررسی...</span>
        </span>
      );
    }
    if (cardState === "SUCCESS") {
      return (
        <span className="flex items-center gap-1.5">
          <Check className="size-4" />
          <span>آفرین! صحیح بود</span>
        </span>
      );
    }
    if (cardState === "ERROR") {
      return (
        <span className="flex items-center gap-1.5">
          <AlertCircle className="size-4" />
          <span>ترتیب اشتباه است، دوباره تلاش کنید</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5">
        <Check className="size-4" />
        <span>{deferred ? "ثبت موقت این پاسخ" : "بررسی پاسخ"}</span>
      </span>
    );
  }, [cardState, deferred]);

  // رنگ و وضعیت دکمه بررسی
  const checkButtonVariant = useMemo(() => {
    if (cardState === "SUCCESS") return "primary";
    if (cardState === "ERROR") return "danger";
    if (cardState === "READY_TO_CHECK") return "primary";
    return "secondary";
  }, [cardState]);

  const isCheckDisabled =
    effectiveLocked ||
    cardState === "IDLE" ||
    cardState === "BUILDING" ||
    cardState === "CHECKING" ||
    cardState === "SUCCESS" ||
    answersComplete;

  // متن پیشرفت
  const progressLabel = isCompleted ? "تکمیل تمام جملات:" : "پیشرفت جملات درس:";
  const progressText = isCompleted
    ? `${sentences.length} از ${sentences.length}`
    : `${currentSentenceIndex + 1} از ${sentences.length}`;

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
        deferred ? "تلاش کامل ثبت شد" : "تمام جملات با موفقیت ساخته شدند"
      }
      isLocked={externalIsLocked}
      lockMessage={lockMessage}
      progressBarAriaLabel="میزان پیشرفت پازل کلمات"
      nextButtonText="کارت بعدی"
      onNext={onNext}
      className={className}
      scrollContent={deferred}
      footerEnd={actions}
      footerStart={
        !deferred && (
          <div className="flex items-center gap-1.5">
            {/* دکمه ریست کل کارت */}
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              onPress={onReset ?? resetAll}
              aria-label="شروع مجدد تمرین گرامر"
              isDisabled={effectiveLocked}
              className="text-muted hover:text-foreground"
            >
              <RestartIcon className="size-4" />
            </Button>

            {/* دکمه پاکسازی خط جمله فعلی */}
            {selectedTokens.length > 0 && !isCompleted && (
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                onClick={resetCurrentSentence}
                aria-label="پاکسازی خط جمله جاری"
                isDisabled={effectiveLocked || cardState === "CHECKING"}
                className="text-muted hover:text-foreground"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            )}

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

            {/* نشانگر تکمیل کلی */}
            {isCompleted && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-success bg-success/10 px-2.5 py-1 rounded-lg border border-success/20">
                <StarsIcon className="size-3.5" />
                <span className="hidden sm:inline">عالی! تمرین کامل شد</span>
              </div>
            )}
          </div>
        )
      }
    >
      {/* ======================================================== */}
      {/* بدنه محتوایی: پازل کلمات (Word-Block Puzzle) */}
      {/* ======================================================== */}
      <div className="w-full flex flex-col gap-2.5 py-0.5">
        {/* ۱. جعبه راهنما و معنی جمله فارسی */}
        <div className="w-full bg-surface-secondary/70 border border-separator/80 rounded-2xl p-2.5 flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0 flex-1 text-start">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="size-3 text-accent shrink-0" />
              <span className="text-[10px] font-medium text-muted">
                جمله مورد نظر به فارسی:
              </span>
            </div>
            <p className="text-xs sm:text-[13px] font-semibold text-foreground tracking-tight line-clamp-2 leading-tight">
              {currentSentence?.translation || "جمله انگلیسی زیر را بسازید:"}
            </p>
          </div>

          {/* دکمه پخش صوت تلفظ جمله */}
          {currentSentence?.audioUrl && (
            <Button
              variant="secondary"
              size="sm"
              isIconOnly
              onClick={playCurrentSentenceAudio}
              aria-label="پخش تلفظ صوتی جمله"
              isDisabled={effectiveLocked}
              className="shrink-0 size-8 rounded-xl text-muted hover:text-primary"
            >
              <Volume2 className="size-4" />
            </Button>
          )}
        </div>

        {/* ۲. خط چیدمان جمله (Sentence Assembly Line) */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted px-1">
            <span>خط ساخت جمله:</span>
            <span className="text-[10px] opacity-70" dir="ltr">
              {selectedTokens.length} / {currentSentence?.tokens.length ?? 0}
            </span>
          </div>

          <div
            className={`w-full min-h-[56px] p-2 rounded-2xl border transition-all duration-200 flex flex-wrap gap-1.5 items-center justify-start ${lineStateStyles}`}
            dir="ltr"
          >
            {selectedTokens.length === 0 ? (
              <div className="w-full flex items-center justify-center py-2 text-center select-none">
                <span className="text-xs text-muted font-normal">
                  کلمات را از مخزن پایین لمس کنید تا در اینجا قرار گیرند...
                </span>
              </div>
            ) : (
              selectedTokens.map((token, index) => {
                const isSuccess = cardState === "SUCCESS";
                const isError = cardState === "ERROR";

                let tokenColorClass =
                  "bg-surface text-foreground border-separator shadow-xs hover:border-danger hover:text-danger";
                if (isSuccess) {
                  tokenColorClass =
                    "bg-success text-success-foreground border-success shadow-xs";
                } else if (isError) {
                  tokenColorClass =
                    "bg-danger text-danger-foreground border-danger shadow-xs";
                }

                return (
                  <button
                    key={`selected-${token.id}-${index}`}
                    type="button"
                    disabled={effectiveLocked || cardState === "CHECKING"}
                    onClick={() => {
                      onInteract?.();
                      deselectSentenceToken(token);
                    }}
                    aria-label={deferred ? `حذف ${token.text}` : undefined}
                    title="لمس برای بازگشت به مخزن"
                    className={`h-8 px-3 rounded-xl border text-xs sm:text-[13px] font-medium transition-all duration-150 active:scale-95 flex items-center gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${tokenColorClass}`}
                  >
                    <span>{token.text}</span>
                    {isSuccess && <Check className="size-3" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ۳. مخزن کلمات (Word Bank) */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted px-1 text-start">
            مخزن کلمات:
          </span>

          <div
            className="w-full min-h-[76px] p-2 bg-surface-secondary/40 border border-separator/60 rounded-2xl flex flex-wrap gap-1.5 items-center justify-center"
            dir="ltr"
          >
            {allBankTokens.map((token) => {
              const isUsed = selectedTokenIds.has(token.id);

              if (isUsed) {
                // اسلات خالی / نگهدارنده برای جلوگیری از تغییر ناگهانی چیدمان
                return (
                  <div
                    key={`slot-${token.id}`}
                    className="h-8 px-3 rounded-xl border border-dashed border-separator/60 bg-default-100/20 text-transparent text-xs sm:text-[13px] font-medium select-none pointer-events-none"
                    aria-hidden="true"
                  >
                    {token.text}
                  </div>
                );
              }

              return (
                <button
                  key={`bank-${token.id}`}
                  type="button"
                  disabled={effectiveLocked || answersComplete}
                  onClick={() => {
                    onInteract?.();
                    selectBankToken(token);
                  }}
                  className="h-8 px-3 rounded-xl border border-separator/80 bg-surface hover:bg-surface-secondary active:scale-95 text-foreground text-xs sm:text-[13px] font-medium shadow-xs transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {token.text}
                </button>
              );
            })}
          </div>
        </div>

        {/* ۴. دکمه اعتبارسنجی و بررسی جمله (Check Action) */}
        <div className="w-full pt-1">
          <Button
            variant={checkButtonVariant}
            size="md"
            fullWidth
            isDisabled={isCheckDisabled}
            onPress={checkSentence}
            className={`font-semibold text-xs sm:text-sm h-10 transition-all ${
              cardState === "READY_TO_CHECK"
                ? "shadow-md shadow-primary/25"
                : ""
            }`}
          >
            {checkButtonContent}
          </Button>
        </div>
        {status}
      </div>
    </BaseCard>
  );
}
