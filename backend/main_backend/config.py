from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = "PRODUCTION"
    APP_NAME: str = "MAIN_APP"
    JWT_SECRET: str
    JWT_ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10

    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
