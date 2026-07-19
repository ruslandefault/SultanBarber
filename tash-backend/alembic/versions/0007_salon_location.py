"""add salon latitude/longitude

Revision ID: 0007_salon_location
Revises: 0006_media
Create Date: 2026-07-19
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_salon_location"
down_revision: Union[str, None] = "0006_media"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("salons", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("salons", sa.Column("longitude", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("salons", "longitude")
    op.drop_column("salons", "latitude")
