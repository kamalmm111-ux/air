# Backend Refactoring Guide

## Current State
The `server.py` file is ~7100 lines and contains all API routes, models, and business logic. This is technical debt that needs to be addressed.

## Target Architecture

```
/app/backend/
├── server.py              # FastAPI app initialization, middleware, main router
├── database.py            # MongoDB connection (CREATED)
├── schemas/               # Pydantic models (CREATED)
│   ├── __init__.py
│   ├── user.py
│   ├── customer.py
│   ├── fleet.py
│   ├── driver.py
│   ├── vehicle.py
│   ├── booking.py
│   └── invoice.py
├── routes/                # API route handlers
│   ├── __init__.py
│   ├── auth.py           # /api/auth/*
│   ├── customers.py      # /api/customers/*, /api/admin/customers/*
│   ├── fleets.py         # /api/fleets/*, /api/fleet/*
│   ├── drivers.py        # /api/drivers/*
│   ├── vehicles.py       # /api/vehicles/*, /api/admin/vehicles/*
│   ├── bookings.py       # /api/bookings/*, /api/admin/bookings/*
│   ├── invoices.py       # /api/invoices/*
│   ├── pricing.py        # /api/pricing-schemes/*, /api/quote
│   ├── tracking.py       # /api/tracking/*
│   ├── reports.py        # /api/reports/*
│   ├── cms.py            # /api/admin/pages/*, /api/website-settings
│   └── settings.py       # /api/admin/settings/*
├── services/              # Business logic
│   ├── auth_service.py
│   ├── booking_service.py
│   ├── pricing_service.py
│   ├── tracking_service.py
│   └── invoice_service.py
├── email_service.py       # Email sending (EXISTS)
└── image_service.py       # Image upload (EXISTS)
```

## Migration Steps (Incremental)

### Phase 1: Schema Extraction (COMPLETED)
- [x] Create schemas/ directory structure
- [x] Extract Pydantic models to separate files
- [x] Create database.py for MongoDB connection

### Phase 2: Route Extraction (Priority Order)
1. Auth routes (~80 lines)
2. Customer routes (~150 lines)
3. Fleet routes (~300 lines)
4. Driver routes (~200 lines)
5. Vehicle routes (~150 lines)
6. Booking routes (~500 lines)
7. Invoice routes (~500 lines)
8. Pricing routes (~400 lines)
9. Tracking routes (~600 lines)
10. Reports/CRM routes (~700 lines)
11. CMS routes (~400 lines)
12. Settings routes (~200 lines)

### Phase 3: Service Layer
Extract business logic from route handlers into service classes.

## Migration Pattern

For each route module:

1. Create route file with APIRouter
2. Import schemas and database
3. Copy route handlers from server.py
4. Update imports in server.py to use new router
5. Test thoroughly
6. Remove duplicated code from server.py

Example:
```python
# routes/auth.py
from fastapi import APIRouter, HTTPException
from schemas.user import UserCreate, UserLogin, TokenResponse
from database import db

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    # ... implementation
```

## Notes
- Always test after each migration step
- Keep server.py as the main entry point
- Use feature flags if needed for gradual rollout
- Document any breaking changes
