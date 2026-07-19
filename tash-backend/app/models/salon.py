from __future__ import annotations

from datetime import time as time_
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Integer,
    String,
    Time,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import DepositType

if TYPE_CHECKING:
    from app.models.master import Master


class Salon(Base, TimestampMixin):
    __tablename__ = "salons"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000))
    address: Mapped[str | None] = mapped_column(String(500))
    phone: Mapped[str | None] = mapped_column(String(32))
    instagram: Mapped[str | None] = mapped_column(String(200))
    photo_url: Mapped[str | None] = mapped_column(String(500))
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Tashkent", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Salon-level default weekly hours (display + applied to all masters on save).
    # list of {weekday:int, open:bool, from:str "HH:MM", to:str "HH:MM"}
    working_hours: Mapped[list | None] = mapped_column(JSON, nullable=True)

    settings: Mapped["SalonSettings"] = relationship(
        back_populates="salon", uselist=False, cascade="all, delete-orphan"
    )
    masters: Mapped[list["Master"]] = relationship(back_populates="salon")


class SalonSettings(Base, TimestampMixin):
    __tablename__ = "salon_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    salon_id: Mapped[int] = mapped_column(
        ForeignKey("salons.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    reminder_telegram: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # minutes before the appointment at which reminders are sent, e.g. [1440, 120]
    reminder_offsets: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), default=list, nullable=False
    )
    confirmation_msg: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    deposit_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deposit_type: Mapped[DepositType] = mapped_column(
        String(16), default=DepositType.fixed, nullable=False
    )
    # so'm if fixed, percent (0-100) if percent
    deposit_value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    cancel_window_hours: Mapped[int] = mapped_column(Integer, default=3, nullable=False)

    salon: Mapped["Salon"] = relationship(back_populates="settings")

    __table_args__ = (
        CheckConstraint("deposit_value >= 0", name="deposit_value_non_negative"),
        CheckConstraint("cancel_window_hours >= 0", name="cancel_window_non_negative"),
    )


class WorkingHours(Base):
    """Per-master weekly schedule. weekday: 0=Monday ... 6=Sunday (ISO)."""

    __tablename__ = "working_hours"

    id: Mapped[int] = mapped_column(primary_key=True)
    master_id: Mapped[int] = mapped_column(
        ForeignKey("masters.id", ondelete="CASCADE"), nullable=False, index=True
    )
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped["time_"] = mapped_column(Time, nullable=True)
    end_time: Mapped["time_"] = mapped_column(Time, nullable=True)
    is_day_off: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    master: Mapped["Master"] = relationship(back_populates="working_hours")

    __table_args__ = (
        UniqueConstraint("master_id", "weekday", name="master_weekday"),
        CheckConstraint("weekday >= 0 AND weekday <= 6", name="weekday_range"),
    )
