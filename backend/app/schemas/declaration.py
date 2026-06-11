from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class DeclarationCreate(BaseModel):
    fiscal_year: int


class DeclarationUpdate(BaseModel):
    pass  # Status changes happen via dedicated endpoints


class SalaryDataUpdate(BaseModel):
    """管理者による給与データ設定（給与システム連携前の手動入力用）"""
    total_salary: Decimal
    social_insurance_deduction: Decimal
    withheld_tax_ytd: Decimal


class DeclarationRead(BaseModel):
    id: int
    employee_id: int
    fiscal_year: int
    status: str
    total_salary: Optional[Decimal] = None
    social_insurance_deduction: Optional[Decimal] = None
    withheld_tax_ytd: Optional[Decimal] = None
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DeclarationAdminRead(DeclarationRead):
    employee_last_name: Optional[str] = None
    employee_first_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None

    model_config = {"from_attributes": True}
