"use client";

import React, { useRef, useCallback } from "react";
import { VideoCard } from "@/components/organisms/video-card";
import { VocabularyCard } from "@/components/organisms/vocabulary-card";
import { GrammarCard } from "@/components/organisms/grammar-card";
import { DictationCard } from "@/components/organisms/dictation-card";
import { PronunciationCard } from "@/components/organisms/pronunciation-card";

/**
 * صفحه اصلی سامانه یادگیری ۶دقیقه (محیط کلاس آموزشی)
 *
 * الزامات پیاده‌سازی شده:
 * ۱. چیدمان افقی و اسکرول‌پذیر ۵ کارت آموزشی به ترتیب:
 *    - کارت ۱: ویدیوی آموزشی (VideoCard)
 *    - کارت ۲: واژگان تخصصی (VocabularyCard)
 *    - کارت ۳: ساختار جمله و گرامر (GrammarCard)
 *    - کارت ۴: املای صوتی (DictationCard)
 *    - کارت ۵: تلفظ و شنیداری (PronunciationCard)
 * ۲. جهت حرکت از چپ به راست (LTR) با قرارگیری کارت ویدیو در ابتدا و سایر کارت‌ها در سمت راست آن.
 * ۳. فاصله دقیق ۶ پیکسل بین تمامی کارت‌ها (gap-[6px]).
 * ۴. استقرار اولیه کارت ویدیو در مرکز دید و مشاهده حدود ۳۰٪ از کارت دوم در سمت راست.
 * ۵. افکت Progressive Blur با ماسک گرادیانت تدریجی روی لبه سمت راست ناحیه اسکرول.
 * ۶. اسکرول افقی کاملاً روان بدون مسدودسازی تعاملات توسط لایه بلور (pointer-events-none).
 * ۷. طراحی کاملاً ریسپانسیو منطبق بر توکن‌های HeroUI و جلوگیری از هرگونه سرریز ناخواسته صفحه.
 */
export default function ClassroomPage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // اسکرول روان به کارت هدف
  const scrollToCard = useCallback((index: number) => {
    const cardEl = cardRefs.current[index];
    if (cardEl && scrollContainerRef.current) {
      cardEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, []);

  // پشتیبانی از اسکرول افقی با چرخ ماوس
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      e.currentTarget.scrollBy({
        left: e.deltaY,
        behavior: "smooth",
      });
    }
  };

  return (
    <main className="w-full h-full min-h-screen bg-background text-foreground flex flex-col items-center justify-center relative overflow-hidden select-none p-3 sm:p-6">
      {/* پس‌زمینه نوری ملایم و اتمسفریک کلاس درس */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[650px] rounded-full bg-accent/5 blur-3xl pointer-events-none" />
      </div>

      {/* ناحیه اسکرول کلاس درس (Classroom Scroll Stage) */}
      <div
        className="relative w-full max-w-[812px] mx-auto overflow-hidden rounded-3xl"
        style={
          {
            "--stage-w": "min(812px, 100vw)",
            "--card-w": "min(500px, calc((var(--stage-w) - 12px) / 1.6))",
            "--pad-x": "calc((var(--stage-w) - var(--card-w)) / 2)",
          } as React.CSSProperties
        }
      >
        {/* ۱. ردیف افقی اسکرول‌پذیر کارت‌ها با جهت چپ به راست */}
        <div
          ref={scrollContainerRef}
          onWheel={handleWheel}
          dir="ltr"
          className="w-full overflow-x-auto overflow-y-hidden scroll-smooth flex flex-row items-center gap-[6px] py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            paddingLeft: "var(--pad-x)",
            paddingRight: "var(--pad-x)",
          }}
        >
          {/* کارت ۱: ویدیوی آموزشی */}
          <div
            ref={(el) => {
              cardRefs.current[0] = el;
            }}
            dir="rtl"
            className="shrink-0 w-[var(--card-w)] max-w-[500px]"
          >
            <VideoCard
              cardLabel="کارت ۱: ویدیوی آموزشی"
              title="کلاس درس"
              description="بریم توی این ویدیو الفبا رو یادبگیریم"
              poster="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80"
              duration={180}
              onNext={() => scrollToCard(1)}
            />
          </div>

          {/* کارت ۲: تطبیق واژگان */}
          <div
            ref={(el) => {
              cardRefs.current[1] = el;
            }}
            dir="rtl"
            className="shrink-0 w-[var(--card-w)] max-w-[500px]"
          >
            <VocabularyCard
              cardLabel="کارت ۲: تطبیق واژگان"
              title="واژگان تخصصی"
              description="جفت‌های واژگان انگلیسی و فارسی را به هم وصل کنید"
              onNext={() => scrollToCard(2)}
            />
          </div>

          {/* کارت ۳: ساختار جمله و گرامر */}
          <div
            ref={(el) => {
              cardRefs.current[2] = el;
            }}
            dir="rtl"
            className="shrink-0 w-[var(--card-w)] max-w-[500px]"
          >
            <GrammarCard
              cardLabel="کارت ۳: ساختار جمله و گرامر"
              title="پازل کلمات و گرامر"
              description="کلمات انگلیسی را برای ساخت جمله صحیح به ترتیب لمس کنید"
              onNext={() => scrollToCard(3)}
            />
          </div>

          {/* کارت ۴: املای سریع صوتی */}
          <div
            ref={(el) => {
              cardRefs.current[3] = el;
            }}
            dir="rtl"
            className="shrink-0 w-[var(--card-w)] max-w-[500px]"
          >
            <DictationCard
              cardLabel="کارت ۴: املای سریع صوتی"
              title="املای سریع صوتی"
              description="به تلفظ صوتی گوش دهید و عبارت صحیح را تایپ کنید"
              onNext={() => scrollToCard(4)}
            />
          </div>

          {/* کارت ۵: تلفظ و شنیداری */}
          <div
            ref={(el) => {
              cardRefs.current[4] = el;
            }}
            dir="rtl"
            className="shrink-0 w-[var(--card-w)] max-w-[500px]"
          >
            <PronunciationCard
              cardLabel="کارت ۵: تلفظ و شنیداری"
              title="کارت تلفظ و شنیداری"
              description="به تلفظ صوتی گوش دهید و سپس واژه را با صدای واضح بیان کنید"
              nextButtonText="اتمام جلسه"
              onNext={() => scrollToCard(0)}
            />
          </div>
        </div>

        {/* ۲. افکت Progressive Blur روی لبه سمت راست ناحیه اسکرول */}
        <div
          className="absolute top-0 bottom-0 right-0 w-24 sm:w-32 md:w-40 pointer-events-none z-30 select-none overflow-hidden"
          aria-hidden="true"
        >
          {/* بلور تدریجی مبتنی بر ماسک گرادیانت */}
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              maskImage:
                "linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.25) 30%, rgba(0, 0, 0, 0.7) 65%, black 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.25) 30%, rgba(0, 0, 0, 0.7) 65%, black 100%)",
            }}
          />
          {/* گرادیانت نرم رنگی هماهنگ با پس‌زمینه تم */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/25 to-background/90" />
        </div>
      </div>
    </main>
  );
}
