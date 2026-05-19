import { useState, useEffect, useRef } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, query, where, orderBy, getDocs,
  onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ─── Firebase ────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDwCIb6OQ40TDNlNr1TjxO4kZVf2Ho62X8",
  authDomain: "framewerks-coach.firebaseapp.com",
  projectId: "framewerks-coach",
  storageBucket: "framewerks-coach.firebasestorage.app",
  messagingSenderId: "850336233136",
  appId: "1:850336233136:web:2bf59afb82672435c4ed75"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0A0A0A",
  surface: "#111111",
  card: "#161616",
  cardHover: "#1C1C1C",
  border: "#252525",
  borderLight: "#2E2E2E",
  accent: "#E8FF00",
  accentRed: "#FF3D3D",
  accentBlue: "#00C8FF",
  accentGreen: "#00FF88",
  text: "#FFFFFF",
  textMuted: "#777777",
  textDim: "#444444",
};

const F = {
  display: "'Bebas Neue', 'Impact', sans-serif",
  body: "system-ui, -apple-system, sans-serif",
};

// ─── Shared Styles ────────────────────────────────────────────────────────────
const S = {
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "16px 20px",
    marginBottom: 10,
  },
  pill: (color = C.accent) => ({
    display: "inline-flex", alignItems: "center",
    padding: "3px 10px", borderRadius: 20,
    fontSize: 10, fontFamily: F.body, fontWeight: 700,
    letterSpacing: "0.12em", textTransform: "uppercase",
    background: color + "20", color, border: `1px solid ${color}33`,
  }),
  btn: (v = "primary") => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 8, padding: "10px 20px", borderRadius: 8, border: "none",
    cursor: "pointer", fontFamily: F.display, letterSpacing: "0.08em",
    fontSize: 15, transition: "all 0.15s",
    ...(v === "primary" ? { background: C.accent, color: "#000" }
      : v === "danger" ? { background: C.accentRed, color: "#fff" }
      : v === "ghost" ? { background: "transparent", color: C.text, border: `1px solid ${C.border}` }
      : v === "dim" ? { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` }
      : {}),
  }),
  input: {
    width: "100%", background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "10px 14px", color: C.text,
    fontSize: 14, fontFamily: F.body, outline: "none", boxSizing: "border-box",
  },
  label: {
    fontSize: 10, fontFamily: F.body, color: C.textMuted,
    fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
    marginBottom: 6, display: "block",
  },
  sectionTitle: { fontSize: 32, fontFamily: F.display, letterSpacing: "0.05em", lineHeight: 1 },
  sectionSub: { fontSize: 11, fontFamily: F.body, color: C.textMuted, letterSpacing: "0.08em", marginTop: 4 },
};

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const login = async () => {
    setLoading(true); setErr("");
    try { await signInWithPopup(auth, provider); }
    catch { setErr("Sign in failed. Try again."); setLoading(false); }
  };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", fontFamily: F.display }}>
      {/* Left panel */}
      <div style={{
        width: 420, background: C.surface, borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 48px"
      }}>
        <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, letterSpacing: "0.3em", marginBottom: 12 }}>
          FRAMEWERKS
        </div>
        <div style={{ fontSize: 72, color: C.accent, lineHeight: 0.9, marginBottom: 8 }}>
          COACH<br /><span style={{ color: C.text }}>DASH</span><span style={{ color: C.accentRed }}>.</span>
        </div>
        <div style={{ fontSize: 13, fontFamily: F.body, color: C.textMuted, marginTop: 16, lineHeight: 1.7, maxWidth: 280 }}>
          Real-time client progress. Live workout feeds. Complete training history. All in one place.
        </div>
        <div style={{ marginTop: 40 }}>
          {err && (
            <div style={{ background: C.accentRed + "22", border: `1px solid ${C.accentRed}44`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, fontFamily: F.body, color: C.accentRed }}>
              {err}
            </div>
          )}
          <button onClick={login} disabled={loading} style={{ ...S.btn("primary"), width: "100%", fontSize: 20, padding: "16px 24px", opacity: loading ? 0.6 : 1 }}>
            {loading ? "SIGNING IN..." : "SIGN IN WITH GOOGLE"}
          </button>
          <p style={{ fontSize: 11, fontFamily: F.body, color: C.textDim, marginTop: 12, textAlign: "center" }}>
            Coach accounts only — contact Framewerks for access
          </p>
        </div>
      </div>
      {/* Right decorative panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(6, 1fr)", gap: 1 }}>
          {Array(48).fill(0).map((_, i) => (
            <div key={i} style={{ background: i % 7 === 0 ? C.accent + "08" : i % 5 === 0 ? C.accentRed + "05" : C.surface, borderRadius: 4 }} />
          ))}
        </div>
        <div style={{ textAlign: "center", zIndex: 1 }}>
          <div style={{ fontSize: 140, lineHeight: 1, color: C.accent + "10", fontFamily: F.display }}>FW</div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color = C.text, sub }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ fontSize: 10, fontFamily: F.body, color: C.textMuted, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 42, fontFamily: F.display, color, lineHeight: 1, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ clients, workoutLogs, liveFeed, onSelectClient }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = workoutLogs.filter(l => {
    const d = l.completedAt?.toDate ? l.completedAt.toDate() : new Date(l.completedAt || 0);
    return d.toISOString().slice(0, 10) === today;
  });

  const weekLogs = workoutLogs.filter(l => {
    const d = l.completedAt?.toDate ? l.completedAt.toDate() : new Date(l.completedAt || 0);
    return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={S.sectionTitle}>OVERVIEW</div>
        <div style={S.sectionSub}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 }}>
        <StatCard label="Total Clients" value={clients.length} color={C.accent} />
        <StatCard label="Today" value={todayLogs.length} color={C.accentBlue} sub="workouts completed" />
        <StatCard label="This Week" value={weekLogs.length} color={C.accentGreen} sub="total workouts" />
        <StatCard label="Live Now" value={liveFeed.length} color={liveFeed.length > 0 ? C.accentRed : C.textDim} sub="active sets" />
      </div>

      {/* Live Feed */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontFamily: F.display, letterSpacing: "0.05em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: liveFeed.length > 0 ? C.accentRed : C.textDim, animation: liveFeed.length > 0 ? "pulse 1.5s infinite" : "none" }} />
            LIVE ACTIVITY
          </div>
          {liveFeed.length === 0 ? (
            <div style={{ ...S.card, textAlign: "center", padding: "32px 20px" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>😴</div>
              <div style={{ fontSize: 16, fontFamily: F.display, color: C.textMuted }}>NO ACTIVE SESSIONS</div>
            </div>
          ) : (
            liveFeed.slice(0, 8).map((item, i) => (
              <div key={item.id || i} style={{ ...S.card, borderLeft: `3px solid ${C.accentRed}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13, fontFamily: F.display, letterSpacing: "0.05em" }}>{item.exerciseName}</div>
                    <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, marginTop: 2 }}>
                      Set {item.setNumber} · {item.reps || "–"} reps · {item.weight ? `${item.weight} lbs` : "bodyweight"}
                    </div>
                    <div style={{ fontSize: 10, fontFamily: F.body, color: C.textDim, marginTop: 2 }}>{item.userId?.slice(0, 12)}...</div>
                  </div>
                  <div style={{ fontSize: 10, fontFamily: F.body, color: C.textMuted }}>
                    {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent Workouts */}
        <div>
          <div style={{ fontSize: 18, fontFamily: F.display, letterSpacing: "0.05em", marginBottom: 12 }}>RECENT WORKOUTS</div>
          {workoutLogs.slice(0, 8).map((log, i) => (
            <div key={log.id || i} style={{ ...S.card, cursor: "pointer" }} onClick={() => onSelectClient(log.userId)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontFamily: F.display, letterSpacing: "0.03em" }}>{log.workoutName}</div>
                  <div style={{ fontSize: 10, fontFamily: F.body, color: C.textMuted, marginTop: 2 }}>
                    {log.userId?.slice(0, 16)}...
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, fontFamily: F.body, color: C.textMuted }}>
                    {log.completedAt?.toDate
                      ? log.completedAt.toDate().toLocaleDateString()
                      : log.completedAt ? new Date(log.completedAt).toLocaleDateString() : "–"}
                  </div>
                  {log.rating && <div style={{ fontSize: 14, fontFamily: F.display, color: C.accent }}>{log.rating}★</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Clients Tab ──────────────────────────────────────────────────────────────
function ClientsTab({ clients, workoutLogs, selectedClientId, onSelectClient, onAddClient }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", program: "Rebuild Method" });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newClient.name || !newClient.email) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "clients"), {
        ...newClient,
        createdAt: serverTimestamp(),
        active: true,
      });
      setNewClient({ name: "", email: "", program: "Rebuild Method" });
      setShowAdd(false);
      onAddClient();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const getClientLogs = (clientId) =>
    workoutLogs.filter(l => l.userId === clientId);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <div style={S.sectionTitle}>CLIENTS</div>
          <div style={S.sectionSub}>{clients.length} ATHLETES ENROLLED</div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ ...S.btn("primary"), fontSize: 14 }}>
          + ADD CLIENT
        </button>
      </div>

      {/* Add client form */}
      {showAdd && (
        <div style={{ ...S.card, border: `1px solid ${C.accent}44`, marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontFamily: F.display, marginBottom: 16 }}>NEW CLIENT</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={S.label}>NAME</label>
              <input value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} placeholder="John Doe" style={S.input} />
            </div>
            <div>
              <label style={S.label}>EMAIL</label>
              <input value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} placeholder="john@email.com" style={S.input} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>PROGRAM</label>
            <select value={newClient.program} onChange={e => setNewClient({ ...newClient, program: e.target.value })} style={{ ...S.input, fontFamily: F.body }}>
              <option>Rebuild Method</option>
              <option>Strength Foundation</option>
              <option>Custom Program</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowAdd(false)} style={{ ...S.btn("ghost"), flex: 1 }}>CANCEL</button>
            <button onClick={handleAdd} disabled={saving} style={{ ...S.btn("primary"), flex: 2, opacity: saving ? 0.6 : 1 }}>
              {saving ? "SAVING..." : "ADD CLIENT"}
            </button>
          </div>
        </div>
      )}

      {/* Client list */}
      {clients.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.textMuted }}>
          <div style={{ fontSize: 48, fontFamily: F.display, marginBottom: 8 }}>0</div>
          <div style={{ fontFamily: F.body, fontSize: 13 }}>No clients yet. Add your first athlete.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {clients.map(client => {
            const logs = getClientLogs(client.id);
            const lastLog = logs[0];
            const isSelected = selectedClientId === client.id;
            return (
              <div key={client.id}
                onClick={() => onSelectClient(client.id)}
                style={{
                  background: isSelected ? C.accent + "0A" : C.card,
                  border: `1px solid ${isSelected ? C.accent : C.border}`,
                  borderRadius: 10, padding: "20px",
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: isSelected ? C.accent : C.surface,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontFamily: F.display, color: isSelected ? "#000" : C.textMuted,
                  marginBottom: 12,
                }}>
                  {(client.name || client.email || "?")[0].toUpperCase()}
                </div>
                <div style={{ fontSize: 18, fontFamily: F.display, letterSpacing: "0.03em" }}>
                  {client.name || client.email?.split("@")[0]}
                </div>
                <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, marginTop: 2 }}>{client.email}</div>
                <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={S.pill(C.accentBlue)}>{logs.length} sessions</span>
                  {client.program && <span style={S.pill(C.textMuted)}>{client.program}</span>}
                </div>
                {lastLog && (
                  <div style={{ fontSize: 10, fontFamily: F.body, color: C.textDim, marginTop: 8 }}>
                    Last: {lastLog.completedAt?.toDate
                      ? lastLog.completedAt.toDate().toLocaleDateString()
                      : lastLog.completedAt ? new Date(lastLog.completedAt).toLocaleDateString() : "–"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Progress Tab (per client) ────────────────────────────────────────────────
function ProgressTab({ clients, workoutLogs, selectedClientId, onSelectClient }) {
  const [selectedExercise, setSelectedExercise] = useState("");
  const [detailedLog, setDetailedLog] = useState(null);

  const clientLogs = selectedClientId
    ? workoutLogs.filter(l => l.userId === selectedClientId)
    : workoutLogs;

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const allExercises = [...new Set(
    clientLogs.flatMap(log => log.exercises?.map(ex => ex.name) || [])
  )];

  const exerciseHistory = clientLogs
    .filter(log => log.exercises?.some(ex => ex.name === selectedExercise))
    .map(log => {
      const ex = log.exercises.find(e => e.name === selectedExercise);
      const completedSets = ex?.sets?.filter(s => s.completed) || [];
      const topSet = completedSets.reduce((best, s) => {
        const w = parseFloat(s.weight) || 0;
        return w > (parseFloat(best?.weight) || 0) ? s : best;
      }, null);
      return {
        logId: log.id,
        date: log.completedAt?.toDate
          ? log.completedAt.toDate()
          : log.completedAt ? new Date(log.completedAt) : new Date(),
        workoutName: log.workoutName,
        topWeight: parseFloat(topSet?.weight) || 0,
        topReps: topSet?.reps || 0,
        allSets: ex?.sets || [],
        completedSets: completedSets.length,
      };
    })
    .sort((a, b) => a.date - b.date);

  const maxWeight = exerciseHistory.length > 0 ? Math.max(...exerciseHistory.map(d => d.topWeight)) : 0;

  if (detailedLog) {
    const log = workoutLogs.find(l => l.id === detailedLog);
    if (!log) { setDetailedLog(null); return null; }
    return (
      <div>
        <button onClick={() => setDetailedLog(null)} style={{ ...S.btn("ghost"), marginBottom: 20, fontSize: 13 }}>← BACK</button>
        <div style={{ fontSize: 28, fontFamily: F.display, marginBottom: 4 }}>{log.workoutName}</div>
        <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, marginBottom: 16 }}>
          {log.completedAt?.toDate
            ? log.completedAt.toDate().toLocaleString()
            : log.completedAt ? new Date(log.completedAt).toLocaleString() : "–"}
          {log.duration ? ` · ${Math.floor(log.duration / 60)} min` : ""}
        </div>
        {log.notes && (
          <div style={{ ...S.card, fontFamily: F.body, fontSize: 13, color: C.textMuted, fontStyle: "italic", marginBottom: 16 }}>
            "{log.notes}"
          </div>
        )}
        {log.exercises?.map((ex, i) => (
          <div key={i} style={S.card}>
            <div style={{ fontSize: 18, fontFamily: F.display, marginBottom: 12 }}>{ex.name}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 12 }}>
              <thead>
                <tr>
                  {["SET", "WEIGHT", "REPS", "DONE"].map(h => (
                    <th key={h} style={{ textAlign: "left", color: C.textMuted, fontWeight: 700, letterSpacing: "0.1em", paddingBottom: 8, fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ex.sets?.map((s, si) => (
                  <tr key={si} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "8px 0", fontFamily: F.display, fontSize: 16 }}>{s.setNumber}</td>
                    <td style={{ padding: "8px 0", color: s.completed ? C.text : C.textMuted }}>{s.weight ? `${s.weight} lbs` : "–"}</td>
                    <td style={{ padding: "8px 0", color: s.completed ? C.text : C.textMuted }}>{s.reps || "–"}</td>
                    <td style={{ padding: "8px 0" }}>
                      <span style={{ color: s.completed ? C.accentGreen : C.textDim, fontSize: 14 }}>
                        {s.completed ? "✓" : "–"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <div style={S.sectionTitle}>PROGRESS</div>
          <div style={S.sectionSub}>
            {selectedClient ? (selectedClient.name || selectedClient.email)?.toUpperCase() : "ALL CLIENTS"}
          </div>
        </div>
        <select
          value={selectedClientId || ""}
          onChange={e => onSelectClient(e.target.value || null)}
          style={{ ...S.input, width: "auto", minWidth: 180, fontFamily: F.body, fontSize: 13 }}
        >
          <option value="">All Clients</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name || c.email}</option>
          ))}
        </select>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
        <StatCard label="Total Sessions" value={clientLogs.length} color={C.accent} />
        <StatCard label="Exercises Tracked" value={allExercises.length} color={C.accentBlue} />
        <StatCard label="This Month" value={clientLogs.filter(l => {
          const d = l.completedAt?.toDate ? l.completedAt.toDate() : new Date(l.completedAt || 0);
          return (Date.now() - d.getTime()) < 30 * 24 * 60 * 60 * 1000;
        }).length} color={C.accentGreen} sub="workouts" />
      </div>

      {/* Exercise deep dive */}
      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>EXERCISE PROGRESS TRACKER</label>
        <select
          value={selectedExercise}
          onChange={e => setSelectedExercise(e.target.value)}
          style={{ ...S.input, fontFamily: F.body }}
        >
          <option value="">— Select an exercise —</option>
          {allExercises.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>

      {selectedExercise && exerciseHistory.length > 0 && (
        <>
          {/* Best weight visual */}
          <div style={{ ...S.card, border: `1px solid ${C.accent}44`, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, fontWeight: 700, letterSpacing: "0.15em" }}>BEST SET — {selectedExercise.toUpperCase()}</div>
                <div style={{ fontSize: 56, fontFamily: F.display, color: C.accent, lineHeight: 1, marginTop: 4 }}>
                  {maxWeight > 0 ? maxWeight : "–"} <span style={{ fontSize: 24, color: C.textMuted }}>LBS</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted }}>SESSIONS</div>
                <div style={{ fontSize: 40, fontFamily: F.display, color: C.accentBlue }}>{exerciseHistory.length}</div>
              </div>
            </div>

            {/* Progress bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {exerciseHistory.slice(-6).map((entry, i) => {
                const pct = maxWeight > 0 ? (entry.topWeight / maxWeight) * 100 : 0;
                const isLatest = i === exerciseHistory.slice(-6).length - 1;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 10, fontFamily: F.body, color: C.textMuted, minWidth: 50 }}>
                      {entry.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <div style={{ flex: 1, height: 6, background: C.surface, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        background: isLatest ? C.accent : C.accentBlue + "88",
                        width: `${pct}%`, transition: "width 0.5s ease"
                      }} />
                    </div>
                    <div style={{ fontSize: 12, fontFamily: F.display, color: isLatest ? C.accent : C.text, minWidth: 60, textAlign: "right" }}>
                      {entry.topWeight > 0 ? `${entry.topWeight}lbs` : "–"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session history table */}
          <div style={S.card}>
            <div style={{ fontSize: 16, fontFamily: F.display, marginBottom: 12 }}>SESSION BREAKDOWN</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 12 }}>
              <thead>
                <tr>
                  {["DATE", "WORKOUT", "TOP WEIGHT", "REPS", "SETS DONE", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", color: C.textMuted, fontWeight: 700, letterSpacing: "0.1em", paddingBottom: 10, fontSize: 10, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exerciseHistory.slice().reverse().map((entry, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 0", color: C.textMuted }}>{entry.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</td>
                    <td style={{ padding: "10px 0", fontFamily: F.display, fontSize: 14 }}>{entry.workoutName}</td>
                    <td style={{ padding: "10px 0", fontFamily: F.display, fontSize: 16, color: i === 0 ? C.accent : C.text }}>
                      {entry.topWeight > 0 ? `${entry.topWeight}` : "–"} <span style={{ fontSize: 10, color: C.textMuted }}>lbs</span>
                    </td>
                    <td style={{ padding: "10px 0", color: C.textMuted }}>{entry.topReps || "–"}</td>
                    <td style={{ padding: "10px 0", color: C.accentGreen }}>{entry.completedSets}</td>
                    <td style={{ padding: "10px 0" }}>
                      <button onClick={() => setDetailedLog(entry.logId)} style={{
                        background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6,
                        padding: "4px 10px", color: C.textMuted, cursor: "pointer", fontSize: 11, fontFamily: F.body
                      }}>VIEW</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedExercise && exerciseHistory.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted, fontFamily: F.body, fontSize: 13 }}>
          No data for this exercise yet
        </div>
      )}

      {/* All workout logs */}
      {!selectedExercise && (
        <>
          <div style={{ fontSize: 18, fontFamily: F.display, letterSpacing: "0.05em", marginBottom: 12 }}>ALL WORKOUTS</div>
          {clientLogs.slice(0, 20).map((log, i) => (
            <div key={log.id || i}
              onClick={() => setDetailedLog(log.id)}
              style={{ ...S.card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontFamily: F.display }}>{log.workoutName}</div>
                <div style={{ fontSize: 10, fontFamily: F.body, color: C.textMuted, marginTop: 2 }}>
                  {log.completedAt?.toDate
                    ? log.completedAt.toDate().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                    : log.completedAt ? new Date(log.completedAt).toLocaleDateString() : "–"}
                  {log.duration ? ` · ${Math.floor(log.duration / 60)}min` : ""}
                  {log.exercises ? ` · ${log.exercises.length} exercises` : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {log.rating && <div style={{ fontFamily: F.display, fontSize: 18, color: C.accent }}>{log.rating}★</div>}
                <div style={{ color: C.textDim, fontSize: 20 }}>›</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Programs Tab ─────────────────────────────────────────────────────────────
function ProgramsTab() {
  const phases = [
    { name: "RESET", week: "1–2", color: C.accentBlue, desc: "Foundation movement patterns, mobility, habit building" },
    { name: "REBUILD", week: "3–4", color: C.accentGreen, desc: "Progressive overload introduction, increasing intensity" },
    { name: "STRENGTHEN", week: "5–6", color: C.accent, desc: "Compound lifts, strength targets, performance tracking" },
    { name: "OWN IT", week: "7–8", color: C.accentRed, desc: "Peak performance week, client autonomy, sustainability" },
  ];

  const workouts = [
    { day: "Monday", name: "Lower Body A", exercises: 4, focus: "Squat pattern, posterior chain" },
    { day: "Wednesday", name: "Upper Body A", exercises: 4, focus: "Push/pull balance, shoulder health" },
    { day: "Friday", name: "Full Body", exercises: 4, focus: "Compound movements, total body stimulus" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={S.sectionTitle}>PROGRAMS</div>
        <div style={S.sectionSub}>REBUILD METHOD — 8 WEEK PLAN</div>
      </div>

      {/* Phases */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 }}>
        {phases.map((phase, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${phase.color}44`, borderRadius: 10, padding: "16px" }}>
            <div style={{ fontSize: 10, fontFamily: F.body, color: phase.color, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 4 }}>
              WK {phase.week}
            </div>
            <div style={{ fontSize: 22, fontFamily: F.display, color: phase.color }}>{phase.name}</div>
            <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>{phase.desc}</div>
          </div>
        ))}
      </div>

      {/* Workouts */}
      <div style={{ fontSize: 18, fontFamily: F.display, marginBottom: 12 }}>WEEKLY STRUCTURE</div>
      {workouts.map((w, i) => (
        <div key={i} style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: F.body, color: C.textMuted, fontWeight: 700, letterSpacing: "0.15em" }}>{w.day.toUpperCase()}</div>
              <div style={{ fontSize: 22, fontFamily: F.display, marginTop: 2 }}>{w.name}</div>
              <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, marginTop: 2 }}>{w.focus}</div>
            </div>
            <span style={S.pill(C.accent)}>{w.exercises} exercises</span>
          </div>
        </div>
      ))}

      <div style={{ ...S.card, border: `1px solid ${C.border}`, marginTop: 8, display: "flex", alignItems: "center", gap: 14, padding: "20px" }}>
        <div style={{ fontSize: 32 }}>📝</div>
        <div>
          <div style={{ fontSize: 18, fontFamily: F.display }}>MORE PROGRAMS COMING</div>
          <div style={{ fontSize: 12, fontFamily: F.body, color: C.textMuted }}>Custom program builder in next update</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [tab, setTab] = useState("overview");
  const [clients, setClients] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const liveFeedUnsub = useRef(null);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthLoaded(true); });
    return unsub;
  }, []);

  // Load data
  const loadData = async () => {
    try {
      // Clients
      const clientSnap = await getDocs(collection(db, "clients"));
      setClients(clientSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Workout logs
      const logsQ = query(collection(db, "workoutLogs"), orderBy("completedAt", "desc"));
      const logsSnap = await getDocs(logsQ);
      setWorkoutLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error("Load error:", e); }
  };

  // Live feed listener
  const startLiveFeed = () => {
    if (liveFeedUnsub.current) liveFeedUnsub.current();
    const q = query(collection(db, "setSyncs"), orderBy("timestamp", "desc"));
    liveFeedUnsub.current = onSnapshot(q, snap => {
      const items = snap.docs.slice(0, 20).map(d => ({ id: d.id, ...d.data() }));
      setLiveFeed(items);
    });
  };

  useEffect(() => {
    if (!user) return;
    loadData();
    startLiveFeed();
    return () => { if (liveFeedUnsub.current) liveFeedUnsub.current(); };
  }, [user]);

  if (!authLoaded) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 36, fontFamily: F.display, color: C.accent, letterSpacing: "0.1em" }}>LOADING...</div>
      </div>
    );
  }
  if (!user) return <LoginScreen />;

  const navItems = [
    { id: "overview", label: "OVERVIEW" },
    { id: "clients", label: "CLIENTS" },
    { id: "progress", label: "PROGRESS" },
    { id: "programs", label: "PROGRAMS" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.display }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        select option { background: ${C.card}; color: ${C.text}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      `}</style>

      {/* Top nav */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", padding: "0 32px", height: 56,
      }}>
        <div style={{ marginRight: 40 }}>
          <span style={{ fontSize: 22, color: C.accent }}>FRAME</span>
          <span style={{ fontSize: 22, color: C.text }}>WERKS</span>
          <span style={{ fontSize: 22, color: C.accentRed }}>.</span>
          <span style={{ fontSize: 10, fontFamily: F.body, color: C.textMuted, marginLeft: 8, letterSpacing: "0.2em" }}>COACH</span>
        </div>
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{
              background: "transparent", border: "none",
              borderBottom: `2px solid ${tab === item.id ? C.accent : "transparent"}`,
              color: tab === item.id ? C.accent : C.textMuted,
              padding: "0 16px", height: 56, cursor: "pointer",
              fontFamily: F.display, fontSize: 14, letterSpacing: "0.1em",
              transition: "all 0.15s",
            }}>
              {item.label}
            </button>
          ))}
        </div>
        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 20 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: liveFeed.length > 0 ? C.accentRed : C.textDim,
            animation: liveFeed.length > 0 ? "pulse 1.5s infinite" : "none"
          }} />
          <span style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, letterSpacing: "0.1em" }}>
            {liveFeed.length > 0 ? `${liveFeed.length} LIVE` : "NO ACTIVITY"}
          </span>
        </div>
        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user.photoURL && (
            <img src={user.photoURL} alt="" style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid ${C.border}` }} />
          )}
          <button onClick={() => signOut(auth)} style={{ ...S.btn("dim"), fontSize: 11, padding: "6px 12px" }}>SIGN OUT</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 60px" }}>
        {tab === "overview" && (
          <OverviewTab
            clients={clients}
            workoutLogs={workoutLogs}
            liveFeed={liveFeed}
            onSelectClient={id => { setSelectedClientId(id); setTab("progress"); }}
          />
        )}
        {tab === "clients" && (
          <ClientsTab
            clients={clients}
            workoutLogs={workoutLogs}
            selectedClientId={selectedClientId}
            onSelectClient={id => { setSelectedClientId(id); setTab("progress"); }}
            onAddClient={loadData}
          />
        )}
        {tab === "progress" && (
          <ProgressTab
            clients={clients}
            workoutLogs={workoutLogs}
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
          />
        )}
        {tab === "programs" && <ProgramsTab />}
      </div>
    </div>
  );
}
