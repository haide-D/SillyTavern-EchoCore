from pydantic import BaseModel
from typing import Optional

class BindRequest(BaseModel):
    char_name: str
    model_folder: str

class UnbindRequest(BaseModel):
    char_name: str

class CreateModelRequest(BaseModel):
    folder_name: str

class SettingsRequest(BaseModel):
    enabled: Optional[bool] = None
    auto_generate: Optional[bool] = None
    base_dir: Optional[str] = None
    cache_dir: Optional[str] = None
    default_lang: Optional[str] = None
    iframe_mode: Optional[bool] = None
    bubble_style: Optional[str] = None

class StyleRequest(BaseModel):
    style: str

class ThemeRequest(BaseModel):
    theme_id: str
