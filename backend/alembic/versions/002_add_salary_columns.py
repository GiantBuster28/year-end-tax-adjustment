"""add salary columns

Revision ID: 002
Revises: 001
Create Date: 2026-06-08

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tax_adjustment_declarations",
        sa.Column("total_salary", sa.Numeric(14, 0), nullable=True),
    )
    op.add_column(
        "tax_adjustment_declarations",
        sa.Column("social_insurance_deduction", sa.Numeric(14, 0), nullable=True),
    )
    op.add_column(
        "tax_adjustment_declarations",
        sa.Column("withheld_tax_ytd", sa.Numeric(14, 0), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("tax_adjustment_declarations", "withheld_tax_ytd")
    op.drop_column("tax_adjustment_declarations", "social_insurance_deduction")
    op.drop_column("tax_adjustment_declarations", "total_salary")
