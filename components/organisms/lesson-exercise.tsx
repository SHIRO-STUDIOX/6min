"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { z } from "zod";
import { useVocabularyFsm } from "@/hooks/use-vocabulary-fsm";
import { useGrammarFsm } from "@/hooks/use-grammar-fsm";
import { useExerciseDraft } from "@/hooks/use-exercise-draft";
import {
  vocabularyCompletion,
  vocabularyPairs,
  fullCompletion,
} from "@/lib/client/exercise-adapter";
import { scopedApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/messages";
import type { Learner } from "@/lib/contracts/experience";
import type { PublicStage } from "@/lib/contracts/content";
import type { FullAttemptInput } from "@/lib/contracts/attempt";
import { BaseCard } from "@/components/molecules/base-card";
import { VocabularyCardView } from "@/components/organisms/vocabulary-card";
import { GrammarCardView } from "@/components/organisms/grammar-card";

export type AttemptReceipt = {
  attemptId: string;
  exerciseScore: number;
  lessonScore: number;
  unlockEvent: { lessonId: string } | null;
};
type Props = {
  model: Learner | null;
  lessonId: string;
  revisionId: string;
  stage: PublicStage;
  onResult?: (receipt: AttemptReceipt) => void;
  onInteract?: () => void;
  onNext?: () => void;
  cardLabel?: string;
  draftStatus?: string;
};
const matchingDraft = z.object({
  selections: z.array(z.object({ sourceId: z.string(), targetId: z.string() })),
});
const grammarDraft = z.object({
  answers: z.record(z.string(), z.array(z.string())),
  currentIndex: z.number().int().nonnegative(),
  selectedTokenIds: z.array(z.string()),
});

export function LessonExercise(props: Props) {
  const draft = useExerciseDraft(
    props.model,
    props.lessonId,
    props.revisionId,
    props.stage.id,
  );
  const frame = {
    cardLabel: props.cardLabel,
    title:
      props.stage.exerciseKind === "vocabulary-match"
        ? "واژگان تخصصی"
        : "پازل کلمات و گرامر",
    className: "h-full",
    scrollContent: true,
  };
  if (!draft.loaded)
    return (
      <BaseCard {...frame}>
        <p role="status">در حال بازیابی پیش‌نویس…</p>
      </BaseCard>
    );
  if (draft.conflict)
    return (
      <BaseCard {...frame}>
        <p>دو نسخه متفاوت از پیش‌نویس موجود است. کدام نسخه را ادامه می‌دهید؟</p>
        <Button onPress={() => draft.resolve("local")}>
          ادامه نسخه این دستگاه
        </Button>
        <Button onPress={() => draft.resolve("server")}>ادامه نسخه حساب</Button>
      </BaseCard>
    );
  const runtimeProps = {
    ...props,
    initial: draft.initial,
    save: draft.save,
    draftStatus: draft.status,
  };
  if (props.stage.exerciseKind === "vocabulary-match")
    return <Matching {...runtimeProps} />;
  if (props.stage.exerciseKind === "grammar-order")
    return <Grammar {...runtimeProps} />;
  return (
    <BaseCard {...frame}>
      <p>
        محتوای معتبر این تمرین هنوز آماده نیست؛ امتیاز شبیه‌سازی‌شده ثبت
        نمی‌شود.
      </p>
    </BaseCard>
  );
}

function Submission({
  body,
  onResult,
  reset,
  preview,
  subjectScope,
  onNext,
}: {
  body: FullAttemptInput | null;
  onResult?: Props["onResult"];
  reset: () => void;
  preview: boolean;
  subjectScope?: string;
  onNext?: () => void;
}) {
  const api = scopedApi(subjectScope);
  const key = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<AttemptReceipt | null>(null);
  return (
    <div className="flex flex-col gap-2 text-xs">
      {receipt && (
        <p role="status">
          نتیجه ثبت شد: {Math.round(receipt.exerciseScore * 100)}٪ پاسخ درست؛
          امتیاز کسب‌شده درس {Math.round(receipt.lessonScore)}٪
        </p>
      )}
      {error && (
        <p role="alert">
          {errorMessage(error)} پاسخ‌ها و کلید تلاش برای امتحان دوباره حفظ
          شده‌اند.
        </p>
      )}
      {!receipt && (
        <Button
          isDisabled={!body || busy || preview}
          onPress={() => {
            if (!body) return;
            key.current ??= crypto.randomUUID();
            setBusy(true);
            setError("");
            void api<AttemptReceipt>("/attempts", "POST", body, key.current)
              .then((value) => {
                setReceipt(value);
                onResult?.(value);
              })
              .catch((error) =>
                setError(
                  error instanceof Error ? error.message : "REQUEST_FAILED",
                ),
              )
              .finally(() => setBusy(false));
          }}
        >
          ثبت تلاش کامل
        </Button>
      )}
      {receipt && onNext && (
        <Button size="sm" onPress={onNext}>
          کارت بعدی
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        isDisabled={busy}
        onPress={() => {
          key.current = null;
          setReceipt(null);
          setError("");
          reset();
        }}
      >
        تلاش تازه از ابتدا
      </Button>
      {preview && <p>پیش‌نمایش؛ نتیجه‌ای به سرور ارسال نمی‌شود.</p>}
    </div>
  );
}

function Matching({
  stage,
  lessonId,
  revisionId,
  model,
  initial,
  save,
  onResult,
  onInteract,
  onNext,
  cardLabel,
  draftStatus,
}: Props & { initial: unknown; save: (input: unknown) => void }) {
  const signature = JSON.stringify(stage.questions);
  const pairs = useMemo(() => vocabularyPairs(stage), [stage.id, signature]);
  const fsm = useVocabularyFsm({
    pairs,
    evaluationMode: "deferred",
    autoShuffleTarget: true,
    successFeedbackMs: 120,
  });
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Restoration is idempotent: repeat it after StrictMode replays the FSM reset.
    const parsed = matchingDraft.safeParse(initial);
    if (parsed.success) fsm.restoreDeferred(parsed.data.selections);
    setHydrated(true);
  }, [initial, fsm.restoreDeferred]);
  const selections = JSON.stringify(fsm.deferredAnswers);
  useEffect(() => {
    if (hydrated && fsm.deferredAnswers.length)
      save({ selections: fsm.deferredAnswers });
  }, [selections, hydrated, save]);
  const [assessed, setAssessed] = useState(false);
  const complete = fsm.deferredAnswers.length === pairs.length;
  return (
    <VocabularyCardView
      fsm={fsm}
      pairs={pairs}
      deferred
      assessed={assessed}
      cardLabel={cardLabel}
      title="واژگان تخصصی"
      description="جفت‌های واژگان درس و معادل فارسی را به هم وصل کنید"
      className="h-full"
      onInteract={onInteract}
      status={
        <>
          <p className="text-xs text-muted">
            {fsm.deferredAnswers.length} از {pairs.length} پاسخ ثبت موقت شد؛
            درستی پاسخ‌ها پس از ثبت تلاش بررسی می‌شود.
          </p>
          {draftStatus && (
            <p role="status" className="text-xs text-muted">
              {draftStatus}
            </p>
          )}
        </>
      }
      actions={
        <Submission
          subjectScope={model?.scope}
          preview={!model}
          body={
            complete
              ? vocabularyCompletion(
                  lessonId,
                  revisionId,
                  stage,
                  fsm.deferredAnswers,
                )
              : null
          }
          onResult={(receipt) => {
            setAssessed(true);
            onResult?.(receipt);
          }}
          onNext={onNext}
          reset={() => {
            setAssessed(false);
            fsm.reset();
            save({ selections: [] });
          }}
        />
      }
    />
  );
}

function Grammar({
  stage,
  lessonId,
  revisionId,
  model,
  initial,
  save,
  onResult,
  onInteract,
  onNext,
  cardLabel,
  draftStatus,
}: Props & { initial: unknown; save: (input: unknown) => void }) {
  const signature = JSON.stringify(stage.questions);
  const sentences = useMemo(
    () =>
      stage.questions.map((question) => ({
        id: question.id,
        targetSentence: "",
        translation: question.prompt,
        tokens: question.options.map((option) => option.text),
        publicTokens: question.options,
      })),
    [stage.id, signature],
  );
  const fsm = useGrammarFsm({
    sentences,
    evaluationMode: "deferred",
    autoPlayAudioOnSuccess: false,
    successFeedbackMs: 120,
  });
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Restoration is idempotent: repeat it after StrictMode replays the FSM reset.
    const parsed = grammarDraft.safeParse(initial);
    if (parsed.success) fsm.restoreDeferred(parsed.data);
    setHydrated(true);
  }, [initial, fsm.restoreDeferred]);
  const snapshot = {
    answers: fsm.deferredAnswers,
    currentIndex: fsm.currentSentenceIndex,
    selectedTokenIds: fsm.selectedTokens.map((token) => token.id),
  };
  const serialized = JSON.stringify(snapshot);
  useEffect(() => {
    if (
      hydrated &&
      (snapshot.selectedTokenIds.length || Object.keys(snapshot.answers).length)
    )
      save(snapshot);
  }, [serialized, hydrated, save]);
  const complete = stage.questions.every(
    (question) =>
      (fsm.deferredAnswers[question.id]?.length ?? 0) ===
      question.options.length,
  );
  const [assessed, setAssessed] = useState(false);
  return (
    <GrammarCardView
      fsm={fsm}
      sentences={sentences}
      deferred
      assessed={assessed}
      cardLabel={cardLabel}
      className="h-full"
      description="کلمات را برای ساخت جملهٔ صحیح به ترتیب لمس کنید"
      onInteract={onInteract}
      status={
        <>
          <p className="text-xs text-muted">
            پاسخ‌ها پس از ثبت تلاش کامل بررسی می‌شوند.
          </p>
          {draftStatus && (
            <p role="status" className="text-xs text-muted">
              {draftStatus}
            </p>
          )}
        </>
      }
      actions={
        <Submission
          subjectScope={model?.scope}
          preview={!model}
          body={
            complete
              ? fullCompletion(
                  lessonId,
                  revisionId,
                  stage,
                  Object.fromEntries(
                    Object.entries(fsm.deferredAnswers).map(
                      ([id, tokenIds]) => [id, { tokenIds }],
                    ),
                  ),
                )
              : null
          }
          onResult={(receipt) => {
            setAssessed(true);
            onResult?.(receipt);
          }}
          onNext={onNext}
          reset={() => {
            setAssessed(false);
            fsm.resetAll();
            save({ answers: {}, currentIndex: 0, selectedTokenIds: [] });
          }}
        />
      }
    />
  );
}
