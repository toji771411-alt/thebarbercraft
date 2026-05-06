import { Shield, Clock, Zap, Gift, AlertCircle, RefreshCcw } from 'lucide-react';

export default function PoliciesPage() {
  return (
    <div className="bg-white text-black min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-xs uppercase tracking-[0.3em] text-black/40 font-semibold mb-3">Our Standards</p>
          <h2 className="font-serif text-5xl sm:text-7xl text-black mb-8">Store Policies</h2>
          <p className="text-black/50 max-w-2xl mx-auto text-lg">
            To maintain our high standard of service and respect your time, we've established clear guidelines for bookings and cancellations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
          {/* Booking Policy */}
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                <Shield size={28} className="text-black" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">100% Prepaid Bookings</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  All bookings require full payment in advance to secure your exclusive slot. This ensures that the dedicated time reserved for you is respected and guarded against last-minute cancellations.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                <Clock size={28} className="text-black" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">Punctuality Matters</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Being more than 10 minutes late results in an automatic cancellation. We run a tight, unrushed schedule to ensure every client gets our full attention.
                </p>
              </div>
            </div>
          </div>

          {/* Missed Sessions */}
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                <RefreshCcw size={28} className="text-black" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">3-Day Recovery Window</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  If you miss your slot, you have 3 days to re-book. Use your existing advance payment during this window to schedule a new time.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                <Gift size={28} className="text-black" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">Wallet Credit Transition</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  If you don't re-book within 3 days of a missed appointment, your advance payment automatically moves to your digital wallet for use on add-on services.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="p-8 md:p-12 border-2 border-black rounded-3xl bg-black text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
            <AlertCircle size={100} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="text-4xl font-serif">Note</div>
            <div className="h-px w-full md:w-px md:h-12 bg-white/20" />
            <p className="text-white/70 text-lg md:text-xl font-light italic">
              "Wallet funds are exclusively for <span className="text-white font-medium">Add-on Services</span> (Head Massage, Scrub). They cannot be used as payment for Haircut or Beard services under any circumstances."
            </p>
          </div>
        </div>

        {/* Closing Footer */}
        <div className="mt-24 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-black/30 font-bold">The Barber Craft Commitment</p>
        </div>
      </div>
    </div>
  );
}
