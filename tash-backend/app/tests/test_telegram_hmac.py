"""Unit tests for Telegram Mini App initData HMAC verification (no DB required)."""

from __future__ import annotations

import time

import pytest

from app.core.telegram_auth import (
    TelegramAuthError,
    build_init_data,
    parse_user,
    verify_init_data,
)

BOT_TOKEN = "123456:AA-fake-bot-token-for-tests"
USER = {"id": 42, "first_name": "Ali", "username": "ali_uz", "language_code": "uz"}


def test_valid_init_data_round_trips():
    raw = build_init_data(BOT_TOKEN, USER)
    parsed = verify_init_data(raw, BOT_TOKEN, max_age_seconds=3600)
    user = parse_user(parsed)
    assert user.id == 42
    assert user.username == "ali_uz"
    assert user.first_name == "Ali"


def test_tampered_hash_rejected():
    raw = build_init_data(BOT_TOKEN, USER)
    tampered = raw[:-2] + ("00" if not raw.endswith("00") else "11")
    with pytest.raises(TelegramAuthError):
        verify_init_data(tampered, BOT_TOKEN)


def test_wrong_bot_token_rejected():
    raw = build_init_data(BOT_TOKEN, USER)
    with pytest.raises(TelegramAuthError):
        verify_init_data(raw, "999999:different-token")


def test_expired_auth_date_rejected():
    old = int(time.time()) - 10 * 3600
    raw = build_init_data(BOT_TOKEN, USER, auth_date=old)
    # signature is valid but auth_date is too old
    with pytest.raises(TelegramAuthError):
        verify_init_data(raw, BOT_TOKEN, max_age_seconds=3600)


def test_missing_hash_rejected():
    with pytest.raises(TelegramAuthError):
        verify_init_data("user=%7B%22id%22%3A1%7D&auth_date=1", BOT_TOKEN)


def test_tampered_payload_same_hash_rejected():
    # Change the user id but keep the old signature -> must fail.
    raw = build_init_data(BOT_TOKEN, USER)
    parts = dict(p.split("=", 1) for p in raw.split("&"))
    parts["auth_date"] = str(int(parts["auth_date"]) + 1)
    forged = "&".join(f"{k}={v}" for k, v in parts.items())
    with pytest.raises(TelegramAuthError):
        verify_init_data(forged, BOT_TOKEN)
