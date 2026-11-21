"use client";

import React from "react";
import { SandboxProvider } from "@/components/sandbox/sandbox-context";
import { SandboxHeader } from "@/components/sandbox/sandbox-header";
import { SandboxSidebarCatalog } from "@/components/sandbox/sandbox-sidebar-catalog";
import { SandboxCanvas } from "@/components/sandbox/sandbox-canvas";
import { SandboxControls } from "@/components/sandbox/sandbox-controls";
import { SandboxInspectDrawer } from "@/components/sandbox/sandbox-inspect-drawer";

export default function SandboxStudioPage() {
  const [mobilePanel, setMobilePanel] = React.useState<"catalog" | "preview" | "controls">("preview");

  return (
    <SandboxProvider>
      <div className="w-screen h-screen overflow-hidden flex flex-col bg-background text-foreground select-none font-sans">
        {/* ۱. نوار ابزار بالا (Top Header) */}
        <SandboxHeader />

        <nav aria-label="بخش‌های سندباکس" className="flex shrink-0 items-center justify-center gap-2 border-b border-default-200/60 p-2 lg:hidden">
          {([
            ["catalog", "کامپوننت‌ها"],
            ["preview", "پیش‌نمایش"],
            ["controls", "تنظیمات"],
          ] as const).map(([panel, label]) => (
            <button key={panel} type="button" aria-pressed={mobilePanel === panel} onClick={() => setMobilePanel(panel)} className={`rounded-xl px-3 py-2 text-xs font-bold ${mobilePanel === panel ? "bg-accent text-accent-foreground" : "bg-default-100 text-foreground"}`}>
              {label}
            </button>
          ))}
        </nav>

        {/* ۲. بدنه میانی: کاتالوگ راست + بوم وسط + کنترل‌های چپ */}
        <div className="flex-1 flex flex-row overflow-hidden relative">
          {/* سایدبار کاتالوگ کامپوننت‌ها (راست در حالت RTL) */}
          <div className={`${mobilePanel === "catalog" ? "flex" : "hidden"} h-full w-full shrink-0 lg:flex lg:w-80`}><SandboxSidebarCatalog /></div>

          {/* بوم مرکزی با ابعاد پاسخگو و ایزوله */}
          <div className={`${mobilePanel === "preview" ? "flex" : "hidden"} h-full min-w-0 flex-1 lg:flex`}><SandboxCanvas /></div>

          {/* پنل دستکاری پراپ‌ها و وضعیت‌ها (چپ در حالت RTL) */}
          <div className={`${mobilePanel === "controls" ? "flex" : "hidden"} h-full w-full shrink-0 lg:flex lg:w-80`}><SandboxControls /></div>
        </div>

        {/* ۳. دراور پایینی ابزار بازرسی (Inspect Tool) */}
        <SandboxInspectDrawer />
      </div>
    </SandboxProvider>
  );
}
