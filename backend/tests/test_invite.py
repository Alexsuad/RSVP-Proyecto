
import pytest
from utils.invite import normalize_invite_type

def test_normalize_invite_type_ceremony():
    """Test that legacy 'ceremony' invite type maps to 'full' (Ceremony + Reception)."""
    assert normalize_invite_type("ceremony") == "full"

def test_normalize_invite_type_full():
    """Test that 'full' maps to 'full'."""
    assert normalize_invite_type("full") == "full"

def test_normalize_invite_type_party():
    """Test that 'party' maps to 'party'."""
    assert normalize_invite_type("party") == "party"

def test_normalize_invite_type_none_or_empty():
    """Test default fallback to 'party' for empty inputs."""
    assert normalize_invite_type(None) == "party"
    assert normalize_invite_type("") == "party"
    assert normalize_invite_type("   ") == "party"

def test_normalize_invite_type_unknown():
    """Test fallback to 'party' for unknown strings."""
    assert normalize_invite_type("unknown_type") == "party"
    assert normalize_invite_type("reception") == "party"  # Assuming reception -> party default
