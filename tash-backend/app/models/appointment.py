from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import AppointmentStatus, CreatedVia

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.payment import Payment


class Appointment(Base, TimestampMixin):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    salon_id: Mapped[int] = mapped_column(
        ForeignKey("salons.id", ondelete="CASCADE"), nullable=False
    )
    master_id: Mapped[int] = mapped_column(
        ForeignKey("masters.id", ondelete="RESTRICT"), nullable=False
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False
    )

    status: Mapped[AppointmentStatus] = mapped_column(
        String(16), default=AppointmentStatus.booked, nullable=False
    )
    created_via: Mapped[CreatedVia] = mapped_column(
        String(16), default=CreatedVia.telegram, nullable=False
    )

    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    price_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    deposit_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)

    notes: Mapped[str | None] = mapped_column(Text)

    client: Mapped["Client"] = relationship(back_populates="appointments")
    services: Mapped[list["AppointmentService"]] = relationship(
        back_populates="appointment", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(back_populates="appointment")

    __table_args__ = (
        Index("ix_appointments_master_start", "master_id", "start_at"),
        Index("ix_appointments_salon_start", "salon_id", "start_at"),
        Index("ix_appointments_client", "client_id"),
        CheckConstraint("end_at > start_at", name="end_after_start"),
        # DB-level double-booking guard: no two active appointments for the same
        # master may have overlapping [start_at, end_at) ranges. Requires the
        # btree_gist extension (created in the initial Alembic migration).
        ExcludeConstraint(
            (Column("master_id"), "="),
            (func.tstzrange(Column("start_at"), Column("end_at"), "[)"), "&&"),
            using="gist",
            where=text("status NOT IN ('cancelled', 'no_show')"),
            name="no_overlapping_appointments",
        ),
    )


class AppointmentService(Base):
    """Services attached to an appointment.

    Price and duration are SNAPSHOT at booking time so later price/duration edits
    never rewrite history.
    """

    __tablename__ = "appointment_services"

    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(
        ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # SET NULL (not RESTRICT) so a service can be deleted; the snapshot below
    # preserves name/price/duration for history.
    service_id: Mapped[int | None] = mapped_column(
        ForeignKey("services.id", ondelete="SET NULL"), nullable=True
    )
    # snapshots
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, nullable=False)

    appointment: Mapped["Appointment"] = relationship(back_populates="services")
