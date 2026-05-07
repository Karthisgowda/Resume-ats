# AI Resume Analyzer

AI Resume Analyzer is a web-based resume review platform that helps students, freshers, and professionals evaluate resumes against modern ATS and recruitment expectations. Users can upload a PDF, DOCX, or TXT resume, optionally add a target job role, and receive AI-generated scoring, skill insights, strengths, gaps, and practical improvement suggestions.

## Features

- Resume upload and parsing for PDF, DOCX, and TXT files
- ATS readiness score with category-wise analytics
- AI career feedback powered by Groq
- Skill match, missing keyword, strength, and improvement sections
- Clean responsive React interface with charts and actionable result cards
- Express API that keeps the API key on the server

## Tech Stack

- React, Vite, Recharts, Lucide React
- Node.js, Express, Multer
- `pdf-parse` and `mammoth` for resume text extraction
- Groq chat completions API

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and add your Groq API key:

```bash
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=5000
```

3. Start the app:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173` and the API runs on `http://localhost:5000`.

## API

`POST /api/analyze`

Multipart form fields:

- `resume`: PDF, DOCX, or TXT file
- `targetRole`: optional target role or job title
- `jobDescription`: optional job description text

Response:

```json
{
  "score": 82,
  "summary": "Clear profile with strong project evidence...",
  "strengths": [],
  "improvements": [],
  "skills": [],
  "missingKeywords": [],
  "sections": []
}
```
