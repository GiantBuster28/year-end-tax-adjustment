"""
所得税の計算
"""
from decimal import Decimal


# 基礎控除
BASIC_DEDUCTION = 480_000

# 所得税率テーブル (upper_limit, rate_percent, deduction)
TAX_BRACKETS = [
    (1_949_000, 5, 0),
    (3_299_000, 10, 97_500),
    (6_949_000, 20, 427_500),
    (8_999_000, 23, 636_000),
    (17_999_000, 33, 1_536_000),
    (39_999_000, 40, 2_796_000),
    (float("inf"), 45, 4_796_000),
]

# 復興特別所得税率
RECONSTRUCTION_TAX_RATE = Decimal("0.021")


def calculate_income_tax(taxable_income: Decimal) -> Decimal:
    """
    課税所得から所得税額を計算する（復興特別所得税込み）。
    課税所得は1,000円未満切り捨て済みであること。
    """
    income = int(taxable_income)

    if income <= 0:
        return Decimal(0)

    # 1,000円未満切り捨て
    income = (income // 1_000) * 1_000

    base_tax = 0
    for upper, rate, deduction in TAX_BRACKETS:
        if income <= upper:
            base_tax = int(income * rate / 100) - deduction
            break

    base_tax = max(0, base_tax)

    # 復興特別所得税
    reconstruction_tax = int(base_tax * float(RECONSTRUCTION_TAX_RATE))

    total_tax = base_tax + reconstruction_tax
    return Decimal(total_tax)


def calculate_taxable_income(
    salary_income: Decimal,
    total_deductions: Decimal,
) -> Decimal:
    """
    課税所得を計算する。
    課税所得 = 給与所得 - 所得控除合計（1,000円未満切り捨て）
    """
    taxable = int(salary_income) - int(total_deductions)
    taxable = max(0, taxable)
    # 1,000円未満切り捨て
    taxable = (taxable // 1_000) * 1_000
    return Decimal(taxable)


def calculate_total_deductions(
    basic_deduction: Decimal,
    social_insurance_deduction: Decimal,
    insurance_deduction: Decimal,
    dependent_deduction: Decimal,
    disability_deduction: Decimal,
    housing_deduction: Decimal = Decimal(0),
) -> Decimal:
    """全所得控除の合計（基礎控除含む）"""
    return (
        basic_deduction
        + social_insurance_deduction
        + insurance_deduction
        + dependent_deduction
        + disability_deduction
        + housing_deduction
    )
