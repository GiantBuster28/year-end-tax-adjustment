"""
障害者控除の計算
"""
from decimal import Decimal
from typing import Sequence

from app.models.dependent import Dependent
from app.models.employee import Employee


DISABILITY_AMOUNTS = {
    "none": 0,
    "general": 270_000,
    "special": 400_000,
    "cohabitation_special": 750_000,
}


def calculate_disability_deduction(
    employee: Employee,
    dependents: Sequence[Dependent],
) -> Decimal:
    """
    本人と扶養親族の障害者控除合計を計算する。
    """
    total = 0

    # 本人分
    total += DISABILITY_AMOUNTS.get(employee.disability_type, 0)

    # 扶養親族分
    for dep in dependents:
        total += DISABILITY_AMOUNTS.get(dep.disability_type, 0)

    return Decimal(total)
