from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.salon import Salon, WorkingHours
    from app.models.service import Service


class Master(Base, TimestampMixin):
    __tablename__ = "masters"

    id: Mapped[int] = mapped_column(primary_key=True)
    salon_id: Mapped[int] = mapped_column(
        ForeignKey("salons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    specialty: Mapped[str | None] = mapped_column(String(200))
    photo_url: Mapped[str | None] = mapped_column(String(500))
    bio: Mapped[str | None] = mapped_column(String(2000))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    salon: Mapped["Salon"] = relationship(back_populates="masters")
    working_hours: Mapped[list["WorkingHours"]] = relationship(
        back_populates="master", cascade="all, delete-orphan"
    )
    services: Mapped[list["Service"]] = relationship(
        secondary="master_services", back_populates="masters"
    )


class MasterService(Base):
    """M:N link between masters and the services they can perform."""

    __tablename__ = "master_services"

    master_id: Mapped[int] = mapped_column(
        ForeignKey("masters.id", ondelete="CASCADE"), primary_key=True
    )
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), primary_key=True
    )
