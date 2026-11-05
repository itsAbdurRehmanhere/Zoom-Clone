from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str ="HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES:int =30
    frontend_origin: str = 'http://localhost:5173'
    
    model_config = SettingsConfigDict(env_file=".env")
    
    
settings = Settings()