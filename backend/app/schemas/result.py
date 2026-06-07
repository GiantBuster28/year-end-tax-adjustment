from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class ResultRead(BaseModel):
    id: int
    declaration_id: int
    total_salary: Decimal
    salary_income: Decimal
    total_deductions: Decimal
    taxable_income: Decimal
    calculated_tax: Decimal
    special_tax_credit: Decimal
    final_tax: Decimal
    withheld_tax: Decimal
    refund_or_collection: Decimal
    calculated_at: datetime

    model_config = {"from_attributes": True}
