"""
هسته مدیریت ربات تلگرام با Aiogram 3 و قابلیت ارسال کدهای ورود به همراه پراکسی.
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime

from aiogram import Bot, Dispatcher, types
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.filters import CommandStart, Command
from aiogram.exceptions import TelegramAPIError

from .config import settings
from .templates import format_otp_message, format_welcome_message

logger = logging.getLogger("telegram_service.bot")

# نمونه‌های سراسری ربات و دیسپچر
_bot_instance: Optional[Bot] = None
dp = Dispatcher()


def get_bot() -> Optional[Bot]:
    """دریافت یا ساخت نمونه ربات با اعمال تنظیمات پراکسی."""
    global _bot_instance
    if _bot_instance is not None:
        return _bot_instance

    if not settings.is_bot_configured:
        logger.warning("توکن ربات تلگرام در تنظیمات (.env) هنوز تعریف نشده است.")
        return None

    session: Optional[AiohttpSession] = None
    if settings.TELEGRAM_PROXY_URL:
        logger.info(f"اتصال ربات تلگرام از طریق پراکسی: {settings.TELEGRAM_PROXY_URL}")
        session = AiohttpSession(proxy=settings.TELEGRAM_PROXY_URL)

    _bot_instance = Bot(
        token=settings.TELEGRAM_BOT_TOKEN,
        session=session,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    return _bot_instance


async def close_bot() -> None:
    """بستن نشست ربات در هنگام خروج."""
    global _bot_instance
    if _bot_instance is not None:
        try:
            await _bot_instance.session.close()
        except Exception as e:
            logger.error(f"خطا در بستن نشست ربات: {e}")
        _bot_instance = None


async def send_otp_message(
    chat_id: int | str,
    code: str,
    expire_minutes: Optional[int] = None,
    admin_name: str = "مدیر گرامی",
) -> Dict[str, Any]:
    """
    ارسال کد تأیید ورود به شناسه تلگرام مشخص شده (شبیه پنل اس‌ام‌اس).
    خروجی به صورت یک دیکشنری ساخت‌یافته حاوی وضعیت ارسال است.
    """
    bot = get_bot()
    if bot is None:
        return {
            "success": False,
            "error": "ربات تلگرام به دلیل عدم تنظیم توکن در .env آماده نیست.",
            "error_code": "BOT_NOT_CONFIGURED",
        }

    exp_min = expire_minutes or settings.OTP_EXPIRE_MINUTES
    message_text = format_otp_message(
        code=code,
        expire_minutes=exp_min,
        admin_name=admin_name,
    )

    try:
        sent_msg = await bot.send_message(
            chat_id=chat_id,
            text=message_text,
            parse_mode=ParseMode.HTML,
        )
        return {
            "success": True,
            "message_id": sent_msg.message_id,
            "chat_id": chat_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    except TelegramAPIError as e:
        logger.error(f"خطای تلگرام در ارسال کد به {chat_id}: {e}")
        return {
            "success": False,
            "error": f"خطای سرور تلگرام: {str(e)}",
            "error_code": "TELEGRAM_API_ERROR",
        }
    except Exception as e:
        logger.error(f"خطای غیرمنتظره در ارسال پیام تلگرام: {e}")
        return {
            "success": False,
            "error": f"خطای ناشناخته: {str(e)}",
            "error_code": "INTERNAL_ERROR",
        }


# =====================================================================
# هندلرهای دستورات تلگرام
# =====================================================================


@dp.message(CommandStart())
async def handle_start(message: types.Message):
    """هندلر دستور /start برای اعلام شناسه چت به مدیر."""
    user_id = message.from_user.id if message.from_user else message.chat.id
    user_name = message.from_user.first_name if message.from_user else "همکار"

    is_admin = False
    if settings.TELEGRAM_ADMIN_CHAT_ID:
        is_admin = str(settings.TELEGRAM_ADMIN_CHAT_ID) == str(user_id)

    reply_text = format_welcome_message(
        chat_id=user_id,
        user_first_name=user_name,
        is_admin=is_admin,
    )
    await message.answer(reply_text, parse_mode=ParseMode.HTML)


@dp.message(Command("id"))
async def handle_id(message: types.Message):
    """هندلر سریع دستور /id برای کپی راحت Chat ID."""
    user_id = message.from_user.id if message.from_user else message.chat.id
    await message.answer(
        f"📌 شناسه عددی شما: <code>{user_id}</code>",
        parse_mode=ParseMode.HTML,
    )


@dp.message(Command("status"))
async def handle_status(message: types.Message):
    """نمایش وضعیت سلامت و اتصال ربات."""
    user_id = message.from_user.id if message.from_user else message.chat.id
    is_admin = str(settings.TELEGRAM_ADMIN_CHAT_ID) == str(user_id) if settings.TELEGRAM_ADMIN_CHAT_ID else False

    status_text = (
        "📊 <b>وضعیت سرویس ارسال کد ۶دقیقه</b>\n"
        "────────────────────\n"
        "• وضعیت اتصال به سرور تلگرام: 🟢 متصل\n"
        f"• وضعیت شناسه ادمین: {'🟢 تعریف شده' if settings.is_admin_configured else '🔴 تعریف نشده'}\n"
        f"• حساب شما ادمین است؟ {'✅ بله' if is_admin else '❌ خیر'}\n"
        f"• وضعیت پراکسی: {'فعال' if settings.TELEGRAM_PROXY_URL else 'غیرفعال (مستقیم)'}\n"
        "────────────────────"
    )
    await message.answer(status_text, parse_mode=ParseMode.HTML)
