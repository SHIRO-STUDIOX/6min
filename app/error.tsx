"use client";

import { useEffect } from "react";
import { Button } from "@heroui/react";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <h2 className="text-2xl font-bold text-foreground">
        خطایی در بارگذاری صفحه رخ داد!
      </h2>
      <p className="text-sm text-muted">
        لطفاً مجدداً تلاش کنید یا در صورت تکرار با پشتیبانی تماس بگیرید.
      </p>
      <Button
        className="mt-2"
        variant="primary"
        onPress={() => reset()}
      >
        تلاش مجدد
      </Button>
    </div>
  );
}
