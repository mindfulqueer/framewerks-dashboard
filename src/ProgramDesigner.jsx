// ─── ProgramDesigner.jsx ─────────────────────────────────────────────────────
// Drop this file into src/ alongside App.jsx
// In App.jsx, replace:
//   import ... ProgramDesigner from within the file
// with:
//   import ProgramDesigner from "./ProgramDesigner";
//
// Also ensure these are imported at the top of App.jsx (already there):
//   addDoc, updateDoc, doc, collection, serverTimestamp, auth, db

import { useState } from "react";
import { getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyDwCIb6OQ40TDNlNr1TjxO4kZVf2Ho62X8",
  authDomain: "framewerks-coach.firebaseapp.com",
  projectId: "framewerks-coach",
  storageBucket: "framewerks-coach.firebasestorage.app",
  messagingSenderId: "850336233136",
  appId: "1:850336233136:web:2bf59afb82672435c4ed75"
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0A0A0A", surface: "#111111", card: "#161616", border: "#252525",
  borderLight: "#2E2E2E", accent: "#E8FF00", accentRed: "#FF3D3D",
  accentBlue: "#00C8FF", accentGreen: "#00FF88", accentOrange: "#FF8C00",
  text: "#FFFFFF", textMuted: "#777777", textDim: "#444444",
};
const F = { display: "'Bebas Neue', 'Impact', sans-serif", body: "system-ui, -apple-system, sans-serif" };
const S = {
  input: { width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, fontFamily: F.body, outline: "none", boxSizing: "border-box" },
  label: { fontSize: 10, fontFamily: F.body, color: C.textMuted, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6, display: "block" },
  btn: (v = "primary") => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer",
    fontFamily: F.display, letterSpacing: "0.08em", fontSize: 15, transition: "all 0.15s",
    ...(v === "primary" ? { background: C.accent, color: "#000" }
      : v === "danger"  ? { background: C.accentRed, color: "#fff" }
      : v === "ghost"   ? { background: "transparent", color: C.text, border: `1px solid ${C.border}` }
      : v === "dim"     ? { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` }
      : {}),
  }),
  pill: (color = C.accent) => ({
    display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20,
    fontSize: 10, fontFamily: F.body, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
    background: color + "20", color, border: `1px solid ${color}33`,
  }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const mkId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const mkExercise = (d = {}) => ({ id: mkId(), name: d.name || "", sets: d.sets || 3, reps: d.reps || "8-10", tempo: d.tempo || "", rpe: d.rpe || "", rest: d.rest || "60s", startWeight: d.startWeight || "", notes: d.notes || "", groupId: d.groupId || null });
const mkBlock  = (idx) => ({ id: mkId(), name: `Block ${String.fromCharCode(65 + idx)}`, type: "straight", exercises: [] });
const mkSimpleEx = () => ({ id: mkId(), name: "", duration: "" });
const mkDay = (idx) => ({ id: mkId(), name: `Day ${idx + 1}`, warmup: [], blocks: [mkBlock(0)], cooldown: { exercises: [], breathing: { pattern: "4-4-4-4", notes: "" } } });

const BLOCK_COLORS = { straight: C.accent, circuit: C.accentBlue, superset: C.accentGreen, emom: C.accentOrange };
const GROUP_PALETTE = [C.accent, C.accentBlue, C.accentGreen, C.accentOrange, C.accentRed, "#CC44FF"];

// ─── Breathing Input ──────────────────────────────────────────────────────────
function BreathingPatternInput({ value, onChange }) {
  const parts = (value || "4-4-4-4").split("-");
  const labels = ["INHALE", "HOLD", "EXHALE", "HOLD"];
  const update = (i, v) => { const p = [...parts]; p[i] = v; onChange(p.join("-")); };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {labels.map((lbl, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 9, fontFamily: F.body, color: C.textMuted, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 4 }}>{lbl}</div>
            <input type="number" min={1} max={20} value={parts[i] || 4} onChange={e => update(i, e.target.value)}
              style={{ ...S.input, textAlign: "center", fontSize: 22, fontFamily: F.display, padding: "8px 4px" }} />
            <div style={{ fontSize: 9, fontFamily: F.body, color: C.textDim, marginTop: 3 }}>sec</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", fontSize: 15, fontFamily: F.display, color: C.accentBlue, letterSpacing: "0.2em" }}>
        {parts.join(" – ")} &nbsp;<span style={{ color: C.textMuted, fontSize: 11, fontFamily: F.body }}>seconds</span>
      </div>
    </div>
  );
}

// ─── Single Exercise Row ──────────────────────────────────────────────────────
function ExerciseRow({ ex, label, blockType, onUpdate, onRemove, onToggleGroup, isGrouped, groupColor }) {
  const accent = BLOCK_COLORS[blockType] || C.accent;
  const fields = [
    { key: "sets",        ph: "3",     w: 50  },
    { key: "reps",        ph: "8-10",  w: 72  },
    { key: "tempo",       ph: "3010",  w: 66  },
    { key: "rpe",         ph: "7",     w: 50  },
    { key: "rest",        ph: "60s",   w: 60  },
    { key: "startWeight", ph: "lbs",   w: 68  },
    { key: "notes",       ph: "Cues",  w: 130 },
  ];
  return (
    <tr style={{ borderBottom: `1px solid ${C.border}44`, background: isGrouped ? (groupColor || accent) + "08" : "transparent" }}>
      <td style={{ padding: "5px 8px", whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {label && <span style={{ fontFamily: F.display, fontSize: 15, color: accent, minWidth: 28 }}>{label}</span>}
          <button onClick={onToggleGroup} title={isGrouped ? "Ungroup" : "Link with adjacent (superset)"}
            style={{ background: isGrouped ? (groupColor || accent) + "30" : "transparent", border: `1px solid ${isGrouped ? (groupColor || accent) : C.border}`, borderRadius: 4, padding: "2px 5px", cursor: "pointer", fontSize: 11, color: isGrouped ? (groupColor || accent) : C.textDim }}>
            ⛓
          </button>
        </div>
      </td>
      <td style={{ padding: "4px 5px", minWidth: 165 }}>
        <input value={ex.name} onChange={e => onUpdate("name", e.target.value)} placeholder="Exercise name"
          style={{ ...S.input, padding: "5px 9px", fontSize: 13 }} />
      </td>
      {fields.map(({ key, ph, w }) => (
        <td key={key} style={{ padding: "4px 5px", minWidth: w }}>
          <input value={ex[key] || ""} onChange={e => onUpdate(key, e.target.value)} placeholder={ph}
            style={{ ...S.input, padding: "5px 7px", fontSize: 12 }} />
        </td>
      ))}
      <td style={{ padding: "4px 5px" }}>
        <button onClick={onRemove} style={{ background: "transparent", border: "none", color: C.accentRed, cursor: "pointer", fontSize: 16, padding: "3px 6px" }}>✕</button>
      </td>
    </tr>
  );
}

// ─── Training Block ───────────────────────────────────────────────────────────
function TrainingBlock({ block, blockIdx, onUpdate, onRemove }) {
  const [quickText, setQuickText] = useState("");
  const accent = BLOCK_COLORS[block.type] || C.accent;

  const addEx  = (d = {}) => onUpdate("exercises", [...block.exercises, mkExercise(d)]);
  const removeEx = (id) => onUpdate("exercises", block.exercises.filter(e => e.id !== id));
  const updateEx = (id, field, val) => onUpdate("exercises", block.exercises.map(e => e.id === id ? { ...e, [field]: val } : e));

  const toggleGroup = (exId) => {
    const ex = block.exercises.find(e => e.id === exId);
    if (ex.groupId) {
      onUpdate("exercises", block.exercises.map(e => e.id === exId ? { ...e, groupId: null } : e));
    } else {
      const idx = block.exercises.findIndex(e => e.id === exId);
      const prev = block.exercises[idx - 1];
      const next = block.exercises[idx + 1];
      const gId = prev?.groupId || next?.groupId || mkId();
      onUpdate("exercises", block.exercises.map((e, i) => i === idx ? { ...e, groupId: gId } : e));
    }
  };

  const groupColor = (gId) => {
    if (!gId) return null;
    const groups = [...new Set(block.exercises.map(e => e.groupId).filter(Boolean))];
    return GROUP_PALETTE[groups.indexOf(gId) % GROUP_PALETTE.length];
  };

  const getLabel = (ex, idx) => {
    const L = String.fromCharCode(65 + blockIdx);
    if (!ex.groupId) return `${L}${idx + 1}`;
    const groups = [...new Set(block.exercises.map(e => e.groupId).filter(Boolean))];
    const gi = groups.indexOf(ex.groupId);
    const wi = block.exercises.filter(e => e.groupId === ex.groupId).findIndex(e => e.id === ex.id);
    return `${L}${gi + 1}${String.fromCharCode(97 + wi)}`;
  };

  const handleQuickAdd = () => {
    quickText.split("\n").filter(l => l.trim()).forEach(line => {
      const parts = line.trim().split(/\s+/);
      const name = parts[0].replace(/_/g, " ");
      let sets = 3, reps = "8-10", tempo = "", rpe = "", rest = "60s", startWeight = "";
      parts.slice(1).forEach(p => {
        if (/^\d+x/i.test(p))             { const [s,r] = p.split("x"); sets = parseInt(s); reps = r; }
        else if (/^RPE\d/i.test(p))        rpe = p.replace(/rpe/i, "");
        else if (/^\d{4}$/.test(p))        tempo = p;
        else if (/^rest/i.test(p))         rest = p.replace(/rest/i, "");
        else if (/^\d+(kg|lbs?)$/i.test(p)) startWeight = p;
      });
      addEx({ name, sets, reps, tempo, rpe, rest, startWeight });
    });
    setQuickText("");
  };

  return (
    <div style={{ border: `1px solid ${accent}30`, borderRadius: 10, padding: "16px 18px", marginBottom: 14, background: C.card }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ fontSize: 28, fontFamily: F.display, color: accent, lineHeight: 1, minWidth: 26 }}>
          {String.fromCharCode(65 + blockIdx)}
        </div>
        <input value={block.name} onChange={e => onUpdate("name", e.target.value)}
          style={{ ...S.input, width: 165, padding: "7px 11px", fontSize: 13 }} />
        <select value={block.type} onChange={e => onUpdate("type", e.target.value)}
          style={{ ...S.input, width: "auto", minWidth: 140, fontFamily: F.body, fontSize: 12 }}>
          <option value="straight">Straight Sets</option>
          <option value="superset">Superset</option>
          <option value="circuit">Circuit</option>
          <option value="emom">EMOM</option>
        </select>
        <span style={S.pill(accent)}>{block.type.toUpperCase()}</span>
        <button onClick={onRemove} style={{ ...S.btn("danger"), padding: "5px 11px", fontSize: 11, marginLeft: "auto" }}>REMOVE BLOCK</button>
      </div>

      {/* Table */}
      {block.exercises.length > 0 && (
        <div style={{ overflowX: "auto", marginBottom: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 12, minWidth: 820 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["#", "EXERCISE", "SETS", "REPS", "TEMPO", "RPE", "REST", "START WT", "NOTES", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", color: C.textMuted, fontWeight: 700, letterSpacing: "0.08em", padding: "5px 5px", fontSize: 9, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.exercises.map((ex, exIdx) => (
                <ExerciseRow key={ex.id} ex={ex}
                  label={getLabel(ex, exIdx)} blockType={block.type}
                  onUpdate={(f, v) => updateEx(ex.id, f, v)}
                  onRemove={() => removeEx(ex.id)}
                  onToggleGroup={() => toggleGroup(ex.id)}
                  isGrouped={!!ex.groupId} groupColor={groupColor(ex.groupId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick add */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, fontFamily: F.body, color: C.textDim, marginBottom: 4 }}>
          QUICK ADD — one per line: Name SETSxREPS RPE8 3010 rest60s 80lbs
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <textarea value={quickText} onChange={e => setQuickText(e.target.value)}
            placeholder={"Barbell_Squat 4x8 RPE8 3010 rest90s 100lbs\nRDL 3x10 RPE7 2010 rest60s"}
            rows={2} style={{ ...S.input, flex: 1, resize: "none", fontSize: 12, lineHeight: 1.5 }} />
          <button onClick={handleQuickAdd} style={{ ...S.btn("primary"), alignSelf: "flex-end", fontSize: 12, padding: "8px 14px", flexShrink: 0 }}>ADD</button>
        </div>
      </div>
      <button onClick={() => addEx()} style={{ ...S.btn("ghost"), fontSize: 12, padding: "6px 14px" }}>+ ADD ROW</button>
    </div>
  );
}

// ─── Day Editor ───────────────────────────────────────────────────────────────
function DayEditor({ day, dayIdx, onUpdate, onRemove }) {
  const updateWarmup   = (id, f, v) => onUpdate("warmup", day.warmup.map(e => e.id === id ? { ...e, [f]: v } : e));
  const removeWarmup   = (id) => onUpdate("warmup", day.warmup.filter(e => e.id !== id));
  const addWarmup      = () => onUpdate("warmup", [...day.warmup, mkSimpleEx()]);
  const addBlock       = () => onUpdate("blocks", [...day.blocks, mkBlock(day.blocks.length)]);
  const removeBlock    = (id) => onUpdate("blocks", day.blocks.filter(b => b.id !== id));
  const updateBlock    = (id, f, v) => onUpdate("blocks", day.blocks.map(b => b.id === id ? { ...b, [f]: v } : b));
  const updateCoolEx   = (id, f, v) => onUpdate("cooldown", { ...day.cooldown, exercises: day.cooldown.exercises.map(e => e.id === id ? { ...e, [f]: v } : e) });
  const removeCoolEx   = (id) => onUpdate("cooldown", { ...day.cooldown, exercises: day.cooldown.exercises.filter(e => e.id !== id) });
  const addCoolEx      = () => onUpdate("cooldown", { ...day.cooldown, exercises: [...day.cooldown.exercises, mkSimpleEx()] });
  const updateBreath   = (f, v) => onUpdate("cooldown", { ...day.cooldown, breathing: { ...day.cooldown.breathing, [f]: v } });

  const secHead = (emoji, title, color = C.accent) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <div style={{ fontSize: 20, fontFamily: F.display, color }}>{title}</div>
      <div style={{ flex: 1, height: 1, background: color + "28" }} />
    </div>
  );

  return (
    <div style={{ border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "20px", marginBottom: 16, background: C.surface }}>
      {/* Day header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 32, fontFamily: F.display, color: C.accent, lineHeight: 1 }}>D{dayIdx + 1}</div>
        <input value={day.name} onChange={e => onUpdate("name", e.target.value)}
          style={{ ...S.input, width: 230, padding: "8px 12px", fontSize: 15 }} />
        <button onClick={onRemove} style={{ ...S.btn("dim"), fontSize: 11, padding: "6px 12px", marginLeft: "auto", color: C.accentRed, borderColor: C.accentRed + "44" }}>
          REMOVE DAY
        </button>
      </div>

      {/* ── WARM UP ── */}
      <div style={{ marginBottom: 22 }}>
        {secHead("🔥", "WARM UP", C.accentOrange)}
        {day.warmup.map(ex => (
          <div key={ex.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input value={ex.name} onChange={e => updateWarmup(ex.id, "name", e.target.value)}
              placeholder="Exercise / activity" style={{ ...S.input, flex: 2, padding: "8px 11px", fontSize: 13 }} />
            <input value={ex.duration} onChange={e => updateWarmup(ex.id, "duration", e.target.value)}
              placeholder="Duration (e.g. 5 min, 10 reps)" style={{ ...S.input, flex: 1, padding: "8px 11px", fontSize: 13 }} />
            <button onClick={() => removeWarmup(ex.id)}
              style={{ background: "transparent", border: "none", color: C.accentRed, cursor: "pointer", fontSize: 18, padding: "4px 8px", flexShrink: 0 }}>✕</button>
          </div>
        ))}
        <button onClick={addWarmup} style={{ ...S.btn("ghost"), fontSize: 12, padding: "6px 14px" }}>+ ADD WARM UP</button>
      </div>

      {/* ── TRAINING BLOCKS ── */}
      <div style={{ marginBottom: 22 }}>
        {secHead("💪", "TRAINING BLOCKS", C.accent)}
        {day.blocks.map((block, bIdx) => (
          <TrainingBlock key={block.id} block={block} blockIdx={bIdx}
            onUpdate={(f, v) => updateBlock(block.id, f, v)}
            onRemove={() => removeBlock(block.id)}
          />
        ))}
        <button onClick={addBlock} style={{ ...S.btn("ghost"), width: "100%", fontSize: 14, padding: "11px", borderStyle: "dashed" }}>
          + ADD TRAINING BLOCK
        </button>
      </div>

      {/* ── COOL DOWN ── */}
      <div>
        {secHead("🧘", "COOL DOWN", C.accentBlue)}
        {day.cooldown.exercises.map(ex => (
          <div key={ex.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input value={ex.name} onChange={e => updateCoolEx(ex.id, "name", e.target.value)}
              placeholder="Stretch / mobility" style={{ ...S.input, flex: 2, padding: "8px 11px", fontSize: 13 }} />
            <input value={ex.duration} onChange={e => updateCoolEx(ex.id, "duration", e.target.value)}
              placeholder="Duration" style={{ ...S.input, flex: 1, padding: "8px 11px", fontSize: 13 }} />
            <button onClick={() => removeCoolEx(ex.id)}
              style={{ background: "transparent", border: "none", color: C.accentRed, cursor: "pointer", fontSize: 18, padding: "4px 8px", flexShrink: 0 }}>✕</button>
          </div>
        ))}
        <button onClick={addCoolEx} style={{ ...S.btn("ghost"), fontSize: 12, padding: "6px 14px", marginBottom: 16 }}>+ ADD COOL DOWN EXERCISE</button>

        {/* Breathing clock */}
        <div style={{ background: C.card, border: `1px solid ${C.accentBlue}33`, borderRadius: 10, padding: "18px" }}>
          <div style={{ fontSize: 15, fontFamily: F.display, color: C.accentBlue, marginBottom: 3 }}>BREATHING PATTERN</div>
          <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
            Sets seconds for each phase — syncs to a breathing clock in the client app.<br />
            Example: 4-4-4-4 = inhale 4s · hold 4s · exhale 4s · hold 4s
          </div>
          <BreathingPatternInput value={day.cooldown.breathing.pattern} onChange={v => updateBreath("pattern", v)} />
          <div style={{ marginTop: 14 }}>
            <label style={S.label}>COACHING NOTE</label>
            <input value={day.cooldown.breathing.notes} onChange={e => updateBreath("notes", e.target.value)}
              placeholder="e.g. Breathe through the nose, long slow exhale..."
              style={{ ...S.input, fontSize: 13, padding: "8px 11px" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Program Designer (main export) ──────────────────────────────────────────
export default function ProgramDesigner({ clients, onBack }) {
  const [programName, setProgramName] = useState("");
  const [programWeeks, setProgramWeeks] = useState(8);
  const [assignedClient, setAssignedClient] = useState("");
  const [days, setDays] = useState([mkDay(0)]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addDay    = () => setDays(prev => [...prev, mkDay(prev.length)]);
  const removeDay = (id) => setDays(prev => prev.filter(d => d.id !== id));
  const updateDay = (id, field, value) => setDays(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));

  const setDayCount = (n) => {
    setDays(prev => {
      if (n > prev.length) return [...prev, ...Array(n - prev.length).fill(0).map((_, i) => mkDay(prev.length + i))];
      return prev.slice(0, n);
    });
  };

  const handleSave = async () => {
    if (!programName) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, "programs"), {
        name: programName, weeks: programWeeks,
        assignedClientId: assignedClient || null,
        days, createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid,
      });
      if (assignedClient) {
        await updateDoc(doc(db, "clients", assignedClient), {
          assignedProgramId: ref.id, assignedProgramName: programName,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div style={{ fontFamily: F.display }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        input::placeholder, textarea::placeholder { color: #444; }
        textarea { font-family: system-ui; color: #fff; background: #111; }
        select option { background: #161616; color: #fff; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <button onClick={onBack} style={{ ...S.btn("dim"), fontSize: 12, padding: "6px 12px", marginBottom: 12 }}>← BACK TO PROGRAMS</button>
          <div style={{ fontSize: 32, letterSpacing: "0.05em", lineHeight: 1 }}>PROGRAM DESIGNER</div>
          <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, marginTop: 4 }}>BUILD A CUSTOM TRAINING PROGRAM</div>
        </div>
        <button onClick={handleSave} disabled={saving || !programName}
          style={{ ...S.btn("primary"), fontSize: 16, opacity: !programName ? 0.4 : 1 }}>
          {saving ? "SAVING..." : saved ? "✓ SAVED!" : "SAVE PROGRAM"}
        </button>
      </div>

      {/* Program details card */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px", marginBottom: 24 }}>
        <div style={{ fontSize: 16, marginBottom: 14 }}>PROGRAM DETAILS</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 16, marginBottom: 20 }}>
          <div>
            <label style={S.label}>PROGRAM NAME</label>
            <input value={programName} onChange={e => setProgramName(e.target.value)}
              placeholder="e.g. Rebuild Method Phase 2" style={S.input} />
          </div>
          <div>
            <label style={S.label}>DURATION (WEEKS)</label>
            <input type="number" value={programWeeks} onChange={e => setProgramWeeks(parseInt(e.target.value) || 1)}
              min={1} max={52} style={S.input} />
          </div>
          <div>
            <label style={S.label}>ASSIGN TO CLIENT</label>
            <select value={assignedClient} onChange={e => setAssignedClient(e.target.value)}
              style={{ ...S.input, fontFamily: F.body }}>
              <option value="">— No assignment —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
            </select>
          </div>
        </div>

        {/* Day selector */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          <label style={S.label}>TRAINING DAYS PER WEEK</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {[1,2,3,4,5,6,7].map(n => (
              <button key={n} onClick={() => setDayCount(n)}
                style={{
                  width: 38, height: 38, borderRadius: 8,
                  border: `1px solid ${days.length === n ? C.accent : C.border}`,
                  background: days.length === n ? C.accent + "22" : "transparent",
                  color: days.length === n ? C.accent : C.textMuted,
                  cursor: "pointer", fontFamily: F.display, fontSize: 16,
                }}>
                {n}
              </button>
            ))}
            <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, marginLeft: 8 }}>
              Rename each day below — e.g. "Lower Body A", "Push Day", "Active Recovery"
            </div>
          </div>
        </div>
      </div>

      {/* Day editors */}
      {days.map((day, dayIdx) => (
        <DayEditor key={day.id} day={day} dayIdx={dayIdx}
          onUpdate={(field, value) => updateDay(day.id, field, value)}
          onRemove={() => removeDay(day.id)}
        />
      ))}

      <button onClick={addDay}
        style={{ ...S.btn("ghost"), width: "100%", fontSize: 14, padding: "14px", marginTop: 4, borderStyle: "dashed" }}>
        + ADD DAY
      </button>
    </div>
  );
}
