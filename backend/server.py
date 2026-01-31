from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
import io

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

# User roles: super_admin, fleet_admin, driver, customer
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
    fleet_id: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Fleet Model
class FleetCreate(BaseModel):
    name: str
    contact_person: str
    email: EmailStr
    phone: str
    whatsapp: Optional[str] = None
    city: str
    operating_area: Optional[str] = None
    commission_type: str = "percentage"  # percentage or fixed
    commission_value: float = 15.0  # 15% or £15
    payment_terms: str = "weekly"  # weekly, biweekly, monthly
    notes: Optional[str] = None

class Fleet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    contact_person: str
    email: str
    phone: str
    whatsapp: Optional[str] = None
    city: str
    operating_area: Optional[str] = None
    commission_type: str = "percentage"
    commission_value: float = 15.0
    payment_terms: str = "weekly"
    notes: Optional[str] = None
    status: str = "active"  # active, suspended
    password: Optional[str] = None  # For fleet login
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class FleetUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    city: Optional[str] = None
    operating_area: Optional[str] = None
    commission_type: Optional[str] = None
    commission_value: Optional[float] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

# Driver Model
class DriverCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    license_number: str
    license_expiry: Optional[str] = None
    fleet_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    notes: Optional[str] = None

class Driver(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    license_number: str
    license_expiry: Optional[str] = None
    fleet_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    notes: Optional[str] = None
    status: str = "active"  # active, inactive, suspended
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    fleet_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

# Fleet Vehicle Model
class FleetVehicleCreate(BaseModel):
    plate_number: str
    category_id: str  # sedan, executive, etc.
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    fleet_id: Optional[str] = None
    notes: Optional[str] = None

class FleetVehicle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    plate_number: str
    category_id: str
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    fleet_id: Optional[str] = None
    notes: Optional[str] = None
    status: str = "active"  # active, inactive, maintenance
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Invoice Model
class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    invoice_type: str  # customer, fleet, driver
    entity_id: str  # customer_id, fleet_id, or driver_id
    entity_name: str
    entity_email: str
    booking_ids: List[str] = []
    subtotal: float
    commission: float = 0.0
    tax: float = 0.0
    total: float
    currency: str = "GBP"
    status: str = "draft"  # draft, issued, paid, overdue
    due_date: Optional[str] = None
    paid_date: Optional[str] = None
    notes: Optional[str] = None
    line_items: List[Dict] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    due_date: Optional[str] = None
    paid_date: Optional[str] = None

# Radius Zone for Fixed Pricing
class RadiusZone(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    center_lat: float
    center_lng: float
    radius_km: float
    zone_type: str = "pickup"  # pickup or dropoff

class RadiusRoute(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    pickup_zone_id: str
    dropoff_zone_id: str
    pickup_zone_name: Optional[str] = None
    dropoff_zone_name: Optional[str] = None
    prices: Dict[str, float] = {}  # vehicle_category_id: price
    night_surcharge_percent: float = 0.0
    airport_surcharge: float = 0.0
    meet_greet_fee: float = 0.0
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

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
    prices: Dict[str, float] = {}
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
    booking_ref: str = Field(default_factory=lambda: f"AC{str(uuid.uuid4())[:6].upper()}")
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
    status: str = "pending"  # pending, confirmed, assigned, accepted, in_progress, completed, cancelled
    payment_status: str = "pending"  # pending, paid, refunded
    payment_session_id: Optional[str] = None
    # Fleet assignment
    assigned_fleet_id: Optional[str] = None
    assigned_fleet_name: Optional[str] = None
    assigned_driver_id: Optional[str] = None
    assigned_driver_name: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None
    assigned_at: Optional[str] = None
    accepted_at: Optional[str] = None
    completed_at: Optional[str] = None
    # Invoice tracking
    customer_invoice_id: Optional[str] = None
    fleet_invoice_id: Optional[str] = None
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    customer_source: str = "website"

class BookingUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    pickup_notes: Optional[str] = None
    dropoff_notes: Optional[str] = None

class JobAssignment(BaseModel):
    fleet_id: str
    driver_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    notes: Optional[str] = None

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

def create_token(user_id: str, role: str, fleet_id: Optional[str] = None) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "fleet_id": fleet_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload["user_id"]
        role = payload.get("role")
        
        # For fleet_admin, look in fleets collection
        if role == "fleet_admin":
            fleet = await db.fleets.find_one({"id": user_id}, {"_id": 0, "password": 0})
            if fleet:
                # Return fleet data in user format
                return {
                    "id": fleet["id"],
                    "email": fleet["email"],
                    "name": fleet["name"],
                    "phone": fleet.get("phone"),
                    "role": "fleet_admin",
                    "fleet_id": fleet["id"],
                    "created_at": fleet["created_at"]
                }
        
        # For other roles, look in users collection
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_super_admin(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    if user.get("role") not in ["super_admin", "admin"]:  # Support both for backwards compatibility
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user

async def get_fleet_admin(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    if user.get("role") not in ["fleet_admin", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Fleet Admin access required")
    return user

async def get_admin_or_fleet(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    if user.get("role") not in ["super_admin", "admin", "fleet_admin"]:
        raise HTTPException(status_code=403, detail="Admin or Fleet access required")
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

# ==================== HELPER FUNCTIONS ====================

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points in km"""
    R = 6371  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def is_point_in_radius(point_lat: float, point_lng: float, center_lat: float, center_lng: float, radius_km: float) -> bool:
    """Check if a point is within a radius zone"""
    distance = haversine_distance(point_lat, point_lng, center_lat, center_lng)
    return distance <= radius_km

async def generate_invoice_number(invoice_type: str) -> str:
    """Generate unique invoice number"""
    prefix = {"customer": "INV-C", "fleet": "INV-F", "driver": "INV-D"}.get(invoice_type, "INV")
    count = await db.invoices.count_documents({"invoice_type": invoice_type})
    return f"{prefix}-{datetime.now().strftime('%Y%m')}-{str(count + 1).zfill(4)}"

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
        "fleet_id": None,
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
    
    token = create_token(user["id"], user["role"], user.get("fleet_id"))
    user_response = UserResponse(
        id=user["id"], email=user["email"], name=user["name"],
        phone=user.get("phone"), role=user["role"], fleet_id=user.get("fleet_id"),
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/fleet/login", response_model=TokenResponse)
async def fleet_login(credentials: UserLogin):
    """Login endpoint for fleet admins"""
    fleet = await db.fleets.find_one({"email": credentials.email}, {"_id": 0})
    if not fleet:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not fleet.get("password") or not verify_password(credentials.password, fleet["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if fleet.get("status") != "active":
        raise HTTPException(status_code=403, detail="Fleet account is suspended")
    
    token = create_token(fleet["id"], "fleet_admin", fleet["id"])
    user_response = UserResponse(
        id=fleet["id"], email=fleet["email"], name=fleet["name"],
        phone=fleet.get("phone"), role="fleet_admin", fleet_id=fleet["id"],
        created_at=fleet["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"], email=user["email"], name=user["name"],
        phone=user.get("phone"), role=user["role"], fleet_id=user.get("fleet_id"),
        created_at=user["created_at"]
    )

# ==================== FLEET ROUTES ====================

@api_router.get("/fleets", response_model=List[Fleet])
async def get_fleets(user: dict = Depends(get_super_admin)):
    fleets = await db.fleets.find({}, {"_id": 0, "password": 0}).to_list(100)
    return fleets

@api_router.get("/fleets/{fleet_id}")
async def get_fleet(fleet_id: str, user: dict = Depends(get_admin_or_fleet)):
    # Fleet admin can only view their own fleet
    if user.get("role") == "fleet_admin" and user.get("fleet_id") != fleet_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    fleet = await db.fleets.find_one({"id": fleet_id}, {"_id": 0, "password": 0})
    if not fleet:
        raise HTTPException(status_code=404, detail="Fleet not found")
    return fleet

@api_router.post("/fleets", response_model=Fleet)
async def create_fleet(fleet_data: FleetCreate, user: dict = Depends(get_super_admin)):
    # Generate password for fleet login
    default_password = f"fleet{str(uuid.uuid4())[:8]}"
    
    fleet = Fleet(
        **fleet_data.model_dump(),
        password=hash_password(default_password)
    )
    await db.fleets.insert_one(fleet.model_dump())
    
    # Return fleet with temporary password (only shown once)
    fleet_response = fleet.model_dump()
    fleet_response["temporary_password"] = default_password
    del fleet_response["password"]
    return fleet_response

@api_router.put("/fleets/{fleet_id}")
async def update_fleet(fleet_id: str, update: FleetUpdate, user: dict = Depends(get_super_admin)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.fleets.update_one({"id": fleet_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fleet not found")
    
    fleet = await db.fleets.find_one({"id": fleet_id}, {"_id": 0, "password": 0})
    return fleet

@api_router.post("/fleets/{fleet_id}/reset-password")
async def reset_fleet_password(fleet_id: str, user: dict = Depends(get_super_admin)):
    new_password = f"fleet{str(uuid.uuid4())[:8]}"
    
    result = await db.fleets.update_one(
        {"id": fleet_id},
        {"$set": {"password": hash_password(new_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fleet not found")
    
    return {"message": "Password reset successful", "temporary_password": new_password}

@api_router.delete("/fleets/{fleet_id}")
async def delete_fleet(fleet_id: str, user: dict = Depends(get_super_admin)):
    result = await db.fleets.delete_one({"id": fleet_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fleet not found")
    return {"message": "Fleet deleted"}

# ==================== DRIVER ROUTES ====================

@api_router.get("/drivers")
async def get_drivers(
    fleet_id: Optional[str] = None,
    user: dict = Depends(get_admin_or_fleet)
):
    query = {}
    # Fleet admin can only see their drivers
    if user.get("role") == "fleet_admin":
        query["fleet_id"] = user.get("fleet_id")
    elif fleet_id:
        query["fleet_id"] = fleet_id
    
    drivers = await db.drivers.find(query, {"_id": 0}).to_list(100)
    return drivers

@api_router.get("/drivers/{driver_id}")
async def get_driver(driver_id: str, user: dict = Depends(get_admin_or_fleet)):
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Fleet admin can only view their drivers
    if user.get("role") == "fleet_admin" and driver.get("fleet_id") != user.get("fleet_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return driver

@api_router.post("/drivers", response_model=Driver)
async def create_driver(driver_data: DriverCreate, user: dict = Depends(get_admin_or_fleet)):
    # Fleet admin can only create drivers for their fleet
    if user.get("role") == "fleet_admin":
        driver_data.fleet_id = user.get("fleet_id")
    
    driver = Driver(**driver_data.model_dump())
    await db.drivers.insert_one(driver.model_dump())
    return driver

@api_router.put("/drivers/{driver_id}")
async def update_driver(driver_id: str, update: DriverUpdate, user: dict = Depends(get_admin_or_fleet)):
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Fleet admin can only update their drivers
    if user.get("role") == "fleet_admin" and driver.get("fleet_id") != user.get("fleet_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    await db.drivers.update_one({"id": driver_id}, {"$set": update_data})
    
    return await db.drivers.find_one({"id": driver_id}, {"_id": 0})

@api_router.delete("/drivers/{driver_id}")
async def delete_driver(driver_id: str, user: dict = Depends(get_super_admin)):
    result = await db.drivers.delete_one({"id": driver_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    return {"message": "Driver deleted"}

# ==================== FLEET VEHICLE ROUTES ====================

@api_router.get("/fleet-vehicles")
async def get_fleet_vehicles(
    fleet_id: Optional[str] = None,
    user: dict = Depends(get_admin_or_fleet)
):
    query = {}
    if user.get("role") == "fleet_admin":
        query["fleet_id"] = user.get("fleet_id")
    elif fleet_id:
        query["fleet_id"] = fleet_id
    
    vehicles = await db.fleet_vehicles.find(query, {"_id": 0}).to_list(100)
    return vehicles

@api_router.post("/fleet-vehicles", response_model=FleetVehicle)
async def create_fleet_vehicle(vehicle_data: FleetVehicleCreate, user: dict = Depends(get_admin_or_fleet)):
    if user.get("role") == "fleet_admin":
        vehicle_data.fleet_id = user.get("fleet_id")
    
    vehicle = FleetVehicle(**vehicle_data.model_dump())
    await db.fleet_vehicles.insert_one(vehicle.model_dump())
    return vehicle

@api_router.put("/fleet-vehicles/{vehicle_id}")
async def update_fleet_vehicle(vehicle_id: str, update: dict, user: dict = Depends(get_admin_or_fleet)):
    vehicle = await db.fleet_vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    if user.get("role") == "fleet_admin" and vehicle.get("fleet_id") != user.get("fleet_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.fleet_vehicles.update_one({"id": vehicle_id}, {"$set": update})
    return await db.fleet_vehicles.find_one({"id": vehicle_id}, {"_id": 0})

@api_router.delete("/fleet-vehicles/{vehicle_id}")
async def delete_fleet_vehicle(vehicle_id: str, user: dict = Depends(get_super_admin)):
    result = await db.fleet_vehicles.delete_one({"id": vehicle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle deleted"}

# ==================== JOB ASSIGNMENT ROUTES ====================

@api_router.post("/bookings/{booking_id}/assign")
async def assign_booking_to_fleet(booking_id: str, assignment: JobAssignment, user: dict = Depends(get_super_admin)):
    """Assign a booking to a fleet"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    fleet = await db.fleets.find_one({"id": assignment.fleet_id}, {"_id": 0})
    if not fleet:
        raise HTTPException(status_code=404, detail="Fleet not found")
    
    update_data = {
        "assigned_fleet_id": assignment.fleet_id,
        "assigned_fleet_name": fleet["name"],
        "assigned_driver_id": assignment.driver_id,
        "assigned_vehicle_id": assignment.vehicle_id,
        "assigned_at": datetime.now(timezone.utc).isoformat(),
        "status": "assigned",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Get driver name if assigned
    if assignment.driver_id:
        driver = await db.drivers.find_one({"id": assignment.driver_id}, {"_id": 0})
        if driver:
            update_data["assigned_driver_name"] = driver["name"]
    
    await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    
    # Create notification for fleet (stored in notifications collection)
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "fleet_id": assignment.fleet_id,
        "type": "job_assigned",
        "booking_id": booking_id,
        "message": f"New job assigned: {booking['pickup_location']} → {booking['dropoff_location']}",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Booking assigned to fleet", "fleet_name": fleet["name"]}

@api_router.put("/bookings/{booking_id}/accept")
async def accept_job(booking_id: str, user: dict = Depends(get_fleet_admin)):
    """Fleet accepts an assigned job"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Verify fleet owns this assignment
    if booking.get("assigned_fleet_id") != user.get("fleet_id"):
        raise HTTPException(status_code=403, detail="This job is not assigned to your fleet")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "accepted",
            "accepted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Job accepted"}

@api_router.put("/bookings/{booking_id}/start")
async def start_job(booking_id: str, user: dict = Depends(get_fleet_admin)):
    """Fleet marks job as in progress"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.get("assigned_fleet_id") != user.get("fleet_id"):
        raise HTTPException(status_code=403, detail="This job is not assigned to your fleet")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "in_progress", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Job started"}

@api_router.put("/bookings/{booking_id}/complete")
async def complete_job(booking_id: str, user: dict = Depends(get_fleet_admin)):
    """Fleet marks job as completed"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.get("assigned_fleet_id") != user.get("fleet_id"):
        raise HTTPException(status_code=403, detail="This job is not assigned to your fleet")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Job completed"}

# ==================== FLEET DASHBOARD ROUTES ====================

@api_router.get("/fleet/jobs")
async def get_fleet_jobs(
    status: Optional[str] = None,
    user: dict = Depends(get_fleet_admin)
):
    """Get jobs assigned to the fleet"""
    query = {"assigned_fleet_id": user.get("fleet_id")}
    if status:
        query["status"] = status
    
    jobs = await db.bookings.find(query, {"_id": 0}).sort("pickup_date", 1).to_list(100)
    return jobs

@api_router.get("/fleet/stats")
async def get_fleet_stats(user: dict = Depends(get_fleet_admin)):
    """Get fleet dashboard statistics"""
    fleet_id = user.get("fleet_id")
    
    total_jobs = await db.bookings.count_documents({"assigned_fleet_id": fleet_id})
    new_jobs = await db.bookings.count_documents({"assigned_fleet_id": fleet_id, "status": "assigned"})
    accepted_jobs = await db.bookings.count_documents({"assigned_fleet_id": fleet_id, "status": "accepted"})
    in_progress_jobs = await db.bookings.count_documents({"assigned_fleet_id": fleet_id, "status": "in_progress"})
    completed_jobs = await db.bookings.count_documents({"assigned_fleet_id": fleet_id, "status": "completed"})
    
    # Calculate earnings
    completed = await db.bookings.find(
        {"assigned_fleet_id": fleet_id, "status": "completed"},
        {"_id": 0, "price": 1}
    ).to_list(1000)
    total_earnings = sum(b.get("price", 0) for b in completed)
    
    # Get fleet commission info
    fleet = await db.fleets.find_one({"id": fleet_id}, {"_id": 0})
    if fleet:
        if fleet.get("commission_type") == "percentage":
            net_earnings = total_earnings * (1 - fleet.get("commission_value", 15) / 100)
        else:
            net_earnings = total_earnings - (completed_jobs * fleet.get("commission_value", 15))
    else:
        net_earnings = total_earnings
    
    return {
        "total_jobs": total_jobs,
        "new_jobs": new_jobs,
        "accepted_jobs": accepted_jobs,
        "in_progress_jobs": in_progress_jobs,
        "completed_jobs": completed_jobs,
        "total_earnings": round(total_earnings, 2),
        "net_earnings": round(net_earnings, 2)
    }

@api_router.get("/fleet/notifications")
async def get_fleet_notifications(user: dict = Depends(get_fleet_admin)):
    """Get fleet notifications"""
    notifications = await db.notifications.find(
        {"fleet_id": user.get("fleet_id")},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return notifications

@api_router.put("/fleet/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_fleet_admin)):
    await db.notifications.update_one(
        {"id": notification_id, "fleet_id": user.get("fleet_id")},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

# ==================== INVOICE ROUTES ====================

@api_router.get("/invoices")
async def get_invoices(
    invoice_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_admin_or_fleet)
):
    query = {}
    
    # Fleet admin can only see their invoices
    if user.get("role") == "fleet_admin":
        query["entity_id"] = user.get("fleet_id")
        query["invoice_type"] = "fleet"
    else:
        if invoice_type:
            query["invoice_type"] = invoice_type
        if entity_id:
            query["entity_id"] = entity_id
    
    if status:
        query["status"] = status
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return invoices

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: dict = Depends(get_admin_or_fleet)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Fleet admin can only view their invoices
    if user.get("role") == "fleet_admin" and invoice.get("entity_id") != user.get("fleet_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return invoice

@api_router.post("/invoices/generate")
async def generate_invoice(
    invoice_type: str,
    entity_id: str,
    booking_ids: List[str],
    user: dict = Depends(get_super_admin)
):
    """Generate an invoice for customer, fleet, or driver"""
    # Get bookings
    bookings = await db.bookings.find({"id": {"$in": booking_ids}}, {"_id": 0}).to_list(100)
    if not bookings:
        raise HTTPException(status_code=400, detail="No valid bookings found")
    
    # Get entity details
    if invoice_type == "customer":
        # Use first booking's customer info
        entity_name = bookings[0]["passenger_name"]
        entity_email = bookings[0]["passenger_email"]
        subtotal = sum(b["price"] for b in bookings)
        commission = 0
    elif invoice_type == "fleet":
        fleet = await db.fleets.find_one({"id": entity_id}, {"_id": 0})
        if not fleet:
            raise HTTPException(status_code=404, detail="Fleet not found")
        entity_name = fleet["name"]
        entity_email = fleet["email"]
        subtotal = sum(b["price"] for b in bookings)
        if fleet.get("commission_type") == "percentage":
            commission = subtotal * (fleet.get("commission_value", 15) / 100)
        else:
            commission = len(bookings) * fleet.get("commission_value", 15)
    elif invoice_type == "driver":
        driver = await db.drivers.find_one({"id": entity_id}, {"_id": 0})
        if not driver:
            raise HTTPException(status_code=404, detail="Driver not found")
        entity_name = driver["name"]
        entity_email = driver["email"]
        subtotal = sum(b["price"] for b in bookings)
        commission = 0
    else:
        raise HTTPException(status_code=400, detail="Invalid invoice type")
    
    # Create line items
    line_items = []
    for b in bookings:
        line_items.append({
            "booking_id": b["id"],
            "booking_ref": b.get("booking_ref", b["id"][:8].upper()),
            "description": f"{b['pickup_location']} → {b['dropoff_location']}",
            "date": b["pickup_date"],
            "amount": b["price"]
        })
    
    # Calculate total
    total = subtotal - commission if invoice_type == "fleet" else subtotal
    
    # Create invoice
    invoice = Invoice(
        invoice_number=await generate_invoice_number(invoice_type),
        invoice_type=invoice_type,
        entity_id=entity_id,
        entity_name=entity_name,
        entity_email=entity_email,
        booking_ids=booking_ids,
        subtotal=round(subtotal, 2),
        commission=round(commission, 2),
        total=round(total, 2),
        line_items=line_items,
        due_date=(datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    )
    
    await db.invoices.insert_one(invoice.model_dump())
    
    # Update bookings with invoice reference
    invoice_field = f"{invoice_type}_invoice_id"
    await db.bookings.update_many(
        {"id": {"$in": booking_ids}},
        {"$set": {invoice_field: invoice.id}}
    )
    
    return invoice

@api_router.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, update: InvoiceUpdate, user: dict = Depends(get_super_admin)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return await db.invoices.find_one({"id": invoice_id}, {"_id": 0})

@api_router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, user: dict = Depends(get_admin_or_fleet)):
    """Generate and download invoice as PDF"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Fleet admin can only download their invoices
    if user.get("role") == "fleet_admin" and invoice.get("entity_id") != user.get("fleet_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate simple HTML invoice (in production, use a PDF library)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; padding: 40px; }}
            .header {{ text-align: center; margin-bottom: 40px; }}
            .logo {{ font-size: 24px; font-weight: bold; }}
            .invoice-details {{ margin-bottom: 30px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
            th {{ background: #f5f5f5; }}
            .total-row {{ font-weight: bold; background: #f0f0f0; }}
            .footer {{ margin-top: 40px; text-align: center; color: #666; }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">AIRCABIO</div>
            <p>Airport Transfer Services</p>
        </div>
        
        <div class="invoice-details">
            <h2>Invoice #{invoice['invoice_number']}</h2>
            <p><strong>To:</strong> {invoice['entity_name']}</p>
            <p><strong>Email:</strong> {invoice['entity_email']}</p>
            <p><strong>Date:</strong> {invoice['created_at'][:10]}</p>
            <p><strong>Due Date:</strong> {invoice.get('due_date', 'N/A')[:10] if invoice.get('due_date') else 'N/A'}</p>
            <p><strong>Status:</strong> {invoice['status'].upper()}</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Booking Ref</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for item in invoice.get('line_items', []):
        html_content += f"""
                <tr>
                    <td>{item.get('booking_ref', 'N/A')}</td>
                    <td>{item.get('description', 'N/A')}</td>
                    <td>{item.get('date', 'N/A')}</td>
                    <td>£{item.get('amount', 0):.2f}</td>
                </tr>
        """
    
    html_content += f"""
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" style="text-align: right;"><strong>Subtotal:</strong></td>
                    <td>£{invoice['subtotal']:.2f}</td>
                </tr>
    """
    
    if invoice.get('commission', 0) > 0:
        html_content += f"""
                <tr>
                    <td colspan="3" style="text-align: right;"><strong>Commission:</strong></td>
                    <td>-£{invoice['commission']:.2f}</td>
                </tr>
        """
    
    html_content += f"""
                <tr class="total-row">
                    <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
                    <td>£{invoice['total']:.2f}</td>
                </tr>
            </tfoot>
        </table>
        
        <div class="footer">
            <p>Thank you for your business!</p>
            <p>Aircabio | info@aircabio.com | +44 20 1234 5678</p>
        </div>
    </body>
    </html>
    """
    
    return StreamingResponse(
        io.BytesIO(html_content.encode()),
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename=invoice_{invoice['invoice_number']}.html"}
    )

# ==================== RADIUS ZONE ROUTES ====================

@api_router.get("/radius-zones")
async def get_radius_zones(user: dict = Depends(get_super_admin)):
    zones = await db.radius_zones.find({}, {"_id": 0}).to_list(100)
    return zones

@api_router.post("/radius-zones", response_model=RadiusZone)
async def create_radius_zone(zone: RadiusZone, user: dict = Depends(get_super_admin)):
    await db.radius_zones.insert_one(zone.model_dump())
    return zone

@api_router.put("/radius-zones/{zone_id}")
async def update_radius_zone(zone_id: str, zone: RadiusZone, user: dict = Depends(get_super_admin)):
    result = await db.radius_zones.update_one({"id": zone_id}, {"$set": zone.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone

@api_router.delete("/radius-zones/{zone_id}")
async def delete_radius_zone(zone_id: str, user: dict = Depends(get_super_admin)):
    result = await db.radius_zones.delete_one({"id": zone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Zone not found")
    return {"message": "Zone deleted"}

# ==================== RADIUS ROUTE ROUTES ====================

@api_router.get("/radius-routes")
async def get_radius_routes(user: dict = Depends(get_super_admin)):
    routes = await db.radius_routes.find({}, {"_id": 0}).to_list(100)
    # Enrich with zone names
    zones = {z["id"]: z for z in await db.radius_zones.find({}, {"_id": 0}).to_list(100)}
    for route in routes:
        pickup_zone = zones.get(route.get("pickup_zone_id"))
        dropoff_zone = zones.get(route.get("dropoff_zone_id"))
        route["pickup_zone_name"] = pickup_zone["name"] if pickup_zone else "Unknown"
        route["dropoff_zone_name"] = dropoff_zone["name"] if dropoff_zone else "Unknown"
    return routes

@api_router.post("/radius-routes", response_model=RadiusRoute)
async def create_radius_route(route: RadiusRoute, user: dict = Depends(get_super_admin)):
    # Get zone names
    pickup_zone = await db.radius_zones.find_one({"id": route.pickup_zone_id}, {"_id": 0})
    dropoff_zone = await db.radius_zones.find_one({"id": route.dropoff_zone_id}, {"_id": 0})
    
    route.pickup_zone_name = pickup_zone["name"] if pickup_zone else None
    route.dropoff_zone_name = dropoff_zone["name"] if dropoff_zone else None
    
    await db.radius_routes.insert_one(route.model_dump())
    return route

@api_router.put("/radius-routes/{route_id}")
async def update_radius_route(route_id: str, route: RadiusRoute, user: dict = Depends(get_super_admin)):
    result = await db.radius_routes.update_one({"id": route_id}, {"$set": route.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
    return route

@api_router.delete("/radius-routes/{route_id}")
async def delete_radius_route(route_id: str, user: dict = Depends(get_super_admin)):
    result = await db.radius_routes.delete_one({"id": route_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
    return {"message": "Route deleted"}

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
async def create_vehicle(vehicle: VehicleCategory, user: dict = Depends(get_super_admin)):
    await db.vehicles.insert_one(vehicle.model_dump())
    return vehicle

@api_router.put("/admin/vehicles/{vehicle_id}", response_model=VehicleCategory)
async def update_vehicle(vehicle_id: str, vehicle: VehicleCategory, user: dict = Depends(get_super_admin)):
    result = await db.vehicles.update_one({"id": vehicle_id}, {"$set": vehicle.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

@api_router.delete("/admin/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user: dict = Depends(get_super_admin)):
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
async def create_pricing_rule(rule: PricingRule, user: dict = Depends(get_super_admin)):
    await db.pricing_rules.insert_one(rule.model_dump())
    return rule

@api_router.put("/admin/pricing/{rule_id}", response_model=PricingRule)
async def update_pricing_rule(rule_id: str, rule: PricingRule, user: dict = Depends(get_super_admin)):
    result = await db.pricing_rules.update_one({"id": rule_id}, {"$set": rule.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    return rule

@api_router.delete("/admin/pricing/{rule_id}")
async def delete_pricing_rule(rule_id: str, user: dict = Depends(get_super_admin)):
    result = await db.pricing_rules.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    return {"message": "Pricing rule deleted"}

# ==================== FIXED ROUTES (Legacy) ====================

@api_router.get("/fixed-routes", response_model=List[FixedRoute])
async def get_fixed_routes():
    routes = await db.fixed_routes.find({"is_active": True}, {"_id": 0}).to_list(100)
    return routes

@api_router.post("/admin/fixed-routes", response_model=FixedRoute)
async def create_fixed_route(route: FixedRoute, user: dict = Depends(get_super_admin)):
    await db.fixed_routes.insert_one(route.model_dump())
    return route

@api_router.put("/admin/fixed-routes/{route_id}", response_model=FixedRoute)
async def update_fixed_route(route_id: str, route: FixedRoute, user: dict = Depends(get_super_admin)):
    result = await db.fixed_routes.update_one({"id": route_id}, {"$set": route.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fixed route not found")
    return route

@api_router.delete("/admin/fixed-routes/{route_id}")
async def delete_fixed_route(route_id: str, user: dict = Depends(get_super_admin)):
    result = await db.fixed_routes.delete_one({"id": route_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fixed route not found")
    return {"message": "Fixed route deleted"}

# ==================== QUOTE ROUTES ====================

@api_router.post("/quote", response_model=QuoteResponse)
async def get_quote(request: QuoteRequest):
    vehicles = await db.vehicles.find({"is_active": True}, {"_id": 0}).to_list(100)
    pricing_rules = await db.pricing_rules.find({}, {"_id": 0}).to_list(100)
    
    # Check for radius-based fixed route first
    radius_route_prices = None
    if request.pickup_lat and request.pickup_lng and request.dropoff_lat and request.dropoff_lng:
        zones = await db.radius_zones.find({}, {"_id": 0}).to_list(100)
        radius_routes = await db.radius_routes.find({"is_active": True}, {"_id": 0}).to_list(100)
        
        for route in radius_routes:
            pickup_zone = next((z for z in zones if z["id"] == route["pickup_zone_id"]), None)
            dropoff_zone = next((z for z in zones if z["id"] == route["dropoff_zone_id"]), None)
            
            if pickup_zone and dropoff_zone:
                pickup_match = is_point_in_radius(
                    request.pickup_lat, request.pickup_lng,
                    pickup_zone["center_lat"], pickup_zone["center_lng"],
                    pickup_zone["radius_km"]
                )
                dropoff_match = is_point_in_radius(
                    request.dropoff_lat, request.dropoff_lng,
                    dropoff_zone["center_lat"], dropoff_zone["center_lng"],
                    dropoff_zone["radius_km"]
                )
                
                if pickup_match and dropoff_match:
                    radius_route_prices = route["prices"]
                    break
    
    # Fallback to text-based fixed routes
    fixed_route_prices = None
    if not radius_route_prices:
        fixed_routes = await db.fixed_routes.find({"is_active": True}, {"_id": 0}).to_list(100)
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
        
        # Priority: radius route > text fixed route > mileage-based
        if radius_route_prices and vehicle["id"] in radius_route_prices:
            price = radius_route_prices[vehicle["id"]]
            currency = "GBP"
        elif fixed_route_prices and vehicle["id"] in fixed_route_prices:
            price = fixed_route_prices[vehicle["id"]]
            currency = "GBP"
        else:
            # Mileage-based pricing
            rule = next((r for r in pricing_rules if r["vehicle_category_id"] == vehicle["id"]), None)
            if rule:
                price = rule["base_fee"] + (request.distance_km * rule["per_km_rate"])
                if request.is_airport_pickup:
                    price += rule["airport_surcharge"]
                if request.meet_greet:
                    price += rule["meet_greet_fee"]
                price = max(price, rule["minimum_fare"])
                currency = rule["currency"]
            else:
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
    
    duration_minutes = int(request.distance_km * 2)
    
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
    if booking.get("user_id") != user["id"] and user.get("role") not in ["admin", "super_admin"]:
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
    fleet_id: Optional[str] = None,
    user: dict = Depends(get_super_admin)
):
    query = {}
    if status:
        query["status"] = status
    if date:
        query["pickup_date"] = date
    if fleet_id:
        query["assigned_fleet_id"] = fleet_id
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return bookings

@api_router.put("/admin/bookings/{booking_id}", response_model=Booking)
async def update_booking(booking_id: str, update: BookingUpdate, user: dict = Depends(get_super_admin)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return booking

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_super_admin)):
    total_bookings = await db.bookings.count_documents({})
    pending_bookings = await db.bookings.count_documents({"status": "pending"})
    confirmed_bookings = await db.bookings.count_documents({"status": "confirmed"})
    assigned_bookings = await db.bookings.count_documents({"status": "assigned"})
    completed_bookings = await db.bookings.count_documents({"status": "completed"})
    cancelled_bookings = await db.bookings.count_documents({"status": "cancelled"})
    
    # Revenue calculation
    paid_bookings = await db.bookings.find({"payment_status": "paid"}, {"_id": 0, "price": 1}).to_list(1000)
    total_revenue = sum(b.get("price", 0) for b in paid_bookings)
    
    # Fleet stats
    total_fleets = await db.fleets.count_documents({})
    active_fleets = await db.fleets.count_documents({"status": "active"})
    
    # Driver stats
    total_drivers = await db.drivers.count_documents({})
    
    return {
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "confirmed_bookings": confirmed_bookings,
        "assigned_bookings": assigned_bookings,
        "completed_bookings": completed_bookings,
        "cancelled_bookings": cancelled_bookings,
        "total_revenue": round(total_revenue, 2),
        "total_fleets": total_fleets,
        "active_fleets": active_fleets,
        "total_drivers": total_drivers
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
    
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "booking_id": booking_id,
        "amount": float(booking["price"]),
        "currency": booking.get("currency", "GBP"),
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
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
    
    # Seed radius zones (example: Heathrow and Central London)
    radius_zones = [
        RadiusZone(id="zone-heathrow", name="Heathrow Airport Area", center_lat=51.4700, center_lng=-0.4543, radius_km=5.0, zone_type="pickup"),
        RadiusZone(id="zone-gatwick", name="Gatwick Airport Area", center_lat=51.1537, center_lng=-0.1821, radius_km=5.0, zone_type="pickup"),
        RadiusZone(id="zone-central-london", name="Central London", center_lat=51.5074, center_lng=-0.1278, radius_km=8.0, zone_type="dropoff"),
        RadiusZone(id="zone-city-london", name="City of London", center_lat=51.5155, center_lng=-0.0922, radius_km=3.0, zone_type="dropoff")
    ]
    
    for z in radius_zones:
        await db.radius_zones.update_one({"id": z.id}, {"$set": z.model_dump()}, upsert=True)
    
    # Seed radius routes
    radius_routes = [
        RadiusRoute(
            id="rr-heathrow-central",
            name="Heathrow Area to Central London",
            pickup_zone_id="zone-heathrow",
            dropoff_zone_id="zone-central-london",
            pickup_zone_name="Heathrow Airport Area",
            dropoff_zone_name="Central London",
            prices={"sedan": 55.0, "executive": 75.0, "suv": 70.0, "mpv": 85.0, "van": 95.0, "minibus": 150.0}
        ),
        RadiusRoute(
            id="rr-gatwick-central",
            name="Gatwick Area to Central London",
            pickup_zone_id="zone-gatwick",
            dropoff_zone_id="zone-central-london",
            pickup_zone_name="Gatwick Airport Area",
            dropoff_zone_name="Central London",
            prices={"sedan": 65.0, "executive": 85.0, "suv": 80.0, "mpv": 95.0, "van": 110.0, "minibus": 170.0}
        )
    ]
    
    for r in radius_routes:
        await db.radius_routes.update_one({"id": r.id}, {"$set": r.model_dump()}, upsert=True)
    
    # Create super admin user if not exists
    admin_exists = await db.users.find_one({"email": "admin@aircabio.com"})
    if not admin_exists:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@aircabio.com",
            "password": hash_password("admin123"),
            "name": "Super Admin",
            "phone": "+44 20 1234 5678",
            "role": "super_admin",
            "fleet_id": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
    else:
        # Update existing admin to super_admin role
        await db.users.update_one(
            {"email": "admin@aircabio.com"},
            {"$set": {"role": "super_admin"}}
        )
    
    # Create sample fleet
    fleet_exists = await db.fleets.find_one({"email": "fleet1@aircabio.com"})
    if not fleet_exists:
        sample_fleet = Fleet(
            id="fleet-london-1",
            name="London Premier Cars",
            contact_person="John Smith",
            email="fleet1@aircabio.com",
            phone="+44 20 9876 5432",
            city="London",
            operating_area="Greater London",
            commission_type="percentage",
            commission_value=15.0,
            password=hash_password("fleet123")
        )
        await db.fleets.insert_one(sample_fleet.model_dump())
    
    return {"message": "Seed data created successfully"}

@api_router.get("/")
async def root():
    return {"message": "Aircabio Airport Transfers API", "version": "2.0.0"}

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
