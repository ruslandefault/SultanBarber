"""Booking service: loads DB state, delegates to the pure availability algorithm,
and performs transactional appointment creation / reschedule / cancel.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.errors import NotFoundError, SlotTakenError, ValidationAppError
from app.models.appointment import Appointment, AppointmentService
from app.models.enums import (
    ACTIVE_APPOINTMENT_STATUSES,
    AppointmentStatus,
    CreatedVia,
    DepositType,
    PaymentKind,
    PaymentMethod,
    PaymentStatus,
)
from app.models.master import Master, MasterService
from app.models.payment import Payment
from app.models.salon import SalonSettings, WorkingHours
from app.models.service import Service
from app.services.availability import (
    Interval,
    MasterAvailability,
    WorkWindow,
    compute_any_master_slots,
    compute_free_slots,
)


# Slot tanlash oralig'i — mijozga soatlik vaqtlar ko'rsatiladi (1 soat).
SLOT_GRANULARITY_MIN = 60


def _tz() -> ZoneInfo:
    return settings.tz


def _day_bounds(day: date, tz: ZoneInfo) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time.min, tzinfo=tz)
    return start, start + timedelta(days=1)


async def _load_services(db: AsyncSession, salon_id: int, service_ids: list[int]) -> list[Service]:
    if not service_ids:
        raise ValidationAppError("Xizmat tanlanmagan", code="no_services")
    rows = (
        await db.execute(
            select(Service).where(
                Service.id.in_(service_ids),
                Service.salon_id == salon_id,
                Service.is_active.is_(True),
            )
        )
    ).scalars().all()
    found = {s.id for s in rows}
    missing = set(service_ids) - found
    if missing:
        raise NotFoundError(
            f"Xizmat topilmadi: {sorted(missing)}", code="service_not_found"
        )
    # preserve request order
    by_id = {s.id: s for s in rows}
    return [by_id[i] for i in service_ids]


async def _masters_doing_all(
    db: AsyncSession, salon_id: int, service_ids: list[int]
) -> list[Master]:
    """Active masters who can perform ALL requested services."""
    n = len(set(service_ids))
    subq = (
        select(MasterService.master_id)
        .where(MasterService.service_id.in_(service_ids))
        .group_by(MasterService.master_id)
        .having(func_count_distinct(MasterService.service_id) == n)
    )
    rows = (
        await db.execute(
            select(Master).where(
                Master.salon_id == salon_id,
                Master.is_active.is_(True),
                Master.id.in_(subq),
            )
        )
    ).scalars().all()
    return list(rows)


async def _working_window(db: AsyncSession, master_id: int, day: date) -> WorkWindow:
    weekday = day.weekday()  # Monday=0 .. Sunday=6
    wh = (
        await db.execute(
            select(WorkingHours).where(
                WorkingHours.master_id == master_id,
                WorkingHours.weekday == weekday,
            )
        )
    ).scalar_one_or_none()
    if wh is None:
        return WorkWindow(start=None, end=None, is_day_off=True)
    return WorkWindow(
        start=wh.start_time, end=wh.end_time, is_day_off=wh.is_day_off
    )


async def _busy_intervals(
    db: AsyncSession, master_id: int, day: date, tz: ZoneInfo,
    exclude_appointment_id: int | None = None,
) -> list[Interval]:
    day_start, day_end = _day_bounds(day, tz)
    conditions = [
        Appointment.master_id == master_id,
        Appointment.status.in_(list(ACTIVE_APPOINTMENT_STATUSES)),
        Appointment.start_at < day_end,
        Appointment.end_at > day_start,
    ]
    if exclude_appointment_id is not None:
        conditions.append(Appointment.id != exclude_appointment_id)
    rows = (
        await db.execute(select(Appointment).where(and_(*conditions)))
    ).scalars().all()
    return [
        Interval(a.start_at.astimezone(tz), a.end_at.astimezone(tz)) for a in rows
    ]


async def get_availability(
    db: AsyncSession,
    *,
    salon_id: int,
    master_id: str,
    service_ids: list[int],
    day: date,
) -> dict:
    tz = _tz()
    services = await _load_services(db, salon_id, service_ids)
    total_duration = sum(s.duration_min for s in services)
    now = datetime.now(tz)

    if master_id == "any":
        masters = await _masters_doing_all(db, salon_id, service_ids)
        avail: list[MasterAvailability] = []
        for m in masters:
            window = await _working_window(db, m.id, day)
            busy = await _busy_intervals(db, m.id, day, tz)
            avail.append(MasterAvailability(master_id=m.id, window=window, busy=busy))
        options = compute_any_master_slots(
            day=day,
            masters=avail,
            total_duration_min=total_duration,
            tz=tz,
            now=now,
            granularity_min=SLOT_GRANULARITY_MIN,
        )
        slots = [
            {
                "start_at": o.start_at,
                "end_at": o.start_at + timedelta(minutes=total_duration),
                "master_ids": o.master_ids,
            }
            for o in options
        ]
    else:
        try:
            mid = int(master_id)
        except ValueError as exc:
            raise ValidationAppError("master_id noto'g'ri", code="bad_master") from exc
        master = await db.get(Master, mid)
        if master is None or master.salon_id != salon_id or not master.is_active:
            raise NotFoundError("Usta topilmadi", code="master_not_found")
        # verify this master performs all requested services
        capable = {m.id for m in await _masters_doing_all(db, salon_id, service_ids)}
        if mid not in capable:
            raise ValidationAppError(
                "Ushbu usta tanlangan xizmatlarni bajarmaydi", code="master_service_mismatch"
            )
        window = await _working_window(db, mid, day)
        busy = await _busy_intervals(db, mid, day, tz)
        starts = compute_free_slots(
            day=day, window=window, busy=busy,
            total_duration_min=total_duration, tz=tz, now=now,
            granularity_min=SLOT_GRANULARITY_MIN,
        )
        slots = [
            {
                "start_at": s,
                "end_at": s + timedelta(minutes=total_duration),
                "master_ids": [mid],
            }
            for s in starts
        ]

    return {
        "date": day.isoformat(),
        "total_duration_min": total_duration,
        "slots": slots,
    }


def _compute_deposit(total: int, s: SalonSettings) -> int:
    if not s.deposit_required:
        return 0
    if s.deposit_type == DepositType.percent:
        return (total * s.deposit_value) // 100
    return s.deposit_value


async def create_appointment(
    db: AsyncSession,
    *,
    salon_id: int,
    client_id: int,
    master_id: int,
    service_ids: list[int],
    start_at: datetime,
    notes: str | None,
    created_via: CreatedVia,
    settings_row: SalonSettings,
) -> tuple[Appointment, Payment | None]:
    """Create an appointment inside a transaction.

    The server RECOMPUTES end_at and price_total from current service data and
    relies on the DB EXCLUDE constraint to reject race double-bookings.
    """
    tz = _tz()
    services = await _load_services(db, salon_id, service_ids)
    total_duration = sum(s.duration_min for s in services)
    price_total = sum(s.price for s in services)

    if start_at.tzinfo is None:
        start_at = start_at.replace(tzinfo=tz)
    start_at = start_at.astimezone(tz)
    end_at = start_at + timedelta(minutes=total_duration)

    # master must perform all services
    capable = {m.id for m in await _masters_doing_all(db, salon_id, service_ids)}
    if master_id not in capable:
        raise ValidationAppError(
            "Ushbu usta tanlangan xizmatlarni bajarmaydi", code="master_service_mismatch"
        )

    # Application-level pre-check for a friendly message (the DB EXCLUDE is the
    # authoritative guard against races).
    day = start_at.astimezone(tz).date()
    window = await _working_window(db, master_id, day)
    if window.is_day_off or window.start is None:
        raise ValidationAppError("Usta bu kuni ishlamaydi", code="day_off")
    busy = await _busy_intervals(db, master_id, day, tz)
    if any(b.overlaps(start_at, end_at) for b in busy):
        raise SlotTakenError()

    deposit = _compute_deposit(price_total, settings_row)

    appt = Appointment(
        salon_id=salon_id,
        master_id=master_id,
        client_id=client_id,
        status=AppointmentStatus.booked,
        created_via=created_via,
        start_at=start_at,
        end_at=end_at,
        price_total=price_total,
        deposit_amount=deposit or None,
        notes=notes,
    )
    for s in services:
        appt.services.append(
            AppointmentService(
                service_id=s.id, name=s.name, price=s.price, duration_min=s.duration_min
            )
        )
    db.add(appt)

    payment: Payment | None = None
    if settings_row.deposit_required and deposit > 0:
        payment = Payment(
            salon_id=salon_id,
            appointment=appt,
            amount=deposit,
            method=PaymentMethod.payme,  # provisional; client picks provider later
            kind=PaymentKind.deposit,
            status=PaymentStatus.pending,
        )
        db.add(payment)

    try:
        await db.flush()
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        # ExcludeConstraint violation -> overlapping appointment race lost.
        raise SlotTakenError() from exc

    await db.refresh(appt)
    # eager-load services for serialization
    appt = (
        await db.execute(
            select(Appointment)
            .where(Appointment.id == appt.id)
            .options(selectinload(Appointment.services))
        )
    ).scalar_one()
    return appt, payment


async def cancel_appointment(
    db: AsyncSession, *, appointment: Appointment, settings_row: SalonSettings
) -> Appointment:
    tz = _tz()
    if appointment.status in (AppointmentStatus.cancelled, AppointmentStatus.completed):
        raise ValidationAppError(
            "Bu uchrashuvni bekor qilib bo'lmaydi", code="not_cancellable"
        )
    now = datetime.now(tz)
    window = timedelta(hours=settings_row.cancel_window_hours)
    if appointment.start_at.astimezone(tz) - now < window:
        raise ValidationAppError(
            f"Bekor qilish faqat {settings_row.cancel_window_hours} soat oldin mumkin",
            code="cancel_window_passed",
        )
    appointment.status = AppointmentStatus.cancelled
    await db.commit()
    await db.refresh(appointment)
    return appointment


async def reschedule_appointment(
    db: AsyncSession,
    *,
    appointment: Appointment,
    start_at: datetime,
    master_id: int | None,
) -> Appointment:
    tz = _tz()
    if appointment.status in (AppointmentStatus.cancelled, AppointmentStatus.completed):
        raise ValidationAppError(
            "Bu uchrashuvni ko'chirib bo'lmaydi", code="not_reschedulable"
        )
    new_master = master_id or appointment.master_id
    duration = int((appointment.end_at - appointment.start_at).total_seconds() // 60)

    if start_at.tzinfo is None:
        start_at = start_at.replace(tzinfo=tz)
    start_at = start_at.astimezone(tz)
    new_end = start_at + timedelta(minutes=duration)

    day = start_at.date()
    window = await _working_window(db, new_master, day)
    if window.is_day_off or window.start is None:
        raise ValidationAppError("Usta bu kuni ishlamaydi", code="day_off")
    busy = await _busy_intervals(
        db, new_master, day, tz, exclude_appointment_id=appointment.id
    )
    if any(b.overlaps(start_at, new_end) for b in busy):
        raise SlotTakenError()

    appointment.master_id = new_master
    appointment.start_at = start_at
    appointment.end_at = new_end
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise SlotTakenError() from exc
    await db.refresh(appointment)
    return appointment


# small helper: SQLAlchemy count(distinct(...)) without importing at top clutter
from sqlalchemy import func as _func  # noqa: E402


def func_count_distinct(col):
    return _func.count(_func.distinct(col))
