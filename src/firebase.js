import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, query, where, orderBy, limit } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDwCIb6OQ40TDNlNr1TjxO4kZVf2Ho62X8",
  authDomain: "framewerks-coach.firebaseapp.com",
  projectId: "framewerks-coach",
  storageBucket: "framewerks-coach.firebasestorage.app",
  messagingSenderId: "850336233136",
  appId: "1:850336233136:web:2bf59afb82672435c4ed75",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── Programs ───────────────────────────────────────────────────
export async function saveProgram(program) {
  await setDoc(doc(db, "programs", program.id), program);
}

export async function loadPrograms() {
  const snapshot = await getDocs(collection(db, "programs"));
  return snapshot.docs.map((d) => d.data());
}

export async function deleteProgram(id) {
  await deleteDoc(doc(db, "programs", id));
}

// ─── Exercise Library ───────────────────────────────────────────
export async function saveLibrary(library) {
  await setDoc(doc(db, "config", "exerciseLibrary"), { exercises: library });
}

export async function loadLibrary() {
  const snap = await getDoc(doc(db, "config", "exerciseLibrary"));
  if (snap.exists()) return snap.data().exercises;
  return null;
}

// ─── Clients (Users) ────────────────────────────────────────────
export async function loadClients() {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((d) => d.data());
}

export async function assignProgramToClient(uid, programId) {
  await setDoc(doc(db, "users", uid), { assignedProgramId: programId }, { merge: true });
}

// ─── Workout Logs (for coach view) ──────────────────────────────
export async function loadAllWorkoutLogs() {
  try {
    const q = query(collection(db, "workoutLogs"), orderBy("date", "desc"), limit(200));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data());
  } catch (err) {
    console.warn("Indexed query failed, fallback:", err.message);
    try {
      const snapshot = await getDocs(collection(db, "workoutLogs"));
      const results = snapshot.docs.map((d) => d.data());
      return results.sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 200);
    } catch { return []; }
  }
}

export async function loadClientWorkoutLogs(userId) {
  try {
    const q = query(collection(db, "workoutLogs"), where("userId", "==", userId), orderBy("date", "desc"), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data());
  } catch (err) {
    console.warn("Indexed query failed, fallback:", err.message);
    try {
      const q = query(collection(db, "workoutLogs"), where("userId", "==", userId), limit(50));
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map((d) => d.data());
      return results.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    } catch { return []; }
  }
}

// ─── Client Data (for coach view) ───────────────────────────────
// Coach can see habit completions and wellbeing from the user profile directly
// since client data now saves to the user profile via merge

export { db };
