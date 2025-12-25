from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    TemplateGenerateRequest,
    TemplateParseRequest,
)
from app.models import Template
from app.agents.template_generator import generate_template_ast, parse_html_to_ast

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("", response_model=List[TemplateResponse])
async def list_templates():
    """List all templates"""
    templates = await Template.all().order_by("-updated_at")
    return [
        TemplateResponse(
            id=t.id,
            name=t.name,
            description=t.description,
            ast=t.ast,
            thumbnail=t.thumbnail,
            is_system=t.is_system,
            created_at=t.created_at,
            updated_at=t.updated_at,
        )
        for t in templates
    ]


@router.post("", response_model=TemplateResponse)
async def create_template(request: TemplateCreate):
    """Create a new template"""
    ast = request.ast.model_dump() if request.ast else get_default_ast()

    template = await Template.create(
        name=request.name,
        description=request.description,
        ast=ast,
        html_content=request.html_content or "",
        thumbnail=request.thumbnail,
        is_system=False,
    )

    return TemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        ast=template.ast,
        thumbnail=template.thumbnail,
        is_system=template.is_system,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: int):
    """Get a template by ID"""
    template = await Template.get_or_none(id=template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return TemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        ast=template.ast,
        thumbnail=template.thumbnail,
        is_system=template.is_system,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(template_id: int, request: TemplateUpdate):
    """Update a template"""
    template = await Template.get_or_none(id=template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if template.is_system:
        raise HTTPException(status_code=403, detail="Cannot modify system template")

    if request.name is not None:
        template.name = request.name
    if request.description is not None:
        template.description = request.description
    if request.ast is not None:
        template.ast = request.ast.model_dump()
    if request.html_content is not None:
        template.html_content = request.html_content
    if request.thumbnail is not None:
        template.thumbnail = request.thumbnail

    await template.save()

    return TemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        ast=template.ast,
        thumbnail=template.thumbnail,
        is_system=template.is_system,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.delete("/{template_id}")
async def delete_template(template_id: int):
    """Delete a template"""
    template = await Template.get_or_none(id=template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if template.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system template")

    await template.delete()
    return {"message": "Template deleted"}


@router.post("/generate", response_model=TemplateResponse)
async def generate_template(request: TemplateGenerateRequest):
    """Generate a template using AI"""
    # 获取基础模板（如果有）
    base_ast = None
    if request.base_template_id:
        base_template = await Template.get_or_none(id=request.base_template_id)
        if base_template:
            base_ast = base_template.ast

    # 使用 AI 生成模板
    result = await generate_template_ast(request.prompt, base_ast)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    # 创建新模板
    template = await Template.create(
        name=result.get("name", "AI 生成的模板"),
        description=result.get("description", request.prompt),
        ast=result["ast"],
        is_system=False,
    )

    return TemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        ast=template.ast,
        thumbnail=template.thumbnail,
        is_system=template.is_system,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.post("/parse")
async def parse_html(request: TemplateParseRequest):
    """Parse HTML/CSS to AST"""
    result = await parse_html_to_ast(request.html_content, request.css_content)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {"ast": result["ast"]}


def get_default_ast():
    """获取默认的 AST 结构"""
    return {
        "version": "1.0",
        "root": {
            "id": "root",
            "type": "root",
            "tag": "div",
            "class_name": "resume-container",
            "styles": {
                "max_width": "800px",
                "margin": "0 auto",
                "padding": "40px",
                "background": "#ffffff",
                "box_shadow": "0 4px 6px rgba(0, 0, 0, 0.1)",
                "font_family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            },
            "children": [
                {
                    "id": "header",
                    "type": "header",
                    "tag": "header",
                    "styles": {
                        "text_align": "center",
                        "margin_bottom": "32px",
                        "padding_bottom": "24px",
                        "border_bottom": "2px solid #2563eb",
                    },
                    "children": [
                        {
                            "id": "name",
                            "type": "text",
                            "tag": "h1",
                            "data_path": "profile.name",
                            "content": "{{profile.name}}",
                            "styles": {
                                "font_size": "32px",
                                "font_weight": "bold",
                                "color": "#2563eb",
                                "margin": "0 0 8px 0",
                            },
                        },
                        {
                            "id": "contact",
                            "type": "container",
                            "tag": "div",
                            "styles": {
                                "display": "flex",
                                "justify_content": "center",
                                "gap": "16px",
                                "color": "#6b7280",
                            },
                            "children": [
                                {
                                    "id": "email",
                                    "type": "text",
                                    "tag": "span",
                                    "data_path": "profile.email",
                                    "content": "{{profile.email}}",
                                },
                                {
                                    "id": "phone",
                                    "type": "text",
                                    "tag": "span",
                                    "data_path": "profile.phone",
                                    "content": "{{profile.phone}}",
                                },
                            ],
                        },
                    ],
                },
                {
                    "id": "summary",
                    "type": "section",
                    "tag": "section",
                    "styles": {
                        "margin_bottom": "24px",
                        "padding": "16px",
                        "background": "#f9fafb",
                        "border_left": "4px solid #2563eb",
                    },
                    "children": [
                        {
                            "id": "summary-text",
                            "type": "text",
                            "tag": "p",
                            "data_path": "profile.summary",
                            "content": "{{profile.summary}}",
                            "styles": {"color": "#374151", "line_height": "1.6"},
                        },
                    ],
                },
                {
                    "id": "sections",
                    "type": "container",
                    "tag": "div",
                    "repeat": "sections",
                    "styles": {"display": "flex", "flex_direction": "column", "gap": "20px"},
                    "children": [
                        {
                            "id": "section-item",
                            "type": "section",
                            "tag": "div",
                            "styles": {
                                "padding": "16px",
                                "background": "#ffffff",
                                "border_radius": "8px",
                                "box_shadow": "0 2px 4px rgba(0, 0, 0, 0.05)",
                            },
                            "children": [],
                        },
                    ],
                },
            ],
        },
        "variables": {
            "profile.name": "姓名",
            "profile.email": "邮箱",
            "profile.phone": "电话",
            "profile.summary": "个人简介",
        },
        "global_styles": "",
    }
