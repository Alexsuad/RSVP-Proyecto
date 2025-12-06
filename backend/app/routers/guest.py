# app/routers/guest.py
"""
Router de Gestión de Invitados y RSVP.

Este módulo expone los endpoints protegidos para que un invitado autenticado:
- Consulte su perfil y detalles de la invitación.
- Registre o actualice su confirmación de asistencia (RSVP).
- Gestione sus acompañantes y preferencias (alergias, notas).
"""

import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from loguru import logger

from app.db import SessionLocal
from app import models, schemas, auth, mailer
from app.models import InviteTypeEnum

# --- Configuración ---
router = APIRouter(prefix="/api/guest", tags=["guest"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")


# --- Helpers ---
def _mask_email(addr: str | None) -> str:
    """Ofusca una dirección de correo para registro en logs seguros."""
    if not addr:
        return "<no-email>"
    addr = addr.strip()
    if "@" not in addr or len(addr) < 3:
        return addr[:2] + "***"
    name, dom = addr.split("@", 1)
    return f"{name[:2]}***@{dom}"


# --- Dependencias ---
def get_db() -> Session:
    """Provee una sesión de base de datos transaccional."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_guest(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.Guest:
    """
    Dependencia de autenticación.
    Valida el Token JWT y recupera la instancia del invitado asociado.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = auth.verify_access_token(token)
    if payload is None:
        raise credentials_exception

    guest_code = payload.get("sub")
    if not guest_code:
        raise credentials_exception

    guest = db.query(models.Guest).filter(
        models.Guest.guest_code == guest_code
    ).first()
    
    if not guest:
        raise credentials_exception

    return guest


# =================================================================================
# Endpoints
# =================================================================================

# =================================================================================
# Endpoints
# =================================================================================

# --- RUTAS PROTEGIDAS (Requieren Token) ---

@router.get("/me", response_model=schemas.GuestWithCompanionsResponse)
def get_my_profile(
    current_guest: models.Guest = Depends(get_current_guest),
):
    """
    Obtiene el perfil completo del invitado autenticado.
    """
    return _format_response(current_guest)


@router.post("/me/rsvp", response_model=schemas.GuestWithCompanionsResponse)
def update_my_rsvp(
    payload: schemas.RSVPUpdateRequest,
    db: Session = Depends(get_db),
    current_guest: models.Guest = Depends(get_current_guest),
):
    """
    Procesa y actualiza la confirmación de asistencia (RSVP) [Autenticado].
    """
    # 1. Validación de fecha límite
    _check_deadline()

    # 2. Validación de cupo máximo (Solo si asiste)
    if payload.attending:
        if len(payload.companions) > (current_guest.max_accomp or 0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Has superado el número máximo de acompañantes permitido."
            )

    # 3. Delegar Update al CRUD (Atómico)
    # Llama a guests_crud.update_rsvp
    # Maneja conflicto de email/phone si ocurre (IntegrityError en CRUD re-lanzado?)
    try:
        from app.crud import guests_crud
        updated_guest = guests_crud.update_rsvp(db, current_guest, payload.attending, payload)
    except Exception as e:
        # Si es integridad (email duplicado), el CRUD debería manejarlo o lo capturamos
        # Asumimos que guests_crud puede lanzar excepciones de integridad
        if "IntegrityError" in str(type(e).__name__):
             raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error_code": "EMAIL_OR_PHONE_CONFLICT", "message_key": "form.email_or_phone_conflict"}
            )
        logger.error(f"Error procesando RSVP: {e}")
        raise HTTPException(status_code=500, detail="Error interno procesando RSVP")

    # 4. Enviar Email
    _send_rsvp_email(updated_guest)

    return _format_response(updated_guest)


# --- RUTAS PÚBLICAS (Acceso por Código) ---

@router.get("/code/{guest_code}", response_model=schemas.GuestWithCompanionsResponse)
def get_guest_by_code(
    guest_code: str,
    db: Session = Depends(get_db)
):
    """
    [PÚBLICO] Obtiene datos del invitado por su código (para cargar el formulario).
    Actúa como login implícito de solo lectura.
    """
    from app.crud import guests_crud
    guest = guests_crud.get_by_guest_code(db, guest_code)
    if not guest:
        raise HTTPException(status_code=404, detail="Código de invitado no válido.")
    
    return _format_response(guest)


@router.post("/code/{guest_code}/rsvp", response_model=schemas.GuestWithCompanionsResponse)
def submit_public_rsvp(
    guest_code: str,
    payload: schemas.RSVPUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    [PÚBLICO] Envía la confirmación usando el código de invitado.
    """
    from app.crud import guests_crud
    guest = guests_crud.get_by_guest_code(db, guest_code)
    if not guest:
        raise HTTPException(status_code=404, detail="Código de invitado no válido.")

    # 1. Validación de fecha límite
    _check_deadline()
    
    # 2. Validación de cupo máximo
    if payload.attending:
        if len(payload.companions) > (guest.max_accomp or 0):
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Has superado el número máximo de acompañantes permitido."
            )
            
    # 3. Delegar Update al CRUD
    try:
        updated_guest = guests_crud.update_rsvp(db, guest, payload.attending, payload)
    except Exception as e:
        if "IntegrityError" in str(type(e).__name__):
             raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error_code": "EMAIL_OR_PHONE_CONFLICT", "message_key": "form.email_or_phone_conflict"}
            )
        logger.error(f"Error procesando RSVP público: {e}")
        raise HTTPException(status_code=500, detail="Error interno procesando RSVP")
        
    # 4. Enviar Email
    _send_rsvp_email(updated_guest)
    
    return _format_response(updated_guest)


# --- HELPERS INTERNOS ---

def _check_deadline():
    deadline_str = os.getenv("RSVP_DEADLINE", "2026-01-20")
    try:
        deadline = datetime.fromisoformat(deadline_str)
    except:
        deadline = datetime(2099, 12, 31)
        
    if datetime.utcnow() > deadline:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha límite para confirmar la asistencia ya ha pasado."
        )

def _format_response(guest: models.Guest) -> schemas.GuestWithCompanionsResponse:
    is_full_invite = (guest.invite_type == InviteTypeEnum.full)
    resp = schemas.GuestWithCompanionsResponse.model_validate(guest)
    resp.invited_to_ceremony = is_full_invite
    resp.invite_scope = "ceremony+reception" if is_full_invite else "reception-only"
    return resp

def _send_rsvp_email(guest: models.Guest):
    """Envía el correo de confirmación o declinación."""
    try:
        if not guest.email:
            return

        attending = bool(guest.confirmed)
        summary = {
            "guest_name": guest.full_name or "",
            "invite_scope": "ceremony+reception" if guest.invite_type == InviteTypeEnum.full else "reception-only",
            "attending": attending,
            "companions": [],
            "allergies": guest.allergies or "",
            "notes": (guest.notes or None),
        }
        
        if attending:
            summary["companions"] = [
                {"name": c.name or "", "label": ("child" if c.is_child else "adult"), "allergens": c.allergies or ""}
                for c in (guest.companions or [])
            ]
            
        ok = mailer.send_confirmation_email(
            to_email=guest.email,
            language=(guest.language.value if guest.language else "en"),
            summary=summary,
        )
        if not ok:
            logger.error(f"Fallo envío email RSVP id={guest.id}")
            
    except Exception as e:
        logger.error(f"Excepción enviando email RSVP id={guest.id} err={e}")


@router.post("/me/rsvp", response_model=schemas.GuestWithCompanionsResponse)
def update_my_rsvp(
    payload: schemas.RSVPUpdateRequest,
    db: Session = Depends(get_db),
    current_guest: models.Guest = Depends(get_current_guest),
):
    """
    Procesa y actualiza la confirmación de asistencia (RSVP).

    Realiza las siguientes acciones:
    1. Valida la fecha límite de confirmación.
    2. Si se declina: limpia datos de acompañantes y preferencias.
    3. Si se acepta: valida cupos, actualiza acompañantes y contadores.
    4. Envía un correo electrónico de confirmación con el resumen.
    """
    # 1. Validación de fecha límite
    deadline_str = os.getenv("RSVP_DEADLINE", "2026-01-20")
    try:
        deadline = datetime.fromisoformat(deadline_str)
    except Exception:
        # Fallback seguro en caso de error de configuración
        deadline = datetime.fromisoformat("2099-12-31")

    if datetime.utcnow() > deadline:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha límite para confirmar la asistencia ya ha pasado.",
        )

    # 2. Caso: Invitado Declina Asistencia
    if not payload.attending:
        current_guest.confirmed = False
        current_guest.confirmed_at = datetime.utcnow()
        current_guest.menu_choice = None
        current_guest.allergies = None
        current_guest.needs_accommodation = bool(payload.needs_accommodation)
        current_guest.needs_transport = bool(payload.needs_transport)
        current_guest.companions.clear()
        current_guest.num_adults = 0
        current_guest.num_children = 0
        current_guest.notes = (payload.notes or None)

        db.commit()
        db.refresh(current_guest)

        logger.info(
            "RSVP: declinado | guest_id={} | code={} | email={}",
            current_guest.id, current_guest.guest_code, _mask_email(current_guest.email)
        )

        # Envío de correo de declinación
        try:
            if current_guest.email:
                summary = {
                    "guest_name": current_guest.full_name or "",
                    "invite_scope": "ceremony+reception" if current_guest.invite_type == InviteTypeEnum.full else "reception-only",
                    "attending": False,
                    "companions": [],
                    "allergies": "",
                    "notes": None,
                }
                ok = mailer.send_confirmation_email(
                    to_email=current_guest.email,
                    language=(current_guest.language.value if current_guest.language else "en"),
                    summary=summary,
                )
                if not ok:
                    logger.error("RSVP: Fallo envío email (ret False) id={}", current_guest.id)
        except Exception as e:
            logger.error("RSVP: Excepción enviando email (declinó) id={} err={}", current_guest.id, e)

        # Retorno de respuesta actualizada
        is_full_invite = (current_guest.invite_type == InviteTypeEnum.full)
        resp = schemas.GuestWithCompanionsResponse.model_validate(current_guest)
        resp.invited_to_ceremony = is_full_invite
        resp.invite_scope = "ceremony+reception" if is_full_invite else "reception-only"
        return resp

    # 3. Caso: Invitado Confirma Asistencia
    
    # Validación de cupo máximo
    if len(payload.companions) > (current_guest.max_accomp or 0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Has superado el número máximo de acompañantes permitido."
        )

    # Cálculo de contadores
    titular_adult = 1
    adults = titular_adult + sum(1 for c in payload.companions if not c.is_child)
    children = sum(1 for c in payload.companions if c.is_child)

    # Persistencia de datos del titular
    current_guest.confirmed = True
    current_guest.confirmed_at = datetime.utcnow()
    current_guest.menu_choice = None
    current_guest.allergies = (payload.allergies or None)
    current_guest.needs_accommodation = bool(payload.needs_accommodation)
    current_guest.needs_transport = bool(payload.needs_transport)
    current_guest.notes = (payload.notes or None)
    
    # Actualización de contacto si se provee nuevo
    current_guest.email = (payload.email or current_guest.email)
    current_guest.phone = (payload.phone or current_guest.phone)

    # Actualización de acompañantes (Reemplazo completo)
    current_guest.companions.clear()
    for c in payload.companions:
        current_guest.companions.append(
            models.Companion(
                guest_id=current_guest.id,
                name=c.name.strip(),
                is_child=bool(c.is_child),
                menu_choice=None,
                allergies=(c.allergies or None),
            )
        )

    # Actualización de contadores y Commit
    current_guest.num_adults = adults
    current_guest.num_children = children
    
    try:
        db.commit()
        db.refresh(current_guest)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error_code": "EMAIL_OR_PHONE_CONFLICT",
                "message_key": "form.email_or_phone_conflict"
            }
        )
        
    logger.info(
        "RSVP: confirmado | id={} | code={} | email={} | adults={} | children={}",
        current_guest.id, current_guest.guest_code, _mask_email(current_guest.email),
        current_guest.num_adults, current_guest.num_children
    )

    # Envío de correo de confirmación
    try:
        if current_guest.email:
            summary = {
                "guest_name": current_guest.full_name or "",
                "invite_scope": "ceremony+reception" if current_guest.invite_type == InviteTypeEnum.full else "reception-only",
                "attending": True,
                "companions": [
                    {"name": c.name or "", "label": ("child" if c.is_child else "adult"), "allergens": c.allergies or ""}
                    for c in (current_guest.companions or [])
                ],
                "allergies": current_guest.allergies or "",
                "notes": (current_guest.notes or None),
            }
            ok = mailer.send_confirmation_email(
                to_email=current_guest.email,
                language=(current_guest.language.value if current_guest.language else "en"),
                summary=summary,
            )
            if not ok:
                logger.error("RSVP: Fallo envío email (confirmación) id={}", current_guest.id)
    except Exception as e:
        logger.error("RSVP: Excepción enviando email (confirmación) id={} err={}", current_guest.id, e)

    # Retorno de respuesta final
    is_full_invite = (current_guest.invite_type == InviteTypeEnum.full)
    resp = schemas.GuestWithCompanionsResponse.model_validate(current_guest)
    resp.invited_to_ceremony = is_full_invite
    resp.invite_scope = "ceremony+reception" if is_full_invite else "reception-only"
    return resp