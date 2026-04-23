"""backend/models/database.py
Full schema: buses, routes, stops, trips, crew, bookings, passengers, kpi_log.
"""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# ── Bus Fleet ─────────────────────────────────────────────────────────
class Bus(db.Model):
    __tablename__ = "buses"
    id            = db.Column(db.Integer, primary_key=True)
    registration  = db.Column(db.String(20), unique=True, nullable=False)
    model         = db.Column(db.String(60), nullable=False)
    total_seats   = db.Column(db.Integer, nullable=False, default=45)
    bus_type      = db.Column(db.String(30), default="AC Sleeper")   # AC Sleeper / AC Seater / Non-AC
    status        = db.Column(db.String(20), default="active")       # active / maintenance / retired
    mileage_km    = db.Column(db.Float, default=0.0)
    last_service  = db.Column(db.Date, nullable=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    trips         = db.relationship("Trip", back_populates="bus")

    def to_dict(self):
        return {
            "id": self.id, "registration": self.registration,
            "model": self.model, "total_seats": self.total_seats,
            "bus_type": self.bus_type, "status": self.status,
            "mileage_km": round(self.mileage_km, 1),
            "last_service": str(self.last_service) if self.last_service else None,
        }

# ── Routes ────────────────────────────────────────────────────────────
class Route(db.Model):
    __tablename__ = "routes"
    id            = db.Column(db.Integer, primary_key=True)
    route_code    = db.Column(db.String(20), unique=True, nullable=False)
    origin        = db.Column(db.String(80), nullable=False)
    destination   = db.Column(db.String(80), nullable=False)
    distance_km   = db.Column(db.Float, nullable=False)
    duration_hrs  = db.Column(db.Float, nullable=False)   # computed
    base_fare     = db.Column(db.Float, nullable=False)
    status        = db.Column(db.String(20), default="active")
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    stops         = db.relationship("RouteStop", back_populates="route",
                                    order_by="RouteStop.sequence", cascade="all, delete-orphan")
    trips         = db.relationship("Trip", back_populates="route")

    def to_dict(self):
        return {
            "id": self.id, "route_code": self.route_code,
            "origin": self.origin, "destination": self.destination,
            "distance_km": self.distance_km, "duration_hrs": self.duration_hrs,
            "base_fare": self.base_fare, "status": self.status,
            "stops": [s.to_dict() for s in self.stops],
        }

# ── Stops ─────────────────────────────────────────────────────────────
class Stop(db.Model):
    __tablename__ = "stops"
    id            = db.Column(db.Integer, primary_key=True)
    stop_code     = db.Column(db.String(20), unique=True, nullable=False)
    name          = db.Column(db.String(100), nullable=False)
    city          = db.Column(db.String(80), nullable=False)
    state         = db.Column(db.String(50), nullable=False)
    latitude      = db.Column(db.Float, nullable=False)
    longitude     = db.Column(db.Float, nullable=False)
    is_major      = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            "id": self.id, "stop_code": self.stop_code,
            "name": self.name, "city": self.city, "state": self.state,
            "latitude": self.latitude, "longitude": self.longitude,
            "is_major": self.is_major,
        }

class RouteStop(db.Model):
    __tablename__ = "route_stops"
    id            = db.Column(db.Integer, primary_key=True)
    route_id      = db.Column(db.Integer, db.ForeignKey("routes.id"), nullable=False)
    stop_id       = db.Column(db.Integer, db.ForeignKey("stops.id"), nullable=False)
    sequence      = db.Column(db.Integer, nullable=False)
    distance_from_origin_km = db.Column(db.Float, default=0.0)
    arrival_offset_min      = db.Column(db.Integer, default=0)   # minutes from departure

    route         = db.relationship("Route", back_populates="stops")
    stop          = db.relationship("Stop")

    def to_dict(self):
        return {
            "sequence": self.sequence,
            "stop_id": self.stop_id,
            "stop_name": self.stop.name if self.stop else "",
            "city": self.stop.city if self.stop else "",
            "distance_from_origin_km": self.distance_from_origin_km,
            "arrival_offset_min": self.arrival_offset_min,
        }

# ── Crew ─────────────────────────────────────────────────────────────
class CrewMember(db.Model):
    __tablename__ = "crew_members"
    id            = db.Column(db.Integer, primary_key=True)
    employee_id   = db.Column(db.String(20), unique=True, nullable=False)
    first_name    = db.Column(db.String(50), nullable=False)
    last_name     = db.Column(db.String(50), nullable=False)
    role          = db.Column(db.String(30), nullable=False)   # Driver / Co-Driver / Conductor / Attendant / Guard
    license_no    = db.Column(db.String(30), nullable=True)
    phone         = db.Column(db.String(15), nullable=False)
    email         = db.Column(db.String(100), nullable=True)
    base_location = db.Column(db.String(80), nullable=False)
    status        = db.Column(db.String(20), default="available")  # available / on_duty / resting / off
    total_trips   = db.Column(db.Integer, default=0)
    total_hours   = db.Column(db.Float, default=0.0)
    last_duty_end = db.Column(db.DateTime, nullable=True)
    joining_date  = db.Column(db.Date, nullable=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    assignments   = db.relationship("TripCrew", back_populates="crew_member")

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def is_rested(self, proposed_start):
        """Check 4-hour rest rule after 10-hour duty."""
        if not self.last_duty_end:
            return True
        from datetime import timedelta
        gap = proposed_start - self.last_duty_end
        return gap.total_seconds() >= 4 * 3600

    def to_dict(self):
        return {
            "id": self.id, "employee_id": self.employee_id,
            "full_name": self.full_name,
            "first_name": self.first_name, "last_name": self.last_name,
            "role": self.role, "license_no": self.license_no,
            "phone": self.phone, "email": self.email,
            "base_location": self.base_location, "status": self.status,
            "total_trips": self.total_trips,
            "total_hours": round(self.total_hours, 1),
            "last_duty_end": self.last_duty_end.isoformat() if self.last_duty_end else None,
            "joining_date": str(self.joining_date) if self.joining_date else None,
        }

# ── Trips ─────────────────────────────────────────────────────────────
class Trip(db.Model):
    __tablename__ = "trips"
    id              = db.Column(db.Integer, primary_key=True)
    trip_code       = db.Column(db.String(30), unique=True, nullable=False)
    route_id        = db.Column(db.Integer, db.ForeignKey("routes.id"), nullable=False)
    bus_id          = db.Column(db.Integer, db.ForeignKey("buses.id"), nullable=True)
    departure_time  = db.Column(db.DateTime, nullable=False)
    arrival_time    = db.Column(db.DateTime, nullable=False)
    status          = db.Column(db.String(20), default="scheduled")
    # scheduled / boarding / in_progress / completed / cancelled / delayed
    seats_total     = db.Column(db.Integer, default=45)
    seats_booked    = db.Column(db.Integer, default=0)
    fare_adult      = db.Column(db.Float, nullable=False)
    fare_child      = db.Column(db.Float, nullable=False)
    actual_departure = db.Column(db.DateTime, nullable=True)
    actual_arrival   = db.Column(db.DateTime, nullable=True)
    total_revenue    = db.Column(db.Float, default=0.0)
    created_at       = db.Column(db.DateTime, default=datetime.utcnow)

    route           = db.relationship("Route", back_populates="trips")
    bus             = db.relationship("Bus", back_populates="trips")
    crew_assignments= db.relationship("TripCrew", back_populates="trip",
                                      cascade="all, delete-orphan")
    bookings        = db.relationship("Booking", back_populates="trip")

    @property
    def load_factor(self):
        if self.seats_total == 0:
            return 0.0
        return round(self.seats_booked / self.seats_total * 100, 1)

    @property
    def seats_available(self):
        return self.seats_total - self.seats_booked

    def to_dict(self):
        return {
            "id": self.id, "trip_code": self.trip_code,
            "route_id": self.route_id,
            "route_code": self.route.route_code if self.route else None,
            "origin": self.route.origin if self.route else None,
            "destination": self.route.destination if self.route else None,
            "distance_km": self.route.distance_km if self.route else None,
            "bus_id": self.bus_id,
            "bus_registration": self.bus.registration if self.bus else None,
            "departure_time": self.departure_time.isoformat(),
            "arrival_time": self.arrival_time.isoformat(),
            "status": self.status,
            "seats_total": self.seats_total,
            "seats_booked": self.seats_booked,
            "seats_available": self.seats_available,
            "load_factor": self.load_factor,
            "fare_adult": self.fare_adult,
            "fare_child": self.fare_child,
            "total_revenue": round(self.total_revenue, 2),
            "crew": [tc.to_dict() for tc in self.crew_assignments],
            "stops": [s.to_dict() for s in self.route.stops] if self.route else [],
        }

class TripCrew(db.Model):
    __tablename__ = "trip_crew"
    id              = db.Column(db.Integer, primary_key=True)
    trip_id         = db.Column(db.Integer, db.ForeignKey("trips.id"), nullable=False)
    crew_member_id  = db.Column(db.Integer, db.ForeignKey("crew_members.id"), nullable=False)
    role_on_trip    = db.Column(db.String(30), nullable=False)

    trip            = db.relationship("Trip", back_populates="crew_assignments")
    crew_member     = db.relationship("CrewMember", back_populates="assignments")

    def to_dict(self):
        return {
            "crew_id": self.crew_member_id,
            "employee_id": self.crew_member.employee_id if self.crew_member else None,
            "full_name": self.crew_member.full_name if self.crew_member else None,
            "role_on_trip": self.role_on_trip,
        }

# ── Passengers ────────────────────────────────────────────────────────
class Passenger(db.Model):
    __tablename__ = "passengers"
    id            = db.Column(db.Integer, primary_key=True)
    first_name    = db.Column(db.String(50), nullable=False)
    last_name     = db.Column(db.String(50), nullable=False)
    email         = db.Column(db.String(100), unique=True, nullable=False)
    phone         = db.Column(db.String(15), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    total_bookings= db.Column(db.Integer, default=0)
    total_spent   = db.Column(db.Float, default=0.0)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    bookings      = db.relationship("Booking", back_populates="passenger")

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def to_dict(self):
        return {
            "id": self.id, "full_name": self.full_name,
            "email": self.email, "phone": self.phone,
            "total_bookings": self.total_bookings,
            "total_spent": round(self.total_spent, 2),
        }

# ── Bookings ──────────────────────────────────────────────────────────
class Booking(db.Model):
    __tablename__ = "bookings"
    id              = db.Column(db.Integer, primary_key=True)
    booking_ref     = db.Column(db.String(20), unique=True, nullable=False)
    trip_id         = db.Column(db.Integer, db.ForeignKey("trips.id"), nullable=False)
    passenger_id    = db.Column(db.Integer, db.ForeignKey("passengers.id"), nullable=True)
    passenger_name  = db.Column(db.String(100), nullable=False)
    passenger_email = db.Column(db.String(100), nullable=False)
    passenger_phone = db.Column(db.String(15), nullable=False)
    seat_numbers    = db.Column(db.String(100), nullable=False)  # comma-separated
    num_adults      = db.Column(db.Integer, default=1)
    num_children    = db.Column(db.Integer, default=0)
    total_fare      = db.Column(db.Float, nullable=False)
    status          = db.Column(db.String(20), default="confirmed")
    # confirmed / cancelled / completed / no_show
    payment_method  = db.Column(db.String(30), default="online")
    booked_at       = db.Column(db.DateTime, default=datetime.utcnow)
    cancelled_at    = db.Column(db.DateTime, nullable=True)

    trip            = db.relationship("Trip", back_populates="bookings")
    passenger       = db.relationship("Passenger", back_populates="bookings")

    def to_dict(self):
        return {
            "id": self.id, "booking_ref": self.booking_ref,
            "trip_id": self.trip_id,
            "trip_code": self.trip.trip_code if self.trip else None,
            "origin": self.trip.route.origin if self.trip and self.trip.route else None,
            "destination": self.trip.route.destination if self.trip and self.trip.route else None,
            "departure_time": self.trip.departure_time.isoformat() if self.trip else None,
            "passenger_name": self.passenger_name,
            "passenger_email": self.passenger_email,
            "passenger_phone": self.passenger_phone,
            "seat_numbers": self.seat_numbers,
            "num_adults": self.num_adults, "num_children": self.num_children,
            "total_fare": round(self.total_fare, 2),
            "status": self.status, "payment_method": self.payment_method,
            "booked_at": self.booked_at.isoformat(),
        }

# ── KPI Log ───────────────────────────────────────────────────────────
class KPILog(db.Model):
    __tablename__ = "kpi_log"
    id              = db.Column(db.Integer, primary_key=True)
    trip_id         = db.Column(db.Integer, db.ForeignKey("trips.id"), nullable=True)
    route_id        = db.Column(db.Integer, db.ForeignKey("routes.id"), nullable=True)
    bus_id          = db.Column(db.Integer, db.ForeignKey("buses.id"), nullable=True)
    metric_name     = db.Column(db.String(60), nullable=False)
    metric_value    = db.Column(db.Float, nullable=False)
    recorded_at     = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id, "trip_id": self.trip_id,
            "route_id": self.route_id, "bus_id": self.bus_id,
            "metric_name": self.metric_name,
            "metric_value": round(self.metric_value, 4),
            "recorded_at": self.recorded_at.isoformat(),
        }