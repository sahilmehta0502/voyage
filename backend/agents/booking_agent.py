"""agents/booking_agent.py
Handles seat selection, booking creation, cancellation, and ticket generation.
"""
from __future__ import annotations
import random, string
from datetime import datetime
from agents.base_agent import BaseAgent


def _gen_ref():
    return "VYG" + "".join(random.choices(string.digits, k=7))


class BookingAgent(BaseAgent):
    def __init__(self):
        super().__init__("BookingAgent")

    # ── Seat availability ─────────────────────────────────────────────
    def get_seat_map(self, trip_id: int) -> dict:
        from models import Trip, Booking
        trip = Trip.query.get(trip_id)
        if not trip: return {"error": "Trip not found."}

        booked_seats = set()
        for b in trip.bookings:
            if b.status in ("confirmed", "completed"):
                for s in b.seat_numbers.split(","):
                    if s.strip():
                        booked_seats.add(int(s.strip()))

        seats = []
        for i in range(1, trip.seats_total + 1):
            seats.append({"number": i, "available": i not in booked_seats,
                          "type": "window" if i % 4 in (1, 0) else "aisle"})
        return {
            "trip_id": trip_id,
            "total_seats": trip.seats_total,
            "seats_booked": len(booked_seats),
            "seats_available": trip.seats_total - len(booked_seats),
            "seat_map": seats,
        }

    # ── Create booking ────────────────────────────────────────────────
    def create_booking(self, trip_id: int, seat_numbers: list[int],
                       passenger_name: str, passenger_email: str,
                       passenger_phone: str, num_adults: int = 1,
                       num_children: int = 0,
                       passenger_id: int = None,
                       payment_method: str = "online") -> dict:
        from models import db, Trip, Booking, Passenger

        trip = Trip.query.get(trip_id)
        if not trip: return {"success": False, "error": "Trip not found."}
        if trip.status in ("cancelled", "completed"):
            return {"success": False, "error": f"Trip is {trip.status}."}
        # Allow booking up to 30 minutes before departure
        from datetime import timedelta
        if trip.departure_time < datetime.utcnow() - timedelta(minutes=30):
            return {"success": False, "error": "Trip has already departed."}

        # Check seats free
        current_map = self.get_seat_map(trip_id)
        booked_set  = {s["number"] for s in current_map["seat_map"] if not s["available"]}
        conflicts   = [s for s in seat_numbers if s in booked_set]
        if conflicts:
            return {"success": False, "error": f"Seats already taken: {conflicts}"}

        fare = num_adults * trip.fare_adult + num_children * trip.fare_child
        ref  = _gen_ref()

        b = Booking(booking_ref=ref, trip_id=trip_id,
                    passenger_id=passenger_id,
                    passenger_name=passenger_name,
                    passenger_email=passenger_email,
                    passenger_phone=passenger_phone,
                    seat_numbers=",".join(str(s) for s in seat_numbers),
                    num_adults=num_adults, num_children=num_children,
                    total_fare=fare, payment_method=payment_method)
        db.session.add(b)

        trip.seats_booked  += len(seat_numbers)
        trip.total_revenue += fare

        if passenger_id:
            p = Passenger.query.get(passenger_id)
            if p:
                p.total_bookings += 1
                p.total_spent    += fare

        db.session.commit()
        self.log(f"Booking {ref} created. Trip {trip_id}, seats {seat_numbers}, fare ₹{fare}.")
        return {"success": True, "booking_ref": ref, "booking_id": b.id,
                "total_fare": fare, "seats": seat_numbers}

    # ── Cancel booking ────────────────────────────────────────────────
    def cancel_booking(self, booking_ref: str) -> dict:
        from models import db, Booking, Trip
        b = Booking.query.filter_by(booking_ref=booking_ref).first()
        if not b: return {"success": False, "error": "Booking not found."}
        if b.status == "cancelled": return {"success": False, "error": "Already cancelled."}

        b.status       = "cancelled"
        b.cancelled_at = datetime.utcnow()

        trip = Trip.query.get(b.trip_id)
        if trip:
            trip.seats_booked  = max(0, trip.seats_booked - (b.num_adults + b.num_children))
            trip.total_revenue = max(0.0, trip.total_revenue - b.total_fare)

        db.session.commit()
        self.log(f"Booking {booking_ref} cancelled.")
        return {"success": True, "booking_ref": booking_ref, "refund": b.total_fare}

    # ── Ticket data ───────────────────────────────────────────────────
    def get_ticket(self, booking_ref: str) -> dict:
        from models import Booking
        b = Booking.query.filter_by(booking_ref=booking_ref).first()
        if not b: return {"error": "Not found."}
        return {**b.to_dict(), "ticket_generated_at": datetime.utcnow().isoformat()}

    def execute(self, task: str, data: dict = None):
        if task == "seat_map":      return self.get_seat_map(data["trip_id"])
        if task == "create":        return self.create_booking(**data)
        if task == "cancel":        return self.cancel_booking(data["booking_ref"])
        if task == "ticket":        return self.get_ticket(data["booking_ref"])
        raise ValueError(f"BookingAgent: unknown task '{task}'")