# Customer Schemas
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

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

class CustomerAccountCreate(BaseModel):
    company_name: str
    contact_person: str
    email: str
    phone: str
    billing_address: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[float] = None
    send_invoice_email: bool = True
    accounts_email: Optional[str] = None

class CustomerAccountUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    billing_address: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[float] = None
    send_invoice_email: Optional[bool] = None
    accounts_email: Optional[str] = None
    status: Optional[str] = None
