from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.models import Resume
from weasyprint import HTML, CSS
import json

router = APIRouter(prefix="/api/export", tags=["export"])


def generate_resume_html(resume_data: dict, layout_config: dict) -> str:
    """Generate HTML from resume data and layout config"""
    profile = resume_data.get("profile", {})
    sections = resume_data.get("sections", [])

    theme_colors = {
        "modern-blue": "#2563eb",
        "classic-black": "#1f2937",
        "minimal-gray": "#6b7280",
        "creative-purple": "#7c3aed",
    }

    primary_color = layout_config.get(
        "primary_color", theme_colors.get(layout_config.get("theme", "modern-blue"), "#2563eb")
    )
    font_size = layout_config.get("font_size", "14px")
    column_layout = layout_config.get("column_layout", "single-column")

    # Build sections HTML
    sections_html = ""
    for section in sections:
        section_type = section.get("type", "")
        content = section.get("content", {})

        if section_type == "experience":
            sections_html += f"""
            <div class="section">
                <h3>{content.get('title', '')} - {content.get('company', '')}</h3>
                <p class="date">{content.get('start_date', '')} - {content.get('end_date', '')}</p>
                <p>{content.get('description', '')}</p>
            </div>
            """
        elif section_type == "education":
            sections_html += f"""
            <div class="section">
                <h3>{content.get('degree', '')} in {content.get('field', '')}</h3>
                <p class="institution">{content.get('institution', '')}</p>
                <p class="date">{content.get('start_date', '')} - {content.get('end_date', '')}</p>
            </div>
            """
        elif section_type == "project":
            techs = ", ".join(content.get("technologies", []))
            sections_html += f"""
            <div class="section">
                <h3>{content.get('name', '')}</h3>
                <p>{content.get('description', '')}</p>
                <p class="tech">Technologies: {techs}</p>
            </div>
            """
        elif section_type == "skill":
            skills = ", ".join(content.get("skills", []))
            sections_html += f"""
            <div class="section">
                <h3>{content.get('category', '')}</h3>
                <p>{skills}</p>
            </div>
            """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4;
                margin: 2cm;
            }}
            body {{
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: {font_size};
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
            }}
            .header {{
                text-align: center;
                border-bottom: 2px solid {primary_color};
                padding-bottom: 20px;
                margin-bottom: 30px;
            }}
            .header h1 {{
                color: {primary_color};
                margin: 0 0 10px 0;
                font-size: 2em;
            }}
            .contact {{
                color: #666;
            }}
            .summary {{
                margin-bottom: 30px;
                padding: 15px;
                background: #f9fafb;
                border-left: 4px solid {primary_color};
            }}
            .section {{
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #e5e7eb;
            }}
            .section h3 {{
                color: {primary_color};
                margin: 0 0 5px 0;
            }}
            .date, .institution {{
                color: #666;
                font-size: 0.9em;
            }}
            .tech {{
                color: #666;
                font-style: italic;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>{profile.get('name', 'Your Name')}</h1>
            <p class="contact">
                {profile.get('email', '')} | {profile.get('phone', '')}
            </p>
        </div>

        <div class="summary">
            {profile.get('summary', '')}
        </div>

        {sections_html}
    </body>
    </html>
    """

    return html


@router.get("/{resume_id}/pdf")
async def export_pdf(resume_id: int):
    """Export resume as PDF"""
    resume = await Resume.get_or_none(id=resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    html_content = generate_resume_html(resume.resume_data, resume.layout_config)

    # Generate PDF
    html = HTML(string=html_content)
    pdf_bytes = html.write_pdf()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="resume-{resume_id}.pdf"'},
    )


@router.get("/{resume_id}/html")
async def export_html(resume_id: int):
    """Export resume as HTML"""
    resume = await Resume.get_or_none(id=resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    html_content = generate_resume_html(resume.resume_data, resume.layout_config)

    return Response(
        content=html_content,
        media_type="text/html",
    )
