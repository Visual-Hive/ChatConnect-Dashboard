"""
Configuration settings for ChatConnect AI Backend.

Uses pydantic-settings for environment variable loading.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # =========================================================================
    # Server
    # =========================================================================
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: Literal["debug", "info", "warning", "error"] = "info"
    
    # =========================================================================
    # Database
    # =========================================================================
    database_url: str = "postgresql://chatconnect:chatconnect_dev@localhost:5432/chatconnect"
    
    # =========================================================================
    # Redis
    # =========================================================================
    redis_url: str = "redis://localhost:6379"
    
    # =========================================================================
    # Qdrant
    # =========================================================================
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str | None = None
    qdrant_collection: str = "chatconnect_documents"
    
    # =========================================================================
    # LLM Providers
    # =========================================================================
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    
    # =========================================================================
    # Embeddings
    # =========================================================================
    embedding_model: str = "text-embedding-3-large"
    embedding_dimensions: int = 3072
    
    # =========================================================================
    # Internal Auth
    # =========================================================================
    internal_api_secret: str = "internal-secret"
    
    # =========================================================================
    # Widget Configuration
    # =========================================================================
    widget_search_limit: int = 5
    widget_score_threshold: float = 0.7
    widget_max_tokens: int = 1000
    widget_temperature: float = 0.7
    
    # =========================================================================
    # Rate Limiting
    # =========================================================================
    rate_limit_free: int = 100  # requests per minute
    rate_limit_paid: int = 1000  # requests per minute
    
    # =========================================================================
    # Caching
    # =========================================================================
    cache_ttl_query: int = 300  # 5 minutes
    cache_ttl_embedding: int = 3600  # 1 hour
    cache_ttl_prompt: int = 300  # 5 minutes (Anthropic ephemeral)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience export
settings = get_settings()
