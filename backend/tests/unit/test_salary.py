"""
Unit tests for calculate_salary_income (給与所得控除の計算).
"""
from decimal import Decimal

import pytest

from app.services.calculation.salary import calculate_salary_income


class TestCalculateSalaryIncome:
    """Tests for the salary income deduction table (令和2年以降)."""

    def test_below_threshold_floor(self):
        """Salary of 0 → income must not go negative; result is 0."""
        result = calculate_salary_income(Decimal("0"))
        assert result == Decimal("0")

    def test_bracket_1_under_1625000(self):
        """Salary ≤ 1,625,000 → fixed deduction of 550,000."""
        # 1,000,000 - 550,000 = 450,000
        result = calculate_salary_income(Decimal("1000000"))
        assert result == Decimal("450000")

    def test_bracket_1_exact_upper_bound(self):
        """Salary exactly at 1,625,000 → deduction 550,000 → income 1,075,000."""
        result = calculate_salary_income(Decimal("1625000"))
        assert result == Decimal("1075000")

    def test_bracket_4_under_6600000(self):
        """Salary of 5,000,000 is in the salary*0.2 + 440,000 bracket."""
        # deduction = 5,000,000 * 0.2 + 440,000 = 1,440,000
        # income    = 5,000,000 - 1,440,000 = 3,560,000
        result = calculate_salary_income(Decimal("5000000"))
        assert result == Decimal("3560000")

    def test_bracket_6_above_8500000(self):
        """Salary > 8,500,000 → fixed deduction of 1,950,000."""
        # 10,000,000 - 1,950,000 = 8,050,000
        result = calculate_salary_income(Decimal("10000000"))
        assert result == Decimal("8050000")

    def test_return_type_is_decimal(self):
        """Return value must be a Decimal instance."""
        result = calculate_salary_income(Decimal("3000000"))
        assert isinstance(result, Decimal)
