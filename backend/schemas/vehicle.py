# Vehicle Schemas
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

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
