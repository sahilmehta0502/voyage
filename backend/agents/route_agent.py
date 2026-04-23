"""agents/route_agent.py
Business rules enforced:
  - Min distance: 500 km
  - Min stops: 8 (including origin + destination)
  - Same route: no new trip within 5 hours of previous departure
  - Duration computed from distance at 60 km/h + 1.5 hr buffer
"""
from __future__ import annotations
from datetime import datetime, timedelta
from agents.base_agent import BaseAgent

MIN_DISTANCE_KM = 500.0
MIN_STOPS       = 8
ROUTE_GAP_HRS   = 5
AVG_SPEED_KMPH  = 60.0
BUFFER_HRS      = 1.5


class RouteAgent(BaseAgent):
    def __init__(self):
        super().__init__("RouteAgent")

    # ── Validation ────────────────────────────────────────────────────
    def validate_route(self, distance_km: float, stops: list) -> dict:
        errors = []
        if distance_km < MIN_DISTANCE_KM:
            errors.append(f"Distance {distance_km} km is below minimum {MIN_DISTANCE_KM} km.")
        if len(stops) < MIN_STOPS:
            errors.append(f"Route has {len(stops)} stops; minimum is {MIN_STOPS}.")
        ok = len(errors) == 0
        self.log(f"Route validation {'passed' if ok else 'failed'}: {errors or 'all checks ok'}")
        return {"valid": ok, "errors": errors}

    # ── Duration calculation ──────────────────────────────────────────
    def compute_duration(self, distance_km: float) -> float:
        """Returns expected trip duration in hours."""
        travel = distance_km / AVG_SPEED_KMPH
        total  = round(travel + BUFFER_HRS, 2)
        self.log(f"Duration for {distance_km} km: {total} hrs")
        return total

    # ── Gap enforcement ───────────────────────────────────────────────
    def check_route_gap(self, route_id: int, proposed_departure: datetime) -> dict:
        """Check 5-hour gap rule using the DB."""
        from models import Trip
        last = (Trip.query
                .filter_by(route_id=route_id)
                .filter(Trip.departure_time < proposed_departure)
                .order_by(Trip.departure_time.desc())
                .first())
        if not last:
            return {"allowed": True, "message": "No prior trip on this route."}
        gap = proposed_departure - last.departure_time
        gap_hrs = gap.total_seconds() / 3600
        if gap_hrs < ROUTE_GAP_HRS:
            wait = ROUTE_GAP_HRS - gap_hrs
            msg  = f"Same route gap violation: only {gap_hrs:.1f} hrs since last trip. Wait {wait:.1f} more hrs."
            self.log(msg, "warning")
            return {"allowed": False, "message": msg,
                    "last_departure": last.departure_time.isoformat(),
                    "gap_hrs": round(gap_hrs, 2),
                    "earliest_allowed": (last.departure_time + timedelta(hours=ROUTE_GAP_HRS)).isoformat()}
        return {"allowed": True, "message": f"Gap OK ({gap_hrs:.1f} hrs)."}

    # ── Fare calculation ──────────────────────────────────────────────
    def compute_fare(self, base_fare: float, distance_km: float, bus_type: str) -> dict:
        multiplier = {"AC Sleeper": 1.0, "AC Seater": 0.85, "Non-AC": 0.65}.get(bus_type, 1.0)
        adult = round(base_fare * multiplier, 0)
        child = round(adult * 0.6, 0)
        return {"adult": adult, "child": child, "bus_type": bus_type}

    def execute(self, task: str, data: dict = None):
        if task == "validate":     return self.validate_route(data["distance_km"], data["stops"])
        if task == "check_gap":    return self.check_route_gap(data["route_id"], data["proposed_departure"])
        if task == "compute_fare": return self.compute_fare(data["base_fare"], data["distance_km"], data.get("bus_type", "AC Sleeper"))
        if task == "compute_duration": return self.compute_duration(data["distance_km"])
        raise ValueError(f"RouteAgent: unknown task '{task}'")
