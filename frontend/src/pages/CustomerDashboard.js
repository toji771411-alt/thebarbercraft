import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Scissors, Wallet, Star, Clock, Gift, Plus, RefreshCw, ChevronRight, Check } from 'lucide-react';

const SERVICE_LABELS = { 
  haircut: 'Haircut', 
  beard: 'Beard Styling', 
  combo: 'Haircut + Beard Combo',
  manicure: 'Manicure',
  pedicure: 'Pedicure',
  curly_hair: 'Curly Hair Styling'
};
const SLOT_LABELS = { standard: 'Standard', emergency_morning: 'Morning Emergency', emergency_night: 'Night Emergency', right_now: 'Right Now' };

const formatTime = (t24) => {
  if (!t24 || t24 === 'right_now') return t24;
  const [h, m] = t24.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
};
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
  const [redemptions, setRedemptions] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('bookings');
  const [redeemLoading, setRedeemLoading] = useState('');
  const [payLoading, setPayLoading] = useState('');
  const [toast, setToast] = useState('');
  const [selectionRedemption, setSelectionRedemption] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [b, r, w, red] = await Promise.all([
        api.myBookings(), 
        api.getRewards(), 
        api.getWallet(),
        api.myRedemptions()
      ]);
      setBookings(b); setRewards(r); setWallet(w); setRedemptions(red);
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
    const rInfo = rewards?.redemptions?.find(r => r.id === rewardId);
    if (!window.confirm(`Redeem ${rInfo?.name} for ${rInfo?.points} points?`)) return;
    setRedeemLoading(rewardId);
    try { 
      const r = await api.redeem(rewardId); 
      showToast(r.message); 
      await fetchAll();
      // Find the latest redemption to start the assignment flow
      const red = await api.myRedemptions();
      if (red && red.length > 0) {
        setSelectionRedemption(red[0]); // The latest one
      }
    }
    catch (err) { showToast(err?.response?.data?.detail || 'Redemption failed'); }
    finally { setRedeemLoading(''); }
  };

  const handleApplyToBooking = async (bookingId) => {
    if (!selectionRedemption) return;
    setApplyLoading(true);
    try {
      await api.applyRedemption(selectionRedemption.id, bookingId);
      showToast('Reward applied successfully!');
      setSelectionRedemption(null);
      fetchAll();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to apply reward');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleUseWallet = async (bookingId, addonId) => {
    const addon = [
      { id: 'head_massage', name: 'Head Massage', price: 150 },
      { id: 'de_tan', name: 'De-Tan', price: 200 },
      { id: 'hair_spa', name: 'Hair Spa', price: 500 },
    ].find(a => a.id === addonId);
    
    if (!window.confirm(`Use wallet balance to add ${addon?.name} (₹${addon?.price}) to this booking?`)) return;
    
    try {
      await api.useWallet(bookingId, addonId);
      showToast('Add-on added successfully!');
      fetchAll();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to use wallet');
    }
  };

  const handleBuySubscription = async () => {
    if (!window.confirm('Activate Gold Membership for ₹999/month?')) return;
    try {
      await api.buySubscription();
      showToast('Membership activated!');
      fetchAll();
    } catch (_) { showToast('Failed to buy membership'); }
  };

  const handlePay = async (b) => {
    setPayLoading(b.booking_id);
    try {
      const order = await api.createOrder(b.booking_id);
      const svc = { haircut: 'Haircut', beard: 'Beard Styling', combo: 'Haircut + Beard Combo', manicure: 'Manicure', pedicure: 'Pedicure', curly_hair: 'Curly Hair Styling' }[b.service];
      
      if (!order.mock && order.key_id !== 'mock') {
        const options = {
          key: order.key_id, amount: order.amount * 100, currency: 'INR',
          name: 'The Barber Craft', description: `${svc} – 100% Prepaid`,
          order_id: order.order_id,
          handler: async (res) => {
            await api.verifyPayment({ booking_id: b.booking_id, payment_id: res.razorpay_payment_id, order_id: res.razorpay_order_id, signature: res.razorpay_signature });
            showToast('Payment successful!');
            fetchAll();
          },
          prefill: { name: user?.name, email: user?.email, contact: user?.phone },
          theme: { color: '#000000' },
        };
        new window.Razorpay(options).open();
      } else {
        await api.verifyPayment({ booking_id: b.booking_id });
        showToast('Payment successful (Mock)!');
        fetchAll();
      }
    } catch (err) {
      showToast('Payment failed');
    } finally { setPayLoading(''); }
  };

  const upcoming = bookings.filter(b => ['confirmed', 'pending_payment'].includes(b.status));
  const past = bookings.filter(b => ['completed','cancelled','missed','rebooked','wallet_transferred'].includes(b.status));
  const rebookable = bookings.filter(b => 
    b.status === 'missed' && 
    b.rebook_deadline && 
    new Date(b.rebook_deadline) > new Date() &&
    !upcoming.some(u => u.service === b.service && u.status === 'confirmed')
  );

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white pt-32 pb-16 px-4">
      {toast && (
        <div className="fixed top-28 right-4 z-50 px-4 py-3 bg-black text-white text-sm rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      {/* Assignment Modal */}
      {selectionRedemption && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8">
              <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Gift size={32} />
              </div>
              <h2 className="text-2xl font-serif text-center mb-2">Redeemed Successfully!</h2>
              <p className="text-black/50 text-center text-sm mb-8">
                How would you like to use your <strong className="text-black">{selectionRedemption.reward_name}</strong>?
              </p>

              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/book')}
                  className="w-full py-4 px-6 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Book a New Appointment
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold"><span className="bg-white px-4 text-black/20">Or add to existing</span></div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {upcoming.length > 0 ? (
                    upcoming.map(b => (
                      <button
                        key={b.booking_id}
                        disabled={applyLoading}
                        onClick={() => handleApplyToBooking(b.booking_id)}
                        className="w-full p-4 text-left border border-gray-100 rounded-xl hover:border-black hover:bg-gray-50 transition-all group"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-bold text-black">{SERVICE_LABELS[b.service]}</p>
                            <p className="text-[10px] text-black/40 mt-0.5">{b.date} @ {formatTime(b.time_slot)}</p>
                          </div>
                          <ChevronRight size={14} className="text-black/20 group-hover:text-black group-hover:translate-x-1 transition-all" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-center py-4 text-xs text-black/30 italic">No upcoming appointments found.</p>
                  )}
                </div>
              </div>

              <button 
                onClick={() => setSelectionRedemption(null)}
                className="w-full mt-8 py-3 text-[10px] uppercase tracking-widest font-bold text-black/30 hover:text-black transition-colors"
              >
                Decide Later
              </button>
            </div>
          </div>
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

        <div className="flex border-b border-gray-100 mb-8 overflow-x-auto no-scrollbar">
          {[['bookings', 'Appointments'], ['wallet', 'Wallet'], ['rewards', 'Rewards'], ['membership', 'Membership']].map(([id, label]) => (
            <button key={id} data-testid={`tab-${id}`} onClick={() => setTab(id)}
              className={`px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap border-b-2 ${tab === id ? 'text-black border-black' : 'text-black/30 border-transparent hover:text-black'}`}>
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
                          <p className="text-black/50 text-sm mt-0.5">{b.barber || 'Any Available'} · {SLOT_LABELS[b.slot_type]} — {b.date} {b.time_slot !== 'right_now' ? `@ ${formatTime(b.time_slot)}` : ''}</p>
                          <p className="text-xs text-black/40 mt-1">Total Paid: ₹{b.advance_amount}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-2.5 py-1 text-xs rounded-full border font-semibold ${STATUS_STYLES[b.status] || ''}`}>
                            {b.status.replace('_', ' ')}
                          </span>
                          {b.status === 'pending_payment' && (
                            <button data-testid={`pay-now-${b.booking_id}`} onClick={() => handlePay(b)}
                              disabled={payLoading === b.booking_id}
                              className="px-4 py-1.5 bg-black text-white text-[10px] font-bold rounded-lg hover:bg-gray-800 transition-all">
                              {payLoading === b.booking_id ? '...' : 'Pay Now'}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Wallet Add-ons section */}
                      {b.status === 'confirmed' && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-black/40 mb-3">Add Luxury Services (Wallet Only)</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: 'head_massage', name: 'Head Massage', price: 150 },
                              { id: 'de_tan', name: 'De-Tan', price: 200 },
                              { id: 'hair_spa', name: 'Hair Spa', price: 500 },
                            ].map(addon => {
                              const alreadyAdded = b.addon_services?.includes(addon.id);
                              const canAfford = (wallet?.wallet_balance || 0) >= addon.price;
                              return (
                                <button 
                                  key={addon.id}
                                  disabled={alreadyAdded || !canAfford}
                                  onClick={() => handleUseWallet(b.booking_id, addon.id)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                                    alreadyAdded ? 'bg-green-50 border-green-200 text-green-700 cursor-default' :
                                    canAfford ? 'bg-white border-black/10 text-black/60 hover:border-black hover:text-black active:scale-95' :
                                    'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                                  }`}
                                >
                                  {alreadyAdded ? <Check size={10} /> : <Plus size={10} />}
                                  {addon.name} (₹{addon.price})
                                </button>
                              );
                            })}
                          </div>
                          {(wallet?.wallet_balance || 0) < 150 && !b.addon_services?.length && (
                            <p className="text-[10px] text-black/30 mt-2 italic">Insufficient wallet balance for add-ons.</p>
                          )}
                        </div>
                      )}
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
                          <p className="text-black/40 text-xs mt-0.5">{b.barber || 'Any Available'} · {b.date} {b.time_slot !== 'right_now' ? `@ ${formatTime(b.time_slot)}` : ''}</p>
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
            <div className="p-6 bg-black rounded-xl mb-6 text-center relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-white/10 blur-[60px] rounded-full" />
              
              <Star size={32} className="text-white mx-auto mb-3 relative z-10" />
              <p className="text-xs uppercase tracking-[0.2em] text-white/50 font-semibold mb-1 relative z-10">Your Balance</p>
              <p data-testid="points-balance" className="font-serif text-5xl text-white relative z-10">{user?.rewards_points || 0}</p>
              <p className="text-white/40 text-sm mt-1 relative z-10">Reward Points</p>
              
              {/* Progress Bar */}
              <div className="mt-8 max-w-sm mx-auto relative z-10">
                {(() => {
                  const pts = user?.rewards_points || 0;
                  const targets = [100, 150, 175, 300, 400];
                  const nextTarget = targets.find(t => t > pts) || 400;
                  const prevTarget = [...targets].reverse().find(t => t <= pts) || 0;
                  const progress = Math.min(100, ((pts - prevTarget) / (nextTarget - prevTarget)) * 100);
                  const remaining = nextTarget - pts;

                  return (
                    <>
                      <div className="flex justify-between items-end mb-2">
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                          {remaining > 0 ? `${remaining} pts to next reward` : 'Max Level Reached!'}
                        </p>
                        <p className="text-[10px] text-white font-bold">{pts} / {nextTarget}</p>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white transition-all duration-1000 ease-out" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {remaining > 0 && (
                        <p className="mt-3 text-[11px] text-white/60 italic">
                          "Spend ₹{(remaining * 10)} more to unlock your next gift! 🎁"
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
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
            <div className="mt-8">
              <h3 className="text-xs uppercase tracking-[0.2em] text-black/40 mb-4 font-semibold">Redemption History</h3>
              {redemptions.length === 0 ? (
                <p className="text-center py-8 text-black/30 text-sm border border-dashed border-gray-200 rounded-xl">No redemptions yet</p>
              ) : (
                <div className="space-y-3">
                  {redemptions.map(r => (
                    <div key={r.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-black text-sm">{r.reward_name}</p>
                        <p className="text-black/40 text-[10px] uppercase tracking-wider mt-0.5">
                          Redeemed on {new Date(r.created_at).toLocaleDateString()}
                        </p>
                        {r.status === 'applied' && r.booking_id && (
                          <p className="text-[10px] text-[#C5A059] font-bold mt-1">
                            Applied to Booking: {r.booking_id.split('-')[0]}...
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-black">-{r.points_used} pts</p>
                        <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase rounded mt-1 ${
                          r.status === 'applied' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {r.status === 'applied' ? 'Applied' : 'Available'}
                        </span>
                        {r.status === 'available' && (
                          <button 
                            onClick={() => setSelectionRedemption(r)}
                            className="block w-full mt-2 text-[9px] font-bold text-black underline underline-offset-2 hover:text-gray-600"
                          >
                            Assign now
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-8 p-4 bg-gray-50 border border-gray-100 rounded-xl">
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

        {/* Membership Tab */}
        {tab === 'membership' && (
          <div data-testid="membership-tab" className="space-y-6">
            {user?.is_subscriber ? (
              <div className="p-8 bg-black rounded-2xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><Star size={100} /></div>
                <h3 className="font-serif text-3xl mb-2">Gold Member</h3>
                <p className="text-white/50 text-xs uppercase tracking-widest mb-8">Expires: {user.subscription_expiry ? new Date(user.subscription_expiry).toLocaleDateString() : 'N/A'}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Haircuts Left</p>
                    <p className="text-3xl font-serif">{user.haircuts_left || 0}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Beard Trims Left</p>
                    <p className="text-3xl font-serif">{user.beard_trims_left || 0}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 border-2 border-black rounded-2xl text-center space-y-6">
                <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <Star size={32} />
                </div>
                <div>
                  <h3 className="font-serif text-3xl text-black mb-2">Join the Elite</h3>
                  <p className="text-black/50 text-sm max-w-sm mx-auto">Subscribe for ₹999/month and get 2 Haircuts + 1 Beard Styling included. Save up to ₹200 every month!</p>
                </div>
                <button onClick={handleBuySubscription}
                  className="w-full py-4 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
                  Activate Membership ₹999
                </button>
              </div>
            )}
            <div className="p-6 bg-gray-50 rounded-xl space-y-4">
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-black/40">Member Benefits</h4>
              {[
                "Priority booking for 'Right Now' slots",
                "10% discount on all add-on services",
                "Exclusive access to special grooming products",
                "Roll-over points that never expire"
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-3 text-xs text-black/70">
                  <Check size={14} className="text-black" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
