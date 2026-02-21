# Aircabio Airport Transfers - Product Requirements Document

## Original Problem Statement
Build a complete airport transfer booking website for Aircabio with comprehensive booking engine, fleet management, driver tracking, and customer communication.

## What's Been Implemented

### Core Features
- ✅ Multi-step booking engine with Google Places autocomplete
- ✅ Vehicle selection with categories (Saloon, Estate, MPV, Executive)
- ✅ One-way and Return journey support
- ✅ Child seat options (Infant, Toddler, Booster)
- ✅ Stripe payment integration
- ✅ Multi-currency support (GBP, EUR, USD, CAD)
- ✅ Live currency rate sync from exchangerate-api.com

### Admin Panel (Super Admin)
- ✅ Complete booking management (create, edit, assign, status updates)
- ✅ Fleet management (create, suspend, reactivate, "Login As")
- ✅ Driver management with ratings
- ✅ Vehicle management
- ✅ Pricing configuration (mileage brackets, fixed routes)
- ✅ System settings (child seat prices, currency rates)
- ✅ Customer ratings dashboard
- ✅ Invoice generation
- ✅ **Mozio B2B Integration** - Link bookings to Mozio
- ✅ **Image Upload System** - Direct file upload replacing all URL inputs
- ✅ **B2B Corporate Customers** - Assign bookings to corporate accounts
- ✅ **Invoice Email Control** - Per-customer toggle for automatic invoices
- ✅ **CRM & Reports System** - Comprehensive analytics and business intelligence

### Fleet Portal
- ✅ View and manage assigned jobs
- ✅ Assign drivers and vehicles to jobs
- ✅ Update job status
- ✅ View earnings and driver ratings
- ✅ Generate and copy tracking links (aircabio.com domain)

### Email Automation (Complete)
- ✅ Booking Confirmation email on successful booking
- ✅ Driver Assigned email with driver details and vehicle info
- ✅ Driver En Route email with live tracking link
- ✅ Trip Completion email with branded PDF invoice attached
- ✅ Customer Review Invitation email

### B2B Integration - Mozio (NEW - Feb 21, 2026)
- ✅ **Mozio External ID field** in Admin New Job form
- ✅ **B2B Source selector** (Mozio, Jayride, Other)
- ✅ **Auto-sync to Mozio API** when:
  - Fleet assigns driver to a Mozio booking
  - Driver marks status as "en_route"
- ✅ **Provider Type:** MZ Drive UK

**How it works:**
1. When you receive a Mozio booking, enter their booking reference in "Mozio Booking ID" field
2. When you assign a driver, driver info is automatically sent to Mozio
3. When driver goes "en route", updated info is sent to Mozio
4. Mozio customers see your driver details in their app/emails

### Customer Features
- ✅ Customer dashboard with booking history
- ✅ Live driver tracking page
- ✅ Post-trip review/rating submission page
- ✅ Full address display in autocomplete
- ✅ Return journey details in checkout summary

## Test Credentials
| Portal | URL | Email | Password |
|--------|-----|-------|----------|
| Super Admin | /admin | admin@aircabio.com | Aircabio@2024! |
| Fleet Admin | /fleet/login | Use "Login As" from Admin | - |
| Customer | /login | Register new accounts | - |

## Environment Variables Required

### Backend (.env)
```
MONGO_URL=mongodb://your-production-url
DB_NAME=aircabio_production
STRIPE_API_KEY=sk_live_xxx
JWT_SECRET_KEY=your_secure_key
RESEND_API_KEY=re_xxx
SENDER_EMAIL=bookings@aircabio.com
GOOGLE_MAPS_API_KEY=xxx
FRONTEND_URL=https://aircabio.com
# Mozio Integration
MOZIO_ENABLED=true
MOZIO_API_URL=https://api.mozio.com
MOZIO_PROVIDER_TYPE=MZ Drive UK
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://aircabio.com
REACT_APP_GOOGLE_MAPS_API_KEY=xxx
```

## Database Collections
- users, customers, vehicles, bookings
- pricing_schemes, map_fixed_routes
- fleets, drivers, fleet_vehicles
- invoices, notifications
- tracking_sessions
- admin_settings (child seats, currencies)
- driver_ratings

## Booking Fields for B2B
- `mozio_external_id` - Mozio's booking reference number
- `b2b_source` - Source provider ("mozio", "jayride", etc.)
- `mozio_sync_status` - Sync status ("pending", "synced", "error")
- `mozio_last_sync` - Last sync timestamp

## Session Complete - Feb 21, 2026 (Earlier)
- Mozio B2B integration implemented
- Driver info auto-syncs to Mozio when assigned or en_route
- Ready for testing with Mozio staging API

## Session Complete - Feb 21, 2026 (Current)
### Global Image Upload System Implemented
Replaced all "Image URL" inputs with direct upload functionality:

**Components Updated:**
- ✅ **DriversManager.js** - Driver photo upload
- ✅ **VehiclesManager.js** - Vehicle photo upload  
- ✅ **CMSManager.js** - Logo, Favicon, Hero Background, Media Library, Vehicle categories
- ✅ **FleetDialogs.js** - Fleet portal driver photo upload

**Features:**
- Drag & drop file upload
- Click to browse files
- Camera capture on mobile devices
- Instant image preview with success indicator
- File validation (JPG, PNG, WebP, GIF - max 5MB)
- Automatic image compression and optimization
- URL fallback input for backward compatibility
- Files stored locally in `/app/backend/uploads/images/`

**Backend Endpoints:**
- `POST /api/upload/image` - Upload image (returns URL)
- `DELETE /api/upload/image` - Delete image
- `GET /api/upload/image/info` - Get image info
- `GET /api/uploads/images/{category}/{filename}` - Serve static images

**Test Results:** 16/16 backend tests passed, all frontend components verified

## Session Complete - Feb 21, 2026 (Contact Configuration)
### Centralized Contact Details System Implemented

**Official Company Contact Details (Permanent):**
- Phone: +44 330 058 5676
- Email: info@aircabio.com

**Implementation:**
- ✅ **Backend .env**: Added COMPANY_PHONE and COMPANY_EMAIL environment variables
- ✅ **email_service.py**: Updated to use centralized contact configuration
- ✅ **server.py WebsiteSettings**: Default values set to official contact details
- ✅ **MongoDB website_settings**: Updated with official contact details
- ✅ **Layout.js**: Header and footer pull from CMS with official defaults
- ✅ **ContactPage.js**: Fetches from centralized API with fallbacks
- ✅ **CustomerTrackingPage.js**: Uses SUPPORT_PHONE constant
- ✅ **BookingCancelPage.js**: Updated support phone number
- ✅ **BookingSuccessPage.js**: Updated support phone number
- ✅ **CancellationPage.js**: Updated contact info in policy text
- ✅ **PrivacyPage.js**: Updated contact info

**Locations Updated:**
- Website Header (top navigation)
- Website Footer (Contact Us section)
- Contact Page (Phone & Email cards)
- Booking Success/Confirmation Page
- Customer Tracking Page (support line)
- Booking Cancellation Page
- Privacy Policy Page
- Cancellation Policy Page
- All automated email templates (via email_service.py)

## Session Complete - Feb 21, 2026 (B2B Corporate Features)
### Corporate Customer & Invoice Control System

**Feature 1: Corporate Customer Assignment in Bookings**
- ✅ **Job Listing**: Added "Account" column showing company name or "Direct Customer"
- ✅ **Customer Account Filter**: New dropdown filter to view B2B vs Direct bookings
- ✅ **Job Details**: Customer Account (B2B) section visible in booking view dialog
- ✅ **New Job Form**: Already has B2B Customer Account dropdown (pre-existing)
- ✅ **Internal Only**: Corporate info hidden from Fleet partners

**Feature 2: Invoice Email Control per Customer**
- ✅ **CustomerAccount Model**: Added `send_invoice_email` (boolean, default true)
- ✅ **CustomerAccount Model**: Added `accounts_email` (optional separate email for invoices)
- ✅ **Create/Edit Form**: "Invoice Settings" section with toggle and accounts email field
- ✅ **View Dialog**: Shows "Invoice Email Status: Enabled/Disabled"
- ✅ **Email Logic**: `send_completion_with_invoice()` checks customer setting before sending
- ✅ **Accounts Email**: If set, invoices sent to accounts email AND booking email

**Database Changes:**
- `customer_accounts.send_invoice_email`: Boolean (default: true)
- `customer_accounts.accounts_email`: String (optional)

## Session Complete - Feb 21, 2026 (CRM & Reports System)
### Advanced Invoicing & Statements System (NEW - Feb 21, 2026)

**Backend Endpoints Created:**
- `POST /api/invoices/custom` - Create custom ad-hoc invoices with line items
- `POST /api/invoices/{id}/amend` - Amend invoice with audit trail
- `GET /api/invoices/{id}/amendments` - Get amendment history
- `POST /api/invoices/{id}/approve` - Approve draft invoice
- `POST /api/invoices/{id}/issue` - Issue invoice
- `POST /api/invoices/{id}/mark-paid` - Mark as paid
- `GET /api/statements/driver/{id}/summary` - Driver earnings preview
- `POST /api/statements/driver/generate` - Generate driver statement
- `GET /api/statements/fleet/{id}/summary` - Fleet earnings preview
- `POST /api/statements/fleet/generate` - Generate fleet statement
- `POST /api/statements/customer/generate` - Generate customer invoice

**Frontend InvoicingStatements.js Component:**
- ✅ **Generate Statements Tab**: 
  - Driver Statement card with dialog (driver select, date range, preview, generate)
  - Fleet Statement card with dialog (fleet select, date range, preview, generate)
  - Customer Invoice card with dialog (customer select, date range, generate)
  - Recent Statements table
- ✅ **All Invoices Tab**:
  - Search by invoice # or name
  - Filter by Type (Driver, Fleet, Customer, Custom)
  - Filter by Status (Draft, Pending, Approved, Issued, Paid)
  - Actions: View, Edit, Amend, Approve, Issue, Mark Paid, Download PDF, Delete
- ✅ **Custom Invoice Tab**:
  - Invoice Type selector
  - Due In (Days) selector
  - Bill To fields (Name, Email, Phone, Address)
  - Line Items (add/remove, description, quantity, unit price)
  - VAT Rate calculation
  - Notes field
  - Auto-calculated totals

**Data Models Added:**
- `CustomInvoiceCreate` - Pydantic model for custom invoice creation
- `InvoiceAmendment` - Pydantic model for invoice amendments
- `CustomLineItem` - Pydantic model for line items

### Comprehensive CRM & Reporting System Built

**Backend Report Endpoints Created:**
- `/api/reports/dashboard` - KPIs and metrics overview
- `/api/reports/revenue` - Revenue trend analysis with grouping
- `/api/reports/bookings` - Booking status, categories, hourly distribution
- `/api/reports/routes` - Popular pickup/dropoff locations and routes
- `/api/reports/customers` - Customer analytics and B2B account breakdown
- `/api/reports/fleets` - Fleet performance metrics
- `/api/reports/drivers` - Driver performance and leaderboards
- `/api/reports/driver-tracking/{driver_id}` - Detailed job tracking per driver
- `/api/reports/cancellations` - Cancellation and no-show analysis

**Frontend CRM Module (CRMReports.js):**
- ✅ **Dashboard Tab**: KPI cards, Revenue Split pie chart, Booking Status, Operations summary
- ✅ **Revenue Tab**: Revenue/Cost/Profit trend chart, Daily/Weekly/Monthly grouping, CSV export
- ✅ **Bookings Tab**: Status breakdown pie, Vehicle categories bar chart, Hourly distribution
- ✅ **Routes Tab**: Top pickup/dropoff locations, Top routes by revenue
- ✅ **Customers Tab**: Top customers by revenue, B2B accounts breakdown
- ✅ **Fleets Tab**: Fleet performance table with revenue/profit/ratings
- ✅ **Drivers Tab**: Leaderboards (by jobs, earnings, rating), Performance table, Job tracking dialog
- ✅ **Issues Tab**: Cancellation breakdown, Lost revenue, Trend analysis

**Features:**
- Quick date range filters (Today, 7 Days, 30 Days, This Month, Last Month, This Year)
- Custom date range picker
- CSV export for all reports
- Driver job tracking with timeline
- Recharts visualizations (Line, Area, Bar, Pie charts)
- Responsive tables with sorting
