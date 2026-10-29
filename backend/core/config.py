"""
Central configuration. Everything reads settings from here instead of
touching os.environ directly, so there's exactly one place that knows
about env vars.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # NVIDIA API (OpenAI-compatible NIM endpoint)
    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_chat_model: str = "meta/llama-3.1-8b-instruct"
    nvidia_embed_model: str = "nvidia/nv-embedqa-e5-v5"

    # Workspace
    workspace_root: str = "./temp"

    # CORS
    frontend_origin: str = "http://localhost:5173"

    @property
    def repositories_dir(self) -> Path:
        p = Path(self.workspace_root) / "repositories"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def embeddings_dir(self) -> Path:
        p = Path(self.workspace_root) / "embeddings"
        p.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()
