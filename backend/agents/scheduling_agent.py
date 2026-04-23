"""agents/scheduling_agent.py
Generates trip schedules, validates against all business rules,
delegates to RouteAgent and CrewAgent.
"""
from __future__ import annotations
from datetime import datetime, timedelta
from agents.base_agent import BaseAgent

class SchedulingAgent(BaseAgent):
    def __init__(self):
        super().__init__("SchedulingAgent")

    def schedule_trip(self, route_id: int, bus_id: int,
                      departure_iso: str, auto_assign_crew: bool = True) -> dict:
        from models import db, Route, Bus, Trip
        from agents.route_agent import RouteAgent
        from agents.crew_agent  import CrewAgent

        route = Route.query.get(route_id)
        bus   = Bus.query.get(bus_id)
        if not route: return {"success": False, "error": "Route not found."}
        if not bus:   return {"success": False, "error": "Bus not found."}
        if bus.status != "active": return {"success": False, "error": f"Bus {bus.registration} is not active."}

        dep_time = datetime.fromisoformat(departure_iso)
        arr_time = dep_time + timedelta(hours=route.duration_hrs)

        # ── Gap rule ─────────────────────────────────────────────────
        ra = RouteAgent()
        gap_check = ra.check_route_gap(route_id, dep_time)
        if not gap_check["allowed"]:
            return {"success": False, "error": gap_check["message"], "detail": gap_check}

        # ── Fare ─────────────────────────────────────────────────────
        fares = ra.compute_fare(route.base_fare, route.distance_km, bus.bus_type)

        # ── Create trip ───────────────────────────────────────────────
        code = f"{route.route_code}-{dep_time.strftime('%Y%m%d%H%M')}"
        trip = Trip(trip_code=code, route_id=route_id, bus_id=bus_id,
                    departure_time=dep_time, arrival_time=arr_time,
                    seats_total=bus.total_seats,
                    fare_adult=fares["adult"], fare_child=fares["child"])
        db.session.add(trip); db.session.flush()

        # ── Crew assignment ───────────────────────────────────────────
        crew_result = {"assigned": [], "errors": []}
        if auto_assign_crew:
            ca = CrewAgent()
            crew_result = ca.assign_crew(trip.id, route.distance_km, dep_time, arr_time)

        db.session.commit()
        self.log(f"Trip {trip.trip_code} scheduled. Crew: {len(crew_result['assigned'])}.")
        return {
            "success": True,
            "trip_id": trip.id,
            "trip_code": trip.trip_code,
            "departure_time": dep_time.isoformat(),
            "arrival_time": arr_time.isoformat(),
            "fares": fares,
            "crew": crew_result,
        }

    def cancel_trip(self, trip_id: int, reason: str = "") -> dict:
        from models import db, Trip, Booking
        trip = Trip.query.get(trip_id)
        if not trip: return {"success": False, "error": "Trip not found."}
        trip.status = "cancelled"
        for b in trip.bookings:
            if b.status == "confirmed":
                b.status      = "cancelled"
                b.cancelled_at = datetime.utcnow()
        db.session.commit()
        self.log(f"Trip {trip.trip_code} cancelled. Reason: {reason}")
        return {"success": True, "trip_id": trip_id, "cancelled_bookings": len(trip.bookings)}

    def execute(self, task: str, data: dict = None):
        if task == "schedule": return self.schedule_trip(**data)
        if task == "cancel":   return self.cancel_trip(**data)
        raise ValueError(f"SchedulingAgent: unknown task '{task}'")
