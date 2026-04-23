import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { get } from "../utils/api";
import { StatCard, Loader, PageHeader, S, useData } from "../components/shared";

const TT = { contentStyle:{background:"#1e2130",border:"1px solid #252d3d",color:"#f1f5f9",fontSize:12} };
const fmt = v => `₹${Number(v||0).toLocaleString("en-IN")}`;

export default function TurnoverPage() {
  const { data: busTV,   loading: bl } = useData(() => get("/api/analytics/turnover/bus"));
  const { data: routeTV, loading: rl } = useData(() => get("/api/analytics/turnover/route"));

  const handleExport = () => { window.location.href = "http://127.0.0.1:5000/api/analytics/export/turnover"; };

  const totalBusRev   = (busTV||[]).reduce((a,b)=>a+b.total_revenue,0);
  const totalRouteRev = (routeTV||[]).reduce((a,r)=>a+r.total_revenue,0);
  const topBus        = (busTV||[])[0];
  const topRoute      = (routeTV||[])[0];

  if (bl || rl) return <Loader text="Computing turnover…" />;

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:18 }}>
      <PageHeader title="Turnover Analysis"
        sub="Revenue breakdown per bus and per route"
        action={<button style={{...S.btn,background:"#0f6e56"}} onClick={handleExport}>⬇ Export Excel</button>} />

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12 }}>
        <StatCard label="Total Bus Revenue"   value={fmt(totalBusRev)}                    icon="🚌" color="#3b82f6" />
        <StatCard label="Top Bus"             value={topBus?.registration||"—"}            icon="🏆" color="#f59e0b" sub={fmt(topBus?.total_revenue)} />
        <StatCard label="Total Route Revenue" value={fmt(totalRouteRev)}                   icon="🗺️" color="#10b981" />
        <StatCard label="Top Route"           value={topRoute?.route_code||"—"}            icon="🥇" color="#8b5cf6" sub={fmt(topRoute?.total_revenue)} />
      </div>

      {/* Charts */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
        <div style={S.card}>
          <div style={{ fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:14 }}>Revenue by Bus</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={busTV||[]} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#252d3d" horizontal={false} />
              <XAxis type="number" tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={{fill:"#64748b",fontSize:10}} />
              <YAxis type="category" dataKey="registration" tick={{fill:"#64748b",fontSize:9}} width={80} />
              <Tooltip {...TT} formatter={v=>[fmt(v),"Revenue"]} />
              <Bar dataKey="total_revenue" radius={[0,4,4,0]}>
                {(busTV||[]).map((_,i)=><Cell key={i} fill={i===0?"#f59e0b":"#3b82f6"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={S.card}>
          <div style={{ fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:14 }}>Revenue by Route</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={routeTV||[]} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#252d3d" horizontal={false} />
              <XAxis type="number" tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={{fill:"#64748b",fontSize:10}} />
              <YAxis type="category" dataKey="route_code" tick={{fill:"#64748b",fontSize:9}} width={100} />
              <Tooltip {...TT} formatter={v=>[fmt(v),"Revenue"]} />
              <Bar dataKey="total_revenue" radius={[0,4,4,0]}>
                {(routeTV||[]).map((_,i)=><Cell key={i} fill={i===0?"#10b981":"#0f6e56"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-bus table */}
      <div style={S.card}>
        <div style={{ fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:12 }}>Turnover by Bus — detailed</div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
            <thead>
              <tr>{["Rank","Registration","Model","Type","Trips","Passengers","Total Revenue","Avg/Trip","Mileage"]
                .map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {(busTV||[]).map((b,i)=>(
                <tr key={b.bus_id} onMouseEnter={e=>e.currentTarget.style.background="#1a2035"}
                                   onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{...S.td,color:i===0?"#f59e0b":"#64748b",fontWeight:i===0?700:400}}>#{i+1}</td>
                  <td style={{...S.td,fontFamily:"monospace",color:"#93c5fd"}}>{b.registration}</td>
                  <td style={S.td}>{b.model}</td>
                  <td style={{...S.td,color:"#64748b"}}>{b.bus_type}</td>
                  <td style={S.td}>{b.total_trips}</td>
                  <td style={S.td}>{b.total_pax?.toLocaleString()}</td>
                  <td style={{...S.td,color:"#10b981",fontWeight:600}}>{fmt(b.total_revenue)}</td>
                  <td style={S.td}>{fmt(b.avg_revenue_per_trip)}</td>
                  <td style={{...S.td,color:"#64748b"}}>{b.mileage_km?.toLocaleString()} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-route table */}
      <div style={S.card}>
        <div style={{ fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:12 }}>Turnover by Route — detailed</div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
            <thead>
              <tr>{["Rank","Code","Origin → Destination","Distance","Trips","Passengers","Avg Load %","Total Revenue","Avg/Trip","Rev/km"]
                .map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {(routeTV||[]).map((r,i)=>(
                <tr key={r.route_id} onMouseEnter={e=>e.currentTarget.style.background="#1a2035"}
                                     onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{...S.td,color:i===0?"#10b981":"#64748b",fontWeight:i===0?700:400}}>#{i+1}</td>
                  <td style={{...S.td,fontFamily:"monospace",color:"#93c5fd"}}>{r.route_code}</td>
                  <td style={S.td}>{r.origin} → {r.destination}</td>
                  <td style={S.td}>{r.distance_km} km</td>
                  <td style={S.td}>{r.total_trips}</td>
                  <td style={S.td}>{r.total_pax?.toLocaleString()}</td>
                  <td style={S.td}>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <div style={{ width:50,height:4,background:"#252d3d",borderRadius:2,overflow:"hidden" }}>
                        <div style={{ width:`${r.avg_load_factor}%`,height:"100%",
                          background:r.avg_load_factor>=70?"#10b981":r.avg_load_factor>=40?"#f59e0b":"#ef4444" }} />
                      </div>
                      {r.avg_load_factor}%
                    </div>
                  </td>
                  <td style={{...S.td,color:"#10b981",fontWeight:600}}>{fmt(r.total_revenue)}</td>
                  <td style={S.td}>{fmt(r.avg_revenue_per_trip)}</td>
                  <td style={{...S.td,color:"#64748b"}}>₹{r.revenue_per_km}/km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
