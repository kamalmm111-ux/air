# Aircabio Airport Transfers - Product Requirements Document

## Original Problem Statement
Build a complete airport transfer booking website for Aircabio with:
- Booking engine on homepage (pickup/dropoff, date/time, passengers, luggage, flight number, meet & greet)
- Vehicle results page with categories and pricing
- Checkout with Stripe payment integration
- Customer dashboard for booking management
- Admin dashboard for operations management
- Global coverage with pricing system (fixed routes + mileage-based)

### Phase 2 Requirements (Multi-Fleet Architecture)
- **User Roles:** Super Admin, Fleet Admin, and Driver
- **Fleet Management:** Super Admin can create and manage fleets, each fleet gets its own dashboard
- **Job Assignment:** Super Admin can assign bookings to fleets
- **Invoicing System:** PDF invoices for customers and fleets
- **Radius-Based Pricing:** Admin can define pickup/drop-off zones on Google Maps

### Phase 3 Requirements (Super Admin Upgrade)
- **Manual Booking Creation:** New Job modal with customer details, locations, dual pricing
- **Dual Pricing System:** Customer Price + Driver Price = Auto-calculated Profit
- **Enhanced Booking List:** Shows Price, Cost, Profit columns
- **Job Status System:** New, Unassigned, Assigned, Accepted, En-route, Arrived, In Progress, Completed, Cancelled, No Show variants
- **Date Range Filters:** Calendar filter for bookings
- **Working Fleet/Driver/Vehicle Forms:** All CRUD operations functional
- **Return Booking Feature:** Customer can book return journeys with 10% discount

## What's Been Implemented

### Phase 1 (MVP) - Completed
#### Backend (FastAPI + MongoDB)
- ✅ User authentication (JWT-based)
- ✅ Vehicle categories CRUD
- ✅ Pricing rules CRUD (mileage-based)
- ✅ Fixed routes CRUD (text-based)
- ✅ Quote calculation engine
- ✅ Booking management
- ✅ Stripe payment integration
- ✅ Admin stats endpoint

#### Frontend (React + Tailwind + Shadcn)
- ✅ Homepage with booking engine
- ✅ Search results page with vehicle quotes
- ✅ Checkout page with Stripe redirect
- ✅ Booking success/cancel pages
- ✅ Customer dashboard (bookings list)
- ✅ Admin dashboard (stats, bookings, pricing, routes, vehicles)
- ✅ User registration and login
- ✅ Static pages (Fleet, About, FAQ, Contact, Terms, Privacy, Cancellation)

### Phase 2 (Multi-Fleet Architecture) - Completed Jan 31, 2026
#### Backend
- ✅ Multi-role authentication (super_admin, fleet_admin, customer)
- ✅ Fleet CRUD operations
- ✅ Driver CRUD operations
- ✅ Fleet vehicle management
- ✅ Job assignment to fleets
- ✅ Job workflow (assign → accept → start → complete)
- ✅ Fleet stats endpoint
- ✅ Invoice generation and PDF download
- ✅ Radius zones and routes for geo-based pricing
- ✅ Fleet notifications system

#### Frontend
- ✅ Super Admin Dashboard with tabs
- ✅ Fleet Portal with login at /fleet/login
- ✅ Fleet Dashboard with tabs
- ✅ Job assignment dialog in Admin Bookings
- ✅ Fleet job management (accept, start, complete)
- ✅ Role-based routing

### Phase 3 (Super Admin Upgrade) - Completed Feb 1, 2026
#### Backend
- ✅ Manual booking creation with dual pricing (customer_price + driver_price + profit)
- ✅ Enhanced job status system (14 statuses)
- ✅ Booking filters (date range, status, fleet, driver, search)
- ✅ Fleet jobs endpoint strips customer_price/profit (privacy)
- ✅ Vehicle management CRUD (/admin/vehicles)
- ✅ Customers CRUD

#### Frontend
- ✅ **New Job Modal** with all fields:
  - Customer Details: Name, Phone, Email, Customer Reference
  - Trip Details: Date, Time, Flight Number
  - Locations: Pickup & Dropoff with postcode
  - Vehicle & Passengers: Class dropdown, passengers, small/large bags with +/- buttons
  - Pricing: Customer Price, Driver Price, Auto-calculated Profit display
  - Extras: Add/Remove extras with price and "affects driver cost" checkbox
  - Assignment: Fleet and Driver dropdowns
  - Notes: Admin notes textarea
- ✅ **Enhanced Bookings Table** with columns:
  - Ref, Date/Time, Customer, Pickup, Dropoff, Class, Assigned To, Status, Price, Cost, Profit, Actions
- ✅ **Quick Tabs**: All Jobs, Today, Unassigned, No-Shows, Cancelled
- ✅ **Filters**: Date From/To calendar, Status dropdown, Fleet filter
- ✅ **Edit Job Dialog** with status changes and pricing edits
- ✅ **Assign Dialog** with fleet/driver/vehicle selection
- ✅ **Add Fleet Form** with all fields (name, contact, email, phone, city, commission, payment terms, password)
- ✅ **Add Driver Form** with all fields (name, phone, email, license, type, fleet link)
- ✅ **Add Vehicle Form** with all fields (plate, category, make/model/year, capacity, fleet/driver assignment)
- ✅ **Fleet Dashboard** shows ONLY driver_price (hides customer_price and profit)
- ✅ **Return Booking Feature** on website:
  - One Way / Return Journey toggle
  - Return Date and Return Time fields
  - Outbound and Return Flight numbers
  - "Save up to 10% when booking return trip!" notice
  - Search Results show "Return Total" with original price crossed out

### Database Collections
- users (with role: customer, super_admin)
- customers
- vehicles (6 categories seeded)
- pricing_rules (6 rules seeded)
- fixed_routes (3 routes seeded)
- radius_zones
- radius_routes
- fleets (1 sample fleet: London Premier Cars)
- drivers (1 sample driver: Mike Johnson)
- fleet_vehicles (1 sample vehicle: AB12 CDE)
- invoices
- notifications
- bookings
- payment_transactions

## Test Credentials
- **Super Admin:** admin@aircabio.com / admin123
- **Fleet Admin:** fleet1@aircabio.com / fleet123
- **Customer:** Register via /register

## Job Status Flow
```
New → Unassigned → Assigned → Accepted → En Route → Arrived → In Progress → Completed

Exceptions:
- Cancelled (anytime)
- No Show (generic)
- Driver No Show
- Customer No Show
- On Hold
- Rescheduled
```

## API Endpoints Structure
```
Auth:
/api/auth/login - User login
/api/auth/fleet/login - Fleet admin login
/api/auth/register - User registration
/api/auth/me - Get current user

Admin:
/api/admin/stats - Dashboard statistics
/api/admin/bookings - Manage all bookings (with filters)
/api/admin/bookings/manual - Create manual booking with dual pricing
/api/admin/vehicles - Vehicle management CRUD
/api/admin/vehicle-categories - Vehicle categories CRUD

Resources:
/api/fleets - CRUD fleets
/api/drivers - CRUD drivers
/api/customers - CRUD customers
/api/invoices - Manage invoices
/api/statuses - Get all job statuses

Bookings:
/api/bookings/{id}/assign - Assign to fleet/driver
/api/bookings/{id}/unassign - Remove assignment
/api/bookings/{id}/status - Update status (role-based)

Fleet Portal:
/api/fleet/jobs - Fleet's assigned jobs (hides customer_price/profit)
/api/fleet/stats - Fleet statistics
/api/fleet/jobs/{id}/accept - Accept job
/api/fleet/jobs/{id}/assign-driver - Assign fleet's driver

Public:
/api/vehicles - Vehicle list
/api/pricing - Pricing rules
/api/quote - Get price quote
/api/bookings - Create/view bookings
```

## Technical Notes

### Mocked Features
- Google Places: Using plain text input
- Distance calculation: User provides distance or mock values
- Email notifications: Not sent (logged only)
- Stripe: Using test keys (sk_test_emergent)

### Key Files
- `/app/backend/server.py` - All backend routes and models (~1800 lines)
- `/app/frontend/src/pages/AdminDashboard.js` - Super admin dashboard (~1750 lines)
- `/app/frontend/src/pages/FleetDashboard.js` - Fleet dashboard
- `/app/frontend/src/components/BookingEngine.js` - Booking engine with return journey
- `/app/frontend/src/pages/SearchResultsPage.js` - Search results with return pricing
- `/app/frontend/src/context/BookingContext.js` - Booking state (includes return fields)

## Prioritized Backlog

### P1 - High Priority
- [ ] Real Google Places autocomplete integration
- [ ] Real Google Distance Matrix API integration
- [ ] Email notifications (booking confirmations, job assignments)
- [ ] Interactive map for drawing radius zones
- [ ] Booking export to CSV

### P2 - Medium Priority
- [ ] SMS/WhatsApp notifications
- [ ] Round-trip discount configuration (currently hardcoded 10%)
- [ ] Day/night pricing surcharges
- [ ] Multi-currency support
- [ ] Driver mobile app/portal

### P3 - Nice to Have
- [ ] Flight tracking integration
- [ ] Multi-language support
- [ ] Corporate account management
- [ ] Analytics dashboard
- [ ] Real-time WebSocket notifications
