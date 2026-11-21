"use client";

import { Button, type ButtonProps } from "@heroui/react";
import React, { useEffect, useId, useRef, useState } from "react";
import { displacementMap, polarDisplacementMap, prominentDisplacementMap } from "./displacement-maps";
import { fragmentShaders, ShaderDisplacementGenerator } from "./shader-utils";
import { registerGlass, type GlassPerformance, useGlassDiagnostics } from "./performance";

export type LiquidMode = "standard" | "polar" | "prominent" | "shader";
export interface LiquidGlassProps {
  displacementScale?: number;
  blurAmount?: number;
  saturation?: number;
  aberrationIntensity?: number;
  elasticity?: number;
  cornerRadius?: number;
  padding?: string;
  overLight?: boolean;
  mode?: LiquidMode;
  mouseContainer?: React.RefObject<HTMLElement | null> | null;
  globalMousePos?: { x: number; y: number };
  mouseOffset?: { x: number; y: number };
  performance?: GlassPerformance;
}

export type LiquidButtonProps = ButtonProps & LiquidGlassProps;

export function LiquidButton({
  children, className, style, displacementScale = 70, blurAmount = 0.0625,
  saturation = 140, aberrationIntensity = 2, elasticity = 0.15, cornerRadius,
  padding, overLight = false, mode = "standard", mouseContainer, globalMousePos,
  mouseOffset, performance = "auto", ...buttonProps
}: LiquidButtonProps) {
  const diagnostic = useGlassDiagnostics();
  const quality = performance === "auto" ? diagnostic.quality : performance;
  const id = `liquid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const layerRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ width: 270, height: 69 });
  const [shader, setShader] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (performance !== "auto" || !layerRef.current) return;
    return registerGlass(layerRef.current);
  }, [performance]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const element = layerRef.current;
    if (!element) return;
    const update = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      setSize((prev) => prev.width === width && prev.height === height ? prev : { width, height });
    };
    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(element);
    if (!observer) window.addEventListener("resize", update);
    return () => { observer?.disconnect(); window.removeEventListener("resize", update); };
  }, []);

  useEffect(() => {
    if (quality !== "full" || mode !== "shader") return;
    try {
      const generator = new ShaderDisplacementGenerator({ width: size.width, height: size.height, fragment: fragmentShaders.liquidGlass });
      setShader(generator.updateShader());
      generator.destroy();
    } catch {
      setShader("");
    }
  }, [mode, quality, size]);

  useEffect(() => {
    const layer = layerRef.current;
    const target = mouseContainer?.current || layer?.parentElement;
    if (!layer || !target || reducedMotion || quality !== "full") return;
    if (globalMousePos && mouseOffset) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const move = (event: MouseEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rect = target.getBoundingClientRect();
        const dx = rect.width ? ((x - rect.left - rect.width / 2) / rect.width) * 100 : 0;
        const dy = rect.height ? ((y - rect.top - rect.height / 2) / rect.height) * 100 : 0;
        layer.style.setProperty("--liquid-x", `${Math.max(-100, Math.min(100, dx))}`);
        layer.style.setProperty("--liquid-y", `${Math.max(-100, Math.min(100, dy))}`);
        layer.style.setProperty("--liquid-tilt-x", `${dx * elasticity * 0.03}px`);
        layer.style.setProperty("--liquid-tilt-y", `${dy * elasticity * 0.03}px`);
      });
    };
    const leave = () => {
      layer.style.setProperty("--liquid-tilt-x", "0px");
      layer.style.setProperty("--liquid-tilt-y", "0px");
    };
    target.addEventListener("mousemove", move as EventListener);
    target.addEventListener("mouseleave", leave);
    return () => {
      target.removeEventListener("mousemove", move as EventListener);
      target.removeEventListener("mouseleave", leave);
      if (raf) cancelAnimationFrame(raf);
      leave();
    };
  }, [mouseContainer, globalMousePos, mouseOffset, elasticity, reducedMotion, quality]);

  useEffect(() => {
    const layer = layerRef.current;
    const target = mouseContainer?.current || layer?.parentElement;
    if (!layer || !target || quality !== "full" || reducedMotion) return;
    if (mouseOffset) {
      layer.style.setProperty("--liquid-x", String(mouseOffset.x));
      layer.style.setProperty("--liquid-y", String(mouseOffset.y));
    }
    if (globalMousePos) {
      const rect = target.getBoundingClientRect();
      const dx = globalMousePos.x - (rect.left + rect.width / 2);
      const dy = globalMousePos.y - (rect.top + rect.height / 2);
      layer.style.setProperty("--liquid-tilt-x", `${dx * elasticity * 0.03}px`);
      layer.style.setProperty("--liquid-tilt-y", `${dy * elasticity * 0.03}px`);
    }
  }, [globalMousePos, mouseOffset, mouseContainer, elasticity, reducedMotion, quality]);

  const map = mode === "polar" ? polarDisplacementMap : mode === "prominent" ? prominentDisplacementMap : mode === "shader" && shader ? shader : displacementMap;
  const strength = displacementScale * (overLight ? 0.5 : 1);
  const sign = mode === "shader" ? 1 : -1;
  const glassStyle = {
    "--liquid-blur": `${(overLight ? 12 : 4) + blurAmount * 32}px`,
    "--liquid-saturation": `${saturation}%`,
    "--liquid-x": mouseOffset?.x ?? 0,
    "--liquid-y": mouseOffset?.y ?? 0,
    "--liquid-filter": `url(#${id})`,
  } as React.CSSProperties;
  const buttonStyle = typeof style === "function"
    ? (values: Parameters<Extract<ButtonProps["style"], (...args: never[]) => unknown>>[0]) => ({ ...style(values), ...(cornerRadius !== undefined ? { borderRadius: cornerRadius } : {}), ...(padding !== undefined ? { padding } : {}) })
    : { ...style, ...(cornerRadius !== undefined ? { borderRadius: cornerRadius } : {}), ...(padding !== undefined ? { padding } : {}) };
  const mergedClass = typeof className === "function"
    ? (values: Parameters<typeof className>[0]) => `liquid-button ${className(values)}`
    : `liquid-button ${className ?? ""}`;

  return (
    <Button {...buttonProps} className={mergedClass} style={buttonStyle} data-liquid-quality={quality}>
      {(values) => <>
        <span ref={layerRef} className="liquid-layer" style={glassStyle} aria-hidden="true">
          {quality === "full" && <svg className="liquid-defs" aria-hidden="true" focusable="false" style={{ position: "absolute", width: 0, height: 0, margin: 0 }}>
            <defs>
              <filter id={id} x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
                <feImage href={map} width="100%" height="100%" result="map" preserveAspectRatio="xMidYMid slice" />
                <feColorMatrix in="map" type="matrix" values="0.3 0.3 0.3 0 0  0.3 0.3 0.3 0 0  0.3 0.3 0.3 0 0  0 0 0 1 0" result="intensity" />
                <feComponentTransfer in="intensity" result="mask"><feFuncA type="discrete" tableValues={`0 ${aberrationIntensity * 0.05} 1`} /></feComponentTransfer>
                <feOffset in="SourceGraphic" dx="0" dy="0" result="original" />
                <feDisplacementMap in="SourceGraphic" in2="map" scale={strength * sign} xChannelSelector="R" yChannelSelector="B" result="red" />
                <feColorMatrix in="red" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
                <feDisplacementMap in="SourceGraphic" in2="map" scale={strength * (sign - aberrationIntensity * 0.05)} xChannelSelector="R" yChannelSelector="B" result="green" />
                <feColorMatrix in="green" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
                <feDisplacementMap in="SourceGraphic" in2="map" scale={strength * (sign - aberrationIntensity * 0.1)} xChannelSelector="R" yChannelSelector="B" result="blue" />
                <feColorMatrix in="blue" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
                <feBlend in="g" in2="b" mode="screen" result="gb" /><feBlend in="r" in2="gb" mode="screen" result="rgb" />
                <feGaussianBlur in="rgb" stdDeviation={Math.max(0.1, 0.5 - aberrationIntensity * 0.1)} result="soft" />
                <feComposite in="soft" in2="mask" operator="in" result="edge" />
                <feComponentTransfer in="mask" result="inverse"><feFuncA type="table" tableValues="1 0" /></feComponentTransfer>
                <feComposite in="original" in2="inverse" operator="in" result="center" />
                <feComposite in="edge" in2="center" operator="over" />
              </filter>
            </defs>
          </svg>}
          <span className="liquid-warp" /><span className="liquid-rim" />
        </span>
        <span className="liquid-content">{typeof children === "function" ? children(values) : children}</span>
      </>}
    </Button>
  );
}
