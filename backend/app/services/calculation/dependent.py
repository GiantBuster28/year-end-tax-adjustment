"""
扶養控除の計算
"""
from datetime import date
from decimal import Decimal
from typing import Sequence

from app.models.dependent import Dependent


def get_age_at_year_end(birth_date: date, fiscal_year: int) -> int:
    """12月31日時点の年齢を計算する"""
    year_end = date(fiscal_year, 12, 31)
    age = year_end.year - birth_date.year
    # 誕生日がまだ来ていない場合は1引く
    if (year_end.month, year_end.day) < (birth_date.month, birth_date.day):
        age -= 1
    return age


def get_dependent_category(dependent: Dependent, fiscal_year: int) -> str:
    """扶養区分を返す"""
    age = get_age_at_year_end(dependent.birth_date, fiscal_year)
    if age <= 15:
        return "under_16"
    elif 19 <= age <= 22:
        return "specific"
    elif age >= 70 and dependent.is_living_together:
        return "elderly_cohabiting"
    elif age >= 70:
        return "elderly"
    else:
        return "general"


def get_dependent_deduction_amount(category: str) -> int:
    """扶養区分に応じた控除額を返す"""
    amounts = {
        "under_16": 0,
        "specific": 630_000,
        "elderly_cohabiting": 580_000,
        "elderly": 480_000,
        "general": 380_000,
    }
    return amounts.get(category, 0)


def calculate_spouse_deduction(
    spouse_income: Decimal,
    employee_salary_income: Decimal,
    spouse_birth_date: date | None,
    fiscal_year: int,
) -> Decimal:
    """
    配偶者控除・配偶者特別控除の計算
    - 配偶者所得48万円以下: 配偶者控除 380,000（70歳以上 480,000）
    - 配偶者所得48万円超133万円以下: 配偶者特別控除（段階的）
    """
    spouse_inc = int(spouse_income)

    if spouse_inc <= 480_000:
        # 配偶者控除
        if spouse_birth_date:
            age = get_age_at_year_end(spouse_birth_date, fiscal_year)
            if age >= 70:
                return Decimal(480_000)
        return Decimal(380_000)
    elif spouse_inc <= 1_330_000:
        # 配偶者特別控除（段階的）
        # 所得に応じて380,000〜10,000の範囲で段階的に減少
        employee_inc = int(employee_salary_income)

        # 配偶者特別控除表（配偶者所得区分）
        brackets = [
            (480_001, 950_000, 380_000),
            (950_001, 1_000_000, 360_000),
            (1_000_001, 1_050_000, 310_000),
            (1_050_001, 1_100_000, 260_000),
            (1_100_001, 1_150_000, 210_000),
            (1_150_001, 1_200_000, 160_000),
            (1_200_001, 1_250_000, 110_000),
            (1_250_001, 1_300_000, 60_000),
            (1_300_001, 1_330_000, 30_000),
        ]

        base_amount = 0
        for low, high, amount in brackets:
            if low <= spouse_inc <= high:
                base_amount = amount
                break

        # 納税者所得に応じた逓減（所得900万円超で減少）
        if employee_inc <= 9_000_000:
            return Decimal(base_amount)
        elif employee_inc <= 9_500_000:
            return Decimal(int(base_amount * 2 / 3))
        elif employee_inc <= 10_000_000:
            return Decimal(int(base_amount * 1 / 3))
        else:
            return Decimal(0)
    else:
        return Decimal(0)


def calculate_dependent_deduction(
    dependents: Sequence[Dependent],
    fiscal_year: int,
    employee_salary_income: Decimal,
) -> Decimal:
    """全扶養親族の控除額合計を計算する（配偶者含む）"""
    total = Decimal(0)

    for dep in dependents:
        if dep.relation_type == "spouse":
            # 配偶者は別途配偶者控除/配偶者特別控除
            deduction = calculate_spouse_deduction(
                dep.annual_income,
                employee_salary_income,
                dep.birth_date,
                fiscal_year,
            )
        else:
            category = get_dependent_category(dep, fiscal_year)
            deduction = Decimal(get_dependent_deduction_amount(category))

        total += deduction

    return total
