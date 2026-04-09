"""Initial migration

Revision ID: 001
Revises:
Create Date: 2024-01-15

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create tags table
    op.create_table(
        'tags',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('color', sa.String(7), nullable=True, server_default='#3B82F6'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Create tasks table
    op.create_table(
        'tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('deadline', sa.DateTime(), nullable=True),
        sa.Column('priority', sa.Enum('low', 'medium', 'high', 'critical', name='priority'), nullable=True),
        sa.Column('status', sa.Enum('pending', 'in_progress', 'completed', name='status'), nullable=True),
        sa.Column('source_text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create task_tags junction table
    op.create_table(
        'task_tags',
        sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tag_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('task_id', 'tag_id')
    )


def downgrade() -> None:
    op.drop_table('task_tags')
    op.drop_table('tasks')
    op.drop_table('tags')
    op.execute('DROP TYPE IF EXISTS priority')
    op.execute('DROP TYPE IF EXISTS status')