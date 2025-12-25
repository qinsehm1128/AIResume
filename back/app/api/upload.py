import base64
import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from app.services.parser import parse_pdf, parse_docx
from app.agents.extraction import extract_resume_data
from app.schemas import ResumeData

router = APIRouter(prefix="/api/upload", tags=["upload"])

# 确保上传目录存在
UPLOAD_DIR = "uploads/images"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/parse", response_model=ResumeData)
async def upload_and_parse(file: UploadFile = File(...)):
    """Upload and parse a PDF or Word document to extract resume data"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    filename = file.filename.lower()
    content = await file.read()

    # Parse document
    if filename.endswith(".pdf"):
        text = parse_pdf(content)
    elif filename.endswith(".docx"):
        text = parse_docx(content)
    else:
        raise HTTPException(
            status_code=400, detail="Unsupported file format. Please upload PDF or DOCX."
        )

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    # Extract structured data using LLM
    resume_data = await extract_resume_data(text)

    return resume_data


@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image for AI chat (multimodal support)"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    filename = file.filename.lower()
    allowed_extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"]

    if not any(filename.endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format. Allowed: {', '.join(allowed_extensions)}"
        )

    content = await file.read()

    # 检查文件大小 (最大 10MB)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Maximum size is 10MB.")

    # 生成唯一文件名
    ext = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # 保存文件
    with open(file_path, "wb") as f:
        f.write(content)

    # 同时返回 base64 编码（用于发送给 AI）
    base64_data = base64.b64encode(content).decode("utf-8")

    # 获取 MIME 类型
    mime_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    mime_type = mime_types.get(ext, "image/jpeg")

    return JSONResponse({
        "success": True,
        "filename": unique_filename,
        "url": f"/api/upload/images/{unique_filename}",
        "base64": base64_data,
        "mime_type": mime_type,
    })


@router.get("/images/{filename}")
async def get_image(filename: str):
    """Serve uploaded images"""
    from fastapi.responses import FileResponse

    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")

    return FileResponse(file_path)
