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

### Phase 4 Requirements (Pricing Module) - COMPLETED Feb 1, 2026
- **Unified Pricing Section:** Single "Pricing" tab in admin sidebar consolidating all pricing controls
- **Vehicle Class-Based Pricing:** Each vehicle class has its own configurable pricing card
- **Mileage Brackets:** Tiered pricing based on distance (e.g., 0-6mi=£40, 6-20mi=£2.50/mi)
- **Hourly/Daily Rates:** Configurable time-based pricing per vehicle
- **Extra Fees:** Configurable fees (airport pickup, waiting time, meet & greet, night/weekend surcharges)
- **Map-Based Fixed Routes:** Google Maps integration for defining fixed-price routes with radius zones
- **Smart Quote Logic:** Quote engine prioritizes fixed routes if journey matches, falls back to mileage pricing

### Phase 5 Requirements (CMS & Fleet Impersonation) - COMPLETED Feb 1, 2026
- **Full CMS System:** Super Admin can edit ALL website content from dashboard
- **Media Library:** Upload and manage images used across the website
- **Page Editor:** Edit all pages (Home, About, Services, Fleet, Contact, Terms, Privacy)
- **Vehicle CMS:** Edit vehicle images, descriptions, capacity, display order, visibility
- **Fleet Impersonation:** Super Admin can access any fleet dashboard without password
- **Impersonation Banner:** Clear indicator when viewing as impersonated user
- **Audit Logging:** All impersonation sessions are logged with timestamp, admin, fleet, IP

### Phase 6 Requirements (Fleet Management Workflow Fix) - COMPLETED Feb 1, 2026
- **Driver Price Assignment:** Super Admin can set driver_price (fleet payout) when assigning jobs to fleets
- **Fleet Job Visibility:** Fleets can see all jobs assigned to them with correct payout amounts
- **Fleet Driver Management:** Fleets can add, edit, delete their own drivers via "My Drivers" tab
- **Fleet Vehicle Management:** Fleets can add, edit, delete their own vehicles via "My Vehicles" tab
- **Fleet Job Assignment:** Fleets can assign their drivers/vehicles to jobs they receive
- **Admin Visibility:** Super Admin can see fleet-assigned driver name and vehicle plate in bookings list

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

### Phase 4 (Pricing Module) - Completed Feb 1, 2026
#### Backend
- ✅ Pricing Schemes API (`/api/pricing-schemes`, `/api/pricing-schemes/{vehicle_id}`)
- ✅ Map-Based Fixed Routes API (`/api/map-fixed-routes`, CRUD operations)
- ✅ Mileage bracket calculation logic
- ✅ Haversine distance and radius matching for fixed routes
- ✅ Quote engine prioritizes fixed routes, falls back to mileage pricing

#### Frontend
- ✅ **Unified Pricing Tab** in admin sidebar (consolidated from Pricing Rules, Fixed Routes, Vehicle Classes)
- ✅ **Vehicle Class Cards** grid showing all vehicle types with click-to-configure
- ✅ **Mileage Brackets Card** with inline editing (add/remove/edit brackets)
- ✅ **Hourly/Daily Rates Card** with editable fields
- ✅ **Extra Fees Card** with all configurable fees
- ✅ **Fixed Routes Card** with table listing routes, search, edit/delete actions
- ✅ **Add Fixed Route Dialog** with Google Maps integration:
  - Interactive map with draggable markers (A=Start, B=End)
  - Editable radius circles for start/end zones
  - Auto-calculated distance
  - Valid for return journey checkbox
- ✅ **Summary Panel** showing counts and key metrics (brackets, routes, base fare, min fare)

### Database Collections
- users (with role: customer, super_admin)
- customers
- vehicles (8 categories)
- pricing_rules (legacy mileage rules)
- pricing_schemes (NEW - comprehensive pricing per vehicle class)
- fixed_routes (text-based legacy routes)
- map_fixed_routes (NEW - geo-based routes with radius)
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

Pricing Module (NEW):
/api/pricing-schemes - Get all pricing schemes
/api/pricing-schemes/{vehicle_id} - Get/update pricing scheme for vehicle
/api/map-fixed-routes - CRUD map-based fixed routes
/api/map-fixed-routes/vehicle/{vehicle_id} - Get routes for specific vehicle
/api/pricing-summary/{vehicle_id} - Get pricing summary counts

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
/api/quote - Get price quote (NEW: prioritizes fixed routes, falls back to mileage)
/api/bookings - Create/view bookings
```

## Technical Notes

### Mocked Features
- Email notifications: Not sent (logged only)
- Stripe: Using test keys (sk_test_emergent)

### Live Integrations (NOT MOCKED)
- Google Places API: Live autocomplete in admin dialogs and route builder
- Google Maps JavaScript API: Live maps in Fixed Route Builder

### Key Files
- `/app/backend/server.py` - All backend routes and models (~2500 lines)
- `/app/frontend/src/pages/AdminDashboard.js` - Super admin dashboard (~1800 lines)
- `/app/frontend/src/components/PricingModule.js` - Comprehensive pricing module (NEW)
- `/app/frontend/src/pages/FleetDashboard.js` - Fleet dashboard
- `/app/frontend/src/components/BookingEngine.js` - Booking engine with return journey
- `/app/frontend/src/pages/SearchResultsPage.js` - Search results with return pricing
- `/app/frontend/src/context/BookingContext.js` - Booking state (includes return fields)

## Prioritized Backlog

### P0 - Immediate (Recently Completed)
- [x] Pricing Module with mileage brackets, time rates, extra fees
- [x] Map-based fixed routes with Google Maps radius zones
- [x] Smart quote engine (fixed route priority → mileage fallback)
- [x] Fleet Management Workflow: driver_price assignment, fleet job visibility, fleet driver/vehicle CRUD, fleet job assignment
- [x] **Post-Deployment Bug Fixes (Feb 2, 2026)**:
  - [x] Fleet Impersonation Fixed: "Login As" button now correctly navigates to fleet dashboard
  - [x] Invoice Download Fixed: Changed from window.open to axios blob download with proper auth headers
  - [x] Driver Invoice Feature: Verified working - "Driver Payout" option available in Create Invoice dialog
- [x] **CMS Full Integration (Feb 4, 2026)**:
  - [x] Layout.js now fetches CMS settings for header/footer (phone, email, tagline, logo, social links, address, WhatsApp)
  - [x] HomePage.js now uses CMS settings for hero section (title, subtitle, background image, CTA button)
  - [x] Added Hero Section card to CMS Manager with all homepage banner controls
  - [x] Footer now displays social media icons dynamically from CMS (Facebook, Twitter, Instagram, LinkedIn, YouTube)
  - [x] WhatsApp button automatically appears in footer when number is configured
  - [x] All CMS changes now immediately reflect on the website
- [x] **OG Meta Tags & Driver Tracking (Feb 4, 2026)**:
  - [x] Fixed OG meta tags in index.html for proper WhatsApp/social sharing (shows "Aircabio - Premium Airport Transfers")
  - [x] Implemented complete Driver GPS Tracking System:
    - [x] Admin can generate tracking links from booking view Tracking tab
    - [x] Driver Tracking Page (/driver-tracking/{token}) with trip details and Start/Stop buttons
    - [x] 10-second location updates with GPS accuracy, speed, heading
    - [x] Admin can Copy Link, Email Driver, Open Tracking Page
    - [x] Live tracking status display (Pending/Active/Completed)
    - [x] Latest location display with Google Maps link
    - [x] Download Tracking Report as HTML/PDF with distance, duration, route history
    - [x] Email tracking link to driver via Resend
- [x] **Fleet Portal Enhancements (Feb 5, 2026)**:
  - [x] Job cards show "Generate Tracking Link" button when driver is assigned
  - [x] Tracking section shows Copy/Email/Open buttons after link is generated
  - [x] Notifications button in sidebar now opens dialog with fleet notifications
  - [x] Mark all as read functionality for notifications
  - [x] Enhanced Driver Tracking Page:
    - [x] Trip Route card with Pickup (green) and Dropoff (red) locations clearly displayed
    - [x] Journey Status progress showing 4 steps (En Route → Arrived → Journey → Completed)
    - [x] Status update buttons for driver to change status live
    - [x] Navigate to Pickup/Dropoff Google Maps links
- [x] **Tracking Visualization Enhancements (Feb 5, 2026)**:
  - [x] Fleet Portal Job Detail Dialog - Added Tracking tab with live map view
  - [x] Admin Booking View Dialog - Tracking tab shows map preview of driver location
  - [x] PDF Tracking Report - Added Route Map section with full route visualization
  - [x] PDF Tracking Report - Added Key Location Points section with individual map screenshots
  - [x] Map images use Google Static Maps API with Start/End markers
- [x] **Booking Dashboard Accuracy & Feature Upgrade (Feb 2, 2026)**:
  - [x] B2B Customer Accounts system with full CRUD (Add, Edit, View, Delete)
  - [x] Customer Accounts tab in Admin Dashboard sidebar
  - [x] BookingViewDialog modal with Details/Notes/History tabs
  - [x] View button (eye icon) on bookings table opens detailed booking modal
  - [x] Internal Notes system for bookings (add, view, delete notes)
  - [x] Full Booking History/Audit trail showing all changes
  - [x] B2B Customer Account dropdown in New Job dialog with auto-fill
  - [x] B2B customer account badge displayed in bookings table
- [x] **Fleet Management Module Improvements (Feb 2, 2026)**:
  - [x] FleetViewDialog modal with Overview/Drivers/Vehicles/Jobs tabs
  - [x] View Fleet button (eye icon) opens detailed fleet info
  - [x] Fleet search bar (by name, email, contact, city)
  - [x] Fleet status filter dropdown (Active/Inactive/Suspended)
  - [x] Stats cards showing Total/Active/Inactive/Suspended counts
  - [x] **Critical:** Backend blocks job assignments to suspended fleets (HTTP 400)
  - [x] Frontend dropdowns filter out suspended fleets (only show active)
  - [x] Login As button disabled for suspended fleets
- [x] **Comprehensive Invoice System (Feb 2, 2026)**:
  - [x] InvoiceManager component for Super Admin with full CRUD
  - [x] Create invoices for Customers, Fleets, Drivers
  - [x] Select completed bookings to include in invoice
  - [x] Profit margin tracking on customer invoices
  - [x] VAT/Tax calculation with configurable rate
  - [x] Payment terms: Net 7, Net 14, Net 30
  - [x] Invoice workflow: Draft → Pending Approval → Approved → Issued → Paid
  - [x] Auto-Generate Fleet Invoices button (1st-15th or 16th-end of month periods)
  - [x] Invoice approval workflow for fleet invoices
  - [x] View/Edit/Delete invoice capabilities
  - [x] Download PDF functionality
  - [x] FleetInvoices component for Fleet Dashboard
  - [x] Fleet can view and download their invoices
- [x] **Email Notification System & Fleet Password Management (Feb 2, 2026)**:
  - [x] Comprehensive email service module (`/app/backend/email_service.py`)
  - [x] Email templates for: Booking confirmation, Job alerts to fleet, Driver assignment, Status updates, Invoice issued, Payment success/failed, Fleet suspended/reactivated
  - [x] Integrated email sending into booking/status/invoice/fleet endpoints using BackgroundTasks
  - [x] Fleet Password Management: Reset Password button in Admin Fleet table
  - [x] Auto-generate temporary password on fleet creation
  - [x] Send password via email to fleet
  - [x] **NOTE:** Email service requires valid Resend API key (starts with `re_`) - currently in LOG-ONLY mode

### P1 - High Priority
- [ ] Get valid Resend API key to enable actual email sending
- [ ] Real Google Places autocomplete integration for booking engine
- [ ] Booking export to CSV
- [ ] Refactor server.py (2500+ lines) into proper structure (models, routes, services)

### P2 - Medium Priority
- [ ] SMS/WhatsApp notifications
- [ ] Round-trip discount configuration (currently hardcoded 10%)
- [ ] Day/night pricing surcharges (fees are configured but not applied in quote)
- [ ] Multi-currency support
- [ ] Driver mobile app/portal
- [ ] Refactor AdminDashboard.js (1800+ lines) into smaller components

### P3 - Nice to Have
- [ ] Flight tracking integration
- [ ] Multi-language support
- [ ] Corporate account management
- [ ] Analytics dashboard
- [ ] Real-time WebSocket notifications
- [ ] Bulk import/export for pricing rules and fixed routes
