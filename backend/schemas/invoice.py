# Invoice Schemas
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class CustomLineItem(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float
    total: Optional[float] = None

class CustomInvoiceCreate(BaseModel):
    invoice_type: str  # driver, fleet, customer, custom
    bill_to_name: str
    bill_to_email: Optional[str] = None
    bill_to_phone: Optional[str] = None
    bill_to_address: Optional[str] = None
    line_items: List[CustomLineItem]
    vat_rate: float = 0.0
    notes: Optional[str] = None
    due_in_days: int = 30
    # For linking to existing entities
    driver_id: Optional[str] = None
    fleet_id: Optional[str] = None
    customer_id: Optional[str] = None

class InvoiceAmendment(BaseModel):
    reason: str
    line_items: Optional[List[CustomLineItem]] = None
    vat_rate: Optional[float] = None
    notes: Optional[str] = None
    subtotal: Optional[float] = None
    vat_amount: Optional[float] = None
    total: Optional[float] = None

class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    invoice_type: str
    bill_to_name: str
    bill_to_email: Optional[str] = None
    subtotal: float
    vat_rate: float
    vat_amount: float
    total: float
    status: str
    created_at: str
    due_date: str
