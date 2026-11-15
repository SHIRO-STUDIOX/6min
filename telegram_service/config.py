"""
ماژول پیکربندی و بارگذاری متغیرهای محیطی از فایل مرکزی .env در روت پروژه.
"""

from pathlib import Path
from typing import Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# پیدا کردن مسیر فایل روت .env به صورت پایدار و مستقل از مسیر جاری فراخوانی
ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_FILE_PATH = ROOT_DIR / ".env"


class Settings(BaseSettings):
    """تنظیمات کلی سرویس ربات تلگرام و اندپوینت‌های پیامکی."""

    # توکن ربات تلگرام
    TELEGRAM_BOT_TOKEN: str = Field(
        default="",
        description="توکن ربات تلگرام از BotFather",
    )

    # شناسه چت ادمین (Chat ID)
    TELEGRAM_ADMIN_CHAT_ID: Optional[str] = Field(
        default=None,
        description="شناسه عددی چت تلگرام مدیر اصلی پروژه",
    )

    # آدرس هاست و پورت اجرای سرویس
    TELEGRAM_SERVICE_HOST: str = Field(
        default="127.0.0.1",
        description="آدرس هاست وب‌سرویس پیامکی",
    )
    TELEGRAM_SERVICE_PORT: int = Field(
        default=8000,
        description="پورت وب‌سرویس پیامکی",
    )

    # کلید امنیتی جهت احراز هویت درخواست‌های ورودی به API
    TELEGRAM_SERVICE_API_KEY: str = Field(
        default="sixmin_secret_otp_token_change_me",
        description="کلید امنیتی هدر X-API-Key",
    )

    # پراکسی برای عبور از فیلترینگ تلگرام (اختیاری)
    TELEGRAM_PROXY_URL: Optional[str] = Field(
        default=None,
        description="آدرس پراکسی نظیر socks5://127.0.0.1:10808 یا http://127.0.0.1:10809",
    )

    # تنظیمات OTP
    OTP_EXPIRE_MINUTES: int = Field(
        default=2,
        description="مدت زمان اعتبار کد بر حسب دقیقه",
    )
    OTP_COOLDOWN_SECONDS: int = Field(
        default=60,
        description="فاصله زمانی مجاز بین دو درخواست ارسال متوالی بر حسب ثانیه",
    )

    @field_validator("TELEGRAM_BOT_TOKEN", mode="before")
    @classmethod
    def clean_token(cls, v: Optional[str]) -> str:
        if v is None:
            return ""
        val = str(v).strip()
        # در صورت دست‌نخورده بودن مقدار نمونه
        if val == "your_telegram_bot_token_here":
            return ""
        return val

    @field_validator("TELEGRAM_ADMIN_CHAT_ID", mode="before")
    @classmethod
    def clean_admin_chat_id(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        val = str(v).strip()
        if not val or val == "your_telegram_admin_chat_id_here":
            return None
        return val

    @field_validator("TELEGRAM_PROXY_URL", mode="before")
    @classmethod
    def clean_proxy(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        val = str(v).strip()
        return val if val else None

    @property
    def is_bot_configured(self) -> bool:
        """بررسی آیا توکن ربات به درستی مقداردهی شده است یا خیر."""
        return bool(self.TELEGRAM_BOT_TOKEN and len(self.TELEGRAM_BOT_TOKEN) > 10)

    @property
    def is_admin_configured(self) -> bool:
        """بررسی آیا شناسه چت ادمین تنظیم شده است یا خیر."""
        return bool(self.TELEGRAM_ADMIN_CHAT_ID)

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )


# سینگلتون تنظیمات
settings = Settings()
