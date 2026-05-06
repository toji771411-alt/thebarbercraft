import axios from 'axios';
const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
let authToken = localStorage.getItem('barber_token');

export const setAuthToken = (token) => {
  authToken = token;
};

const headers = () => {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
};

const api = {
  // Auth
  me: () => axios.get(`${BASE}/auth/me`, { headers: headers() }).then(r => r.data),

  // Slots
  getSlots: (date, slotType) =>
    axios.get(`${BASE}/slots/available`, { params: { booking_date: date, slot_type: slotType }, headers: headers() }).then(r => r.data),

  // Bookings
  createBooking: (data) =>
    axios.post(`${BASE}/bookings`, data, { headers: headers() }).then(r => r.data),
  myBookings: () =>
    axios.get(`${BASE}/bookings`, { headers: headers() }).then(r => r.data),
  cancelBooking: (id) =>
    axios.post(`${BASE}/bookings/${id}/cancel`, {}, { headers: headers() }).then(r => r.data),
  rebook: (id, data) =>
    axios.post(`${BASE}/bookings/${id}/rebook`, data, { headers: headers() }).then(r => r.data),

  // Payments
  createOrder: (bookingId) =>
    axios.post(`${BASE}/payments/create-order`, { booking_id: bookingId }, { headers: headers() }).then(r => r.data),
  verifyPayment: (data) =>
    axios.post(`${BASE}/payments/verify`, data, { headers: headers() }).then(r => r.data),

  // Wallet
  getWallet: () =>
    axios.get(`${BASE}/wallet`, { headers: headers() }).then(r => r.data),
  useWallet: (bookingId, addonId) =>
    axios.post(`${BASE}/wallet/use`, { booking_id: bookingId, addon_service: addonId }, { headers: headers() }).then(r => r.data),

  // Rewards
  getRewards: () =>
    axios.get(`${BASE}/rewards`, { headers: headers() }).then(r => r.data),
  redeem: (rewardId) =>
    axios.post(`${BASE}/rewards/redeem`, { reward_id: rewardId }, { headers: headers() }).then(r => r.data),
  myRedemptions: () =>
    axios.get(`${BASE}/rewards/my-redemptions`, { headers: headers() }).then(r => r.data),
  applyRedemption: (redemptionId, bookingId) =>
    axios.post(`${BASE}/rewards/apply`, { redemption_id: redemptionId, booking_id: bookingId }, { headers: headers() }).then(r => r.data),
  buySubscription: () =>
    axios.post(`${BASE}/subscription/buy`, {}, { headers: headers() }).then(r => r.data),

  // Admin
  adminStats: () =>
    axios.get(`${BASE}/admin/stats`, { headers: headers() }).then(r => r.data),
  adminBookings: (status, userId) =>
    axios.get(`${BASE}/admin/bookings`, { params: { ...(status && { status }), ...(userId && { user_id: userId }) }, headers: headers() }).then(r => r.data),
  adminUpdateBooking: (id, status) =>
    axios.patch(`${BASE}/admin/bookings/${id}`, { status }, { headers: headers() }).then(r => r.data),
  adminDeleteBooking: (id) =>
    axios.delete(`${BASE}/admin/bookings/${id}`, { headers: headers() }).then(r => r.data),
  adminUsers: () =>
    axios.get(`${BASE}/admin/users`, { headers: headers() }).then(r => r.data),
  adminUpdateWallet: (userId, balance) =>
    axios.patch(`${BASE}/admin/users/${userId}/wallet`, { balance }, { headers: headers() }).then(r => r.data),
  adminUpdateRewards: (userId, points) =>
    axios.patch(`${BASE}/admin/users/${userId}/rewards`, { points }, { headers: headers() }).then(r => r.data),
  adminUpdateMembership: (userId, data) =>
    axios.patch(`${BASE}/admin/users/${userId}/membership`, data, { headers: headers() }).then(r => r.data),
  adminDeleteUser: (userId) =>
    axios.delete(`${BASE}/admin/users/${userId}`, { headers: headers() }).then(r => r.data),
  processExpiredWallets: () =>
    axios.post(`${BASE}/admin/wallet/process-expired`, {}, { headers: headers() }).then(r => r.data),
  
  // New Admin Features
  getBlockedDays: () =>
    axios.get(`${BASE}/admin/blocked-days`, { headers: headers() }).then(r => r.data),
  blockDay: (date, reason) =>
    axios.post(`${BASE}/admin/blocked-days`, { date, reason }, { headers: headers() }).then(r => r.data),
  unblockDay: (date) =>
    axios.delete(`${BASE}/admin/blocked-days/${date}`, { headers: headers() }).then(r => r.data),
  addPoints: (userId, amount, points) =>
    axios.post(`${BASE}/admin/users/${userId}/rewards/add`, { amount, points }, { headers: headers() }).then(r => r.data),
};

export default api;
