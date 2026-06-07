from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class DependentCreate(BaseModel):
    relation_type: str
    last_name: str
    first_name: str
    birth_date: date
    annual_income: Decimal = Decimal("0")
    disability_type: str = "none"
    disability_certificate_type: Optional[str] = None
    disability_certificate_date: Optional[date] = None
    disability_description: Optional[str] = None
    is_living_together: bool = True


class DependentUpdate(BaseModel):
    relation_type: Optional[str] = None
    last_name: Optional[str] = None
    first_name: Optional[str] = None
    birth_date: Optional[date] = None
    annual_income: Optional[Decimal] = None
    disability_type: Optional[str] = None
    disability_certificate_type: Optional[str] = None
    disability_certificate_date: Optional[date] = None
    disability_description: Optional[str] = None
    is_living_together: Optional[bool] = None


class DependentRead(BaseModel):
    id: int
    declaration_id: int
    relation_type: str
    last_name: str
    first_name: str
    birth_date: date
    annual_income: Decimal
    disability_type: str
    disability_certificate_type: Optional[str] = None
    disability_certificate_date: Optional[date] = None
    disability_description: Optional[str] = None
    is_living_together: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
