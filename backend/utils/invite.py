# app/utils/invite.py                                                                        # Declara la ruta y nombre del módulo (nuevo archivo).

def normalize_invite_type(raw: str | None) -> str:                                           # Define función para normalizar la invitación a valores lógicos.
    """
    Normaliza invite_type hacia dos categorías lógicas:                                       # Explica objetivo de la función.
    - "full": Ceremonia + Recepción                                                           # Define significado de "full".
    - "party": Solo Recepción/Fiesta                                                          # Define significado de "party".
                                                                                              # Línea en blanco para legibilidad.
    Acepta los valores que ya se usan en tu BD/Excel:                                         # Indica compatibilidad hacia atrás.
    - "full"     -> "full"                                                                    # Mantiene "full".
    - "party"    -> "party"                                                                   # Mantiene "party".
    - "ceremony" -> "party"  (alias heredado para Solo Recepción)                             # Mapea "ceremony" a "party".
    Cualquier otro valor/None -> "party" (fail-safe)                                          # Aclara el fallback seguro.
    """                                                                                        # Cierra docstring.
    val = (raw or "").strip().lower()                                                         # Limpia el valor de entrada (None/espacios/mayúsculas).
    if val == "full":
        return "full"
    if val == "party":
        return "party"
    if val == "ceremony":
        # Según Playbook: ceremony implica acceso full (legacy)
        return "full"
    
    # Fallback seguro
    return "party"


def is_invited_to_ceremony(raw: str | None) -> bool:                                          # Define helper booleano para "invita a ceremonia".
    """
    True solo cuando el invitado está invitado a ceremonia (caso "full").                     # Explica retorno.
    """                                                                                        # Cierra docstring.
    return normalize_invite_type(raw) == "full"                                               # Devuelve True si la invitación normalizada es "full".
