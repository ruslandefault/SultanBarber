"""add salon instagram + working_hours

Revision ID: 0002_salon_profile
Revises: 0001_initial
Create Date: 2026-07-19

Salon-level profile extras editable from the admin Settings page:
  - instagram handle
  - working_hours (JSON) — salon default weekly hours (display + persistence)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_salon_profile"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("salons", sa.Column("instagram", sa.String(length=200), nullable=True))
    op.add_column("salons", sa.Column("working_hours", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("salons", "working_hours")
    op.drop_column("salons", "instagram")
