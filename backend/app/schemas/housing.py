from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class HousingCreate(BaseModel):
    residence_start_date: date
    deduction_type: str
    loan_balance_1: Decimal = Decimal("0")
    loan_balance_2: Decimal = Decimal("0")
    deduction_amount: Decimal


class HousingUpdate(BaseModel):
    residence_start_date: Optional[date] = None
    deduction_type: Optional[str] = None
    loan_balance_1: Optional[Decimal] = None
    loan_balance_2: Optional[Decimal] = None
    deduction_amount: Optional[Decimal] = None


class HousingRead(BaseModel):
    id: int
    declaration_id: int
    residence_start_date: date
    deduction_type: str
    loan_balance_1: Decimal
    loan_balance_2: Decimal
    deduction_amount: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
