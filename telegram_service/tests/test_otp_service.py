"""
تست‌های خودکار جهت اطمینان از عملکرد صحیح تمامی ماژول‌های سرویس تلگرام.
"""

import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from telegram_service.config import settings
from telegram_service.templates import format_otp_message, format_welcome_message, to_persian_digits
from telegram_service.rate_limiter import OtpRateLimiter
from telegram_service.server import app


def test_persian_digits_conversion():
    assert to_persian_digits("123456") == "۱۲۳۴۵۶"
    assert to_persian_digits("Hello 2026") == "Hello ۲۰۲۶"


def test_template_format():
    msg = format_otp_message(code="987654", expire_minutes=3, admin_name="علی")
    assert "<code>987654</code>" in msg
    assert "علی" in msg
    assert "۳ دقیقه" in msg


def test_welcome_message_format():
    msg = format_welcome_message(chat_id=123456789, user_first_name="مدیر", is_admin=True)
    assert "<code>123456789</code>" in msg
    assert "مدیر مجاز" in msg


def test_rate_limiter():
    limiter = OtpRateLimiter(cooldown_seconds=10)
    chat_id = "test_user_1"

    # اولین ارسال باید مجاز باشد
    can_send, rem = limiter.can_send(chat_id)
    assert can_send is True
    assert rem == 0

    # ثبت ارسال
    limiter.record_send(chat_id)

    # ارسال مجدد بلافاصله نباید مجاز باشد
    can_send2, rem2 = limiter.can_send(chat_id)
    assert can_send2 is False
    assert rem2 > 0

    # ریست کردن
    limiter.reset(chat_id)
    can_send3, _ = limiter.can_send(chat_id)
    assert can_send3 is True


def test_health_endpoint():
    client = TestClient(app)
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert "cooldown_seconds" in data


def test_api_key_authentication():
    client = TestClient(app)
    # بدون هدر کلید امنیتی
    response = client.post("/api/v1/send-otp", json={"code": "123456", "chat_id": "111"})
    assert response.status_code == 401

    # با کلید اشتباه
    response2 = client.post(
        "/api/v1/send-otp",
        headers={"X-API-Key": "wrong_key"},
        json={"code": "123456", "chat_id": "111"},
    )
    assert response2.status_code == 401


@patch("telegram_service.server.send_otp_message", new_callable=AsyncMock)
def test_send_otp_endpoint_success(mock_send):
    mock_send.return_value = {
        "success": True,
        "message_id": 999,
        "chat_id": "123456",
        "timestamp": "2026-10-15T10:00:00Z",
    }
    client = TestClient(app)
    api_key = settings.TELEGRAM_SERVICE_API_KEY

    response = client.post(
        "/api/v1/send-otp",
        headers={"X-API-Key": api_key},
        json={"code": "849201", "chat_id": "123456", "force": True},
    )
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["message_id"] == 999
    assert res_data["chat_id"] == "123456"
