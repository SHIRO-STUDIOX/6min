"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { AppFrame } from "./app-frame";
import { useLearner } from "@/hooks/use-learner";
import { errorMessage } from "@/lib/client/messages";
export function MyPath() {
  const { model, error, reload } = useLearner();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const restored = useRef<string | null>(null);
  const jump = (id: string) =>
    list.current
      ?.querySelector(`[data-lesson="${id}"]`)
      ?.scrollIntoView({ block: "center", behavior: "instant" });
  useEffect(() => {
    if (!model || !list.current || restored.current === model.scope) return;
    restored.current = model.scope;
    let saved: null | string = null;
    try {
      saved = sessionStorage.getItem(`shish:path:${model.scope}`);
    } catch {}
    if (saved !== null && Number.isFinite(Number(saved)))
      list.current.scrollTop = Number(saved);
    else jump(model.progress.currentLesson);
  }, [model]);
  return (
    <AppFrame model={model}>
      <main className="flex flex-col min-h-0 flex-1 p-3 gap-3 items-center">
        <h1 className="text-xl font-bold">مسیر من</h1>
        {error && (
          <div role="alert">
            {errorMessage(error)}
            <Button onPress={() => void reload()}>تلاش دوباره</Button>
          </div>
        )}
        {!model ? (
          <p role="status">در حال بارگذاری…</p>
        ) : (
          <>
            <p>
              درس{" "}
              {
                model.progress.lessons.find(
                  (x) => x.id === model.progress.currentLesson,
                )?.number
              }{" "}
              از ۶۰
            </p>
            <Button onPress={() => jump(model.progress.currentLesson)}>
              برو به درس من
            </Button>
            <div className="flex min-h-0 w-full max-w-lg gap-2">
              <nav
                aria-label="پرش در مسیر"
                className="overflow-y-auto w-12 shrink-0"
                data-app-scroll
              >
                {[60, 50, 40, 30, 20, 10, 1].map((n) => (
                  <Button
                    key={n}
                    size="sm"
                    variant="tertiary"
                    aria-label={`پرش به درس ${n}`}
                    onPress={() => jump(`de-${String(n).padStart(2, "0")}`)}
                  >
                    {n}
                  </Button>
                ))}
              </nav>
              <div
                ref={list}
                data-testid="path-list"
                data-app-scroll
                className="flex-1 min-w-0 overflow-y-auto pb-24"
                onScroll={(e) => {
                  try {
                    sessionStorage.setItem(
                      `shish:path:${model.scope}`,
                      String(e.currentTarget.scrollTop),
                    );
                  } catch {}
                }}
              >
                {[...model.progress.lessons].reverse().map((item) => (
                  <article
                    key={item.id}
                    data-lesson={item.id}
                    className={`border-s border-dashed border-separator mx-2 py-2 ${item.id === model.progress.currentLesson ? "font-bold" : ""}`}
                  >
                    <Button
                      className="w-full h-auto min-h-12 whitespace-normal"
                      aria-current={
                        item.id === model.progress.currentLesson
                          ? "step"
                          : undefined
                      }
                      aria-expanded={
                        item.access.canStart ? undefined : expanded === item.id
                      }
                      onPress={() =>
                        item.access.canStart
                          ? router.push(`/classroom/${item.id}`)
                          : setExpanded(expanded === item.id ? null : item.id)
                      }
                      variant={
                        item.id === model.progress.currentLesson
                          ? "primary"
                          : "secondary"
                      }
                    >
                      درس {item.number} ·{" "}
                      {item.title.replace(" (DEMO_ONLY)", "")} ·{" "}
                      {item.access.canStart
                        ? `${Math.round(item.score)}٪`
                        : "قفل"}
                    </Button>
                    {model.progress.needsReview.includes(item.id) && (
                      <p className="text-xs px-3">نیازمند مرور</p>
                    )}
                    {expanded === item.id && (
                      <div
                        role="status"
                        className="p-3 text-sm flex flex-col gap-2"
                      >
                        {!item.published && (
                          <p>محتوای این درس هنوز منتشر نشده است.</p>
                        )}
                        {!item.access.pedagogical && (
                          <p>
                            پیش‌نیاز: تکمیل درس {item.number - 1} تا حد لازم.
                          </p>
                        )}
                        {!item.access.commercial && (
                          <>
                            <p>
                              این درس به حساب و خرید یک‌باره دوره نیاز دارد.
                            </p>
                            <Button
                              onPress={() =>
                                router.push(
                                  model.kind === "guest"
                                    ? `/auth?returnTo=${encodeURIComponent(`/checkout?lesson=${item.id}`)}`
                                    : `/checkout?lesson=${item.id}`,
                                )
                              }
                            >
                              حساب و دسترسی دوره
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </AppFrame>
  );
}
