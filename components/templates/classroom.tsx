"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@heroui/react";
import { AppFrame } from "./app-frame";
import { StageIndicator } from "@/components/molecules/StageIndicator";
import { LessonVideo } from "@/components/organisms/lesson-video";
import {
  LessonExercise,
  type AttemptReceipt,
} from "@/components/organisms/lesson-exercise";
import { api } from "@/lib/client/api";
import { loadLearner } from "@/lib/client/learner";
import { errorMessage } from "@/lib/client/messages";
import type { Learner, LessonDTO } from "@/lib/contracts/experience";

export function Classroom({
  lessonId,
  initialStageId,
}: {
  lessonId: string;
  initialStageId?: string;
}) {
  const router = useRouter();
  const [model, setModel] = useState<Learner | null>(null);
  const [lesson, setLesson] = useState<LessonDTO | null>(null);
  const [index, setIndex] = useState(0);
  const [focus, setFocus] = useState(false);
  const [error, setError] = useState("");
  const [unlock, setUnlock] = useState<string | null>(null);
  const [drag, setDrag] = useState(0);
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null);
  const activeIndex = useRef(0);
  activeIndex.current = index;
  const load = useCallback(
    async (initial = false) => {
      try {
        const learner = await loadLearner();
        setModel(learner);
        const content = await api<LessonDTO>(
          `/lessons/${encodeURIComponent(lessonId)}`,
        );
        setLesson(content);
        setError("");
        if (!initial)
          setIndex((current) =>
            Math.max(0, Math.min(content.stages.length - 1, current)),
          );
        if (initial) {
          const requestedStage =
            new URLSearchParams(window.location.search).get("stage") ??
            initialStageId;
          const desired = requestedStage
            ? content.stages.findIndex((stage) => stage.id === requestedStage)
            : -1;
          const actionable = content.stages.reduce(
            (last, stage, index) => (stage.activityLocked ? last : index),
            0,
          );
          setIndex(desired >= 0 ? desired : actionable);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "REQUEST_FAILED");
      }
    },
    [lessonId, initialStageId],
  );
  useEffect(() => {
    void load(true);
  }, [lessonId]);
  const stage = lesson?.stages[index];
  const context = useCallback(
    (kind: "selection" | "interaction", selectedIndex?: number) => {
      if (!lesson) return;
      const selected = lesson.stages[selectedIndex ?? activeIndex.current];
      if (!selected) return;
      void api("/context", "POST", {
        lessonId,
        revisionId: lesson.currentRevisionId,
        stageId: selected.id,
        kind,
      }).catch(() => {});
    },
    [lesson, lessonId],
  );
  const select = (next: number) => {
    if (!lesson) return;
    const clamped = Math.max(0, Math.min(lesson.stages.length - 1, next));
    setIndex(clamped);
    context("selection", clamped);
    window.history.replaceState(
      window.history.state,
      "",
      `/classroom/${encodeURIComponent(lessonId)}?stage=${encodeURIComponent(lesson.stages[clamped].id)}&restore=1`,
    );
  };
  const result = (receipt: AttemptReceipt) => {
    if (receipt.unlockEvent) setUnlock(receipt.unlockEvent.lessonId);
    void load();
  };
  const statuses =
    lesson?.stages.map((stage, position) => {
      if (stage.kind === "video")
        return lesson.progress.videoCredited
          ? ("success" as const)
          : ("active" as const);
      const state = model?.progress.exercises.find(
        (exercise) => exercise.stageId === stage.id,
      );
      return state?.bestFullScore != null
        ? state.earnedFraction === 1
          ? ("success" as const)
          : ("warning" as const)
        : stage.activityLocked
          ? ("upcoming" as const)
          : ("active" as const);
    }) ?? [];
  return (
    <AppFrame
      model={model}
      focus={focus}
      lessonId={lessonId}
      stageId={stage?.id}
    >
      <main
        className="flex flex-col items-center gap-4 p-3 sm:p-6"
        aria-label="کلاس درس"
      >
        <h1 className="text-xl font-bold">
          {lesson
            ? `درس ${lesson.sequenceNumber}: ${lesson.title.replace(" (DEMO_ONLY)", "")}`
            : "کلاس شیش"}
        </h1>
        {lesson?.demoOnly && (
          <p className="text-sm text-muted">
            نمونه آزمایشی؛ محتوای نهایی دوره نیست.
          </p>
        )}
        {lesson && (
          <p role="status">
            امتیاز کسب‌شده درس: {Math.round(lesson.progress.lessonScore)}٪
          </p>
        )}
        {unlock && (
          <div role="status" className="flex items-center gap-2">
            <span>درس بعدی باز شد.</span>
            <Button
              onPress={() =>
                router.push(`/classroom/${encodeURIComponent(unlock)}`)
              }
            >
              درس بعدی
            </Button>
          </div>
        )}
        {error && (
          <Card className="p-4 gap-3">
            <p role="alert">{errorMessage(error)}</p>
            <Button onPress={() => void load(!lesson)}>تلاش دوباره</Button>
            {["AUTHENTICATION_REQUIRED", "IDENTITY_REQUIRED"].includes(
              error,
            ) && (
              <Button
                onPress={() =>
                  router.push(
                    `/auth?returnTo=${encodeURIComponent(`/classroom/${lessonId}${stage ? `?stage=${stage.id}` : ""}`)}`,
                  )
                }
              >
                ورود و ادامه کلاس
              </Button>
            )}
            <Button variant="secondary" onPress={() => router.push("/path")}>
              دیدن مسیر و وضعیت دسترسی
            </Button>
          </Card>
        )}
        {!lesson && !error && <p role="status">در حال بارگذاری درس…</p>}
        {lesson && (
          <>
            <Button
              variant="secondary"
              aria-pressed={focus}
              onPress={() => setFocus((value) => !value)}
            >
              حالت تمرکز
            </Button>
            <div
              className="classroom-window relative w-full"
              style={
                {
                  "--card-width": "min(500px, calc(100vw - 40px))",
                  maxWidth: "min(656px, calc(100vw - 24px))",
                } as CSSProperties
              }
            >
              <div
                className="flex justify-center mb-3"
                style={{ width: "var(--card-width)" }}
              >
                <StageIndicator
                  totalSteps={lesson.stages.length}
                  currentIndex={index}
                  statuses={statuses}
                  onStepClick={select}
                />
              </div>
              <div
                className="relative overflow-hidden"
                data-testid="action-center"
                style={{ touchAction: "pan-y" }}
                onPointerDown={(event) => {
                  const target = event.target as HTMLElement;
                  if (
                    target.closest(
                      "button,input,textarea,a,video,select,[data-player]",
                    )
                  )
                    return;
                  gesture.current = {
                    x: event.clientX,
                    y: event.clientY,
                    id: event.pointerId,
                  };
                }}
                onPointerMove={(event) => {
                  const start = gesture.current;
                  if (!start || event.pointerId !== start.id) return;
                  const dx = event.clientX - start.x;
                  const dy = event.clientY - start.y;
                  if (Math.abs(dx) > Math.abs(dy) + 10) {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDrag(Math.max(-100, Math.min(100, dx)));
                  }
                }}
                onPointerUp={(event) => {
                  const start = gesture.current;
                  gesture.current = null;
                  setDrag(0);
                  if (!start) return;
                  const dx = event.clientX - start.x;
                  const dy = event.clientY - start.y;
                  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy))
                    select(index + (dx < 0 ? 1 : -1));
                }}
                onPointerCancel={() => {
                  gesture.current = null;
                  setDrag(0);
                }}
              >
                <div
                  dir="ltr"
                  className={`flex gap-[6px] items-stretch ${drag ? "" : "motion-safe:transition-transform motion-safe:duration-200"}`}
                  style={{
                    transform: `translateX(calc(-${index} * (var(--card-width) + 6px) + ${drag}px))`,
                  }}
                >
                  {lesson.stages.map((item, position) => (
                    <Card
                      key={item.id}
                      dir="rtl"
                      inert={position !== index ? true : undefined}
                      aria-hidden={position !== index || undefined}
                      data-testid={`stage-shell-${position}`}
                      className="shrink-0 bg-surface border border-separator rounded-3xl p-4 flex flex-col gap-3"
                      style={{
                        width: "var(--card-width)",
                        height: "max(500px, min(560px, 75dvh))",
                        pointerEvents: position === index ? "auto" : "none",
                      }}
                    >
                      <Card.Header>
                        <Card.Title>
                          {item.kind === "video"
                            ? "ویدیوی درس"
                            : item.exerciseKind === "vocabulary-match"
                              ? "واژگان"
                              : "ساخت جمله"}
                        </Card.Title>
                        <Card.Description>
                          مرحله {position + 1} از {lesson.stages.length}
                        </Card.Description>
                      </Card.Header>
                      <Card.Content
                        className="min-h-0 overflow-y-auto flex-1"
                        data-app-scroll
                      >
                        {position === index &&
                          (item.activityLocked ? (
                            <div
                              role="status"
                              className="h-full flex flex-col items-center justify-center gap-3 bg-surface/80 backdrop-blur-md"
                            >
                              <p>
                                فعالیت این مرحله قفل است. ابتدا پیش‌نیاز قبلی را
                                کامل کنید.
                              </p>
                              <Button
                                variant="secondary"
                                onPress={() =>
                                  select(Math.max(0, position - 1))
                                }
                              >
                                رفتن به پیش‌نیاز
                              </Button>
                            </div>
                          ) : item.kind === "video" ? (
                            <div data-player>
                              <LessonVideo
                                key={`${model?.scope}:${item.id}`}
                                lessonId={lesson.id}
                                revisionId={lesson.currentRevisionId}
                                assetId={lesson.video.assetId}
                                src={lesson.video.url}
                                captionsUrl={lesson.video.captionsUrl}
                                durationMs={lesson.video.durationMs}
                                demoOnly={lesson.demoOnly}
                                persist
                                onInteract={() => context("interaction")}
                                onCredit={() => void load()}
                              />
                            </div>
                          ) : (
                            <LessonExercise
                              key={`${model?.scope}:${item.id}`}
                              model={model}
                              lessonId={lesson.id}
                              revisionId={lesson.currentRevisionId}
                              stage={item}
                              onResult={result}
                              onInteract={() => context("interaction")}
                            />
                          ))}
                      </Card.Content>
                    </Card>
                  ))}
                </div>
                <div
                  aria-hidden="true"
                  className="absolute top-0 bottom-0 right-0 w-12 pointer-events-none"
                  style={{
                    backdropFilter: "blur(6px)",
                    maskImage: "linear-gradient(to right, transparent, black)",
                    background:
                      "linear-gradient(to right, transparent, var(--background))",
                  }}
                />
              </div>
              <div className="hidden md:flex justify-end gap-2 mt-4" dir="ltr">
                {index > 0 && (
                  <Button variant="secondary" onPress={() => select(index - 1)}>
                    مرحله قبلی
                  </Button>
                )}
                {index < lesson.stages.length - 1 && (
                  <Button variant="secondary" onPress={() => select(index + 1)}>
                    مرحله بعدی
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </AppFrame>
  );
}
