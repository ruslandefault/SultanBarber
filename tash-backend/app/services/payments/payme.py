"""Payme Merchant API (JSON-RPC over a single webhook endpoint).

Implements the standard method set:
  CheckPerformTransaction, CreateTransaction, PerformTransaction,
  CancelTransaction, CheckTransaction, GetStatement.

Auth: the ``Authorization: Basic base64("Paycom:<merchant_key>")`` header is
verified against ``settings.PAYME_MERCHANT_KEY``.

Money: Payme sends amounts in TIYIN; our Payment.amount is in so'm.

NOTE: the numeric error codes below follow the public Payme Merchant API spec.
Confirm the exact codes/messages against the current official documentation
before going to production (they are stable but versioned).
"""

from __future__ import annotations

import base64
import logging
import time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.enums import PaymentKind, PaymentStatus
from app.models.payment import Payment
from app.services.payments.base import (
    PaymentProvider,
    mark_cancelled,
    mark_paid_and_confirm,
    soum_to_tiyin,
)

logger = logging.getLogger("tash.payme")

# Payme error codes (JSON-RPC "error" objects) ------------------------------
ERR_TRANSPORT = -32300
ERR_PARSE = -32700
ERR_METHOD_NOT_FOUND = -32601
ERR_INSUFFICIENT_PRIVILEGE = -32504
ERR_INVALID_AMOUNT = -31001
ERR_ORDER_NOT_FOUND = -31050  # "account" object / order lookup failed
ERR_UNABLE_TO_PERFORM = -31008
ERR_TRANSACTION_NOT_FOUND = -31003
ERR_CANT_CANCEL = -31007

# Payme transaction states
STATE_CREATED = 1
STATE_COMPLETED = 2
STATE_CANCELLED = -1
STATE_CANCELLED_AFTER_COMPLETE = -2


class PaymeError(Exception):
    def __init__(self, code: int, message: str, data: str | None = None) -> None:
        self.code = code
        self.message = message
        self.data = data


def _err_body(request_id, code: int, message: str, data: str | None = None) -> dict:
    err: dict = {"code": code, "message": {"ru": message, "uz": message, "en": message}}
    if data is not None:
        err["data"] = data
    return {"jsonrpc": "2.0", "id": request_id, "error": err}


def _ok_body(request_id, result: dict) -> dict:
    return {"jsonrpc": "2.0", "id": request_id, "result": result}


def verify_auth(headers: dict) -> bool:
    """Verify Basic auth: login must be 'Paycom', password = merchant key."""
    raw = headers.get("authorization") or headers.get("Authorization")
    if not raw or not raw.lower().startswith("basic "):
        return False
    try:
        decoded = base64.b64decode(raw.split(" ", 1)[1]).decode("utf-8")
    except (ValueError, UnicodeDecodeError):
        return False
    if ":" not in decoded:
        return False
    _login, _, password = decoded.partition(":")
    return bool(settings.PAYME_MERCHANT_KEY) and password == settings.PAYME_MERCHANT_KEY


class PaymeProvider(PaymentProvider):
    name = "payme"

    async def handle_webhook(self, db: AsyncSession, payload: dict, headers: dict) -> dict:
        request_id = payload.get("id")
        if not verify_auth(headers):
            return _err_body(request_id, ERR_INSUFFICIENT_PRIVILEGE, "Insufficient privilege")

        method = payload.get("method")
        params = payload.get("params", {}) or {}
        try:
            if method == "CheckPerformTransaction":
                return _ok_body(request_id, await self._check_perform(db, params))
            if method == "CreateTransaction":
                return _ok_body(request_id, await self._create(db, params))
            if method == "PerformTransaction":
                return _ok_body(request_id, await self._perform(db, params))
            if method == "CancelTransaction":
                return _ok_body(request_id, await self._cancel(db, params))
            if method == "CheckTransaction":
                return _ok_body(request_id, await self._check(db, params))
            if method == "GetStatement":
                return _ok_body(request_id, await self._statement(db, params))
            return _err_body(request_id, ERR_METHOD_NOT_FOUND, "Method not found")
        except PaymeError as exc:
            return _err_body(request_id, exc.code, exc.message, exc.data)

    # ---- account resolution -------------------------------------------------

    async def _payment_from_account(self, db: AsyncSession, params: dict) -> Payment:
        account = params.get("account", {}) or {}
        raw = account.get("payment_id") or account.get("order_id")
        if raw is None:
            raise PaymeError(ERR_ORDER_NOT_FOUND, "Buyurtma topilmadi", data="payment_id")
        try:
            payment_id = int(raw)
        except (ValueError, TypeError):
            raise PaymeError(ERR_ORDER_NOT_FOUND, "Buyurtma topilmadi", data="payment_id")
        payment = await db.get(Payment, payment_id)
        if payment is None or payment.kind != PaymentKind.deposit:
            raise PaymeError(ERR_ORDER_NOT_FOUND, "Buyurtma topilmadi", data="payment_id")
        return payment

    def _check_amount(self, payment: Payment, params: dict) -> None:
        amount = params.get("amount")
        if amount is None or int(amount) != soum_to_tiyin(payment.amount):
            raise PaymeError(ERR_INVALID_AMOUNT, "Noto'g'ri summa")

    # ---- methods ------------------------------------------------------------

    async def _check_perform(self, db: AsyncSession, params: dict) -> dict:
        payment = await self._payment_from_account(db, params)
        self._check_amount(payment, params)
        if payment.status == PaymentStatus.cancelled:
            raise PaymeError(ERR_UNABLE_TO_PERFORM, "To'lov bekor qilingan")
        return {"allow": True}

    async def _create(self, db: AsyncSession, params: dict) -> dict:
        txn_id = params.get("id")
        payment = await self._payment_from_account(db, params)
        self._check_amount(payment, params)

        # Idempotent: same provider txn re-issued -> return existing state.
        if payment.provider_txn_id == txn_id:
            return {
                "create_time": payment.provider_create_time,
                "transaction": str(payment.id),
                "state": payment.provider_state or STATE_CREATED,
            }
        # A different active txn already bound -> cannot create another.
        if payment.provider_txn_id is not None and payment.status != PaymentStatus.cancelled:
            raise PaymeError(ERR_UNABLE_TO_PERFORM, "Buyurtma band")

        now_ms = int(time.time() * 1000)
        payment.provider_txn_id = txn_id
        payment.provider_create_time = now_ms
        payment.provider_state = STATE_CREATED
        await db.commit()
        return {"create_time": now_ms, "transaction": str(payment.id), "state": STATE_CREATED}

    async def _find_by_txn(self, db: AsyncSession, txn_id) -> Payment:
        payment = (
            await db.execute(select(Payment).where(Payment.provider_txn_id == txn_id))
        ).scalar_one_or_none()
        if payment is None:
            raise PaymeError(ERR_TRANSACTION_NOT_FOUND, "Tranzaksiya topilmadi")
        return payment

    async def _perform(self, db: AsyncSession, params: dict) -> dict:
        payment = await self._find_by_txn(db, params.get("id"))
        if payment.provider_state == STATE_COMPLETED:
            return {
                "transaction": str(payment.id),
                "perform_time": payment.provider_perform_time,
                "state": STATE_COMPLETED,
            }
        if payment.provider_state != STATE_CREATED:
            raise PaymeError(ERR_UNABLE_TO_PERFORM, "Tranzaksiyani bajarib bo'lmaydi")

        now_ms = int(time.time() * 1000)
        payment.provider_perform_time = now_ms
        payment.provider_state = STATE_COMPLETED
        await mark_paid_and_confirm(db, payment, provider_txn_id=payment.provider_txn_id)
        await db.commit()
        return {"transaction": str(payment.id), "perform_time": now_ms, "state": STATE_COMPLETED}

    async def _cancel(self, db: AsyncSession, params: dict) -> dict:
        payment = await self._find_by_txn(db, params.get("id"))
        reason = params.get("reason")
        now_ms = int(time.time() * 1000)
        if payment.provider_state == STATE_COMPLETED:
            new_state = STATE_CANCELLED_AFTER_COMPLETE
        else:
            new_state = STATE_CANCELLED
        payment.provider_state = new_state
        payment.provider_cancel_time = payment.provider_cancel_time or now_ms
        payment.provider_reason = reason
        await mark_cancelled(db, payment)
        await db.commit()
        return {
            "transaction": str(payment.id),
            "cancel_time": payment.provider_cancel_time,
            "state": new_state,
        }

    async def _check(self, db: AsyncSession, params: dict) -> dict:
        payment = await self._find_by_txn(db, params.get("id"))
        return {
            "create_time": payment.provider_create_time or 0,
            "perform_time": payment.provider_perform_time or 0,
            "cancel_time": payment.provider_cancel_time or 0,
            "transaction": str(payment.id),
            "state": payment.provider_state or STATE_CREATED,
            "reason": payment.provider_reason,
        }

    async def _statement(self, db: AsyncSession, params: dict) -> dict:
        frm = params.get("from")
        to = params.get("to")
        q = select(Payment).where(Payment.provider_txn_id.is_not(None))
        rows = (await db.execute(q)).scalars().all()
        txns = []
        for p in rows:
            if frm is not None and (p.provider_create_time or 0) < frm:
                continue
            if to is not None and (p.provider_create_time or 0) > to:
                continue
            txns.append(
                {
                    "id": p.provider_txn_id,
                    "time": p.provider_create_time,
                    "amount": soum_to_tiyin(p.amount),
                    "account": {"payment_id": str(p.id)},
                    "create_time": p.provider_create_time or 0,
                    "perform_time": p.provider_perform_time or 0,
                    "cancel_time": p.provider_cancel_time or 0,
                    "transaction": str(p.id),
                    "state": p.provider_state or 0,
                    "reason": p.provider_reason,
                }
            )
        return {"transactions": txns}
