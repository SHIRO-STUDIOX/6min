"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { AppFrame } from "./app-frame";
import { useLearner } from "@/hooks/use-learner";
import { scopedApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/messages";
import { safeReturn } from "@/lib/domain/navigation";
import {
  QuestionRenderer,
  type RawResponse,
} from "@/components/molecules/question-renderer";
import type { PublicQuestion } from "@/lib/contracts/content";
import type { AttemptReceipt } from "@/components/organisms/lesson-exercise";
type Item = PublicQuestion & {
  questionId: string;
  stageId: string;
  lessonId: string;
  revisionId: string;
  exerciseKind: string;
  latestWrongAt: string;
};
type Page = { items: Item[]; nextCursor: string | null };
export function Mistakes({ returnTo }: { returnTo?: string }) {
  const { model, reload } = useLearner();
  const api = scopedApi(model?.scope);
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [history, setHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<Item | null>(null);
  const [response, setResponse] = useState<RawResponse | null>(null);
  const [receipt, setReceipt] = useState<AttemptReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  const key = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const back = safeReturn(returnTo);
  const fetchList = async (append = false) => {
    setLoading(true);
    try {
      const data = await api<Page>(
        `/mistakes?status=${history ? "corrected" : "needsReview"}${append && cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
      setItems((old) => (append ? [...old, ...data.items] : data.items));
      setCursor(data.nextCursor);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "REQUEST_FAILED");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (model) void fetchList();
  }, [model?.scope, history]);
  useEffect(() => {
    if (!model || loading || !scroller.current || restored) return;
    try {
      scroller.current.scrollTop = Number(
        sessionStorage.getItem(`shish:mistakes:${model.scope}`) ?? 0,
      );
    } catch {}
    setRestored(true);
  }, [model, loading, restored]);
  const start = async (item: Item) => {
    setBusy(true);
    try {
      const data = await api<{ items: Item[] }>(
        "/mistakes/review-sessions",
        "POST",
        { questionRefs: [{ id: item.questionId, revision: item.revision }] },
      );
      const question = data.items[0];
      setActive(question);
      setReceipt(null);
      key.current = null;
      let raw: RawResponse | null = null;
      try {
        const value = sessionStorage.getItem(
          `shish:review:${model!.scope}:${item.questionId}`,
        );
        if (value) raw = JSON.parse(value);
      } catch {}
      setResponse(raw);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "REQUEST_FAILED");
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    if (!active || !response) return;
    setBusy(true);
    key.current ??= crypto.randomUUID();
    try {
      const result = await api<AttemptReceipt>(
        "/attempts",
        "POST",
        {
          lessonId: active.lessonId,
          revisionId: active.revisionId,
          stageId: active.stageId,
          kind: "review",
          completed: true,
          answers: [
            {
              questionId: active.questionId,
              revision: active.revision,
              response,
            },
          ],
        },
        key.current,
      );
      setReceipt(result);
      setError("");
      try {
        sessionStorage.removeItem(
          `shish:review:${model!.scope}:${active.questionId}`,
        );
      } catch {}
      void reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "REQUEST_FAILED");
    } finally {
      setBusy(false);
    }
  };
  return (
    <AppFrame model={model}>
      <main className="max-w-xl mx-auto w-full p-4 flex flex-col gap-3 min-h-0 h-full">
        <h1 className="font-bold text-xl">اشتباهات من</h1>
        {error && (
          <p role="alert">
            {errorMessage(error)}
            <Button onPress={() => void fetchList()}>تلاش دوباره</Button>
          </p>
        )}
        {active ? (
          <>
            <QuestionRenderer
              question={{ ...active, id: active.questionId }}
              kind={active.exerciseKind}
              response={response}
              disabled={busy || !!receipt}
              onResponse={(value) => {
                setResponse(value);
                try {
                  sessionStorage.setItem(
                    `shish:review:${model!.scope}:${active.questionId}`,
                    JSON.stringify(value),
                  );
                } catch {}
              }}
            />
            {!receipt ? (
              <Button
                isDisabled={busy || !response}
                onPress={() => void submit()}
              >
                ثبت پاسخ مرور
              </Button>
            ) : (
              <div role="status">
                <p>
                  {receipt.exerciseScore === 1
                    ? "پاسخ درست ثبت شد."
                    : "هنوز نیازمند مرور است."}
                </p>
                <p>امتیاز کسب‌شده درس {Math.round(receipt.lessonScore)}٪</p>
                {receipt.unlockEvent && (
                  <p>درس بعدی باز شد؛ می‌توانید ادامه دهید.</p>
                )}
                <Button
                  onPress={() => {
                    setActive(null);
                    setReceipt(null);
                    void fetchList();
                  }}
                >
                  ادامه مرور
                </Button>
                <Button variant="secondary" onPress={() => router.push(back)}>
                  بازگشت به محل قبلی
                </Button>
              </div>
            )}
            <Button
              variant="tertiary"
              onPress={() =>
                router.push(
                  `/classroom/${active.lessonId}?stage=${active.stageId}&returnTo=${encodeURIComponent(`/mistakes?returnTo=${encodeURIComponent(back)}`)}`,
                )
              }
            >
              رفتن به تمرین اصلی
            </Button>
            <Button
              variant="tertiary"
              onPress={() => {
                setActive(null);
                void fetchList();
              }}
            >
              فهرست اشتباهات
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              onPress={() => {
                setHistory(!history);
                setRestored(false);
              }}
            >
              {history ? "نمایش نیازمند مرور" : "نمایش سابقه اصلاح‌شده"}
            </Button>
            {loading && <p role="status">در حال بارگذاری…</p>}
            {!loading && items.length === 0 && (
              <p role="status">
                {history
                  ? "هنوز اصلاحی ثبت نشده است."
                  : "اشتباه نیازمند مرور ندارید."}
              </p>
            )}
            <div
              ref={scroller}
              className="overflow-y-auto flex-1 pb-20"
              data-app-scroll
              onScroll={(event) => {
                if (model)
                  try {
                    sessionStorage.setItem(
                      `shish:mistakes:${model.scope}`,
                      String(event.currentTarget.scrollTop),
                    );
                  } catch {}
              }}
            >
              {items.map((item) => (
                <article
                  key={`${item.questionId}:${item.revision}`}
                  className="p-3 border-b border-separator flex flex-col gap-2"
                >
                  <p lang="de" dir="ltr">
                    {item.prompt}
                  </p>
                  <time>
                    {new Date(item.latestWrongAt).toLocaleString("fa-IR")}
                  </time>
                  {!history && (
                    <Button isDisabled={busy} onPress={() => void start(item)}>
                      مرور این سؤال
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onPress={() =>
                      router.push(
                        `/classroom/${item.lessonId}?stage=${item.stageId}&returnTo=${encodeURIComponent(`/mistakes?returnTo=${encodeURIComponent(back)}`)}`,
                      )
                    }
                  >
                    رفتن به تمرین اصلی
                  </Button>
                </article>
              ))}
              {cursor && (
                <Button
                  onPress={() => void fetchList(true)}
                  isDisabled={loading}
                >
                  موارد قدیمی‌تر
                </Button>
              )}
            </div>
            <Button variant="tertiary" onPress={() => router.push(back)}>
              بازگشت به محل قبلی
            </Button>
          </>
        )}
      </main>
    </AppFrame>
  );
}
