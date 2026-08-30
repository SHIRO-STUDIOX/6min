"use client";

import React from "react";
import Link from "next/link";
import {
  Chip,
} from "@heroui/react";
import {
  Sparkles,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Box,
} from "lucide-react";
import { FloatingHeader } from "@/components/organisms/floating-header";

export default function Home() {
  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-accent/20 relative overflow-x-hidden">
      {/* پس‌زمینه گرافیکی ملایم */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10">
        <div className="absolute top-10 right-1/4 size-96 rounded-full bg-gradient-to-br from-accent/25 via-purple-500/15 to-transparent blur-3xl" />
        <div className="absolute top-48 left-10 size-80 rounded-full bg-gradient-to-tr from-cyan-400/20 via-emerald-400/15 to-transparent blur-3xl" />
      </div>

      {/* ۱. هدر شناور اصلی پروژه */}
      <FloatingHeader activeNavItem="home" />

      {/* ۲. بدنه معرفی و شروع توسعه اتمیک */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 flex flex-col items-center justify-center text-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <Chip variant="soft" color="accent" size="md" className="gap-1.5 px-3 py-1 font-bold">
            <Sparkles className="size-3.5" />
            پروژه آماده توسعه پایه به پایه (Atomic Design)
          </Chip>

          <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight leading-tight max-w-2xl">
            سامانه یادگیری فشرده <span className="text-accent">۶دقیقه</span>
          </h1>

          <p className="text-sm sm:text-base text-muted max-w-xl leading-relaxed mt-2">
            تمامی کامپوننت‌های زائد پاکسازی شدند. اکنون کامپوننت‌ها به نوبت و بر اساس استاندارد **Atomic Design** و اصول **HeroUI v3** توسعه داده می‌شوند.
          </p>
        </div>

        {/* کارت‌های ۳ گانه روند توسعه */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-right mt-4">
          <div className="p-5 rounded-3xl bg-default-50/80 backdrop-blur-md border border-default-200/60 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="size-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Box className="size-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">۱. توسعه اتم‌ها و مولکول‌ها</h3>
            <p className="text-xs text-muted leading-relaxed">
              پیاده‌سازی کامپوننت‌های پایه (دکمه‌ها، کارت‌ها، پلیر و کوئیز) در پوشه `components/`.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-default-50/80 backdrop-blur-md border border-default-200/60 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="size-9 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
              <Layers className="size-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">۲. تست ایزوله در سندباکس</h3>
            <p className="text-xs text-muted leading-relaxed">
              ارزیابی تعاملی در پورت ۶۰۰۶ در ویوپورت‌های موبایل، تبلت، دسکتاپ و وضعیت‌های تم.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-default-50/80 backdrop-blur-md border border-default-200/60 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="size-9 rounded-2xl bg-success/10 text-success flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">۳. ترکیب در صفحات اصلی</h3>
            <p className="text-xs text-muted leading-relaxed">
              انتقال ارگانیسم‌ها و صفحات کامل و پایدار به مسیرهای نهایی پروژه در `app/`.
            </p>
          </div>
        </div>

        {/* دکمه اقدام سریع */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
          <Link
            href="/sandbox"
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-accent-foreground font-bold text-sm shadow-xl shadow-accent/25 hover:opacity-90 transition-opacity"
          >
            <span>ورود به استودیو سندباکس (UI Sandbox)</span>
            <ArrowLeft className="size-4" />
          </Link>
        </div>
      </main>

      {/* ۳. فوتر ساده */}
      <footer className="py-4 border-t border-default-200/60 text-center text-xs text-muted">
        <span>پروژه ۶دقیقه | توسعه داده شده با HeroUI v3 و Next.js 16</span>
      </footer>
    </div>
  );
}
