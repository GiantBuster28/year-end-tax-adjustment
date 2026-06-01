"""
管理者向けAPIエンドポイント
"""
import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentAdmin, DBSession
from app.models.declaration import TaxAdjustmentDeclaration
from app.models.dependent import Dependent
from app.models.employee import Employee
from app.models.insurance import InsuranceDeduction
from app.models.result import TaxAdjustmentResult
from app.schemas.declaration import DeclarationRead
from app.schemas.result import ResultRead
from app.services.calculation.dependent import calculate_dependent_deduction
from app.services.calculation.disability import calculate_disability_deduction
from app.services.calculation.housing import calculate_housing_deduction
from app.services.calculation.insurance import calculate_total_insurance_deduction
from app.services.calculation.salary import calculate_salary_income
from app.services.calculation.tax import (
    BASIC_DEDUCTION,
    calculate_income_tax,
    calculate_taxable_income,
    calculate_total_deductions,
)

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminDeclarationRead(BaseModel):
    id: int
    employee_id: int
    fiscal_year: int
    status: str
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    employee_last_name: Optional[str] = None
    employee_first_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total: int
    draft: int
    submitted: int
    under_review: int
    approved: int
    rejected: int
    calculated: int


class CalculationRunResponse(BaseModel):
    message: str
    year: int
    task_id: str


class ConfirmResponse(BaseModel):
    message: str
    year: int
    confirmed_count: int


@router.get("/declarations", response_model=list[AdminDeclarationRead])
async def list_admin_declarations(
    db: DBSession,
    current_user: CurrentAdmin,
    year: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    stmt = (
        select(TaxAdjustmentDeclaration)
        .options(
            selectinload(TaxAdjustmentDeclaration.employee).selectinload(Employee.department)
        )
    )
    if year:
        stmt = stmt.where(TaxAdjustmentDeclaration.fiscal_year == year)
    if status_filter:
        stmt = stmt.where(TaxAdjustmentDeclaration.status == status_filter)

    stmt = stmt.order_by(TaxAdjustmentDeclaration.submitted_at.desc().nulls_last())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(stmt)
    declarations = result.scalars().all()

    output = []
    for decl in declarations:
        emp = decl.employee
        dept_name = emp.department.name if emp.department else None
        output.append(
            AdminDeclarationRead(
                id=decl.id,
                employee_id=decl.employee_id,
                fiscal_year=decl.fiscal_year,
                status=decl.status,
                submitted_at=decl.submitted_at,
                approved_at=decl.approved_at,
                approved_by=decl.approved_by,
                created_at=decl.created_at,
                updated_at=decl.updated_at,
                employee_last_name=emp.last_name,
                employee_first_name=emp.first_name,
                employee_code=emp.employee_code,
                department_name=dept_name,
            )
        )
    return output


@router.get("/declarations/{declaration_id}", response_model=AdminDeclarationRead)
async def get_admin_declaration(
    declaration_id: int,
    db: DBSession,
    current_user: CurrentAdmin,
):
    stmt = (
        select(TaxAdjustmentDeclaration)
        .options(
            selectinload(TaxAdjustmentDeclaration.employee).selectinload(Employee.department)
        )
        .where(TaxAdjustmentDeclaration.id == declaration_id)
    )
    result = await db.execute(stmt)
    decl = result.scalar_one_or_none()
    if decl is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申告書が見つかりません")

    emp = decl.employee
    dept_name = emp.department.name if emp.department else None
    return AdminDeclarationRead(
        id=decl.id,
        employee_id=decl.employee_id,
        fiscal_year=decl.fiscal_year,
        status=decl.status,
        submitted_at=decl.submitted_at,
        approved_at=decl.approved_at,
        approved_by=decl.approved_by,
        created_at=decl.created_at,
        updated_at=decl.updated_at,
        employee_last_name=emp.last_name,
        employee_first_name=emp.first_name,
        employee_code=emp.employee_code,
        department_name=dept_name,
    )


@router.put("/declarations/{declaration_id}/approve", response_model=DeclarationRead)
async def approve_declaration(
    declaration_id: int,
    db: DBSession,
    current_user: CurrentAdmin,
):
    decl = await db.get(TaxAdjustmentDeclaration, declaration_id)
    if decl is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申告書が見つかりません")
    if decl.status not in ("submitted", "under_review"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="提出済みまたは審査中の申告書のみ承認できます",
        )
    decl.status = "approved"
    decl.approved_at = datetime.now(timezone.utc)
    decl.approved_by = current_user.id
    await db.flush()
    await db.refresh(decl)
    return decl


@router.put("/declarations/{declaration_id}/reject", response_model=DeclarationRead)
async def reject_declaration(
    declaration_id: int,
    db: DBSession,
    current_user: CurrentAdmin,
):
    decl = await db.get(TaxAdjustmentDeclaration, declaration_id)
    if decl is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申告書が見つかりません")
    if decl.status not in ("submitted", "under_review"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="提出済みまたは審査中の申告書のみ差し戻せます",
        )
    decl.status = "rejected"
    await db.flush()
    await db.refresh(decl)
    return decl


async def _run_calculations_for_year(year: int, db_session_factory) -> None:
    """バックグラウンドで年間計算を実行する"""
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            # 承認済み申告書を取得
            stmt = (
                select(TaxAdjustmentDeclaration)
                .options(
                    selectinload(TaxAdjustmentDeclaration.employee),
                    selectinload(TaxAdjustmentDeclaration.dependents),
                    selectinload(TaxAdjustmentDeclaration.insurance_deductions),
                    selectinload(TaxAdjustmentDeclaration.housing_deduction),
                    selectinload(TaxAdjustmentDeclaration.result),
                )
                .where(
                    TaxAdjustmentDeclaration.fiscal_year == year,
                    TaxAdjustmentDeclaration.status == "approved",
                )
            )
            result = await db.execute(stmt)
            declarations = result.scalars().all()

            for decl in declarations:
                emp = decl.employee
                # 総給与収入（仮：実際はDBから別途取得が必要）
                # ここでは従業員の代表的な給与を仮定（実システムではpayroll連携）
                total_salary = Decimal("5000000")  # 仮値

                # 給与所得
                salary_income = calculate_salary_income(total_salary)

                # 保険料控除
                insurance_ded = calculate_total_insurance_deduction(decl.insurance_deductions)

                # 扶養控除
                dependent_ded = calculate_dependent_deduction(
                    decl.dependents, year, salary_income
                )

                # 障害者控除
                disability_ded = calculate_disability_deduction(emp, decl.dependents)

                # 住宅ローン控除
                housing_ded_amount = calculate_housing_deduction(decl.housing_deduction)

                # 社会保険料控除（仮）
                social_insurance_ded = Decimal("700000")

                # 合計所得控除
                total_deductions = calculate_total_deductions(
                    basic_deduction=Decimal(BASIC_DEDUCTION),
                    social_insurance_deduction=social_insurance_ded,
                    insurance_deduction=insurance_ded,
                    dependent_deduction=dependent_ded,
                    disability_deduction=disability_ded,
                )

                # 課税所得
                taxable_income = calculate_taxable_income(salary_income, total_deductions)

                # 所得税額
                calculated_tax = calculate_income_tax(taxable_income)

                # 住宅ローン控除（税額控除）
                final_tax = max(Decimal(0), calculated_tax - housing_ded_amount)

                # 源泉徴収税額（仮）
                withheld_tax = Decimal("180000")

                # 還付/徴収
                refund_or_collection = withheld_tax - final_tax

                # 結果を保存/更新
                if decl.result:
                    tax_result = decl.result
                else:
                    tax_result = TaxAdjustmentResult(declaration_id=decl.id)
                    db.add(tax_result)

                tax_result.total_salary = total_salary
                tax_result.salary_income = salary_income
                tax_result.total_deductions = total_deductions
                tax_result.taxable_income = taxable_income
                tax_result.calculated_tax = calculated_tax
                tax_result.special_tax_credit = housing_ded_amount
                tax_result.final_tax = final_tax
                tax_result.withheld_tax = withheld_tax
                tax_result.refund_or_collection = refund_or_collection
                tax_result.calculated_at = datetime.now(timezone.utc)

                decl.status = "calculated"

            await db.commit()
        except Exception as e:
            await db.rollback()
            raise e


@router.post("/calculations/{year}/run", response_model=CalculationRunResponse)
async def run_calculations(
    year: int,
    background_tasks: BackgroundTasks,
    db: DBSession,
    current_user: CurrentAdmin,
):
    import uuid as uuid_mod

    task_id = str(uuid_mod.uuid4())
    background_tasks.add_task(_run_calculations_for_year, year, None)
    return CalculationRunResponse(
        message=f"{year}年度の年末調整計算を開始しました",
        year=year,
        task_id=task_id,
    )


@router.get("/calculations/{year}/results", response_model=list[ResultRead])
async def get_calculation_results(
    year: int,
    db: DBSession,
    current_user: CurrentAdmin,
):
    stmt = (
        select(TaxAdjustmentResult)
        .join(TaxAdjustmentDeclaration)
        .where(TaxAdjustmentDeclaration.fiscal_year == year)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/calculations/{year}/confirm", response_model=ConfirmResponse)
async def confirm_calculations(
    year: int,
    db: DBSession,
    current_user: CurrentAdmin,
):
    # 計算済み申告書を確定状態へ
    stmt = select(TaxAdjustmentDeclaration).where(
        TaxAdjustmentDeclaration.fiscal_year == year,
        TaxAdjustmentDeclaration.status == "calculated",
    )
    result = await db.execute(stmt)
    declarations = result.scalars().all()
    count = 0
    for decl in declarations:
        decl.status = "approved"  # 最終確定
        count += 1
    await db.flush()
    return ConfirmResponse(
        message=f"{year}年度の計算結果を確定しました",
        year=year,
        confirmed_count=count,
    )


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    db: DBSession,
    current_user: CurrentAdmin,
    year: Optional[int] = Query(None),
):
    stmt = select(
        TaxAdjustmentDeclaration.status,
        func.count(TaxAdjustmentDeclaration.id).label("cnt"),
    )
    if year:
        stmt = stmt.where(TaxAdjustmentDeclaration.fiscal_year == year)
    stmt = stmt.group_by(TaxAdjustmentDeclaration.status)

    result = await db.execute(stmt)
    rows = result.all()

    counts = {row.status: row.cnt for row in rows}
    total = sum(counts.values())

    return DashboardStats(
        total=total,
        draft=counts.get("draft", 0),
        submitted=counts.get("submitted", 0),
        under_review=counts.get("under_review", 0),
        approved=counts.get("approved", 0),
        rejected=counts.get("rejected", 0),
        calculated=counts.get("calculated", 0),
    )
