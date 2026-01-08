
import sys
import os

# Ajustar path para importar módulos de "app"
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# ⚠️ MOCK ENTOTNU ANTES DE IMPORTAR DB
# Esto evita que db.py lance RuntimeError por falta de DATABASE_URL
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["FORCE_DB"] = "sqlite"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import Base
from app.models import Guest, LanguageEnum, InviteTypeEnum
from app.services.import_service import import_guests_from_csv, import_mode

def verify_import_safety():
    # 1. Setup DB en memoria
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    # 2. Insertar invitado original con datos SENSIBLES de RSVP
    print("--- Paso 1: Creando invitado original ---")
    original_guest = Guest(
        full_name="Juan Original",
        phone="+34600123123",
        language=LanguageEnum.es,
        invite_type=InviteTypeEnum.full,
        guest_code="CODE123",
        max_accomp=1,
        # DATOS QUE NO DEBEN CAMBIAR
        confirmed=True,
        allergies="Gluten, Lactosa",
        num_adults=1,
        notes="Nota original importante"
    )
    db.add(original_guest)
    db.commit()
    db.refresh(original_guest)
    
    print(f"Invitado creado: {original_guest.full_name}")
    print(f"Estado RSVP: Confirmado={original_guest.confirmed}, Alergias='{original_guest.allergies}'")
    
    # 3. Simular CSV de importación "peligroso" (Sin columnas de alergias/rsvp, solo nombre nuevo)
    print("\n--- Paso 2: Ejecutando Importación (Modo UPSERT) ---")
    print("CSV simulado: Solo contiene 'full_name' y 'phone'.")
    
    csv_content = """full_name,phone
Juan Actualizado,+34600123123
"""
    
    # Ejecutar importación real
    report = import_guests_from_csv(
        db=db,
        csv_text=csv_content,
        mode=import_mode.upsert,
        dry_run=False
    )
    
    print(f"Reporte importación: {report}")
    
    # 4. Verificación
    print("\n--- Paso 3: Verificación Final ---")
    db.expire_all()
    updated_guest = db.query(Guest).filter_by(phone="+34600123123").first()
    
    errors = []
    
    # Check 1: ¿Cambió el nombre? (Dato administrativo -> DEBE cambiar)
    if updated_guest.full_name == "Juan Actualizado":
        print("✅ OK: El nombre se actualizó correctamente.")
    else:
        errors.append(f"❌ FALLO: El nombre no cambió. Valor: {updated_guest.full_name}")
        
    # Check 2: ¿Se mantuvieron las alergias? (Dato RSVP -> DEBE protegerse)
    if updated_guest.allergies == "Gluten, Lactosa":
        print("✅ OK: Las alergias se mantuvieron intactas.")
    else:
        errors.append(f"❌ FALLO: Las alergias fueron borradas/modificadas. Valor: '{updated_guest.allergies}'")

    # Check 3: ¿Se mantuvo la confirmación?
    if updated_guest.confirmed is True:
        print("✅ OK: El estado de confirmación se mantuvo intacto.")
    else:
        errors.append(f"❌ FALLO: La confirmación se perdió. Valor: {updated_guest.confirmed}")

    if not errors:
        print("\n🏆 CONCLUSIÓN: EL SISTEMA ES SEGURO. Los datos de RSVP están blindados.")
    else:
        print("\n⚠️ CONCLUSIÓN: EL SISTEMA NO ES SEGURO.")
        for e in errors:
            print(e)

if __name__ == "__main__":
    verify_import_safety()
