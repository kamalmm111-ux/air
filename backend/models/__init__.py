# Pydantic Models for Aircabio API
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone


# ==================== SETTINGS MODELS ====================

class ChildSeatPricing(BaseModel):
    id: str
    name: str
    age_range: str
    price: float
    is_active: bool = True


class CurrencyRate(BaseModel):
    code: str
    symbol: str
    name: str
    rate: float  # Rate relative to GBP (base currency)
    is_active: bool = True


class AdminSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    child_seat_pricing: List[Dict] = []
    currency_rates: List[Dict] = []
    base_currency: str = "GBP"
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_by: Optional[str] = None


class ChildSeatPricingUpdate(BaseModel):
    child_seats: List[Dict]


class CurrencyRatesUpdate(BaseModel):
    currencies: List[Dict]


# ==================== USER MODELS ====================

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


# ==================== CUSTOMER MODELS ====================

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


# ==================== FLEET MODELS ====================

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


# ==================== DRIVER MODELS ====================

class DriverCreate(BaseModel):
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


# ==================== VEHICLE MODELS ====================

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
