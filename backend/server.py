from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os, logging, bcrypt, jwt, uuid

mongo_url = os.environ['MONGO_URL']
db_client = AsyncIOMotorClient(mongo_url)
db = db_client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ['JWT_SECRET']
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
    try:
        p = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALG])
        u = await db.users.find_one({"_id": ObjectId(p["sub"])})
        if not u:
            raise HTTPException(401, "User not found")
        u["id"] = str(u.pop("_id"))
        u.pop("password_hash", None)
        return u
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(401, "Invalid token")

async def admin_user(request: Request) -> dict:
    u = await current_user(request)
    if u.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return u

# ── Constants ─────────────────────────────────────────────────────────────────
PRICES = {"haircut": 300, "beard": 200, "combo": 400}
POINTS = {"haircut": 1, "beard": 1, "combo": 3}
ADDONS = {"head_massage": 150, "scrub": 200}
REDEMPTIONS = {
    "head_massage": {"name": "Head Massage", "points": 10},
    "signature_haircut": {"name": "Signature Haircut", "points": 15},
    "executive_combo": {"name": "Executive Combo", "points": 25},
}
STD_TUE_SUN = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00",
                "16:00","17:00","18:00","19:00","20:00","21:00","22:00"]
STD_MON     = ["14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00"]
EMRG_AM     = ["08:00"]
EMRG_PM     = ["22:30"]

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
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    doc = {
        "name": data.name, "email": email, "phone": data.phone,
        "password_hash": hash_pw(data.password), "role": "customer",
        "wallet_balance": 0.0, "rewards_points": 0,
        "created_at": datetime.now(timezone.utc),
    }
    r = await db.users.insert_one(doc)
    uid = str(r.inserted_id)
    token = make_token(uid, email, "customer")
    return {"token": token, "user": {"id": uid, "name": data.name, "email": email,
            "role": "customer", "wallet_balance": 0.0, "rewards_points": 0, "phone": data.phone}}

@api_router.post("/auth/login")
async def login(data: LoginIn):
    email = data.email.lower()
    u = await db.users.find_one({"email": email})
    if not u or not check_pw(data.password, u["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    uid = str(u["_id"])
    token = make_token(uid, email, u.get("role", "customer"))
    return {"token": token, "user": {
        "id": uid, "name": u.get("name"), "email": email, "role": u.get("role","customer"),
        "wallet_balance": u.get("wallet_balance", 0.0),
        "rewards_points": u.get("rewards_points", 0), "phone": u.get("phone"),
    }}

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

    dow = d.weekday()  # 0=Mon
    if slot_type == "standard":
        times = STD_MON if dow == 0 else STD_TUE_SUN
    elif slot_type == "emergency_morning":
        times = EMRG_AM
    elif slot_type == "emergency_night":
        times = EMRG_PM
    else:
        return {"date": booking_date, "slot_type": slot_type, "available_slots": ["right_now"]}

    booked = await db.bookings.find(
        {"date": booking_date, "slot_type": slot_type,
         "status": {"$in": ["pending_payment", "confirmed"]}},
        {"_id": 0, "time_slot": 1}
    ).to_list(100)
    taken = {b["time_slot"] for b in booked}
    return {"date": booking_date, "slot_type": slot_type,
            "available_slots": [t for t in times if t not in taken]}

# ── Bookings ──────────────────────────────────────────────────────────────────
class BookingIn(BaseModel):
    service: str
    slot_type: str
    date: str
    time_slot: str
    addon_services: List[str] = []

@api_router.post("/bookings")
async def create_booking(data: BookingIn, request: Request):
    user = await current_user(request)
    base = PRICES.get(data.service)
    if not base:
        raise HTTPException(400, "Invalid service")
    mult = 3 if data.slot_type in ["emergency_morning","emergency_night","right_now"] else 1
    total = base * mult
    advance = round(total * 0.7)

    if data.slot_type != "right_now":
        if await db.bookings.find_one({
            "date": data.date, "time_slot": data.time_slot,
            "slot_type": data.slot_type, "status": {"$in": ["pending_payment","confirmed"]}
        }):
            raise HTTPException(400, "Slot already booked")

    bid = str(uuid.uuid4())
    doc = {
        "booking_id": bid, "user_id": user["id"],
        "user_name": user.get("name"), "user_email": user.get("email"),
        "user_phone": user.get("phone"), "service": data.service,
        "slot_type": data.slot_type, "date": data.date, "time_slot": data.time_slot,
        "addon_services": data.addon_services, "total_amount": total,
        "advance_amount": advance, "balance_amount": total - advance,
        "status": "pending_payment", "payment_status": "pending",
        "payment_id": None, "order_id": None, "rebook_deadline": None,
        "created_at": datetime.now(timezone.utc),
    }
    await db.bookings.insert_one(doc)
    doc.pop("_id", None)
    # Convert datetime for JSON
    doc["created_at"] = doc["created_at"].isoformat()
    return doc

@api_router.get("/bookings")
async def my_bookings(request: Request):
    user = await current_user(request)
    docs = await db.bookings.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for d in docs:
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
    return docs

@api_router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, request: Request):
    user = await current_user(request)
    b = await db.bookings.find_one({"booking_id": booking_id})
    if not b:
        raise HTTPException(404, "Booking not found")
    if b["user_id"] != user["id"]:
        raise HTTPException(403, "Not authorized")
    if b["status"] not in ["pending_payment", "confirmed"]:
        raise HTTPException(400, "Cannot cancel this booking")
    await db.bookings.update_one({"booking_id": booking_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc)}})
    return {"message": "Booking cancelled"}

@api_router.post("/bookings/{booking_id}/rebook")
async def rebook(booking_id: str, data: BookingIn, request: Request):
    user = await current_user(request)
    old = await db.bookings.find_one({"booking_id": booking_id})
    if not old or old["user_id"] != user["id"]:
        raise HTTPException(404, "Booking not found")
    if old["status"] != "missed":
        raise HTTPException(400, "Only missed bookings can be rebooked")
    deadline = old.get("rebook_deadline")
    if deadline:
        dl = datetime.fromisoformat(deadline) if isinstance(deadline, str) else deadline
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
        "slot_type": data.slot_type, "date": data.date, "time_slot": data.time_slot,
        "addon_services": [], "total_amount": total,
        "advance_amount": old["advance_amount"], "balance_amount": total - old["advance_amount"],
        "status": "confirmed", "payment_status": "advance_paid",
        "payment_id": old.get("payment_id"), "rebooked_from": booking_id,
        "created_at": datetime.now(timezone.utc),
    }
    await db.bookings.insert_one(doc)
    await db.bookings.update_one({"booking_id": booking_id},
        {"$set": {"status": "rebooked", "updated_at": datetime.now(timezone.utc)}})
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    return doc

# ── Payments (mock – Razorpay ready) ─────────────────────────────────────────
class OrderIn(BaseModel):
    booking_id: str

@api_router.post("/payments/create-order")
async def create_order(data: OrderIn, request: Request):
    user = await current_user(request)
    b = await db.bookings.find_one({"booking_id": data.booking_id})
    if not b or b["user_id"] != user["id"]:
        raise HTTPException(404, "Booking not found")

    key_id = os.environ.get("RAZORPAY_KEY_ID", "")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")

    if key_id and key_secret:
        import razorpay
        rz = razorpay.Client(auth=(key_id, key_secret))
        order = rz.order.create({
            "amount": int(b["advance_amount"] * 100),
            "currency": "INR", "payment_capture": 1,
            "receipt": data.booking_id[:40],
        })
        await db.bookings.update_one({"booking_id": data.booking_id},
            {"$set": {"order_id": order["id"]}})
        return {"order_id": order["id"], "amount": b["advance_amount"],
                "currency": "INR", "booking_id": data.booking_id,
                "key_id": key_id, "mock": False}

    # Mock order
    oid = f"order_{uuid.uuid4().hex[:16]}"
    await db.bookings.update_one({"booking_id": data.booking_id},
        {"$set": {"order_id": oid}})
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
    b = await db.bookings.find_one({"booking_id": data.booking_id})
    if not b or b["user_id"] != user["id"]:
        raise HTTPException(404, "Booking not found")
    pid = data.payment_id or f"pay_{uuid.uuid4().hex[:16]}"
    await db.bookings.update_one({"booking_id": data.booking_id}, {"$set": {
        "status": "confirmed", "payment_status": "advance_paid",
        "payment_id": pid, "updated_at": datetime.now(timezone.utc),
    }})
    return {"message": "Payment verified", "booking_id": data.booking_id, "payment_id": pid}

# ── Wallet ────────────────────────────────────────────────────────────────────
@api_router.get("/wallet")
async def get_wallet(request: Request):
    user = await current_user(request)
    u = await db.users.find_one({"_id": ObjectId(user["id"])})
    return {"wallet_balance": u.get("wallet_balance", 0.0),
            "note": "Wallet funds are only for Add-on Services"}

class UseWalletIn(BaseModel):
    addon_service: str
    booking_id: str

@api_router.post("/wallet/use")
async def use_wallet(data: UseWalletIn, request: Request):
    user = await current_user(request)
    u = await db.users.find_one({"_id": ObjectId(user["id"])})
    price = ADDONS.get(data.addon_service)
    if not price:
        raise HTTPException(400, "Invalid addon service")
    if u.get("wallet_balance", 0) < price:
        raise HTTPException(400, "Insufficient wallet balance")
    await db.users.update_one({"_id": ObjectId(user["id"])},
        {"$inc": {"wallet_balance": -price}})
    await db.bookings.update_one({"booking_id": data.booking_id},
        {"$addToSet": {"addon_services": data.addon_service}})
    return {"message": f"Addon added via wallet", "deducted": price}

# ── Rewards ───────────────────────────────────────────────────────────────────
@api_router.get("/rewards")
async def get_rewards(request: Request):
    user = await current_user(request)
    u = await db.users.find_one({"_id": ObjectId(user["id"])})
    return {
        "points": u.get("rewards_points", 0),
        "earn_rules": [
            {"service": "Haircut", "points": 1},
            {"service": "Beard", "points": 1},
            {"service": "Combo", "points": 3},
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
    u = await db.users.find_one({"_id": ObjectId(user["id"])})
    if u.get("rewards_points", 0) < r["points"]:
        raise HTTPException(400, f"Need {r['points']} pts, you have {u.get('rewards_points',0)}")
    await db.users.update_one({"_id": ObjectId(user["id"])},
        {"$inc": {"rewards_points": -r["points"]}})
    await db.reward_redemptions.insert_one({
        "user_id": user["id"], "reward_id": data.reward_id,
        "reward_name": r["name"], "points_used": r["points"],
        "created_at": datetime.now(timezone.utc),
    })
    return {"message": f"Redeemed {r['name']}!", "points_used": r["points"]}

# ── Admin ─────────────────────────────────────────────────────────────────────
@api_router.get("/admin/stats")
async def admin_stats(request: Request):
    await admin_user(request)
    total = await db.bookings.count_documents({})
    confirmed = await db.bookings.count_documents({"status": "confirmed"})
    completed = await db.bookings.count_documents({"status": "completed"})
    missed = await db.bookings.count_documents({"status": "missed"})
    customers = await db.users.count_documents({"role": "customer"})
    rev = await db.bookings.aggregate([
        {"$match": {"status": {"$in": ["confirmed","completed"]}, "payment_status": "advance_paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$advance_amount"}}},
    ]).to_list(1)
    return {"total_bookings": total, "confirmed": confirmed, "completed": completed,
            "missed": missed, "customers": customers,
            "revenue": rev[0]["total"] if rev else 0}

@api_router.get("/admin/bookings")
async def admin_bookings(request: Request, status: Optional[str] = None):
    await admin_user(request)
    q = {"status": status} if status else {}
    docs = await db.bookings.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
    return docs

class StatusIn(BaseModel):
    status: str

@api_router.patch("/admin/bookings/{booking_id}")
async def admin_update_booking(booking_id: str, data: StatusIn, request: Request):
    await admin_user(request)
    b = await db.bookings.find_one({"booking_id": booking_id})
    if not b:
        raise HTTPException(404, "Booking not found")
    upd: dict = {"status": data.status, "updated_at": datetime.now(timezone.utc)}
    if data.status == "completed":
        pts = POINTS.get(b.get("service","haircut"), 1)
        await db.users.update_one({"_id": ObjectId(b["user_id"])},
            {"$inc": {"rewards_points": pts}})
    elif data.status == "missed":
        upd["rebook_deadline"] = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    await db.bookings.update_one({"booking_id": booking_id}, {"$set": upd})
    return {"message": f"Status updated to {data.status}"}

@api_router.get("/admin/users")
async def admin_users(request: Request):
    await admin_user(request)
    users = await db.users.find({"role": "customer"},
        {"name":1,"email":1,"phone":1,"wallet_balance":1,"rewards_points":1,"created_at":1}
    ).to_list(500)
    for u in users:
        u["id"] = str(u.pop("_id"))
        if isinstance(u.get("created_at"), datetime):
            u["created_at"] = u["created_at"].isoformat()
    return users

@api_router.post("/admin/wallet/process-expired")
async def process_expired(request: Request):
    await admin_user(request)
    now = datetime.now(timezone.utc).isoformat()
    expired = await db.bookings.find({
        "status": "missed", "rebook_deadline": {"$lt": now},
        "wallet_transferred": {"$ne": True},
    }, {"_id": 0}).to_list(200)
    count = 0
    for b in expired:
        await db.users.update_one({"_id": ObjectId(b["user_id"])},
            {"$inc": {"wallet_balance": b.get("advance_amount", 0)}})
        await db.bookings.update_one({"booking_id": b["booking_id"]},
            {"$set": {"wallet_transferred": True, "status": "wallet_transferred"}})
        count += 1
    return {"transferred": count, "message": f"{count} advance payment(s) moved to wallets"}

# ── App setup ─────────────────────────────────────────────────────────────────
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.bookings.create_index("booking_id", unique=True)
    # Seed admin
    ae = os.environ.get("ADMIN_EMAIL", "admin@barbercraft.com")
    ap = os.environ.get("ADMIN_PASSWORD", "BarberAdmin2024")
    existing = await db.users.find_one({"email": ae})
    if not existing:
        await db.users.insert_one({
            "name": "Admin", "email": ae, "password_hash": hash_pw(ap),
            "role": "admin", "wallet_balance": 0.0, "rewards_points": 0,
            "created_at": datetime.now(timezone.utc),
        })
        logger.info(f"Admin seeded: {ae}")
    elif not check_pw(ap, existing["password_hash"]):
        await db.users.update_one({"email": ae},
            {"$set": {"password_hash": hash_pw(ap)}})

@app.on_event("shutdown")
async def shutdown():
    db_client.close()
