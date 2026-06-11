"""
保険料控除の計算
"""
from decimal import Decimal
from typing import Sequence

from app.models.insurance import InsuranceDeduction


def calculate_life_insurance_deduction_new(payment: int) -> int:
    """新契約生命保険料控除額の計算（上限40,000円）"""
    if payment <= 20_000:
        return payment
    elif payment <= 40_000:
        return int(payment / 2) + 10_000
    elif payment <= 80_000:
        return int(payment / 4) + 20_000
    else:
        return 40_000


def calculate_life_insurance_deduction_old(payment: int) -> int:
    """旧契約生命保険料控除額の計算（上限50,000円）"""
    if payment <= 25_000:
        return payment
    elif payment <= 50_000:
        return int(payment / 2) + 12_500
    elif payment <= 100_000:
        return int(payment / 4) + 25_000
    else:
        return 50_000


def calculate_earthquake_deduction(payment: int) -> int:
    """地震保険料控除額の計算（上限50,000円）"""
    if payment <= 50_000:
        return payment
    else:
        return 50_000


def calculate_single_insurance_deduction(insurance_type: str, payment_amount: Decimal) -> Decimal:
    """保険料控除額を計算する"""
    payment = int(payment_amount)

    if insurance_type in ("life_new", "pension_new"):
        return Decimal(calculate_life_insurance_deduction_new(payment))
    elif insurance_type in ("life_old", "pension_old"):
        return Decimal(calculate_life_insurance_deduction_old(payment))
    elif insurance_type == "earthquake":
        return Decimal(calculate_earthquake_deduction(payment))
    return Decimal(0)


def calculate_total_insurance_deduction(insurances: Sequence[InsuranceDeduction]) -> Decimal:
    """
    全保険料の合計控除額を計算する。
    新契約生命・新契約個人年金・旧契約生命・旧契約個人年金の合計上限は120,000円。
    地震保険は別枠50,000円。
    """
    # 各カテゴリごとに積算
    life_new_total = sum(
        int(i.payment_amount) for i in insurances if i.insurance_type == "life_new"
    )
    life_old_total = sum(
        int(i.payment_amount) for i in insurances if i.insurance_type == "life_old"
    )
    pension_new_total = sum(
        int(i.payment_amount) for i in insurances if i.insurance_type == "pension_new"
    )
    pension_old_total = sum(
        int(i.payment_amount) for i in insurances if i.insurance_type == "pension_old"
    )
    earthquake_total = sum(
        int(i.payment_amount) for i in insurances if i.insurance_type == "earthquake"
    )

    # 新旧両方ある区分は合算して40,000上限、片方のみなら各上限を適用
    if life_new_total > 0 and life_old_total > 0:
        life_ded = min(
            calculate_life_insurance_deduction_new(life_new_total)
            + calculate_life_insurance_deduction_old(life_old_total),
            40_000,
        )
    elif life_old_total > 0:
        life_ded = min(calculate_life_insurance_deduction_old(life_old_total), 50_000)
    else:
        life_ded = min(calculate_life_insurance_deduction_new(life_new_total), 40_000)

    if pension_new_total > 0 and pension_old_total > 0:
        pension_ded = min(
            calculate_life_insurance_deduction_new(pension_new_total)
            + calculate_life_insurance_deduction_old(pension_old_total),
            40_000,
        )
    elif pension_old_total > 0:
        pension_ded = min(calculate_life_insurance_deduction_old(pension_old_total), 50_000)
    else:
        pension_ded = min(calculate_life_insurance_deduction_new(pension_new_total), 40_000)

    # 生命保険料控除合計（上限120,000）
    life_pension_total = min(life_ded + pension_ded, 120_000)

    # 地震保険料控除
    earthquake_ded = calculate_earthquake_deduction(earthquake_total)

    return Decimal(life_pension_total + earthquake_ded)
