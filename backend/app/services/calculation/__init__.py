from app.services.calculation.salary import calculate_salary_income
from app.services.calculation.insurance import calculate_insurance_deduction
from app.services.calculation.housing import calculate_housing_deduction
from app.services.calculation.dependent import calculate_dependent_deduction, get_dependent_category
from app.services.calculation.disability import calculate_disability_deduction
from app.services.calculation.tax import calculate_income_tax

__all__ = [
    "calculate_salary_income",
    "calculate_insurance_deduction",
    "calculate_housing_deduction",
    "calculate_dependent_deduction",
    "get_dependent_category",
    "calculate_disability_deduction",
    "calculate_income_tax",
]
