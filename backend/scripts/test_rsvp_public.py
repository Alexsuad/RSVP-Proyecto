
import os
import sys
import requests
from pathlib import Path

# Add backend to path to import app modules if needed (optional for black box test)
sys.path.append(str(Path(__file__).parent.parent))

BASE_URL = "http://localhost:8000/api"
ADMIN_KEY = "admin-secret-key" # Assuming dev

def test_flow():
    print("--- TEST RSVP PUBLIC FLOW ---")
    
    # 1. Create a guest via Admin API to get a code
    print("1. Creating Test Guest...")
    payload = {
        "full_name": "Public Flow User",
        "email": "public@flow.com",
        "language": "es",
        "max_accomp": 2,
        "invite_type": "full"
    }
    
    # Needs auth (mock admin key header)
    headers = {"x-admin-key": ADMIN_KEY}
    try:
        r = requests.post(f"{BASE_URL}/admin/guests", json=payload, headers=headers)
        if r.status_code != 200:
            print(f"FAILED creating guest: {r.text}")
            return
    except Exception as e:
        print(f"FAILED connection: {e}")
        return

    guest_data = r.json()
    code = guest_data["guest_code"]
    print(f"   > Created Guest. Code: {code}")

    # 2. Public GET /code/{code}
    print(f"2. Getting Guest Publicly /code/{code}...")
    r_public = requests.get(f"{BASE_URL}/guest/code/{code}")
    if r_public.status_code == 200:
        print("   > SUCCESS: Got guest details publicly.")
        print(f"   > Name: {r_public.json()['full_name']}")
    else:
        print(f"   > FAILED: {r_public.status_code} {r_public.text}")
        return

    # 3. Public POST /code/{code}/rsvp (Confirming)
    print(f"3. Submitting RSVP Publicly /code/{code}/rsvp...")
    rsvp_payload = {
        "attending": True,
        "notes": "Testing public flow",
        "companions": [
            {"name": "Partner", "is_child": False, "allergies": "Nuts"}
        ],
        "email": "public@flow.com" # Confirming email
    }
    r_rsvp = requests.post(f"{BASE_URL}/guest/code/{code}/rsvp", json=rsvp_payload)
    if r_rsvp.status_code == 200:
        print("   > SUCCESS: RSVP submitted.")
        resp = r_rsvp.json()
        print(f"   > Confirmed: {resp['confirmed']}")
        print(f"   > Notes: {resp['notes']}")
        print(f"   > Companions: {len(resp['companions'])}")
    else:
        print(f"   > FAILED: {r_rsvp.status_code} {r_rsvp.text}")
        return
        
    print("\nSUCCESS: All steps passed.")

if __name__ == "__main__":
    test_flow()
