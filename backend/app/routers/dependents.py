from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DBSession
from app.models.declaration import TaxAdjustmentDeclaration
from app.models.dependent import Dependent
from app.schemas.dependent import DependentCreate, DependentRead, DependentUpdate
from app.services.calculation.insurance import calculate_single_insurance_deduction

router = APIRouter(prefix="/declarations/{declaration_id}/dependents", tags=["dependents"])


async def _get_declaration(db, declaration_id: int, employee_id: int) -> TaxAdjustmentDeclaration:
    decl = await db.get(TaxAdjustmentDeclaration, declaration_id)
    if decl is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申告書が見つかりません")
    if decl.employee_id != employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="アクセス権限がありません")
    return decl


@router.get("", response_model=list[DependentRead])
async def list_dependents(declaration_id: int, db: DBSession, current_user: CurrentUser):
    await _get_declaration(db, declaration_id, current_user.id)
    result = await db.execute(
        select(Dependent).where(Dependent.declaration_id == declaration_id)
    )
    return result.scalars().all()


@router.post("", response_model=DependentRead, status_code=status.HTTP_201_CREATED)
async def create_dependent(
    declaration_id: int,
    body: DependentCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_declaration(db, declaration_id, current_user.id)
    dep = Dependent(declaration_id=declaration_id, **body.model_dump())
    db.add(dep)
    await db.flush()
    await db.refresh(dep)
    return dep


@router.put("/{dependent_id}", response_model=DependentRead)
async def update_dependent(
    declaration_id: int,
    dependent_id: int,
    body: DependentUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_declaration(db, declaration_id, current_user.id)
    dep = await db.get(Dependent, dependent_id)
    if dep is None or dep.declaration_id != declaration_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="扶養親族が見つかりません")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(dep, field, value)
    await db.flush()
    await db.refresh(dep)
    return dep


@router.delete("/{dependent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dependent(
    declaration_id: int,
    dependent_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_declaration(db, declaration_id, current_user.id)
    dep = await db.get(Dependent, dependent_id)
    if dep is None or dep.declaration_id != declaration_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="扶養親族が見つかりません")
    await db.delete(dep)
