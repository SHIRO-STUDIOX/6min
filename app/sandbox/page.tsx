"use client";

import React from "react";
import { SandboxProvider } from "@/components/sandbox/sandbox-context";
import { SandboxHeader } from "@/components/sandbox/sandbox-header";
import { SandboxSidebarCatalog } from "@/components/sandbox/sandbox-sidebar-catalog";
import { SandboxCanvas } from "@/components/sandbox/sandbox-canvas";
import { SandboxControls } from "@/components/sandbox/sandbox-controls";
import { SandboxInspectDrawer } from "@/components/sandbox/sandbox-inspect-drawer";

export default function SandboxStudioPage() {
  return (
    <SandboxProvider>
      <div className="w-screen h-screen overflow-hidden flex flex-col bg-background text-foreground select-none font-sans">
        {/* ۱. نوار ابزار بالا (Top Header) */}
        <SandboxHeader />

        {/* ۲. بدنه میانی: کاتالوگ راست + بوم وسط + کنترل‌های چپ */}
        <div className="flex-1 flex flex-row overflow-hidden relative">
          {/* سایدبار کاتالوگ کامپوننت‌ها (راست در حالت RTL) */}
          <SandboxSidebarCatalog />

          {/* بوم مرکزی با ابعاد پاسخگو و ایزوله */}
          <SandboxCanvas />

          {/* پنل دستکاری پراپ‌ها و وضعیت‌ها (چپ در حالت RTL) */}
          <SandboxControls />
        </div>

        {/* ۳. دراور پایینی ابزار بازرسی (Inspect Tool) */}
        <SandboxInspectDrawer />
      </div>
    </SandboxProvider>
  );
}
