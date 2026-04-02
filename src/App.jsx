import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc, orderBy, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDumer7KJOVMOf85aoEP1cam4kpLKs5kiQ",
  authDomain: "framewerks-dashboard.firebaseapp.com",
  projectId: "framewerks-dashboard",
  storageBucket: "framewerks-dashboard.firebasestorage.app",
  messagingSenderId: "878987259944",
  appId: "1:878987259944:web:38bc7c9e3e5e28d2877c9b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('programs');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign-in error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '48px', color: '#FF4D1C' }}>FRAMEWERKS COACH</h1>
        <button onClick={handleSignIn} style={{ padding: '12px 24px', fontSize: '16px', cursor: 'pointer' }}>
          Sign In with Google
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <nav style={{ background: '#1a1a1a', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '32px', color: '#FF4D1C', margin: 0 }}>FRAMEWERKS COACH</h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button
            onClick={() => setActiveTab('programs')}
            style={{
              background: activeTab === 'programs' ? '#FF4D1C' : 'transparent',
              color: 'white',
              border: activeTab === 'programs' ? 'none' : '1px solid #444',
              padding: '10px 20px',
              cursor: 'pointer',
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: '14px'
            }}
          >
            PROGRAMS
          </button>
          <button
            onClick={() => setActiveTab('exercises')}
            style={{
              background: activeTab === 'exercises' ? '#FF4D1C' : 'transparent',
              color: 'white',
              border: activeTab === 'exercises' ? 'none' : '1px solid #444',
              padding: '10px 20px',
              cursor: 'pointer',
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: '14px'
            }}
          >
            EXERCISES
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            style={{
              background: activeTab === 'clients' ? '#FF4D1C' : 'transparent',
              color: 'white',
              border: activeTab === 'clients' ? 'none' : '1px solid #444',
              padding: '10px 20px',
              cursor: 'pointer',
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: '14px'
            }}
          >
            CLIENTS
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            style={{
              background: activeTab === 'progress' ? '#FF4D1C' : 'transparent',
              color: 'white',
              border: activeTab === 'progress' ? 'none' : '1px solid #444',
              padding: '10px 20px',
              cursor: 'pointer',
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: '14px'
            }}
          >
            PROGRESS
          </button>
          <button onClick={handleSignOut} style={{ background: 'transparent', color: '#888', border: '1px solid #444', padding: '10px 20px', cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ padding: '40px' }}>
        {activeTab === 'programs' && <ProgramBuilder user={user} />}
        {activeTab === 'exercises' && <ExerciseLibrary user={user} />}
        {activeTab === 'clients' && <ClientsManager user={user} />}
        {activeTab === 'progress' && <ProgressTracker user={user} />}
      </div>
    </div>
  );
}

// ============= PROGRAM BUILDER =============
function ProgramBuilder({ user }) {
  const [programs, setPrograms] = useState([]);
  const [editingProgram, setEditingProgram] = useState(null);
  const [showPreview, setShowPreview] = useState(null);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    const q = query(collection(db, 'programs'), where('coachId', '==', user.uid));
    const snapshot = await getDocs(q);
    setPrograms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const createNewProgram = () => {
    setEditingProgram({
      name: '',
      description: '',
      tags: [],
      phases: [{
        name: 'Phase 1',
        days: [{
          id: Date.now().toString(),
          name: 'Day 1',
          warmup: [],
          main: [],
          cooldown: []
        }]
      }]
    });
  };

  const saveProgram = async () => {
    if (!editingProgram.name) {
      alert('Please enter a program name');
      return;
    }

    try {
      if (editingProgram.id) {
        await updateDoc(doc(db, 'programs', editingProgram.id), {
          ...editingProgram,
          updatedAt: Timestamp.now()
        });
      } else {
        await addDoc(collection(db, 'programs'), {
          ...editingProgram,
          coachId: user.uid,
          createdAt: Timestamp.now()
        });
      }
      setEditingProgram(null);
      loadPrograms();
    } catch (error) {
      console.error('Error saving program:', error);
      alert('Error saving program');
    }
  };

  const deleteProgram = async (programId) => {
    if (!confirm('Are you sure you want to delete this program?')) return;
    try {
      await deleteDoc(doc(db, 'programs', programId));
      loadPrograms();
    } catch (error) {
      console.error('Error deleting program:', error);
    }
  };

  const duplicateProgram = async (program) => {
    const duplicate = {
      ...program,
      name: `${program.name} (Copy)`,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined
    };
    setEditingProgram(duplicate);
  };

  const exportToPDF = async (program) => {
    alert('PDF export feature coming soon!');
  };

  if (editingProgram) {
    return <ProgramEditor program={editingProgram} setProgram={setEditingProgram} onSave={saveProgram} onCancel={() => setEditingProgram(null)} />;
  }

  if (showPreview) {
    return <ProgramPreview program={showPreview} onClose={() => setShowPreview(null)} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', margin: 0 }}>PROGRAMS</h2>
        <button onClick={createNewProgram} style={{ background: '#FF4D1C', color: 'white', border: 'none', padding: '12px 24px', fontSize: '16px', cursor: 'pointer', fontFamily: '"Bebas Neue", sans-serif' }}>
          + NEW PROGRAM
        </button>
      </div>

      {programs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
          No programs yet. Create your first program!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {programs.map(program => (
            <div key={program.id} style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '24px', marginBottom: '8px' }}>{program.name}</h3>
              {program.description && <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>{program.description}</p>}
              {program.tags && program.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {program.tags.map((tag, i) => (
                    <span key={i} style={{ background: '#f0f0f0', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', color: '#666' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
                {program.phases?.length || 0} phases • {program.phases?.reduce((total, phase) => total + (phase.days?.length || 0), 0) || 0} days
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => setShowPreview(program)} style={{ flex: 1, background: '#FF4D1C', color: 'white', border: 'none', padding: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: '"Bebas Neue", sans-serif' }}>
                  PREVIEW
                </button>
                <button onClick={() => setEditingProgram(program)} style={{ flex: 1, background: '#333', color: 'white', border: 'none', padding: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: '"Bebas Neue", sans-serif' }}>
                  EDIT
                </button>
                <button onClick={() => duplicateProgram(program)} style={{ background: '#666', color: 'white', border: 'none', padding: '8px 12px', cursor: 'pointer', fontSize: '12px', fontFamily: '"Bebas Neue", sans-serif' }}>
                  COPY
                </button>
                <button onClick={() => exportToPDF(program)} style={{ background: '#666', color: 'white', border: 'none', padding: '8px 12px', cursor: 'pointer', fontSize: '12px', fontFamily: '"Bebas Neue", sans-serif' }}>
                  PDF
                </button>
                <button onClick={() => deleteProgram(program.id)} style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '8px 12px', cursor: 'pointer', fontSize: '12px', fontFamily: '"Bebas Neue", sans-serif' }}>
                  DELETE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============= PROGRAM EDITOR =============
function ProgramEditor({ program, setProgram, onSave, onCancel }) {
  const [exercises, setExercises] = useState([]);
  const [showBulkAdd, setShowBulkAdd] = useState(null);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    const snapshot = await getDocs(collection(db, 'exercises'));
    setExercises(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const addPhase = () => {
    setProgram({
      ...program,
      phases: [...program.phases, {
        name: `Phase ${program.phases.length + 1}`,
        days: [{
          id: Date.now().toString(),
          name: 'Day 1',
          warmup: [],
          main: [],
          cooldown: []
        }]
      }]
    });
  };

  const updatePhase = (phaseIndex, field, value) => {
    const updated = [...program.phases];
    updated[phaseIndex] = { ...updated[phaseIndex], [field]: value };
    setProgram({ ...program, phases: updated });
  };

  const deletePhase = (phaseIndex) => {
    if (!confirm('Delete this phase?')) return;
    setProgram({
      ...program,
      phases: program.phases.filter((_, i) => i !== phaseIndex)
    });
  };

  const addDay = (phaseIndex) => {
    const updated = [...program.phases];
    updated[phaseIndex].days.push({
      id: Date.now().toString(),
      name: `Day ${updated[phaseIndex].days.length + 1}`,
      warmup: [],
      main: [],
      cooldown: []
    });
    setProgram({ ...program, phases: updated });
  };

  const updateDay = (phaseIndex, dayIndex, field, value) => {
    const updated = [...program.phases];
    updated[phaseIndex].days[dayIndex] = { ...updated[phaseIndex].days[dayIndex], [field]: value };
    setProgram({ ...program, phases: updated });
  };

  const deleteDay = (phaseIndex, dayIndex) => {
    if (!confirm('Delete this day?')) return;
    const updated = [...program.phases];
    updated[phaseIndex].days = updated[phaseIndex].days.filter((_, i) => i !== dayIndex);
    setProgram({ ...program, phases: updated });
  };

  const addExercise = (phaseIndex, dayIndex, section) => {
    const updated = [...program.phases];
    updated[phaseIndex].days[dayIndex][section].push({
      id: Date.now().toString(),
      name: '',
      sets: '',
      reps: '',
      weight: '',
      tempo: '',
      rpe: '',
      rest: '',
      notes: ''
    });
    setProgram({ ...program, phases: updated });
  };

  const updateExercise = (phaseIndex, dayIndex, section, exerciseIndex, field, value) => {
    const updated = [...program.phases];
    updated[phaseIndex].days[dayIndex][section][exerciseIndex] = {
      ...updated[phaseIndex].days[dayIndex][section][exerciseIndex],
      [field]: value
    };
    setProgram({ ...program, phases: updated });
  };

  const deleteExercise = (phaseIndex, dayIndex, section, exerciseIndex) => {
    const updated = [...program.phases];
    updated[phaseIndex].days[dayIndex][section] = updated[phaseIndex].days[dayIndex][section].filter((_, i) => i !== exerciseIndex);
    setProgram({ ...program, phases: updated });
  };

  const renderBulkAddPanel = (phaseIndex, dayIndex, section) => {
    const [bulkText, setBulkText] = useState('');

    const handleBulkAdd = () => {
      const lines = bulkText.split('\n').filter(line => line.trim());
      const newExercises = lines.map(line => {
        const match = line.match(/^(.+?)\s*[-–]\s*(\d+)\s*x\s*(\d+)/);
        if (match) {
          return {
            id: Date.now().toString() + Math.random(),
            name: match[1].trim(),
            sets: match[2],
            reps: match[3],
            weight: '',
            tempo: '',
            rpe: '',
            rest: '',
            notes: ''
          };
        }
        return {
          id: Date.now().toString() + Math.random(),
          name: line.trim(),
          sets: '',
          reps: '',
          weight: '',
          tempo: '',
          rpe: '',
          rest: '',
          notes: ''
        };
      });

      const updated = [...program.phases];
      updated[phaseIndex].days[dayIndex][section] = [
        ...updated[phaseIndex].days[dayIndex][section],
        ...newExercises
      ];
      setProgram({ ...program, phases: updated });
      setShowBulkAdd(null);
    };

    return (
      <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '4px', marginTop: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Bulk Add Exercises</div>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          Format: "Exercise Name - Sets x Reps" (e.g., "Squat - 3 x 8")
        </div>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder="Squat - 3 x 8&#10;Bench Press - 4 x 6&#10;Deadlift - 3 x 5"
          style={{ width: '100%', minHeight: '100px', padding: '8px', fontFamily: 'monospace', fontSize: '13px', marginBottom: '8px' }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleBulkAdd} style={{ background: '#FF4D1C', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontFamily: '"Bebas Neue", sans-serif' }}>
            ADD
          </button>
          <button onClick={() => setShowBulkAdd(null)} style={{ background: '#888', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontFamily: '"Bebas Neue", sans-serif' }}>
            CANCEL
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '32px', marginBottom: '20px' }}>
          {program.id ? 'EDIT PROGRAM' : 'NEW PROGRAM'}
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Program Name</label>
          <input
            type="text"
            value={program.name}
            onChange={(e) => setProgram({ ...program, name: e.target.value })}
            style={{ width: '100%', padding: '12px', fontSize: '16px', border: '1px solid #ddd', borderRadius: '4px' }}
            placeholder="Enter program name"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Description</label>
          <textarea
            value={program.description}
            onChange={(e) => setProgram({ ...program, description: e.target.value })}
            style={{ width: '100%', padding: '12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '80px' }}
            placeholder="Enter program description"
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Tags (comma-separated)</label>
          <input
            type="text"
            value={program.tags?.join(', ') || ''}
            onChange={(e) => setProgram({ ...program, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
            style={{ width: '100%', padding: '12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
            placeholder="e.g., strength, hypertrophy, beginner"
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onSave} style={{ background: '#FF4D1C', color: 'white', border: 'none', padding: '12px 24px', fontSize: '16px', cursor: 'pointer', fontFamily: '"Bebas Neue", sans-serif' }}>
            SAVE PROGRAM
          </button>
          <button onClick={onCancel} style={{ background: '#888', color: 'white', border: 'none', padding: '12px 24px', fontSize: '16px', cursor: 'pointer', fontFamily: '"Bebas Neue", sans-serif' }}>
            CANCEL
          </button>
        </div>
      </div>

      {/* Phases */}
      {program.phases.map((phase, phaseIndex) => (
        <div key={phaseIndex} style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="text"
              value={phase.name}
              onChange={(e) => updatePhase(phaseIndex, 'name', e.target.value)}
              style={{ fontSize: '24px', fontFamily: '"Bebas Neue", sans-serif', border: 'none', borderBottom: '2px solid #FF4D1C', padding: '4px 0', width: '300px' }}
            />
            <button onClick={() => deletePhase(phaseIndex)} style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontFamily: '"Bebas Neue", sans-serif' }}>
              DELETE PHASE
            </button>
          </div>

          {phase.days.map((day, dayIndex) => (
            <div key={dayIndex} style={{ background: '#f9f9f9', padding: '20px', borderRadius: '4px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={day.name}
                  onChange={(e) => updateDay(phaseIndex, dayIndex, 'name', e.target.value)}
                  style={{ fontSize: '18px', fontFamily: '"Bebas Neue", sans-serif', border: 'none', borderBottom: '1px solid #333', padding: '4px 0', background: 'transparent', width: '200px' }}
                />
                <button onClick={() => deleteDay(phaseIndex, dayIndex)} style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '6px 12px', cursor: 'pointer', fontSize: '11px', fontFamily: '"Bebas Neue", sans-serif' }}>
                  DELETE DAY
                </button>
              </div>

              {/* Warmup */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>WARMUP</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => addExercise(phaseIndex, dayIndex, 'warmup')} style={{ background: '#FF4D1C', color: 'white', border: 'none', padding: '6px 12px', cursor: 'pointer', fontSize: '11px', fontFamily: '"Bebas Neue", sans-serif' }}>
                      + ADD
                    </button>
                    <button onClick={() => setShowBulkAdd({ phaseIndex, dayIndex, section: 'warmup' })} style={{ background: '#666', color: 'white', border: 'none', padding: '6px 12px', cursor: 'pointer', fontSize: '11px', fontFamily: '"Bebas Neue", sans-serif' }}>
                      BULK ADD
                    </button>
                  </div>
                </div>
                {showBulkAdd?.phaseIndex === phaseIndex && showBulkAdd?.dayIndex === dayIndex && showBulkAdd?.section === 'warmup' && renderBulkAddPanel(phaseIndex, dayIndex, 'warmup')}
                {day.warmup.map((exercise, exIndex) => (
                  <ExerciseCard
                    key={exIndex}
                    exercise={exercise}
                    exercises={exercises}
                    onChange={(field, value) => updateExercise(phaseIndex, dayIndex, 'warmup', exIndex, field, value)}
                    onDelete={() => deleteExercise(phaseIndex, dayIndex, 'warmup', exIndex)}
                  />
                ))}
              </div>

              {/* Main */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>MAIN</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => addExercise(phaseIndex, dayIndex, 'main')} style={{ background: '#FF4D1C', color: 'white', border: 'none', padding: '6px 12px', cursor: 'pointer', fontSize: '11px', fontFamily: '"Bebas Neue", sans-serif' }}>
                      + ADD
                    </button>
                    <button onClick={() => setShowBulkAdd({ phaseIndex, dayIndex, section: 'main' })} style={{ background: '#666', color: 'white', border: 'none', padding: '6px 12px', cursor: 'pointer', fontSize: '11px', fontFamily: '"Bebas Neue", sans-serif' }}>
                      BULK ADD
                    </button>
                  </div>
                </div>
                {showBulkAdd?.phaseIndex === phaseIndex && showBulkAdd?.dayIndex === dayIndex && showBulkAdd?.section === 'main' && renderBulkAddPanel(phaseIndex, dayIndex, 'main')}
                {day.main.map((exercise, exIndex) => (
                  <ExerciseCard
                    key={exIndex}
                    exercise={exercise}
                    exercises={exercises}
                    onChange={(field, value) => updateExercise(phaseIndex, dayIndex, 'main', exIndex, field, value)}
                    onDelete={() => deleteExercise(phaseIndex, dayIndex, 'main', exIndex)}
                  />
                ))}
              </div>

              {/* Cooldown */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>COOLDOWN</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => addExercise(phaseIndex, dayIndex, 'cooldown')} style={{ background: '#FF4D1C', color: 'white', border: 'none', padding: '6px 12px', cursor: 'pointer', fontSize: '11px', fontFamily: '"Bebas Neue", sans-serif' }}>
                      + ADD
                    </button>
                    <button onClick={() => setShowBulkAdd({ phaseIndex, dayIndex, section: 'cooldown' })} style={{ background: '#666', color: 'white', border: 'none', padding: '6px 12px', cursor: 'pointer', fontSize: '11px', fontFamily: '"Bebas Neue", sans-serif' }}>
                      BULK ADD
                    </button>
                  </div>
                </div>
                {showBulkAdd?.phaseIndex === phaseIndex && showBulkAdd?.dayIndex === dayIndex && showBulkAdd?.section === 'cooldown' && renderBulkAddPanel(phaseIndex, dayIndex, 'cooldown')}
                {day.cooldown.map((exercise, exIndex) => (
                  <ExerciseCard
                    key={exIndex}
                    exercise={exercise}
                    exercises={exercises}
                    onChange={(field, value) => updateExercise(phaseIndex, dayIndex, 'cooldown', exIndex, field, value)}
                    onDelete={() => deleteExercise(phaseIndex, dayIndex, 'cooldown', exIndex)}
                  />
                ))}
              </div>
            </div>
          ))}

          <button onClick={() => addDay(phaseIndex)} style={{ background: '#333', color: 'white', border: 'none', padding: '10px 20px', cursor: 'pointer', fontSize: '12px', fontFamily: '"Bebas Neue", sans-serif' }}>
            + ADD DAY
          </button>
        </div>
      ))}

      <button onClick={addPhase} style={{ background: '#333', color: 'white', border: 'none', padding: '12px 24px', cursor: 'pointer', fontSize: '14px', fontFamily: '"Bebas Neue", sans-serif' }}>
        + ADD PHASE
      </button>
    </div>
  );
}

// ============= EXERCISE CARD =============
function ExerciseCard({ exercise, exercises, onChange, onDelete }) {
  return (
    <div style={{ background: 'white', padding: '12px', borderRadius: '4px', marginBottom: '8px', border: '1px solid #e0e0e0' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <select
          value={exercise.name}
          onChange={(e) => onChange('name', e.target.value)}
          style={{ flex: 2, padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
        >
          <option value="">Select exercise</option>
          {exercises.map(ex => (
            <option key={ex.id} value={ex.name}>{ex.name}</option>
          ))}
        </select>
        <input type="text" value={exercise.sets} onChange={(e) => onChange('sets', e.target.value)} placeholder="Sets" style={{ flex: 1, padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }} />
        <input type="text" value={exercise.reps} onChange={(e) => onChange('reps', e.target.value)} placeholder="Reps" style={{ flex: 1, padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }} />
        <button onClick={onDelete} style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '8px 12px', cursor: 'pointer', fontSize: '11px', fontFamily: '"Bebas Neue", sans-serif' }}>
          ✕
        </button>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input type="text" value={exercise.weight} onChange={(e) => onChange('weight', e.target.value)} placeholder="Weight" style={{ flex: 1, padding: '6px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '4px' }} />
        <input type="text" value={exercise.tempo} onChange={(e) => onChange('tempo', e.target.value)} placeholder="Tempo" style={{ flex: 1, padding: '6px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '4px' }} />
        <input type="text" value={exercise.rpe} onChange={(e) => onChange('rpe', e.target.value)} placeholder="RPE" style={{ flex: 1, padding: '6px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '4px' }} />
        <input type="text" value={exercise.rest} onChange={(e) => onChange('rest', e.target.value)} placeholder="Rest" style={{ flex: 1, padding: '6px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

// ============= PROGRAM PREVIEW =============
function ProgramPreview({ program, onClose }) {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ background: 'white', padding: '32px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', marginBottom: '8px' }}>{program.name}</h2>
            {program.description && <p style={{ color: '#666', fontSize: '16px' }}>{program.description}</p>}
          </div>
          <button onClick={onClose} style={{ background: '#888', color: 'white', border: 'none', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontFamily: '"Bebas Neue", sans-serif' }}>
            CLOSE
          </button>
        </div>

        {program.phases?.map((phase, phaseIdx) => (
          <div key={phaseIdx} style={{ marginBottom: '32px' }}>
            <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '28px', marginBottom: '16px', color: '#FF4D1C' }}>{phase.name}</h3>
            {phase.days?.map((day, dayIdx) => (
              <div key={dayIdx} style={{ background: '#f9f9f9', padding: '20px', borderRadius: '4px', marginBottom: '16px' }}>
                <h4 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '20px', marginBottom: '12px' }}>{day.name}</h4>
                
                {day.warmup?.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '8px' }}>WARMUP</div>
                    {day.warmup.map((ex, i) => (
                      <div key={i} style={{ fontSize: '14px', marginBottom: '4px' }}>• {ex.name} {ex.sets && `- ${ex.sets} x ${ex.reps}`}</div>
                    ))}
                  </div>
                )}

                {day.main?.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '8px' }}>MAIN</div>
                    {day.main.map((ex, i) => (
                      <div key={i} style={{ fontSize: '14px', marginBottom: '4px' }}>• {ex.name} {ex.sets && `- ${ex.sets} x ${ex.reps}`}</div>
                    ))}
                  </div>
                )}

                {day.cooldown?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '8px' }}>COOLDOWN</div>
                    {day.cooldown.map((ex, i) => (
                      <div key={i} style={{ fontSize: '14px', marginBottom: '4px' }}>• {ex.name} {ex.sets && `- ${ex.sets} x ${ex.reps}`}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============= EXERCISE LIBRARY =============
function ExerciseLibrary({ user }) {
  const [exercises, setExercises] = useState([]);
  const [newExercise, setNewExercise] = useState({ name: '', category: '', description: '', videoUrl: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    const snapshot = await getDocs(collection(db, 'exercises'));
    setExercises(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const addExercise = async () => {
    if (!newExercise.name) {
      alert('Please enter an exercise name');
      return;
    }
    try {
      await addDoc(collection(db, 'exercises'), {
        ...newExercise,
        createdAt: Timestamp.now()
      });
      setNewExercise({ name: '', category: '', description: '', videoUrl: '' });
      loadExercises();
    } catch (error) {
      console.error('Error adding exercise:', error);
    }
  };

  const deleteExercise = async (id) => {
    if (!confirm('Delete this exercise?')) return;
    try {
      await deleteDoc(doc(db, 'exercises', id));
      loadExercises();
    } catch (error) {
      console.error('Error deleting exercise:', error);
    }
  };

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || ex.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(exercises.map(ex => ex.category).filter(Boolean))];

  return (
    <div>
      <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', marginBottom: '30px' }}>EXERCISE LIBRARY</h2>

      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '24px', marginBottom: '16px' }}>ADD NEW EXERCISE</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <input
            type="text"
            value={newExercise.name}
            onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
            placeholder="Exercise name"
            style={{ padding: '12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="text"
            value={newExercise.category}
            onChange={(e) => setNewExercise({ ...newExercise, category: e.target.value })}
            placeholder="Category (e.g., Legs, Push)"
            style={{ padding: '12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        <textarea
          value={newExercise.description}
          onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
          placeholder="Description"
          style={{ width: '100%', padding: '12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '12px', minHeight: '60px' }}
        />
        <input
          type="text"
          value={newExercise.videoUrl}
          onChange={(e) => setNewExercise({ ...newExercise, videoUrl: e.target.value })}
          placeholder="Video URL (optional)"
          style={{ width: '100%', padding: '12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '12px' }}
        />
        <button onClick={addExercise} style={{ background: '#FF4D1C', color: 'white', border: 'none', padding: '12px 24px', cursor: 'pointer', fontSize: '14px', fontFamily: '"Bebas Neue", sans-serif' }}>
          ADD EXERCISE
        </button>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search exercises..."
            style={{ flex: 1, padding: '12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: '12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filteredExercises.map(exercise => (
            <div key={exercise.id} style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>{exercise.name}</div>
                  {exercise.category && <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>{exercise.category}</div>}
                </div>
                <button onClick={() => deleteExercise(exercise.id)} style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', fontFamily: '"Bebas Neue", sans-serif' }}>
                  DELETE
                </button>
              </div>
              {exercise.description && <div style={{ fontSize: '13px', color: '#666' }}>{exercise.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============= CLIENTS MANAGER =============
function ClientsManager({ user }) {
  const [clients, setClients] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [newClientEmail, setNewClientEmail] = useState('');

  useEffect(() => {
    loadClients();
    loadPrograms();
  }, []);

  const loadClients = async () => {
    const snapshot = await getDocs(collection(db, 'clients'));
    setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const loadPrograms = async () => {
    const q = query(collection(db, 'programs'), where('coachId', '==', user.uid));
    const snapshot = await getDocs(q);
    setPrograms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const addClient = async () => {
    if (!newClientEmail) {
      alert('Please enter a client email');
      return;
    }
    try {
      await addDoc(collection(db, 'clients'), {
        email: newClientEmail,
        coachId: user.uid,
        createdAt: Timestamp.now()
      });
      setNewClientEmail('');
      loadClients();
    } catch (error) {
      console.error('Error adding client:', error);
    }
  };

  const assignProgram = async (clientId, programId) => {
    try {
      const program = programs.find(p => p.id === programId);
      await updateDoc(doc(db, 'clients', clientId), {
        assignedProgram: program,
        assignedAt: Timestamp.now()
      });
      loadClients();
    } catch (error) {
      console.error('Error assigning program:', error);
    }
  };

  const deleteClient = async (clientId) => {
    if (!confirm('Remove this client?')) return;
    try {
      await deleteDoc(doc(db, 'clients', clientId));
      loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  return (
    <div>
      <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', marginBottom: '30px' }}>CLIENTS</h2>

      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '24px', marginBottom: '16px' }}>ADD NEW CLIENT</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="email"
            value={newClientEmail}
            onChange={(e) => setNewClientEmail(e.target.value)}
            placeholder="Client email"
            style={{ flex: 1, padding: '12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <button onClick={addClient} style={{ background: '#FF4D1C', color: 'white', border: 'none', padding: '12px 24px', cursor: 'pointer', fontSize: '14px', fontFamily: '"Bebas Neue", sans-serif' }}>
            ADD CLIENT
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {clients.map(client => (
          <div key={client.id} style={{ background: 'white', padding: '24px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>{client.email}</div>
                {client.assignedProgram && (
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Program: {client.assignedProgram.name}
                  </div>
                )}
              </div>
              <button onClick={() => deleteClient(client.id)} style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '6px 12px', cursor: 'pointer', fontSize: '11px', fontFamily: '"Bebas Neue", sans-serif' }}>
                REMOVE
              </button>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>
                ASSIGN PROGRAM
              </label>
              <select
                value={client.assignedProgram?.id || ''}
                onChange={(e) => assignProgram(client.id, e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">No program assigned</option>
                {programs.map(program => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {clients.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
          No clients yet. Add your first client!
        </div>
      )}
    </div>
  );
}

// ============= PROGRESS TRACKER =============
function ProgressTracker({ user }) {
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [setSyncs, setSetSyncs] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedClient]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load clients
      const clientsSnapshot = await getDocs(collection(db, 'clients'));
      const clientsList = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(clientsList);

      // Load workout logs
      let logsQuery = query(
        collection(db, 'workoutLogs'),
        orderBy('completedAt', 'desc')
      );

      if (selectedClient !== 'all') {
        logsQuery = query(
          collection(db, 'workoutLogs'),
          where('userId', '==', selectedClient),
          orderBy('completedAt', 'desc')
        );
      }

      const logsSnapshot = await getDocs(logsQuery);
      const logs = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWorkoutLogs(logs);

      // Load set syncs (real-time data)
      const syncsSnapshot = await getDocs(
        query(collection(db, 'setSyncs'), orderBy('syncedAt', 'desc'))
      );
      const syncs = syncsSnapshot.docs.map(doc => doc.data());
      setSetSyncs(syncs);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClientEmail = (userId) => {
    const client = clients.find(c => c.email === userId || c.id === userId);
    return client?.email || 'Unknown';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
        Loading progress data...
      </div>
    );
  }

  if (selectedWorkout) {
    return <WorkoutDetail workout={selectedWorkout} onClose={() => setSelectedWorkout(null)} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', margin: 0 }}>CLIENT PROGRESS</h2>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          style={{ padding: '12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '250px' }}
        >
          <option value="all">All Clients</option>
          {clients.map(client => (
            <option key={client.id} value={client.email}>{client.email}</option>
          ))}
        </select>
      </div>

      {/* Real-time Set Syncs */}
      {setSyncs.length > 0 && (
        <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '2px solid #FF4D1C' }}>
          <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '24px', marginBottom: '16px', color: '#FF4D1C' }}>
            🔴 LIVE ACTIVITY
          </h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {setSyncs.slice(0, 10).map((sync, idx) => (
              <div key={idx} style={{ fontSize: '14px', marginBottom: '8px', color: '#666' }}>
                <span style={{ fontWeight: 'bold', color: '#FF4D1C' }}>
                  {getClientEmail(sync.userId)}
                </span> completed set {sync.setIndex + 1} of <strong>{sync.exerciseId}</strong> in {sync.workoutName}
                <span style={{ fontSize: '12px', marginLeft: '8px', color: '#999' }}>
                  {sync.syncedAt?.toDate ? sync.syncedAt.toDate().toLocaleTimeString() : 'Just now'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Workouts */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '8px' }}>
        <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '24px', marginBottom: '20px' }}>
          COMPLETED WORKOUTS
        </h3>

        {workoutLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
            No workout logs yet
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {workoutLogs.map((log) => {
              const logDate = log.completedAt?.toDate ? log.completedAt.toDate() : new Date(log.completedAt);
              
              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedWorkout(log)}
                  style={{
                    background: '#f9f9f9',
                    padding: '20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: '1px solid #e0e0e0',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0f0f0';
                    e.currentTarget.style.borderColor = '#FF4D1C';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f9f9f9';
                    e.currentTarget.style.borderColor = '#e0e0e0';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '20px', marginBottom: '4px' }}>
                        {log.workoutName}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        {getClientEmail(log.userId)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                        {logDate.toLocaleDateString()} at {logDate.toLocaleTimeString()}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        {log.duration} • Rating: {log.rating}/10
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {log.exercises?.length || 0} exercises completed
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============= WORKOUT DETAIL VIEW =============
function WorkoutDetail({ workout, onClose }) {
  const logDate = workout.completedAt?.toDate ? workout.completedAt.toDate() : new Date(workout.completedAt);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ background: 'white', padding: '32px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', marginBottom: '8px' }}>
              {workout.workoutName}
            </h2>
            <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
              Completed: {logDate.toLocaleDateString()} at {logDate.toLocaleTimeString()}
            </div>
            <div style={{ fontSize: '14px', color: '#888' }}>
              Duration: {workout.duration} • Rating: {workout.rating}/10
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#888',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: '"Bebas Neue", sans-serif',
              borderRadius: '4px'
            }}
          >
            CLOSE
          </button>
        </div>

        {/* Exercise Details */}
        {workout.exercises && workout.exercises.length > 0 ? (
          <div>
            <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '24px', marginBottom: '20px', color: '#FF4D1C' }}>
              EXERCISES PERFORMED
            </h3>
            {workout.exercises.map((exercise, idx) => (
              <div key={idx} style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '20px', marginBottom: '12px' }}>
                  {exercise.name}
                </div>

                {exercise.sets && exercise.sets.length > 0 ? (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '12px', padding: '8px 12px', background: '#e0e0e0', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>
                      <div>SET</div>
                      <div>REPS</div>
                      <div>WEIGHT</div>
                    </div>
                    {exercise.sets.map((set, setIdx) => (
                      <div key={setIdx} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '12px', padding: '8px 12px', background: 'white', borderRadius: '4px', fontSize: '14px' }}>
                        <div style={{ fontWeight: 'bold' }}>Set {setIdx + 1}</div>
                        <div>{set.reps || '—'}</div>
                        <div>{set.weight ? `${set.weight} lbs` : '—'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', color: '#888' }}>
                    No set data recorded
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
            No exercise data available for this workout
          </div>
        )}
      </div>
    </div>
  );
}
