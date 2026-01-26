
import os
import requests
from loguru import logger

def send_telegram_notification(message: str) -> None:
    """
    Envía una notificación al chat de Telegram configurado.
    No lanza excepciones para no interrumpir el flujo principal.
    """
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")

    if not token or not chat_id:
        logger.warning("Telegram no configurado (falta TOKEN o CHAT_ID). Omitiendo notificación.")
        return

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown"
    }

    try:
        response = requests.post(url, json=payload, timeout=5)
        response.raise_for_status()
        logger.info("Notificación Telegram enviada correctamente.")
    except Exception as e:
        logger.error(f"Fallo al enviar notificación Telegram: {e}")
