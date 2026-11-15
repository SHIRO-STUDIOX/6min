"""
ابزار خط فرمان (CLI) جهت تست سریع ارسال کد و بررسی وضعیت اتصال ربات.
"""

import sys
import asyncio
import random
import argparse

# تنظیم یونیکد برای خروجی بدون خطا در ویندوز
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from .config import settings
from .bot import send_otp_message, get_bot, close_bot


def parse_args():
    parser = argparse.ArgumentParser(
        description="ابزار خط فرمان تست سرویس کد ورود ادمین ۶دقیقه",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", help="دستورات در دسترس")

    # دستور ارسال کد
    send_parser = subparsers.add_parser("send", help="ارسال کد به ادمین")
    send_parser.add_argument("code", nargs="?", default=None, help="کد عددی (در صورت خالی بودن رندوم تولید می‌شود)")
    send_parser.add_argument("--chat-id", default=None, help="شناسه چت مقصد سفارشی")
    send_parser.add_argument("--expire", type=int, default=None, help="مدت اعتبار بر حسب دقیقه")

    # دستور بررسی وضعیت
    subparsers.add_parser("status", help="بررسی وضعیت تنظیمات و اتصال به تلگرام")

    return parser.parse_args()


async def do_send(code: str, chat_id: str = None, expire: int = None):
    target_chat = chat_id or settings.TELEGRAM_ADMIN_CHAT_ID
    if not target_chat:
        print("❌ خطا: شناسه چت ادمین مشخص نیست. لطفاً در .env مقدار TELEGRAM_ADMIN_CHAT_ID را وارد کنید یا با --chat-id مشخص نمایید.")
        return

    if not code:
        code = str(random.randint(100000, 999999))
        print(f"🎲 کد تصادفی تولید شد: {code}")

    print(f"⏳ در حال ارسال کد {code} به شناسه تلگرام {target_chat}...")
    result = await send_otp_message(
        chat_id=target_chat,
        code=code,
        expire_minutes=expire,
    )

    if result.get("success"):
        print(f"✅ کد با موفقیت ارسال شد! شناسه پیام: {result.get('message_id')}")
    else:
        print(f"❌ ارسال ناموفق بود: {result.get('error')}")


async def do_status():
    print("=" * 50)
    print("  وضعیت پیکربندی سرویس تلگرام ۶دقیقه")
    print("=" * 50)
    print(f"• فایل تنظیمات: {settings.model_config.get('env_file')}")
    print(f"• توکن ربات: {'✅ مقداردهی شده' if settings.is_bot_configured else '❌ خالی یا پیش‌فرض'}")
    print(f"• شناسه چت ادمین: {settings.TELEGRAM_ADMIN_CHAT_ID or '❌ مقداردهی نشده'}")
    print(f"• آدرس وب‌سرویس: http://{settings.TELEGRAM_SERVICE_HOST}:{settings.TELEGRAM_SERVICE_PORT}")
    print(f"• کلید امنیتی API: {'✅ فعال' if settings.TELEGRAM_SERVICE_API_KEY else '❌ غیرفعال'}")
    print(f"• پراکسی: {settings.TELEGRAM_PROXY_URL or '❌ استفاده نمی‌شود (اتصال مستقیم)'}")
    print(f"• زمان اعتبار کد: {settings.OTP_EXPIRE_MINUTES} دقیقه")
    print(f"• کول‌داون ارسال: {settings.OTP_COOLDOWN_SECONDS} ثانیه")
    print("=" * 50)

    if settings.is_bot_configured:
        print("⏳ در حال بررسی ارتباط با سرور تلگرام...")
        bot = get_bot()
        try:
            me = await bot.get_me()
            print(f"🟢 ارتباط موفق! اطلاعات ربات: @{me.username} ({me.first_name})")
        except Exception as e:
            print(f"🔴 خطا در دریافت مشخصات ربات از تلگرام: {e}")
            if not settings.TELEGRAM_PROXY_URL:
                print("💡 پیشنهاد: با توجه به وضعیت اینترنت ایران، در صورت خطای Connection/Timeout، یک پراکسی در TELEGRAM_PROXY_URL تنظیم فرمایید.")


async def main_async():
    args = parse_args()
    try:
        if args.command == "send":
            await do_send(args.code, args.chat_id, args.expire)
        elif args.command == "status":
            await do_status()
        else:
            await do_status()
    finally:
        await close_bot()


def main():
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
