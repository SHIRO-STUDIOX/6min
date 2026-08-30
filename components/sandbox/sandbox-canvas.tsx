"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertTriangle,
  MoveHorizontal,
  Layers,
  Sparkles,
} from "lucide-react";
import { Chip, Spinner } from "@heroui/react";
import { useSandbox } from "./sandbox-context";
import { ViewportMode, BrandPreset } from "./sandbox-types";
import { SandboxInspectorOverlay } from "./sandbox-inspector-overlay";

// HeroUI Brand Theme CSS Variable Mappings
const brandColorStyles: Record<BrandPreset, React.CSSProperties> = {
  default: {
    "--accent": "oklch(0.58 0.22 260)",
    "--accent-foreground": "oklch(1 0 0)",
    "--primary": "oklch(0.58 0.22 260)",
    "--primary-foreground": "oklch(1 0 0)",
    "--focus": "oklch(0.58 0.22 260)",
    "--link": "oklch(0.58 0.22 260)",
  } as React.CSSProperties,
  emerald: {
    "--accent": "oklch(0.65 0.20 155)",
    "--accent-foreground": "oklch(1 0 0)",
    "--primary": "oklch(0.65 0.20 155)",
    "--primary-foreground": "oklch(1 0 0)",
    "--focus": "oklch(0.65 0.20 155)",
    "--link": "oklch(0.65 0.20 155)",
  } as React.CSSProperties,
  indigo: {
    "--accent": "oklch(0.58 0.23 275)",
    "--accent-foreground": "oklch(1 0 0)",
    "--primary": "oklch(0.58 0.23 275)",
    "--primary-foreground": "oklch(1 0 0)",
    "--focus": "oklch(0.58 0.23 275)",
    "--link": "oklch(0.58 0.23 275)",
  } as React.CSSProperties,
  violet: {
    "--accent": "oklch(0.60 0.25 300)",
    "--accent-foreground": "oklch(1 0 0)",
    "--primary": "oklch(0.60 0.25 300)",
    "--primary-foreground": "oklch(1 0 0)",
    "--focus": "oklch(0.60 0.25 300)",
    "--link": "oklch(0.60 0.25 300)",
  } as React.CSSProperties,
  amber: {
    "--accent": "oklch(0.75 0.18 65)",
    "--accent-foreground": "oklch(0.18 0.05 65)",
    "--primary": "oklch(0.75 0.18 65)",
    "--primary-foreground": "oklch(0.18 0.05 65)",
    "--focus": "oklch(0.75 0.18 65)",
    "--link": "oklch(0.75 0.18 65)",
  } as React.CSSProperties,
  rose: {
    "--accent": "oklch(0.62 0.24 15)",
    "--accent-foreground": "oklch(1 0 0)",
    "--primary": "oklch(0.62 0.24 15)",
    "--primary-foreground": "oklch(1 0 0)",
    "--focus": "oklch(0.62 0.24 15)",
    "--link": "oklch(0.62 0.24 15)",
  } as React.CSSProperties,
  cyan: {
    "--accent": "oklch(0.70 0.16 210)",
    "--accent-foreground": "oklch(0.15 0.05 210)",
    "--primary": "oklch(0.70 0.16 210)",
    "--primary-foreground": "oklch(0.15 0.05 210)",
    "--focus": "oklch(0.70 0.16 210)",
    "--link": "oklch(0.70 0.16 210)",
  } as React.CSSProperties,
};

// Simple Error Boundary
class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode; resetKey: any },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: any) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 max-w-lg mx-auto my-auto text-center bg-danger-50 dark:bg-danger-950/40 border border-danger-300 dark:border-danger-900 rounded-3xl gap-4 shadow-xl">
          <div className="p-3 rounded-2xl bg-danger-100 dark:bg-danger-900/60 text-danger">
            <AlertTriangle className="size-8" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-sm font-bold text-danger">خطا در رندر کامپوننت</h3>
            <p className="text-xs text-danger/80">
              کامپوننت انتخابی با مقادیر فعلی پراپ‌ها دچار خطای رندرینگ شد.
            </p>
          </div>
          <pre className="p-3 bg-black/10 dark:bg-black/40 rounded-xl text-[10px] text-danger font-mono text-left max-w-full overflow-x-auto" dir="ltr">
            {this.state.error?.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export function SandboxCanvas() {
  const {
    selectedComponent,
    componentProps,
    viewportMode,
    setViewportMode,
    customWidth,
    setCustomWidth,
    zoom,
    canvasBg,
    isRTL,
    refreshKey,
    brandPreset,
    isInteractiveInspectActive,
  } = useSandbox();

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Resizing and Inspection refs
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasPreviewRef = useRef<HTMLDivElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Compute container width
  const getContainerWidth = () => {
    switch (viewportMode) {
      case "mobile":
        return "375px";
      case "tablet":
        return "768px";
      case "desktop":
        return "1200px";
      case "full":
        return "100%";
      case "custom":
        return `${customWidth}px`;
      default:
        return "100%";
    }
  };

  // Drag to resize handler
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const distanceFromCenter = Math.abs(e.clientX - centerX);
      const newWidth = Math.min(Math.max(Math.round(distanceFromCenter * 2), 320), 1600);
      setCustomWidth(newWidth);
      setViewportMode("custom");
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, setCustomWidth, setViewportMode]);

  // Background pattern classes
  const getBackgroundStyle = () => {
    switch (canvasBg) {
      case "grid":
        return {
          backgroundImage: isDark
            ? "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)"
            : "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)",
          backgroundSize: "24px 24px, 24px 24px, 24px 24px",
        };
      case "dots":
        return {
          backgroundImage: isDark
            ? "radial-gradient(rgba(255,255,255,0.15) 1.5px, transparent 1.5px)"
            : "radial-gradient(rgba(0,0,0,0.15) 1.5px, transparent 1.5px)",
          backgroundSize: "20px 20px",
        };
      case "blueprint":
        return {
          backgroundImage: isDark
            ? "linear-gradient(rgba(14, 165, 233, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.15) 1px, transparent 1px)"
            : "linear-gradient(rgba(2, 132, 199, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(2, 132, 199, 0.12) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        };
      case "contrast":
        return {
          backgroundImage: isDark
            ? "repeating-conic-gradient(#18181b 0% 25%, #09090b 0% 50%)"
            : "repeating-conic-gradient(#f4f4f5 0% 25%, #ffffff 0% 50%)",
          backgroundSize: "24px 24px",
        };
      case "clean":
      default:
        return {};
    }
  };

  const activeWidthStr = getContainerWidth();

  return (
    <main
      ref={containerRef}
      className="flex-1 h-full overflow-auto relative flex flex-col items-center justify-start p-4 sm:p-8 bg-default-100/40 select-none transition-all"
      style={getBackgroundStyle()}
    >
      {/* 1. نشانگر رزولوشن و ابعاد زنده بالای بوم */}
      <div className="sticky top-2 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-background/90 backdrop-blur-md border border-default-200/80 shadow-md text-[11px] font-mono text-muted mb-4">
        <span className="font-bold text-foreground">ابعاد بوم:</span>
        <span className="font-bold text-accent font-tabular">
          {activeWidthStr === "100%" ? "100% (پاسخگو)" : activeWidthStr}
        </span>
        <span className="text-default-300">|</span>
        <span>زوم: {zoom}٪</span>
        <span className="text-default-300">|</span>
        <span className="uppercase text-[9px] font-bold text-success">
          {isRTL ? "RTL (فارسی)" : "LTR"}
        </span>
      </div>

      {/* 2. فریم بوم با مقیاس زوم */}
      <div
        className="w-full flex items-center justify-center my-auto transition-transform duration-200 origin-top"
        style={{
          transform: `scale(${zoom / 100})`,
        }}
      >
        <div
          className="relative transition-all duration-300 flex items-center justify-center"
          style={{
            width: activeWidthStr,
            maxWidth: "100%",
          }}
        >
          {/* هندل تغییر اندازه سمت چپ */}
          <div
            onMouseDown={() => setIsResizing(true)}
            className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-16 rounded-full bg-background/90 border border-default-300 hover:border-accent shadow-lg flex items-center justify-center cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity z-30 group"
            title="درگ جهت تغییر عرض بوم"
          >
            <MoveHorizontal className="size-3.5 text-muted group-hover:text-accent" />
          </div>

          {/* بدنه بوم رندرینگ کامپوننت */}
          <div
            key={`${selectedComponent.id}-${refreshKey}-${brandPreset}`}
            data-brand={brandPreset}
            dir={isRTL ? "rtl" : "ltr"}
            style={brandColorStyles[brandPreset] || {}}
            className="@container w-full min-h-[360px] rounded-3xl bg-background/95 border border-default-200/80 shadow-2xl overflow-hidden flex flex-col relative transition-all"
          >
            {/* نوار بالایی ماک‌آپ (نوار عنوان شبیه‌ساز) */}
            <div className="h-9 px-4 bg-default-100/60 border-b border-default-200/60 flex items-center justify-between text-xs select-none">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full bg-danger/70" />
                  <div className="size-2.5 rounded-full bg-warning/70" />
                  <div className="size-2.5 rounded-full bg-success/70" />
                </div>
                <span className="text-[11px] font-mono text-muted/80 truncate max-w-[200px]" dir="ltr">
                  preview/{selectedComponent.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Chip size="sm" variant="soft" color="accent" className="h-4 text-[9px] px-1 font-bold">
                  {selectedComponent.persianName}
                </Chip>
              </div>
            </div>

            {/* محتوای رندر شده داخل ErrorBoundary با لایه بازرسی زنده ماوس */}
            <div
              ref={canvasPreviewRef}
              className="flex-1 p-4 sm:p-6 flex items-center justify-center overflow-auto font-sans relative"
            >
              <CanvasErrorBoundary resetKey={`${selectedComponent.id}-${refreshKey}`}>
                {selectedComponent.render(componentProps)}
              </CanvasErrorBoundary>

              {/* لایه بازرسی زنده ماوس سبک فیگما */}
              <SandboxInspectorOverlay
                containerRef={canvasPreviewRef}
                isActive={isInteractiveInspectActive}
              />
            </div>
          </div>

          {/* هندل تغییر اندازه سمت راست */}
          <div
            onMouseDown={() => setIsResizing(true)}
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-16 rounded-full bg-background/90 border border-default-300 hover:border-accent shadow-lg flex items-center justify-center cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity z-30 group"
            title="درگ جهت تغییر عرض بوم"
          >
            <MoveHorizontal className="size-3.5 text-muted group-hover:text-accent" />
          </div>
        </div>
      </div>
    </main>
  );
}
