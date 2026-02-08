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

### P0 - Autocomplete Dropdown Mouse Click Fix (COMPLETED - Feb 8, 2026)
- **Issue**: Google Places autocomplete dropdown suggestions could not be selected with mouse click
- **Solution**: Added CSS fixes for `.pac-container` in `/app/frontend/src/index.css`
  - z-index: 10000 to ensure dropdown is above all other elements
  - pointer-events: auto to enable click interaction
  - Custom styling for `.pac-item` hover and selection states
- **Verified**: Mouse clicks now successfully select dropdown items

### P1 - Email Automation Workflow (COMPLETED - Feb 8, 2026)
**Complete booking lifecycle email automation:**

1. **Booking Confirmation** - Already existed
   - Sends on successful booking creation
   - Includes booking details, route, vehicle, price

2. **Driver Assigned** - Already existed
   - Sends when driver is assigned to booking
   - Includes driver name, phone, vehicle details

3. **Driver En Route** - Already existed
   - Sends when driver status changes to "en_route"
   - Includes live tracking link

4. **Completion with PDF Invoice** - NEW
   - Sends when booking is marked "completed"
   - Generates branded PDF invoice using ReportLab
   - Invoice includes: company branding, trip details, pricing breakdown
   - PDF attached to email

5. **Customer Review Invitation** - NEW
   - Sends after completion email
   - Contains link to `/review/{booking_ref}` page
   - Allows customer to rate driver (1-5 stars) and leave feedback

### P1 - Customer Review System (COMPLETED - Feb 8, 2026)
- **New Page**: `/review/{booking_ref}` - CustomerReviewPage.js
- **Features**:
  - Star rating selection (1-5 stars)
  - Rating labels (Poor, Fair, Good, Very Good, Excellent)
  - Optional feedback textarea
  - Trip details display (date, route, driver name)
  - Thank You confirmation after submission
  - Shows existing rating if already submitted

### P1 - Driver Ratings Dashboard (COMPLETED - Feb 8, 2026)
**Admin Panel:**
- View all customer ratings across platform
- Filter by driver, minimum stars
- See rating distribution (1-5 star breakdown)
- View ratings with comments

**Fleet Panel:**
- View ratings for fleet drivers only
- See individual driver ratings history
- View top-rated drivers in fleet
- Fleet-wide rating statistics

### Previous Completed Features
- Admin System Settings (child seats, currency rates)
- Live Currency Rate Sync from exchangerate-api.com
- Fleet Dashboard Impersonation (Super Admin "Login As")
- Traffic-Aware ETA calculations
- Multi-Currency Support (GBP, EUR, USD, CAD)
- Customer Live Tracking Page

## Database Collections
- users, customers, vehicles, bookings
- pricing_schemes, map_fixed_routes
- fleets, drivers, fleet_vehicles
- invoices, notifications
- tracking_sessions (with ratings)
- admin_settings (child seats, currencies)
- driver_ratings (NEW - stores customer ratings)

## Test Credentials
- **Super Admin:** admin@aircabio.com / Aircabio@2024!
- **Fleet Admin:** Use "Login As" from Admin panel

## API Endpoints Structure

### Customer Review APIs (NEW)
```
GET /api/customer/tracking/{booking_ref} - Get booking details for review page
POST /api/customer/rating/{booking_ref} - Submit customer rating
```

### Admin Ratings APIs (UPDATED)
```
GET /api/admin/ratings - Get all ratings (combines driver_ratings and tracking_sessions)
GET /api/admin/ratings/summary - Get ratings statistics
```

### Fleet Ratings APIs (NEW)
```
GET /api/fleet/ratings/summary - Get fleet-wide rating statistics
GET /api/fleet/drivers/{driver_id}/ratings - Get specific driver ratings
```

### Public Settings APIs
```
GET /api/settings/child-seats - Get child seat pricing
GET /api/settings/currencies - Get currency exchange rates
```

## Technical Notes

### Live Integrations
- Google Places API: Live autocomplete with mouse click fix
- Google Maps JavaScript API: Live maps
- Stripe: Payment processing (test keys)
- Resend: Email notifications (LOG-ONLY mode without valid API key)
- OpenStreetMap: Tracking page map display
- exchangerate-api.com: Live currency rate data
- ReportLab: PDF invoice generation

### Key Files
- `/app/backend/server.py` - All backend routes
- `/app/backend/email_service.py` - Email service with PDF generation
- `/app/frontend/src/index.css` - Contains autocomplete dropdown fixes
- `/app/frontend/src/pages/CustomerReviewPage.js` - Customer review page
- `/app/frontend/src/App.js` - Routes including /review/:bookingRef
- `/app/frontend/src/components/PlacesAutocomplete.js` - Google Places autocomplete

## Prioritized Backlog

### P1 - High Priority
- [ ] Backend Refactoring: Split server.py into domain-specific routes
- [ ] Booking export to CSV
- [ ] Get valid Resend API key for production email sending

### P2 - Medium Priority
- [ ] SMS/WhatsApp notifications
- [ ] Round-trip discount configuration
- [ ] Day/night pricing surcharges
- [ ] Real-time WebSocket notifications

### P3 - Nice to Have
- [ ] Flight tracking integration
- [ ] Multi-language support
- [ ] Corporate account management
- [ ] Analytics dashboard
