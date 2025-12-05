# File: backend/scripts/test_admin_crud_manual.py
# ─────────────────────────────────────────────────────────────────────────────
# Propósito: Script de verificación manual para endpoints CRUD de Admin.
# Rol: Prueba de caja negra contra la API local para validar la Tarea 5.
# Uso: python backend/scripts/test_admin_crud_manual.py
# ─────────────────────────────────────────────────────────────────────────────

import requests
import sys
import json
import os
from pathlib import Path  # <--- Importante para manejar rutas
from dotenv import load_dotenv

# 1. Calcular la ruta al archivo .env (está en la carpeta padre de 'scripts')
# __file__ es .../backend/scripts/test_admin_crud_manual.py
# parents[1] sube dos niveles hasta .../backend/
env_path = Path(__file__).resolve().parents[1] / '.env'
load_dotenv(dotenv_path=env_path)

BASE_URL = "http://localhost:8000/api/admin"

# 2. Leer la clave. Si falla la carga, imprimimos advertencia para depurar.
ADMIN_KEY = os.getenv("ADMIN_API_KEY")

# Debug: Imprimir (parcialmente) qué clave se está usando para verificar
if not ADMIN_KEY:
    print("⚠️ ADVERTENCIA: No se encontró ADMIN_API_KEY en el .env. Usando fallback.")
    ADMIN_KEY = "supersecreto123"
else:
    # Muestra los primeros 3 caracteres para confirmar que leyó algo real
    print(f"🔑 Clave cargada correctamente: {ADMIN_KEY[:3]}***")

HEADERS = {
    "x-admin-key": ADMIN_KEY,
    "Content-Type": "application/json"
}

def log(msg, success=True):
    icon = "✅" if success else "❌"
    print(f"{icon} {msg}")

def test_crud_flow():
    print("🚀 Iniciando Test Manual de Admin CRUD...")

    # 1. CREATE
    print("\n--- 1. Testing POST /guests (Create) ---")
    new_guest_payload = {
        "full_name": "Test Automation User",
        "email": "test_auto@example.com",
        "phone": "+34600000000",
        "language": "es",
        "max_accomp": 1,
        "invite_type": "full",
        "side": "groom"
    }

    try:
        r = requests.post(f"{BASE_URL}/guests", headers=HEADERS, json=new_guest_payload)
        if r.status_code == 200:
            user_data = r.json()
            user_id = user_data["id"]
            log(f"Created Guest ID: {user_id}")
            log(f"Data: {json.dumps(user_data, indent=2)}")
        else:
            log(f"Failed Create: {r.status_code} - {r.text}", False)
            return
    except Exception as e:
        log(f"Exception during Create: {e}", False)
        return

    # 2. GET LIST & SEARCH
    print("\n--- 2. Testing GET /guests (List & Search) ---")
    try:
        # List all
        r = requests.get(f"{BASE_URL}/guests", headers=HEADERS)
        if r.status_code == 200:
            log(f"List All: OK. Count: {len(r.json())}")
        else:
            log(f"Failed List All: {r.status_code}", False)

        # Search
        r = requests.get(f"{BASE_URL}/guests?search=automation", headers=HEADERS)
        if r.status_code == 200:
            results = r.json()
            found = any(g['id'] == user_id for g in results)
            if found:
                log("Search 'automation': Found created user.")
            else:
                log("Search 'automation': User NOT found.", False)
        else:
             log(f"Failed Search: {r.status_code}", False)

    except Exception as e:
        log(f"Exception during List: {e}", False)

    # 3. UPDATE
    print("\n--- 3. Testing PUT /guests/ID (Update) ---")
    update_payload = {
        "full_name": "Test Automation User Updated",
        "rsvp_status": "confirmed" # Test logical mapping if backend supports it or field update
    }
    try:
        r = requests.put(f"{BASE_URL}/guests/{user_id}", headers=HEADERS, json=update_payload)
        if r.status_code == 200:
            updated_data = r.json()
            if updated_data["full_name"] == "Test Automation User Updated":
                log("Update Name: OK")
            else:
                 log(f"Update Name mismatch: {updated_data['full_name']}", False)
        else:
             log(f"Failed Update: {r.status_code} - {r.text}", False)

    except Exception as e:
        log(f"Exception during Update: {e}", False)

    # 4. DELETE
    print("\n--- 4. Testing DELETE /guests/ID ---")
    try:
        r = requests.delete(f"{BASE_URL}/guests/{user_id}", headers=HEADERS)
        if r.status_code == 204:
            log("Delete: OK (204 returned)")
        else:
             log(f"Failed Delete: {r.status_code} - {r.text}", False)

        # Verify 404
        r_check = requests.get(f"{BASE_URL}/guests?search=test_auto@example.com", headers=HEADERS)
        # Search might return empty list, depending on implementation detail.
        # But querying by specific ID (if we had an endpoint) would be 404.
        # Let's rely on list not containing it.
        guests = r_check.json()
        found_deleted = any(g['id'] == user_id for g in guests)
        if not found_deleted:
            log("Verification: Deleted user not found in search.")
        else:
            log("Verification: User STILL FOUND after delete.", False)

    except Exception as e:
        log(f"Exception during Delete: {e}", False)

if __name__ == "__main__":
    test_crud_flow()
