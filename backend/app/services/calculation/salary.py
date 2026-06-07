"""
給与所得控除の計算
"""
from decimal import Decimal


def calculate_salary_income(total_salary: Decimal) -> Decimal:
    """
    給与収入から給与所得を計算する。

    給与所得 = 給与収入 - 給与所得控除額
    """
    salary = int(total_salary)

    if salary <= 1_625_000:
        deduction = 550_000
    elif salary <= 1_800_000:
        deduction = int(salary * 0.4) - 100_000
    elif salary <= 3_600_000:
        deduction = int(salary * 0.3) + 80_000
    elif salary <= 6_600_000:
        deduction = int(salary * 0.2) + 440_000
    elif salary <= 8_500_000:
        deduction = int(salary * 0.1) + 1_100_000
    else:
        deduction = 1_950_000

    salary_income = salary - deduction
    # 給与所得は0未満にならない
    return Decimal(max(0, salary_income))
