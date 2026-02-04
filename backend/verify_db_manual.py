import sys
import os

# Add the current directory (backend/) to sys.path so 'app' can be found
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

try:
    print("Attempting to import app.db...")
    from app.db import engine
    print(f"SUCCESS: Engine created: {engine}")
    # Verify pool settings if possible (QueuePool has size())
    if hasattr(engine.pool, 'size'):
        print(f"Pool Size: {engine.pool.size()}")
    print("Verification passed.")
except Exception as e:
    print(f"FAILURE: {e}")
    sys.exit(1)
