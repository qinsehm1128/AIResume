from tortoise import fields, models
from tortoise.contrib.pydantic import pydantic_model_creator
import json


class LLMConfig(models.Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=100, default="默认配置")  # 配置名称
    base_url = fields.CharField(max_length=500, null=True)
    api_key = fields.CharField(max_length=500, null=True)
    model_name = fields.CharField(max_length=100, default="gpt-4o")  # 默认模型
    available_models = fields.JSONField(default=list)  # 该 API 下可用的模型列表
    is_active = fields.BooleanField(default=False)  # 是否为当前激活的配置
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "llm_configs"


class Template(models.Model):
    """简历模板"""
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=200)
    description = fields.TextField(default="")
    ast = fields.JSONField(default=dict)  # 模板 AST
    html_content = fields.TextField(default="")  # 原始 HTML（可选）
    thumbnail = fields.TextField(null=True)  # 缩略图 base64
    is_system = fields.BooleanField(default=False)  # 是否系统预设模板
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "templates"


class Resume(models.Model):
    id = fields.IntField(pk=True)
    title = fields.CharField(max_length=200, default="Untitled Resume")
    resume_data = fields.JSONField(default=dict)
    layout_config = fields.JSONField(default=dict)
    template_ast = fields.JSONField(default=dict)  # 当前使用的 AST
    template = fields.ForeignKeyField("models.Template", related_name="resumes", null=True)
    messages = fields.JSONField(default=list)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "resumes"

    def get_default_resume_data(self):
        return {
            "profile": {"name": "", "email": "", "phone": "", "summary": ""},
            "sections": [],
        }

    def get_default_layout_config(self):
        return {
            "theme": "modern-blue",
            "column_layout": "single-column",
            "font_size": "14px",
        }


class ResumeVersion(models.Model):
    id = fields.IntField(pk=True)
    resume = fields.ForeignKeyField("models.Resume", related_name="versions")
    resume_data = fields.JSONField()
    layout_config = fields.JSONField()
    version_number = fields.IntField()
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "resume_versions"
