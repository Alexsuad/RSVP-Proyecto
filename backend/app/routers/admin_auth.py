from fastapi import APIRouter, HTTPException, status
from app.schemas import AdminLogin, Token
from app.auth import create_access_token
import os

router = APIRouter(prefix="/api/admin", tags=["admin_auth"])

@router.post("/login", response_model=Token)
def admin_login(login_data: AdminLogin):
    """
    Autentica al administrador y emite un token JWT con claim 'role=admin'.
    """
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_password:
        # Fail safe if env var is missing
        raise HTTPException(status_code=500, detail="Configuration error: Admin password not set")
    
    if login_data.password != admin_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta",
        )
    
    # Create token with admin role
    access_token = create_access_token(
        subject="admin",
        extra={"role": "admin"}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
