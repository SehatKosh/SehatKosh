"""create_initial_schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-10-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. patient_profiles
    op.create_table(
        'patient_profiles',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('mrn', sa.String(length=50), nullable=False),
        sa.Column('cnic', sa.String(length=30), nullable=True),
        sa.Column('cnic_masked', sa.String(length=30), nullable=False),
        sa.Column('phone_masked', sa.String(length=30), nullable=False),
        sa.Column('blood_group', sa.String(length=10), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('age', sa.Integer(), nullable=True),
        sa.Column('gender', sa.String(length=20), nullable=True),
        sa.Column('allergies', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_patient_profiles_mrn'), 'patient_profiles', ['mrn'], unique=True)
    op.create_index(op.f('ix_patient_profiles_cnic'), 'patient_profiles', ['cnic'], unique=False)

    # 3. clinical_encounters
    op.create_table(
        'clinical_encounters',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('physician_name', sa.String(length=255), nullable=False),
        sa.Column('facility_name', sa.String(length=255), nullable=False),
        sa.Column('encounter_date', sa.Date(), nullable=False),
        sa.Column('soap_notes', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
        sa.Column('fhir_bundle', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
        sa.Column('document_s3_key', sa.String(length=512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patient_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_clinical_encounters_patient_id'), 'clinical_encounters', ['patient_id'], unique=False)

    # 4. consent_grants
    op.create_table(
        'consent_grants',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('physician_id', sa.UUID(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_break_glass', sa.Boolean(), nullable=False),
        sa.Column('justification', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['patient_id'], ['patient_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_consent_grants_patient_id'), 'consent_grants', ['patient_id'], unique=False)
    op.create_index(op.f('ix_consent_grants_physician_id'), 'consent_grants', ['physician_id'], unique=False)

    # 5. audit_logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('actor_id', sa.String(length=255), nullable=False),
        sa.Column('patient_id', sa.String(length=255), nullable=True),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_audit_logs_actor_id'), 'audit_logs', ['actor_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_patient_id'), 'audit_logs', ['patient_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_action_type'), 'audit_logs', ['action_type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_audit_logs_action_type'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_patient_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_actor_id'), table_name='audit_logs')
    op.drop_table('audit_logs')

    op.drop_index(op.f('ix_consent_grants_physician_id'), table_name='consent_grants')
    op.drop_index(op.f('ix_consent_grants_patient_id'), table_name='consent_grants')
    op.drop_table('consent_grants')

    op.drop_index(op.f('ix_clinical_encounters_patient_id'), table_name='clinical_encounters')
    op.drop_table('clinical_encounters')

    op.drop_index(op.f('ix_patient_profiles_cnic'), table_name='patient_profiles')
    op.drop_index(op.f('ix_patient_profiles_mrn'), table_name='patient_profiles')
    op.drop_table('patient_profiles')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
