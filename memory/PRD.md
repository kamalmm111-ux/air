# Aircabio Airport Transfers - Product Requirements Document

## Original Problem Statement
Build a complete airport transfer booking website for Aircabio with:
- Booking engine on homepage (pickup/dropoff, date/time, passengers, luggage, flight number)
- Vehicle results page with categories and pricing
- Checkout with Stripe payment integration
- Customer dashboard for booking management
- Admin dashboard for operations management
- Global coverage with pricing system (fixed routes + mileage-based)

### Key Features Implemented
- Multi-Fleet Architecture with Fleet Admin portal
- Manual Booking Creation with dual pricing (Customer Price + Driver Price)
- Comprehensive Pricing Module (mileage brackets, fixed routes, extras)
- Full CMS System for website content
- Driver GPS Tracking with live map visualization
- B2B Customer Accounts system
- Invoice Management with multi-entity support
- Email Notification System (via Resend)

## What's Been Implemented (Latest Updates Feb 8, 2026)

### P0 - Admin System Settings (COMPLETED)
- **Child Seat Pricing Management**
  - Admin can configure pricing for Infant, Toddler, Booster seats
  - Prices stored in database, not hardcoded
  - Public API `/api/settings/child-seats` for frontend to fetch prices
- **Currency Exchange Rate Management**
  - Admin can configure GBP, EUR, USD, CAD rates
  - **NEW: Automatic Live Rate Fetching** from exchangerate-api.com
  - "Sync Live Rates" button fetches and saves real-time rates
  - Rates stored in database with active/inactive status
  - Public API `/api/settings/currencies` for frontend to fetch rates
- **Ratings Dashboard**
  - View all trip ratings with summary statistics
  - Shows total ratings, average rating, ratings with comments
  - Distribution chart (1-5 stars breakdown)
  - List of all ratings with driver, customer, comment details

### P1 - Code Refactoring (COMPLETED)
- **Frontend Component Extraction**
  - `DriversManager.js` - Full driver CRUD, search, filters
  - `VehiclesManager.js` - Full vehicle CRUD, search, filters
  - `FleetsManager.js` - Full fleet CRUD, search, suspend/reactivate
  - `AdminSettings.js` - System settings (child seats, currencies, ratings)
- **Backend Route Organization**
  - Created `/app/backend/routes/` directory structure
  - Created `/app/backend/models/__init__.py` with Pydantic models

### P2 - Traffic-Aware ETA (COMPLETED)
- **Enhanced ETA Calculation**
  - Considers time of day for traffic multipliers
  - Morning rush (7-9 AM): 1.5x slower
  - Evening rush (4-7 PM): 1.6x slower
  - Lunch time (12-2 PM): 1.2x slower
  - Night time (10 PM - 5 AM): 0.8x faster (light traffic)
- **ETA Details in API Response**
  - Returns `eta_details` with distance, traffic_status, effective_speed
  - Customer tracking page shows traffic indicator (Heavy/Moderate/Light/Normal)

### Previous Completed Features
- Multi-Currency Support (GBP, EUR, USD, CAD)
- Enhanced Child Seat Selection (Infant, Toddler, Booster with quantity)
- Customer Live Tracking Page (`/track/{booking_ref}`)
- Airport Search with IATA codes and "(All Terminals)" suffix
- Fleet Dashboard Refactoring (57% code reduction)
- Driver Photo URL support
- Post-trip Rating System

## Database Collections
- users, customers, vehicles, bookings
- pricing_schemes, map_fixed_routes
- fleets, drivers, fleet_vehicles
- invoices, notifications
- tracking_sessions (with ratings)
- admin_settings (NEW - child seats, currencies)

## Test Credentials
- **Super Admin:** admin@aircabio.com / Aircabio@2024!
- **Fleet Admin:** Use "Login As" from Admin panel

## API Endpoints Structure

### Public Settings APIs (NEW)
```
GET /api/settings/child-seats - Get child seat pricing
GET /api/settings/currencies - Get currency exchange rates
```

### Admin Settings APIs (NEW)
```
GET /api/admin/settings - Get all admin settings
GET /api/admin/settings/child-seats - Get child seat config
PUT /api/admin/settings/child-seats - Update child seat pricing
GET /api/admin/settings/currencies - Get currency config
PUT /api/admin/settings/currencies - Update currency rates
POST /api/admin/settings/currencies/sync-live - Fetch and save live rates
GET /api/admin/ratings - Get all trip ratings
GET /api/admin/ratings/summary - Get ratings statistics
```

### Live Currency APIs (NEW)
```
GET /api/settings/currencies/live - Fetch live rates (no auth required)
```

### Customer Tracking (Enhanced)
```
GET /api/customer/tracking/{booking_ref} - Returns eta_details with traffic_status
POST /api/customer/rating/{booking_ref} - Submit trip rating
```

## Technical Notes

### Live Integrations
- Google Places API: Live autocomplete
- Google Maps JavaScript API: Live maps
- Stripe: Test keys (sk_test_emergent)
- Resend: Email notifications (requires valid API key)
- OpenStreetMap: Tracking page map display

### Key Files
- `/app/backend/server.py` - All backend routes (~5200 lines)
- `/app/frontend/src/pages/AdminDashboard.js` - Admin dashboard
- `/app/frontend/src/components/AdminSettings.js` - System settings
- `/app/frontend/src/components/DriversManager.js` - Drivers management
- `/app/frontend/src/components/VehiclesManager.js` - Vehicles management
- `/app/frontend/src/components/FleetsManager.js` - Fleets management
- `/app/frontend/src/pages/CustomerTrackingPage.js` - Customer tracking

## Prioritized Backlog

### P1 - High Priority
- [ ] Get valid Resend API key to enable actual email sending
- [ ] Booking export to CSV
- [ ] Complete server.py refactoring into routes/models/services

### P2 - Medium Priority
- [ ] SMS/WhatsApp notifications
- [ ] Round-trip discount configuration (currently hardcoded 10%)
- [ ] Day/night pricing surcharges
- [ ] Real-time WebSocket notifications

### P3 - Nice to Have
- [ ] Flight tracking integration
- [ ] Multi-language support
- [ ] Corporate account management
- [ ] Analytics dashboard
