# backend/app/routers/admin.py
# =============================================================================
# 👑 Rutas de administración: Gestión de Invitados (CRUD + Import/Export CSV)
# - Protegido con JWT admin o API Key legacy mediante `require_admin_access`.
# - Permite Listar, Crear, Actualizar y Eliminar invitados.
# - Export CSV: descarga de todos los invitados en formato CSV.
# - Import CSV: carga masiva con upsert por teléfono normalizado.
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional, Set
import re
import io
import csv
from loguru import logger

import app.schemas as schemas
from app.core.security import require_admin_access
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
    """Deja solo dígitos en el teléfono, o None. Elimina +, espacios, etc."""
    if not phone:
        return None
    # Estricto: solo dígitos [0-9] para canonicalización
    digits = re.sub(r"[^\d]", "", phone.strip())
    return digits or None

# --------------------------------- Endpoints -----------------------------------

@router.get("/stats", response_model=schemas.AdminStatsResponse, dependencies=[Depends(require_admin_access)])
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Calcula y devuelve las métricas clave (KPIs) del evento en tiempo real.
    Devuelve totales, desglose de respuestas y conteos de asistencia.
    """
    # 1. Totales generales de invitaciones (filas en BD)
    total_guests = db.query(func.count(Guest.id)).scalar() or 0

    # 2. Desglose por estado de confirmación
    # Confirmados (True)
    confirmed_attendees = db.query(func.count(Guest.id)).filter(Guest.confirmed == True).scalar() or 0
    # No asisten (False)
    not_attending = db.query(func.count(Guest.id)).filter(Guest.confirmed == False).scalar() or 0
    # Pendientes (None)
    pending_rsvp = db.query(func.count(Guest.id)).filter(Guest.confirmed == None).scalar() or 0
    
    # Respuestas totales (Confirmados + No asisten)
    # Alternativa: count(id) where confirmed IS NOT NULL
    responses_received = confirmed_attendees + not_attending

    # 3. Totales de Personas y Perfiles (Solo Confirmados)
    # total_companions: Suma de adultos + niños de los registros confirmados.
    # total_children: Suma de niños de los registros confirmados.
    
    # Consulta agregada para sumar num_adults y num_children de invitados CONFIRMADOS
    # Usamos coalesce para manejar nulos como 0 por seguridad
    people_stats = db.query(
        func.sum(func.coalesce(Guest.num_adults, 0)),
        func.sum(func.coalesce(Guest.num_children, 0))
    ).filter(Guest.confirmed == True).first()

    sum_adults = people_stats[0] or 0
    sum_children = people_stats[1] or 0
    
    total_companions = sum_adults + sum_children
    total_children = sum_children

    # 4. Alergias (Cualquiera con texto en alergias, independientemente de confirmación, 
    # o quizás mejor solo confirmados? El requerimiento dice "Guests with allergies count"
    # Generalmente interesa saber de todos para planificar o solo los que vienen.
    # Asumiremos TODOS para tener el dato crudo, o solo confirmados si el dashboard es "Asistencia".
    # La especificación de tarea no lo restringió, pero por coherencia Dashboard suele ser "Confirmed Stats".
    # Sin embargo, la definición de "guests_with_allergies" suele ser global.
    # Para ser conservador y útil, mostraremos el total de alertas de alergia en BD.
    guests_with_allergies = db.query(func.count(Guest.id)).filter(Guest.allergies != None, Guest.allergies != "").scalar() or 0

    return schemas.AdminStatsResponse(
        total_guests=total_guests,
        responses_received=responses_received,
        confirmed_attendees=confirmed_attendees,
        pending_rsvp=pending_rsvp,
        not_attending=not_attending,
        total_companions=total_companions,
        total_children=total_children,
        guests_with_allergies=guests_with_allergies
    )


@router.get("/guests", response_model=List[schemas.GuestResponse], dependencies=[Depends(require_admin_access)])
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


@router.post("/guests", response_model=schemas.GuestResponse, dependencies=[Depends(require_admin_access)])
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


@router.put("/guests/{guest_id}", response_model=schemas.GuestResponse, dependencies=[Depends(require_admin_access)])
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


@router.delete("/guests/{guest_id}", status_code=204, dependencies=[Depends(require_admin_access)])
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


# --------------------------------- Export/Import CSV (Épica B) -----------------------------------

# Columnas exactas para export/import CSV (orden definido en la especificación).
CSV_COLUMNS = [
    "guest_code", "full_name", "email", "phone", "language",
    "max_accomp", "invite_type", "side", "relationship", "group_id"
]

@router.get(
    "/guests-export",
    dependencies=[Depends(require_admin_access)],
    summary="Exportar invitados a CSV",
)
def export_guests_csv(db: Session = Depends(get_db)):
    """
    Descarga un archivo CSV con todos los invitados.
    Columnas: guest_code, full_name, email, phone, language, max_accomp,
              invite_type, side, relationship, group_id.
    El teléfono se exporta normalizado (sin espacios ni símbolos extra).
    """
    guests = db.query(Guest).all()                                              # Obtiene todos los invitados.

    # Genera el CSV en memoria usando StringIO.
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_COLUMNS)
    writer.writeheader()

    for g in guests:
        # Extrae valores de enums si existen, o string vacío.
        lang_val = g.language.value if g.language else ""
        invite_val = g.invite_type.value if g.invite_type else ""
        side_val = g.side.value if g.side else ""

        writer.writerow({
            "guest_code": g.guest_code or "",
            "full_name": g.full_name or "",
            "email": g.email or "",
            "phone": _normalize_phone_local(g.phone) or "",                     # Normaliza para consistencia.
            "language": lang_val,
            "max_accomp": g.max_accomp if g.max_accomp is not None else 0,
            "invite_type": invite_val,
            "side": side_val,
            "relationship": g.relationship or "",
            "group_id": g.group_id or "",
        })

    output.seek(0)                                                              # Rebobina al inicio del buffer.

    # Retorna como archivo descargable.
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="guests_export.csv"'}
    )


@router.post(
    "/guests-import",
    response_model=schemas.CsvImportResult,
    dependencies=[Depends(require_admin_access)],
    summary="Importar invitados desde CSV",
)
async def import_guests_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Importa invitados desde un archivo CSV (multipart/form-data).
    
    Reglas de negocio:
    - phone: obligatorio, único, llave de upsert (mínimo 6 dígitos después de normalizar).
    - full_name: obligatorio.
    - guest_code: ignorado (autogenerado si es nuevo, no se cambia en update).
    - Si phone duplicado dentro del CSV: se rechaza la fila duplicada.
    - Upsert por phone normalizado: crear si no existe, actualizar si existe.
    """
    created_count = 0
    updated_count = 0
    rejected_count = 0
    errors: List[schemas.CsvImportError] = []

    # Lee el contenido del archivo.
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")                                      # utf-8-sig para manejar BOM de Excel.
    except UnicodeDecodeError:
        text = content.decode("latin-1")                                        # Fallback para encoding alternativo.

    # Parsea el CSV.
    reader = csv.DictReader(io.StringIO(text))

    # Set para detectar duplicados de phone dentro del mismo CSV.
    seen_phones: Set[str] = set()

    for row_idx, row in enumerate(reader, start=2):                             # start=2 porque row 1 es header.
        phone_raw = (row.get("phone") or "").strip()
        full_name = (row.get("full_name") or "").strip()
        csv_guest_code = (row.get("guest_code") or "").strip()

        # --- Validación 1: full_name obligatorio ---
        if not full_name:
            errors.append(schemas.CsvImportError(
                row_number=row_idx,
                phone_raw=phone_raw,
                reason="full_name es obligatorio"
            ))
            rejected_count += 1
            continue

        # --- Validación 2: phone obligatorio y válido ---
        phone_norm = _normalize_phone_local(phone_raw)
        if not phone_norm:
            errors.append(schemas.CsvImportError(
                row_number=row_idx,
                phone_raw=phone_raw,
                reason="phone es obligatorio"
            ))
            rejected_count += 1
            continue

        # Validar longitud mínima (6 dígitos después de normalizar).
        digits_only = re.sub(r"[^\d]", "", phone_norm)
        if len(digits_only) < 6:
            errors.append(schemas.CsvImportError(
                row_number=row_idx,
                phone_raw=phone_raw,
                reason="phone inválido (mínimo 6 dígitos)"
            ))
            rejected_count += 1
            continue

        # --- Validación 3: duplicado dentro del CSV ---
        if phone_norm in seen_phones:
            errors.append(schemas.CsvImportError(
                row_number=row_idx,
                phone_raw=phone_raw,
                reason="phone duplicado en el archivo"
            ))
            rejected_count += 1
            continue
        seen_phones.add(phone_norm)

        # --- Extrae y valida campos opcionales ---
        email_raw = (row.get("email") or "").strip().lower() or None
        language = (row.get("language") or "en").strip().lower()
        max_accomp_str = (row.get("max_accomp") or "0").strip()
        invite_type = (row.get("invite_type") or "full").strip().lower()
        side = (row.get("side") or "").strip().lower() or None
        relationship = (row.get("relationship") or "").strip() or None
        group_id = (row.get("group_id") or "").strip() or None

        # Parsea max_accomp a entero.
        try:
            max_accomp = int(max_accomp_str)
            if max_accomp < 0:
                max_accomp = 0
        except ValueError:
            max_accomp = 0

        # Valida enums (defaults si inválidos).
        try:
            # Convertir a Enum members reales para evitar errores de DB
            language = schemas.LanguageEnum(language)
        except ValueError:
            language = schemas.LanguageEnum.en

        try:
            invite_type = schemas.InviteTypeEnum(invite_type)
        except ValueError:
            invite_type = schemas.InviteTypeEnum.full

        if side and side not in ("bride", "groom"):
            side = None
        # side es opcional, lo convertimos si existe
        side_enum = schemas.SideEnum(side) if side else None

        try:
            # Busca invitado existente por phone normalizado.
            existing = guests_crud.get_by_phone(db, phone_norm)

            if existing:
                # --- UPDATE: actualiza campos (NO cambia guest_code) ---
                
                # Log warning si el CSV trae guest_code diferente.
                if csv_guest_code and csv_guest_code != existing.guest_code:
                    logger.warning(
                        "Import CSV: guest_code diferente ignorado | row={} | csv='{}' | db='{}'",
                        row_idx, csv_guest_code, existing.guest_code
                    )

                existing.full_name = full_name
                if email_raw:
                    existing.email = email_raw
                existing.language = language
                existing.max_accomp = max_accomp
                existing.invite_type = invite_type
                if side_enum:
                    existing.side = side_enum
                if relationship:
                    existing.relationship = relationship
                # group_id siempre se actualiza (puede ser None para limpiarlo).
                existing.group_id = group_id

                db.add(existing)
                db.commit()
                db.refresh(existing)
                updated_count += 1

            else:
                # --- CREATE: nuevo invitado (guest_code autogenerado) ---
                _ = guests_crud.create(
                    db,
                    full_name=full_name,
                    email=email_raw,
                    phone=phone_norm,
                    language=language,
                    max_accomp=max_accomp,
                    invite_type=invite_type,
                    side=side_enum,
                    relationship=relationship,
                    group_id=group_id,
                    guest_code=None,                                            # Siempre autogenerar.
                    commit_immediately=True,
                )
                created_count += 1

        except Exception as e:
            logger.error("Import CSV error | row={} | phone='{}' | error={}", row_idx, phone_raw, str(e))
            db.rollback()
            errors.append(schemas.CsvImportError(
                row_number=row_idx,
                phone_raw=phone_raw,
                reason=f"Error interno: {str(e)[:100]}"
            ))
            rejected_count += 1

    return schemas.CsvImportResult(
        created_count=created_count,
        updated_count=updated_count,
        rejected_count=rejected_count,
        errors=errors,
    )


# --------------------------------- Legacy Import Endpoint -----------------------------------
@router.post(
    "/import-guests",                                              # Ruta del endpoint.
    response_model=schemas.ImportGuestsResult,                     # 🔁 Respuesta tipada del módulo schemas.
    dependencies=[Depends(require_admin_access)],                         # Protege con API Key de admin.
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
