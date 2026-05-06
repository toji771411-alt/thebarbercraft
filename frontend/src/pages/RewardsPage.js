import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Star, Gift, Trophy, ArrowRight } from 'lucide-react';

export default function RewardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAction = () => {
    if (user) navigate('/dashboard');
    else navigate('/');
  };

  return (
    <div className="bg-[#0A0A0A] text-white min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-6">
            <Trophy size={16} className="text-[#C5A059]" />
            <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-white/60">Loyalty Program</span>
          </div>
          <h2 className="font-serif text-5xl sm:text-7xl mb-8">The Barber Craft Rewards</h2>
          <p className="text-white/40 max-w-2xl mx-auto text-lg leading-relaxed">
            Every visit is an investment in your style. Earn points on every service and redeem them for premium experiences at no extra cost.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          {/* Earning Section */}
          <div className="p-8 sm:p-12 bg-white/[0.02] border border-white/5 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Star size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#C5A059] flex items-center justify-center">
                  <Star size={24} className="text-black fill-black" />
                </div>
                <h3 className="font-serif text-3xl">Earn Points</h3>
              </div>
              
              <div className="space-y-6 mb-10">
                {[
                  { service: "Haircut", pts: "10 Points", desc: "Standard precision grooming session" },
                  { service: "Beard Styling", pts: "10 Points", desc: "Expert shaping and hot towel finish" },
                  { service: "Haircut + Beard Combo", pts: "25 Points", desc: "Ultimate makeover package (Best Earning Value)", highlight: true },
                  { service: "Other Services", pts: "10 Pts / ₹100", desc: "Earn for every ₹100 spent" },
                ].map((r, i) => (
                  <div key={i} className={`p-5 rounded-2xl border transition-all ${r.highlight ? 'bg-white/5 border-white/20' : 'bg-transparent border-white/5'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/90 font-medium">{r.service}</span>
                      <span className="px-3 py-1 bg-white text-black text-[10px] rounded-full font-bold uppercase tracking-wider">{r.pts}</span>
                    </div>
                    <p className="text-white/40 text-xs">{r.desc}</p>
                  </div>
                ))}
              </div>
              <button onClick={handleAction} className="flex items-center gap-2 text-sm font-semibold hover:text-[#C5A059] transition-colors group/btn">
                {user ? 'View My Balance' : 'Join Now'} <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Redeeming Section */}
          <div className="p-8 sm:p-12 bg-white/[0.02] border border-white/5 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Gift size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center">
                  <Gift size={24} className="text-black" />
                </div>
                <h3 className="font-serif text-3xl">Redeem Rewards</h3>
              </div>
              
              <div className="space-y-6 mb-10">
                {[
                  { pts: 100, reward: "Head Massage", desc: "15-minute therapeutic session" },
                  { pts: 150, reward: "De-Tan Treatment", desc: "Restore your natural skin glow" },
                  { pts: 175, reward: "Nourishing Hair Spa", desc: "Deep conditioning for healthy hair" },
                  { pts: 300, reward: "Rejuvenating Facial", desc: "Professional skin revival treatment" },
                  { pts: 400, reward: "Exclusive Surprise Gift", desc: "A special curated gift from us" },
                ].map((r, i) => (
                  <div key={i} className="p-5 rounded-2xl border border-white/5 bg-transparent group/item hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/90 font-medium group-hover/item:text-white transition-colors">{r.reward}</span>
                      <span className="px-3 py-1 bg-white/5 border border-white/10 text-white/60 text-[10px] rounded-full font-bold uppercase tracking-wider">
                        {r.pts} pts
                      </span>
                    </div>
                    <p className="text-white/40 text-xs">{r.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] uppercase tracking-widest text-white/20 italic font-medium">
                *Points are credited instantly upon service completion
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-white text-black p-10 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-md">
            <h4 className="text-2xl font-serif mb-2">Ready to start earning?</h4>
            <p className="text-black/60 text-sm">Create an account and book your first appointment to enter the program automatically. No cards, no hassle.</p>
          </div>
          <button onClick={handleAction} className="px-10 py-4 bg-black text-white font-bold text-xs uppercase tracking-[0.2em] rounded-full hover:scale-105 transition-transform active:scale-95">
            Get Started Now
          </button>
        </div>
      </div>
    </div>
  );
}
