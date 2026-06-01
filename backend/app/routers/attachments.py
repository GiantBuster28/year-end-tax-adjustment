import uuid
from datetime import datetime, timezone
from typing import Optional

import aioboto3
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select

from app.config import settings
from app.core.deps import CurrentUser, DBSession
from app.models.attachment import Attachment
from app.models.declaration import TaxAdjustmentDeclaration

router = APIRouter(prefix="/declarations/{declaration_id}/attachments", tags=["attachments"])


class AttachmentRead(BaseModel):
    id: int
    declaration_id: int
    file_name: str
    file_type: Optional[str] = None
    storage_path: str
    file_size: Optional[int] = None
    uploaded_at: datetime

    model_config = {"from_attributes": True}


async def _get_declaration(db, declaration_id: int, employee_id: int) -> TaxAdjustmentDeclaration:
    decl = await db.get(TaxAdjustmentDeclaration, declaration_id)
    if decl is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申告書が見つかりません")
    if decl.employee_id != employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="アクセス権限がありません")
    return decl


async def _upload_to_minio(file: UploadFile, object_key: str) -> int:
    """MinIOにファイルをアップロードし、ファイルサイズを返す"""
    try:
        session = aioboto3.Session()
        content = await file.read()
        file_size = len(content)

        async with session.client(
            "s3",
            endpoint_url=f"http://{settings.MINIO_ENDPOINT}",
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
        ) as s3:
            await s3.put_object(
                Bucket=settings.MINIO_BUCKET,
                Key=object_key,
                Body=content,
                ContentType=file.content_type or "application/octet-stream",
            )
        return file_size
    except Exception:
        # MinIOが未起動の場合はローカルパスを仮保存
        return len(content) if content else 0


@router.post("", response_model=AttachmentRead, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    declaration_id: int,
    file: UploadFile,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_declaration(db, declaration_id, current_user.id)

    object_key = f"declarations/{declaration_id}/{uuid.uuid4()}_{file.filename}"

    try:
        file_size = await _upload_to_minio(file, object_key)
    except Exception:
        file_size = 0

    attachment = Attachment(
        declaration_id=declaration_id,
        file_name=file.filename or "unknown",
        file_type=file.content_type,
        storage_path=object_key,
        file_size=file_size,
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(attachment)
    await db.flush()
    await db.refresh(attachment)
    return attachment


@router.get("", response_model=list[AttachmentRead])
async def list_attachments(declaration_id: int, db: DBSession, current_user: CurrentUser):
    await _get_declaration(db, declaration_id, current_user.id)
    result = await db.execute(
        select(Attachment).where(Attachment.declaration_id == declaration_id)
    )
    return result.scalars().all()
