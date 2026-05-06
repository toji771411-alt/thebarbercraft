import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, Star, Shield, Zap, Moon, Sun, Phone, ChevronDown, Gift } from 'lucide-react';
import AuthModal from '../components/AuthModal';
import logo from '../assets/logo.png';

const HERO_IMG = "https://images.unsplash.com/photo-1734723836256-0e168f4721a7?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1920";
const HAIRCUT_IMG = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTfdj9ki5-0gUBvV8GJhePLhQNYFPCQ44sPeA&s";
const BEARD_IMG = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2sVGFovPuD9KwPE4uYrGGnBICIna0Zo4ILw&s";
const INTERIOR_IMG = "https://images.unsplash.com/photo-1572663459735-75425e957ab9?auto=format&fit=crop&q=80&w=800";

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('register');

  const handleBookNow = () => {
    if (user) navigate('/book');
    else { setAuthTab('register'); setAuthOpen(true); }
  };

  return (
    <div className="bg-white text-black min-h-screen">

      {/* ── Hero (stays dark for dramatic impact) ─────────────────── */}
      <section data-testid="hero-section" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${HERO_IMG})` }} />
        {/* Multi-layer gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

        {/* Marquee */}
        <div className="absolute bottom-12 left-0 right-0 overflow-hidden border-y border-white/5 py-2.5">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="text-[9px] tracking-[0.4em] text-white/20 font-medium uppercase mx-10">
                PRECISION &nbsp;•&nbsp; CRAFTSMANSHIP &nbsp;•&nbsp; NO WAITING &nbsp;•&nbsp; PREMIUM CUTS &nbsp;•&nbsp; EXPERT STYLING &nbsp;•&nbsp; THE BARBER CRAFT
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 w-full mt-32">
          {/* Eyebrow */}
          <div className="flex items-center gap-4 mb-10">
            <div className="h-px w-10 bg-white/30" />
            <span className="text-[10px] tracking-[0.5em] text-white/40 uppercase font-medium">Est. Premium Barbershop</span>
          </div>

          {/* Stacked editorial heading */}
          <div className="overflow-hidden mb-2">
            <h1 className="font-serif text-6xl sm:text-7xl lg:text-[9rem] font-light leading-none text-white/90 tracking-tight">
              The
            </h1>
          </div>
          <div className="overflow-hidden mb-2">
            <h1 className="font-serif text-6xl sm:text-7xl lg:text-[9rem] font-bold leading-none text-white tracking-tight">
              BARBER
            </h1>
          </div>
          <div className="overflow-hidden mb-6">
            <h1 className="font-serif text-6xl sm:text-7xl lg:text-[9rem] italic font-light leading-none text-white/70 tracking-tight">
              Craft
            </h1>
          </div>

          <p className="text-base sm:text-lg text-white/50 font-light max-w-sm mb-8 leading-relaxed">
            No Waiting. No Rush.<br />
            <span className="text-white/80">Just Pure Quality.</span>
          </p>

          <div className="flex flex-wrap gap-4">
            <button data-testid="hero-book-btn" onClick={handleBookNow}
              className="px-8 py-3.5 bg-white text-black font-semibold text-xs rounded-sm hover:bg-gray-100 transition-all active:scale-95 tracking-[0.2em] uppercase">
              Book Appointment
            </button>
            <a href="#services" data-testid="hero-services-link"
              className="px-8 py-3.5 border border-white/20 text-white/70 font-semibold text-xs rounded-sm hover:border-white/60 hover:text-white transition-all tracking-[0.2em] uppercase">
              Our Services
            </a>
          </div>
        </div>

        <a href="#services" className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/10 hover:text-white/40 transition-colors">
          <ChevronDown size={18} />
        </a>
      </section>

      {/* ── Services ─────────────────────────────────────────────────── */}
      <section id="services" data-testid="services-section" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-black/40 font-semibold mb-3">What We Offer</p>
          <h2 className="font-serif text-4xl sm:text-5xl text-black">Our Services</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Haircut */}
          <div data-testid="service-haircut" className="relative overflow-hidden rounded-2xl border border-gray-100 group cursor-pointer hover:border-black transition-all shadow-sm hover:shadow-xl bg-white" onClick={handleBookNow}>
            <div className="aspect-[4/3] overflow-hidden">
              <img src={HAIRCUT_IMG} alt="Haircut" className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0 opacity-90 group-hover:opacity-100" />
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-serif text-2xl text-black">Haircut</h3>
                <span className="text-black font-bold text-xl">₹300</span>
              </div>
              <p className="text-black/50 text-sm mb-4">Precision fade & bespoke styling for the modern gentleman.</p>
              <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-black/40">
                <span className="flex items-center gap-1"><Clock size={12}/> 45-55 MINS</span>
                <span className="text-black/20">|</span>
                <span className="text-black/60">10 POINTS</span>
              </div>
            </div>
          </div>

          {/* Beard */}
          <div data-testid="service-beard" className="relative overflow-hidden rounded-2xl border border-gray-100 group cursor-pointer hover:border-black transition-all shadow-sm hover:shadow-xl bg-white" onClick={handleBookNow}>
            <div className="aspect-[4/3] overflow-hidden">
              <img src={BEARD_IMG} alt="Beard Styling" className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0 opacity-90 group-hover:opacity-100" />
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-serif text-2xl text-black">Beard Styling</h3>
                <span className="text-black font-bold text-xl">₹200</span>
              </div>
              <p className="text-black/50 text-sm mb-4">Hot towel shave & precision sculpting for a sharp profile.</p>
              <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-black/40">
                <span className="flex items-center gap-1"><Clock size={12}/> 45-55 MINS</span>
                <span className="text-black/20">|</span>
                <span className="text-black/60">10 POINTS</span>
              </div>
            </div>
          </div>

          {/* Combo */}
          <div data-testid="service-combo" className="relative overflow-hidden rounded-2xl border border-gray-100 group cursor-pointer hover:border-black transition-all shadow-sm hover:shadow-xl bg-white" onClick={handleBookNow}>
            <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-black text-white text-[10px] font-black rounded-full tracking-widest uppercase">Best Value</div>
            <div className="aspect-[4/3] overflow-hidden">
              <img src={INTERIOR_IMG} alt="Executive Combo" className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0 opacity-90 group-hover:opacity-100" />
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-serif text-2xl text-black">Executive Combo</h3>
                <span className="text-black font-bold text-xl">₹400</span>
              </div>
              <p className="text-black/50 text-sm mb-4">The ultimate grooming experience. Haircut + Beard Styling.</p>
              <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-black/40">
                <span className="flex items-center gap-1"><Clock size={12}/> 90 MINS</span>
                <span className="text-black/20">|</span>
                <span className="text-black/60">25 POINTS</span>
              </div>
            </div>
          </div>
        </div>

        {/* More Services Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {[
            { name: "Manicure", price: "250", pts: 25, desc: "Professional hand & nail care." },
            { name: "Pedicure", price: "300", pts: 30, desc: "Relaxing foot treatment & spa." },
            { name: "Curly Hair Styling", price: "450", pts: 45, desc: "Expert care for natural curls." }
          ].map((s, i) => (
            <div key={i} className="p-6 rounded-xl border border-gray-100 bg-white hover:border-black transition-all group cursor-pointer" onClick={handleBookNow}>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-serif text-xl text-black">{s.name}</h4>
                <span className="font-bold text-black">₹{s.price}</span>
              </div>
              <p className="text-black/40 text-xs mb-3">{s.desc}</p>
              <span className="text-[10px] font-bold tracking-widest text-black/60 uppercase">{s.pts} REWARD POINTS</span>
            </div>
          ))}
        </div>

        {/* Add-ons */}
        <div className="mt-6 p-6 border border-gray-200 rounded-xl bg-gray-50">
          <p className="text-xs uppercase tracking-[0.2em] text-black/40 mb-3 font-semibold">Add-on Services (Wallet Only)</p>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-black" />
              <span className="text-black/70 text-sm">Head Massage</span>
              <span className="text-black font-bold text-sm">₹150</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-black" />
              <span className="text-black/70 text-sm">Facial Scrub</span>
              <span className="text-black font-bold text-sm">₹200</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Emergency Slots ───────────────────────────────────────────── */}
      <section data-testid="emergency-section" className="py-20 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-black/40 font-semibold mb-3">Urgent Access</p>
            <h2 className="font-serif text-4xl sm:text-5xl text-black">Need a Cut Urgently?</h2>
            <p className="text-black/50 mt-3 text-base">Premium Emergency Access — 3× Standard Price</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div data-testid="emergency-morning-card" className="p-6 rounded-xl border border-gray-200 bg-white hover:border-black transition-all">
              <Sun size={28} className="text-black mb-4" />
              <p className="text-xs uppercase tracking-[0.2em] text-black/40 mb-2 font-semibold">Morning Slot</p>
              <h3 className="font-serif text-2xl text-black mb-2">8:00 – 9:00 AM</h3>
              <p className="text-black/50 text-sm mb-4">Before regular hours. Available for urgent bookings.</p>
              <span className="px-3 py-1 bg-black text-white text-xs rounded-full font-semibold">3× Price</span>
            </div>

            <div data-testid="emergency-night-card" className="p-6 rounded-xl border border-gray-200 bg-white hover:border-black transition-all">
              <Moon size={28} className="text-black mb-4" />
              <p className="text-xs uppercase tracking-[0.2em] text-black/40 mb-2 font-semibold">Night Slot</p>
              <h3 className="font-serif text-2xl text-black mb-2">10:30 – 11:30 PM</h3>
              <p className="text-black/50 text-sm mb-4">After regular hours. For those late-night situations.</p>
              <span className="px-3 py-1 bg-black text-white text-xs rounded-full font-semibold">3× Price</span>
            </div>

            <div data-testid="right-now-card" className="p-6 rounded-xl border border-black bg-black text-white">
              <Zap size={28} className="text-white mb-4" />
              <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2 font-semibold">Immediate</p>
              <h3 className="font-serif text-2xl text-white mb-2">Right Now</h3>
              <p className="text-white/60 text-sm mb-4">Subject to availability & current client's permission. Call us.</p>
              <a href="tel:+919999999999" className="flex items-center gap-2 text-white text-sm font-semibold hover:underline">
                <Phone size={14} /> Call to Inquire
              </a>
              <div className="mt-3">
                <span className="px-3 py-1 bg-white text-black text-xs rounded-full font-semibold">3× Price</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Working Hours ─────────────────────────────────────────────── */}
      <section data-testid="hours-section" className="py-20 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-black/40 font-semibold mb-3">When We're Open</p>
          <h2 className="font-serif text-4xl text-black">Working Hours</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 bg-white border border-gray-200 rounded-xl hover:border-black transition-all">
            <p className="text-xs uppercase tracking-[0.2em] text-black/40 mb-3 font-semibold">Tuesday – Sunday</p>
            <p className="font-serif text-3xl text-black">9:00 AM – 10:30 PM</p>
            <p className="text-black/40 text-sm mt-2">Standard & Emergency slots available</p>
          </div>
          <div className="p-6 bg-white border border-gray-200 rounded-xl hover:border-black transition-all">
            <p className="text-xs uppercase tracking-[0.2em] text-black/40 mb-3 font-semibold">Monday</p>
            <p className="font-serif text-3xl text-black">4:00 PM – 8:30 PM</p>
            <p className="text-black/40 text-sm mt-2">Special Monday hours</p>
          </div>
        </div>
        <p className="text-center text-black/40 text-sm mt-6 italic">Each slot is 45–55 minutes for a dedicated, unrushed experience.</p>
      </section>

      {/* ── Policies ─────────────────────────────────────────────────── */}
      <section id="policies" data-testid="policies-section" className="py-20 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-black/40 font-semibold mb-3">Our Commitment</p>
            <h2 className="font-serif text-4xl sm:text-5xl text-black">Booking Policies</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Shield, title: "100% Prepaid", desc: "Secure your exclusive slot with full advance payment. No waiting." },
              { icon: Clock, title: "10-Min Rule", desc: "10 minutes late = automatic cancellation. Respect the craft & our time." },
              { icon: Zap, title: "3-Day Rebook", desc: "Missed your slot? Rebook within 3 days using your prepaid credit." },
              { icon: Gift, title: "Wallet Shield", desc: "After 3 days, funds move to your wallet for luxury add-on services." },
            ].map((p, i) => (
              <div key={i} data-testid={`policy-card-${i}`} className="p-6 bg-white border border-gray-200 rounded-xl hover:border-black transition-all">
                <p.icon size={24} className="text-black mb-4" />
                <h3 className="font-semibold text-black text-base mb-2">{p.title}</h3>
                <p className="text-black/50 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 border border-gray-200 bg-white rounded-xl text-center">
            <p className="text-black/60 text-sm">
              <strong className="text-black">Note:</strong> Wallet balance is reserved for luxury add-ons (Head Massage, etc.) and cannot be used for Haircut/Beard bookings.
            </p>
          </div>
        </div>
      </section>

      {/* ── Rewards (inverted black section) ─────────────────────────── */}
      <section id="rewards" data-testid="rewards-section" className="py-24 px-6 bg-black text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40 font-semibold mb-3">Loyalty Program</p>
            <h2 className="font-serif text-4xl sm:text-5xl text-white">The Barber Craft Rewards</h2>
            <p className="text-white/50 mt-3">Earn points with every visit. Redeem for free services.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-white/5 border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3 mb-8">
                <Star size={24} className="text-white" />
                <h3 className="font-serif text-3xl text-white">Earn Points</h3>
              </div>
              <div className="space-y-4">
                {[
                  { service: "Haircut", pts: "10 Pts" },
                  { service: "Beard Styling", pts: "10 Pts" },
                  { service: "Combo (Hair + Beard)", pts: "25 Pts" },
                  { service: "Spend ₹100", pts: "10 Pts" },
                ].map((r, i) => (
                  <div key={i} data-testid={`earn-rule-${i}`} className="flex items-center justify-between py-4 border-b border-white/5">
                    <span className="text-white/70 font-medium">{r.service}</span>
                    <span className="px-4 py-1 bg-white text-black text-[10px] rounded-full font-black tracking-widest uppercase">{r.pts}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 bg-white/10 border border-white/20 rounded-2xl shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <Gift size={24} className="text-white" />
                <h3 className="font-serif text-3xl text-white">Redeem Luxury</h3>
              </div>
              <div className="space-y-4">
                {[
                  { pts: 100, reward: "Relaxing Head Massage" },
                  { pts: 150, reward: "De-Tan Treatment" },
                  { pts: 175, reward: "Nourishing Hair Spa" },
                  { pts: 300, reward: "Rejuvenating Facial" },
                  { pts: 400, reward: "Exclusive Surprise Gift" },
                ].map((r, i) => (
                  <div key={i} data-testid={`redeem-option-${i}`} className="flex items-center justify-between py-4 border-b border-white/5">
                    <span className="text-white/70 font-medium">{r.reward}</span>
                    <span className="px-3 py-1 bg-white/10 border border-white/20 text-white/90 text-[10px] rounded-full font-black tracking-widest">{r.pts} PTS</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <button data-testid="rewards-signup-btn" onClick={handleBookNow}
              className="px-8 py-3.5 bg-white text-black font-semibold text-sm rounded hover:bg-gray-100 transition-all active:scale-95 tracking-widest uppercase">
              Sign Up & Start Earning
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section data-testid="cta-section" className="py-24 px-6 text-center bg-white border-t border-gray-100">
        <p className="text-xs uppercase tracking-[0.3em] text-black/40 font-semibold mb-4">Ready?</p>
        <h2 className="font-serif text-4xl sm:text-5xl text-black mb-6">Book Your Slot Today</h2>
        <p className="text-black/50 mb-8 max-w-md mx-auto">Reserve your dedicated slot. Pay 70% advance to confirm. No compromises on quality or your time.</p>
        <button data-testid="cta-book-btn" onClick={handleBookNow}
          className="px-10 py-4 bg-black text-white font-bold text-sm rounded hover:bg-gray-800 transition-all active:scale-95 tracking-widest uppercase">
          Book Now
        </button>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer data-testid="footer" className="py-14 px-6 bg-black text-white border-t border-white/10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            {/* Logo in footer - shown with white bg pill */}
            <div className="inline-block bg-white rounded-lg p-2 mb-4">
              <img src={logo} alt="The Barber Craft" className="h-10 w-auto object-contain" />
            </div>
            <p className="text-white/40 text-sm leading-relaxed">Your Style, My Time.<br/>No Waiting. Just Quality.</p>
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-4 font-semibold">Hours</h4>
            <p className="text-white/50 text-sm mb-1">Tue – Sun: 9:00 AM – 10:30 PM</p>
            <p className="text-white/50 text-sm">Monday: 4:00 PM – 8:30 PM</p>
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-4 font-semibold">Quick Links</h4>
            <div className="flex flex-col gap-2">
              <a href="#services" className="text-white/50 text-sm hover:text-white transition-colors">Services</a>
              <a href="#policies" className="text-white/50 text-sm hover:text-white transition-colors">Policies</a>
              <a href="#rewards" className="text-white/50 text-sm hover:text-white transition-colors">Rewards</a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 text-center">
          <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase">© 2024 The Barber Craft. All rights reserved.</p>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />
    </div>
  );
}
