from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TaxAdjustmentResult(Base):
    __tablename__ = "tax_adjustment_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    declaration_id: Mapped[int] = mapped_column(
        ForeignKey("tax_adjustment_declarations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    total_salary: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False)
    salary_income: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False)
    total_deductions: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False)
    taxable_income: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False)
    calculated_tax: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    special_tax_credit: Mapped[Decimal] = mapped_column(Numeric(12, 0), default=0, nullable=False)
    final_tax: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    withheld_tax: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    refund_or_collection: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    declaration: Mapped["TaxAdjustmentDeclaration"] = relationship(
        "TaxAdjustmentDeclaration", back_populates="result"
    )
