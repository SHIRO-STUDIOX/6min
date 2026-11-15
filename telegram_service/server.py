"""
سرور وب‌سرویس پیامکی FastAPI جهت ارسال کدهای تأیید ورود ادمین از طریق تلگرام.
"""

import logging
from typing import Optional
from fastapi import FastAPI, Header, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings
from .bot import send_otp_message
from .rate_limiter import OtpRateLimiter

logger = logging.getLogger("telegram_service.server")

# راه‌اندازی اپلیکیشن FastAPI
app = FastAPI(
    title="6min Telegram Admin OTP Gateway",
    description="سرویس وب پیامکی جهت ارسال کدهای ورود یکبار مصرف مدیران از طریق تلگرام",
    version="1.0.0",
)

# پشتیبانی از CORS جهت دسترسی از فرانت‌اند Next.js لوکال
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# نمونه محدودکننده نرخ ارسال
rate_limiter = OtpRateLimiter(cooldown_seconds=settings.OTP_COOLDOWN_SECONDS)


# =====================================================================
# مدل‌های داده ورودی و خروجی (Pydantic Schemas)
# =====================================================================


class SendOtpRequest(BaseModel):
    """مدل درخواست ارسال کد ورود."""

    code: str = Field(..., min_length=4, max_length=10, description="کد یکبار مصرف عددی")
    chat_id: Optional[str] = Field(
        default=None,
        description="شناسه چت مقصد؛ در صورت خالی بودن، به TELEGRAM_ADMIN_CHAT_ID ارسال می‌شود",
    )
    admin_name: Optional[str] = Field(
        default="مدیر گرامی",
        description="نام یا عنوان مدیر برای درج در متن پیام",
    )
    expire_minutes: Optional[int] = Field(
        default=None,
        ge=1,
        le=60,
        description="مدت زمان اعتبار کد بر حسب دقیقه",
    )
    force: bool = Field(
        default=False,
        description="رد کردن محدودیت نرخ زمانی (بای‌پس کول‌داون برای تست)",
    )


class SendOtpResponse(BaseModel):
    """مدل پاسخ وب‌سرویس پس از ارسال."""

    success: bool
    message: str
    chat_id: str
    message_id: Optional[int] = None
    timestamp: Optional[str] = None


class HealthResponse(BaseModel):
    """وضعیت سلامت وب‌سرویس."""

    status: str
    bot_configured: bool
    admin_configured: bool
    proxy_configured: bool
    cooldown_seconds: int
    expire_minutes: int


# =====================================================================
# تابع وابستگی احراز هویت امنیتی (API Key Auth)
# =====================================================================


def verify_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> bool:
    """بررسی کلید امنیتی ارسالی در هدر."""
    expected_key = settings.TELEGRAM_SERVICE_API_KEY
    if not expected_key:
        return True  # اگر هیچ کلیدی تنظیم نشده باشد

    token = None
    if x_api_key:
        token = x_api_key
    elif authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    if not token or token != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="کلید امنیتی نامعتبر است (Invalid API Key). لطفاً هدر X-API-Key را بررسی کنید.",
        )
    return True


# =====================================================================
# اندپوینت‌های وب‌سرویس (Endpoints)
# =====================================================================


@app.get("/health", response_model=HealthResponse, tags=["Health"])
@app.get("/api/v1/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """بررسی وضعیت سلامت و پیکربندی سرویس تلگرام."""
    return HealthResponse(
        status="running",
        bot_configured=settings.is_bot_configured,
        admin_configured=settings.is_admin_configured,
        proxy_configured=bool(settings.TELEGRAM_PROXY_URL),
        cooldown_seconds=settings.OTP_COOLDOWN_SECONDS,
        expire_minutes=settings.OTP_EXPIRE_MINUTES,
    )


@app.post("/send-otp", response_model=SendOtpResponse, tags=["OTP Gateway"])
@app.post("/api/v1/send-otp", response_model=SendOtpResponse, tags=["OTP Gateway"])
async def send_otp_endpoint(
    req: SendOtpRequest,
    _auth: bool = Depends(verify_api_key),
):
    """
    اندپوینت ارسال کد ورود به ادمین (مشابه وب‌سرویس ارسال پیامک OTP).
    """
    # تعیین شناسه مقصد: ارسالی در بدنه یا شناسه پیش‌فرض تنظیمات
    target_chat_id = req.chat_id or settings.TELEGRAM_ADMIN_CHAT_ID

    if not target_chat_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="شناسه چت مقصد مشخص نیست. لطفاً chat_id را در بدنه درخواست یا TELEGRAM_ADMIN_CHAT_ID را در .env تنظیم کنید.",
        )

    # بررسی محدودیت نرخ ارسال (Rate Limiting)
    if not req.force:
        can_send, remaining_seconds = rate_limiter.can_send(target_chat_id)
        if not can_send:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"درخواست ارسال مجدد خیلی زود صورت گرفت. لطفاً {remaining_seconds} ثانیه دیگر مجدداً تلاش کنید.",
            )

    # فراخوانی ربات جهت ارسال پیام به تلگرام
    result = await send_otp_message(
        chat_id=target_chat_id,
        code=req.code,
        expire_minutes=req.expire_minutes or settings.OTP_EXPIRE_MINUTES,
        admin_name=req.admin_name or "مدیر گرامی",
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=result.get("error", "ارسال پیام تلگرام با خطا مواجه شد."),
        )

    # ثبت موفقیت و شروع زمان کول‌داون
    rate_limiter.record_send(target_chat_id)

    return SendOtpResponse(
        success=True,
        message="کد تأیید ورود با موفقیت به تلگرام ادمین ارسال شد.",
        chat_id=str(target_chat_id),
        message_id=result.get("message_id"),
        timestamp=result.get("timestamp"),
    )
