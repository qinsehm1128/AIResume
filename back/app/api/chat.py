from fastapi import APIRouter, HTTPException
from app.schemas import ChatRequest, ChatResponse, ResumeData, LayoutConfig
from app.models import Resume, ResumeVersion
from app.agents import process_message

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process a chat message and update resume"""
    resume = await Resume.get_or_none(id=request.resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Save version before AI modification
    version_count = await ResumeVersion.filter(resume=resume).count()
    await ResumeVersion.create(
        resume=resume,
        resume_data=resume.resume_data,
        layout_config=resume.layout_config,
        version_number=version_count + 1,
    )

    # Process through LangGraph
    result = await process_message(
        message=request.message,
        resume_data=resume.resume_data,
        layout_config=resume.layout_config,
        messages=resume.messages,
        focused_section_id=request.focused_section_id,
        thread_id=f"resume-{request.resume_id}",
    )

    # Update resume
    resume.resume_data = result["resume_data"]
    resume.layout_config = result["layout_config"]
    resume.messages = result["messages"]
    await resume.save()

    # Determine action type
    action_type = "message"
    if result["intent"] == "layout":
        action_type = "layout_update"
    elif result["intent"] == "content":
        action_type = "content_update"

    return ChatResponse(
        message=result["message"],
        resume_data=ResumeData(**result["resume_data"]),
        layout_config=LayoutConfig(**result["layout_config"]),
        action_type=action_type,
    )
