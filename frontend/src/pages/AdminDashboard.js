import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Users, Calendar, CheckCircle, AlertTriangle, DollarSign, RefreshCw } from 'lucide-react';

const STATUS_STYLES = {
  pending_payment: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-black/5 text-black border-black/20',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  missed: 'bg-orange-50 text-orange-600 border-orange-200',
  rebooked: 'bg-blue-50 text-blue-600 border-blue-200',
  wallet_transferred: 'bg-purple-50 text-purple-600 border-purple-200',
};
const SERVICE_LABELS = { haircut: 'Haircut', beard: 'Beard', combo: 'Combo' };
const SLOT_LABELS = { standard: 'Std', emergency_morning: 'Emrg AM', emergency_night: 'Emrg PM', right_now: 'Right Now' };
const NEXT_STATUSES = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'missed', 'cancelled'],
  missed: ['cancelled'],
};

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [updateLoading, setUpdateLoading] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, b, u] = await Promise.all([api.adminStats(), api.adminBookings(statusFilter), api.adminUsers()]);
      setStats(s); setBookings(b); setUsers(u);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const handleStatusUpdate = async (bookingId, newStatus) => {
    setUpdateLoading(bookingId);
    try { await api.adminUpdateBooking(bookingId, newStatus); showToast(`Marked as ${newStatus}`); fetchData(); }
    catch (err) { showToast(err?.response?.data?.detail || 'Update failed'); }
    finally { setUpdateLoading(''); }
  };

  const handleProcessWallets = async () => {
    try { const r = await api.processExpiredWallets(); showToast(r.message); fetchData(); }
    catch (_) { showToast('Failed to process wallets'); }
  };

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

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-black/40 font-semibold mb-1">Admin Panel</p>
            <h1 className="font-serif text-3xl sm:text-4xl text-black">The Barber Craft</h1>
          </div>
          <button data-testid="refresh-btn" onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-black/60 text-sm rounded hover:border-black hover:text-black transition-all">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div data-testid="admin-stats" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total Bookings', value: stats.total_bookings, icon: Calendar },
              { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle },
              { label: 'Completed', value: stats.completed, icon: CheckCircle },
              { label: 'Missed', value: stats.missed, icon: AlertTriangle },
              { label: 'Revenue (Adv)', value: `₹${stats.revenue}`, icon: DollarSign },
            ].map((s, i) => (
              <div key={i} data-testid={`stat-${s.label.toLowerCase().replace(/ /g,'-')}`}
                className="p-4 bg-white border border-gray-200 rounded-xl hover:border-black transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon size={14} className="text-black/60" />
                  <p className="text-xs text-black/40 uppercase tracking-wide font-medium">{s.label}</p>
                </div>
                <p className="font-serif text-2xl text-black">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {[['overview','Bookings'],['customers','Customers']].map(([id,label]) => (
            <button key={id} data-testid={`admin-tab-${id}`} onClick={() => setTab(id)}
              className={`px-4 py-3 text-sm font-semibold transition-colors ${tab === id ? 'text-black border-b-2 border-black' : 'text-black/40 hover:text-black/70'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Bookings Tab */}
        {tab === 'overview' && (
          <div data-testid="admin-bookings-tab">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <select data-testid="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="bg-white border border-gray-200 text-black/70 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-black">
                <option value="">All Statuses</option>
                {['pending_payment','confirmed','completed','missed','cancelled','rebooked'].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                ))}
              </select>
              <button data-testid="process-wallets-btn" onClick={handleProcessWallets}
                className="px-4 py-2 border border-gray-200 text-black/60 text-sm rounded hover:border-black hover:text-black transition-all">
                Process Expired Wallets
              </button>
            </div>

            {bookings.length === 0 ? (
              <p data-testid="no-bookings-admin" className="text-black/30 text-sm text-center py-12">No bookings found</p>
            ) : (
              <div className="space-y-3">
                {bookings.map(b => (
                  <div key={b.booking_id} data-testid={`admin-booking-${b.booking_id}`}
                    className="p-4 sm:p-5 bg-white border border-gray-200 rounded-xl hover:border-gray-400 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-black text-sm">{b.user_name}</p>
                          <span className="text-black/30 text-xs">{b.user_email}</span>
                        </div>
                        <p className="text-black/60 text-sm mt-0.5">
                          {SERVICE_LABELS[b.service]} · {SLOT_LABELS[b.slot_type]} · {b.date} {b.time_slot && b.time_slot !== 'right_now' ? `@ ${b.time_slot}` : ''}
                        </p>
                        <p className="text-xs text-black/30 mt-1">
                          Advance: ₹{b.advance_amount} · Total: ₹{b.total_amount}
                          {b.rebook_deadline && b.status === 'missed' && (
                            <span className="ml-2 text-orange-600">Rebook by: {new Date(b.rebook_deadline).toLocaleDateString()}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-2.5 py-1 text-xs rounded-full border font-semibold ${STATUS_STYLES[b.status] || ''}`}>
                          {b.status.replace(/_/g,' ')}
                        </span>
                        {NEXT_STATUSES[b.status]?.length > 0 && (
                          <div className="flex gap-2">
                            {NEXT_STATUSES[b.status].map(ns => (
                              <button key={ns} data-testid={`action-${b.booking_id}-${ns}`}
                                onClick={() => handleStatusUpdate(b.booking_id, ns)}
                                disabled={updateLoading === b.booking_id}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all disabled:opacity-50 ${
                                  ns === 'completed' ? 'bg-black text-white border-black hover:bg-gray-800' :
                                  ns === 'missed' ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' :
                                  'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                }`}>
                                {updateLoading === b.booking_id ? '...' : ns}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Customers Tab */}
        {tab === 'customers' && (
          <div data-testid="admin-customers-tab">
            {users.length === 0 ? (
              <p className="text-black/30 text-sm text-center py-12">No customers yet</p>
            ) : (
              <div className="space-y-3">
                {users.map(u => (
                  <div key={u.id} data-testid={`customer-${u.id}`} className="p-4 sm:p-5 bg-white border border-gray-200 rounded-xl hover:border-black transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-black text-sm">{u.name}</p>
                        <p className="text-black/40 text-xs mt-0.5">{u.email} · {u.phone}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-black/50">Wallet: <span className="text-black font-bold">₹{(u.wallet_balance || 0).toFixed(0)}</span></span>
                        <span className="text-black/50">Points: <span className="text-black font-bold">{u.rewards_points || 0}</span></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
