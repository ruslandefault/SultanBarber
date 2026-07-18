"""Unit tests for payment signature / auth verification (no DB required)."""

from __future__ import annotations

import base64
import hashlib

from app.core.config import settings
from app.services.payments import base as pbase
from app.services.payments.click import verify_complete_sign, verify_prepare_sign
from app.services.payments.payme import verify_auth


def test_soum_tiyin_roundtrip():
    assert pbase.soum_to_tiyin(80_000) == 8_000_000
    assert pbase.tiyin_to_soum(8_000_000) == 80_000


def test_payme_auth_accepts_correct_key(monkeypatch):
    monkeypatch.setattr(settings, "PAYME_MERCHANT_KEY", "secretkey123")
    token = base64.b64encode(b"Paycom:secretkey123").decode()
    assert verify_auth({"authorization": f"Basic {token}"}) is True


def test_payme_auth_rejects_wrong_key(monkeypatch):
    monkeypatch.setattr(settings, "PAYME_MERCHANT_KEY", "secretkey123")
    token = base64.b64encode(b"Paycom:wrong").decode()
    assert verify_auth({"authorization": f"Basic {token}"}) is False


def test_payme_auth_rejects_missing_header():
    assert verify_auth({}) is False


def test_click_prepare_signature(monkeypatch):
    monkeypatch.setattr(settings, "CLICK_SECRET_KEY", "clicksecret")
    p = {
        "click_trans_id": "111",
        "service_id": "222",
        "merchant_trans_id": "5",
        "amount": "80000.00",
        "action": "0",
        "sign_time": "2026-07-19 10:00:00",
    }
    raw = (
        f"{p['click_trans_id']}{p['service_id']}clicksecret{p['merchant_trans_id']}"
        f"{p['amount']}{p['action']}{p['sign_time']}"
    )
    p["sign_string"] = hashlib.md5(raw.encode()).hexdigest()
    assert verify_prepare_sign(p) is True
    p["sign_string"] = "deadbeef"
    assert verify_prepare_sign(p) is False


def test_click_complete_signature(monkeypatch):
    monkeypatch.setattr(settings, "CLICK_SECRET_KEY", "clicksecret")
    p = {
        "click_trans_id": "111",
        "service_id": "222",
        "merchant_trans_id": "5",
        "merchant_prepare_id": "5",
        "amount": "80000.00",
        "action": "1",
        "sign_time": "2026-07-19 10:05:00",
    }
    raw = (
        f"{p['click_trans_id']}{p['service_id']}clicksecret{p['merchant_trans_id']}"
        f"{p['merchant_prepare_id']}{p['amount']}{p['action']}{p['sign_time']}"
    )
    p["sign_string"] = hashlib.md5(raw.encode()).hexdigest()
    assert verify_complete_sign(p) is True
