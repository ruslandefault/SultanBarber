from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class ProductOut(ORMModel):
    id: int
    title: str
    description: str | None
    price: int
    image_url: str | None
    sort_order: int
    is_active: bool


class ProductCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    price: int = Field(ge=0)
    image_url: str | None = None
    sort_order: int = 0


class ProductUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    price: int | None = Field(default=None, ge=0)
    image_url: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class UploadOut(BaseModel):
    url: str
