# app/crud/guests_crud.py                                                     # Indica la ruta del archivo dentro del proyecto.

# =================================================================================
# 🧩 CRUD de Invitados (Guest) usado por el router admin de importación en lote.  # Describe el propósito del módulo.
# - Provee helpers get_by_email / get_by_phone / get_by_guest_code               # Enumera funciones de utilidad disponibles.
# - Implementa create() con generación de guest_code único si falta.             # Resalta la lógica de creación con código único.
# - Incluye commit() como helper genérico (el router lo intenta, pero damos fallback). # Menciona helper de commit.
# =================================================================================

from sqlalchemy.orm import Session  # Importa la sesión de SQLAlchemy para operaciones DB.
from sqlalchemy import func, or_    # Importa funciones SQL (ej. lower) para búsquedas case-insensitive.
from datetime import datetime, timedelta   # ✅ Para timestamps de emisión/expiración de Magic Link.
import re                           # Módulo estándar para limpiar/normalizar strings.
import secrets                      # Para generar sufijos aleatorios seguros.
import string                       # Para definir alfabetos de generación.
from typing import Optional         # Tipado opcional para claridad.
from loguru import logger           # ✅ Logger para trazas internas del CRUD (depuración y auditoría).

from app.models import Guest, Companion, RsvpLog, InviteTypeEnum        # Importa el modelo ORM.
from app import mailer, schemas  # Importa mailer y schemas.
from app.utils.phone import normalize_phone # Utilidad centralizada
import unicodedata                  # Para eliminar acentos/diacríticos de los nombres.

# ---------------------------------------------------------------------------------
# 🛡️ Helpers de Seguridad y Normalización Internos
# ---------------------------------------------------------------------------------

def _mask_email(email: Optional[str]) -> str:
    """Enmascara un email para no exponer PII en logs. 'test@example.com' -> 'te**@example.com'.""" # Docstring del helper de enmascaramiento.
    if not email: return "<empty>"                                     # Si no hay email, devuelve un placeholder.
    if "@" not in email: return f"{email[:2]}***"                      # Si no tiene '@', enmascara parcialmente el final.
    user, domain = email.split("@", 1)                                 # Divide el email en usuario y dominio.
    return f"{user[:2]}{'*' * (len(user) - 2)}@{domain}"               # Enmascara parte del usuario y mantiene el dominio.

def _norm_name(s: str) -> str:
    """Normaliza nombre: quita acentos, colapsa espacios y aplica casefold."""  # Docstring del helper de normalización de nombre.
    txt = (s or "").strip()                                     # Limpia espacios extremos o usa "" si es None.
    txt = unicodedata.normalize("NFKD", txt)                    # Normaliza a NFKD para separar diacríticos.
    txt = "".join(ch for ch in txt if not unicodedata.combining(ch))  # Elimina los diacríticos (acentos).
    txt = re.sub(r"\s+", " ", txt)                              # Colapsa espacios múltiples a uno.
    return txt.casefold()                                       # Aplica casefold (mejor que lower para i18n).

def _name_matches_flexibly(input_name_norm: str, db_name_norm: str) -> bool:
    """
    Devuelve True si al menos una palabra significativa (más de 2 letras) del nombre
    de entrada coincide con una del nombre en la BD.
    """
    # Ignora palabras muy cortas como 'y', 'de', 'a' para evitar falsos positivos
    input_tokens = {token for token in input_name_norm.split() if len(token) > 2}
    db_tokens = {token for token in db_name_norm.split() if len(token) > 2}

    # Si después de filtrar no quedan palabras, es más seguro no dar un match
    if not input_tokens or not db_tokens:
        return False

    # Devuelve True si hay al menos una palabra en común
    return len(input_tokens.intersection(db_tokens)) > 0

# ---------------------------------------------------------------------------------
# 🔎 Helpers de búsqueda
# ---------------------------------------------------------------------------------

def get_by_email(db: Session, email: str) -> Optional[Guest]:
    """Devuelve el invitado cuyo email coincide (case-insensitive) o None si no existe."""  # Docstring explicando el propósito.
    if not email:                                              # Verifica si no se proporcionó email.
        return None                                            # Si no hay email, no hay nada que buscar.
    norm = (email or "").strip().lower()                       # Normaliza el email: recorta espacios y pasa a minúsculas.
    return (                                                   # Inicia la construcción y ejecución de la consulta.
        db.query(Guest)                                        # Crea un query sobre la tabla 'guests'.
        .filter(func.lower(Guest.email) == norm)               # Aplica filtro case-insensitive comparando en minúsculas.
        .first()                                               # Devuelve el primer resultado o None si no hay coincidencia.
    )                                                          # Cierra la expresión de retorno.

def get_by_phone(db: Session, phone: str) -> Optional[Guest]:
    """Devuelve el invitado por teléfono (busca tanto formato '34...' como '+34...')."""
    norm = normalize_phone(phone)
    if not norm:
        return None
    
    # Busca por coincidencias exactas o legado con '+'
    return (
        db.query(Guest)
        .filter(or_(Guest.phone == norm, Guest.phone == f"+{norm}"))
        .first()
    )

def get_by_guest_code(db: Session, code: str) -> Optional[Guest]:
    """Devuelve invitado por su guest_code exacto, o None si no existe."""  # Docstring de la función.
    if not code:                                               # Verifica si no se proporcionó guest_code.
        return None                                            # Retorna None si no hay código.
    return (                                                   # Inicia la consulta.
        db.query(Guest)                                        # Crea un query sobre 'guests'.
        .filter(Guest.guest_code == code.strip())              # Compara por igualdad exacta tras quitar espacios.
        .first()                                               # Devuelve el primer resultado o None.
    )                                                          # Cierra la expresión de retorno.

# ---------------------------------------------------------------------------------
# 🔐 Búsqueda robusta para Magic Link (nombre + últimos 4 del teléfono + email)
# ---------------------------------------------------------------------------------

def find_guest_for_magic(db: Session, full_name: str, phone_last4: str, email: str) -> Optional[Guest]:
    """
    Localiza un invitado por últimos 4 del teléfono + nombre (flex).
    ⚠️ Opción 1 (MVP): el email NO bloquea el match. Si difiere, se registra en logs.
    """
    full_name_norm = _norm_name(full_name)                      # Normaliza el nombre (sin acentos, casefold).
    email_norm = (email or "").strip().lower() or None          # Email del payload normalizado o None si vacío.
    
    # Extrae dígitos usando la utilidad centralizada
    last4_digits = normalize_phone(phone_last4) or ""
    last4 = last4_digits[-4:]                                   # Toma los últimos 4 dígitos reales.

    if len(last4) != 4:                                         # Validación básica de last4.
        logger.debug("CRUD/find_guest_for_magic → last4 inválido: {}", last4)
        return None

    # --- Normalización del teléfono en SQL para comparar por últimos 4 sin símbolos ---
    phone_clean = Guest.phone
    phone_clean = func.replace(phone_clean, " ", "")
    phone_clean = func.replace(phone_clean, "-", "")
    phone_clean = func.replace(phone_clean, ".", "")
    phone_clean = func.replace(phone_clean, "(", "")
    phone_clean = func.replace(phone_clean, ")", "")
    phone_clean = func.replace(phone_clean, "+", "")

    # --- Expresión “últimos 4” por motor (SQLite usa substr con índice negativo) ---
    _dialect_bind = getattr(db, "bind", None)
    _dialect_name = getattr(getattr(_dialect_bind, "dialect", None), "name", "")
    if _dialect_name == "sqlite":
        last4_expr = func.substr(phone_clean, -4)
    else:
        last4_expr = func.right(phone_clean, 4)

    # --- Obtener candidatos por últimos 4 del teléfono ---
    q = db.query(Guest).filter(last4_expr == last4)
    candidates = q.all()
    logger.debug("CRUD/find_guest_for_magic → candidatos_por_last4={}", len(candidates))

    # --- Evaluar cada candidato ---
    for g in candidates:
        g_name_norm = _norm_name(getattr(g, "full_name", ""))              # Nombre normalizado en BD.
        g_email_norm = (getattr(g, "email", "") or "").strip().lower()     # Email en BD (puede ser vacío) normalizado.

        # ---------------------------------------------------------------
        # ✅ REGLA FINAL (Opción 1 / MVP): NO bloquear por email.
        #    - Decisión de match = últimos 4 (ya filtrado) + nombre (flex).
        #    - El email solo se usa para telemetría (warning si difiere).
        # ---------------------------------------------------------------
        name_ok = _name_matches_flexibly(full_name_norm, g_name_norm)      # Todas las palabras del input deben estar en BD.

        if email_norm and g_email_norm and g_email_norm != email_norm:     # Solo aviso si ambos tienen email y difieren.
            logger.warning(
                "CRUD/find_guest_for_magic → email distinto | g_id={} | db_email='{}' | in_email='{}'",
                getattr(g, "id", None), _mask_email(g_email_norm), _mask_email(email_norm)
            )

        logger.debug(                                                      # Telemetría compacta (ya no hay email_ok).
            "CRUD/find_guest_for_magic → eval | g_id={} | name_ok={}",
            getattr(g, "id", None), name_ok
        )

        if name_ok:                                                        # Con últimos 4 + nombre OK → MATCH.
            logger.info("CRUD/find_guest_for_magic → MATCH | g_id={}", getattr(g, "id", None))
            return g

    # Si ningún candidato cumplió nombre con esos last4, no hay match.
    logger.debug("CRUD/find_guest_for_magic → SIN MATCH")
    return None

# ---------------------------------------------------------------------------------
# 🆕 Crear invitado con guest_code único
# ---------------------------------------------------------------------------------

def create(
    db: Session,                                                           # Sesión de base de datos.
    *,                                                                     # Enforce keywords-only para claridad y seguridad.
    full_name: str,                                                        # Nombre completo del invitado.
    email: Optional[str],                                                  # Email del invitado (opcional).
    phone: Optional[str],                                                  # Teléfono del invitado (opcional).
    language,                                                              # Idioma (Enum o str validado por Pydantic).
    max_accomp: int,                                                       # Cupo de acompañantes.
    invite_type,                                                           # Tipo de invitación (Enum o str validado por Pydantic).
    side=None,                                                             # Lado (novia/novio) opcional.
    relationship: Optional[str] = None,                                    # Relación/nota opcional.
    group_id: Optional[str] = None,                                        # Identificador de grupo opcional.
    guest_code: Optional[str] = None,                                      # Código invitado opcional (si no, se genera).
    commit_immediately: bool = True,                                       # Si True, hace commit y refresh inmediatamente.
) -> Guest:                                                                # Anota el tipo de retorno (Guest).
    """
    Crea un nuevo Guest. Si no se pasa guest_code, se genera uno único y estable.  # Docstring explicando la lógica.
    Devuelve el objeto persistido (refrescado si se hizo commit).                  # Aclara el comportamiento del retorno.
    """
    norm_email = (email or "").strip().lower() or None                   # Normaliza email (a minúsculas) o deja None si vacío.
    norm_phone = _normalize_phone(phone)                                  # Normaliza teléfono (a '+/dígitos') o None si vacío.

    code = (guest_code or "").strip() or _generate_guest_code(            # Determina el guest_code: usa el dado o genera uno único.
        full_name, lambda c: get_by_guest_code(db, c) is None             # Función de unicidad: consulta DB para evitar colisiones.
    )                                                                      # Cierra la construcción del código.

    obj = Guest(                                                           # Crea la instancia del modelo Guest.
        guest_code=code,                                                   # Asigna el guest_code definitivo.
        full_name=(full_name or "").strip(),                               # Limpia el nombre (trim).
        email=norm_email,                                                  # Asigna el email normalizado (o None).
        phone=norm_phone,                                                  # Asigna el teléfono normalizado (o None).
        language=language,                                                 # Asigna el idioma (validado por capas superiores).
        max_accomp=max_accomp,                                             # Asigna cupo de acompañantes.
        invite_type=invite_type,                                           # Asigna el tipo de invitación.
        side=side,                                                         # Asigna el lado (si aplica).
        relationship=(relationship or None),                               # Asigna la relación/nota (opcional).
        group_id=(group_id or None),                                       # Asigna el grupo (opcional).
    )                                                                      # Cierra la construcción del objeto Guest.

    db.add(obj)                                                            # Añade el objeto a la sesión para persistirlo.
    if commit_immediately:                                                 # Si se solicita confirmar de inmediato...
        db.commit()                                                        # Realiza commit para escribir en la DB.
        db.refresh(obj)                                                    # Refresca el objeto para obtener valores definitivos (id, etc.).
    return obj                                                             # Devuelve el objeto creado (persistido o pendiente de commit).

def commit(db: Session, obj: Guest) -> None:
    """Helper de commit para updates: add/commit/refresh el objeto dado."""  # Docstring del helper de commit.
    db.add(obj)                                                             # Asegura que el objeto esté en la sesión (por si estaba detach).
    db.commit()                                                             # Confirma la transacción para persistir cambios.
    db.refresh(obj)                                                         # Refresca el objeto para lecturas posteriores consistentes.

def set_magic_link(db: Session, guest: Guest, token: str, ttl_minutes: int = 15) -> None:
    """Guarda token/fechas del Magic Link en el invitado (emitido, expiración y reset de uso)."""  # Docstring de la función.
    now = datetime.utcnow()                                                # Obtiene la hora actual en UTC.
    guest.magic_link_token = token                                         # Asigna el token emitido (trazabilidad).
    guest.magic_link_sent_at = now                                         # Marca la fecha/hora de emisión/envío.
    guest.magic_link_expires_at = now + timedelta(minutes=ttl_minutes)     # Calcula y guarda la expiración en minutos.
    guest.magic_link_used_at = None                                        # Resetea la marca de uso (por si se reemite).
    db.add(guest)                                                          # Agenda la actualización en la sesión.
    db.commit()                                                            # Persiste los cambios en la base de datos.
    db.refresh(guest)                                                      # Refresca el objeto para valores finales (opcional pero útil).

def consume_magic_link(db: Session, token: str) -> Optional[Guest]:
    """Valida el token mágico y lo consume si es válido/no usado/no expirado; devuelve el Guest o None."""  # Docstring de la función.
    now = datetime.utcnow()                                                # Toma la hora actual en UTC para comparar expiración.
    g = (db.query(Guest)                                                   # Inicia la consulta sobre la tabla de invitados.
           .filter(Guest.magic_link_token == token)                        # Aplica filtro por token exacto.
           .first())                                                       # Obtiene el primer resultado (o None).
    if not g:                                                              # Si no existe un invitado con ese token...
        return None                                                        # ...el token no es válido.
    if g.magic_link_used_at is not None:                                   # Si el token ya fue usado anteriormente...
        return None                                                        # ...se rechaza (token de un solo uso).
    if g.magic_link_expires_at and g.magic_link_expires_at < now:          # Si el token está expirado según el timestamp guardado...
        return None                                                        # ...se rechaza por expiración.

    g.magic_link_used_at = now                                             # Marca el token como utilizado (fecha/hora actual).
    db.add(g)                                                              # Agenda la actualización sobre el registro del invitado.
    db.commit()                                                            # Persiste el cambio de estado en la DB.
    db.refresh(g)                                                          # Refresca el objeto para lecturas posteriores.
    return g                                                               # Devuelve el invitado listo para emitir access token.

# ---------------------------------------------------------------------------------
# 🧼 Normalizador de teléfono y generador de códigos
# ---------------------------------------------------------------------------------

def _normalize_phone(raw: Optional[str]) -> Optional[str]:
    """Wrapper para usar la utilidad centralizada de normalización (solo dígitos)."""
    if not raw:
        return None
    # Usamos la utilidad centralizada que deja solo dígitos
    return normalize_phone(raw) or None

def _generate_guest_code(full_name: str, is_unique_callable) -> str:
    """
    Genera un guest_code tipo 'ANAGARC-8H2K' (prefijo del nombre + sufijo aleatorio).  # Docstring explicando el formato del código.
    Recibe un callable que prueba unicidad en DB para reintentar si colisiona.         # Aclara la verificación de unicidad.
    """
    base = _slug7(full_name)                                                # Calcula el prefijo estable a partir del nombre (hasta 7 letras).
    alphabet = string.ascii_uppercase + string.digits                       # Define alfabeto permitido para el sufijo (A-Z y 0-9).
    while True:                                                             # Bucle hasta encontrar un código que no exista en DB.
        suffix = "".join(secrets.choice(alphabet) for _ in range(4))        # Genera 4 caracteres aleatorios.
        code = f"{base}-{suffix}"                                           # Construye el código en formato PREFIJO-SUFIXO.
        if is_unique_callable(code):                                        # Llama al comprobador de unicidad proporcionado.
            return code                                                     # Si es único, devuelve el código generado.

def _slug7(full_name: str) -> str:
    """Convierte el nombre en un prefijo de hasta 7 letras mayúsculas (sin acentos/espacios)."""  # Docstring del helper.
    txt = (full_name or "").upper()                                         # Pasa el nombre a mayúsculas (maneja None como "").
    # Reemplazo simple de acentos comunes para código estable (sin libs externas).
    txt = (txt.replace("Á", "A").replace("É", "E")                          # Sustituye vocales acentuadas por su versión simple.
              .replace("Í", "I").replace("Ó", "O").replace("Ú", "U")        # Continúa sustituciones para todas las vocales.
              .replace("Ä", "A").replace("Ë", "E").replace("Ï", "I")        # Cubre diéresis para idiomas europeos comunes.
              .replace("Ö", "O").replace("Ü", "U").replace("Ñ", "N"))       # Sustituye Ñ por N para consistencia ASCII.
    only_letters = re.sub(r"[^A-Z]", "", txt)                               # Elimina cualquier caracter que no sea letra A-Z.
    return (only_letters[:7] or "INVITAD")                                  # Devuelve hasta 7 letras; si queda vacío, usa fallback 'INVITAD'.

# ---------------------------------------------------------------------------------
# 👑 Helpers adicionales para Admin CRUD (Update / Delete)
# ---------------------------------------------------------------------------------

def update(db: Session, db_obj: Guest, obj_in) -> Guest:
    """
    Actualiza un invitado existente con los datos de un schema Update (dict o Pydantic).
    """
    # Convierte a dict excluyendo nulos si es un modelo Pydantic set_unset
    if isinstance(obj_in, dict):
        update_data = obj_in
    else:
        update_data = obj_in.model_dump(exclude_unset=True)

    # Itera y asigna solo los campos presentes en el payload
    for field, value in update_data.items():
        if hasattr(db_obj, field):
            setattr(db_obj, field, value)

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete(db: Session, guest_id: int) -> bool:
    """
    Elimina un invitado por su ID. Retorna True si se eliminó, False si no existe.
    """
    guest = db.query(Guest).filter(Guest.id == guest_id).first()
    if not guest:
        return False
    db.delete(guest)
    db.commit()
    return True

def update_rsvp(db: Session, guest: Guest, attending: bool, payload) -> Guest:
    """
    Actualiza la confirmación de asistencia (RSVP) de forma atómica.
    - Gestiona confirmed, contact info, notes, allergies.
    - Reemplaza la lista de acompañantes si asiste.
    - Limpia datos si no asiste.
    """
    now = datetime.utcnow()
    
    # 1. Actualización de RSVP Status
    guest.confirmed = attending
    guest.confirmed_at = now
    
    # 2. Lógica dependiendo de si asiste o no
    if not attending:
        # --- CASO: NO ASISTE (Limpieza) ---
        guest.menu_choice = None
        guest.allergies = None
        guest.needs_accommodation = bool(payload.needs_accommodation) # A veces quieren transporte igual?
        guest.needs_transport = bool(payload.needs_transport)         # Se guarda preferencia pusiacaso.
        guest.companions.clear()
        guest.num_adults = 0
        guest.num_children = 0
        guest.notes = (payload.notes or None)
        # Nota: No borramos email/phone para mantener contacto
    else:
        # --- CASO: ASISTE (Actualización) ---
        guest.menu_choice = None # (Si hubiera campo en payload se pondría aquí)
        guest.allergies = (payload.allergies or None)
        guest.needs_accommodation = bool(payload.needs_accommodation)
        guest.needs_transport = bool(payload.needs_transport)
        guest.notes = (payload.notes or None)

        # Actualiza contacto si se provee
        if payload.email:
            guest.email = payload.email
        if payload.phone:
            guest.phone = payload.phone
            
        # Reemplazo de Acompañantes
        guest.companions.clear()
        
        # Contadores
        titular_adult = 1 # El invitado principal cuenta como adulto por defecto (o lógica de negocio)
        # Ajuste: Si el invitado principal es niño? Normalmente no.
        
        adults_count = titular_adult
        children_count = 0
        
        for c in payload.companions:
            comp = Companion(
                guest_id=guest.id,
                name=c.name.strip(),
                is_child=bool(c.is_child),
                menu_choice=c.menu_choice,
                allergies=(c.allergies or None)
            )
            guest.companions.append(comp)
            
            if c.is_child:
                children_count += 1
            else:
                adults_count += 1
                
        guest.num_adults = adults_count
        guest.num_children = children_count

    try:
        db.add(guest)
        db.commit()
        db.refresh(guest)
    except Exception as e:
        db.rollback()
        raise e
        
    return guest


def log_rsvp_action(
    db: Session,
    guest_id: int,
    updated_by: str,
    channel: Optional[str],
    action_type: str,
    payload_json: dict,
) -> None:
    """Registra una acción de RSVP en el log de auditoría."""
    log_entry = RsvpLog(
        guest_id=guest_id,
        updated_by=updated_by,
        channel=channel,
        action_type=action_type,
        payload_json=payload_json,
    )
    db.add(log_entry)
    db.commit()


def process_rsvp_submission(
    db: Session,
    guest: Guest,
    payload: schemas.RSVPUpdateRequest,
    updated_by: str,
    channel: str,
) -> Guest:
    """
    Procesa una sumisión de RSVP completa:
    1. Validaciones de negocio (cupos).
    2. Actualización atómica en BD.
    3. Auditoría.
    4. Envío de Email.
    """
    # 1. Validación de cupo máximo (Solo si asiste)
    if payload.attending:
        if len(payload.companions) > (guest.max_accomp or 0):
            # Excepción genérica, el router la convertirá a HTTP 400
            raise ValueError("Has superado el número máximo de acompañantes permitido.")

    # 2. Actualización en BD using existing Atomic Helper
    # Nota: update_rsvp maneja commits y rollbacks.
    # Si payload.attending es False, limpia acompañantes.
    updated_guest = update_rsvp(db, guest, payload.attending, payload)

    # 3. Auditoría
    # Convertimos payload a dict para guardar el snapshot JSON
    try:
        payload_dict = payload.model_dump(mode='json')
    except:
        payload_dict = payload.dict() # Fallback pydantic v1

    log_rsvp_action(
        db=db,
        guest_id=guest.id,
        updated_by=updated_by,
        channel=channel,
        action_type="update_rsvp",
        payload_json=payload_dict
    )

    # 4. Envío de Email (Lógica reutilizada de guest.py)
    try:
        if updated_guest.email:
            attending = bool(updated_guest.confirmed)
            invite_scope = "ceremony+reception" if updated_guest.invite_type == InviteTypeEnum.full else "reception-only"
            
            summary = {
                "guest_name": updated_guest.full_name or "",
                "invite_scope": invite_scope,
                "attending": attending,
                "companions": [],
                "allergies": updated_guest.allergies or "",
                "notes": (updated_guest.notes or None),
            }
            
            if attending:
                summary["companions"] = [
                    {"name": c.name or "", "label": ("child" if c.is_child else "adult"), "allergens": c.allergies or ""}
                    for c in (updated_guest.companions or [])
                ]

            mailer.send_confirmation_email(
                to_email=updated_guest.email,
                language=(updated_guest.language.value if updated_guest.language else "en"),
                summary=summary,
            )
    except Exception as e:
        logger.error(f"Fallo envío email RSVP process_rsvp_submission id={guest.id} err={e}")

    return updated_guest

