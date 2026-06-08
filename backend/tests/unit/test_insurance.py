"""
Unit tests for insurance deduction calculations.
"""
from dataclasses import dataclass
from decimal import Decimal

import pytest

from app.services.calculation.insurance import (
    calculate_earthquake_deduction,
    calculate_life_insurance_deduction_new,
    calculate_life_insurance_deduction_old,
    calculate_total_insurance_deduction,
)


# ---------------------------------------------------------------------------
# Minimal stand-in for InsuranceDeduction that avoids importing the ORM model
# ---------------------------------------------------------------------------

@dataclass
class FakeInsurance:
    insurance_type: str
    payment_amount: Decimal


# ---------------------------------------------------------------------------
# New contract life insurance (新契約) — max 40,000
# ---------------------------------------------------------------------------

class TestLifeInsuranceNew:
    def test_zero_payment(self):
        """Payment of 0 → deduction 0."""
        assert calculate_life_insurance_deduction_new(0) == 0

    def test_at_20000_lower_breakpoint(self):
        """Payment = 20,000 (top of first tier) → deduction equals payment: 20,000."""
        assert calculate_life_insurance_deduction_new(20_000) == 20_000

    def test_at_40000_second_tier(self):
        """Payment = 40,000 → int(40,000/2) + 10,000 = 30,000."""
        assert calculate_life_insurance_deduction_new(40_000) == 30_000

    def test_at_80000_third_tier_cap(self):
        """Payment = 80,000 (top of third tier) → int(80,000/4) + 20,000 = 40,000."""
        assert calculate_life_insurance_deduction_new(80_000) == 40_000

    def test_above_80000_capped(self):
        """Payment > 80,000 → deduction capped at 40,000."""
        assert calculate_life_insurance_deduction_new(100_000) == 40_000


# ---------------------------------------------------------------------------
# Old contract life insurance (旧契約) — max 50,000
# ---------------------------------------------------------------------------

class TestLifeInsuranceOld:
    def test_zero_payment(self):
        """Payment of 0 → deduction 0."""
        assert calculate_life_insurance_deduction_old(0) == 0

    def test_at_25000_lower_breakpoint(self):
        """Payment = 25,000 (top of first tier) → deduction equals payment: 25,000."""
        assert calculate_life_insurance_deduction_old(25_000) == 25_000

    def test_at_50000_second_tier(self):
        """Payment = 50,000 → int(50,000/2) + 12,500 = 37,500."""
        assert calculate_life_insurance_deduction_old(50_000) == 37_500

    def test_at_100000_third_tier_cap(self):
        """Payment = 100,000 (top of third tier) → int(100,000/4) + 25,000 = 50,000."""
        assert calculate_life_insurance_deduction_old(100_000) == 50_000

    def test_above_100000_capped(self):
        """Payment > 100,000 → deduction capped at 50,000."""
        assert calculate_life_insurance_deduction_old(120_000) == 50_000


# ---------------------------------------------------------------------------
# Earthquake insurance (地震保険) — max 50,000
# ---------------------------------------------------------------------------

class TestEarthquakeDeduction:
    def test_below_cap(self):
        """Payment ≤ 50,000 → deduction equals payment."""
        assert calculate_earthquake_deduction(30_000) == 30_000

    def test_exactly_at_cap(self):
        """Payment = 50,000 → deduction = 50,000."""
        assert calculate_earthquake_deduction(50_000) == 50_000

    def test_above_cap(self):
        """Payment = 60,000 > 50,000 → deduction capped at 50,000."""
        assert calculate_earthquake_deduction(60_000) == 50_000


# ---------------------------------------------------------------------------
# Total insurance deduction (合計保険料控除)
# ---------------------------------------------------------------------------

class TestTotalInsuranceDeduction:
    def test_only_new_life_high_payment(self):
        """Only new life (80,000) → capped at 40,000."""
        insurances = [FakeInsurance("life_new", Decimal("80000"))]
        result = calculate_total_insurance_deduction(insurances)
        assert result == Decimal("40000")

    def test_only_old_life_high_payment(self):
        """Only old life (100,000) → capped at 50,000."""
        insurances = [FakeInsurance("life_old", Decimal("100000"))]
        result = calculate_total_insurance_deduction(insurances)
        assert result == Decimal("50000")

    def test_both_new_and_old_life_combined_cap(self):
        """
        Both new (80,000) and old (100,000) life exist →
        individual deductions: new=40,000 + old=50,000 = 90,000,
        but combined per-category cap is 40,000.
        """
        insurances = [
            FakeInsurance("life_new", Decimal("80000")),
            FakeInsurance("life_old", Decimal("100000")),
        ]
        result = calculate_total_insurance_deduction(insurances)
        assert result == Decimal("40000")

    def test_new_life_and_new_pension_each_high(self):
        """
        New life (80,000) + new pension (80,000), each capped individually at 40,000;
        combined life+pension = 80,000 which is within the 120,000 overall cap.
        """
        insurances = [
            FakeInsurance("life_new", Decimal("80000")),
            FakeInsurance("pension_new", Decimal("80000")),
        ]
        result = calculate_total_insurance_deduction(insurances)
        assert result == Decimal("80000")

    def test_earthquake_only_above_cap(self):
        """Earthquake insurance (60,000) alone → capped at 50,000."""
        insurances = [FakeInsurance("earthquake", Decimal("60000"))]
        result = calculate_total_insurance_deduction(insurances)
        assert result == Decimal("50000")

    def test_empty_list(self):
        """No insurances → total deduction is 0."""
        result = calculate_total_insurance_deduction([])
        assert result == Decimal("0")
