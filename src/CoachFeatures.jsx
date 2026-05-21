// CoachFeatures.jsx — save as src/CoachFeatures.jsx in framewerks-dashboard
import { useState, useEffect, useRef, useMemo } from "react";
import { getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, setDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#0A0A0A", surface:"#111111", card:"#161616", border:"#252525",
  borderLight:"#2E2E2E", accent:"#E8FF00", accentRed:"#FF3D3D",
  accentBlue:"#00C8FF", accentGreen:"#00FF88", accentOrange:"#FF8C00",
  text:"#FFFFFF", textMuted:"#777777", textDim:"#444444",
};
const F = { display:"'Bebas Neue','Impact',sans-serif", body:"system-ui,-apple-system,sans-serif" };
const S = {
  input: { width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:13, fontFamily:F.body, outline:"none", boxSizing:"border-box" },
  label: { fontSize:10, fontFamily:F.body, color:C.textMuted, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:5, display:"block" },
  btn: (v="primary") => ({
    display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
    padding:"9px 18px", borderRadius:8, border:"none", cursor:"pointer",
    fontFamily:F.display, letterSpacing:"0.08em", fontSize:14, transition:"opacity 0.15s",
    ...(v==="primary"?{background:C.accent,color:"#000"}
      :v==="danger"?{background:C.accentRed,color:"#fff"}
      :v==="ghost"?{background:"transparent",color:C.text,border:`1px solid ${C.border}`}
      :v==="dim"?{background:"transparent",color:C.textMuted,border:`1px solid ${C.border}`}
      :v==="blue"?{background:C.accentBlue+"22",color:C.accentBlue,border:`1px solid ${C.accentBlue}44`}
      :v==="green"?{background:C.accentGreen+"22",color:C.accentGreen,border:`1px solid ${C.accentGreen}44`}
      :{}),
  }),
  pill: (color=C.accent) => ({
    display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:20,
    fontSize:10, fontFamily:F.body, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
    background:color+"20", color, border:`1px solid ${color}33`,
  }),
  card: { background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"16px 20px", marginBottom:10 },
};

const BLOCK_COLORS = { straight:C.accent, circuit:C.accentBlue, superset:C.accentGreen, emom:C.accentOrange };
const ALL_HABITS = [
  {id:"h1",name:"Morning Movement",icon:"🌅",target:"10 min"},
  {id:"h2",name:"Protein Goal",icon:"🥩",target:"150g"},
  {id:"h3",name:"Breathwork",icon:"🧘",target:"5 min"},
  {id:"h4",name:"Hydration",icon:"💧",target:"3L"},
  {id:"h5",name:"Sleep 7-9hrs",icon:"😴",target:"9pm"},
  {id:"h6",name:"Meal Prep",icon:"🥗",target:"Weekly"},
  {id:"h7",name:"No alcohol",icon:"🚫",target:"Daily"},
  {id:"h8",name:"Cold shower",icon:"🚿",target:"Daily"},
  {id:"h9",name:"Journaling",icon:"📓",target:"10 min"},
  {id:"h10",name:"Steps goal",icon:"👟",target:"8,000 steps"},
];
const REP_RANGES = [
  {label:"1-2 reps",min:1,max:2},
  {label:"3-4 reps",min:3,max:4},
  {label:"5-6 reps",min:5,max:6},
  {label:"6-8 reps",min:6,max:8},
  {label:"10-12 reps",min:10,max:12},
  {label:"12+ reps",min:12,max:999},
];

const fmtDate = ts => { if(!ts) return "–"; const d=ts?.toDate?ts.toDate():new Date(ts); return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"2-digit"}); };
const mkId = () => `${Date.now()}_${Math.random().toString(36).slice(2,6)}`;

// ─── Mini SVG line chart ───────────────────────────────────────────────────────
function LineChart({ data, color=C.accent, height=60, label="" }) {
  if(!data||data.length<2) return (
    <div style={{height,display:"flex",alignItems:"center",justifyContent:"center",color:C.textDim,fontSize:11,fontFamily:F.body}}>Not enough data</div>
  );
  const vals = data.map(d=>d.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max-min||1;
  const w=300, h=height, pad=6;
  const pts = data.map((d,i)=>{
    const x = pad + (i/(data.length-1))*(w-pad*2);
    const y = h-pad - ((d.value-min)/range)*(h-pad*2);
    return `${x},${y}`;
  });
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{overflow:"visible"}}>
        <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2} />
        {data.map((d,i)=>{
          const [x,y]=pts[i].split(",").map(Number);
          return <circle key={i} cx={x} cy={y} r={3} fill={color} />;
        })}
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
        <span style={{fontSize:9,fontFamily:F.body,color:C.textDim}}>{fmtDate(data[0]?.date)}</span>
        <span style={{fontSize:10,fontFamily:F.body,color:color,fontWeight:700}}>{label}</span>
        <span style={{fontSize:9,fontFamily:F.body,color:C.textDim}}>{fmtDate(data[data.length-1]?.date)}</span>
      </div>
    </div>
  );
}

// ─── Bar chart ────────────────────────────────────────────────────────────────
function BarChart({ data, color=C.accent, height=80 }) {
  if(!data||data.length===0) return null;
  const maxV = Math.max(...data.map(d=>d.value),1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:4,height,paddingTop:8}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <div style={{fontSize:9,fontFamily:F.body,color:color}}>{d.value>0?d.value:""}</div>
          <div style={{width:"100%",background:color,borderRadius:"3px 3px 0 0",height:`${(d.value/maxV)*60}px`,minHeight:d.value>0?4:0,transition:"height 0.4s"}} />
          <div style={{fontSize:8,fontFamily:F.body,color:C.textDim,textAlign:"center",lineHeight:1.1}}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRAM EDITOR — full inline edit of any published program
// ═══════════════════════════════════════════════════════════════════════════════
export function ProgramEditor({ program, clients, onBack, onSaved }) {
  const [prog, setProg] = useState(() => JSON.parse(JSON.stringify(program))); // deep clone
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [view,   setView]   = useState("overview"); // overview | day_{id} | calendar

  const updateProg = (field, val) => setProg(p => ({ ...p, [field]: val }));

  // ── Day helpers ──
  const updateDay = (dayId, field, val) => setProg(p => ({ ...p, days: p.days.map(d => d.id===dayId?{...d,[field]:val}:d) }));
  const addDay = () => setProg(p => ({ ...p, days: [...(p.days||[]), { id:mkId(), name:`Day ${(p.days?.length||0)+1}`, warmup:[], blocks:[{id:mkId(),name:"Block A",type:"straight",exercises:[]}], cooldown:{exercises:[],breathing:{pattern:"4-4-4-4",notes:""}} }] }));
  const removeDay = (dayId) => setProg(p => ({ ...p, days: p.days.filter(d=>d.id!==dayId) }));

  // ── Block helpers ──
  const updateBlock = (dayId, blkId, field, val) => setProg(p => ({
    ...p, days: p.days.map(d => d.id!==dayId?d:{...d, blocks:d.blocks.map(b=>b.id!==blkId?b:{...b,[field]:val})})
  }));
  const addBlock = (dayId) => setProg(p => ({
    ...p, days: p.days.map(d => d.id!==dayId?d:{...d, blocks:[...d.blocks,{id:mkId(),name:`Block ${String.fromCharCode(65+d.blocks.length)}`,type:"straight",exercises:[]}]})
  }));
  const removeBlock = (dayId, blkId) => setProg(p => ({
    ...p, days: p.days.map(d => d.id!==dayId?d:{...d,blocks:d.blocks.filter(b=>b.id!==blkId)})
  }));

  // ── Exercise helpers ──
  const updateEx = (dayId, blkId, exId, field, val) => setProg(p => ({
    ...p, days: p.days.map(d => d.id!==dayId?d:{...d, blocks:d.blocks.map(b=>b.id!==blkId?b:{...b, exercises:b.exercises.map(e=>e.id!==exId?e:{...e,[field]:val})})})
  }));
  const addEx = (dayId, blkId) => setProg(p => ({
    ...p, days: p.days.map(d => d.id!==dayId?d:{...d, blocks:d.blocks.map(b=>b.id!==blkId?b:{...b, exercises:[...b.exercises,{id:mkId(),name:"",sets:3,reps:"8-10",tempo:"",rpe:"",rest:"60s",startWeight:"",notes:""}]})})
  }));
  const removeEx = (dayId, blkId, exId) => setProg(p => ({
    ...p, days: p.days.map(d => d.id!==dayId?d:{...d, blocks:d.blocks.map(b=>b.id!==blkId?b:{...b, exercises:b.exercises.filter(e=>e.id!==exId)})})
  }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { id, ...data } = prog;
      await updateDoc(doc(db,"programs",program.id), { ...data, updatedAt: serverTimestamp() });
      // Re-assign to client if changed
      if(prog.assignedClientId !== program.assignedClientId) {
        if(program.assignedClientId) await updateDoc(doc(db,"clients",program.assignedClientId),{assignedProgramId:null,assignedProgramName:null});
        if(prog.assignedClientId)    await updateDoc(doc(db,"clients",prog.assignedClientId),{assignedProgramId:program.id,assignedProgramName:prog.name});
      }
      setSaved(true); setTimeout(()=>setSaved(false),3000);
      onSaved?.({ ...prog, id: program.id });
    } catch(e){ console.error(e); }
    setSaving(false);
  };

  const selectedDay = prog.days?.find(d=>d.id===view.replace("day_",""));
  const assignedClient = clients.find(c=>c.id===prog.assignedClientId);

  // ── Input helpers ──
  const inp = (val, onChange, ph="", style={}) => (
    <input value={val||""} onChange={e=>onChange(e.target.value)} placeholder={ph}
      style={{...S.input,padding:"6px 10px",fontSize:12,...style}} />
  );

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
        <div>
          <button onClick={onBack} style={{...S.btn("dim"),fontSize:12,padding:"6px 12px",marginBottom:10}}>← BACK</button>
          <input value={prog.name} onChange={e=>updateProg("name",e.target.value)}
            style={{fontSize:28,fontFamily:F.display,background:"transparent",border:"none",color:C.text,outline:"none",width:"100%",letterSpacing:"0.03em"}} />
          <div style={{display:"flex",gap:12,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:10,fontFamily:F.body,color:C.textMuted,fontWeight:700,letterSpacing:"0.12em"}}>WEEKS</span>
              <input type="number" value={prog.weeks||8} onChange={e=>updateProg("weeks",parseInt(e.target.value)||1)}
                style={{...S.input,width:60,padding:"4px 8px",fontSize:14,fontFamily:F.display,textAlign:"center"}} />
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:10,fontFamily:F.body,color:C.textMuted,fontWeight:700,letterSpacing:"0.12em"}}>ASSIGN TO</span>
              <select value={prog.assignedClientId||""} onChange={e=>updateProg("assignedClientId",e.target.value||null)}
                style={{...S.input,width:"auto",minWidth:160,padding:"4px 10px",fontSize:13,fontFamily:F.body}}>
                <option value="">— None —</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name||c.email}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8"}}>
          <button onClick={handleSave} disabled={saving}
            style={{...S.btn("primary"),fontSize:15,opacity:saving?0.6:1}}>
            {saving?"SAVING...":saved?"✓ SAVED":"SAVE CHANGES"}
          </button>
        </div>
      </div>

      {/* Day tabs */}
      <div style={{display:"flex",gap:6,marginBottom:20,overflowX:"auto",paddingBottom:4,borderBottom:`1px solid ${C.border}`,paddingBottom:12}}>
        <button onClick={()=>setView("overview")}
          style={{...S.btn(view==="overview"?"primary":"ghost"),fontSize:12,padding:"6px 14px",flexShrink:0}}>
          OVERVIEW
        </button>
        <button onClick={()=>setView("calendar")}
          style={{...S.btn(view==="calendar"?"blue":"ghost"),fontSize:12,padding:"6px 14px",flexShrink:0}}>
          📅 CALENDAR
        </button>
        {(prog.days||[]).map((day,i)=>(
          <button key={day.id} onClick={()=>setView(`day_${day.id}`)}
            style={{...S.btn(view===`day_${day.id}`?"primary":"ghost"),fontSize:12,padding:"6px 14px",flexShrink:0,whiteSpace:"nowrap"}}>
            D{i+1}: {day.name}
          </button>
        ))}
        <button onClick={addDay}
          style={{...S.btn("ghost"),fontSize:12,padding:"6px 14px",flexShrink:0,borderStyle:"dashed",color:C.textMuted}}>
          + DAY
        </button>
      </div>

      {/* Overview */}
      {view==="overview"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
            {(prog.days||[]).map((day,i)=>(
              <div key={day.id}
                onClick={()=>setView(`day_${day.id}`)}
                style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent+"66"}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{fontSize:10,fontFamily:F.body,color:C.textMuted,fontWeight:700,letterSpacing:"0.1em"}}>DAY {i+1}</div>
                <div style={{fontSize:20,fontFamily:F.display,marginTop:2}}>{day.name}</div>
                <div style={{fontSize:11,fontFamily:F.body,color:C.textMuted,marginTop:4}}>
                  {(day.blocks||[]).reduce((s,b)=>s+(b.exercises?.length||0),0)} exercises · {day.blocks?.length||0} blocks
                </div>
                {day.warmup?.length>0&&<div style={{fontSize:10,fontFamily:F.body,color:C.accentOrange,marginTop:3}}>🔥 Warm up included</div>}
                {day.cooldown?.breathing?.pattern&&<div style={{fontSize:10,fontFamily:F.body,color:C.accentBlue,marginTop:2}}>🧘 {day.cooldown.breathing.pattern}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar view */}
      {view==="calendar"&&(
        <ProgramCalendar program={prog} onUpdate={setProg} />
      )}

      {/* Day editor */}
      {selectedDay&&(
        <DayEditorInline
          day={selectedDay}
          dayIdx={(prog.days||[]).findIndex(d=>d.id===selectedDay.id)}
          onUpdate={(field,val)=>updateDay(selectedDay.id,field,val)}
          onRemove={()=>{ removeDay(selectedDay.id); setView("overview"); }}
          onUpdateBlock={(blkId,f,v)=>updateBlock(selectedDay.id,blkId,f,v)}
          onAddBlock={()=>addBlock(selectedDay.id)}
          onRemoveBlock={(blkId)=>removeBlock(selectedDay.id,blkId)}
          onUpdateEx={(blkId,exId,f,v)=>updateEx(selectedDay.id,blkId,exId,f,v)}
          onAddEx={(blkId)=>addEx(selectedDay.id,blkId)}
          onRemoveEx={(blkId,exId)=>removeEx(selectedDay.id,blkId,exId)}
        />
      )}
    </div>
  );
}

// ─── Day editor inline ────────────────────────────────────────────────────────
function DayEditorInline({ day, dayIdx, onUpdate, onRemove, onUpdateBlock, onAddBlock, onRemoveBlock, onUpdateEx, onAddEx, onRemoveEx }) {
  const inp = (val, onChange, ph="", type="text", style={}) => (
    <input type={type} value={val||""} onChange={e=>onChange(e.target.value)} placeholder={ph}
      style={{...S.input,padding:"6px 10px",fontSize:12,...style}} />
  );

  return (
    <div>
      {/* Day name + remove */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <div style={{fontSize:28,fontFamily:F.display,color:C.accent,minWidth:36}}>D{dayIdx+1}</div>
        <input value={day.name} onChange={e=>onUpdate("name",e.target.value)}
          style={{...S.input,flex:1,fontSize:16,fontFamily:F.display,letterSpacing:"0.05em"}} />
        <button onClick={onRemove} style={{...S.btn("danger"),fontSize:12,padding:"6px 12px"}}>REMOVE DAY</button>
      </div>

      {/* Warm up */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:14,fontFamily:F.display,color:C.accentOrange,marginBottom:10,letterSpacing:"0.05em"}}>🔥 WARM UP</div>
        {(day.warmup||[]).map((ex,i)=>(
          <div key={ex.id||i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            {inp(ex.name,v=>onUpdate("warmup",day.warmup.map((e,j)=>j===i?{...e,name:v}:e)),"Exercise")}
            {inp(ex.duration,v=>onUpdate("warmup",day.warmup.map((e,j)=>j===i?{...e,duration:v}:e)),"Duration",,"text",{flex:"0 0 140px"})}
            <button onClick={()=>onUpdate("warmup",day.warmup.filter((_,j)=>j!==i))}
              style={{background:"transparent",border:"none",color:C.accentRed,cursor:"pointer",fontSize:16,padding:"4px 8px",flexShrink:0}}>✕</button>
          </div>
        ))}
        <button onClick={()=>onUpdate("warmup",[...(day.warmup||[]),{id:mkId(),name:"",duration:""}])}
          style={{...S.btn("ghost"),fontSize:12,padding:"6px 12px"}}>+ ADD WARM UP</button>
      </div>

      {/* Blocks */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:14,fontFamily:F.display,color:C.accent,marginBottom:10,letterSpacing:"0.05em"}}>💪 TRAINING BLOCKS</div>
        {(day.blocks||[]).map((block,bi)=>{
          const ac=BLOCK_COLORS[block.type]||C.accent;
          return (
            <div key={block.id||bi} style={{border:`1px solid ${ac}30`,borderRadius:10,padding:"14px",marginBottom:14,background:C.card}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                <div style={{fontSize:24,fontFamily:F.display,color:ac,minWidth:24}}>{String.fromCharCode(65+bi)}</div>
                <input value={block.name} onChange={e=>onUpdateBlock(block.id,"name",e.target.value)}
                  style={{...S.input,width:160,padding:"6px 10px",fontSize:13}} />
                <select value={block.type} onChange={e=>onUpdateBlock(block.id,"type",e.target.value)}
                  style={{...S.input,width:"auto",minWidth:130,padding:"6px 10px",fontSize:12,fontFamily:F.body}}>
                  <option value="straight">Straight Sets</option>
                  <option value="superset">Superset</option>
                  <option value="circuit">Circuit</option>
                  <option value="emom">EMOM</option>
                </select>
                <button onClick={()=>onRemoveBlock(block.id)} style={{...S.btn("danger"),padding:"4px 10px",fontSize:11,marginLeft:"auto"}}>REMOVE</button>
              </div>
              {/* Exercise table */}
              <div style={{overflowX:"auto",marginBottom:10}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F.body,fontSize:12,minWidth:700}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid ${C.border}`}}>
                      {["#","EXERCISE","SETS","REPS","TEMPO","RPE","REST","START WT","NOTES",""].map(h=>(
                        <th key={h} style={{textAlign:"left",color:C.textMuted,fontWeight:700,letterSpacing:"0.08em",padding:"4px 5px",fontSize:9,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(block.exercises||[]).map((ex,ei)=>(
                      <tr key={ex.id||ei} style={{borderBottom:`1px solid ${C.border}44`}}>
                        <td style={{padding:"4px 5px",fontFamily:F.display,fontSize:14,color:ac,whiteSpace:"nowrap"}}>{String.fromCharCode(65+bi)}{ei+1}</td>
                        {[
                          {f:"name",ph:"Exercise name",w:160},
                          {f:"sets",ph:"3",w:46},
                          {f:"reps",ph:"8-10",w:76},
                          {f:"tempo",ph:"3010",w:62},
                          {f:"rpe",ph:"7",w:46},
                          {f:"rest",ph:"60s",w:56},
                          {f:"startWeight",ph:"lbs",w:62},
                          {f:"notes",ph:"Notes",w:120},
                        ].map(({f,ph,w})=>(
                          <td key={f} style={{padding:"3px 4px",minWidth:w}}>
                            <input value={ex[f]||""} onChange={e=>onUpdateEx(block.id,ex.id,f,e.target.value)} placeholder={ph}
                              style={{...S.input,padding:"5px 7px",fontSize:11}} />
                          </td>
                        ))}
                        <td style={{padding:"3px 4px"}}>
                          <button onClick={()=>onRemoveEx(block.id,ex.id)}
                            style={{background:"transparent",border:"none",color:C.accentRed,cursor:"pointer",fontSize:14,padding:"3px 5px"}}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={()=>onAddEx(block.id)} style={{...S.btn("ghost"),fontSize:12,padding:"5px 12px"}}>+ ADD EXERCISE</button>
            </div>
          );
        })}
        <button onClick={onAddBlock} style={{...S.btn("ghost"),width:"100%",fontSize:13,padding:"10px",borderStyle:"dashed"}}>+ ADD BLOCK</button>
      </div>

      {/* Cool down */}
      <div>
        <div style={{fontSize:14,fontFamily:F.display,color:C.accentBlue,marginBottom:10,letterSpacing:"0.05em"}}>🧘 COOL DOWN</div>
        {(day.cooldown?.exercises||[]).map((ex,i)=>(
          <div key={ex.id||i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            <input value={ex.name||""} onChange={e=>onUpdate("cooldown",{...day.cooldown,exercises:day.cooldown.exercises.map((e2,j)=>j===i?{...e2,name:e.target.value}:e2)})} placeholder="Stretch"
              style={{...S.input,flex:2,padding:"6px 10px",fontSize:12}} />
            <input value={ex.duration||""} onChange={e=>onUpdate("cooldown",{...day.cooldown,exercises:day.cooldown.exercises.map((e2,j)=>j===i?{...e2,duration:e.target.value}:e2)})} placeholder="Duration"
              style={{...S.input,flex:1,padding:"6px 10px",fontSize:12}} />
            <button onClick={()=>onUpdate("cooldown",{...day.cooldown,exercises:day.cooldown.exercises.filter((_,j)=>j!==i)})}
              style={{background:"transparent",border:"none",color:C.accentRed,cursor:"pointer",fontSize:16,padding:"4px 8px",flexShrink:0}}>✕</button>
          </div>
        ))}
        <button onClick={()=>onUpdate("cooldown",{...day.cooldown,exercises:[...(day.cooldown?.exercises||[]),{id:mkId(),name:"",duration:""}]})}
          style={{...S.btn("ghost"),fontSize:12,padding:"6px 12px",marginBottom:14}}>+ ADD EXERCISE</button>
        {/* Breathing */}
        <div style={{background:C.surface,border:`1px solid ${C.accentBlue}33`,borderRadius:10,padding:"14px"}}>
          <div style={{fontSize:13,fontFamily:F.display,color:C.accentBlue,marginBottom:8}}>BREATHING PATTERN</div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            {["INHALE","HOLD","EXHALE","HOLD"].map((lbl,i)=>{
              const parts=(day.cooldown?.breathing?.pattern||"4-4-4-4").split("-");
              return (
                <div key={i} style={{flex:1,textAlign:"center"}}>
                  <div style={{fontSize:9,fontFamily:F.body,color:C.textMuted,fontWeight:700,letterSpacing:"0.12em",marginBottom:4}}>{lbl}</div>
                  <input type="number" min={1} max={20} value={parts[i]||4}
                    onChange={e=>{const p=[...parts];p[i]=e.target.value;onUpdate("cooldown",{...day.cooldown,breathing:{...day.cooldown?.breathing,pattern:p.join("-")}});}}
                    style={{...S.input,textAlign:"center",fontSize:18,fontFamily:F.display,padding:"6px 4px"}} />
                </div>
              );
            })}
          </div>
          <input value={day.cooldown?.breathing?.notes||""} onChange={e=>onUpdate("cooldown",{...day.cooldown,breathing:{...day.cooldown?.breathing,notes:e.target.value}})} placeholder="Breathing notes..."
            style={{...S.input,fontSize:12}} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRAM CALENDAR — assign days to calendar dates, model repeating weeks
// ═══════════════════════════════════════════════════════════════════════════════
export function ProgramCalendar({ program, onUpdate }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year,  setYear]  = useState(today.getFullYear());
  const [calendar, setCalendar] = useState(() => program.calendar || {});
  // calendar: { "YYYY-MM-DD": dayId | "rest" }

  const days = program.days || [];
  const DAYS_OF_WEEK = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const getMonthGrid = () => {
    const first = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const grid = [];
    for(let i=0;i<first;i++) grid.push(null);
    for(let d=1;d<=daysInMonth;d++) grid.push(d);
    return grid;
  };

  const dateKey = (d) => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  const assignDay = (d, dayId) => {
    const key = dateKey(d);
    const updated = { ...calendar, [key]: dayId };
    setCalendar(updated);
    onUpdate(p => ({ ...p, calendar: updated }));
  };

  // Model a week pattern across all weeks in program duration
  const modelWeek = (startDay) => {
    // Find Monday of startDay's week
    const start = new Date(year, month, startDay);
    const mon = new Date(start);
    mon.setDate(start.getDate() - (start.getDay()===0?6:start.getDay()-1));

    // Build the 7-day pattern from this week
    const pattern = {};
    for(let i=0;i<7;i++){
      const d = new Date(mon); d.setDate(mon.getDate()+i);
      const k = d.toISOString().slice(0,10);
      if(calendar[k]) pattern[i] = calendar[k];
    }

    // Apply pattern for all weeks in program duration
    const updated = { ...calendar };
    const weeks = program.weeks || 8;
    for(let w=0;w<weeks;w++){
      for(let i=0;i<7;i++){
        if(pattern[i]){
          const d2 = new Date(mon); d2.setDate(mon.getDate() + w*7 + i);
          updated[d2.toISOString().slice(0,10)] = pattern[i];
        }
      }
    }
    setCalendar(updated);
    onUpdate(p => ({ ...p, calendar: updated }));
  };

  const grid = getMonthGrid();
  const dayColors = days.reduce((acc,d,i)=>{
    const colors=[C.accent,C.accentBlue,C.accentGreen,C.accentOrange,C.accentRed,"#CC44FF","#FF69B4"];
    acc[d.id]=colors[i%colors.length]; return acc;
  },{});

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <button onClick={()=>{ if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }}
          style={{...S.btn("ghost"),padding:"6px 12px",fontSize:14}}>←</button>
        <div style={{fontSize:22,fontFamily:F.display,letterSpacing:"0.05em"}}>
          {new Date(year,month).toLocaleDateString("en-US",{month:"long",year:"numeric"}).toUpperCase()}
        </div>
        <button onClick={()=>{ if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }}
          style={{...S.btn("ghost"),padding:"6px 12px",fontSize:14}}>→</button>
      </div>

      {/* Day legend */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        <span style={{...S.pill(C.textDim),"cursor":"default"}}>REST</span>
        {days.map(d=>(
          <span key={d.id} style={{...S.pill(dayColors[d.id]),"cursor":"default"}}>{d.name}</span>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:16}}>
        {DAYS_OF_WEEK.map(d=>(
          <div key={d} style={{textAlign:"center",fontSize:9,fontFamily:F.body,color:C.textMuted,fontWeight:700,padding:"4px 0",letterSpacing:"0.1em"}}>{d}</div>
        ))}
        {grid.map((d,i)=>{
          if(!d) return <div key={`e${i}`} />;
          const key = dateKey(d);
          const assigned = calendar[key];
          const assignedDay = days.find(day=>day.id===assigned);
          const color = assigned==="rest"?C.textDim:assignedDay?dayColors[assigned]:null;
          const isToday = new Date(year,month,d).toDateString()===new Date().toDateString();
          return (
            <div key={d} style={{position:"relative"}}>
              <select value={assigned||""} onChange={e=>assignDay(d,e.target.value||null)}
                style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}}>
                <option value="">–</option>
                <option value="rest">Rest</option>
                {days.map(day=><option key={day.id} value={day.id}>{day.name}</option>)}
              </select>
              <div style={{
                borderRadius:6, padding:"6px 2px", textAlign:"center", minHeight:44,
                background:color?color+"22":C.surface,
                border:`1px solid ${isToday?C.accent:color?color+"44":C.border}`,
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2
              }}>
                <div style={{fontSize:12,fontFamily:F.display,color:isToday?C.accent:C.text}}>{d}</div>
                {assignedDay&&<div style={{fontSize:8,fontFamily:F.body,color:color,fontWeight:700,letterSpacing:"0.08em",lineHeight:1.1,textAlign:"center"}}>{assignedDay.name.slice(0,8)}</div>}
                {assigned==="rest"&&<div style={{fontSize:9,color:C.textDim}}>REST</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Model week button */}
      <div style={{...S.card,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:14,fontFamily:F.display}}>MODEL THIS WEEK</div>
          <div style={{fontSize:11,fontFamily:F.body,color:C.textMuted}}>Repeat the current week's pattern across all {program.weeks||8} weeks</div>
        </div>
        <button onClick={()=>modelWeek(today.getDate())} style={{...S.btn("primary"),fontSize:13}}>APPLY TO ALL WEEKS</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT ANALYTICS — weekly/monthly/3mo graphs + progress photos + exercise data
// ═══════════════════════════════════════════════════════════════════════════════
export function ClientAnalytics({ client, workoutLogs, weightLog, userData }) {
  const [period, setPeriod] = useState("month"); // week | month | 3month
  const [selEx,  setSelEx]  = useState("");

  const uid = client?.userId;
  const clientLogs = workoutLogs.filter(l => l.userId === uid);

  // ── Date range ──
  const cutoff = useMemo(() => {
    const d = new Date();
    if(period==="week")    d.setDate(d.getDate()-7);
    if(period==="month")   d.setMonth(d.getMonth()-1);
    if(period==="3month")  d.setMonth(d.getMonth()-3);
    return d;
  }, [period]);

  const inRange = (ts) => {
    const d = ts?.toDate?ts.toDate():new Date(ts||0);
    return d >= cutoff;
  };

  const rangedLogs = clientLogs.filter(l => inRange(l.completedAt));

  // ── Weight chart data ──
  const weightData = (weightLog||[])
    .filter(e => inRange(e.loggedAt||e.updatedAt))
    .map(e => ({ date: e.loggedAt||e.updatedAt, value: parseFloat(e.weight)||0, photoUrls: e.photoUrls }))
    .filter(e => e.value > 0)
    .sort((a,b)=>{const da=a.date?.toDate?a.date.toDate():new Date(a.date||0),db=b.date?.toDate?b.date.toDate():new Date(b.date||0);return da-db;});

  // ── Workout frequency chart ──
  const freqData = useMemo(() => {
    if(period==="week") {
      const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      return days.map((label,i)=>{
        const count=rangedLogs.filter(l=>{const d=l.completedAt?.toDate?l.completedAt.toDate():new Date(l.completedAt||0); return(d.getDay()+6)%7===i;}).length;
        return {label,value:count};
      });
    }
    if(period==="month") {
      return ["W1","W2","W3","W4"].map((label,i)=>{
        const count=rangedLogs.filter(l=>{const d=l.completedAt?.toDate?l.completedAt.toDate():new Date(l.completedAt||0); const wk=Math.floor((d.getDate()-1)/7); return wk===i;}).length;
        return {label,value:count};
      });
    }
    return ["M1","M2","M3"].map((label,i)=>{
      const m=new Date(); m.setMonth(m.getMonth()-(2-i));
      const count=rangedLogs.filter(l=>{const d=l.completedAt?.toDate?l.completedAt.toDate():new Date(l.completedAt||0); return d.getMonth()===m.getMonth()&&d.getFullYear()===m.getFullYear();}).length;
      return {label,value:count};
    });
  },[rangedLogs,period]);

  // ── Exercise list from all logs ──
  const allExercises = [...new Set(clientLogs.flatMap(l=>l.exercises?.map(e=>e.name)||[]))];

  // ── Exercise progress data ──
  const exProgressData = useMemo(() => {
    if(!selEx) return [];
    return clientLogs
      .filter(l=>l.exercises?.some(e=>e.name===selEx))
      .map(l=>{
        const ex=l.exercises.find(e=>e.name===selEx);
        const sets=ex?.sets?.filter(s=>s.completed&&s.weight)||[];
        const best=sets.reduce((b,s)=>parseFloat(s.weight||0)>parseFloat(b?.weight||0)?s:b,null);
        return { date:l.completedAt, value:parseFloat(best?.weight)||0 };
      })
      .filter(d=>d.value>0&&inRange(d.date))
      .sort((a,b)=>{const da=a.date?.toDate?a.date.toDate():new Date(a.date||0),db=b.date?.toDate?b.date.toDate():new Date(b.date||0);return da-db;});
  },[selEx,clientLogs,cutoff]);

  // ── Rep range averages ──
  const repRangeData = useMemo(() => {
    if(!selEx) return [];
    return REP_RANGES.map(range=>{
      const sets=clientLogs.flatMap(l=>l.exercises?.filter(e=>e.name===selEx)||[])
        .flatMap(ex=>ex.sets?.filter(s=>{
          const r=parseInt(s.reps)||0;
          return s.completed && r>=range.min && r<=range.max && parseFloat(s.weight)>0;
        })||[]);
      if(sets.length===0) return null;
      const weights=sets.map(s=>parseFloat(s.weight)||0).filter(w=>w>0);
      const avg=weights.reduce((a,b)=>a+b,0)/weights.length;
      const top=Math.max(...weights);
      return { range:range.label, avg:Math.round(avg*10)/10, top, count:sets.length };
    }).filter(Boolean);
  },[selEx,clientLogs]);

  // Progress photos
  const progressPhotos = (weightLog||[]).filter(e=>e.photoUrls?.some(Boolean)).slice(0,6);

  const periodLabel = period==="week"?"LAST 7 DAYS":period==="month"?"LAST 30 DAYS":"LAST 3 MONTHS";

  return (
    <div>
      {/* Period selector */}
      <div style={{display:"flex",gap:8,marginBottom:24}}>
        {[["week","WEEK"],["month","MONTH"],["3month","3 MONTHS"]].map(([v,l])=>(
          <button key={v} onClick={()=>setPeriod(v)}
            style={{...S.btn(v===period?"primary":"ghost"),fontSize:13,padding:"8px 16px"}}>
            {l}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:24}}>
        {[
          {label:"WORKOUTS",value:rangedLogs.length,color:C.accent},
          {label:"AVG/WEEK",value:period==="week"?rangedLogs.length:period==="month"?Math.round(rangedLogs.length/4*10)/10:Math.round(rangedLogs.length/12*10)/10,color:C.accentBlue},
          {label:"CURRENT WT",value:weightLog?.[0]?.weight?`${weightLog[0].weight} lbs`:"–",color:C.accentGreen},
          {label:"WT CHANGE",value:(()=>{if(weightData.length<2)return"–";const diff=weightData[weightData.length-1].value-weightData[0].value;return`${diff>0?"+":""}${Math.round(diff*10)/10} lbs`;})(),color:C.accentOrange},
        ].map((s,i)=>(
          <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 12px",textAlign:"center"}}>
            <div style={{fontSize:9,fontFamily:F.body,color:C.textMuted,fontWeight:700,letterSpacing:"0.12em",marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:24,fontFamily:F.display,color:s.color,lineHeight:1}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Workout frequency chart */}
      <div style={{...S.card,marginBottom:16}}>
        <div style={{fontSize:14,fontFamily:F.display,marginBottom:12}}>WORKOUT FREQUENCY — {periodLabel}</div>
        <BarChart data={freqData} color={C.accent} height={80} />
      </div>

      {/* Weight chart */}
      {weightData.length>=2&&(
        <div style={{...S.card,marginBottom:16}}>
          <div style={{fontSize:14,fontFamily:F.display,marginBottom:12}}>BODYWEIGHT — {periodLabel}</div>
          <LineChart data={weightData} color={C.accentBlue} height={70}
            label={`${weightData[weightData.length-1]?.value} lbs`} />
        </div>
      )}

      {/* Progress photos */}
      {progressPhotos.length>0&&(
        <div style={{...S.card,marginBottom:16}}>
          <div style={{fontSize:14,fontFamily:F.display,marginBottom:12}}>PROGRESS PHOTOS</div>
          <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
            {progressPhotos.map((e,i)=>
              e.photoUrls?.filter(Boolean).map((url,j)=>(
                <div key={`${i}_${j}`} style={{flexShrink:0,textAlign:"center"}}>
                  <img src={url} alt="" style={{width:80,height:80,borderRadius:8,objectFit:"cover"}} />
                  <div style={{fontSize:9,fontFamily:F.body,color:C.textMuted,marginTop:3}}>{e.date}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Exercise progression */}
      <div style={{...S.card,marginBottom:16}}>
        <div style={{fontSize:14,fontFamily:F.display,marginBottom:12}}>EXERCISE PROGRESSION</div>
        <select value={selEx} onChange={e=>setSelEx(e.target.value)}
          style={{...S.input,marginBottom:14,fontFamily:F.body}}>
          <option value="">— Select exercise —</option>
          {allExercises.map(n=><option key={n} value={n}>{n}</option>)}
        </select>

        {selEx&&exProgressData.length>=2&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontFamily:F.body,color:C.textMuted,marginBottom:8}}>WEIGHT OVER TIME (top set per session)</div>
            <LineChart data={exProgressData} color={C.accent} height={80}
              label={`${exProgressData[exProgressData.length-1]?.value} lbs`} />
          </div>
        )}

        {selEx&&repRangeData.length>0&&(
          <div>
            <div style={{fontSize:11,fontFamily:F.body,color:C.textMuted,marginBottom:10}}>AVERAGE & TOP WEIGHT BY REP RANGE</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F.body,fontSize:12}}>
              <thead>
                <tr style={{borderBottom:`1px solid ${C.border}`}}>
                  {["REP RANGE","TOP WEIGHT","AVG WEIGHT","SETS LOGGED"].map(h=>(
                    <th key={h} style={{textAlign:"left",color:C.textMuted,fontWeight:700,letterSpacing:"0.08em",padding:"6px 8px",fontSize:10}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {repRangeData.map((row,i)=>(
                  <tr key={i} style={{borderTop:`1px solid ${C.border}55`}}>
                    <td style={{padding:"10px 8px",fontFamily:F.body,color:C.textMuted}}>{row.range}</td>
                    <td style={{padding:"10px 8px",fontFamily:F.display,fontSize:16,color:C.accent}}>{row.top} lbs</td>
                    <td style={{padding:"10px 8px",fontFamily:F.display,fontSize:16,color:C.accentBlue}}>{row.avg} lbs</td>
                    <td style={{padding:"10px 8px",color:C.textMuted}}>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selEx&&exProgressData.length===0&&repRangeData.length===0&&(
          <div style={{textAlign:"center",padding:"24px 0",color:C.textMuted,fontFamily:F.body,fontSize:13}}>No logged data for {selEx} in this period</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HABIT ASSIGNMENT — coach sends habits to specific client
// ═══════════════════════════════════════════════════════════════════════════════
export function HabitAssignment({ client, clientUserData, onClose }) {
  const uid = client?.userId;
  const currentHabits = (clientUserData?.[uid]?.habits||[]).map(h=>h.id);
  const [selected, setSelected] = useState(new Set(currentHabits));
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [note,     setNote]     = useState("");

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    if(next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleSave = async () => {
    if(!uid) return;
    setSaving(true);
    try {
      const habits = ALL_HABITS.filter(h=>selected.has(h.id)).map(h=>({...h,streak:0}));
      const coachNote = note ? { coachHabitNote: note, coachHabitNoteAt: new Date().toISOString() } : {};
      const { setDoc: sd, doc: d, serverTimestamp: st } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
      await sd(d(db,"users",uid),{ habits, ...coachNote, updatedAt: st() },{ merge:true });
      setSaved(true); setTimeout(()=>{ setSaved(false); onClose?.(); },1500);
    } catch(e){ console.error(e); }
    setSaving(false);
  };

  return (
    <div style={{background:C.card,border:`1px solid ${C.accent}44`,borderRadius:12,padding:"20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <div style={{fontSize:22,fontFamily:F.display}}>ASSIGN HABITS</div>
          <div style={{fontSize:11,fontFamily:F.body,color:C.textMuted}}>{client?.name||client?.email} · pick 1-2 to focus on</div>
        </div>
        {onClose&&<button onClick={onClose} style={{background:"transparent",border:"none",color:C.textDim,cursor:"pointer",fontSize:20}}>✕</button>}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
        {ALL_HABITS.map(h=>{
          const sel=selected.has(h.id);
          const disabled=!sel&&selected.size>=2;
          return (
            <div key={h.id} onClick={()=>!disabled&&toggle(h.id)}
              style={{background:sel?C.accent+"0A":C.surface,border:`1px solid ${sel?C.accent+"66":C.border}`,borderRadius:10,padding:"10px 14px",cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,display:"flex",alignItems:"center",gap:12,transition:"all 0.15s"}}>
              <span style={{fontSize:20}}>{h.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontFamily:F.display,color:sel?C.accent:C.text}}>{h.name}</div>
                <div style={{fontSize:11,fontFamily:F.body,color:C.textMuted}}>Target: {h.target}</div>
              </div>
              <div style={{width:22,height:22,borderRadius:5,border:`2px solid ${sel?C.accent:C.border}`,background:sel?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"#000",fontSize:13}}>{sel?"✓":""}</div>
            </div>
          );
        })}
      </div>

      <div style={{marginBottom:14}}>
        <label style={S.label}>COACH NOTE TO CLIENT (optional)</label>
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Focus on the breathing habit this week..."
          style={{...S.input}} />
      </div>

      <div style={{display:"flex",gap:10}}>
        {onClose&&<button onClick={onClose} style={{...S.btn("ghost"),flex:1}}>CANCEL</button>}
        <button onClick={handleSave} disabled={saving||!uid}
          style={{...S.btn("primary"),flex:2,opacity:(!uid||saving)?0.5:1}}>
          {saving?"SAVING...":saved?"✓ SENT!":"ASSIGN HABITS"}
        </button>
      </div>
      {!uid&&<div style={{fontSize:11,fontFamily:F.body,color:C.accentRed,marginTop:8,textAlign:"center"}}>Client app account not linked yet</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE GOAL ASSIGNMENT — coach sets exercise goals for client
// ═══════════════════════════════════════════════════════════════════════════════
export function PerfGoalAssignment({ client, workoutLogs, clientUserData, onClose }) {
  const uid = client?.userId;
  const existing = clientUserData?.[uid]?.perfGoals||[];
  const [goals, setGoals] = useState(existing.length>0 ? existing : [{ id:mkId(), exercise:"", goalWeight:"", deadline:"" }]);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  // Auto-populate exercises this client has logged
  const clientLogs = workoutLogs.filter(l=>l.userId===uid);
  const loggedExercises = [...new Set(clientLogs.flatMap(l=>l.exercises?.map(e=>e.name)||[]))];

  const upd = (id,f,v) => setGoals(prev=>prev.map(g=>g.id===id?{...g,[f]:v}:g));
  const add = () => setGoals(prev=>[...prev,{id:mkId(),exercise:"",goalWeight:"",deadline:""}]);
  const rm  = (id) => setGoals(prev=>prev.filter(g=>g.id!==id));

  const handleSave = async () => {
    if(!uid) return;
    setSaving(true);
    try {
      const { setDoc: sd, doc: d, serverTimestamp: st } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
      await sd(d(db,"users",uid),{ perfGoals: goals.filter(g=>g.exercise), updatedAt: st() },{ merge:true });
      setSaved(true); setTimeout(()=>{ setSaved(false); onClose?.(); },1500);
    } catch(e){ console.error(e); }
    setSaving(false);
  };

  return (
    <div style={{background:C.card,border:`1px solid ${C.accentOrange}44`,borderRadius:12,padding:"20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <div style={{fontSize:22,fontFamily:F.display}}>PERFORMANCE GOALS</div>
          <div style={{fontSize:11,fontFamily:F.body,color:C.textMuted}}>{client?.name||client?.email}</div>
        </div>
        {onClose&&<button onClick={onClose} style={{background:"transparent",border:"none",color:C.textDim,cursor:"pointer",fontSize:20}}>✕</button>}
      </div>

      {goals.map(g=>(
        <div key={g.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",marginBottom:10}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:8,alignItems:"end"}}>
            <div>
              <label style={S.label}>EXERCISE</label>
              <input value={g.exercise} onChange={e=>upd(g.id,"exercise",e.target.value)} placeholder="e.g. Bench Press"
                list={`ex-list-${g.id}`} style={{...S.input}} />
              <datalist id={`ex-list-${g.id}`}>
                {loggedExercises.map(e=><option key={e} value={e}/>)}
              </datalist>
            </div>
            <div>
              <label style={S.label}>GOAL (lbs)</label>
              <input type="number" value={g.goalWeight} onChange={e=>upd(g.id,"goalWeight",e.target.value)} placeholder="315"
                style={{...S.input}} />
            </div>
            <div>
              <label style={S.label}>DEADLINE</label>
              <input type="date" value={g.deadline} onChange={e=>upd(g.id,"deadline",e.target.value)}
                style={{...S.input}} />
            </div>
            <button onClick={()=>rm(g.id)} style={{...S.btn("danger"),padding:"8px 10px",fontSize:12,alignSelf:"flex-end"}}>✕</button>
          </div>
          {/* Show current best */}
          {g.exercise&&(()=>{
            const best=clientLogs.flatMap(l=>l.exercises?.filter(e=>e.name===g.exercise)||[])
              .flatMap(ex=>ex.sets?.filter(s=>s.completed&&s.weight)||[])
              .reduce((b,s)=>parseFloat(s.weight||0)>parseFloat(b?.weight||0)?s:b,null);
            const bestW=parseFloat(best?.weight)||0;
            const pct=g.goalWeight&&bestW?(Math.min((bestW/parseFloat(g.goalWeight))*100,100)):0;
            return bestW>0?(
              <div style={{marginTop:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,fontFamily:F.body,color:C.textMuted}}>Current best: <span style={{color:C.accent}}>{bestW} lbs</span></span>
                  {g.goalWeight&&<span style={{fontSize:11,fontFamily:F.body,color:C.textMuted}}>{Math.round(pct)}% of goal</span>}
                </div>
                {g.goalWeight&&(
                  <div style={{height:4,background:C.card,borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",background:pct>=100?C.accentGreen:C.accent,width:`${pct}%`,borderRadius:2,transition:"width 0.4s"}} />
                  </div>
                )}
              </div>
            ):null;
          })()}
        </div>
      ))}

      <button onClick={add} style={{...S.btn("ghost"),width:"100%",fontSize:13,padding:"9px",marginBottom:14,borderStyle:"dashed"}}>+ ADD GOAL</button>

      <div style={{display:"flex",gap:10}}>
        {onClose&&<button onClick={onClose} style={{...S.btn("ghost"),flex:1}}>CANCEL</button>}
        <button onClick={handleSave} disabled={saving||!uid}
          style={{...S.btn("primary"),flex:2,opacity:(!uid||saving)?0.5:1}}>
          {saving?"SAVING...":saved?"✓ SAVED!":"SAVE GOALS"}
        </button>
      </div>
      {!uid&&<div style={{fontSize:11,fontFamily:F.body,color:C.accentRed,marginTop:8,textAlign:"center"}}>Client app account not linked yet</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKOUT SUMMARY — pre-workout overview card for client (stored in Firebase)
// Coach writes the summary; client sees it before starting
// ═══════════════════════════════════════════════════════════════════════════════
export function WorkoutSummaryEditor({ program, clients, onClose }) {
  const [summaries, setSummaries] = useState({});
  const [saving, setSaving] = useState({});
  const [saved,  setSaved]  = useState({});

  useEffect(()=>{
    if(!program?.id) return;
    getDocs(collection(db,"workoutSummaries")).then(snap=>{
      const data={};
      snap.docs.forEach(d=>{ if(d.data().programId===program.id) data[d.data().dayId]=d.data().summary; });
      setSummaries(data);
    }).catch(()=>{});
  },[program?.id]);

  const saveSummary = async (dayId, text) => {
    setSaving(p=>({...p,[dayId]:true}));
    try {
      const docId = `${program.id}_${dayId}`;
      await setDoc(doc(db,"workoutSummaries",docId),{
        programId:program.id, dayId, summary:text, updatedAt:serverTimestamp()
      },{merge:true});
      setSaved(p=>({...p,[dayId]:true}));
      setTimeout(()=>setSaved(p=>({...p,[dayId]:false})),2000);
    } catch(e){ console.error(e); }
    setSaving(p=>({...p,[dayId]:false}));
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:22,fontFamily:F.display}}>WORKOUT SUMMARIES</div>
          <div style={{fontSize:11,fontFamily:F.body,color:C.textMuted}}>Clients see this before starting each session</div>
        </div>
        {onClose&&<button onClick={onClose} style={{...S.btn("dim"),fontSize:12,padding:"6px 12px"}}>DONE</button>}
      </div>

      {(program?.days||[]).map((day,i)=>(
        <div key={day.id} style={{...S.card,marginBottom:12}}>
          <div style={{fontSize:16,fontFamily:F.display,marginBottom:4}}>DAY {i+1} — {day.name}</div>
          <div style={{fontSize:11,fontFamily:F.body,color:C.textMuted,marginBottom:10}}>
            {(day.blocks||[]).reduce((s,b)=>s+(b.exercises?.length||0),0)} exercises
            {day.warmup?.length>0?" · warm up included":""}
            {day.cooldown?.breathing?.pattern?` · breathing ${day.cooldown.breathing.pattern}`:""}
          </div>
          <textarea
            value={summaries[day.id]||""}
            onChange={e=>setSummaries(p=>({...p,[day.id]:e.target.value}))}
            placeholder={`What's the focus today? e.g. "Today is lower body day. We're building strength in the squat pattern with progressive overload. Focus on depth and control. Rest 90s between sets."`}
            rows={3}
            style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:13,fontFamily:F.body,outline:"none",resize:"none",boxSizing:"border-box",marginBottom:10}}
          />
          <button onClick={()=>saveSummary(day.id,summaries[day.id]||"")}
            disabled={saving[day.id]}
            style={{...S.btn("primary"),fontSize:13,padding:"7px 16px",opacity:saving[day.id]?0.6:1}}>
            {saving[day.id]?"SAVING...":saved[day.id]?"✓ SAVED":"SAVE SUMMARY"}
          </button>
        </div>
      ))}
    </div>
  );
}
