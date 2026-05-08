"""backend/seed_data.py
Seeds the database with realistic Indian intercity bus travel data.
Run: python seed_data.py

FIXES applied:
  1. Removed duplicate for-loop line (lines 241-242 bug)
  2. Crew status correctly set to on_duty during seeding
  3. Crew status corrected to available after past trips complete
  4. Removed [:60] booking cap - ALL past trips get bookings
  5. In-progress trips correctly set to in_progress status
  6. In-progress trips also get bookings
"""
from __future__ import annotations
import os, sys, random
from datetime import datetime, date, timedelta
from werkzeug.security import generate_password_hash

sys.path.insert(0, os.path.dirname(__file__))
from app import create_app
from models import (db, Bus, Route, Stop, RouteStop,
                    CrewMember, Trip, TripCrew, Passenger, Booking, KPILog)

random.seed(42)

CREW_DATA = [
    ("Rajesh",    "Kumar",      "Driver",     "DL-2010-0123456", "9811001001", "Mumbai"),
    ("Suresh",    "Patel",      "Driver",     "DL-2012-0234567", "9811001002", "Pune"),
    ("Mahesh",    "Singh",      "Driver",     "DL-2009-0345678", "9811001003", "Delhi"),
    ("Dinesh",    "Sharma",     "Driver",     "DL-2011-0456789", "9811001004", "Bangalore"),
    ("Ramesh",    "Yadav",      "Driver",     "DL-2008-0567890", "9811001005", "Chennai"),
    ("Naresh",    "Gupta",      "Driver",     "DL-2013-0678901", "9811001006", "Hyderabad"),
    ("Kamlesh",   "Tiwari",     "Driver",     "DL-2010-0789012", "9811001007", "Ahmedabad"),
    ("Pradeep",   "Verma",      "Driver",     "DL-2014-0890123", "9811001008", "Jaipur"),
    ("Sanjay",    "Mishra",     "Driver",     "DL-2007-0901234", "9811001009", "Kolkata"),
    ("Vijay",     "Dubey",      "Driver",     "DL-2015-1012345", "9811001010", "Mumbai"),
    ("Anil",      "Rao",        "Co-Driver",  "DL-2016-1123456", "9822001001", "Mumbai"),
    ("Sunil",     "Joshi",      "Co-Driver",  "DL-2017-1234567", "9822001002", "Pune"),
    ("Kapil",     "Nair",       "Co-Driver",  "DL-2016-1345678", "9822001003", "Bangalore"),
    ("Akhil",     "Pillai",     "Co-Driver",  "DL-2018-1456789", "9822001004", "Chennai"),
    ("Sahil",     "Bhat",       "Co-Driver",  "DL-2015-1567890", "9822001005", "Delhi"),
    ("Rahul",     "Srivastava", "Co-Driver",  "DL-2017-1678901", "9822001006", "Hyderabad"),
    ("Amit",      "Pandey",     "Conductor",  None,              "9833001001", "Mumbai"),
    ("Rohit",     "Chauhan",    "Conductor",  None,              "9833001002", "Pune"),
    ("Mohit",     "Kashyap",    "Conductor",  None,              "9833001003", "Delhi"),
    ("Sumit",     "Thakur",     "Conductor",  None,              "9833001004", "Bangalore"),
    ("Ankit",     "Saxena",     "Conductor",  None,              "9833001005", "Chennai"),
    ("Nikhil",    "Bansal",     "Conductor",  None,              "9833001006", "Hyderabad"),
    ("Vishal",    "Agarwal",    "Conductor",  None,              "9833001007", "Ahmedabad"),
    ("Pankaj",    "Mehta",      "Conductor",  None,              "9833001008", "Jaipur"),
    ("Vivek",     "Tripathi",   "Conductor",  None,              "9833001009", "Kolkata"),
    ("Alok",      "Soni",       "Conductor",  None,              "9833001010", "Mumbai"),
    ("Priya",     "Sharma",     "Attendant",  None,              "9844001001", "Mumbai"),
    ("Neha",      "Patel",      "Attendant",  None,              "9844001002", "Pune"),
    ("Pooja",     "Singh",      "Attendant",  None,              "9844001003", "Delhi"),
    ("Anjali",    "Verma",      "Attendant",  None,              "9844001004", "Bangalore"),
    ("Kavya",     "Reddy",      "Attendant",  None,              "9844001005", "Chennai"),
    ("Divya",     "Nair",       "Attendant",  None,              "9844001006", "Hyderabad"),
    ("Meena",     "Yadav",      "Guard",      None,              "9855001001", "Mumbai"),
    ("Geeta",     "Tiwari",     "Guard",      None,              "9855001002", "Pune"),
    ("Sunita",    "Gupta",      "Guard",      None,              "9855001003", "Delhi"),
    ("Rekha",     "Joshi",      "Guard",      None,              "9855001004", "Bangalore"),
    ("Seema",     "Mishra",     "Guard",      None,              "9855001005", "Chennai"),
    ("Anita",     "Dubey",      "Guard",      None,              "9855001006", "Hyderabad"),
]

ROUTES = [
    {
        "route_code": "VYG-MUM-BAN", "origin": "Mumbai", "destination": "Bangalore",
        "distance_km": 984.0, "base_fare": 1200.0,
        "stops": [
            ("Mumbai Central Bus Depot", "Mumbai",    "Maharashtra", 19.0760, 72.8777, 0,   0),
            ("Pune Bus Stand",           "Pune",      "Maharashtra", 18.5204, 73.8567, 148, 150),
            ("Satara ST Stand",          "Satara",    "Maharashtra", 17.6868, 74.0183, 254, 260),
            ("Kolhapur Central",         "Kolhapur",  "Maharashtra", 16.7050, 74.2433, 374, 380),
            ("Belgaum Bus Station",      "Belgaum",   "Karnataka",   15.8497, 74.4977, 510, 510),
            ("Dharwad Bus Stand",        "Dharwad",   "Karnataka",   15.4589, 75.0078, 580, 580),
            ("Hubli Bus Station",        "Hubli",     "Karnataka",   15.3647, 75.1240, 610, 620),
            ("Davangere Bus Station",    "Davangere", "Karnataka",   14.4644, 75.9218, 740, 750),
            ("Tumkur Bus Stand",         "Tumkur",    "Karnataka",   13.3379, 77.1173, 880, 900),
            ("Bangalore Majestic",       "Bangalore", "Karnataka",   12.9769, 77.5713, 984, 1020),
        ],
    },
    {
        "route_code": "VYG-DEL-JAI", "origin": "Delhi", "destination": "Jaipur",
        "distance_km": 282.0, "base_fare": 650.0,
        "stops": [
            ("Delhi Sarai Kale Khan ISBT",  "Delhi",    "Delhi",     28.6139, 77.2090, 0,   0),
            ("Gurgaon Sector 14 Bus Stand", "Gurgaon",  "Haryana",   28.4595, 77.0266, 30,  40),
            ("Rewari Bus Stand",            "Rewari",   "Haryana",   28.1990, 76.6200, 80,  90),
            ("Narnaul Bus Stand",           "Narnaul",  "Haryana",   28.0450, 76.1080, 140, 150),
            ("Alwar Bus Stand",             "Alwar",    "Rajasthan", 27.5530, 76.6346, 180, 190),
            ("Shahpura Bus Stand",          "Shahpura", "Rajasthan", 27.3920, 75.9590, 210, 215),
            ("Chomu Bus Stand",             "Chomu",    "Rajasthan", 27.1580, 75.7200, 245, 250),
            ("Jaipur Sindhi Camp",          "Jaipur",   "Rajasthan", 26.9124, 75.7873, 282, 310),
        ],
    },
    {
        "route_code": "VYG-HYD-GOA", "origin": "Hyderabad", "destination": "Goa",
        "distance_km": 658.0, "base_fare": 950.0,
        "stops": [
            ("Hyderabad Mahatma Gandhi Bus Stn", "Hyderabad",   "Telangana", 17.3756, 78.4801, 0,   0),
            ("Shadnagar Bus Stand",              "Shadnagar",   "Telangana", 17.0649, 78.2052, 55,  65),
            ("Kurnool Bus Station",              "Kurnool",     "AP",        15.8281, 78.0373, 215, 220),
            ("Mantralayam Road",                 "Mantralayam", "AP",        15.3786, 76.9380, 300, 310),
            ("Raichur Bus Stand",                "Raichur",     "Karnataka", 16.2014, 77.3566, 360, 370),
            ("Bijapur Bus Stand",                "Bijapur",     "Karnataka", 16.8302, 75.7100, 468, 480),
            ("Hubli Bus Station",                "Hubli",       "Karnataka", 15.3647, 75.1240, 540, 555),
            ("Dharwad Bus Stand",                "Dharwad",     "Karnataka", 15.4589, 75.0078, 560, 575),
            ("Belgaum Bus Station",              "Belgaum",     "Karnataka", 15.8497, 74.4977, 610, 625),
            ("Panjim Bus Stand",                 "Panaji",      "Goa",       15.4909, 73.8278, 658, 700),
        ],
    },
    {
        "route_code": "VYG-CHE-BAN", "origin": "Chennai", "destination": "Bangalore",
        "distance_km": 346.0, "base_fare": 700.0,
        "stops": [
            ("Chennai Koyambedu CMBT",   "Chennai",    "Tamil Nadu", 13.0694, 80.1948, 0,   0),
            ("Ambattur Bus Stand",       "Ambattur",   "Tamil Nadu", 13.1143, 80.1548, 22,  30),
            ("Vellore Bus Stand",        "Vellore",    "Tamil Nadu", 12.9165, 79.1324, 135, 140),
            ("Krishnagiri Bus Station",  "Krishnagiri","Tamil Nadu", 12.5266, 78.2137, 200, 205),
            ("Hosur Bus Stand",          "Hosur",      "Tamil Nadu", 12.7440, 77.8316, 260, 265),
            ("Electronic City Bus Stop", "Bangalore",  "Karnataka",  12.8458, 77.6601, 310, 318),
            ("Silk Board Junction",      "Bangalore",  "Karnataka",  12.9175, 77.6229, 325, 328),
            ("Bangalore Majestic",       "Bangalore",  "Karnataka",  12.9769, 77.5713, 346, 360),
        ],
    },
    {
        "route_code": "VYG-MUM-GOA", "origin": "Mumbai", "destination": "Goa",
        "distance_km": 594.0, "base_fare": 900.0,
        "stops": [
            ("Mumbai Central Bus Depot",  "Mumbai",     "Maharashtra", 19.0760, 72.8777, 0,   0),
            ("Panvel Bus Stand",          "Panvel",     "Maharashtra", 18.9941, 73.1109, 55,  65),
            ("Pen Bus Stand",             "Pen",        "Maharashtra", 18.7384, 73.0983, 85,  95),
            ("Mahad Bus Stand",           "Mahad",      "Maharashtra", 18.0785, 73.4157, 185, 190),
            ("Chiplun Bus Stand",         "Chiplun",    "Maharashtra", 17.5357, 73.5151, 280, 285),
            ("Ratnagiri Bus Station",     "Ratnagiri",  "Maharashtra", 16.9902, 73.3120, 360, 367),
            ("Kudal Bus Stand",           "Kudal",      "Maharashtra", 16.0089, 73.6886, 480, 488),
            ("Sawantwadi Bus Stand",      "Sawantwadi", "Maharashtra", 15.9053, 73.8237, 520, 528),
            ("Mapusa Bus Stand",          "Mapusa",     "Goa",         15.5920, 73.8149, 565, 578),
            ("Panjim Bus Stand",          "Panaji",     "Goa",         15.4909, 73.8278, 594, 600),
        ],
    },
    {
        "route_code": "VYG-DEL-AGR", "origin": "Delhi", "destination": "Agra",
        "distance_km": 233.0, "base_fare": 550.0,
        "stops": [
            ("Delhi Sarai Kale Khan ISBT", "Delhi",      "Delhi",   28.6139, 77.2090, 0,   0),
            ("Faridabad Bus Stand",        "Faridabad",  "Haryana", 28.4089, 77.3178, 32,  40),
            ("Ballabhgarh Depot",          "Ballabhgarh","Haryana", 28.3408, 77.3236, 45,  55),
            ("Palwal Bus Stand",           "Palwal",     "Haryana", 28.1463, 77.3296, 82,  95),
            ("Hodal Bus Stand",            "Hodal",      "Haryana", 27.8960, 77.3730, 110, 120),
            ("Kosi Kalan Bus Stand",       "Kosi Kalan", "UP",      27.7950, 77.4430, 140, 150),
            ("Mathura Bus Stand",          "Mathura",    "UP",      27.4924, 77.6737, 178, 190),
            ("Vrindavan Crossing",         "Vrindavan",  "UP",      27.5712, 77.6968, 192, 200),
            ("Agra Idgah Bus Stand",       "Agra",       "UP",      27.1767, 78.0081, 233, 260),
        ],
    },
]

BUS_FLEET = [
    ("VYG-MH-001", "Volvo 9400XL",    45, "AC Sleeper",  280000),
    ("VYG-MH-002", "Volvo 9400XL",    45, "AC Sleeper",  195000),
    ("VYG-KA-001", "Volvo B11R",      40, "AC Seater",   312000),
    ("VYG-KA-002", "Volvo B11R",      40, "AC Seater",   88000),
    ("VYG-DL-001", "Scania Metrolink",48, "AC Sleeper",  220000),
    ("VYG-DL-002", "Ashok Leyland",   52, "Non-AC",      410000),
    ("VYG-TN-001", "Volvo 9400XL",    45, "AC Sleeper",  156000),
    ("VYG-TN-002", "Volvo B9R",       40, "AC Seater",   98000),
    ("VYG-TS-001", "Mercedes Benz",   44, "AC Sleeper",  178000),
    ("VYG-GJ-001", "Scania K410",     46, "AC Seater",   240000),
]


def seed():
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()
        print("Tables created.")

        # Buses
        buses = []
        for reg, model, seats, btype, mileage in BUS_FLEET:
            b = Bus(registration=reg, model=model, total_seats=seats,
                    bus_type=btype, mileage_km=mileage,
                    last_service=date.today() - timedelta(days=random.randint(10, 120)))
            db.session.add(b)
            buses.append(b)
        db.session.flush()
        print(f"  {len(buses)} buses added.")

        # Crew
        crew_members = []
        for i, (fn, ln, role, lic, ph, base) in enumerate(CREW_DATA):
            emp_id = f"VYG-EMP-{i+1:04d}"
            email  = f"{fn.lower()}.{ln.lower()}@voyageai.in"
            cm = CrewMember(
                employee_id=emp_id, first_name=fn, last_name=ln,
                role=role, license_no=lic, phone=ph, email=email,
                base_location=base,
                joining_date=date(2018, 1, 1) + timedelta(days=random.randint(0, 2000)),
            )
            db.session.add(cm)
            crew_members.append(cm)
        db.session.flush()
        print(f"  {len(crew_members)} crew members added.")

        # Stops + Routes
        stop_cache: dict[str, Stop] = {}
        route_objs = []
        for rd in ROUTES:
            dur = round(rd["distance_km"] / 60 + 1.5, 1)
            r = Route(route_code=rd["route_code"], origin=rd["origin"],
                      destination=rd["destination"], distance_km=rd["distance_km"],
                      duration_hrs=dur, base_fare=rd["base_fare"])
            db.session.add(r)
            db.session.flush()
            for seq, (sname, city, state, lat, lon, dist, arr_off) in enumerate(rd["stops"]):
                key = sname
                if key not in stop_cache:
                    s = Stop(stop_code=f"S-{len(stop_cache)+1:04d}",
                             name=sname, city=city, state=state,
                             latitude=lat, longitude=lon,
                             is_major=(seq == 0 or seq == len(rd["stops"])-1))
                    db.session.add(s)
                    db.session.flush()
                    stop_cache[key] = s
                rs = RouteStop(route_id=r.id, stop_id=stop_cache[key].id,
                               sequence=seq, distance_from_origin_km=dist,
                               arrival_offset_min=arr_off)
                db.session.add(rs)
            route_objs.append(r)
        db.session.flush()
        print(f"  {len(route_objs)} routes + {len(stop_cache)} stops added.")

        # Trips - Day 0 = today for past analytics, days 1-13 = future for booking
        DEPARTURE_HOURS = [6, 8, 10, 14, 16, 20, 22]
        trips_created = []
        last_trip_per_route: dict[int, datetime] = {}
        now = datetime.utcnow()
        day_zero = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # FIX 1: Single clean for loop - no duplicate line
        for day_offset in range(14):
            day_start = day_zero + timedelta(days=day_offset)
            for route in route_objs:
                bus = random.choice(buses)
                for dep_hour in DEPARTURE_HOURS:
                    dep_time = day_start.replace(hour=dep_hour, minute=0)

                    # 5-hour same-route gap rule
                    last = last_trip_per_route.get(route.id)
                    if last and (dep_time - last).total_seconds() < 5 * 3600:
                        continue

                    arr_time = dep_time + timedelta(hours=route.duration_hrs)
                    fare_a   = route.base_fare
                    fare_c   = round(fare_a * 0.6, 0)
                    code     = f"{route.route_code}-{dep_time.strftime('%Y%m%d%H%M')}"

                    t = Trip(trip_code=code, route_id=route.id, bus_id=bus.id,
                             departure_time=dep_time, arrival_time=arr_time,
                             seats_total=bus.total_seats,
                             fare_adult=fare_a, fare_child=fare_c)
                    db.session.add(t)
                    db.session.flush()
                    trips_created.append(t)
                    last_trip_per_route[route.id] = dep_time

                    # Crew assignment by distance tier
                    dist = route.distance_km
                    if dist <= 750:
                        required = {"Driver": 1, "Co-Driver": 1, "Conductor": 1, "Attendant": 1}
                    elif dist <= 900:
                        required = {"Driver": 1, "Co-Driver": 1, "Conductor": 2,
                                    "Attendant": 1, "Guard": 1}
                    else:
                        required = {"Driver": 2, "Co-Driver": 1, "Conductor": 2,
                                    "Attendant": 2, "Guard": 1}

                    used_ids = set()
                    for role, count in required.items():
                        candidates = [c for c in crew_members
                                      if c.role == role
                                      and c.id not in used_ids
                                      and c.is_rested(dep_time)]
                        chosen = random.sample(candidates, min(count, len(candidates)))
                        for cm in chosen:
                            tc = TripCrew(trip_id=t.id, crew_member_id=cm.id,
                                          role_on_trip=role)
                            db.session.add(tc)
                            used_ids.add(cm.id)
                            cm.last_duty_end = arr_time
                            cm.total_trips  += 1
                            cm.total_hours  += route.duration_hrs
                            # FIX 2: Set status during assignment
                            cm.status = "on_duty"

        db.session.flush()
        print(f"  {len(trips_created)} trips created.")

        # Passengers
        PASS_DATA = [
            ("Arjun",   "Kapoor",   "arjun.kapoor@gmail.com",    "9900001001"),
            ("Priya",   "Sharma",   "priya.sharma@gmail.com",    "9900001002"),
            ("Ravi",    "Menon",    "ravi.menon@gmail.com",      "9900001003"),
            ("Sunita",  "Desai",    "sunita.desai@gmail.com",    "9900001004"),
            ("Kiran",   "Rao",      "kiran.rao@gmail.com",       "9900001005"),
            ("Deepak",  "Malhotra", "deepak.malhotra@gmail.com", "9900001006"),
            ("Nisha",   "Iyer",     "nisha.iyer@gmail.com",      "9900001007"),
            ("Arun",    "Bose",     "arun.bose@gmail.com",       "9900001008"),
            ("Lakshmi", "Pillai",   "lakshmi.pillai@gmail.com",  "9900001009"),
            ("Varun",   "Chopra",   "varun.chopra@gmail.com",    "9900001010"),
        ]
        pass_objs = []
        for fn, ln, em, ph in PASS_DATA:
            p = Passenger(first_name=fn, last_name=ln, email=em, phone=ph,
                          password_hash=generate_password_hash("password123"))
            db.session.add(p)
            pass_objs.append(p)
        db.session.flush()

        # Classify trips by time window
        past_trips       = [t for t in trips_created if t.arrival_time < now]
        inprogress_trips = [t for t in trips_created
                            if t.departure_time <= now < t.arrival_time]
        future_trips     = [t for t in trips_created if t.departure_time > now]

        booking_count = 0

        # FIX 3: Bookings for ALL past trips (removed [:60] cap)
        for trip in past_trips:
            n = random.randint(int(trip.seats_total * 0.4),
                               int(trip.seats_total * 0.95))
            seats_used = set()
            while len(seats_used) < n:
                seats_used.add(random.randint(1, trip.seats_total))
            seats_list    = sorted(seats_used)
            per_booking   = random.randint(1, 3)
            i = 0
            while i < len(seats_list):
                batch    = seats_list[i:i+per_booking]
                p        = random.choice(pass_objs)
                adults   = len(batch)
                children = 0
                if adults > 1 and random.random() < 0.3:
                    children = 1
                    adults  -= 1
                fare = adults * trip.fare_adult + children * trip.fare_child
                ref  = f"VYG{random.randint(1000000, 9999999)}"
                b    = Booking(booking_ref=ref, trip_id=trip.id,
                               passenger_id=p.id,
                               passenger_name=p.full_name,
                               passenger_email=p.email,
                               passenger_phone=p.phone,
                               seat_numbers=",".join(str(s) for s in batch),
                               num_adults=adults, num_children=children,
                               total_fare=fare, status="completed")
                db.session.add(b)
                trip.seats_booked  += len(batch)
                trip.total_revenue += fare
                p.total_bookings   += 1
                p.total_spent      += fare
                i += per_booking
                booking_count += 1

        # FIX 4: Bookings for in-progress trips too
        for trip in inprogress_trips:
            n = random.randint(int(trip.seats_total * 0.5),
                               int(trip.seats_total * 0.85))
            seats_used = set()
            while len(seats_used) < n:
                seats_used.add(random.randint(1, trip.seats_total))
            seats_list  = sorted(seats_used)
            per_booking = random.randint(1, 2)
            i = 0
            while i < len(seats_list):
                batch  = seats_list[i:i+per_booking]
                p      = random.choice(pass_objs)
                adults = len(batch)
                fare   = adults * trip.fare_adult
                ref    = f"VYG{random.randint(1000000, 9999999)}"
                b      = Booking(booking_ref=ref, trip_id=trip.id,
                                 passenger_id=p.id,
                                 passenger_name=p.full_name,
                                 passenger_email=p.email,
                                 passenger_phone=p.phone,
                                 seat_numbers=",".join(str(s) for s in batch),
                                 num_adults=adults, num_children=0,
                                 total_fare=fare, status="confirmed")
                db.session.add(b)
                trip.seats_booked  += len(batch)
                trip.total_revenue += fare
                p.total_bookings   += 1
                p.total_spent      += fare
                i += per_booking
                booking_count += 1

        # FIX 5: Correct trip statuses
        for t in past_trips:
            t.status = "completed"
        for t in inprogress_trips:
            t.status = "in_progress"
        # future_trips stay as "scheduled" (default)

        # FIX 6: Correct crew statuses after all trips are assigned
        # crew on in_progress trips  -> on_duty
        # crew on only past trips    -> available
        # crew with no assignments   -> available
        for cm in crew_members:
            has_inprogress = any(
                tc.trip.status == "in_progress"
                for tc in cm.assignments
            )
            cm.status = "on_duty" if has_inprogress else "available"

        db.session.flush()
        print(f"  {booking_count} bookings created.")
        print(f"  Completed: {len(past_trips)} | "
              f"In-progress: {len(inprogress_trips)} | "
              f"Scheduled: {len(future_trips)}")

        # KPI Log
        for trip in past_trips:
            if trip.seats_total > 0:
                lf = trip.seats_booked / trip.seats_total * 100
                db.session.add(KPILog(trip_id=trip.id, route_id=trip.route_id,
                                      bus_id=trip.bus_id, metric_name="load_factor",
                                      metric_value=lf))
                db.session.add(KPILog(trip_id=trip.id, route_id=trip.route_id,
                                      bus_id=trip.bus_id, metric_name="revenue",
                                      metric_value=trip.total_revenue))

        db.session.commit()
        print("Seed complete.")

        on_duty   = sum(1 for c in crew_members if c.status == "on_duty")
        available = sum(1 for c in crew_members if c.status == "available")
        print(f"\nSummary: {len(buses)} buses | {len(crew_members)} crew "
              f"({on_duty} on_duty, {available} available) | "
              f"{len(route_objs)} routes | {len(trips_created)} trips | "
              f"{booking_count} bookings")


if __name__ == "__main__":
    seed()