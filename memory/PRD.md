# Aircabio Airport Transfers - Product Requirements Document

## Original Problem Statement
Build a complete airport transfer booking website for Aircabio with:
- Booking engine on homepage (pickup/dropoff, date/time, passengers, luggage, flight number, meet & greet)
- Vehicle results page with categories and pricing
- Checkout with Stripe payment integration
- Customer dashboard for booking management
- Admin dashboard for operations management
- Global coverage with pricing system (fixed routes + mileage-based)

## User Personas
1. **Travelers** - Business/leisure travelers needing airport transfers
2. **Corporate Clients** - Regular booking customers
3. **Admin/Dispatch** - Operations team managing bookings and pricing

## Core Requirements (Static)
### Customer Features
- Booking engine with location inputs, date/time, passenger count
- Vehicle selection with pricing display
- Secure checkout with Stripe payments
- Account registration and login
- Booking history and management

### Admin Features
- Dashboard with booking stats
- Bookings management (view, update status)
- Pricing rules configuration (mileage-based)
- Fixed route pricing management
- Fleet/vehicle management

## What's Been Implemented (Jan 2026)

### Backend (FastAPI + MongoDB)
- ✅ User authentication (JWT-based)
- ✅ Vehicle categories CRUD
- ✅ Pricing rules CRUD
- ✅ Fixed routes CRUD
- ✅ Quote calculation engine
- ✅ Booking management
- ✅ Stripe payment integration
- ✅ Admin stats endpoint

### Frontend (React + Tailwind + Shadcn)
- ✅ Homepage with booking engine
- ✅ Search results page with vehicle quotes
- ✅ Checkout page with Stripe redirect
- ✅ Booking success/cancel pages
- ✅ Customer dashboard (bookings list)
- ✅ Admin dashboard (stats, bookings, pricing, routes, vehicles)
- ✅ User registration and login
- ✅ Fleet page
- ✅ Static pages (About, FAQ, Contact, Terms, Privacy, Cancellation)

### Database Collections
- users (with admin role)
- vehicles (6 categories seeded)
- pricing_rules (6 rules seeded)
- fixed_routes (3 routes seeded)
- bookings
- payment_transactions

## Prioritized Backlog

### P0 - Critical (Next Phase)
- [ ] Real Google Places autocomplete integration
- [ ] Real Google Distance Matrix API integration
- [ ] Email notifications (booking confirmations)

### P1 - High Priority
- [ ] SMS/WhatsApp notifications
- [ ] Driver assignment in admin
- [ ] Invoice/receipt PDF generation
- [ ] Booking export to CSV

### P2 - Medium Priority
- [ ] Round-trip discount rules
- [ ] Day/night pricing surcharges
- [ ] Multi-currency support
- [ ] Admin role management (Owner/Manager/Dispatcher/Finance)

### P3 - Nice to Have
- [ ] Flight tracking integration
- [ ] Multi-language support
- [ ] Corporate account management
- [ ] Analytics dashboard

## Technical Notes

### Mocked Features
- Google Places: Using plain text input (mock)
- Distance calculation: Random mock values
- Email notifications: Not sent (logged only)

### Credentials
- Admin: admin@aircabio.com / admin123
- Stripe: Test key (sk_test_emergent)

### API Endpoints
- All prefixed with /api
- CORS enabled
- JWT authentication on protected routes
