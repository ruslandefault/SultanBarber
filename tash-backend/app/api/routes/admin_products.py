from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, File, UploadFile
from sqlalchemy import select

from app.api.deps import DbDep, OwnerDep
from app.core.errors import NotFoundError, ValidationAppError
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate, UploadOut

router = APIRouter(prefix="/admin", tags=["admin:products"])

UPLOAD_DIR = Path("uploads")
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB


@router.post("/upload", response_model=UploadOut)
async def upload_image(owner: OwnerDep, file: UploadFile = File(...)) -> UploadOut:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise ValidationAppError("Faqat rasm fayllari (jpg, png, webp)", code="bad_file_type")
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise ValidationAppError("Rasm hajmi 8 MB dan oshmasin", code="file_too_large")
    UPLOAD_DIR.mkdir(exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / name).write_bytes(content)
    return UploadOut(url=f"/uploads/{name}")


@router.get("/products", response_model=list[ProductOut])
async def list_products(db: DbDep, owner: OwnerDep):
    rows = (
        await db.execute(
            select(Product)
            .where(Product.salon_id == owner.salon_id)
            .order_by(Product.sort_order, Product.id)
        )
    ).scalars().all()
    return [ProductOut.model_validate(p) for p in rows]


@router.post("/products", response_model=ProductOut, status_code=201)
async def create_product(data: ProductCreate, db: DbDep, owner: OwnerDep):
    p = Product(salon_id=owner.salon_id, **data.model_dump())
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return ProductOut.model_validate(p)


@router.put("/products/{product_id}", response_model=ProductOut)
async def update_product(product_id: int, data: ProductUpdate, db: DbDep, owner: OwnerDep):
    p = await db.get(Product, product_id)
    if p is None or p.salon_id != owner.salon_id:
        raise NotFoundError("Mahsulot topilmadi", code="product_not_found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    await db.commit()
    await db.refresh(p)
    return ProductOut.model_validate(p)


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(product_id: int, db: DbDep, owner: OwnerDep) -> None:
    p = await db.get(Product, product_id)
    if p is None or p.salon_id != owner.salon_id:
        raise NotFoundError("Mahsulot topilmadi", code="product_not_found")
    await db.delete(p)
    await db.commit()
