# backend/app/utils/phone.py
# ──────────────────────────────────────────────────────────────────────
# Propósito: Utilidad centralizada para normalización de teléfonos.
# ──────────────────────────────────────────────────────────────────────

import re  # Para expresiones regulares en limpieza de strings

def normalize_phone(phone_str: str) -> str:
    """
    Normaliza un número de teléfono eliminando todo lo que no sea dígito.
    
    Reglas:
    - Input: "+34 600..." -> Output: "34600..."
    - Input: "(34) 600-123" -> Output: "34600123"
    - Input: "  " o None -> Output: ""
    
    Esta función NO valida longitud ni país, solo sanea formato.
    Si el resultado es una cadena vacía, el llamador debe decidir si lanzar error.
    """
    if not phone_str:
        return ""
    
    # 1. Eliminar espacios extremos
    cleaned = phone_str.strip()
    
    # 2. Mantener solo dígitos (elimina +, -, (), espacios internos)
    # \D coincide con cualquier caracter que NO sea dígito
    digits_only = re.sub(r'\D', '', cleaned)
    
    return digits_only
