const fallbackSkills = [
  "javascript",
  "react",
  "node",
  "express",
  "python",
  "java",
  "sql",
  "mongodb",
  "machine learning",
  "data analysis",
  "excel",
  "communication",
  "leadership",
  "project management",
  "cloud",
  "api"
];

export function buildPrompt({ resumeText, targetRole, jobDescription }) {
  return `You are an expert ATS and career coach. Analyze the resume for a candidate targeting: ${targetRole || "general software and technology roles"}.

Return only valid JSON with this shape:
{
  "score": number,
  "summary": string,
  "strengths": string[],
  "improvements": string[],
  "skills": [{"name": string, "level": number}],
  "missingKeywords": string[],
  "sections": [{"name": string, "score": number, "comment": string}],
  "atsChecklist": string[],
  "recommendedHeadline": string
}

Scoring rules:
- score must be 0-100.
- section scores must be 0-100.
- skill levels must be 0-100.
- Make feedback specific, practical, and recruitment-focused.

Job description:
${jobDescription || "No job description provided."}

Resume text:
${resumeText.slice(0, 12000)}`;
}

export function extractJson(content) {
  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI response did not include JSON.");
    }

    return JSON.parse(match[0]);
  }
}

export function fallbackAnalysis(resumeText, targetRole = "") {
  const lower = resumeText.toLowerCase();
  const words = resumeText.split(/\s+/).filter(Boolean);
  const detectedSkills = fallbackSkills
    .filter((skill) => lower.includes(skill))
    .map((skill) => ({
      name: skill.replace(/\b\w/g, (char) => char.toUpperCase()),
      level: lower.split(skill).length > 2 ? 82 : 68
    }));

  const hasMetrics = /\b\d+%|\b\d+\+|\b\d+ users|\b\d+ projects/i.test(resumeText);
  const hasProjects = /project|github|portfolio|built|developed/i.test(resumeText);
  const hasEducation = /education|degree|bachelor|master|university|college/i.test(resumeText);
  const hasExperience = /experience|intern|worked|role|responsibilities/i.test(resumeText);
  const baseScore = 45;
  const score =
    baseScore +
    Math.min(20, detectedSkills.length * 3) +
    (hasMetrics ? 12 : 0) +
    (hasProjects ? 8 : 0) +
    (hasEducation ? 6 : 0) +
    (hasExperience ? 9 : 0);

  return {
    score: Math.min(92, score),
    summary: `The resume shows ${detectedSkills.length || "some"} relevant skill signals${targetRole ? ` for ${targetRole}` : ""}. It can become more ATS-ready by adding measurable impact, stronger keywords, and sharper role alignment.`,
    strengths: [
      hasProjects ? "Includes project or portfolio evidence." : "Contains enough content for a baseline ATS review.",
      hasEducation ? "Education details are visible." : "The resume can be expanded with academic context.",
      detectedSkills.length ? "Relevant technical and professional skills were detected." : "The profile has room to highlight skills more clearly."
    ],
    improvements: [
      hasMetrics ? "Keep measurable outcomes prominent in each experience bullet." : "Add measurable outcomes such as percentages, counts, timelines, or performance gains.",
      "Mirror important keywords from the target job description naturally across skills and experience.",
      "Use concise action verbs and keep each bullet focused on impact."
    ],
    skills: detectedSkills.length ? detectedSkills : [{ name: "Communication", level: 60 }],
    missingKeywords: ["ATS keywords", "measurable impact", "role-specific tools", "certifications"],
    sections: [
      { name: "Contact & Summary", score: 72, comment: "Add a targeted headline and concise professional summary." },
      { name: "Skills", score: detectedSkills.length ? 78 : 48, comment: "Group skills by category and align them to the role." },
      { name: "Experience", score: hasExperience ? 74 : 42, comment: "Use impact-driven bullets with quantified outcomes." },
      { name: "Projects", score: hasProjects ? 82 : 45, comment: "Show project scope, tools, links, and results." },
      { name: "Formatting", score: words.length > 250 ? 76 : 58, comment: "Keep formatting simple, readable, and ATS-friendly." }
    ],
    atsChecklist: [
      "Use standard section headings.",
      "Avoid image-only resume content.",
      "Include role-specific keywords.",
      "Quantify achievements where possible."
    ],
    recommendedHeadline: targetRole ? `${targetRole} | ATS-Ready Candidate` : "Technology Professional | ATS-Ready Candidate"
  };
}
