from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DBSession
from app.models.declaration import TaxAdjustmentDeclaration
from app.schemas.declaration import DeclarationCreate, DeclarationRead

router = APIRouter(prefix="/declarations", tags=["declarations"])


def _check_ownership(declaration: TaxAdjustmentDeclaration, current_user_id: int):
    if declaration.employee_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="アクセス権限がありません")


@router.get("", response_model=list[DeclarationRead])
async def list_declarations(
    db: DBSession,
    current_user: CurrentUser,
    year: Optional[int] = Query(None),
):
    stmt = select(TaxAdjustmentDeclaration).where(
        TaxAdjustmentDeclaration.employee_id == current_user.id
    )
    if year:
        stmt = stmt.where(TaxAdjustmentDeclaration.fiscal_year == year)
    stmt = stmt.order_by(TaxAdjustmentDeclaration.fiscal_year.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=DeclarationRead, status_code=status.HTTP_201_CREATED)
async def create_declaration(
    body: DeclarationCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    # 同一年度の申告書が既に存在しないか確認
    existing = await db.execute(
        select(TaxAdjustmentDeclaration).where(
            TaxAdjustmentDeclaration.employee_id == current_user.id,
            TaxAdjustmentDeclaration.fiscal_year == body.fiscal_year,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{body.fiscal_year}年度の申告書は既に存在します",
        )

    declaration = TaxAdjustmentDeclaration(
        employee_id=current_user.id,
        fiscal_year=body.fiscal_year,
        status="draft",
    )
    db.add(declaration)
    await db.flush()
    await db.refresh(declaration)
    return declaration


@router.get("/{declaration_id}", response_model=DeclarationRead)
async def get_declaration(
    declaration_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    declaration = await db.get(TaxAdjustmentDeclaration, declaration_id)
    if declaration is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申告書が見つかりません")
    _check_ownership(declaration, current_user.id)
    return declaration


@router.put("/{declaration_id}", response_model=DeclarationRead)
async def update_declaration(
    declaration_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    declaration = await db.get(TaxAdjustmentDeclaration, declaration_id)
    if declaration is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申告書が見つかりません")
    _check_ownership(declaration, current_user.id)

    if declaration.status not in ("draft", "rejected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="下書きまたは差し戻し状態の申告書のみ編集できます",
        )
    return declaration


@router.post("/{declaration_id}/submit", response_model=DeclarationRead)
async def submit_declaration(
    declaration_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    declaration = await db.get(TaxAdjustmentDeclaration, declaration_id)
    if declaration is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申告書が見つかりません")
    _check_ownership(declaration, current_user.id)

    if declaration.status not in ("draft", "rejected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="下書きまたは差し戻し状態の申告書のみ提出できます",
        )

    declaration.status = "submitted"
    declaration.submitted_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(declaration)
    return declaration
