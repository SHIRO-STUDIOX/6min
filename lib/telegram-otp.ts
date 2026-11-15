/**
 * کلاینت ارتباط با وب‌سرویس پیامکی تلگرام جهت ارسال کدهای ورود ادمین.
 * این تابع می‌تواند در Server Actionها یا Route Handlerهای Next.js فراخوانی شود.
 */

export interface SendTelegramOtpOptions {
  code: string;
  chatId?: string | number;
  adminName?: string;
  expireMinutes?: number;
  force?: boolean;
}

export interface SendTelegramOtpResult {
  success: boolean;
  message: string;
  chatId?: string;
  messageId?: number;
  timestamp?: string;
  error?: string;
}

export async function sendAdminTelegramOtp(
  options: SendTelegramOtpOptions | string
): Promise<SendTelegramOtpResult> {
  const payload: SendTelegramOtpOptions =
    typeof options === "string" ? { code: options } : options;

  const serviceHost =
    process.env.TELEGRAM_SERVICE_HOST || "127.0.0.1";
  const servicePort =
    process.env.TELEGRAM_SERVICE_PORT || "8000";
  const apiKey =
    process.env.TELEGRAM_SERVICE_API_KEY || "sixmin_secret_otp_token_change_me";

  const url = `http://${serviceHost}:${servicePort}/api/v1/send-otp`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        code: payload.code,
        chat_id: payload.chatId ? String(payload.chatId) : undefined,
        admin_name: payload.adminName || "مدیر گرامی",
        expire_minutes: payload.expireMinutes,
        force: payload.force || false,
      }),
      // عدم کش کردن در سرور Next.js
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: data.detail || "خطا در برقراری ارتباط با وب‌سرویس تلگرام",
        error: data.detail,
      };
    }

    return {
      success: true,
      message: data.message,
      chatId: data.chat_id,
      messageId: data.message_id,
      timestamp: data.timestamp,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "عدم دسترسی به سرویس پایتونی تلگرام (آیا سرویس اجرا شده است؟)",
      error: error?.message || String(error),
    };
  }
}
