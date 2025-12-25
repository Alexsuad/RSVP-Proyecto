# app/core/security.py
import os
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from app.auth import verify_access_token

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")

# 1. Legacy Header Scheme
_api_key_header = APIKeyHeader(name="x-admin-key", auto_error=False)

# 2. JWT Bearer Scheme
_jwt_bearer = HTTPBearer(auto_error=False)

def require_admin_access(
    api_key: str = Depends(_api_key_header),
    bearer: HTTPAuthorizationCredentials = Depends(_jwt_bearer)
) -> None:
    """
    Hybrid Security Dependency:
    - Allows access if `x-admin-key` header matches ADMIN_API_KEY (Legacy for scripts).
    - Allows access if `Authorization: Bearer <TOKEN>` is valid AND has role='admin'.
    - Rejects otherwise.
    """
    # 1. Check Legacy (Fastest/Simplest)
    if api_key and ADMIN_API_KEY and api_key == ADMIN_API_KEY:
        return

    # 2. Check JWT
    if bearer and bearer.credentials:
        payload = verify_access_token(bearer.credentials)
        if payload:
            token_role = payload.get("role")
            # If role is 'admin', allow access.
            if token_role == "admin":
                return
            # Note: Explicit denial for guest tokens trying to access admin
            
    # 3. Deny All
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized: Admin access required",
    )

# Alias for backward compatibility if needed during refactor, 
# although we will update routers to use require_admin_access explicitly.
require_admin = require_admin_access
