from typing import Optional

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DBSession
from app.models.declaration import TaxAdjustmentDeclaration
from app.models.housing import HousingDeduction
from app.schemas.housing import HousingCreate, HousingRead, HousingUpdate

router = APIRouter(prefix="/declarations/{declaration_id}/housing", tags=["housing"])


async def _get_declaration(db, declaration_id: int, employee_id: int) -> TaxAdjustmentDeclaration:
    decl = await db.get(TaxAdjustmentDeclaration, declaration_id)
    if decl is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申告書が見つかりません")
    if decl.employee_id != employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="アクセス権限がありません")
    return decl


@router.get("", response_model=Optional[HousingRead])
async def get_housing(declaration_id: int, db: DBSession, current_user: CurrentUser):
    decl = await _get_declaration(db, declaration_id, current_user.id)
    await db.refresh(decl, ["housing_deduction"])
    return decl.housing_deduction


@router.put("", response_model=HousingRead)
async def upsert_housing(
    declaration_id: int,
    body: HousingCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    decl = await _get_declaration(db, declaration_id, current_user.id)
    await db.refresh(decl, ["housing_deduction"])

    if decl.housing_deduction:
        housing = decl.housing_deduction
        for field, value in body.model_dump().items():
            setattr(housing, field, value)
    else:
        housing = HousingDeduction(declaration_id=declaration_id, **body.model_dump())
        db.add(housing)

    await db.flush()
    await db.refresh(housing)
    return housing
