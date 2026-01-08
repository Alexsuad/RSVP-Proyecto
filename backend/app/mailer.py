# app/mailer.py  # Ruta y nombre del archivo.

# =================================================================================
# 📧 MÓDULO DE ENVÍO DE CORREOS (con soporte HTML)
# (Patch: Brevo por defecto, sin fallback SendGrid en HTML, replyTo en Brevo API)
# ---------------------------------------------------------------------------------
# Centraliza envío por Brevo, Gmail o SendGrid, plantillas (texto y HTML),
# i18n y helpers de alto nivel. Mantiene compatibilidad retro y DRY_RUN.
# =================================================================================

# 🐍 Importaciones
import os  # Acceso a variables de entorno (.env).
from enum import Enum  # Soporte para tipos Enum (idioma/segmento).
from datetime import datetime  # Tipo de fecha para formateo de deadline.
import json  # Serialización JSON para payloads/leer plantillas.
from pathlib import Path  # Manejo de rutas de archivos de forma robusta.
import html  # Escape seguro para valores libres en HTML.
import smtplib  # Envío SMTP (Gmail).
import socket  # Resolver DNS y forzar IPv4 en SMTP.
from ssl import create_default_context  # Helper para crear un contexto TLS seguro.
from functools import lru_cache  # Cache de lectura i18n para evitar I/O repetido.

import requests  # HTTP simple para webhook opcional.
from loguru import logger  # Logger estructurado para trazas legibles.

from email.mime.text import MIMEText  # Construcción de cuerpo de texto/HTML.
from email.mime.multipart import (
    MIMEMultipart,
)  # Contenedor de mensaje (headers + partes).

from app.utils.translations import t  # Helper i18n centralizado para textos traducidos.


def _smtp_connect_ipv4(host: str, port: int, timeout: float) -> smtplib.SMTP:
    """
    Crea una conexión SMTP forzando IPv4 y soporta 587 (STARTTLS) y 465 (SMTPS).
    Conecta explícitamente a la IP v4 resuelta para evitar IPv6.
    """
    # Resuelve SOLO IPv4
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
    """Envía correo de recordatorio RSVP en texto plano usando claves de traducción (i18n)."""
    lang_value = language.value if isinstance(language, Enum) else (language or "en")
    safe_lang = lang_value if lang_value in SUPPORTED_LANGS else "en"
    deadline_str = format_deadline(deadline_dt, safe_lang)

    cta_line = ""
    if RSVP_URL:
        final_url = _append_lang_to_url(RSVP_URL, safe_lang)
        cta_template = t("email.cta_rsvp", safe_lang)
        cta_line = cta_template.format(url=final_url)

    body_key = (
        "email.reminder_both" if invited_to_ceremony else "email.reminder_reception"
    )
    body_template = t(body_key, safe_lang)

    body = body_template.format(
        name=guest_name,
        deadline=deadline_str,
        cta=cta_line,
    )
    subject = t("email.subject.reminder", safe_lang)

    return send_email(
        to_email=to_email,
        subject=subject,
        body=body,
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
    """Envía un correo HTML minimalista con el código de invitación (i18n + CTA opcional a Login)."""

    # ─────────────────────────────────────────────────────────────────────────────
    # Normalización defensiva del idioma (manteniendo EN como fallback por defecto)
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
    logger.info(
        f"[MAILER] Preparando envío de Guest Code → to={to_email} lang={lang_code}"
    )

    # -----------------------------
    # Asunto del correo (i18n desde translations.py)
    # -----------------------------
    subject = t("email.subject.guest_code", lang_code)

    # ----------------------------------
    # Textos cortos por idioma (saludo + instrucción + etiqueta de botón)
    # ----------------------------------
    greet = t("email.guest_code.greet", lang_code)  # "Hola" / "Bună" / "Hi"
    instr = t("email.guest_code.instruction", lang_code)  # Frase bajo el código.
    btn_label = t(
        "email.guest_code.button_label", lang_code
    )  # Etiqueta del botón (CTA).

    # ----------------------------------
    # CTA opcional (enlace a login público si está configurado)
    # ----------------------------------
    cta_html = ""
    if PUBLIC_LOGIN_URL:
        from urllib.parse import urlparse, urlunparse, urlencode, parse_qsl

        parts = list(urlparse(PUBLIC_LOGIN_URL))
        q = dict(parse_qsl(parts[4]))

        q["goto"] = "login"
        q["lang"] = lang_code

        parts[4] = urlencode(q)
        cta_url = urlunparse(parts)

        cta_html = (
            f'<p style="margin-top:16px;">'
            f'  <a href="{cta_url}" '
            f'     style="display:inline-block;padding:10px 16px;border-radius:8px;'
            f'            background:#6D28D9;color:#fff;text-decoration:none;font-weight:600;">'
            f"    {btn_label}"
            f"  </a>"
            f"</p>"
        )

    # ----------------------------------
    # Cuerpo HTML del email (simple, seguro y responsive básico)
    # ----------------------------------
    html_body = (
        f'<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;'
        f'            line-height:1.6;color:#0F172A;font-size:16px;">'
        f"  <p>{greet} {html.escape(guest_name)}</p>"
        f'  <p style="margin:0 0 8px 0;">{instr}</p>'
        f'  <p style="font-size:24px;letter-spacing:1px;word-break:break-all;'
        f"            background:#F1F5F9;border:1px solid #E2E8F0;border-radius:8px;"
        f'            padding:12px 16px;display:inline-block;">'
        f"    <strong>{html.escape(guest_code)}</strong>"
        f"  </p>"
        f"  {cta_html}"
        f'  <p style="margin-top:20px;color:#475569;font-size:14px;">'
        f"    Jenny & Cristian"
        f"  </p>"
        f"</div>"
    )

    # ----------------------------------
    # Versión de texto plano (fallback para clientes sin HTML)
    # ----------------------------------
    intro_template = t(
        "email.guest_code.intro", lang_code
    )  # "Tu código de invitación es: {guest_code}", etc.
    login_line = ""

    if PUBLIC_LOGIN_URL:
        # Solo construimos la línea de login si existe URL pública.
        login_line_template = t("email.guest_code.login_line", lang_code)
        login_line = login_line_template.format(url=cta_url)

    text_fallback = (
        f"{greet} {guest_name}\n\n"
        f"{intro_template.format(guest_code=guest_code)}\n\n"
        f"{instr}\n"
        f"{login_line}\n"
    )

    # ----------------------------------
    # Envío (helper HTML + texto)
    # ----------------------------------
    return send_email_html(
        to_email=to_email,
        subject=subject,
        html_body=html_body,
        text_fallback=text_fallback,
        to_name=guest_name,
    )


def send_confirmation_email(to_email: str, language: str | Enum, summary: dict) -> bool:
    """Envía correo de confirmación de RSVP en HTML con resumen (i18n, seguro contra XSS)."""
    lang_value = language.value if isinstance(language, Enum) else (language or "en")
    lang_code = lang_value if lang_value in SUPPORTED_LANGS else "en"

    subject = t("email.subject.confirmation", lang_code)

    guest_name = html.escape(summary.get("guest_name", ""))
    invite_scope = summary.get("invite_scope", "reception-only")
    attending = summary.get("attending", None)
    companions = summary.get("companions", [])
    allergies = (
        html.escape(summary.get("allergies", "")) if summary.get("allergies") else ""
    )
    notes = html.escape(summary.get("notes", "")) if summary.get("notes") else ""
    event_date = html.escape(str(summary.get("event_date", "")))
    headcount = html.escape(str(summary.get("headcount", "")))
    menu_choice = html.escape(str(summary.get("menu_choice", "")))

    # Texto del alcance (ceremonia/recepción) según invite_scope.
    if invite_scope == "ceremony+reception":
        scope_text = t("email.confirmation.scope.ceremony_reception", lang_code)
    else:
        scope_text = t("email.confirmation.scope.reception_only", lang_code)

    # Texto de asistencia (sí / no / desconocido).
    if attending is True:
        attending_text = t("email.confirmation.attending.yes", lang_code)
    elif attending is False:
        attending_text = t("email.confirmation.attending.no", lang_code)
    else:
        attending_text = t("email.confirmation.attending.unknown", lang_code)

    greet = t("email.confirmation.greet", lang_code)  # "Hola" / "Bună" / "Hi"

    label_invitation = t("email.confirmation.label.invitation", lang_code)
    label_event_date = t("email.confirmation.label.event_date", lang_code)
    label_guests = t("email.confirmation.label.guests", lang_code)
    label_menu = t("email.confirmation.label.menu", lang_code)
    label_companions = t("email.confirmation.label.companions", lang_code)
    label_allergies = t("email.confirmation.label.allergies", lang_code)
    label_notes = t("email.confirmation.label.notes", lang_code)

    html_parts = []  # Acumula líneas HTML.

    html_parts.append(
        "<div style='font-family:Inter,Arial,sans-serif;line-height:1.6'>"
    )
    html_parts.append(f"<h2>{subject}</h2>")
    html_parts.append(f"<p>{greet} {guest_name},</p>")
    html_parts.append(  # Línea de invitación.
        f"<p>{label_invitation}: {scope_text}</p>"
    )
    html_parts.append(f"<p>{attending_text}</p>")

    html_parts.append(
        f"<p><strong>{label_event_date}:</strong> {event_date}</p>"
        if event_date
        else ""
    )  # Fecha.
    html_parts.append(
        f"<p><strong>{label_guests}:</strong> {headcount}</p>" if headcount else ""
    )  # Número de invitados.
    html_parts.append(
        f"<p><strong>{label_menu}:</strong> {menu_choice}</p>" if menu_choice else ""
    )  # Menú.

    if companions:  # Si hay acompañantes…
        html_parts.append(f"<h3>👥 {label_companions}</h3>")
        html_parts.append("<ul>")
        for c in companions:
            label = html.escape(c.get("label", ""))
            name = html.escape(c.get("name", ""))
            allergens = (
                html.escape(c.get("allergens", "")) if c.get("allergens") else ""
            )
            html_parts.append(
                f"<li><strong>{name}</strong> — {label} — "
                f"{label_allergies}: {allergens or '—'}</li>"
            )
        html_parts.append("</ul>")

    if allergies:  # Si hay alergias…
        html_parts.append(f"<p>{label_allergies}: {allergies}</p>")

    if notes:  # Si hay notas…
        html_parts.append(f"<p>{label_notes}: {notes}</p>")

    html_parts.append("</div>")
    html_body = "".join(html_parts)

    companions_text = ""
    if companions:
        companions_text = "\n".join(
            f"- {html.escape(c.get('name',''))} ({html.escape(c.get('label',''))}) — "
            f"{label_allergies}: {html.escape(c.get('allergens','')) or '—'}"
            for c in companions
        )

    tf = []  # Partes de texto plano.
    tf.append(f"{greet} {guest_name},")
    tf.append(t("email.confirmation.thanks", lang_code))

    tf.append(f"{label_invitation}: {scope_text}")  # Línea de invitación.
    tf.append(attending_text)  # Línea de asistencia.

    if event_date:  # Fecha si existe…
        tf.append(f"{label_event_date}: {event_date}")
    if headcount:  # Número de invitados si existe…
        tf.append(f"{label_guests}: {headcount}")
    if menu_choice:  # Menú si existe…
        tf.append(f"{label_menu}: {menu_choice}")

    if companions_text:  # Lista de acompañantes si existe…
        tf.append(f"{label_companions}:\n{companions_text}")

    if allergies:
        tf.append(f"{label_allergies}: {allergies}")

    if notes:  # Notas si existen…
        tf.append(f"{label_notes}: {notes}")

    tf.append(t("email.confirmation.footer.more_details", lang_code))  # Mensaje final.
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
