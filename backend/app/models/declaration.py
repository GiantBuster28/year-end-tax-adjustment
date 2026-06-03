from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TaxAdjustmentDeclaration(Base):
    __tablename__ = "tax_adjustment_declarations"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    fiscal_year: Mapped[int] = mapped_column(Integer(), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    # 給与データ（給与システム連携 or 管理者入力）
    total_salary: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 0), nullable=True)
    social_insurance_deduction: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 0), nullable=True)
    withheld_tax_ytd: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 0), nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by: Mapped[Optional[int]] = mapped_column(ForeignKey("employees.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    employee: Mapped["Employee"] = relationship(
        "Employee", back_populates="declarations", foreign_keys=[employee_id]
    )
    approver: Mapped[Optional["Employee"]] = relationship(
        "Employee", foreign_keys=[approved_by]
    )
    dependents: Mapped[list["Dependent"]] = relationship(
        "Dependent", back_populates="declaration", cascade="all, delete-orphan"
    )
    insurance_deductions: Mapped[list["InsuranceDeduction"]] = relationship(
        "InsuranceDeduction", back_populates="declaration", cascade="all, delete-orphan"
    )
    housing_deduction: Mapped[Optional["HousingDeduction"]] = relationship(
        "HousingDeduction", back_populates="declaration", cascade="all, delete-orphan", uselist=False
    )
    attachments: Mapped[list["Attachment"]] = relationship(
        "Attachment", back_populates="declaration", cascade="all, delete-orphan"
    )
    result: Mapped[Optional["TaxAdjustmentResult"]] = relationship(
        "TaxAdjustmentResult", back_populates="declaration", cascade="all, delete-orphan", uselist=False
    )
