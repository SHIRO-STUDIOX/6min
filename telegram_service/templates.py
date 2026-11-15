"""
قالب‌های پیام‌های ارسالی تلگرام با استایل رسمی، راست‌چین و کدهای کپی‌شونده.
"""

from datetime import datetime
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None  # type: ignore


def to_persian_digits(text: str) -> str:
    """تبدیل ارقام انگلیسی به ارقام فارسی برای نمایش متنی."""
    farsi_digits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
    return "".join(farsi_digits[int(ch)] if ch.isdigit() else ch for ch in str(text))


def format_otp_message(
    code: str,
    expire_minutes: int = 2,
    admin_name: str = "مدیر گرامی",
) -> str:
    """
    تولید متن پیام حاوی کد یکبار مصرف با فرمت HTML رسمی.
    نکته UX: کد داخل تگ <code> به زبان انگلیسی نگه‌داشته می‌شود تا با یک کلیک/لمس
    در تلگرام کپی شده و مستقیماً در فرم قابل پیست باشد.
    """
    # زمان فعلی به وقت تهران (یا لوکال سیستم)
    try:
        if ZoneInfo:
            tehran_tz = ZoneInfo("Asia/Tehran")
            now_str = datetime.now(tehran_tz).strftime("%H:%M:%S")
        else:
            now_str = datetime.now().strftime("%H:%M:%S")
    except Exception:
        now_str = datetime.now().strftime("%H:%M:%S")

    persian_time = to_persian_digits(now_str)
    persian_expire = to_persian_digits(str(expire_minutes))

    message = (
        "🔐 <b>کد تأیید ورود به پنل مدیریت ۶دقیقه</b>\n"
        "────────────────────\n\n"
        f"سلام {admin_name}،\n"
        "درخواست ورود به پنل ادمین ثبت شد. کد ورود یکبار مصرف شما:\n\n"
        f"👉 <code>{code}</code> 👈\n"
        "<i>(جهت کپی کردن کد، روی آن ضربه بزنید)</i>\n\n"
        f"⏱ <b>مدت اعتبار:</b> {persian_expire} دقیقه\n"
        f"🕒 <b>زمان ارسال:</b> {persian_time}\n\n"
        "⚠️ <i>این کد محرمانه است و تنها برای شما ارسال شده؛ آن را در اختیار افراد دیگر قرار ندهید.</i>\n"
        "────────────────────\n"
        "🛡 <i>سامانه احراز هویت مرکزی ۶دقیقه</i>"
    )
    return message


def format_welcome_message(chat_id: int, user_first_name: str, is_admin: bool) -> str:
    """پیام خوش‌آمدگویی دستور /start برای دریافت شناسه چت توسط مدیر."""
    persian_chat_id = to_persian_digits(str(chat_id))

    status_badge = "✅ مدیر مجاز" if is_admin else "ℹ️ کاربر ثبت‌نشده"

    return (
        "🤖 <b>سرویس ارسال کد تأیید پنل ادمین ۶دقیقه</b>\n"
        "────────────────────\n\n"
        f"سلام <b>{user_first_name}</b> عزیز!\n"
        "این ربات همانند یک پنل پیامکی، تنها وظیفه مخابره کدهای ورود یکبار مصرف مدیران را بر عهده دارد.\n\n"
        f"📌 <b>شناسه عددی تلگرام شما (Chat ID):</b>\n"
        f"👉 <code>{chat_id}</code> 👈\n\n"
        f"وضعیت حساب: <b>{status_badge}</b>\n\n"
        "💡 <b>راهنمای اتصال:</b>\n"
        "اگر مدیر سیستم هستید، مقدار شناسه بالا را در فایل <code>.env</code> پروژه در متغیر:\n"
        f"<code>TELEGRAM_ADMIN_CHAT_ID={chat_id}</code>\n"
        "قرار دهید تا کدهای ورود به این صفحه ارسال گردند.\n"
        "────────────────────"
    )
