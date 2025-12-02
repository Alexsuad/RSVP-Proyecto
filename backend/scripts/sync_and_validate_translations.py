# scripts/sync_and_validate_translations.py
# ────────────────────────────────────────────────────────────────────────────────
# Descripción: Proceso unificado y robusto que:
# 1. Importa dinámicamente los idiomas válidos desde el backend.
# 2. Valida la consistencia entre idiomas (Check).
# 3. Genera un backup del archivo actual api.ts.
# 4. Sincroniza el diccionario maestro con api.ts (Sync).
# 5. Gestiona códigos de salida (0=Éxito, 1=Error) para CI/CD.
# ────────────────────────────────────────────────────────────────────────────────

import sys
import json
from pathlib import Path
from typing import Dict, Any, List

# --- 1. CONFIGURACIÓN DE RUTAS Y ENTORNO ---
# Ubicación del script: .../backend/scripts/sync_and_validate_translations.py

# BACKEND_ROOT: .../backend (para poder importar 'app')
# Usamos resolve() para obtener la ruta absoluta y evitar problemas de enlaces
BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

# PROJECT_ROOT: .../RSVP-Proyecto (para encontrar 'frontend')
PROJECT_ROOT = BACKEND_ROOT.parent 

# Rutas de archivos y configuración
TARGET_FILE = PROJECT_ROOT / "frontend" / "src" / "i18n" / "api.ts"
TS_VAR_NAME = "I18N_DICT"
BASE_LANG = "en"

# --- 2. IMPORTAR EL DICCIONARIO TRANSLATIONS DESDE EL BACKEND ---
try:
    from app.utils.translations import TRANSLATIONS, VALID_LANGS
except ModuleNotFoundError as e:
    print("❌ ERROR CRÍTICO: No se pudo importar app.utils.translations.")
    print(f"   Ruta intentada: {BACKEND_ROOT}")
    print("   Verifica que el archivo translations.py exista y esté en la ruta correcta.")
    sys.exit(1)

# --- MEJORA 1: Definición dinámica de idiomas target ---
if BASE_LANG not in VALID_LANGS:
    print(f"❌ ERROR CRÍTICO: El idioma base '{BASE_LANG}' no aparece en VALID_LANGS: {VALID_LANGS}")
    sys.exit(1)

# Calculamos los idiomas a validar (todos menos el base)
TARGET_LANGS = [lg for lg in VALID_LANGS if lg != BASE_LANG]
print(f"ℹ️  Configuración: Base='{BASE_LANG}' | Targets={TARGET_LANGS}")


# --------------------------------------------------------------------------------
## 🔍 FASE 1: VALIDACIÓN DE CONSISTENCIA
# --------------------------------------------------------------------------------
def run_validation(translations: Dict[str, Dict[str, Any]]) -> bool:
    """
    Comprueba la consistencia de claves entre el idioma base y los targets.
    Devuelve True si es consistente, False si faltan claves requeridas.
    """
    base_keys = set(translations.get(BASE_LANG, {}).keys())
    has_errors = False
    
    print("\n🔍 Iniciando FASE 1: Verificación de paridad de claves (i18n)")

    # Validación: Las claves base deben existir
    if not base_keys:
        print(f"❌ ERROR: El idioma base ('{BASE_LANG}') no contiene claves.")
        return False
        
    for lg in TARGET_LANGS:
        lg_keys = set(translations.get(lg, {}).keys())
        missing = base_keys - lg_keys
        extra = lg_keys - base_keys
        
        if missing:
            print(f"❌ ERROR en [{lg.upper()}]: Faltan {len(missing)} claves requeridas (vs. {BASE_LANG}):")
            print(f"   → Faltantes: {sorted(missing)}")
            has_errors = True
            
        if extra:
            print(f"⚠️  ADVERTENCIA en [{lg.upper()}]: Sobran {len(extra)} claves (no están en {BASE_LANG}):")
            print(f"   → Sobrantes: {sorted(extra)}")
            # Las claves extra son solo advertencia, no detienen el script.

    if has_errors:
        print("\n🛑 FASE 1 FALLIDA: Se detectaron errores. Corrige translations.py antes de sincronizar.")
        return False

    print("✅ FASE 1 OK: Paridad de claves verificada.")
    return True


# --------------------------------------------------------------------------------
## 🚀 FASE 2: SINCRONIZACIÓN A TYPESCRIPT (CON BACKUP)
# --------------------------------------------------------------------------------
def python_to_typescript_dict(translations: Dict[str, Dict[str, Any]]) -> str:
    """Convierte el diccionario Python a una cadena con sintaxis TypeScript."""
    ts_content = ""
    for lang in VALID_LANGS:
        bundle = translations.get(lang)
        if not bundle: continue
            
        # 1. Convertimos a JSON formateado
        json_string = json.dumps(bundle, indent=2, ensure_ascii=False)
        # 2. Quitamos las llaves externas para insertarlo en la estructura TS
        json_inner = json_string[1:-1].strip()
        
        ts_content += f"""
  {lang}: {{
    // {'=' * 75}
    // Traducciones para {lang.upper()} (Sincronizado desde Python)
    // {'=' * 75}
{json_inner}
  }},"""

    # 3. Ensamblar el archivo final
    return f"""// src/i18n/api.ts
// ──────────────────────────────────────────────────────────────────────
// !ARCHIVO GENERADO AUTOMÁTICAMENTE por scripts/sync_and_validate_translations.py!
// ──────────────────────────────────────────────────────────────────────
// Este archivo contiene un snapshot de las traducciones del backend.

import type {{ Lang }} from './types';

// Diccionario que usará el resto del frontend (por idioma)
export const {TS_VAR_NAME}: Record<Lang, Record<string, string>> = {{
{ts_content.strip()}
}};

// Versión MVP de fetchTranslations:
export async function fetchTranslations(lang: Lang): Promise<Record<string, string>> {{
  return {TS_VAR_NAME}[lang] ?? {TS_VAR_NAME}.es ?? {{}};
}}

export default {TS_VAR_NAME} as any;
"""


def run_sync_to_ts(translations: Dict[str, Dict[str, Any]]) -> bool:
    """Genera el archivo api.ts con backup previo."""
    print("\n🚀 Iniciando FASE 2: Sincronización con api.ts")
    
    # Paso 1: Generar el código en memoria
    try:
        ts_code = python_to_typescript_dict(translations)
    except Exception as e:
        print(f"❌ ERROR: Fallo al generar el código TypeScript: {e}")
        return False
        
    # Paso 2: Crear Backup y Escribir (MEJORA 3)
    try:
        if TARGET_FILE.exists():
            # Renombramos el actual a .bak (Windows/Linux friendly)
            backup_path = TARGET_FILE.with_suffix(".ts.bak")
            # replace sobrescribe si el backup viejo ya existía
            TARGET_FILE.replace(backup_path)
            # CORRECCIÓN AQUÍ: Usamos PROJECT_ROOT en lugar de ROOT
            print(f"ℹ️  Backup creado exitosamente: {backup_path.relative_to(PROJECT_ROOT)}")

        # Escribimos el nuevo archivo
        TARGET_FILE.write_text(ts_code, encoding='utf-8')
        # CORRECCIÓN AQUÍ: Usamos PROJECT_ROOT en lugar de ROOT
        print(f"✅ FASE 2 OK: Archivo actualizado en: {TARGET_FILE.relative_to(PROJECT_ROOT)}")
        return True
    except Exception as e:
        print(f"❌ ERROR: Fallo de I/O al escribir el archivo {TARGET_FILE}: {e}")
        # Intentar restaurar backup si existe y falló la escritura es una opción avanzada,
        # pero por ahora el fallo detiene el proceso.
        return False


# --------------------------------------------------------------------------------
## 🏁 ORQUESTACIÓN PRINCIPAL (MEJORA 2)
# --------------------------------------------------------------------------------
if __name__ == "__main__":
    # 1) Validación
    if not run_validation(TRANSLATIONS):
        sys.exit(1) # Salida con error si validación falla

    # 2) Sincronización
    if not run_sync_to_ts(TRANSLATIONS):
        sys.exit(1) # Salida con error si escritura falla

    # 3) Éxito total
    print("\n✨ Proceso completado correctamente. Frontend actualizado.")
    sys.exit(0)