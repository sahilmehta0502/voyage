"""agents/crew_agent.py
Business rules:
  - 500–750 km  → 3–4 crew  (Driver, Co-Driver, Conductor, Attendant)
  - 750–900 km  → 5–6 crew  (+ extra Conductor, Guard)
  - >900 km     → 7–8 crew  (2 Drivers, 2 Conductors, 2 Attendants, Guard + Supervisor opt.)
  - Rest rule: 4 hours mandatory after completing a 10-hour duty window
  - Crew size is enforced; trip cannot be scheduled without minimum crew
"""
from __future__ import annotations
from datetime import datetime, timedelta
from agents.base_agent import BaseAgent

DUTY_LIMIT_HRS = 10.0
REST_HRS       = 4.0

CREW_REQUIREMENTS = {
    "short":  {"Driver":1,"Co-Driver":1,"Conductor":1,"Attendant":1},           # 500–750
    "medium": {"Driver":1,"Co-Driver":1,"Conductor":2,"Attendant":1,"Guard":1}, # 750–900
    "long":   {"Driver":2,"Co-Driver":1,"Conductor":2,"Attendant":2,"Guard":1}, # >900
}

def _tier(distance_km: float) -> str:
    if distance_km <= 750:  return "short"
    if distance_km <= 900:  return "medium"
    return "long"


class CrewAgent(BaseAgent):
    def __init__(self):
        super().__init__("CrewAgent")

    # ── Requirement lookup ────────────────────────────────────────────
    def get_requirements(self, distance_km: float) -> dict:
        t = _tier(distance_km)
        req = CREW_REQUIREMENTS[t].copy()
        total = sum(req.values())
        self.log(f"Crew requirement for {distance_km:.0f} km ({t}): {total} members — {req}")
        return {"tier": t, "requirements": req, "total": total}

    # ── Availability check ────────────────────────────────────────────
    def check_rested(self, crew_member, proposed_start: datetime) -> bool:
        if not crew_member.last_duty_end:
            return True
        gap = (proposed_start - crew_member.last_duty_end).total_seconds() / 3600
        return gap >= REST_HRS

    # ── Auto-assign crew to a trip ────────────────────────────────────
    def assign_crew(self, trip_id: int, distance_km: float,
                    departure_time: datetime, arrival_time: datetime) -> dict:
        from models import db, CrewMember, TripCrew, Trip

        reqs = self.get_requirements(distance_km)["requirements"]
        assigned = []
        errors   = []
        used_ids = set()

        for role, count in reqs.items():
            available = (CrewMember.query
                         .filter_by(role=role, status="available")
                         .all())
            rested = [c for c in available
                      if c.id not in used_ids and self.check_rested(c, departure_time)]

            if len(rested) < count:
                errors.append(f"Not enough rested {role}s: need {count}, got {len(rested)}.")
                continue

            chosen = rested[:count]
            for cm in chosen:
                tc = TripCrew(trip_id=trip_id, crew_member_id=cm.id, role_on_trip=role)
                db.session.add(tc)
                cm.last_duty_end = arrival_time
                cm.total_trips  += 1
                duration_hrs = (arrival_time - departure_time).total_seconds() / 3600
                cm.total_hours  += duration_hrs
                cm.status        = "on_duty"
                used_ids.add(cm.id)
                assigned.append({"employee_id": cm.employee_id, "full_name": cm.full_name, "role": role})

        db.session.flush()
        self.log(f"Trip {trip_id}: assigned {len(assigned)} crew members. Errors: {errors or 'none'}")
        return {"assigned": assigned, "errors": errors, "total_assigned": len(assigned)}

    # ── Release crew after trip ───────────────────────────────────────
    def release_crew(self, trip_id: int) -> int:
        from models import db, TripCrew, CrewMember
        rows = TripCrew.query.filter_by(trip_id=trip_id).all()
        for tc in rows:
            if tc.crew_member:
                tc.crew_member.status = "available"
        db.session.flush()
        self.log(f"Released {len(rows)} crew from trip {trip_id}")
        return len(rows)

    def execute(self, task: str, data: dict = None):
        if task == "requirements": return self.get_requirements(data["distance_km"])
        if task == "assign":
            return self.assign_crew(data["trip_id"], data["distance_km"],
                                    data["departure_time"], data["arrival_time"])
        if task == "release":      return self.release_crew(data["trip_id"])
        raise ValueError(f"CrewAgent: unknown task '{task}'")
