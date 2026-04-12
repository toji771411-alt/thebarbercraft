"""Backend API tests for THE BARBER CRAFT application"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@barbercraft.com"
ADMIN_PASSWORD = "BarberAdmin2024"
CUSTOMER_EMAIL = "test_customer_api@barbercraft.com"
CUSTOMER_PASSWORD = "Test123!"


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    resp = api_client.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="module")
def customer_token(api_client):
    # Try login first
    resp = api_client.post(f"{BASE_URL}/api/auth/login", json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD})
    if resp.status_code == 200:
        return resp.json()["token"]
    # Register new customer
    resp = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "name": "Test Customer",
        "email": CUSTOMER_EMAIL,
        "phone": "9999999999",
        "password": CUSTOMER_PASSWORD,
    })
    assert resp.status_code == 200, f"Registration failed: {resp.text}"
    return resp.json()["token"]


# ── Auth Tests ────────────────────────────────────────────────────────────────

class TestAuth:
    """Authentication endpoint tests"""

    def test_admin_login(self, api_client):
        resp = api_client.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"

    def test_customer_register_duplicate(self, api_client, customer_token):
        resp = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Dup", "email": CUSTOMER_EMAIL, "phone": "0000000000", "password": "pass"
        })
        assert resp.status_code == 400

    def test_login_wrong_password(self, api_client):
        resp = api_client.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert resp.status_code == 401

    def test_me_endpoint(self, api_client, customer_token):
        resp = api_client.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {customer_token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == CUSTOMER_EMAIL


# ── Slots Tests ───────────────────────────────────────────────────────────────

class TestSlots:
    """Slots availability tests"""

    def test_available_slots_standard(self, api_client):
        # Get next Tuesday
        today = datetime.now()
        days_ahead = (1 - today.weekday()) % 7 or 7  # next Tuesday
        date = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        resp = api_client.get(f"{BASE_URL}/api/slots/available?booking_date={date}&slot_type=standard")
        assert resp.status_code == 200
        data = resp.json()
        assert "available_slots" in data
        assert isinstance(data["available_slots"], list)

    def test_available_slots_monday(self, api_client):
        # Find next Monday
        today = datetime.now()
        days_ahead = (0 - today.weekday()) % 7 or 7
        date = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        resp = api_client.get(f"{BASE_URL}/api/slots/available?booking_date={date}&slot_type=standard")
        assert resp.status_code == 200
        data = resp.json()
        # Monday slots start at 14:00
        if data["available_slots"]:
            assert data["available_slots"][0] >= "14:00"

    def test_available_slots_invalid_date(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/slots/available?booking_date=invalid&slot_type=standard")
        assert resp.status_code == 400


# ── Booking Tests ─────────────────────────────────────────────────────────────

class TestBookings:
    """Booking CRUD tests"""

    def test_create_booking(self, api_client, customer_token):
        future_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        resp = api_client.post(f"{BASE_URL}/api/bookings", json={
            "service": "haircut",
            "slot_type": "standard",
            "date": future_date,
            "time_slot": "10:00",
            "addon_services": []
        }, headers={"Authorization": f"Bearer {customer_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "booking_id" in data
        assert data["status"] == "pending_payment"
        assert data["service"] == "haircut"
        # Store for payment tests
        TestBookings.booking_id = data["booking_id"]

    def test_create_booking_invalid_service(self, api_client, customer_token):
        future_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        resp = api_client.post(f"{BASE_URL}/api/bookings", json={
            "service": "invalid_service",
            "slot_type": "standard",
            "date": future_date,
            "time_slot": "11:00",
        }, headers={"Authorization": f"Bearer {customer_token}"})
        assert resp.status_code == 400

    def test_get_my_bookings(self, api_client, customer_token):
        resp = api_client.get(f"{BASE_URL}/api/bookings", headers={"Authorization": f"Bearer {customer_token}"})
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_booking_unauthenticated(self, api_client):
        resp = api_client.post(f"{BASE_URL}/api/bookings", json={
            "service": "haircut", "slot_type": "standard", "date": "2025-12-01", "time_slot": "10:00"
        })
        assert resp.status_code == 401


# ── Payment Tests ─────────────────────────────────────────────────────────────

class TestPayments:
    """Mock payment flow tests"""

    def test_create_order_mock(self, api_client, customer_token):
        # Ensure we have a booking
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        booking_resp = api_client.post(f"{BASE_URL}/api/bookings", json={
            "service": "combo",
            "slot_type": "standard",
            "date": future_date,
            "time_slot": "15:00",
        }, headers={"Authorization": f"Bearer {customer_token}"})
        assert booking_resp.status_code == 200
        bid = booking_resp.json()["booking_id"]

        resp = api_client.post(f"{BASE_URL}/api/payments/create-order", json={"booking_id": bid},
                               headers={"Authorization": f"Bearer {customer_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["mock"] == True
        assert "order_id" in data

        # Verify payment
        verify_resp = api_client.post(f"{BASE_URL}/api/payments/verify", json={"booking_id": bid},
                                      headers={"Authorization": f"Bearer {customer_token}"})
        assert verify_resp.status_code == 200
        assert verify_resp.json()["booking_id"] == bid


# ── Rewards Tests ─────────────────────────────────────────────────────────────

class TestRewards:
    """Rewards endpoint tests"""

    def test_get_rewards(self, api_client, customer_token):
        resp = api_client.get(f"{BASE_URL}/api/rewards", headers={"Authorization": f"Bearer {customer_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "points" in data
        assert "redemptions" in data


# ── Admin Tests ───────────────────────────────────────────────────────────────

class TestAdmin:
    """Admin endpoint tests"""

    def test_admin_stats(self, api_client, admin_token):
        resp = api_client.get(f"{BASE_URL}/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "total_bookings" in data
        assert "revenue" in data

    def test_admin_bookings(self, api_client, admin_token):
        resp = api_client.get(f"{BASE_URL}/api/admin/bookings", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_admin_users(self, api_client, admin_token):
        resp = api_client.get(f"{BASE_URL}/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_admin_update_booking_status(self, api_client, admin_token, customer_token):
        # Create and confirm a booking first
        future_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
        b = api_client.post(f"{BASE_URL}/api/bookings", json={
            "service": "beard", "slot_type": "standard", "date": future_date, "time_slot": "16:00"
        }, headers={"Authorization": f"Bearer {customer_token}"}).json()
        bid = b["booking_id"]
        # confirm via payment
        api_client.post(f"{BASE_URL}/api/payments/verify", json={"booking_id": bid},
                        headers={"Authorization": f"Bearer {customer_token}"})
        # Admin marks as completed
        resp = api_client.patch(f"{BASE_URL}/api/admin/bookings/{bid}",
                                json={"status": "completed"},
                                headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200

    def test_admin_process_expired_wallets(self, api_client, admin_token):
        resp = api_client.post(f"{BASE_URL}/api/admin/wallet/process-expired",
                               headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "transferred" in data

    def test_non_admin_cannot_access_admin(self, api_client, customer_token):
        resp = api_client.get(f"{BASE_URL}/api/admin/stats", headers={"Authorization": f"Bearer {customer_token}"})
        assert resp.status_code == 403
