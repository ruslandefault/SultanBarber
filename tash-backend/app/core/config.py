from __future__ import annotations

from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from zoneinfo import ZoneInfo

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_db_url(raw: str) -> str:
    """Make managed-provider URLs (Render/Neon/Heroku) work with asyncpg.

    - postgres:// or postgresql:// -> postgresql+asyncpg://
    - drop query params asyncpg rejects (sslmode, channel_binding); SSL for
      remote hosts is enabled via connect_args in the engine instead.
    """
    if raw.startswith("postgres://"):
        raw = "postgresql://" + raw[len("postgres://") :]
    if raw.startswith("postgresql://"):
        raw = "postgresql+asyncpg://" + raw[len("postgresql://") :]
    parts = urlsplit(raw)
    q = [(k, v) for k, v in parse_qsl(parts.query) if k not in ("sslmode", "channel_binding")]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(q), parts.fragment))


class Settings(BaseSettings):
    """Application settings, read from environment / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Core
    DATABASE_URL: str = "postgresql+asyncpg://tash:tash@localhost:5432/tash"
    BOT_TOKEN: str = "123456:TEST"
    JWT_SECRET: str = "dev-secret-change-me"
    APP_TZ: str = "Asia/Tashkent"
    MINIAPP_URL: str = "https://t.me/your_bot/app"
    # Telegram guruh chat_id — yangi bandlovlar shu guruhga yuboriladi.
    # Bo'sh bo'lsa guruh xabari yuborilmaydi. Guruh id manfiy son (masalan
    # -1001234567890). get_chat_id.py yordamida topiladi.
    TELEGRAM_NOTIFY_CHAT_ID: str = ""

    # Auth tuning
    TELEGRAM_AUTH_MAX_AGE_HOURS: int = 24
    JWT_EXPIRE_MINUTES: int = 10080  # 7 kun (admin har kuni qayta kirmasin)
    JWT_ALGORITHM: str = "HS256"

    # Payme
    PAYME_MERCHANT_KEY: str = ""
    PAYME_ENV: str = "test"

    # Click
    CLICK_SERVICE_ID: str = ""
    CLICK_MERCHANT_ID: str = ""
    CLICK_SECRET_KEY: str = ""
    CLICK_MERCHANT_USER_ID: str = ""

    @field_validator("DATABASE_URL")
    @classmethod
    def _fix_db_url(cls, v: str) -> str:
        return _normalize_db_url(v)

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.APP_TZ)

    @property
    def db_is_remote(self) -> bool:
        return "localhost" not in self.DATABASE_URL and "127.0.0.1" not in self.DATABASE_URL


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
