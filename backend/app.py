"""backend/app.py — Flask application factory + all API routes. FIXED v2"""
from __future__ import annotations
import os
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from models import db


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///voyage.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "voyage-secret-2024")
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})   # allow all origins in dev

    supervisor = None

    def get_supervisor():
        nonlocal supervisor
        if supervisor is None:
            from agents import SupervisorAgent
            supervisor = SupervisorAgent()
        return supervisor

    # ── Health ────────────────────────────────────────────────────────
    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "VoyageAI Backend"})

    # ── Buses ─────────────────────────────────────────────────────────
    @app.route("/api/buses")
    def get_buses():
        from models import Bus
        return jsonify([b.to_dict() for b in Bus.query.all()])

    @app.route("/api/buses/<int:bus_id>")
    def get_bus(bus_id):
        from models import Bus
        return jsonify(Bus.query.get_or_404(bus_id).to_dict())

    @app.route("/api/buses", methods=["POST"])
    def add_bus():
        from models import Bus
        d = request.json
        b = Bus(registration=d["registration"], model=d["model"],
                total_seats=d.get("total_seats", 45),
                bus_type=d.get("bus_type", "AC Sleeper"))
        db.session.add(b); db.session.commit()
        return jsonify(b.to_dict()), 201

    @app.route("/api/buses/<int:bus_id>", methods=["PUT"])
    def update_bus(bus_id):
        from models import Bus
        b = Bus.query.get_or_404(bus_id)
        for field in ("model", "total_seats", "bus_type", "status", "mileage_km"):
            if field in request.json:
                setattr(b, field, request.json[field])
        db.session.commit()
        return jsonify(b.to_dict())

    # ── Routes ────────────────────────────────────────────────────────
    @app.route("/api/routes")
    def get_routes():
        from models import Route
        return jsonify([r.to_dict() for r in Route.query.filter_by(status="active").all()])

    @app.route("/api/routes/<int:route_id>")
    def get_route(route_id):
        from models import Route
        return jsonify(Route.query.get_or_404(route_id).to_dict())

    @app.route("/api/routes/search")
    def search_routes():
        from models import Route
        origin = request.args.get("origin", "").strip().lower()
        dest   = request.args.get("destination", "").strip().lower()
        routes = Route.query.filter_by(status="active").all()
        filtered = [r for r in routes
                    if (not origin or origin in r.origin.lower())
                    and (not dest   or dest   in r.destination.lower())]
        return jsonify([r.to_dict() for r in filtered])

    @app.route("/api/routes", methods=["POST"])
    def add_route():
        from models import Route
        d  = request.json
        sv = get_supervisor()
        v  = sv.handle("route", "validate", {"distance_km": d["distance_km"], "stops": d.get("stops", [])})
        if not v["valid"]:
            return jsonify({"error": v["errors"]}), 400
        dur = sv.handle("route", "compute_duration", {"distance_km": d["distance_km"]})
        r = Route(route_code=d["route_code"], origin=d["origin"],
                  destination=d["destination"], distance_km=d["distance_km"],
                  duration_hrs=dur, base_fare=d["base_fare"])
        db.session.add(r); db.session.commit()
        return jsonify(r.to_dict()), 201

    # ── Stops ─────────────────────────────────────────────────────────
    @app.route("/api/stops")
    def get_stops():
        from models import Stop
        return jsonify([s.to_dict() for s in Stop.query.all()])

    # ── Trips ─────────────────────────────────────────────────────────
    @app.route("/api/trips")
    def get_trips():
        from models import Trip
        status   = request.args.get("status")
        route_id = request.args.get("route_id", type=int)
        q = Trip.query
        if status:   q = q.filter_by(status=status)
        if route_id: q = q.filter_by(route_id=route_id)
        return jsonify([t.to_dict() for t in q.order_by(Trip.departure_time).all()])

    @app.route("/api/trips/search")
    def search_trips():
        # FIX: also include trips that depart in the future regardless of status
        from models import Trip, Route
        from datetime import datetime
        origin = request.args.get("origin", "").strip().lower()
        dest   = request.args.get("destination", "").strip().lower()
        date_s = request.args.get("date", "")
        now    = datetime.utcnow()

        # FIX: return scheduled OR any future trip — not just "scheduled" status
        trips = (Trip.query
                 .join(Route)
                 .filter(Trip.departure_time >= now)        # only future trips
                 .order_by(Trip.departure_time).all())

        result = []
        for t in trips:
            if origin and origin not in t.route.origin.lower():      continue
            if dest   and dest   not in t.route.destination.lower(): continue
            if date_s:
                try:
                    d = datetime.fromisoformat(date_s).date()
                    if t.departure_time.date() != d: continue
                except Exception:
                    pass
            result.append(t.to_dict())
        return jsonify(result)

    @app.route("/api/trips/<int:trip_id>")
    def get_trip(trip_id):
        from models import Trip
        return jsonify(Trip.query.get_or_404(trip_id).to_dict())

    @app.route("/api/trips", methods=["POST"])
    def schedule_trip():
        d  = request.json
        sv = get_supervisor()
        result = sv.handle("scheduling", "schedule", {
            "route_id":         d["route_id"],
            "bus_id":           d["bus_id"],
            "departure_iso":    d["departure_time"],
            "auto_assign_crew": d.get("auto_assign_crew", True),
        })
        return jsonify(result), (201 if result.get("success") else 400)

    @app.route("/api/trips/<int:trip_id>/cancel", methods=["POST"])
    def cancel_trip(trip_id):
        sv = get_supervisor()
        result = sv.handle("scheduling", "cancel",
                           {"trip_id": trip_id, "reason": (request.json or {}).get("reason", "")})
        return jsonify(result)

    @app.route("/api/trips/<int:trip_id>/seats")
    def trip_seats(trip_id):
        sv = get_supervisor()
        return jsonify(sv.handle("booking", "seat_map", {"trip_id": trip_id}))

    # ── Crew ──────────────────────────────────────────────────────────
    @app.route("/api/crew")
    def get_crew():
        from models import CrewMember
        q = CrewMember.query
        if request.args.get("role"):   q = q.filter_by(role=request.args["role"])
        if request.args.get("status"): q = q.filter_by(status=request.args["status"])
        if request.args.get("base"):   q = q.filter_by(base_location=request.args["base"])
        return jsonify([c.to_dict() for c in q.order_by(CrewMember.last_name).all()])

    @app.route("/api/crew/<int:crew_id>")
    def get_crew_member(crew_id):
        from models import CrewMember
        return jsonify(CrewMember.query.get_or_404(crew_id).to_dict())

    @app.route("/api/crew", methods=["POST"])
    def add_crew():
        from models import CrewMember
        d  = request.json
        cm = CrewMember(employee_id=d["employee_id"], first_name=d["first_name"],
                        last_name=d["last_name"], role=d["role"],
                        license_no=d.get("license_no"), phone=d["phone"],
                        email=d.get("email"), base_location=d["base_location"])
        db.session.add(cm); db.session.commit()
        return jsonify(cm.to_dict()), 201

    @app.route("/api/crew/<int:crew_id>", methods=["PUT"])
    def update_crew(crew_id):
        from models import CrewMember
        c = CrewMember.query.get_or_404(crew_id)
        for f in ("first_name","last_name","role","phone","email","base_location","status","license_no"):
            if f in request.json: setattr(c, f, request.json[f])
        db.session.commit()
        return jsonify(c.to_dict())

    @app.route("/api/trips/<int:trip_id>/crew/assign", methods=["POST"])
    def assign_crew(trip_id):
        from models import Trip
        t  = Trip.query.get_or_404(trip_id)
        sv = get_supervisor()
        return jsonify(sv.handle("crew", "assign", {
            "trip_id":        trip_id,
            "distance_km":    t.route.distance_km,
            "departure_time": t.departure_time,
            "arrival_time":   t.arrival_time,
        }))

    # ── Bookings ──────────────────────────────────────────────────────
    @app.route("/api/bookings")
    def get_bookings():
        from models import Booking
        q = Booking.query
        if request.args.get("trip_id"): q = q.filter_by(trip_id=int(request.args["trip_id"]))
        if request.args.get("status"):  q = q.filter_by(status=request.args["status"])
        return jsonify([b.to_dict() for b in q.order_by(Booking.booked_at.desc()).limit(200).all()])

    @app.route("/api/bookings/<ref>")
    def get_booking(ref):
        from models import Booking
        return jsonify(Booking.query.filter_by(booking_ref=ref).first_or_404().to_dict())

    # ── FIX: pass ALL fields through to the booking agent ─────────────
    @app.route("/api/bookings", methods=["POST"])
    def create_booking():
        raw = request.get_json()
        if not raw:
            return jsonify({"success": False, "error": "No JSON body received."}), 400

        # Pass everything the frontend sends directly to the agent.
        # BookingAgent.create_booking() has defaults for optional fields.
        d = {
            "trip_id":          raw.get("trip_id"),
            "seat_numbers":     raw.get("seat_numbers", []),
            "passenger_name":   raw.get("passenger_name", ""),
            "passenger_email":  raw.get("passenger_email", ""),
            "passenger_phone":  raw.get("passenger_phone", ""),
            "num_adults":       int(raw.get("num_adults",   1)),
            "num_children":     int(raw.get("num_children", 0)),
            "passenger_id":     raw.get("passenger_id"),        # may be None
            "payment_method":   raw.get("payment_method", "online"),
        }

        sv     = get_supervisor()
        result = sv.handle("booking", "create", d)
        return jsonify(result), (201 if result.get("success") else 400)

    @app.route("/api/bookings/<ref>/cancel", methods=["POST"])
    def cancel_booking(ref):
        sv = get_supervisor()
        return jsonify(sv.handle("booking", "cancel", {"booking_ref": ref}))

    @app.route("/api/bookings/<ref>/ticket")
    def get_ticket(ref):
        sv = get_supervisor()
        return jsonify(sv.handle("booking", "ticket", {"booking_ref": ref}))

    # ── Passengers ────────────────────────────────────────────────────
    @app.route("/api/passengers/register", methods=["POST"])
    def register_passenger():
        from models import Passenger
        from werkzeug.security import generate_password_hash
        d = request.json
        if Passenger.query.filter_by(email=d["email"]).first():
            return jsonify({"error": "Email already registered."}), 400
        p = Passenger(first_name=d["first_name"], last_name=d["last_name"],
                      email=d["email"], phone=d["phone"],
                      password_hash=generate_password_hash(d["password"]))
        db.session.add(p); db.session.commit()
        return jsonify(p.to_dict()), 201

    @app.route("/api/passengers/login", methods=["POST"])
    def login_passenger():
        from models import Passenger
        from werkzeug.security import check_password_hash
        d = request.json
        p = Passenger.query.filter_by(email=d["email"]).first()
        if not p or not check_password_hash(p.password_hash, d["password"]):
            return jsonify({"error": "Invalid credentials."}), 401
        return jsonify(p.to_dict())

    @app.route("/api/passengers/<int:pid>/bookings")
    def passenger_bookings(pid):
        from models import Booking
        return jsonify([b.to_dict() for b in
                        Booking.query.filter_by(passenger_id=pid)
                        .order_by(Booking.booked_at.desc()).all()])

    # ── Analytics ─────────────────────────────────────────────────────
    @app.route("/api/analytics/dashboard")
    def analytics_dashboard():
        return jsonify(get_supervisor().handle("analytics", "dashboard"))

    @app.route("/api/analytics/turnover/bus")
    def turnover_bus():
        return jsonify(get_supervisor().handle("analytics", "turnover_bus"))

    @app.route("/api/analytics/turnover/route")
    def turnover_route():
        return jsonify(get_supervisor().handle("analytics", "turnover_route"))

    @app.route("/api/analytics/revenue-trend")
    def revenue_trend():
        return jsonify(get_supervisor().handle("analytics", "revenue_trend",
                                               {"days": request.args.get("days", 30, type=int)}))

    @app.route("/api/analytics/export/crew")
    def export_crew():
        path = get_supervisor().handle("analytics", "export_crew")
        return send_file(path, as_attachment=True, download_name="crew_report.xlsx")

    @app.route("/api/analytics/export/turnover")
    def export_turnover():
        path = get_supervisor().handle("analytics", "export_turnover")
        return send_file(path, as_attachment=True, download_name="turnover_report.xlsx")

    @app.route("/api/analytics/export/bookings")
    def export_bookings():
        path = get_supervisor().handle("analytics", "export_bookings")
        return send_file(path, as_attachment=True, download_name="bookings_report.xlsx")

    @app.route("/api/agent", methods=["POST"])
    def agent_dispatch():
        d = request.json or {}
        return jsonify(get_supervisor().handle(d.get("agent"), d.get("task"), d.get("data", {})))

    return app


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000, use_reloader=False)