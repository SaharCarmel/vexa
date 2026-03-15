"""Add calendar_connections, calendar_events, and scheduled_joins tables

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-03-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b7c8d9e0f1a2'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- calendar_connections table ---
    op.create_table(
        'calendar_connections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False, server_default='google'),
        sa.Column('provider_account_id', sa.String(255), nullable=True),
        sa.Column('access_token_enc', sa.Text(), nullable=True),
        sa.Column('refresh_token_enc', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(), nullable=True),
        sa.Column('scopes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='active'),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column('last_sync_at', sa.DateTime(), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'provider', 'provider_account_id', name='_user_provider_account_uc'),
    )
    op.create_index('ix_calendar_connections_id', 'calendar_connections', ['id'])
    op.create_index('ix_calendar_connections_user_id', 'calendar_connections', ['user_id'])
    op.create_index('ix_calendar_connections_status', 'calendar_connections', ['status'])
    op.create_index('ix_calendar_conn_user_provider', 'calendar_connections', ['user_id', 'provider'])

    # --- calendar_events table ---
    op.create_table(
        'calendar_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('connection_id', sa.Integer(), nullable=False),
        sa.Column('external_event_id', sa.String(1024), nullable=False),
        sa.Column('title', sa.Text(), nullable=True),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_recurring', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('meeting_platform', sa.String(50), nullable=True),
        sa.Column('meeting_native_id', sa.String(255), nullable=True),
        sa.Column('meeting_url', sa.Text(), nullable=True),
        sa.Column('meeting_passcode', sa.String(255), nullable=True),
        sa.Column('is_cancelled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['connection_id'], ['calendar_connections.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('connection_id', 'external_event_id', name='_connection_event_uc'),
    )
    op.create_index('ix_calendar_events_id', 'calendar_events', ['id'])
    op.create_index('ix_calendar_events_connection_id', 'calendar_events', ['connection_id'])
    op.create_index('ix_cal_event_start', 'calendar_events', ['start_time'])
    op.create_index('ix_cal_event_connection_start', 'calendar_events', ['connection_id', 'start_time'])

    # --- scheduled_joins table ---
    op.create_table(
        'scheduled_joins',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('calendar_event_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('native_meeting_id', sa.String(255), nullable=False),
        sa.Column('meeting_url', sa.Text(), nullable=True),
        sa.Column('passcode', sa.String(255), nullable=True),
        sa.Column('trigger_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('meeting_id', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['calendar_event_id'], ['calendar_events.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['meeting_id'], ['meetings.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_scheduled_joins_id', 'scheduled_joins', ['id'])
    op.create_index('ix_scheduled_joins_calendar_event_id', 'scheduled_joins', ['calendar_event_id'])
    op.create_index('ix_scheduled_joins_user_id', 'scheduled_joins', ['user_id'])
    op.create_index('ix_scheduled_joins_status', 'scheduled_joins', ['status'])
    op.create_index('ix_scheduled_join_trigger', 'scheduled_joins', ['status', 'trigger_at'])
    op.create_index('ix_scheduled_join_user', 'scheduled_joins', ['user_id', 'status'])


def downgrade() -> None:
    op.drop_table('scheduled_joins')
    op.drop_table('calendar_events')
    op.drop_table('calendar_connections')
