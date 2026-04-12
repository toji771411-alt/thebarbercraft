import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ChevronLeft, ChevronRight, Check, Clock, CreditCard, AlertCircle } from 'lucide-react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';

const SERVICES = [
  { id: 'haircut', name: 'Haircut', price: 300, points: 1, desc: 'Precision fade & styling' },
  { id: 'beard', name: 'Beard Trim', price: 200, points: 1, desc: 'Hot towel beard shave' },
  { id: 'combo', name: 'Executive Combo', price: 400, points: 3, desc: 'Hair + Beard together' },
];
const SLOT_TYPES = [
  { id: 'standard', name: 'Standard', mult: 1, desc: 'Regular working hours', badge: 'Normal Price', badgeClass: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'emergency_morning', name: 'Morning Emergency', mult: 3, desc: '8:00 AM – 9:00 AM before hours', badge: '3× Price', badgeClass: 'bg-gray-100 text-black border-gray-300' },
  { id: 'emergency_night', name: 'Night Emergency', mult: 3, desc: '10:30 PM – 11:30 PM after hours', badge: '3× Price', badgeClass: 'bg-gray-100 text-black border-gray-300' },
  { id: 'right_now', name: 'Right Now', mult: 3, desc: 'Immediate – call us first', badge: '3× Price', badgeClass: 'bg-black text-white border-black' },
];
const STEPS = ['Service', 'Slot Type', 'Date & Time', 'Review & Pay'];

export default function BookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [service, setService] = useState(null);
  const [slotType, setSlotType] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const today = startOfDay(new Date());
  const calendarDays = Array.from({ length: 30 }, (_, i) => addDays(today, i));

  useEffect(() => {
    if (!selectedDate || !slotType || slotType === 'right_now') return;
    setSlotsLoading(true); setTimeSlot('');
    api.getSlots(selectedDate, slotType)
      .then(d => setAvailableSlots(d.available_slots || []))
      .catch(() => setAvailableSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, slotType]);

  const svc = SERVICES.find(s => s.id === service);
  const slt = SLOT_TYPES.find(s => s.id === slotType);
  const price = svc && slt ? svc.price * slt.mult : 0;
  const advance = Math.round(price * 0.7);
  const balance = price - advance;

  const canNext = () => {
    if (step === 0) return !!service;
    if (step === 1) return !!slotType;
    if (step === 2) return slotType === 'right_now' ? !!selectedDate : (!!selectedDate && !!timeSlot);
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
      });
      setBooking(b);
      const order = await api.createOrder(b.booking_id);

      if (!order.mock && order.key_id !== 'mock') {
        const options = {
          key: order.key_id, amount: order.amount * 100, currency: 'INR',
          name: 'The Barber Craft', description: `${svc?.name} – 70% Advance`,
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
          <p className="text-xs uppercase tracking-[0.3em] text-black/40 font-semibold mb-2">Confirmed!</p>
          <h1 className="font-serif text-4xl text-black mb-4">Booking Secured</h1>
          <p className="text-black/50 mb-8">Your appointment is confirmed. See you soon!</p>
          <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-left space-y-3 mb-8">
            <div className="flex justify-between"><span className="text-black/50 text-sm">Service</span><span className="text-black text-sm font-semibold">{svc?.name}</span></div>
            <div className="flex justify-between"><span className="text-black/50 text-sm">Date</span><span className="text-black text-sm">{selectedDate}</span></div>
            <div className="flex justify-between"><span className="text-black/50 text-sm">Time</span><span className="text-black text-sm">{timeSlot || 'Right Now'}</span></div>
            <div className="border-t border-gray-200 pt-3 flex justify-between"><span className="text-black/50 text-sm">Advance Paid</span><span className="text-black text-sm font-bold">₹{advance}</span></div>
            <div className="flex justify-between"><span className="text-black/50 text-sm">Balance (after service)</span><span className="text-black text-sm">₹{balance}</span></div>
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
    <div className="min-h-screen bg-white pt-20 pb-16 px-4">
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

        {/* Step 0: Service */}
        {step === 0 && (
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

        {/* Step 1: Slot Type */}
        {step === 1 && (
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
                  <p className="mt-2 text-xs text-black/30">Price: ₹{svc.price * s.mult} · 70% now = ₹{Math.round(svc.price * s.mult * 0.7)}</p>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div data-testid="step-date-time" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-black/40 mb-3 font-semibold">Select Date</p>
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((day, i) => {
                  const ds = format(day, 'yyyy-MM-dd');
                  const dom = format(day, 'd');
                  const mon = format(day, 'MMM');
                  const isSelected = selectedDate === ds;
                  const isPast = isBefore(day, today);
                  return (
                    <button key={i} data-testid={`date-btn-${ds}`} disabled={isPast} onClick={() => { setSelectedDate(ds); setTimeSlot(''); }}
                      className={`p-2 rounded-lg text-center text-xs transition-all ${isPast ? 'opacity-20 cursor-not-allowed text-black/30' : isSelected ? 'bg-black text-white' : 'bg-gray-50 border border-gray-200 hover:border-black text-black/70'}`}>
                      <div className="font-semibold">{dom}</div>
                      <div className="text-[10px] opacity-70">{mon}</div>
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
                ) : availableSlots.length === 0 ? (
                  <p data-testid="no-slots-msg" className="text-black/40 text-sm">No available slots for this date. Try another date.</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {availableSlots.map(t => (
                      <button key={t} data-testid={`time-slot-${t}`} onClick={() => setTimeSlot(t)}
                        className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${timeSlot === t ? 'bg-black text-white' : 'bg-gray-50 border border-gray-200 hover:border-black text-black/70'}`}>
                        {t}
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

        {/* Step 3: Review & Pay */}
        {step === 3 && (
          <div data-testid="step-review" className="space-y-4">
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
              <h3 className="font-serif text-xl text-black">Booking Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-black/50 text-sm">Service</span><span className="text-black text-sm font-semibold">{svc?.name}</span></div>
                <div className="flex justify-between"><span className="text-black/50 text-sm">Slot Type</span><span className="text-black text-sm">{slt?.name}</span></div>
                <div className="flex justify-between"><span className="text-black/50 text-sm">Date</span><span className="text-black text-sm">{selectedDate}</span></div>
                <div className="flex justify-between"><span className="text-black/50 text-sm">Time</span><span className="text-black text-sm">{timeSlot || 'Right Now'}</span></div>
              </div>
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between"><span className="text-black/50 text-sm">Total</span><span className="text-black text-sm">₹{price}</span></div>
                <div className="flex justify-between"><span className="text-black text-sm font-semibold">Pay Now (70%)</span><span className="text-black text-lg font-bold">₹{advance}</span></div>
                <div className="flex justify-between"><span className="text-black/50 text-sm">Balance after service (30%)</span><span className="text-black/60 text-sm">₹{balance}</span></div>
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
          {step < 3 && (
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
