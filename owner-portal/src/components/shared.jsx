import React, { useState, useEffect } from "react";

export const S = {
  card:   { background:"#1e2130", border:"1px solid #252d3d", borderRadius:12, padding:"18px 22px" },
  metric: { background:"#1a1f2e", borderRadius:8, padding:"14px 16px" },
  th:     { padding:"9px 12px", textAlign:"left", fontSize:10, fontWeight:600, color:"#64748b",
             letterSpacing:"0.05em", textTransform:"uppercase", borderBottom:"1px solid #1e2130",
             background:"#141620" },
  td:     { padding:"8px 12px", borderBottom:"1px solid #1a2035", fontSize:12, color:"#e2e8f0" },
  input:  { background:"#1a1f2e", border:"1px solid #252d3d", borderRadius:8,
             color:"#e2e8f0", padding:"8px 12px", fontSize:12, outline:"none", width:"100%" },
  btn:    { background:"#2563eb", border:"none", color:"#fff", borderRadius:8,
             padding:"8px 18px", cursor:"pointer", fontSize:12, fontWeight:600 },
  btnSm:  { background:"#1d2d5e", border:"none", color:"#93c5fd", borderRadius:6,
             padding:"4px 10px", cursor:"pointer", fontSize:11 },
};

export function StatCard({ label, value, sub, color="#3b82f6", icon }) {
  return (
    <div style={{ ...S.metric, borderLeft:`3px solid ${color}` }}>
      <div style={{ fontSize:10,color:"#64748b",marginBottom:6,display:"flex",alignItems:"center",gap:6 }}>
        {icon && <span style={{ fontSize:14 }}>{icon}</span>}
        {label}
      </div>
      <div style={{ fontSize:26,fontWeight:700,color:"#f1f5f9",lineHeight:1 }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize:11,color:color,marginTop:4 }}>{sub}</div>}
    </div>
  );
}

export function Badge({ value, type="info" }) {
  const colors = {
    success:  { bg:"#052e16", color:"#4ade80" },
    danger:   { bg:"#2d1b1b", color:"#fca5a5" },
    warning:  { bg:"#1c1307", color:"#fcd34d" },
    info:     { bg:"#0c1f3e", color:"#93c5fd" },
    gray:     { bg:"#1a1a1a", color:"#94a3b8" },
  };
  const c = colors[type] || colors.info;
  return <span style={{ ...c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:4,display:"inline-block" }}>{value}</span>;
}

export function Loader({ text="Loading…" }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:40,color:"#64748b" }}>
      <div style={{ width:32,height:32,borderRadius:"50%",border:"3px solid #252d3d",
                    borderTop:"3px solid #3b82f6",animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ fontSize:12 }}>{text}</span>
    </div>
  );
}

export function PageHeader({ title, sub, action }) {
  return (
    <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20 }}>
      <div>
        <h1 style={{ fontSize:22,fontWeight:700,color:"#f1f5f9" }}>{title}</h1>
        {sub && <p style={{ fontSize:13,color:"#64748b",marginTop:4 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:1000,
                  display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ background:"#1e2130",border:"1px solid #252d3d",borderRadius:14,
                    padding:24,width:500,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
          <span style={{ fontSize:16,fontWeight:600,color:"#f1f5f9" }}>{title}</span>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function useData(fetchFn, deps=[]) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const load = async () => {
    setLoading(true); setError(null);
    try { setData(await fetchFn()); }
    catch(e) { setError(e.message); }
    finally  { setLoading(false); }
  };
  useEffect(() => { load(); }, deps);
  return { data, loading, error, reload: load };
}

export function statusBadgeType(status) {
  const m = { active:"success",completed:"success",confirmed:"success",available:"success",
              cancelled:"danger",retired:"danger",maintenance:"warning",resting:"warning",
              off:"gray",scheduled:"info","in_progress":"info",boarding:"info",delayed:"warning",
              on_duty:"warning","no_show":"danger" };
  return m[status] || "gray";
}
