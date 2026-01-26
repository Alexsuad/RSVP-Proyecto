import sys
import os
from pathlib import Path

# Asegurar que el directorio raíz 'backend' está en el PYTHONPATH
# Asumiendo que este script está en backend/scripts/
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

# Intentar cargar .env manual si no está en entorno
try:
    from dotenv import load_dotenv
    env_path = backend_dir / ".env"
    print(f"Cargando variables de entorno desde: {env_path}")
    load_dotenv(env_path)
except ImportError:
    print("python-dotenv no instalado, confiando en variables de entorno del sistema.")

from app.utils import telegram
from app import mailer

def run_test():
    print(">>> 🚀 INICIANDO PRUEBA DE NOTIFICACIONES >>>")
    
    # 1. Prueba Telegram
    tg_token = os.getenv("TELEGRAM_BOT_TOKEN")
    tg_chat = os.getenv("TELEGRAM_CHAT_ID")
    print(f"[-] Configuración Telegram: Token={'SI' if tg_token else 'NO'} | ChatID={tg_chat}")
    
    if tg_token and tg_chat:
        print("    Enviando mensaje de prueba a Telegram...")
        telegram.send_telegram_notification(
            "🧪 *Test de Integración RSVP*\n\n"
            "Si lees esto, el bot de Telegram está funcionando correctamente.\n"
            "✅ Sistema operativo."
        )
    else:
        print("    ⚠️ OMITIDO: Faltan credenciales de Telegram.")

    # 2. Prueba Email Admin
    admin_email = os.getenv("ADMIN_NOTIFY_EMAIL")
    print(f"[-] Configuración Email Admin: {admin_email or 'NO CONFIGURADO'}")
    
    if admin_email:
        print("    Enviando correo de prueba al administrador...")
        mailer.send_admin_notification(
            guest_name="Usuario de Prueba",
            attending=True,
            guests_count=2,
            guest_email="test@demo.com",
            guest_phone="+573001234567"
        )
    else:
        print("    ⚠️ OMITIDO: Falta ADMIN_NOTIFY_EMAIL.")

    print("<<< 🏁 PRUEBA FINALIZADA <<<")

if __name__ == "__main__":
    run_test()
