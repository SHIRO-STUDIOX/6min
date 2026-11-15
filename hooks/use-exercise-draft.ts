"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { scopedApi } from "@/lib/client/api";
import { loadGuestDraft, saveGuestDraft } from "@/lib/client/guest-store";
import type { Learner } from "@/lib/contracts/experience";

export function useExerciseDraft(
  model: Learner | null,
  lessonId: string,
  revisionId: string,
  stageId: string,
) {
  const [loaded, setLoaded] = useState(!model);
  const [initial, setInitial] = useState<unknown>(null);
  const [conflict, setConflict] = useState<{
    local: unknown;
    server: unknown;
  } | null>(null);
  const [status, setStatus] = useState("");
  const version = useRef(0);
  const lastInput = useRef<unknown>(null);
  const lastSignature = useRef<string | null>(null);
  const tail = useRef<Promise<void>>(Promise.resolve());
  const scope = model?.scope ?? "sandbox";
  const account = model?.kind === "user";
  const api = scopedApi(scope);
  useEffect(() => {
    if (!model) return;
    let cancelled = false;
    void (async () => {
      let local = null;
      try {
        local = await loadGuestDraft(scope, stageId, revisionId);
      } catch {
        if (!cancelled) setStatus("ذخیره محلی در دسترس نیست.");
      }
      let server: { input: unknown; version: number } | null = null;
      if (account) {
        try {
          server = await api(
            `/drafts?lessonId=${encodeURIComponent(lessonId)}&revisionId=${encodeURIComponent(revisionId)}&stageId=${encodeURIComponent(stageId)}`,
          );
        } catch {
          if (!cancelled)
            setStatus("نسخه سرور در دسترس نیست؛ پیش‌نویس محلی حفظ می‌شود.");
        }
      }
      if (cancelled) return;
      version.current = Math.max(local?.version ?? 0, server?.version ?? 0);
      setInitial(local?.input ?? server?.input ?? null);
      if (
        local &&
        server &&
        JSON.stringify(local.input) !== JSON.stringify(server.input)
      )
        setConflict({ local: local.input, server: server.input });
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, account, lessonId, revisionId, stageId, Boolean(model)]);
  const save = useCallback(
    (input: unknown) => {
      if (!model) return;
      const signature = JSON.stringify(input);
      if (signature === lastSignature.current) return;
      lastSignature.current = signature;
      lastInput.current = input;
      const current = ++version.current;
      setStatus("در حال ذخیره پیش‌نویس…");
      tail.current = tail.current
        .catch(() => {})
        .then(async () => {
          await saveGuestDraft({
            scope,
            lessonId,
            revisionId,
            stageId,
            version: current,
            input,
          });
          if (account)
            await api("/drafts", "POST", {
              lessonId,
              revisionId,
              stageId,
              version: current,
              input,
            });
        })
        .then(() => {
          if (version.current === current)
            setStatus(
              account
                ? "پیش‌نویس در حساب ذخیره شد."
                : "پیش‌نویس محلی ذخیره شد؛ بدون امتیاز.",
            );
        })
        .catch(() => {
          if (version.current === current)
            setStatus(
              "ذخیره کامل نشد؛ ورودی محلی حفظ شده است. در صورت تعارض، پس از بازیابی نسخه را انتخاب کنید.",
            );
        });
    },
    [scope, account, lessonId, revisionId, stageId, Boolean(model)],
  );
  return {
    loaded,
    initial,
    conflict,
    status,
    save,
    retry: () => {
      lastSignature.current = null;
      save(lastInput.current);
    },
    resolve: (choice: "local" | "server") => {
      setInitial(conflict?.[choice] ?? null);
      setConflict(null);
    },
  };
}
