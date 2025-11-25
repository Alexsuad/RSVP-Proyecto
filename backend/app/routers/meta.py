# app/routers/meta.py
"""
Módulo de Metadatos y Configuración del Frontend.

Este módulo expone endpoints que permiten al cliente obtener configuraciones
estáticas y diccionarios de traducción. Centraliza la lógica de negocio y
los textos en el servidor, facilitando el mantenimiento y la consistencia.
"""

from fastapi import APIRouter
from typing import Dict, List, Any

# Importación del módulo de internacionalización.
# Se utiliza el diccionario centralizado TRANSLATIONS para garantizar la
# consistencia de textos entre correos electrónicos e interfaz web.
try:
    from app.utils.translations import TRANSLATIONS
except ImportError:
    # Mecanismo de seguridad en caso de error en la carga del módulo.
    # Permite el inicio de la API utilizando un diccionario vacío.
    import logging
    logging.warning("No se pudo importar app.utils.translations. Usando diccionario vacío.")
    TRANSLATIONS = {"en": {}, "es": {}, "ro": {}}

router = APIRouter(prefix="/api/meta", tags=["meta"])

@router.get("/options")
def get_meta_options() -> Dict[str, List[str]]:
    """
    Provee opciones estáticas para selectores y filtros de la interfaz de usuario.

    Desacopla las opciones del cliente, permitiendo actualizaciones en el servidor
    sin necesidad de redistribuir el código del cliente.

    Returns:
        Dict[str, List[str]]: Diccionario que contiene listas de códigos normalizados.
    """
    # Códigos estándar para alérgenos.
    # El cliente debe traducir estos códigos utilizando el endpoint de traducciones.
    allergens_codes = ["gluten", "dairy", "nuts", "seafood", "eggs", "soy"]
    
    return {
        "allergens": allergens_codes,
        # 'allergy_suggestions' se mantiene por compatibilidad con versiones anteriores.
        "allergy_suggestions": allergens_codes, 
    }

@router.get("/translations/{lang}")
def get_translations(lang: str) -> Dict[str, str]:
    """
    Recupera el diccionario de traducciones para el idioma especificado.

    Implementa una estrategia de recuperación ante fallos, retornando inglés ('en')
    si el idioma solicitado no está disponible.

    Args:
        lang (str): Código de idioma IETF BCP 47 (ej. 'es', 'en').

    Returns:
        Dict[str, str]: Diccionario de claves y textos traducidos.
    """
    # 1. Normalización del código de idioma.
    # Se extrae la parte principal del idioma para coincidir con las claves internas.
    lang_key = lang.lower().split("-")[0].strip()
    
    # 2. Recuperación del diccionario.
    data = TRANSLATIONS.get(lang_key)
    
    # 3. Estrategia de recuperación.
    # Si el idioma no está soportado, se retorna el idioma por defecto (Inglés).
    if not data:
        data = TRANSLATIONS.get("en", {})
        
    return data