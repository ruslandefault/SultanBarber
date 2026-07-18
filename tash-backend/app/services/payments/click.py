"""Click SHOP-API (Prepare + Complete) with md5 signature verification.

Flow:
  1. Prepare  (action=0): validate the order, return merchant_prepare_id.
  2. Complete (action=1): on error==0 and valid signature -> mark paid + confirm.

Signature (per public Click SHOP-API spec):
  Prepare  sign_string = md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id
                             + amount + action + sign_time)
  Complete sign_string = md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id
                             + merchant_prepare_id + amount + action + sign_time)

Money: Click sends ``amount`` as a decimal string of so'm (e.g. "50000.00").

NOTE: field composition/order for the md5 signature must be confirmed against the
current official Click documentation before production — it is version-sensitive.
"""

from __future__ import annotations

import hashlib
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.enums import PaymentKind, PaymentStatus
from app.models.payment import Payment
from app.services.payments.base import PaymentProvider, mark_paid_and_confirm

logger = logging.getLogger("tash.click")

# Click error codes ----------------------------------------------------------
CLICK_SUCCESS = 0
ERR_SIGN_CHECK_FAILED = -1
ERR_INCORRECT_AMOUNT = -2
ERR_ACTION_NOT_FOUND = -3
ERR_ALREADY_PAID = -4
ERR_USER_NOT_FOUND = -5
ERR_TRANSACTION_NOT_FOUND = -6
ERR_FAILED_TO_UPDATE = -7
ERR_TRANSACTION_CANCELLED = -9

ACTION_PREPARE = "0"
ACTION_COMPLETE = "1"


def _md5(s: str) -> str:
    return hashlib.md5(s.encode("utf-8")).hexdigest()


def verify_prepare_sign(p: dict) -> bool:
    expected = _md5(
        f"{p.get('click_trans_id','')}{p.get('service_id','')}{settings.CLICK_SECRET_KEY}"
        f"{p.get('merchant_trans_id','')}{p.get('amount','')}{p.get('action','')}"
        f"{p.get('sign_time','')}"
    )
    return expected == p.get("sign_string", "")


def verify_complete_sign(p: dict) -> bool:
    expected = _md5(
        f"{p.get('click_trans_id','')}{p.get('service_id','')}{settings.CLICK_SECRET_KEY}"
        f"{p.get('merchant_trans_id','')}{p.get('merchant_prepare_id','')}"
        f"{p.get('amount','')}{p.get('action','')}{p.get('sign_time','')}"
    )
    return expected == p.get("sign_string", "")


def _resp(p: dict, error: int, note: str, **extra) -> dict:
    body = {
        "click_trans_id": p.get("click_trans_id"),
        "merchant_trans_id": p.get("merchant_trans_id"),
        "error": error,
        "error_note": note,
    }
    body.update(extra)
    return body


class ClickProvider(PaymentProvider):
    name = "click"

    async def handle_webhook(self, db: AsyncSession, payload: dict, headers: dict) -> dict:
        action = str(payload.get("action", ""))
        if action == ACTION_PREPARE:
            return await self._prepare(db, payload)
        if action == ACTION_COMPLETE:
            return await self._complete(db, payload)
        return _resp(payload, ERR_ACTION_NOT_FOUND, "Action not found")

    async def _load_payment(self, db: AsyncSession, payload: dict) -> Payment | None:
        raw = payload.get("merchant_trans_id")
        try:
            pid = int(raw)
        except (ValueError, TypeError):
            return None
        payment = await db.get(Payment, pid)
        if payment is None or payment.kind != PaymentKind.deposit:
            return None
        return payment

    @staticmethod
    def _amount_matches(payment: Payment, payload: dict) -> bool:
        try:
            # Click sends so'm as a decimal string; compare integer so'm.
            return int(round(float(payload.get("amount", "0")))) == payment.amount
        except (ValueError, TypeError):
            return False

    async def _prepare(self, db: AsyncSession, payload: dict) -> dict:
        if not verify_prepare_sign(payload):
            return _resp(payload, ERR_SIGN_CHECK_FAILED, "Signature check failed")
        payment = await self._load_payment(db, payload)
        if payment is None:
            return _resp(payload, ERR_USER_NOT_FOUND, "Order not found")
        if payment.status == PaymentStatus.paid:
            return _resp(payload, ERR_ALREADY_PAID, "Already paid")
        if not self._amount_matches(payment, payload):
            return _resp(payload, ERR_INCORRECT_AMOUNT, "Incorrect amount")

        # record the click transaction id so Complete can be matched/idempotent
        payment.provider_txn_id = str(payload.get("click_trans_id"))
        await db.commit()
        return _resp(
            payload,
            CLICK_SUCCESS,
            "Success",
            merchant_prepare_id=payment.id,
        )

    async def _complete(self, db: AsyncSession, payload: dict) -> dict:
        if not verify_complete_sign(payload):
            return _resp(payload, ERR_SIGN_CHECK_FAILED, "Signature check failed")
        payment = await self._load_payment(db, payload)
        if payment is None:
            return _resp(payload, ERR_TRANSACTION_NOT_FOUND, "Transaction not found")
        if not self._amount_matches(payment, payload):
            return _resp(payload, ERR_INCORRECT_AMOUNT, "Incorrect amount")

        # Click passes error<0 to signal a cancelled/failed payment on its side.
        if int(payload.get("error", 0)) < 0:
            return _resp(payload, ERR_TRANSACTION_CANCELLED, "Transaction cancelled")

        if payment.status == PaymentStatus.paid:
            # idempotent success
            return _resp(payload, CLICK_SUCCESS, "Success", merchant_confirm_id=payment.id)

        await mark_paid_and_confirm(db, payment, provider_txn_id=str(payload.get("click_trans_id")))
        await db.commit()
        return _resp(payload, CLICK_SUCCESS, "Success", merchant_confirm_id=payment.id)
