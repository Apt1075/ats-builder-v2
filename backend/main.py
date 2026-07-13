from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import json
import re
import os

# ── App setup ──────────────────────────────────────────────────────────────
app = FastAPI(title="ATS Resume Builder v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000","https://ats-builder-v2-frontend.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Put your OpenAI key here ───────────────────────────────────────────────
# client = OpenAI(api_key="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")

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)
# ── Request model ──────────────────────────────────────────────────────────
class ResumeRequest(BaseModel):
    old_resume: str
    job_description: str


# ── Health check ───────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ATS Resume Builder v2 running!"}


# ── Main endpoint ──────────────────────────────────────────────────────────
@app.post("/generate")
async def generate_resume(req: ResumeRequest):
    if not req.old_resume.strip():
        raise HTTPException(status_code=400, detail="Old resume required.")
    if not req.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description required.")

    prompt = f"""You are a senior ATS resume writer. Target ATS score: 90-100.

════════════════════════════════════════════
SOURCE DATA (use ONLY this for personal info, experience, skills, education)
════════════════════════════════════════════
{req.old_resume}

════════════════════════════════════════════
JOB DESCRIPTION (tailor everything to this)
════════════════════════════════════════════
{req.job_description}

════════════════════════════════════════════
STRICT RULES — follow ALL of these:
════════════════════════════════════════════

PERSONAL INFO:
- Extract name, phone, email, linkedin, github from old resume exactly

EXPERIENCE:
- Keep candidate's REAL work experience from old resume
- Rewrite 6-8 bullets using keywords from job description
- Each bullet: unique action verb + specific technical detail + quantified result
- Zero repeated words or verbs across all bullets
- No generic phrases like "team player", "detail-oriented", "hardworking"

PROJECTS — CRITICAL RULE:
⚠️  DO NOT use the projects from the old resume
⚠️  CREATE 2 brand-new projects that are directly relevant to the job description
- Projects must use the tech stack mentioned in the job description
- Projects must showcase skills the job description asks for
- Each project: 5-6 bullets, each starting with a unique strong action verb
- Projects must sound realistic and impressive for the candidate's experience level
- Project names must be specific and professional (not generic like "Project 1")

SKILLS:
- Keep candidate's real skills from old resume
- Add any missing keywords from job description that the candidate would realistically know

SUMMARY:
- 2-3 sentences packed with job description keywords
- Mention years of experience, key technologies from job description
- No generic statements

ATS RULES:
- Include exact keywords from job description naturally throughout
- Use standard section headers: Experience, Technical Skills, Projects, Education
- Quantify everything possible (%, numbers, scale)
- Every bullet starts with a different action verb
- CRITICAL: Wrap all key technologies, tools, and quantified metrics in **markdown bold** (e.g. **Python**, **FastAPI**, **40%**, **AWS**) inside the bullets.

Return ONLY valid JSON, nothing else:
{{
  "ats_score": 94,
  "name": "...",
  "phone": "...",
  "email": "...",
  "linkedin": "...",
  "github": "...",
  "summary": "2-3 sentence summary with job keywords",
  "skills": {{
    "languages": "Python, PHP, C, C++",
    "technologies": "FastAPI, Flask, Docker, AWS, WebSocket, Git",
    "databases": "Cassandra, MongoDB, Redis, SQL",
    "other": "REST APIs, CI/CD, Agile, Microservices"
  }},
  "experience": [
    {{
      "company": "...",
      "title": "...",
      "location": "...",
      "dates": "...",
      "bullets": [
        "ActionVerb specific achievement with quantified result",
        "ActionVerb specific achievement with quantified result",
        "ActionVerb specific achievement with quantified result",
        "ActionVerb specific achievement with quantified result",
        "ActionVerb specific achievement with quantified result",
        "ActionVerb specific achievement with quantified result",
        "ActionVerb specific achievement with quantified result",
        "ActionVerb specific achievement with quantified result"
      ]
    }}
  ],
  "projects": [
    {{
      "name": "Relevant Project Name Based On Job Description",
      "tech": "tech from job description",
      "bullets": [
        "ActionVerb bullet 1 — technical detail",
        "ActionVerb bullet 2 — technical detail",
        "ActionVerb bullet 3 — technical detail",
        "ActionVerb bullet 4 — technical detail",
        "ActionVerb bullet 5 — technical detail"
      ]
    }},
    {{
      "name": "Another Relevant Project Based On Job Description",
      "tech": "tech from job description",
      "bullets": [
        "ActionVerb bullet 1 — technical detail",
        "ActionVerb bullet 2 — technical detail",
        "ActionVerb bullet 3 — technical detail",
        "ActionVerb bullet 4 — technical detail",
        "ActionVerb bullet 5 — technical detail"
      ]
    }}
  ],
  "education": [
    {{
      "school": "...",
      "degree": "...",
      "dates": "...",
      "location": "...",
      "gpa": "...",
      "coursework": "..."
    }},
    {{
      "school": "...",
      "degree": "...",
      "dates": "...",
      "location": "...",
      "gpa": "...",
      "coursework": "..."
    }}
  ]
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=3500,
        )

        raw = response.choices[0].message.content.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        data = json.loads(raw)
        return {"success": True, "resume": data}

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON parse error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        reload=False
    )
