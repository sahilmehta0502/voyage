import React, { useState } from "react";
import { get, post, put } from "../utils/api";
import { StatCard, Badge, Loader, PageHeader, Modal, S, useData, statusBadgeType } from "../components/shared";

const ROLES    = ["Driver","Co-Driver","Conductor","Attendant","Guard"];
const STATUSES = ["available","on_duty","resting","off"];
const BASES    = ["Mumbai","Pune","Delhi","Bangalore","Chennai","Hyderabad","Ahmedabad","Jaipur","Kolkata"];

export default function CrewPage() {
  const { data: crew, loading, reload } = useData(() => get("/api/crew"));
  const [roleFilter, setRole]  = useState("All");
  const [statFilter, setStat]  = useState("All");
  const [showForm, setShowForm]= useState(false);
  const [editing, setEditing]  = useState(null);
  const [form, setForm] = useState({ employee_id:"",first_name:"",last_name:"",role:"Driver",
    phone:"",email:"",base_location:"Mumbai",license_no:"",status:"available" });

  const roles = ["All",...ROLES];
  const stats = ["All",...STATUSES];
  const filtered = (crew||[]).filter(c=>
    (roleFilter==="All"||c.role===roleFilter) && (statFilter==="All"||c.status===statFilter));

  const roleCounts = ROLES.reduce((a,r)=>{ a[r]=(crew||[]).filter(c=>c.role===r).length; return a; },{});

  const handleSave = async () => {
    if (editing) await put(`/api/crew/${editing.id}`, form);
    else         await post("/api/crew", form);
    setShowForm(false); setEditing(null); reload();
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ employee_id:c.employee_id, first_name:c.first_name, last_name:c.last_name,
              role:c.role, phone:c.phone, email:c.email||"", base_location:c.base_location,
              license_no:c.license_no||"", status:c.status });
    setShowForm(true);
  };

  const handleExport = () => { window.location.href = "http://127.0.0.1:5000/api/analytics/export/crew"; };

  if (loading) return <Loader text="Loading crew…" />;

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:18 }}>
      <PageHeader title="Crew Management" sub={`${(crew||[]).length} crew members · rest rule: 4 hrs after 10 hr duty`}
        action={
          <div style={{ display:"flex",gap:8 }}>
            <button style={{...S.btn,background:"#0f6e56"}} onClick={handleExport}>⬇ Export Excel</button>
            <button style={S.btn} onClick={()=>{setEditing(null);setShowForm(true)}}>+ Add Crew</button>
          </div>
        } />

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10 }}>
        {ROLES.map(r=>(
          <StatCard key={r} label={r} value={roleCounts[r]||0}
            icon={r==="Driver"?"🚗":r==="Conductor"?"🎫":r==="Attendant"?"🛎":r==="Guard"?"🔒":"🚘"}
            color="#3b82f6" />
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
        <div style={{ display:"flex",gap:4 }}>
          {roles.map(r=>(
            <button key={r} onClick={()=>setRole(r)} style={{
              fontSize:11,padding:"4px 10px",borderRadius:6,cursor:"pointer",border:"none",
              background:roleFilter===r?"#2563eb":"#1e2130",color:roleFilter===r?"#fff":"#64748b"
            }}>{r}</button>
          ))}
        </div>
        <div style={{ display:"flex",gap:4 }}>
          {stats.map(s=>(
            <button key={s} onClick={()=>setStat(s)} style={{
              fontSize:11,padding:"4px 10px",borderRadius:6,cursor:"pointer",border:"none",
              background:statFilter===s?"#0f6e56":"#1e2130",color:statFilter===s?"#fff":"#64748b"
            }}>{s}</button>
          ))}
        </div>
        <span style={{ fontSize:12,color:"#64748b",alignSelf:"center" }}>
          Showing {filtered.length} of {(crew||[]).length}
        </span>
      </div>

      <div style={S.card}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
            <thead>
              <tr>{["Emp ID","Name","Role","Phone","Base","Status","Trips","Hours","Last Duty End","Actions"]
                .map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(c=>(
                <tr key={c.id} onMouseEnter={e=>e.currentTarget.style.background="#1a2035"}
                               onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{...S.td,fontFamily:"monospace",fontSize:10,color:"#fcd34d"}}>{c.employee_id}</td>
                  <td style={S.td}>
                    <div style={{ fontWeight:600 }}>{c.full_name}</div>
                    <div style={{ fontSize:10,color:"#64748b" }}>{c.license_no||""}</div>
                  </td>
                  <td style={S.td}><Badge value={c.role} type="info" /></td>
                  <td style={{...S.td,color:"#64748b"}}>{c.phone}</td>
                  <td style={S.td}>{c.base_location}</td>
                  <td style={S.td}><Badge value={c.status} type={statusBadgeType(c.status)} /></td>
                  <td style={S.td}>{c.total_trips}</td>
                  <td style={S.td}>{c.total_hours} hrs</td>
                  <td style={{...S.td,fontSize:10,color:"#64748b",whiteSpace:"nowrap"}}>
                    {c.last_duty_end ? new Date(c.last_duty_end).toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"}) : "—"}
                  </td>
                  <td style={S.td}><button style={S.btnSm} onClick={()=>openEdit(c)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <Modal title={editing?"Edit Crew Member":"Add Crew Member"} onClose={()=>{setShowForm(false);setEditing(null)}}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            {[["Employee ID","employee_id"],["First Name","first_name"],["Last Name","last_name"],
              ["Phone","phone"],["Email","email"],["License No","license_no"]].map(([l,k])=>(
              <div key={k}>
                <label style={{ fontSize:11,color:"#94a3b8",display:"block",marginBottom:4 }}>{l}</label>
                <input style={S.input} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />
              </div>
            ))}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginTop:12 }}>
            {[["Role","role",ROLES],["Base","base_location",BASES],["Status","status",STATUSES]].map(([l,k,opts])=>(
              <div key={k}>
                <label style={{ fontSize:11,color:"#94a3b8",display:"block",marginBottom:4 }}>{l}</label>
                <select style={S.input} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}>
                  {opts.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button style={{...S.btn,width:"100%",marginTop:16}} onClick={handleSave}>
            {editing?"Save Changes":"Add Member"}
          </button>
        </Modal>
      )}
    </div>
  );
}
