"use client";

import React, { useRef } from "react";
import dynamic from "next/dynamic";
import { LiquidButton, type LiquidButtonProps } from "@/components/liquid-glass/liquid-button";
import { useGlassDiagnostics } from "@/components/liquid-glass/performance";

const LiquidReference = dynamic(() => import("./liquid-reference"), { ssr: false });

export type LiquidPreviewProps = LiquidButtonProps & {
  label?: string;
  background?: "gradient" | "light" | "dark" | "video" | "grid";
  sampleCount?: number;
  trackScene?: boolean;
  manualPosition?: boolean;
  mouseX?: number;
  mouseY?: number;
  offsetX?: number;
  offsetY?: number;
  compareReference?: boolean;
};

export function LiquidButtonPreview({ label = "ادامه مسیر", background = "gradient", sampleCount = 1, trackScene, manualPosition, mouseX = 0, mouseY = 0, offsetX = 0, offsetY = 0, compareReference, ...props }: LiquidPreviewProps) {
  const scene = useRef<HTMLDivElement>(null);
  const diagnostic = useGlassDiagnostics();
  const backgrounds = {
    gradient: "linear-gradient(130deg, #12316b, #1c96a0 45%, #ed875e 75%, #491d78)",
    light: "linear-gradient(135deg, #ffffff, #c9d7ec)",
    dark: "linear-gradient(135deg, #0d162a, #37345b)",
    grid: "repeating-conic-gradient(#8192a7 0% 25%, #dee4eb 0% 50%) 50% / 32px 32px",
    video: "#151d2c",
  };
  return <div ref={scene} className="relative w-full min-h-80 overflow-hidden rounded-3xl p-8 flex flex-col items-center justify-center gap-6" style={{ background: backgrounds[background] }}>
    {background === "video" && <video src="/demo/synthetic.mp4" autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />}
    <div className="relative flex flex-wrap justify-center gap-3">
      {Array.from({ length: Math.max(1, Math.min(12, sampleCount)) }, (_, index) => <LiquidButton key={index} {...props} mouseContainer={trackScene ? scene : undefined} globalMousePos={manualPosition ? { x: mouseX, y: mouseY } : undefined} mouseOffset={manualPosition ? { x: offsetX, y: offsetY } : undefined}>{label}</LiquidButton>)}
    </div>
    {compareReference && <div className="relative min-h-32 w-full" aria-hidden="true">
      <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded bg-black/75 px-2 text-xs text-white">مرجع اصلی</span>
      <LiquidReference displacementScale={props.displacementScale} blurAmount={props.blurAmount} saturation={props.saturation} aberrationIntensity={props.aberrationIntensity} elasticity={props.elasticity} cornerRadius={props.cornerRadius} padding={props.padding} overLight={props.overLight} mode={props.mode} mouseContainer={trackScene ? scene : undefined} globalMousePos={manualPosition ? { x: mouseX, y: mouseY } : undefined} mouseOffset={manualPosition ? { x: offsetX, y: offsetY } : undefined} style={{ position: "absolute", top: "60%", left: "50%" }}>
        {label}
      </LiquidReference>
    </div>}
    <div className="relative rounded-lg bg-black/75 px-3 py-1.5 text-xs text-white" dir="ltr" role="status">
      {props.performance === "auto" ? `auto → ${diagnostic.quality} · ${diagnostic.reason} · p90 ${diagnostic.frameMs ?? "—"} ms` : `${props.performance} · manual`}
      {props.performance === "auto" && diagnostic.history.length > 0 && <div className="flex items-end gap-px h-8 mt-1" aria-label="تاریخچه زمان فریم">
        {diagnostic.history.map((value, index) => <span key={index} title={`${value} ms`} className="w-2 bg-white/75" style={{ height: `${Math.max(2, Math.min(32, value))}px` }} />)}
      </div>}
    </div>
  </div>;
}
