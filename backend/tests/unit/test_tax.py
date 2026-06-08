"""
Unit tests for income tax calculation and taxable income calculation.
"""
from decimal import Decimal

import pytest

from app.services.calculation.tax import calculate_income_tax, calculate_taxable_income


class TestCalculateIncomeTax:
    """Tests for calculate_income_tax (所得税額 + 復興特別所得税)."""

    def test_zero_taxable_income(self):
        """Taxable income of 0 → tax is 0."""
        assert calculate_income_tax(Decimal("0")) == Decimal("0")

    def test_negative_taxable_income(self):
        """Negative taxable income → tax is 0 (guard against edge input)."""
        assert calculate_income_tax(Decimal("-1")) == Decimal("0")

    def test_bracket_5pct_1000000(self):
        """
        Taxable income 1,000,000 falls in the 5% bracket (≤ 1,949,000).
        base = 1,000,000 * 5/100 - 0 = 50,000
        reconstruction = int(50,000 * 0.021) = 1,050
        total = 51,050
        """
        result = calculate_income_tax(Decimal("1000000"))
        assert result == Decimal("51050")

    def test_bracket_10pct_2000000(self):
        """
        Taxable income 2,000,000 falls in the 10% bracket (≤ 3,299,000).
        base = 2,000,000 * 10/100 - 97,500 = 102,500
        reconstruction = int(102,500 * 0.021) = 2,152
        total = 104,652
        """
        result = calculate_income_tax(Decimal("2000000"))
        assert result == Decimal("104652")

    def test_bracket_20pct_5000000(self):
        """
        Taxable income 5,000,000 falls in the 20% bracket (≤ 6,949,000).
        base = 5,000,000 * 20/100 - 427,500 = 572,500
        reconstruction = int(572,500 * 0.021) = 12,022
        total = 584,522
        """
        result = calculate_income_tax(Decimal("5000000"))
        assert result == Decimal("584522")

    def test_bracket_33pct_20000000(self):
        """
        Taxable income 20,000,000 falls in the 40% bracket (≤ 39,999,000).
        base = 20,000,000 * 40/100 - 2,796,000 = 5,204,000
        reconstruction = int(5,204,000 * 0.021) = 109,284
        total = 5,313,284
        """
        result = calculate_income_tax(Decimal("20000000"))
        assert result == Decimal("5313284")

    def test_reconstruction_tax_included(self):
        """
        Verify the reconstruction surtax (復興特別所得税 2.1%) is included.
        For income=1,000,000: base=50,000; reconstruction=1,050; total must exceed base.
        """
        result = calculate_income_tax(Decimal("1000000"))
        # base alone would be 50,000 — result must be higher
        assert result > Decimal("50000")
        assert result == Decimal("51050")


class TestCalculateTaxableIncome:
    """Tests for calculate_taxable_income (課税所得)."""

    def test_normal_subtraction(self):
        """salary_income - total_deductions, truncated to 1,000."""
        # 3,000,000 - 1,200,000 = 1,800,000 → already multiple of 1,000
        result = calculate_taxable_income(Decimal("3000000"), Decimal("1200000"))
        assert result == Decimal("1800000")

    def test_truncation_to_1000(self):
        """Any remainder below 1,000 yen is truncated."""
        # 3,000,999 - 1,200,000 = 1,800,999 → truncated to 1,800,000
        result = calculate_taxable_income(Decimal("3000999"), Decimal("1200000"))
        assert result == Decimal("1800000")

    def test_floor_at_zero(self):
        """Deductions exceeding salary income → taxable income is 0, never negative."""
        result = calculate_taxable_income(Decimal("500000"), Decimal("2000000"))
        assert result == Decimal("0")

    def test_zero_salary_income(self):
        """Zero salary income → taxable income is 0."""
        result = calculate_taxable_income(Decimal("0"), Decimal("480000"))
        assert result == Decimal("0")

    def test_return_type_is_decimal(self):
        """Return value must be a Decimal instance."""
        result = calculate_taxable_income(Decimal("5000000"), Decimal("1000000"))
        assert isinstance(result, Decimal)
