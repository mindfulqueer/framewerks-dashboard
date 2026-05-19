import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, query, where, orderBy, getDocs,
  onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, setDoc, getDoc
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
  bg: "#0A0A0A", surface: "#111111", card: "#161616", border: "#252525",
  borderLight: "#2E2E2E", accent: "#E8FF00", accentRed: "#FF3D3D",
  accentBlue: "#00C8FF", accentGreen: "#00FF88", accentOrange: "#FF8C00",
  text: "#FFFFFF", textMuted: "#777777", textDim: "#444444",
};
const F = { display: "'Bebas Neue', 'Impact', sans-serif", body: "system-ui, -apple-system, sans-serif" };

// ─── Shared Styles ────────────────────────────────────────────────────────────
const S = {
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 10 },
  pill: (color = C.accent) => ({
    display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20,
    fontSize: 10, fontFamily: F.body, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
    background: color + "20", color, border: `1px solid ${color}33`,
  }),
  btn: (v = "primary") => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 8, padding: "10px 20px", borderRadius: 8, border: "none",
    cursor: "pointer", fontFamily: F.display, letterSpacing: "0.08em", fontSize: 15, transition: "all 0.15s",
    ...(v === "primary" ? { background: C.accent, color: "#000" }
      : v === "danger" ? { background: C.accentRed, color: "#fff" }
      : v === "ghost" ? { background: "transparent", color: C.text, border: `1px solid ${C.border}` }
      : v === "dim" ? { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` }
      : v === "blue" ? { background: C.accentBlue + "22", color: C.accentBlue, border: `1px solid ${C.accentBlue}44` }
      : {}),
  }),
  input: {
    width: "100%", background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "10px 14px", color: C.text,
    fontSize: 14, fontFamily: F.body, outline: "none", boxSizing: "border-box",
  },
  label: {
    fontSize: 10, fontFamily: F.body, color: C.textMuted, fontWeight: 700,
    letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6, display: "block",
  },
  sectionTitle: { fontSize: 32, fontFamily: F.display, letterSpacing: "0.05em", lineHeight: 1 },
  sectionSub: { fontSize: 11, fontFamily: F.body, color: C.textMuted, letterSpacing: "0.08em", marginTop: 4 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (ts) => {
  if (!ts) return "–";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
};
const fmtTime = (ts) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const fmtDateTime = (ts) => {
  if (!ts) return "–";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};
const getBlockLabel = (blockIndex, exerciseIndex) => `${String.fromCharCode(65 + blockIndex)}${exerciseIndex + 1}`;

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
      <div style={{ width: 420, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 48px" }}>
        <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, letterSpacing: "0.3em", marginBottom: 12 }}>FRAMEWERKS</div>
        <div style={{ fontSize: 72, color: C.accent, lineHeight: 0.9, marginBottom: 8 }}>
          COACH<br /><span style={{ color: C.text }}>DASH</span><span style={{ color: C.accentRed }}>.</span>
        </div>
        <div style={{ fontSize: 13, fontFamily: F.body, color: C.textMuted, marginTop: 16, lineHeight: 1.7, maxWidth: 280 }}>
          Real-time client progress. Live workout feeds. Complete training history. All in one place.
        </div>
        <div style={{ marginTop: 40 }}>
          {err && <div style={{ background: C.accentRed + "22", border: `1px solid ${C.accentRed}44`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, fontFamily: F.body, color: C.accentRed }}>{err}</div>}
          <button onClick={login} disabled={loading} style={{ ...S.btn("primary"), width: "100%", fontSize: 20, padding: "16px 24px", opacity: loading ? 0.6 : 1 }}>
            {loading ? "SIGNING IN..." : "SIGN IN WITH GOOGLE"}
          </button>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(6, 1fr)", gap: 1 }}>
          {Array(48).fill(0).map((_, i) => (
            <div key={i} style={{ background: i % 7 === 0 ? C.accent + "08" : i % 5 === 0 ? C.accentRed + "05" : C.surface, borderRadius: 4 }} />
          ))}
        </div>
        <div style={{ fontSize: 140, lineHeight: 1, color: C.accent + "10", fontFamily: F.display, zIndex: 1 }}>FW</div>
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
function OverviewTab({ clients, workoutLogs, liveFeed, filterClientId, onFilterClient, onViewLog }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = workoutLogs.filter(l => {
    const d = l.completedAt?.toDate ? l.completedAt.toDate() : new Date(l.completedAt || 0);
    return d.toISOString().slice(0, 10) === today;
  });
  const weekLogs = workoutLogs.filter(l => {
    const d = l.completedAt?.toDate ? l.completedAt.toDate() : new Date(l.completedAt || 0);
    return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  });

  const getClientName = (userId) => {
    const c = clients.find(c => c.userId === userId || c.id === userId);
    return c?.name || c?.email?.split("@")[0] || userId?.slice(0, 10) + "...";
  };

  const filteredFeed = filterClientId ? liveFeed.filter(f => f.userId === filterClientId) : liveFeed;
  const filteredLogs = filterClientId ? workoutLogs.filter(l => l.userId === filterClientId) : workoutLogs;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <div style={S.sectionTitle}>OVERVIEW</div>
          <div style={S.sectionSub}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ ...S.label, marginBottom: 0 }}>FILTER:</label>
          <select value={filterClientId || ""} onChange={e => onFilterClient(e.target.value || null)}
            style={{ ...S.input, width: "auto", minWidth: 180, fontSize: 13 }}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.userId || c.id}>{c.name || c.email}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 }}>
        <StatCard label="Total Clients" value={clients.length} color={C.accent} />
        <StatCard label="Today" value={todayLogs.length} color={C.accentBlue} sub="workouts completed" />
        <StatCard label="This Week" value={weekLogs.length} color={C.accentGreen} sub="total workouts" />
        <StatCard label="Live Now" value={filteredFeed.length} color={filteredFeed.length > 0 ? C.accentRed : C.textDim} sub="active sets" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Live Feed */}
        <div>
          <div style={{ fontSize: 18, fontFamily: F.display, letterSpacing: "0.05em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: filteredFeed.length > 0 ? C.accentRed : C.textDim, animation: filteredFeed.length > 0 ? "pulse 1.5s infinite" : "none" }} />
            LIVE ACTIVITY
          </div>
          {filteredFeed.length === 0 ? (
            <div style={{ ...S.card, textAlign: "center", padding: "32px 20px" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>😴</div>
              <div style={{ fontSize: 16, fontFamily: F.display, color: C.textMuted }}>NO ACTIVE SESSIONS</div>
            </div>
          ) : filteredFeed.slice(0, 10).map((item, i) => (
            <div key={item.id || i} style={{ ...S.card, borderLeft: `3px solid ${C.accentRed}`, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 14, fontFamily: F.display, letterSpacing: "0.05em" }}>{item.exerciseName}</div>
                  <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, marginTop: 2 }}>
                    Set {item.setNumber} · {item.reps || "–"} reps{item.weight ? ` · ${item.weight} lbs` : ""}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: F.body, color: C.accentBlue, marginTop: 2 }}>
                    {getClientName(item.userId)} · {item.workoutName}
                  </div>
                </div>
                <div style={{ fontSize: 10, fontFamily: F.body, color: C.textMuted, whiteSpace: "nowrap" }}>{fmtTime(item.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Workouts */}
        <div>
          <div style={{ fontSize: 18, fontFamily: F.display, letterSpacing: "0.05em", marginBottom: 12 }}>RECENT WORKOUTS</div>
          {filteredLogs.slice(0, 10).map((log, i) => (
            <div key={log.id || i} onClick={() => onViewLog(log)}
              style={{ ...S.card, cursor: "pointer", marginBottom: 8 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.borderLight}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontFamily: F.display }}>{log.workoutName}</div>
                  <div style={{ fontSize: 11, fontFamily: F.body, color: C.accentBlue, marginTop: 1 }}>{getClientName(log.userId)}</div>
                  <div style={{ fontSize: 10, fontFamily: F.body, color: C.textMuted, marginTop: 1 }}>
                    {fmtDateTime(log.completedAt)}{log.duration ? ` · ${Math.floor(log.duration / 60)}min` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {log.rating && <div style={{ fontFamily: F.display, fontSize: 18, color: C.accent }}>{log.rating}★</div>}
                  <div style={{ color: C.textDim, fontSize: 20 }}>›</div>
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
function ClientsTab({ clients, workoutLogs, onAddClient, onSelectClient }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", program: "Rebuild Method" });
  const [saving, setSaving] = useState(false);
  const [linkEmail, setLinkEmail] = useState({});
  const [linking, setLinking] = useState({});
  const [linkMsg, setLinkMsg] = useState({});

  const handleAdd = async () => {
    if (!newClient.name || !newClient.email) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "clients"), { ...newClient, createdAt: serverTimestamp(), active: true });
      setNewClient({ name: "", email: "", program: "Rebuild Method" });
      setShowAdd(false);
      onAddClient();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleLink = async (clientId) => {
    const email = linkEmail[clientId];
    if (!email) return;
    setLinking({ ...linking, [clientId]: true });
    try {
      const q = query(collection(db, "workoutLogs"), where("userEmail", "==", email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userId = snap.docs[0].data().userId;
        await updateDoc(doc(db, "clients", clientId), { userId, linkedEmail: email });
        setLinkMsg({ ...linkMsg, [clientId]: "✓ Linked successfully!" });
        onAddClient();
      } else {
        await updateDoc(doc(db, "clients", clientId), { linkedEmail: email, pendingLink: true });
        setLinkMsg({ ...linkMsg, [clientId]: "Email saved — will link when client logs their first workout." });
        onAddClient();
      }
    } catch (e) { console.error(e); }
    setLinking({ ...linking, [clientId]: false });
  };

  const getClientLogs = (client) => workoutLogs.filter(l => l.userId === client.userId || l.userId === client.id);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <div style={S.sectionTitle}>CLIENTS</div>
          <div style={S.sectionSub}>{clients.length} ATHLETES ENROLLED</div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ ...S.btn("primary"), fontSize: 14 }}>+ ADD CLIENT</button>
      </div>

      {showAdd && (
        <div style={{ ...S.card, border: `1px solid ${C.accent}44`, marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontFamily: F.display, marginBottom: 16 }}>NEW CLIENT</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={S.label}>NAME</label>
              <input value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} placeholder="John Doe" style={S.input} />
            </div>
            <div>
              <label style={S.label}>EMAIL</label>
              <input value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} placeholder="john@email.com" style={S.input} />
            </div>
            <div>
              <label style={S.label}>PROGRAM</label>
              <select value={newClient.program} onChange={e => setNewClient({ ...newClient, program: e.target.value })} style={{ ...S.input, fontFamily: F.body }}>
                <option>Rebuild Method</option>
                <option>Strength Foundation</option>
                <option>Custom Program</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowAdd(false)} style={{ ...S.btn("ghost"), flex: 1 }}>CANCEL</button>
            <button onClick={handleAdd} disabled={saving} style={{ ...S.btn("primary"), flex: 2, opacity: saving ? 0.6 : 1 }}>
              {saving ? "SAVING..." : "ADD CLIENT"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {clients.map(client => {
          const logs = getClientLogs(client);
          const lastLog = logs[0];
          const isLinked = !!client.userId;
          return (
            <div key={client.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: isLinked ? C.accent : C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontFamily: F.display, color: isLinked ? "#000" : C.textMuted, flexShrink: 0 }}>
                  {(client.name || client.email || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontFamily: F.display, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {client.name || client.email?.split("@")[0]}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.email}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={S.pill(isLinked ? C.accentGreen : C.textDim)}>{isLinked ? "✓ LINKED" : "NOT LINKED"}</span>
                <span style={S.pill(C.accentBlue)}>{logs.length} sessions</span>
                {client.program && <span style={S.pill(C.textDim)}>{client.program}</span>}
              </div>
              {lastLog && <div style={{ fontSize: 10, fontFamily: F.body, color: C.textDim }}>Last workout: {fmtDate(lastLog.completedAt)}</div>}

              {/* Link section */}
              {!isLinked && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                  <label style={S.label}>LINK CLIENT APP ACCOUNT</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      placeholder="Client's Google email"
                      value={linkEmail[client.id] || ""}
                      onChange={e => setLinkEmail({ ...linkEmail, [client.id]: e.target.value })}
                      style={{ ...S.input, flex: 1, padding: "8px 10px", fontSize: 12 }}
                    />
                    <button onClick={() => handleLink(client.id)} disabled={linking[client.id]}
                      style={{ ...S.btn("blue"), padding: "8px 12px", fontSize: 12, flexShrink: 0 }}>
                      LINK
                    </button>
                  </div>
                  {linkMsg[client.id] && (
                    <div style={{ fontSize: 11, fontFamily: F.body, color: C.accentGreen, marginTop: 6 }}>{linkMsg[client.id]}</div>
                  )}
                </div>
              )}

              <button onClick={() => onSelectClient(client)} style={{ ...S.btn("ghost"), width: "100%", fontSize: 12, padding: "8px", marginTop: "auto" }}>
                VIEW PROGRESS
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Program Designer ─────────────────────────────────────────────────────────
function ProgramDesigner({ clients, onBack }) {
  const [programName, setProgramName] = useState("");
  const [programWeeks, setProgramWeeks] = useState(8);
  const [assignedClient, setAssignedClient] = useState("");
  const [blocks, setBlocks] = useState([{ id: "b1", name: "Block A", type: "straight", exercises: [] }]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [quickInput, setQuickInput] = useState({});

  const addBlock = () => {
    const letter = String.fromCharCode(65 + blocks.length);
    setBlocks(prev => [...prev, { id: `b${Date.now()}`, name: `Block ${letter}`, type: "straight", exercises: [] }]);
  };

  const removeBlock = (blockId) => setBlocks(prev => prev.filter(b => b.id !== blockId));
  const updateBlock = (blockId, field, value) => setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, [field]: value } : b));

  const addExercise = (blockId, exerciseData = {}) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      return { ...b, exercises: [...b.exercises, { id: `e${Date.now()}${Math.random()}`, name: exerciseData.name || "", sets: exerciseData.sets || 3, reps: exerciseData.reps || "8-10", tempo: exerciseData.tempo || "", rpe: exerciseData.rpe || "", rest: exerciseData.rest || "60s", notes: exerciseData.notes || "" }] };
    }));
  };

  const removeExercise = (blockId, exId) => setBlocks(prev => prev.map(b => b.id !== blockId ? b : { ...b, exercises: b.exercises.filter(e => e.id !== exId) }));
  const updateExercise = (blockId, exId, field, value) => setBlocks(prev => prev.map(b => b.id !== blockId ? b : { ...b, exercises: b.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e) }));

  const handleQuickInput = (blockId) => {
    const text = quickInput[blockId] || "";
    const lines = text.split("\n").filter(l => l.trim());
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const name = parts[0].replace(/_/g, " ");
      let sets = 3, reps = "8-10", tempo = "", rpe = "", rest = "60s";
      parts.slice(1).forEach(p => {
        if (/^\d+x\d/i.test(p)) { const [s, r] = p.split("x"); sets = parseInt(s); reps = r; }
        else if (/^RPE\d/i.test(p)) rpe = p.replace(/rpe/i, "");
        else if (/^\d{4}$/.test(p)) tempo = p;
        else if (/^rest/i.test(p)) rest = p.replace(/rest/i, "");
      });
      addExercise(blockId, { name, sets, reps, tempo, rpe, rest });
    });
    setQuickInput(prev => ({ ...prev, [blockId]: "" }));
  };

  const handleSave = async () => {
    if (!programName) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, "programs"), { name: programName, weeks: programWeeks, assignedClientId: assignedClient || null, blocks, createdAt: serverTimestamp(), createdBy: auth.currentUser?.uid });
      if (assignedClient) {
        await updateDoc(doc(db, "clients", assignedClient), { assignedProgramId: ref.id, assignedProgramName: programName });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const blockTypeColors = { straight: C.accent, circuit: C.accentBlue, superset: C.accentGreen, emom: C.accentOrange };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <button onClick={onBack} style={{ ...S.btn("dim"), fontSize: 12, padding: "6px 12px", marginBottom: 12 }}>← BACK TO PROGRAMS</button>
          <div style={S.sectionTitle}>PROGRAM DESIGNER</div>
          <div style={S.sectionSub}>BUILD A CUSTOM TRAINING PROGRAM</div>
        </div>
        <button onClick={handleSave} disabled={saving || !programName} style={{ ...S.btn("primary"), fontSize: 16, opacity: !programName ? 0.4 : 1 }}>
          {saving ? "SAVING..." : saved ? "✓ SAVED!" : "SAVE PROGRAM"}
        </button>
      </div>

      {/* Program meta */}
      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 16 }}>
          <div>
            <label style={S.label}>PROGRAM NAME</label>
            <input value={programName} onChange={e => setProgramName(e.target.value)} placeholder="e.g. Rebuild Method Phase 2" style={S.input} />
          </div>
          <div>
            <label style={S.label}>DURATION (WEEKS)</label>
            <input type="number" value={programWeeks} onChange={e => setProgramWeeks(parseInt(e.target.value))} min={1} max={52} style={S.input} />
          </div>
          <div>
            <label style={S.label}>ASSIGN TO CLIENT</label>
            <select value={assignedClient} onChange={e => setAssignedClient(e.target.value)} style={{ ...S.input, fontFamily: F.body }}>
              <option value="">— No assignment —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Blocks */}
      {blocks.map((block, blockIdx) => (
        <div key={block.id} style={{ ...S.card, border: `1px solid ${(blockTypeColors[block.type] || C.accent)}33`, marginBottom: 20 }}>
          {/* Block header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 32, fontFamily: F.display, color: blockTypeColors[block.type] || C.accent, minWidth: 32, lineHeight: 1 }}>
              {String.fromCharCode(65 + blockIdx)}
            </div>
            <input value={block.name} onChange={e => updateBlock(block.id, "name", e.target.value)}
              style={{ ...S.input, width: 180, padding: "8px 12px", fontSize: 14 }} />
            <select value={block.type} onChange={e => updateBlock(block.id, "type", e.target.value)}
              style={{ ...S.input, width: "auto", minWidth: 150, fontFamily: F.body, fontSize: 13 }}>
              <option value="straight">Straight Sets</option>
              <option value="superset">Superset</option>
              <option value="circuit">Circuit</option>
              <option value="emom">EMOM</option>
            </select>
            <span style={S.pill(blockTypeColors[block.type] || C.accent)}>{block.type.toUpperCase()}</span>
            <button onClick={() => removeBlock(block.id)} style={{ ...S.btn("danger"), padding: "6px 12px", fontSize: 12, marginLeft: "auto" }}>REMOVE</button>
          </div>

          {/* Exercise grid */}
          {block.exercises.length > 0 && (
            <div style={{ marginBottom: 14, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 12, minWidth: 700 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["#", "EXERCISE", "SETS", "REPS", "TEMPO", "RPE", "REST", "NOTES", ""].map(h => (
                      <th key={h} style={{ textAlign: "left", color: C.textMuted, fontWeight: 700, letterSpacing: "0.1em", padding: "6px 8px", fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.exercises.map((ex, exIdx) => (
                    <tr key={ex.id} style={{ borderBottom: `1px solid ${C.border}55` }}>
                      <td style={{ padding: "6px 8px", fontFamily: F.display, fontSize: 18, color: blockTypeColors[block.type] || C.accent, whiteSpace: "nowrap" }}>
                        {getBlockLabel(blockIdx, exIdx)}
                      </td>
                      <td style={{ padding: "4px 8px", minWidth: 160 }}>
                        <input value={ex.name} onChange={e => updateExercise(block.id, ex.id, "name", e.target.value)}
                          style={{ ...S.input, padding: "6px 10px", fontSize: 13 }} />
                      </td>
                      {["sets", "reps", "tempo", "rpe", "rest", "notes"].map(field => (
                        <td key={field} style={{ padding: "4px 8px", minWidth: field === "notes" ? 130 : field === "reps" ? 80 : 65 }}>
                          <input value={ex[field]} onChange={e => updateExercise(block.id, ex.id, field, e.target.value)}
                            placeholder={field === "tempo" ? "3010" : field === "rpe" ? "1-10" : field === "rest" ? "60s" : ""}
                            style={{ ...S.input, padding: "6px 10px", fontSize: 13 }} />
                        </td>
                      ))}
                      <td style={{ padding: "4px 8px" }}>
                        <button onClick={() => removeExercise(block.id, ex.id)}
                          style={{ background: "transparent", border: "none", color: C.accentRed, cursor: "pointer", fontSize: 18, padding: "4px 6px" }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick text input */}
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>QUICK ADD — type exercises below, one per line</label>
            <div style={{ fontSize: 10, fontFamily: F.body, color: C.textDim, marginBottom: 6 }}>
              Format: ExerciseName SETSxREPS RPE[1-10] TEMPO[4digits] rest[time] — e.g. "Barbell_Squat 4x8 RPE8 3010 rest90s"
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <textarea
                value={quickInput[block.id] || ""}
                onChange={e => setQuickInput(prev => ({ ...prev, [block.id]: e.target.value }))}
                placeholder={"Barbell_Squat 4x8 RPE8 3010 rest90s\nRomanian_Deadlift 3x10 RPE7 2010 rest60s\nLeg_Press 3x12 rest60s"}
                rows={3}
                style={{ ...S.input, flex: 1, resize: "vertical", fontSize: 13, lineHeight: 1.6 }}
              />
              <button onClick={() => handleQuickInput(block.id)}
                style={{ ...S.btn("primary"), alignSelf: "flex-end", flexShrink: 0, fontSize: 14, padding: "10px 16px" }}>ADD</button>
            </div>
          </div>

          <button onClick={() => addExercise(block.id)} style={{ ...S.btn("ghost"), fontSize: 13, padding: "8px 16px" }}>
            + ADD EXERCISE ROW
          </button>
        </div>
      ))}

      <button onClick={addBlock} style={{ ...S.btn("ghost"), width: "100%", fontSize: 16, padding: "14px", marginTop: 4, borderStyle: "dashed" }}>
        + ADD BLOCK
      </button>
    </div>
  );
}

// ─── Programs Tab ─────────────────────────────────────────────────────────────
function ProgramsTab({ clients }) {
  const [view, setView] = useState("list");
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "programs"));
      setPrograms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadPrograms(); }, []);

  if (view === "designer") return <ProgramDesigner clients={clients} onBack={() => { setView("list"); loadPrograms(); }} />;

  const blockTypeColors = { straight: C.accent, circuit: C.accentBlue, superset: C.accentGreen, emom: C.accentOrange };

  if (view === "detail" && selectedProgram) {
    const assignedClient = clients.find(c => c.id === selectedProgram.assignedClientId);
    return (
      <div>
        <button onClick={() => setView("list")} style={{ ...S.btn("dim"), fontSize: 12, padding: "6px 12px", marginBottom: 20 }}>← BACK</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 36, fontFamily: F.display }}>{selectedProgram.name}</div>
            <div style={{ fontSize: 12, fontFamily: F.body, color: C.textMuted, marginTop: 4 }}>
              {selectedProgram.weeks} weeks{assignedClient ? ` · Assigned to ${assignedClient.name || assignedClient.email}` : ""}
            </div>
          </div>
        </div>
        {selectedProgram.blocks?.map((block, blockIdx) => (
          <div key={block.id || blockIdx} style={{ ...S.card, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 28, fontFamily: F.display, color: blockTypeColors[block.type] || C.accent }}>{String.fromCharCode(65 + blockIdx)}</div>
              <div style={{ fontSize: 18, fontFamily: F.display }}>{block.name}</div>
              <span style={S.pill(blockTypeColors[block.type] || C.accent)}>{block.type}</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["#", "EXERCISE", "SETS", "REPS", "TEMPO", "RPE", "REST", "NOTES"].map(h => (
                    <th key={h} style={{ textAlign: "left", color: C.textMuted, fontWeight: 700, letterSpacing: "0.1em", padding: "6px 10px", fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.exercises?.map((ex, exIdx) => (
                  <tr key={ex.id || exIdx} style={{ borderTop: `1px solid ${C.border}55` }}>
                    <td style={{ padding: "10px", fontFamily: F.display, fontSize: 18, color: blockTypeColors[block.type] || C.accent }}>{getBlockLabel(blockIdx, exIdx)}</td>
                    <td style={{ padding: "10px", fontWeight: 500 }}>{ex.name}</td>
                    <td style={{ padding: "10px", color: C.textMuted }}>{ex.sets}</td>
                    <td style={{ padding: "10px", color: C.textMuted }}>{ex.reps}</td>
                    <td style={{ padding: "10px", color: C.textMuted }}>{ex.tempo || "–"}</td>
                    <td style={{ padding: "10px", color: ex.rpe ? C.accentOrange : C.textMuted }}>{ex.rpe ? `RPE ${ex.rpe}` : "–"}</td>
                    <td style={{ padding: "10px", color: C.textMuted }}>{ex.rest || "–"}</td>
                    <td style={{ padding: "10px", color: C.textMuted, fontStyle: "italic", fontSize: 12 }}>{ex.notes || "–"}</td>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <div style={S.sectionTitle}>PROGRAMS</div>
          <div style={S.sectionSub}>{programs.length} PROGRAMS CREATED</div>
        </div>
        <button onClick={() => setView("designer")} style={{ ...S.btn("primary"), fontSize: 14 }}>+ NEW PROGRAM</button>
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.textMuted, fontFamily: F.display }}>LOADING...</div>
      ) : programs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 48, fontFamily: F.display, color: C.textDim, marginBottom: 12 }}>0</div>
          <div style={{ fontFamily: F.body, color: C.textMuted, fontSize: 13 }}>No programs yet. Click New Program to build one.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {programs.map(program => {
            const assignedClient = clients.find(c => c.id === program.assignedClientId);
            const totalExercises = program.blocks?.reduce((sum, b) => sum + (b.exercises?.length || 0), 0) || 0;
            return (
              <div key={program.id}
                onClick={() => { setSelectedProgram(program); setView("detail"); }}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + "66"}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                <div style={{ fontSize: 22, fontFamily: F.display, marginBottom: 6 }}>{program.name}</div>
                <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, marginBottom: 12 }}>
                  {program.weeks} weeks · {program.blocks?.length || 0} blocks · {totalExercises} exercises
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {assignedClient && <span style={S.pill(C.accentGreen)}>{assignedClient.name || assignedClient.email}</span>}
                  {program.blocks?.map((b, i) => <span key={i} style={S.pill(C.textDim)}>{String.fromCharCode(65 + i)}: {b.type}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────
function ProgressTab({ clients, workoutLogs, selectedClientId, onSelectClient, viewLog, onViewLog }) {
  const [selectedExercise, setSelectedExercise] = useState("");
  const [filterClient, setFilterClient] = useState(selectedClientId || "");
  const [detailedLog, setDetailedLog] = useState(viewLog || null);

  useEffect(() => { if (viewLog) setDetailedLog(viewLog); }, [viewLog]);
  useEffect(() => { if (selectedClientId) setFilterClient(selectedClientId); }, [selectedClientId]);

  const resolveUserId = (clientIdOrUserId) => {
    if (!clientIdOrUserId) return null;
    const c = clients.find(c => c.id === clientIdOrUserId || c.userId === clientIdOrUserId);
    return c?.userId || clientIdOrUserId;
  };

  const clientLogs = filterClient
    ? workoutLogs.filter(l => l.userId === resolveUserId(filterClient))
    : workoutLogs;

  const selectedClient = clients.find(c => c.id === filterClient || c.userId === filterClient);
  const allExercises = [...new Set(clientLogs.flatMap(log => log.exercises?.map(ex => ex.name) || []))];

  const exerciseHistory = clientLogs
    .filter(log => log.exercises?.some(ex => ex.name === selectedExercise))
    .map(log => {
      const ex = log.exercises.find(e => e.name === selectedExercise);
      const completedSets = ex?.sets?.filter(s => s.completed) || [];
      const topSet = completedSets.reduce((best, s) => {
        const w = parseFloat(s.weight) || 0;
        return w > (parseFloat(best?.weight) || 0) ? s : best;
      }, null);
      return { logId: log.id, date: log.completedAt?.toDate ? log.completedAt.toDate() : new Date(log.completedAt || 0), workoutName: log.workoutName, topWeight: parseFloat(topSet?.weight) || 0, topReps: topSet?.reps || 0, completedSets: completedSets.length };
    })
    .sort((a, b) => a.date - b.date);

  const maxWeight = exerciseHistory.length > 0 ? Math.max(...exerciseHistory.map(d => d.topWeight)) : 0;

  if (detailedLog) {
    const log = workoutLogs.find(l => l.id === detailedLog);
    if (!log) { setDetailedLog(null); return null; }
    const client = clients.find(c => c.userId === log.userId || c.id === log.userId);
    return (
      <div>
        <button onClick={() => { setDetailedLog(null); onViewLog(null); }} style={{ ...S.btn("ghost"), marginBottom: 20, fontSize: 13 }}>← BACK</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 32, fontFamily: F.display }}>{log.workoutName}</div>
            <div style={{ fontSize: 12, fontFamily: F.body, color: C.accentBlue, marginTop: 2 }}>{client?.name || client?.email || log.userId?.slice(0, 20)}</div>
            <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, marginTop: 2 }}>
              {fmtDateTime(log.completedAt)}{log.duration ? ` · ${Math.floor(log.duration / 60)} min` : ""}
            </div>
          </div>
          {log.rating && <div style={{ fontSize: 48, fontFamily: F.display, color: C.accent }}>{log.rating}<span style={{ fontSize: 20, color: C.textMuted }}>★</span></div>}
        </div>
        {log.notes && <div style={{ ...S.card, fontFamily: F.body, fontSize: 13, color: C.textMuted, fontStyle: "italic", marginBottom: 16 }}>"{log.notes}"</div>}
        {log.exercises?.map((ex, i) => (
          <div key={i} style={S.card}>
            <div style={{ fontSize: 20, fontFamily: F.display, marginBottom: 12 }}>{ex.name}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 13 }}>
              <thead>
                <tr>{["SET", "WEIGHT", "REPS", "STATUS"].map(h => <th key={h} style={{ textAlign: "left", color: C.textMuted, fontWeight: 700, letterSpacing: "0.1em", paddingBottom: 8, fontSize: 10 }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {ex.sets?.map((s, si) => (
                  <tr key={si} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "8px 0", fontFamily: F.display, fontSize: 18 }}>{s.setNumber}</td>
                    <td style={{ padding: "8px 0", color: s.completed ? C.text : C.textMuted }}>{s.weight ? `${s.weight} lbs` : "–"}</td>
                    <td style={{ padding: "8px 0", color: s.completed ? C.text : C.textMuted }}>{s.reps || "–"}</td>
                    <td style={{ padding: "8px 0" }}><span style={{ color: s.completed ? C.accentGreen : C.textDim }}>{s.completed ? "✓ Done" : "–"}</span></td>
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
          <div style={S.sectionSub}>{selectedClient ? (selectedClient.name || selectedClient.email)?.toUpperCase() : "ALL CLIENTS"}</div>
        </div>
        <select value={filterClient} onChange={e => { setFilterClient(e.target.value); onSelectClient(e.target.value || null); }}
          style={{ ...S.input, width: "auto", minWidth: 200, fontFamily: F.body, fontSize: 13 }}>
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.userId || c.id}>{c.name || c.email}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
        <StatCard label="Total Sessions" value={clientLogs.length} color={C.accent} />
        <StatCard label="Exercises Tracked" value={allExercises.length} color={C.accentBlue} />
        <StatCard label="This Month" value={clientLogs.filter(l => { const d = l.completedAt?.toDate ? l.completedAt.toDate() : new Date(l.completedAt || 0); return (Date.now() - d.getTime()) < 30 * 24 * 60 * 60 * 1000; }).length} color={C.accentGreen} sub="workouts" />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>EXERCISE PROGRESS TRACKER</label>
        <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)} style={{ ...S.input, fontFamily: F.body }}>
          <option value="">— Select an exercise to track —</option>
          {allExercises.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>

      {selectedExercise && exerciseHistory.length > 0 && (
        <>
          <div style={{ ...S.card, border: `1px solid ${C.accent}44`, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, fontWeight: 700, letterSpacing: "0.15em" }}>BEST — {selectedExercise.toUpperCase()}</div>
                <div style={{ fontSize: 56, fontFamily: F.display, color: C.accent, lineHeight: 1, marginTop: 4 }}>
                  {maxWeight > 0 ? maxWeight : "–"} <span style={{ fontSize: 24, color: C.textMuted }}>LBS</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted }}>SESSIONS</div>
                <div style={{ fontSize: 40, fontFamily: F.display, color: C.accentBlue }}>{exerciseHistory.length}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {exerciseHistory.slice(-8).map((entry, i, arr) => {
                const pct = maxWeight > 0 ? (entry.topWeight / maxWeight) * 100 : 0;
                const isLatest = i === arr.length - 1;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 10, fontFamily: F.body, color: C.textMuted, minWidth: 55 }}>
                      {entry.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <div style={{ flex: 1, height: 6, background: C.surface, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, background: isLatest ? C.accent : C.accentBlue + "88", width: `${pct}%`, transition: "width 0.5s ease" }} />
                    </div>
                    <div style={{ fontSize: 13, fontFamily: F.display, color: isLatest ? C.accent : C.text, minWidth: 65, textAlign: "right" }}>
                      {entry.topWeight > 0 ? `${entry.topWeight}lbs` : "–"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={S.card}>
            <div style={{ fontSize: 16, fontFamily: F.display, marginBottom: 12 }}>SESSION BREAKDOWN</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 12 }}>
              <thead>
                <tr>{["DATE", "WORKOUT", "TOP WEIGHT", "REPS", "SETS DONE", ""].map(h => <th key={h} style={{ textAlign: "left", color: C.textMuted, fontWeight: 700, letterSpacing: "0.1em", paddingBottom: 10, fontSize: 10, borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {exerciseHistory.slice().reverse().map((entry, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 0", color: C.textMuted }}>{entry.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</td>
                    <td style={{ padding: "10px 0", fontFamily: F.display, fontSize: 14 }}>{entry.workoutName}</td>
                    <td style={{ padding: "10px 0", fontFamily: F.display, fontSize: 16, color: i === 0 ? C.accent : C.text }}>{entry.topWeight > 0 ? entry.topWeight : "–"} <span style={{ fontSize: 10, color: C.textMuted }}>lbs</span></td>
                    <td style={{ padding: "10px 0", color: C.textMuted }}>{entry.topReps || "–"}</td>
                    <td style={{ padding: "10px 0", color: C.accentGreen }}>{entry.completedSets}</td>
                    <td style={{ padding: "10px 0" }}>
                      <button onClick={() => setDetailedLog(entry.logId)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", color: C.textMuted, cursor: "pointer", fontSize: 11, fontFamily: F.body }}>VIEW</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!selectedExercise && (
        <>
          <div style={{ fontSize: 18, fontFamily: F.display, marginBottom: 12 }}>ALL WORKOUTS</div>
          {clientLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted, fontFamily: F.body, fontSize: 13 }}>No workout history yet</div>
          ) : clientLogs.slice(0, 30).map((log, i) => {
            const client = clients.find(c => c.userId === log.userId || c.id === log.userId);
            return (
              <div key={log.id || i} onClick={() => setDetailedLog(log.id)}
                style={{ ...S.card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.borderLight}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                <div>
                  <div style={{ fontSize: 16, fontFamily: F.display }}>{log.workoutName}</div>
                  <div style={{ fontSize: 11, fontFamily: F.body, color: C.accentBlue, marginTop: 1 }}>{client?.name || client?.email || "Unknown client"}</div>
                  <div style={{ fontSize: 10, fontFamily: F.body, color: C.textMuted, marginTop: 1 }}>
                    {fmtDate(log.completedAt)}{log.duration ? ` · ${Math.floor(log.duration / 60)}min` : ""}{log.exercises ? ` · ${log.exercises.length} exercises` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {log.rating && <div style={{ fontFamily: F.display, fontSize: 18, color: C.accent }}>{log.rating}★</div>}
                  <div style={{ color: C.textDim, fontSize: 20 }}>›</div>
                </div>
              </div>
            );
          })}
        </>
      )}
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
  const [filterClientId, setFilterClientId] = useState(null);
  const [viewLog, setViewLog] = useState(null);
  const liveFeedUnsub = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthLoaded(true); });
    return unsub;
  }, []);

  const loadData = async () => {
    try {
      const clientSnap = await getDocs(collection(db, "clients"));
      setClients(clientSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const logsQ = query(collection(db, "workoutLogs"), orderBy("completedAt", "desc"));
      const logsSnap = await getDocs(logsQ);
      setWorkoutLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error("Load error:", e); }
  };

  const startLiveFeed = () => {
    if (liveFeedUnsub.current) liveFeedUnsub.current();
    const q = query(collection(db, "setSyncs"), orderBy("timestamp", "desc"));
    liveFeedUnsub.current = onSnapshot(q, snap => {
      setLiveFeed(snap.docs.slice(0, 30).map(d => ({ id: d.id, ...d.data() })));
    });
  };

  useEffect(() => {
    if (!user) return;
    loadData();
    startLiveFeed();
    return () => { if (liveFeedUnsub.current) liveFeedUnsub.current(); };
  }, [user]);

  if (!authLoaded) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 36, fontFamily: F.display, color: C.accent, letterSpacing: "0.1em" }}>LOADING...</div></div>;
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
        input::placeholder, textarea::placeholder { color: ${C.textDim}; }
        textarea { font-family: ${F.body}; color: ${C.text}; background: ${C.surface}; }
      `}</style>

      {/* Top nav */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 32px", height: 56 }}>
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
              fontFamily: F.display, fontSize: 14, letterSpacing: "0.1em", transition: "all 0.15s",
            }}>{item.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: liveFeed.length > 0 ? C.accentRed : C.textDim, animation: liveFeed.length > 0 ? "pulse 1.5s infinite" : "none" }} />
          <span style={{ fontSize: 11, fontFamily: F.body, color: C.textMuted, letterSpacing: "0.1em" }}>
            {liveFeed.length > 0 ? `${liveFeed.length} LIVE` : "NO ACTIVITY"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid ${C.border}` }} />}
          <button onClick={() => signOut(auth)} style={{ ...S.btn("dim"), fontSize: 11, padding: "6px 12px" }}>SIGN OUT</button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 60px" }}>
        {tab === "overview" && (
          <OverviewTab
            clients={clients} workoutLogs={workoutLogs} liveFeed={liveFeed}
            filterClientId={filterClientId} onFilterClient={setFilterClientId}
            onViewLog={(log) => { setViewLog(log.id); setTab("progress"); }}
          />
        )}
        {tab === "clients" && (
          <ClientsTab
            clients={clients} workoutLogs={workoutLogs} onAddClient={loadData}
            onSelectClient={(client) => { setSelectedClientId(client.userId || client.id); setTab("progress"); }}
          />
        )}
        {tab === "progress" && (
          <ProgressTab
            clients={clients} workoutLogs={workoutLogs}
            selectedClientId={selectedClientId} onSelectClient={setSelectedClientId}
            viewLog={viewLog} onViewLog={setViewLog}
          />
        )}
        {tab === "programs" && <ProgramsTab clients={clients} />}
      </div>
    </div>
  );
}
