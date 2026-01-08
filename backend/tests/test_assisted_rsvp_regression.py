
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Ajustar path para importar 'app'
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.db import Base, get_db
from app.models import Guest, Companion, InviteTypeEnum, LanguageEnum
from app.auth import create_access_token

from sqlalchemy.pool import StaticPool

# Setup de BD en memoria para tests
# Usamos StaticPool para que la base de datos persista entre conexiones de la misma sesión de test
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def admin_headers():
    token = create_access_token(subject="admin", extra={"role": "admin"})
    return {"Authorization": f"Bearer {token}"}

def test_admin_update_does_not_delete_companions_when_omitted(client, db, admin_headers):
    """
    BUG REGRESSION: Al editar un campo (ej. notes), si 'companions' no viene en el JSON,
    el backend NO debe borrar los acompañantes existentes.
    """
    # 1. Crear invitado con 2 acompañantes
    guest = Guest(
        full_name="Invitado Con Companions",
        guest_code="TEST-REG-01",
        phone="123456789",
        invite_type=InviteTypeEnum.full,
        language=LanguageEnum.es,
        confirmed=True
    )
    db.add(guest)
    db.commit()
    db.refresh(guest)
    
    comp1 = Companion(name="Compañero 1", guest_id=guest.id)
    comp2 = Companion(name="Compañero 2", guest_id=guest.id)
    db.add(comp1)
    db.add(comp2)
    db.commit()

    # 2. Update via Admin RSVP cambiando SOLO notas, OMITIENDO la clave 'companions'
    # Usamos el endpoint real: POST /api/admin/guests/{id}/rsvp
    payload = {
        "attending": True,
        "notes": "Nueva nota técnica de test"
    }
    
    response = client.post(f"/api/admin/guests/{guest.id}/rsvp", json=payload, headers=admin_headers)
    assert response.status_code == 200
    
    # 3. Verificar que siguen existiendo 2 acompañantes
    db.refresh(guest)
    assert len(guest.companions) == 2
    assert guest.notes == "Nueva nota técnica de test"
    print("\n✅ OK: Los acompañantes persistieron a pesar de ser omitidos en el payload.")

def test_admin_update_attending_false_clears_companions_and_allergies(client, db, admin_headers):
    """
    REQUERIMIENTO: Si 'attending' es False, se deben limpiar acompañantes y alergias.
    """
    # 1. Crear invitado con acompañante y alergias
    guest = Guest(
        full_name="Invitado Que Cancela",
        guest_code="TEST-REG-02",
        phone="987654321",
        allergies="Algas",
        invite_type=InviteTypeEnum.full,
        language=LanguageEnum.es,
        confirmed=True
    )
    db.add(guest)
    db.commit()
    db.refresh(guest)
    db.add(Companion(name="Compañero Fugaz", guest_id=guest.id))
    db.commit()

    # 2. Update a attending=False (con limpieza explícita enviada por el front corregido)
    payload = {
        "attending": False,
        "allergies": None,
        "companions": []
    }
    
    response = client.post(f"/api/admin/guests/{guest.id}/rsvp", json=payload, headers=admin_headers)
    assert response.status_code == 200
    
    # 3. Verificar limpieza
    db.refresh(guest)
    assert guest.confirmed is False
    assert guest.allergies is None
    assert len(guest.companions) == 0
    print("\n✅ OK: Limpieza confirmada tras attending=False.")
