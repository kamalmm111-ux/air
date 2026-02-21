# Booking Schemas
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid

class BookingExtra(BaseModel):
    name: str
    price: float
    notes: Optional[str] = None
    affects_driver_cost: bool = False

class QuoteRequest(BaseModel):
    pickup_location: str
    dropoff_location: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None
    pickup_date: str
    pickup_time: str
    passengers: int = 1
    luggage: int = 0
    return_journey: bool = False
    return_date: Optional[str] = None
    return_time: Optional[str] = None

class QuoteResponse(BaseModel):
    vehicles: List[Dict]
    distance_km: float
    duration_minutes: int
    pickup_location: str
    dropoff_location: str
    is_fixed_route: bool = False
    fixed_route_name: Optional[str] = None

class BookingCreate(BaseModel):
    quote_id: Optional[str] = None
    vehicle_category_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    pickup_location: str
    dropoff_location: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None
    pickup_date: str
    pickup_time: str
    passengers: int = 1
    luggage: int = 0
    flight_number: Optional[str] = None
    meet_greet: bool = False
    extras: List[Dict] = []
    return_journey: bool = False
    return_date: Optional[str] = None
    return_time: Optional[str] = None
    currency: str = "GBP"

class BookingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    booking_ref: str
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: str
    pickup_location: str
    dropoff_location: str
    pickup_date: str
    pickup_time: str
    vehicle_category_id: str
    vehicle_name: Optional[str] = None
    passengers: int
    luggage: int = 0
    flight_number: Optional[str] = None
    meet_greet: bool = False
    customer_price: float
    driver_price: float
    profit: float
    price: float
    currency: str = "GBP"
    status: str
    payment_status: str
    created_at: str
