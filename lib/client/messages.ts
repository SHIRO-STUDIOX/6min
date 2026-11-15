const messages: Record<string, string> = {
  AUTHENTICATION_FAILED: "کد یا اطلاعات ورود نامعتبر یا منقضی است.",
  AUTHENTICATION_REQUIRED: "برای ادامه دوباره وارد حساب شوید.",
  RESEND_COOLDOWN: "برای دریافت کد جدید، کمی صبر کنید.",
  RATE_LIMITED: "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.",
  SMS_PROVIDER_UNAVAILABLE:
    "سرویس پیامک در دسترس نیست. داده‌های شما حفظ شده‌اند.",
  INVALID_PASSWORD: "رمز باید بین ۱۲ تا ۱۲۸ نویسه باشد.",
  MEDIA_UNAVAILABLE: "پخش ویدیو در دسترس نیست.",
  IMPORT_CONSENT_REQUIRED: "برای انتقال سابقه مهمان، انتخاب شما لازم است.",
};
export const errorMessage = (code: string) =>
  messages[code] ?? "درخواست انجام نشد. داده‌ها حفظ شده‌اند؛ دوباره تلاش کنید.";
