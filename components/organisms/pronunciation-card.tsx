"use client";

import React, { useMemo } from "react";
import {
  Button,
  Chip,
  Spinner,
  Alert,
  Tooltip,
} from "@heroui/react";
import { RotateCcw as RestartIcon } from "lucide-react";
import { Sparkles as StarsIcon } from "lucide-react";
import {
  Volume2,
  Mic,
  Square,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { BaseCard } from "@/components/molecules/base-card";
import { usePronunciationFsm } from "@/hooks/use-pronunciation-fsm";
import {
  PronunciationCardProps,
  DEFAULT_PRONUNCIATION_ITEMS,
} from "@/types/pronunciation";

/**
 * PronunciationCard — کارت تعاملی تلفظ و شنیداری (Pronunciation & Listening Card)
 * پیاده‌سازی شده در بدنه کامپوننت پایه BaseCard منطبق بر اصول HeroUI v3 و Atomic Design.
 */
export function PronunciationCard({
  cardLabel = "کارت ۳: تلفظ و شنیداری",
  title = "کارت تلفظ و شنیداری",
  description = "به تلفظ صوتی گوش دهید و سپس واژه را با صدای واضح بیان کنید",
  items = DEFAULT_PRONUNCIATION_ITEMS,
  autoPlayReferenceOnLoad = false,
  isLocked: externalIsLocked = false,
  lockMessage,
  nextButtonText = "کارت بعدی",
  onNext,
  onComplete,
  onAudioPlay,
  className = "",
}: PronunciationCardProps) {
  // ۱. اتصال به ماشین وضعیت متناهی (FSM)
  const {
    currentIndex,
    currentItem,
    isRecording,
    isAnalyzing,
    cardState,
    attemptCount,
    audioLevels,
    feedbackMessage,
    permissionError,
    progressPercentage,
    isCompleted,
    simulationMode,
    toggleRecording,
    playReferenceAudio,
    resetAll,
    setSimulationMode,
  } = usePronunciationFsm({
    items,
    autoPlayReferenceOnLoad,
    onAudioPlay,
    onComplete,
  });

  // قفل ترکیبی از وضعیت والد و ترنزیشن ارزیابی FSM
  const effectiveLocked = externalIsLocked || isAnalyzing || cardState === "EVALUATING";
  const isReferencePlaying = cardState === "PLAYING_REFERENCE";

  // برچسب‌ها و درصد پیشرفت نوار استاندارد کارت
  const progressLabel = isCompleted
    ? "تکمیل تمام واژگان صوتی:"
    : "پیشرفت تلفظ درس:";
  const progressText = isCompleted
    ? `${items.length} از ${items.length}`
    : `${currentIndex + 1} از ${items.length}`;

  // واریانت و استایل کلید اصلی میکروفون
  const micButtonVariant = useMemo(() => {
    if (cardState === "SUCCESS") return "primary";
    if (cardState === "RECORDING") return "danger";
    if (cardState === "RETRY_FEEDBACK") return "secondary";
    return "primary";
  }, [cardState]);

  return (
    <BaseCard
      cardLabel={cardLabel}
      title={title}
      description={description}
      progressPercentage={progressPercentage}
      progressLabel={progressLabel}
      progressText={progressText}
      isCompleted={isCompleted}
      completedStatusText="تمامی واژگان صوتی با موفقیت تلفظ شدند"
      isLocked={externalIsLocked}
      lockMessage={lockMessage}
      progressBarAriaLabel="میزان پیشرفت تلفظ و شنیداری"
      nextButtonText={nextButtonText}
      onNext={onNext}
      className={className}
      footerStart={
        <div className="flex items-center gap-1.5">
          {/* دکمه شروع مجدد کارت */}
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            onClick={resetAll}
            aria-label="شروع مجدد تمرین تلفظ"
            isDisabled={effectiveLocked || isRecording}
            className="text-default-500 hover:text-foreground"
          >
            <RestartIcon className="size-4" />
          </Button>

          {/* شمارنده تلاش‌های واژه جاری */}
          {attemptCount > 0 && !isCompleted && (
            <Chip
              size="sm"
              variant="soft"
              color={attemptCount >= 2 ? "warning" : "default"}
              className="font-tabular text-[11px] font-medium h-6 px-2 border border-default-300/40"
            >
              <span>تلاش {attemptCount} از ۲</span>
            </Chip>
          )}

          {/* سوئیچر تست و شبیه‌سازی در سندباکس */}
          <div className="hidden sm:flex items-center gap-1 ms-1">
            <Tooltip delay={150}>
              <button
                type="button"
                onClick={() => {
                  const next =
                    simulationMode === "real"
                      ? "mock-match"
                      : simulationMode === "mock-match"
                      ? "mock-mismatch"
                      : "real";
                  setSimulationMode(next);
                }}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded-md border border-default-200 bg-content2/70 text-default-500 hover:text-foreground transition-colors cursor-pointer"
              >
                {simulationMode === "real" && "🎙️ Real"}
                {simulationMode === "mock-match" && "✅ Pass"}
                {simulationMode === "mock-mismatch" && "❌ Retry"}
              </button>
              <Tooltip.Content className="text-[11px] px-2 py-1">
                تغییر مود ارزیابی صوتی جهت تست در سندباکس
              </Tooltip.Content>
            </Tooltip>
          </div>

          {/* نشانگر تکمیل کلی کارت */}
          {isCompleted && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-success bg-success/10 px-2.5 py-1 rounded-lg border border-success/20">
              <StarsIcon className="size-3.5" />
              <span className="hidden sm:inline">عالی! تمرین تلفظ تکمیل شد</span>
            </div>
          )}
        </div>
      }
    >
      {/* ======================================================== */}
      {/* بدنه محتوایی: کارت تلفظ و شنیداری */}
      {/* ======================================================== */}
      <div className="w-full flex flex-col gap-2.5 py-0.5">
        {/* ۱. اعلان خطای عدم دسترسی میکروفون با کامپوننت رسمی HeroUI Alert */}
        {permissionError && (
          <Alert status="danger" className="p-2.5 rounded-2xl">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title className="text-xs font-bold">دسترسی به میکروفون</Alert.Title>
              <Alert.Description className="text-[11px] leading-tight">
                {permissionError}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {/* ۲. کادر نمایش واژه، فونتیک، ترجمه و کلید پخش صدای مرجع */}
        <div className="w-full bg-surface-secondary/70 border border-separator/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 relative overflow-hidden">
          {/* پس‌زمینه لطیف براق */}
          <div className="absolute -top-10 -end-10 size-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

          {/* بخش متنی واژه */}
          <div className="flex flex-col min-w-0 flex-1 text-start">
            <div className="flex items-center gap-2 mb-0.5">
              <h3
                className="text-lg sm:text-xl font-bold font-mono tracking-tight text-foreground"
                dir="ltr"
              >
                {currentItem?.text}
              </h3>

              {currentItem?.phonetic && (
                <span
                  className="font-mono text-xs text-muted bg-surface-tertiary px-2 py-0.5 rounded-lg border border-separator/60"
                  dir="ltr"
                >
                  {currentItem.phonetic}
                </span>
              )}
            </div>

            <p className="text-xs text-muted line-clamp-1">
              {currentItem?.translation || "به تلفظ گوش دهید و سپس تکرار کنید"}
            </p>
          </div>

          {/* دکمه پخش صدای الگو (Reference Audio Player) */}
          <div className="shrink-0 flex items-center">
            <Button
              variant={isReferencePlaying ? "primary" : "secondary"}
              size="md"
              onClick={() => playReferenceAudio()}
              isDisabled={effectiveLocked || isRecording}
              aria-label="پخش صدای الگوی استاندارد"
              className={`h-9 px-3 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all duration-300 ${
                isReferencePlaying
                  ? "shadow-md shadow-primary/30 animate-pulse"
                  : "text-foreground hover:text-primary"
              }`}
            >
              {isReferencePlaying ? (
                <>
                  <Spinner size="sm" color="current" />
                  <span>در حال پخش...</span>
                </>
              ) : (
                <>
                  <Volume2 className="size-4 text-accent" />
                  <span>صدای الگو</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ۳. بخش راهنمای واجی و وضعیت دهان (Phoneme & Mouth Hint) */}
        {(currentItem?.phonemeHighlight || currentItem?.mouthHint) && (
          <div
            className={`w-full p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 flex items-start gap-2.5 text-start ${
              cardState === "RETRY_FEEDBACK"
                ? "bg-warning/10 border-warning/40 shadow-sm"
                : "bg-surface-secondary/50 border-separator/60"
            }`}
          >
            <div
              className={`size-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                cardState === "RETRY_FEEDBACK"
                  ? "bg-warning/20 text-warning"
                  : "bg-accent/15 text-accent"
              }`}
            >
              {cardState === "RETRY_FEEDBACK" ? (
                <Lightbulb className="size-4" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-bold text-foreground">
                  {cardState === "RETRY_FEEDBACK"
                    ? "نکته تلفظ برای اصلاح واجی:"
                    : "تمرکز واجی:"}
                </span>

                {currentItem?.phonemeHighlight && (
                  <span
                    className="font-mono font-bold text-[11px] text-accent bg-accent/10 px-1.5 py-0.5 rounded-md border border-accent/20"
                    dir="ltr"
                  >
                    {currentItem.phonemeHighlight}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-default-600 dark:text-default-400 leading-snug">
                {currentItem?.mouthHint || "واژه را شمرده و با هماهنگی کامل بیان نمایید."}
              </p>
            </div>
          </div>
        )}

        {/* ۴. نشانگر ویژوالایزر امواج صوتی (Waveform Indicator) */}
        <div className="w-full flex flex-col items-center justify-center gap-1.5 py-1">
          <div className="h-10 w-full max-w-[200px] flex items-center justify-center gap-2 bg-surface-secondary/60 border border-separator/70 rounded-xl px-3">
            {audioLevels.map((level, idx) => (
              <span
                key={`wave-bar-${idx}`}
                className={`w-1.5 rounded-full transition-all duration-150 ${
                  isRecording
                    ? "bg-gradient-to-t from-danger to-accent animate-pulse"
                    : cardState === "SUCCESS"
                    ? "bg-success"
                    : "bg-default-300 dark:bg-default-700"
                }`}
                style={{
                  height: `${Math.max(15, Math.min(100, Math.round(level * 100)))}%`,
                }}
              />
            ))}
          </div>

          <span className="text-[10px] text-muted font-medium">
            {isRecording
              ? "در حال شنیدن صدای شما... (برای توقف کلیک کنید)"
              : cardState === "EVALUATING"
              ? "در حال تطبیق و پردازش تلفظ..."
              : isCompleted
              ? "آفرین! کارت تکمیل شد"
              : "برای شروع ضبط، دکمه میکروفون را لمس کنید"}
          </span>
        </div>

        {/* ۵. بنر بازخورد تعاملی پویا (Feedback Banner) */}
        {feedbackMessage && (
          <div
            className={`w-full p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all duration-300 ${
              cardState === "SUCCESS"
                ? "bg-success/10 border-success/30 text-success"
                : cardState === "RETRY_FEEDBACK"
                ? "bg-warning/10 border-warning/30 text-warning"
                : "bg-surface-secondary border-separator text-foreground"
            }`}
          >
            {cardState === "SUCCESS" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertTriangle className="size-4 shrink-0" />
            )}
            <span className="leading-tight text-start flex-1">{feedbackMessage}</span>
          </div>
        )}

        {/* ۶. دکمه اصلی و تعاملی میکروفون (Microphone Interaction Button) */}
        <div className="w-full flex flex-col items-center justify-center pt-0.5">
          <Button
            variant={micButtonVariant}
            size="lg"
            isDisabled={effectiveLocked || isCompleted}
            isPending={isAnalyzing}
            onClick={toggleRecording}
            aria-label={
              isRecording ? "توقف ضبط صدا و ارزیابی" : "شروع ضبط صدا و تلفظ"
            }
            className={`w-full h-11 sm:h-12 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
              isRecording
                ? "shadow-lg shadow-danger/30 ring-4 ring-danger/20 animate-pulse"
                : "shadow-sm shadow-primary/20"
            }`}
          >
            {({ isPending }) =>
              isPending ? (
                <>
                  <Spinner size="sm" color="current" />
                  <span>در حال ارزیابی هوشمند...</span>
                </>
              ) : isRecording ? (
                <>
                  <Square className="size-4 fill-current" />
                  <span>توقف و بررسی تلفظ</span>
                </>
              ) : cardState === "SUCCESS" ? (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>تلفظ عالی و تأیید شد</span>
                </>
              ) : cardState === "RETRY_FEEDBACK" ? (
                <>
                  <HelpCircle className="size-4" />
                  <span>تلاش دوباره برای این واژه</span>
                </>
              ) : (
                <>
                  <Mic className="size-4" />
                  <span>شروع ضبط و تلفظ</span>
                </>
              )
            }
          </Button>
        </div>
      </div>
    </BaseCard>
  );
}
