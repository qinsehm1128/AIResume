from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas import (
    ResumeCreate,
    ResumeUpdate,
    ResumeResponse,
    ResumeVersionResponse,
)
from app.models import Resume, ResumeVersion

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.get("", response_model=List[ResumeResponse])
async def list_resumes():
    """List all resumes"""
    resumes = await Resume.all().order_by("-updated_at")
    return [
        ResumeResponse(
            id=r.id,
            title=r.title,
            resume_data=r.resume_data,
            layout_config=r.layout_config,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in resumes
    ]


@router.post("", response_model=ResumeResponse)
async def create_resume(request: ResumeCreate):
    """Create a new resume"""
    resume_data = (
        request.resume_data.model_dump()
        if request.resume_data
        else {
            "profile": {"name": "", "email": "", "phone": "", "summary": ""},
            "sections": [],
        }
    )
    layout_config = (
        request.layout_config.model_dump()
        if request.layout_config
        else {
            "theme": "modern-blue",
            "column_layout": "single-column",
            "font_size": "14px",
            "primary_color": "#2563eb",
        }
    )

    resume = await Resume.create(
        title=request.title,
        resume_data=resume_data,
        layout_config=layout_config,
        messages=[],
    )

    return ResumeResponse(
        id=resume.id,
        title=resume.title,
        resume_data=resume.resume_data,
        layout_config=resume.layout_config,
        created_at=resume.created_at,
        updated_at=resume.updated_at,
    )


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(resume_id: int):
    """Get a resume by ID"""
    resume = await Resume.get_or_none(id=resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    return ResumeResponse(
        id=resume.id,
        title=resume.title,
        resume_data=resume.resume_data,
        layout_config=resume.layout_config,
        created_at=resume.created_at,
        updated_at=resume.updated_at,
    )


@router.put("/{resume_id}", response_model=ResumeResponse)
async def update_resume(resume_id: int, request: ResumeUpdate):
    """Update a resume"""
    resume = await Resume.get_or_none(id=resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # 只有当 create_version=True 且有实际内容变化时才创建版本
    if request.create_version:
        has_content = (
            resume.resume_data.get("profile", {}).get("name")
            or resume.resume_data.get("sections", [])
        )
        if has_content:
            version_count = await ResumeVersion.filter(resume=resume).count()
            await ResumeVersion.create(
                resume=resume,
                resume_data=resume.resume_data,
                layout_config=resume.layout_config,
                version_number=version_count + 1,
            )

    # Update resume
    if request.title is not None:
        resume.title = request.title
    if request.resume_data is not None:
        resume.resume_data = request.resume_data.model_dump()
    if request.layout_config is not None:
        resume.layout_config = request.layout_config.model_dump()

    await resume.save()

    return ResumeResponse(
        id=resume.id,
        title=resume.title,
        resume_data=resume.resume_data,
        layout_config=resume.layout_config,
        created_at=resume.created_at,
        updated_at=resume.updated_at,
    )


@router.delete("/{resume_id}")
async def delete_resume(resume_id: int):
    """Delete a resume"""
    resume = await Resume.get_or_none(id=resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    await ResumeVersion.filter(resume=resume).delete()
    await resume.delete()

    return {"message": "Resume deleted"}


@router.get("/{resume_id}/versions", response_model=List[ResumeVersionResponse])
async def list_versions(resume_id: int):
    """List all versions of a resume"""
    resume = await Resume.get_or_none(id=resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    versions = await ResumeVersion.filter(resume=resume).order_by("-version_number")
    return [
        ResumeVersionResponse(
            id=v.id,
            version_number=v.version_number,
            resume_data=v.resume_data,
            layout_config=v.layout_config,
            created_at=v.created_at,
        )
        for v in versions
    ]


@router.post("/{resume_id}/restore/{version_id}", response_model=ResumeResponse)
async def restore_version(resume_id: int, version_id: int):
    """Restore a resume to a specific version"""
    resume = await Resume.get_or_none(id=resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    version = await ResumeVersion.get_or_none(id=version_id, resume=resume)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # 直接恢复，不再自动创建当前版本的备份
    resume.resume_data = version.resume_data
    resume.layout_config = version.layout_config
    await resume.save()

    return ResumeResponse(
        id=resume.id,
        title=resume.title,
        resume_data=resume.resume_data,
        layout_config=resume.layout_config,
        created_at=resume.created_at,
        updated_at=resume.updated_at,
    )
