# backend/app/routers/admin.py
# =============================================================================
# 👑 Rutas de administración: Gestión de Invitados (CRUD)
# - Protegido con API Key mediante dependencia `require_admin`
# - Permite Listar, Crear, Actualizar y Eliminar invitados.
# - Mantiene compatibilidad con importación en lote (legacy).
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
import re
from loguru import logger

import app.schemas as schemas
from app.core.security import require_admin
from app.db import get_db
from app.models import Guest
from app.crud import guests_crud

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ------------------------------ Helpers locales -------------------------------

def _normalize_email_local(email: Optional[str]) -> Optional[str]:
    """Devuelve el email en minúsculas y sin espacios, o None."""
    if not email:
        return None
    e = email.strip().lower()
    return e or None

def _normalize_phone_local(phone: Optional[str]) -> Optional[str]:
    """Deja solo dígitos y '+' en el teléfono, o None."""
    if not phone:
        return None
    digits = re.sub(r"[^\d+]", "", phone.strip())
    return digits or None

# --------------------------------- Endpoints -----------------------------------

@router.get("/guests", response_model=List[schemas.GuestResponse], dependencies=[Depends(require_admin)])
def list_guests(
    search: Optional[str] = None,
    rsvp_status: Optional[str] = None,
    side: Optional[str] = None, # Ajustado a str para flexibilidad, o usar schemas.SideEnum
    db: Session = Depends(get_db)
):
    """
    Listado de invitados con filtros opcionales.
    - search: Busca en nombre, email o teléfono (case-insensitive parcial).
    - rsvp_status: Filtra por estado (confirmed, declined, pending).
    - side: Filtra por lado (bride, groom, etc).
    """
    query = db.query(Guest)

    # 1. Filtro de Búsqueda (Search) - Compatible SQLite
    if search:
        term = search.strip().lower()
        query = query.filter(
            or_(
                func.lower(Guest.full_name).contains(term),
                func.lower(Guest.email).contains(term),
                func.lower(Guest.phone).contains(term)
            )
        )

    # 2. Filtro por Estado (RSVP Status)
    if rsvp_status:
        st = rsvp_status.lower()
        if st == 'confirmed':
            query = query.filter(Guest.confirmed == True)
        elif st in ['declined', 'no asiste', 'no']:
            query = query.filter(Guest.confirmed == False)
        elif st == 'pending':
            query = query.filter(Guest.confirmed == None)

    # 3. Filtro por Lado
    if side:
        # Normalizamos a lo que espera el Enum o DB
        query = query.filter(Guest.side == side)

    return query.all()


@router.post("/guests", response_model=schemas.GuestResponse, dependencies=[Depends(require_admin)])
def create_guest(
    payload: schemas.GuestCreateAdmin,
    db: Session = Depends(get_db)
):
    """
    Crea un invitado manualmente.
    Valida unicidad de email/teléfono antes de crear.
    """
    # Validaciones manuales de unicidad
    if payload.email:
        if guests_crud.get_by_email(db, payload.email):
            raise HTTPException(status_code=400, detail="El email ya está registrado.")
    
    if payload.phone:
        if guests_crud.get_by_phone(db, payload.phone):
            raise HTTPException(status_code=400, detail="El teléfono ya está registrado.")

    try:
        # Llamamos al CRUD. Nótese que usamos los campos del payload.
        # Si language/invite_type vienen como Enums, los pasamos directos.
        new_guest = guests_crud.create(
            db,
            full_name=payload.full_name,
            email=payload.email,
            phone=payload.phone,
            language=payload.language, 
            max_accomp=payload.max_accomp,
            invite_type=payload.invite_type,
            side=payload.side,
            relationship=payload.relationship,
            group_id=payload.group_id,
            guest_code=payload.guest_code # Opcional, el CRUD genera si es None
        )
        return new_guest
    except Exception as e:
        logger.error(f"Error creando invitado: {e}")
        raise HTTPException(status_code=500, detail="Error interno creando invitado.")


@router.put("/guests/{guest_id}", response_model=schemas.GuestResponse, dependencies=[Depends(require_admin)])
def update_guest(
    guest_id: int,
    payload: schemas.GuestUpdate,
    db: Session = Depends(get_db)
):
    """
    Actualiza campos de un invitado existente.
    """
    guest = db.query(Guest).filter(Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Invitado no encontrado.")
    
    # Validaciones de unicidad si cambian email/phone
    if payload.email and payload.email != guest.email:
        if guests_crud.get_by_email(db, payload.email):
             raise HTTPException(status_code=400, detail="El email ya pertenece a otro usuario.")
             
    if payload.phone:
        norm_phone = _normalize_phone_local(payload.phone)
        if norm_phone and norm_phone != guest.phone:
            if guests_crud.get_by_phone(db, norm_phone):
                raise HTTPException(status_code=400, detail="El teléfono ya pertenece a otro usuario.")

    # Usamos el nuevo método update del CRUD
    updated_guest = guests_crud.update(db, guest, payload)
    return updated_guest


@router.delete("/guests/{guest_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_guest(
    guest_id: int,
    db: Session = Depends(get_db)
):
    """
    Elimina un invitado físicamente.
    """
    # El CRUD debe manejar la verificación o devolver False si no existía
    deleted = guests_crud.delete(db, guest_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Invitado no encontrado.")
    return None # 204 No Content


# --------------------------------- Legacy Import Endpoint -----------------------------------
@router.post(
    "/import-guests",                                              # Ruta del endpoint.
    response_model=schemas.ImportGuestsResult,                     # 🔁 Respuesta tipada del módulo schemas.
    dependencies=[Depends(require_admin)],                         # Protege con API Key de admin.
)
def import_guests(payload: schemas.ImportGuestsPayload,            # 🔁 Request tipado del módulo schemas.
                  db: Session = Depends(get_db)):                  # Inyección de sesión de BD.
    """
    Importación en lote con upsert por email/phone (si existen).
    - Para cada ítem:
        1) Busca invitado existente por email (normalizado) o phone (normalizado).
        2) Si existe → actualiza campos principales (sin sobreescribir opcionales con None).
        3) Si no existe → crea nuevo Guest.
    - Nunca aborta el lote por un error de fila: acumula en `errors`.
    """
    created = 0                                                    # Contador de creados.
    updated = 0                                                    # Contador de actualizados.
    skipped = 0                                                    # Contador de filas saltadas por error.
    errors: List[str] = []                                         # Lista de errores por fila.

    for idx, item in enumerate(payload.items, start=1):            # Itera sobre cada invitado del payload.
        try:
            norm_email = _normalize_email_local(item.email)        # Normaliza email usando helper local.
            norm_phone = _normalize_phone_local(item.phone)        # Normaliza teléfono usando helper local.

            existing: Optional[Guest] = None                       # Inicializa variable de existente.
            if norm_email:                                         # Si hay email normalizado...
                existing = guests_crud.get_by_email(db, norm_email)# ...busca por email.
            if not existing and norm_phone:                        # Si no encontró y hay teléfono...
                existing = guests_crud.get_by_phone(db, norm_phone)# ...busca por teléfono.

            if existing:                                           # Si existe registro...
                existing.full_name = item.full_name                # Actualiza nombre.
                existing.language = item.language                  # Actualiza idioma.
                existing.max_accomp = item.max_accomp              # Actualiza máximo acompañantes.
                existing.invite_type = item.invite_type            # Actualiza tipo de invitación.
                if item.side is not None:                          # Actualiza side si vino.
                    existing.side = item.side
                if item.relationship is not None:                  # Actualiza relación si vino.
                    existing.relationship = item.relationship
                if item.group_id is not None:                      # Actualiza group_id si vino.
                    existing.group_id = item.group_id
                if norm_email:                                     # Actualiza email si vino.
                    existing.email = norm_email
                if norm_phone:                                     # Actualiza teléfono si vino.
                    existing.phone = norm_phone

                try:
                    guests_crud.commit(db, existing)               # Usa tu helper commit si existe.
                except AttributeError:
                    db.add(existing)                               # Fallback: añade a la sesión.
                    db.commit()                                    # Confirma cambios.
                    db.refresh(existing)                           # Refresca desde DB.

                updated += 1                                       # Incrementa contador de updates.

            else:                                                  # Si no existe, crea nuevo registro...
                _ = guests_crud.create(                            # Usa tu helper create para persistir.
                    db,
                    full_name=item.full_name,
                    email=norm_email,
                    phone=norm_phone,
                    language=item.language,
                    max_accomp=item.max_accomp,
                    invite_type=item.invite_type,
                    side=item.side,
                    relationship=item.relationship,
                    group_id=item.group_id,
                )
                try:
                    db.flush()                                     # Asegura INSERT antes de contar (opcional).
                except Exception:
                    pass
                created += 1                                       # Incrementa contador de creaciones.

        except Exception as e:                                     # Si algo falla en esta fila...
            skipped += 1                                           # Cuenta como saltada.
            errors.append(f"Row {idx}: {e}")                       # Guarda el error legible.

    return schemas.ImportGuestsResult(                             # Devuelve resumen del lote.
        created=created, updated=updated, skipped=skipped, errors=errors
    )
