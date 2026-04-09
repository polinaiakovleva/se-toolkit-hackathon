import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database URL - use environment variable or Docker service name
    # In Docker: use service name 'db', locally use 'localhost'
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@db:5432/contexttask"
    )

    # Ollama configuration
    ollama_base_url: str = "http://ollama:11434"
    ollama_model: str = "llama3.2"

    # LLM request timeout in seconds
    llm_timeout: int = 120

    # Debug mode (enables SQL logging, etc.)
    debug: bool = False

    # CORS origins (comma-separated)
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def cors_origins_list(self) -> list[str]:
        """Get CORS origins as a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()