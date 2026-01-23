# backend/app/routers/admin.py
# =============================================================================
# 👑 Rutas de administración: Gestión de Invitados (CRUD + Import/Export CSV)
# - Protegido con JWT admin o API Key legacy mediante `require_admin_access`.
# - Permite Listar, Crear, Actualizar y Eliminar invitados.
# - Export CSV: descarga de todos los invitados en formato CSV.
# - Import CSV: carga masiva con upsert por teléfono normalizado.
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Set
import re
import io
import csv
from loguru import logger

import app.schemas as schemas
from app.core.security import require_admin_access
from app.db import get_db
from app.models import Guest, InviteTypeEnum, Companion, RsvpLog  # Incorpora modelos para eliminación en cascada manual.
from app.crud import guests_crud
from app.utils.phone import normalize_phone # Utilidad centralizada
from utils.invite import normalize_invite_type

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ------------------------------ Helpers locales -------------------------------

def _normalize_email_local(email: Optional[str]) -> Optional[str]:
    """Devuelve el email en minúsculas y sin espacios, o None."""
    if not email:
        return None
    e = email.strip().lower()
    return e or None



def _smart_phone_match(db: Session, phone_norm: str) -> Optional[Guest]:
    """
    Busca un invitado usando la lógica inteligente del CRUD
    (coincidencia exacta o con prefijo '+').
    """
    # El CRUD ya implementa la búsqueda dual (norm vs +norm)
    return guests_crud.get_by_phone(db, phone_norm)

# --------------------------------- Endpoints -----------------------------------

@router.delete("/guests/reset", status_code=204, dependencies=[Depends(require_admin_access)])
def reset_database(db: Session = Depends(get_db)):
    """
    ⚠️ PELIGRO: Elimina TODOS los invitados, acompañantes y logs de RSVP.
    Acción irreversible diseñada para reiniciar el entorno de pruebas.
    """
    logger.warning("INICIANDO RESET TOTAL DE BASE DE DATOS DE INVITADOS")
    
    try:
        # Eliminar en orden para respetar FK constraints.
        # synchronize_session=False es más eficiente y evita errores con objetos en memoria.
        db.query(RsvpLog).delete(synchronize_session=False)
        db.query(Companion).delete(synchronize_session=False)
        db.query(Guest).delete(synchronize_session=False)
        
        db.commit()
        logger.info("Reset de base de datos completado exitosamente.")
    except Exception as e:
        logger.error(f"Error durante el reset de base de datos: {e}")
        db.rollback()
        # Exponemos el error para debugging (en prod se ocultaría, pero esto es dev)
        raise HTTPException(
            status_code=500, 
            detail=f"Error crítico al resetear: {str(e)}"
        )
    return None


@router.get("/stats", response_model=schemas.AdminStatsResponse, dependencies=[Depends(require_admin_access)])
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Calcula y devuelve las métricas clave (KPIs) del evento en tiempo real.
    Devuelve totales, desglose de respuestas y conteos de asistencia.
    """
    # 1. Totales generales de invitaciones (filas en BD)
    total_guests = db.query(func.count(Guest.id)).scalar() or 0

    # 2. Desglose por estado de confirmación
    confirmed_attendees = db.query(func.count(Guest.id)).filter(Guest.confirmed == True).scalar() or 0
    not_attending = db.query(func.count(Guest.id)).filter(Guest.confirmed == False).scalar() or 0
    pending_rsvp = db.query(func.count(Guest.id)).filter(Guest.confirmed == None).scalar() or 0
    
    responses_received = confirmed_attendees + not_attending

    # 3. Totales de Personas y Perfiles (Solo Confirmados)
    people_stats = db.query(
        func.sum(func.coalesce(Guest.num_adults, 0)),
        func.sum(func.coalesce(Guest.num_children, 0))
    ).filter(Guest.confirmed == True).first()

    sum_adults = people_stats[0] or 0
    sum_children = people_stats[1] or 0
    
    total_companions = sum_adults + sum_children
    total_children = sum_children

    # 4. Alergias y Desglose (Logística Avanzada)
    guests_with_allergies = 0
    allergy_breakdown: dict[str, int] = {}

    # Obtenemos TODOS los invitados confirmados cargando sus acompañantes
    # para procesar el desglose exacto de alergias.
    confirmed_guests_list = db.query(Guest).filter(Guest.confirmed == True).all()

    for g in confirmed_guests_list:
        has_allergy_in_group = False
        
        # Procesar titular
        if g.allergies and g.allergies.strip():
            has_allergy_in_group = True
            # Split por coma y limpiar
            parts = [x.strip().lower() for x in g.allergies.split(',') if x.strip()]
            for allergy in parts:
                allergy_breakdown[allergy] = allergy_breakdown.get(allergy, 0) + 1
        
        # Procesar acompañantes
        for c in g.companions:
            if c.allergies and c.allergies.strip():
                has_allergy_in_group = True
                parts = [x.strip().lower() for x in c.allergies.split(',') if x.strip()]
                for allergy in parts:
                    allergy_breakdown[allergy] = allergy_breakdown.get(allergy, 0) + 1

        if has_allergy_in_group:
            guests_with_allergies += 1

    return schemas.AdminStatsResponse(
        total_guests=total_guests,
        responses_received=responses_received,
        confirmed_attendees=confirmed_attendees,
        pending_rsvp=pending_rsvp,
        not_attending=not_attending,
        total_companions=total_companions,
        total_children=total_children,
        guests_with_allergies=guests_with_allergies,
        allergy_breakdown=allergy_breakdown
    )


@router.get("/activity", response_model=schemas.RecentActivityResponse, dependencies=[Depends(require_admin_access)])
def get_recent_activity(limit: int = 10, db: Session = Depends(get_db)):
    """
    Devuelve los últimos N eventos de actividad RSVP para el dashboard.
    Incluye nombre del invitado, acción, timestamp y canal.
    """
    # Query los últimos registros de RsvpLog con JOIN a Guest para obtener nombre
    logs = (
        db.query(RsvpLog, Guest.full_name)
        .join(Guest, RsvpLog.guest_id == Guest.id)
        .order_by(RsvpLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    
    items = []
    for log, guest_name in logs:
        # Mapear action_type a un formato más amigable
        action = "updated"
        if log.action_type == "update_rsvp":
            # Intentar determinar si confirmó o rechazó basándose en payload
            payload = log.payload_json or {}
            if payload.get("attending") is True or payload.get("confirmed") is True:
                action = "confirmed"
            elif payload.get("attending") is False or payload.get("confirmed") is False:
                action = "declined"
        elif log.action_type == "create":
            action = "created"
        
        items.append(schemas.RecentActivityItem(
            guest_id=log.guest_id,
            guest_name=guest_name,
            action=action,
            timestamp=log.timestamp,
            channel=log.channel
        ))
    
    return schemas.RecentActivityResponse(items=items)


@router.get("/guests", response_model=List[schemas.GuestResponse], dependencies=[Depends(require_admin_access)])
def list_guests(
    search: Optional[str] = None,
    rsvp_status: Optional[str] = None,
    side: Optional[str] = None,
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
        # Validar y normalizar teléfono (solo dígitos)
        norm_phone = normalize_phone(payload.phone)
        if not norm_phone:
             raise HTTPException(status_code=400, detail="El teléfono no es válido (sin dígitos).")
        
        # Validar unicidad (usa búsqueda inteligente: 34... vs +34...)
        if guests_crud.get_by_phone(db, norm_phone):
            raise HTTPException(status_code=400, detail="El teléfono ya está registrado.")
    else:
        norm_phone = None

    try:
        new_guest = guests_crud.create(
            db,
            full_name=payload.full_name,
            email=payload.email,
            phone=norm_phone,
            language=payload.language, 
            max_accomp=payload.max_accomp,
            invite_type=payload.invite_type,
            side=payload.side,
            relationship=payload.relationship,
            group_id=payload.group_id,
            guest_code=payload.guest_code
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
    Actualiza campos administrativos de un invitado.
    ⚠️ Bloquea la edición directa de campos RSVP.
    """
    db_guest = db.query(Guest).filter(Guest.id == guest_id).first()
    if not db_guest:
        raise HTTPException(status_code=404, detail="Invitado no encontrado.")

    # 1. Filtrar campos permitidos
    allowed_fields = {
        "full_name", "email", "phone", "language", "max_accomp",
        "invite_type", "side", "relationship", "group_id"
    }
    
    try:
        update_data = payload.model_dump(exclude_unset=True)
    except AttributeError:
        update_data = payload.dict(exclude_unset=True)
        
    filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}

    # 2. Validar Unicidad de Email/Phone
    current_email = (db_guest.email or "").lower().strip()
    new_email = (filtered_data.get("email") or "").lower().strip()
    
    if "email" in filtered_data and new_email and new_email != current_email:
        existing = guests_crud.get_by_email(db, new_email)
        if existing and existing.id != guest_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El email '{new_email}' ya está en uso."
            )

    current_phone_norm = normalize_phone(db_guest.phone)
    new_phone_raw = filtered_data.get("phone")
    
    if "phone" in filtered_data:
        # Si envían phone, debe ser válido tras normalizar
        if new_phone_raw:
            new_phone = normalize_phone(new_phone_raw)
            if not new_phone:
                raise HTTPException(status_code=400, detail="El teléfono no es válido (sin dígitos).")
                
            if new_phone != current_phone_norm:
                # Verificar duplicados solo si cambió los dígitos
                existing = guests_crud.get_by_phone(db, new_phone)
                if existing and existing.id != guest_id:
                     raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"El teléfono '{new_phone}' ya está en uso."
                    )
            
            # Actualizamos el dato en el dict para que se guarde normalizado
            filtered_data["phone"] = new_phone
        else:
            # Si envían cadena vacía o nulo explícito, permitimos borrar teléfono? 
            # Depende de reglas, pero aquí new_phone_raw es None o "".
            # Asumimos que si envían key "phone" con valor falsy, quieren borrarlo.
            filtered_data["phone"] = None

    # 3. Actualizar
    # Asegurar que los Enums se pasen como valores simples (str) para evitar conflictos ORM
    if "invite_type" in filtered_data and hasattr(filtered_data["invite_type"], "value"):
        filtered_data["invite_type"] = filtered_data["invite_type"].value
        
    if "language" in filtered_data and hasattr(filtered_data["language"], "value"):
        filtered_data["language"] = filtered_data["language"].value
        
    if "side" in filtered_data and hasattr(filtered_data["side"], "value"):
        filtered_data["side"] = filtered_data["side"].value

    try:
        updated_guest = guests_crud.update(db, db_guest, filtered_data)
        return updated_guest
    except Exception as e:
        logger.error(f"Error updating guest {guest_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno DB: {str(e)}")


@router.get("/guests/{guest_id}", response_model=schemas.GuestWithCompanionsResponse, dependencies=[Depends(require_admin_access)])
def get_guest_detail(
    guest_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtiene el detalle completo de un invitado, incluyendo acompañantes.
    Usado para el modal de RSVP Asistido para no perder datos.
    """
    db_guest = db.query(Guest).filter(Guest.id == guest_id).first()
    if not db_guest:
        raise HTTPException(status_code=404, detail="Invitado no encontrado")
    return db_guest


@router.post("/guests/{guest_id}/rsvp", response_model=schemas.GuestWithCompanionsResponse, dependencies=[Depends(require_admin_access)])
def submit_admin_rsvp(
    guest_id: int,
    payload: schemas.RSVPUpdateRequest,
    channel: str = "web", 
    db: Session = Depends(get_db)
):
    """
    Registra/Actualiza el RSVP de un invitado en MODO ASISTIDO (Admin).
    """
    db_guest = db.query(Guest).filter(Guest.id == guest_id).first()
    if not db_guest:
        raise HTTPException(status_code=404, detail="Invitado no encontrado")

    try:
        updated_guest = guests_crud.process_rsvp_submission(
            db=db,
            guest=db_guest,
            payload=payload,
            updated_by="admin",
            channel=channel
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except IntegrityError:
         raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflicto de integridad al procesar RSVP."
        )
    except Exception as e:
        logger.error(f"Error en Admin RSVP Assist: {e}")
        raise HTTPException(status_code=500, detail="Error interno procesando RSVP.")

    is_full_invite = (updated_guest.invite_type == InviteTypeEnum.full)
    resp = schemas.GuestWithCompanionsResponse.model_validate(updated_guest)
    resp.invited_to_ceremony = is_full_invite
    resp.invite_scope = "ceremony+reception" if is_full_invite else "reception-only"
    return resp


@router.delete("/guests/{guest_id}", status_code=204, dependencies=[Depends(require_admin_access)])
def delete_guest(
    guest_id: int,
    db: Session = Depends(get_db)
):
    """
    Elimina un invitado físicamente.
    """
    deleted = guests_crud.delete(db, guest_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Invitado no encontrado.")
    return None


# --------------------------------- Export/Import CSV -----------------------------------

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
    """
    guests = db.query(Guest).all()

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_COLUMNS)
    writer.writeheader()

    for g in guests:
        lang_val = g.language.value if g.language else ""
        invite_val = normalize_invite_type(g.invite_type.value if g.invite_type else "")
        side_val = g.side.value if g.side else ""

        writer.writerow({
            "guest_code": g.guest_code or "",
            "full_name": g.full_name or "",
            "email": g.email or "",
            "phone": normalize_phone(g.phone) or "",
            "language": lang_val,
            "max_accomp": g.max_accomp if g.max_accomp is not None else 0,
            "invite_type": invite_val,
            "side": side_val,
            "relationship": g.relationship or "",
            "group_id": g.group_id or "",
        })

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="guests_export.csv"'}
    )


from fastapi import Form

@router.post(
    "/guests-import",
    summary="Importar invitados desde CSV",
    dependencies=[Depends(require_admin_access)],
)
async def import_guests_csv(
    file: UploadFile = File(...),
    mode: str = Form("UPSERT"),
    dry_run: bool = Form(False),
    confirm_text: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Importación CSV con modos y dry_run.
    - mode: ADD_ONLY | UPSERT | SYNC | REPLACE
    - dry_run: true/false
    - confirm_text: "BORRAR TODO" (requerido para SYNC/REPLACE)
    """
    from app.services.import_service import import_guests_from_csv, import_mode as ImportModeService

    try:
        content = await file.read()
        # Intentar decodificar
        try:
            csv_text = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            csv_text = content.decode("latin-1")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"No se pudo leer el archivo: {exc}")

    try:
        parsed_mode = ImportModeService(mode)
    except ValueError:
        raise HTTPException(status_code=400, detail="Modo inválido. Usa ADD_ONLY, UPSERT, SYNC o REPLACE.")
        
    try:
        result = import_guests_from_csv(
            db=db,
            csv_text=csv_text,
            mode=parsed_mode,
            dry_run=dry_run,
            confirm_text=confirm_text
        )
        return result
    except ValueError as e:
        # Errores de validación como falta de confirm text
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Error en importación CSV")
        raise HTTPException(status_code=500, detail="Error interno procesando el archivo.")

# --------------------------------- Legacy Import -----------------------------------

@router.post(
    "/import-guests",
    response_model=schemas.ImportGuestsResult,
    dependencies=[Depends(require_admin_access)],
)
def import_guests(payload: schemas.ImportGuestsPayload, db: Session = Depends(get_db)):
    """
    Importación Legacy (JSON array).
    Se mantiene por compatibilidad con scripts antiguos.
    """
    created = 0
    updated = 0
    skipped = 0
    errors: List[str] = []

    for idx, item in enumerate(payload.items, start=1):
        try:
            norm_email = _normalize_email_local(item.email)
            norm_phone = normalize_phone(item.phone)

            existing: Optional[Guest] = None
            if norm_email:
                existing = guests_crud.get_by_email(db, norm_email)
            if not existing and norm_phone:
                # Usa smart match también aquí para coherencia
                existing = _smart_phone_match(db, norm_phone)

            if existing:
                existing.full_name = item.full_name
                existing.language = item.language
                existing.max_accomp = item.max_accomp
                existing.invite_type = item.invite_type
                if item.side is not None: existing.side = item.side
                if item.relationship is not None: existing.relationship = item.relationship
                if item.group_id is not None: existing.group_id = item.group_id
                if norm_email: existing.email = norm_email
                if norm_phone: existing.phone = norm_phone

                db.add(existing)
                db.commit()
                db.refresh(existing)
                updated += 1
            else:
                _ = guests_crud.create(
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
                created += 1

        except Exception as e:
            skipped += 1
            errors.append(f"Row {idx}: {e}")

    return schemas.ImportGuestsResult(
        created=created, updated=updated, skipped=skipped, errors=errors
    )


# --------------------------------- Reports -----------------------------------

@router.get("/reports/rsvp-csv", dependencies=[Depends(require_admin_access)])
def export_rsvp_detailed_csv(db: Session = Depends(get_db)):
    """
    Exportación DETALLADA para Catering/Logística.
    - Codificación: UTF-8 con BOM (para Excel).
    - Estructura: Una fila por invitación (Guest).
    - Incluye: Resumen de alergias, nombres de acompañantes y conteo real de pax.
    """
    guests = db.query(Guest).all()
    
    # Definir columnas
    columns = [
        "ID", "Nombre Titular", "Email", "Teléfono", "Tipo Invitación",
        "Estado RSVP", "Asisten (Total Pax)", 
        "Alergias (Resumen)", "Acompañantes (Nombres)", "Notas"
    ]
    
    output = io.StringIO()
    # Escribir BOM para que Excel reconozca UTF-8 automáticamente
    output.write('\ufeff') 
    
    writer = csv.DictWriter(output, fieldnames=columns)
    writer.writeheader()
    
    for g in guests:
        # 1. Estado RSVP Humano
        status_str = "PENDIENTE"
        if g.confirmed is True:
            status_str = "CONFIRMADO"
        elif g.confirmed is False:
            status_str = "NO ASISTE"
            
        # 2. Conteo de Pax (Solo si está confirmado)
        # Nota: g.companions es una lista de objetos Companion
        total_pax = 0
        if g.confirmed:
            total_pax = 1 + len(g.companions)
            
        # 3. Resumen de Alergias (Titular + Acompañantes)
        allergy_summary = []
        
        # Alergias Titular
        if g.allergies:
            allergy_summary.append(f"[Titular]: {g.allergies}")
            
        # Alergias Acompañantes
        companion_names = []
        for c in g.companions:
            companion_names.append(c.name)
            if c.allergies:
                allergy_summary.append(f"[{c.name}]: {c.allergies}")
                
        # 4. Escribir fila
        writer.writerow({
            "ID": g.id,
            "Nombre Titular": g.full_name,
            "Email": g.email or "",
            "Teléfono": normalize_phone(g.phone) or "",
            "Tipo Invitación": normalize_invite_type(g.invite_type.value if g.invite_type else ""),
            "Estado RSVP": status_str,
            "Asisten (Total Pax)": total_pax,
            "Alergias (Resumen)": " | ".join(allergy_summary),
            "Acompañantes (Nombres)": ", ".join(companion_names),
            "Notas": g.notes or ""
        })
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue().encode('utf-8')]), # Encode a bytes explícitamente
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="reporte_rsvp_detallado.csv"',
            "Content-Type": "text/csv; charset=utf-8"
        }
    )




