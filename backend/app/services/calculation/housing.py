"""
住宅ローン控除の計算
"""
from decimal import Decimal
from typing import Optional

from app.models.housing import HousingDeduction


def calculate_housing_deduction(housing: Optional[HousingDeduction]) -> Decimal:
    """住宅借入金等特別控除額を返す（DBに既に保存された値を使用）"""
    if housing is None:
        return Decimal(0)
    return housing.deduction_amount
