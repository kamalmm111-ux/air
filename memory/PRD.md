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

## User Personas
1. **Travelers** - Business/leisure travelers needing airport transfers
2. **Corporate Clients** - Regular booking customers
3. **Super Admin** - Operations team managing bookings, fleets, and pricing
4. **Fleet Admin** - Fleet operators managing assigned jobs
5. **Driver** - Individual drivers (future)

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
- ✅ Super Admin Dashboard with tabs: Dashboard, Bookings, Fleets, Drivers, Pricing, Routes, Radius Zones, Vehicles, Invoices, Settings
- ✅ Fleet Portal with login at /fleet/login
- ✅ Fleet Dashboard with tabs: Jobs, Earnings, Invoices, Vehicles
- ✅ Job assignment dialog in Admin Bookings
- ✅ Fleet job management (accept, start, complete)
- ✅ Role-based routing (super_admin → /admin, fleet_admin → /fleet/dashboard)

### Database Collections
- users (with role: customer, super_admin)
- vehicles (6 categories seeded)
- pricing_rules (6 rules seeded)
- fixed_routes (3 routes seeded)
- radius_zones (4 zones seeded)
- radius_routes (2 routes seeded)
- fleets (1 sample fleet: London Premier Cars)
- drivers
- fleet_vehicles
- invoices
- notifications
- bookings
- payment_transactions

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Test job assignment flow end-to-end
- [ ] Implement Add Fleet form in Admin
- [ ] Implement Add Driver form
- [ ] Real Google Places autocomplete integration

### P1 - High Priority
- [ ] Real Google Distance Matrix API integration
- [ ] Email notifications (booking confirmations)
- [ ] Interactive map for drawing radius zones
- [ ] Booking export to CSV
- [ ] Complete invoice PDF generation with proper formatting

### P2 - Medium Priority
- [ ] SMS/WhatsApp notifications
- [ ] Round-trip discount rules
- [ ] Day/night pricing surcharges
- [ ] Multi-currency support
- [ ] Driver mobile app/portal

### P3 - Nice to Have
- [ ] Flight tracking integration
- [ ] Multi-language support
- [ ] Corporate account management
- [ ] Analytics dashboard
- [ ] Real-time WebSocket notifications

## Technical Notes

### Mocked Features
- Google Places: Using plain text input
- Distance calculation: User provides distance or mock values
- Email notifications: Not sent (logged only)
- Stripe: Using test keys (sk_test_emergent)

### Test Credentials
- Super Admin: admin@aircabio.com / admin123
- Fleet Admin: fleet1@aircabio.com / fleet123
- Customer: Register via /register

### API Endpoints Structure
```
/api/auth/login - User login
/api/auth/fleet/login - Fleet admin login
/api/auth/register - User registration
/api/auth/me - Get current user

/api/admin/stats - Dashboard statistics
/api/admin/bookings - Manage all bookings
/api/fleets - CRUD fleets
/api/drivers - CRUD drivers
/api/invoices - Manage invoices
/api/radius-zones - Geo-pricing zones
/api/radius-routes - Routes using zones

/api/fleet/jobs - Fleet's assigned jobs
/api/fleet/stats - Fleet statistics
/api/bookings/{id}/assign - Assign to fleet
/api/bookings/{id}/accept - Fleet accepts job
/api/bookings/{id}/start - Start trip
/api/bookings/{id}/complete - Complete job

/api/vehicles - Public vehicle list
/api/pricing - Pricing rules
/api/quote - Get price quote
/api/bookings - Create/view bookings
/api/payments/create-session - Stripe checkout
```

### Architecture
- Backend: FastAPI + MongoDB (Motor async driver)
- Frontend: React + React Router + Tailwind CSS + Shadcn/UI
- Authentication: JWT with role-based access control
- Payments: Stripe integration via emergentintegrations
- Hosting: Kubernetes with Nginx ingress

## Key Files
- `/app/backend/server.py` - All backend routes and models
- `/app/frontend/src/App.js` - React router configuration
- `/app/frontend/src/context/AuthContext.js` - Auth state management
- `/app/frontend/src/pages/AdminDashboard.js` - Super admin dashboard
- `/app/frontend/src/pages/FleetDashboard.js` - Fleet dashboard
- `/app/frontend/src/components/AdminLayout.js` - Admin sidebar
- `/app/frontend/src/components/FleetLayout.js` - Fleet sidebar
