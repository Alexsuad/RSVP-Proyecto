"""add party to enum

Revision ID: fix_party_enum
Revises: be501a6a779a
Create Date: 2026-01-16 21:25:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'fix_party_enum'
down_revision = 'be501a6a779a'
branch_labels = None
depends_on = None

def upgrade():
    # PostgreSQL permite agregar valores a un ENUM dentro de una transacción
    # (aunque commits son preferidos, aquí lo inyectamos directo)
    # Usamos 'autocommit_block' para permitir ALTER TYPE que a veces no puede correr dentro de transacción normal
    # dependiendo de la versión de PG, pero ADD VALUE suele ser safe.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE invitetypeenum ADD VALUE IF NOT EXISTS 'party'")

def downgrade():
    # Postgres no soporta eliminar valores de un ENUM fácilmente.
    pass
