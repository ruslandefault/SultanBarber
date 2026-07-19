"""add products table

Revision ID: 0003_products
Revises: 0002_salon_profile
Create Date: 2026-07-19

Products a salon sells (image, title, description, price).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_products"
down_revision: Union[str, None] = "0002_salon_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "salon_id",
            sa.Integer(),
            sa.ForeignKey("salons.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("price >= 0", name="product_price_non_negative"),
    )
    op.create_index("ix_products_salon_id", "products", ["salon_id"])


def downgrade() -> None:
    op.drop_index("ix_products_salon_id", table_name="products")
    op.drop_table("products")
