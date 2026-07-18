"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-19

Creates the full MVP schema, enables btree_gist, and adds the double-booking
EXCLUDE constraint on appointments.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _ts():
    return (
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def upgrade() -> None:
    # Required for the appointments EXCLUDE constraint (int equality inside GiST).
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

    op.create_table(
        "salons",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.String(2000)),
        sa.Column("address", sa.String(500)),
        sa.Column("phone", sa.String(32)),
        sa.Column("photo_url", sa.String(500)),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="Asia/Tashkent"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        *_ts(),
    )

    op.create_table(
        "masters",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("salon_id", sa.Integer, sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("specialty", sa.String(200)),
        sa.Column("photo_url", sa.String(500)),
        sa.Column("bio", sa.String(2000)),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        *_ts(),
    )
    op.create_index("ix_masters_salon_id", "masters", ["salon_id"])

    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("salon_id", sa.Integer, sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("master_id", sa.Integer, sa.ForeignKey("masters.id", ondelete="SET NULL")),
        *_ts(),
    )
    op.create_index("ix_users_salon_id", "users", ["salon_id"])

    op.create_table(
        "working_hours",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("master_id", sa.Integer, sa.ForeignKey("masters.id", ondelete="CASCADE"), nullable=False),
        sa.Column("weekday", sa.Integer, nullable=False),
        sa.Column("start_time", sa.Time),
        sa.Column("end_time", sa.Time),
        sa.Column("is_day_off", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("master_id", "weekday", name="master_weekday"),
        sa.CheckConstraint("weekday >= 0 AND weekday <= 6", name="weekday_range"),
    )
    op.create_index("ix_working_hours_master_id", "working_hours", ["master_id"])

    op.create_table(
        "salon_settings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("salon_id", sa.Integer, sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("reminder_telegram", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("reminder_offsets", postgresql.ARRAY(sa.Integer), nullable=False, server_default="{}"),
        sa.Column("confirmation_msg", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("deposit_required", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("deposit_type", sa.String(16), nullable=False, server_default="fixed"),
        sa.Column("deposit_value", sa.Integer, nullable=False, server_default="0"),
        sa.Column("cancel_window_hours", sa.Integer, nullable=False, server_default="3"),
        sa.CheckConstraint("deposit_value >= 0", name="deposit_value_non_negative"),
        sa.CheckConstraint("cancel_window_hours >= 0", name="cancel_window_non_negative"),
        *_ts(),
    )

    op.create_table(
        "service_categories",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("salon_id", sa.Integer, sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        *_ts(),
    )
    op.create_index("ix_service_categories_salon_id", "service_categories", ["salon_id"])

    op.create_table(
        "services",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("salon_id", sa.Integer, sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", sa.Integer, sa.ForeignKey("service_categories.id", ondelete="SET NULL")),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("duration_min", sa.Integer, nullable=False),
        sa.Column("price", sa.Integer, nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.CheckConstraint("duration_min > 0", name="duration_positive"),
        sa.CheckConstraint("price >= 0", name="price_non_negative"),
        *_ts(),
    )
    op.create_index("ix_services_salon_id", "services", ["salon_id"])

    op.create_table(
        "master_services",
        sa.Column("master_id", sa.Integer, sa.ForeignKey("masters.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("service_id", sa.Integer, sa.ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "clients",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("salon_id", sa.Integer, sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("telegram_id", sa.BigInteger, unique=True),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(32)),
        sa.Column("username", sa.String(64)),
        sa.Column("language_code", sa.String(8)),
        sa.Column("birthday", sa.Date),
        sa.Column("notes", sa.String(2000)),
        *_ts(),
    )
    op.create_index("ix_clients_salon_id", "clients", ["salon_id"])
    op.create_index("ix_clients_phone", "clients", ["phone"])

    op.create_table(
        "client_tags",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("salon_id", sa.Integer, sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("color", sa.String(16)),
    )
    op.create_index("ix_client_tags_salon_id", "client_tags", ["salon_id"])

    op.create_table(
        "client_tag_links",
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tag_id", sa.Integer, sa.ForeignKey("client_tags.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("salon_id", sa.Integer, sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("master_id", sa.Integer, sa.ForeignKey("masters.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="booked"),
        sa.Column("created_via", sa.String(16), nullable=False, server_default="telegram"),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("price_total", sa.Integer, nullable=False, server_default="0"),
        sa.Column("deposit_amount", sa.Integer),
        sa.Column("notes", sa.Text),
        sa.CheckConstraint("end_at > start_at", name="end_after_start"),
        *_ts(),
    )
    op.create_index("ix_appointments_master_start", "appointments", ["master_id", "start_at"])
    op.create_index("ix_appointments_salon_start", "appointments", ["salon_id", "start_at"])
    op.create_index("ix_appointments_client", "appointments", ["client_id"])

    # DB-level double-booking guard.
    op.execute(
        """
        ALTER TABLE appointments
        ADD CONSTRAINT no_overlapping_appointments
        EXCLUDE USING gist (
            master_id WITH =,
            tstzrange(start_at, end_at, '[)') WITH &&
        ) WHERE (status NOT IN ('cancelled', 'no_show'))
        """
    )

    op.create_table(
        "appointment_services",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("appointment_id", sa.Integer, sa.ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_id", sa.Integer, sa.ForeignKey("services.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("price", sa.Integer, nullable=False),
        sa.Column("duration_min", sa.Integer, nullable=False),
    )
    op.create_index("ix_appointment_services_appointment_id", "appointment_services", ["appointment_id"])

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("salon_id", sa.Integer, sa.ForeignKey("salons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("appointment_id", sa.Integer, sa.ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Integer, nullable=False),
        sa.Column("method", sa.String(16), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("provider_txn_id", sa.String(128)),
        sa.Column("provider_create_time", sa.BigInteger),
        sa.Column("provider_perform_time", sa.BigInteger),
        sa.Column("provider_cancel_time", sa.BigInteger),
        sa.Column("provider_state", sa.Integer),
        sa.Column("provider_reason", sa.Integer),
        sa.Column("paid_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("provider_txn_id", name="provider_txn_unique"),
        sa.CheckConstraint("amount >= 0", name="amount_non_negative"),
        *_ts(),
    )
    op.create_index("ix_payments_salon_id", "payments", ["salon_id"])
    op.create_index("ix_payments_appointment_id", "payments", ["appointment_id"])

    op.create_table(
        "sent_reminders",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("appointment_id", sa.Integer, sa.ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("offset_min", sa.Integer, nullable=False),
        sa.Column("kind", sa.String(32), nullable=False, server_default="reminder"),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("appointment_id", "offset_min", "kind", name="reminder_once"),
    )
    op.create_index("ix_sent_reminders_appointment_id", "sent_reminders", ["appointment_id"])


def downgrade() -> None:
    op.drop_table("sent_reminders")
    op.drop_table("payments")
    op.drop_table("appointment_services")
    op.execute("ALTER TABLE appointments DROP CONSTRAINT IF EXISTS no_overlapping_appointments")
    op.drop_table("appointments")
    op.drop_table("client_tag_links")
    op.drop_table("client_tags")
    op.drop_table("clients")
    op.drop_table("master_services")
    op.drop_table("services")
    op.drop_table("service_categories")
    op.drop_table("salon_settings")
    op.drop_table("working_hours")
    op.drop_table("users")
    op.drop_table("masters")
    op.drop_table("salons")
    op.execute("DROP EXTENSION IF EXISTS btree_gist")
