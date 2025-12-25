from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.parser import parse_pdf, parse_docx
from app.agents.extraction import extract_resume_data
from app.schemas import ResumeData

router = APIRouter(prefix="/api/upload", tags=["upload"])


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
