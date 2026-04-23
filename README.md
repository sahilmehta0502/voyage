# 🚌 VoyageAI — Agentic AI Bus Travel Agency System

> **End-to-end Agentic AI system for a bus travel agency — owner management + passenger booking**  
> M.Tech AI · NMIMS × LTIMindTree · Sahil Mehta

---

## What is this?

VoyageAI is a fully operational bus travel agency platform powered by 6 AI agents.  
It has two separate React applications — one for the **agency owner** and one for **passengers** — connected to a **Flask + SQLAlchemy backend**.

---

## System Overview

```
passenger-portal (React :3001)          owner-portal (React :3000)
       │                                        │
       └──────────────┬─────────────────────────┘
                      │
              Flask API (:5000)
                      │
             SupervisorAgent
          ┌──────┬─────┬──────┬──────┐
          ↓      ↓     ↓      ↓      ↓
       Route  Sched  Crew  Booking Analytics
       Agent  Agent  Agent  Agent   Agent
                      │
              SQLite / PostgreSQL
```

---

## Agent Responsibilities

| Agent | Rules enforced |
|-------|---------------|
| **RouteAgent** | Min 500 km distance · min 8 stops · 5-hr same-route gap · duration from distance |
| **SchedulingAgent** | Trip creation with all validations · fare calculation · crew auto-assignment |
| **CrewAgent** | 3–4 crew (500–750 km) · 5–6 (750–900 km) · 7–8 (>900 km) · 4-hr rest after 10-hr duty |
| **BookingAgent** | Seat map · create/cancel booking · e-ticket · fare calculation |
| **AnalyticsAgent** | KPIs · turnover per bus · turnover per route · Excel reports |
| **SupervisorAgent** | Dispatches all requests to the right agent |

---

## Dataset

**Only one download needed:**

```bash
git clone --depth=1 https://github.com/Vonter/bmtc-gtfs backend/data/bmtc-gtfs
```

Everything else (crew data, passengers, bookings) is generated automatically by `seed_data.py`.

---

## Quick Start

```bash
# 1. Clone this repo
git clone https://github.com/sahilmehta0502/voyage-ai
cd voyage-ai

# 2. One-shot setup (Python venv + deps + DB seed + npm install)
bash setup.sh

# 3. Terminal 1 — Backend (Flask)
source .venv/bin/activate
cd backend && python app.py
# → http://127.0.0.1:5000

# 4. Terminal 2 — Owner Portal
cd owner-portal && npm start
# → http://localhost:3000

# 5. Terminal 3 — Passenger Portal
cd passenger-portal && npm start
# → http://localhost:3001
```

---

## Owner Portal — Pages

| Page | What it does |
|------|-------------|
| **KPI Dashboard** | Live metrics: revenue, load factor, OTP, crew utilisation, cancellation rate |
| **Fleet** | Add/edit buses, track mileage, maintenance status |
| **Routes** | View all routes with stop map, distance, duration, fare |
| **Trips** | Schedule trips, assign crew, cancel, filter by status |
| **Crew** | Add/edit crew members (named), filter by role/status, export Excel |
| **Bookings** | Full booking list, search, cancel, export Excel |
| **Turnover** | Revenue per bus + per route, charts + detailed tables, export Excel |

---

## Passenger Portal — Pages

| Page | What it does |
|------|-------------|
| **Home** | Hero search bar, popular routes, feature highlights |
| **Search** | Find buses by origin/destination/date, see stops timeline |
| **Seat Picker** | Interactive seat map (available/booked/selected), fare summary |
| **Checkout** | Passenger details form, seat confirmation, payment |
| **E-Ticket** | Booking confirmation with reference number, all trip details |
| **My Bookings** | Full booking history, cancel, lookup by reference |

---

## KPIs Tracked

| KPI | Benchmark |
|-----|-----------|
| Load Factor % | ≥ 70% |
| On-Time Performance (OTP) | ≥ 90% |
| Crew Utilisation % | ≥ 60% |
| Cancellation Rate | ≤ 5% |
| Revenue per Trip | Maximise |
| Revenue per km | Maximise |
| Avg Fare | Track trend |
| Total Pax | Track growth |

---

## Business Rules (Hard-Coded in Agents)

- Same route: no new departure within **5 hours** of previous departure
- Minimum trip distance: **500 km**
- Minimum stops per route: **8** (including origin + destination)
- Crew size: **3–4** (500–750 km) · **5–6** (750–900 km) · **7–8** (>900 km)
- Crew rest: **4 hours** mandatory rest after completing a **10-hour** duty window
- Trip duration: auto-computed at **60 km/h** average + **1.5 hr** buffer

---

## Excel Exports (Owner Portal)

| Export | Content |
|--------|---------|
| `crew_report.xlsx` | All crew members with name, role, contact, stats |
| `turnover_report.xlsx` | Sheet 1: by bus · Sheet 2: by route |
| `bookings_report.xlsx` | All bookings with passenger details, fare, status |

---

## Crew Members (Pre-seeded, 38 members)

Real Indian names across 5 roles: Driver, Co-Driver, Conductor, Attendant, Guard.  
All crew are assigned to home bases: Mumbai, Pune, Delhi, Bangalore, Chennai, Hyderabad, Ahmedabad, Jaipur, Kolkata.  
The crew Excel export includes full name, employee ID, role, license number, phone, email, and duty statistics.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.10+, Flask 3, SQLAlchemy, Werkzeug |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Owner Portal | React 18, Recharts, react-leaflet, Axios |
| Passenger Portal | React 18, Axios |
| Reports | Pandas, openpyxl |
| Agents | Pure Python — no LLM API calls needed |

---

## Project Structure

```
voyage-ai/
├── backend/
│   ├── agents/
│   │   ├── supervisor_agent.py    # Dispatcher
│   │   ├── route_agent.py         # Route validation + gap rule
│   │   ├── scheduling_agent.py    # Trip scheduling
│   │   ├── crew_agent.py          # Crew assignment by distance tier
│   │   ├── booking_agent.py       # Seat map + booking + e-ticket
│   │   └── analytics_agent.py     # KPIs + turnover + Excel export
│   ├── models/database.py         # All SQLAlchemy models
│   ├── app.py                     # Flask API (30+ endpoints)
│   ├── seed_data.py               # DB seeder (buses, crew, routes, trips)
│   └── requirements.txt
├── owner-portal/src/
│   ├── pages/  (KPIDashboard, FleetPage, RoutesPage, TripsPage,
│   │            CrewPage, BookingsPage, TurnoverPage)
│   └── components/shared.jsx
├── passenger-portal/src/
│   └── App.js  (Home, Search, SeatPicker, Checkout, ETicket, MyBookings)
├── setup.sh
├── .gitignore
└── README.md
```

---

## Acknowledgements

Sincere gratitude to **NMIMS University**, M.Tech AI faculty, and **LTIMindTree** industry mentors.
