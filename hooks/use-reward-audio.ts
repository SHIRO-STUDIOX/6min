"use client";

import { useCallback, useRef } from "react";

/**
 * useRewardAudio — هوک اختصاصی پخش افکت‌های صوتی موفقیت و پاداش
 * مجهز به سینت‌سایزر Web Audio API برای تولید نوای پیروزی درخشان بدون نیاز به دانلود فایل و بدون تاخیر شبکه،
 * همراه با پشتیبانی از فایل‌های صوتی خارجی سفارشی.
 */
export function useRewardAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);

  /**
   * دریافت یا ایجاد کانتکست Web Audio به صورت کلاینتی
   */
  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return null;

      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContextClass();
      }
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }
      return audioContextRef.current;
    } catch {
      return null;
    }
  }, []);

  /**
   * پخش ملودی فانتزی پاداش و پیروزی (Celebration Chime / Fanfare)
   * نغمه صعودی ۴ هارمونی شاداب: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
   */
  const playRewardSound = useCallback(
    (customUrl?: string) => {
      // در صورت ارائه آدرس فایل صوتی سفارشی، پخش از طریق تگ Audio
      if (customUrl) {
        try {
          const audio = new Audio(customUrl);
          audio.volume = 0.85;
          audio.play().catch(() => {});
          return;
        } catch {
          // در صورت بروز خطا، اجرای سنتز Web Audio به عنوان فال‌بک
        }
      }

      const ctx = getAudioContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        const notes = [
          { freq: 523.25, time: 0.0, dur: 0.22, gain: 0.18 }, // C5
          { freq: 659.25, time: 0.08, dur: 0.22, gain: 0.2 }, // E5
          { freq: 783.99, time: 0.16, dur: 0.25, gain: 0.22 }, // G5
          { freq: 1046.5, time: 0.24, dur: 0.55, gain: 0.25 }, // C6 (پایانی درخشان)
        ];

        notes.forEach(({ freq, time, dur, gain: targetGain }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + time);

          // پوش دامنه (Envelope) با حمله سریع و زوال نمایی نرم
          gain.gain.setValueAtTime(0.0001, now + time);
          gain.gain.exponentialRampToValueAtTime(targetGain, now + time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + time);
          osc.stop(now + time + dur + 0.05);
        });

        // افزودن نوسان‌ساز براق کمکی با اکتاو بالا جهت افکت درخشش ستاره‌ای
        const sparkleOsc = ctx.createOscillator();
        const sparkleGain = ctx.createGain();
        sparkleOsc.type = "triangle";
        sparkleOsc.frequency.setValueAtTime(1318.51, now + 0.28); // E6
        sparkleGain.gain.setValueAtTime(0.0001, now + 0.28);
        sparkleGain.gain.exponentialRampToValueAtTime(0.08, now + 0.31);
        sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
        sparkleOsc.connect(sparkleGain);
        sparkleGain.connect(ctx.destination);
        sparkleOsc.start(now + 0.28);
        sparkleOsc.stop(now + 0.7);
      } catch {
        // جلوگیری از کرش در مرورگرهای مسدودکننده اتوپلی
      }
    },
    [getAudioContext]
  );

  /**
   * پخش نغمه شارژ و افزایش استریک روزانه (Streak Flame Ignite)
   */
  const playStreakSound = useCallback(
    (customUrl?: string) => {
      if (customUrl) {
        try {
          const audio = new Audio(customUrl);
          audio.volume = 0.8;
          audio.play().catch(() => {});
          return;
        } catch {}
      }

      const ctx = getAudioContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        const streakNotes = [
          { freq: 440.0, time: 0.0, dur: 0.15, gain: 0.15 }, // A4
          { freq: 554.37, time: 0.07, dur: 0.18, gain: 0.18 }, // C#5
          { freq: 659.25, time: 0.14, dur: 0.35, gain: 0.22 }, // E5
        ];

        streakNotes.forEach(({ freq, time, dur, gain: targetGain }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + time);

          gain.gain.setValueAtTime(0.0001, now + time);
          gain.gain.exponentialRampToValueAtTime(targetGain, now + time + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + time);
          osc.stop(now + time + dur + 0.05);
        });
      } catch {}
    },
    [getAudioContext]
  );

  return {
    playRewardSound,
    playStreakSound,
  };
}
