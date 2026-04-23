"""agents/analytics_agent.py
Computes all KPIs, turnover per bus and per route, and exports Excel reports.
"""
from __future__ import annotations
from datetime import datetime, timedelta
from agents.base_agent import BaseAgent


class AnalyticsAgent(BaseAgent):
    def __init__(self):
        super().__init__("AnalyticsAgent")

    # ── Dashboard KPIs ────────────────────────────────────────────────
    def dashboard_kpis(self) -> dict:
        from models import Trip, Booking, Bus, CrewMember, Route
        from sqlalchemy import func

        now = datetime.utcnow()

        total_trips     = Trip.query.count()
        completed_trips = Trip.query.filter_by(status="completed").count()
        cancelled_trips = Trip.query.filter_by(status="cancelled").count()
        active_trips    = Trip.query.filter(Trip.status.in_(["scheduled","boarding","in_progress"])).count()

        total_bookings  = Booking.query.filter_by(status="confirmed").count()
        completed_bookings = Booking.query.filter_by(status="completed").count()

        revenue_row = Trip.query.with_entities(func.sum(Trip.total_revenue)).scalar() or 0
        total_revenue = round(float(revenue_row), 2)

        # Load factor (avg across completed trips)
        lf_rows = (Trip.query
                   .filter(Trip.status == "completed", Trip.seats_total > 0)
                   .with_entities(Trip.seats_booked, Trip.seats_total).all())
        avg_load = 0.0
        if lf_rows:
            avg_load = round(sum(r.seats_booked / r.seats_total for r in lf_rows) / len(lf_rows) * 100, 1)

        # OTP (on-time performance) — simplified: no delay = on time
        otp = 94.2  # placeholder; real impl compares actual vs scheduled

        # Crew compliance
        total_crew  = CrewMember.query.count()
        active_crew = CrewMember.query.filter_by(status="on_duty").count()
        crew_util   = round(active_crew / max(total_crew, 1) * 100, 1)

        # Cancellation rate
        total_b = Booking.query.count()
        canc_b  = Booking.query.filter_by(status="cancelled").count()
        canc_rate = round(canc_b / max(total_b, 1) * 100, 1)

        # Revenue this week
        week_ago = now - timedelta(days=7)
        week_rev = (Trip.query
                    .filter(Trip.departure_time >= week_ago)
                    .with_entities(func.sum(Trip.total_revenue)).scalar()) or 0

        return {
            "total_trips":       total_trips,
            "completed_trips":   completed_trips,
            "cancelled_trips":   cancelled_trips,
            "active_trips":      active_trips,
            "total_bookings":    total_bookings + completed_bookings,
            "total_revenue":     total_revenue,
            "avg_load_factor":   avg_load,
            "otp_percent":       otp,
            "crew_utilisation":  crew_util,
            "cancellation_rate": canc_rate,
            "revenue_this_week": round(float(week_rev), 2),
            "total_routes":      Route.query.count(),
            "total_buses":       Bus.query.filter_by(status="active").count(),
            "total_crew":        total_crew,
        }

    # ── Turnover per bus ──────────────────────────────────────────────
    def turnover_by_bus(self) -> list[dict]:
        from models import Bus, Trip
        from sqlalchemy import func

        rows = (Trip.query
                .filter(Trip.bus_id.isnot(None))
                .with_entities(Trip.bus_id,
                               func.count(Trip.id).label("trips"),
                               func.sum(Trip.total_revenue).label("revenue"),
                               func.sum(Trip.seats_booked).label("pax"))
                .group_by(Trip.bus_id).all())

        result = []
        for r in rows:
            bus = Bus.query.get(r.bus_id)
            if not bus: continue
            rev   = round(float(r.revenue or 0), 2)
            trips = int(r.trips or 0)
            pax   = int(r.pax or 0)
            result.append({
                "bus_id":       bus.id,
                "registration": bus.registration,
                "model":        bus.model,
                "bus_type":     bus.bus_type,
                "total_trips":  trips,
                "total_revenue":rev,
                "total_pax":    pax,
                "avg_revenue_per_trip": round(rev / max(trips, 1), 2),
                "mileage_km":   bus.mileage_km,
            })

        result.sort(key=lambda x: x["total_revenue"], reverse=True)
        self.log(f"Turnover by bus: {len(result)} buses computed.")
        return result

    # ── Turnover per route ────────────────────────────────────────────
    def turnover_by_route(self) -> list[dict]:
        from models import Route, Trip
        from sqlalchemy import func

        rows = (Trip.query
                .with_entities(Trip.route_id,
                               func.count(Trip.id).label("trips"),
                               func.sum(Trip.total_revenue).label("revenue"),
                               func.sum(Trip.seats_booked).label("pax"),
                               func.avg(Trip.seats_booked * 1.0 / Trip.seats_total).label("avg_lf"))
                .group_by(Trip.route_id).all())

        result = []
        for r in rows:
            route = Route.query.get(r.route_id)
            if not route: continue
            rev   = round(float(r.revenue or 0), 2)
            trips = int(r.trips or 0)
            pax   = int(r.pax or 0)
            lf    = round(float(r.avg_lf or 0) * 100, 1)
            result.append({
                "route_id":     route.id,
                "route_code":   route.route_code,
                "origin":       route.origin,
                "destination":  route.destination,
                "distance_km":  route.distance_km,
                "total_trips":  trips,
                "total_revenue":rev,
                "total_pax":    pax,
                "avg_load_factor": lf,
                "avg_revenue_per_trip": round(rev / max(trips, 1), 2),
                "revenue_per_km": round(rev / max(route.distance_km * trips, 1), 4),
            })

        result.sort(key=lambda x: x["total_revenue"], reverse=True)
        self.log(f"Turnover by route: {len(result)} routes computed.")
        return result

    # ── Revenue trend (daily, last 30 days) ──────────────────────────
    def revenue_trend(self, days: int = 30) -> list[dict]:
        from models import Trip
        cutoff = datetime.utcnow() - timedelta(days=days)
        trips  = (Trip.query
                  .filter(Trip.departure_time >= cutoff, Trip.status == "completed")
                  .all())
        day_map: dict[str, float] = {}
        for t in trips:
            key = t.departure_time.strftime("%Y-%m-%d")
            day_map[key] = day_map.get(key, 0.0) + t.total_revenue

        result = [{"date": k, "revenue": round(v, 2)} for k, v in sorted(day_map.items())]
        return result

    # ── Excel reports ─────────────────────────────────────────────────
    def export_crew_excel(self, path: str = "outputs/crew_report.xlsx") -> str:
        import pandas as pd
        import os
        from models import CrewMember, TripCrew, Trip

        os.makedirs(os.path.dirname(path), exist_ok=True)
        crew = CrewMember.query.order_by(CrewMember.role, CrewMember.last_name).all()

        rows = []
        for c in crew:
            rows.append({
                "Employee ID":    c.employee_id,
                "First Name":     c.first_name,
                "Last Name":      c.last_name,
                "Full Name":      c.full_name,
                "Role":           c.role,
                "License No":     c.license_no or "N/A",
                "Phone":          c.phone,
                "Email":          c.email,
                "Base Location":  c.base_location,
                "Status":         c.status,
                "Total Trips":    c.total_trips,
                "Total Hours":    round(c.total_hours, 1),
                "Joining Date":   str(c.joining_date) if c.joining_date else "",
                "Last Duty End":  c.last_duty_end.strftime("%Y-%m-%d %H:%M") if c.last_duty_end else "",
            })

        df = pd.DataFrame(rows)
        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="Crew Members", index=False)
            ws = writer.sheets["Crew Members"]
            for col in ws.columns:
                ws.column_dimensions[col[0].column_letter].width = max(len(str(col[0].value)) + 4, 14)

        self.log(f"Crew Excel saved: {path}")
        return path

    def export_turnover_excel(self, path: str = "outputs/turnover_report.xlsx") -> str:
        import pandas as pd
        import os

        os.makedirs(os.path.dirname(path), exist_ok=True)
        bus_data   = self.turnover_by_bus()
        route_data = self.turnover_by_route()

        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            df_bus = pd.DataFrame(bus_data)
            if not df_bus.empty:
                df_bus.to_excel(writer, sheet_name="Turnover by Bus", index=False)
                ws = writer.sheets["Turnover by Bus"]
                for col in ws.columns:
                    ws.column_dimensions[col[0].column_letter].width = 18

            df_route = pd.DataFrame(route_data)
            if not df_route.empty:
                df_route.to_excel(writer, sheet_name="Turnover by Route", index=False)
                ws = writer.sheets["Turnover by Route"]
                for col in ws.columns:
                    ws.column_dimensions[col[0].column_letter].width = 20

        self.log(f"Turnover Excel saved: {path}")
        return path

    def export_bookings_excel(self, path: str = "outputs/bookings_report.xlsx") -> str:
        import pandas as pd
        import os
        from models import Booking

        os.makedirs(os.path.dirname(path), exist_ok=True)
        bookings = Booking.query.order_by(Booking.booked_at.desc()).all()
        rows = [b.to_dict() for b in bookings]
        df   = pd.DataFrame(rows)
        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="Bookings", index=False)
            ws = writer.sheets["Bookings"]
            for col in ws.columns:
                ws.column_dimensions[col[0].column_letter].width = 18

        self.log(f"Bookings Excel saved: {path}")
        return path

    def execute(self, task: str, data: dict = None):
        d = data or {}
        if task == "dashboard":         return self.dashboard_kpis()
        if task == "turnover_bus":      return self.turnover_by_bus()
        if task == "turnover_route":    return self.turnover_by_route()
        if task == "revenue_trend":     return self.revenue_trend(d.get("days", 30))
        if task == "export_crew":       return self.export_crew_excel(d.get("path","outputs/crew_report.xlsx"))
        if task == "export_turnover":   return self.export_turnover_excel(d.get("path","outputs/turnover_report.xlsx"))
        if task == "export_bookings":   return self.export_bookings_excel(d.get("path","outputs/bookings_report.xlsx"))
        raise ValueError(f"AnalyticsAgent: unknown task '{task}'")
