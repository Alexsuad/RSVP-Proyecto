import requests
import os

BASE_URL = "http://localhost:8000"
PASSWORD = "Claveparaentraraladmin123*"

def debug_reset():
    # 1. Login
    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/api/admin/login", json={"password": PASSWORD})
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Call Reset
    print("Calling Reset DB...")
    resp = requests.delete(f"{BASE_URL}/api/admin/guests/reset", headers=headers)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")

if __name__ == "__main__":
    debug_reset()
