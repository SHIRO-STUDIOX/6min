"""
لانچر اصلی سرویس تلگرام جهت اجرای همزمان سرور وب‌سرویس پیامکی و ربات تلگرام.
"""

import sys
import asyncio
import logging
import uvicorn

# تنظیم انکودینگ UTF-8 برای کنسول ویندوز
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from .config import settings
from .server import app
from .bot import get_bot, dp, close_bot

# پیکربندی لاگر
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("telegram_service")


async def run_fastapi_server(server: uvicorn.Server):
    """اجرای ناهمگام وب‌سرور Uvicorn."""
    logger.info(
        f"🚀 وب‌سرویس پیامکی تلگرام روی http://{settings.TELEGRAM_SERVICE_HOST}:{settings.TELEGRAM_SERVICE_PORT} فعال شد."
    )
    await server.serve()


async def run_bot_polling():
    """اجرای چرخه دریافت پیام‌های ربات تلگرام (Polling)."""
    bot = get_bot()
    if bot is None:
        logger.warning(
            "⚠️ توکن ربات تلگرام در فایل .env یافت نشد. بخش ربات تلگرام در حالت تعلیق است."
            "\n👉 لطفاً TELEGRAM_BOT_TOKEN را در فایل .env در روت پروژه مقداردهی نمایید."
        )
        # منتظر ماندن برای جلوگیری از خروج تسک
        while True:
            await asyncio.sleep(3600)

    try:
        logger.info("🤖 ربات تلگرام با موفقیت متصل شد و در حال گوش دادن به پیام‌هاست...")
        # حذف پیام‌های قبلی انباشته شده و شروع پولینگ
        await bot.delete_webhook(drop_pending_updates=True)
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"❌ خطا در اتصال یا اجرای ربات تلگرام: {e}")
        if not settings.TELEGRAM_PROXY_URL:
            logger.info("💡 نکته: در صورت فیلتر بودن تلگرام، می‌توانید TELEGRAM_PROXY_URL را در .env تنظیم نمایید.")


async def main():
    """نقطه ورود اصلی اجرای ناهمگام هر دو سرویس به صورت موازی."""
    logger.info("====================================================")
    logger.info("  سرویس ارسال کد تأیید ورود ادمین ۶دقیقه (Telegram OTP) ")
    logger.info("====================================================")
    logger.info(f"پیکربندی توکن ربات: {'تایید شد ✅' if settings.is_bot_configured else 'تنظیم نشده ⚠️'}")
    logger.info(f"پیکربندی چت ادمین: {'تایید شد ✅' if settings.is_admin_configured else 'تنظیم نشده ⚠️'}")
    if settings.TELEGRAM_PROXY_URL:
        logger.info(f"پراکسی تلگرام: {settings.TELEGRAM_PROXY_URL}")

    # تنظیم کانفیگ یودیکورن
    config = uvicorn.Config(
        app=app,
        host=settings.TELEGRAM_SERVICE_HOST,
        port=settings.TELEGRAM_SERVICE_PORT,
        log_level="info",
        loop="asyncio",
    )
    server = uvicorn.Server(config)

    try:
        # اجرای موازی هر دو تسک
        await asyncio.gather(
            run_fastapi_server(server),
            run_bot_polling(),
        )
    except asyncio.CancelledError:
        logger.info("دریافت درخواست توقف سرویس...")
    finally:
        logger.info("در حال بستن نشست‌های فعال...")
        await close_bot()
        logger.info("سرویس با موفقیت خاموش شد.")


def start():
    """تابع کمکی جهت فراخوانی مستقیم از خط فرمان."""
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\nسرویس با دستور کاربر متوقف شد.")
        sys.exit(0)


if __name__ == "__main__":
    start()
