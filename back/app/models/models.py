from tortoise import fields, models
from tortoise.contrib.pydantic import pydantic_model_creator
import json


class LLMConfig(models.Model):
    id = fields.IntField(pk=True)
    base_url = fields.CharField(max_length=500, null=True)
    api_key = fields.CharField(max_length=500, null=True)
    model_name = fields.CharField(max_length=100, default="gpt-4o")
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "llm_configs"


class Resume(models.Model):
    id = fields.IntField(pk=True)
    title = fields.CharField(max_length=200, default="Untitled Resume")
    resume_data = fields.JSONField(default=dict)
    layout_config = fields.JSONField(default=dict)
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
