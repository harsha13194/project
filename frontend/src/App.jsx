import React, { useState, useEffect } from "react";
import {
  Search, User, GitBranch, Upload, Folder, FolderOpen, FileCode,
  ChevronRight, ChevronDown, ChevronLeft, Send, AlertTriangle, CheckCircle2,
  Info, Sparkles, Code2, GitCompare, ShieldCheck, BookOpen, Wrench,
  Rocket, Circle, X, Layers, RefreshCw, Loader2, Trash2, ArrowRight, Play
} from "lucide-react";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
`;

const display = { fontFamily: "'Sora', sans-serif" };
const body = { fontFamily: "'Inter', sans-serif" };
const mono = { fontFamily: "'JetBrains Mono', monospace" };

const tabs = [
  { id: "editor", label: "Editor", icon: Code2 },
  { id: "summary", label: "Repository Summary", icon: Layers },
  { id: "impact", label: "Impact Analysis", icon: GitCompare },
  { id: "architecture", label: "Architecture", icon: ShieldCheck },
  { id: "docs", label: "Documentation", icon: BookOpen },
  { id: "refactor", label: "Refactoring", icon: Wrench },
  { id: "deploy", label: "Deployment Readiness", icon: Rocket },
];

/* ---------------- Session API Helper ---------------- */

function makeApiFetch(sessionId) {
  return (url, options = {}) => {
    const headers = {
      ...options.headers,
      "X-Session-ID": sessionId,
    };
    return fetch(url, { ...options, headers });
  };
}

/* ---------------- UI Helper Components ---------------- */

function Pill({ children, tone = "violet" }) {
  const tones = {
    violet: "bg-violet-100 text-violet-700",
    pink: "bg-pink-100 text-pink-700",
    stone: "bg-stone-100 text-stone-600",
    red: "bg-red-100 text-red-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-700",
    Low: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${tones[tone] || tones.stone}`} style={body}>
      {children}
    </span>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-stone-200/70 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function FileNode({ node, depth, activeFile, setActiveFile }) {
  const [open, setOpen] = useState(depth < 2);

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg hover:bg-violet-50 text-left transition-colors cursor-pointer"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {open ? <ChevronDown size={13} className="text-stone-400 shrink-0" /> : <ChevronRight size={13} className="text-stone-400 shrink-0" />}
          {open ? <FolderOpen size={14} className="text-violet-400 shrink-0" /> : <Folder size={14} className="text-violet-400 shrink-0" />}
          <span className="text-[13px] text-stone-700 truncate" style={body}>{node.name}</span>
        </button>
        {open && node.children && node.children.map((c, i) => (
          <FileNode key={c.path || `${c.name}-${i}`} node={c} depth={depth + 1} activeFile={activeFile} setActiveFile={setActiveFile} />
        ))}
      </div>
    );
  }

  const filePath = node.path || node.name;
  const isActive = filePath === activeFile;

  return (
    <button
      onClick={() => setActiveFile(filePath)}
      className={`flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${isActive ? "bg-violet-100" : "hover:bg-violet-50"}`}
      style={{ paddingLeft: `${depth * 14 + 22}px` }}
    >
      <FileCode size={13} className={`shrink-0 ${isActive ? "text-violet-600" : "text-stone-400"}`} />
      <span className={`text-[13px] truncate ${isActive ? "text-violet-700 font-medium" : "text-stone-600"}`} style={body}>{node.name}</span>
    </button>
  );
}

/* ---------------- Explainable AI Card ---------------- */

function ExplainCard({ msg }) {
  const rows = [
    { label: "Answer", value: msg.answer, icon: Sparkles, tone: "text-violet-600 bg-violet-50" },
    { label: "Reason", value: msg.reason, icon: Info, tone: "text-pink-600 bg-pink-50" },
    { label: "Evidence", value: msg.evidence, icon: FileCode, tone: "text-amber-600 bg-amber-50" },
    { label: "Impact", value: msg.impact, icon: AlertTriangle, tone: "text-orange-600 bg-orange-50" },
    { label: "Recommendation", value: msg.recommendation, icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <Card className="p-0 overflow-hidden">
      {msg.agent && (
        <div className="bg-stone-100/70 px-4 py-2 border-b border-stone-200/60 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider" style={body}>
            Agent: {msg.agent}
          </span>
          <Pill tone="violet">AI Explained</Pill>
        </div>
      )}
      <div className="divide-y divide-stone-100">
        {rows.map((r) => r.value ? (
          <div key={r.label} className="flex gap-3 px-4 py-3">
            <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${r.tone}`}>
              <r.icon size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-wide uppercase text-stone-400" style={body}>{r.label}</div>
              <div className="text-[13px] text-stone-700 leading-snug mt-0.5 whitespace-pre-wrap" style={body}>{r.value}</div>
            </div>
          </div>
        ) : null)}
      </div>
    </Card>
  );
}

/* ---------------- Analysis Tab Views ---------------- */

function SummaryView({ apiFetch }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/analysis/summary")
      .then((res) => res.json())
      .then((res) => { setData(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-stone-400">Loading summary...</div>;
  if (!data || !data.stats) return <div className="p-8 text-center text-stone-400">No summary data available. Clone or upload a repository.</div>;

  const stats = [
    { label: "Files scanned", value: data.stats.file_count },
    { label: "Lines of code", value: data.stats.total_lines.toLocaleString() },
    { label: "Classes extracted", value: data.stats.class_count },
    { label: "Functions extracted", value: data.stats.function_count },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-2xl font-semibold text-stone-800" style={display}>{s.value}</div>
            <div className="text-[12px] text-stone-500 mt-1" style={body}>{s.label}</div>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <div className="text-[14px] font-semibold text-stone-700 mb-3" style={display}>Languages Detected</div>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(data.stats.languages || {}).map(([lang, count]) => (
            <div key={lang} className="px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-100 text-[13px] text-violet-800 font-medium">
              {lang}: {count} files
            </div>
          ))}
        </div>
      </Card>
      {data.top_level_folders && (
        <Card className="p-5">
          <div className="text-[14px] font-semibold text-stone-700 mb-3" style={display}>Top-level Modules</div>
          <div className="space-y-2 text-[13px] text-stone-600" style={body}>
            {data.top_level_folders.map((folder) => (
              <div key={folder} className="flex items-center gap-2">
                <Folder size={14} className="text-violet-400" />
                <span>{folder}/</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ImpactView({ activeFile, apiFetch }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeFile) return;
    setLoading(true);
    apiFetch(`/api/analysis/impact?file=${encodeURIComponent(activeFile)}`)
      .then((res) => res.json())
      .then((res) => { setData(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeFile]);

  if (loading) return <div className="p-8 text-center text-stone-400">Analyzing impact...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="text-[13px] text-stone-500" style={body}>
        Simulated change target: <code className="bg-stone-200/60 px-2 py-0.5 rounded text-stone-800 font-medium" style={mono}>{activeFile || "Select a file"}</code>
      </div>
      {data && data.affected && data.affected.length > 0 ? (
        data.affected.map((r, i) => (
          <Card key={i} className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-medium text-stone-800" style={mono}>{r.file}</div>
              <div className="text-[12px] text-stone-500 mt-0.5" style={body}>{r.reason}</div>
            </div>
            <Pill tone={r.risk}>{r.risk} risk</Pill>
          </Card>
        ))
      ) : (
        <Card className="p-6 text-center text-stone-500 text-[13px]" style={body}>
          No direct callers found importing this file. Low propagation risk.
        </Card>
      )}
    </div>
  );
}

function ArchitectureView({ apiFetch }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiFetch("/api/analysis/architecture")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <div className="p-8 text-center text-stone-400">Loading architecture layer data...</div>;

  return (
    <div className="p-6 space-y-5">
      <Card className="p-5">
        <div className="text-[14px] font-semibold text-stone-700 mb-4" style={display}>Top Level Folders & Modules</div>
        <div className="flex items-center gap-2 flex-wrap">
          {data.layers && data.layers.map((l, i) => (
            <React.Fragment key={l}>
              <div className="px-3 py-2 rounded-xl bg-violet-50 border border-violet-100 text-[12px] text-violet-700 font-medium" style={body}>{l}</div>
              {i < data.layers.length - 1 && <ChevronRight size={14} className="text-stone-300" />}
            </React.Fragment>
          ))}
        </div>
      </Card>

      <div className="text-[14px] font-semibold text-stone-700" style={display}>Architectural & Dependency Violations</div>
      {data.violations && data.violations.length > 0 ? (
        data.violations.map((v, i) => (
          <Card key={i} className="p-4 flex items-start gap-3 border-amber-200 bg-amber-50/40">
            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[13px] text-stone-700" style={body}>
              <span className="font-semibold text-amber-800 uppercase tracking-wide text-[11px] block">{v.type}</span>
              <code style={mono}>{v.detail}</code>
            </div>
          </Card>
        ))
      ) : (
        <Card className="p-4 flex items-center gap-2 text-emerald-700 bg-emerald-50/50 border-emerald-200">
          <CheckCircle2 size={16} />
          <span className="text-[13px]" style={body}>No circular dependency violations detected!</span>
        </Card>
      )}
    </div>
  );
}

function DocsView({ apiFetch }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiFetch("/api/analysis/docs")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <div className="p-8 text-center text-stone-400">Analyzing docstrings...</div>;

  return (
    <div className="p-6 space-y-3">
      <div className="text-[13px] text-stone-500 mb-2" style={body}>Public functions/classes recommended for docstrings:</div>
      {data.undocumented_candidates && data.undocumented_candidates.length > 0 ? (
        data.undocumented_candidates.map((it, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-medium text-stone-800" style={mono}>{it.type} {it.name}()</div>
              <Pill tone="stone">{it.file}</Pill>
            </div>
          </Card>
        ))
      ) : (
        <Card className="p-6 text-center text-stone-500 text-[13px]" style={body}>All public entities documented or no candidate functions detected.</Card>
      )}
    </div>
  );
}

function RefactorView({ apiFetch }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiFetch("/api/analysis/refactor")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <div className="p-8 text-center text-stone-400">Scanning code smells...</div>;

  return (
    <div className="p-6 space-y-3">
      <div className="text-[13px] text-stone-500 mb-2" style={body}>Automated Code Smell Diagnostics:</div>
      {data.smells && data.smells.length > 0 ? (
        data.smells.map((s, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0" />
            <div>
              <div className="text-[13px] font-semibold text-stone-800" style={body}>{s.title}</div>
              <div className="text-[12px] text-stone-600 mt-0.5" style={body}>{s.detail}</div>
            </div>
          </Card>
        ))
      ) : (
        <Card className="p-4 flex items-center gap-2 text-emerald-700 bg-emerald-50/50 border-emerald-200">
          <CheckCircle2 size={16} />
          <span className="text-[13px]" style={body}>No critical code smells detected! Clean architecture.</span>
        </Card>
      )}
    </div>
  );
}

function DeployView({ apiFetch }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiFetch("/api/analysis/deploy")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <div className="p-8 text-center text-stone-400">Computing readiness score...</div>;

  const score = data.score ?? 100;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="p-6 grid grid-cols-3 gap-5">
      <Card className="p-6 flex flex-col items-center justify-center">
        <svg width="110" height="110" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#f4f4f5" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none" stroke="#8b5cf6" strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 50 50)"
          />
          <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="600" fill="#44403c" style={display}>{score}</text>
        </svg>
        <div className="text-[12px] text-stone-500 mt-2 font-medium" style={body}>Deployment Score</div>
      </Card>
      <Card className="p-5 col-span-2 space-y-3">
        <div className="text-[12px] font-semibold text-red-500 uppercase tracking-wide" style={body}>Critical Blocking Issues</div>
        {data.critical_issues && data.critical_issues.length > 0 ? (
          data.critical_issues.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px] text-stone-700" style={body}>
              <X size={14} className="text-red-500 shrink-0" /> {c}
            </div>
          ))
        ) : (
          <div className="text-[13px] text-emerald-600 font-medium">None detected</div>
        )}

        <div className="text-[12px] font-semibold text-amber-500 uppercase tracking-wide pt-2" style={body}>Minor Warnings</div>
        {data.minor_issues && data.minor_issues.length > 0 ? (
          data.minor_issues.map((m, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px] text-stone-700" style={body}>
              <Circle size={8} className="text-amber-400 fill-amber-400 shrink-0" /> {m}
            </div>
          ))
        ) : (
          <div className="text-[13px] text-emerald-600 font-medium">None detected</div>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Editor View ---------------- */

function EditorView({ activeFile, fileContent, loadingFile }) {
  if (!activeFile) {
    return <div className="p-8 text-center text-stone-400">Select a file from the explorer to view code content.</div>;
  }

  if (loadingFile) {
    return <div className="p-8 text-center text-stone-400 flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading file content...</div>;
  }

  const lines = fileContent ? fileContent.split("\n") : [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-stone-200 bg-white px-4 py-2 justify-between">
        <div className="flex items-center gap-2 text-[13px] text-stone-700 font-medium" style={mono}>
          <FileCode size={14} className="text-violet-600" /> {activeFile}
        </div>
        <span className="text-[11px] text-stone-400">{lines.length} lines</span>
      </div>
      <div className="flex-1 overflow-auto bg-white p-4" style={mono}>
        {lines.map((line, i) => (
          <div key={i} className="flex text-[13px] leading-6">
            <span className="w-10 text-stone-300 select-none text-right pr-4 shrink-0">{i + 1}</span>
            <span className="text-stone-800 whitespace-pre">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- AI Chat Panel ---------------- */

function ChatPanel({ chatMessages, onSendMessage, isSubmitting, onClose }) {
  const [value, setValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim() || isSubmitting) return;
    onSendMessage(value);
    setValue("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-violet-500" />
          <span className="text-[13px] font-semibold text-stone-700" style={display}>AI Assistant</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
            title="Collapse AI Chat box"
          >
            <ChevronRight size={15} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="bg-violet-600 text-white text-[13px] rounded-2xl rounded-tr-sm px-3.5 py-2 max-w-[85%]" style={body}>
                {m.text}
              </div>
            </div>
          ) : (
            <ExplainCard key={i} msg={m} />
          )
        )}
        {isSubmitting && (
          <div className="flex items-center gap-2 text-[12px] text-stone-400 py-2">
            <Loader2 size={14} className="animate-spin text-violet-600" />
            <span>Orchestrator thinking & analyzing codebase...</span>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-stone-200">
        <div className="bg-stone-50 rounded-full border border-stone-200 flex items-center pl-4 pr-1.5 py-1.5 focus-within:border-violet-300">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ask about this repository..."
            className="flex-1 bg-transparent text-[13px] outline-none text-stone-700 placeholder:text-stone-400"
            style={body}
            disabled={isSubmitting}
          />
          <button type="submit" disabled={isSubmitting} className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center shrink-0 hover:bg-stone-800 disabled:opacity-50 cursor-pointer">
            <Send size={13} />
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- Landing Hero View (No Repo Loaded) ---------------- */

function LandingView({ onOpenClone, onOpenUpload, onQuickClone }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-stone-50 via-white to-stone-50">
      <div className="max-w-3xl w-full text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-100 text-violet-700 text-[12px] font-medium" style={body}>
          <Sparkles size={14} /> Session Isolated & Multi-User Ready
        </div>

        <h1 className="text-4xl font-extrabold text-stone-900 tracking-tight" style={display}>
          AI Codebase Intelligence
        </h1>

        <p className="text-stone-600 text-base max-w-xl mx-auto leading-relaxed" style={body}>
          Clone a Git repository or upload a Zip archive to begin instant AST parsing, vector semantic code search, dependency graph visualization, and multi-agent AI explanations.
        </p>

        <div className="grid grid-cols-2 gap-6 pt-4 text-left">
          {/* Option 1: Git Clone Card */}
          <Card className="p-6 space-y-4 hover:border-violet-300 transition-all hover:shadow-md">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <GitBranch size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-800" style={display}>Clone Git Repository</h3>
              <p className="text-[13px] text-stone-500 mt-1" style={body}>
                Provide any public Git repository URL. We will clone, scan AST structures, and build vector embeddings automatically.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Try quick sample repos:</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onQuickClone("https://github.com/fastapi/fastapi")}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-violet-100 text-stone-700 hover:text-violet-800 text-[12px] font-medium transition-colors cursor-pointer"
                >
                  fastapi/fastapi
                </button>
                <button
                  onClick={() => onQuickClone("https://github.com/pallets/flask")}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-violet-100 text-stone-700 hover:text-violet-800 text-[12px] font-medium transition-colors cursor-pointer"
                >
                  pallets/flask
                </button>
              </div>
            </div>
            <button
              onClick={onOpenClone}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[13px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              style={body}
            >
              <GitBranch size={15} /> Enter Git URL
            </button>
          </Card>

          {/* Option 2: Zip Upload Card */}
          <Card className="p-6 space-y-4 hover:border-stone-400 transition-all hover:shadow-md flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center">
                <Upload size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-stone-800" style={display}>Upload Zip Archive</h3>
                <p className="text-[13px] text-stone-500 mt-1" style={body}>
                  Upload your local project as a <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-700" style={mono}>.zip</code> file. It will be extracted and scanned in your temporary session.
                </p>
              </div>
            </div>
            <button
              onClick={onOpenUpload}
              className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-[13px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              style={body}
            >
              <Upload size={15} /> Choose .zip File
            </button>
          </Card>
        </div>

        <div className="pt-8 border-t border-stone-200/80 grid grid-cols-4 gap-4 text-stone-600 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-stone-800 text-[13px]" style={body}><Sparkles size={14} className="text-violet-500" /> Multi-Agent AI</div>
            <p className="text-[12px] text-stone-400">Routes queries dynamically to specialized agent experts.</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-stone-800 text-[13px]" style={body}><GitCompare size={14} className="text-pink-500" /> Impact Analysis</div>
            <p className="text-[12px] text-stone-400">Simulates file edits to detect caller propagation risks.</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-stone-800 text-[13px]" style={body}><ShieldCheck size={14} className="text-amber-500" /> Circular Checker</div>
            <p className="text-[12px] text-stone-400">Detects architectural violations and circular imports.</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-stone-800 text-[13px]" style={body}><Rocket size={14} className="text-emerald-500" /> Deployment Ready</div>
            <p className="text-[12px] text-stone-400">Generates instant deploy readiness scores & blockers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Top & Sub Navs ---------------- */

function TopNav({ onOpenClone, onOpenUpload, onRefresh, onResetSession, isLoaded }) {
  return (
    <div className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-stone-200 bg-white/90 backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <div className="w-7.5 h-7.5 rounded-xl bg-gradient-to-br from-violet-500 to-pink-400 flex items-center justify-center shadow-sm">
          <Layers size={15} className="text-white" />
        </div>
        <span className="text-[15px] font-semibold text-stone-800 tracking-tight" style={display}>AI Codebase Intelligence</span>
      </div>
      <div className="flex items-center gap-2.5">
        {isLoaded && (
          <>
            <button onClick={onRefresh} className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-full transition-colors cursor-pointer" title="Refresh Repository">
              <RefreshCw size={15} />
            </button>
            <button onClick={onResetSession} className="flex items-center gap-1.5 text-[12.5px] text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-full border border-red-200 transition-colors cursor-pointer" style={body} title="Start Fresh / Clear Workspace">
              <Trash2 size={13} /> Start Fresh
            </button>
          </>
        )}
        <button onClick={onOpenClone} className="flex items-center gap-1.5 text-[12.5px] text-stone-700 hover:text-stone-900 px-3.5 py-1.5 rounded-full border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer" style={body}>
          <GitBranch size={13} /> Clone Repo
        </button>
        <button onClick={onOpenUpload} className="flex items-center gap-1.5 text-[12.5px] text-white bg-stone-900 hover:bg-stone-800 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer" style={body}>
          <Upload size={13} /> Upload Zip
        </button>
      </div>
    </div>
  );
}

function SecondNav({ activeTab, setActiveTab }) {
  return (
    <div className="h-11 shrink-0 flex items-center gap-1 px-5 border-b border-stone-200 bg-white overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === t.id ? "bg-violet-100 text-violet-700 font-medium" : "text-stone-500 hover:bg-stone-50"
          }`}
          style={body}
        >
          <t.icon size={13} /> {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Main App Component ---------------- */

export default function App() {
  // Session ID generated per fresh page load for complete isolation
  const [sessionId] = useState(() => "sess_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now());
  const apiFetch = makeApiFetch(sessionId);

  const [activeTab, setActiveTab] = useState("editor");
  const [fileTree, setFileTree] = useState([]);
  const [activeFile, setActiveFile] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [gitUrl, setGitUrl] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingChat, setIsSubmittingChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "ai",
      agent: "CodebaseAgent",
      answer: "Welcome to AI Codebase Intelligence! Ask any architectural, impact, or docstring question about your loaded repository.",
      reason: "Repository index is ready for natural language multi-agent query routing.",
      evidence: "FastAPI + NVIDIA NIM backend connected.",
      impact: "Instant explainable insights across files and dependencies.",
      recommendation: "Select a file from the explorer or type your question in the chat assistant.",
    }
  ]);

  const loadTree = () => {
    apiFetch("/api/repository/tree")
      .then((res) => {
        if (!res.ok) throw new Error("No repo loaded");
        return res.json();
      })
      .then((tree) => {
        if (tree && tree.children) {
          setFileTree(tree.children);
          const findFirstFile = (nodes) => {
            for (let n of nodes) {
              if (n.type === "file") return n.path || n.name;
              if (n.children) {
                const found = findFirstFile(n.children);
                if (found) return found;
              }
            }
            return "";
          };
          const first = findFirstFile(tree.children);
          if (first) setActiveFile(first);
        } else if (Array.isArray(tree)) {
          setFileTree(tree);
        }
      })
      .catch(() => {
        setFileTree([]);
        setActiveFile("");
      });
  };

  useEffect(() => {
    loadTree();
  }, []);

  useEffect(() => {
    if (!activeFile) return;
    setLoadingFile(true);
    apiFetch(`/api/repository/file?path=${encodeURIComponent(activeFile)}`)
      .then((res) => res.json())
      .then((res) => {
        setFileContent(res.content || "");
        setLoadingFile(false);
      })
      .catch(() => setLoadingFile(false));
  }, [activeFile]);

  const handleSendMessage = (text) => {
    setChatMessages((prev) => [...prev, { role: "user", text }]);
    setIsSubmittingChat(true);

    apiFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: text }),
    })
      .then((res) => res.json())
      .then((res) => {
        setChatMessages((prev) => [...prev, { role: "ai", ...res }]);
        setIsSubmittingChat(false);
      })
      .catch((err) => {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "ai",
            agent: "Error",
            answer: "Failed to communicate with AI chat endpoint.",
            reason: String(err),
            recommendation: "Ensure backend uvicorn server is running on http://localhost:8000.",
          },
        ]);
        setIsSubmittingChat(false);
      });
  };

  const handleCloneSubmit = (e, urlOverride) => {
    if (e) e.preventDefault();
    const targetUrl = urlOverride || gitUrl;
    if (!targetUrl.trim()) return;
    setIsCloning(true);
    apiFetch("/api/repository/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ git_url: targetUrl }),
    })
      .then((res) => res.json())
      .then(() => {
        setIsCloning(false);
        setShowCloneModal(false);
        setGitUrl("");
        loadTree();
      })
      .catch(() => setIsCloning(false));
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("zipFileInput");
    if (!fileInput.files[0]) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    apiFetch("/api/repository/upload", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then(() => {
        setIsUploading(false);
        setShowUploadModal(false);
        loadTree();
      })
      .catch(() => setIsUploading(false));
  };

  const handleResetSession = () => {
    apiFetch("/api/repository/reset", { method: "POST" })
      .then(() => {
        setFileTree([]);
        setActiveFile("");
        setFileContent("");
      })
      .catch(() => {});
  };

  const isLoaded = fileTree.length > 0;

  const renderCenter = () => {
    if (!isLoaded) {
      return (
        <LandingView
          onOpenClone={() => setShowCloneModal(true)}
          onOpenUpload={() => setShowUploadModal(true)}
          onQuickClone={(url) => handleCloneSubmit(null, url)}
        />
      );
    }

    switch (activeTab) {
      case "editor": return <EditorView activeFile={activeFile} fileContent={fileContent} loadingFile={loadingFile} />;
      case "summary": return <SummaryView apiFetch={apiFetch} />;
      case "impact": return <ImpactView activeFile={activeFile} apiFetch={apiFetch} />;
      case "architecture": return <ArchitectureView apiFetch={apiFetch} />;
      case "docs": return <DocsView apiFetch={apiFetch} />;
      case "refactor": return <RefactorView apiFetch={apiFetch} />;
      case "deploy": return <DeployView apiFetch={apiFetch} />;
      default: return null;
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-stone-50" style={body}>
      <style>{FONT_IMPORT}</style>
      <TopNav
        onOpenClone={() => setShowCloneModal(true)}
        onOpenUpload={() => setShowUploadModal(true)}
        onRefresh={loadTree}
        onResetSession={handleResetSession}
        isLoaded={isLoaded}
      />
      {isLoaded && <SecondNav activeTab={activeTab} setActiveTab={setActiveTab} />}
      <div className="flex-1 min-h-0 flex relative">
        {/* Left Explorer Panel (Only when repo is loaded) */}
        {isLoaded && (
          isFolderOpen ? (
            <div className="w-64 shrink-0 border-r border-stone-200 bg-white flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-stone-100">
                <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide" style={body}>Repository Explorer</span>
                <button
                  onClick={() => setIsFolderOpen(false)}
                  className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                  title="Collapse Folders"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2 px-1.5">
                {fileTree.map((n, i) => (
                  <FileNode key={n.path || `${n.name}-${i}`} node={n} depth={0} activeFile={activeFile} setActiveFile={setActiveFile} />
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsFolderOpen(true)}
              className="h-full px-2 bg-white border-r border-stone-200 hover:bg-violet-50 text-stone-500 hover:text-violet-700 flex flex-col items-center py-4 gap-3 transition-colors shrink-0 group cursor-pointer"
              title="Expand Folders"
            >
              <div className="p-1 rounded group-hover:bg-violet-100">
                <ChevronRight size={16} />
              </div>
              <Folder size={15} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 [writing-mode:vertical-lr] rotate-180">Folders</span>
            </button>
          )
        )}

        {/* Center Workspace Content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {renderCenter()}
        </div>

        {/* Right AI Chat Panel (Only when repo is loaded) */}
        {isLoaded && (
          isChatOpen ? (
            <div className="w-[360px] shrink-0 border-l border-stone-200 bg-white">
              <ChatPanel
                chatMessages={chatMessages}
                onSendMessage={handleSendMessage}
                isSubmitting={isSubmittingChat}
                onClose={() => setIsChatOpen(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setIsChatOpen(true)}
              className="h-full px-2 bg-white border-l border-stone-200 hover:bg-violet-50 text-stone-500 hover:text-violet-700 flex flex-col items-center py-4 gap-3 transition-colors shrink-0 group cursor-pointer"
              title="Expand AI Chat Box"
            >
              <div className="p-1 rounded group-hover:bg-violet-100">
                <ChevronLeft size={16} />
              </div>
              <Sparkles size={15} className="text-violet-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 [writing-mode:vertical-lr] rotate-180">AI Chat</span>
            </button>
          )
        )}
      </div>

      {/* Clone Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-stone-800" style={display}>Clone Git Repository</h3>
              <button onClick={() => setShowCloneModal(false)} className="text-stone-400 hover:text-stone-600"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => handleCloneSubmit(e)} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-stone-600 mb-1" style={body}>Git Repository URL</label>
                <input
                  type="url"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  placeholder="https://github.com/username/repo.git"
                  required
                  className="w-full px-3 py-2 text-[13px] border border-stone-200 rounded-xl outline-none focus:border-violet-400 bg-stone-50"
                  style={body}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCloneModal(false)} className="px-4 py-2 text-[13px] text-stone-600 hover:bg-stone-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={isCloning} className="px-4 py-2 text-[13px] text-white bg-violet-600 hover:bg-violet-700 rounded-xl flex items-center gap-2 disabled:opacity-50">
                  {isCloning && <Loader2 size={14} className="animate-spin" />} Clone & Index
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Upload Zip Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-stone-800" style={display}>Upload Zip Archive</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-stone-400 hover:text-stone-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-stone-600 mb-1" style={body}>Select .zip File</label>
                <input
                  id="zipFileInput"
                  type="file"
                  accept=".zip"
                  required
                  className="w-full text-[13px] text-stone-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[13px] file:font-medium file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                  style={body}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-[13px] text-stone-600 hover:bg-stone-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={isUploading} className="px-4 py-2 text-[13px] text-white bg-stone-900 hover:bg-stone-800 rounded-xl flex items-center gap-2 disabled:opacity-50">
                  {isUploading && <Loader2 size={14} className="animate-spin" />} Extract & Index
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
