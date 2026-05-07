import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPrompt, extractJson, fallbackAnalysis } from "./analyzer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024
  }
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

async function parseResume(file) {
  if (!file) {
    throw new Error("Please upload a resume file.");
  }

  const mime = file.mimetype;
  const name = file.originalname.toLowerCase();

  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    const parsed = await pdfParse(file.buffer);
    return parsed.text;
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return parsed.value;
  }

  if (mime.startsWith("text/") || name.endsWith(".txt")) {
    return file.buffer.toString("utf8");
  }

  throw new Error("Unsupported resume type. Upload PDF, DOCX, or TXT.");
}

async function analyzeWithGroq(input) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  if (!apiKey) {
    return fallbackAnalysis(input.resumeText, input.targetRole);
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a precise resume analyst. Return valid JSON only."
        },
        {
          role: "user",
          content: buildPrompt(input)
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return extractJson(data.choices?.[0]?.message?.content || "{}");
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/analyze", upload.single("resume"), async (req, res) => {
  try {
    const resumeText = await parseResume(req.file);

    if (resumeText.trim().length < 80) {
      return res.status(400).json({
        message: "The uploaded resume did not contain enough readable text. Try a text-based PDF, DOCX, or TXT file."
      });
    }

    const analysis = await analyzeWithGroq({
      resumeText,
      targetRole: req.body.targetRole?.trim(),
      jobDescription: req.body.jobDescription?.trim()
    });

    res.json({
      ...analysis,
      resumeStats: {
        words: resumeText.split(/\s+/).filter(Boolean).length,
        characters: resumeText.length,
        fileName: req.file.originalname
      }
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Could not analyze resume."
    });
  }
});

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const port = Number(process.env.PORT || 5000);
app.listen(port, () => {
  console.log(`AI Resume Analyzer API running on http://localhost:${port}`);
});
