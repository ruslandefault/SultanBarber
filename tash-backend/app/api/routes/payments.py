from __future__ import annotations

from fastapi import APIRouter, Request

from app.api.deps import DbDep
from app.core.errors import NotFoundError
from app.models.payment import Payment
from app.services.payments.click import ClickProvider
from app.services.payments.payme import PaymeProvider

router = APIRouter(tags=["payments"])

_payme = PaymeProvider()
_click = ClickProvider()


@router.post("/payments/payme")
async def payme_webhook(request: Request, db: DbDep) -> dict:
    """Payme Merchant API single JSON-RPC endpoint."""
    payload = await request.json()
    headers = {k.lower(): v for k, v in request.headers.items()}
    return await _payme.handle_webhook(db, payload, headers)


@router.post("/payments/click")
async def click_webhook(request: Request, db: DbDep) -> dict:
    """Click SHOP-API endpoint (handles both Prepare and Complete via ``action``)."""
    # Click posts form-urlencoded params; accept JSON too for flexibility.
    ctype = request.headers.get("content-type", "")
    if "application/json" in ctype:
        payload = await request.json()
    else:
        form = await request.form()
        payload = {k: v for k, v in form.items()}
    headers = {k.lower(): v for k, v in request.headers.items()}
    return await _click.handle_webhook(db, payload, headers)


@router.get("/payments/{payment_id}/status")
async def payment_status(payment_id: int, db: DbDep) -> dict:
    """Polling endpoint for the frontend after redirecting to a provider."""
    payment = await db.get(Payment, payment_id)
    if payment is None:
        raise NotFoundError("To'lov topilmadi", code="payment_not_found")
    return {
        "id": payment.id,
        "status": payment.status,
        "amount": payment.amount,
        "method": payment.method,
        "kind": payment.kind,
        "appointment_id": payment.appointment_id,
    }
