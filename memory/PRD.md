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
