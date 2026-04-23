import React, { useState, useEffect, createContext, useContext } from "react";
import { get, post } from "./utils/api";

// ── Auth context ──────────────────────────────────────────────────────
const AuthCtx = createContext(null);
function useAuth() { return useContext(AuthCtx); }

// ── Styles ────────────────────────────────────────────────────────────
const C = {
  primary: "#2563eb", pDark: "#1d4ed8", teal: "#0f6e56",
  white: "#fff", bg: "#f8fafc", cardBg: "#fff",
  text: "#1e293b", muted: "#64748b", border: "#e2e8f0",
  success: "#059669", danger: "#dc2626", warn: "#d97706",
};

const btn = (bg=C.primary,color="#fff") => ({
  background:bg, color, border:"none", borderRadius:10, padding:"12px 24px",
  cursor:"pointer", fontSize:14, fontWeight:600, transition:"opacity .15s",
});
const inp = { background:"#f1f5f9", border:`1px solid ${C.border}`, borderRadius:10,
              color:C.text, padding:"12px 14px", fontSize:14, outline:"none", width:"100%" };
const card = { background:C.cardBg, borderRadius:16, border:`1px solid ${C.border}`,
               padding:"24px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" };
const badge = (bg,col) => ({ background:bg, color:col, fontSize:11, fontWeight:700,
  padding:"3px 10px", borderRadius:20, display:"inline-block" });

function fmt(iso,mode="short") {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN",
    mode==="date"?{dateStyle:"medium"}:{dateStyle:"medium",timeStyle:"short"});
}

// ── Top nav ────────────────────────────────────────────────────────────
function Nav({ page, setPage }) {
  const { user, setUser } = useAuth();
  return (
    <nav style={{ background:C.primary, color:"#fff", padding:"0 32px",
                  display:"flex", alignItems:"center", height:60, gap:24, position:"sticky", top:0, zIndex:100 }}>
      <span onClick={()=>setPage("home")} style={{ fontSize:20, fontWeight:800, cursor:"pointer", letterSpacing:-0.5 }}>
        🚌 VoyageAI
      </span>
      <div style={{ flex:1 }} />
      {["home","search","mybookings"].map(p=>(
        <button key={p} onClick={()=>setPage(p)} style={{
          background:"none", border:"none", color:"#fff", cursor:"pointer", fontSize:14,
          fontWeight: page===p ? 700 : 400, opacity: page===p ? 1 : 0.75,
          borderBottom: page===p ? "2px solid #fff" : "2px solid transparent", padding:"8px 0",
        }}>
          {p==="home"?"Home":p==="search"?"Search":"My Bookings"}
        </button>
      ))}
      {user
        ? <span style={{ fontSize:13, opacity:.85 }}>
            👤 {user.full_name}
            <button onClick={()=>setUser(null)} style={{ ...btn("#1d4ed8"),padding:"4px 10px",fontSize:12,marginLeft:8 }}>
              Logout
            </button>
          </span>
        : <button onClick={()=>setPage("login")} style={{ ...btn("rgba(255,255,255,.2)"),padding:"7px 16px" }}>
            Login / Register
          </button>
      }
    </nav>
  );
}

// ── HOME PAGE ──────────────────────────────────────────────────────────
function HomePage({ setPage, setSearchParams }) {
  const [origin, setOrigin] = useState("");
  const [dest,   setDest]   = useState("");
  const [date,   setDate]   = useState("");

  const handleSearch = () => {
    setSearchParams({ origin, destination: dest, date });
    setPage("search");
  };

  return (
    <div>
      {/* Hero */}
      <div style={{ background:`linear-gradient(135deg,${C.primary},${C.teal})`,
                    color:"#fff", padding:"80px 32px", textAlign:"center" }}>
        <h1 style={{ fontSize:42, fontWeight:800, marginBottom:12 }}>Your Journey Starts Here</h1>
        <p style={{ fontSize:18, opacity:.9, marginBottom:40 }}>
          Book premium intercity bus travel across India — 500+ km routes, AC Sleeper &amp; Seater
        </p>

        {/* Search bar */}
        <div style={{ background:"#fff", borderRadius:16, padding:20, maxWidth:700, margin:"0 auto",
                      display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:12, alignItems:"end" }}>
          <div>
            <div style={{ fontSize:11,color:C.muted,marginBottom:6,textAlign:"left",fontWeight:600 }}>FROM</div>
            <input style={{ ...inp, background:"#f8fafc" }} placeholder="e.g. Mumbai"
                   value={origin} onChange={e=>setOrigin(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11,color:C.muted,marginBottom:6,textAlign:"left",fontWeight:600 }}>TO</div>
            <input style={{ ...inp, background:"#f8fafc" }} placeholder="e.g. Bangalore"
                   value={dest} onChange={e=>setDest(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11,color:C.muted,marginBottom:6,textAlign:"left",fontWeight:600 }}>DATE</div>
            <input type="date" style={{ ...inp, background:"#f8fafc" }}
                   value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <button style={{ ...btn(C.primary), height:46, whiteSpace:"nowrap", borderRadius:10 }}
                  onClick={handleSearch}>
            Search Buses
          </button>
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth:900, margin:"60px auto", padding:"0 32px" }}>
        <h2 style={{ fontSize:26, fontWeight:700, textAlign:"center", marginBottom:40, color:C.text }}>
          Why choose VoyageAI?
        </h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:20 }}>
          {[
            ["🛏", "AC Sleeper",        "Fully reclining sleeper seats for overnight journeys"],
            ["👷", "Trained Crew",      "3–8 crew members per trip based on route distance"],
            ["📍", "8+ Stops",          "Convenient intermediate stops across every route"],
            ["🎫", "Instant E-Ticket",  "Book and get your e-ticket in under 60 seconds"],
            ["❌", "Easy Cancellation", "Cancel anytime before departure for a full refund"],
            ["🗺️", "500+ km Routes",    "All routes minimum 500 km — true intercity travel"],
          ].map(([icon,title,desc])=>(
            <div key={title} style={{ ...card, textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:10 }}>{icon}</div>
              <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:6 }}>{title}</div>
              <div style={{ fontSize:13, color:C.muted, lineHeight:1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular routes */}
      <div style={{ background:"#f1f5f9", padding:"50px 32px" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <h2 style={{ fontSize:22, fontWeight:700, marginBottom:24, color:C.text }}>Popular routes</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:14 }}>
            {[
              ["Mumbai","Bangalore","₹1,200","984 km"],
              ["Hyderabad","Goa","₹950","658 km"],
              ["Mumbai","Goa","₹900","594 km"],
              ["Delhi","Jaipur","₹650","282 km"],
              ["Chennai","Bangalore","₹700","346 km"],
              ["Delhi","Agra","₹550","233 km"],
            ].map(([from,to,fare,dist])=>(
              <div key={from+to} style={{ ...card, cursor:"pointer" }}
                   onClick={()=>{ setSearchParams({origin:from,destination:to,date:""}); setPage("search"); }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{from} → {to}</div>
                    <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{dist}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:18, fontWeight:800, color:C.primary }}>from {fare}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SEARCH PAGE ────────────────────────────────────────────────────────
function SearchPage({ searchParams, setPage, setSelectedTrip }) {
  const [trips, setTrips]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState(searchParams || {});

  const doSearch = async () => {
    setLoading(true);
    try {
      const res = await get("/api/trips/search", params);
      setTrips(res);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (params.origin || params.destination) doSearch(); }, []);

  const durationStr = (dep, arr) => {
    const m = (new Date(arr)-new Date(dep))/60000;
    return `${Math.floor(m/60)}h ${m%60}m`;
  };

  return (
    <div style={{ maxWidth:900, margin:"0 auto", padding:"32px" }}>
      {/* Search bar */}
      <div style={{ ...card, marginBottom:24 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:12, alignItems:"end" }}>
          {[["FROM","origin","e.g. Mumbai"],["TO","destination","e.g. Goa"]].map(([l,k,ph])=>(
            <div key={k}>
              <div style={{ fontSize:11,color:C.muted,marginBottom:5,fontWeight:600 }}>{l}</div>
              <input style={inp} placeholder={ph} value={params[k]||""}
                     onChange={e=>setParams(p=>({...p,[k]:e.target.value}))} />
            </div>
          ))}
          <div>
            <div style={{ fontSize:11,color:C.muted,marginBottom:5,fontWeight:600 }}>DATE</div>
            <input type="date" style={inp} value={params.date||""}
                   onChange={e=>setParams(p=>({...p,date:e.target.value}))} />
          </div>
          <button style={{ ...btn(C.primary), height:46, borderRadius:10 }} onClick={doSearch}>Search</button>
        </div>
      </div>

      {loading && <div style={{ textAlign:"center",padding:60,color:C.muted,fontSize:15 }}>Searching buses…</div>}

      {trips !== null && !loading && (
        <>
          <div style={{ fontSize:15,fontWeight:600,color:C.text,marginBottom:14 }}>
            {trips.length === 0 ? "No buses found for this route / date." : `${trips.length} buses found`}
          </div>
          {trips.map(t=>(
            <div key={t.id} style={{ ...card, marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:800, color:C.text, marginBottom:4 }}>
                    {t.origin} → {t.destination}
                  </div>
                  <div style={{ fontSize:13, color:C.muted, marginBottom:8 }}>
                    {fmt(t.departure_time)} &nbsp;→&nbsp; {fmt(t.arrival_time)}
                    &nbsp;·&nbsp; {durationStr(t.departure_time,t.arrival_time)}
                    &nbsp;·&nbsp; {t.distance_km} km
                  </div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <span style={badge("#eff6ff","#1d4ed8")}>{t.bus_registration||"Bus"}</span>
                    <span style={badge("#f0fdf4","#065f46")}>{t.seats_available} seats left</span>
                    <span style={badge("#fefce8","#854d0e")}>{t.crew?.length||0} crew assigned</span>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:28, fontWeight:800, color:C.primary }}>₹{t.fare_adult}</div>
                  <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>per adult</div>
                  {t.seats_available > 0
                    ? <button style={{ ...btn(C.primary), padding:"10px 20px" }}
                              onClick={()=>{ setSelectedTrip(t); setPage("seat"); }}>
                        Select Seats
                      </button>
                    : <span style={badge("#fee2e2","#991b1b")}>Fully Booked</span>
                  }
                </div>
              </div>

              {/* Stops preview */}
              <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}` }}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:8, fontWeight:600 }}>STOPS</div>
                <div style={{ display:"flex", gap:0, overflowX:"auto", paddingBottom:4 }}>
                  {(t.stops||[]).map((s,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
                      <div style={{ textAlign:"center", minWidth:70 }}>
                        <div style={{ width:8,height:8,borderRadius:"50%",
                          background:i===0||i===(t.stops.length-1)?C.primary:C.border,
                          margin:"0 auto 4px" }} />
                        <div style={{ fontSize:10,color:i===0||i===(t.stops.length-1)?C.text:C.muted,fontWeight:i===0||i===(t.stops.length-1)?600:400 }}>
                          {s.city||s.stop_name}
                        </div>
                      </div>
                      {i < (t.stops||[]).length-1 && (
                        <div style={{ width:30,height:1,background:C.border,flexShrink:0 }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── SEAT PICKER ────────────────────────────────────────────────────────
function SeatPage({ trip, setPage, setBookingRef }) {
  const { user } = useAuth();
  const [seatMap,  setSeatMap]  = useState(null);
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({ passenger_name:user?.full_name||"", passenger_email:user?.email||"",
                                      passenger_phone:user?.phone||"", num_adults:1, num_children:0 });
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState(null);

  useEffect(() => {
    get(`/api/trips/${trip.id}/seats`).then(setSeatMap);
  }, [trip.id]);

  const toggleSeat = (n, avail) => {
    if (!avail) return;
    setSelected(s => s.includes(n) ? s.filter(x=>x!==n) : [...s, n]);
  };

  const handleBook = async () => {
    if (selected.length === 0) { setError("Please select at least one seat."); return; }
    setLoading(true); setError(null);
    try {
      const res = await post("/api/bookings", {
        trip_id: trip.id, seat_numbers: selected,
        ...form, num_adults:+form.num_adults, num_children:+form.num_children,
        passenger_id: user?.id || null, payment_method: "online",
      });
      if (res.success) { setBookingRef(res.booking_ref); setPage("ticket"); }
      else setError(res.error || "Booking failed.");
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fare = selected.length > 0
    ? form.num_adults * trip.fare_adult + form.num_children * trip.fare_child
    : 0;

  return (
    <div style={{ maxWidth:800, margin:"0 auto", padding:"32px" }}>
      <button onClick={()=>setPage("search")} style={{ ...btn("#f1f5f9",C.text), marginBottom:20, padding:"8px 16px", fontSize:13 }}>
        ← Back to search
      </button>

      <div style={{ ...card, marginBottom:20 }}>
        <div style={{ fontSize:18,fontWeight:700,color:C.text }}>{trip.origin} → {trip.destination}</div>
        <div style={{ fontSize:13,color:C.muted,marginTop:4 }}>
          {fmt(trip.departure_time)} · {trip.distance_km} km · Adult fare: ₹{trip.fare_adult}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:20 }}>
        {/* Seat grid */}
        <div style={card}>
          <div style={{ fontSize:14,fontWeight:700,color:C.text,marginBottom:16 }}>Select your seats</div>
          <div style={{ display:"flex",gap:16,marginBottom:14,fontSize:12 }}>
            {[["available","#e0f2fe","#0369a1"],["selected","#dbeafe","#1d4ed8"],["booked","#fee2e2","#991b1b"]]
              .map(([l,bg,col])=>(
              <span key={l} style={{ display:"flex",alignItems:"center",gap:5 }}>
                <span style={{ width:14,height:14,borderRadius:3,background:bg,border:`1px solid ${col}`,display:"inline-block" }} />
                {l}
              </span>
            ))}
          </div>
          {seatMap ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {seatMap.seat_map?.map(s=>(
                <button key={s.number} onClick={()=>toggleSeat(s.number,s.available)} style={{
                  padding:"8px 4px", borderRadius:6, border:"1px solid",
                  cursor: s.available ? "pointer" : "not-allowed",
                  fontSize:12, fontWeight:600,
                  background: !s.available?"#fee2e2":selected.includes(s.number)?"#dbeafe":"#f0f9ff",
                  color: !s.available?"#991b1b":selected.includes(s.number)?"#1d4ed8":"#0369a1",
                  borderColor: !s.available?"#fca5a5":selected.includes(s.number)?"#3b82f6":"#bae6fd",
                }}>
                  {s.number}
                </button>
              ))}
            </div>
          ) : <div style={{ color:C.muted }}>Loading seat map…</div>}
        </div>

        {/* Booking form */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={card}>
            <div style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:14 }}>Passenger Details</div>
            {[["Name","passenger_name","text"],["Email","passenger_email","email"],["Phone","passenger_phone","tel"]].map(([l,k,t])=>(
              <div key={k} style={{ marginBottom:10 }}>
                <label style={{ fontSize:11,color:C.muted,display:"block",marginBottom:4 }}>{l}</label>
                <input type={t} style={inp} value={form[k]}
                       onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />
              </div>
            ))}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              {[["Adults","num_adults"],["Children","num_children"]].map(([l,k])=>(
                <div key={k}>
                  <label style={{ fontSize:11,color:C.muted,display:"block",marginBottom:4 }}>{l}</label>
                  <input type="number" min="0" max="10" style={inp} value={form[k]}
                         onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:10 }}>Fare Summary</div>
            <div style={{ fontSize:13,color:C.muted,marginBottom:6 }}>Selected: {selected.join(", ")||"—"}</div>
            <div style={{ fontSize:13,color:C.muted,marginBottom:6 }}>Adults: {form.num_adults} × ₹{trip.fare_adult}</div>
            {form.num_children>0 && <div style={{ fontSize:13,color:C.muted,marginBottom:6 }}>Children: {form.num_children} × ₹{trip.fare_child}</div>}
            <div style={{ fontSize:22,fontWeight:800,color:C.primary,marginTop:10 }}>₹{fare.toLocaleString()}</div>
          </div>

          {error && <div style={{ ...card,background:"#fee2e2",color:"#991b1b",fontSize:13,padding:12 }}>{error}</div>}

          <button style={{ ...btn(C.primary), padding:"14px", fontSize:15 }}
                  onClick={handleBook} disabled={loading}>
            {loading ? "Booking…" : "Confirm & Pay"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── E-TICKET ───────────────────────────────────────────────────────────
function TicketPage({ bookingRef, setPage }) {
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    get(`/api/bookings/${bookingRef}/ticket`).then(setTicket);
  }, [bookingRef]);

  if (!ticket) return <div style={{ textAlign:"center",padding:80,color:C.muted }}>Loading ticket…</div>;

  return (
    <div style={{ maxWidth:600, margin:"40px auto", padding:"0 24px" }}>
      <div style={{ textAlign:"center",marginBottom:30 }}>
        <div style={{ fontSize:48,marginBottom:8 }}>🎫</div>
        <h2 style={{ fontSize:26,fontWeight:800,color:C.success }}>Booking Confirmed!</h2>
        <p style={{ color:C.muted,fontSize:14 }}>Your e-ticket is ready.</p>
      </div>

      <div style={{ ...card, border:`2px solid ${C.primary}` }}>
        {/* Header */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
                      background:C.primary,color:"#fff",padding:"16px 20px",margin:"-24px -24px 20px",borderRadius:"14px 14px 0 0" }}>
          <div>
            <div style={{ fontSize:18,fontWeight:800 }}>🚌 VoyageAI</div>
            <div style={{ fontSize:12,opacity:.85 }}>E-Ticket</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:13,opacity:.85 }}>Booking Ref</div>
            <div style={{ fontSize:20,fontWeight:800 }}>{ticket.booking_ref}</div>
          </div>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:16,marginBottom:20,alignItems:"center" }}>
          <div>
            <div style={{ fontSize:11,color:C.muted,fontWeight:600 }}>FROM</div>
            <div style={{ fontSize:22,fontWeight:800,color:C.text }}>{ticket.origin}</div>
            <div style={{ fontSize:13,color:C.muted }}>{fmt(ticket.departure_time)}</div>
          </div>
          <div style={{ fontSize:24,color:C.border }}>→</div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11,color:C.muted,fontWeight:600 }}>TO</div>
            <div style={{ fontSize:22,fontWeight:800,color:C.text }}>{ticket.destination}</div>
          </div>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20 }}>
          {[
            ["Passenger", ticket.passenger_name],
            ["Seats",     ticket.seat_numbers],
            ["Adults",    ticket.num_adults],
            ["Children",  ticket.num_children],
            ["Total Fare","₹"+ticket.total_fare?.toLocaleString()],
            ["Payment",   ticket.payment_method],
          ].map(([l,v])=>(
            <div key={l} style={{ background:"#f8fafc",borderRadius:8,padding:"10px 12px" }}>
              <div style={{ fontSize:10,color:C.muted,fontWeight:600 }}>{l}</div>
              <div style={{ fontSize:14,fontWeight:600,color:C.text }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign:"center",padding:"14px",background:"#f0fdf4",borderRadius:10,
                      fontSize:14,color:C.success,fontWeight:600 }}>
          ✅ Status: {ticket.status?.toUpperCase()}
        </div>
      </div>

      <div style={{ display:"flex",gap:12,marginTop:20 }}>
        <button style={{ ...btn("#f1f5f9",C.text),flex:1 }} onClick={()=>setPage("search")}>Book Another</button>
        <button style={{ ...btn(C.primary),flex:1 }} onClick={()=>setPage("mybookings")}>My Bookings</button>
      </div>
    </div>
  );
}

// ── MY BOOKINGS ────────────────────────────────────────────────────────
function MyBookingsPage({ setPage }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState(null);
  const [ref, setRef] = useState("");

  const load = async () => {
    if (user) {
      const res = await get(`/api/passengers/${user.id}/bookings`);
      setBookings(res);
    }
  };

  const lookup = async () => {
    const res = await get(`/api/bookings/${ref}`);
    setBookings([res]);
  };

  const handleCancel = async (bRef) => {
    if (!window.confirm("Cancel this booking?")) return;
    await post(`/api/bookings/${bRef}/cancel`);
    load();
  };

  useEffect(() => { load(); }, [user]);

  const statusColor = s => s==="confirmed"||s==="completed"?C.success:s==="cancelled"?C.danger:C.warn;

  return (
    <div style={{ maxWidth:700, margin:"40px auto", padding:"0 24px" }}>
      <h2 style={{ fontSize:22,fontWeight:700,marginBottom:24,color:C.text }}>My Bookings</h2>

      {!user && (
        <div style={{ ...card, marginBottom:20 }}>
          <div style={{ fontSize:14,color:C.muted,marginBottom:12 }}>
            Not logged in? Enter your booking reference to look it up.
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <input style={inp} placeholder="Booking ref e.g. VYG1234567"
                   value={ref} onChange={e=>setRef(e.target.value)} />
            <button style={{ ...btn(C.primary),whiteSpace:"nowrap" }} onClick={lookup}>Look up</button>
          </div>
        </div>
      )}

      {bookings === null && user && (
        <div style={{ color:C.muted }}>Loading…</div>
      )}

      {bookings?.length === 0 && (
        <div style={{ ...card, textAlign:"center", padding:60, color:C.muted }}>
          No bookings found.
          <br/><br/>
          <button style={btn(C.primary)} onClick={()=>setPage("search")}>Search Buses</button>
        </div>
      )}

      {(bookings||[]).map(b=>(
        <div key={b.id||b.booking_ref} style={{ ...card, marginBottom:14 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10 }}>
            <div>
              <div style={{ fontFamily:"monospace",fontSize:13,color:C.primary,fontWeight:700,marginBottom:4 }}>
                {b.booking_ref}
              </div>
              <div style={{ fontSize:17,fontWeight:700,color:C.text }}>
                {b.origin} → {b.destination}
              </div>
              <div style={{ fontSize:13,color:C.muted,marginTop:4 }}>
                {fmt(b.departure_time)} · Seats: {b.seat_numbers}
              </div>
              <div style={{ fontSize:13,color:C.muted }}>
                {b.num_adults} adult{b.num_adults!==1?"s":""} · ₹{b.total_fare?.toLocaleString()}
              </div>
            </div>
            <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8 }}>
              <span style={{ ...badge(b.status==="confirmed"?"#d1fae5":b.status==="cancelled"?"#fee2e2":"#fef9c3",
                                     statusColor(b.status)), fontSize:12 }}>
                {b.status?.toUpperCase()}
              </span>
              {b.status === "confirmed" && (
                <button style={{ ...btn("#fee2e2","#991b1b"),padding:"5px 12px",fontSize:12 }}
                        onClick={()=>handleCancel(b.booking_ref)}>Cancel</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── LOGIN / REGISTER ───────────────────────────────────────────────────
function LoginPage({ setPage }) {
  const { setUser } = useAuth();
  const [mode, setMode]   = useState("login");
  const [form, setForm]   = useState({ first_name:"",last_name:"",email:"",phone:"",password:"" });
  const [error, setError] = useState(null);
  const [ok, setOk]       = useState(null);

  const handleSubmit = async () => {
    setError(null);
    try {
      const url = mode==="login" ? "/api/passengers/login" : "/api/passengers/register";
      const res = await post(url, form);
      if (res.error) { setError(res.error); return; }
      if (mode==="login") { setUser(res); setPage("home"); }
      else { setOk("Registered! Please log in."); setMode("login"); }
    } catch(e) { setError(e.message); }
  };

  return (
    <div style={{ maxWidth:420, margin:"60px auto", padding:"0 24px" }}>
      <div style={card}>
        <h2 style={{ fontSize:22,fontWeight:700,color:C.text,marginBottom:4 }}>
          {mode==="login"?"Welcome back":"Create account"}
        </h2>
        <p style={{ fontSize:13,color:C.muted,marginBottom:20 }}>
          {mode==="login" ? "Log in to manage your bookings" : "Join VoyageAI today"}
        </p>

        {mode==="register" && (
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
            {[["First Name","first_name"],["Last Name","last_name"]].map(([l,k])=>(
              <div key={k}>
                <label style={{ fontSize:11,color:C.muted,display:"block",marginBottom:4 }}>{l}</label>
                <input style={inp} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />
              </div>
            ))}
          </div>
        )}

        {(mode==="register"?[["Phone","phone","tel"]]:[] ).concat([
          ["Email","email","email"],["Password","password","password"]
        ]).map(([l,k,t])=>(
          <div key={k} style={{ marginBottom:12 }}>
            <label style={{ fontSize:11,color:C.muted,display:"block",marginBottom:4 }}>{l}</label>
            <input type={t||"text"} style={inp} value={form[k]}
                   onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />
          </div>
        ))}

        {error && <div style={{ fontSize:13,color:C.danger,marginBottom:12 }}>{error}</div>}
        {ok    && <div style={{ fontSize:13,color:C.success,marginBottom:12 }}>{ok}</div>}

        <button style={{ ...btn(C.primary),width:"100%",padding:13 }} onClick={handleSubmit}>
          {mode==="login"?"Log In":"Create Account"}
        </button>

        <div style={{ textAlign:"center",marginTop:16,fontSize:13,color:C.muted }}>
          {mode==="login"
            ? <>No account? <span style={{ color:C.primary,cursor:"pointer" }} onClick={()=>setMode("register")}>Register</span></>
            : <>Have an account? <span style={{ color:C.primary,cursor:"pointer" }} onClick={()=>setMode("login")}>Log in</span></>
          }
        </div>
      </div>
    </div>
  );
}

// ── ROOT ───────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]             = useState("home");
  const [user, setUser]             = useState(null);
  const [searchParams, setSearchParams] = useState({});
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [bookingRef, setBookingRef]     = useState(null);

  const showNav = page !== "login";

  return (
    <AuthCtx.Provider value={{ user, setUser }}>
      <div style={{ minHeight:"100vh", background:C.bg }}>
        {showNav && <Nav page={page} setPage={setPage} />}
        {page==="home"      && <HomePage setPage={setPage} setSearchParams={setSearchParams} />}
        {page==="search"    && <SearchPage searchParams={searchParams} setPage={setPage} setSelectedTrip={setSelectedTrip} />}
        {page==="seat"      && selectedTrip && <SeatPage trip={selectedTrip} setPage={setPage} setBookingRef={setBookingRef} />}
        {page==="ticket"    && bookingRef && <TicketPage bookingRef={bookingRef} setPage={setPage} />}
        {page==="mybookings"&& <MyBookingsPage setPage={setPage} />}
        {page==="login"     && <LoginPage setPage={setPage} />}
      </div>
    </AuthCtx.Provider>
  );
}
