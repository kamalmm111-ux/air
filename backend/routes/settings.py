# Admin Settings Routes
# Manages child seat pricing, currency rates, and ratings

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

router = APIRouter(prefix="/admin", tags=["Admin Settings"])

# Default configurations
DEFAULT_CHILD_SEAT_PRICING = [
    {"id": "infant", "name": "Infant Seat", "age_range": "0-12 months", "price": 10.0, "is_active": True},
    {"id": "toddler", "name": "Toddler Seat", "age_range": "1-4 years", "price": 10.0, "is_active": True},
    {"id": "booster", "name": "Booster Seat", "age_range": "4-8 years", "price": 8.0, "is_active": True}
]

DEFAULT_CURRENCY_RATES = [
    {"code": "GBP", "symbol": "£", "name": "British Pound", "rate": 1.0, "is_active": True},
    {"code": "EUR", "symbol": "€", "name": "Euro", "rate": 1.17, "is_active": True},
    {"code": "USD", "symbol": "$", "name": "US Dollar", "rate": 1.27, "is_active": True},
    {"code": "CAD", "symbol": "C$", "name": "Canadian Dollar", "rate": 1.71, "is_active": True}
]


# Note: Routes are defined in server.py for now
# This module contains configuration constants and serves as a template
