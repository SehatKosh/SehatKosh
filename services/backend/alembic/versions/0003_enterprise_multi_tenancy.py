"""enterprise_multi_tenancy

Revision ID: 0003_enterprise_multi_tenancy
Revises: b74ae40416b8
Create Date: 2026-11-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0003_enterprise_multi_tenancy'
down_revision: Union[str, Sequence[str], None] = 'b74ae40416b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create facilities table
    op.create_table(
        'facilities',
        sa.Column('id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), primary_key=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('facility_type', sa.String(length=50), server_default='PUBLIC_TERTIARY', nullable=False),
        sa.Column('license_number', sa.String(length=100), nullable=True),
        sa.Column('encryption_key_id', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_facilities_code'), 'facilities', ['code'], unique=True)

    # 2. Create departments table
    op.create_table(
        'departments',
        sa.Column('id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), primary_key=True, nullable=False),
        sa.Column('facility_id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('floor_or_location', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_departments_facility_id'), 'departments', ['facility_id'], unique=False)

    # 3. Create practitioners table
    op.create_table(
        'practitioners',
        sa.Column('id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), primary_key=True, nullable=False),
        sa.Column('user_id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), nullable=False),
        sa.Column('facility_id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), nullable=False),
        sa.Column('department_id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), nullable=True),
        sa.Column('pmdc_number', sa.String(length=50), nullable=True),
        sa.Column('designation', sa.String(length=100), nullable=False),
        sa.Column('prescribing_authority', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_practitioners_user_id'), 'practitioners', ['user_id'], unique=False)
    op.create_index(op.f('ix_practitioners_facility_id'), 'practitioners', ['facility_id'], unique=False)
    op.create_index(op.f('ix_practitioners_department_id'), 'practitioners', ['department_id'], unique=False)

    # 4. Create patient_facility_records table
    op.create_table(
        'patient_facility_records',
        sa.Column('id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), primary_key=True, nullable=False),
        sa.Column('patient_id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), nullable=False),
        sa.Column('facility_id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), nullable=False),
        sa.Column('local_mrn', sa.String(length=100), nullable=False),
        sa.Column('registered_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patient_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('facility_id', 'local_mrn', name='uq_facility_local_mrn'),
    )
    op.create_index(op.f('ix_patient_facility_records_patient_id'), 'patient_facility_records', ['patient_id'], unique=False)
    op.create_index(op.f('ix_patient_facility_records_facility_id'), 'patient_facility_records', ['facility_id'], unique=False)
    op.create_index(op.f('ix_patient_facility_records_local_mrn'), 'patient_facility_records', ['local_mrn'], unique=False)

    # 5. Create triage_queue_entries table
    op.create_table(
        'triage_queue_entries',
        sa.Column('id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), primary_key=True, nullable=False),
        sa.Column('facility_id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), nullable=False),
        sa.Column('department_id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), nullable=False),
        sa.Column('patient_id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), nullable=False),
        sa.Column('token_number', sa.String(length=50), nullable=False),
        sa.Column('triage_priority', sa.String(length=30), server_default='ROUTINE', nullable=False),
        sa.Column('status', sa.String(length=20), server_default='WAITING', nullable=False),
        sa.Column('vitals_snapshot', sa.JSON().with_variant(postgresql.JSONB(), 'postgresql'), nullable=True),
        sa.Column('chief_complaint', sa.String(length=500), nullable=True),
        sa.Column('practitioner_id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), nullable=True),
        sa.Column('admitted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('called_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['patient_id'], ['patient_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['practitioner_id'], ['practitioners.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_triage_queue_entries_facility_id'), 'triage_queue_entries', ['facility_id'], unique=False)
    op.create_index(op.f('ix_triage_queue_entries_department_id'), 'triage_queue_entries', ['department_id'], unique=False)
    op.create_index(op.f('ix_triage_queue_entries_patient_id'), 'triage_queue_entries', ['patient_id'], unique=False)
    op.create_index(op.f('ix_triage_queue_entries_practitioner_id'), 'triage_queue_entries', ['practitioner_id'], unique=False)

    # 6. Alter clinical_encounters with enterprise fields
    op.add_column('clinical_encounters', sa.Column('facility_id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), nullable=True))
    op.add_column('clinical_encounters', sa.Column('practitioner_id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), nullable=True))
    op.add_column('clinical_encounters', sa.Column('encounter_class', sa.String(length=20), server_default='OPD', nullable=False))
    op.add_column('clinical_encounters', sa.Column('triage_priority', sa.String(length=30), server_default='ROUTINE', nullable=False))
    op.add_column('clinical_encounters', sa.Column('vitals_snapshot', sa.JSON().with_variant(postgresql.JSONB(), 'postgresql'), nullable=True))
    op.add_column('clinical_encounters', sa.Column('soap_subjective', sa.Text(), nullable=True))
    op.add_column('clinical_encounters', sa.Column('soap_objective', sa.Text(), nullable=True))
    op.add_column('clinical_encounters', sa.Column('soap_assessment', sa.JSON().with_variant(postgresql.JSONB(), 'postgresql'), nullable=True))
    op.add_column('clinical_encounters', sa.Column('soap_plan', sa.Text(), nullable=True))
    op.add_column('clinical_encounters', sa.Column('status', sa.String(length=20), server_default='FINALIZED', nullable=False))
    op.add_column('clinical_encounters', sa.Column('finalized_at', sa.DateTime(timezone=True), nullable=True))

    op.alter_column('clinical_encounters', 'physician_name', existing_type=sa.String(length=255), nullable=True)
    op.alter_column('clinical_encounters', 'facility_name', existing_type=sa.String(length=255), nullable=True)

    op.create_foreign_key('fk_clinical_encounters_facility_id', 'clinical_encounters', 'facilities', ['facility_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_clinical_encounters_practitioner_id', 'clinical_encounters', 'practitioners', ['practitioner_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_clinical_encounters_facility_id'), 'clinical_encounters', ['facility_id'], unique=False)
    op.create_index(op.f('ix_clinical_encounters_practitioner_id'), 'clinical_encounters', ['practitioner_id'], unique=False)

    # 7. Alter consent_grants with facility_id
    op.add_column('consent_grants', sa.Column('facility_id', sa.UUID().with_variant(postgresql.UUID(), 'postgresql'), nullable=True))
    op.create_foreign_key('fk_consent_grants_facility_id', 'consent_grants', 'facilities', ['facility_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_consent_grants_facility_id'), 'consent_grants', ['facility_id'], unique=False)

    # 8. PostgreSQL RLS Policies for production defense-in-depth
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("ALTER TABLE clinical_encounters ENABLE ROW LEVEL SECURITY;")
        op.execute("ALTER TABLE triage_queue_entries ENABLE ROW LEVEL SECURITY;")
        op.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_encounters' AND tablename = 'clinical_encounters'
                ) THEN
                    CREATE POLICY tenant_isolation_encounters ON clinical_encounters
                    USING (
                        facility_id IS NULL
                        OR current_setting('app.current_facility_id', true) IS NULL
                        OR current_setting('app.current_facility_id', true) = ''
                        OR facility_id::text = current_setting('app.current_facility_id', true)
                    );
                END IF;
            END $$;
        """)
        op.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_queue' AND tablename = 'triage_queue_entries'
                ) THEN
                    CREATE POLICY tenant_isolation_queue ON triage_queue_entries
                    USING (
                        current_setting('app.current_facility_id', true) IS NULL
                        OR current_setting('app.current_facility_id', true) = ''
                        OR facility_id::text = current_setting('app.current_facility_id', true)
                    );
                END IF;
            END $$;
        """)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("DROP POLICY IF EXISTS tenant_isolation_queue ON triage_queue_entries;")
        op.execute("DROP POLICY IF EXISTS tenant_isolation_encounters ON clinical_encounters;")
        op.execute("ALTER TABLE triage_queue_entries DISABLE ROW LEVEL SECURITY;")
        op.execute("ALTER TABLE clinical_encounters DISABLE ROW LEVEL SECURITY;")

    op.drop_constraint('fk_consent_grants_facility_id', 'consent_grants', type_='foreignkey')
    op.drop_index(op.f('ix_consent_grants_facility_id'), table_name='consent_grants')
    op.drop_column('consent_grants', 'facility_id')

    op.drop_constraint('fk_clinical_encounters_practitioner_id', 'clinical_encounters', type_='foreignkey')
    op.drop_constraint('fk_clinical_encounters_facility_id', 'clinical_encounters', type_='foreignkey')
    op.drop_index(op.f('ix_clinical_encounters_practitioner_id'), table_name='clinical_encounters')
    op.drop_index(op.f('ix_clinical_encounters_facility_id'), table_name='clinical_encounters')
    op.drop_column('clinical_encounters', 'finalized_at')
    op.drop_column('clinical_encounters', 'status')
    op.drop_column('clinical_encounters', 'soap_plan')
    op.drop_column('clinical_encounters', 'soap_assessment')
    op.drop_column('clinical_encounters', 'soap_objective')
    op.drop_column('clinical_encounters', 'soap_subjective')
    op.drop_column('clinical_encounters', 'vitals_snapshot')
    op.drop_column('clinical_encounters', 'triage_priority')
    op.drop_column('clinical_encounters', 'encounter_class')
    op.drop_column('clinical_encounters', 'practitioner_id')
    op.drop_column('clinical_encounters', 'facility_id')

    op.drop_index(op.f('ix_triage_queue_entries_practitioner_id'), table_name='triage_queue_entries')
    op.drop_index(op.f('ix_triage_queue_entries_patient_id'), table_name='triage_queue_entries')
    op.drop_index(op.f('ix_triage_queue_entries_department_id'), table_name='triage_queue_entries')
    op.drop_index(op.f('ix_triage_queue_entries_facility_id'), table_name='triage_queue_entries')
    op.drop_table('triage_queue_entries')

    op.drop_index(op.f('ix_patient_facility_records_local_mrn'), table_name='patient_facility_records')
    op.drop_index(op.f('ix_patient_facility_records_facility_id'), table_name='patient_facility_records')
    op.drop_index(op.f('ix_patient_facility_records_patient_id'), table_name='patient_facility_records')
    op.drop_table('patient_facility_records')

    op.drop_index(op.f('ix_practitioners_department_id'), table_name='practitioners')
    op.drop_index(op.f('ix_practitioners_facility_id'), table_name='practitioners')
    op.drop_index(op.f('ix_practitioners_user_id'), table_name='practitioners')
    op.drop_table('practitioners')

    op.drop_index(op.f('ix_departments_facility_id'), table_name='departments')
    op.drop_table('departments')

    op.drop_index(op.f('ix_facilities_code'), table_name='facilities')
    op.drop_table('facilities')

