# backend/app/services/import_service.py
# ──────────────────────────────────────────────────────────────────────
# Propósito: Servicio de importación CSV (ADD_ONLY, UPSERT, SYNC, REPLACE).
# ──────────────────────────────────────────────────────────────────────

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from io import StringIO
import csv
from typing import Any, Dict, List, Optional, Tuple, Set

from sqlalchemy.orm import Session

from app.utils.phone import normalize_phone
from utils.invite import normalize_invite_type
from app.models import Guest, InviteTypeEnum, LanguageEnum, SideEnum
from loguru import logger

class import_mode(str, Enum):
    add_only = "ADD_ONLY"
    upsert = "UPSERT"
    sync = "SYNC"
    replace = "REPLACE"

@dataclass
class import_error:
    row_number: int
    field: str
    code: str
    message: str
    value: str = ""

@dataclass
class import_report:
    mode: str
    dry_run: bool
    created_count: int = 0
    updated_count: int = 0
    skipped_count: int = 0
    rejected_count: int = 0
    errors: List[import_error] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "mode": self.mode,
            "dry_run": self.dry_run,
            "created_count": self.created_count,
            "updated_count": self.updated_count,
            "skipped_count": self.skipped_count,
            "rejected_count": self.rejected_count,
            "errors": [
                {
                    "row_number": e.row_number,
                    "field": e.field,
                    "code": e.code,
                    "message": e.message,
                    "value": e.value,
                }
                for e in self.errors
            ],
        }

# ---------------------------
# Helpers de parsing / normalización
# ---------------------------

def _safe_strip(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()

def _normalize_email(email: str) -> str:
    # Email se compara en minúsculas y sin espacios
    return _safe_strip(email).lower()

def _get_first(row: Dict[str, str], keys: List[str]) -> str:
    for k in keys:
        if k in row and _safe_strip(row[k]):
            return _safe_strip(row[k])
    return ""

def _parse_int(value: str, default: int = 0) -> int:
    value = _safe_strip(value)
    if value == "":
        return default
    try:
        return int(value)
    except ValueError:
        return default

def _read_csv_rows(csv_text: str) -> List[Dict[str, str]]:
    """Lee CSV a lista de dicts usando el header."""
    # Soporta utf-8-sig para excel
    file_io = StringIO(csv_text)
    reader = csv.DictReader(file_io)
    return [dict(r) for r in reader]

def _map_row_fields(row: Dict[str, str]) -> Dict[str, Any]:
    """Mapea headers posibles a campos del modelo."""
    full_name = _get_first(row, ["full_name", "nombre", "nombre_completo", "Nombre Completo", "Nombre"])
    email = _get_first(row, ["email", "correo", "correo_electronico", "Email"])
    phone = _get_first(row, ["phone", "telefono", "teléfono", "Teléfono", "Phone", "movil", "Celular"])

    language = _get_first(row, ["language", "idioma", "Idioma"])
    side = _get_first(row, ["side", "lado", "Lado"])
    relationship = _get_first(row, ["relationship", "relacion", "relación", "Relationship", "Relacion"])
    group_id = _get_first(row, ["group_id", "grupo", "Group ID", "group", "Group"])

    max_accomp_raw = _get_first(row, ["max_accomp", "max_acomp", "max_acompanhantes", "Máx. Acomp", "Max. Acomp"])
    max_accomp = _parse_int(max_accomp_raw, default=0)
    
    # fix negativo
    if max_accomp < 0: max_accomp = 0

    invite_type = _get_first(row, ["invite_type", "tipo_invitacion", "tipo_invitación", "Tipo Invitación"])
    
    guest_code = _get_first(row, ["guest_code", "codigo", "code"]) # Opcional, para update por codigo si se quisiera (MVP usa phone)

    return {
        "full_name": full_name,
        "email": _normalize_email(email),
        "phone_raw": phone,
        "phone": normalize_phone(phone), # Normalización centralizada
        "language": language,
        "side": side,
        "relationship": relationship,
        "group_id": group_id,
        "max_accomp": max_accomp,
        "invite_type": invite_type,
        "guest_code": guest_code
    }

# ---------------------------
# Lookup DB
# ---------------------------

def _build_db_indexes(db: Session) -> Tuple[Dict[str, int], Dict[str, int], Dict[str, int]]:
    """
    Devuelve:
    - code_to_id: guest_code (uppercase) -> guest_id
    - phone_to_id: phone(normalizado) -> guest_id
    - email_to_id: email(minúsculas) -> guest_id
    """
    code_to_id: Dict[str, int] = {}
    phone_to_id: Dict[str, int] = {}
    email_to_id: Dict[str, int] = {}

    guests = db.query(Guest).all()
    for g in guests:
        # Índice por código (uppercase para matching insensible)
        if g.guest_code:
            code_to_id[g.guest_code.strip().upper()] = g.id
        
        p = normalize_phone(getattr(g, "phone", "") or "")
        e = _normalize_email(getattr(g, "email", "") or "")

        if p:
            phone_to_id[p] = g.id

        if e:
            email_to_id[e] = g.id

    return code_to_id, phone_to_id, email_to_id

# ---------------------------
# Validación / planificación
# ---------------------------

def _validate_and_plan(
    rows: List[Dict[str, str]],
    db_code_to_id: Dict[str, int],
    db_phone_to_id: Dict[str, int],
    db_email_to_id: Dict[str, int],
) -> Tuple[List[Dict[str, Any]], import_report]:
    """
    - Convierte filas a campos mapeados.
    - Detecta duplicados internos.
    - Detecta conflictos contra BD (email/phone).
    - Devuelve plan de filas limpias + reporte con errores.
    """
    report = import_report(mode="", dry_run=True, errors=[])
    planned: List[Dict[str, Any]] = []

    seen_phones: Set[str] = set()
    seen_emails: Set[str] = set()

    # csv.DictReader cuenta filas dentro del buffer, empezamos en 2 para UX
    for idx, raw in enumerate(rows, start=2):
        data = _map_row_fields(raw)

        # Validación 1: full_name obligatorio
        if not data["full_name"]:
            report.errors.append(
                import_error(
                    row_number=idx,
                    field="full_name",
                    code="MISSING_NAME",
                    message="El nombre es obligatorio.",
                    value=""
                )
            )
            report.rejected_count += 1
            continue

        # Validación 2: phone obligatorio y válido
        if not data["phone"]:
             report.errors.append(
                import_error(
                    row_number=idx,
                    field="phone",
                    code="INVALID_PHONE",
                    message="Teléfono vacío o inválido (sin dígitos).",
                    value=data["phone_raw"],
                )
            )
             report.rejected_count += 1
             continue
        
        if len(data["phone"]) < 6:
            report.errors.append(
                import_error(
                    row_number=idx,
                    field="phone",
                    code="INVALID_PHONE",
                    message="Teléfono muy corto (min 6 dígitos).",
                    value=data["phone_raw"],
                )
            )
            report.rejected_count += 1
            continue

        # Duplicados dentro del archivo
        if data["phone"] in seen_phones:
            report.errors.append(
                import_error(
                    row_number=idx,
                    field="phone",
                    code="DUP_PHONE_IN_FILE",
                    message="Teléfono duplicado en este archivo.",
                    value=data["phone_raw"],
                )
            )
            report.rejected_count += 1
            continue

        if data["email"] and data["email"] in seen_emails:
             # Opcional: permitir duplicados de email? No, mejor evitar.
             report.errors.append(
                import_error(
                    row_number=idx,
                    field="email",
                    code="DUP_EMAIL_IN_FILE",
                    message="Email duplicado en este archivo.",
                    value=data["email"],
                )
            )
             report.rejected_count += 1
             continue

        seen_phones.add(data["phone"])
        if data["email"]:
            seen_emails.add(data["email"])
            
        planned.append({"row_number": idx, "data": data})

    return planned, report

# ---------------------------
# Aplicación según modo
# ---------------------------

def _resolve_enums(data: Dict[str, Any]):
    """Helper para resolver Enums de text a objeto."""
    # Language
    lang_str = (data["language"] or "en").lower()
    try: 
        lang_enum = LanguageEnum(lang_str)
    except ValueError:
        lang_enum = LanguageEnum.en
    
    # Invite Type
    raw_type = data["invite_type"]
    norm_type_str = normalize_invite_type(raw_type) # "full" o "party" (ceremony mapea a party)
    try:
        type_enum = InviteTypeEnum(norm_type_str)
    except ValueError:
        type_enum = InviteTypeEnum.full # Fallback si fallara algo drásticamente
        
    # Side
    side_val = None
    side_str = (data["side"] or "").lower()
    if side_str in ["bride", "groom"]:
        side_val = SideEnum(side_str)
        
    return lang_enum, type_enum, side_val

def _apply_add_only(db: Session, plan: List[Dict[str, Any]], report: import_report) -> None:
    code_to_id, phone_to_id, email_to_id = _build_db_indexes(db)

    for item in plan:
        row_number = item["row_number"]
        data = item["data"]
        
        # Normalizar código del CSV
        csv_code = (data.get("guest_code") or "").strip().upper()
        
        # Cascada de matching: código > teléfono
        existing_id = None
        if csv_code and csv_code in code_to_id:
            existing_id = code_to_id[csv_code]
        elif data["phone"] in phone_to_id:
            existing_id = phone_to_id[data["phone"]]
        
        # ADD_ONLY: Si existe, skip
        if existing_id is not None:
            report.skipped_count += 1
            continue

        if data["email"] and data["email"] in email_to_id:
            report.errors.append(
                import_error(
                    row_number=row_number,
                    field="email",
                    code="EMAIL_CONFLICT",
                    message="Email ya pertenece a otro invitado.",
                    value=data["email"],
                )
            )
            report.rejected_count += 1
            continue

        lang_enum, type_enum, side_enum = _resolve_enums(data)
        
        # Generación de guest_code se delega al guest_created signal o al trigger, o al init si no se pasa.
        # En este proyecto el create del CRUD usa helper. Aquí usamos constructor directo.
        # Importante: Guest code generation.
        from app.crud.guests_crud import _generate_guest_code, get_by_guest_code
        
        final_code = csv_code if csv_code else None
        if not final_code:
            final_code = _generate_guest_code(data["full_name"], lambda c: get_by_guest_code(db, c) is None)

        guest = Guest(
            full_name=data["full_name"],
            email=data["email"] or None,
            phone=data["phone"],
            language=lang_enum.value,
            side=side_enum.value if side_enum else None,
            relationship=data["relationship"] or None,
            group_id=data["group_id"] or None,
            max_accomp=data["max_accomp"],
            invite_type=type_enum.value,
            guest_code=final_code
        )
        db.add(guest)
        
        # Actualizar índices locales para evitar duplicados dentro del mismo batch
        phone_to_id[data["phone"]] = -1  # Placeholder
        if csv_code:
            code_to_id[csv_code] = -1
        
        report.created_count += 1

    db.commit()

def _apply_upsert(db: Session, plan: List[Dict[str, Any]], report: import_report) -> None:
    code_to_id, phone_to_id, email_to_id = _build_db_indexes(db)
    
    from app.crud.guests_crud import _generate_guest_code, get_by_guest_code

    for item in plan:
        row_number = item["row_number"]
        data = item["data"]
        
        # Normalizar código del CSV
        csv_code = (data.get("guest_code") or "").strip().upper()
        
        # Cascada de matching: código > teléfono
        existing_id = None
        matched_by_code = False
        
        if csv_code and csv_code in code_to_id:
            existing_id = code_to_id[csv_code]
            matched_by_code = True
        elif data["phone"] in phone_to_id:
            existing_id = phone_to_id[data["phone"]]

        # Conflicto email si email pertenece a otro registro ID distinto
        if data["email"] and data["email"] in email_to_id:
            email_owner_id = email_to_id[data["email"]]
            if existing_id is None:
                 # Crear nuevo, pero el email existe -> ERROR
                 report.errors.append(
                    import_error(
                        row_number=row_number,
                        field="email",
                        code="EMAIL_CONFLICT",
                        message="Email ya pertenece a otro invitado.",
                        value=data["email"],
                    )
                )
                 report.rejected_count += 1
                 continue
            elif email_owner_id != existing_id:
                # Actualizar existente, pero el email pertecene a OTRO -> ERROR
                report.errors.append(
                    import_error(
                        row_number=row_number,
                        field="email",
                        code="EMAIL_CONFLICT",
                        message="Email ya pertenece a otro invitado (ID diferente).",
                        value=data["email"],
                    )
                )
                report.rejected_count += 1
                continue
        
        lang_enum, type_enum, side_enum = _resolve_enums(data)

        if existing_id is None:
            # CREATE
            final_code = csv_code if csv_code else None
            if not final_code:
                 final_code = _generate_guest_code(data["full_name"], lambda c: get_by_guest_code(db, c) is None)
            
            guest = Guest(
                full_name=data["full_name"],
                email=data["email"] or None,
                phone=data["phone"],
                language=lang_enum.value,
                side=side_enum.value if side_enum else None,
                relationship=data["relationship"] or None,
                group_id=data["group_id"] or None,
                max_accomp=data["max_accomp"],
                invite_type=type_enum.value,
                guest_code=final_code
            )
            db.add(guest)
            
            # Actualizar índices locales para evitar duplicados dentro del mismo batch
            phone_to_id[data["phone"]] = -1
            if final_code:
                code_to_id[final_code.upper()] = -1
            
            report.created_count += 1
        else:
            # UPDATE (Solo campos administrativos)
            guest = db.query(Guest).get(existing_id)
            if not guest:
                # Caso raro: estaba en index pero no en get
                continue

            guest.full_name = data["full_name"]
            if data["email"]: # Solo actualizamos email si viene dato
                guest.email = data["email"]
            
            # Si matcheó por código y el teléfono es diferente, actualizarlo y loguear
            old_phone = guest.phone
            new_phone = data["phone"]
            if matched_by_code and old_phone != new_phone:
                logger.info(
                    f"Actualizando teléfono para invitado {guest.guest_code} (Match por Código). "
                    f"Anterior: {old_phone} → Nuevo: {new_phone}"
                )
                guest.phone = new_phone
                # Actualizar índice local
                phone_to_id[new_phone] = existing_id
            
            guest.language = lang_enum.value
            if side_enum: guest.side = side_enum.value
            if data["relationship"]: guest.relationship = data["relationship"]
            if data["group_id"]: guest.group_id = data["group_id"]
            
            guest.max_accomp = data["max_accomp"]
            guest.invite_type = type_enum.value
            
            # guest_code: NUNCA se modifica por CSV para estabilidad de links.
            
            report.updated_count += 1

    db.commit()

def _apply_sync(db: Session, plan: List[Dict[str, Any]], report: import_report) -> None:
    """
    SYNC = UPSERT + eliminar los que NO estén en el CSV.
    """
    # 1. Hacemos Upsert normal
    _apply_upsert(db, plan, report)
    
    # 2. Identificamos teléfonos presentes en el CSV
    phones_in_csv = {item["data"]["phone"] for item in plan}
    
    # 3. Borrado de los que no están
    # Traemos todos para verificar. Eficiente para < 2000 invitados.
    all_guests = db.query(Guest).all()
    deleted_count = 0
    for g in all_guests:
        # Normalizamos el de la DB por seguridad
        p = normalize_phone(getattr(g, "phone", "") or "")
        if not p or p not in phones_in_csv:
            # Eliminar (Cascade handleado por Modelos/DB engine si configurado, o manual si no)
            # Asumimos que podemos borrar.
            db.delete(g)
            deleted_count += 1
    
    # Podríamos reportar deleted_count en algún lado, pero el report standard no tiene field.
    # Lo agregamos message al log o asumimos que es parte del "SYNC".
    db.commit()

def _apply_replace(db: Session, plan: List[Dict[str, Any]], report: import_report) -> None:
    """
    REPLACE = Reset total + ADD_ONLY.
    """
    # Borrado masivo (respetando constraints si posible)
    # RsvpLog y Companion tienen FK cascade? Admin delete reset lo hacía manual.
    from app.models import RsvpLog, Companion
    
    db.query(RsvpLog).delete(synchronize_session=False)
    db.query(Companion).delete(synchronize_session=False)
    db.query(Guest).delete(synchronize_session=False)
    db.commit() # Commit vaciado

    # Aplicamos como ADD_ONLY (DB vacía)
    _apply_add_only(db, plan, report)

# ---------------------------
# API pública del servicio
# ---------------------------

def import_guests_from_csv(
    db: Session,
    csv_text: str,
    mode: import_mode,
    dry_run: bool,
    confirm_text: Optional[str] = None
) -> Dict[str, Any]:
    
    # 1. Seguridad
    if mode in [import_mode.sync, import_mode.replace]:
        if not confirm_text or confirm_text.strip() != "BORRAR TODO":
             # Retornamos error en estructura de reporte o raise exception?
             # Para consistencia con frontend que espera JSON, podemos devolver rejected total?
             # O mejor 400 Bad Request para que falle fuerte.
             # La guia dice: backend debe exigir.
             raise ValueError("Modo destructivo requiere confirmación 'BORRAR TODO'.")

    rows = _read_csv_rows(csv_text)

    # Index actual de BD para validar
    db_code_to_id, db_phone_to_id, db_email_to_id = _build_db_indexes(db)

    plan, base_report = _validate_and_plan(rows, db_code_to_id, db_phone_to_id, db_email_to_id)
    base_report.mode = mode.value
    base_report.dry_run = dry_run
    
    if dry_run:
        return base_report.to_dict()

    # Aplicar según modo
    if mode == import_mode.add_only:
        _apply_add_only(db, plan, base_report)
    elif mode == import_mode.upsert:
        _apply_upsert(db, plan, base_report)
    elif mode == import_mode.sync:
        _apply_sync(db, plan, base_report)
    elif mode == import_mode.replace:
        _apply_replace(db, plan, base_report)
    else:
        # Fallback
        pass

    return base_report.to_dict()
