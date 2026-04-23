import React, { useState } from "react";
import { get, post } from "../utils/api";
import { StatCard, Badge, Loader, PageHeader, Modal, S, useData, statusBadgeType } from "../components/shared";

function fmt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"});
}

export default function TripsPage() {
  const { data: trips,  loading, reload } = useData(() => get("/api/trips"));
  const { data: routes }                  = useData(() => get("/api/routes"));
  const { data: buses  }                  = useData(() => get("/api/buses"));
  const [filter, setFilter]  = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg]        = useState(null);
  const [form, setForm]      = useState({ route_id:"", bus_id:"", departure_time:"", auto_assign_crew:true });

  const counts = (trips||[]).reduce((a,t)=>{ a[t.status]=(a[t.status]||0)+1; return a; },{});
  const filtered = filter==="all" ? (trips||[]) : (trips||[]).filter(t=>t.status===filter);

  const handleSchedule = async () => {
    setMsg(null);
    try {
      const res = await post("/api/trips", { ...form, route_id:+form.route_id, bus_id:+form.bus_id });
      if (res.success) { setMsg({type:"ok",text:`Trip ${res.trip_code} scheduled!`}); setShowForm(false); reload(); }
      else              setMsg({type:"err",text:res.error||"Failed"});
    } catch(e) { setMsg({type:"err",text:e.message}); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this trip?")) return;
    await post(`/api/trips/${id}/cancel`,{reason:"Owner cancelled"});
    reload();
  };

  if (loading) return <Loader text="Loading trips…" />;

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:18 }}>
      <PageHeader title="Trip Scheduling" sub={`${(trips||[]).length} trips total`}
        action={<button style={S.btn} onClick={()=>setShowForm(true)}>+ Schedule Trip</button>} />

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10 }}>
        <StatCard label="Scheduled"   value={counts.scheduled||0}    icon="📅" color="#3b82f6" />
        <StatCard label="Boarding"    value={counts.boarding||0}      icon="🚪" color="#f59e0b" />
        <StatCard label="In Progress" value={counts.in_progress||0}   icon="🚌" color="#10b981" />
        <StatCard label="Completed"   value={counts.completed||0}     icon="✅" color="#10b981" />
        <StatCard label="Cancelled"   value={counts.cancelled||0}     icon="❌" color="#ef4444" />
      </div>

      {msg && (
        <div style={{ padding:"10px 14px",borderRadius:8,fontSize:12,
          background:msg.type==="ok"?"#052e16":"#2d1b1b",
          color:msg.type==="ok"?"#4ade80":"#fca5a5",
          border:`1px solid ${msg.type==="ok"?"#14532d":"#7f1d1d"}` }}>
          {msg.text}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:"flex",gap:6 }}>
        {["all","scheduled","in_progress","completed","cancelled"].map(s=>(
          <button key={s} onClick={()=>setFilter(s)} style={{
            fontSize:11,padding:"5px 12px",borderRadius:6,cursor:"pointer",border:"none",
            background:filter===s?"#2563eb":"#1e2130",color:filter===s?"#fff":"#64748b",
          }}>{s.replace("_"," ")}</button>
        ))}
      </div>

      <div style={S.card}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
            <thead>
              <tr>{["Trip Code","Route","Bus","Departure","Arrival","Seats","Load %","Revenue","Status","Actions"]
                .map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(t=>(
                <tr key={t.id} onMouseEnter={e=>e.currentTarget.style.background="#1a2035"}
                               onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{...S.td,fontFamily:"monospace",fontSize:10,color:"#93c5fd"}}>{t.trip_code}</td>
                  <td style={S.td}><div style={{fontSize:11}}>{t.origin}</div><div style={{fontSize:10,color:"#64748b"}}>{t.destination}</div></td>
                  <td style={{...S.td,color:"#fcd34d",fontSize:11}}>{t.bus_registration||"—"}</td>
                  <td style={{...S.td,whiteSpace:"nowrap"}}>{fmt(t.departure_time)}</td>
                  <td style={{...S.td,whiteSpace:"nowrap",color:"#64748b"}}>{fmt(t.arrival_time)}</td>
                  <td style={S.td}>{t.seats_booked}/{t.seats_total}</td>
                  <td style={S.td}>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <div style={{ flex:1,height:4,background:"#252d3d",borderRadius:2,overflow:"hidden" }}>
                        <div style={{ width:`${t.load_factor}%`,height:"100%",
                          background:t.load_factor>=70?"#10b981":t.load_factor>=40?"#f59e0b":"#ef4444",borderRadius:2 }} />
                      </div>
                      <span>{t.load_factor}%</span>
                    </div>
                  </td>
                  <td style={{...S.td,color:"#10b981"}}>₹{(t.total_revenue||0).toLocaleString()}</td>
                  <td style={S.td}><Badge value={t.status} type={statusBadgeType(t.status)} /></td>
                  <td style={S.td}>
                    {t.status==="scheduled" && (
                      <button style={{...S.btnSm,background:"#2d1b1b",color:"#fca5a5"}}
                              onClick={()=>handleCancel(t.id)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <Modal title="Schedule New Trip" onClose={()=>setShowForm(false)}>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11,color:"#94a3b8",display:"block",marginBottom:5 }}>Route</label>
            <select style={S.input} value={form.route_id} onChange={e=>setForm(f=>({...f,route_id:e.target.value}))}>
              <option value="">— Select route —</option>
              {(routes||[]).map(r=><option key={r.id} value={r.id}>{r.route_code} — {r.origin} → {r.destination} ({r.distance_km} km)</option>)}
            </select>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11,color:"#94a3b8",display:"block",marginBottom:5 }}>Bus</label>
            <select style={S.input} value={form.bus_id} onChange={e=>setForm(f=>({...f,bus_id:e.target.value}))}>
              <option value="">— Select bus —</option>
              {(buses||[]).filter(b=>b.status==="active").map(b=><option key={b.id} value={b.id}>{b.registration} — {b.model} ({b.total_seats} seats)</option>)}
            </select>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11,color:"#94a3b8",display:"block",marginBottom:5 }}>Departure Date & Time</label>
            <input type="datetime-local" style={S.input} value={form.departure_time}
                   onChange={e=>setForm(f=>({...f,departure_time:e.target.value}))} />
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16 }}>
            <input type="checkbox" id="autocrw" checked={form.auto_assign_crew}
                   onChange={e=>setForm(f=>({...f,auto_assign_crew:e.target.checked}))} />
            <label htmlFor="autocrw" style={{ fontSize:12,color:"#94a3b8" }}>Auto-assign crew (recommended)</label>
          </div>
          {msg && <div style={{ fontSize:12,color:msg.type==="ok"?"#4ade80":"#fca5a5",marginBottom:12 }}>{msg.text}</div>}
          <button style={{...S.btn,width:"100%"}} onClick={handleSchedule}>Schedule Trip</button>
        </Modal>
      )}
    </div>
  );
}
