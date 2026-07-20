from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload

from app.api.deps import DbDep, UserDep
from app.core.config import settings
from app.core.errors import ForbiddenError, NotFoundError, ValidationAppError
from app.models.appointment import Appointment
from app.models.enums import (
    AppointmentStatus,
    CreatedVia,
    PaymentKind,
    PaymentMethod,
    PaymentStatus,
    UserRole,
)
from app.models.payment import Payment
from app.models.salon import SalonSettings
from app.schemas.admin import (
    AdminAppointmentCreate,
    AdminAppointmentOut,
    AdminAppointmentUpdate,
    JournalOut,
    StatusChangeIn,
)
from app.services import booking as booking_service

router = APIRouter(prefix="/admin", tags=["admin:appointments"])


def _enforce_master_scope(user, requested_master_id: int | None) -> int | None:
    """Masters may only touch their own journal; owners see everything."""
    if user.role == UserRole.master:
        if user.master_id is None:
            raise ForbiddenError("Usta profili ulanmagan", code="no_master_profile")
        if requested_master_id is not None and requested_master_id != user.master_id:
            raise ForbiddenError("Faqat o'z jadvalingiz", code="master_scope")
        return user.master_id
    return requested_master_id


@router.get("/appointments", response_model=JournalOut)
async def journal(
    db: DbDep,
    user: UserDep,
    date_: Annotated[date, Query(alias="date")],
    view: Annotated[str, Query(pattern="^(day|week)$")] = "day",
    master_id: int | None = None,
):
    tz = settings.tz
    scoped_master = _enforce_master_scope(user, master_id)

    if view == "week":
        start_day = date_ - timedelta(days=date_.weekday())
        end_day = start_day + timedelta(days=7)
    else:
        start_day = date_
        end_day = date_ + timedelta(days=1)

    date_from = datetime.combine(start_day, time.min, tzinfo=tz)
    date_to = datetime.combine(end_day, time.min, tzinfo=tz)

    conds = [
        Appointment.salon_id == user.salon_id,
        Appointment.start_at >= date_from,
        Appointment.start_at < date_to,
        Appointment.status != AppointmentStatus.cancelled,
    ]
    if scoped_master is not None:
        conds.append(Appointment.master_id == scoped_master)

    rows = (
        await db.execute(
            select(Appointment)
            .where(and_(*conds))
            .options(selectinload(Appointment.services))
            .order_by(Appointment.master_id, Appointment.start_at)
        )
    ).scalars().all()

    return JournalOut(
        view=view,
        date_from=date_from,
        date_to=date_to,
        appointments=[AdminAppointmentOut.model_validate(a) for a in rows],
    )


async def _get_settings(db, salon_id: int) -> SalonSettings:
    s = (
        await db.execute(select(SalonSettings).where(SalonSettings.salon_id == salon_id))
    ).scalar_one_or_none()
    if s is None:
        raise NotFoundError("Sozlamalar topilmadi", code="settings_missing")
    return s


@router.post("/appointments", response_model=AdminAppointmentOut, status_code=201)
async def admin_create(data: AdminAppointmentCreate, db: DbDep, user: UserDep):
    _enforce_master_scope(user, data.master_id)
    settings_row = await _get_settings(db, user.salon_id)
    appt, _payment = await booking_service.create_appointment(
        db,
        salon_id=user.salon_id,
        client_id=data.client_id,
        master_id=data.master_id,
        service_ids=data.service_ids,
        start_at=data.start_at,
        notes=data.notes,
        created_via=CreatedVia.admin,
        settings_row=settings_row,
    )
    from app.services.notifications import NotificationService

    await NotificationService().send_new_booking(db, appt, source="admin")
    return AdminAppointmentOut.model_validate(appt)


async def _load_appt(db, user, appointment_id: int) -> Appointment:
    appt = (
        await db.execute(
            select(Appointment)
            .where(Appointment.id == appointment_id)
            .options(selectinload(Appointment.services))
        )
    ).scalar_one_or_none()
    if appt is None or appt.salon_id != user.salon_id:
        raise NotFoundError("Uchrashuv topilmadi", code="appointment_not_found")
    _enforce_master_scope(user, appt.master_id)
    return appt


@router.put("/appointments/{appointment_id}", response_model=AdminAppointmentOut)
async def admin_update(
    appointment_id: int, data: AdminAppointmentUpdate, db: DbDep, user: UserDep
):
    appt = await _load_appt(db, user, appointment_id)

    # If time/master changes, re-validate via reschedule logic (keeps EXCLUDE guard).
    if data.start_at is not None or data.master_id is not None:
        appt = await booking_service.reschedule_appointment(
            db,
            appointment=appt,
            start_at=data.start_at or appt.start_at,
            master_id=data.master_id,
        )
    if data.notes is not None:
        appt.notes = data.notes

    # Replacing the service set re-snapshots price/duration and moves end_at.
    if data.service_ids is not None:
        from app.models.appointment import AppointmentService
        from app.services.booking import _load_services

        services = await _load_services(db, user.salon_id, data.service_ids)
        for existing in list(appt.services):
            await db.delete(existing)
        total_duration = sum(s.duration_min for s in services)
        appt.services = [
            AppointmentService(
                service_id=s.id, name=s.name, price=s.price, duration_min=s.duration_min
            )
            for s in services
        ]
        appt.price_total = sum(s.price for s in services)
        appt.end_at = appt.start_at + timedelta(minutes=total_duration)

    await db.commit()
    appt = await _load_appt(db, user, appointment_id)
    return AdminAppointmentOut.model_validate(appt)


@router.post("/appointments/{appointment_id}/status", response_model=AdminAppointmentOut)
async def change_status(
    appointment_id: int, data: StatusChangeIn, db: DbDep, user: UserDep
):
    appt = await _load_appt(db, user, appointment_id)
    try:
        new_status = AppointmentStatus(data.status)
    except ValueError as exc:
        raise ValidationAppError("Noto'g'ri status", code="bad_status") from exc

    appt.status = new_status

    # On completion, optionally record a payment (cash/payme/click).
    if new_status == AppointmentStatus.completed and data.payment_amount:
        try:
            method = PaymentMethod(data.payment_method or "cash")
        except ValueError as exc:
            raise ValidationAppError("Noto'g'ri to'lov usuli", code="bad_method") from exc
        db.add(
            Payment(
                salon_id=user.salon_id,
                appointment_id=appt.id,
                amount=data.payment_amount,
                method=method,
                kind=PaymentKind.full,
                status=PaymentStatus.paid,
                paid_at=datetime.now(settings.tz),
            )
        )

    await db.commit()
    appt = await _load_appt(db, user, appointment_id)
    return AdminAppointmentOut.model_validate(appt)


@router.delete("/appointments/{appointment_id}", status_code=204)
async def admin_delete(appointment_id: int, db: DbDep, user: UserDep) -> None:
    """Hard-delete an appointment so its slot becomes free again.

    Related appointment_services / payments / reminders are removed by the
    DB-level ON DELETE CASCADE on those foreign keys.
    """
    appt = await _load_appt(db, user, appointment_id)
    await db.delete(appt)
    await db.commit()
