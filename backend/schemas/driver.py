# Driver Schemas
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

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
