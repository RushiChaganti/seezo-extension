from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from pathlib import Path
import secrets
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    """Application settings."""
    
    # API Configuration
    api_key: str = os.getenv("SEEZO_API_KEY", "")
    host: str = "127.0.0.1"  # Default to localhost
    port: int = 8000  # Default port
    
    # Security
    allowed_origins: list = ["chrome-extension://*", "moz-extension://*"]
    
    # AI Provider Settings
    default_provider: str = "ollama"
    default_model: str = "mistral"
    
    # Storage
    data_dir: Path = Path.home() / ".seezo"
    api_keys_file: Path = data_dir / "api_keys.json"
    
    class Config:
        env_prefix = "SEEZO_"
        env_file = ".env"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Ensure required directories exist."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize API keys file if it doesn't exist
        if not self.api_keys_file.exists():
            self.api_keys_file.write_text("{}")

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()