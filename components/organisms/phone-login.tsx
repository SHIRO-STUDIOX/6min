"use client";

import React, { useState } from "react";
import {
  Button,
  TextField,
  InputGroup,
  Label,
  FieldError,
  Link,
  Spinner,
} from "@heroui/react";
import { Phone, ShieldCheck } from "lucide-react";

export interface PhoneLoginProps {
  title?: string;
  description?: string;
  buttonText?: string;
  phonePlaceholder?: string;
  defaultValue?: string;
  isLoading?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  onSubmit?: (phone: string) => void;
  onPhoneChange?: (phone: string) => void;
}

// تبدیل ارقام انگلیسی به فارسی
export function toPersianDigits(str: string): string {
  const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return str.replace(/[0-9]/g, (w) => farsiDigits[+w]);
}

// تبدیل ارقام فارسی یا عربی به انگلیسی برای پردازش
export function toEnglishDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

export function PhoneLogin({
  title = "سیکسمین",
  description = "برای ورود یا ثبت‌نام، شماره موبایل خود را وارد کنید",
  buttonText = "دریافت کد تأیید",
  phonePlaceholder = "۰۹۱۲۳۴۵۶۷۸۹",
  defaultValue = "",
  isLoading = false,
  isInvalid = false,
  errorMessage = "شماره موبایل وارد شده معتبر نمی‌باشد (مثال: ۰۹۱۲۳۴۵۶۷۸۹)",
  onSubmit,
  onPhoneChange,
}: PhoneLoginProps) {
  const [phoneNumber, setPhoneNumber] = useState<string>(defaultValue);
  const [touched, setTouched] = useState<boolean>(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const englishVal = toEnglishDigits(rawVal).replace(/\D/g, "");
    // حداکثر ۱۱ رقم برای شماره‌های موبایل ایران
    const limitedVal = englishVal.slice(0, 11);
    setPhoneNumber(limitedVal);
    if (!touched) setTouched(true);
    if (onPhoneChange) onPhoneChange(limitedVal);
  };

  const isPhoneValid =
    phoneNumber.length === 11 && phoneNumber.startsWith("09");

  const hasError = isInvalid || (touched && phoneNumber.length > 0 && !isPhoneValid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (isPhoneValid && onSubmit) {
      onSubmit(phoneNumber);
    }
  };

  return (
    <div className="w-full max-w-sm flex flex-col items-center text-center select-none animate-in fade-in duration-300">
      {/* ۱. عنوان برند سیکسمین */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-xs sm:text-sm text-muted max-w-xs leading-relaxed font-medium">
          {description}
        </p>
      </div>

      {/* ۲. فرم ورودی شماره موبایل با HeroUI v3 Compound Components */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        <TextField
          name="phone"
          isInvalid={hasError}
          className="w-full flex flex-col gap-1.5 text-start"
        >
          <Label className="text-xs font-bold text-foreground ps-1">
            شماره موبایل
          </Label>

          <InputGroup
            variant="secondary"
            className="w-full h-12 px-3 rounded-full border border-separator/60 transition-all flex items-center justify-between"
          >
            {/* پیشوند: آیکون گوشی و کد کشور */}
            <InputGroup.Prefix className="pe-1 flex items-center gap-1.5 text-muted">
              <Phone className="size-4" />
              <span className="text-xs font-mono font-bold" dir="ltr">
                +۹۸
              </span>
            </InputGroup.Prefix>

            {/* ورودی شماره تلفن */}
            <InputGroup.Input
              id="phone-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder={phonePlaceholder}
              value={toPersianDigits(phoneNumber)}
              onChange={handleInputChange}
              onBlur={() => setTouched(true)}
              className="flex-1 w-full bg-transparent text-center font-mono font-bold text-sm text-foreground placeholder:text-muted/60 focus:outline-hidden"
              dir="ltr"
            />

            {/* پسوند: نشانگر وضعیت اعتبارسنجی */}
            <InputGroup.Suffix className="ps-1 flex items-center justify-center">
              {isPhoneValid && (
                <div className="size-5 rounded-full bg-success/20 text-success flex items-center justify-center animate-in zoom-in-75">
                  <ShieldCheck className="size-3.5" />
                </div>
              )}
            </InputGroup.Suffix>
          </InputGroup>

          {/* پیام خطای استاندارد با FieldError */}
          <FieldError className="text-[11px] text-danger font-medium ps-2 animate-in fade-in slide-in-from-top-1">
            {errorMessage}
          </FieldError>
        </TextField>

        {/* ۳. دکمه ورود با isPending رسمی */}
        <Button
          type="submit"
          variant="primary"
          isPending={isLoading}
          isDisabled={touched && !isPhoneValid}
          className="w-full h-12 rounded-full font-bold text-sm shadow-lg shadow-accent/25 hover:shadow-accent/40 active:scale-[0.985] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {({ isPending }) => (
            <>
              {isPending && <Spinner size="sm" color="current" />}
              <span>{isPending ? "در حال ارسال کد..." : buttonText}</span>
            </>
          )}
        </Button>
      </form>

      {/* ۴. متن قوانین و حریم خصوصی با HeroUI Link */}
      <div className="mt-8 text-center text-[11px] text-muted leading-relaxed max-w-xs">
        با ورود یا ثبت‌نام،{" "}
        <Link href="#" className="text-[11px] text-accent font-medium hover:underline">
          قوانین و مقررات
        </Link>{" "}
        و{" "}
        <Link href="#" className="text-[11px] text-accent font-medium hover:underline">
          حریم خصوصی
        </Link>{" "}
        سیکسمین را می‌پذیرید.
      </div>
    </div>
  );
}
