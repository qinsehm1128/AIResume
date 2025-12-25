from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# Auth Schemas
class AuthRequest(BaseModel):
    password: str


class AuthResponse(BaseModel):
    success: bool
    message: str


# LLM Config Schemas
class LLMConfigRequest(BaseModel):
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model_name: str = "gpt-4o"


class LLMConfigResponse(BaseModel):
    id: int
    base_url: Optional[str] = None
    model_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Resume Data Schemas
class ProfileData(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    summary: str = ""


class SectionData(BaseModel):
    id: str
    type: str  # experience, education, project, skill
    content: Dict[str, Any] = Field(default_factory=dict)


class ResumeData(BaseModel):
    profile: ProfileData = Field(default_factory=ProfileData)
    sections: List[SectionData] = Field(default_factory=list)


class LayoutConfig(BaseModel):
    theme: str = "modern-blue"
    column_layout: str = "single-column"
    font_size: str = "14px"
    primary_color: str = "#2563eb"


# Resume State for LangGraph
class ResumeState(BaseModel):
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    current_resume_data: ResumeData = Field(default_factory=ResumeData)
    layout_config: LayoutConfig = Field(default_factory=LayoutConfig)
    ui_context: Dict[str, Any] = Field(default_factory=dict)


# Resume CRUD Schemas
class ResumeCreate(BaseModel):
    title: str = "Untitled Resume"
    resume_data: Optional[ResumeData] = None
    layout_config: Optional[LayoutConfig] = None


class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    resume_data: Optional[ResumeData] = None
    layout_config: Optional[LayoutConfig] = None
    create_version: bool = True  # 是否创建版本历史


class ResumeResponse(BaseModel):
    id: int
    title: str
    resume_data: Dict[str, Any]
    layout_config: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ResumeVersionResponse(BaseModel):
    id: int
    version_number: int
    resume_data: Dict[str, Any]
    layout_config: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


# Chat Schemas
class ChatRequest(BaseModel):
    resume_id: int
    message: str
    focused_section_id: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    resume_data: Optional[ResumeData] = None
    layout_config: Optional[LayoutConfig] = None
    action_type: str = "message"  # message, content_update, layout_update
