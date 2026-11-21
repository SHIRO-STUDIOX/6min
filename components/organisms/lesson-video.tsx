"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@heroui/react";
import { BaseCard } from "@/components/molecules/base-card";
import { scopedApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/messages";
import {
  playedInterval,
  unionRanges,
  watchedMs,
  type PlaybackPoint,
  type WatchRange,
} from "@/lib/domain/learning/watch-ranges";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });
type Session = {
  watchSessionId: string;
  positionMs: number;
  coverage: number;
  credited: boolean;
};
type Update = {
  sequence: number;
  playedIntervals: { fromMs: number; toMs: number }[];
  lastPositionMs: number;
};
export type LessonVideoProps = {
  lessonId: string;
  revisionId: string;
  assetId: string;
  src: string;
  captionsUrl: string;
  durationMs: number;
  persist?: boolean;
  subjectScope?: string;
  onCredit?: () => void;
  onInteract?: () => void;
  demoOnly?: boolean;
  onNext?: () => void;
  cardLabel?: string;
  className?: string;
};

export function LessonVideo(props: LessonVideoProps) {
  return (
    <LessonVideoRuntime
      key={`${props.lessonId}:${props.revisionId}`}
      {...props}
    />
  );
}

function LessonVideoRuntime({
  lessonId,
  revisionId,
  assetId,
  src,
  captionsUrl,
  durationMs,
  persist = false,
  onCredit,
  onInteract,
  demoOnly = true,
  subjectScope,
  onNext,
  cardLabel = "کارت ۱: ویدیوی آموزشی",
  className,
}: LessonVideoProps) {
  const api = scopedApi(subjectScope);
  const media = useRef<HTMLVideoElement | null>(null);
  const previous = useRef<PlaybackPoint | null>(null);
  const active = useRef(false);
  const pending = useRef<WatchRange[]>([]);
  const localRanges = useRef<WatchRange[]>([]);
  const queued = useRef<Update | null>(null);
  const sending = useRef(false);
  const sequence = useRef(0);
  const session = useRef<Session | null>(null);
  const lastFlush = useRef(0);
  const notified = useRef(false);
  const notify = useRef(onCredit);
  notify.current = onCredit;
  const [coverage, setCoverage] = useState(0);
  const [credited, setCredited] = useState(false);
  const [ready, setReady] = useState(!persist);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!persist) return;
    let cancelled = false;
    void (async () => {
      try {
        await api("/guest/bootstrap", "POST");
        const created = await api<Session>("/video/watch-sessions", "POST", {
          lessonId,
          revisionId,
          videoAssetId: assetId,
        });
        if (cancelled) return;
        session.current = created;
        notified.current = created.credited;
        setCoverage(created.coverage);
        setCredited(created.credited);
        setReady(true);
        setError("");
        if (media.current && media.current.readyState >= 1)
          media.current.currentTime = created.positionMs / 1000;
      } catch (error) {
        if (!cancelled)
          setError(
            error instanceof Error ? error.message : "VIDEO_UNAVAILABLE",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, revisionId, assetId, persist, attempt]);

  const sync = useCallback(
    async (force = false): Promise<void> => {
      if (!persist || !session.current || sending.current) return;
      if (!queued.current && pending.current.length === 0 && !force) return;
      sending.current = true;
      if (!queued.current) {
        queued.current = {
          sequence: sequence.current + 1,
          playedIntervals: unionRanges(pending.current, durationMs).map(
            ([fromMs, toMs]) => ({ fromMs, toMs }),
          ),
          lastPositionMs: Math.min(
            durationMs,
            Math.max(0, Math.round((media.current?.currentTime ?? 0) * 1000)),
          ),
        };
        pending.current = [];
      }
      let succeeded = false;
      try {
        const result = await api<{
          coverage: number;
          credited: boolean;
          sequence: number;
        }>(
          `/video/watch-sessions/${session.current.watchSessionId}`,
          "PATCH",
          queued.current,
        );
        succeeded = true;
        sequence.current = result.sequence;
        queued.current = null;
        setCoverage(result.coverage);
        setCredited(result.credited);
        setError("");
        if (result.credited && !notified.current) {
          notified.current = true;
          notify.current?.();
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "SYNC_FAILED");
      } finally {
        sending.current = false;
        if (succeeded && pending.current.length > 0)
          queueMicrotask(() => {
            void sync();
          });
      }
    },
    [persist, durationMs],
  );

  const sample = useCallback(() => {
    const element = media.current;
    if (!element || !ready) return;
    const point = {
      positionMs: Math.min(
        durationMs,
        Math.max(0, Math.round(element.currentTime * 1000)),
      ),
      clockMs: performance.now(),
      rate: element.playbackRate,
      active: active.current,
    };
    const interval = playedInterval(previous.current, point);
    previous.current = point;
    if (interval) {
      pending.current.push(interval);
      if (!persist) {
        localRanges.current = unionRanges(
          [...localRanges.current, interval],
          durationMs,
        );
        setCoverage(watchedMs(localRanges.current) / durationMs);
      }
    }
    if (performance.now() - lastFlush.current > 1000) {
      lastFlush.current = performance.now();
      void sync();
    }
  }, [durationMs, ready, persist, sync]);

  return (
    <BaseCard
      cardLabel={cardLabel}
      title="ویدیوی درس"
      description={
        demoOnly
          ? "کلیپ تست بی‌صدا؛ محتوای نهایی دوره نیست."
          : "پیشرفت مشاهده از پخش واقعی ثبت می‌شود."
      }
      progressPercentage={coverage * 100}
      progressLabel="میزان مشاهده:"
      progressBarAriaLabel="میزان پیشرفت مشاهده ویدیو"
      isCompleted={credited}
      completedStatusText="مشاهده تأیید شد"
      onNext={onNext}
      className={className}
      scrollContent
      footerStart={
        <div className="flex min-w-0 flex-col items-start gap-1 text-[11px]">
          <p role="status" data-testid="video-status">
            {!persist
              ? "پیش‌نمایش محلی؛ بدون ثبت امتیاز"
              : credited
                ? "مشاهده تأیید شد"
                : ready
                  ? "ثبت مشاهده فعال است"
                  : "در حال اتصال…"}{" "}
            — {Math.floor(coverage * 100)}٪
          </p>
          {error && (
            <>
              <p role="alert">
                {errorMessage(error)} — پیشرفت جدید هنوز تأیید نشده است.
              </p>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => {
                  if (session.current) void sync();
                  else setAttempt((value) => value + 1);
                }}
              >
                تلاش دوباره
              </Button>
            </>
          )}
        </div>
      }
    >
      <div
        data-player
        className="relative w-full aspect-video rounded-2xl overflow-hidden border border-separator bg-black/90 shadow-md isolate"
      >
        <ReactPlayer
          ref={media}
          src={src}
          controls
          playsInline
          width="100%"
          height="auto"
          muted
          onLoadedMetadata={() => {
            if (media.current && session.current)
              media.current.currentTime = session.current.positionMs / 1000;
          }}
          onPlaying={() => {
            if (!ready) {
              media.current?.pause();
              return;
            }
            if (!active.current) onInteract?.();
            active.current = true;
            previous.current = null;
            sample();
          }}
          onTimeUpdate={sample}
          onPause={() => {
            sample();
            active.current = false;
            previous.current = null;
            void sync();
          }}
          onWaiting={() => {
            sample();
            active.current = false;
            previous.current = null;
            void sync();
          }}
          onSeeking={() => {
            active.current = false;
            previous.current = null;
          }}
          onSeeked={() => {
            active.current = Boolean(media.current && !media.current.paused);
            previous.current = null;
            sample();
            void sync(true);
          }}
          onEnded={() => {
            sample();
            active.current = false;
            previous.current = null;
            void sync();
          }}
          onError={() => {
            active.current = false;
            previous.current = null;
            setError("MEDIA_UNAVAILABLE");
          }}
        >
          <track
            kind="captions"
            src={captionsUrl}
            srcLang="de"
            label="Deutsch"
            default
          />
        </ReactPlayer>
      </div>
    </BaseCard>
  );
}
