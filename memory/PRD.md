# THE BARBER CRAFT - Product Requirements Document

## Original Problem Statement
Build a full-stack barber shop web application for "THE BARBER CRAFT" based on the PDF document describing their booking system, policies, and rewards program. App includes: landing page + full booking system, customer and admin login, Razorpay payment integration (mocked, keys to be added later), dark premium barbershop theme with gold accents.

## Design Theme (Updated)
- **Theme**: Black & White — clean editorial aesthetic
- **Fonts**: Cormorant Garamond (serif headings), Outfit (body)
- **Colors**: Pure white (#FFFFFF) backgrounds, pure black (#111111) accents/buttons
- **Hero**: Dark dramatic photography with white overlay text (for contrast)
- **Rewards/Footer**: Inverted all-black sections for visual variety
- **Logo**: Actual company logo ("The Barber Craft" oval lettermark) used in navbar, hero, auth modal, and footer
- **Service cards**: Grayscale images with color-on-hover effect
- **Frontend**: React.js (Create React App + CRACO), Tailwind CSS, shadcn/ui components
- **Backend**: FastAPI (Python), MongoDB (Motor async driver)
- **Auth**: JWT Bearer tokens stored in localStorage
- **Payment**: Razorpay (mocked until keys added), auto-confirm in test mode
- **Database**: MongoDB (barber_craft_db)

## User Personas
1. **Customer** - Books appointments, tracks rewards, manages wallet
2. **Admin/Barber** - Manages bookings, marks completion, views customers

## Core Requirements (Static)
- Landing page with services, policies, emergency slots, rewards info
- Customer registration & login (JWT auth)
- Admin login with role-based access
- Slot booking (Standard + Emergency Morning/Night + Right Now)
- 70% advance payment flow (Razorpay-ready, mocked)
- 3-day recovery window for missed appointments
- Digital wallet (funded from expired advance payments, add-ons only)
- Rewards loyalty program (earn points per service, redeem for free services)
- Admin dashboard (stats, booking management, wallet processing)

## Pricing
- Haircut: ₹300 (+1 reward point)
- Beard Trim: ₹200 (+1 reward point)
- Executive Combo: ₹400 (+3 reward points)
- Emergency Slots: 3× standard price
- Add-ons: Head Massage ₹150, Scrub ₹200

## Working Hours
- Tuesday–Sunday: 9:00 AM – 10:30 PM
- Monday: 2:00 PM – 10:30 PM
- Emergency Morning: 8:00–9:00 AM (3×)
- Emergency Night: 10:30–11:30 PM (3×)

## Rewards Redemption
- 10 pts → Head Massage (free)
- 15 pts → Signature Haircut (free)
- 25 pts → Executive Combo (free)

## What's Been Implemented (2025-02-XX)

### Backend (/app/backend/server.py)
- [x] JWT auth (register, login, /me)
- [x] Admin seeding on startup
- [x] Slot availability API (respects Mon vs Tue-Sun hours)
- [x] Booking creation with slot conflict detection
- [x] Mock payment order + verify flow (Razorpay-ready)
- [x] Wallet management (balance, use for add-ons)
- [x] Rewards (earn points on completion, redeem)
- [x] Admin routes: stats, bookings CRUD, users, wallet processing
- [x] 3-day rebook window on missed bookings
- [x] Points awarded on booking completion (admin action)

### Frontend (/app/frontend/src/)
- [x] Dark premium theme (Cormorant Garamond + Outfit fonts, gold #C5A059)
- [x] Landing page (hero, services bento grid, emergency slots, working hours, policies, rewards, CTA, footer)
- [x] Glassmorphism sticky Navbar
- [x] Auth Modal (login/register tabs)
- [x] Customer Dashboard (stats, bookings, rewards, wallet tabs)
- [x] Booking Page (4-step flow: service → slot type → date+time → review+pay)
- [x] Admin Dashboard (stats, bookings management, customers)
- [x] Mock payment confirmation screen
- [x] data-testid on all interactive elements
- [x] Protected routes (customer + admin)

## Test Credentials
- Admin: admin@barbercraft.com / BarberAdmin2024
- Customer: test@customer.com / test123

## Prioritized Backlog

### P0 (Blocking for production)
- [ ] Add real Razorpay API keys (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET in backend/.env)
- [ ] Auto-process expired booking windows (cron job/background task)

### P1 (High value)
- [ ] SMS/Email notifications for booking confirmation
- [ ] Customer profile edit (name, phone)
- [ ] Admin: set service prices dynamically
- [ ] Booking date/time validation (prevent booking in the past)
- [ ] Razorpay webhook verification

### P2 (Nice to have)
- [ ] Admin: block specific dates/times
- [ ] Customer: cancel only within X hours of booking
- [ ] Analytics charts on admin dashboard
- [ ] Add-on booking at checkout
- [ ] PWA for mobile experience
