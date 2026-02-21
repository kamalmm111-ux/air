# Fleet Schemas
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

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
