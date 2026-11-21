"use client";

import { useSyncExternalStore } from "react";

export type GlassQuality = "full" | "balanced" | "light" | "simple";
export type GlassPerformance = "auto" | GlassQuality;
export type GlassDiagnostics = { quality: GlassQuality; reason: string; frameMs: number | null; history: number[] };

// One observer per document. Thresholds are provisional and must be calibrated on real devices.
const levels: GlassQuality[] = ["full", "balanced", "light", "simple"];
const initial: GlassDiagnostics = { quality: "balanced", reason: "initial", frameMs: null, history: [] };
let snapshot = initial;
let listeners = new Set<() => void>();
let frame = 0;
let last = 0;
let activeUntil = 0;
let samples: number[] = [];
let badWindows = 0;
let goodWindows = 0;
let measuredQuality: GlassQuality = "balanced";
let measuredReason = "initial";
let history: number[] = [];
const surfaces = new Map<Element, { visible: boolean; area: number }>();

export function advanceGlassQuality(state: { quality: GlassQuality; badWindows: number; goodWindows: number }, p90: number) {
  let bad = p90 > 32 ? state.badWindows + 1 : 0;
  let good = p90 < 23 ? state.goodWindows + 1 : 0;
  let index = levels.indexOf(state.quality);
  let reason: string | null = null;
  if (bad >= 2 && index < levels.length - 1) {
    index++;
    bad = 0;
    good = 0;
    reason = "sustained slow frames";
  } else if (good >= 12 && index > 0) {
    index--;
    good = 0;
    reason = "stable frames";
  }
  return { quality: levels[index], badWindows: bad, goodWindows: good, reason };
}

function applyBudget(reason: string, frameMs: number | null) {
  const visible = Array.from(surfaces.values()).filter((surface) => surface.visible);
  const area = visible.reduce((sum, surface) => sum + surface.area, 0);
  const cap = visible.length > 12 || area > 400000 ? 2 : visible.length > 6 || area > 200000 ? 1 : 0;
  const level = Math.max(levels.indexOf(measuredQuality), cap);
  publish({ quality: levels[level], reason: cap > levels.indexOf(measuredQuality) ? "visible surface budget" : reason, frameMs, history });
}

export function registerGlass(element: Element) {
  const entry = { visible: true, area: 0 };
  surfaces.set(element, entry);
  const measure = () => {
    const rect = element.getBoundingClientRect();
    entry.area = rect.width * rect.height;
    applyBudget(measuredReason, snapshot.frameMs);
  };
  measure();
  const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
  resize?.observe(element);
  const intersection = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
    entry.visible = entries[0]?.isIntersecting ?? false;
    measure();
  });
  intersection?.observe(element);
  return () => {
    resize?.disconnect();
    intersection?.disconnect();
    surfaces.delete(element);
    applyBudget(measuredReason, snapshot.frameMs);
  };
}

function publish(next: GlassDiagnostics) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function tick(time: number) {
  frame = 0;
  if (document.hidden || time > activeUntil || listeners.size === 0) {
    last = 0;
    samples = [];
    return;
  }
  if (last) {
    const elapsed = time - last;
    if (elapsed > 0 && elapsed < 250) samples.push(elapsed);
  }
  last = time;
  if (samples.length >= 60) {
    const sorted = samples.sort((a, b) => a - b);
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    samples = [];
    const next = advanceGlassQuality({ quality: measuredQuality, badWindows, goodWindows }, p90);
    measuredQuality = next.quality;
    badWindows = next.badWindows;
    goodWindows = next.goodWindows;
    measuredReason = next.reason ?? measuredReason;
    history = [...history.slice(-19), Math.round(p90 * 10) / 10];
    applyBudget(measuredReason, Math.round(p90 * 10) / 10);
  }
  frame = requestAnimationFrame(tick);
}

function activity() {
  if (document.hidden) return;
  activeUntil = performance.now() + 2500;
  if (!frame) frame = requestAnimationFrame(tick);
}

function visibility() {
  if (document.hidden) {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    samples = [];
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("pointermove", activity, { passive: true });
    window.addEventListener("pointerdown", activity, { passive: true });
    window.addEventListener("scroll", activity, { passive: true, capture: true });
    document.addEventListener("visibilitychange", visibility);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener("pointermove", activity);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("scroll", activity, true);
      document.removeEventListener("visibilitychange", visibility);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      samples = [];
      badWindows = 0;
      goodWindows = 0;
    }
  };
}

export function useGlassDiagnostics() {
  return useSyncExternalStore(subscribe, () => snapshot, () => initial);
}
