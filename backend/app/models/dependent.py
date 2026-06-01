from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Dependent(Base):
    __tablename__ = "dependents"

    id: Mapped[int] = mapped_column(primary_key=True)
    declaration_id: Mapped[int] = mapped_column(
        ForeignKey("tax_adjustment_declarations.id", ondelete="CASCADE"), nullable=False
    )
    relation_type: Mapped[str] = mapped_column(String(30), nullable=False)
    last_name: Mapped[str] = mapped_column(String(50), nullable=False)
    first_name: Mapped[str] = mapped_column(String(50), nullable=False)
    birth_date: Mapped[date] = mapped_column(Date(), nullable=False)
    annual_income: Mapped[Decimal] = mapped_column(Numeric(12, 0), default=0, nullable=False)
    disability_type: Mapped[str] = mapped_column(String(30), default="none", nullable=False)
    disability_certificate_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    disability_certificate_date: Mapped[Optional[date]] = mapped_column(Date(), nullable=True)
    disability_description: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)
    is_living_together: Mapped[bool] = mapped_column(Boolean(), default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    declaration: Mapped["TaxAdjustmentDeclaration"] = relationship(
        "TaxAdjustmentDeclaration", back_populates="dependents"
    )
