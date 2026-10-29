import React, { useState } from "react";
import {
  Search, User, GitBranch, Upload, Folder, FolderOpen, FileCode,
  ChevronRight, ChevronDown, ChevronLeft, Send, AlertTriangle, CheckCircle2,
  Info, Sparkles, Code2, GitCompare, ShieldCheck, BookOpen, Wrench,
  Rocket, Circle, X, Layers
} from "lucide-react";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
`;

const display = { fontFamily: "'Sora', sans-serif" };
const body = { fontFamily: "'Inter', sans-serif" };
const mono = { fontFamily: "'JetBrains Mono', monospace" };

/* ---------------- mock data ---------------- */

const fileTree = [
  {
    name: "backend", type: "folder", children: [
      {
        name: "agents", type: "folder", children: [
          { name: "orchestrator.py", type: "file" },
          { name: "codebase_agent.py", type: "file" },
          { name: "impact_agent.py", type: "file" },
        ]
      },
      {
        name: "embeddings", type: "folder", children: [
          { name: "embedding_generator.py", type: "file" },
          { name: "vector_search.py", type: "file" },
        ]
      },
      { name: "main.py", type: "file" },
    ]
  },
  {
    name: "frontend", type: "folder", children: [
      {
        name: "src", type: "folder", children: [
          { name: "App.tsx", type: "file" },
          { name: "Navbar.tsx", type: "file" },
        ]
      }
    ]
  },
  { name: "docker-compose.yml", type: "file" },
  { name: "README.md", type: "file" },
];

const openFiles = ["orchestrator.py", "impact_agent.py"];

const codeByFile = {
  "orchestrator.py": [
    { t: "kw", v: "class " }, { t: "cl", v: "AgentOrchestrator" }, { t: "p", v: ":" },
  ],
  "impact_agent.py": [
    { t: "kw", v: "def " }, { t: "fn", v: "estimate_risk" }, { t: "p", v: "(self, changed_file):" },
  ],
};

const codeLines = {
  "orchestrator.py": [
    "class AgentOrchestrator:",
    "    def route(self, query: str, context: RepoContext):",
    "        agent = self.classify_intent(query)",
    "        return agent.handle(query, context)",
    "",
    "    def classify_intent(self, query: str) -> BaseAgent:",
    "        # routes to codebase / impact / architecture / docs",
    "        return self.registry.match(query)",
  ],
  "impact_agent.py": [
    "class ImpactAgent(BaseAgent):",
    "    def estimate_risk(self, changed_file: str):",
    "        callers = self.graph.find_callers(changed_file)",
    "        risk = self.score(callers)",
    "        return ImpactReport(callers, risk)",
    "",
    "    def score(self, callers):",
    "        return min(len(callers) * 0.12, 1.0)",
  ],
};

const chatMessages = [
  { role: "user", text: "What happens if I modify estimate_risk in impact_agent.py?" },
  {
    role: "ai",
    answer: "Modifying estimate_risk changes how risk scores are calculated for every downstream caller of ImpactAgent.",
    reason: "This method is the single scoring function used by the Deployment Readiness Agent to weight critical vs minor issues.",
    evidence: "Referenced in deployment_agent.py:42 and 3 unit tests in test_impact_agent.py.",
    impact: "Medium — readiness scores for all repositories will shift until re-validated.",
    recommendation: "Add a regression test comparing old vs new scores before merging.",
  },
];

const tabs = [
  { id: "editor", label: "Editor", icon: Code2 },
  { id: "summary", label: "Repository Summary", icon: Layers },
  { id: "impact", label: "Impact Analysis", icon: GitCompare },
  { id: "architecture", label: "Architecture", icon: ShieldCheck },
  { id: "docs", label: "Documentation", icon: BookOpen },
  { id: "refactor", label: "Refactoring", icon: Wrench },
  { id: "deploy", label: "Deployment Readiness", icon: Rocket },
];

/* ---------------- small building blocks ---------------- */

function Pill({ children, tone = "violet" }) {
  const tones = {
    violet: "bg-violet-100 text-violet-700",
    pink: "bg-pink-100 text-pink-700",
    stone: "bg-stone-100 text-stone-600",
    red: "bg-red-100 text-red-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${tones[tone]}`} style={body}>
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
  const [open, setOpen] = useState(depth < 1);
  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg hover:bg-violet-50 text-left transition-colors"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {open ? <ChevronDown size={13} className="text-stone-400 shrink-0" /> : <ChevronRight size={13} className="text-stone-400 shrink-0" />}
          {open ? <FolderOpen size={14} className="text-violet-400 shrink-0" /> : <Folder size={14} className="text-violet-400 shrink-0" />}
          <span className="text-[13px] text-stone-700 truncate" style={body}>{node.name}</span>
        </button>
        {open && node.children.map((c, i) => (
          <FileNode key={i} node={c} depth={depth + 1} activeFile={activeFile} setActiveFile={setActiveFile} />
        ))}
      </div>
    );
  }
  const isActive = node.name === activeFile;
  return (
    <button
      onClick={() => setActiveFile(node.name)}
      className={`flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-left transition-colors ${isActive ? "bg-violet-100" : "hover:bg-violet-50"}`}
      style={{ paddingLeft: `${depth * 14 + 26}px` }}
    >
      <FileCode size={13} className={`shrink-0 ${isActive ? "text-violet-600" : "text-stone-400"}`} />
      <span className={`text-[13px] truncate ${isActive ? "text-violet-700 font-medium" : "text-stone-600"}`} style={body}>{node.name}</span>
    </button>
  );
}

/* ---------------- explainable AI card (signature element) ---------------- */

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
      <div className="divide-y divide-stone-100">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-3 px-4 py-3">
            <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${r.tone}`}>
              <r.icon size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-wide uppercase text-stone-400" style={body}>{r.label}</div>
              <div className="text-[13px] text-stone-700 leading-snug mt-0.5" style={body}>{r.value}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- analysis tab views ---------------- */

function SummaryView() {
  const stats = [
    { label: "Files scanned", value: "312" },
    { label: "Languages", value: "Python, TS" },
    { label: "Lines of code", value: "24.6k" },
    { label: "Dependencies", value: "58" },
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
        <div className="text-[13px] font-semibold text-stone-700 mb-3" style={display}>Structure overview</div>
        <div className="space-y-2 text-[13px] text-stone-600" style={body}>
          <div className="flex items-center gap-2"><Folder size={14} className="text-violet-400" /> backend/ — FastAPI service, 6 agent modules, NVIDIA LLM client</div>
          <div className="flex items-center gap-2"><Folder size={14} className="text-pink-400" /> frontend/ — React + Vite workspace UI</div>
          <div className="flex items-center gap-2"><Folder size={14} className="text-violet-400" /> embeddings/ — temporary vector store, replaced per repository</div>
        </div>
      </Card>
    </div>
  );
}

function ImpactView() {
  const rows = [
    { file: "deployment_agent.py", reason: "Consumes ImpactAgent.score() directly", risk: "High" },
    { file: "test_impact_agent.py", reason: "3 assertions on risk thresholds", risk: "Medium" },
    { file: "orchestrator.py", reason: "Routes queries to ImpactAgent", risk: "Low" },
  ];
  const tone = { High: "red", Medium: "amber", Low: "green" };
  return (
    <div className="p-6 space-y-3">
      <div className="text-[13px] text-stone-500 mb-1" style={body}>Simulated change: editing <code style={mono}>impact_agent.py</code></div>
      {rows.map((r) => (
        <Card key={r.file} className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-medium text-stone-700" style={mono}>{r.file}</div>
            <div className="text-[12px] text-stone-500 mt-0.5" style={body}>{r.reason}</div>
          </div>
          <Pill tone={tone[r.risk]}>{r.risk} risk</Pill>
        </Card>
      ))}
    </div>
  );
}

function ArchitectureView() {
  const layers = ["API / Routes", "Agents", "LLM Client", "Embeddings Store"];
  return (
    <div className="p-6 space-y-5">
      <Card className="p-5">
        <div className="text-[13px] font-semibold text-stone-700 mb-4" style={display}>Layer flow</div>
        <div className="flex items-center gap-2 flex-wrap">
          {layers.map((l, i) => (
            <React.Fragment key={l}>
              <div className="px-3 py-2 rounded-xl bg-violet-50 border border-violet-100 text-[12px] text-violet-700 font-medium" style={body}>{l}</div>
              {i < layers.length - 1 && <ChevronRight size={14} className="text-stone-300" />}
            </React.Fragment>
          ))}
        </div>
      </Card>
      <Card className="p-4 flex items-start gap-3 border-amber-100 bg-amber-50/40">
        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[13px] text-stone-700" style={body}>
          <span className="font-medium">Layering violation:</span> <code style={mono}>orchestrator.py</code> imports directly from <code style={mono}>embeddings/vector_search.py</code>, skipping the agent layer.
        </div>
      </Card>
    </div>
  );
}

function DocsView() {
  const items = [
    { fn: "classify_intent()", file: "orchestrator.py" },
    { fn: "find_callers()", file: "impact_agent.py" },
  ];
  return (
    <div className="p-6 space-y-3">
      {items.map((it) => (
        <Card key={it.fn} className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-medium text-stone-700" style={mono}>{it.fn}</div>
            <Pill tone="stone">{it.file}</Pill>
          </div>
          <div className="mt-2 text-[12px] text-stone-500 italic" style={body}>No docstring found — suggested:</div>
          <div className="mt-1 text-[12px] text-stone-600 bg-stone-50 rounded-lg p-2" style={mono}>
            """Routes an incoming query to the matching agent based on detected intent."""
          </div>
        </Card>
      ))}
    </div>
  );
}

function RefactorView() {
  const smells = [
    { title: "Long method", loc: "route() — 42 lines", tone: "amber" },
    { title: "Duplicate logic", loc: "score() mirrors risk calc in deployment_agent.py", tone: "red" },
    { title: "Unclear naming", loc: "variable `x` in vector_search.py:18", tone: "stone" },
  ];
  return (
    <div className="p-6 space-y-3">
      {smells.map((s) => (
        <Card key={s.title} className="p-4 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-pink-400 shrink-0" />
          <div>
            <div className="text-[13px] font-medium text-stone-700" style={body}>{s.title}</div>
            <div className="text-[12px] text-stone-500" style={body}>{s.loc}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function DeployView() {
  const score = 78;
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
        <div className="text-[12px] text-stone-500 mt-2" style={body}>Readiness score</div>
      </Card>
      <Card className="p-4 col-span-2">
        <div className="text-[12px] font-semibold text-red-500 uppercase tracking-wide mb-2" style={body}>Critical issues</div>
        <div className="flex items-center gap-2 text-[13px] text-stone-600 mb-1" style={body}><X size={13} className="text-red-500" /> Circular dependency: agents ↔ embeddings</div>
        <div className="text-[12px] font-semibold text-amber-500 uppercase tracking-wide mt-4 mb-2" style={body}>Minor issues</div>
        <div className="flex items-center gap-2 text-[13px] text-stone-600" style={body}><Circle size={8} className="text-amber-400 fill-amber-400" /> 2 undocumented public methods</div>
      </Card>
    </div>
  );
}

/* ---------------- editor ---------------- */

function EditorView({ activeFile, setActiveFile }) {
  const lines = codeLines[activeFile] || [];
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-stone-200 bg-white">
        {openFiles.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFile(f)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] border-r border-stone-100 ${f === activeFile ? "bg-stone-50 text-stone-800 font-medium" : "text-stone-400 hover:text-stone-600"}`}
            style={body}
          >
            <FileCode size={13} /> {f}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto bg-white p-4" style={mono}>
        {lines.map((line, i) => (
          <div key={i} className="flex text-[13px] leading-6">
            <span className="w-8 text-stone-300 select-none text-right pr-3">{i + 1}</span>
            <span className="text-stone-700 whitespace-pre">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- chat ---------------- */

function ChatPanel({ onClose }) {
  const [value, setValue] = useState("");
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
            className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
            title="Collapse AI Chat box (>)"
          >
            <ChevronRight size={15} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
      </div>
      <div className="p-3 border-t border-stone-200">
        <div className="bg-stone-50 rounded-full border border-stone-200 flex items-center pl-4 pr-1.5 py-1.5">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ask about this repository..."
            className="flex-1 bg-transparent text-[13px] outline-none text-stone-700 placeholder:text-stone-400"
            style={body}
          />
          <button className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center shrink-0">
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- nav ---------------- */

function TopNav() {
  return (
    <div className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-stone-200 bg-white/90 backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-pink-300 flex items-center justify-center">
          <Layers size={14} className="text-white" />
        </div>
        <span className="text-[14px] font-semibold text-stone-800" style={display}>AI Codebase Intelligence</span>
      </div>
      <div className="flex-1 max-w-md mx-8 hidden md:block">
        <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-full px-3.5 py-1.5">
          <Search size={13} className="text-stone-400" />
          <input placeholder="Search files, classes, functions..." className="bg-transparent text-[12.5px] outline-none flex-1 text-stone-600 placeholder:text-stone-400" style={body} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1.5 text-[12.5px] text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-full border border-stone-200" style={body}>
          <GitBranch size={13} /> Clone
        </button>
        <button className="flex items-center gap-1.5 text-[12.5px] text-white bg-stone-900 px-3 py-1.5 rounded-full" style={body}>
          <Upload size={13} /> Upload folder
        </button>
        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
          <User size={14} className="text-pink-500" />
        </div>
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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] whitespace-nowrap transition-colors ${
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

/* ---------------- app ---------------- */

export default function App() {
  const [activeTab, setActiveTab] = useState("editor");
  const [activeFile, setActiveFile] = useState("orchestrator.py");
  const [isFolderOpen, setIsFolderOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);

  const renderCenter = () => {
    switch (activeTab) {
      case "editor": return <EditorView activeFile={activeFile} setActiveFile={setActiveFile} />;
      case "summary": return <SummaryView />;
      case "impact": return <ImpactView />;
      case "architecture": return <ArchitectureView />;
      case "docs": return <DocsView />;
      case "refactor": return <RefactorView />;
      case "deploy": return <DeployView />;
      default: return null;
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-stone-50" style={body}>
      <style>{FONT_IMPORT}</style>
      <TopNav />
      <SecondNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 min-h-0 flex relative">
        {/* Left Folder Panel */}
        {isFolderOpen ? (
          <div className="w-60 shrink-0 border-r border-stone-200 bg-white overflow-y-auto py-2 px-1.5 flex flex-col">
            <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-stone-100">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide" style={body}>Repository Explorer</span>
              <button
                onClick={() => setIsFolderOpen(false)}
                className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                title="Collapse Folders (<)"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {fileTree.map((n, i) => (
                <FileNode key={i} node={n} depth={0} activeFile={activeFile} setActiveFile={setActiveFile} />
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsFolderOpen(true)}
            className="h-full px-2 bg-white border-r border-stone-200 hover:bg-violet-50 text-stone-500 hover:text-violet-700 flex flex-col items-center py-4 gap-3 transition-colors shrink-0 group"
            title="Expand Folders (>)"
          >
            <div className="p-1 rounded group-hover:bg-violet-100">
              <ChevronRight size={16} />
            </div>
            <Folder size={15} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 [writing-mode:vertical-lr] rotate-180">Folders</span>
          </button>
        )}

        {/* Center Workspace Content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {renderCenter()}
        </div>

        {/* Right AI Chat Box Panel */}
        {isChatOpen ? (
          <div className="w-[340px] shrink-0 border-l border-stone-200 bg-white">
            <ChatPanel onClose={() => setIsChatOpen(false)} />
          </div>
        ) : (
          <button
            onClick={() => setIsChatOpen(true)}
            className="h-full px-2 bg-white border-l border-stone-200 hover:bg-violet-50 text-stone-500 hover:text-violet-700 flex flex-col items-center py-4 gap-3 transition-colors shrink-0 group"
            title="Expand AI Chat Box (<)"
          >
            <div className="p-1 rounded group-hover:bg-violet-100">
              <ChevronLeft size={16} />
            </div>
            <Sparkles size={15} className="text-violet-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 [writing-mode:vertical-lr] rotate-180">AI Chat</span>
          </button>
        )}
      </div>
    </div>
  );
}
