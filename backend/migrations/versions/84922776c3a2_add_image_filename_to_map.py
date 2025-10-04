"""add image_filename to Map

Revision ID: 84922776c3a2
Revises: 38b78aeb93ef
Create Date: 2025-10-02 19:42:58.847028
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '84922776c3a2'
down_revision = '38b78aeb93ef'
branch_labels = None
depends_on = None


def upgrade():
    # 1) добавляем колонку как NULLABLE (иначе упадёт на существующих строках)
    with op.batch_alter_table('map', schema=None) as batch_op:
        batch_op.add_column(sa.Column('image_filename', sa.String(length=255), nullable=True))
        # если раньше image_url был NOT NULL — ослабим (безопасно пропустить, если нет такого столбца/ограничения)
        try:
            batch_op.alter_column('image_url', existing_type=sa.VARCHAR(length=255), nullable=True)
        except Exception:
            pass

    # 2) заполняем image_filename на основе image_url (берём basename), иначе ставим плейсхолдер
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, image_url FROM map")).fetchall()
    for row in rows:
        _id = row[0]
        image_url = row[1]
        filename = None
        if image_url:
            # последний сегмент после '/'
            filename = image_url.rstrip('/').split('/')[-1]
        if not filename:
            # Убедись, что такой файл есть в backend/static/maps/
            filename = 'WE_map.png'
        conn.execute(
            sa.text("UPDATE map SET image_filename = :fn WHERE id = :id"),
            {"fn": filename, "id": _id},
        )

    # 3) теперь можно сделать NOT NULL
    with op.batch_alter_table('map', schema=None) as batch_op:
        batch_op.alter_column('image_filename', existing_type=sa.String(length=255), nullable=False)


def downgrade():
    with op.batch_alter_table('map', schema=None) as batch_op:
        # если нужно, вернём image_url к NOT NULL (безопасно пропустить, если не был)
        try:
            batch_op.alter_column('image_url', existing_type=sa.VARCHAR(length=255), nullable=False)
        except Exception:
            pass
        batch_op.drop_column('image_filename')
