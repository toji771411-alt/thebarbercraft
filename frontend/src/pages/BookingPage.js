import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ChevronLeft, ChevronRight, Check, Clock, CreditCard, AlertCircle, Star, Plus } from 'lucide-react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';

const SERVICES = [
  { id: 'haircut', name: 'Haircut', price: 300, points: 10, desc: 'Precision fade & styling' },
  { id: 'beard', name: 'Beard Styling', price: 200, points: 10, desc: 'Hot towel beard shave' },
  { id: 'combo', name: 'Haircut + Beard Combo', price: 400, points: 25, desc: 'Hair + Beard together' },
  { id: 'manicure', name: 'Manicure', price: 250, points: 25, desc: 'Professional hand care' },
  { id: 'pedicure', name: 'Pedicure', price: 300, points: 30, desc: 'Soothing foot treatment' },
  { id: 'curly_hair', name: 'Curly Hair Styling', price: 450, points: 45, desc: 'Expert care for natural curls' },
];
const ADDONS = [
  { id: 'head_massage', name: 'Relaxing Head Massage', price: 150, desc: '15 mins of pure bliss' },
  { id: 'de_tan', name: 'De-Tan Treatment', price: 200, desc: 'Restore your natural glow' },
  { id: 'hair_spa', name: 'Nourishing Hair Spa', price: 500, desc: 'Premium deep conditioning' },
  { id: 'facial', name: 'Rejuvenating Facial', price: 600, desc: 'Professional skin revival' },
];
const SLOT_TYPES = [
  { id: 'standard', name: 'Standard', mult: 1, desc: 'Regular working hours', badge: 'Normal Price', badgeClass: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'emergency_morning', name: 'Morning Emergency', mult: 3, desc: '8:00 AM – 9:00 AM before hours', badge: '3× Price', badgeClass: 'bg-gray-100 text-black border-gray-300' },
  { id: 'emergency_night', name: 'Night Emergency', mult: 3, desc: '10:30 PM – 11:30 PM after hours', badge: '3× Price', badgeClass: 'bg-gray-100 text-black border-gray-300' },
  { id: 'right_now', name: 'Right Now', mult: 3, desc: 'Immediate – call us first', badge: '3× Price', badgeClass: 'bg-black text-white border-black' },
];
const BARBERS = [
  { id: 'lucky', name: 'Lucky', role: 'Main Owner', desc: 'Master Barber with 15+ years experience', image: 'https://images.unsplash.com/photo-1599305445671-ac291c95aba9?auto=format&fit=crop&q=80&w=200' },
  { id: 'any', name: 'Any Available Barber', role: 'Available Team', desc: 'Fastest service with our expert team', image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=200' },
];
const STEPS = ['Barber', 'Service', 'Add-ons', 'Slot Type', 'Date & Time', 'Review & Pay'];

const formatTime = (t24) => {
  if (!t24 || t24 === 'right_now') return t24;
  const [h, m] = t24.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
};

export default function BookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [service, setService] = useState(null);
  const [slotType, setSlotType] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [allSlots, setAllSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [barber, setBarber] = useState('any');
  const [error, setError] = useState('');
  const [rewardsInfo, setRewardsInfo] = useState(null);
  const [myRedemptions, setMyRedemptions] = useState([]);
  const [appliedRewards, setAppliedRewards] = useState([]); // List of addon IDs
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletAddons, setWalletAddons] = useState([]);

  const today = startOfDay(new Date());
  const calendarDays = Array.from({ length: 2 }, (_, i) => addDays(today, i));

  useEffect(() => {
    if (step === 2 && !rewardsInfo) {
      Promise.all([api.getRewards(), api.myRedemptions()])
        .then(([r, m]) => {
          setRewardsInfo(r);
          setMyRedemptions(m.filter(x => x.status === 'available'));
        })
        .catch(console.error);
    }
    if (step === 5 && user) {
      api.getWallet().then(w => setWalletBalance(w.wallet_balance)).catch(() => {});
      api.getRewards().then(setRewardsInfo).catch(() => {});
      api.myRedemptions().then(r => setMyRedemptions(r.filter(x => x.status === 'available'))).catch(() => {});
    }
  }, [step, user, rewardsInfo]);

  useEffect(() => {
    if (!selectedDate || !slotType || slotType === 'right_now') return;
    setSlotsLoading(true); setTimeSlot('');
    api.getSlots(selectedDate, slotType)
      .then(d => setAllSlots(d.slots || []))
      .catch(() => setAllSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, slotType]);

  const svc = SERVICES.find(s => s.id === service);
  const selectedAddonsData = ADDONS.filter(a => selectedAddons.includes(a.id));
  
  const rewardsDeduction = selectedAddonsData
    .filter(a => appliedRewards.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);
    
  const walletDeduction = selectedAddonsData
    .filter(a => walletAddons.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);

  const addonsTotal = selectedAddonsData.reduce((sum, a) => sum + a.price, 0);
  const slt = SLOT_TYPES.find(s => s.id === slotType);
  
  const totalPrice = (svc ? svc.price : 0) * (slt ? slt.mult : 1) + addonsTotal;
  const advance = totalPrice - rewardsDeduction - walletDeduction; 
  const balance = 0;

  const canNext = () => {
    if (step === 0) return !!barber;
    if (step === 1) return !!service;
    if (step === 2) return true; // Add-ons are optional
    if (step === 3) return !!slotType;
    if (step === 4) return slotType === 'right_now' ? !!selectedDate : (!!selectedDate && !!timeSlot);
    return true;
  };

  const handleNext = () => { if (canNext()) { setError(''); setStep(s => s + 1); } };
  const handleBack = () => { setError(''); setStep(s => s - 1); };

  const handlePay = async () => {
    setPayLoading(true); setError('');
    try {
      const b = await api.createBooking({
        service, slot_type: slotType, date: selectedDate,
        time_slot: slotType === 'right_now' ? 'right_now' : timeSlot,
        addon_services: selectedAddons,
        applied_rewards: appliedRewards,
        wallet_addons: walletAddons,
        barber: barber === 'lucky' ? 'Lucky' : 'Any Available',
      });
      setBooking(b);
      if (slotType === 'right_now') {
        setConfirmed(true);
        setPayLoading(false);
        return;
      }

      const order = await api.createOrder(b.booking_id);
      if (!order.mock && order.key_id !== 'mock') {
        const options = {
          key: order.key_id, amount: order.amount * 100, currency: 'INR',
          name: 'The Barber Craft', description: `${svc?.name} – 100% Prepaid`,
          order_id: order.order_id,
          handler: async (res) => {
            await api.verifyPayment({ booking_id: b.booking_id, payment_id: res.razorpay_payment_id, order_id: res.razorpay_order_id, signature: res.razorpay_signature });
            setConfirmed(true);
          },
          prefill: { name: user?.name, email: user?.email, contact: user?.phone },
          theme: { color: '#000000' },
        };
        new window.Razorpay(options).open();
      } else {
        await api.verifyPayment({ booking_id: b.booking_id });
        setConfirmed(true);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Booking failed. Please try again.');
    } finally { setPayLoading(false); }
  };

  if (confirmed && booking) {
    return (
      <div data-testid="booking-confirmed" className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center mx-auto mb-6">
            <Check size={36} className="text-white" />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-black/40 font-semibold mb-2">
            {slotType === 'right_now' ? 'Request Sent!' : 'Confirmed!'}
          </p>
          <h1 className="font-serif text-4xl text-black mb-4">
            {slotType === 'right_now' ? 'Pending Approval' : 'Booking Secured'}
          </h1>
          <p className="text-black/50 mb-8">
            {slotType === 'right_now' 
              ? 'Admin is checking availability. We will notify you once approved to complete payment.'
              : 'Your appointment is confirmed. See you soon!'}
          </p>
          <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-left space-y-3 mb-8">
            <div className="flex justify-between"><span className="text-black/50 text-sm">Service</span><span className="text-black text-sm font-semibold">{svc?.name}</span></div>
            <div className="flex justify-between"><span className="text-black/50 text-sm">Date</span><span className="text-black text-sm">{selectedDate}</span></div>
            <div className="flex justify-between"><span className="text-black/50 text-sm">Time</span><span className="text-black text-sm">{timeSlot === 'right_now' ? 'Right Now' : formatTime(timeSlot)}</span></div>
            <div className="border-t border-gray-200 pt-3 flex justify-between"><span className="text-black/50 text-sm">{slotType === 'right_now' ? 'Estimated Total' : 'Amount Paid'}</span><span className="text-black text-sm font-bold">₹{advance}</span></div>
            <div className="flex justify-between"><span className="text-black/50 text-sm">Status</span><span className="text-black text-sm">{slotType === 'right_now' ? 'Pending Approval' : 'Paid'}</span></div>
            <div className="flex justify-between"><span className="text-black/50 text-sm">Booking ID</span><span className="text-black/40 text-xs font-mono">{booking.booking_id?.slice(0, 12)}...</span></div>
          </div>
          <button data-testid="go-to-dashboard-btn" onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-black text-white font-semibold text-sm rounded hover:bg-gray-800 transition-all active:scale-95 tracking-wide">
            Go to My Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-black/40 font-semibold mb-2">Step {step + 1} of {STEPS.length}</p>
          <h1 className="font-serif text-3xl sm:text-4xl text-black">{STEPS[step]}</h1>
        </div>

        {/* Progress */}
        <div data-testid="booking-progress" className="flex items-center justify-between mb-10">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                i < step ? 'bg-black border-black text-white' :
                i === step ? 'border-black text-black bg-white' :
                'border-gray-200 text-gray-300 bg-white'}`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-1 transition-all ${i < step ? 'bg-black' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div data-testid="booking-error" className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-3">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Step 0: Barber */}
        {step === 0 && (
          <div data-testid="step-barber" className="space-y-4">
            {BARBERS.map(b => (
              <button key={b.id} data-testid={`barber-${b.id}`} onClick={() => setBarber(b.id)}
                className={`w-full p-5 rounded-xl border-2 text-left transition-all ${barber === b.id ? 'border-black bg-black/5' : 'border-gray-200 bg-white hover:border-gray-400'}`}>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={b.image} alt={b.name} 
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      className="w-14 h-14 rounded-full object-cover border-2 border-black/5 shadow-sm" 
                    />
                    <div className="hidden w-14 h-14 rounded-full bg-black text-white items-center justify-center font-bold text-lg">
                      {b.name[0]}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-black text-lg tracking-tight">{b.name}</p>
                    <p className="text-black/40 text-xs uppercase tracking-widest font-bold mb-1">{b.role}</p>
                    <p className="text-black/50 text-sm leading-tight">{b.desc}</p>
                  </div>
                  {barber === b.id && (
                    <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Service */}
        {step === 1 && (
          <div data-testid="step-service" className="space-y-3">
            {SERVICES.map(s => (
              <button key={s.id} data-testid={`service-${s.id}`} onClick={() => setService(s.id)}
                className={`w-full p-5 rounded-xl border-2 text-left transition-all ${service === s.id ? 'border-black bg-black/5' : 'border-gray-200 bg-white hover:border-gray-400'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-black text-base">{s.name}</p>
                    <p className="text-black/50 text-sm mt-0.5">{s.desc}</p>
                    <p className="text-xs text-black/40 mt-1">+{s.points} reward point{s.points > 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-black text-xl font-bold">₹{s.price}</p>
                    {service === s.id && <Check size={16} className="text-black ml-auto mt-1" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Add-ons */}
        {step === 2 && (
          <div data-testid="step-addons" className="space-y-4">
            <div className="p-4 bg-black/5 border border-black/10 rounded-xl mb-4">
              <p className="text-xs font-bold text-black uppercase tracking-widest flex items-center gap-2">
                <Star size={12} /> Bonus Points Opportunity
              </p>
              <p className="text-xs text-black/60 mt-1">Every ₹100 spent on add-ons earns you 10 extra reward points!</p>
            </div>
            <div className="space-y-3">
              {ADDONS.map(a => {
                const hasExistingRedemption = myRedemptions.some(r => r.reward_id === a.id);
                const rewardRule = rewardsInfo?.redemptions?.find(r => r.id === a.id);
                const canAfford = rewardsInfo?.points >= rewardRule?.points;
                const isApplied = appliedRewards.includes(a.id);
                const isSelected = selectedAddons.includes(a.id);

                return (
                  <div key={a.id} className="space-y-2">
                    <button data-testid={`addon-${a.id}`} 
                      onClick={() => {
                        setSelectedAddons(prev => {
                          const newAddons = prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id];
                          if (!newAddons.includes(a.id)) {
                            setAppliedRewards(curr => curr.filter(x => x !== a.id));
                          }
                          return newAddons;
                        });
                      }}
                      className={`w-full p-5 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-black bg-black/5' : 'border-gray-200 bg-white hover:border-gray-400'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-black text-base">{a.name}</p>
                          <p className="text-black/50 text-sm mt-0.5">{a.desc}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-black text-lg font-bold ${isApplied ? 'line-through opacity-30' : ''}`}>₹{a.price}</p>
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center ml-auto mt-1">
                              <Check size={12} className="text-white" />
                            </div>
                          ) : (
                            <Plus size={16} className="text-black/20 ml-auto mt-1" />
                          )}
                        </div>
                      </div>
                    </button>
                    
                    {isSelected && (hasExistingRedemption || canAfford) && (
                      <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star size={12} className="text-yellow-600" />
                          <span className="text-xs font-medium text-black/60">
                            {hasExistingRedemption ? 'You have a redeemed reward for this!' : `Redeem with ${rewardRule?.points} points`}
                          </span>
                        </div>
                        <button 
                          onClick={() => setAppliedRewards(prev => prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id])}
                          className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                            isApplied ? 'bg-black text-white' : 'bg-white border border-black/20 text-black hover:border-black'
                          }`}>
                          {isApplied ? 'Applied' : 'Apply Reward'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-center text-xs text-black/40 italic">You can also add these later using your wallet balance!</p>
          </div>
        )}

        {/* Step 3: Slot Type */}
        {step === 3 && (
          <div data-testid="step-slot-type" className="space-y-3">
            {SLOT_TYPES.map(s => (
              <button key={s.id} data-testid={`slot-type-${s.id}`} onClick={() => setSlotType(s.id)}
                className={`w-full p-5 rounded-xl border-2 text-left transition-all ${slotType === s.id ? 'border-black bg-black/5' : 'border-gray-200 bg-white hover:border-gray-400'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-black text-base">{s.name}</p>
                    <p className="text-black/50 text-sm mt-0.5">{s.desc}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${s.badgeClass}`}>{s.badge}</span>
                    {slotType === s.id && <Check size={16} className="text-black ml-auto mt-2" />}
                  </div>
                </div>
                {svc && (
                  <p className="mt-2 text-xs text-black/30">Price: ₹{svc.price * s.mult} (Prepaid)</p>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Step 4: Date & Time */}
        {step === 4 && (
          <div data-testid="step-date-time" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-black/40 mb-3 font-semibold">Select Date</p>
              <div className="grid grid-cols-2 gap-3">
                {calendarDays.map((day, i) => {
                  const ds = format(day, 'yyyy-MM-dd');
                  const dom = format(day, 'd');
                  const mon = format(day, 'MMM');
                  const isSelected = selectedDate === ds;
                  const isPast = isBefore(day, today);
                  return (
                    <button key={i} data-testid={`date-btn-${ds}`} disabled={isPast} onClick={() => { setSelectedDate(ds); setTimeSlot(''); }}
                      className={`p-4 rounded-xl text-center transition-all ${isPast ? 'opacity-20 cursor-not-allowed text-black/30' : isSelected ? 'bg-black text-white' : 'bg-gray-50 border border-gray-200 hover:border-black text-black/70'}`}>
                      <div className="font-serif text-lg font-bold">{dom}</div>
                      <div className="text-xs uppercase tracking-widest opacity-70">{mon}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {slotType !== 'right_now' && selectedDate && (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-black/40 mb-3 font-semibold">
                  Available Times {selectedDate && `(${format(new Date(selectedDate + 'T12:00:00'), 'EEE, MMM d')})`}
                </p>
                {slotsLoading ? (
                  <div className="flex items-center gap-2 text-black/40 text-sm"><div className="animate-spin w-4 h-4 border border-black border-t-transparent rounded-full" /> Loading...</div>
                ) : allSlots.length === 0 ? (
                  <p data-testid="no-slots-msg" className="text-black/40 text-sm">No available slots for this date. Try another date.</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {allSlots.map(s => (
                      <button key={s.time} data-testid={`time-slot-${s.time}`} 
                        disabled={!s.available}
                        onClick={() => setTimeSlot(s.time)}
                        className={`relative py-3 rounded-xl text-sm font-bold transition-all border-2 
                          ${!s.available 
                            ? 'bg-gray-100 border-transparent text-black/20 cursor-not-allowed' 
                            : timeSlot === s.time 
                              ? 'bg-black border-black text-white' 
                              : 'bg-white border-gray-100 hover:border-black text-black/70'}`}>
                        {formatTime(s.time)}
                        {!s.available && (
                          <span className="absolute -top-2 -right-1 px-1 bg-gray-200 text-[8px] font-black uppercase text-black/40 rounded border border-white">Booked</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {slotType === 'right_now' && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-black font-semibold text-sm">Right Now Service</p>
                <p className="text-black/50 text-sm mt-1">Please call us to confirm availability. Then proceed with your date selection.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review & Pay */}
        {step === 5 && (
          <div data-testid="step-review" className="space-y-4">
            {/* Reward & Wallet Redemption Options */}
            {selectedAddonsData.length > 0 && user && (
              <div className="p-5 border-2 border-black/5 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-[#C5A059] fill-[#C5A059]" />
                    <span className="font-serif text-lg">Payment Options for Add-ons</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-black/40 font-bold">Your Balance</p>
                    <p className="text-xs font-bold text-black">{rewardsInfo?.points || 0} Points | ₹{walletBalance.toFixed(0)} Wallet</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedAddonsData.map(a => {
                    const hasExisting = myRedemptions.find(r => r.reward_id === a.id);
                    const pointsNeeded = rewardsInfo?.redemptions?.find(r => r.id === a.id)?.points;
                    const canAffordPoints = (rewardsInfo?.points || 0) >= (pointsNeeded || 999999);
                    const canAffordWallet = walletBalance >= a.price;
                    
                    const isRewardApplied = appliedRewards.includes(a.id);
                    const isWalletApplied = walletAddons.includes(a.id);

                    if (!hasExisting && !pointsNeeded && !canAffordWallet) return null;

                    return (
                      <div key={a.id} className={`p-4 rounded-xl border-2 transition-all ${(isRewardApplied || isWalletApplied) ? 'border-black bg-black/5' : 'border-gray-100 bg-white'}`}>
                        <div className="flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold text-black">{a.name}</p>
                              <p className="text-[10px] text-black/50">Choose how to pay for this addon</p>
                            </div>
                            <p className="text-sm font-bold text-black">₹{a.price}</p>
                          </div>
                          
                          <div className="flex gap-2">
                            {/* Reward Button */}
                            {(hasExisting || pointsNeeded) && (
                              <button 
                                onClick={() => {
                                  if (isRewardApplied) setAppliedRewards(prev => prev.filter(x => x !== a.id));
                                  else {
                                    setAppliedRewards(prev => [...prev, a.id]);
                                    setWalletAddons(prev => prev.filter(x => x !== a.id));
                                  }
                                }}
                                disabled={!hasExisting && !canAffordPoints && !isRewardApplied}
                                className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all 
                                  ${isRewardApplied 
                                    ? 'bg-black text-white' 
                                    : (hasExisting || canAffordPoints) 
                                      ? 'border border-black text-black hover:bg-black hover:text-white' 
                                      : 'border border-gray-100 text-gray-300 cursor-not-allowed'}`}
                              >
                                {isRewardApplied ? 'Reward Applied' : hasExisting ? 'Use Voucher' : `Redeem ${pointsNeeded} pts`}
                              </button>
                            )}

                            {/* Wallet Button */}
                            <button 
                              onClick={() => {
                                if (isWalletApplied) setWalletAddons(prev => prev.filter(x => x !== a.id));
                                else {
                                  setWalletAddons(prev => [...prev, a.id]);
                                  setAppliedRewards(prev => prev.filter(x => x !== a.id));
                                }
                              }}
                              disabled={!canAffordWallet && !isWalletApplied}
                              className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all 
                                ${isWalletApplied 
                                  ? 'bg-black text-white' 
                                  : canAffordWallet 
                                    ? 'border border-black text-black hover:bg-black hover:text-white' 
                                    : 'border border-gray-100 text-gray-300 cursor-not-allowed'}`}
                            >
                              {isWalletApplied ? 'Paid via Wallet' : `Use Wallet ₹${a.price}`}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(appliedRewards.length > 0 || walletAddons.length > 0) && (
                  <p className="text-[10px] text-black/40 italic text-center">
                    Payment deduction will be reflected in your final summary.
                  </p>
                )}
              </div>
            )}

            <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
              <h3 className="font-serif text-xl text-black">Booking Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-black/50 text-sm">Service</span><span className="text-black text-sm font-semibold">{svc?.name}</span></div>
                <div className="flex justify-between"><span className="text-black/50 text-sm">Barber</span><span className="text-black text-sm font-semibold">{BARBERS.find(b => b.id === barber)?.name}</span></div>
                <div className="flex justify-between"><span className="text-black/50 text-sm">Slot Type</span><span className="text-black text-sm">{slt?.name}</span></div>
                <div className="flex justify-between"><span className="text-black/50 text-sm">Date</span><span className="text-black text-sm">{selectedDate}</span></div>
                <div className="flex justify-between"><span className="text-black/50 text-sm">Time</span><span className="text-black text-sm">{timeSlot === 'right_now' ? 'Right Now' : formatTime(timeSlot)}</span></div>
                {selectedAddonsData.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-black/40 mb-1">Add-ons</p>
                    {selectedAddonsData.map(a => (
                      <div key={a.id} className="flex justify-between text-xs py-1">
                        <div className="flex items-center gap-1">
                          <span className="text-black/60">{a.name}</span>
                          {(appliedRewards.includes(a.id) || walletAddons.includes(a.id)) && <Check size={10} className="text-black" />}
                        </div>
                        <span className={`text-black ${(appliedRewards.includes(a.id) || walletAddons.includes(a.id)) ? 'line-through opacity-30' : ''}`}>₹{a.price}</span>
                      </div>
                    ))}
                    {rewardsDeduction > 0 && (
                      <div className="flex justify-between text-xs py-1 text-green-600 font-bold">
                        <span>Reward Discount</span>
                        <span>-₹{rewardsDeduction}</span>
                      </div>
                    )}
                    {walletDeduction > 0 && (
                      <div className="flex justify-between text-xs py-1 text-blue-600 font-bold">
                        <span>Paid via Wallet</span>
                        <span>-₹{walletDeduction}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between"><span className="text-black/50 text-sm">Total</span><span className="text-black text-sm">₹{totalPrice}</span></div>
                <div className="flex justify-between"><span className="text-black text-sm font-semibold">Total to Pay</span><span className="text-black text-lg font-bold">₹{advance}</span></div>
              </div>
              <div className="flex items-start gap-2 pt-2">
                <Clock size={14} className="text-black/30 mt-0.5 shrink-0" />
                <p className="text-xs text-black/30">Arrive on time. 10 minutes late = automatic cancellation.</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-black/40" />
                <span className="text-xs text-black/40">Secure payment powered by Razorpay</span>
              </div>
            </div>

            <button data-testid="pay-advance-btn" onClick={handlePay} disabled={payLoading}
              className="w-full py-4 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 tracking-widest uppercase">
              {payLoading ? 'Processing...' : `Pay ₹${advance} Advance`}
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 0 ? (
            <button data-testid="back-btn" onClick={handleBack} className="flex items-center gap-2 text-sm text-black/50 hover:text-black transition-colors px-4 py-2">
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-black/50 hover:text-black transition-colors px-4 py-2">
              <ChevronLeft size={16} /> Home
            </button>
          )}
          {step < 5 && (
            <button data-testid="next-btn" onClick={handleNext} disabled={!canNext()}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${canNext() ? 'bg-black text-white hover:bg-gray-800 active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
