import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Brain,
  FileText,
  Loader2,
  Sparkles,
  UploadCloud
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import "./styles.css";

const sectionColors = ["#1f7a8c", "#7c3aed", "#e76f51", "#2a9d8f", "#f4a261", "#457b9d"];

function clampScore(score) {
  return Math.max(0, Math.min(100, Number(score) || 0));
}

function App() {
  const [resume, setResume] = useState(null);
  const [targetRole, setTargetRole] = useState("");
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

  async function handleAnalyze(event) {
    event.preventDefault();
    setError("");
    setAnalysis(null);

    if (!resume) {
      setError("Upload a PDF, DOCX, or TXT resume first.");
      return;
    }

    const body = new FormData();
    body.append("resume", resume);
    body.append("targetRole", targetRole);
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

          <label>
            Target role
            <input
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
              placeholder="Frontend Developer, Data Analyst, AI Intern..."
            />
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

createRoot(document.getElementById("root")).render(<App />);
