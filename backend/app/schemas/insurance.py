from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class InsuranceCreate(BaseModel):
    insurance_type: str  # life_new / life_old / pension_new / pension_old / earthquake
    insurance_company: str
    policy_name: Optional[str] = None
    insured_person: Optional[str] = None
    payment_amount: Decimal
    deduction_amount: Optional[Decimal] = None  # auto-calculated if None


class InsuranceUpdate(BaseModel):
    insurance_type: Optional[str] = None
    insurance_company: Optional[str] = None
    policy_name: Optional[str] = None
    insured_person: Optional[str] = None
    payment_amount: Optional[Decimal] = None
    deduction_amount: Optional[Decimal] = None


class InsuranceRead(BaseModel):
    id: int
    declaration_id: int
    insurance_type: str
    insurance_company: str
    policy_name: Optional[str] = None
    insured_person: Optional[str] = None
    payment_amount: Decimal
    deduction_amount: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
