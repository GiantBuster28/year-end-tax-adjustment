"""
計算エンドポイント（管理者向け）
"""
from fastapi import APIRouter

router = APIRouter(prefix="/calculations", tags=["calculations"])

# 計算ロジックはadmin.pyに統合
