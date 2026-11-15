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
import { QuestionRenderer } from "@/components/molecules/question-renderer";

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
  if (!draft.loaded) return <p role="status">در حال بازیابی پیش‌نویس…</p>;
  if (draft.conflict)
    return (
      <div className="flex flex-col gap-3">
        <p>دو نسخه متفاوت از پیش‌نویس موجود است. کدام نسخه را ادامه می‌دهید؟</p>
        <Button onPress={() => draft.resolve("local")}>
          ادامه نسخه این دستگاه
        </Button>
        <Button onPress={() => draft.resolve("server")}>ادامه نسخه حساب</Button>
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      {props.stage.exerciseKind === "vocabulary-match" ? (
        <Matching {...props} initial={draft.initial} save={draft.save} />
      ) : props.stage.exerciseKind === "grammar-order" ? (
        <Grammar {...props} initial={draft.initial} save={draft.save} />
      ) : (
        <p>
          محتوای معتبر این تمرین هنوز آماده نیست؛ امتیاز شبیه‌سازی‌شده ثبت
          نمی‌شود.
        </p>
      )}
      {draft.status && (
        <p role="status" className="text-xs text-muted">
          {draft.status}
        </p>
      )}
    </div>
  );
}

function Submission({
  body,
  onResult,
  reset,
  preview,
  subjectScope,
}: {
  body: FullAttemptInput | null;
  onResult?: Props["onResult"];
  reset: () => void;
  preview: boolean;
  subjectScope?: string;
}) {
  const api = scopedApi(subjectScope);
  const key = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<AttemptReceipt | null>(null);
  return (
    <div className="flex flex-col gap-2">
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
      <Button
        variant="secondary"
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
  const restored = useRef<unknown>(Symbol("not-restored"));
  useEffect(() => {
    if (restored.current === initial) return;
    restored.current = initial;
    const parsed = matchingDraft.safeParse(initial);
    if (parsed.success) fsm.restoreDeferred(parsed.data.selections);
    setHydrated(true);
  }, [initial, fsm.restoreDeferred]);
  const selections = JSON.stringify(fsm.deferredAnswers);
  useEffect(() => {
    if (hydrated && fsm.deferredAnswers.length)
      save({ selections: fsm.deferredAnswers });
  }, [selections, hydrated, save]);
  const question = stage.questions.find(
    (question) => question.id === fsm.selectedSourceId,
  );
  const complete = fsm.deferredAnswers.length === pairs.length;
  return (
    <div className="flex flex-col gap-3">
      <p>
        هر واژه را انتخاب کنید، سپس معادل آن را بزنید. درستی پاسخ‌ها پس از ثبت
        تلاش بررسی می‌شود.
      </p>
      <div className="flex flex-wrap gap-2" dir="ltr">
        {fsm.sourceItems.map((item) => (
          <Button
            key={item.id}
            isDisabled={fsm.matchedIds.has(item.pairId) || fsm.isLocked}
            variant={fsm.selectedSourceId === item.id ? "primary" : "secondary"}
            onPress={() => {
              onInteract?.();
              fsm.selectItem("source", item.id);
            }}
          >
            {item.text}
          </Button>
        ))}
      </div>
      {question && (
        <QuestionRenderer
          question={{
            ...question,
            options: question.options.filter(
              (option) =>
                !fsm.deferredAnswers.some(
                  (answer) => answer.targetId === option.id,
                ),
            ),
          }}
          kind="vocabulary-match"
          response={null}
          disabled={fsm.isLocked}
          onResponse={(response) => {
            if ("choiceId" in response)
              fsm.selectItem("target", response.choiceId);
          }}
        />
      )}
      <p>
        {fsm.deferredAnswers.length} از {pairs.length} پاسخ ثبت موقت شد؛ هنوز
        نمره‌دهی نشده است.
      </p>
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
        onResult={onResult}
        reset={() => {
          fsm.reset();
          save({ selections: [] });
        }}
      />
    </div>
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
}: Props & { initial: unknown; save: (input: unknown) => void }) {
  const signature = JSON.stringify(stage.questions);
  const sentences = useMemo(
    () =>
      stage.questions.map((question) => ({
        id: question.id,
        targetSentence: "",
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
  const restored = useRef<unknown>(Symbol("not-restored"));
  useEffect(() => {
    if (restored.current === initial) return;
    restored.current = initial;
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
  const question = stage.questions[fsm.currentSentenceIndex];
  return (
    <div className="flex flex-col gap-3">
      <p>
        جمله {fsm.currentSentenceIndex + 1} از {sentences.length}؛ پاسخ‌ها پس از
        تلاش کامل بررسی می‌شوند.
      </p>
      {!complete && (
        <QuestionRenderer
          question={question}
          kind="grammar-order"
          response={{ tokenIds: snapshot.selectedTokenIds }}
          disabled={fsm.isLocked}
          onResponse={(response) => {
            if (!("tokenIds" in response)) return;
            onInteract?.();
            if (response.tokenIds.length > fsm.selectedTokens.length) {
              const id = response.tokenIds.find(
                (id) => !fsm.selectedTokens.some((token) => token.id === id),
              );
              const token = fsm.allBankTokens.find((token) => token.id === id);
              if (token) fsm.selectBankToken(token);
            } else {
              const token = fsm.selectedTokens.find(
                (token) => !response.tokenIds.includes(token.id),
              );
              if (token) fsm.deselectSentenceToken(token);
            }
          }}
        />
      )}
      {!complete && (
        <Button
          variant="secondary"
          isDisabled={
            fsm.isLocked ||
            fsm.selectedTokens.length !== question.options.length
          }
          onPress={fsm.checkSentence}
        >
          ثبت موقت این پاسخ
        </Button>
      )}
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
                  Object.entries(fsm.deferredAnswers).map(([id, tokenIds]) => [
                    id,
                    { tokenIds },
                  ]),
                ),
              )
            : null
        }
        onResult={onResult}
        reset={() => {
          fsm.resetAll();
          save({ answers: {}, currentIndex: 0, selectedTokenIds: [] });
        }}
      />
    </div>
  );
}
