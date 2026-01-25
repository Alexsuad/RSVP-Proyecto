# File: backend/app/mailer.py
# ──────────────────────────────────────────────────────────────────────
# Propósito: Módulo central para la gestión y envío de correos electrónicos.
# Rol: Facade robusto que soporta múltiples proveedores (Brevo, Gmail, SendGrid),
# renderizado de plantillas HTML con Jinja2 y soporte de internacionalización (i18n).
# ──────────────────────────────────────────────────────────────────────

# ──────────────────────────────────────────────────────────────────────
# Importaciones Estándar
# ──────────────────────────────────────────────────────────────────────
import os                       # Acceso a variables de entorno (.env).
from enum import Enum           # Soporte para enumeraciones tipadas (idioma/segmento).
from datetime import datetime   # Manejo de fechas para plazos (deadlines).
import json                     # Serialización JSON para payloads de API y lectura de datos.
from pathlib import Path        # Manejo robusto de rutas del sistema de archivos.
import html                     # Utilidades para escapar texto HTML (seguridad XSS).
import smtplib                  # Cliente SMTP estándar para envíos vía Gmail/Legacy.
import socket                   # Resolución de nombres DNS y manejo de conexiones de red.
from ssl import create_default_context  # Contexto seguro para conexiones cifradas (TLS/SSL).
from functools import lru_cache # Decorador para cachear resultados de funciones (optimización I/O).
from email.mime.text import MIMEText        # Construcción de partes de texto/HTML para correos MIME.
from email.mime.multipart import MIMEMultipart # Contenedor principal para mensajes multiparte.

# ──────────────────────────────────────────────────────────────────────
# Importaciones de Terceros
# ──────────────────────────────────────────────────────────────────────
import requests                 # Cliente HTTP para interactuar con APIs REST (Brevo, Webhooks).
from loguru import logger       # Sistema de logging estructurado y rotativo.

# ──────────────────────────────────────────────────────────────────────
# Importaciones Internas
# ──────────────────────────────────────────────────────────────────────
from app.utils.translations import t  # Helper centralizado para cadenas de texto traducidas (i18n).

# ──────────────────────────────────────────────────────────────────────
# Configuración del Motor de Plantillas (Jinja2)
# ──────────────────────────────────────────────────────────────────────
HAS_JINJA = False
_jinja_env = None

# Definición temporal de ruta de plantillas para inicialización segura.
# (La constante global TEMPLATES_DIR se define más abajo en la configuración unificada).
_TEMP_TEMPLATES_DIR = (Path(__file__).parent / "templates" / "emails").resolve()

try:
    from jinja2 import Environment, FileSystemLoader, select_autoescape # Motor de plantillas potente.
    _jinja_env = Environment(
        loader=FileSystemLoader(str(_TEMP_TEMPLATES_DIR)), # Carga plantillas desde el sistema de archivos.
        autoescape=select_autoescape(['html', 'xml'])      # Escapado automático para seguridad.
    )
    HAS_JINJA = True
except ImportError:
    _jinja_env = None
    logger.warning("Jinja2 no está disponible. Las funciones avanzadas de HTML no operarán.")


def _smtp_connect_ipv4(host: str, port: int, timeout: float) -> smtplib.SMTP:
    """
    Establece una conexión SMTP forzando el uso de IPv4.
    
    Motivo: Evita retardos o fallos de conexión en entornos donde la resolución IPv6
    es prioritaria pero no funcional para salidas SMTP (común en ciertos cloud providers).
    """
    # Resolución explícita de dirección IPv4
    addrinfo = socket.getaddrinfo(
        host, port, socket.AF_INET, socket.SOCK_STREAM  # fuerza familia IPv4
    )
    ipv4_ip = addrinfo[0][4][0]  # toma la IP v4 literal (p.ej. '74.125.206.108')

    if port == 465:
        # TLS directo
        context = create_default_context()
        # Conecta ya a la IP v4 (no al hostname)
        server = smtplib.SMTP_SSL(
            host=ipv4_ip, port=port, timeout=timeout, context=context
        )
        return server

    # STARTTLS (587)
    server = smtplib.SMTP(timeout=timeout)
    # Forzamos conexión a la IP v4 (evita una nueva resolución que podría ir a IPv6)
    server.connect(ipv4_ip, port)
    return server


# =================================================================================
# ✅ Configuración unificada al inicio del archivo.
# ---------------------------------------------------------------------------------
# Se centraliza la lectura de variables de entorno y se valida credenciales
# solo si DRY_RUN=0 (evita fallos en dev/CI).
# =================================================================================
SUPPORTED_LANGS = ("en", "es", "ro")
DRY_RUN = os.getenv("DRY_RUN", "1") == "1"
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
FROM_EMAIL = os.getenv("EMAIL_FROM", "")
RSVP_URL = os.getenv("RSVP_URL", "")
EMAIL_SENDER_NAME = os.getenv("EMAIL_SENDER_NAME", "Jenny & Cristian")
TEMPLATES_DIR = (Path(__file__).parent / "templates" / "emails").resolve()
PUBLIC_LOGIN_URL = os.getenv("PUBLIC_LOGIN_URL", "").strip()

# Valida configuración crítica solo si NO estamos en modo simulación.
if not DRY_RUN:  # Si se quiere envío real...
    provider_now = os.getenv(
        "EMAIL_PROVIDER", "brevo"
    ).lower()  # Lee proveedor activo, Brevo por defecto.

    if provider_now == "sendgrid":  # Reglas para SendGrid.
        if not SENDGRID_API_KEY:
            raise RuntimeError(
                "Falta SENDGRID_API_KEY para envíos reales con SendGrid."
            )
        if not FROM_EMAIL:
            raise RuntimeError("Falta EMAIL_FROM para envíos reales con SendGrid.")

    elif provider_now == "gmail":  # Reglas para Gmail (SMTP).
        if not os.getenv("EMAIL_USER", "") or not os.getenv("EMAIL_PASS", ""):
            raise RuntimeError(
                "Faltan EMAIL_USER o EMAIL_PASS para envíos reales con Gmail/SMTP."
            )
        if not FROM_EMAIL:
            FROM_EMAIL = os.getenv("EMAIL_USER", "")

    elif provider_now == "brevo":  # Reglas para Brevo (API HTTPS).
        if not os.getenv("BREVO_API_KEY", ""):
            raise RuntimeError("Falta BREVO_API_KEY para envíos reales con Brevo API.")
        if not FROM_EMAIL:
            raise RuntimeError("Falta EMAIL_FROM para envíos reales con Brevo API.")

    else:
        raise RuntimeError(f"EMAIL_PROVIDER desconocido: {provider_now}")


# =================================================================================
# 📢 Webhook de alertas (opcional)
# =================================================================================
def send_alert_webhook(
    title: str, message: str
) -> None:  # Función para notificar errores por webhook.
    """Envía alerta a webhook si ALERT_WEBHOOK_URL está definido; silencioso si no."""
    url = os.getenv("ALERT_WEBHOOK_URL")
    if not url:
        return
    try:
        payload = {"text": f"{title}\n{message}"}
        headers = {"Content-Type": "application/json"}
        requests.post(url, data=json.dumps(payload), headers=headers, timeout=5)
    except Exception as e:
        logger.error(f"No se pudo notificar alerta por webhook: {e}")


# =================================================================================
# 🗓️ Internacionalización de fechas (sin depender del locale del sistema)
# =================================================================================


def format_deadline(deadline_dt: datetime, lang_code: str) -> str:
    """
    Devuelve la fecha límite en texto legible según idioma, usando las claves i18n
    definidas en utils/translations.py (date.month.01..12).
    """
    lang = (lang_code or "en").lower().strip()
    month_index = deadline_dt.month
    month_key = f"date.month.{month_index:02d}"
    month_name = t(month_key, lang)
    d = deadline_dt.day
    y = deadline_dt.year

    if lang == "es":
        return f"{d} de {month_name} de {y}"
    if lang == "ro":
        return f"{d} {month_name} {y}"
    return f"{month_name} {d}, {y}"


# =================================================================================
# 🧾 Plantillas de texto plano (i18n)
# =================================================================================
# (Nota: Algunas plantillas como 'reminder' y 'recovery' se usan aquí,
# otras se gestionan dinámicamente en las funciones correspondientes).
TEMPLATES = {
    # Las plantillas legacy pueden permanecer aquí si son referenciadas por funciones
    # que no han sido refactorizadas o para uso general, aunque el código refactorizado
    # abajo usa directamente 't(...)'.
}


# =================================================================================
# 🌐 Plantillas HTML (i18n con tolerancia de nombres)
# =================================================================================
LANG_CONTENT_FILES = {
    "en": ["wedding_en.json", "email_en.json"],
    "es": ["wedding_es.json", "email_es.json"],
    "ro": ["wedding_ro.json", "email_ro.json"],
}


@lru_cache(maxsize=8)
def _load_language_content(lang_code: str) -> dict:
    """
    Carga el JSON (title, message, cta_label, footer_text) según idioma.
    """
    code = lang_code if lang_code in LANG_CONTENT_FILES else "en"
    for filename in LANG_CONTENT_FILES[code]:
        json_path = TEMPLATES_DIR / filename
        if json_path.exists():
            try:
                data = json.loads(json_path.read_text(encoding="utf-8"))
                logger.debug(f"[mailer] i18n file loaded: {filename} (lang={code})")
                return data
            except Exception as e:
                logger.error(f"Error al parsear '{filename}': {e}")
    logger.error(
        f"No se encontró archivo de contenido válido para '{code}'. Usando fallback."
    )
    return {
        "title": "Message",
        "message": "",
        "cta_label": "Open",
        "footer_text": "This email was sent automatically.",
    }


def _build_email_html(lang_code: str, cta_url: str) -> str:
    """Ensambla HTML usando plantilla base + contenido i18n + URL de CTA."""
    template_path = TEMPLATES_DIR / "wedding_email_template.html"
    if template_path.exists():
        template_html = template_path.read_text(encoding="utf-8")
    else:
        template_html = (
            "<html lang='{{html_lang}}'><body>"
            "<h1>{{title}}</h1><p>{{message}}</p>"
            "<p><a href='{{cta_url}}'>{{cta_label}}</a></p>"
            "<p style='font-size:12px;color:#888'>{{footer_text}}</p>"
            "</body></html>"
        )
    content = _load_language_content(lang_code)
    html_out = template_html.replace("{{html_lang}}", lang_code)
    html_out = html_out.replace("{{title}}", content.get("title", ""))
    html_out = html_out.replace("{{message}}", content.get("message", ""))
    html_out = html_out.replace("{{cta_label}}", content.get("cta_label", "Open"))
    html_out = html_out.replace("{{cta_url}}", cta_url or "#")
    html_out = html_out.replace("{{footer_text}}", content.get("footer_text", ""))
    return html_out


def _render_template(template_name: str, context: dict) -> str:
    """Helper seguro para renderizar plantillas Jinja2 si está disponible."""
    if not HAS_JINJA or not _jinja_env:
        logger.error(f"Intentando renderizar {template_name} sin Jinja2 instalado.")
        return ""
    
    try:
        template = _jinja_env.get_template(template_name)
        return template.render(**context)
    except Exception as e:
        logger.error(f"Error renderizando plantilla {template_name}: {e}")
        return ""


# =================================================================================
# ✉️ Motores de envío internos
# =================================================================================
def _send_plain_via_gmail(to_email: str, subject: str, body: str) -> bool:
    """Envía un correo de texto plano usando un servidor SMTP (pensado para Gmail)."""
    host = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    port = int(os.getenv("EMAIL_PORT", "587"))
    user = os.getenv("EMAIL_USER", "")
    pwd = os.getenv("EMAIL_PASS", "")
    sender_name = os.getenv("EMAIL_SENDER_NAME", "RSVP")
    from_addr = os.getenv("EMAIL_FROM", user)

    if not (user and pwd and from_addr):
        logger.error(
            "Gmail SMTP no está configurado correctamente (EMAIL_USER/EMAIL_PASS/EMAIL_FROM)."
        )
        return False

    try:
        msg = MIMEMultipart()
        msg["From"] = f"{sender_name} <{from_addr}>"
        msg["To"] = (to_email or "").strip()
        if os.getenv("EMAIL_REPLY_TO"):
            msg["Reply-To"] = os.getenv("EMAIL_REPLY_TO")
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain", "utf-8"))
        timeout = float(os.getenv("SMTP_TIMEOUT", "30"))
        server = _smtp_connect_ipv4(host, port, timeout)
        if port == 587:
            server.ehlo()
            server.starttls(context=create_default_context())
            server.ehlo()
        server.login(user, pwd)
        server.sendmail(from_addr, [msg["To"]], msg.as_string())
        server.quit()
        logger.info(f"Gmail SMTP → enviado a {msg['To']}")
        return True
    except Exception as e:
        logger.exception(f"Gmail SMTP → excepción enviando a {to_email}: {e}")
        return False


def _send_html_via_gmail(
    to_email: str, subject: str, html_body: str, text_fallback: str = ""
) -> bool:
    """Envía HTML usando Gmail SMTP, incluyendo parte de texto plano como multipart/alternative."""
    host = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    port = int(os.getenv("EMAIL_PORT", "587"))
    user = os.getenv("EMAIL_USER", "")
    pwd = os.getenv("EMAIL_PASS", "")
    sender_name = os.getenv("EMAIL_SENDER_NAME", "RSVP")
    from_addr = os.getenv("EMAIL_FROM", user)

    if not (user and pwd and from_addr):
        logger.error(
            "Gmail SMTP no está configurado (EMAIL_USER/EMAIL_PASS/EMAIL_FROM)."
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{sender_name} <{from_addr}>"
        msg["To"] = (to_email or "").strip()
        if os.getenv("EMAIL_REPLY_TO"):
            msg["Reply-To"] = os.getenv("EMAIL_REPLY_TO")
        msg["Subject"] = subject

        if text_fallback:
            msg.attach(MIMEText(text_fallback, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        timeout = float(os.getenv("SMTP_TIMEOUT", "30"))
        server = _smtp_connect_ipv4(host, port, timeout)
        if port == 587:
            server.ehlo()
            server.starttls(context=create_default_context())
            server.ehlo()
        server.login(user, pwd)
        server.sendmail(from_addr, [msg["To"]], msg.as_string())
        server.quit()
        logger.info(f"Gmail SMTP (HTML) → enviado a {msg['To']}")
        return True
    except Exception as e:
        logger.exception(f"Gmail SMTP (HTML) → excepción enviando a {to_email}: {e}")
        return False


def _send_html_via_brevo_api(
    to_email: str, subject: str, html_body: str, text_fallback: str, to_name: str = ""
) -> bool:
    """Envía un correo usando la API HTTPS de Brevo, incluyendo nombre y Reply-To."""
    api_key = os.getenv("BREVO_API_KEY")
    from_email = os.getenv("EMAIL_FROM")
    sender_name = os.getenv("EMAIL_SENDER_NAME")

    payload = {
        "sender": {"email": from_email, "name": sender_name},
        "to": [{"email": (to_email or "").strip(), "name": (to_name or "").strip()}],
        "subject": subject,
        "htmlContent": html_body,
        "textContent": text_fallback or "Open with an HTML-capable client.",
    }

    reply_to = os.getenv("EMAIL_REPLY_TO", "").strip()
    if reply_to:
        payload["replyTo"] = {"email": reply_to, "name": sender_name}

    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        resp = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers=headers,
            timeout=15,
        )

        if 200 <= resp.status_code < 300:
            logger.info(f"Brevo API → enviado correctamente a {to_name} <{to_email}>")
            return True

        logger.error(f"Brevo API error -> status={resp.status_code} body={resp.text}")
        return False
    except Exception as e:
        logger.exception(f"Brevo API → excepción enviando a {to_email}: {e}")
        return False


# =================================================================================
# ✉️ ROUTER: envío HTML (Brevo via API / Gmail SMTP)
# =================================================================================
def send_email_html(
    to_email: str,
    subject: str,
    html_body: str,
    text_fallback: str = "",
    to_name: str = "",
) -> bool:
    """Router principal para enviar correos HTML, priorizando Brevo."""
    if DRY_RUN:
        logger.info(
            f"[DRY_RUN] (HTML) Simular envío a {to_name} <{to_email}> | Asunto: {subject}"
        )
        return True

    provider = os.getenv("EMAIL_PROVIDER", "brevo").lower()

    if provider == "brevo":
        return _send_html_via_brevo_api(
            to_email, subject, html_body, text_fallback, to_name
        )

    if provider == "gmail":
        return _send_html_via_gmail(to_email, subject, html_body, text_fallback)

    logger.error(f"EMAIL_PROVIDER inválido o no soportado: {provider}")
    return False


# =================================================================================
# ✉️ ROUTER: envío TEXTO (Brevo via API / Gmail SMTP / SendGrid legacy)
# =================================================================================
def send_email(to_email: str, subject: str, body: str, to_name: str = "") -> bool:
    """Router principal para enviar correos de texto plano."""
    if DRY_RUN:
        logger.info(
            f"[DRY_RUN] (TXT) Simular envío a {to_name} <{to_email}> | Asunto: {subject}\n{body}"
        )
        return True

    provider = os.getenv("EMAIL_PROVIDER", "brevo").lower()

    if provider == "brevo":
        html_body = f"<pre style='font-family:monospace; white-space:pre-wrap;'>{html.escape(body)}</pre>"
        return _send_html_via_brevo_api(
            to_email, subject, html_body, text_fallback=body, to_name=to_name
        )

    if provider == "gmail":
        return _send_plain_via_gmail(to_email, subject, body)

    if provider == "sendgrid":
        api_key = os.getenv("SENDGRID_API_KEY", "")
        from_email = os.getenv("EMAIL_FROM", "")
        if not api_key or not from_email:
            logger.error("SendGrid (TXT): falta SENDGRID_API_KEY o EMAIL_FROM.")
            return False

        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, From
        except ImportError:
            logger.error("SendGrid no instalado. Usa EMAIL_PROVIDER=brevo o gmail.")
            return False

        message = Mail(
            from_email=From(from_email, os.getenv("EMAIL_SENDER_NAME", "RSVP")),
            to_emails=to_email,
            subject=subject,
            plain_text_content=body,
        )
        try:
            sg = SendGridAPIClient(api_key)
            resp = sg.send(message)
            if 200 <= resp.status_code < 300:
                logger.info(f"SendGrid TXT → enviado a {to_email}")
                return True
            logger.error(
                f"SendGrid TXT error -> status={resp.status_code} body={getattr(resp, 'body', None)}"
            )
            return False
        except Exception as e:
            logger.exception(f"SendGrid TXT → excepción enviando a {to_email}: {e}")
            return False

    logger.error(f"EMAIL_PROVIDER inválido o no soportado para texto: {provider}")
    return False


# =================================================================================
# 🧩 Helpers de alto nivel (API simple para el resto del backend)
# =================================================================================

def _append_lang_to_url(url: str, lang: str) -> str:
    """Helper to append ?lang=xx or &lang=xx to a URL safely."""
    if not url or not lang:
        return url
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}lang={lang}"


def send_rsvp_reminder_email(
    to_email: str,
    guest_name: str,
    invited_to_ceremony: bool,
    language: str | Enum,
    deadline_dt: datetime,
) -> bool:
    """Envía correo de recordatorio RSVP en HTML usando plantilla Jinja2."""
    lang_value = language.value if isinstance(language, Enum) else (language or "en")
    lang_code = lang_value if lang_value in SUPPORTED_LANGS else "en"
    deadline_str = format_deadline(deadline_dt, lang_code)

    # Construir URL con idioma
    cta_url = _append_lang_to_url(RSVP_URL, lang_code) if RSVP_URL else "#"

    subject = t("email.subject.reminder", lang_code)
    
    # Texto condicional según invitación
    body_key = (
        "email.reminder_both" if invited_to_ceremony else "email.reminder_reception"
    )
    # Extraemos el mensaje base pero quitamos los placeholders que ya no usaremos igual
    # O mejor, usamos textos más limpios si los tuviéramos. Reutilizaremos el body_template
    # como "intro" pero limpiándolo de saltos de línea excesivos.
    
    # Para ser más prolijos, usamos el texto de traducción como base
    # El texto actual en translations.py tiene {cta} y {deadline}, vamos a manejarlos.
    # Como el template HTML tiene estructura fija, pasaremos las partes clave.
    
    intro_text = t(body_key, lang_code).split("\n")[0].replace("Hola {name},", "").strip()
    if intro_text.startswith(","): intro_text = intro_text[1:].strip()
    
    # Si la extracción falla, usamos un fallback genérico hardcoded (seguridad)
    if not intro_text or len(intro_text) < 10:
        intro_text = "This is a friendly reminder to confirm your attendance."
        if lang_code == "es": intro_text = "Este es un amable recordatorio para que confirmes tu asistencia."
        if lang_code == "ro": intro_text = "Acesta este un memento prietenos pentru a confirma participarea."

    context = {
        "lang_code": lang_code,
        "title": "RSVP Reminder" if lang_code == "en" else ("Recordatorio RSVP" if lang_code == "es" else "Memento RSVP"),
        "intro_text": f"{t('email.guest_code.greet', lang_code)} {guest_name}, {intro_text}",
        "subject": subject,
        
        "deadline_label": "Deadline" if lang_code == "en" else ("Fecha límite" if lang_code == "es" else "Data limită"),
        "deadline_text": deadline_str,
        
        "instruction_text": t("email.guest_code.instruction", lang_code), # "Usa este código..." (quizás ajustar un texto mejor: "Por favor confirma antes de la fecha.")
        
        "cta_url": cta_url,
        "cta_label": t("email.confirmation.btn_edit", lang_code).replace("✏️ ", "") or "RSVP", # Reusamos editar o similar
        
        "closing_text": t("email.confirmation.footer.more_details", lang_code),
        "footer_text": "Jenny & Cristian Wedding 2026",
    }
    
    # Ajuste manual del instruction text si es el de Guest Code ("Usa este código...") que no pega aquí.
    # Mejor usamos una frase simple.
    instruction_simple = "Please click below to confirm."
    if lang_code == "es": instruction_simple = "Por favor haz clic abajo para confirmar."
    if lang_code == "ro": instruction_simple = "Vă rugăm să faceți clic mai jos pentru a confirma."
    context["instruction_text"] = instruction_simple


    html_body = _render_template("email_reminder.html", context)

    # Texto Plano Fallback (Original mejorado)
    body_template = t(body_key, lang_code)
    cta_line = t("email.cta_rsvp", lang_code).format(url=cta_url)
    
    text_fallback = body_template.format(
        name=guest_name,
        deadline=deadline_str,
        cta=cta_line,
    )

    return send_email_html(
        to_email=to_email,
        subject=subject,
        html_body=html_body,
        text_fallback=text_fallback,
        to_name=guest_name,
    )


def send_recovery_email(
    to_email: str,
    guest_name: str,
    guest_code: str,
    language: str | Enum,
) -> bool:
    """Envía correo de recuperación de código de invitado en texto plano usando claves de traducción (i18n)."""
    lang_value = language.value if isinstance(language, Enum) else (language or "en")
    safe_lang = lang_value if lang_value in SUPPORTED_LANGS else "en"

    cta_line = ""
    if RSVP_URL:
        final_url = _append_lang_to_url(RSVP_URL, safe_lang)
        cta_template = t("email.cta_rsvp", safe_lang)
        cta_line = cta_template.format(url=final_url)

    body_template = t("email.recovery", safe_lang)

    body = body_template.format(
        name=guest_name,
        guest_code=guest_code,
        cta=cta_line,
    )
    subject = t("email.subject.recovery", safe_lang)

    return send_email(
        to_email=to_email,
        subject=subject,
        body=body,
        to_name=guest_name,
    )


def send_magic_link_email(to_email: str, language: str | Enum, magic_url: str) -> bool:
    """Envía el correo de Magic Link usando plantilla HTML (i18n) con logs y fallback i18n."""

    # ─────────────────────────────────────────────────────────────────────────────
    # BLOQUE 1 · Normalización defensiva de idioma (manteniendo EN como fallback)
    # ─────────────────────────────────────────────────────────────────────────────
    _raw_lang = getattr(language, "value", language)
    _lang = (_raw_lang or "").strip().lower()

    if not _lang:
        _lang = "en"

    if "-" in _lang:
        _lang = _lang.split("-")[0]

    if _lang not in SUPPORTED_LANGS:
        if _lang.startswith("ro"):
            _lang = "ro"
        elif _lang.startswith("es"):
            _lang = "es"
        elif _lang.startswith("en"):
            _lang = "en"
        else:
            _lang = "en"

    lang_code = _lang
    
    # Agregar ?lang=xx a la URL mágica para continuidad
    magic_url = _append_lang_to_url(magic_url, lang_code)

    logger.info(
        f"[MAILER] Preparando envío de Magic Link → to={to_email} lang={lang_code}"
    )

    # ─────────────────────────────────────────────────────────────────────────────
    # BLOQUE 2 · Asunto i18n
    # ─────────────────────────────────────────────────────────────────────────────
    subject = t("email.subject.magic_link", lang_code)

    # ─────────────────────────────────────────────────────────────────────────────
    # BLOQUE 3 · Cuerpo HTML (helper existente)
    # ─────────────────────────────────────────────────────────────────────────────
    html_out = _build_email_html(lang_code, magic_url)

    # ─────────────────────────────────────────────────────────────────────────────
    # BLOQUE 4 · Fallback de texto plano por idioma (clientes sin HTML)
    # ─────────────────────────────────────────────────────────────────────────────
    # Usamos la clave i18n centralizada y formateamos la URL.
    text_fallback = t("email.magic_link.text_fallback", lang_code).format(url=magic_url)

    # ─────────────────────────────────────────────────────────────────────────────
    # BLOQUE 5 · Envío (helper HTML+texto)
    # ─────────────────────────────────────────────────────────────────────────────
    return send_email_html(
        to_email=to_email,
        subject=subject,
        html_body=html_out,
        text_fallback=text_fallback,
        to_name="",
    )


def send_guest_code_email(
    to_email: str, guest_name: str, guest_code: str, language: str | Enum
) -> bool:
    """Envía un correo HTML con el código de invitación usando plantilla Jinja2."""

    # Normalización de idioma
    _raw_lang = getattr(language, "value", language)
    _lang = (_raw_lang or "").strip().lower()
    if "-" in _lang: _lang = _lang.split("-")[0]
    lang_code = _lang if _lang in SUPPORTED_LANGS else "en"

    logger.info(f"[MAILER] Preparando envío de Guest Code → to={to_email} lang={lang_code}")
    logger.info(f"[GUEST_CODE] Código generado para '{guest_name}': {guest_code}")

    # Textos i18n
    subject = t("email.subject.guest_code", lang_code)
    greet = t("email.guest_code.greet", lang_code)
    intro_text = t("email.guest_code.intro", lang_code).replace("{guest_code}", "")
    code_instruction = t("email.guest_code.instruction", lang_code)
    btn_label = t("email.guest_code.button_label", lang_code)
    
    # CTA URL: debe apuntar directamente a la página de login (/app/login)
    cta_url = "#"
    if PUBLIC_LOGIN_URL:
        from urllib.parse import urlparse, urlunparse, urlencode
        parts = list(urlparse(PUBLIC_LOGIN_URL))
        # Forzar el path a /app/login (la página de login real)
        parts[2] = "/app/login.html"  # parts[2] es el path
        # Añadir solo el parámetro de idioma
        parts[4] = urlencode({"lang": lang_code})  # parts[4] es la query string
        cta_url = urlunparse(parts)

    login_line = f"Login: {cta_url}" if PUBLIC_LOGIN_URL else ""

    # Contexto para Template
    context = {
        "lang_code": lang_code,
        "greet": greet,
        "guest_name": guest_name,
        "intro_text": intro_text,
        "guest_code": guest_code,
        "code_instruction_text": code_instruction,
        "next_step_text": "",
        "cta_url": cta_url,
        "cta_label": btn_label,
        "closing_text": t("email.confirmation.footer.more_details", lang_code),
        "footer_text": "Jenny & Cristian Wedding 2026",
    }

    html_body = _render_template("email_guest_code.html", context)

    # Texto Plano Fallback (para clientes que no renderizan HTML)
    text_fallback = (
        f"{greet} {guest_name}\n\n"
        f"{t('email.guest_code.intro', lang_code).format(guest_code=guest_code)}\n\n"
        f"{code_instruction}\n"
        f"{login_line}\n"
    )

    return send_email_html(
        to_email=to_email,
        subject=subject,
        html_body=html_body,
        text_fallback=text_fallback,
        to_name=guest_name,
    )


def send_confirmation_email(to_email: str, language: str | Enum, summary: dict) -> bool:
    """Envía correo de confirmación de RSVP en HTML usando plantilla Jinja2."""
    
    lang_value = language.value if isinstance(language, Enum) else (language or "en")
    lang_code = lang_value if lang_value in SUPPORTED_LANGS else "en"

    subject = t("email.subject.confirmation", lang_code)
    guest_name = summary.get("guest_name", "")
    invite_scope = summary.get("invite_scope", "reception-only")
    attending = summary.get("attending", None)

    # Textos condicionales
    if invite_scope == "ceremony+reception":
        scope_text = t("email.confirmation.scope.ceremony_reception", lang_code)
    else:
        scope_text = t("email.confirmation.scope.reception_only", lang_code)

    if attending is True:
        attending_yes_text = t("email.confirmation.attending.yes", lang_code).replace("Asistencia: ", "").replace("Attendance: ", "")
        attending_no_text = ""
        attending_text_plain = t("email.confirmation.attending.yes", lang_code)
    else:
        attending_yes_text = ""
        attending_no_text = t("email.confirmation.attending.no", lang_code).replace("Asistencia: ", "").replace("Attendance: ", "")
        attending_text_plain = t("email.confirmation.attending.no", lang_code)

    # Contexto para Template
    context = {
        "lang_code": lang_code,
        "title": t("ok.title", lang_code), # "¡Confirmación recibida!"
        "subject": subject,
        "intro_text": t("ok.msg_yes", lang_code) if attending else t("ok.msg_no", lang_code),
        
        "summary_label": t("ok.summary", lang_code),
        
        "label_invitation": t("email.confirmation.label.invitation", lang_code),
        "invite_scope_text": scope_text,
        
        "label_status": "Asistencia" if lang_code == "es" else ("Prezență" if lang_code == "ro" else "Attendance"),
        "attending": attending,
        "text_attending_yes": t("options.attendance.yes", lang_code).upper(),
        "text_attending_no": t("options.attendance.no", lang_code).upper(),
        
        "event_date": str(summary.get("event_date", "")),
        "label_date": t("email.confirmation.label.event_date", lang_code),
        
        "headcount": str(summary.get("headcount", "")),
        "label_guests": t("email.confirmation.label.guests", lang_code),
        
        "menu_choice": str(summary.get("menu_choice", "")),
        "label_menu": t("email.confirmation.label.menu", lang_code),
        
        "companions": summary.get("companions", []),
        "label_companions": t("email.confirmation.label.companions", lang_code),
        
        "allergies": summary.get("allergies", ""),
        "label_allergies_main": t("form.titular_allergies", lang_code),
        
        "notes": summary.get("notes", ""),
        "label_notes": t("email.confirmation.label.notes", lang_code),
        
        "cta_url": "", # Opcional: Link para editar?
        "cta_label": "",
        
        "footer_more_details": t("email.confirmation.footer.more_details", lang_code),
        "event_year": datetime.now().year
    }

    html_body = _render_template("email_confirmation.html", context)

    # Texto Plano Fallback (Versión robusta simplificada)
    companions_plain = ""
    if context["companions"]:
        companions_plain = "\n".join([f"- {c['name']} ({c.get('allergens', '')})" for c in context["companions"]])

    tf = []
    tf.append(f"{t('email.confirmation.greet', lang_code)} {guest_name},")
    tf.append(context["intro_text"])
    tf.append(f"{context['label_invitation']}: {scope_text}")
    tf.append(attending_text_plain)
    if context["event_date"]: tf.append(f"{context['label_date']}: {context['event_date']}")
    if companions_plain: tf.append(f"{context['label_companions']}:\n{companions_plain}")
    if context["allergies"]: tf.append(f"{context['label_allergies_main']}: {context['allergies']}")
    if context["notes"]: tf.append(f"{context['label_notes']}: {context['notes']}")
    tf.append(context["footer_more_details"])
    
    text_fallback = "\n".join(tf)

    return send_email_html(
        to_email=to_email,
        subject=subject,
        html_body=html_body,
        text_fallback=text_fallback,
        to_name=guest_name,
    )


def send_rsvp_reminder_email_html(
    to_email: str,
    guest_name: str,
    invited_to_ceremony: bool,
    language: str | Enum,
    deadline_dt: datetime,
) -> bool:
    """(Opcional) Envía un recordatorio usando la plantilla HTML (i18n)."""
    lang_value = language.value if isinstance(language, Enum) else (language or "en")
    lang_code = lang_value if lang_value in SUPPORTED_LANGS else "en"
    cta_url = RSVP_URL or "#"
    html_out = _build_email_html(lang_code, cta_url)
    deadline_str = format_deadline(deadline_dt, lang_code)
    html_out = html_out.replace("</p>", f"<br/><strong>{deadline_str}</strong></p>", 1)
    subject = t("email.subject.reminder", lang_code)
    return send_email_html(
        to_email=to_email, subject=subject, html_body=html_out, to_name=guest_name
    )


# =================================================================================
# 🔁 Compatibilidad retro: alias con firma antigua
# =================================================================================
def send_magic_link(email: str, url: str, lang: str = "en") -> bool:
    """Wrapper retrocompatible: firma antigua → nueva función HTML."""
    return send_magic_link_email(to_email=email, language=lang, magic_url=url)
