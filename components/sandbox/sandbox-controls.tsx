"use client";

import React from "react";
import {
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  Type,
  ListFilter,
  Layers,
  Info,
} from "lucide-react";
import {
  Switch,
  Input,
  Button,
  Chip,
  Label,
  Description,
} from "@heroui/react";
import { useSandbox } from "./sandbox-context";
import { PropDefinition } from "./sandbox-types";

// Persian Mock text samples
const persianPresets = [
  "ثبت و ادامه مسیر",
  "دریافت کد تایید",
  "دوره تخصصی هوش مصنوعی",
  "شماره همراه نامعتبر است",
  "ارسال مجدد پیامک",
];

export function SandboxControls() {
  const {
    selectedComponent,
    componentProps,
    updateProp,
    resetProps,
    applyPreset,
  } = useSandbox();

  const { propDefinitions, presets } = selectedComponent;

  return (
    <aside className="w-80 h-full border-r border-default-200/70 bg-background/95 backdrop-blur-xl flex flex-col shrink-0 select-none z-30 overflow-hidden">
      {/* 1. سربرگ پنل کنترل */}
      <div className="p-3.5 border-b border-default-200/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-accent" />
          <h2 className="text-xs font-black text-foreground">کنترل پراپ‌ها و وضعیت</h2>
        </div>

        <button
          type="button"
          onClick={resetProps}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-muted hover:text-foreground hover:bg-default-100 transition-colors cursor-pointer"
          title="بازنشانی تمام پراپ‌ها به حالت پیش‌فرض"
        >
          <RotateCcw className="size-3" />
          <span>پیش‌فرض</span>
        </button>
      </div>

      {/* 2. پریست‌های سریع وضعیت (Quick Presets) */}
      {presets && presets.length > 0 && (
        <div className="p-3 border-b border-default-200/50 bg-default-100/30 flex flex-col gap-2">
          <span className="text-[10px] font-bold text-muted">پریست‌های آماده وضعیت:</span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset.props)}
                className="px-2 py-1 rounded-xl text-[11px] font-medium bg-default-200/60 hover:bg-accent/15 hover:text-accent border border-default-300/50 hover:border-accent/40 transition-all cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. لیست کنترل‌های داینامیک */}
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-4">
        {propDefinitions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center gap-3 my-auto bg-default-50 rounded-2xl border border-default-200/60 text-muted">
            <div className="p-3 rounded-2xl bg-accent/10 text-accent">
              <Sparkles className="size-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-bold text-foreground">{selectedComponent.persianName}</h4>
              <p className="text-[11px] leading-relaxed text-muted">
                این کامپوننت دارای منطق داخلی و استیت‌های تعاملی کامل است و به صورت خودکار با کاربر در بوم مرکزی تعامل می‌کند.
              </p>
            </div>
            <div className="text-[10px] font-mono bg-default-200/60 px-2 py-1 rounded text-muted-foreground" dir="ltr">
              {selectedComponent.filePath}
            </div>
          </div>
        ) : (
          propDefinitions.map((propDef: PropDefinition) => {
            const currentValue = componentProps[propDef.name] ?? propDef.defaultValue;

            return (
              <div
                key={propDef.name}
                className="p-3 rounded-2xl bg-default-50/70 border border-default-200/60 flex flex-col gap-2.5"
              >
                {/* ردیف برچسب و نام فنی */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{propDef.label}</span>
                  <span className="font-mono text-[10px] text-muted">{propDef.name}</span>
                </div>

                {/* انواع کنترل‌ها */}
                {/* الف) بولین (Switch) */}
                {propDef.type === "boolean" && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted">
                      {currentValue ? "فعال (True)" : "غیرفعال (False)"}
                    </span>
                    <Switch
                      isSelected={Boolean(currentValue)}
                      onChange={(val) => updateProp(propDef.name, val)}
                      aria-label={propDef.label}
                    />
                  </div>
                )}

                {/* ب) لیست گزینه‌ها (Select) */}
                {propDef.type === "select" && propDef.options && (
                  <div className="flex flex-col gap-1.5">
                    <select
                      value={String(currentValue)}
                      onChange={(e) => updateProp(propDef.name, e.target.value)}
                      className="w-full py-1.5 px-2.5 rounded-xl bg-background border border-default-200 text-xs font-medium text-foreground focus:outline-none focus:border-accent"
                    >
                      {propDef.options.map((opt) => (
                        <option key={String(opt.value)} value={String(opt.value)}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ج) ورودی متنی (String) */}
                {propDef.type === "string" && (
                  <div className="flex flex-col gap-2">
                    <Input
                      value={String(currentValue || "")}
                      onChange={(e) => updateProp(propDef.name, e.target.value)}
                      placeholder={propDef.placeholder || "مقدار متنی را وارد کنید..."}
                      className="w-full py-1.5 px-2.5 rounded-xl bg-background border border-default-200 text-xs"
                    />

                    {/* نمونه‌های متنی فارسی */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                      <span className="text-[9px] text-muted shrink-0">نمونه:</span>
                      {persianPresets.slice(0, 2).map((sample) => (
                        <button
                          key={sample}
                          type="button"
                          onClick={() => updateProp(propDef.name, sample)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-default-200/50 hover:bg-accent/15 hover:text-accent text-muted whitespace-nowrap cursor-pointer"
                        >
                          {sample}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* د) ورودی عددی (Number) */}
                {propDef.type === "number" && (
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={propDef.min ?? 0}
                      max={propDef.max ?? 100}
                      step={propDef.step ?? 1}
                      value={Number(currentValue) || 0}
                      onChange={(e) => updateProp(propDef.name, Number(e.target.value))}
                      className="flex-1 accent-accent"
                    />
                    <span className="text-xs font-bold font-tabular min-w-[32px] text-center">
                      {currentValue}
                    </span>
                  </div>
                )}

                {/* توضیحات کمکی پراپ */}
                {propDef.description && (
                  <span className="text-[10px] text-muted/80">{propDef.description}</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. پاورقی پنل کنترل: اطلاعات سریع */}
      <div className="p-3 border-t border-default-200/60 bg-default-100/30 flex items-center justify-between text-[11px]">
        <span className="text-muted">تعداد پراپ‌های فعال:</span>
        <span className="font-bold text-accent font-tabular">
          {Object.keys(componentProps).length}
        </span>
      </div>
    </aside>
  );
}
