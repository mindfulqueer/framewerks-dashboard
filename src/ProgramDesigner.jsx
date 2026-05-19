// ProgramDesigner.jsx — save as src/ProgramDesigner.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp, getDoc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyDwCIb6OQ40TDNlNr1TjxO4kZVf2Ho62X8",
  authDomain: "framewerks-coach.firebaseapp.com",
  projectId: "framewerks-coach",
  storageBucket: "framewerks-coach.firebasestorage.app",
  messagingSenderId: "850336233136",
  appId: "1:850336233136:web:2bf59afb82672435c4ed75"
};
const _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(_app);
const auth = getAuth(_app);

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0A0A0A", surface: "#111111", card: "#161616", border: "#252525",
  borderLight: "#2E2E2E", accent: "#E8FF00", accentRed: "#FF3D3D",
  accentBlue: "#00C8FF", accentGreen: "#00FF88", accentOrange: "#FF8C00",
  text: "#FFFFFF", textMuted: "#777777", textDim: "#444444",
};
const F = { display: "'Bebas Neue', 'Impact', sans-serif", body: "system-ui, -apple-system, sans-serif" };

const S = {
  input: { width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: F.body, outline: "none", boxSizing: "border-box" },
  label: { fontSize: 10, fontFamily: F.body, color: C.textMuted, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 5, display: "block" },
  btn: (v = "primary") => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer",
    fontFamily: F.display, letterSpacing: "0.08em", fontSize: 14, transition: "opacity 0.15s",
    ...(v === "primary" ? { background: C.accent, color: "#000" }
      : v === "danger"  ? { background: C.accentRed, color: "#fff" }
      : v === "ghost"   ? { background: "transparent", color: C.text, border: `1px solid ${C.border}` }
      : v === "dim"     ? { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` }
      : {}),
  }),
  pill: (color = C.accent) => ({
    display: "inline-flex", alignItems: "center", padding: "2px 9px", borderRadius: 20,
    fontSize: 10, fontFamily: F.body, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
    background: color + "20", color, border: `1px solid ${color}33`,
  }),
};

// ─── Factories ────────────────────────────────────────────────────────────────
const mkId  = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const mkEx  = (d = {}) => ({ id: mkId(), name: d.name || "", sets: d.sets || 3, reps: d.reps || "8-10", tempo: d.tempo || "", rpe: d.rpe || "", rest: d.rest || "60s", startWeight: d.startWeight || "", notes: d.notes || "", groupId: d.groupId || null });
const mkBlk = (idx) => ({ id: mkId(), name: `Block ${String.fromCharCode(65 + idx)}`, type: "straight", exercises: [] });
const mkSEx = () => ({ id: mkId(), name: "", duration: "" });
const mkDay = (idx) => ({ id: mkId(), name: `Day ${idx + 1}`, warmup: [], blocks: [mkBlk(0)], cooldown: { exercises: [], breathing: { pattern: "4-4-4-4", notes: "" } } });

const BLOCK_COLORS  = { straight: C.accent, circuit: C.accentBlue, superset: C.accentGreen, emom: C.accentOrange };
const GROUP_PALETTE = [C.accent, C.accentBlue, C.accentGreen, C.accentOrange, C.accentRed, "#CC44FF"];

// ─── Rep scheme parser ────────────────────────────────────────────────────────
// "12/10/8/6" → ["12","10","8","6"]  "6-8" → ["6-8","6-8",...]  "8" → ["8","8",...]
const parseReps = (repsStr, sets) => {
  if (!repsStr) return Array(sets).fill("");
  if (repsStr.includes("/")) {
    const parts = repsStr.split("/");
    return Array(sets).fill("").map((_, i) => parts[i] || parts[parts.length - 1]);
  }
  return Array(sets).fill(repsStr);
};

// ─── Quick-add parser ─────────────────────────────────────────────────────────
// Supports natural spacing: "Barbell Squat 4x8 RPE8 3010 rest90s 100lbs"
// Also: "Barbell Squat 4x12/10/8/6 RPE8"
const parseQuickLine = (line) => {
  const tokens = line.trim().split(/\s+/);
  let sets = 3, reps = "8-10", tempo = "", rpe = "", rest = "60s", startWeight = "";
  const nameTokens = [];

  tokens.forEach(t => {
    if (/^\d+x[\d\/\-]+$/i.test(t)) {
      const [s, r] = t.split("x"); sets = parseInt(s); reps = r;
    } else if (/^RPE\d+(\.\d)?$/i.test(t)) {
      rpe = t.replace(/rpe/i, "");
    } else if (/^\d{4}$/.test(t)) {
      tempo = t;
    } else if (/^rest\d+[sm]?$/i.test(t)) {
      rest = t.replace(/rest/i, "");
    } else if (/^\d+(kg|lbs?)$/i.test(t)) {
      startWeight = t;
    } else {
      nameTokens.push(t);
    }
  });

  return { name: nameTokens.join(" "), sets, reps, tempo, rpe, rest, startWeight };
};

// ─── Cue Database ─────────────────────────────────────────────────────────────
// Stores cues in Firestore: exerciseCues/{slugified_name} → { name, cues[] }
const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const BUILT_IN_CUES = {
  "barbell squat":         ["Chest up, brace your core before you descend", "Drive knees out over toes throughout", "Push the floor away — don't think about standing up"],
  "romanian deadlift":     ["Hinge at the hips, not the lower back", "Keep the bar close to your legs the whole way down", "Feel the hamstring stretch before you drive back up"],
  "bench press":           ["Retract and depress your shoulder blades before you unrack", "Drive your feet into the floor — leg drive transfers to the bar", "Bar path should arc slightly — not straight up and down"],
  "bent over row":         ["Hinge to 45° and hold that angle the whole set", "Pull the bar to your hip, not your chest", "Lead with the elbow — not the hand"],
  "overhead press":        ["Squeeze your glutes and brace hard before you press", "Bar starts at chin, finish with ears through the window", "Don't flare the rib cage — stay stacked"],
  "pull up":               ["Dead hang start — full shoulder depression before pulling", "Pull your chest to the bar, not your chin", "Control the negative — 2-3 seconds down"],
  "deadlift":              ["Push the floor away — don't think about pulling the bar", "Lat tightness: protect your armpits from rain", "Lock hips and knees out at the same time — don't hyperextend"],
  "leg press":             ["Full range: knees to chest, don't lock out at the top", "Feet hip-width apart — toes slightly out", "Drive through the whole foot, not just the heels"],
  "walking lunge":         ["Long stride so front shin stays vertical", "Drop the back knee toward the ground — don't lean forward", "Keep your torso tall the whole movement"],
  "plank":                 ["Brace like you're about to take a punch to the stomach", "Squeeze glutes to protect your lower back", "Push the floor away — create tension from head to heel"],
  "push up":               ["Hands just outside shoulder width, elbows 45° — not flared", "Lower until chest nearly touches, full lockout at top", "Your body is one rigid plank — no hips sagging or piking"],
  "dumbbell row":          ["Support arm locked — create a stable shelf", "Elbow drives up and back past the hip", "Pause at the top and squeeze the lat before lowering"],
  "hip thrust":            ["Upper back rests on bench — not your neck", "Drive through the whole foot, not just the heel", "Squeeze glutes hard at the top — posteriorly tilt the pelvis"],
  "bulgarian split squat": ["Front foot far enough forward that shin stays vertical", "Drop the back knee straight down — not forward", "Control the descent — gravity isn't your friend here"],
  "face pull":             ["Elbows high and wide — above shoulder height", "Pull toward your nose, external rotate at the end", "This is a health movement — go lighter and feel it"],
  "lateral raise":         ["Lead with your elbows, not your wrists", "Slight forward lean of the torso (10-15°) for better shoulder angle", "Don't shrug — keep traps relaxed"],
  "bicep curl":            ["Elbows anchored at your sides the whole time", "Supinate at the top — turn your pinky up", "Full extension at the bottom — don't cut the range"],
  "tricep pushdown":       ["Elbows stay pinned to your ribs throughout", "Full lockout at the bottom — squeeze the tricep", "Control the eccentric — don't let the weight snap back"],
  "cable fly":             ["Arms slightly bent — maintain that angle the whole rep", "Think hugging a tree, not pushing a door", "Initiate the movement from the pec, not the shoulder"],
  "leg curl":              ["Plant your hips into the pad before you curl", "Full range — let the weight stretch the hamstring at the bottom", "Dorsiflexed feet (toes toward shin) increases hamstring tension"],
};

async function fetchCues(exerciseName) {
  if (!exerciseName.trim()) return [];
  const key = slugify(exerciseName);

  // Check Firestore first
  try {
    const snap = await getDoc(doc(db, "exerciseCues", key));
    if (snap.exists()) return snap.data().cues || [];
  } catch {}

  // Check built-in
  const builtIn = BUILT_IN_CUES[exerciseName.toLowerCase().trim()];
  if (builtIn) {
    try { await setDoc(doc(db, "exerciseCues", key), { name: exerciseName, cues: builtIn, createdAt: serverTimestamp() }); } catch {}
    return builtIn;
  }

  // Generate via Claude API
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `You are an expert strength coach. Give exactly 3 concise, practical coaching cues for the exercise: "${exerciseName}". 
Return ONLY a JSON array of 3 strings. No preamble. Example: ["Cue one here","Cue two here","Cue three here"]`
        }]
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "[]";
    const cues = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (Array.isArray(cues) && cues.length > 0) {
      try { await setDoc(doc(db, "exerciseCues", key), { name: exerciseName, cues, createdAt: serverTimestamp() }); } catch {}
      return cues;
    }
  } catch {}

  return [];
}

// ─── Breathing input ──────────────────────────────────────────────────────────
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
      <div style={{ textAlign: "center", fontSize: 14, fontFamily: F.display, color: C.accentBlue, letterSpacing: "0.18em" }}>
        {parts.join(" – ")}
      </div>
    </div>
  );
}

// ─── Cue panel ────────────────────────────────────────────────────────────────
function CuePanel({ exerciseName, onClose }) {
  const [cues, setCues] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!exerciseName) return;
    setLoading(true);
    fetchCues(exerciseName).then(c => { setCues(c); setLoading(false); });
  }, [exerciseName]);

  return (
    <div style={{ background: C.card, border: `1px solid ${C.accentBlue}44`, borderRadius: 10, padding: "14px 16px", marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontFamily: F.display, color: C.accentBlue, letterSpacing: "0.08em" }}>
          COACHING CUES — {exerciseName.toUpperCase()}
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.textDim, cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>
      {loading ? (
        <div style={{ fontSize: 12, fontFamily: F.body, color: C.textMuted }}>Fetching cues...</div>
      ) : cues.length === 0 ? (
        <div style={{ fontSize: 12, fontFamily: F.body, color: C.textMuted }}>No cues found for this exercise.</div>
      ) : (
        <ol style={{ paddingLeft: 18, margin: 0 }}>
          {cues.map((cue, i) => (
            <li key={i} style={{ fontSize: 13, fontFamily: F.body, color: C.text, lineHeight: 1.6, marginBottom: 6 }}>{cue}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ─── Exercise Row (with drag + cues) ─────────────────────────────────────────
function ExerciseRow({ ex, label, blockType, onUpdate, onRemove, onToggleGroup, isGrouped, groupColor, onDragStart, onDragOver, onDrop, isDragging }) {
  const accent = BLOCK_COLORS[blockType] || C.accent;
  const [showCues, setShowCues] = useState(false);
  const dragRef = useRef(null);

  const repsArray = parseReps(ex.reps, parseInt(ex.sets) || 3);
  const hasRepScheme = ex.reps?.includes("/");

  const fields = [
    { key: "sets",        ph: "3",    w: 46  },
    { key: "reps",        ph: "8-10", w: 90  },
    { key: "tempo",       ph: "3010", w: 62  },
    { key: "rpe",         ph: "7",    w: 46  },
    { key: "rest",        ph: "60s",  w: 56  },
    { key: "startWeight", ph: "lbs",  w: 64  },
    { key: "notes",       ph: "Notes",w: 120 },
  ];

  return (
    <>
      <tr
        ref={dragRef}
        draggable
        onDragStart={() => onDragStart(ex.id)}
        onDragOver={e => { e.preventDefault(); onDragOver(ex.id); }}
        onDrop={onDrop}
        style={{
          borderBottom: `1px solid ${C.border}44`,
          background: isDragging ? C.accent + "10" : isGrouped ? (groupColor || accent) + "08" : "transparent",
          opacity: isDragging ? 0.5 : 1,
          cursor: "grab",
          transition: "background 0.1s",
        }}
      >
        {/* Drag handle + label + group */}
        <td style={{ padding: "5px 6px", whiteSpace: "nowrap", userSelect: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: C.textDim, fontSize: 14, cursor: "grab" }}>⠿</span>
            {label && <span style={{ fontFamily: F.display, fontSize: 14, color: accent, minWidth: 26 }}>{label}</span>}
            <button onClick={onToggleGroup} title={isGrouped ? "Ungroup" : "Link with adjacent"}
              style={{ background: isGrouped ? (groupColor || accent) + "30" : "transparent", border: `1px solid ${isGrouped ? (groupColor || accent) : C.border}`, borderRadius: 4, padding: "1px 4px", cursor: "pointer", fontSize: 10, color: isGrouped ? (groupColor || accent) : C.textDim }}>
              ⛓
            </button>
          </div>
        </td>

        {/* Exercise name + cue button */}
        <td style={{ padding: "4px 5px", minWidth: 170 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <input value={ex.name} onChange={e => onUpdate("name", e.target.value)} placeholder="Exercise name"
              style={{ ...S.input, flex: 1, padding: "5px 8px" }} />
            {ex.name.trim() && (
              <button onClick={() => setShowCues(!showCues)} title="Show coaching cues"
                style={{ background: showCues ? C.accentBlue + "22" : "transparent", border: `1px solid ${showCues ? C.accentBlue : C.border}`, borderRadius: 6, padding: "4px 7px", cursor: "pointer", fontSize: 12, color: showCues ? C.accentBlue : C.textDim, flexShrink: 0 }}>
                💡
              </button>
            )}
          </div>
        </td>

        {/* Other fields */}
        {fields.map(({ key, ph, w }) => (
          <td key={key} style={{ padding: "4px 4px", minWidth: w }}>
            <input value={ex[key] || ""} onChange={e => onUpdate(key, e.target.value)} placeholder={ph}
              style={{ ...S.input, padding: "5px 7px", fontSize: 12 }} />
          </td>
        ))}

        <td style={{ padding: "4px 5px" }}>
          <button onClick={onRemove} style={{ background: "transparent", border: "none", color: C.accentRed, cursor: "pointer", fontSize: 15, padding: "3px 5px" }}>✕</button>
        </td>
      </tr>

      {/* Rep scheme preview row */}
      {hasRepScheme && (
        <tr style={{ background: accent + "05" }}>
          <td colSpan={2} />
          <td colSpan={2} style={{ padding: "2px 5px 6px" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {repsArray.map((r, i) => (
                <div key={i} style={{ fontSize: 10, fontFamily: F.body, background: accent + "22", color: accent, border: `1px solid ${accent}33`, borderRadius: 4, padding: "2px 7px", whiteSpace: "nowrap" }}>
                  S{i + 1}: {r}
                </div>
              ))}
            </div>
          </td>
          <td colSpan={6} />
        </tr>
      )}

      {/* Cue panel */}
      {showCues && ex.name.trim() && (
        <tr>
          <td colSpan={10} style={{ padding: "0 8px 10px" }}>
            <CuePanel exerciseName={ex.name} onClose={() => setShowCues(false)} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Training Block ───────────────────────────────────────────────────────────
function TrainingBlock({ block, blockIdx, onUpdate, onRemove }) {
  const [quickText, setQuickText] = useState("");
  const [dragSrc, setDragSrc]     = useState(null);
  const [dragOver, setDragOver]   = useState(null);
  const accent = BLOCK_COLORS[block.type] || C.accent;

  const addEx    = (d = {}) => onUpdate("exercises", [...block.exercises, mkEx(d)]);
  const removeEx = (id) => onUpdate("exercises", block.exercises.filter(e => e.id !== id));
  const updateEx = (id, f, v) => onUpdate("exercises", block.exercises.map(e => e.id === id ? { ...e, [f]: v } : e));

  // ── Drag reorder ──
  const handleDragStart = (id) => setDragSrc(id);
  const handleDragOver  = (id) => setDragOver(id);
  const handleDrop      = () => {
    if (!dragSrc || !dragOver || dragSrc === dragOver) { setDragSrc(null); setDragOver(null); return; }
    const exs = [...block.exercises];
    const fromIdx = exs.findIndex(e => e.id === dragSrc);
    const toIdx   = exs.findIndex(e => e.id === dragOver);
    const [moved] = exs.splice(fromIdx, 1);
    exs.splice(toIdx, 0, moved);
    onUpdate("exercises", exs);
    setDragSrc(null); setDragOver(null);
  };

  // ── Grouping ──
  const toggleGroup = (exId) => {
    const ex  = block.exercises.find(e => e.id === exId);
    if (ex.groupId) {
      onUpdate("exercises", block.exercises.map(e => e.id === exId ? { ...e, groupId: null } : e));
    } else {
      const idx  = block.exercises.findIndex(e => e.id === exId);
      const prev = block.exercises[idx - 1];
      const next = block.exercises[idx + 1];
      const gId  = prev?.groupId || next?.groupId || mkId();
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

  // ── Quick add ──
  const handleQuickAdd = () => {
    quickText.split("\n").filter(l => l.trim()).forEach(line => {
      addEx(parseQuickLine(line));
    });
    setQuickText("");
  };

  return (
    <div style={{ border: `1px solid ${accent}28`, borderRadius: 10, padding: "16px 18px", marginBottom: 14, background: C.card }}>
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
                {["", "EXERCISE", "SETS", "REPS", "TEMPO", "RPE", "REST", "START WT", "NOTES", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", color: C.textMuted, fontWeight: 700, letterSpacing: "0.08em", padding: "4px 5px", fontSize: 9, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.exercises.map((ex, exIdx) => (
                <ExerciseRow
                  key={ex.id} ex={ex}
                  label={getLabel(ex, exIdx)}
                  blockType={block.type}
                  onUpdate={(f, v) => updateEx(ex.id, f, v)}
                  onRemove={() => removeEx(ex.id)}
                  onToggleGroup={() => toggleGroup(ex.id)}
                  isGrouped={!!ex.groupId}
                  groupColor={groupColor(ex.groupId)}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDragging={dragSrc === ex.id || dragOver === ex.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick add */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, fontFamily: F.body, color: C.textDim, marginBottom: 4 }}>
          QUICK ADD — one per line · spaces allowed · example: "Barbell Squat 4x12/10/8/6 RPE8 3010 rest90s 100lbs"
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <textarea value={quickText} onChange={e => setQuickText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleQuickAdd(); }}
            placeholder={"Barbell Squat 4x8 RPE8 3010 rest90s 100lbs\nRDL 3x12/10/8 RPE7 2010 rest60s\nLeg Press 3x15"}
            rows={2} style={{ ...S.input, flex: 1, resize: "none", fontSize: 12, lineHeight: 1.5 }} />
          <button onClick={handleQuickAdd} style={{ ...S.btn("primary"), alignSelf: "flex-end", fontSize: 12, padding: "8px 14px", flexShrink: 0 }}>
            ADD
          </button>
        </div>
      </div>
      <button onClick={() => addEx()} style={{ ...S.btn("ghost"), fontSize: 12, padding: "6px 14px" }}>+ ADD ROW</button>
    </div>
  );
}

// ─── Day Editor ───────────────────────────────────────────────────────────────
function DayEditor({ day, dayIdx, onUpdate, onRemove }) {
  const updW  = (id,f,v) => onUpdate("warmup", day.warmup.map(e => e.id===id?{...e,[f]:v}:e));
  const rmW   = (id) => onUpdate("warmup", day.warmup.filter(e=>e.id!==id));
  const addW  = () => onUpdate("warmup", [...day.warmup, mkSEx()]);
  const addB  = () => onUpdate("blocks", [...day.blocks, mkBlk(day.blocks.length)]);
  const rmB   = (id) => onUpdate("blocks", day.blocks.filter(b=>b.id!==id));
  const updB  = (id,f,v) => onUpdate("blocks", day.blocks.map(b=>b.id===id?{...b,[f]:v}:b));
  const updCE = (id,f,v) => onUpdate("cooldown", {...day.cooldown, exercises: day.cooldown.exercises.map(e=>e.id===id?{...e,[f]:v}:e)});
  const rmCE  = (id) => onUpdate("cooldown", {...day.cooldown, exercises: day.cooldown.exercises.filter(e=>e.id!==id)});
  const addCE = () => onUpdate("cooldown", {...day.cooldown, exercises:[...day.cooldown.exercises, mkSEx()]});
  const updBr = (f,v) => onUpdate("cooldown", {...day.cooldown, breathing:{...day.cooldown.breathing,[f]:v}});

  const secHd = (emoji, title, color = C.accent) => (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
      <span style={{fontSize:18}}>{emoji}</span>
      <div style={{fontSize:20, fontFamily:F.display, color}}>{title}</div>
      <div style={{flex:1, height:1, background:color+"28"}} />
    </div>
  );

  return (
    <div style={{ border:`1px solid ${C.borderLight}`, borderRadius:12, padding:"20px", marginBottom:16, background:C.surface }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <div style={{fontSize:32, fontFamily:F.display, color:C.accent, lineHeight:1}}>D{dayIdx+1}</div>
        <input value={day.name} onChange={e=>onUpdate("name",e.target.value)}
          style={{...S.input, width:230, padding:"8px 12px", fontSize:15}} />
        <button onClick={onRemove} style={{...S.btn("dim"), fontSize:11, padding:"6px 12px", marginLeft:"auto", color:C.accentRed, borderColor:C.accentRed+"44"}}>
          REMOVE DAY
        </button>
      </div>

      {/* Warm Up */}
      <div style={{marginBottom:22}}>
        {secHd("🔥","WARM UP",C.accentOrange)}
        {day.warmup.map(ex=>(
          <div key={ex.id} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            <input value={ex.name} onChange={e=>updW(ex.id,"name",e.target.value)}
              placeholder="Exercise / activity" style={{...S.input,flex:2,padding:"8px 11px"}} />
            <input value={ex.duration} onChange={e=>updW(ex.id,"duration",e.target.value)}
              placeholder="Duration (e.g. 5 min, 10 reps)" style={{...S.input,flex:1,padding:"8px 11px"}} />
            <button onClick={()=>rmW(ex.id)} style={{background:"transparent",border:"none",color:C.accentRed,cursor:"pointer",fontSize:18,padding:"4px 8px",flexShrink:0}}>✕</button>
          </div>
        ))}
        <button onClick={addW} style={{...S.btn("ghost"),fontSize:12,padding:"6px 14px"}}>+ ADD WARM UP</button>
      </div>

      {/* Training Blocks */}
      <div style={{marginBottom:22}}>
        {secHd("💪","TRAINING BLOCKS",C.accent)}
        {day.blocks.map((block,bIdx)=>(
          <TrainingBlock key={block.id} block={block} blockIdx={bIdx}
            onUpdate={(f,v)=>updB(block.id,f,v)}
            onRemove={()=>rmB(block.id)}
          />
        ))}
        <button onClick={addB} style={{...S.btn("ghost"),width:"100%",fontSize:14,padding:"11px",borderStyle:"dashed"}}>
          + ADD TRAINING BLOCK
        </button>
      </div>

      {/* Cool Down */}
      <div>
        {secHd("🧘","COOL DOWN",C.accentBlue)}
        {day.cooldown.exercises.map(ex=>(
          <div key={ex.id} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            <input value={ex.name} onChange={e=>updCE(ex.id,"name",e.target.value)}
              placeholder="Stretch / mobility" style={{...S.input,flex:2,padding:"8px 11px"}} />
            <input value={ex.duration} onChange={e=>updCE(ex.id,"duration",e.target.value)}
              placeholder="Duration" style={{...S.input,flex:1,padding:"8px 11px"}} />
            <button onClick={()=>rmCE(ex.id)} style={{background:"transparent",border:"none",color:C.accentRed,cursor:"pointer",fontSize:18,padding:"4px 8px",flexShrink:0}}>✕</button>
          </div>
        ))}
        <button onClick={addCE} style={{...S.btn("ghost"),fontSize:12,padding:"6px 14px",marginBottom:16}}>+ ADD COOL DOWN EXERCISE</button>

        <div style={{background:C.card,border:`1px solid ${C.accentBlue}33`,borderRadius:10,padding:"18px"}}>
          <div style={{fontSize:15,fontFamily:F.display,color:C.accentBlue,marginBottom:3}}>BREATHING PATTERN</div>
          <div style={{fontSize:11,fontFamily:F.body,color:C.textMuted,marginBottom:14,lineHeight:1.5}}>
            Set seconds per phase — syncs to breathing clock in the client app<br/>
            e.g. 4-4-4-4 = inhale 4s · hold 4s · exhale 4s · hold 4s
          </div>
          <BreathingPatternInput value={day.cooldown.breathing.pattern} onChange={v=>updBr("pattern",v)} />
          <div style={{marginTop:14}}>
            <label style={S.label}>COACHING NOTE</label>
            <input value={day.cooldown.breathing.notes} onChange={e=>updBr("notes",e.target.value)}
              placeholder="e.g. Breathe through the nose, long slow exhale..."
              style={{...S.input,fontSize:13,padding:"8px 11px"}} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ProgramDesigner({ clients, onBack }) {
  const [programName,   setProgramName]   = useState("");
  const [programWeeks,  setProgramWeeks]  = useState(8);
  const [assignedClient,setAssignedClient]= useState("");
  const [days,          setDays]          = useState([mkDay(0)]);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);

  const addDay    = () => setDays(p => [...p, mkDay(p.length)]);
  const removeDay = (id) => setDays(p => p.filter(d => d.id !== id));
  const updateDay = (id, field, value) => setDays(p => p.map(d => d.id === id ? { ...d, [field]: value } : d));

  const setDayCount = (n) => setDays(prev => {
    if (n > prev.length) return [...prev, ...Array(n - prev.length).fill(0).map((_, i) => mkDay(prev.length + i))];
    return prev.slice(0, n);
  });

  const handleSave = async () => {
    if (!programName) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, "programs"), {
        name: programName, weeks: programWeeks,
        assignedClientId: assignedClient || null,
        days, createdAt: serverTimestamp(), createdBy: auth.currentUser?.uid,
      });
      if (assignedClient) {
        await updateDoc(doc(db, "clients", assignedClient), { assignedProgramId: ref.id, assignedProgramName: programName });
      }
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div style={{ fontFamily: F.display }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        input::placeholder,textarea::placeholder{color:#444;}
        textarea{font-family:system-ui;color:#fff;background:#111;}
        select option{background:#161616;color:#fff;}
        tr[draggable]{transition:background 0.1s;}
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:24 }}>
        <div>
          <button onClick={onBack} style={{...S.btn("dim"),fontSize:12,padding:"6px 12px",marginBottom:12}}>← BACK TO PROGRAMS</button>
          <div style={{fontSize:32,letterSpacing:"0.05em",lineHeight:1}}>PROGRAM DESIGNER</div>
          <div style={{fontSize:11,fontFamily:F.body,color:C.textMuted,marginTop:4}}>BUILD A CUSTOM TRAINING PROGRAM</div>
        </div>
        <button onClick={handleSave} disabled={saving||!programName}
          style={{...S.btn("primary"),fontSize:16,opacity:!programName?0.4:1}}>
          {saving?"SAVING...":saved?"✓ SAVED!":"SAVE PROGRAM"}
        </button>
      </div>

      {/* Details */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"20px",marginBottom:24}}>
        <div style={{fontSize:16,marginBottom:14}}>PROGRAM DETAILS</div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 2fr",gap:16,marginBottom:20}}>
          <div>
            <label style={S.label}>PROGRAM NAME</label>
            <input value={programName} onChange={e=>setProgramName(e.target.value)}
              placeholder="e.g. Rebuild Method Phase 2" style={S.input} />
          </div>
          <div>
            <label style={S.label}>DURATION (WEEKS)</label>
            <input type="number" value={programWeeks} onChange={e=>setProgramWeeks(parseInt(e.target.value)||1)}
              min={1} max={52} style={S.input} />
          </div>
          <div>
            <label style={S.label}>ASSIGN TO CLIENT</label>
            <select value={assignedClient} onChange={e=>setAssignedClient(e.target.value)}
              style={{...S.input,fontFamily:F.body}}>
              <option value="">— No assignment —</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name||c.email}</option>)}
            </select>
          </div>
        </div>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16}}>
          <label style={S.label}>TRAINING DAYS PER WEEK</label>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {[1,2,3,4,5,6,7].map(n=>(
              <button key={n} onClick={()=>setDayCount(n)}
                style={{width:38,height:38,borderRadius:8,border:`1px solid ${days.length===n?C.accent:C.border}`,background:days.length===n?C.accent+"22":"transparent",color:days.length===n?C.accent:C.textMuted,cursor:"pointer",fontFamily:F.display,fontSize:16}}>
                {n}
              </button>
            ))}
            <div style={{fontSize:11,fontFamily:F.body,color:C.textMuted,marginLeft:8}}>
              Rename each day below
            </div>
          </div>
        </div>
      </div>

      {/* Days */}
      {days.map((day,dayIdx)=>(
        <DayEditor key={day.id} day={day} dayIdx={dayIdx}
          onUpdate={(field,value)=>updateDay(day.id,field,value)}
          onRemove={()=>removeDay(day.id)}
        />
      ))}

      <button onClick={addDay}
        style={{...S.btn("ghost"),width:"100%",fontSize:14,padding:"14px",marginTop:4,borderStyle:"dashed"}}>
        + ADD DAY
      </button>
    </div>
  );
}
