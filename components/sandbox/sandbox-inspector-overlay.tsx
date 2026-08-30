"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Maximize2,
  Box,
  Layers,
  Palette,
  Type,
  Sparkles,
  Pin,
  X,
  Copy,
  Check,
} from "lucide-react";
import { Chip } from "@heroui/react";

interface ElementMetrics {
  tagName: string;
  id?: string;
  className?: string;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
  };
  parentRect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  distances: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  styles: {
    backgroundColor: string;
    color: string;
    borderWidth: string;
    borderColor: string;
    borderStyle: string;
    borderRadius: string;
    padding: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    margin: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    boxShadow: string;
    backdropFilter: string;
    display: string;
    gap?: string;
  };
}

interface SandboxInspectorOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isActive: boolean;
}

// Convert rgb/rgba to clean hex or display string
function formatColor(color: string): string {
  if (!color || color === "rgba(0, 0, 0, 0)" || color === "transparent") {
    return "transparent";
  }
  return color;
}

export function SandboxInspectorOverlay({
  containerRef,
  isActive,
}: SandboxInspectorOverlayProps) {
  const [metrics, setMetrics] = useState<ElementMetrics | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const pinnedElementRef = useRef<HTMLElement | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const inspectElement = useCallback(
    (el: HTMLElement) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);

      const parentEl = el.parentElement;
      const parentRect = parentEl ? parentEl.getBoundingClientRect() : containerRect;

      const topDist = Math.round(elRect.top - containerRect.top);
      const leftDist = Math.round(elRect.left - containerRect.left);
      const rightDist = Math.round(containerRect.right - elRect.right);
      const bottomDist = Math.round(containerRect.bottom - elRect.bottom);

      const parsePx = (val: string) => parseFloat(val) || 0;

      const padding = {
        top: Math.round(parsePx(computed.paddingTop)),
        right: Math.round(parsePx(computed.paddingRight)),
        bottom: Math.round(parsePx(computed.paddingBottom)),
        left: Math.round(parsePx(computed.paddingLeft)),
      };

      const margin = {
        top: Math.round(parsePx(computed.marginTop)),
        right: Math.round(parsePx(computed.marginRight)),
        bottom: Math.round(parsePx(computed.marginBottom)),
        left: Math.round(parsePx(computed.marginLeft)),
      };

      setMetrics({
        tagName: el.tagName.toLowerCase(),
        id: el.id || undefined,
        className: el.className || undefined,
        rect: {
          top: elRect.top - containerRect.top,
          left: elRect.left - containerRect.left,
          width: Math.round(elRect.width * 10) / 10,
          height: Math.round(elRect.height * 10) / 10,
          right: elRect.right - containerRect.left,
          bottom: elRect.bottom - containerRect.top,
        },
        parentRect: {
          top: parentRect.top - containerRect.top,
          left: parentRect.left - containerRect.left,
          width: Math.round(parentRect.width),
          height: Math.round(parentRect.height),
        },
        distances: {
          top: topDist,
          bottom: bottomDist,
          left: leftDist,
          right: rightDist,
        },
        styles: {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          borderWidth: computed.borderWidth,
          borderColor: computed.borderColor,
          borderStyle: computed.borderStyle,
          borderRadius: computed.borderRadius,
          padding,
          margin,
          fontFamily: computed.fontFamily.split(",")[0].replace(/['"]/g, ""),
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          boxShadow: computed.boxShadow !== "none" ? computed.boxShadow : "none",
          backdropFilter:
            computed.backdropFilter && computed.backdropFilter !== "none"
              ? computed.backdropFilter
              : "none",
          display: computed.display,
          gap: computed.gap && computed.gap !== "normal" ? computed.gap : undefined,
        },
      });
    },
    [containerRef],
  );

  useEffect(() => {
    if (!isActive || !containerRef.current) {
      setMetrics(null);
      setIsPinned(false);
      return;
    }

    const container = containerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      if (isPinned) return;
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!target || !container.contains(target) || target === container) {
        return;
      }
      inspectElement(target);
    };

    const handleClick = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!target || !container.contains(target) || target === container) {
        setIsPinned(false);
        pinnedElementRef.current = null;
        return;
      }
      e.stopPropagation();
      pinnedElementRef.current = target;
      setIsPinned(true);
      inspectElement(target);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPinned(false);
        pinnedElementRef.current = null;
        setMetrics(null);
      }
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("click", handleClick, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("click", handleClick, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, isPinned, containerRef, inspectElement]);

  if (!isActive || !metrics) return null;

  const { rect, distances, styles, tagName } = metrics;

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-visible font-sans select-none" dir="ltr">
      {/* ۱. خطوط راهنمای فاصله فیزیکی تا حاشیه‌ها (Figma Distance Measurement Guides) */}
      {/* خط بالا */}
      <div
        className="absolute left-0 right-0 border-t border-dashed border-rose-500/70"
        style={{ top: `${rect.top}px` }}
      >
        <span className="absolute -top-4 right-1/2 translate-x-1/2 px-1.5 py-0.5 rounded bg-rose-500 text-[9px] font-mono font-bold text-white shadow-xs">
          {distances.top}px
        </span>
      </div>

      {/* خط چپ */}
      <div
        className="absolute top-0 bottom-0 border-s border-dashed border-rose-500/70"
        style={{ left: `${rect.left}px` }}
      >
        <span className="absolute top-1/2 -left-6 -translate-y-1/2 px-1.5 py-0.5 rounded bg-rose-500 text-[9px] font-mono font-bold text-white shadow-xs">
          {distances.left}px
        </span>
      </div>

      {/* خط راست */}
      <div
        className="absolute top-0 bottom-0 border-e border-dashed border-rose-500/70"
        style={{ left: `${rect.right}px` }}
      />

      {/* ۲. کادر های‌لایت عنصر انتخابی (Element Bounding Box Overlay) */}
      <div
        className="absolute transition-all duration-75 border-2 border-accent bg-accent/10 shadow-lg pointer-events-none"
        style={{
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          borderRadius: styles.borderRadius !== "0px" ? styles.borderRadius : undefined,
        }}
      >
        {/* نشانگرهای ۴ گوشه */}
        <div className="absolute -top-1 -left-1 size-2 rounded-full bg-accent border border-white" />
        <div className="absolute -top-1 -right-1 size-2 rounded-full bg-accent border border-white" />
        <div className="absolute -bottom-1 -left-1 size-2 rounded-full bg-accent border border-white" />
        <div className="absolute -bottom-1 -right-1 size-2 rounded-full bg-accent border border-white" />

        {/* بج اندازه زنده W × H روی کادر */}
        <div className="absolute -top-6 start-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-mono text-[10px] font-bold shadow-md">
          <span>&lt;{tagName}&gt;</span>
          <span className="opacity-75">|</span>
          <span>
            {rect.width} × {rect.height} px
          </span>
          {isPinned && <Pin className="size-2.5 fill-current ms-0.5" />}
        </div>
      </div>

      {/* ۳. کارت شناور اطلاعات استایل‌ها (Figma Spec Inspector Card) */}
      <div
        className="absolute pointer-events-auto transition-all duration-150 z-50"
        style={{
          top: `${Math.max(10, Math.min(rect.bottom + 12, (containerRef.current?.clientHeight || 600) - 280))}px`,
          left: `${Math.max(10, Math.min(rect.left, (containerRef.current?.clientWidth || 800) - 340))}px`,
        }}
      >
        <div className="w-80 p-3.5 rounded-3xl bg-background/95 dark:bg-default-900/95 backdrop-blur-3xl border border-default-200/80 shadow-2xl flex flex-col gap-2.5 text-xs text-foreground ring-1 ring-black/10 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-100">
          {/* هدر کارت: تگ، ابعاد و دکمه بستن */}
          <div className="flex items-center justify-between pb-2 border-b border-default-200/60">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-accent/15 text-accent font-mono font-bold text-[11px]">
                &lt;{tagName}&gt;
              </span>
              <span className="font-mono text-[11px] text-muted font-bold">
                {rect.width} × {rect.height}px
              </span>
            </div>

            <div className="flex items-center gap-1">
              {isPinned && (
                <Chip size="sm" variant="soft" color="accent" className="h-4 text-[9px] px-1 font-bold">
                  Pinned
                </Chip>
              )}
              {isPinned && (
                <button
                  type="button"
                  onClick={() => setIsPinned(false)}
                  className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-default-100 transition-colors cursor-pointer"
                  title="خروج از حالت قفل"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* بخش ابعاد و پدینگ/مارجین */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-default-100/60 flex flex-col gap-0.5">
              <span className="text-[9px] text-muted uppercase font-bold flex items-center gap-1">
                <Box className="size-3 text-accent" />
                پدینگ (Padding)
              </span>
              <span className="font-mono font-medium truncate">
                {styles.padding.top}px {styles.padding.right}px {styles.padding.bottom}px {styles.padding.left}px
              </span>
            </div>

            <div className="p-2 rounded-xl bg-default-100/60 flex flex-col gap-0.5">
              <span className="text-[9px] text-muted uppercase font-bold flex items-center gap-1">
                <Layers className="size-3 text-cyan-500" />
                ردیوس (Radius)
              </span>
              <span className="font-mono font-medium truncate">
                {styles.borderRadius}
              </span>
            </div>
          </div>

          {/* بخش رنگ‌ها (پس‌زمینه و کادر) */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-default-200/50">
            <span className="text-[9px] text-muted uppercase font-bold flex items-center gap-1">
              <Palette className="size-3 text-pink-500" />
              رنگ‌ها و سطوح (Colors & Borders)
            </span>

            <div className="flex flex-col gap-1">
              {/* رنگ پس‌زمینه */}
              <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-default-100/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span
                    className="size-4 rounded-md border border-black/20 shadow-xs flex-shrink-0"
                    style={{ backgroundColor: styles.backgroundColor }}
                  />
                  <span className="text-[10px] text-muted">پس‌زمینه:</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(formatColor(styles.backgroundColor), "bg")}
                  className="flex items-center gap-1 font-mono text-[10px] text-foreground hover:text-accent cursor-pointer"
                  title="کپی کد رنگ"
                >
                  <span className="truncate max-w-[120px]">{formatColor(styles.backgroundColor)}</span>
                  {copiedKey === "bg" ? <Check className="size-2.5 text-success" /> : <Copy className="size-2.5 text-muted" />}
                </button>
              </div>

              {/* رنگ کادر */}
              {styles.borderWidth !== "0px" && (
                <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-default-100/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-4 rounded-md border border-black/20 shadow-xs flex-shrink-0"
                      style={{ backgroundColor: styles.borderColor }}
                    />
                    <span className="text-[10px] text-muted">کادر ({styles.borderWidth}):</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(formatColor(styles.borderColor), "border")}
                    className="flex items-center gap-1 font-mono text-[10px] text-foreground hover:text-accent cursor-pointer"
                    title="کپی کد رنگ کادر"
                  >
                    <span className="truncate max-w-[120px]">{formatColor(styles.borderColor)}</span>
                    {copiedKey === "border" ? <Check className="size-2.5 text-success" /> : <Copy className="size-2.5 text-muted" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* بخش تایپوگرافی (اگر متن داشته باشد) */}
          <div className="flex flex-col gap-1 pt-1 border-t border-default-200/50">
            <span className="text-[9px] text-muted uppercase font-bold flex items-center gap-1">
              <Type className="size-3 text-amber-500" />
              تایپوگرافی (Typography)
            </span>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted">
              <span>{styles.fontFamily}</span>
              <span className="font-bold text-foreground">{styles.fontSize} / {styles.fontWeight}</span>
            </div>
          </div>

          {/* بخش افکت‌ها و فیلترها (اگر داشته باشد) */}
          {(styles.backdropFilter !== "none" || styles.boxShadow !== "none") && (
            <div className="flex flex-col gap-1 pt-1 border-t border-default-200/50">
              <span className="text-[9px] text-muted uppercase font-bold flex items-center gap-1">
                <Sparkles className="size-3 text-violet-500" />
                افکت‌ها و فیلترها (Effects)
              </span>
              <div className="flex flex-col gap-0.5 text-[9px] font-mono text-muted">
                {styles.backdropFilter !== "none" && (
                  <span className="truncate text-accent" title={styles.backdropFilter}>
                    blur: {styles.backdropFilter}
                  </span>
                )}
                {styles.boxShadow !== "none" && (
                  <span className="truncate" title={styles.boxShadow}>
                    shadow: {styles.boxShadow}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* راهنمای کلیک */}
          <div className="text-[9px] text-muted/80 text-center pt-1 border-t border-default-200/40">
            {isPinned ? "کلید Esc یا کلیک بیرون جهت رهاسازی" : "کلیک روی المان برای قفل کردن این کارت"}
          </div>
        </div>
      </div>
    </div>
  );
}
