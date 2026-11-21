"use client";

import React, { useEffect, useRef } from "react";
import {
  Search,
  X,
  Star,
  Layers,
  Sparkles,
  LayoutGrid,
  Box,
  Component,
  ChevronRight,
  Hash,
} from "lucide-react";
import { Chip, Input, InputGroup, Kbd } from "@heroui/react";
import { useSandbox } from "./sandbox-context";
import { ComponentCategory } from "./sandbox-types";

const categoryTabs: { id: ComponentCategory; label: string; icon: any }[] = [
  { id: "all", label: "همه", icon: Layers },
  { id: "molecules", label: "مولکول‌ها و فرم‌ها", icon: Box },
  { id: "bento", label: "تایل‌های بنتو", icon: LayoutGrid },
  { id: "atoms", label: "اتم‌های پایه HeroUI", icon: Component },
  { id: "organisms", label: "ارگانیسم‌ها", icon: Sparkles },
];

export function SandboxSidebarCatalog() {
  const {
    selectedId,
    setSelectedId,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    favorites,
    toggleFavorite,
    filteredComponents,
    totalCount,
  } = useSandbox();

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <aside className="w-full h-full border-l border-default-200/70 bg-background/95 backdrop-blur-xl flex flex-col shrink-0 select-none z-30 overflow-hidden">
      {/* 1. سربرگ کاتالوگ و سرچ */}
      <div className="p-3.5 border-b border-default-200/60 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-accent" />
            <h2 className="text-xs font-black text-foreground">کاتالوگ کامپوننت‌ها</h2>
          </div>
          <Chip size="sm" variant="soft" color="accent" className="h-5 text-[10px] font-bold font-tabular">
            {filteredComponents.length} از {totalCount}
          </Chip>
        </div>

        {/* فیلد جستجو */}
        <InputGroup className="w-full">
          <InputGroup.Prefix className="text-muted px-2.5">
            <Search className="size-3.5" />
          </InputGroup.Prefix>
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو بر اساس نام یا ویژگی..."
            className="w-full py-1.5 px-2 bg-default-100/70 rounded-xl text-xs placeholder:text-muted/70 focus:outline-none"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="px-2 text-muted hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <InputGroup.Suffix className="px-2">
              <Kbd className="text-[9px] py-0.5 px-1 bg-default-200/60 text-muted">⌘K</Kbd>
            </InputGroup.Suffix>
          )}
        </InputGroup>

        {/* تب‌های دسته‌بندی */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
          {categoryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-accent text-accent-foreground font-bold shadow-xs"
                    : "bg-default-100/60 text-muted hover:text-foreground hover:bg-default-100"
                }`}
              >
                <Icon className="size-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. لیست کامپوننت‌ها با اسکرول نرم */}
      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-1.5">
        {filteredComponents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center gap-2 text-muted">
            <Search className="size-8 text-muted/40 stroke-1" />
            <p className="text-xs font-medium">کامپوننتی با این مشخصات یافت نشد.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className="text-xs text-accent underline mt-1 cursor-pointer"
            >
              پاک کردن فیلترها
            </button>
          </div>
        ) : (
          filteredComponents.map((comp) => {
            const isSelected = selectedId === comp.id;
            const isFav = favorites.includes(comp.id);

            return (
              <div
                key={comp.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedId(comp.id); } }}
                onClick={() => setSelectedId(comp.id)}
                className={`group relative p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col gap-1.5 ${
                  isSelected
                    ? "bg-accent/10 border-accent/60 shadow-xs ring-1 ring-accent/30"
                    : "bg-default-50/50 hover:bg-default-100/70 border-default-200/50 hover:border-default-300/80"
                }`}
              >
                {/* ردیف بالا: نام و ستاره */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className={`text-xs font-bold truncate ${
                        isSelected ? "text-accent" : "text-foreground group-hover:text-accent"
                      }`}
                    >
                      {comp.persianName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(comp.id);
                      }}
                      className={`p-1 rounded-lg transition-colors cursor-pointer ${
                        isFav
                          ? "text-amber-500 hover:text-amber-600"
                          : "text-muted/40 hover:text-muted opacity-0 group-hover:opacity-100"
                      }`}
                      title={isFav ? "حذف از نشان‌شده‌ها" : "نشان کردن کامپوننت"}
                    >
                      <Star className={`size-3.5 ${isFav ? "fill-amber-500" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* ردیف وسط: نام انگلیسی و مسیر */}
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span className="font-mono text-[10px] text-muted/80">{`<${comp.name} />`}</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-default-200/50 text-muted-foreground font-semibold">
                    {comp.category}
                  </span>
                </div>

                {/* ردیف پایین: برچسب‌ها / تگ‌ها */}
                {comp.tags && comp.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {comp.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] px-1.5 py-0.2 rounded-md bg-default-200/40 text-muted/80"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. پاورقی کاتالوگ: مسیر جاری */}
      <div className="p-2.5 border-t border-default-200/60 bg-default-100/40 flex items-center justify-between text-[10px] text-muted">
        <span className="truncate max-w-[200px]" dir="ltr">
          {filteredComponents.find((c) => c.id === selectedId)?.filePath}
        </span>
        <span className="font-bold">Next.js + HeroUI</span>
      </div>
    </aside>
  );
}
