"""allow deleting a service (appointment_services.service_id -> SET NULL)

Revision ID: 0005_service_delete
Revises: 0004_salon_cover
Create Date: 2026-07-19

A service can now be hard-deleted; past appointments keep their snapshot
(name/price/duration) and their service_id is set to NULL.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0005_service_delete"
down_revision: Union[str, None] = "0004_salon_cover"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FK = "fk_appointment_services_service_id_services"


def upgrade() -> None:
    op.alter_column("appointment_services", "service_id", nullable=True)
    op.drop_constraint(_FK, "appointment_services", type_="foreignkey")
    op.create_foreign_key(
        _FK,
        "appointment_services",
        "services",
        ["service_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(_FK, "appointment_services", type_="foreignkey")
    op.create_foreign_key(
        _FK,
        "appointment_services",
        "services",
        ["service_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.alter_column("appointment_services", "service_id", nullable=False)
