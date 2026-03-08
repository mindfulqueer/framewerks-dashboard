import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC6mtaBP6B4Jf7515VO9s1Z9dstYPY_5ew",
  authDomain: "framewerks-dashboard.firebaseapp.com",
  projectId: "framewerks-dashboard",
  storageBucket: "framewerks-dashboard.firebasestorage.app",
  messagingSenderId: "838679216503",
  appId: "1:838679216503:web:04eaca225681ee43e1e172",
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

export { db };
