from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """
    Central settings for the SehatKosh backend.
    All values are read from environment variables (or .env file).
    Refer to services/backend/.env.example for the full list.
    """

    # ------------------------------------------------------------------
    # OCR / AI Engine
    # ------------------------------------------------------------------
    # "mock"              → deterministic MockOCRAdapter (no external deps)
    # "plugin:<dotpath>"  → e.g. "plugin:plugins.my_model.MyOCRAdapter"
    OCR_ENGINE: str = Field(default="mock", description="OCR adapter selector")

    # ------------------------------------------------------------------
    # FHIR Transformer
    # ------------------------------------------------------------------
    FHIR_PARSER: str = Field(default="mock", description="FHIR adapter selector")

    # ------------------------------------------------------------------
    # Telemetry Transformer
    # ------------------------------------------------------------------
    TELEMETRY_ENGINE: str = Field(default="mock", description="Telemetry adapter selector")

    # ------------------------------------------------------------------
    # Database
    # ------------------------------------------------------------------
    DATABASE_URL: str = Field(
        default=(
            "postgresql+asyncpg://sehatkosh_admin:secure_password123@localhost:5432/sehatkosh_db"
        )
    )

    # ------------------------------------------------------------------
    # Neo4j
    # ------------------------------------------------------------------
    NEO4J_URI: str = Field(default="bolt://localhost:7687")
    NEO4J_USER: str = Field(default="neo4j")
    NEO4J_PASSWORD: str = Field(default="secure_neo4j_password")

    # ------------------------------------------------------------------
    # AWS / LocalStack (S3)
    # ------------------------------------------------------------------
    AWS_ENDPOINT_URL: str = Field(default="http://localhost:4566")
    AWS_ENDPOINT_URL_EXTERNAL: str = Field(default="http://localhost:4566")
    AWS_ACCESS_KEY_ID: str = Field(default="mock_key")
    AWS_SECRET_ACCESS_KEY: str = Field(default="mock_secret")
    AWS_DEFAULT_REGION: str = Field(default="ap-southeast-1")
    S3_BUCKET_NAME: str = Field(default="sehatkosh-prescriptions")

    # ------------------------------------------------------------------
    # CORS
    # ------------------------------------------------------------------
    CORS_ORIGINS: list[str] = Field(
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )

    # ------------------------------------------------------------------
    # App meta
    # ------------------------------------------------------------------
    APP_ENV: str = Field(default="development")
    DEBUG: bool = Field(default=True)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
