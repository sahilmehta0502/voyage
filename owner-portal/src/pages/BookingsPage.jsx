import React, { useState } from "react";
import { get, post } from "../utils/api";
import { StatCard, Badge, Loader, PageHeader, S, useData, statusBadgeType } from "../components/shared";

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"});
}

export default function BookingsPage() {
  const { data: bookings, loading, reload } = useData(() => get("/api/bookings"));
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const counts = (bookings||[]).reduce((a,b)=>{ a[b.status]=(a[b.status]||0)+1; return a; },{});
  const totalRev = (bookings||[]).filter(b=>b.status!=="cancelled")
                   .reduce((a,b)=>a+b.total_fare,0);

  const filtered = (bookings||[]).filter(b => {
    const q = search.toLowerCase();
    const matchS = filter==="all" || b.status===filter;
    const matchQ = !q || b.booking_ref.toLowerCase().includes(q) ||
                   b.passenger_name.toLowerCase().includes(q) ||
                   (b.origin||"").toLowerCase().includes(q) ||
                   (b.destination||"").toLowerCase().includes(q);
    return matchS && matchQ;
  });

  const handleCancel = async (ref) => {
    if (!window.confirm(`Cancel booking ${ref}?`)) return;
    await post(`/api/bookings/${ref}/cancel`);
    reload();
  };

  const handleExport = () => { window.location.href = "http://127.0.0.1:5000/api/analytics/export/bookings"; };

  if (loading) return <Loader text="Loading bookings…" />;

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:18 }}>
      <PageHeader title="Bookings" sub={`${(bookings||[]).length} total bookings`}
        action={<button style={{...S.btn,background:"#0f6e56"}} onClick={handleExport}>⬇ Export Excel</button>} />

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10 }}>
        <StatCard label="Confirmed"     value={counts.confirmed||0}  icon="✅" color="#10b981" />
        <StatCard label="Completed"     value={counts.completed||0}  icon="🏁" color="#3b82f6" />
        <StatCard label="Cancelled"     value={counts.cancelled||0}  icon="❌" color="#ef4444" />
        <StatCard label="Total Revenue" value={`₹${totalRev.toLocaleString("en-IN",{maximumFractionDigits:0})}`} icon="💰" color="#10b981" />
      </div>

      {/* Filters */}
      <div style={{ display:"flex",gap:8,flexWrap:"wrap",alignItems:"center" }}>
        {["all","confirmed","completed","cancelled"].map(s=>(
          <button key={s} onClick={()=>setFilter(s)} style={{
            fontSize:11,padding:"4px 10px",borderRadius:6,cursor:"pointer",border:"none",
            background:filter===s?"#2563eb":"#1e2130",color:filter===s?"#fff":"#64748b"
          }}>{s}</button>
        ))}
        <input style={{...S.input,width:220}} placeholder="Search ref / name / route…"
               value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      <div style={S.card}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
            <thead>
              <tr>{["Booking Ref","Passenger","Route","Departure","Seats","Adults","Children","Fare","Status","Booked At","Actions"]
                .map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.slice(0,100).map(b=>(
                <tr key={b.id} onMouseEnter={e=>e.currentTarget.style.background="#1a2035"}
                               onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{...S.td,fontFamily:"monospace",color:"#93c5fd",fontSize:10}}>{b.booking_ref}</td>
                  <td style={S.td}>
                    <div>{b.passenger_name}</div>
                    <div style={{ fontSize:10,color:"#64748b" }}>{b.passenger_phone}</div>
                  </td>
                  <td style={S.td}>
                    <div style={{ fontSize:11 }}>{b.origin}</div>
                    <div style={{ fontSize:10,color:"#64748b" }}>{b.destination}</div>
                  </td>
                  <td style={{...S.td,whiteSpace:"nowrap"}}>{fmt(b.departure_time)}</td>
                  <td style={{...S.td,fontFamily:"monospace"}}>{b.seat_numbers}</td>
                  <td style={S.td}>{b.num_adults}</td>
                  <td style={S.td}>{b.num_children}</td>
                  <td style={{...S.td,color:"#10b981",fontWeight:600}}>₹{b.total_fare?.toLocaleString()}</td>
                  <td style={S.td}><Badge value={b.status} type={statusBadgeType(b.status)} /></td>
                  <td style={{...S.td,color:"#64748b",fontSize:10,whiteSpace:"nowrap"}}>{fmt(b.booked_at)}</td>
                  <td style={S.td}>
                    {b.status==="confirmed" && (
                      <button style={{...S.btnSm,background:"#2d1b1b",color:"#fca5a5"}}
                              onClick={()=>handleCancel(b.booking_ref)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 100 && (
            <div style={{ padding:"8px 12px",fontSize:12,color:"#64748b" }}>
              Showing first 100 of {filtered.length} results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
