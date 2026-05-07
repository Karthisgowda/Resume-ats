import multer from "multer";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { buildPrompt, extractJson, fallbackAnalysis } from "../server/analyzer.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024
  }
});

function runMiddleware(req, res, middleware) {
  return new Promise((resolve, reject) => {
    middleware(req, res, (result) => {
      if (result instanceof Error) {
        reject(result);
        return;
      }

      resolve(result);
    });
  });
}

async function parseResume(file) {
  if (!file) {
    throw new Error("Please upload a resume file.");
  }

  const mime = file.mimetype;
  const name = file.originalname.toLowerCase();

  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    const parser = new PDFParse({ data: file.buffer });
    const parsed = await parser.getText();
    await parser.destroy();
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed." });
  }

  try {
    await runMiddleware(req, res, upload.single("resume"));
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

    return res.status(200).json({
      ...analysis,
      resumeStats: {
        words: resumeText.split(/\s+/).filter(Boolean).length,
        characters: resumeText.length,
        fileName: req.file.originalname
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Could not analyze resume."
    });
  }
}
