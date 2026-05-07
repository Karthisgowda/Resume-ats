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
  "recommendedHeadline": string,
  "jobMatch": {"score": number, "matchedKeywords": string[], "missingCriticalKeywords": string[], "comment": string},
  "rewrittenBullets": [{"before": string, "after": string}],
  "skillRoadmap": [{"skill": string, "priority": "High" | "Medium" | "Low", "action": string}],
  "interviewQuestions": string[]
}

Scoring rules:
- score must be 0-100.
- section scores must be 0-100.
- skill levels must be 0-100.
- jobMatch score must be 0-100 and must reflect fit for the target role/job description.
- rewrittenBullets should improve weak resume bullets or create stronger examples if exact bullets are unclear.
- skillRoadmap should prioritize the most useful skills to add next for the target role.
- interviewQuestions should focus on likely questions from resume gaps and role requirements.
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
  const role = targetRole || "the target role";
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
    recommendedHeadline: targetRole ? `${targetRole} | ATS-Ready Candidate` : "Technology Professional | ATS-Ready Candidate",
    jobMatch: {
      score: Math.min(88, score - 4),
      matchedKeywords: detectedSkills.slice(0, 6).map((skill) => skill.name),
      missingCriticalKeywords: ["role-specific frameworks", "testing", "deployment", "measurable outcomes"],
      comment: `The resume has a workable match for ${role}, but it needs stronger role keywords and clearer evidence of impact.`
    },
    rewrittenBullets: [
      {
        before: "Worked on web development projects.",
        after: `Built and improved web application features for ${role}, using relevant tools while documenting measurable project outcomes.`
      },
      {
        before: "Good communication and leadership skills.",
        after: "Led team coordination, communicated project progress clearly, and supported delivery through organized planning and ownership."
      },
      {
        before: "Knowledge of technical skills.",
        after: "Applied technical skills across practical projects, connecting tools, APIs, and data workflows to solve user-focused problems."
      }
    ],
    skillRoadmap: [
      { skill: "Role-specific keywords", priority: "High", action: "Add tools and responsibilities that appear in the job description." },
      { skill: "Testing and debugging", priority: "Medium", action: "Mention testing tools, bug fixes, and quality improvements in project bullets." },
      { skill: "Deployment and version control", priority: "Medium", action: "Add GitHub, hosting, CI/CD, or deployment links wherever possible." },
      { skill: "Quantified achievements", priority: "High", action: "Rewrite bullets with numbers, timelines, user counts, or performance gains." }
    ],
    interviewQuestions: [
      `Which project best proves you are ready for ${role}?`,
      "How did you measure the impact of your strongest project?",
      "Which missing skill from the job description are you currently improving?",
      "How would you explain your resume gap or weakest section to a recruiter?"
    ]
  };
}
