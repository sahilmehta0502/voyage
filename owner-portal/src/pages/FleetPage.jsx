import React, { useState } from "react";
import { get, post, put } from "../utils/api";
import { StatCard, Badge, Loader, PageHeader, Modal, S, useData, statusBadgeType } from "../components/shared";

const TYPES = ["AC Sleeper","AC Seater","Non-AC"];
const STATUSES = ["active","maintenance","retired"];

export default function FleetPage() {
  const { data: buses, loading, reload } = useData(() => get("/api/buses"));
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ registration:"",model:"",total_seats:45,bus_type:"AC Sleeper",status:"active" });

  const active = (buses||[]).filter(b=>b.status==="active").length;
  const maint  = (buses||[]).filter(b=>b.status==="maintenance").length;

  const handleSave = async () => {
    if (editing) { await put(`/api/buses/${editing.id}`, form); }
    else         { await post("/api/buses", form); }
    setShowAdd(false); setEditing(null);
    setForm({ registration:"",model:"",total_seats:45,bus_type:"AC Sleeper",status:"active" });
    reload();
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({ registration:b.registration,model:b.model,total_seats:b.total_seats,bus_type:b.bus_type,status:b.status });
    setShowAdd(true);
  };

  if (loading) return <Loader text="Loading fleet…" />;

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:18 }}>
      <PageHeader title="Fleet Management" sub={`${(buses||[]).length} buses registered`}
        action={<button style={S.btn} onClick={()=>{setEditing(null);setShowAdd(true)}}>+ Add Bus</button>} />

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12 }}>
        <StatCard label="Total Buses"       value={(buses||[]).length} icon="🚌" color="#3b82f6" />
        <StatCard label="Active"            value={active}             icon="✅" color="#10b981" />
        <StatCard label="In Maintenance"    value={maint}              icon="🔧" color="#f59e0b" />
        <StatCard label="Total Seats"       value={(buses||[]).reduce((a,b)=>a+b.total_seats,0)} icon="💺" color="#8b5cf6" />
      </div>

      <div style={S.card}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
            <thead>
              <tr>{["Registration","Model","Type","Seats","Status","Mileage (km)","Last Service","Actions"]
                .map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {(buses||[]).map(b=>(
                <tr key={b.id} onMouseEnter={e=>e.currentTarget.style.background="#1a2035"}
                               onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{...S.td,fontFamily:"monospace",color:"#93c5fd"}}>{b.registration}</td>
                  <td style={S.td}>{b.model}</td>
                  <td style={S.td}><Badge value={b.bus_type} type="info" /></td>
                  <td style={S.td}>{b.total_seats}</td>
                  <td style={S.td}><Badge value={b.status} type={statusBadgeType(b.status)} /></td>
                  <td style={S.td}>{b.mileage_km?.toLocaleString()}</td>
                  <td style={{...S.td,color:"#64748b"}}>{b.last_service || "—"}</td>
                  <td style={S.td}>
                    <button style={S.btnSm} onClick={()=>openEdit(b)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <Modal title={editing?"Edit Bus":"Add New Bus"} onClose={()=>{setShowAdd(false);setEditing(null)}}>
          {[
            ["Registration",  "registration", "text"],
            ["Model",         "model",        "text"],
            ["Total Seats",   "total_seats",  "number"],
          ].map(([label, key, type]) => (
            <div key={key} style={{ marginBottom:12 }}>
              <label style={{ fontSize:11,color:"#94a3b8",display:"block",marginBottom:5 }}>{label}</label>
              <input type={type} style={S.input} value={form[key]}
                     onChange={e=>setForm(f=>({...f,[key]:type==="number"?+e.target.value:e.target.value}))} />
            </div>
          ))}
          {[["Bus Type","bus_type",TYPES],["Status","status",STATUSES]].map(([label,key,opts])=>(
            <div key={key} style={{ marginBottom:12 }}>
              <label style={{ fontSize:11,color:"#94a3b8",display:"block",marginBottom:5 }}>{label}</label>
              <select style={S.input} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}>
                {opts.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <button style={{...S.btn,width:"100%",marginTop:8}} onClick={handleSave}>
            {editing?"Save Changes":"Add Bus"}
          </button>
        </Modal>
      )}
    </div>
  );
}
