import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { saveProgram, loadPrograms, deleteProgram as fbDeleteProgram, saveLibrary, loadLibrary, loadClients, assignProgramToClient, loadAllWorkoutLogs } from "./firebase";

// ─── Data Helpers ────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);

// Auto-format tempo: "3110" → "3-1-1-0"
const formatTempo = (val) => {
  if (!val) return val;
  const stripped = val.replace(/[-\s]/g, "");
  if (/^\d{4}$/.test(stripped)) return stripped.split("").join("-");
  return val;
};

const TAGS = ["Strength", "Hypertrophy", "Fat Loss", "Mobility", "Conditioning", "Beginner", "Intermediate", "Advanced"];
const TAG_COLORS = { Strength: "#ff6b6b", Hypertrophy: "#6c5ce7", "Fat Loss": "#ffa726", Mobility: "#00d4aa", Conditioning: "#4fc3f7", Beginner: "#81c784", Intermediate: "#ffb74d", Advanced: "#ef5350" };

const EMPTY_SET = () => ({ id: uid(), reps: "", weight: "", tempo: "", rpe: "" });
const EMPTY_EXERCISE = () => ({
  id: uid(), name: "", videoUrl: "", coachNotes: "", restSeconds: 60,
  sets: [EMPTY_SET(), EMPTY_SET(), EMPTY_SET()],
  groupType: "none", groupId: null,
});
const EMPTY_DAY = (num) => ({
  id: uid(), label: `Day ${num}`,
  warmup: [], exercises: [], cooldown: [],
});
const EMPTY_PHASE = (num) => ({
  id: uid(), name: `Phase ${num}`, weeks: 4,
  days: [EMPTY_DAY(1), EMPTY_DAY(2), EMPTY_DAY(3)],
  progression: { type: "none", amount: 0, unit: "lbs", frequency: "weekly" },
});
const EMPTY_PROGRAM = () => ({
  id: uid(), name: "New Program", description: "", tags: [],
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  phases: [EMPTY_PHASE(1)],
});

// ─── Exercise Library ───────────────────────────────────────────
const DEFAULT_LIBRARY = [
  { id: "lib1", name: "Barbell Bench Press", category: "Chest", videoUrl: "https://youtube.com/watch?v=bench", coachNotes: "Drive feet into floor. Control the eccentric." },
  { id: "lib2", name: "Back Squat", category: "Legs", videoUrl: "https://youtube.com/watch?v=squat", coachNotes: "Sit back into hips. Knees track toes." },
  { id: "lib3", name: "Overhead Press", category: "Shoulders", videoUrl: "https://youtube.com/watch?v=ohp", coachNotes: "Brace core. Squeeze glutes at lockout." },
  { id: "lib4", name: "Barbell Row", category: "Back", videoUrl: "https://youtube.com/watch?v=row", coachNotes: "Pull to lower chest. Squeeze shoulder blades." },
  { id: "lib5", name: "Romanian Deadlift", category: "Legs", videoUrl: "https://youtube.com/watch?v=rdl", coachNotes: "Hinge at hips. Feel hamstring stretch. Keep bar close." },
  { id: "lib6", name: "Pull-ups", category: "Back", videoUrl: "https://youtube.com/watch?v=pullup", coachNotes: "Full hang at bottom. Chin over bar. No kipping." },
  { id: "lib7", name: "Dumbbell Lunges", category: "Legs", videoUrl: "https://youtube.com/watch?v=lunge", coachNotes: "90 degrees both knees. Step long. Drive through front heel." },
  { id: "lib8", name: "Incline DB Press", category: "Chest", videoUrl: "https://youtube.com/watch?v=incpress", coachNotes: "30-45 degree incline. Full ROM. Control the negative." },
  { id: "lib9", name: "Face Pulls", category: "Shoulders", videoUrl: "https://youtube.com/watch?v=facepull", coachNotes: "Pull to forehead. External rotate at end. Squeeze rear delts." },
  { id: "lib10", name: "Deadlift", category: "Back", videoUrl: "https://youtube.com/watch?v=deadlift", coachNotes: "Engage lats. Push floor away. Lock hips at top." },
  { id: "lib11", name: "Lateral Raises", category: "Shoulders", videoUrl: "", coachNotes: "Slight forward lean. Lead with pinkies. Controlled tempo." },
  { id: "lib12", name: "Cable Woodchops", category: "Core", videoUrl: "", coachNotes: "Rotate through thoracic spine. Arms stay extended." },
  { id: "lib13", name: "Plank", category: "Core", videoUrl: "", coachNotes: "Engage glutes. Neutral spine. Breathe steady." },
  { id: "lib14", name: "Hip 90/90 Stretch", category: "Mobility", videoUrl: "", coachNotes: "Hold 30s each side. Breathe into the stretch." },
  { id: "lib15", name: "Cat-Cow", category: "Mobility", videoUrl: "", coachNotes: "Sync movement with breath. Slow and controlled." },
  { id: "lib16", name: "Foam Roll Thoracic Spine", category: "Mobility", videoUrl: "", coachNotes: "Arms crossed. Roll upper back. 10 passes." },
  { id: "lib17", name: "Box Jumps", category: "Conditioning", videoUrl: "", coachNotes: "Land soft. Step down. Full hip extension at top." },
  { id: "lib18", name: "Battle Ropes", category: "Conditioning", videoUrl: "", coachNotes: "Alternating waves. Core braced. Athletic stance." },
  { id: "lib19", name: "Goblet Squat", category: "Legs", videoUrl: "", coachNotes: "Elbows inside knees. Upright torso. Full depth." },
  { id: "lib20", name: "Tricep Dips", category: "Arms", videoUrl: "", coachNotes: "Slight forward lean. 90 degree elbow depth. Lock out." },
];

const LIBRARY_CATEGORIES = ["All", "Chest", "Back", "Shoulders", "Legs", "Core", "Arms", "Mobility", "Conditioning"];

// ─── Sample Data ────────────────────────────────────────────────
const SAMPLE_PROGRAMS = [
  {
    id: "prog1", name: "Power Builder", tags: ["Strength", "Intermediate"],
    description: "Strength-focused program blending compound lifts with hypertrophy accessory work.",
    createdAt: "2025-02-01T00:00:00Z", updatedAt: "2025-03-05T00:00:00Z",
    phases: [{
      id: "ph1", name: "Foundation", weeks: 4,
      progression: { type: "linear", amount: 5, unit: "lbs", frequency: "weekly" },
      days: [{
        id: "d1", label: "Day 1 - Upper Push",
        warmup: [
          { id: "w1", name: "Cat-Cow", videoUrl: "", coachNotes: "10 reps, sync with breath", restSeconds: 0, sets: [{ id: "ws1", reps: "10", weight: "", tempo: "", rpe: "" }], groupType: "none", groupId: null },
          { id: "w2", name: "Band Pull-Aparts", videoUrl: "", coachNotes: "15 reps, warm up rear delts", restSeconds: 0, sets: [{ id: "ws2", reps: "15", weight: "", tempo: "", rpe: "" }], groupType: "none", groupId: null },
        ],
        exercises: [
          { id: "e1", name: "Barbell Bench Press", videoUrl: "https://youtube.com/watch?v=example1", coachNotes: "Drive feet into floor. Control the eccentric.", restSeconds: 120, sets: [
            { id: "s1", reps: "5", weight: "185", tempo: "3-1-1-0", rpe: "7" },
            { id: "s2", reps: "5", weight: "185", tempo: "3-1-1-0", rpe: "8" },
            { id: "s3", reps: "5", weight: "185", tempo: "3-1-1-0", rpe: "8" },
          ], groupType: "none", groupId: null },
          { id: "e2", name: "Overhead Press", videoUrl: "", coachNotes: "Brace core. Squeeze glutes at lockout.", restSeconds: 90, sets: [
            { id: "s4", reps: "8", weight: "115", tempo: "2-0-1-0", rpe: "7" },
            { id: "s5", reps: "8", weight: "115", tempo: "2-0-1-0", rpe: "8" },
            { id: "s6", reps: "8", weight: "115", tempo: "2-0-1-0", rpe: "8" },
          ], groupType: "superset", groupId: "grp1" },
          { id: "e2b", name: "Face Pulls", videoUrl: "", coachNotes: "Pull to forehead. External rotate.", restSeconds: 60, sets: [
            { id: "s6b", reps: "15", weight: "30", tempo: "2-1-1-0", rpe: "6" },
            { id: "s6c", reps: "15", weight: "30", tempo: "2-1-1-0", rpe: "7" },
            { id: "s6d", reps: "15", weight: "30", tempo: "2-1-1-0", rpe: "7" },
          ], groupType: "superset", groupId: "grp1" },
        ],
        cooldown: [
          { id: "c1", name: "Chest Doorway Stretch", videoUrl: "", coachNotes: "30s each side. Breathe into stretch.", restSeconds: 0, sets: [{ id: "cs1", reps: "30s", weight: "", tempo: "", rpe: "" }], groupType: "none", groupId: null },
        ],
      }, {
        id: "d2", label: "Day 2 - Lower",
        warmup: [],
        exercises: [
          { id: "e3", name: "Back Squat", videoUrl: "", coachNotes: "Sit back into hips. Knees track toes.", restSeconds: 150, sets: [
            { id: "s7", reps: "5", weight: "225", tempo: "3-1-1-0", rpe: "7" },
            { id: "s8", reps: "5", weight: "225", tempo: "3-1-1-0", rpe: "8" },
            { id: "s9", reps: "5", weight: "225", tempo: "3-1-1-0", rpe: "8.5" },
          ], groupType: "none", groupId: null },
        ],
        cooldown: [],
      }],
    }],
  },
];

// ─── Icons ──────────────────────────────────────────────────────
const Icon = ({ name, size = 18 }) => {
  const icons = {
    plus: <path d="M12 5v14M5 12h14" />,
    trash: <><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
    back: <path d="M19 12H5M12 19l-7-7 7-7" />,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
    save: <><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>,
    send: <><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
    chevDown: <polyline points="6 9 12 15 18 9" />,
    chevRight: <polyline points="9 18 15 12 9 6" />,
    dumbbell: <><rect x="2" y="10" width="4" height="4" rx="1" /><rect x="18" y="10" width="4" height="4" rx="1" /><line x1="6" y1="12" x2="18" y2="12" /><rect x="1" y="9" width="2" height="6" rx="0.5" /><rect x="21" y="9" width="2" height="6" rx="0.5" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    play: <polygon points="5 3 19 12 5 21 5 3" />,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z" /></>,
    download: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
    trendUp: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    sunrise: <><path d="M17 18a5 5 0 00-10 0" /><line x1="12" y1="2" x2="12" y2="9" /><line x1="4.22" y1="10.22" x2="5.64" y2="11.64" /><line x1="1" y1="18" x2="3" y2="18" /><line x1="21" y1="18" x2="23" y2="18" /><line x1="18.36" y1="11.64" x2="19.78" y2="10.22" /><line x1="23" y1="22" x2="1" y2="22" /><polyline points="8 6 12 2 16 6" /></>,
    moon: <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

// ─── Styles ─────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --bg-primary: #0a0a0f; --bg-secondary: #12121a; --bg-tertiary: #1a1a26;
  --bg-elevated: #222233; --border: #2a2a3e; --border-focus: #5a5aff;
  --text-primary: #e8e8f0; --text-secondary: #8888a8; --text-muted: #55556a;
  --accent: #6c5ce7; --accent-glow: rgba(108, 92, 231, 0.3);
  --success: #00d4aa; --warning: #ffa726; --danger: #ff5555; --danger-bg: rgba(255, 85, 85, 0.1);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: var(--bg-primary); color: var(--text-primary); font-family: 'DM Sans', sans-serif; }
.coach-app { min-height: 100vh; display: flex; background: var(--bg-primary); }

.sidebar { width: 240px; min-height: 100vh; background: var(--bg-secondary); border-right: 1px solid var(--border); padding: 24px 0; display: flex; flex-direction: column; position: fixed; left: 0; top: 0; bottom: 0; z-index: 10; }
.sidebar-brand { padding: 0 24px 28px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
.sidebar-brand h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; background: linear-gradient(135deg, #6c5ce7, #a29bfe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.sidebar-brand span { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; display: block; margin-top: 4px; }
.sidebar-nav { flex: 1; padding: 0 12px; }
.nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 8px; font-size: 14px; font-weight: 400; color: var(--text-secondary); cursor: pointer; transition: all 0.15s ease; border: none; background: none; width: 100%; text-align: left; }
.nav-item:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.nav-item.active { background: var(--accent); color: white; font-weight: 500; }

.main-content { flex: 1; margin-left: 240px; padding: 32px 40px; max-width: 1200px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; flex-wrap: wrap; gap: 12px; }
.page-header h2 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }

.btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; transition: all 0.15s ease; font-family: inherit; }
.btn-primary { background: var(--accent); color: white; box-shadow: 0 2px 12px var(--accent-glow); }
.btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
.btn-ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
.btn-ghost:hover { border-color: var(--text-muted); color: var(--text-primary); }
.btn-danger { background: var(--danger-bg); color: var(--danger); border: 1px solid transparent; }
.btn-danger:hover { border-color: var(--danger); }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn-xs { padding: 4px 8px; font-size: 11px; }
.btn-icon { padding: 6px; background: transparent; border: 1px solid var(--border); border-radius: 6px; color: var(--text-muted); cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; justify-content: center; }
.btn-icon:hover { color: var(--text-primary); border-color: var(--text-muted); }
.btn-icon.danger:hover { color: var(--danger); border-color: var(--danger); }

.tag-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.3px; border: 1px solid; cursor: default; }
.tag-selector { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
.tag-selector .tag-pill { cursor: pointer; opacity: 0.4; transition: opacity 0.15s; }
.tag-selector .tag-pill.selected { opacity: 1; }
.tag-selector .tag-pill:hover { opacity: 0.8; }

.program-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
.program-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 24px; cursor: pointer; transition: all 0.2s ease; position: relative; overflow: hidden; }
.program-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--accent), #a29bfe); opacity: 0; transition: opacity 0.2s; }
.program-card:hover { border-color: var(--accent); transform: translateY(-2px); }
.program-card:hover::before { opacity: 1; }
.program-card h3 { font-size: 18px; font-weight: 600; margin-bottom: 6px; }
.program-card .card-tags { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
.program-card p { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.program-meta { display: flex; gap: 16px; font-size: 12px; color: var(--text-muted); }
.program-meta span { display: flex; align-items: center; gap: 4px; }
.program-card-actions { position: absolute; top: 16px; right: 16px; display: flex; gap: 6px; opacity: 0; transition: opacity 0.15s; }
.program-card:hover .program-card-actions { opacity: 1; }

.editor-container { animation: fadeIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.editor-top-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.editor-top-bar input { flex: 1; min-width: 200px; font-size: 24px; font-weight: 700; background: transparent; border: none; color: var(--text-primary); outline: none; letter-spacing: -0.5px; font-family: inherit; }
.editor-top-bar input::placeholder { color: var(--text-muted); }
.editor-desc textarea { width: 100%; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 14px; color: var(--text-primary); font-size: 14px; font-family: inherit; resize: vertical; min-height: 60px; outline: none; transition: border-color 0.15s; margin-bottom: 16px; }
.editor-desc textarea:focus { border-color: var(--border-focus); }

.section-header { display: flex; align-items: center; gap: 10px; margin: 20px 0 12px; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; }
.section-header.warmup { background: rgba(255,167,38,0.1); color: var(--warning); }
.section-header.main { background: rgba(108,92,231,0.1); color: var(--accent); }
.section-header.cooldown { background: rgba(0,212,170,0.1); color: var(--success); }

.group-wrapper { border-left: 3px solid var(--accent); padding-left: 12px; margin-bottom: 12px; }
.group-wrapper.circuit { border-left-color: var(--warning); }
.group-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-bottom: 8px; }
.group-label.superset { background: rgba(108,92,231,0.15); color: var(--accent); }
.group-label.circuit { background: rgba(255,167,38,0.15); color: var(--warning); }

.phase-block { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 20px; overflow: hidden; }
.phase-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: var(--bg-tertiary); cursor: pointer; user-select: none; }
.phase-header-left { display: flex; align-items: center; gap: 12px; }
.phase-header input { background: transparent; border: none; color: var(--text-primary); font-size: 16px; font-weight: 600; outline: none; font-family: inherit; width: 200px; }
.phase-weeks { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); background: var(--bg-elevated); padding: 4px 10px; border-radius: 6px; }
.phase-weeks input { width: 28px; text-align: center; background: transparent; border: none; color: var(--text-primary); font-size: 12px; font-weight: 600; outline: none; font-family: 'JetBrains Mono', monospace; }
.phase-actions { display: flex; gap: 6px; }
.phase-body { padding: 16px 20px 20px; }

.progression-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--bg-elevated); border-radius: 8px; margin-bottom: 16px; font-size: 13px; flex-wrap: wrap; }
.progression-row select, .progression-row input { background: var(--bg-primary); border: 1px solid var(--border); border-radius: 5px; padding: 5px 8px; color: var(--text-primary); font-size: 12px; font-family: 'JetBrains Mono', monospace; outline: none; }
.progression-row select { font-family: inherit; cursor: pointer; }
.progression-row label { color: var(--text-muted); font-size: 12px; }

.day-tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 0; overflow-x: auto; }
.day-tab { padding: 8px 16px; font-size: 13px; font-weight: 500; color: var(--text-muted); background: transparent; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.15s; font-family: inherit; white-space: nowrap; margin-bottom: -1px; }
.day-tab:hover { color: var(--text-secondary); }
.day-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.day-tab-add { padding: 8px 12px; color: var(--text-muted); background: transparent; border: none; cursor: pointer; transition: color 0.15s; margin-bottom: -1px; }
.day-tab-add:hover { color: var(--accent); }

.exercise-card { background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 18px; margin-bottom: 12px; transition: border-color 0.15s; }
.exercise-card:hover { border-color: var(--text-muted); }
.exercise-card.compact { padding: 12px; }
.exercise-top { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.exercise-number { min-width: 28px; height: 28px; border-radius: 6px; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; font-family: 'JetBrains Mono', monospace; }
.exercise-number.warmup { background: var(--warning); }
.exercise-number.cooldown { background: var(--success); }
.exercise-fields { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.exercise-row { display: flex; gap: 10px; align-items: center; }
.field-group { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.field-group label { font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); }
.field-group input, .field-group textarea, .field-group select { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; color: var(--text-primary); font-size: 13px; outline: none; font-family: inherit; transition: border-color 0.15s; }
.field-group select { cursor: pointer; }
.field-group input:focus, .field-group textarea:focus { border-color: var(--border-focus); }
.field-group textarea { min-height: 48px; resize: vertical; }

.set-table { width: 100%; margin-top: 10px; }
.set-table-header { display: grid; grid-template-columns: 44px 1fr 1fr 1fr 1fr 36px; gap: 6px; padding: 0 4px 6px; }
.set-table-header span { font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); }
.set-row { display: grid; grid-template-columns: 44px 1fr 1fr 1fr 1fr 36px; gap: 6px; padding: 3px 4px; align-items: center; border-radius: 6px; transition: background 0.1s; }
.set-row:hover { background: rgba(255,255,255,0.02); }
.set-number { font-size: 12px; font-weight: 600; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; text-align: center; }
.set-row input { background: var(--bg-primary); border: 1px solid var(--border); border-radius: 5px; padding: 6px 8px; color: var(--text-primary); font-size: 12px; font-family: 'JetBrains Mono', monospace; outline: none; text-align: center; transition: border-color 0.15s; width: 100%; }
.set-row input:focus { border-color: var(--border-focus); }
.rest-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; padding: 8px 12px; background: var(--bg-secondary); border-radius: 6px; }
.rest-row label { font-size: 11px; color: var(--text-muted); font-weight: 500; }
.rest-row input { width: 60px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 5px; padding: 5px 8px; color: var(--text-primary); font-size: 12px; font-family: 'JetBrains Mono', monospace; outline: none; text-align: center; }
.rest-row span { font-size: 11px; color: var(--text-muted); }

.video-link-row { display: flex; align-items: center; gap: 8px; }
.video-link-row input { flex: 1; }
.video-badge { font-size: 10px; padding: 4px 8px; border-radius: 4px; background: rgba(255, 0, 0, 0.15); color: #ff6b6b; font-weight: 600; letter-spacing: 0.5px; white-space: nowrap; display: flex; align-items: center; gap: 4px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 50; display: flex; align-items: center; justify-content: center; animation: fadeInM 0.15s ease; }
@keyframes fadeInM { from { opacity: 0; } to { opacity: 1; } }
.modal { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; width: 640px; max-width: 90vw; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 24px 64px rgba(0,0,0,0.5); }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border); }
.modal-header h3 { font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
.search-input { width: 100%; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px 10px 40px; color: var(--text-primary); font-size: 14px; outline: none; font-family: inherit; transition: border-color 0.15s; margin-bottom: 16px; }
.search-input:focus { border-color: var(--border-focus); }
.search-wrapper { position: relative; }
.search-wrapper svg { position: absolute; left: 12px; top: 11px; color: var(--text-muted); pointer-events: none; }
.category-tabs { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
.cat-tab { padding: 5px 12px; font-size: 12px; border-radius: 6px; border: 1px solid var(--border); background: transparent; color: var(--text-muted); cursor: pointer; font-family: inherit; transition: all 0.15s; }
.cat-tab:hover { border-color: var(--text-muted); color: var(--text-secondary); }
.cat-tab.active { background: var(--accent); border-color: var(--accent); color: white; }
.lib-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 8px; transition: background 0.1s; cursor: pointer; }
.lib-item:hover { background: var(--bg-tertiary); }
.lib-item-info h4 { font-size: 14px; font-weight: 500; }
.lib-item-info p { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.lib-item-cat { font-size: 10px; padding: 3px 8px; border-radius: 4px; background: var(--bg-elevated); color: var(--text-secondary); font-weight: 500; }

.preview-container { animation: fadeIn 0.2s ease; }
.preview-program-name { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
.preview-desc { font-size: 14px; color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6; }
.preview-phase { margin-bottom: 24px; }
.preview-phase-title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.preview-phase-meta { font-size: 12px; color: var(--text-muted); margin-bottom: 16px; }
.preview-day { margin-bottom: 20px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; }
.preview-day-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; color: var(--accent); }
.preview-ex { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
.preview-ex:last-child { border-bottom: none; }
.preview-ex-num { min-width: 24px; height: 24px; border-radius: 5px; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; font-family: 'JetBrains Mono', monospace; flex-shrink: 0; }
.preview-ex-num.warmup { background: var(--warning); }
.preview-ex-num.cooldown { background: var(--success); }
.preview-ex-details { flex: 1; }
.preview-ex-name { font-size: 14px; font-weight: 600; }
.preview-ex-sets { font-size: 12px; color: var(--text-secondary); margin-top: 4px; font-family: 'JetBrains Mono', monospace; }
.preview-ex-notes { font-size: 12px; color: var(--text-muted); margin-top: 4px; font-style: italic; }
.preview-group-bar { border-left: 3px solid var(--accent); padding-left: 10px; margin: 4px 0; }
.preview-group-bar.circuit { border-left-color: var(--warning); }
.preview-group-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--accent); margin-bottom: 4px; }
.preview-group-label.circuit { color: var(--warning); }

.client-list { display: flex; flex-direction: column; gap: 10px; }
.client-card { display: flex; align-items: center; gap: 16px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 18px 20px; transition: border-color 0.15s; }
.client-card:hover { border-color: var(--text-muted); }
.client-avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), #a29bfe); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: white; flex-shrink: 0; }
.client-info { flex: 1; }
.client-info h4 { font-size: 15px; font-weight: 600; }
.client-info p { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.client-stats { display: flex; gap: 20px; }
.client-stat { text-align: center; }
.client-stat .value { font-size: 18px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--accent); }
.client-stat .label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }

.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.empty-state h3 { font-size: 20px; color: var(--text-secondary); margin-bottom: 8px; }
.empty-state p { font-size: 14px; margin-bottom: 24px; }

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

.toast { position: fixed; bottom: 28px; right: 28px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px; padding: 14px 20px; font-size: 13px; color: var(--text-primary); z-index: 100; animation: slideUp 0.25s ease, fadeOut 0.3s ease 2.2s forwards; box-shadow: 0 8px 32px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 10px; }
.toast-success { border-left: 3px solid var(--success); }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes fadeOut { to { opacity: 0; transform: translateY(10px); } }

.info-note { margin-top: 24px; padding: 16px 20px; background: var(--bg-secondary); border-radius: 10px; border: 1px solid var(--border); font-size: 13px; color: var(--text-muted); }
`;

// ─── Components ─────────────────────────────────────────────────
function Toast({ message }) {
  return <div className="toast toast-success"><span style={{ color: "var(--success)" }}>&#10003;</span>{message}</div>;
}

function TagPill({ tag, small }) {
  const c = TAG_COLORS[tag] || "#888";
  return <span className="tag-pill" style={{ color: c, borderColor: c + "44", background: c + "15", fontSize: small ? 10 : 11 }}>{tag}</span>;
}

function TagSelector({ selected, onChange }) {
  const toggle = (t) => onChange(selected.includes(t) ? selected.filter(x => x !== t) : [...selected, t]);
  return (
    <div className="tag-selector">
      {TAGS.map(t => (
        <span key={t} className={`tag-pill ${selected.includes(t) ? "selected" : ""}`}
          style={{ color: TAG_COLORS[t], borderColor: TAG_COLORS[t] + "44", background: selected.includes(t) ? TAG_COLORS[t] + "20" : "transparent" }}
          onClick={() => toggle(t)}>{t}</span>
      ))}
    </div>
  );
}

function LibraryModal({ library, onSelect, onClose, onAddToLibrary }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [newMode, setNewMode] = useState(false);
  const [newEx, setNewEx] = useState({ name: "", category: "Chest", videoUrl: "", coachNotes: "" });

  const filtered = useMemo(() => library.filter(ex => {
    return (cat === "All" || ex.category === cat) && (!search || ex.name.toLowerCase().includes(search.toLowerCase()));
  }), [library, cat, search]);

  const handleAddNew = () => {
    if (!newEx.name.trim()) return;
    onAddToLibrary({ ...newEx, id: uid() });
    setNewEx({ name: "", category: "Chest", videoUrl: "", coachNotes: "" });
    setNewMode(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Icon name="book" size={20} /> Exercise Library</h3>
          <button className="btn-icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="search-wrapper">
            <Icon name="search" size={16} />
            <input className="search-input" placeholder="Search exercises..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="category-tabs">
            {LIBRARY_CATEGORIES.map(c => (
              <button key={c} className={`cat-tab ${cat === c ? "active" : ""}`} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
          {newMode ? (
            <div style={{ padding: 16, background: "var(--bg-tertiary)", borderRadius: 10, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div className="field-group" style={{ flex: 2 }}><label>Name</label><input value={newEx.name} onChange={e => setNewEx({...newEx, name: e.target.value})} placeholder="Exercise name" /></div>
                <div className="field-group" style={{ flex: 1 }}><label>Category</label>
                  <select value={newEx.category} onChange={e => setNewEx({...newEx, category: e.target.value})}>
                    {LIBRARY_CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
                  </select></div>
              </div>
              <div className="field-group" style={{ marginBottom: 10 }}><label>Video URL</label><input value={newEx.videoUrl} onChange={e => setNewEx({...newEx, videoUrl: e.target.value})} placeholder="YouTube link..." /></div>
              <div className="field-group" style={{ marginBottom: 12 }}><label>Coach Notes</label><input value={newEx.coachNotes} onChange={e => setNewEx({...newEx, coachNotes: e.target.value})} placeholder="Default coaching cues..." /></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleAddNew}><Icon name="check" size={14} /> Save to Library</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setNewMode(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setNewMode(true)} style={{ marginBottom: 12 }}>
              <Icon name="plus" size={14} /> New Exercise
            </button>
          )}
          {filtered.map(ex => (
            <div key={ex.id} className="lib-item" onClick={() => { onSelect(ex); onClose(); }}>
              <div className="lib-item-info"><h4>{ex.name}</h4><p>{ex.coachNotes || "No notes"}</p></div>
              <span className="lib-item-cat">{ex.category}</span>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>No exercises found</p>}
        </div>
      </div>
    </div>
  );
}

function SetTable({ sets, onChange, onAdd, onRemove }) {
  return (
    <div className="set-table">
      <div className="set-table-header"><span>Set</span><span>Reps</span><span>Weight</span><span>Tempo</span><span>RPE</span><span></span></div>
      {sets.map((set, i) => (
        <div key={set.id} className="set-row">
          <div className="set-number">{i + 1}</div>
          {["reps", "weight", "tempo", "rpe"].map(f => (
            <input key={f} value={set[f]} placeholder={f === "tempo" ? "3110" : f === "rpe" ? "7" : ""}
              onChange={e => onChange(set.id, f, e.target.value)}
              onBlur={f === "tempo" ? (e => onChange(set.id, f, formatTempo(e.target.value))) : undefined} />
          ))}
          <button className="btn-icon danger" onClick={() => onRemove(set.id)}><Icon name="trash" size={14} /></button>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={onAdd} style={{ marginTop: 8 }}><Icon name="plus" size={14} /> Add Set</button>
    </div>
  );
}

function ExerciseCard({ exercise, index, onChange, onRemove, variant = "main", onOpenLibrary }) {
  const update = (f, v) => onChange({ ...exercise, [f]: v });
  const updateSet = (sid, f, v) => update("sets", exercise.sets.map(s => s.id === sid ? { ...s, [f]: v } : s));
  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    update("sets", [...exercise.sets, last ? { ...EMPTY_SET(), reps: last.reps, weight: last.weight, tempo: last.tempo, rpe: last.rpe } : EMPTY_SET()]);
  };
  const compact = variant !== "main";

  return (
    <div className={`exercise-card ${compact ? "compact" : ""}`}>
      <div className="exercise-top">
        <div className={`exercise-number ${variant}`}>{index + 1}</div>
        <div className="exercise-fields">
          <div className="exercise-row">
            <div className="field-group" style={{ flex: 2 }}>
              <label>Exercise Name</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={exercise.name} placeholder="e.g. Barbell Bench Press" style={{ flex: 1 }}
                  onChange={e => update("name", e.target.value)} />
                {onOpenLibrary && <button className="btn-icon" onClick={onOpenLibrary} title="Pick from library"><Icon name="book" size={14} /></button>}
              </div>
            </div>
            {variant === "main" && (
              <div className="field-group" style={{ flex: 0, minWidth: 120 }}>
                <label>Grouping</label>
                <select value={exercise.groupType || "none"} onChange={e => update("groupType", e.target.value)}>
                  <option value="none">None</option><option value="superset">Superset</option><option value="circuit">Circuit</option>
                </select>
              </div>
            )}
          </div>
          <div className="video-link-row">
            <div className="field-group" style={{ flex: 1 }}><label>Video URL</label>
              <input value={exercise.videoUrl} placeholder="YouTube link..." onChange={e => update("videoUrl", e.target.value)} /></div>
            {exercise.videoUrl && <div className="video-badge"><Icon name="play" size={10} /> VIDEO</div>}
          </div>
          <div className="field-group"><label>Coach Notes / Cues</label>
            <textarea value={exercise.coachNotes} placeholder="Coaching cues, form tips, breathing..."
              onChange={e => update("coachNotes", e.target.value)} /></div>
        </div>
        <button className="btn-icon danger" onClick={onRemove}><Icon name="trash" size={14} /></button>
      </div>
      <SetTable sets={exercise.sets} onChange={updateSet} onAdd={addSet} onRemove={sid => update("sets", exercise.sets.filter(s => s.id !== sid))} />
      <div className="rest-row"><Icon name="clock" size={14} /><label>Rest:</label>
        <input value={exercise.restSeconds} onChange={e => update("restSeconds", e.target.value)} /><span>seconds</span></div>
    </div>
  );
}

function GroupedExerciseList({ exercises, onUpdate, onRemove, onOpenLibrary }) {
  const groups = []; let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    if (ex.groupType && ex.groupType !== "none" && ex.groupId) {
      const gId = ex.groupId, gType = ex.groupType, members = [];
      while (i < exercises.length && exercises[i].groupId === gId) { members.push({ ex: exercises[i], idx: i }); i++; }
      groups.push({ type: gType, members });
    } else { groups.push({ type: "single", members: [{ ex, idx: i }] }); i++; }
  }
  return (<>
    {groups.map((g, gi) => {
      if (g.type === "single") {
        const { ex, idx } = g.members[0];
        return <ExerciseCard key={ex.id} exercise={ex} index={idx} variant="main"
          onChange={u => onUpdate(idx, u)} onRemove={() => onRemove(idx)} onOpenLibrary={() => onOpenLibrary(idx)} />;
      }
      return (
        <div key={gi} className={`group-wrapper ${g.type === "circuit" ? "circuit" : ""}`}>
          <div className={`group-label ${g.type}`}>{g.type}</div>
          {g.members.map(({ ex, idx }) => (
            <ExerciseCard key={ex.id} exercise={ex} index={idx} variant="main"
              onChange={u => onUpdate(idx, u)} onRemove={() => onRemove(idx)} onOpenLibrary={() => onOpenLibrary(idx)} />
          ))}
        </div>
      );
    })}
  </>);
}

function ProgramEditor({ program, onSave, onBack, library, onAddToLibrary }) {
  const [prog, setProg] = useState(JSON.parse(JSON.stringify(program)));
  const [activeDays, setActiveDays] = useState({});
  const [toast, setToast] = useState(null);
  const [openPhases, setOpenPhases] = useState(() => { const m = {}; prog.phases.forEach((_, i) => { m[i] = true; }); return m; });
  const [libTarget, setLibTarget] = useState(null);
  const [bulkTarget, setBulkTarget] = useState(null); // { phaseIdx, dayIdx, section }
  const [bulkText, setBulkText] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const getActiveDay = (pi) => activeDays[pi] || 0;
  const setActiveDay = (pi, di) => setActiveDays(p => ({ ...p, [pi]: di }));
  const updateProg = (fn) => setProg(p => { const c = JSON.parse(JSON.stringify(p)); fn(c); return c; });

  const addPhase = () => { updateProg(p => p.phases.push(EMPTY_PHASE(p.phases.length + 1))); setOpenPhases(o => ({ ...o, [prog.phases.length]: true })); };
  const removePhase = (i) => { if (prog.phases.length <= 1) return; updateProg(p => p.phases.splice(i, 1)); };
  const updatePhaseField = (i, f, v) => updateProg(p => { p.phases[i][f] = v; });
  const updateProgression = (pi, f, v) => updateProg(p => { p.phases[pi].progression[f] = v; });

  const addDay = (pi) => { updateProg(p => p.phases[pi].days.push(EMPTY_DAY(p.phases[pi].days.length + 1))); setTimeout(() => setActiveDay(pi, prog.phases[pi].days.length), 0); };
  const removeDay = (pi, di) => { if (prog.phases[pi].days.length <= 1) return; updateProg(p => p.phases[pi].days.splice(di, 1)); if (getActiveDay(pi) >= prog.phases[pi].days.length - 1) setActiveDay(pi, Math.max(0, prog.phases[pi].days.length - 2)); };
  const updateDayLabel = (pi, di, v) => updateProg(p => { p.phases[pi].days[di].label = v; });

  const addExToSection = (pi, di, section) => updateProg(p => { if (!p.phases[pi].days[di][section]) p.phases[pi].days[di][section] = []; p.phases[pi].days[di][section].push(EMPTY_EXERCISE()); });
  const updateExInSection = (pi, di, section, ei, updated) => updateProg(p => { p.phases[pi].days[di][section][ei] = updated; });
  const removeExFromSection = (pi, di, section, ei) => updateProg(p => { p.phases[pi].days[di][section].splice(ei, 1); });

  const assignGroups = (exercises) => {
    const r = [...exercises]; let gId = null, gType = null;
    for (let i = 0; i < r.length; i++) {
      if (r[i].groupType && r[i].groupType !== "none") {
        if (r[i].groupType === gType && gId) r[i] = { ...r[i], groupId: gId };
        else { gId = uid(); gType = r[i].groupType; r[i] = { ...r[i], groupId: gId }; }
      } else { gId = null; gType = null; r[i] = { ...r[i], groupId: null }; }
    }
    return r;
  };

  const handleSave = () => {
    const cleaned = JSON.parse(JSON.stringify(prog));
    cleaned.phases.forEach(ph => { ph.days.forEach(d => { d.exercises = assignGroups(d.exercises); }); });
    cleaned.updatedAt = new Date().toISOString();
    // Auto-add new exercises to library
    const libNames = new Set(library.map(l => l.name.toLowerCase()));
    const newExercises = [];
    cleaned.phases.forEach(ph => {
      ph.days.forEach(d => {
        [...(d.warmup || []), ...(d.exercises || []), ...(d.cooldown || [])].forEach(ex => {
          if (ex.name && !libNames.has(ex.name.toLowerCase())) {
            libNames.add(ex.name.toLowerCase());
            newExercises.push({ id: uid(), name: ex.name, category: "Uncategorized", videoUrl: ex.videoUrl || "", coachNotes: ex.coachNotes || "" });
          }
        });
      });
    });
    if (newExercises.length > 0) {
      newExercises.forEach(ex => onAddToLibrary(ex));
      showToast(`Program saved + ${newExercises.length} new exercise${newExercises.length > 1 ? "s" : ""} added to library`);
    } else {
      showToast("Program saved");
    }
    onSave(cleaned); setProg(cleaned);
  };

  // Generate remaining weeks from Week 1 with progression
  const generateWeeks = (phaseIdx) => {
    updateProg(p => {
      const phase = p.phases[phaseIdx];
      const totalWeeks = parseInt(phase.weeks) || 4;
      if (totalWeeks <= 1) return;
      const prog = phase.progression || { type: "none", amount: 0, unit: "lbs", frequency: "weekly" };
      const baseDays = phase.days.map(d => JSON.parse(JSON.stringify(d)));

      // Clear existing week labels and regenerate
      const allDays = [];
      for (let week = 0; week < totalWeeks; week++) {
        baseDays.forEach((baseDay, di) => {
          const day = JSON.parse(JSON.stringify(baseDay));
          day.id = week === 0 ? baseDay.id : uid();
          day.label = `Wk${week + 1} - ${baseDay.label.replace(/^Wk\d+\s*[-–]\s*/, "")}`;

          // Apply progression to weights if not week 0
          if (week > 0 && prog.type !== "none") {
            const applyProgression = (exercises) => {
              (exercises || []).forEach(ex => {
                ex.id = uid();
                ex.sets.forEach(s => {
                  s.id = uid();
                  if (s.weight && !isNaN(parseFloat(s.weight))) {
                    const baseWeight = parseFloat(s.weight);
                    let newWeight;
                    if (prog.type === "linear") {
                      newWeight = baseWeight + (parseFloat(prog.amount) || 0) * week;
                    } else if (prog.type === "percentage") {
                      newWeight = baseWeight * Math.pow(1 + (parseFloat(prog.amount) || 0) / 100, week);
                      newWeight = Math.round(newWeight * 10) / 10;
                    } else {
                      newWeight = baseWeight; // RPE-based: keep same weight
                    }
                    s.weight = String(newWeight);
                  }
                });
              });
            };
            applyProgression(day.warmup);
            applyProgression(day.exercises);
            applyProgression(day.cooldown);
          }
          allDays.push(day);
        });
      }
      phase.days = allDays;
    });
    showToast("Weeks generated with progression");
  };

  const handleLibSelect = (libEx) => {
    if (!libTarget) return;
    const { phaseIdx, dayIdx, section, exIdx } = libTarget;
    updateProg(p => { const ex = p.phases[phaseIdx].days[dayIdx][section][exIdx]; ex.name = libEx.name; ex.videoUrl = libEx.videoUrl || ""; ex.coachNotes = libEx.coachNotes || ""; });
    setLibTarget(null);
  };

  const handleBulkAdd = () => {
    if (!bulkTarget || !bulkText.trim()) return;
    const { phaseIdx, dayIdx, section } = bulkTarget;
    const names = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
    if (names.length === 0) return;
    updateProg(p => {
      if (!p.phases[phaseIdx].days[dayIdx][section]) p.phases[phaseIdx].days[dayIdx][section] = [];
      names.forEach(name => {
        const match = library.find(l => l.name.toLowerCase() === name.toLowerCase());
        const ex = EMPTY_EXERCISE();
        ex.name = match ? match.name : name;
        if (match) { ex.videoUrl = match.videoUrl || ""; ex.coachNotes = match.coachNotes || ""; }
        p.phases[phaseIdx].days[dayIdx][section].push(ex);
      });
    });
    showToast(`Added ${names.length} exercise${names.length > 1 ? "s" : ""}`);
    setBulkText("");
    setBulkTarget(null);
  };

  const renderBulkPanel = (section, pi, di) => {
    const isOpen = bulkTarget && bulkTarget.phaseIdx === pi && bulkTarget.dayIdx === di && bulkTarget.section === section;
    if (!isOpen) return null;
    return (
      <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 12, animation: "fadeIn 0.15s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="layers" size={16} /> Bulk Add Exercises
          </div>
          <button className="btn-icon" onClick={() => { setBulkTarget(null); setBulkText(""); }}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
          One exercise per line. If the name matches your library, video and cues auto-fill.
        </div>
        <textarea
          value={bulkText}
          onChange={e => setBulkText(e.target.value)}
          placeholder={"Barbell Bench Press\nOverhead Press\nFace Pulls\nLateral Raises"}
          style={{
            width: "100%", minHeight: 120, background: "var(--bg-secondary)", border: "1px solid var(--border)",
            borderRadius: 8, padding: 12, color: "var(--text-primary)", fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace", outline: "none", resize: "vertical",
            lineHeight: 1.8, transition: "border-color 0.15s",
          }}
          autoFocus
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {bulkText.split("\n").filter(l => l.trim()).length} exercise{bulkText.split("\n").filter(l => l.trim()).length !== 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setBulkTarget(null); setBulkText(""); }}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleBulkAdd}><Icon name="check" size={14} /> Add All</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="editor-container">
      <div className="editor-top-bar">
        <button className="btn btn-ghost" onClick={onBack}><Icon name="back" size={16} /> Back</button>
        <input value={prog.name} onChange={e => setProg({ ...prog, name: e.target.value })} placeholder="Program Name..." />
        <button className="btn btn-primary" onClick={handleSave}><Icon name="save" size={16} /> Save</button>
      </div>
      <div className="editor-desc">
        <textarea value={prog.description} onChange={e => setProg({ ...prog, description: e.target.value })}
          placeholder="Program description - who is this for? What's the goal?" />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Tags</div>
        <TagSelector selected={prog.tags || []} onChange={tags => setProg({ ...prog, tags })} />
      </div>

      {prog.phases.map((phase, pi) => (
        <div key={phase.id} className="phase-block">
          <div className="phase-header" onClick={() => setOpenPhases(o => ({ ...o, [pi]: !o[pi] }))}>
            <div className="phase-header-left">
              <Icon name={openPhases[pi] ? "chevDown" : "chevRight"} size={16} />
              <input value={phase.name} onClick={e => e.stopPropagation()} onChange={e => updatePhaseField(pi, "name", e.target.value)} />
              <div className="phase-weeks"><input value={phase.weeks} onClick={e => e.stopPropagation()} onChange={e => updatePhaseField(pi, "weeks", e.target.value)} /> weeks</div>
            </div>
            <div className="phase-actions"><button className="btn-icon danger" onClick={e => { e.stopPropagation(); removePhase(pi); }}><Icon name="trash" size={14} /></button></div>
          </div>
          {openPhases[pi] && (
            <div className="phase-body">
              <div className="progression-row">
                <Icon name="trendUp" size={16} /><label>Progression:</label>
                <select value={phase.progression?.type || "none"} onChange={e => updateProgression(pi, "type", e.target.value)}>
                  <option value="none">None</option><option value="linear">Linear (add weight)</option><option value="rpe">RPE-based</option><option value="percentage">Percentage increase</option>
                </select>
                {phase.progression?.type !== "none" && (<>
                  <label>+</label>
                  <input value={phase.progression?.amount || ""} style={{ width: 50 }} onChange={e => updateProgression(pi, "amount", e.target.value)} />
                  <select value={phase.progression?.unit || "lbs"} onChange={e => updateProgression(pi, "unit", e.target.value)}>
                    <option value="lbs">lbs</option><option value="kg">kg</option><option value="%">%</option>
                  </select>
                  <select value={phase.progression?.frequency || "weekly"} onChange={e => updateProgression(pi, "frequency", e.target.value)}>
                    <option value="weekly">per week</option><option value="session">per session</option>
                  </select>
                </>)}
              </div>
              {/* Generate Weeks Button */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => generateWeeks(pi)}
                  style={{ background: "rgba(108,92,231,0.1)", borderColor: "var(--accent)", color: "var(--accent)" }}>
                  <Icon name="layers" size={14} /> Generate {phase.weeks} Weeks from Day Templates
                </button>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Build your days first, then generate all weeks with progression applied
                </span>
              </div>
              <div className="day-tabs">
                {phase.days.map((day, di) => (
                  <button key={day.id} className={`day-tab ${getActiveDay(pi) === di ? "active" : ""}`} onClick={() => setActiveDay(pi, di)}>{day.label}</button>
                ))}
                <button className="day-tab-add" onClick={() => addDay(pi)}><Icon name="plus" size={16} /></button>
              </div>
              {phase.days[getActiveDay(pi)] && (() => {
                const di = getActiveDay(pi), day = phase.days[di];
                return (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <div className="field-group" style={{ flex: 1 }}><label>Day Label</label><input value={day.label} onChange={e => updateDayLabel(pi, di, e.target.value)} /></div>
                      {phase.days.length > 1 && <button className="btn btn-danger btn-sm" onClick={() => removeDay(pi, di)}><Icon name="trash" size={14} /> Remove Day</button>}
                    </div>
                    <div className="section-header warmup"><Icon name="sunrise" size={16} /> Warm-up</div>
                    {(day.warmup || []).map((ex, ei) => (
                      <ExerciseCard key={ex.id} exercise={ex} index={ei} variant="warmup"
                        onChange={u => updateExInSection(pi, di, "warmup", ei, u)}
                        onRemove={() => removeExFromSection(pi, di, "warmup", ei)}
                        onOpenLibrary={() => setLibTarget({ phaseIdx: pi, dayIdx: di, section: "warmup", exIdx: ei })} />
                    ))}
                    <button className="btn btn-ghost btn-xs" onClick={() => addExToSection(pi, di, "warmup")} style={{ marginBottom: 4 }}><Icon name="plus" size={14} /> Add Warm-up</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => { setBulkTarget({ phaseIdx: pi, dayIdx: di, section: "warmup" }); setBulkText(""); }} style={{ marginLeft: 6, marginBottom: 8 }}><Icon name="layers" size={14} /> Bulk Add</button>
                    {renderBulkPanel("warmup", pi, di)}

                    <div className="section-header main"><Icon name="dumbbell" size={16} /> Main Work</div>
                    <GroupedExerciseList exercises={day.exercises || []}
                      onUpdate={(ei, u) => updateExInSection(pi, di, "exercises", ei, u)}
                      onRemove={(ei) => removeExFromSection(pi, di, "exercises", ei)}
                      onOpenLibrary={(ei) => setLibTarget({ phaseIdx: pi, dayIdx: di, section: "exercises", exIdx: ei })} />
                    <div style={{ display: "flex", gap: 6, marginTop: 8, marginBottom: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => addExToSection(pi, di, "exercises")}><Icon name="plus" size={16} /> Add Exercise</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setBulkTarget({ phaseIdx: pi, dayIdx: di, section: "exercises" }); setBulkText(""); }}><Icon name="layers" size={16} /> Bulk Add</button>
                    </div>
                    {renderBulkPanel("exercises", pi, di)}

                    <div className="section-header cooldown"><Icon name="moon" size={16} /> Cool-down</div>
                    {(day.cooldown || []).map((ex, ei) => (
                      <ExerciseCard key={ex.id} exercise={ex} index={ei} variant="cooldown"
                        onChange={u => updateExInSection(pi, di, "cooldown", ei, u)}
                        onRemove={() => removeExFromSection(pi, di, "cooldown", ei)}
                        onOpenLibrary={() => setLibTarget({ phaseIdx: pi, dayIdx: di, section: "cooldown", exIdx: ei })} />
                    ))}
                    <button className="btn btn-ghost btn-xs" onClick={() => addExToSection(pi, di, "cooldown")} style={{ marginBottom: 4 }}><Icon name="plus" size={14} /> Add Cool-down</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => { setBulkTarget({ phaseIdx: pi, dayIdx: di, section: "cooldown" }); setBulkText(""); }} style={{ marginLeft: 6 }}><Icon name="layers" size={14} /> Bulk Add</button>
                    {renderBulkPanel("cooldown", pi, di)}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      ))}
      <button className="btn btn-ghost" onClick={addPhase} style={{ marginTop: 12 }}><Icon name="plus" size={16} /> Add Phase</button>
      {libTarget && <LibraryModal library={library} onSelect={handleLibSelect} onClose={() => setLibTarget(null)} onAddToLibrary={onAddToLibrary} />}
      {toast && <Toast message={toast} />}
    </div>
  );
}

function ProgramPreview({ program, onBack }) {
  const renderExList = (list, variant) => {
    if (!list?.length) return null;
    const groups = []; let i = 0;
    while (i < list.length) {
      const ex = list[i];
      if (ex.groupType && ex.groupType !== "none" && ex.groupId) {
        const gId = ex.groupId, members = [];
        while (i < list.length && list[i].groupId === gId) { members.push(list[i]); i++; }
        groups.push({ type: ex.groupType, members });
      } else { groups.push({ type: "single", members: [ex] }); i++; }
    }
    let counter = 0;
    return groups.map((g, gi) => {
      if (g.type === "single") {
        counter++; const ex = g.members[0];
        return (<div key={ex.id} className="preview-ex">
          <div className={`preview-ex-num ${variant}`}>{counter}</div>
          <div className="preview-ex-details">
            <div className="preview-ex-name">{ex.name || "Unnamed"}</div>
            <div className="preview-ex-sets">{ex.sets.map(s => `${s.reps}${s.weight ? " x " + s.weight : ""}${s.tempo ? " @" + s.tempo : ""}${s.rpe ? " RPE " + s.rpe : ""}`).join(" | ")}</div>
            {ex.coachNotes && <div className="preview-ex-notes">{ex.coachNotes}</div>}
          </div>
        </div>);
      }
      return (<div key={gi} className={`preview-group-bar ${g.type === "circuit" ? "circuit" : ""}`}>
        <div className={`preview-group-label ${g.type === "circuit" ? "circuit" : ""}`}>{g.type}</div>
        {g.members.map(ex => { counter++; return (<div key={ex.id} className="preview-ex">
          <div className={`preview-ex-num ${variant}`}>{counter}</div>
          <div className="preview-ex-details">
            <div className="preview-ex-name">{ex.name || "Unnamed"}</div>
            <div className="preview-ex-sets">{ex.sets.map(s => `${s.reps}${s.weight ? " x " + s.weight : ""}${s.tempo ? " @" + s.tempo : ""}${s.rpe ? " RPE " + s.rpe : ""}`).join(" | ")}</div>
            {ex.coachNotes && <div className="preview-ex-notes">{ex.coachNotes}</div>}
          </div></div>); })}
      </div>);
    });
  };

  return (
    <div className="preview-container">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost" onClick={onBack}><Icon name="back" size={16} /> Back</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--bg-elevated)", padding: "4px 12px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="eye" size={14} /> Client Preview
        </span>
      </div>
      <div className="preview-program-name">{program.name}</div>
      {program.tags?.length > 0 && <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>{program.tags.map(t => <TagPill key={t} tag={t} small />)}</div>}
      <div className="preview-desc">{program.description || "No description provided."}</div>
      {program.phases.map(phase => (
        <div key={phase.id} className="preview-phase">
          <div className="preview-phase-title">{phase.name}</div>
          <div className="preview-phase-meta">{phase.weeks} weeks{phase.progression?.type !== "none" ? ` | Progression: +${phase.progression.amount}${phase.progression.unit} ${phase.progression.frequency}` : ""}</div>
          {phase.days.map(day => (
            <div key={day.id} className="preview-day">
              <div className="preview-day-title">{day.label}</div>
              {day.warmup?.length > 0 && (<><div style={{ fontSize: 11, fontWeight: 600, color: "var(--warning)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Warm-up</div>{renderExList(day.warmup, "warmup")}</>)}
              {renderExList(day.exercises, "main")}
              {day.cooldown?.length > 0 && (<><div style={{ fontSize: 11, fontWeight: 600, color: "var(--success)", textTransform: "uppercase", letterSpacing: 1, marginTop: 10, marginBottom: 6 }}>Cool-down</div>{renderExList(day.cooldown, "cooldown")}</>)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function generateExport(program) {
  const lines = [];
  lines.push(program.name.toUpperCase());
  if (program.tags?.length) lines.push("Tags: " + program.tags.join(", "));
  lines.push(program.description || ""); lines.push("=".repeat(50));
  program.phases.forEach(phase => {
    lines.push(""); lines.push(">> " + phase.name + "  (" + phase.weeks + " weeks)");
    if (phase.progression?.type !== "none") lines.push("   Progression: +" + phase.progression.amount + phase.progression.unit + " " + phase.progression.frequency);
    lines.push("-".repeat(50));
    phase.days.forEach(day => {
      lines.push(""); lines.push("  " + day.label); lines.push("  " + "-".repeat(40));
      const printList = (list, label) => {
        if (!list?.length) return;
        lines.push("    [" + label + "]");
        list.forEach((ex, i) => {
          lines.push("    " + (i + 1) + ". " + (ex.name || "Unnamed"));
          ex.sets.forEach((s, si) => { let st = "       Set " + (si + 1) + ": " + s.reps + " reps"; if (s.weight) st += " x " + s.weight; if (s.tempo) st += " @ " + s.tempo; if (s.rpe) st += " RPE " + s.rpe; lines.push(st); });
          if (ex.coachNotes) lines.push("       Cue: " + ex.coachNotes);
          if (ex.restSeconds) lines.push("       Rest: " + ex.restSeconds + "s");
        });
      };
      printList(day.warmup, "WARM-UP"); printList(day.exercises, "MAIN WORK"); printList(day.cooldown, "COOL-DOWN");
    });
  });
  lines.push(""); lines.push("Generated: " + new Date().toLocaleDateString() + " | Framewerks Fitness");
  return lines.join("\n");
}

function ProgramsView({ programs, onEdit, onNew, onDelete, onDuplicate, onPreview }) {
  return (
    <div>
      <div className="page-header"><h2>Programs</h2><button className="btn btn-primary" onClick={onNew}><Icon name="plus" size={16} /> New Program</button></div>
      {programs.length === 0 ? (
        <div className="empty-state"><h3>No programs yet</h3><p>Create your first training program to get started.</p><button className="btn btn-primary" onClick={onNew}><Icon name="plus" size={16} /> Create Program</button></div>
      ) : (
        <div className="program-grid">
          {programs.map(prog => (
            <div key={prog.id} className="program-card" onClick={() => onEdit(prog)}>
              <div className="program-card-actions">
                <button className="btn-icon" onClick={e => { e.stopPropagation(); onPreview(prog); }} title="Preview"><Icon name="eye" size={14} /></button>
                <button className="btn-icon" onClick={e => { e.stopPropagation(); onDuplicate(prog); }} title="Duplicate"><Icon name="copy" size={14} /></button>
                <button className="btn-icon" onClick={e => { e.stopPropagation();
                  const text = generateExport(prog); const blob = new Blob([text], { type: "text/plain" }); const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = prog.name.replace(/\s+/g, "_") + "_program.txt"; a.click(); URL.revokeObjectURL(url);
                }} title="Export"><Icon name="download" size={14} /></button>
                <button className="btn-icon danger" onClick={e => { e.stopPropagation(); onDelete(prog.id); }} title="Delete"><Icon name="trash" size={14} /></button>
              </div>
              <h3>{prog.name}</h3>
              {prog.tags?.length > 0 && <div className="card-tags">{prog.tags.map(t => <TagPill key={t} tag={t} small />)}</div>}
              <p>{prog.description || "No description"}</p>
              <div className="program-meta">
                <span><Icon name="grid" size={14} /> {prog.phases.length} phase{prog.phases.length !== 1 ? "s" : ""}</span>
                <span><Icon name="dumbbell" size={14} /> {prog.phases.reduce((s, p) => s + p.days.length, 0)} days</span>
                <span>Updated {new Date(prog.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientsView({ programs }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null); // clientId being assigned

  useEffect(() => {
    loadClients().then(c => { setClients(c); setLoading(false); }).catch(err => { console.error(err); setLoading(false); });
  }, []);

  const handleAssign = async (uid, programId) => {
    try {
      await assignProgramToClient(uid, programId);
      setClients(prev => prev.map(c => c.uid === uid ? { ...c, assignedProgramId: programId } : c));
      setAssigning(null);
    } catch (err) { console.error("Assign error:", err); }
  };

  const getProgramName = (id) => {
    const p = programs.find(pr => pr.id === id);
    return p ? p.name : "None";
  };

  return (
    <div>
      <div className="page-header"><h2>Clients</h2></div>
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading clients...</div>
      ) : clients.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          <Icon name="users" size={48} />
          <h3 style={{ marginTop: 16, color: "var(--text-secondary)" }}>No Clients Yet</h3>
          <p style={{ marginTop: 8, fontSize: 14 }}>When clients sign in to the Framewerks app with Google, they'll appear here automatically.</p>
        </div>
      ) : (
        <div className="client-list">
          {clients.map(c => (
            <div key={c.uid} className="client-card" style={{ flexWrap: "wrap" }}>
              <div className="client-avatar">
                {c.photoUrl ? <img src={c.photoUrl} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : (c.name || "?")[0]}
              </div>
              <div className="client-info" style={{ flex: 1 }}>
                <h4>{c.name || "Unknown"}</h4>
                <p>{c.email}</p>
                <p style={{ marginTop: 4, fontSize: 12 }}>
                  Program: <strong style={{ color: c.assignedProgramId ? "var(--accent)" : "var(--text-muted)" }}>
                    {c.assignedProgramId ? getProgramName(c.assignedProgramId) : "Not assigned"}
                  </strong>
                </p>
              </div>
              <div>
                {assigning === c.uid ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {programs.map(p => (
                      <button key={p.id} className="btn btn-ghost btn-sm"
                        style={{ fontSize: 11, padding: "4px 10px", justifyContent: "flex-start" }}
                        onClick={() => handleAssign(c.uid, p.id)}>
                        {p.name}
                      </button>
                    ))}
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "4px 10px", color: "var(--danger)" }}
                      onClick={() => handleAssign(c.uid, null)}>Unassign</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "4px 10px" }}
                      onClick={() => setAssigning(null)}>Cancel</button>
                  </div>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={() => setAssigning(c.uid)}>
                    <Icon name="send" size={14} /> Assign
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressView() {
  const [logs, setLogs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [allLogs, allClients] = await Promise.all([loadAllWorkoutLogs(), loadClients()]);
        setLogs(allLogs);
        setClients(allClients);
      } catch (err) { console.error("Progress load error:", err); }
      setLoading(false);
    }
    load();
  }, []);

  const filteredLogs = selectedClient ? logs.filter(l => l.userId === selectedClient) : logs;
  const totalSessions = filteredLogs.length;
  const totalSets = filteredLogs.reduce((a, l) => a + (l.completedSets || 0), 0);
  const avgFeeling = totalSessions > 0 ? (filteredLogs.reduce((a, l) => a + (l.feeling || 0), 0) / totalSessions).toFixed(1) : "—";

  const getClientName = (uid) => { const c = clients.find(cl => cl.uid === uid); return c?.name || c?.email || uid; };

  return (
    <div>
      <div className="page-header"><h2>Progress</h2></div>
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading client data...</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          <Icon name="chart" size={48} />
          <h3 style={{ marginTop: 16, color: "var(--text-secondary)" }}>No Workout Data Yet</h3>
          <p style={{ marginTop: 8, fontSize: 14 }}>When clients complete workouts, their logs will appear here.</p>
        </div>
      ) : (<>
        {/* Client filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          <button className={`btn btn-sm ${!selectedClient ? "btn-primary" : "btn-ghost"}`} onClick={() => setSelectedClient(null)}>All Clients</button>
          {clients.filter(c => logs.some(l => l.userId === c.uid)).map(c => (
            <button key={c.uid} className={`btn btn-sm ${selectedClient === c.uid ? "btn-primary" : "btn-ghost"}`} onClick={() => setSelectedClient(c.uid)}>{c.name || c.email}</button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[["Sessions", totalSessions], ["Sets Logged", totalSets], ["Avg Feeling", avgFeeling + "/5"]].map(([label, val]) => (
            <div key={label} style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>{val}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Recent logs */}
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>Recent Sessions</div>
        {filteredLogs.slice(0, 20).map(log => (
          <div key={log.id} style={{ background: "var(--bg-secondary)", borderRadius: 10, border: "1px solid var(--border)", padding: "14px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{log.dayLabel}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{getClientName(log.userId)} · {log.date} · {log.programName}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>{log.completedSets}/{log.totalSets}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>sets</div>
            </div>
          </div>
        ))}
      </>)}
    </div>
  );
}

function LibraryView({ library, onAddToLibrary, onRemoveFromLibrary }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [newMode, setNewMode] = useState(false);
  const [newEx, setNewEx] = useState({ name: "", category: "Chest", videoUrl: "", coachNotes: "" });

  const filtered = useMemo(() => library.filter(ex => (cat === "All" || ex.category === cat) && (!search || ex.name.toLowerCase().includes(search.toLowerCase()))), [library, cat, search]);

  const handleAdd = () => {
    if (!newEx.name.trim()) return;
    onAddToLibrary({ ...newEx, id: uid() }); setNewEx({ name: "", category: "Chest", videoUrl: "", coachNotes: "" }); setNewMode(false);
  };

  return (
    <div>
      <div className="page-header"><h2>Exercise Library</h2>
        <button className="btn btn-primary" onClick={() => setNewMode(!newMode)}><Icon name="plus" size={16} /> Add Exercise</button></div>
      {newMode && (
        <div style={{ padding: 20, background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <div className="field-group" style={{ flex: 2 }}><label>Name</label><input value={newEx.name} onChange={e => setNewEx({...newEx, name: e.target.value})} placeholder="Exercise name" /></div>
            <div className="field-group" style={{ flex: 1 }}><label>Category</label><select value={newEx.category} onChange={e => setNewEx({...newEx, category: e.target.value})}>{LIBRARY_CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div className="field-group" style={{ marginBottom: 12 }}><label>Video URL</label><input value={newEx.videoUrl} onChange={e => setNewEx({...newEx, videoUrl: e.target.value})} placeholder="YouTube link..." /></div>
          <div className="field-group" style={{ marginBottom: 12 }}><label>Coach Notes</label><input value={newEx.coachNotes} onChange={e => setNewEx({...newEx, coachNotes: e.target.value})} placeholder="Default coaching cues..." /></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAdd}><Icon name="check" size={14} /> Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setNewMode(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div className="search-wrapper" style={{ marginBottom: 16, position: "relative" }}>
        <Icon name="search" size={16} />
        <input className="search-input" placeholder="Search exercises..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40, marginBottom: 0 }} />
      </div>
      <div className="category-tabs" style={{ marginBottom: 16 }}>
        {LIBRARY_CATEGORIES.map(c => <button key={c} className={`cat-tab ${cat === c ? "active" : ""}`} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
        {filtered.map(ex => (
          <div key={ex.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
            <div><div style={{ fontSize: 14, fontWeight: 500 }}>{ex.name}</div><div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{ex.coachNotes || "No notes"}</div></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="lib-item-cat">{ex.category}</span>
              {ex.videoUrl && <div className="video-badge"><Icon name="play" size={10} /> VIDEO</div>}
              <button className="btn-icon danger" onClick={() => onRemoveFromLibrary(ex.id)}><Icon name="trash" size={14} /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No exercises found</p>}
      </div>
      <div className="info-note">{library.length} exercises in your library</div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────
export default function CoachDashboard() {
  const [programs, setPrograms] = useState([]);
  const [library, setLibrary] = useState(DEFAULT_LIBRARY);
  const [view, setView] = useState("programs");
  const [editingProgram, setEditingProgram] = useState(null);
  const [previewProgram, setPreviewProgram] = useState(null);
  const [nav, setNav] = useState("programs");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // Load data from Firebase on startup
  useEffect(() => {
    async function load() {
      try {
        const [progs, lib] = await Promise.all([loadPrograms(), loadLibrary()]);
        if (progs.length > 0) setPrograms(progs);
        else setPrograms(SAMPLE_PROGRAMS); // first time: load sample
        if (lib) setLibrary(lib);
      } catch (err) {
        console.error("Firebase load error:", err);
        setPrograms(SAMPLE_PROGRAMS);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Save library to Firebase whenever it changes (skip initial load)
  const libraryLoaded = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (!libraryLoaded.current) { libraryLoaded.current = true; return; }
    saveLibrary(library).catch(err => console.error("Library save error:", err));
  }, [library, loading]);

  const handleEdit = (p) => { setEditingProgram(p); setView("editor"); };
  const handleNew = () => { setEditingProgram(EMPTY_PROGRAM()); setView("editor"); };

  const handleSave = async (u) => {
    setPrograms(prev => prev.find(p => p.id === u.id) ? prev.map(p => p.id === u.id ? u : p) : [...prev, u]);
    try { await saveProgram(u); } catch (err) { console.error("Save error:", err); }
  };

  const handleDelete = async (id) => {
    setPrograms(prev => prev.filter(p => p.id !== id));
    try { await fbDeleteProgram(id); } catch (err) { console.error("Delete error:", err); }
  };

  const handleDuplicate = async (prog) => {
    const dup = JSON.parse(JSON.stringify(prog));
    dup.id = uid(); dup.name = prog.name + " (Copy)";
    dup.createdAt = new Date().toISOString(); dup.updatedAt = new Date().toISOString();
    dup.phases.forEach(ph => { ph.id = uid(); ph.days.forEach(d => { d.id = uid(); [d.warmup, d.exercises, d.cooldown].forEach(list => (list || []).forEach(ex => { ex.id = uid(); ex.sets.forEach(s => { s.id = uid(); }); })); }); });
    setPrograms(prev => [...prev, dup]); showToast("Program duplicated");
    try { await saveProgram(dup); } catch (err) { console.error("Duplicate save error:", err); }
  };

  const handlePreview = (p) => { setPreviewProgram(p); setView("preview"); };
  const handleBack = () => { setView("programs"); setEditingProgram(null); setPreviewProgram(null); setNav("programs"); };
  const navigateTo = (s) => { setNav(s); setView(s); setEditingProgram(null); setPreviewProgram(null); };

  if (loading) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>
          Loading Framewerks...
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="coach-app">
        <div className="sidebar">
          <div className="sidebar-brand"><h1>Framewerks</h1><span>Coach Dashboard</span></div>
          <nav className="sidebar-nav">
            <button className={`nav-item ${nav === "programs" ? "active" : ""}`} onClick={() => navigateTo("programs")}><Icon name="dumbbell" size={18} /> Programs</button>
            <button className={`nav-item ${nav === "library" ? "active" : ""}`} onClick={() => navigateTo("library")}><Icon name="book" size={18} /> Exercise Library</button>
            <button className={`nav-item ${nav === "clients" ? "active" : ""}`} onClick={() => navigateTo("clients")}><Icon name="users" size={18} /> Clients</button>
            <button className={`nav-item ${nav === "progress" ? "active" : ""}`} onClick={() => navigateTo("progress")}><Icon name="chart" size={18} /> Progress</button>
          </nav>
        </div>
        <div className="main-content">
          {view === "programs" && <ProgramsView programs={programs} onEdit={handleEdit} onNew={handleNew} onDelete={handleDelete} onDuplicate={handleDuplicate} onPreview={handlePreview} />}
          {view === "editor" && editingProgram && <ProgramEditor program={editingProgram} onSave={handleSave} onBack={handleBack} library={library} onAddToLibrary={ex => { setLibrary(p => [...p, ex]); showToast("Added to library"); }} />}
          {view === "preview" && previewProgram && <ProgramPreview program={previewProgram} onBack={handleBack} />}
          {view === "library" && <LibraryView library={library} onAddToLibrary={ex => { setLibrary(p => [...p, ex]); showToast("Added to library"); }} onRemoveFromLibrary={id => setLibrary(p => p.filter(e => e.id !== id))} />}
          {view === "clients" && <ClientsView programs={programs} />}
          {view === "progress" && <ProgressView />}
        </div>
      </div>
      {toast && <Toast message={toast} />}
    </>
  );
}
