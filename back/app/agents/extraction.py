import json
from app.services.llm import get_llm_client
from app.schemas import ResumeData, ProfileData, SectionData
from langchain_core.messages import HumanMessage, SystemMessage


EXTRACTION_PROMPT_TEMPLATE = """You are a resume parser. Extract structured information from the following resume text.

Return a JSON object with this exact structure:
{{
    "profile": {{
        "name": "Full Name",
        "email": "email@example.com",
        "phone": "phone number",
        "summary": "Professional summary"
    }},
    "sections": [
        {{
            "id": "exp-1",
            "type": "experience",
            "content": {{
                "company": "Company Name",
                "title": "Job Title",
                "start_date": "Start Date",
                "end_date": "End Date",
                "description": "Job description"
            }}
        }},
        {{
            "id": "edu-1",
            "type": "education",
            "content": {{
                "institution": "School Name",
                "degree": "Degree",
                "field": "Field of Study",
                "start_date": "Start Date",
                "end_date": "End Date"
            }}
        }},
        {{
            "id": "proj-1",
            "type": "project",
            "content": {{
                "name": "Project Name",
                "description": "Project description",
                "technologies": ["tech1", "tech2"]
            }}
        }},
        {{
            "id": "skill-1",
            "type": "skill",
            "content": {{
                "category": "Category",
                "skills": ["skill1", "skill2"]
            }}
        }}
    ]
}}

Only include sections that are present in the resume. Use unique IDs for each section (exp-1, exp-2, edu-1, etc.).

Resume text:
{text}

Return ONLY valid JSON, no markdown code blocks or other text."""


async def extract_resume_data(text: str) -> ResumeData:
    """Extract structured resume data from raw text using LLM"""
    llm = await get_llm_client()

    if not llm:
        # Return empty structure if no LLM configured
        return ResumeData()

    prompt = EXTRACTION_PROMPT_TEMPLATE.format(text=text)

    messages = [
        SystemMessage(content="You are a precise JSON extractor. Output only valid JSON."),
        HumanMessage(content=prompt),
    ]

    try:
        response = await llm.ainvoke(messages)
        content = response.content.strip()

        # Clean up response
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        data = json.loads(content.strip())
        return ResumeData(**data)
    except Exception as e:
        print(f"Error extracting resume data: {e}")
        return ResumeData()
