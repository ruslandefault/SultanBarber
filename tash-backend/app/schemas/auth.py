from __future__ import annotations

from pydantic import BaseModel, EmailStr

from app.schemas.common import ORMModel


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    salon_id: int


class UserMe(ORMModel):
    id: int
    email: str
    full_name: str
    role: str
    salon_id: int
    master_id: int | None


class ClientMe(ORMModel):
    id: int
    telegram_id: int | None
    full_name: str
    username: str | None
    phone: str | None
    language_code: str | None
