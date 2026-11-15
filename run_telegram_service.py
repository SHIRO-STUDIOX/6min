#!/usr/bin/env python3
"""
اجرای مستقیم سرویس ارسال کد ورود ادمین تلگرام ۶دقیقه.
نحوه اجرا:
    python run_telegram_service.py
"""

from telegram_service.main import start

if __name__ == "__main__":
    start()
