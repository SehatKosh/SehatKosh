"""enterprise_emr_provenance_staging

Revision ID: 0004_enterprise_emr_provenance_staging
Revises: 0003_enterprise_multi_tenancy
Create Date: 2026-11-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0004_enterprise_emr_provenance'
down_revision: Union[str, Sequence[str], None] = '0003_enterprise_multi_tenancy'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Alter clinical_encounters with provenance & amendment tracking
    op.add_column(
        'clinical_encounters',
        sa.Column(
            'source_type',
            sa.String(length=50),
            server_default='HOSPITAL_EMR_NATIVE',
            nullable=False,
        )
    )
    op.add_column(
        'clinical_encounters',
        sa.Column(
            'verification_status',
            sa.String(length=50),
            server_default='CLINICIAN_VERIFIED',
            nullable=False,
        )
    )
    op.add_column(
        'clinical_encounters',
        sa.Column(
            'parent_encounter_id',
            sa.UUID().with_variant(postgresql.UUID(), 'postgresql'),
            nullable=True,
        )
    )
    op.create_foreign_key(
        'fk_clinical_encounters_parent_encounter_id',
        'clinical_encounters',
        'clinical_encounters',
        ['parent_encounter_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index(
        op.f('ix_clinical_encounters_parent_encounter_id'),
        'clinical_encounters',
        ['parent_encounter_id'],
        unique=False,
    )

    # 2. Create ingestion_staging_records
    op.create_table(
        'ingestion_staging_records',
        sa.Column(
            'id',
            sa.UUID().with_variant(postgresql.UUID(), 'postgresql'),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            'source_facility_id',
            sa.UUID().with_variant(postgresql.UUID(), 'postgresql'),
            nullable=True,
        ),
        sa.Column('adapter_name', sa.String(length=50), nullable=False),
        sa.Column('schema_version', sa.String(length=20), server_default='1.0', nullable=False),
        sa.Column(
            'raw_payload',
            sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'),
            nullable=False,
        ),
        sa.Column(
            'normalized_fhir_preview',
            sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'),
            nullable=True,
        ),
        sa.Column(
            'validation_errors',
            sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'),
            server_default='[]',
            nullable=False,
        ),
        sa.Column(
            'status',
            sa.String(length=30),
            server_default='QUARANTINED',
            nullable=False,
        ),
        sa.Column(
            'promoted_encounter_id',
            sa.UUID().with_variant(postgresql.UUID(), 'postgresql'),
            nullable=True,
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['source_facility_id'], ['facilities.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['promoted_encounter_id'], ['clinical_encounters.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_ingestion_staging_records_source_facility_id'),
        'ingestion_staging_records',
        ['source_facility_id'],
        unique=False,
    )

    # 3. Create clinical_attachments
    op.create_table(
        'clinical_attachments',
        sa.Column(
            'id',
            sa.UUID().with_variant(postgresql.UUID(), 'postgresql'),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            'encounter_id',
            sa.UUID().with_variant(postgresql.UUID(), 'postgresql'),
            nullable=False,
        ),
        sa.Column(
            'patient_id',
            sa.UUID().with_variant(postgresql.UUID(), 'postgresql'),
            nullable=False,
        ),
        sa.Column(
            'facility_id',
            sa.UUID().with_variant(postgresql.UUID(), 'postgresql'),
            nullable=True,
        ),
        sa.Column(
            'modality_category',
            sa.String(length=50),
            server_default='PRESCRIPTION_IMAGE',
            nullable=False,
        ),
        sa.Column(
            's3_bucket',
            sa.String(length=255),
            server_default='sehatkosh-vault',
            nullable=False,
        ),
        sa.Column('s3_key', sa.String(length=1024), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('sha256_hash', sa.String(length=64), nullable=False),
        sa.Column('uploaded_by_role', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['encounter_id'], ['clinical_encounters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['patient_id'], ['patient_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_clinical_attachments_encounter_id'),
        'clinical_attachments',
        ['encounter_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_clinical_attachments_patient_id'),
        'clinical_attachments',
        ['patient_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_clinical_attachments_s3_key'),
        'clinical_attachments',
        ['s3_key'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_clinical_attachments_s3_key'), table_name='clinical_attachments')
    op.drop_index(op.f('ix_clinical_attachments_patient_id'), table_name='clinical_attachments')
    op.drop_index(op.f('ix_clinical_attachments_encounter_id'), table_name='clinical_attachments')
    op.drop_table('clinical_attachments')

    op.drop_index(op.f('ix_ingestion_staging_records_source_facility_id'), table_name='ingestion_staging_records')
    op.drop_table('ingestion_staging_records')

    op.drop_index(op.f('ix_clinical_encounters_parent_encounter_id'), table_name='clinical_encounters')
    op.drop_constraint('fk_clinical_encounters_parent_encounter_id', 'clinical_encounters', type_='foreignkey')
    op.drop_column('clinical_encounters', 'parent_encounter_id')
    op.drop_column('clinical_encounters', 'verification_status')
    op.drop_column('clinical_encounters', 'source_type')
