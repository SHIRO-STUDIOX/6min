"use client";

import React, { useMemo } from "react";
import {
  Button,
  Chip,
  Spinner,
  TextField,
  InputGroup,
  Label,
  Kbd,
} from "@heroui/react";
import { RotateCcw as RestartIcon } from "lucide-react";
import { Sparkles as StarsIcon } from "lucide-react";
import {
  Volume2,
  AlertCircle,
  Check,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  SendHorizontal,
  Headphones,
  CheckCircle2,
} from "lucide-react";
import { BaseCard } from "@/components/molecules/base-card";
import { useDictationFsm } from "@/hooks/use-dictation-fsm";
import {
  DictationCardProps,
  DEFAULT_DICTATION_PROMPTS,
} from "@/types/dictation";

/**
 * DictationCard — کارت تعاملی املای سریع صوتی (Audio Dictation Card)
 * پیاده‌سازی شده در بستر کامپوننت پایه BaseCard و با پیروی از اصول HeroUI v3 و Atomic Design.
 */
export function DictationCard({
  cardLabel = "کارت ۴: املای سریع صوتی",
  title = "املای سریع صوتی",
  description = "به تلفظ صوتی گوش دهید و عبارت صحیح را تایپ کنید",
  prompts = DEFAULT_DICTATION_PROMPTS,
  autoPlayOnLoad = false,
  isLocked: externalIsLocked = false,
  lockMessage,
  targetLanguage = "en",
  autoCapitalize = "none",
  autoCorrect = "off",
  spellCheck = false,
  nextButtonText = "کارت بعدی",
  onNext,
  onComplete,
  onAudioPlay,
  className = "",
}: DictationCardProps) {
  // ۱. اتصال به هوک ماشین وضعیت متناهی (FSM)
  const {
    currentIndex,
    currentPrompt,
    inputBuffer,
    isLocked: fsmLocked,
    cardState,
    mistakeCount,
    flaggedWords,
    feedbackMessage,
    progressPercentage,
    isCompleted,
    inputRef,
    handleInputChange,
    submitAnswer,
    playAudio,
    insertSpecialCharacter,
    resetCurrent,
    resetAll,
  } = useDictationFsm({
    prompts,
    autoPlayOnLoad,
    onAudioPlay,
    onComplete,
  });

  // قفل ترکیبی از وضعیت والد و ترنزیشن داخلی FSM
  const effectiveLocked = externalIsLocked || fsmLocked;
  const isAudioPlaying = cardState === "PLAYING_AUDIO";

  // استایل بوردر و پس‌زمینه کانتینر فیلد ورودی بر اساس وضعیت FSM
  const inputContainerStyles = useMemo(() => {
    switch (cardState) {
      case "SUCCESS":
        return "border-success/60 bg-success/5 ring-2 ring-success/20";
      case "TYPO_WARNING":
        return "border-warning/60 bg-warning/5 ring-2 ring-warning/20";
      case "ERROR":
        return "border-danger/60 bg-danger/5 ring-2 ring-danger/20 animate-pulse";
      case "EVALUATING":
        return "border-primary/50 bg-primary/5 ring-1 ring-primary/20";
      case "TYPING":
        return "border-accent/60 bg-background ring-1 ring-accent/20";
      default:
        return "border-default-200/80 bg-content2/30 hover:border-default-300";
    }
  }, [cardState]);

  // متن و آیکون دکمه سابمیت پاسخ
  const submitButtonContent = useMemo(() => {
    if (cardState === "EVALUATING") {
      return (
        <span className="flex items-center gap-1.5">
          <Spinner size="sm" color="current" />
          <span>در حال بررسی املا...</span>
        </span>
      );
    }
    if (cardState === "SUCCESS") {
      return (
        <span className="flex items-center gap-1.5 text-success-foreground">
          <Check className="size-4" />
          <span>آفرین! املا کاملاً صحیح است</span>
        </span>
      );
    }
    if (cardState === "TYPO_WARNING") {
      return (
        <span className="flex items-center gap-1.5 text-warning-foreground">
          <AlertTriangle className="size-4" />
          <span>پذیرفته شد (با خطای تایپی جزئی)</span>
        </span>
      );
    }
    if (cardState === "ERROR") {
      return (
        <span className="flex items-center gap-1.5 text-danger-foreground">
          <AlertCircle className="size-4" />
          <span>اشتباه بود، دوباره تلاش کنید</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5">
        <SendHorizontal className="size-4" />
        <span>ثبت و بررسی پاسخ</span>
      </span>
    );
  }, [cardState]);

  // واریانت دکمه سابمیت
  const submitButtonVariant = useMemo(() => {
    if (cardState === "SUCCESS") return "primary";
    if (cardState === "TYPO_WARNING") return "secondary";
    if (cardState === "ERROR") return "danger";
    if (inputBuffer.trim().length > 0) return "primary";
    return "secondary";
  }, [cardState, inputBuffer]);

  // وضعیت غیرفعال بودن دکمه سابمیت
  const isSubmitDisabled =
    effectiveLocked ||
    inputBuffer.trim().length === 0 ||
    cardState === "EVALUATING" ||
    cardState === "SUCCESS" ||
    cardState === "COMPLETED";

  // متون پیشرفت
  const progressLabel = isCompleted
    ? "تکمیل تمام عبارات صوتی:"
    : "پیشرفت املای درس:";
  const progressText = isCompleted
    ? `${prompts.length} از ${prompts.length}`
    : `${currentIndex + 1} از ${prompts.length}`;

  return (
    <BaseCard
      cardLabel={cardLabel}
      title={title}
      description={description}
      progressPercentage={progressPercentage}
      progressLabel={progressLabel}
      progressText={progressText}
      isCompleted={isCompleted}
      completedStatusText="تمامی عبارات صوتی با موفقیت نوشته شدند"
      isLocked={externalIsLocked}
      lockMessage={lockMessage}
      progressBarAriaLabel="میزان پیشرفت املای سریع صوتی"
      nextButtonText={nextButtonText}
      onNext={onNext}
      className={className}
      footerStart={
        <div className="flex items-center gap-1.5">
          {/* دکمه شروع مجدد کل کارت */}
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            onClick={resetAll}
            aria-label="شروع مجدد املای صوتی"
            isDisabled={effectiveLocked}
            className="text-default-500 hover:text-foreground"
          >
            <RestartIcon className="size-4" />
          </Button>

          {/* دکمه پاکسازی اینپوت فعلی */}
          {inputBuffer.length > 0 && !isCompleted && (
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              onClick={resetCurrent}
              aria-label="پاکسازی ورودی جاری"
              isDisabled={effectiveLocked || cardState === "EVALUATING"}
              className="text-muted hover:text-foreground"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          )}

          {/* چیپ شمارنده خطاها */}
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

          {/* چیپ کلمات نشان‌شده جهت مرور */}
          {flaggedWords.length > 0 && !isCompleted && (
            <Chip
              size="sm"
              variant="soft"
              color="warning"
              className="font-tabular text-[10px] sm:text-[11px] font-medium h-6 px-2 border border-warning/20 hidden xs:inline-flex"
            >
              <Chip.Label className="flex items-center gap-1">
                <AlertTriangle className="size-3 text-warning" />
                <span>{flaggedWords.length} کلمه نشان‌شده</span>
              </Chip.Label>
            </Chip>
          )}

          {/* نشانگر تکمیل کلی */}
          {isCompleted && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-success bg-success/10 px-2.5 py-1 rounded-lg border border-success/20">
              <StarsIcon className="size-3.5" />
              <span className="hidden sm:inline">عالی! دیکته کامل شد</span>
            </div>
          )}
        </div>
      }
    >
      {/* ======================================================== */}
      {/* بدنه محتوایی: فرم تعاملی املای صوتی */}
      {/* ======================================================== */}
      <div className="w-full flex flex-col gap-2.5 py-0.5">
        {/* ۱. کادر پخش صوت و ترجمه فارسی */}
        <div className="w-full bg-surface-secondary/70 border border-separator/80 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3">
          {/* سمت راست: معنی و راهنمای عبارت */}
          <div className="flex flex-col min-w-0 flex-1 text-start">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="size-3 text-accent shrink-0" />
              <span className="text-[10px] font-medium text-muted">
                معنی و مفهوم عبارت:
              </span>
            </div>
            <p className="text-xs sm:text-[13px] font-semibold text-foreground tracking-tight line-clamp-2 leading-tight">
              {currentPrompt?.translation || "به صوت گوش دهید و عبارت را تایپ کنید"}
            </p>
          </div>

          {/* سمت چپ: دکمه تعاملی پخش صوت با انیمیشن در حال پخش */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant={isAudioPlaying ? "primary" : "secondary"}
              size="md"
              onClick={() => playAudio()}
              isDisabled={effectiveLocked && !isAudioPlaying}
              aria-label="پخش تلفظ صوتی"
              className={`h-9 px-3 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all ${
                isAudioPlaying
                  ? "shadow-md shadow-primary/30 animate-pulse"
                  : "text-foreground hover:text-primary"
              }`}
            >
              {isAudioPlaying ? (
                <>
                  <Spinner size="sm" color="current" />
                  <span>در حال پخش...</span>
                </>
              ) : (
                <>
                  <Volume2 className="size-4 text-accent" />
                  <span>پخش صدا</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ۲. فیلد ورودی متن املای صوتی با HeroUI v3 Compound Components */}
        <div className="w-full flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted px-1 text-start">
            <Label className="cursor-pointer">
              عبارت شنیده‌شده را به انگلیسی تایپ کنید:
            </Label>
            <span className="text-[10px] opacity-70 font-mono font-tabular" dir="ltr">
              #{currentIndex + 1} / {prompts.length}
            </span>
          </div>

          <TextField
            name="dictation-input"
            isInvalid={cardState === "ERROR"}
            isDisabled={effectiveLocked && cardState !== "ERROR" && cardState !== "TYPO_WARNING"}
            className="w-full"
          >
            <InputGroup
              variant="secondary"
              className={`w-full h-11 sm:h-12 px-3 rounded-2xl border transition-all duration-200 flex items-center ${inputContainerStyles}`}
            >
              {/* پیشوند: آیکون هدفون */}
              <InputGroup.Prefix className="pe-2 text-muted flex items-center">
                <Headphones className="size-4 shrink-0" />
              </InputGroup.Prefix>

              {/* ورودی متن با بهینه‌سازی کامل کیبورد موبایل */}
              <InputGroup.Input
                ref={inputRef}
                value={inputBuffer}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSubmitDisabled) {
                    e.preventDefault();
                    submitAnswer();
                  }
                }}
                placeholder="تایپ املای شنیده‌شده..."
                dir="ltr"
                lang={targetLanguage}
                autoCapitalize={autoCapitalize}
                autoCorrect={autoCorrect}
                spellCheck={spellCheck}
                inputMode="text"
                autoComplete="off"
                className="w-full bg-transparent font-mono font-semibold text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-hidden"
              />

              {/* پسوند: راهنمای میانبر یا نشانگر وضعیت */}
              <InputGroup.Suffix className="ps-2 flex items-center gap-1">
                {cardState === "SUCCESS" && (
                  <CheckCircle2 className="size-4 text-success" />
                )}
                {cardState === "TYPO_WARNING" && (
                  <AlertTriangle className="size-4 text-warning" />
                )}
                {cardState === "ERROR" && (
                  <AlertCircle className="size-4 text-danger" />
                )}
                {cardState === "TYPING" && (
                  <Kbd className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5">
                    Enter ↵
                  </Kbd>
                )}
              </InputGroup.Suffix>
            </InputGroup>
          </TextField>
        </div>

        {/* ۳. نوار چیپ‌های کمکی کاراکترهای خاص (Special Characters Bar) */}
        {currentPrompt?.specialCharacters && currentPrompt.specialCharacters.length > 0 && (
          <div className="w-full flex items-center gap-1.5 px-0.5">
            <span className="text-[10px] font-medium text-muted shrink-0">
              کاراکترهای کمکی:
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {currentPrompt.specialCharacters.map((char, index) => (
                <button
                  key={`special-${char}-${index}`}
                  type="button"
                  disabled={effectiveLocked || isCompleted}
                  onClick={() => insertSpecialCharacter(char)}
                  title={`افزودن کاراکتر ${char}`}
                  className="h-6 min-w-6 px-1.5 rounded-lg border border-separator/80 bg-surface-secondary hover:bg-surface-tertiary active:scale-95 text-foreground font-mono text-xs font-bold transition-all cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-primary select-none flex items-center justify-center shadow-2xs"
                >
                  {char}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ۴. نمایش بازخورد تعاملی پویا (Feedback Banner) */}
        {feedbackMessage && (
          <div
            className={`w-full p-2 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
              cardState === "SUCCESS"
                ? "bg-success/10 border-success/30 text-success"
                : cardState === "TYPO_WARNING"
                ? "bg-warning/10 border-warning/30 text-warning"
                : "bg-danger/10 border-danger/30 text-danger"
            }`}
          >
            {cardState === "SUCCESS" && <Check className="size-3.5 shrink-0" />}
            {cardState === "TYPO_WARNING" && (
              <AlertTriangle className="size-3.5 shrink-0" />
            )}
            {cardState === "ERROR" && (
              <AlertCircle className="size-3.5 shrink-0" />
            )}
            <span className="leading-tight text-start flex-1">
              {feedbackMessage}
            </span>
          </div>
        )}

        {/* ۵. دکمه اعتبارسنجی و سابمیت پاسخ (Submit Action) */}
        <div className="w-full pt-0.5">
          <Button
            variant={submitButtonVariant}
            size="md"
            fullWidth
            isDisabled={isSubmitDisabled}
            onClick={submitAnswer}
            className={`font-semibold text-xs sm:text-sm h-10 transition-all ${
              inputBuffer.trim().length > 0 && cardState === "TYPING"
                ? "shadow-md shadow-primary/20"
                : ""
            }`}
          >
            {submitButtonContent}
          </Button>
        </div>
      </div>
    </BaseCard>
  );
}
