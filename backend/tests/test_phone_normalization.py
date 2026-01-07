import pytest
from app.utils.phone import normalize_phone

def test_normalize_phone_standard():
    assert normalize_phone("+34 600 000 000") == "34600000000"
    assert normalize_phone("34600000000") == "34600000000"

def test_normalize_phone_complex_format():
    assert normalize_phone("(34) 600-123-456") == "34600123456"
    assert normalize_phone("34.600.123.456") == "34600123456"

def test_normalize_phone_garbage_input():
    # Caso: solo símbolos -> string vacío
    assert normalize_phone("++++") == ""
    assert normalize_phone("   ") == ""
    assert normalize_phone("") == ""
    assert normalize_phone(None) == ""

def test_normalize_phone_mixed_input():
    # Caso: texto mezclado (aunque el sistema debería bloquear antes, la función solo limpia)
    assert normalize_phone("Tel: +34 600") == "34600"
