"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Avatar, TextField, Label, Input } from "@heroui/react";
import { AppFrame } from "./app-frame";
import { useLearner } from "@/hooks/use-learner";
import { scopedApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/messages";
export function Profile() {
  const { model, error, reload } = useLearner();
  const api = scopedApi(model?.scope);
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [failure, setFailure] = useState("");
  useEffect(() => {
    if (model) setName(model.user?.displayName ?? "");
  }, [model]);
  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setStatus("");
    setFailure("");
    try {
      await action();
      await reload();
      setStatus(message);
    } catch (e) {
      setFailure(
        errorMessage(e instanceof Error ? e.message : "REQUEST_FAILED"),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AppFrame model={model}>
      <main className="mx-auto w-full max-w-lg p-5 flex flex-col gap-4">
        <h1 className="font-bold text-xl">پروفایل</h1>
        {error && (
          <p role="alert">
            {errorMessage(error)}
            <Button onPress={() => void reload()}>تلاش دوباره</Button>
          </p>
        )}
        {!model ? (
          <p role="status">در حال بارگذاری…</p>
        ) : (
          <>
            <p>
              درس فعلی:{" "}
              {
                model.progress.lessons.find(
                  (x) => x.id === model.progress.currentLesson,
                )?.number
              }{" "}
              از ۶۰
            </p>
            {model.user ? (
              <>
                <Avatar>
                  <Avatar.Image
                    src={
                      model.user.avatarKey
                        ? `/api/v1/me/avatar/${model.user.avatarKey}`
                        : undefined
                    }
                    alt="تصویر پروفایل"
                  />
                  <Avatar.Fallback>
                    {model.user.displayName?.slice(0, 1) || "ش"}
                  </Avatar.Fallback>
                </Avatar>
                <TextField value={name} onChange={setName} isDisabled={busy}>
                  <Label>نام نمایشی</Label>
                  <Input maxLength={80} />
                </TextField>
                <Button
                  isDisabled={busy || !name.trim()}
                  onPress={() =>
                    void run(
                      () => api("/me", "PATCH", { displayName: name }),
                      "نام ذخیره شد.",
                    )
                  }
                >
                  ذخیره نام
                </Button>
                <label className="flex flex-col gap-2">
                  تصویر جدید (PNG، JPEG یا WebP، حداکثر ۲ مگابایت)
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      void run(async () => {
                        const response = await fetch("/api/v1/me/avatar", {
                          method: "POST",
                          body: file,
                          credentials: "same-origin",
                          headers: {
                            "Content-Type": file.type,
                            "X-Expected-Subject": model.scope,
                          },
                        });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.error.code);
                      }, "تصویر ذخیره شد.");
                    }}
                  />
                </label>
                <p className="text-xs text-muted">
                  ذخیره‌سازی خصوصی محلی مخصوص توسعه است.
                </p>
                <Button
                  variant="secondary"
                  isDisabled={busy || !model.user.avatarKey}
                  onPress={() =>
                    void run(
                      () => api("/me/avatar", "DELETE"),
                      "تصویر پروفایل برداشته شد.",
                    )
                  }
                >
                  برداشتن تصویر
                </Button>
                <TextField
                  value={password}
                  onChange={setPassword}
                  isDisabled={busy}
                >
                  <Label>رمز عبور جدید</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                  />
                </TextField>
                <Button
                  isDisabled={busy || password.length < 12}
                  onPress={() =>
                    void run(async () => {
                      await api("/auth/password/set", "POST", { password });
                      setPassword("");
                    }, "رمز ثبت شد.")
                  }
                >
                  ثبت رمز عبور
                </Button>
                <Button
                  variant="danger-soft"
                  isDisabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await api("/auth/logout", "POST");
                      router.replace("/");
                    }, "از حساب خارج شدید.")
                  }
                >
                  خروج از حساب
                </Button>
              </>
            ) : (
              <>
                <p>مهمان؛ سابقه این مرورگر محفوظ است.</p>
                <Button onPress={() => router.push("/auth?returnTo=/profile")}>
                  ایجاد حساب یا ورود
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              onPress={() => router.push("/classroom")}
            >
              ادامه یادگیری
            </Button>
            <Button variant="tertiary" onPress={() => router.push("/path")}>
              مسیر من
            </Button>
            <Button
              variant="tertiary"
              onPress={() => router.push("/mistakes?returnTo=/profile")}
            >
              اشتباهات من
            </Button>
          </>
        )}
        {status && <p role="status">{status}</p>}
        {failure && <p role="alert">{failure}</p>}
      </main>
    </AppFrame>
  );
}
