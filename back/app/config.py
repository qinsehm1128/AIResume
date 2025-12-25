import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Admin authentication
    ADMIN_SECRET_KEY: str = "admin123"

    # Database
    DATABASE_URL: str = "sqlite://./data/resume.db"

    # LLM Configuration (defaults, can be overridden via API)
    LLM_BASE_URL: Optional[str] = None
    LLM_API_KEY: Optional[str] = None
    LLM_MODEL_NAME: str = "gpt-4o"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
