from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.appointment import Appointment


class Client(Base, TimestampMixin):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    salon_id: Mapped[int] = mapped_column(
        ForeignKey("salons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Telegram id is unique but nullable (admin-created / imported clients may lack one)
    telegram_id: Mapped[int | None] = mapped_column(
        BigInteger, unique=True, nullable=True
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), index=True)
    username: Mapped[str | None] = mapped_column(String(64))
    language_code: Mapped[str | None] = mapped_column(String(8))
    birthday: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(String(2000))

    appointments: Mapped[list["Appointment"]] = relationship(back_populates="client")
    tags: Mapped[list["ClientTag"]] = relationship(
        secondary="client_tag_links", back_populates="clients"
    )


class ClientTag(Base):
    __tablename__ = "client_tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    salon_id: Mapped[int] = mapped_column(
        ForeignKey("salons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    color: Mapped[str | None] = mapped_column(String(16))

    clients: Mapped[list["Client"]] = relationship(
        secondary="client_tag_links", back_populates="tags"
    )


class ClientTagLink(Base):
    __tablename__ = "client_tag_links"

    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[int] = mapped_column(
        ForeignKey("client_tags.id", ondelete="CASCADE"), primary_key=True
    )
