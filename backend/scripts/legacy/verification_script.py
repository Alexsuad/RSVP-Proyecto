
import sys
import os
from fastapi.testclient import TestClient

# Asegurar que el path incluya el directorio actual para importar 'app'
sys.path.append(os.getcwd())

# Configurar variables de entorno MOCK para la prueba antes de importar app
os.environ["ADMIN_PASSWORD"] = "secret_password_test"
os.environ["ADMIN_API_KEY"] = "legacy_key_test"
os.environ["SECRET_KEY"] = "super_secret_jwt_key"
os.environ["ALGORITHM"] = "HS256"

# Importar la app después de configurar entorno
from app.main import app
from app.auth import create_access_token

client = TestClient(app)

def print_step(title):
    print(f"\n{'='*60}")
    print(f"🔹 {title}")
    print(f"{'='*60}")

def test_admin_login():
    print_step("PRUEBA 1: Admin Login (POST /api/admin/login)")
    payload = {"password": "secret_password_test"}
    response = client.post("/api/admin/login", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"✅ ÉXITO: Login correcto. Token recibido.")
        print(f"   Token: {token[:20]}...")
        return token
    else:
        print(f"❌ FALLO: Status {response.status_code}")
        print(response.json())
        return None

def test_admin_bearer(token):
    print_step("PRUEBA 2: Acceso Admin con Token Bearer")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/admin/stats", headers=headers)
    
    if response.status_code == 200:
        print(f"✅ ÉXITO: Acceso concedido (200 OK).")
        print("   Respuesta:", response.json())
    else:
        print(f"❌ FALLO: Status {response.status_code}")
        print(response.json())

def test_guest_token_rejection():
    print_step("PRUEBA 3: Rechazo de Token Invitado en Admin")
    # Crear token sin rol admin
    guest_token = create_access_token(subject="GUEST123") # Sin extra role='admin'
    headers = {"Authorization": f"Bearer {guest_token}"}
    
    response = client.get("/api/admin/stats", headers=headers)
    
    if response.status_code in [401, 403]:
        print(f"✅ ÉXITO: Acceso denegado correctamente ({response.status_code}).")
        print("   Detalle:", response.json())
    elif response.status_code == 200:
        print(f"❌ GRAVE: El token de invitado TUVO ACCESO a admin.")
    else:
        print(f"⚠️ Status inesperado: {response.status_code}")

def test_legacy_key():
    print_step("PRUEBA 4: Acceso Legacy (x-admin-key)")
    headers = {"x-admin-key": "legacy_key_test"}
    response = client.get("/api/admin/stats", headers=headers)
    
    if response.status_code == 200:
        print(f"✅ ÉXITO: Acceso Legacy concedido (200 OK).")
    else:
        print(f"❌ FALLO Legacy: Status {response.status_code}")

if __name__ == "__main__":
    print("\n🚀 INICIANDO PRUEBAS DE VERIFICACIÓN (EPIC A)\n")
    
    admin_token = test_admin_login()
    
    if admin_token:
        test_admin_bearer(admin_token)
    
    test_guest_token_rejection()
    test_legacy_key()
    
    print("\n🏁 PRUEBAS FINALIZADAS.")
