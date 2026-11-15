"""
ماژول کنترل نرخ ارسال (Rate Limiting) برای جلوگیری از اسپم و ارسال مکرر کد تأیید مانند پنل‌های پیامکی.
"""

import time
from typing import Dict, Tuple


class OtpRateLimiter:
    """کلاس کنترل نرخ ارسال کد با کول‌داون زمانی بر اساس chat_id."""

    def __init__(self, cooldown_seconds: int = 60):
        self.cooldown_seconds = cooldown_seconds
        # نگهداری آخرین زمان ارسال: {chat_id: timestamp}
        self._last_sent: Dict[str, float] = {}

    def can_send(self, chat_id: str) -> Tuple[bool, int]:
        """
        بررسی آیا مجاز به ارسال کد جدید به این شناسه هستیم یا خیر.
        خروجی: (مجاز_است: bool, ثانیه‌های_باقیمانده: int)
        """
        now = time.time()
        last_time = self._last_sent.get(str(chat_id))

        if last_time is None:
            return True, 0

        elapsed = now - last_time
        if elapsed >= self.cooldown_seconds:
            return True, 0

        remaining = int(self.cooldown_seconds - elapsed)
        return False, remaining

    def record_send(self, chat_id: str) -> None:
        """ثبت زمان ارسال کد موفق."""
        self._last_sent[str(chat_id)] = time.time()

    def reset(self, chat_id: str) -> None:
        """ریست کردن وضعیت یک شناسه (برای محیط‌های تستی)."""
        self._last_sent.pop(str(chat_id), None)
