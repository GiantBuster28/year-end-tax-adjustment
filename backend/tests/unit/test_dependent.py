"""
Unit tests for dependent/spouse deduction calculations.
"""
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Optional
from unittest.mock import MagicMock

import pytest

from app.services.calculation.dependent import (
    calculate_spouse_deduction,
    get_age_at_year_end,
    get_dependent_category,
)


# ---------------------------------------------------------------------------
# Minimal stand-in for Dependent that avoids importing the ORM model
# ---------------------------------------------------------------------------

@dataclass
class FakeDependent:
    birth_date: date
    is_living_together: bool
    relation_type: str
    annual_income: Decimal = Decimal("0")


# ---------------------------------------------------------------------------
# get_age_at_year_end
# ---------------------------------------------------------------------------

class TestGetAgeAtYearEnd:
    """Tests for get_age_at_year_end (12月31日時点の年齢)."""

    def test_birthday_before_year_end(self):
        """Birthday falls before Dec 31 → full year has elapsed."""
        # Born June 15, 1953; fiscal 2024; Dec 31 2024 → age 71
        age = get_age_at_year_end(date(1953, 6, 15), 2024)
        assert age == 71

    def test_birthday_on_year_end(self):
        """Birthday is Dec 31 → birthday has arrived, age is counted."""
        # Born Dec 31, 2004; fiscal 2024; Dec 31 2024 → age 20
        age = get_age_at_year_end(date(2004, 12, 31), 2024)
        assert age == 20

    def test_birthday_after_year_end_would_be_one_less(self):
        """
        Because Dec 31 IS the year-end, no birthday can fall 'after' it in the same
        fiscal year.  Verify the boundary: born Jan 1 means birthday has already
        passed by Dec 31.
        """
        # Born Jan 1, 1990; fiscal 2024; Dec 31 2024 → age 34
        age = get_age_at_year_end(date(1990, 1, 1), 2024)
        assert age == 34

    def test_age_at_exact_under16_boundary(self):
        """Age that places dependent exactly at age 15 (under_16 boundary)."""
        # Born Dec 31, 2009; fiscal 2024 → age 15
        age = get_age_at_year_end(date(2009, 12, 31), 2024)
        assert age == 15

    def test_age_just_above_under16_boundary(self):
        """Born Jan 1, 2010; fiscal 2024 → age 14 (still under_16)."""
        age = get_age_at_year_end(date(2010, 1, 1), 2024)
        assert age == 14


# ---------------------------------------------------------------------------
# get_dependent_category
# ---------------------------------------------------------------------------

class TestGetDependentCategory:
    FISCAL_YEAR = 2024

    def _make_dep(self, birth_date: date, is_living_together: bool = True,
                  relation_type: str = "child") -> FakeDependent:
        return FakeDependent(
            birth_date=birth_date,
            is_living_together=is_living_together,
            relation_type=relation_type,
        )

    def test_under_16(self):
        """Age ≤ 15 → category 'under_16'."""
        # Born Jan 1, 2010 → age 14 at Dec 31 2024
        dep = self._make_dep(date(2010, 1, 1))
        assert get_dependent_category(dep, self.FISCAL_YEAR) == "under_16"

    def test_under_16_exact_boundary(self):
        """Age exactly 15 → category 'under_16'."""
        dep = self._make_dep(date(2009, 12, 31))
        assert get_dependent_category(dep, self.FISCAL_YEAR) == "under_16"

    def test_specific(self):
        """Age 20 (in 19-22 range) → category 'specific'."""
        # Born Jan 1, 2004 → age 20 at Dec 31 2024
        dep = self._make_dep(date(2004, 1, 1))
        assert get_dependent_category(dep, self.FISCAL_YEAR) == "specific"

    def test_elderly_cohabiting_parent(self):
        """Age ≥ 70 + is_living_together + relation_type 'parent' → 'elderly_cohabiting'."""
        # Born June 15, 1953 → age 71 at Dec 31 2024
        dep = self._make_dep(date(1953, 6, 15), is_living_together=True, relation_type="parent")
        assert get_dependent_category(dep, self.FISCAL_YEAR) == "elderly_cohabiting"

    def test_elderly_cohabiting_grandparent(self):
        """Age ≥ 70 + is_living_together + relation_type 'grandparent' → 'elderly_cohabiting'."""
        dep = self._make_dep(date(1953, 6, 15), is_living_together=True, relation_type="grandparent")
        assert get_dependent_category(dep, self.FISCAL_YEAR) == "elderly_cohabiting"

    def test_not_elderly_cohabiting_for_sibling(self):
        """
        Age ≥ 70 + is_living_together but relation_type 'sibling' →
        NOT 'elderly_cohabiting'; should be 'elderly' instead.
        """
        dep = self._make_dep(date(1953, 6, 15), is_living_together=True, relation_type="sibling")
        assert get_dependent_category(dep, self.FISCAL_YEAR) == "elderly"

    def test_elderly_not_living_together(self):
        """Age ≥ 70 + not living together (even if parent) → 'elderly'."""
        dep = self._make_dep(date(1953, 6, 15), is_living_together=False, relation_type="parent")
        assert get_dependent_category(dep, self.FISCAL_YEAR) == "elderly"

    def test_general(self):
        """Age 45 (none of the special brackets) → 'general'."""
        # Born Jan 1, 1979 → age 45 at Dec 31 2024
        dep = self._make_dep(date(1979, 1, 1))
        assert get_dependent_category(dep, self.FISCAL_YEAR) == "general"


# ---------------------------------------------------------------------------
# calculate_spouse_deduction
# ---------------------------------------------------------------------------

class TestCalculateSpouseDeduction:
    FISCAL_YEAR = 2024

    def test_employee_income_above_10m_returns_zero(self):
        """Employee salary income > 10,000,000 → deduction is 0 regardless of spouse income."""
        result = calculate_spouse_deduction(
            spouse_income=Decimal("0"),
            employee_salary_income=Decimal("12000000"),
            spouse_birth_date=None,
            fiscal_year=self.FISCAL_YEAR,
        )
        assert result == Decimal("0")

    def test_spouse_income_zero_employee_5m(self):
        """Spouse income 0 (≤ 480,000), employee 5,000,000, spouse age < 70 → 380,000."""
        result = calculate_spouse_deduction(
            spouse_income=Decimal("0"),
            employee_salary_income=Decimal("5000000"),
            spouse_birth_date=date(1980, 1, 1),  # age 44
            fiscal_year=self.FISCAL_YEAR,
        )
        assert result == Decimal("380000")

    def test_spouse_income_zero_spouse_aged_70_or_over(self):
        """Spouse income 0, spouse age ≥ 70 → elderly spouse deduction 480,000."""
        # Born June 15, 1953 → age 71 at Dec 31 2024
        result = calculate_spouse_deduction(
            spouse_income=Decimal("0"),
            employee_salary_income=Decimal("5000000"),
            spouse_birth_date=date(1953, 6, 15),
            fiscal_year=self.FISCAL_YEAR,
        )
        assert result == Decimal("480000")

    def test_spouse_income_in_special_bracket_employee_8m(self):
        """
        Spouse income 600,000 (in 特別控除 bracket 480,001–950,000),
        employee 8,000,000 (≤ 9,000,000) → base amount 380,000, no taper.
        """
        result = calculate_spouse_deduction(
            spouse_income=Decimal("600000"),
            employee_salary_income=Decimal("8000000"),
            spouse_birth_date=None,
            fiscal_year=self.FISCAL_YEAR,
        )
        assert result == Decimal("380000")

    def test_employee_income_taper_at_9200000(self):
        """
        Employee income 9,200,000 (9,000,000 < x ≤ 9,500,000) →
        amount tapered to int(base * 2/3).
        Spouse income 600,000 → base 380,000 → int(380,000 * 2/3) = 253,333.
        """
        result = calculate_spouse_deduction(
            spouse_income=Decimal("600000"),
            employee_salary_income=Decimal("9200000"),
            spouse_birth_date=None,
            fiscal_year=self.FISCAL_YEAR,
        )
        assert result == Decimal("253333")

    def test_spouse_income_above_1330000_returns_zero(self):
        """Spouse income > 1,330,000 → deduction is 0."""
        result = calculate_spouse_deduction(
            spouse_income=Decimal("1400000"),
            employee_salary_income=Decimal("5000000"),
            spouse_birth_date=None,
            fiscal_year=self.FISCAL_YEAR,
        )
        assert result == Decimal("0")

    def test_employee_income_exactly_10m_with_special_deduction(self):
        """
        Employee income exactly 10,000,000 (boundary: int(10M) <= 10M is False,
        the guard is > 10M, so this should still compute a taper-to-1/3 result).
        Spouse income 600,000 → base 380,000 → int(380,000 * 1/3) = 126,666.
        """
        result = calculate_spouse_deduction(
            spouse_income=Decimal("600000"),
            employee_salary_income=Decimal("10000000"),
            spouse_birth_date=None,
            fiscal_year=self.FISCAL_YEAR,
        )
        assert result == Decimal("126666")

    def test_return_type_is_decimal(self):
        """Return value must be a Decimal instance."""
        result = calculate_spouse_deduction(
            spouse_income=Decimal("0"),
            employee_salary_income=Decimal("5000000"),
            spouse_birth_date=None,
            fiscal_year=self.FISCAL_YEAR,
        )
        assert isinstance(result, Decimal)
