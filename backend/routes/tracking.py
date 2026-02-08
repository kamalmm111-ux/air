# Tracking Routes
# Customer and Fleet live tracking functionality

from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any
from datetime import datetime, timezone

router = APIRouter(prefix="/track", tags=["Tracking"])


# Track status configuration
TRACKING_STATUSES = [
    "pending",       # Waiting for driver assignment
    "assigned",      # Driver assigned
    "en_route",      # Driver on the way to pickup
    "arrived",       # Driver arrived at pickup
    "in_progress",   # Trip in progress  
    "completed",     # Trip completed
    "cancelled"      # Cancelled
]


# Note: Routes are defined in server.py for now
# This module contains configuration and serves as a template for future refactoring
