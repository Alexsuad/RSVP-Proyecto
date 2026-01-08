
import pytest
import sys
import os

# Asegurar que el path incluya la raíz del proyecto
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if __name__ == "__main__":
    test_path = os.path.join(os.path.dirname(__file__), "test_assisted_rsvp_regression.py")
    retcode = pytest.main([test_path, "-v", "-s"])
    sys.exit(retcode)
