"use client";
import { safeReturn as validatedReturn } from "@/lib/domain/navigation";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, TextField, Label, InputGroup } from "@heroui/react";
import { PhoneLogin } from "./phone-login";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/messages";
import {
  acknowledgeGuestImport,
  guestBatch,
  pendingGuestBatch,
} from "@/lib/client/guest-store";

type Preview = {
  guestId: string | null;
  attemptCount: number;
  watchCount: number;
  canAutoImport: boolean;
  requiresConsent: boolean;
};
const safeReturn = (path: string) => validatedReturn(path, "/");

export function AuthPanel({
  preview = false,
  returnTo = "/",
}: {
  preview?: boolean;
  returnTo?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"otp" | "password" | "recover">("otp");
  const [provider, setProvider] = useState(preview ? "preview" : "loading");
  const [challenge, setChallenge] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [consent, setConsent] = useState<Preview | null>(null);
  const grant = useRef<string | null>(null);
  useEffect(() => {
    if (!preview)
      void api<{ mode: string }>("/auth/mode")
        .then((value) => setProvider(value.mode))
        .catch(() => setProvider("unavailable"));
  }, [preview]);
  const work = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : "REQUEST_FAILED");
    } finally {
      setBusy(false);
    }
  };
  const leave = () => router.replace(safeReturn(returnTo));
  const transfer = async (state: Preview, affirmative: boolean) => {
    if (!state.guestId) {
      leave();
      return;
    }
    const batch = await pendingGuestBatch(state.guestId);
    const result = await api<{ acknowledged: boolean }>(
      "/guest/import",
      "POST",
      {
        guestBatchId: batch.batchId,
        mergeConsent: affirmative,
        drafts: batch.drafts,
      },
    );
    await acknowledgeGuestImport(
      state.guestId,
      batch.batchId,
      result.acknowledged,
    );
    leave();
  };
  const afterLogin = async () => {
    setAuthenticated(true);
    const state = await api<Preview>("/guest/import");
    if (!state.guestId) {
      leave();
      return;
    }
    const batch = await guestBatch(state.guestId);
    if (
      state.attemptCount === 0 &&
      state.watchCount === 0 &&
      (batch.drafts.length === 0 || batch.imported)
    ) {
      leave();
      return;
    }
    if (state.canAutoImport) await transfer(state, false);
    else setConsent(state);
  };

  return (
    <Card className="w-full max-w-md p-5 gap-4">
      <Card.Header>
        <Card.Title>ورود به شیش</Card.Title>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        {provider === "mock" && (
          <p role="status">
            فقط محیط توسعه: پیامک واقعی ارسال نمی‌شود. کد نمایشی: ۰۰۰۰۰۰
          </p>
        )}
        {preview && <p>پیش‌نمایش Sandbox؛ هیچ ورود یا پیامی انجام نمی‌شود.</p>}
        {consent ? (
          <div className="flex flex-col gap-3">
            <p>
              ادغام پیشرفت مهمان با حساب؟ {consent.attemptCount} تلاش ثبت‌شده؛
              سابقه حساب و داده مهمان حفظ می‌شوند.
            </p>
            <Button
              isDisabled={busy}
              onPress={() => void work(() => transfer(consent, true))}
            >
              بله، ادغام پیشرفت مهمان
            </Button>
            <Button variant="secondary" onPress={leave}>
              خیر، ادامه بدون ادغام
            </Button>
          </div>
        ) : authenticated ? (
          <div className="flex flex-col gap-3">
            <p>ورود انجام شد؛ انتقال داده مهمان هنوز تکمیل نشده است.</p>
            <Button isDisabled={busy} onPress={() => void work(afterLogin)}>
              تلاش دوباره برای انتقال
            </Button>
            <Button variant="secondary" isDisabled={busy} onPress={leave}>
              ادامه بدون انتقال فعلی
            </Button>
          </div>
        ) : resetting ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const password = String(
                new FormData(form).get("newPassword") ?? "",
              );
              form.reset();
              void work(async () => {
                const recovered = await api<{ authenticated: boolean }>(
                  "/auth/password/recover",
                  "POST",
                  {
                    recoveryGrant: grant.current,
                    newPassword: password,
                  },
                );
                grant.current = null;
                if (recovered.authenticated) await afterLogin();
                else {
                  setResetting(false);
                  setChallenge("");
                  setMode("otp");
                  setError("AUTHENTICATION_REQUIRED");
                }
              });
            }}
            className="flex flex-col gap-3"
          >
            <TextField
              name="newPassword"
              type="password"
              isRequired
              minLength={12}
            >
              <Label>رمز جدید (حداقل ۱۲ نویسه)</Label>
              <InputGroup>
                <InputGroup.Input autoComplete="new-password" />
              </InputGroup>
            </TextField>
            <Button type="submit" isDisabled={busy}>
              ثبت رمز جدید
            </Button>
          </form>
        ) : challenge ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (preview) return;
              void work(async () => {
                const result = await api<{ recoveryGrant: string | null }>(
                  "/auth/otp/verify",
                  "POST",
                  { challengeId: challenge, code },
                );
                setCode("");
                if (result.recoveryGrant) {
                  grant.current = result.recoveryGrant;
                  setResetting(true);
                } else await afterLogin();
              });
            }}
            className="flex flex-col gap-3"
          >
            <TextField value={code} onChange={setCode} isRequired>
              <Label>کد تأیید</Label>
              <InputGroup>
                <InputGroup.Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  maxLength={6}
                />
              </InputGroup>
            </TextField>
            <Button type="submit" isDisabled={busy}>
              تأیید کد
            </Button>
            <Button
              variant="secondary"
              onPress={() => {
                setChallenge("");
                setCode("");
              }}
            >
              بازگشت به شماره موبایل
            </Button>
          </form>
        ) : mode === "password" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              const phone = String(data.get("phone") ?? "");
              const password = String(data.get("password") ?? "");
              form.reset();
              if (preview) return;
              void work(async () => {
                await api("/auth/password/login", "POST", { phone, password });
                await afterLogin();
              });
            }}
            className="flex flex-col gap-3"
          >
            <TextField name="phone" isRequired>
              <Label>شماره موبایل</Label>
              <InputGroup>
                <InputGroup.Input autoComplete="tel" dir="ltr" />
              </InputGroup>
            </TextField>
            <TextField name="password" type="password" isRequired>
              <Label>رمز عبور</Label>
              <InputGroup>
                <InputGroup.Input autoComplete="current-password" />
              </InputGroup>
            </TextField>
            <Button type="submit" isDisabled={busy}>
              ورود با رمز
            </Button>
          </form>
        ) : (
          <PhoneLogin
            key={mode}
            title={mode === "recover" ? "بازیابی رمز" : "ورود با کد"}
            isLoading={busy}
            onSubmit={(phone) => {
              if (preview) return;
              void work(async () => {
                const result = await api<{ challengeId: string }>(
                  "/auth/otp/request",
                  "POST",
                  { phone, purpose: mode === "recover" ? "recover" : "login" },
                );
                setChallenge(result.challengeId);
              });
            }}
          />
        )}
        {!consent && !challenge && !resetting && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onPress={() => setMode("otp")}>
              ورود با کد
            </Button>
            <Button variant="secondary" onPress={() => setMode("password")}>
              ورود با رمز
            </Button>
            <Button variant="secondary" onPress={() => setMode("recover")}>
              فراموشی رمز
            </Button>
          </div>
        )}
        {error && <p role="alert">{errorMessage(error)}</p>}
      </Card.Content>
    </Card>
  );
}
