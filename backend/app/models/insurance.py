from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class InsuranceDeduction(Base):
    __tablename__ = "insurance_deductions"

    id: Mapped[int] = mapped_column(primary_key=True)
    declaration_id: Mapped[int] = mapped_column(
        ForeignKey("tax_adjustment_declarations.id", ondelete="CASCADE"), nullable=False
    )
    insurance_type: Mapped[str] = mapped_column(String(20), nullable=False)
    insurance_company: Mapped[str] = mapped_column(String(100), nullable=False)
    policy_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    insured_person: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    payment_amount: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    deduction_amount: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    declaration: Mapped["TaxAdjustmentDeclaration"] = relationship(
        "TaxAdjustmentDeclaration", back_populates="insurance_deductions"
    )
