from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DBSession
from app.models.declaration import TaxAdjustmentDeclaration
from app.models.insurance import InsuranceDeduction
from app.schemas.insurance import InsuranceCreate, InsuranceRead, InsuranceUpdate
from app.services.calculation.insurance import calculate_single_insurance_deduction

router = APIRouter(prefix="/declarations/{declaration_id}/insurance", tags=["insurance"])


async def _get_declaration(db, declaration_id: int, employee_id: int) -> TaxAdjustmentDeclaration:
    decl = await db.get(TaxAdjustmentDeclaration, declaration_id)
    if decl is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申告書が見つかりません")
    if decl.employee_id != employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="アクセス権限がありません")
    return decl


@router.get("", response_model=list[InsuranceRead])
async def list_insurance(declaration_id: int, db: DBSession, current_user: CurrentUser):
    await _get_declaration(db, declaration_id, current_user.id)
    result = await db.execute(
        select(InsuranceDeduction).where(InsuranceDeduction.declaration_id == declaration_id)
    )
    return result.scalars().all()


@router.post("", response_model=InsuranceRead, status_code=status.HTTP_201_CREATED)
async def create_insurance(
    declaration_id: int,
    body: InsuranceCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_declaration(db, declaration_id, current_user.id)

    # 控除額が指定されていなければ自動計算
    deduction_amount = body.deduction_amount
    if deduction_amount is None:
        deduction_amount = calculate_single_insurance_deduction(
            body.insurance_type, body.payment_amount
        )

    ins = InsuranceDeduction(
        declaration_id=declaration_id,
        insurance_type=body.insurance_type,
        insurance_company=body.insurance_company,
        policy_name=body.policy_name,
        insured_person=body.insured_person,
        payment_amount=body.payment_amount,
        deduction_amount=deduction_amount,
    )
    db.add(ins)
    await db.flush()
    await db.refresh(ins)
    return ins


@router.put("/{insurance_id}", response_model=InsuranceRead)
async def update_insurance(
    declaration_id: int,
    insurance_id: int,
    body: InsuranceUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_declaration(db, declaration_id, current_user.id)
    ins = await db.get(InsuranceDeduction, insurance_id)
    if ins is None or ins.declaration_id != declaration_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="保険料控除が見つかりません")

    data = body.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(ins, field, value)

    # 支払額が更新された場合、控除額を再計算
    if "payment_amount" in data and "deduction_amount" not in data:
        ins.deduction_amount = calculate_single_insurance_deduction(
            ins.insurance_type, ins.payment_amount
        )

    await db.flush()
    await db.refresh(ins)
    return ins


@router.delete("/{insurance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_insurance(
    declaration_id: int,
    insurance_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_declaration(db, declaration_id, current_user.id)
    ins = await db.get(InsuranceDeduction, insurance_id)
    if ins is None or ins.declaration_id != declaration_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="保険料控除が見つかりません")
    await db.delete(ins)
