"use client";

import { useEffect, useRef, useState } from "react";
import { TextField, Label, InputGroup } from "@heroui/react";
import { loadGuestDraft, saveGuestDraft } from "@/lib/client/guest-store";

type Props = {
  scope: string;
  lessonId: string;
  revisionId: string;
  stageId: string;
};
export function GuestDraftField(props: Props) {
  return (
    <DraftField
      key={JSON.stringify([props.scope, props.stageId, props.revisionId])}
      {...props}
    />
  );
}
function DraftField({ scope, lessonId, revisionId, stageId }: Props) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("در حال بازیابی…");
  const [ready, setReady] = useState(false);
  const version = useRef(0);
  const tail = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let cancelled = false;
    void loadGuestDraft(scope, stageId, revisionId)
      .then((draft) => {
        if (cancelled) return;
        if (draft) {
          setValue(typeof draft.input === "string" ? draft.input : "");
          version.current = draft.version;
        }
        setStatus("پیش‌نویس محلی؛ بدون امتیاز");
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("ذخیره محلی در دسترس نیست؛ این ورودی پایدار نیست");
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scope, stageId, revisionId]);
  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <TextField
        isDisabled={!ready}
        value={value}
        onChange={(input) => {
          setValue(input);
          setStatus("در حال ذخیره…");
          const current = ++version.current;
          tail.current = tail.current
            .catch(() => {})
            .then(async () => {
              await saveGuestDraft({
                scope,
                lessonId,
                revisionId,
                stageId,
                input,
                version: current,
              });
            })
            .then(() => {
              if (version.current === current)
                setStatus("پیش‌نویس محلی ذخیره شد؛ بدون امتیاز");
            })
            .catch(() => {
              if (version.current === current)
                setStatus(
                  "ذخیره انجام نشد؛ ورودی فعلی را نگه دارید و دوباره تلاش کنید",
                );
            });
        }}
      >
        <Label>پیش‌نویس پاسخ</Label>
        <InputGroup>
          <InputGroup.Input />
        </InputGroup>
      </TextField>
      <p role="status">{status}</p>
    </div>
  );
}
