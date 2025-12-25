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
    # 基础设置
    theme: str = "modern-blue"
    column_layout: str = "single-column"
    font_size: str = "14px"
    primary_color: str = "#2563eb"

    # 扩展样式 - 间距
    section_spacing: str = "24px"  # 模块之间的间距
    line_height: str = "1.6"  # 行高

    # 扩展样式 - 边框和圆角
    border_style: str = "none"  # none, solid, dashed
    border_radius: str = "8px"  # 圆角大小

    # 扩展样式 - 背景和阴影
    background_color: str = "#ffffff"
    header_background: str = "transparent"  # 头部背景
    shadow: str = "lg"  # none, sm, md, lg, xl

    # 扩展样式 - 字体
    font_family: str = "system"  # system, serif, mono
    header_font_size: str = "28px"  # 姓名字体大小

    # 扩展样式 - 布局风格
    header_alignment: str = "center"  # left, center, right
    section_style: str = "card"  # card, flat, bordered
    accent_style: str = "border-left"  # border-left, underline, background, none


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
    template_ast: Optional[Dict[str, Any]] = None  # AST 更新
    action_type: str = "message"  # message, content_update, layout_update, template_update


# ==================== Template AST Schemas ====================

class ASTNodeStyle(BaseModel):
    """AST 节点样式"""
    # 布局
    display: Optional[str] = None
    flex_direction: Optional[str] = None
    justify_content: Optional[str] = None
    align_items: Optional[str] = None
    gap: Optional[str] = None
    grid_template_columns: Optional[str] = None

    # 尺寸
    width: Optional[str] = None
    height: Optional[str] = None
    max_width: Optional[str] = None
    min_height: Optional[str] = None
    padding: Optional[str] = None
    margin: Optional[str] = None

    # 边框和背景
    background: Optional[str] = None
    border: Optional[str] = None
    border_radius: Optional[str] = None
    box_shadow: Optional[str] = None

    # 字体
    font_size: Optional[str] = None
    font_weight: Optional[str] = None
    font_family: Optional[str] = None
    color: Optional[str] = None
    text_align: Optional[str] = None
    line_height: Optional[str] = None

    # 其他
    position: Optional[str] = None
    top: Optional[str] = None
    left: Optional[str] = None
    z_index: Optional[str] = None


class ASTNode(BaseModel):
    """AST 节点"""
    id: str
    type: str  # root, header, section, text, list, grid, container, divider, icon
    tag: str = "div"  # HTML 标签
    class_name: str = ""  # CSS 类名
    styles: ASTNodeStyle = Field(default_factory=ASTNodeStyle)
    content: Optional[str] = None  # 文本内容或变量引用 {{variable}}
    data_path: Optional[str] = None  # 绑定的数据路径，如 "profile.name"
    children: List["ASTNode"] = Field(default_factory=list)
    editable: bool = True  # 是否可编辑
    draggable: bool = True  # 是否可拖拽
    repeat: Optional[str] = None  # 循环绑定，如 "sections"


class TemplateAST(BaseModel):
    """模板 AST"""
    version: str = "1.0"
    root: ASTNode
    variables: Dict[str, str] = Field(default_factory=dict)  # 变量定义
    global_styles: str = ""  # 全局 CSS


# Template CRUD Schemas
class TemplateCreate(BaseModel):
    name: str
    description: str = ""
    html_content: Optional[str] = None  # 原始 HTML（可选）
    ast: Optional[TemplateAST] = None  # AST（可选）
    thumbnail: Optional[str] = None  # 缩略图 base64


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    html_content: Optional[str] = None
    ast: Optional[TemplateAST] = None
    thumbnail: Optional[str] = None


class TemplateResponse(BaseModel):
    id: int
    name: str
    description: str
    ast: Dict[str, Any]
    thumbnail: Optional[str]
    is_system: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Template Generation Request
class TemplateGenerateRequest(BaseModel):
    prompt: str  # 用户描述想要的模板风格
    base_template_id: Optional[int] = None  # 基于某个模板修改


class TemplateParseRequest(BaseModel):
    html_content: str  # HTML 内容
    css_content: str = ""  # CSS 内容


# Extended Chat Request with drag support
class ImageData(BaseModel):
    """图片数据"""
    base64: str  # base64 编码的图片
    mime_type: str = "image/jpeg"  # 图片 MIME 类型
    url: Optional[str] = None  # 可选的图片 URL


class ChatRequestWithContext(BaseModel):
    resume_id: int
    message: str
    focused_section_id: Optional[str] = None
    dragged_node_id: Optional[str] = None  # 拖拽的节点 ID
    dragged_node_path: Optional[str] = None  # 拖拽节点的数据路径
    edit_mode: str = "content"  # content, layout, template
    images: List[ImageData] = Field(default_factory=list)  # 附带的图片
