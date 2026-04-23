import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { get } from "../utils/api";
import { Badge, Loader, PageHeader, S, useData } from "../components/shared";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png" });

export default function RoutesPage() {
  const { data: routes, loading } = useData(() => get("/api/routes"));
  const [selected, setSelected]  = useState(null);

  if (loading) return <Loader text="Loading routes…" />;

  const route = selected ? (routes||[]).find(r=>r.id===selected) : null;
  const mapCenter = route?.stops?.length
    ? [route.stops[0].latitude||12.97, route.stops[0].longitude||77.57]
    : [20.5937, 78.9629];

  const polyline = route?.stops?.map(s=>[s.latitude||0,s.longitude||0]).filter(p=>p[0]&&p[1]) || [];

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:18 }}>
      <PageHeader title="Route Management" sub={`${(routes||[]).length} active routes (min 500 km · min 8 stops)`} />

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Route list */}
        <div style={S.card}>
          <div style={{ fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:12 }}>All Routes</div>
          {(routes||[]).map(r=>(
            <div key={r.id}
              onClick={()=>setSelected(r.id===selected?null:r.id)}
              style={{ padding:"10px 12px",marginBottom:6,borderRadius:8,cursor:"pointer",
                background: selected===r.id ? "#1d2d5e" : "#141620",
                border: `1px solid ${selected===r.id?"#2563eb":"#1e2130"}` }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:11,fontWeight:700,color:"#93c5fd",fontFamily:"monospace" }}>{r.route_code}</span>
                <Badge value={`${r.distance_km} km`} type="info" />
              </div>
              <div style={{ fontSize:12,color:"#e2e8f0",marginTop:4 }}>
                {r.origin} → {r.destination}
              </div>
              <div style={{ fontSize:11,color:"#64748b",marginTop:3,display:"flex",gap:12 }}>
                <span>⏱ {r.duration_hrs} hrs</span>
                <span>📍 {r.stops?.length || 0} stops</span>
                <span>₹ {r.base_fare?.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Map + stops */}
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div style={{ ...S.card, padding:0, overflow:"hidden", height:300, borderRadius:12 }}>
            <MapContainer center={mapCenter} zoom={6} style={{ height:"100%",width:"100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors' />
              {polyline.length > 1 && <Polyline positions={polyline} color="#3b82f6" weight={3} />}
              {route?.stops?.map((s,i)=>(
                s.latitude && s.longitude ? (
                  <Marker key={i} position={[s.latitude,s.longitude]}>
                    <Popup>{s.stop_name}<br/>{s.city}</Popup>
                  </Marker>
                ) : null
              ))}
            </MapContainer>
          </div>

          {route && (
            <div style={S.card}>
              <div style={{ fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:10 }}>
                Stops — {route.route_code}
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:11 }}>
                  <thead>
                    <tr>{["#","Stop","City","Dist from Origin","ETA"].map(h=>
                      <th key={h} style={{...S.th,fontSize:9}}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {route.stops?.map(s=>(
                      <tr key={s.sequence}>
                        <td style={{...S.td,fontSize:11,color:"#64748b"}}>{s.sequence+1}</td>
                        <td style={{...S.td,fontSize:11}}>{s.stop_name}</td>
                        <td style={{...S.td,fontSize:11,color:"#64748b"}}>{s.city}</td>
                        <td style={{...S.td,fontSize:11}}>{s.distance_from_origin_km} km</td>
                        <td style={{...S.td,fontSize:11,color:"#64748b"}}>+{s.arrival_offset_min} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!route && (
            <div style={{ ...S.card, textAlign:"center", color:"#475569", fontSize:13, padding:40 }}>
              Select a route to see its stops and map
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
