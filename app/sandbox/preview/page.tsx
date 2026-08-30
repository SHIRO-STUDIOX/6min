"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getComponentById, sandboxRegistry } from "@/components/sandbox/sandbox-registry";

function PreviewContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "mobile-login-card";
  const brand = searchParams.get("brand") || "default";
  const comp = getComponentById(id) || sandboxRegistry[0];

  return (
    <div
      data-brand={brand}
      className="w-full min-h-screen p-6 flex items-center justify-center bg-background text-foreground font-sans antialiased select-none"
    >
      {comp.render(comp.defaultProps || {})}
    </div>
  );
}

export default function SandboxPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen flex items-center justify-center text-xs text-muted">
          در حال بارگذاری پیش‌نمایش...
        </div>
      }
    >
      <PreviewContent />
    </Suspense>
  );
}
