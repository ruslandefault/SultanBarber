from __future__ import annotations

from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import ClientDep, DbDep
from app.core.errors import ForbiddenError, NotFoundError, ValidationAppError
from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus, CreatedVia
from app.models.salon import SalonSettings
from app.schemas.booking import (
    AppointmentCreate,
    AppointmentCreateOut,
    AppointmentOut,
    AppointmentReschedule,
    AvailabilityOut,
    MyAppointmentsOut,
)
from app.services import booking as booking_service
from app.services.notifications import NotificationService

router = APIRouter(tags=["booking"])


def _parse_service_ids(service_ids: str) -> list[int]:
    try:
        ids = [int(x) for x in service_ids.split(",") if x.strip()]
    except ValueError as exc:
        raise ValidationAppError("service_ids noto'g'ri", code="bad_service_ids") from exc
    if not ids:
        raise ValidationAppError("Kamida bitta xizmat tanlang", code="no_services")
    return ids


async def _load_settings(db, salon_id: int) -> SalonSettings:
    s = (
        await db.execute(select(SalonSettings).where(SalonSettings.salon_id == salon_id))
    ).scalar_one_or_none()
    if s is None:
        raise NotFoundError("Salon sozlamalari topilmadi", code="settings_missing")
    return s


@router.get("/availability", response_model=AvailabilityOut)
async def availability(
    db: DbDep,
    client: ClientDep,
    master_id: Annotated[str, Query(description="master id or 'any'")],
    service_ids: Annotated[str, Query(description="comma-separated service ids")],
    date_: Annotated[date, Query(alias="date")],
) -> AvailabilityOut:
    ids = _parse_service_ids(service_ids)
    result = await booking_service.get_availability(
        db,
        salon_id=client.salon_id,
        master_id=master_id,
        service_ids=ids,
        day=date_,
    )
    return AvailabilityOut(**result)


@router.post("/appointments", response_model=AppointmentCreateOut, status_code=201)
async def create_appointment(
    data: AppointmentCreate, db: DbDep, client: ClientDep
) -> AppointmentCreateOut:
    settings_row = await _load_settings(db, client.salon_id)
    appt, payment = await booking_service.create_appointment(
        db,
        salon_id=client.salon_id,
        client_id=client.id,
        master_id=data.master_id,
        service_ids=data.service_ids,
        start_at=data.start_at,
        notes=data.notes,
        created_via=CreatedVia.telegram,
        settings_row=settings_row,
    )

    requires_deposit = payment is not None
    # No deposit required -> booking is effectively confirmed; send confirmation.
    if not requires_deposit and settings_row.confirmation_msg:
        await NotificationService().send_confirmation(db, appt)

    return AppointmentCreateOut(
        appointment=AppointmentOut.model_validate(appt),
        payment=payment,
        requires_deposit=requires_deposit,
    )


@router.get("/appointments/my", response_model=MyAppointmentsOut)
async def my_appointments(db: DbDep, client: ClientDep) -> MyAppointmentsOut:
    now = datetime.now(booking_service._tz())
    rows = (
        await db.execute(
            select(Appointment)
            .where(Appointment.client_id == client.id)
            .options(selectinload(Appointment.services))
            .order_by(Appointment.start_at.desc())
        )
    ).scalars().all()
    upcoming, past = [], []
    for a in rows:
        target = upcoming if (a.start_at >= now and a.status != AppointmentStatus.cancelled) else past
        target.append(AppointmentOut.model_validate(a))
    upcoming.reverse()  # soonest first
    return MyAppointmentsOut(upcoming=upcoming, past=past)


async def _owned_appointment(db, client, appointment_id: int) -> Appointment:
    appt = (
        await db.execute(
            select(Appointment)
            .where(Appointment.id == appointment_id)
            .options(selectinload(Appointment.services))
        )
    ).scalar_one_or_none()
    if appt is None:
        raise NotFoundError("Uchrashuv topilmadi", code="appointment_not_found")
    if appt.client_id != client.id:
        raise ForbiddenError("Bu sizning uchrashuvingiz emas", code="not_owner")
    return appt


@router.post("/appointments/{appointment_id}/cancel", response_model=AppointmentOut)
async def cancel(appointment_id: int, db: DbDep, client: ClientDep) -> AppointmentOut:
    appt = await _owned_appointment(db, client, appointment_id)
    settings_row = await _load_settings(db, client.salon_id)
    appt = await booking_service.cancel_appointment(db, appointment=appt, settings_row=settings_row)
    await NotificationService().send_cancelled(db, appt)
    return AppointmentOut.model_validate(appt)


@router.post("/appointments/{appointment_id}/reschedule", response_model=AppointmentOut)
async def reschedule(
    appointment_id: int, data: AppointmentReschedule, db: DbDep, client: ClientDep
) -> AppointmentOut:
    appt = await _owned_appointment(db, client, appointment_id)
    appt = await booking_service.reschedule_appointment(
        db, appointment=appt, start_at=data.start_at, master_id=data.master_id
    )
    await NotificationService().send_rescheduled(db, appt)
    # reload services snapshot for response
    appt = (
        await db.execute(
            select(Appointment)
            .where(Appointment.id == appt.id)
            .options(selectinload(Appointment.services))
        )
    ).scalar_one()
    return AppointmentOut.model_validate(appt)
