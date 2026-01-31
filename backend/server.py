from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'aircabio_secret_key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Aircabio Airport Transfers API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: str = "customer"
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class VehicleCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    max_passengers: int
    max_luggage: int
    image_url: Optional[str] = None
    features: List[str] = []
    is_active: bool = True

class PricingRule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vehicle_category_id: str
    base_fee: float = 0.0
    per_mile_rate: float = 2.5
    per_km_rate: float = 1.55
    minimum_fare: float = 25.0
    airport_surcharge: float = 10.0
    meet_greet_fee: float = 15.0
    night_surcharge_percent: float = 20.0
    currency: str = "GBP"

class FixedRoute(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    pickup_location: str
    dropoff_location: str
    prices: Dict[str, float] = {}  # vehicle_category_id: price
    is_active: bool = True

class BookingCreate(BaseModel):
    pickup_location: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dropoff_location: str
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None
    pickup_date: str
    pickup_time: str
    passengers: int
    luggage: int
    vehicle_category_id: str
    flight_number: Optional[str] = None
    meet_greet: bool = False
    pickup_notes: Optional[str] = None
    dropoff_notes: Optional[str] = None
    passenger_name: str
    passenger_email: EmailStr
    passenger_phone: str
    distance_km: Optional[float] = None
    duration_minutes: Optional[int] = None
    price: float
    currency: str = "GBP"
    payment_method: str = "stripe"

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pickup_location: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dropoff_location: str
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None
    pickup_date: str
    pickup_time: str
    passengers: int
    luggage: int
    vehicle_category_id: str
    vehicle_name: Optional[str] = None
    flight_number: Optional[str] = None
    meet_greet: bool = False
    pickup_notes: Optional[str] = None
    dropoff_notes: Optional[str] = None
    passenger_name: str
    passenger_email: str
    passenger_phone: str
    user_id: Optional[str] = None
    distance_km: Optional[float] = None
    duration_minutes: Optional[int] = None
    price: float
    currency: str = "GBP"
    status: str = "pending"  # pending, confirmed, assigned, completed, cancelled
    payment_status: str = "pending"  # pending, paid, refunded
    payment_session_id: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    customer_source: str = "website"

class BookingUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    pickup_notes: Optional[str] = None
    dropoff_notes: Optional[str] = None

class QuoteRequest(BaseModel):
    pickup_location: str
    dropoff_location: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None
    distance_km: float
    passengers: int
    luggage: int
    meet_greet: bool = False
    is_airport_pickup: bool = False

class VehicleQuote(BaseModel):
    vehicle_category_id: str
    vehicle_name: str
    price: float
    currency: str
    max_passengers: int
    max_luggage: int
    features: List[str]
    image_url: Optional[str]

class QuoteResponse(BaseModel):
    quotes: List[VehicleQuote]
    distance_km: float
    duration_minutes: int

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def get_optional_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except:
        return None

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "phone": user_data.phone,
        "role": "customer",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, "customer")
    user_response = UserResponse(
        id=user_id, email=user_data.email, name=user_data.name,
        phone=user_data.phone, role="customer", created_at=user_doc["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["role"])
    user_response = UserResponse(
        id=user["id"], email=user["email"], name=user["name"],
        phone=user.get("phone"), role=user["role"], created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"], email=user["email"], name=user["name"],
        phone=user.get("phone"), role=user["role"], created_at=user["created_at"]
    )

# ==================== VEHICLE ROUTES ====================

@api_router.get("/vehicles", response_model=List[VehicleCategory])
async def get_vehicles():
    vehicles = await db.vehicles.find({"is_active": True}, {"_id": 0}).to_list(100)
    return vehicles

@api_router.get("/vehicles/{vehicle_id}", response_model=VehicleCategory)
async def get_vehicle(vehicle_id: str):
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

@api_router.post("/admin/vehicles", response_model=VehicleCategory)
async def create_vehicle(vehicle: VehicleCategory, user: dict = Depends(get_admin_user)):
    await db.vehicles.insert_one(vehicle.model_dump())
    return vehicle

@api_router.put("/admin/vehicles/{vehicle_id}", response_model=VehicleCategory)
async def update_vehicle(vehicle_id: str, vehicle: VehicleCategory, user: dict = Depends(get_admin_user)):
    result = await db.vehicles.update_one({"id": vehicle_id}, {"$set": vehicle.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

@api_router.delete("/admin/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user: dict = Depends(get_admin_user)):
    result = await db.vehicles.delete_one({"id": vehicle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle deleted"}

# ==================== PRICING ROUTES ====================

@api_router.get("/pricing", response_model=List[PricingRule])
async def get_pricing_rules():
    rules = await db.pricing_rules.find({}, {"_id": 0}).to_list(100)
    return rules

@api_router.post("/admin/pricing", response_model=PricingRule)
async def create_pricing_rule(rule: PricingRule, user: dict = Depends(get_admin_user)):
    await db.pricing_rules.insert_one(rule.model_dump())
    return rule

@api_router.put("/admin/pricing/{rule_id}", response_model=PricingRule)
async def update_pricing_rule(rule_id: str, rule: PricingRule, user: dict = Depends(get_admin_user)):
    result = await db.pricing_rules.update_one({"id": rule_id}, {"$set": rule.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    return rule

@api_router.delete("/admin/pricing/{rule_id}")
async def delete_pricing_rule(rule_id: str, user: dict = Depends(get_admin_user)):
    result = await db.pricing_rules.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    return {"message": "Pricing rule deleted"}

# ==================== FIXED ROUTES ====================

@api_router.get("/fixed-routes", response_model=List[FixedRoute])
async def get_fixed_routes():
    routes = await db.fixed_routes.find({"is_active": True}, {"_id": 0}).to_list(100)
    return routes

@api_router.post("/admin/fixed-routes", response_model=FixedRoute)
async def create_fixed_route(route: FixedRoute, user: dict = Depends(get_admin_user)):
    await db.fixed_routes.insert_one(route.model_dump())
    return route

@api_router.put("/admin/fixed-routes/{route_id}", response_model=FixedRoute)
async def update_fixed_route(route_id: str, route: FixedRoute, user: dict = Depends(get_admin_user)):
    result = await db.fixed_routes.update_one({"id": route_id}, {"$set": route.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fixed route not found")
    return route

@api_router.delete("/admin/fixed-routes/{route_id}")
async def delete_fixed_route(route_id: str, user: dict = Depends(get_admin_user)):
    result = await db.fixed_routes.delete_one({"id": route_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fixed route not found")
    return {"message": "Fixed route deleted"}

# ==================== QUOTE ROUTES ====================

@api_router.post("/quote", response_model=QuoteResponse)
async def get_quote(request: QuoteRequest):
    vehicles = await db.vehicles.find({"is_active": True}, {"_id": 0}).to_list(100)
    pricing_rules = await db.pricing_rules.find({}, {"_id": 0}).to_list(100)
    
    # Check for fixed route
    fixed_routes = await db.fixed_routes.find({"is_active": True}, {"_id": 0}).to_list(100)
    fixed_route_prices = None
    for route in fixed_routes:
        if (request.pickup_location.lower() in route["pickup_location"].lower() or 
            route["pickup_location"].lower() in request.pickup_location.lower()) and \
           (request.dropoff_location.lower() in route["dropoff_location"].lower() or
            route["dropoff_location"].lower() in request.dropoff_location.lower()):
            fixed_route_prices = route["prices"]
            break
    
    quotes = []
    for vehicle in vehicles:
        if vehicle["max_passengers"] < request.passengers or vehicle["max_luggage"] < request.luggage:
            continue
        
        # Find pricing rule for this vehicle
        rule = next((r for r in pricing_rules if r["vehicle_category_id"] == vehicle["id"]), None)
        
        if fixed_route_prices and vehicle["id"] in fixed_route_prices:
            price = fixed_route_prices[vehicle["id"]]
            currency = "GBP"
        elif rule:
            # Calculate mileage-based price
            price = rule["base_fee"] + (request.distance_km * rule["per_km_rate"])
            if request.is_airport_pickup:
                price += rule["airport_surcharge"]
            if request.meet_greet:
                price += rule["meet_greet_fee"]
            price = max(price, rule["minimum_fare"])
            currency = rule["currency"]
        else:
            # Default pricing
            price = 25.0 + (request.distance_km * 1.8)
            if request.meet_greet:
                price += 15.0
            if request.is_airport_pickup:
                price += 10.0
            currency = "GBP"
        
        quotes.append(VehicleQuote(
            vehicle_category_id=vehicle["id"],
            vehicle_name=vehicle["name"],
            price=round(price, 2),
            currency=currency,
            max_passengers=vehicle["max_passengers"],
            max_luggage=vehicle["max_luggage"],
            features=vehicle.get("features", []),
            image_url=vehicle.get("image_url")
        ))
    
    # Mock duration calculation (real implementation would use Google Maps)
    duration_minutes = int(request.distance_km * 2)  # Rough estimate
    
    return QuoteResponse(
        quotes=sorted(quotes, key=lambda x: x.price),
        distance_km=request.distance_km,
        duration_minutes=duration_minutes
    )

# ==================== BOOKING ROUTES ====================

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate, user: dict = Depends(get_optional_user)):
    vehicle = await db.vehicles.find_one({"id": booking_data.vehicle_category_id}, {"_id": 0})
    
    booking = Booking(
        **booking_data.model_dump(),
        vehicle_name=vehicle["name"] if vehicle else None,
        user_id=user["id"] if user else None
    )
    
    await db.bookings.insert_one(booking.model_dump())
    return booking

@api_router.get("/bookings", response_model=List[Booking])
async def get_user_bookings(user: dict = Depends(get_current_user)):
    bookings = await db.bookings.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return bookings

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str, user: dict = Depends(get_optional_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@api_router.put("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("user_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Booking cancelled"}

# ==================== ADMIN BOOKING ROUTES ====================

@api_router.get("/admin/bookings", response_model=List[Booking])
async def get_all_bookings(
    status: Optional[str] = None,
    date: Optional[str] = None,
    user: dict = Depends(get_admin_user)
):
    query = {}
    if status:
        query["status"] = status
    if date:
        query["pickup_date"] = date
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return bookings

@api_router.put("/admin/bookings/{booking_id}", response_model=Booking)
async def update_booking(booking_id: str, update: BookingUpdate, user: dict = Depends(get_admin_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return booking

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_admin_user)):
    total_bookings = await db.bookings.count_documents({})
    pending_bookings = await db.bookings.count_documents({"status": "pending"})
    confirmed_bookings = await db.bookings.count_documents({"status": "confirmed"})
    completed_bookings = await db.bookings.count_documents({"status": "completed"})
    cancelled_bookings = await db.bookings.count_documents({"status": "cancelled"})
    
    # Revenue calculation
    paid_bookings = await db.bookings.find({"payment_status": "paid"}, {"_id": 0, "price": 1}).to_list(1000)
    total_revenue = sum(b.get("price", 0) for b in paid_bookings)
    
    return {
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "confirmed_bookings": confirmed_bookings,
        "completed_bookings": completed_bookings,
        "cancelled_bookings": cancelled_bookings,
        "total_revenue": round(total_revenue, 2)
    }

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments/create-session")
async def create_payment_session(request: Request, booking_id: str):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Get frontend URL from request origin or construct from host
    frontend_url = request.headers.get("origin", host_url)
    success_url = f"{frontend_url}/booking/success?session_id={{CHECKOUT_SESSION_ID}}&booking_id={booking_id}"
    cancel_url = f"{frontend_url}/booking/cancel?booking_id={booking_id}"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(booking["price"]),
        currency=booking.get("currency", "gbp").lower(),
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "booking_id": booking_id,
            "passenger_email": booking["passenger_email"],
            "pickup_location": booking["pickup_location"],
            "dropoff_location": booking["dropoff_location"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "booking_id": booking_id,
        "amount": float(booking["price"]),
        "currency": booking.get("currency", "GBP"),
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Update booking with payment session ID
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"payment_session_id": session.session_id}}
    )
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str):
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update payment transaction and booking if paid
    if status.payment_status == "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        await db.bookings.update_one(
            {"payment_session_id": session_id},
            {"$set": {"payment_status": "paid", "status": "confirmed", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount": status.amount_total / 100,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            booking_id = webhook_response.metadata.get("booking_id")
            if booking_id:
                await db.bookings.update_one(
                    {"id": booking_id},
                    {"$set": {"payment_status": "paid", "status": "confirmed"}}
                )
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    # Seed vehicles
    vehicles = [
        VehicleCategory(
            id="sedan", name="Sedan", description="Comfortable sedan for up to 3 passengers",
            max_passengers=3, max_luggage=2,
            image_url="https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400",
            features=["Air Conditioning", "Leather Seats", "Free WiFi", "Bottled Water"]
        ),
        VehicleCategory(
            id="executive", name="Executive", description="Premium executive vehicle for business travelers",
            max_passengers=3, max_luggage=2,
            image_url="https://images.unsplash.com/photo-1563720360172-67b8f3dce741?w=400",
            features=["Air Conditioning", "Leather Seats", "Free WiFi", "Newspapers", "Bottled Water", "Phone Charger"]
        ),
        VehicleCategory(
            id="suv", name="SUV", description="Spacious SUV for families or groups",
            max_passengers=5, max_luggage=4,
            image_url="https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400",
            features=["Air Conditioning", "Leather Seats", "Free WiFi", "Extra Luggage Space"]
        ),
        VehicleCategory(
            id="mpv", name="MPV", description="Multi-purpose vehicle for larger groups",
            max_passengers=6, max_luggage=5,
            image_url="https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400",
            features=["Air Conditioning", "Spacious Interior", "Free WiFi", "Child Seats Available"]
        ),
        VehicleCategory(
            id="van", name="Van", description="Large van for groups with lots of luggage",
            max_passengers=8, max_luggage=8,
            image_url="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
            features=["Air Conditioning", "Maximum Space", "Free WiFi", "Wheelchair Accessible"]
        ),
        VehicleCategory(
            id="minibus", name="Minibus", description="Minibus for large groups",
            max_passengers=12, max_luggage=12,
            image_url="https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400",
            features=["Air Conditioning", "PA System", "Free WiFi", "USB Charging"]
        )
    ]
    
    for v in vehicles:
        await db.vehicles.update_one({"id": v.id}, {"$set": v.model_dump()}, upsert=True)
    
    # Seed pricing rules
    pricing_rules = [
        PricingRule(id="pr-sedan", vehicle_category_id="sedan", base_fee=5.0, per_km_rate=1.5, minimum_fare=25.0),
        PricingRule(id="pr-executive", vehicle_category_id="executive", base_fee=10.0, per_km_rate=2.0, minimum_fare=35.0),
        PricingRule(id="pr-suv", vehicle_category_id="suv", base_fee=8.0, per_km_rate=1.8, minimum_fare=30.0),
        PricingRule(id="pr-mpv", vehicle_category_id="mpv", base_fee=10.0, per_km_rate=2.0, minimum_fare=40.0),
        PricingRule(id="pr-van", vehicle_category_id="van", base_fee=15.0, per_km_rate=2.2, minimum_fare=50.0),
        PricingRule(id="pr-minibus", vehicle_category_id="minibus", base_fee=25.0, per_km_rate=2.5, minimum_fare=75.0)
    ]
    
    for p in pricing_rules:
        await db.pricing_rules.update_one({"id": p.id}, {"$set": p.model_dump()}, upsert=True)
    
    # Seed fixed routes
    fixed_routes = [
        FixedRoute(
            id="lhr-central", name="Heathrow to Central London",
            pickup_location="Heathrow Airport", dropoff_location="Central London",
            prices={"sedan": 55.0, "executive": 75.0, "suv": 70.0, "mpv": 85.0, "van": 95.0, "minibus": 150.0}
        ),
        FixedRoute(
            id="lgw-central", name="Gatwick to Central London",
            pickup_location="Gatwick Airport", dropoff_location="Central London",
            prices={"sedan": 65.0, "executive": 85.0, "suv": 80.0, "mpv": 95.0, "van": 110.0, "minibus": 170.0}
        ),
        FixedRoute(
            id="stn-central", name="Stansted to Central London",
            pickup_location="Stansted Airport", dropoff_location="Central London",
            prices={"sedan": 75.0, "executive": 95.0, "suv": 90.0, "mpv": 105.0, "van": 120.0, "minibus": 190.0}
        )
    ]
    
    for r in fixed_routes:
        await db.fixed_routes.update_one({"id": r.id}, {"$set": r.model_dump()}, upsert=True)
    
    # Create admin user if not exists
    admin_exists = await db.users.find_one({"email": "admin@aircabio.com"})
    if not admin_exists:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@aircabio.com",
            "password": hash_password("admin123"),
            "name": "Admin User",
            "phone": "+44 20 1234 5678",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
    
    return {"message": "Seed data created successfully"}

@api_router.get("/")
async def root():
    return {"message": "Aircabio Airport Transfers API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
