# BarberCraft: Elite Grooming Management System

BarberCraft is a sophisticated, full-stack barber shop management application designed for seamless appointment booking, customer loyalty management, and administrative oversight.

## 🚀 Key Features

### 📅 Advanced Booking System
- **Intelligent Slot Management**: Support for standard and emergency slots (Early Morning/Late Night).
- **Service Categories**: Haircuts, beard grooming, and combo packages with dynamic pricing.
- **Add-on Services**: Enhance bookings with massages and scrubs.

### 💳 Integrated Payments & Wallet
- **Advance Payments**: Secure booking confirmation via deposit.
- **Razorpay Integration**: Seamless UPI and card payment support.
- **Smart Wallet**: Refunded deposits for missed bookings are automatically credited to a user wallet for future add-ons.

### 🏆 Loyalty & Rewards
- **Points Engine**: Earn points for every completed service.
- **Redemption Store**: High-value customers can redeem points for premium services.

### 📊 Admin Control Center
- **Live Statistics**: Real-time revenue and booking tracking.
- **Order Management**: Update booking statuses and process rewards.
- **User Insights**: Manage customer records and wallet balances.

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (NoSQL) with Motor Async Driver
- **Security**: JWT Authentication & BCrypt Password Hashing
- **Integrations**: Razorpay Payment Gateway

### Frontend
- **Library**: React 19
- **Styling**: Tailwind CSS & Framer Motion
- **UI Components**: Radix UI & shadcn/ui
- **State Management**: React Hook Form & Zod Validation

## 🏗️ Architecture

The project follows a modern decoupled architecture:
- `/backend`: Scalable REST API with asynchronous database operations.
- `/frontend`: Responsive, mobile-first React application with premium aesthetics.

## 🚦 Getting Started

### Backend Setup
1. `cd backend`
2. `pip install -r requirements.txt`
3. Configure `.env` with your live `MONGO_URL` (MongoDB Atlas), `DB_NAME`, and `JWT_SECRET`.
4. `python server.py` (Local) or use Uvicorn for production.

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm start`

---
*Created with ❤️ for premium grooming experiences.*
