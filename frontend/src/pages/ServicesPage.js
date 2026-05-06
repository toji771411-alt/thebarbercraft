import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, Star } from 'lucide-react';

const HAIRCUT_IMG = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTfdj9ki5-0gUBvV8GJhePLhQNYFPCQ44sPeA&s";
const BEARD_IMG = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2sVGFovPuD9KwPE4uYrGGnBICIna0Zo4ILw&s";
const INTERIOR_IMG = "https://images.unsplash.com/photo-1572663459735-75425e957ab9?auto=format&fit=crop&q=80&w=800";

export default function ServicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleBookNow = () => {
    if (user) navigate('/book');
    else navigate('/'); // Or open auth modal on landing
  };

  return (
    <div className="bg-white text-black min-h-screen pt-24 pb-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-black/40 font-semibold mb-3">What We Offer</p>
          <h2 className="font-serif text-4xl sm:text-6xl text-black mb-6">Our Services</h2>
          <p className="text-black/50 max-w-2xl mx-auto">Premium grooming experiences tailored for the modern gentleman. Every service is a dedicated, unrushed session focused on precision and craftsmanship.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Haircut */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200 group cursor-pointer hover:border-black transition-all" onClick={handleBookNow}>
            <img src={HAIRCUT_IMG} alt="Haircut" className="w-full h-80 object-cover transition-all duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent transition-all duration-500 group-hover:from-black/40 group-hover:via-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Signature Service</p>
              <h3 className="font-serif text-3xl text-white mb-2">Haircut</h3>
              <div className="flex items-center justify-between">
                <p className="text-white/60 text-sm">Precision fade & styling with personalized consultation</p>
                <span className="text-white font-bold text-2xl ml-4">₹300</span>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-white/40">
                <div className="flex items-center gap-1.5"><Clock size={14}/> <span>45–55 mins</span></div>
                <div className="flex items-center gap-1.5"><span className="text-white/60">+10 Reward Pts</span></div>
              </div>
            </div>
          </div>

          {/* Beard */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200 group cursor-pointer hover:border-black transition-all" onClick={handleBookNow}>
            <img src={BEARD_IMG} alt="Beard" className="w-full h-80 object-cover transition-all duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent transition-all duration-500 group-hover:from-black/40 group-hover:via-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Classic Service</p>
              <h3 className="font-serif text-3xl text-white mb-2">Beard Styling</h3>
              <div className="flex items-center justify-between">
                <p className="text-white/60 text-sm">Hot towel beard shave & sculpting for a sharp finish</p>
                <span className="text-white font-bold text-2xl ml-4">₹200</span>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-white/40">
                <div className="flex items-center gap-1.5"><Clock size={14}/> <span>45–55 mins</span></div>
                <div className="flex items-center gap-1.5"><span className="text-white/60">+10 Reward Pts</span></div>
              </div>
            </div>
          </div>

          {/* Combo */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200 group cursor-pointer hover:border-black transition-all md:col-span-2 lg:col-span-1" onClick={handleBookNow}>
            <div className="absolute top-4 right-4 z-10 px-4 py-1.5 bg-black text-white text-[10px] font-bold rounded-full tracking-widest">BEST VALUE</div>
            <img src={INTERIOR_IMG} alt="Combo" className="w-full h-80 object-cover transition-all duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-all duration-500 group-hover:from-black/40 group-hover:via-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Premium Package</p>
              <h3 className="font-serif text-3xl text-white mb-2">Executive Combo</h3>
              <div className="flex items-center justify-between">
                <p className="text-white/60 text-sm">Complete Hair + Beard makeover experience</p>
                <span className="text-white font-bold text-2xl ml-4">₹400</span>
              </div>
              <div className="mt-4 flex items-center gap-3 text-sm">
                <Star size={14} className="text-[#C5A059] fill-[#C5A059]"/><span className="text-white/70 font-medium">+25 Reward Points Earned</span>
              </div>
            </div>
          </div>
        </div>

        {/* Add-ons Detail section */}
        <div className="mt-12">
          <div className="border border-gray-200 rounded-2xl bg-gray-50/50 p-8 md:p-12">
            <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-6 font-bold">Wallet Exclusive Add-ons</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex flex-col gap-4">
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-serif text-lg italic">01</div>
                <div>
                  <h4 className="text-lg font-serif text-black mb-1">Head Massage</h4>
                  <p className="text-black/50 text-xs leading-relaxed mb-2">Relieve stress with a deep, therapeutic scalp massage.</p>
                  <span className="text-xl font-bold">₹150</span>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-serif text-lg italic">02</div>
                <div>
                  <h4 className="text-lg font-serif text-black mb-1">De-Tan Treatment</h4>
                  <p className="text-black/50 text-xs leading-relaxed mb-2">Restore your skin's natural glow and remove sun damage.</p>
                  <span className="text-xl font-bold">₹200</span>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-serif text-lg italic">03</div>
                <div>
                  <h4 className="text-lg font-serif text-black mb-1">Hair Spa</h4>
                  <p className="text-black/50 text-xs leading-relaxed mb-2">Deep conditioning treatment for smooth, healthy hair.</p>
                  <span className="text-xl font-bold">₹500</span>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-serif text-lg italic">04</div>
                <div>
                  <h4 className="text-lg font-serif text-black mb-1">Facial</h4>
                  <p className="text-black/50 text-xs leading-relaxed mb-2">Professional skin revival for a sharp, clean look.</p>
                  <span className="text-xl font-bold">₹600</span>
                </div>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-200 flex items-center justify-center">
               <p className="text-sm text-black/40 italic">*Add-on services can only be redeemed using your digital wallet balance.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
