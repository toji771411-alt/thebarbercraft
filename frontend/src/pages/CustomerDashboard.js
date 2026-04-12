import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Scissors, Wallet, Star, Clock, Gift, Plus, RefreshCw, ChevronRight } from 'lucide-react';

const SERVICE_LABELS = { haircut: 'Haircut', beard: 'Beard Trim', combo: 'Executive Combo' };
const SLOT_LABELS = { standard: 'Standard', emergency_morning: 'Morning Emergency', emergency_night: 'Night Emergency', right_now: 'Right Now' };
const STATUS_STYLES = {
  pending_payment: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-black/5 text-black border-black/20',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  missed: 'bg-orange-50 text-orange-600 border-orange-200',
  rebooked: 'bg-blue-50 text-blue-600 border-blue-200',
  wallet_transferred: 'bg-purple-50 text-purple-600 border-purple-200',
};

export default function CustomerDashboard() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [rewards, setRewards] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('bookings');
  const [redeemLoading, setRedeemLoading] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [b, r, w] = await Promise.all([api.myBookings(), api.getRewards(), api.getWallet()]);
      setBookings(b); setRewards(r); setWallet(w);
      await refreshUser();
    } catch (_) {}
    setLoading(false);
  }, [refreshUser]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    try { await api.cancelBooking(id); showToast('Booking cancelled'); fetchAll(); }
    catch (err) { showToast(err?.response?.data?.detail || 'Failed to cancel'); }
  };

  const handleRedeem = async (rewardId) => {
    setRedeemLoading(rewardId);
    try { const r = await api.redeem(rewardId); showToast(r.message); fetchAll(); }
    catch (err) { showToast(err?.response?.data?.detail || 'Redemption failed'); }
    finally { setRedeemLoading(''); }
  };

  const upcoming = bookings.filter(b => ['confirmed', 'pending_payment'].includes(b.status));
  const past = bookings.filter(b => ['completed','cancelled','missed','rebooked','wallet_transferred'].includes(b.status));
  const rebookable = bookings.filter(b => b.status === 'missed' && b.rebook_deadline && new Date(b.rebook_deadline) > new Date());

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white pt-20 pb-16 px-4">
      {toast && (
        <div className="fixed top-20 right-4 z-50 px-4 py-3 bg-black text-white text-sm rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div data-testid="dashboard-header" className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-black/40 font-semibold mb-1">Welcome back</p>
            <h1 className="font-serif text-3xl sm:text-4xl text-black">{user?.name}</h1>
          </div>
          <button data-testid="new-booking-btn" onClick={() => navigate('/book')}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-semibold rounded hover:bg-gray-800 transition-all active:scale-95">
            <Plus size={14} /> Book Now
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div data-testid="wallet-balance-card" className="p-5 bg-white border border-gray-200 rounded-xl hover:border-black transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={16} className="text-black" />
              <p className="text-xs uppercase tracking-[0.2em] text-black/40 font-semibold">Wallet</p>
            </div>
            <p className="font-serif text-2xl text-black">₹{(wallet?.wallet_balance || 0).toFixed(0)}</p>
            <p className="text-xs text-black/30 mt-1">Add-ons only</p>
          </div>
          <div data-testid="rewards-points-card" className="p-5 bg-white border border-gray-200 rounded-xl hover:border-black transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} className="text-black" />
              <p className="text-xs uppercase tracking-[0.2em] text-black/40 font-semibold">Points</p>
            </div>
            <p className="font-serif text-2xl text-black">{user?.rewards_points || 0}</p>
            <p className="text-xs text-black/30 mt-1">Reward points</p>
          </div>
          <div data-testid="bookings-count-card" className="p-5 bg-white border border-gray-200 rounded-xl hover:border-black transition-all col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <Scissors size={16} className="text-black" />
              <p className="text-xs uppercase tracking-[0.2em] text-black/40 font-semibold">Visits</p>
            </div>
            <p className="font-serif text-2xl text-black">{bookings.filter(b => b.status === 'completed').length}</p>
            <p className="text-xs text-black/30 mt-1">Completed services</p>
          </div>
        </div>

        {/* Rebook Alert */}
        {rebookable.length > 0 && (
          <div data-testid="rebook-alert" className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <p className="text-orange-700 text-sm font-semibold mb-1">You have a missed appointment</p>
            <p className="text-orange-600/70 text-xs mb-3">Rebook within your 3-day window using the same advance payment.</p>
            <button onClick={() => navigate('/book')} className="text-xs text-orange-700 hover:underline flex items-center gap-1 font-semibold">
              <RefreshCw size={12} /> Rebook Now <ChevronRight size={12} />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {[['bookings', 'My Bookings'], ['rewards', 'Rewards'], ['wallet', 'Wallet']].map(([id, label]) => (
            <button key={id} data-testid={`tab-${id}`} onClick={() => setTab(id)}
              className={`px-4 py-3 text-sm font-semibold transition-colors ${tab === id ? 'text-black border-b-2 border-black' : 'text-black/40 hover:text-black/70'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Bookings Tab */}
        {tab === 'bookings' && (
          <div data-testid="bookings-tab">
            {upcoming.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs uppercase tracking-[0.2em] text-black/40 mb-4 font-semibold">Upcoming</h3>
                <div className="space-y-3">
                  {upcoming.map(b => (
                    <div key={b.booking_id} data-testid={`booking-${b.booking_id}`} className="p-4 sm:p-5 bg-white border border-gray-200 rounded-xl hover:border-black transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-black text-base">{SERVICE_LABELS[b.service]}</p>
                          <p className="text-black/50 text-sm mt-0.5">{SLOT_LABELS[b.slot_type]} — {b.date} {b.time_slot !== 'right_now' ? `@ ${b.time_slot}` : ''}</p>
                          <p className="text-xs text-black/40 mt-1">Advance: ₹{b.advance_amount} | Balance: ₹{b.balance_amount}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-2.5 py-1 text-xs rounded-full border font-semibold ${STATUS_STYLES[b.status] || ''}`}>
                            {b.status.replace('_', ' ')}
                          </span>
                          {['pending_payment','confirmed'].includes(b.status) && (
                            <button data-testid={`cancel-booking-${b.booking_id}`} onClick={() => handleCancel(b.booking_id)}
                              className="text-xs text-red-500 hover:underline">Cancel</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] text-black/40 mb-4 font-semibold">History</h3>
              {past.length === 0 && upcoming.length === 0 ? (
                <div data-testid="no-bookings" className="text-center py-16 text-black/30">
                  <Scissors size={40} className="mx-auto mb-4 opacity-20" />
                  <p className="text-base">No bookings yet</p>
                  <button onClick={() => navigate('/book')} className="mt-4 text-black text-sm hover:underline font-semibold">Book your first appointment</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {past.map(b => (
                    <div key={b.booking_id} data-testid={`history-${b.booking_id}`} className="p-4 sm:p-5 bg-gray-50 border border-gray-100 rounded-xl">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-black/70 text-sm">{SERVICE_LABELS[b.service]}</p>
                          <p className="text-black/40 text-xs mt-0.5">{b.date} {b.time_slot !== 'right_now' ? `@ ${b.time_slot}` : ''}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-xs rounded-full border font-semibold ${STATUS_STYLES[b.status] || ''}`}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rewards Tab */}
        {tab === 'rewards' && (
          <div data-testid="rewards-tab">
            <div className="p-6 bg-black rounded-xl mb-6 text-center">
              <Star size={32} className="text-white mx-auto mb-3" />
              <p className="text-xs uppercase tracking-[0.2em] text-white/50 font-semibold mb-1">Your Balance</p>
              <p data-testid="points-balance" className="font-serif text-5xl text-white">{user?.rewards_points || 0}</p>
              <p className="text-white/40 text-sm mt-1">Reward Points</p>
            </div>
            <h3 className="text-xs uppercase tracking-[0.2em] text-black/40 mb-4 font-semibold">Redeem Rewards</h3>
            <div className="space-y-3">
              {rewards?.redemptions?.map(r => (
                <div key={r.id} data-testid={`redeem-${r.id}`} className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:border-black transition-all">
                  <div>
                    <p className="font-semibold text-black text-sm">{r.name}</p>
                    <p className="text-black/40 text-xs mt-0.5">Requires {r.points} points</p>
                  </div>
                  <button data-testid={`redeem-btn-${r.id}`} onClick={() => handleRedeem(r.id)}
                    disabled={redeemLoading === r.id || (user?.rewards_points || 0) < r.points}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${(user?.rewards_points || 0) >= r.points ? 'bg-black text-white hover:bg-gray-800 active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                    {redeemLoading === r.id ? 'Redeeming...' : `Redeem • ${r.points} pts`}
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-gray-50 border border-gray-100 rounded-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-black/30 mb-3 font-semibold">Earn Points</p>
              <div className="space-y-2">
                {rewards?.earn_rules?.map((r, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-black/50">{r.service}</span>
                    <span className="text-black font-bold">+{r.points} pt</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Wallet Tab */}
        {tab === 'wallet' && (
          <div data-testid="wallet-tab">
            <div className="p-6 bg-black rounded-xl mb-6 text-center">
              <Wallet size={32} className="text-white mx-auto mb-3" />
              <p className="text-xs uppercase tracking-[0.2em] text-white/50 font-semibold mb-1">Wallet Balance</p>
              <p data-testid="wallet-balance" className="font-serif text-5xl text-white">₹{(wallet?.wallet_balance || 0).toFixed(0)}</p>
            </div>
            <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Gift size={18} className="text-black mt-0.5 shrink-0" />
                <div>
                  <p className="text-black text-sm font-semibold mb-1">Wallet Usage Policy</p>
                  <p className="text-black/50 text-sm leading-relaxed">
                    Your wallet balance can <strong className="text-black">only</strong> be used for <strong className="text-black">Add-on Services</strong> such as Head Massage (₹150) and Facial Scrub (₹200).
                  </p>
                  <p className="text-black/30 text-xs mt-2">Wallet is funded when your missed appointment advance is transferred after the 3-day recovery window expires.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
