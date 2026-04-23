import React, { useState } from "react";
import KPIDashboard  from "./pages/KPIDashboard";
import FleetPage     from "./pages/FleetPage";
import RoutesPage    from "./pages/RoutesPage";
import TripsPage     from "./pages/TripsPage";
import CrewPage      from "./pages/CrewPage";
import BookingsPage  from "./pages/BookingsPage";
import TurnoverPage  from "./pages/TurnoverPage";
import "./index.css";

const NAV = [
  { id:"dashboard", label:"KPI Dashboard",   icon:"📊" },
  { id:"fleet",     label:"Fleet",           icon:"🚌" },
  { id:"routes",    label:"Routes",          icon:"🗺️" },
  { id:"trips",     label:"Trips",           icon:"🗓️" },
  { id:"crew",      label:"Crew",            icon:"👷" },
  { id:"bookings",  label:"Bookings",        icon:"🎫" },
  { id:"turnover",  label:"Turnover",        icon:"💰" },
];

const PAGES = { dashboard:KPIDashboard, fleet:FleetPage, routes:RoutesPage,
                trips:TripsPage, crew:CrewPage, bookings:BookingsPage, turnover:TurnoverPage };

export default function App() {
  const [page, setPage] = useState("dashboard");
  const Page = PAGES[page] || KPIDashboard;
  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#0f1117" }}>
      <nav style={{ width:220, background:"#141620", borderRight:"1px solid #1e2130",
                    display:"flex", flexDirection:"column", padding:"20px 0", flexShrink:0 }}>
        <div style={{ padding:"0 16px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ width:36,height:36,borderRadius:9,background:"#2563eb",
                           display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>🚌</span>
            <div>
              <div style={{ fontSize:13,fontWeight:700,color:"#f1f5f9" }}>VoyageAI</div>
              <div style={{ fontSize:10,color:"#475569" }}>Owner Portal</div>
            </div>
          </div>
        </div>
        {NAV.map(({ id, label, icon }) => (
          <button key={id} onClick={() => setPage(id)} style={{
            display:"flex",alignItems:"center",gap:10,padding:"9px 16px",margin:"0 8px",
            borderRadius:8,border:"none",cursor:"pointer",textAlign:"left",fontSize:13,
            background: page===id ? "#1d2d5e" : "transparent",
            color: page===id ? "#93c5fd" : "#64748b",
            fontWeight: page===id ? 600 : 400,
          }}>
            <span style={{ fontSize:15 }}>{icon}</span>{label}
          </button>
        ))}
        <div style={{ marginTop:"auto",padding:"16px",fontSize:10,color:"#334155" }}>
          NMIMS × LTIMindTree<br/>M.Tech AI — Sahil Mehta
        </div>
      </nav>
      <main style={{ flex:1,padding:"28px 32px",overflowY:"auto",color:"#e2e8f0" }}>
        <Page />
      </main>
    </div>
  );
}
