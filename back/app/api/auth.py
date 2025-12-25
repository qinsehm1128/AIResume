from fastapi import APIRouter, HTTPException
from app.schemas import AuthRequest, AuthResponse
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
async def login(request: AuthRequest):
    """Verify admin password"""
    if request.password == settings.ADMIN_SECRET_KEY:
        return AuthResponse(success=True, message="Authentication successful")
    raise HTTPException(status_code=401, detail="Invalid password")


@router.get("/check")
async def check_auth():
    """Check if authentication is required"""
    return {"requires_auth": bool(settings.ADMIN_SECRET_KEY)}
