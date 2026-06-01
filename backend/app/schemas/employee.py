from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class DepartmentRead(BaseModel):
    id: int
    name: str
    code: str

    model_config = {"from_attributes": True}


class EmployeeCreate(BaseModel):
    employee_code: str
    last_name: str
    first_name: str
    last_name_kana: Optional[str] = None
    first_name_kana: Optional[str] = None
    birth_date: Optional[date] = None
    joined_date: Optional[date] = None
    department_id: Optional[int] = None
    email: EmailStr
    password: str
    is_admin: bool = False
    disability_type: str = "none"


class EmployeeUpdate(BaseModel):
    last_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name_kana: Optional[str] = None
    first_name_kana: Optional[str] = None
    birth_date: Optional[date] = None
    department_id: Optional[int] = None
    disability_type: Optional[str] = None


class EmployeeRead(BaseModel):
    id: int
    employee_code: str
    last_name: str
    first_name: str
    last_name_kana: Optional[str] = None
    first_name_kana: Optional[str] = None
    birth_date: Optional[date] = None
    joined_date: Optional[date] = None
    department_id: Optional[int] = None
    department: Optional[DepartmentRead] = None
    email: str
    is_active: bool
    is_admin: bool
    disability_type: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
