from __future__ import annotations

from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict


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

    # Auth tuning
    TELEGRAM_AUTH_MAX_AGE_HOURS: int = 24
    JWT_EXPIRE_MINUTES: int = 720
    JWT_ALGORITHM: str = "HS256"

    # Payme
    PAYME_MERCHANT_KEY: str = ""
    PAYME_ENV: str = "test"

    # Click
    CLICK_SERVICE_ID: str = ""
    CLICK_MERCHANT_ID: str = ""
    CLICK_SECRET_KEY: str = ""
    CLICK_MERCHANT_USER_ID: str = ""

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.APP_TZ)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
