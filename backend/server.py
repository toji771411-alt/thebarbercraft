from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os, logging, bcrypt, jwt, uuid

# Required Env Vars
def get_env(k, default=None):
    v = os.environ.get(k, default)
    if not v:
        logging.error(f"CRITICAL: Missing environment variable {k}")
        raise RuntimeError(f"Missing {k}")
    return v

from supabase import create_client, Client

supabase_url = get_env('SUPABASE_URL')
supabase_key = get_env('SUPABASE_KEY')
supabase_service_role = get_env('SUPABASE_SERVICE_ROLE')

supabase: Client = create_client(supabase_url, supabase_service_role)

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_SECRET = get_env('JWT_SECRET')
JWT_ALG = "HS256"


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Auth helpers ──────────────────────────────────────────────────────────────
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def check_pw(pw: str, h: str) -> bool:
    return bcrypt.checkpw(pw.encode(), h.encode())

def make_token(uid: str, email: str, role: str) -> str:
    return jwt.encode(
        {"sub": uid, "email": email, "role": role,
         "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        JWT_SECRET, algorithm=JWT_ALG
    )

async def current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = auth[7:]
    try:
        # Supabase JWT verification
        # You can either use the supabase client to get the user or decode manually
        # Using service role client to get user by token
        res = supabase.auth.get_user(token)
        if not res.user:
            raise HTTPException(401, "User not found")
        
        # Fetch profile from profiles table
        profile = supabase.table("profiles").select("*").eq("id", res.user.id).single().execute()
        if not profile.data:
            raise HTTPException(401, "Profile not found")
            
        return profile.data
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        raise HTTPException(401, "Invalid token")

async def admin_user(request: Request) -> dict:
    u = await current_user(request)
    if u.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return u

# ── Constants ─────────────────────────────────────────────────────────────────
PRICES = {
    "haircut": 300,
    "beard": 200,
    "combo": 400,
    "manicure": 250,
    "pedicure": 300,
    "curly_hair": 450,
    "head_massage": 150,
    "de_tan": 200,
    "hair_spa": 500,
    "facial": 600
}
POINTS = {
    "haircut": 10,
    "beard": 10,
    "combo": 25,
    "manicure": 25,
    "pedicure": 30,
    "curly_hair": 45,
}
ADDONS = {
    "head_massage": 150,
    "de_tan": 200,
    "hair_spa": 500,
    "facial": 600
}
REDEMPTIONS = {
    "head_massage": {"name": "Relaxing Head Massage", "points": 100},
    "de_tan": {"name": "De-Tan Treatment", "points": 150},
    "hair_spa": {"name": "Nourishing Hair Spa", "points": 175},
    "facial": {"name": "Rejuvenating Facial", "points": 300},
    "surprise_gift": {"name": "Exclusive Surprise Gift", "points": 400},
}
# Tue-Sun: 9:00 AM - 10:30 PM
STD_TUE_SUN = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00",
                "16:00","17:00","18:00","19:00","20:00","21:00","22:00"]
# Mon: 4:00 PM - 8:30 PM
STD_MON     = ["16:00","17:00","18:00","19:00","20:00"]
# Emergency Slots
EMRG_AM     = ["08:00"] # 8:00 AM - 9:00 AM
EMRG_PM     = ["22:30"] # 10:30 PM - 11:30 PM

# ── Auth routes ───────────────────────────────────────────────────────────────
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

@api_router.post("/auth/register")
async def register(data: RegisterIn):
    email = data.email.lower()
    # Note: Supabase Auth handles registration. This is just for the profile.
    # In a full setup, this would be handled by supabase.auth.sign_up
    return {"message": "Please use Supabase Auth for registration"}

@api_router.post("/auth/login")
async def login(data: LoginIn):
    email = data.email.lower()
    # Note: Supabase Auth handles login.
    return {"message": "Please use Supabase Auth for login"}

@api_router.get("/auth/me")
async def me(request: Request):
    return await current_user(request)

# ── Slots ─────────────────────────────────────────────────────────────────────
@api_router.get("/slots/available")
async def available_slots(booking_date: str, slot_type: str = "standard"):
    try:
        d = datetime.strptime(booking_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Use YYYY-MM-DD format")

    # Check if day is blocked
    blocked = supabase.table("blocked_days").select("*").eq("date", booking_date).execute()
    if blocked.data:
        return {"date": booking_date, "slot_type": slot_type, "blocked": True, "reason": blocked.data[0].get("reason", "Lucky is not available")}

    dow = d.weekday()  # 0=Mon
    if slot_type == "standard":
        times = STD_MON if dow == 0 else STD_TUE_SUN
    elif slot_type == "emergency_morning":
        times = EMRG_AM
    elif slot_type == "emergency_night":
        times = EMRG_PM
    else:
        return {"date": booking_date, "slot_type": slot_type, "available_slots": ["right_now"]}

    # Filter out past times ONLY if the date is Today in IST
    now_ist = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    today_ist = now_ist.date()
    
    available_times = []
    for t in times:
        if d < today_ist: # Past day
            continue
        if d == today_ist: # Today: only show future slots
            h, m = map(int, t.split(':'))
            slot_time = now_ist.replace(hour=h, minute=m, second=0, microsecond=0)
            if slot_time <= now_ist:
                continue
        available_times.append(t)

    logger.info(f"Slots for {booking_date}: {available_times}")

    # Check if day is blocked by admin
    blocked_res = supabase.table("blocked_days").select("*").eq("date", booking_date).execute()
    if blocked_res.data:
        return {"date": booking_date, "slot_type": slot_type, "blocked": True, 
                "reason": blocked_res.data[0].get("reason", "Barber is not available today"),
                "slots": []}

    booked = supabase.table("bookings").select("time_slot").eq("date", booking_date).eq("slot_type", slot_type).in_("status", ["pending_payment", "confirmed"]).execute()
    taken = {b["time_slot"] for b in booked.data}
    return {"date": booking_date, "slot_type": slot_type, "blocked": False,
            "slots": [{"time": t, "available": t not in taken} for t in available_times]}

# ── Bookings ──────────────────────────────────────────────────────────────────
class BookingIn(BaseModel):
    service: str
    slot_type: str
    date: str
    time_slot: str
    barber: str = "Any Available"
    addon_services: List[str] = []
    client_name: Optional[str] = None
    applied_rewards: List[str] = []
    wallet_addons: List[str] = []

@api_router.post("/bookings")
async def create_booking(data: BookingIn, request: Request):
    user = await current_user(request)
    base = PRICES.get(data.service, 300)
    mult = 3 if data.slot_type in ["emergency_morning","emergency_night","right_now"] else 1
    
    addon_total = 0
    for a_id in data.addon_services or []:
        addon_total += ADDONS.get(a_id, 0)
        
    total = (base * mult) + addon_total
    
    # Membership Check
    is_free = False
    if user.get("is_subscriber") and datetime.fromisoformat(user["subscription_expiry"]) > datetime.now(timezone.utc):
        if data.service == "haircut" and user.get("haircuts_left", 0) > 0:
            total -= (base * mult)
            is_free = True
        elif data.service == "beard" and user.get("beard_trims_left", 0) > 0:
            total -= (base * mult)
            is_free = True
    
    # Reward Deductions (Addons only)
    applied_rewards = getattr(data, 'applied_rewards', [])
    for a_id in applied_rewards:
        if a_id in data.addon_services:
            # Verify user has enough points or existing redemption
            reward_info = REDEMPTIONS.get(a_id)
            if reward_info:
                # Check for existing redemption first
                existing = supabase.table("reward_redemptions").select("*").eq("user_id", user["id"]).eq("reward_id", a_id).eq("status", "available").single().execute()
                if existing.data:
                    supabase.table("reward_redemptions").update({"status": "applied", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", existing.data["id"]).execute()
                    total -= ADDONS.get(a_id, 0)
                elif user.get("rewards_points", 0) >= reward_info["points"]:
                    supabase.table("profiles").update({"rewards_points": user["rewards_points"] - reward_info["points"]}).eq("id", user["id"]).execute()
                    supabase.table("reward_redemptions").insert({
                        "user_id": user["id"], "reward_id": a_id, "reward_name": reward_info["name"],
                        "points_used": reward_info["points"], "status": "applied"
                    }).execute()
                    total -= ADDONS.get(a_id, 0)
    
    # Wallet Deductions (Addons only)
    wallet_addons = getattr(data, 'wallet_addons', [])
    for a_id in wallet_addons:
        if a_id in data.addon_services and a_id not in applied_rewards:
            price = ADDONS.get(a_id, 0)
            if user.get("wallet_balance", 0) >= price:
                supabase.table("profiles").update({"wallet_balance": float(user["wallet_balance"]) - price}).eq("id", user["id"]).execute()
                total -= price

    advance = total # 100% Prepaid

    base_pts = POINTS.get(data.service, 10) # default to 10
    addon_pts = 0
    # Add-on points: 10 pts per 100 spent (only for paid ones)
    for a_id in data.addon_services or []:
        if a_id in applied_rewards or a_id in wallet_addons:
            continue
            
        a_price = ADDONS.get(a_id, 0)
        addon_pts += int((a_price / 100) * 10)
    
    points_to_earn = base_pts + addon_pts

    if data.slot_type != "right_now":
        existing_booking = supabase.table("bookings").select("*").eq("date", data.date).eq("time_slot", data.time_slot).eq("slot_type", data.slot_type).in_("status", ["pending_payment", "confirmed"]).execute()
        if existing_booking.data:
            raise HTTPException(400, "Slot already booked")

    bid = str(uuid.uuid4())
    status = "pending_approval" if data.slot_type == "right_now" else "pending_payment"
    
    # Admin Booking Override
    booked_by_admin = user.get("role") == "admin"
    actual_name = data.client_name if booked_by_admin and data.client_name else user.get("name")
    if booked_by_admin:
        status = "confirmed"
    
    doc = {
        "booking_id": bid, "user_id": user["id"],
        "user_name": actual_name, "user_email": user.get("email") if not booked_by_admin else "admin@manual",
        "user_phone": user.get("phone") if not booked_by_admin else "manual", 
        "service": data.service,
        "barber": data.barber,
        "slot_type": data.slot_type, "date": data.date, 
        "time": data.time_slot, "time_slot": data.time_slot,
        "addon_services": data.addon_services, "total_amount": float(total),
        "advance_amount": float(advance), "balance_amount": float(total - advance),
        "points_to_earn": points_to_earn,
        "status": status, "payment_status": "paid" if (is_free or booked_by_admin) else "pending",
        "is_free": is_free,
        "booked_by_admin": booked_by_admin,
        "payment_id": "admin_manual" if booked_by_admin else None, 
        "order_id": None, "rebook_deadline": None
    }
    res = supabase.table("bookings").insert(doc).execute()
    return res.data[0]

@api_router.get("/bookings")
async def my_bookings(request: Request):
    user = await current_user(request)
    res = supabase.table("bookings").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute()
    return res.data

@api_router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, request: Request):
    user = await current_user(request)
    res = supabase.table("bookings").select("*").eq("booking_id", booking_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Booking not found")
    if user.get("role") != "admin":
        raise HTTPException(403, "Users cannot cancel bookings. Please contact the salon.")
    if res.data["status"] not in ["pending_payment", "confirmed"]:
        raise HTTPException(400, "Cannot cancel this booking")
    supabase.table("bookings").update({"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("booking_id", booking_id).execute()
    return {"message": "Booking cancelled"}

@api_router.post("/bookings/{booking_id}/rebook")
async def rebook(booking_id: str, data: BookingIn, request: Request):
    user = await current_user(request)
    res = supabase.table("bookings").select("*").eq("booking_id", booking_id).single().execute()
    old = res.data
    if not old or old["user_id"] != user["id"]:
        raise HTTPException(404, "Booking not found")
    if old["status"] != "missed":
        raise HTTPException(400, "Only missed bookings can be rebooked")
    deadline = old.get("rebook_deadline")
    if deadline:
        dl = datetime.fromisoformat(deadline)
        if dl.tzinfo is None:
            dl = dl.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > dl:
            raise HTTPException(400, "3-day rebooking window expired")

    base = PRICES.get(data.service, 300)
    mult = 3 if data.slot_type in ["emergency_morning","emergency_night","right_now"] else 1
    total = base * mult
    new_bid = str(uuid.uuid4())
    doc = {
        "booking_id": new_bid, "user_id": user["id"],
        "user_name": user.get("name"), "user_email": user.get("email"),
        "user_phone": user.get("phone"), "service": data.service,
        "barber": data.barber,
        "slot_type": data.slot_type, "date": data.date, 
        "time": data.time_slot, "time_slot": data.time_slot,
        "addon_services": [], "total_amount": float(total),
        "advance_amount": float(old["advance_amount"]), "balance_amount": float(total - old["advance_amount"]),
        "status": "confirmed", "payment_status": "advance_paid",
        "payment_id": old.get("payment_id"), "rebooked_from": booking_id
    }
    supabase.table("bookings").insert(doc).execute()
    supabase.table("bookings").update({"status": "rebooked", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("booking_id", booking_id).execute()
    return doc

# ── Payments (mock – Razorpay ready) ─────────────────────────────────────────
class OrderIn(BaseModel):
    booking_id: str

@api_router.post("/payments/create-order")
async def create_order(data: OrderIn, request: Request):
    user = await current_user(request)
    res = supabase.table("bookings").select("*").eq("booking_id", data.booking_id).single().execute()
    b = res.data
    if not b or b["user_id"] != user["id"]:
        raise HTTPException(404, "Booking not found")

    key_id = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_SlyVTtWcGzaPhX")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "9HfkFb4RCN0rbmC9A2EVBh54")

    if key_id and key_secret:
        import razorpay
        rz = razorpay.Client(auth=(key_id, key_secret))
        order = rz.order.create({
            "amount": int(b["advance_amount"] * 100),
            "currency": "INR", "payment_capture": 1,
            "receipt": data.booking_id[:40],
        })
        supabase.table("bookings").update({"order_id": order["id"]}).eq("booking_id", data.booking_id).execute()
        return {"order_id": order["id"], "amount": b["advance_amount"],
                "currency": "INR", "booking_id": data.booking_id,
                "key_id": key_id, "mock": False}

    # Mock order
    oid = f"order_{uuid.uuid4().hex[:16]}"
    supabase.table("bookings").update({"order_id": oid}).eq("booking_id", data.booking_id).execute()
    return {"order_id": oid, "amount": b["advance_amount"],
            "currency": "INR", "booking_id": data.booking_id,
            "key_id": "mock", "mock": True}

class VerifyIn(BaseModel):
    booking_id: str
    payment_id: Optional[str] = None
    order_id: Optional[str] = None
    signature: Optional[str] = None

@api_router.post("/payments/verify")
async def verify_payment(data: VerifyIn, request: Request):
    user = await current_user(request)
    res = supabase.table("bookings").select("*").eq("booking_id", data.booking_id).single().execute()
    b = res.data
    if not b or b["user_id"] != user["id"]:
        raise HTTPException(404, "Booking not found")

    key_id = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_SlyVTtWcGzaPhX")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "9HfkFb4RCN0rbmC9A2EVBh54")

    if key_id and key_secret and data.signature and data.order_id and data.payment_id:
        import razorpay
        rz = razorpay.Client(auth=(key_id, key_secret))
        params = {
            'razorpay_order_id': data.order_id,
            'razorpay_payment_id': data.payment_id,
            'razorpay_signature': data.signature
        }
        try:
            rz.utility.verify_payment_signature(params)
        except Exception:
            raise HTTPException(400, "Invalid payment signature")

    pid = data.payment_id or f"pay_{uuid.uuid4().hex[:16]}"
    supabase.table("bookings").update({
        "status": "confirmed", "payment_status": "advance_paid",
        "payment_id": pid, "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("booking_id", data.booking_id).execute()
    return {"message": "Payment verified", "booking_id": data.booking_id, "payment_id": pid}

# ── Wallet ────────────────────────────────────────────────────────────────────
@api_router.get("/wallet")
async def get_wallet(request: Request):
    user = await current_user(request)
    return {"wallet_balance": user.get("wallet_balance", 0.0),
            "note": "Wallet funds are only for Add-on Services"}

class UseWalletIn(BaseModel):
    addon_service: str
    booking_id: str

@api_router.post("/wallet/use")
async def use_wallet(data: UseWalletIn, request: Request):
    user = await current_user(request)
    price = ADDONS.get(data.addon_service)
    if not price:
        raise HTTPException(400, "Invalid addon service")
    if float(user.get("wallet_balance", 0)) < price:
        raise HTTPException(400, "Insufficient wallet balance")
    
    supabase.table("profiles").update({"wallet_balance": float(user["wallet_balance"]) - price}).eq("id", user["id"]).execute()
    
    # Get current addons and add new one
    res = supabase.table("bookings").select("addon_services").eq("booking_id", data.booking_id).eq("user_id", user["id"]).single().execute()
    addons = res.data.get("addon_services") or []
    if data.addon_service not in addons:
        addons.append(data.addon_service)
        supabase.table("bookings").update({"addon_services": addons}).eq("booking_id", data.booking_id).execute()
        
    return {"message": f"Addon added via wallet", "deducted": price}

# ── Rewards ───────────────────────────────────────────────────────────────────
@api_router.get("/rewards")
async def get_rewards(request: Request):
    user = await current_user(request)
    return {
        "points": user.get("rewards_points", 0),
        "earn_rules": [
            {"service": "Haircut", "points": 10},
            {"service": "Beard Styling", "points": 10},
            {"service": "Combo", "points": 25},
            {"service": "Add-ons", "points": "10 per ₹100"},
        ],
        "redemptions": [
            {"id": k, "name": v["name"], "points": v["points"]}
            for k, v in REDEMPTIONS.items()
        ],
    }

class RedeemIn(BaseModel):
    reward_id: str

@api_router.post("/rewards/redeem")
async def redeem(data: RedeemIn, request: Request):
    user = await current_user(request)
    r = REDEMPTIONS.get(data.reward_id)
    if not r:
        raise HTTPException(400, "Invalid reward")
    if user.get("rewards_points", 0) < r["points"]:
        raise HTTPException(400, f"Need {r['points']} pts, you have {user.get('rewards_points',0)}")
    
    supabase.table("profiles").update({"rewards_points": user["rewards_points"] - r["points"]}).eq("id", user["id"]).execute()
    supabase.table("reward_redemptions").insert({
        "user_id": user["id"], "reward_id": data.reward_id,
        "reward_name": r["name"], "points_used": r["points"],
        "status": "available",
        "booking_id": None
    }).execute()
    return {"message": f"Redeemed {r['name']}!", "points_used": r["points"]}

@api_router.get("/rewards/my-redemptions")
async def my_redemptions(request: Request):
    user = await current_user(request)
    res = supabase.table("reward_redemptions").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute()
    return res.data

class ApplyRedemptionIn(BaseModel):
    redemption_id: str
    booking_id: str

@api_router.post("/rewards/apply")
async def apply_redemption(data: ApplyRedemptionIn, request: Request):
    user = await current_user(request)
    # Find redemption
    red_res = supabase.table("reward_redemptions").select("*").eq("id", data.redemption_id).eq("user_id", user["id"]).single().execute()
    red = red_res.data
    if not red:
        raise HTTPException(404, "Redemption not found")
    if red["status"] != "available":
        raise HTTPException(400, "Redemption already used or applied")

    # Find booking
    booking_res = supabase.table("bookings").select("*").eq("booking_id", data.booking_id).eq("user_id", user["id"]).single().execute()
    booking = booking_res.data
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking["status"] not in ["confirmed", "pending_payment"]:
        raise HTTPException(400, "Cannot add reward to this booking status")

    # Update booking with the addon
    addon_id = red["reward_id"]
    price_to_deduct = ADDONS.get(addon_id, 0)
    
    addons = booking.get("addon_services", [])
    if addon_id not in addons:
        addons.append(addon_id)
    
    upd = {"addon_services": addons}
    
    if booking["status"] == "pending_payment":
        new_total = max(0, booking["total_amount"] - price_to_deduct)
        upd["total_amount"] = float(new_total)
        upd["advance_amount"] = float(new_total)
    
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    supabase.table("bookings").update(upd).eq("booking_id", data.booking_id).execute()
    
    # Mark redemption as applied
    supabase.table("reward_redemptions").update({
        "status": "applied", 
        "booking_id": data.booking_id, 
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", data.redemption_id).execute()

    return {"message": f"Reward '{red['reward_name']}' applied to booking {data.booking_id}"}

@api_router.post("/subscription/create-order")
async def create_subscription_order(request: Request):
    user = await current_user(request)
    amount = 999
    key_id = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_SlyVTtWcGzaPhX")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "9HfkFb4RCN0rbmC9A2EVBh54")
    
    import razorpay
    rz = razorpay.Client(auth=(key_id, key_secret))
    order = rz.order.create({
        "amount": amount * 100,
        "currency": "INR", "payment_capture": 1,
        "notes": {"type": "subscription", "user_id": user["id"]}
    })
    return {"order_id": order["id"], "amount": amount, "key_id": key_id}

@api_router.post("/subscription/verify")
async def verify_subscription_payment(data: dict, request: Request):
    user = await current_user(request)
    key_id = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_SlyVTtWcGzaPhX")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "9HfkFb4RCN0rbmC9A2EVBh54")
    
    # Real Razorpay verification if signature present
    if data.get("signature") and key_id and key_secret:
        import razorpay
        rz = razorpay.Client(auth=(key_id, key_secret))
        params = {
            'razorpay_order_id': data.get("order_id"),
            'razorpay_payment_id': data.get("payment_id"),
            'razorpay_signature': data.get("signature")
        }
        try:
            rz.utility.verify_payment_signature(params)
        except:
            raise HTTPException(400, "Invalid signature")

    expiry = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    supabase.table("profiles").update({
        "is_subscriber": True,
        "subscription_expiry": expiry,
        "haircuts_left": 1,
        "beard_trims_left": 1,
        "rewards_points": user.get("rewards_points", 0) + 50 # Bonus points for subscribing
    }).eq("id", user["id"]).execute()
    return {"message": "Membership activated!", "expiry": expiry}

# ── Admin ─────────────────────────────────────────────────────────────────────
@api_router.get("/admin/stats")
async def admin_stats(request: Request):
    await admin_user(request)
    
    total = supabase.table("bookings").select("id", count="exact").execute()
    confirmed = supabase.table("bookings").select("id", count="exact").eq("status", "confirmed").execute()
    completed = supabase.table("bookings").select("id", count="exact").eq("status", "completed").execute()
    missed = supabase.table("bookings").select("id", count="exact").eq("status", "missed").execute()
    customers = supabase.table("profiles").select("id", count="exact").eq("role", "customer").execute()
    active_members = supabase.table("profiles").select("id", count="exact").eq("role", "customer").eq("is_subscriber", True).execute()
    
    rev_res = supabase.table("bookings").select("advance_amount").in_("status", ["confirmed", "completed"]).eq("payment_status", "advance_paid").execute()
    revenue = sum(float(b["advance_amount"]) for b in rev_res.data)
    
    pts_res = supabase.table("profiles").select("rewards_points").execute()
    pts_issued = sum(p["rewards_points"] for p in pts_res.data)
    
    redeemed_res = supabase.table("reward_redemptions").select("points_used").execute()
    pts_redeemed = sum(r["points_used"] for r in redeemed_res.data)

    return {
        "total_bookings": total.count, "confirmed": confirmed.count, "completed": completed.count,
        "missed": missed.count, "customers": customers.count,
        "revenue": revenue,
        "points_issued": pts_issued,
        "points_redeemed": pts_redeemed,
        "active_members": active_members.count
    }

@api_router.get("/admin/bookings")
async def admin_bookings(request: Request, status: Optional[str] = None, user_id: Optional[str] = None):
    await admin_user(request)
    q = supabase.table("bookings").select("*")
    if status: q = q.eq("status", status)
    if user_id: q = q.eq("user_id", user_id)
    
    res = q.order("created_at", desc=True).execute()
    return res.data

class StatusIn(BaseModel):
    status: str

@api_router.patch("/admin/bookings/{booking_id}")
async def admin_update_booking(booking_id: str, data: StatusIn, request: Request):
    await admin_user(request)
    res = supabase.table("bookings").select("*").eq("booking_id", booking_id).single().execute()
    b = res.data
    if not b:
        raise HTTPException(404, "Booking not found")
    
    upd: dict = {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if data.status == "completed":
        pts = b.get("points_to_earn", 10)
        supabase.table("profiles").update({"rewards_points": b["points_to_earn"] + pts}).eq("id", b["user_id"]).execute()
        # Deduct credits if free booking
        if b.get("is_free"):
            field = "haircuts_left" if b["service"] == "haircut" else "beard_trims_left"
            # Get current left and decrement
            u_res = supabase.table("profiles").select(field).eq("id", b["user_id"]).single().execute()
            if u_res.data:
                supabase.table("profiles").update({field: u_res.data[field] - 1}).eq("id", b["user_id"]).execute()
    elif data.status == "missed":
        upd["rebook_deadline"] = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    
    supabase.table("bookings").update(upd).eq("booking_id", booking_id).execute()
    return {"message": f"Status updated to {data.status}"}

@api_router.delete("/admin/bookings/{booking_id}")
async def admin_delete_booking(booking_id: str, request: Request):
    await admin_user(request)
    supabase.table("bookings").delete().eq("booking_id", booking_id).execute()
    return {"message": "Booking deleted successfully"}

@api_router.get("/admin/users")
async def admin_users(request: Request):
    await admin_user(request)
    res = supabase.table("profiles").select("*").eq("role", "customer").execute()
    return res.data

class WalletUpdate(BaseModel):
    balance: float

@api_router.patch("/admin/users/{user_id}/wallet")
async def admin_update_wallet(user_id: str, data: WalletUpdate, request: Request):
    await admin_user(request)
    supabase.table("profiles").update({"wallet_balance": float(data.balance)}).eq("id", user_id).execute()
    return {"message": "Wallet updated"}

class MembershipUpdate(BaseModel):
    is_subscriber: bool
    subscription_expiry: Optional[str] = None
    haircuts_left: int
    beard_trims_left: int

@api_router.patch("/admin/users/{user_id}/membership")
async def admin_update_membership(user_id: str, data: MembershipUpdate, request: Request):
    await admin_user(request)
    update_data = {
        "is_subscriber": data.is_subscriber,
        "haircuts_left": data.haircuts_left,
        "beard_trims_left": data.beard_trims_left
    }
    if data.subscription_expiry:
        update_data["subscription_expiry"] = data.subscription_expiry
    
    supabase.table("profiles").update(update_data).eq("id", user_id).execute()
    return {"message": "Membership updated"}

class RewardsUpdate(BaseModel):
    points: int

@api_router.patch("/admin/users/{user_id}/rewards")
async def admin_update_rewards(user_id: str, data: RewardsUpdate, request: Request):
    await admin_user(request)
    supabase.table("profiles").update({"rewards_points": data.points}).eq("id", user_id).execute()
    return {"message": "Rewards points updated"}

class PointsAddIn(BaseModel):
    amount: float
    points: int

@api_router.post("/admin/users/{user_id}/rewards/add")
async def admin_add_rewards(user_id: str, data: PointsAddIn, request: Request):
    await admin_user(request)
    # Get current points
    res = supabase.table("profiles").select("rewards_points").eq("id", user_id).single().execute()
    if not res.data:
        raise HTTPException(404, "User not found")
    new_points = res.data["rewards_points"] + data.points
    supabase.table("profiles").update({"rewards_points": new_points}).eq("id", user_id).execute()
    return {"message": f"Added {data.points} points for ₹{data.amount}", "new_balance": new_points}

# ── Blocked Days ─────────────────────────────────────────────────────────────
@api_router.get("/admin/blocked-days")
async def get_blocked_days(request: Request):
    await admin_user(request)
    res = supabase.table("blocked_days").select("*").order("date").execute()
    return res.data

class BlockDayIn(BaseModel):
    date: str
    reason: Optional[str] = "Lucky is not available"

@api_router.post("/admin/blocked-days")
async def block_day(data: BlockDayIn, request: Request):
    await admin_user(request)
    supabase.table("blocked_days").insert({"date": data.date, "reason": data.reason}).execute()
    return {"message": f"Day {data.date} blocked"}

@api_router.delete("/admin/blocked-days/{date}")
async def unblock_day(date: str, request: Request):
    await admin_user(request)
    supabase.table("blocked_days").delete().eq("date", date).execute()
    return {"message": f"Day {date} unblocked"}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, request: Request):
    await admin_user(request)
    # Using Supabase Admin to delete user from Auth
    supabase.auth.admin.delete_user(user_id)
    # Profiles and other data will be deleted via CASCADE if set up in SQL
    # Otherwise delete manually
    supabase.table("profiles").delete().eq("id", user_id).execute()
    supabase.table("bookings").delete().eq("user_id", user_id).execute()
    supabase.table("reward_redemptions").delete().eq("user_id", user_id).execute()
    return {"message": "User and all associated data deleted successfully"}

@api_router.post("/admin/wallet/process-expired")
async def process_expired(request: Request):
    await admin_user(request)
    now = datetime.now(timezone.utc).isoformat()
    res = supabase.table("bookings").select("*").eq("status", "missed").lt("rebook_deadline", now).neq("wallet_transferred", True).execute()
    expired = res.data
    count = 0
    for b in expired:
        # Get user balance
        u_res = supabase.table("profiles").select("wallet_balance").eq("id", b["user_id"]).single().execute()
        if u_res.data:
            new_bal = float(u_res.data["wallet_balance"]) + float(b.get("advance_amount", 0))
            supabase.table("profiles").update({"wallet_balance": new_bal}).eq("id", b["user_id"]).execute()
            supabase.table("bookings").update({"wallet_transferred": True, "status": "wallet_transferred"}).eq("booking_id", b["booking_id"]).execute()
            count += 1
    return {"transferred": count, "message": f"{count} advance payment(s) moved to wallets"}

# ── App setup ─────────────────────────────────────────────────────────────────
import traceback

@app.middleware("http")
async def add_cors_header(request: Request, call_next):
    origin = request.headers.get("origin", "*")
    
    if request.method == "OPTIONS":
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response
        
    try:
        response = await call_next(request)
    except Exception as e:
        stack = traceback.format_exc()
        logger.error(f"Global error: {str(e)}\n{stack}")
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={
                "detail": str(e), 
                "stack": stack,
                "type": "GlobalError"
            },
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "true"
            }
        )
        
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

app.include_router(api_router)

@app.on_event("startup")
async def startup():
    logger.info("Backend started with Supabase")

@app.on_event("shutdown")
async def shutdown():
    logger.info("Backend shutting down")
