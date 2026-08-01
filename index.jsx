import { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard,
  BookOpen,
  ListChecks,
  RotateCcw,
  Target,
  Plus,
  Trash2,
  ChevronDown,
  ChevronLeft,
  Flame,
  CalendarClock,
  Star,
  Check,
  X,
  MoreHorizontal,
  ClipboardList,
  BarChart3,
  Grid3x3,
  Sparkles,
  PenSquare,
  Timer,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Download,
  Upload,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const STATUSES = [
  "Not Started",
  "Studying",
  "First Revision",
  "Second Revision",
  "Mastered",
];

const STATUS_WEIGHT = {
  "Not Started": 0,
  Studying: 0.25,
  "First Revision": 0.5,
  "Second Revision": 0.75,
  Mastered: 1,
};

const STATUS_COLOR = {
  "Not Started": "#8A8A85",
  Studying: "#C9A961",
  "First Revision": "#7695B8",
  "Second Revision": "#7695B8",
  Mastered: "#6B8F67",
};

const SUBJECT_META = {
  physics: { label: "Physics", accent: "#C9A961" },
  chemistry: { label: "Chemistry", accent: "#7695B8" },
  maths: { label: "Mathematics", accent: "#B0855F" },
};

// theme-driven CSS variables — actual values injected via <style> in App
const CARD_BG = "var(--surface)";
const CARD_BORDER = "var(--border)";
const SURFACE_2 = "var(--surface-2)";
const TEXT_PRIMARY = "var(--text-primary)";
const TEXT_SECONDARY = "var(--text-secondary)";
const TEXT_TERTIARY = "var(--text-tertiary)";
const ACCENT = "var(--accent)";
const DANGER = "var(--danger)";
const SUCCESS = "var(--success)";
const INFO = "var(--info)";
const ON_ACCENT = "var(--on-accent)";
const SUCCESS_TINT = "var(--success-tint)";
const DANGER_TINT = "var(--danger-tint)";
const DANGER_BORDER = "var(--danger-border)";

const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

const daysBetween = (a, b) => {
  const ms = new Date(b) - new Date(a);
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

const uid = () => Math.random().toString(36).slice(2, 9);

const fmtShortDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const defaultChapter = (name) => ({
  id: uid(),
  name,
  status: "Not Started",
  lecturesCompleted: 0,
  lecturesTotal: 10,
  dppDone: false,
  pyqsCompleted: 0,
  pyqsTotal: 20,
  notesDone: false,
  formulaSheetDone: false,
  confidence: 0,
  lastRevised: null,
  revisions: { r1: false, r2: false, r3: false },
});

const DEFAULT_DATA = {
  subjects: {
    physics: [
      "Units and Measurements",
      "Kinematics",
      "Laws of Motion",
      "Work, Energy & Power",
      "Rotational Motion",
    ].map(defaultChapter),
    chemistry: [
      "Mole Concept",
      "Atomic Structure",
      "Chemical Bonding",
      "States of Matter",
      "Thermodynamics",
    ].map(defaultChapter),
    maths: [
      "Sets, Relations & Functions",
      "Complex Numbers",
      "Quadratic Equations",
      "Sequences & Series",
      "Trigonometry",
    ].map(defaultChapter),
  },
  dailyTasksByDate: {},
  streakDates: [],
  goals: {
    mainGoal: "JEE Main 99+ Percentile",
    examDate: "2027-01-24",
    miniGoals: [],
  },
  tests: [],
  studySessions: [],
  progressHistory: {},
  theme: "dark",
};

const DEFAULT_TASK_TEXTS = [
  "Watch lecture",
  "Complete DPP",
  "Solve PYQs",
  "Revise formulas",
];

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_KEY = "jee-dashboard-data";

async function loadData() {
  try {
    const res = await window.storage.get(STORAGE_KEY, false);
    if (res && res.value) return { ...DEFAULT_DATA, ...JSON.parse(res.value) };
  } catch (e) {
    // key doesn't exist yet
  }
  return DEFAULT_DATA;
}

async function saveData(data) {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(data), false);
  } catch (e) {
    console.error("Storage save failed:", e);
  }
}

// ---------------------------------------------------------------------------
// Small UI primitives
// ---------------------------------------------------------------------------

function ProgressBar({ value, accent = ACCENT, height = 6 }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: SURFACE_2 }}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: accent }}
      />
    </div>
  );
}

function StatCard({ label, value, sub, mono = true }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1 border" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
      <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>{label}</span>
      <span className={`text-2xl font-semibold ${mono ? "font-mono" : ""}`} style={{ color: TEXT_PRIMARY, letterSpacing: mono ? "-0.02em" : "normal" }}>
        {value}
      </span>
      {sub && <span className="text-xs" style={{ color: TEXT_TERTIARY }}>{sub}</span>}
    </div>
  );
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n === value ? 0 : n)} className="focus:outline-none" style={{ color: n <= value ? ACCENT : SURFACE_2 }} aria-label={`Confidence ${n}`}>
          <Star size={16} fill={n <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs" style={{ color: TEXT_SECONDARY }}>
      {label}
      {children}
    </label>
  );
}

function TextInput(props) {
  const inputStyle = { background: SURFACE_2, color: TEXT_PRIMARY, border: `1px solid ${CARD_BORDER}` };
  return <input {...props} className={`rounded-lg px-2.5 py-2 text-sm focus:outline-none ${props.className || ""}`} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

function SectionCard({ children, style }) {
  return (
    <div className="rounded-2xl p-4 border" style={{ background: CARD_BG, borderColor: CARD_BORDER, ...style }}>
      {children}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg px-2.5 py-1.5 text-xs" style={{ background: SURFACE_2, border: `1px solid ${CARD_BORDER}`, color: TEXT_PRIMARY }}>
      <div style={{ color: TEXT_TERTIARY }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insights engine
// ---------------------------------------------------------------------------

function computeInsights({ subjects, tests, streakDates }) {
  const insights = [];
  const allChapters = [];
  Object.entries(subjects).forEach(([key, chapters]) =>
    chapters.forEach((c) => allChapters.push({ ...c, subjectKey: key }))
  );

  let mostOverdue = null;
  allChapters.forEach((c) => {
    if (c.status === "Not Started" || c.status === "Mastered") return;
    const days = c.lastRevised ? daysBetween(c.lastRevised, todayKey()) : 999;
    if (days > 10 && (!mostOverdue || days > mostOverdue.days)) mostOverdue = { days, chapter: c };
  });
  if (mostOverdue) {
    insights.push(`You haven't revised ${mostOverdue.chapter.name} in ${SUBJECT_META[mostOverdue.chapter.subjectKey].label} for ${mostOverdue.days} days.`);
  }

  let lowestDpp = null;
  Object.entries(subjects).forEach(([key, chapters]) => {
    const started = chapters.filter((c) => c.status !== "Not Started");
    if (!started.length) return;
    const pct = Math.round((started.filter((c) => c.dppDone).length / started.length) * 100);
    if (!lowestDpp || pct < lowestDpp.pct) lowestDpp = { key, pct };
  });
  if (lowestDpp && lowestDpp.pct < 60) insights.push(`${SUBJECT_META[lowestDpp.key].label} DPP completion is only ${lowestDpp.pct}%.`);

  if (tests.length >= 2) {
    const sorted = [...tests].sort((a, b) => new Date(a.date) - new Date(b.date));
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    if (last.accuracy != null && prev.accuracy != null) {
      const delta = last.accuracy - prev.accuracy;
      if (Math.abs(delta) >= 1) insights.push(`Accuracy has ${delta > 0 ? "improved" : "dropped"} by ${Math.abs(Math.round(delta))}% since your last test.`);
    }
  }

  const total = allChapters.length;
  const score = allChapters.reduce((s, c) => s + STATUS_WEIGHT[c.status], 0);
  const pct = total ? (score / total) * 100 : 0;
  const nextMilestone = Math.ceil((pct + 0.01) / 25) * 25;
  if (nextMilestone <= 100 && total > 0) {
    const chaptersNeeded = Math.max(1, Math.ceil((nextMilestone / 100) * total - score));
    insights.push(`Complete ${chaptersNeeded} more chapter${chaptersNeeded > 1 ? "s" : ""} to reach ${nextMilestone}% syllabus.`);
  }

  if (streakDates.length === 0) insights.push("Log today's tasks to start your streak.");

  return insights.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Dashboard tab
// ---------------------------------------------------------------------------

function DashboardTab({ goals, stats, insights }) {
  const { overallPct, subjectPct, chaptersDone, chaptersTotal, streak, daysLeft, todayPct, weekPct, monthPct } = stats;

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: TEXT_PRIMARY }}>{overallPct}%</h1>
        <p className="text-sm mt-1" style={{ color: TEXT_SECONDARY }}>of syllabus complete &middot; {chaptersDone}/{chaptersTotal} chapters mastered</p>
        <div className="mt-3"><ProgressBar value={overallPct} /></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Streak" value={streak} sub={streak === 1 ? "day" : "days"} />
        <StatCard label="Days to Exam" value={daysLeft >= 0 ? daysLeft : "—"} sub={daysLeft >= 0 ? "remaining" : "set a date"} />
        <StatCard label="Today" value={`${todayPct}%`} sub="tasks done" />
        <StatCard label="This Week" value={`${weekPct}%`} sub="days active" />
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Subject-wise progress</span>
        {Object.entries(SUBJECT_META).map(([key, meta]) => (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span style={{ color: TEXT_PRIMARY }}>{meta.label}</span>
              <span className="font-mono" style={{ color: TEXT_SECONDARY }}>{subjectPct[key]}%</span>
            </div>
            <ProgressBar value={subjectPct[key]} accent={meta.accent} />
          </div>
        ))}
      </div>

      <SectionCard>
        <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>This month</span>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xl font-mono font-semibold" style={{ color: TEXT_PRIMARY }}>{monthPct}%</span>
          <span className="text-xs" style={{ color: TEXT_TERTIARY }}>days with activity logged</span>
        </div>
        <div className="mt-2"><ProgressBar value={monthPct} accent={INFO} /></div>
      </SectionCard>

      {insights.length > 0 && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} color="#C9A961" />
            <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Insight</span>
          </div>
          <p className="text-sm" style={{ color: TEXT_PRIMARY }}>{insights[0]}</p>
        </SectionCard>
      )}

      <SectionCard>
        <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Main goal</span>
        <p className="text-lg mt-1" style={{ color: TEXT_PRIMARY }}>{goals.mainGoal || "Set a goal in the Goals tab"}</p>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subject Tracker tab
// ---------------------------------------------------------------------------

function ChapterCard({ chapter, accent, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const update = (patch) => onUpdate({ ...chapter, ...patch });
  const inputStyle = { background: SURFACE_2, color: TEXT_PRIMARY, border: `1px solid ${CARD_BORDER}` };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: TEXT_PRIMARY }}>{chapter.name}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: SURFACE_2, color: STATUS_COLOR[chapter.status], border: `1px solid ${STATUS_COLOR[chapter.status]}33` }}>
              {chapter.status}
            </span>
            {chapter.confidence > 0 && (
              <span className="text-xs flex items-center gap-0.5" style={{ color: TEXT_SECONDARY }}>
                <Star size={11} fill="#C9A961" color="#C9A961" />{chapter.confidence}
              </span>
            )}
          </div>
        </div>
        <ChevronDown size={18} className="transition-transform duration-300 flex-shrink-0 ml-2" style={{ color: TEXT_TERTIARY, transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t" style={{ borderColor: CARD_BORDER }}>
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Field label="Status">
              <select value={chapter.status} onChange={(e) => update({ status: e.target.value })} className="rounded-lg px-2 py-2 text-sm focus:outline-none" style={inputStyle}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Last revised">
              <TextInput type="date" value={chapter.lastRevised || ""} onChange={(e) => update({ lastRevised: e.target.value || null })} className="font-mono" />
            </Field>
            <Field label="Lectures">
              <div className="flex items-center gap-1">
                <TextInput type="number" min="0" value={chapter.lecturesCompleted} onChange={(e) => update({ lecturesCompleted: Number(e.target.value) })} className="w-full font-mono" />
                <span style={{ color: TEXT_TERTIARY }}>/</span>
                <TextInput type="number" min="0" value={chapter.lecturesTotal} onChange={(e) => update({ lecturesTotal: Number(e.target.value) })} className="w-full font-mono" />
              </div>
            </Field>
            <Field label="PYQs solved">
              <div className="flex items-center gap-1">
                <TextInput type="number" min="0" value={chapter.pyqsCompleted} onChange={(e) => update({ pyqsCompleted: Number(e.target.value) })} className="w-full font-mono" />
                <span style={{ color: TEXT_TERTIARY }}>/</span>
                <TextInput type="number" min="0" value={chapter.pyqsTotal} onChange={(e) => update({ pyqsTotal: Number(e.target.value) })} className="w-full font-mono" />
              </div>
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            {[["dppDone", "DPP done"], ["notesDone", "Short notes"], ["formulaSheetDone", "Formula sheet"]].map(([key, label]) => (
              <button key={key} onClick={() => update({ [key]: !chapter[key] })} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors" style={{ background: chapter[key] ? `${accent}1A` : SURFACE_2, borderColor: chapter[key] ? accent : CARD_BORDER, color: chapter[key] ? accent : TEXT_SECONDARY }}>
                {chapter[key] && <Check size={12} />}{label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: TEXT_SECONDARY }}>Confidence</span>
            <StarRating value={chapter.confidence} onChange={(v) => update({ confidence: v })} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: TEXT_SECONDARY }}>Revisions</span>
            <div className="flex gap-2">
              {["r1", "r2", "r3"].map((r, i) => (
                <button key={r} onClick={() => update({ revisions: { ...chapter.revisions, [r]: !chapter.revisions[r] } })} className="text-xs px-2.5 py-1 rounded-full border" style={{ background: chapter.revisions[r] ? SUCCESS_TINT : SURFACE_2, borderColor: chapter.revisions[r] ? SUCCESS : CARD_BORDER, color: chapter.revisions[r] ? SUCCESS : TEXT_SECONDARY }}>
                  R{i + 1}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => onDelete(chapter.id)} className="flex items-center gap-1.5 text-xs self-start" style={{ color: DANGER }}>
            <Trash2 size={13} />Remove chapter
          </button>
        </div>
      )}
    </div>
  );
}

function SubjectTrackerTab({ subjects, setSubjects }) {
  const [activeSubject, setActiveSubject] = useState("physics");
  const [newChapterName, setNewChapterName] = useState("");
  const chapters = subjects[activeSubject];
  const accent = SUBJECT_META[activeSubject].accent;

  const updateChapter = (updated) =>
    setSubjects((prev) => ({ ...prev, [activeSubject]: prev[activeSubject].map((c) => (c.id === updated.id ? updated : c)) }));
  const deleteChapter = (id) =>
    setSubjects((prev) => ({ ...prev, [activeSubject]: prev[activeSubject].filter((c) => c.id !== id) }));
  const addChapter = () => {
    const name = newChapterName.trim();
    if (!name) return;
    setSubjects((prev) => ({ ...prev, [activeSubject]: [...prev[activeSubject], defaultChapter(name)] }));
    setNewChapterName("");
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex gap-2">
        {Object.entries(SUBJECT_META).map(([key, meta]) => (
          <button key={key} onClick={() => setActiveSubject(key)} className="flex-1 text-sm py-2.5 rounded-xl border transition-colors" style={{ background: activeSubject === key ? SURFACE_2 : "transparent", borderColor: activeSubject === key ? meta.accent : CARD_BORDER, color: activeSubject === key ? TEXT_PRIMARY : TEXT_SECONDARY }}>
            {meta.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {chapters.map((c) => (
          <ChapterCard key={c.id} chapter={c} accent={accent} onUpdate={updateChapter} onDelete={deleteChapter} />
        ))}
        {chapters.length === 0 && <p className="text-sm text-center py-6" style={{ color: TEXT_TERTIARY }}>No chapters yet — add your first one below.</p>}
      </div>

      <div className="flex gap-2">
        <TextInput value={newChapterName} onChange={(e) => setNewChapterName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addChapter()} placeholder="Add a chapter…" className="flex-1" />
        <button onClick={addChapter} className="rounded-xl px-4 flex items-center justify-center" style={{ background: ACCENT, color: ON_ACCENT }}><Plus size={18} /></button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Daily Planner tab
// ---------------------------------------------------------------------------

function PlannerTab({ dailyTasksByDate, setDailyTasksByDate }) {
  const [newTask, setNewTask] = useState("");
  const key = todayKey();
  const tasks = dailyTasksByDate[key] || [];

  const setTasks = (updater) =>
    setDailyTasksByDate((prev) => ({ ...prev, [key]: typeof updater === "function" ? updater(prev[key] || []) : updater }));

  const addTask = (text) => {
    const t = text.trim();
    if (!t) return;
    setTasks((prev) => [...prev, { id: uid(), text: t, done: false }]);
    setNewTask("");
  };
  const toggleTask = (id) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const removeTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const addDefaults = () =>
    setTasks((prev) => [...prev, ...DEFAULT_TASK_TEXTS.filter((t) => !prev.some((p) => p.text === t)).map((text) => ({ id: uid(), text, done: false }))]);

  const pct = tasks.length ? Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-medium" style={{ color: TEXT_PRIMARY }}>Today's Goals</h2>
          <span className="text-sm font-mono" style={{ color: TEXT_SECONDARY }}>{pct}%</span>
        </div>
        <div className="mt-2"><ProgressBar value={pct} /></div>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-3 border" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
            <button onClick={() => toggleTask(t.id)} className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0" style={{ borderColor: t.done ? SUCCESS : TEXT_TERTIARY, background: t.done ? SUCCESS : "transparent" }}>
              {t.done && <Check size={13} color={ON_ACCENT} />}
            </button>
            <span className="flex-1 text-sm" style={{ color: t.done ? TEXT_TERTIARY : TEXT_PRIMARY, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
            <button onClick={() => removeTask(t.id)} style={{ color: TEXT_TERTIARY }}><X size={15} /></button>
          </div>
        ))}
        {tasks.length === 0 && <p className="text-sm text-center py-6" style={{ color: TEXT_TERTIARY }}>Nothing planned yet for today.</p>}
      </div>

      <div className="flex gap-2">
        <TextInput value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask(newTask)} placeholder="Add a task…" className="flex-1" />
        <button onClick={() => addTask(newTask)} className="rounded-xl px-4 flex items-center justify-center" style={{ background: ACCENT, color: ON_ACCENT }}><Plus size={18} /></button>
      </div>

      <button onClick={addDefaults} className="text-xs self-start" style={{ color: INFO }}>+ add standard checklist (lecture, DPP, PYQs, formulas)</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revision Tracker tab
// ---------------------------------------------------------------------------

function RevisionTab({ subjects }) {
  const rows = useMemo(() => {
    const all = [];
    Object.entries(subjects).forEach(([subjectKey, chapters]) => {
      chapters.forEach((c) => {
        if (c.status === "Not Started") return;
        const daysSince = c.lastRevised ? daysBetween(c.lastRevised, todayKey()) : null;
        const overdue = c.status !== "Mastered" && (daysSince === null || daysSince > 14);
        all.push({ subjectKey, chapter: c, daysSince, overdue });
      });
    });
    return all.sort((a, b) => (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0));
  }, [subjects]);

  return (
    <div className="flex flex-col gap-2.5 pb-4">
      {rows.length === 0 && <p className="text-sm text-center py-6" style={{ color: TEXT_TERTIARY }}>Start a chapter in Subjects to see it here.</p>}
      {rows.map(({ subjectKey, chapter, daysSince, overdue }) => (
        <div key={chapter.id} className="rounded-xl p-3.5 border flex items-center justify-between gap-3" style={{ background: CARD_BG, borderColor: overdue ? DANGER_BORDER : CARD_BORDER }}>
          <div className="min-w-0">
            <p className="text-sm truncate" style={{ color: TEXT_PRIMARY }}>{chapter.name}</p>
            <p className="text-xs mt-0.5" style={{ color: TEXT_TERTIARY }}>{SUBJECT_META[subjectKey].label} · {daysSince === null ? "never revised" : `${daysSince}d ago`}</p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            {["r1", "r2", "r3"].map((r, i) => (
              <span key={r} className="text-xs w-6 h-6 rounded-full flex items-center justify-center" style={{ background: chapter.revisions[r] ? SUCCESS_TINT : SURFACE_2, color: chapter.revisions[r] ? SUCCESS : TEXT_TERTIARY, border: `1px solid ${chapter.revisions[r] ? SUCCESS : CARD_BORDER}` }}>{i + 1}</span>
            ))}
          </div>
          {overdue && <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{ color: DANGER, background: DANGER_TINT }}>overdue</span>}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Goals tab
// ---------------------------------------------------------------------------

function GoalsTab({ goals, setGoals }) {
  const [newMini, setNewMini] = useState("");
  const [newDeadline, setNewDeadline] = useState("");

  const addMini = () => {
    const text = newMini.trim();
    if (!text) return;
    setGoals((prev) => ({ ...prev, miniGoals: [...prev.miniGoals, { id: uid(), text, deadline: newDeadline || null, done: false }] }));
    setNewMini(""); setNewDeadline("");
  };
  const toggleMini = (id) => setGoals((prev) => ({ ...prev, miniGoals: prev.miniGoals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)) }));
  const removeMini = (id) => setGoals((prev) => ({ ...prev, miniGoals: prev.miniGoals.filter((g) => g.id !== id) }));

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Main goal</label>
        <TextInput value={goals.mainGoal} onChange={(e) => setGoals((prev) => ({ ...prev, mainGoal: e.target.value }))} className="text-base py-3" />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Exam date</label>
        <TextInput type="date" value={goals.examDate} onChange={(e) => setGoals((prev) => ({ ...prev, examDate: e.target.value }))} className="text-base py-3 font-mono" />
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Mini goals</span>
        {goals.miniGoals.map((g) => (
          <div key={g.id} className="flex items-center gap-3 rounded-xl px-3 py-3 border" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
            <button onClick={() => toggleMini(g.id)} className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0" style={{ borderColor: g.done ? SUCCESS : TEXT_TERTIARY, background: g.done ? SUCCESS : "transparent" }}>
              {g.done && <Check size={13} color={ON_ACCENT} />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: g.done ? TEXT_TERTIARY : TEXT_PRIMARY, textDecoration: g.done ? "line-through" : "none" }}>{g.text}</p>
              {g.deadline && <p className="text-xs font-mono" style={{ color: TEXT_TERTIARY }}>by {g.deadline}</p>}
            </div>
            <button onClick={() => removeMini(g.id)} style={{ color: TEXT_TERTIARY }}><X size={15} /></button>
          </div>
        ))}
        <div className="flex flex-col gap-2">
          <TextInput value={newMini} onChange={(e) => setNewMini(e.target.value)} placeholder="e.g. Finish Electrostatics before Sunday" />
          <div className="flex gap-2">
            <TextInput type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className="flex-1 font-mono" />
            <button onClick={addMini} className="rounded-xl px-4 flex items-center justify-center" style={{ background: ACCENT, color: ON_ACCENT }}><Plus size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tests tab
// ---------------------------------------------------------------------------

function AddTestForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    date: todayKey(), name: "", type: "Full", physics: "", chemistry: "", maths: "",
    maxMarks: "300", accuracy: "", rank: "", timeTaken: "", mistakes: "", weakTopics: "",
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const inputStyle = { background: SURFACE_2, color: TEXT_PRIMARY, border: `1px solid ${CARD_BORDER}` };

  const submit = () => {
    if (!form.name.trim()) return;
    const p = Number(form.physics) || 0, c = Number(form.chemistry) || 0, m = Number(form.maths) || 0;
    const total = p + c + m;
    const maxMarks = Number(form.maxMarks) || 300;
    onSave({
      id: uid(), date: form.date, name: form.name.trim(), type: form.type,
      physics: p, chemistry: c, maths: m, total, maxMarks,
      percentage: Math.round((total / maxMarks) * 100),
      accuracy: form.accuracy === "" ? null : Number(form.accuracy),
      rank: form.rank === "" ? null : Number(form.rank),
      timeTaken: form.timeTaken === "" ? null : Number(form.timeTaken),
      mistakes: form.mistakes.trim(), weakTopics: form.weakTopics.trim(),
    });
  };

  return (
    <SectionCard>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><TextInput type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} className="font-mono" /></Field>
          <Field label="Type">
            <select value={form.type} onChange={(e) => set({ type: e.target.value })} className="rounded-lg px-2 py-2 text-sm focus:outline-none" style={inputStyle}>
              <option value="Full">Full Test</option>
              <option value="Part">Part Test</option>
            </select>
          </Field>
        </div>
        <Field label="Test name"><TextInput value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. FIITJEE AITS 4" /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Physics"><TextInput type="number" value={form.physics} onChange={(e) => set({ physics: e.target.value })} className="font-mono" /></Field>
          <Field label="Chemistry"><TextInput type="number" value={form.chemistry} onChange={(e) => set({ chemistry: e.target.value })} className="font-mono" /></Field>
          <Field label="Maths"><TextInput type="number" value={form.maths} onChange={(e) => set({ maths: e.target.value })} className="font-mono" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Max marks"><TextInput type="number" value={form.maxMarks} onChange={(e) => set({ maxMarks: e.target.value })} className="font-mono" /></Field>
          <Field label="Accuracy %"><TextInput type="number" value={form.accuracy} onChange={(e) => set({ accuracy: e.target.value })} className="font-mono" /></Field>
          <Field label="Rank (optional)"><TextInput type="number" value={form.rank} onChange={(e) => set({ rank: e.target.value })} className="font-mono" /></Field>
          <Field label="Time taken (min)"><TextInput type="number" value={form.timeTaken} onChange={(e) => set({ timeTaken: e.target.value })} className="font-mono" /></Field>
        </div>
        <Field label="Mistakes / notes"><TextInput value={form.mistakes} onChange={(e) => set({ mistakes: e.target.value })} placeholder="Silly calculation errors in mechanics" /></Field>
        <Field label="Weak topics"><TextInput value={form.weakTopics} onChange={(e) => set({ weakTopics: e.target.value })} placeholder="Rotational motion, Organic reactions" /></Field>
        <div className="flex gap-2 mt-1">
          <button onClick={submit} className="flex-1 rounded-xl py-2.5 text-sm font-medium" style={{ background: ACCENT, color: ON_ACCENT }}>Save test</button>
          <button onClick={onCancel} className="rounded-xl px-4 py-2.5 text-sm" style={{ background: SURFACE_2, color: TEXT_SECONDARY }}>Cancel</button>
        </div>
      </div>
    </SectionCard>
  );
}

function TestsTab({ tests, setTests, formOpen, setFormOpen }) {
  const sorted = useMemo(() => [...tests].sort((a, b) => new Date(a.date) - new Date(b.date)), [tests]);
  const chartData = sorted.map((t) => ({ label: fmtShortDate(t.date), marks: t.total, accuracy: t.accuracy ?? 0 }));

  const subjectAvg = useMemo(() => {
    if (!tests.length) return [];
    const avg = (k) => Math.round(tests.reduce((s, t) => s + t[k], 0) / tests.length);
    return [
      { name: "Physics", value: avg("physics") },
      { name: "Chemistry", value: avg("chemistry") },
      { name: "Maths", value: avg("maths") },
    ];
  }, [tests]);

  const removeTest = (id) => setTests((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium" style={{ color: TEXT_PRIMARY }}>Test History</h2>
        {!formOpen && (
          <button onClick={() => setFormOpen(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full" style={{ background: ACCENT, color: ON_ACCENT }}>
            <Plus size={13} />Add test
          </button>
        )}
      </div>

      {formOpen && <AddTestForm onSave={(t) => { setTests((prev) => [...prev, t]); setFormOpen(false); }} onCancel={() => setFormOpen(false)} />}

      {tests.length > 1 && (
        <>
          <SectionCard>
            <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Marks improvement</span>
            <div className="h-40 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="marks" name="Marks" stroke="#C9A961" strokeWidth={2} dot={{ r: 3, fill: "#C9A961" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard>
            <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Accuracy trend</span>
            <div className="h-40 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#7695B8" strokeWidth={2} dot={{ r: 3, fill: "#7695B8" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard>
            <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Subject-wise average</span>
            <div className="h-40 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectAvg} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Avg marks" fill="#B0855F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </>
      )}

      <div className="flex flex-col gap-2.5">
        {[...tests].sort((a, b) => new Date(b.date) - new Date(a.date)).map((t) => (
          <div key={t.id} className="rounded-xl p-3.5 border" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{t.name}</p>
                <p className="text-xs mt-0.5 font-mono" style={{ color: TEXT_TERTIARY }}>{fmtShortDate(t.date)} · {t.type}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono font-semibold" style={{ color: TEXT_PRIMARY }}>{t.percentage}%</span>
                <button onClick={() => removeTest(t.id)} style={{ color: TEXT_TERTIARY }}><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex gap-4 mt-2 text-xs font-mono" style={{ color: TEXT_SECONDARY }}>
              <span>P {t.physics}</span><span>C {t.chemistry}</span><span>M {t.maths}</span>
              {t.accuracy != null && <span>Acc {t.accuracy}%</span>}
              {t.rank != null && <span>Rank {t.rank}</span>}
            </div>
            {t.weakTopics && <p className="text-xs mt-2" style={{ color: TEXT_TERTIARY }}>Weak: {t.weakTopics}</p>}
          </div>
        ))}
        {tests.length === 0 && !formOpen && <p className="text-sm text-center py-6" style={{ color: TEXT_TERTIARY }}>No tests logged yet.</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Practice tab (DPP & PYQ)
// ---------------------------------------------------------------------------

function PracticeTab({ subjects, setSubjects }) {
  const [activeSubject, setActiveSubject] = useState("physics");
  const chapters = subjects[activeSubject].filter((c) => c.status !== "Not Started");

  const toggleDpp = (chapterId) =>
    setSubjects((prev) => ({ ...prev, [activeSubject]: prev[activeSubject].map((c) => (c.id === chapterId ? { ...c, dppDone: !c.dppDone } : c)) }));
  const bumpPyq = (chapterId, delta) =>
    setSubjects((prev) => ({ ...prev, [activeSubject]: prev[activeSubject].map((c) => (c.id === chapterId ? { ...c, pyqsCompleted: Math.max(0, Math.min(c.pyqsTotal, c.pyqsCompleted + delta)) } : c)) }));

  const dppDone = chapters.filter((c) => c.dppDone).length;
  const pyqSolved = chapters.reduce((s, c) => s + c.pyqsCompleted, 0);
  const pyqTotal = chapters.reduce((s, c) => s + c.pyqsTotal, 0);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex gap-2">
        {Object.entries(SUBJECT_META).map(([key, meta]) => (
          <button key={key} onClick={() => setActiveSubject(key)} className="flex-1 text-sm py-2.5 rounded-xl border transition-colors" style={{ background: activeSubject === key ? SURFACE_2 : "transparent", borderColor: activeSubject === key ? meta.accent : CARD_BORDER, color: activeSubject === key ? TEXT_PRIMARY : TEXT_SECONDARY }}>
            {meta.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="DPP done" value={`${dppDone}/${chapters.length}`} mono />
        <StatCard label="PYQs solved" value={`${pyqSolved}/${pyqTotal}`} mono />
      </div>

      <div className="flex flex-col gap-2.5">
        {chapters.map((c) => (
          <div key={c.id} className="rounded-xl p-3.5 border flex flex-col gap-2.5" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
            <p className="text-sm" style={{ color: TEXT_PRIMARY }}>{c.name}</p>
            <div className="flex items-center justify-between">
              <button onClick={() => toggleDpp(c.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border" style={{ background: c.dppDone ? SUCCESS_TINT : SURFACE_2, borderColor: c.dppDone ? SUCCESS : CARD_BORDER, color: c.dppDone ? SUCCESS : TEXT_SECONDARY }}>
                {c.dppDone && <Check size={12} />}DPP {c.dppDone ? "done" : "pending"}
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => bumpPyq(c.id, -1)} className="w-6 h-6 rounded-full flex items-center justify-center text-sm" style={{ background: SURFACE_2, color: TEXT_SECONDARY }}>−</button>
                <span className="text-xs font-mono w-14 text-center" style={{ color: TEXT_PRIMARY }}>{c.pyqsCompleted}/{c.pyqsTotal}</span>
                <button onClick={() => bumpPyq(c.id, 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-sm" style={{ background: SURFACE_2, color: TEXT_SECONDARY }}>+</button>
              </div>
            </div>
            <ProgressBar value={c.pyqsTotal ? (c.pyqsCompleted / c.pyqsTotal) * 100 : 0} accent={SUBJECT_META[activeSubject].accent} height={4} />
          </div>
        ))}
        {chapters.length === 0 && <p className="text-sm text-center py-6" style={{ color: TEXT_TERTIARY }}>Start a chapter in Subjects to track its practice here.</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics tab
// ---------------------------------------------------------------------------

function AddHoursForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ date: todayKey(), subject: "physics", hours: "" });
  const inputStyle = { background: SURFACE_2, color: TEXT_PRIMARY, border: `1px solid ${CARD_BORDER}` };
  const submit = () => {
    const hours = Number(form.hours);
    if (!hours || hours <= 0) return;
    onSave({ id: uid(), date: form.date, subject: form.subject, hours });
  };
  return (
    <SectionCard>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><TextInput type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="font-mono" /></Field>
          <Field label="Subject">
            <select value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="rounded-lg px-2 py-2 text-sm focus:outline-none" style={inputStyle}>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="maths">Maths</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </div>
        <Field label="Hours studied"><TextInput type="number" step="0.5" value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} className="font-mono" /></Field>
        <div className="flex gap-2 mt-1">
          <button onClick={submit} className="flex-1 rounded-xl py-2.5 text-sm font-medium" style={{ background: ACCENT, color: ON_ACCENT }}>Log hours</button>
          <button onClick={onCancel} className="rounded-xl px-4 py-2.5 text-sm" style={{ background: SURFACE_2, color: TEXT_SECONDARY }}>Cancel</button>
        </div>
      </div>
    </SectionCard>
  );
}

function AnalyticsTab({ studySessions, setStudySessions, progressHistory, insights, formOpen, setFormOpen }) {
  const weekData = useMemo(() => {
    const days = [];
    const d = new Date();
    for (let i = 6; i >= 0; i--) {
      const dd = new Date(d);
      dd.setDate(d.getDate() - i);
      const key = todayKey(dd);
      const hours = studySessions.filter((s) => s.date === key).reduce((sum, s) => sum + s.hours, 0);
      days.push({ label: dd.toLocaleDateString("en-IN", { weekday: "short" }), hours: Math.round(hours * 10) / 10 });
    }
    return days;
  }, [studySessions]);

  const weekTotals = useMemo(() => {
    const weeks = [];
    const d = new Date();
    for (let w = 5; w >= 0; w--) {
      let total = 0;
      for (let i = 0; i < 7; i++) {
        const dd = new Date(d);
        dd.setDate(d.getDate() - (w * 7 + i));
        const key = todayKey(dd);
        total += studySessions.filter((s) => s.date === key).reduce((sum, s) => sum + s.hours, 0);
      }
      weeks.push({ label: `W-${w}`, hours: Math.round(total * 10) / 10 });
    }
    return weeks;
  }, [studySessions]);

  const subjectHours = useMemo(() => {
    const totals = { physics: 0, chemistry: 0, maths: 0, other: 0 };
    studySessions.forEach((s) => { totals[s.subject] = (totals[s.subject] || 0) + s.hours; });
    const max = Math.max(1, ...Object.values(totals));
    return Object.entries(totals).map(([key, val]) => ({ key, val, pct: Math.round((val / max) * 100) }));
  }, [studySessions]);

  const completionTrend = useMemo(() => {
    return Object.entries(progressHistory)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(-30)
      .map(([date, pct]) => ({ label: fmtShortDate(date), pct }));
  }, [progressHistory]);

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium" style={{ color: TEXT_PRIMARY }}>Study Analytics</h2>
        {!formOpen && (
          <button onClick={() => setFormOpen(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full" style={{ background: ACCENT, color: ON_ACCENT }}>
            <Plus size={13} />Log hours
          </button>
        )}
      </div>

      {formOpen && <AddHoursForm onSave={(s) => { setStudySessions((prev) => [...prev, s]); setFormOpen(false); }} onCancel={() => setFormOpen(false)} />}

      {insights.length > 0 && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-2"><Sparkles size={14} color="#C9A961" /><span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Smart insights</span></div>
          <ul className="flex flex-col gap-2">
            {insights.map((ins, i) => <li key={i} className="text-sm" style={{ color: TEXT_PRIMARY }}>· {ins}</li>)}
          </ul>
        </SectionCard>
      )}

      <SectionCard>
        <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Weekly consistency</span>
        <div className="h-36 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="hours" name="Hours" fill="#C9A961" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard>
        <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Monthly consistency</span>
        <div className="h-36 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekTotals} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="hours" name="Hours/week" fill="#7695B8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard>
        <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Subject-wise time</span>
        <div className="flex flex-col gap-3 mt-3">
          {subjectHours.filter((s) => s.key !== "other" || s.val > 0).map((s) => (
            <div key={s.key} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span style={{ color: TEXT_PRIMARY }}>{s.key === "other" ? "Other" : SUBJECT_META[s.key].label}</span>
                <span className="font-mono" style={{ color: TEXT_SECONDARY }}>{Math.round(s.val * 10) / 10}h</span>
              </div>
              <ProgressBar value={s.pct} accent={s.key === "other" ? "#8A8A85" : SUBJECT_META[s.key].accent} />
            </div>
          ))}
        </div>
      </SectionCard>

      {completionTrend.length > 1 && (
        <SectionCard>
          <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Completion trend</span>
          <div className="h-36 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="pct" name="Syllabus %" stroke="#6B8F67" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar tab
// ---------------------------------------------------------------------------

function CalendarTab({ streakDates, tests, studySessions }) {
  const activityByDate = useMemo(() => {
    const map = {};
    streakDates.forEach((d) => { map[d] = (map[d] || 0) + 1; });
    tests.forEach((t) => { map[t.date] = (map[t.date] || 0) + 1; });
    studySessions.forEach((s) => { if (s.hours > 0) map[s.date] = (map[s.date] || 0) + 1; });
    return map;
  }, [streakDates, tests, studySessions]);

  const weeks = useMemo(() => {
    const totalDays = 98;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - totalDays + 1);
    start.setDate(start.getDate() - start.getDay());

    const grid = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const key = todayKey(cursor);
        week.push({ key, level: activityByDate[key] || 0, inRange: cursor <= end });
        cursor.setDate(cursor.getDate() + 1);
      }
      grid.push(week);
    }
    return grid;
  }, [activityByDate]);

  const levelColor = (level) => {
    if (level === 0) return "var(--heat-0)";
    if (level === 1) return "var(--heat-1)";
    if (level === 2) return "var(--heat-2)";
    return "var(--heat-3)";
  };

  return (
    <div className="flex flex-col gap-5 pb-4">
      <h2 className="text-lg font-medium" style={{ color: TEXT_PRIMARY }}>Activity Calendar</h2>
      <SectionCard>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <div key={di} title={day.key} className="w-3 h-3 rounded-sm" style={{ background: day.inRange ? levelColor(day.level) : "transparent" }} />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs" style={{ color: TEXT_TERTIARY }}>
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm" style={{ background: "var(--heat-0)" }} />
          <div className="w-3 h-3 rounded-sm" style={{ background: "var(--heat-1)" }} />
          <div className="w-3 h-3 rounded-sm" style={{ background: "var(--heat-2)" }} />
          <div className="w-3 h-3 rounded-sm" style={{ background: "var(--heat-3)" }} />
          <span>More</span>
        </div>
      </SectionCard>
      <p className="text-xs text-center" style={{ color: TEXT_TERTIARY }}>Study days, test days, and revision activity — all in one view.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings tab (theme + backup)
// ---------------------------------------------------------------------------

function SettingsTab({ theme, setTheme, onExport, onFileSelect, importPreview, importError, onConfirmImport, onCancelImport }) {
  const fileRef = useRef(null);

  return (
    <div className="flex flex-col gap-5 pb-4">
      <h2 className="text-lg font-medium" style={{ color: TEXT_PRIMARY }}>Settings</h2>

      <SectionCard>
        <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Appearance</span>
        <div className="flex gap-2 mt-3">
          <button onClick={() => setTheme("dark")} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm" style={{ background: theme === "dark" ? SURFACE_2 : "transparent", borderColor: theme === "dark" ? ACCENT : CARD_BORDER, color: theme === "dark" ? TEXT_PRIMARY : TEXT_SECONDARY }}>
            <Moon size={15} />Dark
          </button>
          <button onClick={() => setTheme("light")} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm" style={{ background: theme === "light" ? SURFACE_2 : "transparent", borderColor: theme === "light" ? ACCENT : CARD_BORDER, color: theme === "light" ? TEXT_PRIMARY : TEXT_SECONDARY }}>
            <Sun size={15} />Light
          </button>
        </div>
      </SectionCard>

      <SectionCard>
        <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Backup</span>
        <p className="text-xs mt-2 mb-3" style={{ color: TEXT_TERTIARY }}>Download everything — subjects, tests, planner, goals — as a single JSON file.</p>
        <button onClick={onExport} className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium" style={{ background: ACCENT, color: ON_ACCENT }}>
          <Download size={15} />Download backup
        </button>
      </SectionCard>

      <SectionCard>
        <span className="text-xs uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Restore</span>
        <p className="text-xs mt-2 mb-3" style={{ color: TEXT_TERTIARY }}>Importing a backup replaces all current data on this device.</p>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { if (e.target.files[0]) onFileSelect(e.target.files[0]); e.target.value = ""; }} />
        <button onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm" style={{ background: SURFACE_2, color: TEXT_PRIMARY, border: `1px solid ${CARD_BORDER}` }}>
          <Upload size={15} />Choose backup file
        </button>
        {importError && <p className="text-xs mt-2" style={{ color: DANGER }}>{importError}</p>}
        {importPreview && (
          <div className="mt-3 rounded-xl p-3 border" style={{ borderColor: DANGER_BORDER, background: DANGER_TINT }}>
            <p className="text-xs" style={{ color: TEXT_PRIMARY }}>Replace all current data with this backup? This can't be undone.</p>
            <div className="flex gap-2 mt-2">
              <button onClick={onConfirmImport} className="flex-1 rounded-lg py-2 text-xs font-medium" style={{ background: DANGER, color: "#FFFFFF" }}>Replace data</button>
              <button onClick={onCancelImport} className="rounded-lg px-3 py-2 text-xs" style={{ background: SURFACE_2, color: TEXT_SECONDARY }}>Cancel</button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// More menu (secondary nav)
// ---------------------------------------------------------------------------

const MORE_ITEMS = [
  { key: "tests", label: "Test Tracker", desc: "Log results & see trends", icon: ClipboardList },
  { key: "practice", label: "DPP & PYQ Practice", desc: "Chapter-wise completion", icon: PenSquare },
  { key: "analytics", label: "Study Analytics", desc: "Hours, consistency, trends", icon: BarChart3 },
  { key: "calendar", label: "Activity Calendar", desc: "Your consistency map", icon: Grid3x3 },
  { key: "goals", label: "Goals", desc: "Main goal & mini goals", icon: Target },
  { key: "settings", label: "Settings", desc: "Theme, backup & restore", icon: SettingsIcon },
];

function MoreTab({ onNavigate }) {
  return (
    <div className="flex flex-col gap-2.5 pb-4">
      {MORE_ITEMS.map(({ key, label, desc, icon: Icon }) => (
        <button key={key} onClick={() => onNavigate(key)} className="flex items-center gap-3 rounded-xl p-4 border text-left" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: SURFACE_2 }}>
            <Icon size={16} color="#C9A961" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{label}</p>
            <p className="text-xs" style={{ color: TEXT_TERTIARY }}>{desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Add FAB
// ---------------------------------------------------------------------------

function QuickAddFab({ onAction }) {
  const [open, setOpen] = useState(false);
  const actions = [
    { key: "test", label: "Add Test", icon: ClipboardList },
    { key: "chapter", label: "Add Chapter Progress", icon: BookOpen },
    { key: "hours", label: "Add Study Hours", icon: Timer },
    { key: "revision", label: "Add Revision", icon: RotateCcw },
  ];
  return (
    <div className="fixed right-5 z-20" style={{ bottom: "88px" }}>
      {open && (
        <div className="flex flex-col gap-2 mb-3 items-end">
          {actions.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setOpen(false); onAction(key); }} className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full border text-xs shadow-lg" style={{ background: SURFACE_2, borderColor: CARD_BORDER, color: TEXT_PRIMARY }}>
              <Icon size={14} color="#C9A961" />{label}
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg" style={{ background: ACCENT, color: ON_ACCENT, transform: open ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}>
        <Plus size={24} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------

const PRIMARY_TABS = [
  { key: "dashboard", label: "Home", icon: LayoutDashboard },
  { key: "subjects", label: "Subjects", icon: BookOpen },
  { key: "planner", label: "Planner", icon: ListChecks },
  { key: "revision", label: "Revision", icon: RotateCcw },
  { key: "more", label: "More", icon: MoreHorizontal },
];

const SECONDARY_TAB_KEYS = ["tests", "practice", "analytics", "calendar", "goals", "settings"];
const SECONDARY_TAB_LABELS = {
  tests: "Test Tracker", practice: "DPP & PYQ", analytics: "Analytics", calendar: "Calendar", goals: "Goals", settings: "Settings",
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [subjects, setSubjects] = useState(DEFAULT_DATA.subjects);
  const [dailyTasksByDate, setDailyTasksByDate] = useState(DEFAULT_DATA.dailyTasksByDate);
  const [streakDates, setStreakDates] = useState(DEFAULT_DATA.streakDates);
  const [goals, setGoals] = useState(DEFAULT_DATA.goals);
  const [tests, setTests] = useState(DEFAULT_DATA.tests);
  const [studySessions, setStudySessions] = useState(DEFAULT_DATA.studySessions);
  const [progressHistory, setProgressHistory] = useState(DEFAULT_DATA.progressHistory);
  const [theme, setTheme] = useState(DEFAULT_DATA.theme);
  const [testFormOpen, setTestFormOpen] = useState(false);
  const [hoursFormOpen, setHoursFormOpen] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState("");

  const saveTimer = useRef(null);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      const data = await loadData();
      setSubjects(data.subjects || DEFAULT_DATA.subjects);
      setDailyTasksByDate(data.dailyTasksByDate || {});
      setStreakDates(data.streakDates || []);
      setGoals(data.goals || DEFAULT_DATA.goals);
      setTests(data.tests || []);
      setStudySessions(data.studySessions || []);
      setProgressHistory(data.progressHistory || {});
      setTheme(data.theme || "dark");
      hydrated.current = true;
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const key = todayKey();
    const tasks = dailyTasksByDate[key] || [];
    if (tasks.some((t) => t.done)) {
      setStreakDates((prev) => (prev.includes(key) ? prev : [...prev, key]));
    }
  }, [dailyTasksByDate]);

  useEffect(() => {
    if (!hydrated.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveData({ subjects, dailyTasksByDate, streakDates, goals, tests, studySessions, progressHistory, theme });
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [subjects, dailyTasksByDate, streakDates, goals, tests, studySessions, progressHistory, theme]);

  const stats = useMemo(() => {
    const allChapters = Object.values(subjects).flat();
    const chaptersTotal = allChapters.length;
    const chaptersDone = allChapters.filter((c) => c.status === "Mastered").length;
    const overallScore = allChapters.reduce((sum, c) => sum + STATUS_WEIGHT[c.status], 0);
    const overallPct = chaptersTotal ? Math.round((overallScore / chaptersTotal) * 100) : 0;

    const subjectPct = {};
    Object.entries(subjects).forEach(([key, chapters]) => {
      const score = chapters.reduce((sum, c) => sum + STATUS_WEIGHT[c.status], 0);
      subjectPct[key] = chapters.length ? Math.round((score / chapters.length) * 100) : 0;
    });

    const sortedDates = [...streakDates].sort();
    const dateSet = new Set(sortedDates);
    let streak = 0;
    let cursor = new Date();
    if (!dateSet.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (dateSet.has(todayKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }

    const daysLeft = goals.examDate ? daysBetween(todayKey(), goals.examDate) : -1;

    const todayTasks = dailyTasksByDate[todayKey()] || [];
    const todayPct = todayTasks.length ? Math.round((todayTasks.filter((t) => t.done).length / todayTasks.length) * 100) : 0;

    const pctActiveInLastNDays = (n) => {
      let active = 0;
      const d = new Date();
      for (let i = 0; i < n; i++) { if (dateSet.has(todayKey(d))) active += 1; d.setDate(d.getDate() - 1); }
      return Math.round((active / n) * 100);
    };

    return { overallPct, subjectPct, chaptersDone, chaptersTotal, streak, daysLeft, todayPct, weekPct: pctActiveInLastNDays(7), monthPct: pctActiveInLastNDays(30) };
  }, [subjects, streakDates, dailyTasksByDate, goals]);

  useEffect(() => {
    if (!hydrated.current) return;
    const key = todayKey();
    setProgressHistory((prev) => (prev[key] === stats.overallPct ? prev : { ...prev, [key]: stats.overallPct }));
  }, [stats.overallPct]);

  const insights = useMemo(() => computeInsights({ subjects, tests, streakDates }), [subjects, tests, streakDates]);

  const isSecondary = SECONDARY_TAB_KEYS.includes(tab);
  const activePrimaryKey = isSecondary ? "more" : tab;

  const handleFabAction = (key) => {
    if (key === "test") { setTab("tests"); setTestFormOpen(true); }
    else if (key === "hours") { setTab("analytics"); setHoursFormOpen(true); }
    else if (key === "chapter") { setTab("subjects"); }
    else if (key === "revision") { setTab("revision"); }
  };

  const handleExport = () => {
    const payload = { subjects, dailyTasksByDate, streakDates, goals, tests, studySessions, progressHistory, theme, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rozthodasa-jee-backup-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (file) => {
    setImportError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || typeof parsed !== "object" || !parsed.subjects) throw new Error("shape");
        setImportPreview(parsed);
      } catch (err) {
        setImportError("This doesn't look like a valid backup file.");
      }
    };
    reader.onerror = () => setImportError("Couldn't read that file.");
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!importPreview) return;
    setSubjects(importPreview.subjects || DEFAULT_DATA.subjects);
    setDailyTasksByDate(importPreview.dailyTasksByDate || {});
    setStreakDates(importPreview.streakDates || []);
    setGoals(importPreview.goals || DEFAULT_DATA.goals);
    setTests(importPreview.tests || []);
    setStudySessions(importPreview.studySessions || []);
    setProgressHistory(importPreview.progressHistory || {});
    if (importPreview.theme) setTheme(importPreview.theme);
    setImportPreview(null);
  };

  if (loading) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
        <span className="text-sm font-mono" style={{ color: "#5C5C59" }}>loading…</span>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col relative" style={{ background: "var(--bg)", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" />
      <style>{`
        :root {
          --bg: ${theme === "dark" ? "#0A0A0A" : "#FAFAF8"};
          --surface: ${theme === "dark" ? "#141414" : "#FFFFFF"};
          --surface-2: ${theme === "dark" ? "#1C1C1C" : "#F0EFEA"};
          --border: ${theme === "dark" ? "#262626" : "#E4E2DB"};
          --text-primary: ${theme === "dark" ? "#F5F5F3" : "#181816"};
          --text-secondary: ${theme === "dark" ? "#8F8F8C" : "#6B6B66"};
          --text-tertiary: ${theme === "dark" ? "#5C5C59" : "#9B9B93"};
          --accent: ${theme === "dark" ? "#C9A961" : "#B08A3F"};
          --danger: ${theme === "dark" ? "#C9524A" : "#B23B33"};
          --success: ${theme === "dark" ? "#7A9B76" : "#4F7A4B"};
          --info: ${theme === "dark" ? "#8FA9C9" : "#4A6E93"};
          --on-accent: #0A0A0A;
          --overlay-bg: ${theme === "dark" ? "rgba(10,10,10,0.92)" : "rgba(250,250,248,0.92)"};
          --success-tint: ${theme === "dark" ? "#7A9B761A" : "#4F7A4B1A"};
          --danger-tint: ${theme === "dark" ? "#C9524A1A" : "#B23B331A"};
          --danger-border: ${theme === "dark" ? "#C9524A55" : "#B23B3355"};
          --heat-0: ${theme === "dark" ? "#1C1C1C" : "#F0EFEA"};
          --heat-1: ${theme === "dark" ? "#C9A96155" : "#B08A3F44"};
          --heat-2: ${theme === "dark" ? "#C9A961AA" : "#B08A3F99"};
          --heat-3: ${theme === "dark" ? "#C9A961" : "#B08A3F"};
        }
        * { font-family: 'Inter', -apple-system, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', 'SF Mono', monospace !important; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(${theme === "dark" ? "0.6" : "0.35"}); }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <header className="px-5 pt-6 pb-4 flex items-center justify-between sticky top-0 z-10" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(8px)" }}>
        {isSecondary ? (
          <button onClick={() => setTab("more")} className="flex items-center gap-1.5 text-sm" style={{ color: TEXT_PRIMARY }}>
            <ChevronLeft size={18} />{SECONDARY_TAB_LABELS[tab]}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Flame size={16} color="#C9A961" />
            <span className="text-xs font-mono" style={{ color: TEXT_SECONDARY }}>{stats.streak} day{stats.streak === 1 ? "" : "s"}</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} color="#7695B8" />
            <span className="text-xs font-mono" style={{ color: TEXT_SECONDARY }}>{stats.daysLeft >= 0 ? `${stats.daysLeft}d left` : "—"}</span>
          </div>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} style={{ color: TEXT_SECONDARY }} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 max-w-lg w-full mx-auto">
        {tab === "dashboard" && <DashboardTab goals={goals} stats={stats} insights={insights} />}
        {tab === "subjects" && <SubjectTrackerTab subjects={subjects} setSubjects={setSubjects} />}
        {tab === "planner" && <PlannerTab dailyTasksByDate={dailyTasksByDate} setDailyTasksByDate={setDailyTasksByDate} />}
        {tab === "revision" && <RevisionTab subjects={subjects} />}
        {tab === "more" && <MoreTab onNavigate={setTab} />}
        {tab === "tests" && <TestsTab tests={tests} setTests={setTests} formOpen={testFormOpen} setFormOpen={setTestFormOpen} />}
        {tab === "practice" && <PracticeTab subjects={subjects} setSubjects={setSubjects} />}
        {tab === "analytics" && <AnalyticsTab studySessions={studySessions} setStudySessions={setStudySessions} progressHistory={progressHistory} insights={insights} formOpen={hoursFormOpen} setFormOpen={setHoursFormOpen} />}
        {tab === "calendar" && <CalendarTab streakDates={streakDates} tests={tests} studySessions={studySessions} />}
        {tab === "goals" && <GoalsTab goals={goals} setGoals={setGoals} />}
        {tab === "settings" && (
          <SettingsTab
            theme={theme} setTheme={setTheme}
            onExport={handleExport}
            onFileSelect={handleFileSelect}
            importPreview={importPreview}
            importError={importError}
            onConfirmImport={confirmImport}
            onCancelImport={() => { setImportPreview(null); setImportError(""); }}
          />
        )}
      </main>

      <QuickAddFab onAction={handleFabAction} />

      <nav className="sticky bottom-0 flex justify-around items-center py-2.5 border-t max-w-lg w-full mx-auto z-10" style={{ background: "var(--overlay-bg)", borderColor: "var(--border)", backdropFilter: "blur(8px)" }}>
        {PRIMARY_TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} className="flex flex-col items-center gap-1 px-3 py-1.5">
            <Icon size={19} color={activePrimaryKey === key ? "#C9A961" : "var(--text-tertiary)"} />
            <span className="text-xs" style={{ color: activePrimaryKey === key ? TEXT_PRIMARY : TEXT_TERTIARY }}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
