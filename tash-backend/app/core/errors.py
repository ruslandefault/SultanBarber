from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    """Domain error with a UI-friendly (Uzbek-ready) message and a machine code.

    All error responses share the shape: ``{"message": "...", "code": "..."}``.
    """

    def __init__(
        self,
        message: str,
        code: str = "error",
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


# Common domain errors used across the app -----------------------------------

class NotFoundError(AppError):
    def __init__(self, message: str = "Topilmadi", code: str = "not_found") -> None:
        super().__init__(message, code, status.HTTP_404_NOT_FOUND)


class AuthError(AppError):
    def __init__(self, message: str = "Avtorizatsiya xatosi", code: str = "unauthorized") -> None:
        super().__init__(message, code, status.HTTP_401_UNAUTHORIZED)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Ruxsat yo'q", code: str = "forbidden") -> None:
        super().__init__(message, code, status.HTTP_403_FORBIDDEN)


class SlotTakenError(AppError):
    def __init__(self, message: str = "Bu vaqt band", code: str = "slot_taken") -> None:
        super().__init__(message, code, status.HTTP_409_CONFLICT)


class ValidationAppError(AppError):
    def __init__(self, message: str, code: str = "validation_error") -> None:
        super().__init__(message, code, status.HTTP_422_UNPROCESSABLE_ENTITY)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"message": exc.message, "code": exc.code},
        )

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Surface the first error in a friendly way while keeping details.
        first = exc.errors()[0] if exc.errors() else {}
        loc = ".".join(str(p) for p in first.get("loc", []) if p != "body")
        msg = first.get("msg", "Ma'lumot noto'g'ri")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "message": f"{loc}: {msg}" if loc else msg,
                "code": "validation_error",
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"message": str(exc.detail), "code": "http_error"},
        )
