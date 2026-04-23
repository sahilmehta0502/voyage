import React, { useMemo } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
         XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { get } from "../utils/api";
import { StatCard, Loader, PageHeader, S, useData } from "../components/shared";

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899"];
const TT = { contentStyle:{background:"#1e2130",border:"1px solid #252d3d",color:"#f1f5f9",fontSize:12} };

export default function KPIDashboard() {
  const { data: kpi, loading: kl } = useData(() => get("/api/analytics/dashboard"));
  const { data: trend }            = useData(() => get("/api/analytics/revenue-trend", { days: 30 }));
  const { data: busTV }            = useData(() => get("/api/analytics/turnover/bus"));
  const { data: routeTV }          = useData(() => get("/api/analytics/turnover/route"));

  const top5buses  = useMemo(() => (busTV  || []).slice(0, 5), [busTV]);
  const top5routes = useMemo(() => (routeTV|| []).slice(0, 5), [routeTV]);

  if (kl) return <Loader text="Loading KPIs…" />;

  const k = kpi || {};
  const fmt = v => `₹${Number(v||0).toLocaleString("en-IN")}`;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <PageHeader title="KPI Dashboard" sub="Live operational metrics — VoyageAI Travel Agency" />

      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
        <StatCard label="Total Revenue"       value={fmt(k.total_revenue)}      icon="💰" color="#10b981" sub="All-time" />
        <StatCard label="This Week Revenue"   value={fmt(k.revenue_this_week)}   icon="📈" color="#3b82f6" sub="Last 7 days" />
        <StatCard label="Avg Load Factor"     value={`${k.avg_load_factor ?? 0}%`} icon="🚌" color="#f59e0b" sub="Completed trips" />
        <StatCard label="OTP"                 value={`${k.otp_percent ?? 0}%`}   icon="⏱️" color="#10b981" sub="On-time performance" />
        <StatCard label="Crew Utilisation"    value={`${k.crew_utilisation ?? 0}%`} icon="👷" color="#8b5cf6" sub="On-duty now" />
        <StatCard label="Cancellation Rate"   value={`${k.cancellation_rate ?? 0}%`} icon="❌" color="#ef4444" sub="All bookings" />
        <StatCard label="Total Trips"         value={(k.total_trips||0).toLocaleString()} icon="🗓️" color="#3b82f6" />
        <StatCard label="Active Buses"        value={k.total_buses ?? 0}         icon="🚍" color="#10b981" />
      </div>

      {/* Revenue trend */}
      <div style={S.card}>
        <div style={{ fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:14 }}>Revenue trend — last 30 days</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trend || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252d3d" />
            <XAxis dataKey="date" tick={{ fill:"#64748b",fontSize:10 }} />
            <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} tick={{ fill:"#64748b",fontSize:10 }} />
            <Tooltip {...TT} formatter={v => [fmt(v),"Revenue"]} />
            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Turnover rows */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div style={S.card}>
          <div style={{ fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:14 }}>Top 5 buses — revenue</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={top5buses} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#252d3d" horizontal={false} />
              <XAxis type="number" tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={{fill:"#64748b",fontSize:10}} />
              <YAxis type="category" dataKey="registration" tick={{fill:"#64748b",fontSize:9}} width={70} />
              <Tooltip {...TT} formatter={v=>[fmt(v),"Revenue"]} />
              <Bar dataKey="total_revenue" fill="#3b82f6" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={S.card}>
          <div style={{ fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:14 }}>Top 5 routes — revenue</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={top5routes} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#252d3d" horizontal={false} />
              <XAxis type="number" tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={{fill:"#64748b",fontSize:10}} />
              <YAxis type="category" dataKey="route_code" tick={{fill:"#64748b",fontSize:9}} width={90} />
              <Tooltip {...TT} formatter={v=>[fmt(v),"Revenue"]} />
              <Bar dataKey="total_revenue" fill="#10b981" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KPI table */}
      <div style={S.card}>
        <div style={{ fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:14 }}>All KPIs at a glance</div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr>
                {["KPI","Value","Benchmark","Status"].map(h =>
                  <th key={h} style={S.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ["Total Revenue",        fmt(k.total_revenue),               "—",    "info"],
                ["Avg Load Factor",      `${k.avg_load_factor??0}%`,         "≥ 70%", k.avg_load_factor>=70?"success":"warning"],
                ["On-Time Performance",  `${k.otp_percent??0}%`,             "≥ 90%", k.otp_percent>=90?"success":"warning"],
                ["Crew Utilisation",     `${k.crew_utilisation??0}%`,        "≥ 60%", k.crew_utilisation>=60?"success":"info"],
                ["Cancellation Rate",    `${k.cancellation_rate??0}%`,       "≤ 5%",  k.cancellation_rate<=5?"success":"danger"],
                ["Total Trips",          (k.total_trips||0).toLocaleString(),"—",    "info"],
                ["Total Bookings",       (k.total_bookings||0).toLocaleString(),"—", "info"],
                ["Active Buses",         k.total_buses??0,                   "—",    "success"],
                ["Total Crew",           k.total_crew??0,                    "—",    "info"],
                ["Active Routes",        k.total_routes??0,                  "—",    "success"],
              ].map(([kpi,val,bench,type]) => (
                <tr key={kpi} onMouseEnter={e=>e.currentTarget.style.background="#1a2035"}
                              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={S.td}>{kpi}</td>
                  <td style={{ ...S.td, fontWeight:600, color:"#f1f5f9" }}>{val}</td>
                  <td style={{ ...S.td, color:"#64748b" }}>{bench}</td>
                  <td style={S.td}>
                    <span style={{ fontSize:10,padding:"2px 8px",borderRadius:4,fontWeight:600,
                      background: type==="success"?"#052e16":type==="danger"?"#2d1b1b":type==="warning"?"#1c1307":"#0c1f3e",
                      color:      type==="success"?"#4ade80":type==="danger"?"#fca5a5":type==="warning"?"#fcd34d":"#93c5fd" }}>
                      {type==="success"?"Good":type==="danger"?"Alert":type==="warning"?"Watch":"Info"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
