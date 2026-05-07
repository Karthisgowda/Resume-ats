import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { jsPDF } from "jspdf";
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Brain,
  Download,
  FileText,
  ListChecks,
  Loader2,
  MessageSquareText,
  Route,
  Sparkles,
  UploadCloud
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import "./styles.css";

const sectionColors = ["#1f7a8c", "#7c3aed", "#e76f51", "#2a9d8f", "#f4a261", "#457b9d"];
const roleOptions = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Software Engineer",
  "Web Developer",
  "React Developer",
  "Angular Developer",
  "Node.js Developer",
  "Java Developer",
  "Python Developer",
  "PHP Developer",
  "Mobile App Developer",
  "Android Developer",
  "iOS Developer",
  "UI/UX Designer",
  "Product Designer",
  "Graphic Designer",
  "Data Analyst",
  "Business Analyst",
  "Data Scientist",
  "Machine Learning Engineer",
  "AI/ML Intern",
  "Data Engineer",
  "Cloud Engineer",
  "DevOps Engineer",
  "Cybersecurity Analyst",
  "Network Engineer",
  "Database Administrator",
  "QA Tester",
  "Automation Tester",
  "Project Manager",
  "Product Manager",
  "Digital Marketing Executive",
  "SEO Analyst",
  "Content Writer",
  "Technical Writer",
  "HR Executive",
  "Sales Executive",
  "Finance Analyst",
  "Customer Support Executive"
];

function clampScore(score) {
  return Math.max(0, Math.min(100, Number(score) || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function App() {
  const [resume, setResume] = useState(null);
  const [targetRole, setTargetRole] = useState("");
  const [submittedRole, setSubmittedRole] = useState("");
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const scoreData = useMemo(() => {
    const score = clampScore(analysis?.score);
    return [
      { name: "Score", value: score },
      { name: "Remaining", value: 100 - score }
    ];
  }, [analysis]);

  const filteredRoles = useMemo(() => {
    const query = targetRole.trim().toLowerCase();

    if (!query) {
      return roleOptions.slice(0, 10);
    }

    return roleOptions.filter((role) => role.toLowerCase().includes(query)).slice(0, 10);
  }, [targetRole]);

  async function handleAnalyze(event) {
    event.preventDefault();
    setError("");
    setAnalysis(null);

    if (!resume) {
      setError("Upload a PDF, DOCX, or TXT resume first.");
      return;
    }

    if (!targetRole.trim()) {
      setError("Tell us which job you are applying for so the suggestions can match that role.");
      return;
    }

    const body = new FormData();
    body.append("resume", resume);
    body.append("targetRole", targetRole.trim());
    body.append("jobDescription", jobDescription);

    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Resume analysis failed.");
      }

      setAnalysis(data);
      setSubmittedRole(targetRole.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!analysis) {
      return;
    }

    const today = new Date().toLocaleDateString();
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 44;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 48;

    function addText(text, size = 10, isBold = false) {
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(String(text ?? ""), pageWidth - margin * 2);
      lines.forEach((line) => {
        if (y > pageHeight - 44) {
          doc.addPage();
          y = 48;
        }
        doc.text(line, margin, y);
        y += size + 5;
      });
    }

    function addSection(title, items = []) {
      y += 8;
      addText(title, 13, true);
      items.forEach((item) => addText(`- ${item}`, 10));
    }

    doc.setTextColor(31, 122, 140);
    addText("AI Resume Analyzer Report", 20, true);
    doc.setTextColor(23, 32, 38);
    addText(`Date: ${today}`);
    addText(`Resume: ${analysis.resumeStats?.fileName || "Uploaded resume"}`);
    addText(`Applying for: ${submittedRole || targetRole}`);
    addText(`ATS Score: ${clampScore(analysis.score)}/100`, 16, true);
    addText(`Job Match: ${clampScore(analysis.jobMatch?.score)}/100`, 14, true);
    addText(`Suggested headline: ${analysis.recommendedHeadline || "Not available"}`);
    addText(analysis.summary || "");

    addSection("Strengths", analysis.strengths || []);
    addSection("Suggestions to Improve", analysis.improvements || []);
    addSection("Missing Keywords", analysis.missingKeywords || []);
    addSection("Matched Keywords", analysis.jobMatch?.matchedKeywords || []);
    addSection(
      "Section Scores",
      (analysis.sections || []).map((section) => `${section.name} (${clampScore(section.score)}/100): ${section.comment}`)
    );
    addSection(
      "Rewritten Bullets",
      (analysis.rewrittenBullets || []).map((bullet) => `${bullet.before} -> ${bullet.after}`)
    );
    addSection(
      "Skill Roadmap",
      (analysis.skillRoadmap || []).map((item) => `${item.priority}: ${item.skill} - ${item.action}`)
    );
    addSection("Interview Questions", analysis.interviewQuestions || []);
    addSection("ATS Checklist", analysis.atsChecklist || []);

    doc.save(`resume-report-${(submittedRole || "job").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
  }

  return (
    <main>
      <section className="workspace">
        <div className="intro">
          <div className="brand">
            <Brain size={28} />
            <span>AI Resume Analyzer</span>
          </div>
          <h1>Resume insights for ATS readiness and career growth.</h1>
          <p>
            Upload a resume, add the role you want, and get focused AI feedback on skills, keywords, sections, and recruiter fit.
          </p>
          <div className="metric-row">
            <div>
              <strong>PDF</strong>
              <span>DOCX + TXT parsing</span>
            </div>
            <div>
              <strong>ATS</strong>
              <span>Readiness score</span>
            </div>
            <div>
              <strong>AI</strong>
              <span>Groq analysis</span>
            </div>
          </div>
        </div>

        <form className="analyzer-panel" onSubmit={handleAnalyze}>
          <label className="dropzone">
            <UploadCloud size={34} />
            <strong>{resume ? resume.name : "Upload resume"}</strong>
            <span>PDF, DOCX, or TXT up to 6MB</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(event) => setResume(event.target.files?.[0] || null)}
            />
          </label>

          <label className="role-search">
            Which job are you applying for?
            <input
              value={targetRole}
              onBlur={() => window.setTimeout(() => setShowRoleSuggestions(false), 140)}
              onChange={(event) => {
                setTargetRole(event.target.value);
                setShowRoleSuggestions(true);
              }}
              onFocus={() => setShowRoleSuggestions(true)}
              placeholder="Search job role, e.g. frontend, data, HR..."
            />
            {showRoleSuggestions ? (
              <div className="role-suggestions">
                {filteredRoles.length ? (
                  filteredRoles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setTargetRole(role);
                        setShowRoleSuggestions(false);
                      }}
                    >
                      {role}
                    </button>
                  ))
                ) : (
                  <span>No matching role. You can type your own.</span>
                )}
              </div>
            ) : null}
          </label>

          <label>
            Job description or keywords
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste job requirements, required skills, or target company expectations."
            />
          </label>

          {error ? <div className="error">{error}</div> : null}

          <button disabled={loading} type="submit">
            {loading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            {loading ? "Analyzing..." : "Analyze Resume"}
          </button>
        </form>
      </section>

      {analysis ? (
        <section className="results">
          <div className="results-header">
            <div>
              <span>Resume report for</span>
              <h2>{submittedRole}</h2>
            </div>
            <button type="button" className="download-button" onClick={downloadReport}>
              <Download size={18} />
              Download Report
            </button>
          </div>

          <div className="score-card">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={scoreData} innerRadius={64} outerRadius={86} startAngle={90} endAngle={-270} dataKey="value">
                  <Cell fill="#1f7a8c" />
                  <Cell fill="#e8edf0" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="score-label">
              <strong>{clampScore(analysis.score)}</strong>
              <span>ATS Score</span>
            </div>
            <p>{analysis.summary}</p>
          </div>

          <div className="result-grid">
            <InsightCard icon={<BadgeCheck />} title="Strengths" items={analysis.strengths} />
            <InsightCard icon={<ArrowUpRight />} title="Improvements" items={analysis.improvements} />
            <InsightCard icon={<FileText />} title="Missing Keywords" items={analysis.missingKeywords} />
            <InsightCard icon={<BarChart3 />} title="ATS Checklist" items={analysis.atsChecklist} />
          </div>

          <div className="feature-grid">
            <article className="job-match-panel">
              <div className="card-title">
                <ListChecks />
                <h2>Job Match</h2>
              </div>
              <strong>{clampScore(analysis.jobMatch?.score)}%</strong>
              <p>{analysis.jobMatch?.comment}</p>
              <div className="keyword-groups">
                <KeywordGroup title="Matched" items={analysis.jobMatch?.matchedKeywords} />
                <KeywordGroup title="Need to Add" items={analysis.jobMatch?.missingCriticalKeywords} />
              </div>
            </article>

            <InsightCard icon={<Route />} title="Skill Roadmap" items={(analysis.skillRoadmap || []).map((item) => `${item.priority}: ${item.skill} - ${item.action}`)} />
            <InsightCard icon={<Sparkles />} title="Rewritten Bullets" items={(analysis.rewrittenBullets || []).map((item) => item.after)} />
            <InsightCard icon={<MessageSquareText />} title="Interview Prep" items={analysis.interviewQuestions} />
          </div>

          <div className="analytics">
            <div>
              <h2>Section Scores</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analysis.sections || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {(analysis.sections || []).map((entry, index) => (
                      <Cell key={entry.name} fill={sectionColors[index % sectionColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="skills">
              <h2>Skill Signals</h2>
              {(analysis.skills || []).map((skill) => (
                <div className="skill" key={skill.name}>
                  <span>{skill.name}</span>
                  <div>
                    <i style={{ width: `${clampScore(skill.level)}%` }} />
                  </div>
                </div>
              ))}
              <div className="headline">
                <span>Suggested headline</span>
                <strong>{analysis.recommendedHeadline}</strong>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function InsightCard({ icon, title, items = [] }) {
  return (
    <article className="insight-card">
      <div className="card-title">
        {icon}
        <h2>{title}</h2>
      </div>
      <ul>
        {items.slice(0, 5).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function KeywordGroup({ title, items = [] }) {
  return (
    <div>
      <span>{title}</span>
      <div className="keyword-list">
        {items.slice(0, 6).map((item) => (
          <mark key={item}>{item}</mark>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
