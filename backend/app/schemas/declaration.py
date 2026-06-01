from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DeclarationCreate(BaseModel):
    fiscal_year: int


class DeclarationUpdate(BaseModel):
    pass  # Status changes happen via dedicated endpoints


class DeclarationRead(BaseModel):
    id: int
    employee_id: int
    fiscal_year: int
    status: str
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
