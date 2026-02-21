from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request, Query, BackgroundTasks
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

# Import email service
from email_service import (
    send_booking_confirmation, send_booking_updated, send_booking_cancelled, send_booking_completed,
    send_job_alert_to_fleet, send_driver_assigned_to_customer, send_status_update,
    send_fleet_suspended, send_fleet_reactivated, send_fleet_password_reset,
    send_invoice_issued, send_payment_success, send_payment_failed,
    send_admin_alert, send_completion_with_invoice, send_review_invitation
)

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

# ==================== JOB STATUSES ====================
JOB_STATUSES = [
    "new",           # Just created
    "unassigned",    # Ready but no driver/fleet
    "assigned",      # Assigned to driver/fleet
    "accepted",      # Driver/fleet accepted
    "en_route",      # Driver on the way
    "arrived",       # Driver at pickup
    "in_progress",   # Trip in progress
    "completed",     # Trip completed
    "cancelled",     # Cancelled
    "no_show",       # Generic no show
    "driver_no_show", # Driver didn't show
    "customer_no_show", # Customer didn't show
    "on_hold",       # On hold
    "rescheduled"    # Rescheduled
]

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

# Customer Model
class CustomerCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: str
    company: Optional[str] = None
    notes: Optional[str] = None

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: str
    company: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Fleet Model
class FleetCreate(BaseModel):
    name: str
    contact_person: str
    email: EmailStr
    phone: str
    whatsapp: Optional[str] = None
    city: str
    operating_area: Optional[str] = None
    commission_type: str = "percentage"
    commission_value: float = 15.0
    payment_terms: str = "weekly"
    notes: Optional[str] = None
    password: Optional[str] = None

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
    status: str = "active"
    password: Optional[str] = None
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
    password: Optional[str] = None

# Driver Model
class DriverCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: str
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    driver_type: str = "internal"  # internal or fleet
    fleet_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None

class Driver(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: str
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    driver_type: str = "internal"
    fleet_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None
    status: str = "active"
    average_rating: Optional[float] = None
    total_ratings: Optional[int] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DriverUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    driver_type: Optional[str] = None
    fleet_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

# Vehicle Model
class VehicleCreate(BaseModel):
    name: Optional[str] = None
    plate_number: str
    category_id: str
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    passenger_capacity: int = 4
    luggage_capacity: int = 2
    fleet_id: Optional[str] = None
    driver_id: Optional[str] = None
    notes: Optional[str] = None

class Vehicle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: Optional[str] = None
    plate_number: str
    category_id: str
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    passenger_capacity: int = 4
    luggage_capacity: int = 2
    fleet_id: Optional[str] = None
    driver_id: Optional[str] = None
    notes: Optional[str] = None
    status: str = "active"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VehicleUpdate(BaseModel):
    name: Optional[str] = None
    plate_number: Optional[str] = None
    category_id: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    passenger_capacity: Optional[int] = None
    luggage_capacity: Optional[int] = None
    fleet_id: Optional[str] = None
    driver_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

# Booking Extra Model
class BookingExtra(BaseModel):
    name: str
    price: float
    notes: Optional[str] = None
    affects_driver_cost: bool = False

# Enhanced Booking Model with dual pricing
class ManualBookingCreate(BaseModel):
    # Customer info
    customer_id: Optional[str] = None
    customer_account_id: Optional[str] = None  # B2B Customer Account
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: str
    customer_reference: Optional[str] = None
    # B2B Provider Integration (Mozio, etc.)
    mozio_external_id: Optional[str] = None  # Mozio booking reference
    b2b_source: Optional[str] = None  # e.g., "mozio", "jayride", etc.
    # Trip details
    pickup_date: str
    pickup_time: str
    pickup_location: str
    pickup_postcode: Optional[str] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dropoff_location: str
    dropoff_postcode: Optional[str] = None
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None
    # Vehicle & passengers
    vehicle_category_id: str
    passengers: int = 1
    small_bags: int = 0
    large_bags: int = 0
    flight_number: Optional[str] = None
    meet_greet: bool = False
    # Pricing
    customer_price: float
    driver_price: float
    # Extras
    extras: List[BookingExtra] = []
    # Notes
    pickup_notes: Optional[str] = None
    dropoff_notes: Optional[str] = None
    admin_notes: Optional[str] = None
    # Assignment
    assigned_fleet_id: Optional[str] = None
    assigned_driver_id: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_ref: str = Field(default_factory=lambda: f"AC{str(uuid.uuid4())[:6].upper()}")
    # Customer info
    customer_id: Optional[str] = None
    customer_account_id: Optional[str] = None  # B2B Customer Account
    customer_account_name: Optional[str] = None  # Denormalized for display
    customer_name: str = ""
    customer_email: Optional[str] = None
    customer_phone: str = ""
    customer_reference: Optional[str] = None
    # Trip details
    pickup_location: str
    pickup_postcode: Optional[str] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dropoff_location: str
    dropoff_postcode: Optional[str] = None
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None
    pickup_date: str
    pickup_time: str
    # Vehicle & passengers
    vehicle_category_id: str
    vehicle_name: Optional[str] = None
    passengers: int = 1
    small_bags: int = 0
    large_bags: int = 0
    luggage: int = 0  # Total bags for backward compatibility
    flight_number: Optional[str] = None
    meet_greet: bool = False
    # Pricing - dual pricing system
    customer_price: float = 0.0
    driver_price: float = 0.0
    profit: float = 0.0
    price: float = 0.0  # Backward compatibility (same as customer_price)
    currency: str = "GBP"
    # Extras
    extras: List[Dict] = []
    extras_total: float = 0.0
    # Notes
    pickup_notes: Optional[str] = None
    dropoff_notes: Optional[str] = None
    admin_notes: Optional[str] = None
    # Status
    status: str = "new"
    payment_status: str = "pending"
    payment_session_id: Optional[str] = None
    # Assignment
    assigned_fleet_id: Optional[str] = None
    assigned_fleet_name: Optional[str] = None
    assigned_driver_id: Optional[str] = None
    assigned_driver_name: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None
    assigned_vehicle_plate: Optional[str] = None
    assigned_at: Optional[str] = None
    accepted_at: Optional[str] = None
    completed_at: Optional[str] = None
    # User/source
    user_id: Optional[str] = None
    customer_source: str = "manual"
    # Invoice tracking
    customer_invoice_id: Optional[str] = None
    fleet_invoice_id: Optional[str] = None
    driver_invoice_id: Optional[str] = None
    # Distance/duration
    distance_km: Optional[float] = None
    duration_minutes: Optional[int] = None
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None

class BookingUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_reference: Optional[str] = None
    pickup_location: Optional[str] = None
    pickup_postcode: Optional[str] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dropoff_location: Optional[str] = None
    dropoff_postcode: Optional[str] = None
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None
    pickup_date: Optional[str] = None
    pickup_time: Optional[str] = None
    vehicle_category_id: Optional[str] = None
    passengers: Optional[int] = None
    small_bags: Optional[int] = None
    large_bags: Optional[int] = None
    flight_number: Optional[str] = None
    meet_greet: Optional[bool] = None
    customer_price: Optional[float] = None
    driver_price: Optional[float] = None
    extras: Optional[List[Dict]] = None
    pickup_notes: Optional[str] = None
    dropoff_notes: Optional[str] = None
    admin_notes: Optional[str] = None
    status: Optional[str] = None
    payment_status: Optional[str] = None
    assigned_fleet_id: Optional[str] = None
    assigned_driver_id: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None

class JobAssignment(BaseModel):
    fleet_id: Optional[str] = None
    driver_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    driver_price: Optional[float] = None
    notes: Optional[str] = None

# Customer Account Model (B2B)
class CustomerAccount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    contact_person: str
    email: str
    phone: str
    billing_address: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None  # e.g., "Net 30", "Net 15", "On Booking"
    credit_limit: Optional[float] = None
    status: str = "active"  # active, inactive, suspended
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CustomerAccountCreate(BaseModel):
    company_name: str
    contact_person: str
    email: str
    phone: str
    billing_address: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[float] = None

class CustomerAccountUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    billing_address: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[float] = None
    status: Optional[str] = None

# Booking History/Audit Model
class BookingHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    action: str  # created, status_changed, price_updated, driver_assigned, etc.
    description: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    user_id: str
    user_name: str
    user_role: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Booking Note Model (Admin Internal Notes)
class BookingNote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    note: str
    user_id: str
    user_name: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

class BookingNoteCreate(BaseModel):
    note: str

# Job Comment Model
class JobComment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    user_id: str
    user_name: str
    user_role: str  # super_admin, fleet_admin
    comment: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class JobCommentCreate(BaseModel):
    comment: str

# Invoice Model
class InvoiceLineItem(BaseModel):
    booking_id: str
    booking_ref: str
    description: str
    date: str
    pickup_time: Optional[str] = None
    customer_name: Optional[str] = None
    vehicle_class: Optional[str] = None
    amount: float
    driver_price: Optional[float] = None  # For profit calculation
    profit: Optional[float] = None  # For customer invoices

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    invoice_type: str  # customer, fleet, driver
    entity_id: str
    entity_name: str
    entity_email: str
    entity_phone: Optional[str] = None
    entity_address: Optional[str] = None
    booking_ids: List[str] = []
    line_items: List[Dict] = []
    subtotal: float
    commission: float = 0.0
    commission_type: Optional[str] = None  # percentage, flat
    commission_value: Optional[float] = None
    tax_rate: float = 0.0  # VAT percentage
    tax: float = 0.0
    total: float
    profit_total: Optional[float] = None  # Total profit (for customer invoices)
    currency: str = "GBP"
    status: str = "draft"  # draft, pending_approval, approved, issued, paid, overdue, cancelled
    payment_terms: str = "Net 14"  # Net 7, Net 14, Net 30
    due_date: Optional[str] = None
    paid_date: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None  # Admin-only notes
    period_start: Optional[str] = None  # For auto-generated fleet invoices
    period_end: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InvoiceCreate(BaseModel):
    invoice_type: str  # customer, fleet, driver
    entity_id: str
    booking_ids: List[str]
    tax_rate: float = 0.0
    payment_terms: str = "Net 14"
    notes: Optional[str] = None
    internal_notes: Optional[str] = None

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    due_date: Optional[str] = None
    paid_date: Optional[str] = None
    payment_terms: Optional[str] = None
    line_items: Optional[List[Dict]] = None
    subtotal: Optional[float] = None
    commission: Optional[float] = None
    tax_rate: Optional[float] = None
    tax: Optional[float] = None
    total: Optional[float] = None

# ==================== COMPREHENSIVE PRICING MODELS ====================

# Mileage Bracket (distance-based pricing tier)
class MileageBracket(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    min_miles: float = 0
    max_miles: Optional[float] = None  # None means unlimited
    fixed_price: Optional[float] = None  # If set, use this fixed price for the bracket
    per_mile_rate: Optional[float] = None  # If set, charge per mile in this bracket
    order: int = 0

class MileageBracketCreate(BaseModel):
    min_miles: float = 0
    max_miles: Optional[float] = None
    fixed_price: Optional[float] = None
    per_mile_rate: Optional[float] = None
    order: int = 0

# Time-based rates (hourly/daily)
class TimeRates(BaseModel):
    hourly_rate: float = 0.0
    minimum_hours: int = 2
    daily_rate: float = 0.0

# Extra fees configuration
class ExtraFees(BaseModel):
    additional_pickup_fee: float = 10.0
    waiting_per_minute: float = 0.50
    airport_pickup_fee: float = 10.0
    meet_greet_fee: float = 15.0
    night_surcharge_percent: float = 20.0
    weekend_surcharge_percent: float = 0.0
    child_seat_fee: float = 10.0

# Complete pricing scheme for a vehicle class
class PricingScheme(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vehicle_category_id: str
    vehicle_name: Optional[str] = None
    mileage_brackets: List[Dict] = []  # List of MileageBracket
    time_rates: Dict = {}  # TimeRates as dict
    extra_fees: Dict = {}  # ExtraFees as dict
    base_fare: float = 0.0
    minimum_fare: float = 25.0
    currency: str = "GBP"
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PricingSchemeCreate(BaseModel):
    vehicle_category_id: str
    mileage_brackets: List[Dict] = []
    time_rates: Optional[Dict] = None
    extra_fees: Optional[Dict] = None
    base_fare: float = 0.0
    minimum_fare: float = 25.0
    currency: str = "GBP"

class PricingSchemeUpdate(BaseModel):
    mileage_brackets: Optional[List[Dict]] = None
    time_rates: Optional[Dict] = None
    extra_fees: Optional[Dict] = None
    base_fare: Optional[float] = None
    minimum_fare: Optional[float] = None
    is_active: Optional[bool] = None

# Map-based Fixed Route with radius circles
class MapFixedRoute(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    vehicle_category_id: str
    vehicle_name: Optional[str] = None
    # Start point
    start_label: str
    start_lat: float
    start_lng: float
    start_radius_miles: float = 3.0
    # End point
    end_label: str
    end_lat: float
    end_lng: float
    end_radius_miles: float = 3.0
    # Pricing
    price: float
    currency: str = "GBP"
    # Distance
    distance_miles: Optional[float] = None
    duration_minutes: Optional[int] = None
    # Options
    valid_return: bool = False  # If true, applies to both A->B and B->A
    priority: int = 0  # Higher priority = used first when multiple routes match
    route_type: str = "one_way"  # one_way or return
    is_active: bool = True
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MapFixedRouteCreate(BaseModel):
    name: str
    vehicle_category_id: str
    start_label: str
    start_lat: float
    start_lng: float
    start_radius_miles: float = 3.0
    end_label: str
    end_lat: float
    end_lng: float
    end_radius_miles: float = 3.0
    price: float
    distance_miles: Optional[float] = None
    duration_minutes: Optional[int] = None
    valid_return: bool = False
    priority: int = 0

class MapFixedRouteUpdate(BaseModel):
    name: Optional[str] = None
    start_label: Optional[str] = None
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None
    start_radius_miles: Optional[float] = None
    end_label: Optional[str] = None
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None
    end_radius_miles: Optional[float] = None
    price: Optional[float] = None
    distance_miles: Optional[float] = None
    duration_minutes: Optional[int] = None
    valid_return: Optional[bool] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
class RadiusZone(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    center_lat: float
    center_lng: float
    radius_km: float
    zone_type: str = "pickup"

class RadiusRoute(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    pickup_zone_id: str
    dropoff_zone_id: str
    pickup_zone_name: Optional[str] = None
    dropoff_zone_name: Optional[str] = None
    prices: Dict[str, float] = {}
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
        # Support both 'user_id' (regular tokens) and 'sub' (impersonation tokens)
        user_id = payload.get("user_id") or payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no user identifier")
        role = payload.get("role")
        
        # For fleet_admin, look in fleets collection
        if role == "fleet_admin":
            fleet = await db.fleets.find_one({"id": user_id}, {"_id": 0, "password": 0})
            if fleet:
                return {
                    "id": fleet["id"],
                    "email": fleet["email"],
                    "name": fleet["name"],
                    "phone": fleet.get("phone"),
                    "role": "fleet_admin",
                    "fleet_id": fleet["id"],
                    "created_at": fleet["created_at"],
                    "impersonation": payload.get("impersonation", False)
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
    if user.get("role") not in ["super_admin", "admin"]:
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
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def is_point_in_radius(point_lat: float, point_lng: float, center_lat: float, center_lng: float, radius_km: float) -> bool:
    distance = haversine_distance(point_lat, point_lng, center_lat, center_lng)
    return distance <= radius_km

async def generate_invoice_number(invoice_type: str) -> str:
    prefix = {"customer": "INV-C", "fleet": "INV-F", "driver": "INV-D"}.get(invoice_type, "INV")
    count = await db.invoices.count_documents({"invoice_type": invoice_type})
    return f"{prefix}-{datetime.now().strftime('%Y%m')}-{str(count + 1).zfill(4)}"

def calculate_profit(customer_price: float, driver_price: float, extras: List[Dict] = []) -> float:
    extras_customer = sum(e.get("price", 0) for e in extras)
    extras_driver = sum(e.get("price", 0) for e in extras if e.get("affects_driver_cost", False))
    return (customer_price + extras_customer) - (driver_price + extras_driver)

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

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@api_router.post("/auth/change-password")
async def change_password(data: PasswordChange, user: dict = Depends(get_current_user)):
    """Change password for current logged-in user (admin or fleet)"""
    # Verify current password
    if user.get("role") == "fleet_admin":
        # Fleet user - check fleet collection
        fleet = await db.fleets.find_one({"id": user.get("fleet_id")}, {"_id": 0})
        if not fleet or not verify_password(data.current_password, fleet.get("password", "")):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        await db.fleets.update_one(
            {"id": user.get("fleet_id")},
            {"$set": {"password": hash_password(data.new_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        # Regular user (admin/customer) - check users collection
        db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        if not db_user or not verify_password(data.current_password, db_user.get("password", "")):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"password": hash_password(data.new_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"message": "Password changed successfully"}

# ==================== CUSTOMER ROUTES ====================

@api_router.get("/customers")
async def get_customers(user: dict = Depends(get_super_admin)):
    customers = await db.customers.find({}, {"_id": 0}).to_list(500)
    return customers

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer_data: CustomerCreate, user: dict = Depends(get_super_admin)):
    customer = Customer(**customer_data.model_dump())
    await db.customers.insert_one(customer.model_dump())
    return customer

@api_router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, user: dict = Depends(get_super_admin)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

# ==================== FLEET ROUTES ====================

@api_router.get("/fleets")
async def get_fleets(user: dict = Depends(get_super_admin)):
    fleets = await db.fleets.find({}, {"_id": 0, "password": 0}).to_list(100)
    return fleets

@api_router.get("/fleets/{fleet_id}")
async def get_fleet(fleet_id: str, user: dict = Depends(get_admin_or_fleet)):
    if user.get("role") == "fleet_admin" and user.get("fleet_id") != fleet_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    fleet = await db.fleets.find_one({"id": fleet_id}, {"_id": 0, "password": 0})
    if not fleet:
        raise HTTPException(status_code=404, detail="Fleet not found")
    return fleet

@api_router.post("/fleets", response_model=Fleet)
async def create_fleet(fleet_data: FleetCreate, background_tasks: BackgroundTasks, user: dict = Depends(get_super_admin)):
    # Check if email already exists
    existing = await db.fleets.find_one({"email": fleet_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate password if not provided
    password = fleet_data.password or f"fleet{str(uuid.uuid4())[:8]}"
    
    fleet = Fleet(
        **{k: v for k, v in fleet_data.model_dump().items() if k != 'password'},
        password=hash_password(password)
    )
    await db.fleets.insert_one(fleet.model_dump())
    
    # Send welcome email with password
    background_tasks.add_task(send_fleet_password_reset, fleet.model_dump(), password)
    
    # Return fleet with temporary password (only shown once)
    fleet_response = fleet.model_dump()
    fleet_response["temporary_password"] = password
    del fleet_response["password"]
    return fleet_response

@api_router.put("/fleets/{fleet_id}")
async def update_fleet(fleet_id: str, update: FleetUpdate, background_tasks: BackgroundTasks, user: dict = Depends(get_super_admin)):
    # Get current fleet for comparison
    current_fleet = await db.fleets.find_one({"id": fleet_id}, {"_id": 0})
    if not current_fleet:
        raise HTTPException(status_code=404, detail="Fleet not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Hash password if being updated
    if "password" in update_data and update_data["password"]:
        update_data["password"] = hash_password(update_data["password"])
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Check for status change
    old_status = current_fleet.get("status")
    new_status = update_data.get("status")
    
    result = await db.fleets.update_one({"id": fleet_id}, {"$set": update_data})
    
    fleet = await db.fleets.find_one({"id": fleet_id}, {"_id": 0, "password": 0})
    
    # Send email notifications for status changes
    if new_status and old_status != new_status:
        if new_status == "suspended":
            background_tasks.add_task(send_fleet_suspended, fleet)
        elif new_status == "active" and old_status == "suspended":
            background_tasks.add_task(send_fleet_reactivated, fleet)
    
    return fleet

@api_router.post("/fleets/{fleet_id}/reset-password")
async def reset_fleet_password(fleet_id: str, request: Request, background_tasks: BackgroundTasks, user: dict = Depends(get_super_admin)):
    fleet = await db.fleets.find_one({"id": fleet_id}, {"_id": 0})
    if not fleet:
        raise HTTPException(status_code=404, detail="Fleet not found")
    
    new_password = f"fleet{str(uuid.uuid4())[:8]}"
    
    await db.fleets.update_one(
        {"id": fleet_id},
        {"$set": {"password": hash_password(new_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Get base URL for login link
    base_url = str(request.base_url).rstrip('/')
    # Remove /api if present and construct login URL
    if '/api' in base_url:
        base_url = base_url.replace('/api', '')
    dashboard_url = f"{base_url}/login"
    
    # Send email with new password and login link
    background_tasks.add_task(send_fleet_password_reset, fleet, new_password, dashboard_url)
    
    return {"message": "Password reset successful", "temporary_password": new_password}

@api_router.delete("/fleets/{fleet_id}")
async def delete_fleet(fleet_id: str, user: dict = Depends(get_super_admin)):
    result = await db.fleets.delete_one({"id": fleet_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fleet not found")
    return {"message": "Fleet deleted"}

@api_router.get("/fleets/{fleet_id}/jobs")
async def get_fleet_jobs_admin(fleet_id: str, user: dict = Depends(get_super_admin)):
    jobs = await db.bookings.find({"assigned_fleet_id": fleet_id}, {"_id": 0}).sort("pickup_date", -1).to_list(500)
    return jobs

@api_router.get("/fleets/{fleet_id}/invoices")
async def get_fleet_invoices_admin(fleet_id: str, user: dict = Depends(get_super_admin)):
    invoices = await db.invoices.find({"entity_id": fleet_id, "invoice_type": "fleet"}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return invoices

# ==================== FLEET IMPERSONATION ====================

class ImpersonationResponse(BaseModel):
    access_token: str
    fleet: Dict[str, Any]
    impersonation_id: str
    expires_at: str

@api_router.post("/admin/fleets/{fleet_id}/impersonate")
async def impersonate_fleet(
    fleet_id: str,
    request: Request,
    user: dict = Depends(get_super_admin)
):
    """
    Super Admin impersonates a fleet account.
    Creates a special token that includes impersonation context.
    """
    # Get the fleet
    fleet = await db.fleets.find_one({"id": fleet_id}, {"_id": 0})
    if not fleet:
        raise HTTPException(status_code=404, detail="Fleet not found")
    
    # Create impersonation audit log
    impersonation_id = str(uuid.uuid4())
    audit_entry = {
        "id": impersonation_id,
        "action": "fleet_impersonation",
        "admin_id": user["id"],
        "admin_email": user["email"],
        "admin_name": user.get("name", ""),
        "fleet_id": fleet_id,
        "fleet_name": fleet.get("name", ""),
        "fleet_email": fleet.get("email", ""),
        "ip_address": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent", "unknown"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "active"
    }
    await db.audit_logs.insert_one(audit_entry)
    
    # Create impersonation token (includes original admin info)
    token_data = {
        "sub": fleet_id,
        "role": "fleet_admin",
        "fleet_id": fleet_id,
        "impersonation": True,
        "impersonated_by": user["id"],
        "impersonated_by_email": user["email"],
        "impersonation_id": impersonation_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=2)  # 2 hour session
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")
    
    # Remove password from fleet response
    fleet_response = {k: v for k, v in fleet.items() if k != "password"}
    
    return ImpersonationResponse(
        access_token=token,
        fleet=fleet_response,
        impersonation_id=impersonation_id,
        expires_at=(datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    )

@api_router.post("/admin/impersonation/{impersonation_id}/exit")
async def exit_impersonation(
    impersonation_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Exit impersonation mode and log the exit.
    """
    # Update audit log
    await db.audit_logs.update_one(
        {"id": impersonation_id},
        {
            "$set": {
                "status": "exited",
                "exited_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    return {"message": "Impersonation session ended"}

@api_router.get("/admin/audit-logs")
async def get_audit_logs(
    action: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_super_admin)
):
    """
    Get audit logs for Super Admin.
    """
    query = {}
    if action:
        query["action"] = action
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return logs

@api_router.get("/admin/audit-logs/impersonations")
async def get_impersonation_logs(
    fleet_id: Optional[str] = None,
    user: dict = Depends(get_super_admin)
):
    """
    Get impersonation audit logs.
    """
    query = {"action": "fleet_impersonation"}
    if fleet_id:
        query["fleet_id"] = fleet_id
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return logs

# ==================== DRIVER ROUTES ====================

@api_router.get("/drivers")
async def get_drivers(
    fleet_id: Optional[str] = None,
    user: dict = Depends(get_admin_or_fleet)
):
    query = {}
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
    
    if user.get("role") == "fleet_admin" and driver.get("fleet_id") != user.get("fleet_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return driver

@api_router.post("/drivers", response_model=Driver)
async def create_driver(driver_data: DriverCreate, user: dict = Depends(get_admin_or_fleet)):
    if user.get("role") == "fleet_admin":
        driver_data.fleet_id = user.get("fleet_id")
        driver_data.driver_type = "fleet"
    
    driver = Driver(**driver_data.model_dump())
    await db.drivers.insert_one(driver.model_dump())
    return driver

@api_router.put("/drivers/{driver_id}")
async def update_driver(driver_id: str, update: DriverUpdate, user: dict = Depends(get_admin_or_fleet)):
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
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

# ==================== VEHICLE ROUTES (New Management Section) ====================

@api_router.get("/admin/vehicles")
async def get_all_vehicles(
    fleet_id: Optional[str] = None,
    user: dict = Depends(get_admin_or_fleet)
):
    query = {}
    if user.get("role") == "fleet_admin":
        query["fleet_id"] = user.get("fleet_id")
    elif fleet_id:
        query["fleet_id"] = fleet_id
    
    vehicles = await db.fleet_vehicles.find(query, {"_id": 0}).to_list(200)
    return vehicles

@api_router.post("/admin/vehicles", response_model=Vehicle)
async def create_vehicle_admin(vehicle_data: VehicleCreate, user: dict = Depends(get_admin_or_fleet)):
    if user.get("role") == "fleet_admin":
        vehicle_data.fleet_id = user.get("fleet_id")
    
    vehicle = Vehicle(**vehicle_data.model_dump())
    await db.fleet_vehicles.insert_one(vehicle.model_dump())
    return vehicle

@api_router.get("/admin/vehicles/{vehicle_id}")
async def get_vehicle_admin(vehicle_id: str, user: dict = Depends(get_admin_or_fleet)):
    vehicle = await db.fleet_vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    if user.get("role") == "fleet_admin" and vehicle.get("fleet_id") != user.get("fleet_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return vehicle

@api_router.put("/admin/vehicles/{vehicle_id}")
async def update_vehicle_admin(vehicle_id: str, update: VehicleUpdate, user: dict = Depends(get_admin_or_fleet)):
    vehicle = await db.fleet_vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    if user.get("role") == "fleet_admin" and vehicle.get("fleet_id") != user.get("fleet_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    await db.fleet_vehicles.update_one({"id": vehicle_id}, {"$set": update_data})
    
    return await db.fleet_vehicles.find_one({"id": vehicle_id}, {"_id": 0})

@api_router.delete("/admin/vehicles/{vehicle_id}")
async def delete_vehicle_admin(vehicle_id: str, user: dict = Depends(get_super_admin)):
    result = await db.fleet_vehicles.delete_one({"id": vehicle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle deleted"}

# ==================== MANUAL BOOKING CREATION ====================

@api_router.post("/admin/bookings/manual")
async def create_manual_booking(booking_data: ManualBookingCreate, background_tasks: BackgroundTasks, user: dict = Depends(get_super_admin)):
    """Create a manual booking with dual pricing (customer price + driver price)"""
    
    # Get vehicle info
    vehicle = await db.vehicles.find_one({"id": booking_data.vehicle_category_id}, {"_id": 0})
    vehicle_name = vehicle["name"] if vehicle else booking_data.vehicle_category_id
    
    # Calculate extras total
    extras_total = sum(e.price for e in booking_data.extras)
    
    # Calculate profit
    extras_driver_total = sum(e.price for e in booking_data.extras if e.affects_driver_cost)
    profit = (booking_data.customer_price + extras_total) - (booking_data.driver_price + extras_driver_total)
    
    # Get fleet/driver names if assigned
    assigned_fleet_name = None
    assigned_driver_name = None
    assigned_vehicle_plate = None
    fleet = None
    
    if booking_data.assigned_fleet_id:
        fleet = await db.fleets.find_one({"id": booking_data.assigned_fleet_id}, {"_id": 0})
        if fleet:
            # CRITICAL: Block assignments to suspended fleets
            if fleet.get("status") == "suspended":
                raise HTTPException(status_code=400, detail="Cannot assign jobs to suspended fleets. Please activate the fleet first.")
            assigned_fleet_name = fleet["name"]
    
    if booking_data.assigned_driver_id:
        driver = await db.drivers.find_one({"id": booking_data.assigned_driver_id}, {"_id": 0})
        assigned_driver_name = driver["name"] if driver else None
    
    if booking_data.assigned_vehicle_id:
        veh = await db.fleet_vehicles.find_one({"id": booking_data.assigned_vehicle_id}, {"_id": 0})
        assigned_vehicle_plate = veh["plate_number"] if veh else None
    
    # Determine initial status
    status = "new"
    if booking_data.assigned_fleet_id or booking_data.assigned_driver_id:
        status = "assigned"
    else:
        status = "unassigned"
    
    # Get customer account info if provided
    customer_account_name = None
    if booking_data.customer_account_id:
        customer_account = await db.customer_accounts.find_one({"id": booking_data.customer_account_id}, {"_id": 0})
        if customer_account:
            customer_account_name = customer_account.get("company_name")
    
    booking = Booking(
        customer_id=booking_data.customer_id,
        customer_account_id=booking_data.customer_account_id,
        customer_account_name=customer_account_name,
        customer_name=booking_data.customer_name,
        customer_email=booking_data.customer_email,
        customer_phone=booking_data.customer_phone,
        customer_reference=booking_data.customer_reference,
        pickup_location=booking_data.pickup_location,
        pickup_postcode=booking_data.pickup_postcode,
        pickup_lat=booking_data.pickup_lat,
        pickup_lng=booking_data.pickup_lng,
        dropoff_location=booking_data.dropoff_location,
        dropoff_postcode=booking_data.dropoff_postcode,
        dropoff_lat=booking_data.dropoff_lat,
        dropoff_lng=booking_data.dropoff_lng,
        pickup_date=booking_data.pickup_date,
        pickup_time=booking_data.pickup_time,
        vehicle_category_id=booking_data.vehicle_category_id,
        vehicle_name=vehicle_name,
        passengers=booking_data.passengers,
        small_bags=booking_data.small_bags,
        large_bags=booking_data.large_bags,
        luggage=booking_data.small_bags + booking_data.large_bags,
        flight_number=booking_data.flight_number,
        meet_greet=booking_data.meet_greet,
        customer_price=booking_data.customer_price,
        driver_price=booking_data.driver_price,
        profit=round(profit, 2),
        price=booking_data.customer_price,  # Backward compatibility
        extras=[e.model_dump() for e in booking_data.extras],
        extras_total=extras_total,
        pickup_notes=booking_data.pickup_notes,
        dropoff_notes=booking_data.dropoff_notes,
        admin_notes=booking_data.admin_notes,
        status=status,
        payment_status="pending",
        assigned_fleet_id=booking_data.assigned_fleet_id,
        assigned_fleet_name=assigned_fleet_name,
        assigned_driver_id=booking_data.assigned_driver_id,
        assigned_driver_name=assigned_driver_name,
        assigned_vehicle_id=booking_data.assigned_vehicle_id,
        assigned_vehicle_plate=assigned_vehicle_plate,
        assigned_at=datetime.now(timezone.utc).isoformat() if (booking_data.assigned_fleet_id or booking_data.assigned_driver_id) else None,
        customer_source="manual",
        created_by=user["id"]
    )
    
    await db.bookings.insert_one(booking.model_dump())
    
    booking_dict = booking.model_dump()
    
    # Send booking confirmation email
    admin_email = user.get("email")
    background_tasks.add_task(send_booking_confirmation, booking_dict, admin_email)
    
    # Log booking creation to history
    await log_booking_history(
        booking.id, 
        "created", 
        f"Booking created by {user.get('name')}", 
        user,
        new_value=f"Status: {status}, Customer: {booking_data.customer_name}"
    )
    
    # Create notification for fleet if assigned
    if booking_data.assigned_fleet_id and fleet:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "fleet_id": booking_data.assigned_fleet_id,
            "type": "job_assigned",
            "booking_id": booking.id,
            "message": f"New job assigned: {booking.pickup_location} → {booking.dropoff_location}",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Send email to fleet
        background_tasks.add_task(send_job_alert_to_fleet, booking_dict, fleet)
        
        # Log assignment to history
        await log_booking_history(
            booking.id,
            "fleet_assigned",
            f"Assigned to fleet: {assigned_fleet_name}",
            user,
            new_value=assigned_fleet_name
        )
    
    return booking_dict

# ==================== JOB ASSIGNMENT ROUTES ====================

@api_router.post("/bookings/{booking_id}/assign")
async def assign_booking(booking_id: str, assignment: JobAssignment, background_tasks: BackgroundTasks, user: dict = Depends(get_super_admin)):
    """Assign a booking to a fleet and/or driver"""
    print(f"[ASSIGN DEBUG] Starting assign_booking for {booking_id}", flush=True)
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    print(f"[ASSIGN DEBUG] Found booking: {booking.get('booking_ref')}, customer_email: {booking.get('customer_email')}", flush=True)
    
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    fleet = None
    driver = None
    vehicle = None
    
    if assignment.fleet_id:
        fleet = await db.fleets.find_one({"id": assignment.fleet_id}, {"_id": 0})
        if not fleet:
            raise HTTPException(status_code=404, detail="Fleet not found")
        # CRITICAL: Block assignments to suspended fleets
        if fleet.get("status") == "suspended":
            raise HTTPException(status_code=400, detail="Cannot assign jobs to suspended fleets. Please activate the fleet first.")
        update_data["assigned_fleet_id"] = assignment.fleet_id
        update_data["assigned_fleet_name"] = fleet["name"]
    
    if assignment.driver_id:
        driver = await db.drivers.find_one({"id": assignment.driver_id}, {"_id": 0})
        if not driver:
            raise HTTPException(status_code=404, detail="Driver not found")
        update_data["assigned_driver_id"] = assignment.driver_id
        update_data["assigned_driver_name"] = driver["name"]
    
    if assignment.vehicle_id:
        vehicle = await db.fleet_vehicles.find_one({"id": assignment.vehicle_id}, {"_id": 0})
        if vehicle:
            update_data["assigned_vehicle_id"] = assignment.vehicle_id
            update_data["assigned_vehicle_plate"] = vehicle["plate_number"]
    
    # Save driver_price (fleet payout) and recalculate profit
    if assignment.driver_price is not None:
        update_data["driver_price"] = assignment.driver_price
        customer_price = booking.get("customer_price", booking.get("price", 0))
        extras = booking.get("extras", [])
        extras_total = sum(e.get("price", 0) for e in extras)
        extras_driver = sum(e.get("price", 0) for e in extras if e.get("affects_driver_cost", False))
        update_data["profit"] = round((customer_price + extras_total) - (assignment.driver_price + extras_driver), 2)
    
    if assignment.fleet_id or assignment.driver_id:
        update_data["status"] = "assigned"
        update_data["assigned_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    
    # Get updated booking for emails
    updated_booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
    # Log assignment to history
    if assignment.fleet_id and fleet:
        await log_booking_history(
            booking_id,
            "fleet_assigned",
            f"Assigned to fleet: {fleet['name']}",
            user,
            old_value=booking.get("assigned_fleet_name"),
            new_value=fleet['name']
        )
        # Send email to fleet
        background_tasks.add_task(send_job_alert_to_fleet, updated_booking, fleet)
    
    if assignment.driver_price is not None:
        await log_booking_history(
            booking_id,
            "driver_price_updated",
            f"Driver price set to £{assignment.driver_price:.2f}",
            user,
            old_value=str(booking.get("driver_price")),
            new_value=str(assignment.driver_price)
        )
    
    # Send driver assignment notification to customer
    if driver and updated_booking.get("customer_email"):
        print(f"[EMAIL DEBUG] Sending driver assignment email to {updated_booking.get('customer_email')} for booking {booking_id}", flush=True)
        logger.info(f"Sending driver assignment email to {updated_booking.get('customer_email')} for booking {booking_id}")
        background_tasks.add_task(send_driver_assigned_to_customer, updated_booking, driver, vehicle)
    else:
        print(f"[EMAIL DEBUG] Skipping driver assignment email - driver: {bool(driver)}, customer_email: {updated_booking.get('customer_email')}", flush=True)
        logger.warning(f"Skipping driver assignment email - driver: {bool(driver)}, customer_email: {updated_booking.get('customer_email')}")
    
    # Create notification for fleet
    if assignment.fleet_id:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "fleet_id": assignment.fleet_id,
            "type": "job_assigned",
            "booking_id": booking_id,
            "message": f"New job assigned: {booking['pickup_location']} → {booking['dropoff_location']}",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "Booking assigned successfully"}

@api_router.put("/bookings/{booking_id}/unassign")
async def unassign_booking(booking_id: str, user: dict = Depends(get_super_admin)):
    """Remove assignment from a booking"""
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "assigned_fleet_id": None,
            "assigned_fleet_name": None,
            "assigned_driver_id": None,
            "assigned_driver_name": None,
            "assigned_vehicle_id": None,
            "assigned_vehicle_plate": None,
            "assigned_at": None,
            "status": "unassigned",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking unassigned"}

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str, background_tasks: BackgroundTasks, user: dict = Depends(get_admin_or_fleet)):
    """Update booking status with role-based permissions"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Fleet can only update their assigned jobs
    if user.get("role") == "fleet_admin":
        if booking.get("assigned_fleet_id") != user.get("fleet_id"):
            raise HTTPException(status_code=403, detail="This job is not assigned to your fleet")
        
        # Fleet allowed status transitions
        allowed_transitions = {
            "assigned": ["accepted"],
            "accepted": ["en_route", "cancelled", "driver_no_show"],
            "en_route": ["arrived"],
            "arrived": ["in_progress", "customer_no_show"],
            "in_progress": ["completed"]
        }
        
        current_status = booking.get("status")
        if current_status not in allowed_transitions or status not in allowed_transitions.get(current_status, []):
            raise HTTPException(status_code=400, detail=f"Cannot change status from {current_status} to {status}")
        
        # IMPORTANT: Fleet must assign driver and vehicle before starting the job
        # They can accept without driver, but cannot proceed beyond accepted without driver/vehicle
        if status == "en_route":
            if not booking.get("assigned_driver_id"):
                raise HTTPException(status_code=400, detail="You must assign a driver before starting this job")
            if not booking.get("assigned_vehicle_id"):
                raise HTTPException(status_code=400, detail="You must assign a vehicle before starting this job")
    
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if status == "accepted":
        update_data["accepted_at"] = datetime.now(timezone.utc).isoformat()
    elif status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    old_status = booking.get("status")
    await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    
    # Log status change to history
    await log_booking_history(
        booking_id,
        "status_changed",
        f"Status changed from {old_status} to {status}",
        user,
        old_value=old_status,
        new_value=status
    )
    
    # Send email notifications for key status changes
    updated_booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if updated_booking and updated_booking.get("customer_email"):
        if status in ["en_route", "arrived", "in_progress"]:
            background_tasks.add_task(send_status_update, updated_booking, status)
        elif status == "completed":
            # Send completion email with PDF invoice
            background_tasks.add_task(send_completion_with_invoice, updated_booking)
            # Send review invitation after a short delay (handled in background)
            # Get driver details for review email
            driver = None
            if updated_booking.get("assigned_driver_id"):
                driver = await db.drivers.find_one({"id": updated_booking["assigned_driver_id"]}, {"_id": 0})
            background_tasks.add_task(send_review_invitation, updated_booking, driver)
        elif status == "cancelled":
            background_tasks.add_task(send_booking_cancelled, updated_booking)
    
    return {"message": f"Status updated to {status}"}

# ==================== FLEET DASHBOARD ROUTES ====================

@api_router.get("/fleet/jobs")
async def get_fleet_jobs(
    status: Optional[str] = None,
    user: dict = Depends(get_fleet_admin)
):
    """Get jobs assigned to the fleet - WITHOUT customer price/profit"""
    query = {"assigned_fleet_id": user.get("fleet_id")}
    if status:
        query["status"] = status
    
    jobs = await db.bookings.find(query, {"_id": 0}).sort("pickup_date", 1).to_list(500)
    
    # Remove sensitive pricing info for fleet view
    for job in jobs:
        job.pop("customer_price", None)
        job.pop("profit", None)
        job.pop("extras_total", None)
        job.pop("customer_invoice_id", None)
        # Rename driver_price to 'price' for fleet view
        job["price"] = job.get("driver_price", 0)
    
    return jobs

@api_router.get("/fleet/stats")
async def get_fleet_stats(user: dict = Depends(get_fleet_admin)):
    fleet_id = user.get("fleet_id")
    
    total_jobs = await db.bookings.count_documents({"assigned_fleet_id": fleet_id})
    new_jobs = await db.bookings.count_documents({"assigned_fleet_id": fleet_id, "status": "assigned"})
    accepted_jobs = await db.bookings.count_documents({"assigned_fleet_id": fleet_id, "status": "accepted"})
    in_progress_jobs = await db.bookings.count_documents({"assigned_fleet_id": fleet_id, "status": "in_progress"})
    completed_jobs = await db.bookings.count_documents({"assigned_fleet_id": fleet_id, "status": "completed"})
    
    # Calculate earnings based on driver_price only
    completed = await db.bookings.find(
        {"assigned_fleet_id": fleet_id, "status": "completed"},
        {"_id": 0, "driver_price": 1}
    ).to_list(1000)
    total_earnings = sum(b.get("driver_price", 0) for b in completed)
    
    return {
        "total_jobs": total_jobs,
        "new_jobs": new_jobs,
        "accepted_jobs": accepted_jobs,
        "in_progress_jobs": in_progress_jobs,
        "completed_jobs": completed_jobs,
        "total_earnings": round(total_earnings, 2),
        "net_earnings": round(total_earnings, 2)  # Same as total for fleet
    }

@api_router.put("/fleet/jobs/{booking_id}/accept")
async def fleet_accept_job(booking_id: str, user: dict = Depends(get_fleet_admin)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
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

@api_router.get("/fleet/notifications")
async def get_fleet_notifications(user: dict = Depends(get_fleet_admin)):
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

@api_router.post("/fleet/notifications/mark-read")
async def mark_all_notifications_read(user: dict = Depends(get_fleet_admin)):
    """Mark all notifications as read for the fleet"""
    await db.notifications.update_many(
        {"fleet_id": user.get("fleet_id"), "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

# ==================== FLEET RESOURCE MANAGEMENT ROUTES ====================

# Fleet Drivers Management
@api_router.get("/fleet/drivers")
async def get_fleet_drivers(user: dict = Depends(get_fleet_admin)):
    """Get drivers belonging to the fleet"""
    fleet_id = user.get("fleet_id")
    drivers = await db.drivers.find({"fleet_id": fleet_id}, {"_id": 0}).to_list(100)
    return drivers

@api_router.post("/fleet/drivers")
async def create_fleet_driver(driver_data: DriverCreate, user: dict = Depends(get_fleet_admin)):
    """Create a new driver for the fleet"""
    fleet_id = user.get("fleet_id")
    
    driver = Driver(
        name=driver_data.name,
        email=driver_data.email,
        phone=driver_data.phone,
        license_number=driver_data.license_number,
        license_expiry=driver_data.license_expiry,
        driver_type="fleet",
        fleet_id=fleet_id,
        vehicle_id=driver_data.vehicle_id,
        notes=driver_data.notes
    )
    
    await db.drivers.insert_one(driver.model_dump())
    return driver.model_dump()

@api_router.put("/fleet/drivers/{driver_id}")
async def update_fleet_driver(driver_id: str, update: DriverUpdate, user: dict = Depends(get_fleet_admin)):
    """Update a fleet driver"""
    fleet_id = user.get("fleet_id")
    
    # Verify driver belongs to fleet
    existing = await db.drivers.find_one({"id": driver_id, "fleet_id": fleet_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Driver not found or not in your fleet")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    # Prevent changing fleet_id
    update_data.pop("fleet_id", None)
    
    await db.drivers.update_one({"id": driver_id}, {"$set": update_data})
    return await db.drivers.find_one({"id": driver_id}, {"_id": 0})

@api_router.delete("/fleet/drivers/{driver_id}")
async def delete_fleet_driver(driver_id: str, user: dict = Depends(get_fleet_admin)):
    """Delete a fleet driver"""
    fleet_id = user.get("fleet_id")
    
    result = await db.drivers.delete_one({"id": driver_id, "fleet_id": fleet_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found or not in your fleet")
    return {"message": "Driver deleted"}

# Fleet Driver Ratings
@api_router.get("/fleet/drivers/{driver_id}/ratings")
async def get_fleet_driver_ratings(
    driver_id: str,
    limit: int = 50,
    user: dict = Depends(get_fleet_admin)
):
    """Get ratings for a specific driver in the fleet"""
    fleet_id = user.get("fleet_id")
    
    # Verify driver belongs to fleet
    driver = await db.drivers.find_one({"id": driver_id, "fleet_id": fleet_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found or not in your fleet")
    
    # Get ratings from driver_ratings collection
    ratings = await db.driver_ratings.find(
        {"driver_id": driver_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    # Enrich with booking info
    enriched_ratings = []
    for rating in ratings:
        booking = await db.bookings.find_one({"id": rating.get("booking_id")}, {"_id": 0})
        enriched_ratings.append({
            "id": rating.get("id"),
            "rating": rating.get("rating"),
            "feedback": rating.get("feedback"),
            "created_at": rating.get("created_at"),
            "booking_ref": booking.get("booking_ref") if booking else None,
            "customer_name": booking.get("customer_name") if booking else None,
            "pickup_date": booking.get("pickup_date") if booking else None,
            "route": f"{booking.get('pickup_location', '')} → {booking.get('dropoff_location', '')}" if booking else None
        })
    
    return {
        "driver": {
            "id": driver.get("id"),
            "name": driver.get("name"),
            "average_rating": driver.get("average_rating"),
            "total_ratings": driver.get("total_ratings", len(ratings))
        },
        "ratings": enriched_ratings
    }

@api_router.get("/fleet/ratings/summary")
async def get_fleet_ratings_summary(user: dict = Depends(get_fleet_admin)):
    """Get overall ratings summary for the fleet"""
    fleet_id = user.get("fleet_id")
    
    # Get all drivers in fleet
    drivers = await db.drivers.find({"fleet_id": fleet_id}, {"_id": 0}).to_list(100)
    driver_ids = [d.get("id") for d in drivers]
    
    if not driver_ids:
        return {
            "total_ratings": 0,
            "average_rating": 0,
            "rating_distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
            "top_drivers": []
        }
    
    # Get all ratings for fleet drivers
    ratings = await db.driver_ratings.find(
        {"driver_id": {"$in": driver_ids}},
        {"_id": 0}
    ).to_list(1000)
    
    total_ratings = len(ratings)
    total_stars = sum(r.get("rating", 0) for r in ratings)
    avg_rating = round(total_stars / total_ratings, 2) if total_ratings > 0 else 0
    
    # Distribution
    distribution = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    for rating in ratings:
        stars = str(rating.get("rating", 0))
        if stars in distribution:
            distribution[stars] += 1
    
    # Top rated drivers
    top_drivers = sorted(
        [d for d in drivers if d.get("average_rating")],
        key=lambda x: x.get("average_rating", 0),
        reverse=True
    )[:5]
    
    return {
        "total_ratings": total_ratings,
        "average_rating": avg_rating,
        "rating_distribution": distribution,
        "ratings_with_feedback": len([r for r in ratings if r.get("feedback")]),
        "top_drivers": [
            {
                "id": d.get("id"),
                "name": d.get("name"),
                "average_rating": d.get("average_rating"),
                "total_ratings": d.get("total_ratings", 0)
            }
            for d in top_drivers
        ]
    }

# Fleet Vehicles Management
@api_router.get("/fleet/vehicles")
async def get_fleet_vehicles(user: dict = Depends(get_fleet_admin)):
    """Get vehicles belonging to the fleet"""
    fleet_id = user.get("fleet_id")
    vehicles = await db.fleet_vehicles.find({"fleet_id": fleet_id}, {"_id": 0}).to_list(100)
    return vehicles

@api_router.post("/fleet/vehicles")
async def create_fleet_vehicle(vehicle_data: VehicleCreate, user: dict = Depends(get_fleet_admin)):
    """Create a new vehicle for the fleet"""
    fleet_id = user.get("fleet_id")
    
    vehicle = Vehicle(
        name=vehicle_data.name,
        plate_number=vehicle_data.plate_number,
        category_id=vehicle_data.category_id,
        make=vehicle_data.make,
        model=vehicle_data.model,
        year=vehicle_data.year,
        color=vehicle_data.color,
        passenger_capacity=vehicle_data.passenger_capacity,
        luggage_capacity=vehicle_data.luggage_capacity,
        fleet_id=fleet_id,
        driver_id=vehicle_data.driver_id,
        notes=vehicle_data.notes
    )
    
    await db.fleet_vehicles.insert_one(vehicle.model_dump())
    return vehicle.model_dump()

@api_router.put("/fleet/vehicles/{vehicle_id}")
async def update_fleet_vehicle(vehicle_id: str, update: VehicleUpdate, user: dict = Depends(get_fleet_admin)):
    """Update a fleet vehicle"""
    fleet_id = user.get("fleet_id")
    
    # Verify vehicle belongs to fleet
    existing = await db.fleet_vehicles.find_one({"id": vehicle_id, "fleet_id": fleet_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Vehicle not found or not in your fleet")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    # Prevent changing fleet_id
    update_data.pop("fleet_id", None)
    
    await db.fleet_vehicles.update_one({"id": vehicle_id}, {"$set": update_data})
    return await db.fleet_vehicles.find_one({"id": vehicle_id}, {"_id": 0})

@api_router.delete("/fleet/vehicles/{vehicle_id}")
async def delete_fleet_vehicle(vehicle_id: str, user: dict = Depends(get_fleet_admin)):
    """Delete a fleet vehicle"""
    fleet_id = user.get("fleet_id")
    
    result = await db.fleet_vehicles.delete_one({"id": vehicle_id, "fleet_id": fleet_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found or not in your fleet")
    return {"message": "Vehicle deleted"}

# Fleet Driver Assignment Model
class FleetDriverAssignment(BaseModel):
    driver_id: str
    vehicle_id: Optional[str] = None

@api_router.put("/fleet/jobs/{booking_id}/assign-driver")
async def fleet_assign_driver_to_job(booking_id: str, assignment: FleetDriverAssignment, background_tasks: BackgroundTasks, user: dict = Depends(get_fleet_admin)):
    """Fleet assigns their own driver and vehicle to a job"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    fleet_id = user.get("fleet_id")
    if booking.get("assigned_fleet_id") != fleet_id:
        raise HTTPException(status_code=403, detail="This job is not assigned to your fleet")
    
    # Verify driver belongs to fleet
    driver = await db.drivers.find_one({"id": assignment.driver_id, "fleet_id": fleet_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found or not in your fleet")
    
    update_data = {
        "assigned_driver_id": assignment.driver_id,
        "assigned_driver_name": driver["name"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    vehicle = None
    if assignment.vehicle_id:
        vehicle = await db.fleet_vehicles.find_one({"id": assignment.vehicle_id, "fleet_id": fleet_id}, {"_id": 0})
        if vehicle:
            update_data["assigned_vehicle_id"] = assignment.vehicle_id
            update_data["assigned_vehicle_plate"] = vehicle["plate_number"]
    
    await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    
    # Get updated booking for email
    updated_booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
    # Send driver assignment notification to customer
    if updated_booking.get("customer_email"):
        background_tasks.add_task(send_driver_assigned_to_customer, updated_booking, driver, vehicle)
    
    return {"message": "Driver assigned to job successfully"}

# ==================== JOB COMMENTS ROUTES ====================

@api_router.get("/bookings/{booking_id}/comments")
async def get_job_comments(booking_id: str, user: dict = Depends(get_admin_or_fleet)):
    """Get all comments for a job"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Fleet can only see comments for their jobs
    if user.get("role") == "fleet_admin":
        if booking.get("assigned_fleet_id") != user.get("fleet_id"):
            raise HTTPException(status_code=403, detail="Not authorized to view this job")
    
    comments = await db.job_comments.find(
        {"booking_id": booking_id}, 
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    return comments

@api_router.post("/bookings/{booking_id}/comments")
async def add_job_comment(booking_id: str, comment_data: JobCommentCreate, user: dict = Depends(get_admin_or_fleet)):
    """Add a comment to a job"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Fleet can only comment on their jobs
    if user.get("role") == "fleet_admin":
        if booking.get("assigned_fleet_id") != user.get("fleet_id"):
            raise HTTPException(status_code=403, detail="Not authorized to comment on this job")
    
    comment = JobComment(
        booking_id=booking_id,
        user_id=user.get("id") or user.get("fleet_id"),
        user_name=user.get("name", "Unknown"),
        user_role=user.get("role", "unknown"),
        comment=comment_data.comment
    )
    
    await db.job_comments.insert_one(comment.model_dump())
    
    return comment.model_dump()

# ==================== CUSTOMER ACCOUNTS ROUTES ====================

@api_router.get("/admin/customers")
async def get_customer_accounts(
    status: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_super_admin)
):
    """Get all customer accounts"""
    query = {}
    if status and status != "all":
        query["status"] = status
    if search:
        query["$or"] = [
            {"company_name": {"$regex": search, "$options": "i"}},
            {"contact_person": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    customers = await db.customer_accounts.find(query, {"_id": 0}).sort("company_name", 1).to_list(500)
    return customers

@api_router.get("/admin/customers/{customer_id}")
async def get_customer_account(customer_id: str, user: dict = Depends(get_super_admin)):
    """Get a single customer account"""
    customer = await db.customer_accounts.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@api_router.post("/admin/customers")
async def create_customer_account(data: CustomerAccountCreate, user: dict = Depends(get_super_admin)):
    """Create a new customer account"""
    customer = CustomerAccount(**data.model_dump())
    await db.customer_accounts.insert_one(customer.model_dump())
    return customer.model_dump()

@api_router.put("/admin/customers/{customer_id}")
async def update_customer_account(customer_id: str, update: CustomerAccountUpdate, user: dict = Depends(get_super_admin)):
    """Update a customer account"""
    existing = await db.customer_accounts.find_one({"id": customer_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.customer_accounts.update_one({"id": customer_id}, {"$set": update_data})
    return await db.customer_accounts.find_one({"id": customer_id}, {"_id": 0})

@api_router.delete("/admin/customers/{customer_id}")
async def delete_customer_account(customer_id: str, user: dict = Depends(get_super_admin)):
    """Delete a customer account"""
    result = await db.customer_accounts.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted"}

# ==================== BOOKING HISTORY ROUTES ====================

async def log_booking_history(booking_id: str, action: str, description: str, user: dict, old_value: str = None, new_value: str = None):
    """Helper function to log booking history"""
    history = BookingHistory(
        booking_id=booking_id,
        action=action,
        description=description,
        old_value=old_value,
        new_value=new_value,
        user_id=user.get("id", user.get("fleet_id", "unknown")),
        user_name=user.get("name", "Unknown"),
        user_role=user.get("role", "unknown")
    )
    await db.booking_history.insert_one(history.model_dump())

@api_router.get("/admin/bookings/{booking_id}/history")
async def get_booking_history(booking_id: str, user: dict = Depends(get_super_admin)):
    """Get booking history/audit trail"""
    history = await db.booking_history.find(
        {"booking_id": booking_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return history

# ==================== BOOKING NOTES ROUTES ====================

@api_router.get("/admin/bookings/{booking_id}/notes")
async def get_booking_notes(booking_id: str, user: dict = Depends(get_super_admin)):
    """Get internal notes for a booking"""
    notes = await db.booking_notes.find(
        {"booking_id": booking_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return notes

@api_router.post("/admin/bookings/{booking_id}/notes")
async def add_booking_note(booking_id: str, data: BookingNoteCreate, user: dict = Depends(get_super_admin)):
    """Add an internal note to a booking"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    note = BookingNote(
        booking_id=booking_id,
        note=data.note,
        user_id=user.get("id", "unknown"),
        user_name=user.get("name", "Unknown")
    )
    await db.booking_notes.insert_one(note.model_dump())
    
    # Log to history
    await log_booking_history(booking_id, "note_added", f"Note added by {user.get('name')}", user)
    
    return note.model_dump()

@api_router.put("/admin/bookings/{booking_id}/notes/{note_id}")
async def update_booking_note(booking_id: str, note_id: str, data: BookingNoteCreate, user: dict = Depends(get_super_admin)):
    """Update a booking note"""
    existing = await db.booking_notes.find_one({"id": note_id, "booking_id": booking_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Note not found")
    
    await db.booking_notes.update_one(
        {"id": note_id},
        {"$set": {"note": data.note, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return await db.booking_notes.find_one({"id": note_id}, {"_id": 0})

@api_router.delete("/admin/bookings/{booking_id}/notes/{note_id}")
async def delete_booking_note(booking_id: str, note_id: str, user: dict = Depends(get_super_admin)):
    """Delete a booking note"""
    result = await db.booking_notes.delete_one({"id": note_id, "booking_id": booking_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted"}

# ==================== ADMIN BOOKING ROUTES ====================

@api_router.get("/admin/bookings")
async def get_all_bookings(
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    fleet_id: Optional[str] = None,
    driver_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    vehicle_category: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_super_admin)
):
    query = {}
    
    if status and status != "all":
        query["status"] = status
    
    if date_from and date_to:
        query["pickup_date"] = {"$gte": date_from, "$lte": date_to}
    elif date_from:
        query["pickup_date"] = {"$gte": date_from}
    elif date_to:
        query["pickup_date"] = {"$lte": date_to}
    
    if fleet_id:
        query["assigned_fleet_id"] = fleet_id
    
    if driver_id:
        query["assigned_driver_id"] = driver_id
    
    if customer_id:
        query["customer_id"] = customer_id
    
    if vehicle_category:
        query["vehicle_category_id"] = vehicle_category
    
    if search:
        query["$or"] = [
            {"booking_ref": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"pickup_location": {"$regex": search, "$options": "i"}},
            {"dropoff_location": {"$regex": search, "$options": "i"}}
        ]
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return bookings

@api_router.get("/admin/bookings/{booking_id}")
async def get_booking_admin(booking_id: str, user: dict = Depends(get_super_admin)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@api_router.put("/admin/bookings/{booking_id}")
async def update_booking_admin(booking_id: str, update: BookingUpdate, user: dict = Depends(get_super_admin)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Recalculate profit if prices changed
    if "customer_price" in update_data or "driver_price" in update_data:
        customer_price = update_data.get("customer_price", booking.get("customer_price", 0))
        driver_price = update_data.get("driver_price", booking.get("driver_price", 0))
        extras = update_data.get("extras", booking.get("extras", []))
        
        extras_total = sum(e.get("price", 0) for e in extras)
        extras_driver = sum(e.get("price", 0) for e in extras if e.get("affects_driver_cost", False))
        
        update_data["profit"] = round((customer_price + extras_total) - (driver_price + extras_driver), 2)
        update_data["price"] = customer_price  # Backward compatibility
        update_data["extras_total"] = extras_total
    
    # Update vehicle name if category changed
    if "vehicle_category_id" in update_data:
        vehicle = await db.vehicles.find_one({"id": update_data["vehicle_category_id"]}, {"_id": 0})
        if vehicle:
            update_data["vehicle_name"] = vehicle["name"]
    
    # Update assignment names
    if "assigned_fleet_id" in update_data:
        if update_data["assigned_fleet_id"]:
            fleet = await db.fleets.find_one({"id": update_data["assigned_fleet_id"]}, {"_id": 0})
            update_data["assigned_fleet_name"] = fleet["name"] if fleet else None
        else:
            update_data["assigned_fleet_name"] = None
    
    if "assigned_driver_id" in update_data:
        if update_data["assigned_driver_id"]:
            driver = await db.drivers.find_one({"id": update_data["assigned_driver_id"]}, {"_id": 0})
            update_data["assigned_driver_name"] = driver["name"] if driver else None
        else:
            update_data["assigned_driver_name"] = None
    
    if "assigned_vehicle_id" in update_data:
        if update_data["assigned_vehicle_id"]:
            vehicle = await db.fleet_vehicles.find_one({"id": update_data["assigned_vehicle_id"]}, {"_id": 0})
            update_data["assigned_vehicle_plate"] = vehicle["plate_number"] if vehicle else None
        else:
            update_data["assigned_vehicle_plate"] = None
    
    # Calculate luggage total
    if "small_bags" in update_data or "large_bags" in update_data:
        small = update_data.get("small_bags", booking.get("small_bags", 0))
        large = update_data.get("large_bags", booking.get("large_bags", 0))
        update_data["luggage"] = small + large
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    return await db.bookings.find_one({"id": booking_id}, {"_id": 0})

@api_router.delete("/admin/bookings/{booking_id}")
async def delete_booking_admin(booking_id: str, user: dict = Depends(get_super_admin)):
    result = await db.bookings.delete_one({"id": booking_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking deleted"}

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_super_admin)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    total_bookings = await db.bookings.count_documents({})
    new_bookings = await db.bookings.count_documents({"status": "new"})
    unassigned_bookings = await db.bookings.count_documents({"status": "unassigned"})
    assigned_bookings = await db.bookings.count_documents({"status": "assigned"})
    completed_bookings = await db.bookings.count_documents({"status": "completed"})
    cancelled_bookings = await db.bookings.count_documents({"status": "cancelled"})
    today_bookings = await db.bookings.count_documents({"pickup_date": today})
    
    # Calculate total revenue and profit
    all_completed = await db.bookings.find({"status": "completed"}, {"_id": 0, "customer_price": 1, "profit": 1}).to_list(10000)
    total_revenue = sum(b.get("customer_price", b.get("price", 0)) for b in all_completed)
    total_profit = sum(b.get("profit", 0) for b in all_completed)
    
    # Fleet and driver stats
    total_fleets = await db.fleets.count_documents({})
    active_fleets = await db.fleets.count_documents({"status": "active"})
    total_drivers = await db.drivers.count_documents({})
    total_vehicles = await db.fleet_vehicles.count_documents({})
    
    return {
        "total_bookings": total_bookings,
        "new_bookings": new_bookings,
        "unassigned_bookings": unassigned_bookings,
        "assigned_bookings": assigned_bookings,
        "completed_bookings": completed_bookings,
        "cancelled_bookings": cancelled_bookings,
        "today_bookings": today_bookings,
        "total_revenue": round(total_revenue, 2),
        "total_profit": round(total_profit, 2),
        "total_fleets": total_fleets,
        "active_fleets": active_fleets,
        "total_drivers": total_drivers,
        "total_vehicles": total_vehicles
    }

@api_router.get("/statuses")
async def get_job_statuses():
    """Return all available job statuses"""
    return JOB_STATUSES

# ==================== INVOICE ROUTES ====================

@api_router.get("/invoices")
async def get_invoices(
    invoice_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: dict = Depends(get_admin_or_fleet)
):
    query = {}
    
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
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return invoices

@api_router.get("/invoices/uninvoiced-bookings")
async def get_uninvoiced_bookings(
    invoice_type: str,
    entity_id: Optional[str] = None,
    user: dict = Depends(get_super_admin)
):
    """Get bookings that haven't been invoiced yet"""
    query = {"status": "completed"}
    
    if invoice_type == "customer":
        query["customer_invoice_id"] = {"$in": [None, ""]}
    elif invoice_type == "fleet":
        query["fleet_invoice_id"] = {"$in": [None, ""]}
        if entity_id:
            query["assigned_fleet_id"] = entity_id
        else:
            query["assigned_fleet_id"] = {"$ne": None}
    elif invoice_type == "driver":
        query["driver_invoice_id"] = {"$in": [None, ""]}
        if entity_id:
            query["assigned_driver_id"] = entity_id
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("pickup_date", -1).to_list(500)
    return bookings

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: dict = Depends(get_admin_or_fleet)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if user.get("role") == "fleet_admin" and invoice.get("entity_id") != user.get("fleet_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return invoice

def get_payment_term_days(payment_terms: str) -> int:
    """Convert payment terms to days"""
    terms_map = {"Net 7": 7, "Net 14": 14, "Net 30": 30}
    return terms_map.get(payment_terms, 14)

@api_router.post("/invoices/generate")
async def generate_invoice(
    data: InvoiceCreate,
    user: dict = Depends(get_super_admin)
):
    """Generate an invoice for customer, fleet, or driver with profit tracking"""
    invoice_type = data.invoice_type
    entity_id = data.entity_id
    booking_ids = data.booking_ids
    
    bookings = await db.bookings.find({"id": {"$in": booking_ids}}, {"_id": 0}).to_list(100)
    if not bookings:
        raise HTTPException(status_code=400, detail="No valid bookings found")
    
    entity_phone = None
    entity_address = None
    commission = 0
    commission_type = None
    commission_value = None
    profit_total = None
    
    if invoice_type == "customer":
        # Group by customer or use first booking's customer
        entity_name = bookings[0]["customer_name"]
        entity_email = bookings[0].get("customer_email", "")
        entity_phone = bookings[0].get("customer_phone", "")
        subtotal = sum(b.get("customer_price", b.get("price", 0)) for b in bookings)
        # Calculate profit for customer invoices
        total_driver_cost = sum(b.get("driver_price", 0) for b in bookings)
        profit_total = subtotal - total_driver_cost
        
    elif invoice_type == "fleet":
        fleet = await db.fleets.find_one({"id": entity_id}, {"_id": 0})
        if not fleet:
            raise HTTPException(status_code=404, detail="Fleet not found")
        entity_name = fleet["name"]
        entity_email = fleet["email"]
        entity_phone = fleet.get("phone", "")
        entity_address = fleet.get("city", "")
        subtotal = sum(b.get("driver_price", 0) for b in bookings)
        commission_type = fleet.get("commission_type", "percentage")
        commission_value = fleet.get("commission_value", 0)
        if commission_type == "percentage":
            commission = subtotal * (commission_value / 100)
        else:
            commission = len(bookings) * commission_value
            
    elif invoice_type == "driver":
        driver = await db.drivers.find_one({"id": entity_id}, {"_id": 0})
        if not driver:
            raise HTTPException(status_code=404, detail="Driver not found")
        entity_name = driver["name"]
        entity_email = driver.get("email", "")
        entity_phone = driver.get("phone", "")
        subtotal = sum(b.get("driver_price", 0) for b in bookings)
    else:
        raise HTTPException(status_code=400, detail="Invalid invoice type")
    
    # Build line items with more details
    line_items = []
    for b in bookings:
        customer_price = b.get("customer_price", b.get("price", 0))
        driver_price = b.get("driver_price", 0)
        amount = customer_price if invoice_type == "customer" else driver_price
        profit = customer_price - driver_price if invoice_type == "customer" else None
        
        line_items.append({
            "booking_id": b["id"],
            "booking_ref": b.get("booking_ref", b["id"][:8].upper()),
            "description": f"{b['pickup_location']} → {b['dropoff_location']}",
            "date": b["pickup_date"],
            "pickup_time": b.get("pickup_time", ""),
            "customer_name": b.get("customer_name", ""),
            "vehicle_class": b.get("vehicle_name", b.get("vehicle_category_id", "")),
            "amount": amount,
            "driver_price": driver_price if invoice_type == "customer" else None,
            "profit": profit
        })
    
    # Calculate tax
    tax = subtotal * (data.tax_rate / 100) if data.tax_rate else 0
    total = subtotal - commission + tax if invoice_type == "fleet" else subtotal + tax
    
    # Due date based on payment terms
    due_days = get_payment_term_days(data.payment_terms)
    
    invoice = Invoice(
        invoice_number=await generate_invoice_number(invoice_type),
        invoice_type=invoice_type,
        entity_id=entity_id,
        entity_name=entity_name,
        entity_email=entity_email,
        entity_phone=entity_phone,
        entity_address=entity_address,
        booking_ids=booking_ids,
        line_items=line_items,
        subtotal=round(subtotal, 2),
        commission=round(commission, 2),
        commission_type=commission_type,
        commission_value=commission_value,
        tax_rate=data.tax_rate,
        tax=round(tax, 2),
        total=round(total, 2),
        profit_total=round(profit_total, 2) if profit_total is not None else None,
        notes=data.notes,
        internal_notes=data.internal_notes,
        payment_terms=data.payment_terms,
        due_date=(datetime.now(timezone.utc) + timedelta(days=due_days)).strftime("%Y-%m-%d"),
        created_by=user.get("email", "admin")
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

@api_router.post("/invoices/{invoice_id}/approve")
async def approve_invoice(invoice_id: str, user: dict = Depends(get_super_admin)):
    """Approve a pending invoice"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice["status"] not in ["draft", "pending_approval"]:
        raise HTTPException(status_code=400, detail="Invoice cannot be approved in current status")
    
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "status": "approved",
            "approved_by": user.get("email", "admin"),
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return await db.invoices.find_one({"id": invoice_id}, {"_id": 0})

@api_router.post("/invoices/{invoice_id}/issue")
async def issue_invoice(invoice_id: str, background_tasks: BackgroundTasks, user: dict = Depends(get_super_admin)):
    """Issue an approved invoice (makes it official)"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Can issue from draft or approved
    if invoice["status"] not in ["draft", "approved"]:
        raise HTTPException(status_code=400, detail="Invoice must be draft or approved to be issued")
    
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "status": "issued",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated_invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    
    # Send email notification
    background_tasks.add_task(send_invoice_issued, updated_invoice)
    
    return updated_invoice

@api_router.post("/invoices/{invoice_id}/mark-paid")
async def mark_invoice_paid(invoice_id: str, user: dict = Depends(get_super_admin)):
    """Mark an invoice as paid"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "status": "paid",
            "paid_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return await db.invoices.find_one({"id": invoice_id}, {"_id": 0})

@api_router.post("/invoices/auto-generate-fleet")
async def auto_generate_fleet_invoices(user: dict = Depends(get_super_admin)):
    """Auto-generate invoices for all fleets for the last 15-day period"""
    today = datetime.now(timezone.utc)
    
    # Determine period: 1st-15th or 16th-end of month
    if today.day <= 15:
        period_start = today.replace(day=1).strftime("%Y-%m-%d")
        period_end = today.replace(day=15).strftime("%Y-%m-%d")
    else:
        period_start = today.replace(day=16).strftime("%Y-%m-%d")
        # Last day of month
        next_month = today.replace(day=28) + timedelta(days=4)
        period_end = (next_month - timedelta(days=next_month.day)).strftime("%Y-%m-%d")
    
    generated_invoices = []
    fleets = await db.fleets.find({"status": "active"}, {"_id": 0}).to_list(100)
    
    for fleet in fleets:
        # Find completed jobs for this fleet in the period that haven't been invoiced
        completed_jobs = await db.bookings.find({
            "assigned_fleet_id": fleet["id"],
            "status": "completed",
            "pickup_date": {"$gte": period_start, "$lte": period_end},
            "fleet_invoice_id": {"$in": [None, ""]}
        }, {"_id": 0}).to_list(500)
        
        if not completed_jobs:
            continue
        
        booking_ids = [j["id"] for j in completed_jobs]
        subtotal = sum(j.get("driver_price", 0) for j in completed_jobs)
        
        # Calculate commission
        commission_type = fleet.get("commission_type", "percentage")
        commission_value = fleet.get("commission_value", 0)
        if commission_type == "percentage":
            commission = subtotal * (commission_value / 100)
        else:
            commission = len(completed_jobs) * commission_value
        
        # Build line items
        line_items = []
        for b in completed_jobs:
            line_items.append({
                "booking_id": b["id"],
                "booking_ref": b.get("booking_ref", b["id"][:8].upper()),
                "description": f"{b['pickup_location']} → {b['dropoff_location']}",
                "date": b["pickup_date"],
                "pickup_time": b.get("pickup_time", ""),
                "customer_name": b.get("customer_name", ""),
                "vehicle_class": b.get("vehicle_name", b.get("vehicle_category_id", "")),
                "amount": b.get("driver_price", 0)
            })
        
        total = subtotal - commission
        
        invoice = Invoice(
            invoice_number=await generate_invoice_number("fleet"),
            invoice_type="fleet",
            entity_id=fleet["id"],
            entity_name=fleet["name"],
            entity_email=fleet["email"],
            entity_phone=fleet.get("phone", ""),
            entity_address=fleet.get("city", ""),
            booking_ids=booking_ids,
            line_items=line_items,
            subtotal=round(subtotal, 2),
            commission=round(commission, 2),
            commission_type=commission_type,
            commission_value=commission_value,
            total=round(total, 2),
            payment_terms=fleet.get("payment_terms", "Net 14"),
            due_date=(today + timedelta(days=get_payment_term_days(fleet.get("payment_terms", "Net 14")))).strftime("%Y-%m-%d"),
            status="pending_approval",
            period_start=period_start,
            period_end=period_end,
            created_by="system"
        )
        
        await db.invoices.insert_one(invoice.model_dump())
        
        # Update bookings with invoice reference
        await db.bookings.update_many(
            {"id": {"$in": booking_ids}},
            {"$set": {"fleet_invoice_id": invoice.id}}
        )
        
        generated_invoices.append({
            "fleet_name": fleet["name"],
            "invoice_number": invoice.invoice_number,
            "total": invoice.total,
            "jobs_count": len(completed_jobs)
        })
    
    return {
        "message": f"Generated {len(generated_invoices)} fleet invoices",
        "period": f"{period_start} to {period_end}",
        "invoices": generated_invoices
    }

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, user: dict = Depends(get_super_admin)):
    result = await db.invoices.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted"}

@api_router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, user: dict = Depends(get_admin_or_fleet)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if user.get("role") == "fleet_admin" and invoice.get("entity_id") != user.get("fleet_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }}
            .header {{ display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; border-bottom: 2px solid #0A0F1C; padding-bottom: 20px; }}
            .logo {{ font-size: 28px; font-weight: bold; color: #0A0F1C; }}
            .invoice-title {{ text-align: right; }}
            .invoice-title h1 {{ margin: 0; color: #0A0F1C; }}
            .invoice-details {{ display: flex; justify-content: space-between; margin-bottom: 30px; }}
            .invoice-details div {{ flex: 1; }}
            table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            th {{ background: #0A0F1C; color: white; padding: 12px; text-align: left; }}
            td {{ border-bottom: 1px solid #ddd; padding: 12px; }}
            .total-section {{ margin-top: 20px; text-align: right; }}
            .total-row {{ font-size: 18px; margin: 5px 0; }}
            .total-row.final {{ font-size: 24px; font-weight: bold; color: #0A0F1C; border-top: 2px solid #0A0F1C; padding-top: 10px; }}
            .footer {{ margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }}
            .status {{ display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; }}
            .status-draft {{ background: #fef3c7; color: #92400e; }}
            .status-issued {{ background: #dbeafe; color: #1e40af; }}
            .status-paid {{ background: #dcfce7; color: #166534; }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">AIRCABIO</div>
            <div class="invoice-title">
                <h1>INVOICE</h1>
                <p>#{invoice['invoice_number']}</p>
                <span class="status status-{invoice['status']}">{invoice['status'].upper()}</span>
            </div>
        </div>
        
        <div class="invoice-details">
            <div>
                <strong>Bill To:</strong><br>
                {invoice['entity_name']}<br>
                {invoice['entity_email']}
            </div>
            <div style="text-align: right;">
                <strong>Invoice Date:</strong> {invoice['created_at'][:10]}<br>
                <strong>Due Date:</strong> {invoice.get('due_date', 'N/A')[:10] if invoice.get('due_date') else 'N/A'}<br>
                <strong>Type:</strong> {invoice['invoice_type'].title()}
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Booking Ref</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th style="text-align: right;">Amount</th>
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
                    <td style="text-align: right;">£{item.get('amount', 0):.2f}</td>
                </tr>
        """
    
    html_content += f"""
            </tbody>
        </table>
        
        <div class="total-section">
            <div class="total-row">Subtotal: £{invoice['subtotal']:.2f}</div>
    """
    
    if invoice.get('commission', 0) > 0:
        html_content += f"""
            <div class="total-row">Commission: -£{invoice['commission']:.2f}</div>
        """
    
    if invoice.get('tax', 0) > 0:
        html_content += f"""
            <div class="total-row">Tax: £{invoice['tax']:.2f}</div>
        """
    
    html_content += f"""
            <div class="total-row final">Total: £{invoice['total']:.2f}</div>
        </div>
        
        {f'<p><strong>Notes:</strong> {invoice["notes"]}</p>' if invoice.get('notes') else ''}
        
        <div class="footer">
            <p>Thank you for your business!</p>
            <p>Aircabio Airport Transfers | info@aircabio.com | +44 20 1234 5678</p>
        </div>
    </body>
    </html>
    """
    
    return StreamingResponse(
        io.BytesIO(html_content.encode()),
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename=invoice_{invoice['invoice_number']}.html"}
    )

# ==================== VEHICLE CATEGORIES (Public) ====================

@api_router.get("/vehicles", response_model=List[VehicleCategory])
async def get_vehicle_categories():
    vehicles = await db.vehicles.find({"is_active": True}, {"_id": 0}).to_list(100)
    return vehicles

@api_router.get("/vehicles/{vehicle_id}", response_model=VehicleCategory)
async def get_vehicle_category(vehicle_id: str):
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

@api_router.post("/admin/vehicle-categories", response_model=VehicleCategory)
async def create_vehicle_category(vehicle: VehicleCategory, user: dict = Depends(get_super_admin)):
    await db.vehicles.insert_one(vehicle.model_dump())
    return vehicle

@api_router.put("/admin/vehicle-categories/{vehicle_id}", response_model=VehicleCategory)
async def update_vehicle_category(vehicle_id: str, vehicle: VehicleCategory, user: dict = Depends(get_super_admin)):
    result = await db.vehicles.update_one({"id": vehicle_id}, {"$set": vehicle.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

@api_router.delete("/admin/vehicle-categories/{vehicle_id}")
async def delete_vehicle_category(vehicle_id: str, user: dict = Depends(get_super_admin)):
    result = await db.vehicles.delete_one({"id": vehicle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle deleted"}

# ==================== PRICING & ROUTES ====================

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

# ==================== COMPREHENSIVE PRICING MODULE ====================

@api_router.get("/pricing-schemes")
async def get_pricing_schemes(user: dict = Depends(get_super_admin)):
    """Get all pricing schemes with vehicle info"""
    schemes = await db.pricing_schemes.find({}, {"_id": 0}).to_list(100)
    vehicles = {v["id"]: v for v in await db.vehicles.find({}, {"_id": 0}).to_list(100)}
    
    for scheme in schemes:
        vehicle = vehicles.get(scheme.get("vehicle_category_id"))
        if vehicle:
            scheme["vehicle_name"] = vehicle["name"]
    
    return schemes

@api_router.get("/pricing-schemes/{vehicle_id}")
async def get_pricing_scheme(vehicle_id: str, user: dict = Depends(get_super_admin)):
    """Get pricing scheme for a specific vehicle class"""
    scheme = await db.pricing_schemes.find_one({"vehicle_category_id": vehicle_id}, {"_id": 0})
    if not scheme:
        # Return default scheme if none exists
        vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
        return {
            "id": None,
            "vehicle_category_id": vehicle_id,
            "vehicle_name": vehicle["name"] if vehicle else vehicle_id,
            "mileage_brackets": [],
            "time_rates": {"hourly_rate": 0, "minimum_hours": 2, "daily_rate": 0},
            "extra_fees": {
                "additional_pickup_fee": 10.0,
                "waiting_per_minute": 0.50,
                "airport_pickup_fee": 10.0,
                "meet_greet_fee": 15.0,
                "night_surcharge_percent": 20.0,
                "weekend_surcharge_percent": 0.0,
                "child_seat_fee": 10.0
            },
            "base_fare": 0,
            "minimum_fare": 25.0,
            "currency": "GBP"
        }
    
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    scheme["vehicle_name"] = vehicle["name"] if vehicle else vehicle_id
    return scheme

@api_router.post("/pricing-schemes")
async def create_pricing_scheme(data: PricingSchemeCreate, user: dict = Depends(get_super_admin)):
    """Create or update pricing scheme for a vehicle class"""
    # Check if scheme exists for this vehicle
    existing = await db.pricing_schemes.find_one({"vehicle_category_id": data.vehicle_category_id})
    
    vehicle = await db.vehicles.find_one({"id": data.vehicle_category_id}, {"_id": 0})
    
    scheme_data = {
        "id": existing["id"] if existing else str(uuid.uuid4()),
        "vehicle_category_id": data.vehicle_category_id,
        "vehicle_name": vehicle["name"] if vehicle else data.vehicle_category_id,
        "mileage_brackets": data.mileage_brackets,
        "time_rates": data.time_rates or {"hourly_rate": 0, "minimum_hours": 2, "daily_rate": 0},
        "extra_fees": data.extra_fees or {
            "additional_pickup_fee": 10.0,
            "waiting_per_minute": 0.50,
            "airport_pickup_fee": 10.0,
            "meet_greet_fee": 15.0,
            "night_surcharge_percent": 20.0,
            "weekend_surcharge_percent": 0.0,
            "child_seat_fee": 10.0
        },
        "base_fare": data.base_fare,
        "minimum_fare": data.minimum_fare,
        "currency": data.currency,
        "is_active": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if not existing:
        scheme_data["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.pricing_schemes.update_one(
        {"vehicle_category_id": data.vehicle_category_id},
        {"$set": scheme_data},
        upsert=True
    )
    
    return scheme_data

@api_router.put("/pricing-schemes/{vehicle_id}")
async def update_pricing_scheme(vehicle_id: str, update: PricingSchemeUpdate, user: dict = Depends(get_super_admin)):
    """Update pricing scheme for a vehicle class"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.pricing_schemes.update_one(
        {"vehicle_category_id": vehicle_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pricing scheme not found")
    
    return await db.pricing_schemes.find_one({"vehicle_category_id": vehicle_id}, {"_id": 0})

# ==================== MAP-BASED FIXED ROUTES ====================

@api_router.get("/map-fixed-routes")
async def get_map_fixed_routes(
    vehicle_id: Optional[str] = None,
    user: dict = Depends(get_super_admin)
):
    """Get all map-based fixed routes"""
    query = {}
    if vehicle_id:
        query["vehicle_category_id"] = vehicle_id
    
    routes = await db.map_fixed_routes.find(query, {"_id": 0}).sort("priority", -1).to_list(500)
    vehicles = {v["id"]: v for v in await db.vehicles.find({}, {"_id": 0}).to_list(100)}
    
    for route in routes:
        vehicle = vehicles.get(route.get("vehicle_category_id"))
        route["vehicle_name"] = vehicle["name"] if vehicle else route.get("vehicle_category_id")
    
    return routes

@api_router.get("/map-fixed-routes/{route_id}")
async def get_map_fixed_route(route_id: str, user: dict = Depends(get_super_admin)):
    """Get a single map-based fixed route"""
    route = await db.map_fixed_routes.find_one({"id": route_id}, {"_id": 0})
    if not route:
        raise HTTPException(status_code=404, detail="Fixed route not found")
    
    vehicle = await db.vehicles.find_one({"id": route.get("vehicle_category_id")}, {"_id": 0})
    route["vehicle_name"] = vehicle["name"] if vehicle else route.get("vehicle_category_id")
    return route

@api_router.post("/map-fixed-routes")
async def create_map_fixed_route(data: MapFixedRouteCreate, user: dict = Depends(get_super_admin)):
    """Create a new map-based fixed route"""
    vehicle = await db.vehicles.find_one({"id": data.vehicle_category_id}, {"_id": 0})
    
    route = MapFixedRoute(
        name=data.name,
        vehicle_category_id=data.vehicle_category_id,
        vehicle_name=vehicle["name"] if vehicle else data.vehicle_category_id,
        start_label=data.start_label,
        start_lat=data.start_lat,
        start_lng=data.start_lng,
        start_radius_miles=data.start_radius_miles,
        end_label=data.end_label,
        end_lat=data.end_lat,
        end_lng=data.end_lng,
        end_radius_miles=data.end_radius_miles,
        price=data.price,
        distance_miles=data.distance_miles,
        duration_minutes=data.duration_minutes,
        valid_return=data.valid_return,
        priority=data.priority,
        route_type="return" if data.valid_return else "one_way"
    )
    
    await db.map_fixed_routes.insert_one(route.model_dump())
    return route.model_dump()

@api_router.put("/map-fixed-routes/{route_id}")
async def update_map_fixed_route(route_id: str, update: MapFixedRouteUpdate, user: dict = Depends(get_super_admin)):
    """Update a map-based fixed route"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if "valid_return" in update_data:
        update_data["route_type"] = "return" if update_data["valid_return"] else "one_way"
    
    result = await db.map_fixed_routes.update_one({"id": route_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fixed route not found")
    
    return await db.map_fixed_routes.find_one({"id": route_id}, {"_id": 0})

@api_router.delete("/map-fixed-routes/{route_id}")
async def delete_map_fixed_route(route_id: str, user: dict = Depends(get_super_admin)):
    """Delete a map-based fixed route"""
    result = await db.map_fixed_routes.delete_one({"id": route_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fixed route not found")
    return {"message": "Fixed route deleted"}

@api_router.get("/map-fixed-routes/vehicle/{vehicle_id}")
async def get_vehicle_fixed_routes(vehicle_id: str, user: dict = Depends(get_super_admin)):
    """Get all fixed routes for a specific vehicle class"""
    routes = await db.map_fixed_routes.find(
        {"vehicle_category_id": vehicle_id, "is_active": True},
        {"_id": 0}
    ).sort("priority", -1).to_list(100)
    return routes

@api_router.get("/pricing-summary/{vehicle_id}")
async def get_pricing_summary(vehicle_id: str, user: dict = Depends(get_super_admin)):
    """Get pricing summary for a vehicle class (counts, etc.)"""
    scheme = await db.pricing_schemes.find_one({"vehicle_category_id": vehicle_id}, {"_id": 0})
    fixed_routes_count = await db.map_fixed_routes.count_documents({"vehicle_category_id": vehicle_id, "is_active": True})
    
    return {
        "vehicle_category_id": vehicle_id,
        "mileage_brackets_count": len(scheme.get("mileage_brackets", [])) if scheme else 0,
        "fixed_routes_count": fixed_routes_count,
        "has_time_rates": bool(scheme and scheme.get("time_rates", {}).get("hourly_rate", 0) > 0),
        "has_fees_configured": bool(scheme and scheme.get("extra_fees"))
    }

# ==================== QUOTE CALCULATION WITH NEW PRICING ====================

def miles_to_km(miles: float) -> float:
    return miles * 1.60934

def km_to_miles(km: float) -> float:
    return km / 1.60934

def haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in miles between two points"""
    R = 3959  # Earth's radius in miles
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def is_point_in_radius_miles(point_lat: float, point_lng: float, center_lat: float, center_lng: float, radius_miles: float) -> bool:
    """Check if a point is within a radius (in miles) of a center point"""
    distance = haversine_miles(point_lat, point_lng, center_lat, center_lng)
    return distance <= radius_miles

async def find_matching_fixed_route(pickup_lat: float, pickup_lng: float, dropoff_lat: float, dropoff_lng: float, vehicle_id: str):
    """Find a matching fixed route for the given coordinates"""
    routes = await db.map_fixed_routes.find(
        {"vehicle_category_id": vehicle_id, "is_active": True},
        {"_id": 0}
    ).sort("priority", -1).to_list(100)
    
    for route in routes:
        # Check if pickup is in start zone and dropoff is in end zone
        pickup_in_start = is_point_in_radius_miles(
            pickup_lat, pickup_lng,
            route["start_lat"], route["start_lng"],
            route["start_radius_miles"]
        )
        dropoff_in_end = is_point_in_radius_miles(
            dropoff_lat, dropoff_lng,
            route["end_lat"], route["end_lng"],
            route["end_radius_miles"]
        )
        
        if pickup_in_start and dropoff_in_end:
            return route
        
        # If valid_return, also check reverse direction
        if route.get("valid_return"):
            pickup_in_end = is_point_in_radius_miles(
                pickup_lat, pickup_lng,
                route["end_lat"], route["end_lng"],
                route["end_radius_miles"]
            )
            dropoff_in_start = is_point_in_radius_miles(
                dropoff_lat, dropoff_lng,
                route["start_lat"], route["start_lng"],
                route["start_radius_miles"]
            )
            
            if pickup_in_end and dropoff_in_start:
                return route
    
    return None

async def calculate_mileage_price(distance_miles: float, vehicle_id: str) -> Optional[float]:
    """Calculate price based on mileage brackets"""
    scheme = await db.pricing_schemes.find_one({"vehicle_category_id": vehicle_id}, {"_id": 0})
    if not scheme or not scheme.get("mileage_brackets"):
        return None
    
    brackets = sorted(scheme["mileage_brackets"], key=lambda x: x.get("order", 0))
    total_price = scheme.get("base_fare", 0)
    remaining_miles = distance_miles
    
    for bracket in brackets:
        min_miles = bracket.get("min_miles", 0)
        max_miles = bracket.get("max_miles")  # None means unlimited
        fixed_price = bracket.get("fixed_price")
        per_mile_rate = bracket.get("per_mile_rate")
        
        if distance_miles < min_miles:
            continue
        
        # Calculate miles in this bracket
        if max_miles is None:
            miles_in_bracket = max(0, distance_miles - min_miles)
        else:
            miles_in_bracket = min(distance_miles, max_miles) - min_miles
        
        if miles_in_bracket <= 0:
            continue
        
        if fixed_price is not None and min_miles == 0:
            # First bracket with fixed price
            total_price = fixed_price
        elif per_mile_rate is not None:
            total_price += miles_in_bracket * per_mile_rate
        elif fixed_price is not None:
            total_price += fixed_price
    
    minimum_fare = scheme.get("minimum_fare", 25.0)
    return max(total_price, minimum_fare)

# ==================== RADIUS ZONES & ROUTES ====================

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

@api_router.get("/radius-routes")
async def get_radius_routes(user: dict = Depends(get_super_admin)):
    routes = await db.radius_routes.find({}, {"_id": 0}).to_list(100)
    zones = {z["id"]: z for z in await db.radius_zones.find({}, {"_id": 0}).to_list(100)}
    for route in routes:
        pickup_zone = zones.get(route.get("pickup_zone_id"))
        dropoff_zone = zones.get(route.get("dropoff_zone_id"))
        route["pickup_zone_name"] = pickup_zone["name"] if pickup_zone else "Unknown"
        route["dropoff_zone_name"] = dropoff_zone["name"] if dropoff_zone else "Unknown"
    return routes

@api_router.post("/radius-routes", response_model=RadiusRoute)
async def create_radius_route(route: RadiusRoute, user: dict = Depends(get_super_admin)):
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

# ==================== QUOTE & BOOKING (Website) ====================

@api_router.post("/quote", response_model=QuoteResponse)
async def get_quote(request: QuoteRequest):
    vehicles = await db.vehicles.find({"is_active": True}, {"_id": 0}).to_list(100)
    pricing_rules = await db.pricing_rules.find({}, {"_id": 0}).to_list(100)
    pricing_schemes = await db.pricing_schemes.find({}, {"_id": 0}).to_list(100)
    schemes_by_vehicle = {s["vehicle_category_id"]: s for s in pricing_schemes}
    
    distance_miles = km_to_miles(request.distance_km)
    
    quotes = []
    for vehicle in vehicles:
        if vehicle["max_passengers"] < request.passengers or vehicle["max_luggage"] < request.luggage:
            continue
        
        price = None
        currency = "GBP"
        used_fixed_route = False
        
        # Priority 1: Check map-based fixed routes (new system)
        if request.pickup_lat and request.pickup_lng and request.dropoff_lat and request.dropoff_lng:
            fixed_route = await find_matching_fixed_route(
                request.pickup_lat, request.pickup_lng,
                request.dropoff_lat, request.dropoff_lng,
                vehicle["id"]
            )
            if fixed_route:
                price = fixed_route["price"]
                used_fixed_route = True
        
        # Priority 2: Check text-based fixed routes (legacy)
        if price is None:
            fixed_routes = await db.fixed_routes.find({"is_active": True}, {"_id": 0}).to_list(100)
            for route in fixed_routes:
                if (request.pickup_location.lower() in route["pickup_location"].lower() or 
                    route["pickup_location"].lower() in request.pickup_location.lower()) and \
                   (request.dropoff_location.lower() in route["dropoff_location"].lower() or
                    route["dropoff_location"].lower() in request.dropoff_location.lower()):
                    if vehicle["id"] in route.get("prices", {}):
                        price = route["prices"][vehicle["id"]]
                        used_fixed_route = True
                        break
        
        # Priority 3: Use mileage brackets from pricing scheme (new system)
        if price is None:
            scheme = schemes_by_vehicle.get(vehicle["id"])
            if scheme and scheme.get("mileage_brackets"):
                price = await calculate_mileage_price(distance_miles, vehicle["id"])
                if price:
                    # Add extra fees
                    extra_fees = scheme.get("extra_fees", {})
                    if request.is_airport_pickup:
                        price += extra_fees.get("airport_pickup_fee", 10.0)
                    if request.meet_greet:
                        price += extra_fees.get("meet_greet_fee", 15.0)
        
        # Priority 4: Use legacy pricing rules
        if price is None:
            rule = next((r for r in pricing_rules if r["vehicle_category_id"] == vehicle["id"]), None)
            if rule:
                price = rule["base_fee"] + (request.distance_km * rule["per_km_rate"])
                if request.is_airport_pickup:
                    price += rule["airport_surcharge"]
                if request.meet_greet:
                    price += rule["meet_greet_fee"]
                price = max(price, rule["minimum_fare"])
                currency = rule["currency"]
        
        # Fallback pricing
        if price is None:
            price = 25.0 + (request.distance_km * 1.8)
            if request.meet_greet:
                price += 15.0
            if request.is_airport_pickup:
                price += 10.0
        
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

# Legacy booking create for website
class LegacyBookingCreate(BaseModel):
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

@api_router.post("/bookings")
async def create_booking(booking_data: LegacyBookingCreate, user: dict = Depends(get_optional_user)):
    vehicle = await db.vehicles.find_one({"id": booking_data.vehicle_category_id}, {"_id": 0})
    
    booking = Booking(
        pickup_location=booking_data.pickup_location,
        pickup_lat=booking_data.pickup_lat,
        pickup_lng=booking_data.pickup_lng,
        dropoff_location=booking_data.dropoff_location,
        dropoff_lat=booking_data.dropoff_lat,
        dropoff_lng=booking_data.dropoff_lng,
        pickup_date=booking_data.pickup_date,
        pickup_time=booking_data.pickup_time,
        passengers=booking_data.passengers,
        luggage=booking_data.luggage,
        small_bags=0,
        large_bags=booking_data.luggage,
        vehicle_category_id=booking_data.vehicle_category_id,
        vehicle_name=vehicle["name"] if vehicle else None,
        flight_number=booking_data.flight_number,
        meet_greet=booking_data.meet_greet,
        pickup_notes=booking_data.pickup_notes,
        dropoff_notes=booking_data.dropoff_notes,
        customer_name=booking_data.passenger_name,
        customer_email=booking_data.passenger_email,
        customer_phone=booking_data.passenger_phone,
        user_id=user["id"] if user else None,
        distance_km=booking_data.distance_km,
        duration_minutes=booking_data.duration_minutes,
        customer_price=booking_data.price,
        driver_price=booking_data.price * 0.7,  # Default 70% to driver
        profit=booking_data.price * 0.3,
        price=booking_data.price,
        currency=booking_data.currency,
        status="new",
        customer_source="website"
    )
    
    await db.bookings.insert_one(booking.model_dump())
    return booking.model_dump()

@api_router.get("/bookings")
async def get_user_bookings(user: dict = Depends(get_current_user)):
    bookings = await db.bookings.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return bookings

@api_router.get("/bookings/{booking_id}")
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
    
    price = booking.get("customer_price", booking.get("price", 0))
    
    checkout_request = CheckoutSessionRequest(
        amount=float(price),
        currency=booking.get("currency", "gbp").lower(),
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "booking_id": booking_id,
            "passenger_email": booking.get("customer_email", booking.get("passenger_email", "")),
            "pickup_location": booking["pickup_location"],
            "dropoff_location": booking["dropoff_location"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "booking_id": booking_id,
        "amount": float(price),
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
            {"$set": {"payment_status": "paid", "status": "unassigned", "updated_at": datetime.now(timezone.utc).isoformat()}}
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
                    {"$set": {"payment_status": "paid", "status": "unassigned"}}
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
            id="saloon", name="Saloon", description="Comfortable saloon for up to 4 passengers",
            max_passengers=4, max_luggage=2,
            image_url="https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400",
            features=["Air Conditioning", "Leather Seats", "Free WiFi", "Bottled Water"]
        ),
        VehicleCategory(
            id="executive", name="Executive", description="Premium executive vehicle for business travelers",
            max_passengers=4, max_luggage=2,
            image_url="https://images.unsplash.com/photo-1563720360172-67b8f3dce741?w=400",
            features=["Air Conditioning", "Leather Seats", "Free WiFi", "Newspapers", "Bottled Water", "Phone Charger"]
        ),
        VehicleCategory(
            id="estate", name="Estate", description="Estate car with extra luggage space",
            max_passengers=4, max_luggage=4,
            image_url="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400",
            features=["Air Conditioning", "Extra Luggage Space", "Free WiFi"]
        ),
        VehicleCategory(
            id="mpv", name="MPV", description="Multi-purpose vehicle for families",
            max_passengers=6, max_luggage=4,
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
        PricingRule(id="pr-saloon", vehicle_category_id="saloon", base_fee=5.0, per_km_rate=1.5, minimum_fare=25.0),
        PricingRule(id="pr-executive", vehicle_category_id="executive", base_fee=10.0, per_km_rate=2.0, minimum_fare=35.0),
        PricingRule(id="pr-estate", vehicle_category_id="estate", base_fee=7.0, per_km_rate=1.7, minimum_fare=28.0),
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
            prices={"saloon": 55.0, "executive": 75.0, "estate": 60.0, "mpv": 85.0, "van": 95.0, "minibus": 150.0}
        ),
        FixedRoute(
            id="lgw-central", name="Gatwick to Central London",
            pickup_location="Gatwick Airport", dropoff_location="Central London",
            prices={"saloon": 65.0, "executive": 85.0, "estate": 70.0, "mpv": 95.0, "van": 110.0, "minibus": 170.0}
        ),
        FixedRoute(
            id="stn-central", name="Stansted to Central London",
            pickup_location="Stansted Airport", dropoff_location="Central London",
            prices={"saloon": 75.0, "executive": 95.0, "estate": 80.0, "mpv": 105.0, "van": 120.0, "minibus": 190.0}
        )
    ]
    
    for r in fixed_routes:
        await db.fixed_routes.update_one({"id": r.id}, {"$set": r.model_dump()}, upsert=True)
    
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
    
    # Create sample driver
    driver_exists = await db.drivers.find_one({"email": "driver1@aircabio.com"})
    if not driver_exists:
        sample_driver = Driver(
            id="driver-1",
            name="Mike Johnson",
            email="driver1@aircabio.com",
            phone="+44 7700 900123",
            license_number="JOHNS123456",
            driver_type="internal",
            status="active"
        )
        await db.drivers.insert_one(sample_driver.model_dump())
    
    # Create sample vehicle
    vehicle_exists = await db.fleet_vehicles.find_one({"plate_number": "AB12 CDE"})
    if not vehicle_exists:
        sample_vehicle = Vehicle(
            id="vehicle-1",
            name="Mercedes E-Class",
            plate_number="AB12 CDE",
            category_id="executive",
            make="Mercedes",
            model="E-Class",
            year=2023,
            color="Black",
            passenger_capacity=4,
            luggage_capacity=2,
            driver_id="driver-1",
            status="active"
        )
        await db.fleet_vehicles.insert_one(sample_vehicle.model_dump())
    
    return {"message": "Seed data created successfully"}

# ==================== COMPLETE CMS SYSTEM ====================

# Media Library Model
class MediaItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    url: str
    type: str = "image"  # image, video, document
    size: int = 0
    alt_text: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Vehicle Category with full CMS support
class VehicleCategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    passengers: Optional[int] = None
    luggage: Optional[int] = None
    features: Optional[List[str]] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

# Page Content Model
class PageSection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # hero, text, image, features, cta, testimonials, etc.
    title: str = ""
    subtitle: str = ""
    content: str = ""
    image_url: str = ""
    button_text: str = ""
    button_link: str = ""
    items: List[Dict[str, Any]] = []
    order: int = 0
    is_active: bool = True

class PageContent(BaseModel):
    page_id: str  # home, about, services, fleet, contact, terms, privacy
    title: str
    meta_title: str = ""
    meta_description: str = ""
    sections: List[PageSection] = []
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Complete Website Settings
class WebsiteSettings(BaseModel):
    # Branding
    site_name: str = "Aircabio"
    logo_url: str = ""
    favicon_url: str = ""
    tagline: str = "Travel in Style & Comfort"
    
    # Hero Section
    hero_title: str = "Travel in Style & Comfort"
    hero_subtitle: str = "Book your airport transfer with Aircabio. Professional drivers, premium vehicles, and guaranteed on-time service worldwide."
    hero_background_url: str = ""
    hero_cta_text: str = "Book Now"
    hero_cta_link: str = "#booking-section"
    
    # Contact
    contact_email: str = ""
    contact_phone: str = ""
    contact_address: str = ""
    whatsapp_number: str = ""
    
    # Social Media
    facebook_url: str = ""
    twitter_url: str = ""
    instagram_url: str = ""
    linkedin_url: str = ""
    youtube_url: str = ""
    
    # Colors
    primary_color: str = "#D4AF37"
    secondary_color: str = "#0A0F1C"
    accent_color: str = "#1a1a2e"
    
    # SEO
    meta_title: str = ""
    meta_description: str = ""
    meta_keywords: str = ""
    
    # Footer
    footer_text: str = ""
    footer_links: List[Dict[str, str]] = []
    
    # Header
    header_cta_text: str = "Book Now"
    header_cta_link: str = "/booking"

# ==================== DRIVER TRACKING SYSTEM ====================

class TrackingLocation(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    speed: Optional[float] = None
    heading: Optional[float] = None

class TrackingSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    driver_id: str
    driver_name: str
    token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"  # pending, active, completed
    locations: List[Dict[str, Any]] = []
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Generate tracking link for a booking/driver assignment
@api_router.post("/tracking/generate/{booking_id}")
async def generate_tracking_link(
    booking_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Generate a tracking link for a driver assignment and optionally send via email"""
    if current_user.get("role") not in ["super_admin", "fleet_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get booking
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check if driver is assigned - support both driver_id and assigned_driver_name
    driver_id = booking.get("driver_id")
    driver_name = booking.get("assigned_driver_name")
    driver = None
    
    if driver_id:
        driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    elif driver_name:
        # Try to find driver by name
        driver = await db.drivers.find_one({"name": driver_name}, {"_id": 0})
        if driver:
            driver_id = driver.get("id")
    
    # If still no driver, check if at least name is available
    if not driver and not driver_name:
        raise HTTPException(status_code=400, detail="No driver assigned to this booking")
    
    # Use driver data if found, otherwise use booking's assigned driver name
    if driver:
        driver_id = driver.get("id")
        driver_name = driver.get("name", driver_name)
        driver_email = driver.get("email", "")
    else:
        driver_id = f"driver-{booking_id[:8]}"  # Generate pseudo ID
        driver_email = ""
    
    # Check for existing tracking session
    existing = await db.tracking_sessions.find_one({
        "booking_id": booking_id,
        "status": {"$in": ["pending", "active"]}
    }, {"_id": 0})
    
    if existing:
        return {
            "tracking_id": existing["id"],
            "token": existing["token"],
            "tracking_url": f"/driver-tracking/{existing['token']}",
            "status": existing["status"],
            "message": "Tracking session already exists"
        }
    
    # Create new tracking session
    session = TrackingSession(
        booking_id=booking_id,
        driver_id=driver_id,
        driver_name=driver_name
    )
    
    await db.tracking_sessions.insert_one(session.model_dump())
    
    # Update booking with tracking info
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "tracking_id": session.id,
            "tracking_token": session.token,
            "tracking_status": "pending"
        }}
    )
    
    return {
        "tracking_id": session.id,
        "token": session.token,
        "tracking_url": f"/driver-tracking/{session.token}",
        "driver_email": driver_email if driver else "",
        "driver_name": driver_name,
        "message": "Tracking link generated successfully"
    }

# Send tracking link via email
@api_router.post("/tracking/send-email/{booking_id}")
async def send_tracking_email(
    booking_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Send tracking link to driver via email"""
    if current_user.get("role") not in ["super_admin", "fleet_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get booking and tracking session
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    tracking_token = booking.get("tracking_token")
    if not tracking_token:
        raise HTTPException(status_code=400, detail="No tracking session exists. Generate one first.")
    
    driver_id = booking.get("driver_id")
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver or not driver.get("email"):
        raise HTTPException(status_code=400, detail="Driver has no email address")
    
    # Get website settings for branding
    settings = await db.website_settings.find_one({"_id": "main"})
    site_name = settings.get("site_name", "Aircabio") if settings else "Aircabio"
    
    # Import and send email
    from email_service import send_driver_tracking_link
    
    base_url = os.environ.get("FRONTEND_URL")
    if not base_url:
        raise HTTPException(status_code=500, detail="FRONTEND_URL environment variable not configured")
    tracking_url = f"{base_url}/driver-tracking/{tracking_token}"
    
    background_tasks.add_task(
        send_driver_tracking_link,
        driver.get("email"),
        driver.get("name"),
        booking.get("booking_ref", booking_id[:8].upper()),
        booking.get("pickup_location", ""),
        booking.get("dropoff_location", ""),
        booking.get("pickup_date", ""),
        booking.get("pickup_time", ""),
        tracking_url,
        site_name
    )
    
    return {"message": f"Tracking link sent to {driver.get('email')}"}

# Public endpoint - Get tracking session by token (for driver)
@api_router.get("/tracking/session/{token}")
async def get_tracking_session(token: str):
    """Get tracking session details by token - public endpoint for driver"""
    session = await db.tracking_sessions.find_one({"token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Tracking session not found")
    
    # Get booking details
    booking = await db.bookings.find_one({"id": session["booking_id"]}, {"_id": 0})
    
    return {
        "id": session["id"],
        "status": session["status"],
        "driver_name": session["driver_name"],
        "booking": {
            "ref": booking.get("booking_ref", "") if booking else "",
            "pickup_location": booking.get("pickup_location", "") if booking else "",
            "dropoff_location": booking.get("dropoff_location", "") if booking else "",
            "pickup_date": booking.get("pickup_date", "") if booking else "",
            "pickup_time": booking.get("pickup_time", "") if booking else "",
            "customer_name": booking.get("customer_name", "") if booking else "",
            "status": booking.get("status", "") if booking else ""
        },
        "started_at": session.get("started_at"),
        "location_count": len(session.get("locations", []))
    }

# Public endpoint - Update driver location
@api_router.post("/tracking/location/{token}")
async def update_driver_location(token: str, location: TrackingLocation):
    """Update driver location - public endpoint for driver tracking page"""
    session = await db.tracking_sessions.find_one({"token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Tracking session not found")
    
    if session["status"] == "completed":
        raise HTTPException(status_code=400, detail="Tracking session has ended")
    
    # Update session status if first location
    update_data = {
        "$push": {"locations": location.model_dump()},
        "$set": {"status": "active"}
    }
    
    if session["status"] == "pending":
        update_data["$set"]["started_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.tracking_sessions.update_one({"token": token}, update_data)
    
    # Update booking with latest location
    await db.bookings.update_one(
        {"id": session["booking_id"]},
        {"$set": {
            "tracking_status": "active",
            "last_location": location.model_dump(),
            "last_location_update": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Location updated", "status": "active"}

# Public endpoint - Start/Stop tracking
@api_router.post("/tracking/control/{token}")
async def control_tracking(token: str, action: str = Query(..., regex="^(start|stop)$")):
    """Start or stop tracking session"""
    session = await db.tracking_sessions.find_one({"token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Tracking session not found")
    
    if action == "start":
        if session["status"] == "completed":
            raise HTTPException(status_code=400, detail="Session already completed")
        
        await db.tracking_sessions.update_one(
            {"token": token},
            {"$set": {
                "status": "active",
                "started_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        await db.bookings.update_one(
            {"id": session["booking_id"]},
            {"$set": {"tracking_status": "active"}}
        )
        return {"message": "Tracking started", "status": "active"}
    
    elif action == "stop":
        await db.tracking_sessions.update_one(
            {"token": token},
            {"$set": {
                "status": "completed",
                "ended_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        await db.bookings.update_one(
            {"id": session["booking_id"]},
            {"$set": {"tracking_status": "completed"}}
        )
        return {"message": "Tracking stopped", "status": "completed"}

# Public endpoint - Update job status from driver tracking page
class StatusUpdate(BaseModel):
    status: str

@api_router.post("/tracking/update-status/{token}")
async def update_job_status_from_driver(token: str, status_update: StatusUpdate, background_tasks: BackgroundTasks):
    """Update job status from driver tracking page - allows driver to update status live"""
    session = await db.tracking_sessions.find_one({"token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Tracking session not found")
    
    valid_statuses = ["en_route", "arrived", "in_progress", "completed"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Update booking status
    await db.bookings.update_one(
        {"id": session["booking_id"]},
        {"$set": {
            "status": status_update.status,
            "status_updated_at": datetime.now(timezone.utc).isoformat(),
            "status_updated_by": "driver"
        }}
    )
    
    # If completed, also update tracking session
    if status_update.status == "completed":
        await db.tracking_sessions.update_one(
            {"token": token},
            {"$set": {
                "status": "completed",
                "ended_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        await db.bookings.update_one(
            {"id": session["booking_id"]},
            {"$set": {
                "tracking_status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    # Send email notifications for status changes
    updated_booking = await db.bookings.find_one({"id": session["booking_id"]}, {"_id": 0})
    print(f"[TRACKING DEBUG] Status: {status_update.status}, Customer email: {updated_booking.get('customer_email') if updated_booking else 'no booking'}", flush=True)
    if updated_booking and updated_booking.get("customer_email"):
        if status_update.status in ["en_route", "arrived", "in_progress"]:
            # Send status update email with tracking link
            print(f"[TRACKING DEBUG] Sending {status_update.status} email to {updated_booking.get('customer_email')}", flush=True)
            background_tasks.add_task(send_status_update, updated_booking, status_update.status)
        elif status_update.status == "completed":
            # Send completion email with PDF invoice
            print(f"[TRACKING DEBUG] Sending completion + invoice + review emails to {updated_booking.get('customer_email')}", flush=True)
            background_tasks.add_task(send_completion_with_invoice, updated_booking)
            # Send review invitation email
            driver = None
            if updated_booking.get("assigned_driver_id"):
                driver = await db.drivers.find_one({"id": updated_booking["assigned_driver_id"]}, {"_id": 0})
            background_tasks.add_task(send_review_invitation, updated_booking, driver)
    
    return {"message": f"Status updated to {status_update.status}", "status": status_update.status}

# Fleet endpoint - Get tracking data for a booking (fleet can see their jobs)
@api_router.get("/fleet/tracking/{booking_id}")
async def get_fleet_tracking(booking_id: str, current_user: dict = Depends(get_fleet_admin)):
    """Get tracking data for fleet view - similar to admin but fleet restricted"""
    fleet_id = current_user.get("fleet_id")
    
    # Verify booking belongs to this fleet
    booking = await db.bookings.find_one({"id": booking_id, "assigned_fleet_id": fleet_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found or not assigned to your fleet")
    
    session = await db.tracking_sessions.find_one({"booking_id": booking_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="No tracking session for this booking")
    
    return {
        "session": session,
        "booking": booking,
        "latest_location": session["locations"][-1] if session.get("locations") else None,
        "total_locations": len(session.get("locations", []))
    }

# Admin endpoint - Get live tracking data for a booking
@api_router.get("/admin/tracking/{booking_id}")
async def get_admin_tracking(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Get tracking data for admin view"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    session = await db.tracking_sessions.find_one({"booking_id": booking_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="No tracking session for this booking")
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
    # Calculate alerts
    alerts = []
    
    if booking and session.get("locations"):
        # Check for late arrival at pickup
        pickup_time_str = f"{booking.get('pickup_date')} {booking.get('pickup_time')}"
        try:
            # Parse pickup time
            pickup_datetime = datetime.strptime(pickup_time_str, "%Y-%m-%d %H:%M")
            
            # Find when driver marked "arrived" status or first location update
            started_at = session.get("started_at")
            if started_at:
                try:
                    tracking_start = datetime.fromisoformat(started_at.replace("Z", "+00:00")).replace(tzinfo=None)
                    late_minutes = (tracking_start - pickup_datetime).total_seconds() / 60
                    
                    if late_minutes > 0:
                        alerts.append({
                            "type": "late",
                            "message": f"Driver was {int(late_minutes)} minutes late",
                            "details": f"Pickup scheduled: {booking.get('pickup_time')} | Driver started tracking: {tracking_start.strftime('%H:%M')}"
                        })
                except:
                    pass
        except:
            pass
        
        # Check distance from pickup location on first location point
        first_location = session["locations"][0] if session["locations"] else None
        if first_location and booking.get("pickup_lat") and booking.get("pickup_lng"):
            try:
                # Haversine formula to calculate distance
                lat1, lon1 = first_location["latitude"], first_location["longitude"]
                lat2, lon2 = float(booking.get("pickup_lat")), float(booking.get("pickup_lng"))
                
                R = 6371  # Earth's radius in km
                dlat = math.radians(lat2 - lat1)
                dlon = math.radians(lon2 - lon1)
                a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
                distance_km = R * c
                
                if distance_km > 1:  # More than 1km away
                    alerts.append({
                        "type": "distance",
                        "message": f"Driver started tracking {distance_km:.1f}km away from pickup",
                        "details": f"Expected location: {booking.get('pickup_location')[:50]}..."
                    })
            except:
                pass
    
    return {
        "session": session,
        "booking": booking,
        "latest_location": session["locations"][-1] if session.get("locations") else None,
        "total_locations": len(session.get("locations", [])),
        "alerts": alerts
    }

# Admin endpoint - Get all active tracking sessions
@api_router.get("/admin/tracking")
async def get_all_active_tracking(current_user: dict = Depends(get_current_user)):
    """Get all active tracking sessions for admin dashboard"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    sessions = await db.tracking_sessions.find(
        {"status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with booking data
    result = []
    for session in sessions:
        booking = await db.bookings.find_one({"id": session["booking_id"]}, {"_id": 0})
        result.append({
            "session": session,
            "booking": booking,
            "latest_location": session["locations"][-1] if session.get("locations") else None
        })
    
    return result

# Admin endpoint - Download tracking report as PDF
@api_router.get("/admin/tracking/{booking_id}/report")
async def download_tracking_report(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Generate and download PDF tracking report"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    session = await db.tracking_sessions.find_one({"booking_id": booking_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="No tracking session for this booking")
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
    # Get website settings for branding
    settings = await db.website_settings.find_one({"_id": "main"})
    site_name = settings.get("site_name", "Aircabio") if settings else "Aircabio"
    
    # Generate HTML report
    locations = session.get("locations", [])
    
    # Calculate stats
    total_distance = 0
    if len(locations) > 1:
        for i in range(1, len(locations)):
            lat1, lon1 = locations[i-1]["latitude"], locations[i-1]["longitude"]
            lat2, lon2 = locations[i]["latitude"], locations[i]["longitude"]
            # Haversine formula
            R = 6371  # Earth's radius in km
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            total_distance += R * c
    
    duration_str = "N/A"
    if session.get("started_at") and session.get("ended_at"):
        try:
            start = datetime.fromisoformat(session["started_at"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(session["ended_at"].replace("Z", "+00:00"))
            duration = end - start
            hours, remainder = divmod(duration.total_seconds(), 3600)
            minutes, seconds = divmod(remainder, 60)
            duration_str = f"{int(hours)}h {int(minutes)}m {int(seconds)}s"
        except:
            pass
    
    avg_speed = 0
    if locations:
        speeds = [loc.get("speed", 0) or 0 for loc in locations]
        avg_speed = sum(speeds) / len(speeds) if speeds else 0
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Driver Tracking Report</title>
        <style>
            body {{ font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; color: #333; }}
            .header {{ display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; border-bottom: 3px solid #0A0F1C; padding-bottom: 20px; }}
            .logo {{ font-size: 28px; font-weight: bold; color: #0A0F1C; }}
            .report-title {{ text-align: right; }}
            .report-title h1 {{ margin: 0; color: #0A0F1C; font-size: 24px; }}
            .report-title p {{ margin: 5px 0 0; color: #666; }}
            .section {{ margin-bottom: 30px; }}
            .section-title {{ font-size: 18px; font-weight: bold; color: #0A0F1C; border-bottom: 2px solid #D4AF37; padding-bottom: 8px; margin-bottom: 15px; }}
            .info-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }}
            .info-item {{ background: #f9f9f9; padding: 12px; border-radius: 4px; }}
            .info-label {{ font-size: 12px; color: #666; margin-bottom: 4px; }}
            .info-value {{ font-size: 16px; font-weight: 600; color: #0A0F1C; }}
            .stats-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; text-align: center; }}
            .stat-box {{ background: #0A0F1C; color: white; padding: 20px; border-radius: 8px; }}
            .stat-value {{ font-size: 24px; font-weight: bold; color: #D4AF37; }}
            .stat-label {{ font-size: 12px; margin-top: 5px; opacity: 0.8; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }}
            th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid #eee; }}
            th {{ background: #f5f5f5; font-weight: 600; }}
            .footer {{ margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">{site_name}</div>
            <div class="report-title">
                <h1>Driver Tracking Report</h1>
                <p>Generated: {datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")}</p>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Booking Information</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Booking Reference</div>
                    <div class="info-value">{booking.get('booking_ref', booking_id[:8].upper()) if booking else 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Customer Name</div>
                    <div class="info-value">{booking.get('customer_name', 'N/A') if booking else 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Pickup Location</div>
                    <div class="info-value">{booking.get('pickup_location', 'N/A') if booking else 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Dropoff Location</div>
                    <div class="info-value">{booking.get('dropoff_location', 'N/A') if booking else 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Pickup Date</div>
                    <div class="info-value">{booking.get('pickup_date', 'N/A') if booking else 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Pickup Time</div>
                    <div class="info-value">{booking.get('pickup_time', 'N/A') if booking else 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Driver Information</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Driver Name</div>
                    <div class="info-value">{session.get('driver_name', 'N/A')}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Tracking Status</div>
                    <div class="info-value">{session.get('status', 'N/A').upper()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Tracking Started</div>
                    <div class="info-value">{session.get('started_at', 'N/A')[:19].replace('T', ' ') if session.get('started_at') else 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Tracking Ended</div>
                    <div class="info-value">{session.get('ended_at', 'N/A')[:19].replace('T', ' ') if session.get('ended_at') else 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Tracking Summary</div>
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-value">{len(locations)}</div>
                    <div class="stat-label">Total Points</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">{total_distance:.2f} km</div>
                    <div class="stat-label">Distance Traveled</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">{duration_str}</div>
                    <div class="stat-label">Duration</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">{avg_speed:.1f} km/h</div>
                    <div class="stat-label">Avg Speed</div>
                </div>
            </div>
        </div>
    """
    
    # Check for late arrival and add alerts section
    alerts = []
    pickup_time_str = f"{booking.get('pickup_date', '')} {booking.get('pickup_time', '')}" if booking else ""
    try:
        pickup_datetime = datetime.strptime(pickup_time_str.strip(), "%Y-%m-%d %H:%M")
        started_at = session.get("started_at")
        if started_at:
            tracking_start = datetime.fromisoformat(started_at.replace("Z", "+00:00")).replace(tzinfo=None)
            late_minutes = (tracking_start - pickup_datetime).total_seconds() / 60
            if late_minutes > 0:
                alerts.append({
                    "type": "late",
                    "message": f"Driver was {int(late_minutes)} minutes late",
                    "details": f"Scheduled: {booking.get('pickup_time')} | Actual: {tracking_start.strftime('%H:%M')}"
                })
    except:
        pass
    
    # Check distance from pickup on first location
    if locations and booking:
        first_loc = locations[0]
        # Note: We don't have pickup lat/lng stored, so we'll skip this check for now
        # This could be enhanced by geocoding the pickup address
    
    if alerts:
        html_content += """
        <div class="section">
            <div class="section-title">⚠️ Alerts & Issues</div>
            <div style="space-y-3;">
        """
        for alert in alerts:
            color = "#ef4444" if alert["type"] == "late" else "#f59e0b"
            html_content += f"""
                <div style="background: {color}11; border: 1px solid {color}; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                    <p style="margin: 0; font-weight: bold; color: {color};">{alert["message"]}</p>
                    <p style="margin: 5px 0 0; font-size: 12px; color: #666;">{alert["details"]}</p>
                </div>
            """
        html_content += """
            </div>
        </div>
        """
    
    # Add Route Map section with OpenStreetMap (works without API key)
    if locations:
        # Create path for the route
        path_points = locations[-100:]  # Last 100 points
        
        # Build markers for start and end
        start_loc = locations[0] if locations else None
        end_loc = locations[-1] if locations else None
        
        # Calculate bounds for the map
        min_lat = min(loc["latitude"] for loc in path_points)
        max_lat = max(loc["latitude"] for loc in path_points)
        min_lng = min(loc["longitude"] for loc in path_points)
        max_lng = max(loc["longitude"] for loc in path_points)
        
        # Center of all points
        center_lat = (min_lat + max_lat) / 2
        center_lng = (min_lng + max_lng) / 2
        
        # OpenStreetMap embed URL for route overview
        osm_embed = f"https://www.openstreetmap.org/export/embed.html?bbox={min_lng - 0.01}%2C{min_lat - 0.01}%2C{max_lng + 0.01}%2C{max_lat + 0.01}&layer=mapnik&marker={start_loc['latitude']}%2C{start_loc['longitude']}"
        
        html_content += f"""
        <div class="section">
            <div class="section-title">Route Overview</div>
            <div style="text-align: center; margin: 20px 0;">
                <iframe width="100%" height="350" frameborder="0" scrolling="no" src="{osm_embed}" style="border: 1px solid #ddd; border-radius: 8px;"></iframe>
                <p style="color: #666; font-size: 12px; margin-top: 10px;">
                    <span style="color: green;">● Start: {start_loc['latitude']:.4f}, {start_loc['longitude']:.4f}</span> &nbsp;&nbsp;&nbsp; 
                    <span style="color: red;">● End: {end_loc['latitude']:.4f}, {end_loc['longitude']:.4f}</span>
                </p>
                <p style="color: #666; font-size: 11px;">
                    <a href="https://www.google.com/maps/dir/{start_loc['latitude']},{start_loc['longitude']}/{end_loc['latitude']},{end_loc['longitude']}" target="_blank" style="color: #2563eb;">View full route on Google Maps →</a>
                </p>
            </div>
        </div>
        """
        
        # Add individual location points with OpenStreetMap
        if len(locations) > 1:
            html_content += """
        <div class="section">
            <div class="section-title">Key Location Points</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
            """
            
            # Show start, middle points, and end
            key_indices = [0]  # Start
            if len(locations) > 2:
                # Add evenly spaced points
                step = max(1, len(locations) // 4)
                for i in range(step, len(locations) - 1, step):
                    key_indices.append(i)
            key_indices.append(len(locations) - 1)  # End
            
            # Remove duplicates and keep order
            key_indices = list(dict.fromkeys(key_indices))[:6]  # Max 6 points
            
            for idx in key_indices:
                loc = locations[idx]
                # OpenStreetMap embed for individual point
                point_osm = f"https://www.openstreetmap.org/export/embed.html?bbox={loc['longitude'] - 0.005}%2C{loc['latitude'] - 0.005}%2C{loc['longitude'] + 0.005}%2C{loc['latitude'] + 0.005}&layer=mapnik&marker={loc['latitude']}%2C{loc['longitude']}"
                timestamp = loc.get("timestamp", "")[:19].replace("T", " ") if loc.get("timestamp") else ""
                label = "Start" if idx == 0 else ("End" if idx == len(locations) - 1 else f"Point {idx + 1}")
                
                html_content += f"""
                <div style="text-align: center; background: #f9f9f9; padding: 10px; border-radius: 8px;">
                    <iframe width="100%" height="120" frameborder="0" scrolling="no" src="{point_osm}" style="border-radius: 4px; border: 1px solid #ddd;"></iframe>
                    <p style="margin: 8px 0 4px; font-weight: bold; font-size: 12px;">{label}</p>
                    <p style="margin: 0; font-size: 10px; color: #666;">{timestamp}</p>
                    <p style="margin: 4px 0 0; font-size: 10px; font-family: monospace;">{loc['latitude']:.6f}, {loc['longitude']:.6f}</p>
                </div>
                """
            
            html_content += """
            </div>
        </div>
            """
    
    html_content += """
        <div class="section">
            <div class="section-title">Location History (Last 50 Points)</div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Timestamp</th>
                        <th>Latitude</th>
                        <th>Longitude</th>
                        <th>Speed (km/h)</th>
                        <th>Accuracy (m)</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    for i, loc in enumerate(locations[-50:], 1):
        timestamp = loc.get("timestamp", "")[:19].replace("T", " ") if loc.get("timestamp") else ""
        html_content += f"""
                    <tr>
                        <td>{i}</td>
                        <td>{timestamp}</td>
                        <td>{loc.get('latitude', 0):.6f}</td>
                        <td>{loc.get('longitude', 0):.6f}</td>
                        <td>{loc.get('speed', 0) or 0:.1f}</td>
                        <td>{loc.get('accuracy', 0) or 0:.0f}</td>
                    </tr>
        """
    
    html_content += f"""
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>This report was automatically generated by {site_name} Driver Tracking System</p>
            <p>© {datetime.now().year} {site_name}. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    # Return as HTML (can be printed/saved as PDF by browser)
    return StreamingResponse(
        io.BytesIO(html_content.encode()),
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename=tracking_report_{booking_id[:8]}.html"}
    )

# ==================== CUSTOMER TRACKING SYSTEM ====================

class CustomerRating(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = None

# Public endpoint - Customer tracking by booking reference
@api_router.get("/customer/tracking/{booking_ref}")
async def get_customer_tracking(booking_ref: str):
    """Get tracking data for customer view - public endpoint using booking reference"""
    # Find booking by booking_ref
    booking = await db.bookings.find_one(
        {"booking_ref": booking_ref.upper()}, 
        {"_id": 0}
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Get tracking session if exists
    session = await db.tracking_sessions.find_one(
        {"booking_id": booking["id"]}, 
        {"_id": 0}
    )
    
    # Get driver details
    driver_data = {}
    driver_id = booking.get("assigned_driver_id") or booking.get("driver_id")
    if driver_id:
        driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
        if driver:
            # Calculate average rating
            ratings = await db.driver_ratings.find({"driver_id": driver_id}).to_list(1000)
            avg_rating = sum(r.get("rating", 0) for r in ratings) / len(ratings) if ratings else None
            
            driver_data = {
                "name": driver.get("name"),
                "phone": driver.get("phone"),
                "photo_url": driver.get("photo_url"),
                "vehicle_make": driver.get("vehicle_make"),
                "vehicle_model": driver.get("vehicle_model"),
                "vehicle_color": driver.get("vehicle_color"),
                "rating": avg_rating,
                "total_trips": len(ratings)
            }
    
    # Calculate ETA with traffic consideration
    eta = None
    eta_details = None
    if session and session.get("status") == "active" and booking.get("status") == "en_route":
        locations = session.get("locations", [])
        if locations and booking.get("pickup_lat") and booking.get("pickup_lng"):
            last_loc = locations[-1]
            # Calculate distance using Haversine formula
            R = 6371  # Earth radius in km
            lat1, lon1 = math.radians(last_loc["latitude"]), math.radians(last_loc["longitude"])
            lat2, lon2 = math.radians(booking["pickup_lat"]), math.radians(booking["pickup_lng"])
            dlat, dlon = lat2 - lat1, lon2 - lon1
            a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
            distance_km = 2 * R * math.atan2(math.sqrt(a), math.sqrt(1-a))
            
            # Traffic factor based on time of day
            current_hour = datetime.now().hour
            
            # Traffic multipliers
            if 7 <= current_hour <= 9:  # Morning rush
                traffic_multiplier = 1.5
                traffic_status = "heavy"
            elif 16 <= current_hour <= 19:  # Evening rush
                traffic_multiplier = 1.6
                traffic_status = "heavy"
            elif 12 <= current_hour <= 14:  # Lunch time
                traffic_multiplier = 1.2
                traffic_status = "moderate"
            elif 22 <= current_hour or current_hour <= 5:  # Night time
                traffic_multiplier = 0.8
                traffic_status = "light"
            else:
                traffic_multiplier = 1.0
                traffic_status = "normal"
            
            # Base speed: 30 km/h in urban areas, adjusted for traffic
            base_speed = 30
            effective_speed = base_speed / traffic_multiplier
            
            # Calculate ETA in minutes
            eta = max(1, int((distance_km / effective_speed) * 60))
            
            eta_details = {
                "minutes": eta,
                "distance_km": round(distance_km, 2),
                "traffic_status": traffic_status,
                "effective_speed_kmh": round(effective_speed, 1),
                "calculated_at": datetime.now(timezone.utc).isoformat()
            }
    
    return {
        "booking": {
            "id": booking["id"],
            "booking_ref": booking.get("booking_ref"),
            "status": booking.get("status"),
            "pickup_location": booking.get("pickup_location"),
            "dropoff_location": booking.get("dropoff_location"),
            "pickup_date": booking.get("pickup_date"),
            "pickup_time": booking.get("pickup_time"),
            "passengers": booking.get("passengers"),
            "vehicle_name": booking.get("vehicle_name"),
            "vehicle_category_id": booking.get("vehicle_category_id"),
            "assigned_driver_name": booking.get("assigned_driver_name"),
            "assigned_vehicle_plate": booking.get("assigned_vehicle_plate"),
            "customer_rating": booking.get("customer_rating")
        },
        "tracking": {
            "session": session,
            "driver": driver_data,
            "latest_location": session["locations"][-1] if session and session.get("locations") else None
        } if session else None,
        "eta": eta,
        "eta_details": eta_details
    }


# Public endpoint - Submit customer rating
@api_router.post("/customer/rating/{booking_ref}")
async def submit_customer_rating(booking_ref: str, rating_data: CustomerRating):
    """Submit customer rating for a completed trip"""
    booking = await db.bookings.find_one({"booking_ref": booking_ref.upper()}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Can only rate completed trips")
    
    if booking.get("customer_rating"):
        raise HTTPException(status_code=400, detail="Trip already rated")
    
    # Update booking with rating
    await db.bookings.update_one(
        {"booking_ref": booking_ref.upper()},
        {"$set": {
            "customer_rating": rating_data.rating,
            "customer_feedback": rating_data.feedback,
            "rated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Also store in driver_ratings collection for aggregation
    driver_id = booking.get("assigned_driver_id") or booking.get("driver_id")
    if driver_id:
        await db.driver_ratings.insert_one({
            "id": str(uuid.uuid4()),
            "driver_id": driver_id,
            "booking_id": booking["id"],
            "rating": rating_data.rating,
            "feedback": rating_data.feedback,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Update driver's average rating
        ratings = await db.driver_ratings.find({"driver_id": driver_id}).to_list(1000)
        avg_rating = sum(r.get("rating", 0) for r in ratings) / len(ratings) if ratings else None
        if avg_rating:
            await db.drivers.update_one(
                {"id": driver_id},
                {"$set": {"average_rating": round(avg_rating, 2), "total_ratings": len(ratings)}}
            )
    
    return {"message": "Thank you for your feedback!", "rating": rating_data.rating}

# Fleet endpoint - Upload driver photo
@api_router.post("/fleet/drivers/{driver_id}/photo")
async def upload_driver_photo(
    driver_id: str,
    photo_url: str = Query(..., description="URL of the uploaded photo"),
    current_user: dict = Depends(get_fleet_admin)
):
    """Update driver photo URL"""
    fleet_id = current_user.get("fleet_id")
    
    # Verify driver belongs to this fleet
    driver = await db.drivers.find_one({"id": driver_id, "fleet_id": fleet_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    await db.drivers.update_one(
        {"id": driver_id},
        {"$set": {"photo_url": photo_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Driver photo updated", "photo_url": photo_url}

# Send tracking link to customer
@api_router.post("/tracking/send-customer-link/{booking_id}")
async def send_customer_tracking_link(
    booking_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Send tracking link to customer via email"""
    if current_user.get("role") not in ["super_admin", "fleet_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking_ref = booking.get("booking_ref")
    customer_email = booking.get("passenger_email") or booking.get("customer_email")
    
    if not customer_email:
        raise HTTPException(status_code=400, detail="No customer email found")
    
    base_url = os.environ.get("FRONTEND_URL")
    if not base_url:
        raise HTTPException(status_code=500, detail="FRONTEND_URL not configured")
    
    tracking_url = f"{base_url}/track/{booking_ref}"
    
    # Send email (using existing email service pattern)
    try:
        from email_service import send_status_update
        background_tasks.add_task(
            send_status_update,
            customer_email,
            booking.get("passenger_name", "Customer"),
            booking_ref,
            "driver_assigned",
            f"Your driver is on the way! Track your driver in real-time: {tracking_url}"
        )
        return {"message": "Tracking link sent to customer", "tracking_url": tracking_url}
    except Exception as e:
        logger.error(f"Failed to send customer tracking email: {e}")
        return {"message": "Failed to send email", "tracking_url": tracking_url}

# ==================== MEDIA LIBRARY ENDPOINTS ====================

@api_router.get("/admin/media")
async def get_media_library(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    media = await db.media_library.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return media

@api_router.post("/admin/media")
async def add_media(
    media: MediaItem,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    media_dict = media.model_dump()
    await db.media_library.insert_one(media_dict)
    return media_dict

@api_router.delete("/admin/media/{media_id}")
async def delete_media(media_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    await db.media_library.delete_one({"id": media_id})
    return {"message": "Media deleted"}

# ==================== VEHICLE CATEGORIES CMS ====================

@api_router.get("/admin/vehicle-categories")
async def get_admin_vehicle_categories(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    categories = await db.vehicles.find({}, {"_id": 0}).sort("display_order", 1).to_list(100)
    return categories

@api_router.put("/admin/vehicle-categories/{category_id}")
async def update_vehicle_category(
    category_id: str,
    update: VehicleCategoryUpdate,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.vehicles.update_one(
        {"id": category_id},
        {"$set": update_dict}
    )
    
    return {"message": "Vehicle category updated"}

@api_router.post("/admin/vehicle-categories")
async def create_vehicle_category(
    category: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    category["id"] = category.get("id", str(uuid.uuid4()))
    category["created_at"] = datetime.now(timezone.utc).isoformat()
    category["display_order"] = category.get("display_order", 99)
    category["is_active"] = category.get("is_active", True)
    
    await db.vehicles.insert_one(category)
    return category

@api_router.delete("/admin/vehicle-categories/{category_id}")
async def delete_vehicle_category(
    category_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    await db.vehicles.delete_one({"id": category_id})
    return {"message": "Vehicle category deleted"}

# ==================== PAGE CONTENT CMS ====================

@api_router.get("/admin/pages")
async def get_all_pages(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    pages = await db.page_content.find({}, {"_id": 0}).to_list(100)
    return pages

@api_router.get("/admin/pages/{page_id}")
async def get_page_content(page_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    page = await db.page_content.find_one({"page_id": page_id}, {"_id": 0})
    if not page:
        # Return default page structure
        return get_default_page_content(page_id)
    return page

@api_router.post("/admin/pages/{page_id}")
async def save_page_content(
    page_id: str,
    content: PageContent,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    content_dict = content.model_dump()
    content_dict["page_id"] = page_id
    content_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.page_content.update_one(
        {"page_id": page_id},
        {"$set": content_dict},
        upsert=True
    )
    
    return {"message": "Page content saved"}

# Public endpoint for page content
@api_router.get("/pages/{page_id}")
async def get_public_page_content(page_id: str):
    page = await db.page_content.find_one({"page_id": page_id}, {"_id": 0})
    if not page:
        return get_default_page_content(page_id)
    return page

def get_default_page_content(page_id: str) -> dict:
    """Return default content for each page"""
    defaults = {
        "home": {
            "page_id": "home",
            "title": "Home",
            "meta_title": "Aircabio - Premium Airport Transfers",
            "meta_description": "Book reliable airport transfers with Aircabio",
            "sections": [
                {
                    "id": "hero",
                    "type": "hero",
                    "title": "Travel in Style & Comfort",
                    "subtitle": "Premium airport transfers with professional chauffeurs. Book your ride in minutes.",
                    "image_url": "",
                    "button_text": "Book Now",
                    "button_link": "#booking",
                    "order": 0,
                    "is_active": True
                },
                {
                    "id": "features",
                    "type": "features",
                    "title": "Why Choose Us",
                    "items": [
                        {"icon": "Shield", "title": "Professional Chauffeurs", "description": "Experienced, vetted drivers ensuring your safety and comfort"},
                        {"icon": "Car", "title": "Luxury Fleet", "description": "Premium vehicles maintained to the highest standards"},
                        {"icon": "Clock", "title": "24/7 Service", "description": "Round-the-clock availability for all your transfer needs"},
                        {"icon": "DollarSign", "title": "Fixed Prices", "description": "No hidden fees, no surge pricing - just transparent rates"}
                    ],
                    "order": 1,
                    "is_active": True
                },
                {
                    "id": "how-it-works",
                    "type": "steps",
                    "title": "How It Works",
                    "items": [
                        {"step": "1", "title": "Book Online", "description": "Enter your journey details and choose your vehicle"},
                        {"step": "2", "title": "Confirm", "description": "Review your booking and complete payment"},
                        {"step": "3", "title": "Relax", "description": "Your chauffeur will be waiting for you"}
                    ],
                    "order": 2,
                    "is_active": True
                }
            ]
        },
        "about": {
            "page_id": "about",
            "title": "About Us",
            "meta_title": "About Aircabio - Premium Airport Transfer Service",
            "sections": [
                {
                    "id": "intro",
                    "type": "text",
                    "title": "About Aircabio",
                    "content": "Aircabio is a premium airport transfer service dedicated to providing exceptional travel experiences. With years of experience in the industry, we have built a reputation for reliability, comfort, and professionalism.",
                    "image_url": "",
                    "order": 0,
                    "is_active": True
                },
                {
                    "id": "mission",
                    "type": "text",
                    "title": "Our Mission",
                    "content": "To make airport transfers seamless, comfortable, and stress-free for every passenger.",
                    "order": 1,
                    "is_active": True
                }
            ]
        },
        "services": {
            "page_id": "services",
            "title": "Our Services",
            "sections": [
                {
                    "id": "intro",
                    "type": "text",
                    "title": "Premium Transfer Services",
                    "content": "We offer a comprehensive range of airport transfer services to meet all your travel needs.",
                    "order": 0,
                    "is_active": True
                }
            ]
        },
        "fleet": {
            "page_id": "fleet",
            "title": "Join Our Fleet",
            "sections": [
                {
                    "id": "intro",
                    "type": "text",
                    "title": "Become a Fleet Partner",
                    "content": "Join our growing network of professional drivers and fleet operators.",
                    "image_url": "",
                    "order": 0,
                    "is_active": True
                }
            ]
        },
        "contact": {
            "page_id": "contact",
            "title": "Contact Us",
            "sections": [
                {
                    "id": "intro",
                    "type": "text",
                    "title": "Get In Touch",
                    "content": "We're here to help with any questions about our services.",
                    "order": 0,
                    "is_active": True
                }
            ]
        },
        "terms": {
            "page_id": "terms",
            "title": "Terms & Conditions",
            "sections": [
                {
                    "id": "content",
                    "type": "text",
                    "title": "Terms of Service",
                    "content": "Please read these terms carefully before using our services.",
                    "order": 0,
                    "is_active": True
                }
            ]
        },
        "privacy": {
            "page_id": "privacy",
            "title": "Privacy Policy",
            "sections": [
                {
                    "id": "content",
                    "type": "text",
                    "title": "Privacy Policy",
                    "content": "Your privacy is important to us. This policy outlines how we collect and use your data.",
                    "order": 0,
                    "is_active": True
                }
            ]
        }
    }
    return defaults.get(page_id, {"page_id": page_id, "title": page_id.title(), "sections": []})

# ==================== WEBSITE SETTINGS ====================

@api_router.get("/admin/website-settings")
async def get_website_settings(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    settings = await db.website_settings.find_one({"_id": "main"})
    if settings:
        del settings["_id"]
        return settings
    return WebsiteSettings().model_dump()

@api_router.post("/admin/website-settings")
async def save_website_settings(
    settings: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    settings["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.website_settings.update_one(
        {"_id": "main"},
        {"$set": settings},
        upsert=True
    )
    
    return {"message": "Settings saved successfully"}

# ==================== ADMIN SETTINGS (CHILD SEATS & CURRENCIES) ====================

# Default child seat pricing
DEFAULT_CHILD_SEAT_PRICING = [
    {"id": "infant", "name": "Infant Seat", "age_range": "0-12 months", "price": 10.0, "is_active": True},
    {"id": "toddler", "name": "Toddler Seat", "age_range": "1-4 years", "price": 10.0, "is_active": True},
    {"id": "booster", "name": "Booster Seat", "age_range": "4-8 years", "price": 8.0, "is_active": True}
]

# Default currency rates (relative to GBP)
DEFAULT_CURRENCY_RATES = [
    {"code": "GBP", "symbol": "£", "name": "British Pound", "rate": 1.0, "is_active": True},
    {"code": "EUR", "symbol": "€", "name": "Euro", "rate": 1.17, "is_active": True},
    {"code": "USD", "symbol": "$", "name": "US Dollar", "rate": 1.27, "is_active": True},
    {"code": "CAD", "symbol": "C$", "name": "Canadian Dollar", "rate": 1.71, "is_active": True}
]

@api_router.get("/admin/settings")
async def get_admin_settings(current_user: dict = Depends(get_super_admin)):
    """Get all admin settings including child seat pricing and currency rates"""
    settings = await db.admin_settings.find_one({"_id": "main"})
    if settings:
        del settings["_id"]
        return settings
    # Return defaults if no settings exist
    return {
        "child_seat_pricing": DEFAULT_CHILD_SEAT_PRICING,
        "currency_rates": DEFAULT_CURRENCY_RATES,
        "base_currency": "GBP"
    }

@api_router.get("/admin/settings/child-seats")
async def get_child_seat_pricing(current_user: dict = Depends(get_super_admin)):
    """Get child seat pricing configuration"""
    settings = await db.admin_settings.find_one({"_id": "main"})
    if settings and "child_seat_pricing" in settings:
        return {"child_seats": settings["child_seat_pricing"]}
    return {"child_seats": DEFAULT_CHILD_SEAT_PRICING}

@api_router.put("/admin/settings/child-seats")
async def update_child_seat_pricing(
    data: Dict[str, Any],
    current_user: dict = Depends(get_super_admin)
):
    """Update child seat pricing configuration"""
    child_seats = data.get("child_seats", [])
    
    await db.admin_settings.update_one(
        {"_id": "main"},
        {
            "$set": {
                "child_seat_pricing": child_seats,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": current_user.get("id")
            }
        },
        upsert=True
    )
    
    return {"message": "Child seat pricing updated successfully", "child_seats": child_seats}

@api_router.get("/admin/settings/currencies")
async def get_currency_rates(current_user: dict = Depends(get_super_admin)):
    """Get currency rates configuration"""
    settings = await db.admin_settings.find_one({"_id": "main"})
    if settings and "currency_rates" in settings:
        return {"currencies": settings["currency_rates"], "base_currency": settings.get("base_currency", "GBP")}
    return {"currencies": DEFAULT_CURRENCY_RATES, "base_currency": "GBP"}

@api_router.put("/admin/settings/currencies")
async def update_currency_rates(
    data: Dict[str, Any],
    current_user: dict = Depends(get_super_admin)
):
    """Update currency rates configuration"""
    currencies = data.get("currencies", [])
    
    await db.admin_settings.update_one(
        {"_id": "main"},
        {
            "$set": {
                "currency_rates": currencies,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": current_user.get("id")
            }
        },
        upsert=True
    )
    
    return {"message": "Currency rates updated successfully", "currencies": currencies}

# Public endpoint for settings (used by frontend)
@api_router.get("/settings/child-seats")
async def get_public_child_seat_pricing():
    """Public endpoint for child seat pricing"""
    settings = await db.admin_settings.find_one({"_id": "main"})
    if settings and "child_seat_pricing" in settings:
        # Only return active child seats
        active_seats = [s for s in settings["child_seat_pricing"] if s.get("is_active", True)]
        return {"child_seats": active_seats}
    return {"child_seats": DEFAULT_CHILD_SEAT_PRICING}

# Live currency rate fetching
import aiohttp

EXCHANGE_RATE_API_URL = "https://api.exchangerate-api.com/v4/latest/GBP"

@api_router.get("/settings/currencies/live")
async def fetch_live_currency_rates():
    """Fetch live currency rates from external API"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(EXCHANGE_RATE_API_URL, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    rates = data.get("rates", {})
                    
                    # Build currency list with live rates
                    live_currencies = [
                        {"code": "GBP", "symbol": "£", "name": "British Pound", "rate": 1.0, "is_active": True},
                        {"code": "EUR", "symbol": "€", "name": "Euro", "rate": round(rates.get("EUR", 1.17), 4), "is_active": True},
                        {"code": "USD", "symbol": "$", "name": "US Dollar", "rate": round(rates.get("USD", 1.27), 4), "is_active": True},
                        {"code": "CAD", "symbol": "C$", "name": "Canadian Dollar", "rate": round(rates.get("CAD", 1.71), 4), "is_active": True}
                    ]
                    
                    return {
                        "currencies": live_currencies,
                        "base_currency": "GBP",
                        "source": "exchangerate-api.com",
                        "fetched_at": datetime.now(timezone.utc).isoformat(),
                        "rates_date": data.get("date")
                    }
    except Exception as e:
        logger.error(f"Failed to fetch live rates: {e}")
    
    # Fallback to stored rates
    return {"currencies": DEFAULT_CURRENCY_RATES, "base_currency": "GBP", "source": "fallback"}

@api_router.post("/admin/settings/currencies/sync-live")
async def sync_live_currency_rates(current_user: dict = Depends(get_super_admin)):
    """Fetch live rates and save to database"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(EXCHANGE_RATE_API_URL, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    rates = data.get("rates", {})
                    
                    # Build currency list with live rates
                    live_currencies = [
                        {"code": "GBP", "symbol": "£", "name": "British Pound", "rate": 1.0, "is_active": True},
                        {"code": "EUR", "symbol": "€", "name": "Euro", "rate": round(rates.get("EUR", 1.17), 4), "is_active": True},
                        {"code": "USD", "symbol": "$", "name": "US Dollar", "rate": round(rates.get("USD", 1.27), 4), "is_active": True},
                        {"code": "CAD", "symbol": "C$", "name": "Canadian Dollar", "rate": round(rates.get("CAD", 1.71), 4), "is_active": True}
                    ]
                    
                    # Save to database
                    await db.admin_settings.update_one(
                        {"_id": "main"},
                        {
                            "$set": {
                                "currency_rates": live_currencies,
                                "currency_rates_source": "exchangerate-api.com",
                                "currency_rates_synced_at": datetime.now(timezone.utc).isoformat(),
                                "updated_at": datetime.now(timezone.utc).isoformat(),
                                "updated_by": current_user.get("id")
                            }
                        },
                        upsert=True
                    )
                    
                    return {
                        "message": "Currency rates synced successfully",
                        "currencies": live_currencies,
                        "synced_at": datetime.now(timezone.utc).isoformat()
                    }
    except Exception as e:
        logger.error(f"Failed to sync live rates: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch live rates: {str(e)}")

@api_router.get("/settings/currencies")
async def get_public_currency_rates():
    """Public endpoint for currency rates - tries live first, then stored, then defaults"""
    # First check if we have recent stored rates
    settings = await db.admin_settings.find_one({"_id": "main"})
    if settings and "currency_rates" in settings:
        # Only return active currencies
        active_currencies = [c for c in settings["currency_rates"] if c.get("is_active", True)]
        return {
            "currencies": active_currencies, 
            "base_currency": settings.get("base_currency", "GBP"),
            "source": settings.get("currency_rates_source", "admin"),
            "synced_at": settings.get("currency_rates_synced_at")
        }
    return {"currencies": DEFAULT_CURRENCY_RATES, "base_currency": "GBP", "source": "default"}

# ==================== RATINGS MANAGEMENT ====================

@api_router.get("/admin/ratings")
async def get_all_ratings(
    driver_id: Optional[str] = None,
    fleet_id: Optional[str] = None,
    min_stars: Optional[int] = None,
    limit: int = 100,
    current_user: dict = Depends(get_super_admin)
):
    """Get all trip ratings for admin dashboard - combines tracking_sessions and driver_ratings"""
    enriched_ratings = []
    
    # Get ratings from driver_ratings collection (from customer review page)
    dr_query = {}
    if driver_id:
        dr_query["driver_id"] = driver_id
    if min_stars:
        dr_query["rating"] = {"$gte": min_stars}
    
    driver_ratings = await db.driver_ratings.find(dr_query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    for rating in driver_ratings:
        booking = await db.bookings.find_one({"id": rating.get("booking_id")}, {"_id": 0})
        driver = await db.drivers.find_one({"id": rating.get("driver_id")}, {"_id": 0})
        
        # Skip if filtering by fleet and driver doesn't belong to it
        if fleet_id and driver and driver.get("fleet_id") != fleet_id:
            continue
        
        enriched_ratings.append({
            "id": rating.get("id"),
            "source": "customer_review",
            "booking_id": rating.get("booking_id"),
            "booking_ref": booking.get("booking_ref") if booking else None,
            "driver_id": rating.get("driver_id"),
            "driver_name": driver.get("name") if driver else "Unknown",
            "driver_photo": driver.get("photo_url") if driver else None,
            "fleet_id": driver.get("fleet_id") if driver else None,
            "customer_name": booking.get("customer_name") if booking else None,
            "stars": rating.get("rating"),
            "comment": rating.get("feedback"),
            "rated_at": rating.get("created_at"),
            "pickup_location": booking.get("pickup_location") if booking else None,
            "dropoff_location": booking.get("dropoff_location") if booking else None,
            "pickup_date": booking.get("pickup_date") if booking else None
        })
    
    # Also get ratings from tracking_sessions (from tracking page ratings)
    ts_query = {"rating": {"$exists": True}}
    if driver_id:
        ts_query["driver_id"] = driver_id
    if min_stars:
        ts_query["rating.stars"] = {"$gte": min_stars}
    
    sessions = await db.tracking_sessions.find(ts_query, {"_id": 0}).sort("completed_at", -1).to_list(limit)
    
    # Track booking IDs already added to avoid duplicates
    added_booking_ids = {r.get("booking_id") for r in enriched_ratings}
    
    for session in sessions:
        if session.get("rating") and session.get("booking_id") not in added_booking_ids:
            booking = await db.bookings.find_one({"id": session.get("booking_id")}, {"_id": 0})
            driver = await db.drivers.find_one({"id": session.get("driver_id")}, {"_id": 0})
            
            # Skip if filtering by fleet and driver doesn't belong to it
            if fleet_id and driver and driver.get("fleet_id") != fleet_id:
                continue
            
            enriched_ratings.append({
                "id": session.get("id"),
                "source": "tracking_page",
                "booking_id": session.get("booking_id"),
                "booking_ref": booking.get("booking_ref") if booking else None,
                "driver_id": session.get("driver_id"),
                "driver_name": driver.get("name") if driver else "Unknown",
                "driver_photo": driver.get("photo_url") if driver else None,
                "fleet_id": driver.get("fleet_id") if driver else None,
                "customer_name": booking.get("customer_name") if booking else None,
                "stars": session["rating"].get("stars"),
                "comment": session["rating"].get("comment"),
                "rated_at": session["rating"].get("rated_at"),
                "pickup_location": booking.get("pickup_location") if booking else None,
                "dropoff_location": booking.get("dropoff_location") if booking else None,
                "pickup_date": booking.get("pickup_date") if booking else None
            })
    
    # Sort by rated_at descending
    enriched_ratings.sort(key=lambda x: x.get("rated_at") or "", reverse=True)
    
    return enriched_ratings[:limit]

@api_router.get("/admin/ratings/summary")
async def get_ratings_summary(current_user: dict = Depends(get_super_admin)):
    """Get ratings summary statistics - combines all rating sources"""
    # Get ratings from driver_ratings collection
    driver_ratings = await db.driver_ratings.find({}, {"_id": 0}).to_list(1000)
    
    # Get ratings from tracking_sessions
    sessions = await db.tracking_sessions.find(
        {"rating": {"$exists": True}}, 
        {"_id": 0}
    ).to_list(1000)
    
    # Combine ratings (avoiding duplicates by booking_id)
    all_ratings = []
    booking_ids_seen = set()
    
    for r in driver_ratings:
        bid = r.get("booking_id")
        if bid not in booking_ids_seen:
            all_ratings.append({"stars": r.get("rating"), "comment": r.get("feedback")})
            booking_ids_seen.add(bid)
    
    for s in sessions:
        bid = s.get("booking_id")
        if s.get("rating") and bid not in booking_ids_seen:
            all_ratings.append({"stars": s["rating"].get("stars"), "comment": s["rating"].get("comment")})
            booking_ids_seen.add(bid)
    
    if not all_ratings:
        return {
            "total_ratings": 0,
            "average_rating": 0,
            "rating_distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
            "ratings_with_comments": 0
        }
    
    # Calculate stats
    total_ratings = len(all_ratings)
    total_stars = sum(r.get("stars", 0) for r in all_ratings)
    avg_rating = round(total_stars / total_ratings, 2) if total_ratings > 0 else 0
    
    # Distribution
    distribution = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    for rating in all_ratings:
        stars = str(rating.get("stars", 0))
        if stars in distribution:
            distribution[stars] += 1
    
    return {
        "total_ratings": total_ratings,
        "average_rating": avg_rating,
        "rating_distribution": distribution,
        "ratings_with_comments": len([r for r in all_ratings if r.get("comment")])
    }

# Public endpoints
@api_router.get("/website-settings")
async def get_public_website_settings():
    settings = await db.website_settings.find_one({"_id": "main"})
    if settings:
        del settings["_id"]
        return settings
    return WebsiteSettings().model_dump()

# Get active vehicles for public
@api_router.get("/vehicles")
async def get_vehicles():
    vehicles = await db.vehicles.find(
        {"$or": [{"is_active": True}, {"is_active": {"$exists": False}}]},
        {"_id": 0}
    ).sort("display_order", 1).to_list(100)
    return vehicles

@api_router.get("/")
async def root():
    return {"message": "Aircabio Airport Transfers API", "version": "4.0.0"}

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
