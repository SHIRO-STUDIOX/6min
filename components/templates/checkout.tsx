"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { AppFrame } from "./app-frame";
import { useLearner } from "@/hooks/use-learner";
import { scopedApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/messages";
type Product = {
  id: string;
  amountMinor: number;
  currency: string;
  testOnly: true;
};
type Purchase = {
  id: string;
  status: "pending" | "verified" | "failed" | "cancelled" | "expired";
  amountMinor: number;
  currency: string;
  testOnly: boolean;
  continuePath: string;
  intendedLesson: {
    id: string;
    access: { canStart: boolean; reason: string | null };
  } | null;
};
const statusLabels = {
  pending: "در انتظار تأیید سرور",
  verified: "تأییدشده",
  failed: "ناموفق",
  cancelled: "لغوشده",
  expired: "مهلت انتظار پایان یافته",
};
export function Checkout({ lessonId }: { lessonId?: string }) {
  const { model } = useLearner();
  const api = scopedApi(model?.scope);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const key = useRef<string | null>(null);
  useEffect(() => {
    void api<Product>("/checkout")
      .then(setProduct)
      .catch((e) => setError(e.message));
  }, []);
  const intent = `/checkout${lessonId ? `?lesson=${encodeURIComponent(lessonId)}` : ""}`;
  return (
    <AppFrame model={model}>
      <main className="max-w-lg mx-auto p-5 flex flex-col gap-4">
        <h1 className="text-xl font-bold">دسترسی دوره</h1>
        <p>
          خرید یک‌باره دسترسی تجاری ۶۰ درس را فعال می‌کند؛ ترتیب آموزشی و انتشار
          محتوا مستقل است.
        </p>
        {product && (
          <p role="status">
            فقط شبیه‌ساز آزمایشی — {product.amountMinor} واحد {product.currency}
            ؛ قیمت واقعی تعیین نشده و پولی منتقل نمی‌شود.
          </p>
        )}
        {error && <p role="alert">{errorMessage(error)}</p>}
        {model?.kind === "guest" ? (
          <Button
            onPress={() =>
              router.push(`/auth?returnTo=${encodeURIComponent(intent)}`)
            }
          >
            ورود برای ادامه خرید
          </Button>
        ) : (
          <Button
            isDisabled={!model || !product || busy}
            onPress={() => {
              setBusy(true);
              key.current ??= crypto.randomUUID();
              void api<{ redirectUrl: string }>(
                "/checkout",
                "POST",
                { productId: product!.id, ...(lessonId ? { lessonId } : {}) },
                key.current,
              )
                .then((result) => {
                  const target = new URL(result.redirectUrl);
                  if (
                    target.origin !== location.origin ||
                    !target.pathname.startsWith("/checkout/mock/")
                  )
                    throw new Error("INVALID_GATEWAY_REDIRECT");
                  router.push(target.pathname);
                })
                .catch((e) => {
                  setError(e.message);
                  setBusy(false);
                });
            }}
          >
            رفتن به شبیه‌ساز پرداخت
          </Button>
        )}
        <Button variant="secondary" onPress={() => router.push("/path")}>
          بازگشت به مسیر من
        </Button>
      </main>
    </AppFrame>
  );
}
export function PaymentMock({ id }: { id: string }) {
  const { model } = useLearner();
  const api = scopedApi(model?.scope);
  const router = useRouter();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void api<Purchase>(`/purchases/${id}`)
      .then(setPurchase)
      .catch((e) => setError(e.message));
  }, [id]);
  const settle = async (status: string) => {
    setBusy(true);
    try {
      await api(`/payments/mock/${id}`, "POST", { status });
      router.replace(`/checkout/return?purchase=${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "REQUEST_FAILED");
      setBusy(false);
    }
  };
  return (
    <AppFrame model={model}>
      <main className="max-w-lg mx-auto p-5 flex flex-col gap-4">
        <h1 className="text-xl font-bold">
          شبیه‌ساز پرداخت؛ پول واقعی منتقل نمی‌شود
        </h1>
        {error && <p role="alert">{errorMessage(error)}</p>}
        {purchase?.testOnly && (
          <>
            <p>
              {purchase.amountMinor} واحد {purchase.currency} — وضعیت:{" "}
              {statusLabels[purchase.status]}
            </p>
            {purchase.status === "pending" && (
              <>
                <Button
                  isDisabled={busy}
                  onPress={() => void settle("verified")}
                >
                  شبیه‌سازی پرداخت موفق
                </Button>
                <Button
                  variant="secondary"
                  isDisabled={busy}
                  onPress={() => void settle("failed")}
                >
                  شبیه‌سازی خطای پرداخت
                </Button>
                <Button
                  variant="secondary"
                  isDisabled={busy}
                  onPress={() => void settle("cancelled")}
                >
                  لغو پرداخت آزمایشی
                </Button>
              </>
            )}
            <Button
              variant="tertiary"
              onPress={() => router.push(`/checkout/return?purchase=${id}`)}
            >
              بازگشت بدون نتیجه پرداخت
            </Button>
          </>
        )}
      </main>
    </AppFrame>
  );
}
export function PaymentReturn({ id }: { id: string }) {
  const { model, reload } = useLearner();
  const api = scopedApi(model?.scope);
  const router = useRouter();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const notified = useRef(false);
  useEffect(() => {
    let live = true;
    void api<Purchase>(`/purchases/${id}`)
      .then((value) => {
        if (live) {
          setPurchase(value);
          setError("");
          if (value.status === "verified" && !notified.current) {
            notified.current = true;
            void reload();
          }
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id, attempt]);
  useEffect(() => {
    if (purchase?.status !== "pending" || attempt >= 20) return;
    const timer = setTimeout(() => setAttempt((value) => value + 1), 1500);
    return () => clearTimeout(timer);
  }, [purchase, attempt]);
  return (
    <AppFrame model={model}>
      <main className="max-w-lg mx-auto p-5 flex flex-col gap-4">
        <h1 className="text-xl font-bold">نتیجه پرداخت</h1>
        {error && (
          <>
            <p role="alert">{errorMessage(error)}</p>
            {error === "AUTHENTICATION_REQUIRED" && (
              <Button
                onPress={() =>
                  router.push(
                    `/auth?returnTo=${encodeURIComponent(`/checkout/return?purchase=${id}`)}`,
                  )
                }
              >
                ورود و مشاهده نتیجه
              </Button>
            )}
          </>
        )}
        {purchase ? (
          <>
            <p role="status" data-testid="purchase-status">
              {statusLabels[purchase.status]}
            </p>
            {purchase.testOnly && (
              <p>نتیجه شبیه‌ساز آزمایشی است؛ خرید واقعی نیست.</p>
            )}
            {purchase.status === "verified" && (
              <>
                <p>دسترسی تجاری دوره ثبت شد.</p>
                {purchase.intendedLesson &&
                  !purchase.intendedLesson.access.canStart && (
                    <p>
                      این درس هنوز به تکمیل پیش‌نیاز یا انتشار محتوا نیاز دارد.
                    </p>
                  )}
                <Button onPress={() => router.push(purchase.continuePath)}>
                  ادامه یادگیری
                </Button>
              </>
            )}
            {["failed", "cancelled", "expired"].includes(purchase.status) && (
              <>
                <p>پیشرفت یادگیری محفوظ است.</p>
                <Button
                  onPress={() =>
                    router.push(
                      `/checkout${purchase.intendedLesson ? `?lesson=${purchase.intendedLesson.id}` : ""}`,
                    )
                  }
                >
                  تلاش دوباره برای پرداخت آزمایشی
                </Button>
              </>
            )}
          </>
        ) : (
          !error && <p role="status">در حال دریافت وضعیت از سرور…</p>
        )}
        <Button
          variant="secondary"
          onPress={() => setAttempt((value) => value + 1)}
        >
          بررسی دوباره وضعیت
        </Button>
        <Button variant="tertiary" onPress={() => router.push("/path")}>
          بازگشت به مسیر من
        </Button>
      </main>
    </AppFrame>
  );
}
