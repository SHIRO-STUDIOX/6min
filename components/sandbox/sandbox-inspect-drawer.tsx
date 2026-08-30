"use client";

import React, { useState } from "react";
import {
  Code2,
  Copy,
  Check,
  FileCode,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Terminal,
  FileText,
  Sparkles,
} from "lucide-react";
import { Chip, Tabs, TabList, Tab, TabPanel } from "@heroui/react";
import { useSandbox } from "./sandbox-context";

export function SandboxInspectDrawer() {
  const {
    selectedComponent,
    componentProps,
    isInspectOpen,
    setIsInspectOpen,
    inspectTab,
    setInspectTab,
    setSelectedId,
  } = useSandbox();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate live code snippet
  const generatedCode = selectedComponent.getCodeSnippet
    ? selectedComponent.getCodeSnippet(componentProps)
    : `<${selectedComponent.name} />`;

  const importStatement = `import { ${selectedComponent.name} } from "@/${selectedComponent.filePath.replace(/\.tsx?$/, "")}";`;

  if (!isInspectOpen) {
    return (
      <div className="h-8 px-4 border-t border-default-200/70 bg-background/90 backdrop-blur-md flex items-center justify-between z-30 select-none">
        <div className="flex items-center gap-2">
          <Code2 className="size-3.5 text-accent" />
          <span className="text-xs font-bold text-foreground">
            ابزار بازرسی (Inspect Tool): {selectedComponent.name}
          </span>
          <span className="text-[10px] font-mono text-muted" dir="ltr">
            {selectedComponent.filePath}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsInspectOpen(true)}
          className="flex items-center gap-1 text-xs font-bold text-accent hover:underline cursor-pointer"
        >
          <span>نمایش جزئیات و کدها</span>
          <ChevronUp className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <footer className="h-64 border-t border-default-200/70 bg-background/95 backdrop-blur-xl flex flex-col shrink-0 z-30 select-none overflow-hidden transition-all duration-300">
      {/* 1. نوار ابزار بالای دراور بازرسی */}
      <div className="h-10 px-4 border-b border-default-200/60 flex items-center justify-between gap-3 bg-default-50/70">
        <div className="flex items-center gap-3">
          {/* تب‌های دراور */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-default-200/50">
            <button
              type="button"
              onClick={() => setInspectTab("code")}
              className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                inspectTab === "code"
                  ? "bg-background text-foreground font-bold shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <FileCode className="size-3.5 text-accent" />
              <span>کد زنده (Live JSX)</span>
            </button>

            <button
              type="button"
              onClick={() => setInspectTab("props")}
              className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                inspectTab === "props"
                  ? "bg-background text-foreground font-bold shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <FileText className="size-3.5 text-accent" />
              <span>جدول پراپ‌ها ({selectedComponent.propDefinitions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setInspectTab("deps")}
              className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                inspectTab === "deps"
                  ? "bg-background text-foreground font-bold shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Package className="size-3.5 text-accent" />
              <span>وابستگی‌های HeroUI ({selectedComponent.dependencies.length})</span>
            </button>
          </div>

          <div className="h-4 w-px bg-default-200 hidden md:block" />

          {/* مسیر فایل در پروژه */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted">
            <span className="font-medium text-foreground">مسیر فایل:</span>
            <span className="font-mono text-[11px] bg-default-100 px-2 py-0.5 rounded-lg text-foreground/80" dir="ltr">
              {selectedComponent.filePath}
            </span>
          </div>
        </div>

        {/* دکمه‌های کپی سریع و بستن */}
        <div className="flex items-center gap-2">
          {/* کپی مسیر فایل */}
          <button
            type="button"
            onClick={() => handleCopy(selectedComponent.filePath, "path")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-default-100 hover:bg-default-200 text-xs font-medium text-foreground transition-colors cursor-pointer"
            title="کپی مسیر فایل در سورس پروژه"
          >
            {copiedKey === "path" ? (
              <>
                <Check className="size-3.5 text-success" />
                <span className="text-success text-[11px]">کپی شد</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5 text-muted" />
                <span className="hidden sm:inline text-[11px]">کپی مسیر</span>
              </>
            )}
          </button>

          {/* کپی دستور Import */}
          <button
            type="button"
            onClick={() => handleCopy(importStatement, "import")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-default-100 hover:bg-default-200 text-xs font-medium text-foreground transition-colors cursor-pointer"
            title="کپی دستور Import کامپوننت"
          >
            {copiedKey === "import" ? (
              <>
                <Check className="size-3.5 text-success" />
                <span className="text-success text-[11px]">کپی شد</span>
              </>
            ) : (
              <>
                <Terminal className="size-3.5 text-muted" />
                <span className="hidden sm:inline text-[11px]">کپی Import</span>
              </>
            )}
          </button>

          {/* کپی کامل قطعه کد */}
          <button
            type="button"
            onClick={() => handleCopy(generatedCode, "code")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-xs font-bold transition-colors cursor-pointer"
            title="کپی کامل کد JSX کامپوننت با پراپ‌های جاری"
          >
            {copiedKey === "code" ? (
              <>
                <Check className="size-3.5 text-success" />
                <span className="text-success text-[11px]">کد کپی شد!</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span className="text-[11px]">کپی کد JSX</span>
              </>
            )}
          </button>

          {/* بستن پنل بازرسی */}
          <button
            type="button"
            onClick={() => setIsInspectOpen(false)}
            className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-default-100 transition-colors cursor-pointer"
            title="بستن پنل بازرسی"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
      </div>

      {/* 2. محتوای تب‌های دراور */}
      <div className="flex-1 overflow-y-auto p-4 font-sans select-text">
        {/* تب ۱: کد زنده */}
        {inspectTab === "code" && (
          <div className="h-full flex flex-col">
            <pre
              className="p-4 rounded-2xl bg-default-100/60 dark:bg-black/40 border border-default-200/60 font-mono text-xs text-foreground overflow-x-auto leading-relaxed"
              dir="ltr"
            >
              <code>{generatedCode}</code>
            </pre>
          </div>
        )}

        {/* تب ۲: جدول مشخصات پراپ‌ها */}
        {inspectTab === "props" && (
          <div className="w-full overflow-x-auto">
            {selectedComponent.propDefinitions.length === 0 ? (
              <p className="text-xs text-muted text-center py-6">
                این کامپوننت از ساختار کپسوله‌شده و استیت‌های اختصاصی بهره می‌برد و پراپ ورودی تعریف‌شده ندارد.
              </p>
            ) : (
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="border-b border-default-200 text-muted font-bold text-[11px]">
                    <th className="py-2 px-3">نام پراپ</th>
                    <th className="py-2 px-3">نوع داده (Type)</th>
                    <th className="py-2 px-3">مقدار پیش‌فرض</th>
                    <th className="py-2 px-3">مقدار لحظه‌ای</th>
                    <th className="py-2 px-3">توضیحات فارسی</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedComponent.propDefinitions.map((prop) => (
                    <tr
                      key={prop.name}
                      className="border-b border-default-100 hover:bg-default-100/40 transition-colors"
                    >
                      <td className="py-2 px-3 font-mono font-bold text-accent" dir="ltr">
                        {prop.name}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-muted" dir="ltr">
                        {prop.type}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground" dir="ltr">
                        {String(prop.defaultValue ?? "-")}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-foreground" dir="ltr">
                        {String(componentProps[prop.name] ?? prop.defaultValue ?? "-")}
                      </td>
                      <td className="py-2 px-3 text-muted text-[11px]">
                        {prop.description || prop.label}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* تب ۳: لیست وابستگی‌های HeroUI */}
        {inspectTab === "deps" && (
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold text-foreground">
              کامپوننت‌های پایه و ماژول‌های تشکیل‌دهنده:
            </span>
            <div className="flex flex-wrap gap-2">
              {selectedComponent.dependencies.map((dep) => (
                <div
                  key={dep}
                  className="px-3 py-1.5 rounded-xl bg-default-100 border border-default-200/80 flex items-center gap-1.5 text-xs text-foreground font-mono"
                >
                  <Package className="size-3 text-accent" />
                  <span>{dep}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
