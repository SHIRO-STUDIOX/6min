"use client";

import React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Smartphone,
  Tablet,
  Monitor,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sun,
  Moon,
  Code2,
  MousePointerClick,
  Layers,
  Palette,
  Grid,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import {
  Button,
  ButtonGroup,
  Chip,
  Kbd,
} from "@heroui/react";
import { useSandbox } from "./sandbox-context";
import { ViewportMode, CanvasBackground, BrandPreset } from "./sandbox-types";

const brandColors: { id: BrandPreset; name: string; hex: string }[] = [
  { id: "default", name: "هیرویوآی پیش‌فرض", hex: "#006FEE" },
  { id: "emerald", name: "زمردی (Emerald)", hex: "#10B981" },
  { id: "indigo", name: "نیلی (Indigo)", hex: "#6366F1" },
  { id: "violet", name: "بنفش (Violet)", hex: "#8B5CF6" },
  { id: "amber", name: "کهربایی (Amber)", hex: "#F59E0B" },
  { id: "rose", name: "رز (Rose)", hex: "#F43F5E" },
  { id: "cyan", name: "فیروزه‌ای (Cyan)", hex: "#06B6D4" },
];

export function SandboxHeader() {
  const {
    selectedComponent,
    viewportMode,
    setViewportMode,
    zoom,
    setZoom,
    canvasBg,
    setCanvasBg,
    brandPreset,
    setBrandPreset,
    isInspectOpen,
    toggleInspect,
    isInteractiveInspectActive,
    toggleInteractiveInspect,
    refreshCanvas,
    isRTL,
    setIsRTL,
  } = useSandbox();

  const [isBrandOpen, setIsBrandOpen] = React.useState(false);
  const brandDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close brand dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        brandDropdownRef.current &&
        !brandDropdownRef.current.contains(e.target as Node)
      ) {
        setIsBrandOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <header className="h-14 w-full overflow-x-auto px-4 border-b border-default-200/70 bg-background/80 backdrop-blur-xl flex items-center justify-between gap-4 z-40 select-none shrink-0">
      {/* 1. بخش راست: لوگو و نام کامپوننت انتخابی */}
      <div className="flex items-center gap-3 min-w-[240px]">
        <Link
          href="/"
          className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-default-100 transition-colors text-foreground group"
          title="بازگشت به صفحه اصلی"
        >
          <div className="size-8 rounded-xl bg-gradient-to-tr from-accent to-accent/60 flex items-center justify-center text-accent-foreground font-black text-xs shadow-md shadow-accent/20">
            H3
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-tight text-foreground">
                HeroUI Sandbox
              </span>
              <Chip size="sm" variant="soft" color="accent" className="h-4 text-[9px] px-1 font-bold">
                v3.2
              </Chip>
            </div>
            <span className="text-[10px] text-muted truncate max-w-[130px]">
              استودیو ایزوله کامپوننت
            </span>
          </div>
        </Link>

        <div className="h-4 w-px bg-default-200 hidden sm:block" />

        <div className="hidden lg:flex items-center gap-2">
          <span className="text-xs font-bold text-foreground truncate max-w-[160px]">
            {selectedComponent.persianName}
          </span>
          <Chip size="sm" variant="tertiary" className="h-4 text-[9px] px-1 font-mono text-muted">
            {selectedComponent.name}
          </Chip>
        </div>
      </div>

      {/* 2. بخش وسط: کنترل‌های ویوپورت و بوم */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* کنترل‌های رزولوشن ویوپورت */}
        <div className="flex items-center p-0.5 rounded-xl bg-default-100/80 border border-default-200/60 shadow-inner">
          <button
            type="button"
            onClick={() => setViewportMode("mobile")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewportMode === "mobile"
                ? "bg-background text-foreground shadow-sm font-bold"
                : "text-muted hover:text-foreground"
            }`}
            title="موبایل (375px)"
          >
            <Smartphone className="size-3.5" />
            <span className="hidden md:inline">موبایل</span>
          </button>

          <button
            type="button"
            onClick={() => setViewportMode("tablet")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewportMode === "tablet"
                ? "bg-background text-foreground shadow-sm font-bold"
                : "text-muted hover:text-foreground"
            }`}
            title="تبلت (768px)"
          >
            <Tablet className="size-3.5" />
            <span className="hidden md:inline">تبلت</span>
          </button>

          <button
            type="button"
            onClick={() => setViewportMode("desktop")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewportMode === "desktop"
                ? "bg-background text-foreground shadow-sm font-bold"
                : "text-muted hover:text-foreground"
            }`}
            title="دسکتاپ (1280px)"
          >
            <Monitor className="size-3.5" />
            <span className="hidden md:inline">دسکتاپ</span>
          </button>

          <button
            type="button"
            onClick={() => setViewportMode("full")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewportMode === "full"
                ? "bg-background text-foreground shadow-sm font-bold"
                : "text-muted hover:text-foreground"
            }`}
            title="تمام صفحه (100%)"
          >
            <Maximize2 className="size-3.5" />
            <span className="hidden md:inline">۱۰۰٪</span>
          </button>
        </div>

        {/* زوم بوم */}
        <div className="hidden xl:flex items-center gap-1 px-1.5 py-0.5 rounded-xl bg-default-100/70 border border-default-200/50">
          <button
            type="button"
            disabled={zoom <= 50}
            onClick={() => setZoom(Math.max(50, zoom - 25))}
            className="p-1 text-muted hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="کاهش بزرگ‌نمایی"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <span className="text-[11px] font-mono font-bold text-foreground px-1 min-w-[36px] text-center">
            {zoom}٪
          </span>
          <button
            type="button"
            disabled={zoom >= 150}
            onClick={() => setZoom(Math.min(150, zoom + 25))}
            className="p-1 text-muted hover:text-foreground disabled:opacity-30 cursor-pointer"
            title="افزایش بزرگ‌نمایی"
          >
            <ZoomIn className="size-3.5" />
          </button>
        </div>

        {/* سبک پس‌زمینه بوم */}
        <div className="hidden 2xl:flex items-center gap-1 px-1 py-0.5 rounded-xl bg-default-100/70 border border-default-200/50 text-xs">
          {(["grid", "dots", "blueprint", "clean"] as CanvasBackground[]).map((bg) => (
            <button
              key={bg}
              type="button"
              onClick={() => setCanvasBg(bg)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors ${
                canvasBg === bg
                  ? "bg-background text-accent shadow-xs font-bold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {bg === "grid" && "شطرنجی"}
              {bg === "dots" && "نقاط"}
              {bg === "blueprint" && "میلی‌متری"}
              {bg === "clean" && "ساده"}
            </button>
          ))}
        </div>
      </div>

      {/* 3. بخش چپ: پالت برندی، رفرش، تم، اینسپکت و ابزارها */}
      <div className="flex items-center gap-2">
        {/* انتخاب پالت رنگی HeroUI */}
        <div className="relative" ref={brandDropdownRef}>
          <button
            type="button"
            onClick={() => setIsBrandOpen(!isBrandOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-default-100/80 hover:bg-default-200/70 border border-default-200/60 text-xs font-medium text-foreground transition-colors cursor-pointer"
            title="تغییر تم رنگی برند HeroUI"
          >
            <Palette className="size-3.5 text-accent" />
            <span
              className="size-3 rounded-full border border-black/20"
              style={{
                backgroundColor:
                  brandColors.find((b) => b.id === brandPreset)?.hex || "#006FEE",
              }}
            />
            <ChevronDown className="size-3 text-muted" />
          </button>

          {/* دراپ‌داون پالت رنگی */}
          {isBrandOpen && (
            <div className="absolute left-0 mt-1.5 w-48 p-1.5 rounded-2xl bg-background border border-default-200 shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
              <span className="text-[10px] text-muted px-2 py-1 font-bold">پالت رنگی برند HeroUI:</span>
              {brandColors.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => {
                    setBrandPreset(brand.id);
                    setIsBrandOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs text-right transition-colors cursor-pointer ${
                    brandPreset === brand.id
                      ? "bg-accent/15 text-accent font-bold"
                      : "hover:bg-default-100 text-foreground"
                  }`}
                >
                  <span>{brand.name}</span>
                  <span
                    className="size-3.5 rounded-full border border-black/20"
                    style={{ backgroundColor: brand.hex }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* سوئیچ راست‌چین / چپ‌چین */}
        <button
          type="button"
          onClick={() => setIsRTL(!isRTL)}
          className={`px-2 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
            isRTL
              ? "bg-default-100 text-foreground border-default-200"
              : "bg-accent/15 text-accent border-accent/40"
          }`}
          title="سوئیچ جهت صفحه بین RTL و LTR"
        >
          {isRTL ? "RTL" : "LTR"}
        </button>

        {/* رفرش بوم */}
        <button
          type="button"
          onClick={refreshCanvas}
          className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-default-100 transition-colors cursor-pointer"
          title="بازنشانی و رفرش پیش‌نمایش"
        >
          <RotateCcw className="size-4" />
        </button>

        {/* تغییر تم دارک / لایت */}
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-default-100 transition-colors cursor-pointer"
          title="تغییر تم"
          aria-label="تغییر تم"
        >
          {mounted && isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
        </button>

        {/* دکمه بازرسی زنده ماوس فیکما (Figma-like Live Inspect) */}
        <button
          type="button"
          onClick={toggleInteractiveInspect}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            isInteractiveInspectActive
              ? "bg-cyan-500 text-white border-cyan-500 shadow-md shadow-cyan-500/30 animate-pulse"
              : "bg-default-100 text-foreground hover:bg-default-200 border-default-200"
          }`}
          title="فعال/غیرفعال‌سازی بازرسی زنده ماوس (اندازه‌گیری و افکت‌ها مانند فیگما)"
        >
          <MousePointerClick className="size-4" />
          <span className="hidden sm:inline">ماوس اینسپکت</span>
        </button>

        {/* دکمه پنل اینسپکت */}
        <button
          type="button"
          onClick={toggleInspect}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            isInspectOpen
              ? "bg-accent text-accent-foreground border-accent shadow-md shadow-accent/25"
              : "bg-default-100 text-foreground hover:bg-default-200 border-default-200"
          }`}
          title="باز / بستن پنل بازرسی سورس و کدها"
        >
          <Code2 className="size-4" />
          <span className="hidden sm:inline">کدها</span>
        </button>
      </div>
    </header>
  );
}
