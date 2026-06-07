from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class HousingDeduction(Base):
    __tablename__ = "housing_deductions"

    id: Mapped[int] = mapped_column(primary_key=True)
    declaration_id: Mapped[int] = mapped_column(
        ForeignKey("tax_adjustment_declarations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    residence_start_date: Mapped[date] = mapped_column(Date(), nullable=False)
    deduction_type: Mapped[str] = mapped_column(String(50), nullable=False)
    loan_balance_1: Mapped[Decimal] = mapped_column(Numeric(14, 0), default=0, nullable=False)
    loan_balance_2: Mapped[Decimal] = mapped_column(Numeric(14, 0), default=0, nullable=False)
    deduction_amount: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    declaration: Mapped["TaxAdjustmentDeclaration"] = relationship(
        "TaxAdjustmentDeclaration", back_populates="housing_deduction"
    )
