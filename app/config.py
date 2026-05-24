from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str
    gemini_model: str = "gemini-2.0-flash"

    google_maps_api_key: str

    google_application_credentials: str = ""
    firebase_project_id: str

    gcs_bucket_name: str = ""

    # ElevenLabs
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel — clear, calm

    # ActionLayer
    actionlayer_key: str = ""

    app_env: str = "development"
    port: int = 8080


settings = Settings()  # type: ignore[call-arg]
