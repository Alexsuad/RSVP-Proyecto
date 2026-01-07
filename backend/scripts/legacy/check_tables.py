from app.db import engine
from sqlalchemy import inspect

inspector = inspect(engine)
print("Tables:", inspector.get_table_names())
