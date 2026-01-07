# app/routers/auth_routes.py
"""
Router de Autenticación y Gestión de Accesos.

Este módulo implementa los endpoints críticos para la identificación de usuarios,
gestionando el ciclo de vida de:
- Login tradicional (Código + Contacto).
- Recuperación de credenciales.
- Solicitud de acceso mediante Magic Link (enlaces temporales firmados).
- Canje de tokens para obtención de sesión JWT.

Cumple con los estándares de seguridad (Rate Limiting, Sanitización) y
devuelve respuestas normalizadas para el consumo del cliente frontend.
"""

import os
import time
import re
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from loguru import logger

# Importaciones internas del núcleo del sistema
from app import models, schemas, auth, mailer
from app.db import SessionLocal
from app.rate_limit import is_allowed, get_limits_from_env
from app.crud import guests_crud  # Import module for namespaced usage
from app.crud.guests_crud import (
    find_guest_for_magic,
    set_magic_link,
    consume_magic_link,
)
from app.utils.i18n import resolve_lang
from app.utils.phone import normalize_phone  # Utilidad centralizada de normalización

# --- Configuración e Inicialización ---
router = APIRouter(prefix="/api", tags=["auth"])

def get_db():
    """Dependencia para inyección de sesión de base de datos."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Configuración de Rate Limits (Leídos del entorno o defaults seguros)
LOGIN_MAX, LOGIN_WINDOW = get_limits_from_env("LOGIN_RL", default_max=5, default_window=60)
RECOVER_MAX, RECOVER_WINDOW = get_limits_from_env("RECOVER_RL", default_max=3, default_window=120)
REQUEST_MAX, REQUEST_WINDOW = get_limits_from_env("REQUEST_RL", default_max=RECOVER_MAX, default_window=RECOVER_WINDOW)

# Variables de entorno críticas
RSVP_URL = os.getenv("RSVP_URL", "https://rsvp.suarezsiicawedding.com")
MAGIC_EXPIRE_MIN = int(os.getenv("MAGIC_LINK_EXPIRE_MINUTES", "15"))
ACCESS_EXPIRE_MIN = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
SEND_ACCESS_MODE = os.getenv("SEND_ACCESS_MODE", "code").strip().lower()


# --- Helpers de Normalización ---
def _client_ip(request: Request) -> str:
    """
    Obtiene la dirección IP real del cliente, resolviendo proxies inversos.
    
    Returns:
        str: IP del cliente o 'unknown'.
    """
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"



def _norm_email(s: str | None) -> str:
    """Normaliza un email a minúsculas y sin espacios extremos."""
    return (s or "").strip().lower()


# =================================================================================
# 🔐 Endpoints de Autenticación
# =================================================================================

@router.post("/login")
def login(
    login_data: schemas.LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Autentica a un invitado y emite un token de acceso (JWT).

    Valida las credenciales (código + email/teléfono) contra la base de datos.
    Aplica rate-limiting por IP para prevenir fuerza bruta.

    Args:
        login_data (LoginRequest): Credenciales proporcionadas.
    
    Returns:
        dict: Token JWT y tipo.
    """
    # 1. Verificación de Rate Limit
    client_ip = _client_ip(request)
    rl_key = f"login:{client_ip}"
    if not is_allowed(rl_key, LOGIN_MAX, LOGIN_WINDOW):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"ok": False, "error": "rate_limited"},
            headers={"Retry-After": str(LOGIN_WINDOW)},
        )

    # 2. Normalización de entradas
    guest_code = (login_data.guest_code or "").strip()
    email = _norm_email(login_data.email)


    if not guest_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"ok": False, "error": "missing_guest_code", "message": "Falta el código de invitado."},
        )

    # 3. Búsqueda y Validación
    # Estrategia: Buscar por guest_code (único) y luego validar el contacto (email o teléfono).
    guest = guests_crud.get_by_guest_code(db, guest_code)
    
    if not guest:
        # Por seguridad, mismo error que credenciales inválidas para no enumerar usuarios
        logger.info("Login fallido: code='{}' no existe. ip={}", guest_code, client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"ok": False, "error": "invalid_credentials", "message": "Credenciales incorrectas."},
        )

    credentials_valid = False
    
    if email:
        # Validación por Email
        db_email = _norm_email(guest.email)
        if db_email == email:
            credentials_valid = True
    elif login_data.phone:
        # Validación por Teléfono (usando normalización centralizada)
        input_phone_norm = normalize_phone(login_data.phone)
        db_phone_norm = normalize_phone(guest.phone)
        
        # Comparamos solo dígitos: "34600..." == "34600..."
        if input_phone_norm and db_phone_norm and input_phone_norm == db_phone_norm:
            credentials_valid = True
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"ok": False, "error": "missing_contact", "message": "Falta email o teléfono."},
        )

    if not credentials_valid:
        logger.info("Login fallido: code='{}' contacto no coincide. ip={}", guest_code, client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"ok": False, "error": "invalid_credentials", "message": "Credenciales incorrectas."},
        )

    # 5. Emisión del Token
    access_token = auth.create_access_token(subject=guest.guest_code)
    logger.info("Login exitoso code='{}' ip={}", guest.guest_code, client_ip)
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/recover-code")
def recover_code(
    recovery_data: schemas.RecoveryRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Solicita el envío del código de invitación por correo electrónico.
    
    Permite al usuario recuperar su acceso si olvidó su código, validando
    su identidad mediante el email o teléfono registrado.
    """
    client_ip = _client_ip(request)
    rl_key = f"recover:{client_ip}"
    
    # Rate Limiting
    if not is_allowed(rl_key, RECOVER_MAX, RECOVER_WINDOW):
        logger.warning(f"Recover rate-limited ip={client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"ok": False, "error": "rate_limited", "message": "Demasiados intentos."},
            headers={"Retry-After": str(RECOVER_WINDOW)},
        )

    # Búsqueda de invitado
    guest = None
    if recovery_data.email:
        guest = db.query(models.Guest).filter(models.Guest.email == recovery_data.email).first()
    if not guest and recovery_data.phone:
        guest = db.query(models.Guest).filter(models.Guest.phone == recovery_data.phone).first()

    # Respuesta neutra/error si no se encuentra o no tiene email
    if not guest or not guest.email:
        logger.info(f"Recover fallido ip={client_ip}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"ok": False, "error": "guest_not_found", "message": "No se encontró la invitación."},
        )

    # Resolución de idioma para el correo
    accept_lang = request.headers.get("Accept-Language")
    lang_from_guest = getattr(getattr(guest, "language", None), "value", getattr(guest, "language", None))
    final_lang = resolve_lang(
        payload_lang=getattr(recovery_data, "lang", None),
        guest_lang=lang_from_guest,
        accept_language_header=accept_lang,
        email=guest.email,
        default="es",
    )

    # Envío del correo
    try:
        mailer.send_recovery_email(
            to_email=guest.email,
            guest_name=guest.full_name,
            guest_code=guest.guest_code,
            language=final_lang,
        )
        logger.info("Recover email enviado a guest_id={}", getattr(guest, "id", None))
    except Exception as e:
        logger.exception("Error enviando recover email: {}", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"ok": False, "error": "mail_error", "message": "Error al enviar el correo."},
        )

    return {"ok": True, "message": "Código enviado al correo asociado."}


@router.post("/request-access")
def request_access(
    payload: schemas.RequestAccessPayload,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Gestiona la solicitud de acceso (Magic Link o Código).
    
    Busca un invitado basándose en coincidencia parcial (nombre + últimos 4 dígitos del teléfono).
    Si se encuentra, actualiza el email y envía las credenciales de acceso.
    """
    client_ip = _client_ip(request)
    rl_key = f"request_access:{client_ip}"
    if not is_allowed(rl_key, REQUEST_MAX, REQUEST_WINDOW):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"ok": False, "error": "rate_limited"},
            headers={"Retry-After": str(REQUEST_WINDOW)},
        )

    # 1. Normalización
    email_in = _norm_email(payload.email)
    last4_in = (payload.phone_last4 or "").strip()
    full_name_in = (payload.full_name or "").strip()

    # 2. Búsqueda "Fuzzy" (Nombre + Last4)
    guest = find_guest_for_magic(db, full_name_in, last4_in, (email_in or ""))

    # 3. Lógica de Actualización y Conflicto
    conflict_data = {}
    if guest:
        # Verificamos si el email ya está en uso por OTRO invitado
        stored_email = (guest.email or "").strip().lower()
        
        if email_in and email_in != stored_email:
            existing = db.query(models.Guest).filter(func.lower(models.Guest.email) == email_in).first()
            if existing and existing.id != guest.id:
                # Conflicto detectado: el email pertenece a otro.
                logger.warning("Conflicto de email en request-access: {}", email_in)
                conflict_data = {
                    "email_conflict": True,
                    "message_key": "request.email_or_phone_conflict"
                }
            else:
                # Sin conflicto: actualizamos el email del invitado
                guest.email = email_in
                # Actualizar consentimiento
                if hasattr(guest, "consent"):
                    guest.consent = bool(getattr(payload, "consent", False))
                db.add(guest)
                db.commit()
                db.refresh(guest)

    # 4. Respuesta Genérica (Seguridad por oscuridad)
    # Se devuelve OK aunque no se encuentre, para no revelar existencia de usuarios.
    response_data = {
        "ok": True,
        "message": "Si los datos coinciden, recibirás un correo.",
        "expires_in_sec": MAGIC_EXPIRE_MIN * 60,
    }
    response_data.update(conflict_data) # Inyectamos info de conflicto si hubo

    if not guest:
        # Si no se encontró, simulamos éxito pero retornamos 404 para que el frontend sepa
        # (Según lógica original del proyecto)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró una invitación con esos datos."
        )

    # 5. Envío del Correo (Solo si no hay conflicto y hay email válido)
    to_email = guest.email or email_in
    if to_email and not conflict_data:
        # Resolución de idioma
        lang_from_guest = getattr(getattr(guest, "language", None), "value", getattr(guest, "language", None))
        final_lang = resolve_lang(
            payload_lang=getattr(payload, "lang", None),
            guest_lang=lang_from_guest,
            email=to_email,
            default="es",
        )

        try:
            if SEND_ACCESS_MODE == "magic":
                # Generación de Token Mágico
                token = auth.create_magic_token(guest.guest_code, to_email)
                # Persistencia del Token
                set_magic_link(db, guest, token, ttl_minutes=MAGIC_EXPIRE_MIN)
                
                magic_url = f"{RSVP_URL.rstrip('/')}/magic-login?token={token}"
                mailer.send_magic_link_email(
                    to_email=to_email,
                    language=final_lang,
                    magic_url=magic_url,
                )
            else:
                # Modo Clásico: Enviar código (CORRECCIÓN: Usar función original de Welcome)
                mailer.send_guest_code_email(
                    to_email=to_email,
                    guest_name=guest.full_name,
                    guest_code=guest.guest_code,
                    language=final_lang,
                )
            logger.info("Acceso enviado a guest_id={}", guest.id)
        except Exception as e:
            logger.exception("Error enviando acceso: {}", e)
            # No fallamos la request HTTP si el correo falla, pero logueamos
            
    return response_data


@router.post("/magic-login")
def magic_login(
    payload: schemas.MagicLoginPayload,
    db: Session = Depends(get_db),
):
    """
    Canjea un Token Mágico por una sesión válida.
    
    Verifica la firma, expiración y estado de uso del token.
    """
    # 1. Decodificación y validación de firma JWT
    try:
        auth.decode_magic_token(payload.token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_41_UNAUTHORIZED,
            detail={"ok": False, "error": "invalid_token", "message": str(e)},
        )

    # 2. Consumo del token en Base de Datos (Un solo uso)
    guest = consume_magic_link(db, payload.token)
    if not guest:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"ok": False, "error": "invalid_or_used_token"},
        )

    # 3. Emisión de Token de Acceso
    access_token = auth.create_access_token(subject=guest.guest_code)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }