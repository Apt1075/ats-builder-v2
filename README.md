# ATS Resume Builder v2

Job description paste karo → AI tailored ATS-friendly resume banata hai (90-100 score).

## Features
- ✅ ATS Score 90-100 target
- ✅ 2 projects (5-6 bullets each)
- ✅ Experience bullets quantified + zero repetition
- ✅ Action verb bold in every bullet (PDF + Preview)
- ✅ Full-width section lines in PDF
- ✅ Arpit Kumar standard format
- ✅ Har field editable

## Project Structure
```
ats-builder-v2/
├── backend/
│   ├── main.py           ← FastAPI server
│   └── requirements.txt
└── frontend/
    ├── public/index.html
    ├── src/
    │   ├── App.jsx       ← Full React app
    │   ├── App.css
    │   ├── index.js
    │   └── index.css
    └── package.json
```

## Setup

### Step 1 — OpenAI Key
`backend/main.py` mein line 14 par key daalein:
```python
client = OpenAI(api_key="sk-your-key-here")
```

### Step 2 — Backend (Terminal 1)
```bash
cd backend
python -m venv venv
. venv/Scripts/activate      # Windows Git Bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Step 3 — Frontend (Terminal 2)
```bash
cd frontend
npm install
npm start
```

App opens at: http://localhost:3000

## How to Use
1. Apna purana resume text paste karo
2. Job description paste karo
3. Generate click karo
4. Edit karo koi bhi field
5. Download PDF
