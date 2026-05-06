import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { Users, Calendar, CheckCircle, AlertTriangle, DollarSign, RefreshCw, UserPlus, Clock, Check, History, X, Trash2, Search, Star } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';

const STATUS_STYLES = {
  pending_approval: 'bg-blue-50 text-blue-700 border-blue-200',
  pending_payment: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-black/5 text-black border-black/20',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  missed: 'bg-orange-50 text-orange-600 border-orange-200',
  rebooked: 'bg-blue-50 text-blue-600 border-blue-200',
  wallet_transferred: 'bg-purple-50 text-purple-600 border-purple-200',
};

const SERVICES = [
  { id: 'haircut', name: 'Haircut', price: 300 },
  { id: 'beard', name: 'Beard Styling', price: 200 },
  { id: 'combo', name: 'Haircut + Beard Combo', price: 400 },
  { id: 'manicure', name: 'Manicure', price: 250 },
  { id: 'pedicure', name: 'Pedicure', price: 300 },
  { id: 'curly_hair', name: 'Curly Hair Styling', price: 450 },
];

const SLOT_TYPES = [
  { id: 'standard', name: 'Standard' },
  { id: 'emergency_morning', name: 'Morning Emergency' },
  { id: 'emergency_night', name: 'Night Emergency' },
  { id: 'right_now', name: 'Right Now' },
];

const BARBERS = [
  { id: 'Any Available', name: 'Any Available' },
  { id: 'Lucky', name: 'Lucky' },
];

const SERVICE_LABELS = { 
  haircut: 'Haircut', 
  beard: 'Beard Styling', 
  combo: 'Haircut + Beard Combo',
  manicure: 'Manicure',
  pedicure: 'Pedicure',
  curly_hair: 'Curly Hair Styling'
};
const SLOT_LABELS = { standard: 'Std', emergency_morning: 'Emrg AM', emergency_night: 'Emrg PM', right_now: 'Right Now' };
const NEXT_STATUSES = {
  pending_approval: ['pending_payment', 'cancelled'],
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'missed', 'cancelled'],
  missed: ['cancelled'],
};

const formatTime = (t24) => {
  if (!t24 || t24 === 'right_now') return t24;
  const [h, m] = t24.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
};

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [userFilter, setUserFilter] = useState(null); // {id, name}
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [updateLoading, setUpdateLoading] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Admin Booking Form State
  const [newBooking, setNewBooking] = useState({
    client_name: '',
    service: 'haircut',
    barber: 'Any Available',
    slot_type: 'standard',
    date: format(new Date(), 'yyyy-MM-dd'),
    time_slot: ''
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editWallet, setEditWallet] = useState('');
  const [editPoints, setEditPoints] = useState('');
  const [editMembership, setEditMembership] = useState({
    is_subscriber: false,
    subscription_expiry: '',
    haircuts_left: 0,
    beard_trims_left: 0
  });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, b, u] = await Promise.all([
        api.adminStats(), 
        api.adminBookings(statusFilter, userFilter?.id), 
        api.adminUsers()
      ]);
      setStats(s); setBookings(b); setUsers(u);
    } catch (_) {}
    setLoading(false);
  }, [statusFilter, userFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (tab !== 'new_booking' || !newBooking.date || !newBooking.slot_type || newBooking.slot_type === 'right_now') return;
    setSlotsLoading(true);
    api.getSlots(newBooking.date, newBooking.slot_type)
      .then(d => setAvailableSlots(d.slots || []))
      .catch(() => setAvailableSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [tab, newBooking.date, newBooking.slot_type]);

  const handleStatusUpdate = async (bookingId, newStatus) => {
    setUpdateLoading(bookingId);
    try { await api.adminUpdateBooking(bookingId, newStatus); showToast(`Marked as ${newStatus}`); fetchData(); }
    catch (err) { showToast(err?.response?.data?.detail || 'Update failed'); }
    finally { setUpdateLoading(''); }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking? This action cannot be undone.')) return;
    setUpdateLoading(bookingId);
    try {
      await api.adminDeleteBooking(bookingId);
      showToast('Booking deleted successfully');
      fetchData();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Delete failed');
    } finally {
      setUpdateLoading('');
    }
  };

  const handleUpdateUser = async (userId) => {
    setUpdateLoading(userId);
    try {
      await Promise.all([
        api.adminUpdateWallet(userId, parseFloat(editWallet)),
        api.adminUpdateRewards(userId, parseInt(editPoints)),
        api.adminUpdateMembership(userId, editMembership)
      ]);
      showToast('User updated successfully');
      setEditingUser(null);
      fetchData();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Update failed');
    } finally {
      setUpdateLoading('');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    const confirmed = window.confirm(`DANGER: Are you sure you want to delete ${userName}? This will permanently erase their entire history, bookings, wallet, and rewards. This action cannot be undone.`);
    if (!confirmed) return;

    setUpdateLoading(userId);
    try {
      await api.adminDeleteUser(userId);
      showToast('User and all data deleted successfully');
      fetchData();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Delete failed');
    } finally {
      setUpdateLoading('');
    }
  };

  const handleProcessWallets = async () => {
    try { const r = await api.processExpiredWallets(); showToast(r.message); fetchData(); }
    catch (_) { showToast('Failed to process wallets'); }
  };

  const handleAdminBooking = async (e) => {
    e.preventDefault();
    if (!newBooking.client_name) return showToast('Client name is required');
    if (newBooking.slot_type !== 'right_now' && !newBooking.time_slot) return showToast('Please select a time slot');
    
    setUpdateLoading('submitting_booking');
    try {
      await api.createBooking({
        ...newBooking,
        time_slot: newBooking.slot_type === 'right_now' ? 'right_now' : newBooking.time_slot
      });
      showToast('Manual booking created successfully');
      setNewBooking({
        client_name: '',
        service: 'haircut',
        barber: 'Any Available',
        slot_type: 'standard',
        date: format(new Date(), 'yyyy-MM-dd'),
        time_slot: ''
      });
      setTab('overview');
      fetchData();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Booking failed');
    } finally {
      setUpdateLoading('');
    }
  };

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

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-black/40 font-semibold mb-1">Admin Panel</p>
            <h1 className="font-serif text-3xl sm:text-4xl text-black">The Barber Craft</h1>
          </div>
          <div className="flex gap-2">
            <button data-testid="new-booking-btn" onClick={() => setTab('new_booking')}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-all">
              <UserPlus size={14} /> New Booking
            </button>
            <button data-testid="refresh-btn" onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-black/60 text-sm rounded-lg hover:border-black hover:text-black transition-all">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && tab !== 'new_booking' && (
          <div data-testid="admin-stats" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total Bookings', value: stats.total_bookings, icon: Calendar },
              { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle },
              { label: 'Completed', value: stats.completed, icon: CheckCircle },
              { label: 'Total Customers', value: stats.customers, icon: Users },
              { label: 'Active Members', value: stats.active_members, icon: Star },
              { label: 'Revenue (Adv)', value: `₹${stats.revenue}`, icon: DollarSign },
              { label: 'Pts Issued', value: stats.points_issued, icon: RefreshCw },
              { label: 'Pts Redeemed', value: stats.points_redeemed, icon: RefreshCw },
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
          {[
            ['overview','Bookings'],
            ['customers','Customers'],
            ['new_booking','New Booking']
          ].map(([id,label]) => (
            <button key={id} data-testid={`admin-tab-${id}`} onClick={() => setTab(id)}
              className={`px-4 py-3 text-sm font-semibold transition-colors ${tab === id ? 'text-black border-b-2 border-black' : 'text-black/40 hover:text-black/70'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Bookings Tab */}
        {tab === 'overview' && (
          <div data-testid="admin-bookings-tab">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex flex-wrap items-center gap-3">
                <select data-testid="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="bg-white border border-gray-200 text-black/70 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-black">
                  <option value="">All Statuses</option>
                  {['pending_approval','pending_payment','confirmed','completed','missed','cancelled','rebooked'].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                  ))}
                </select>
                {userFilter && (
                  <div className="flex items-center gap-2 bg-black text-white px-3 py-2 rounded-lg text-sm font-semibold">
                    <span>History: {userFilter.name}</span>
                    <button onClick={() => setUserFilter(null)} className="hover:text-gray-300">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
              <button data-testid="process-wallets-btn" onClick={handleProcessWallets}
                className="px-4 py-2 border border-gray-200 text-black/60 text-sm rounded-lg hover:border-black hover:text-black transition-all">
                Process Expired Wallets
              </button>
            </div>

            {bookings.length === 0 ? (
              <p data-testid="no-bookings-admin" className="text-black/30 text-sm text-center py-12">No bookings found</p>
            ) : (
              <div className="space-y-3">
                {bookings.map(b => (
                  <div key={b.booking_id} data-testid={`admin-booking-${b.booking_id}`}
                    className="p-4 sm:p-5 bg-white border border-gray-200 rounded-xl hover:border-gray-400 transition-all relative overflow-hidden">
                    {b.booked_by_admin && (
                      <div className="absolute top-0 right-0 px-3 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-bl-lg">
                        Admin Manual Booking
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-black text-sm">{b.user_name}</p>
                          <span className="text-black/30 text-xs">{b.user_email}</span>
                        </div>
                        <p className="text-black/60 text-sm mt-0.5">
                          {SERVICE_LABELS[b.service]} · {b.barber || 'Any Available'} · {SLOT_LABELS[b.slot_type]} · {b.date} {b.time_slot && b.time_slot !== 'right_now' ? `@ ${formatTime(b.time_slot)}` : ''}
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
                                  ns === 'pending_payment' ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' :
                                  ns === 'confirmed' ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' :
                                  ns === 'completed' ? 'bg-black text-white border-black hover:bg-gray-800' :
                                  ns === 'missed' ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' :
                                  'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                }`}>
                                {updateLoading === b.booking_id ? '...' : (ns === 'pending_payment' ? 'Approve' : ns)}
                              </button>
                            ))}
                          </div>
                        )}
                        <button 
                          onClick={() => handleDeleteBooking(b.booking_id)}
                          disabled={updateLoading === b.booking_id}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Booking"
                        >
                          <Trash2 size={16} />
                        </button>
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
            <div className="mb-6 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-black/30" />
              </div>
              <input 
                type="text" 
                placeholder="Search customers by name, email or phone..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-all"
              />
            </div>

            {users.filter(u => 
              u.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
              u.email.toLowerCase().includes(customerSearch.toLowerCase()) || 
              u.phone.includes(customerSearch)
            ).length === 0 ? (
              <p className="text-black/30 text-sm text-center py-12">No customers found</p>
            ) : (
              <div className="space-y-3">
                {users.filter(u => 
                  u.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                  u.email.toLowerCase().includes(customerSearch.toLowerCase()) || 
                  u.phone.includes(customerSearch)
                ).map(u => (
                  <div key={u.id} data-testid={`customer-${u.id}`} className="p-4 sm:p-5 bg-white border border-gray-200 rounded-xl hover:border-black transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-black text-sm">{u.name}</p>
                          <button onClick={() => { setUserFilter({id: u.id, name: u.name}); setTab('overview'); }}
                            className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-black/60 text-[10px] font-bold uppercase rounded hover:bg-black hover:text-white transition-all">
                            <History size={10} /> View History
                          </button>
                        </div>
                        <p className="text-black/40 text-xs mt-0.5">{u.email} · {u.phone}</p>
                      </div>
                      
                      {editingUser === u.id ? (
                        <div className="w-full space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-[10px] uppercase tracking-wider text-black/40 mb-1 font-bold">Wallet (₹)</label>
                              <input type="number" value={editWallet} onChange={e => setEditWallet(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded px-2 py-2 text-sm focus:outline-none focus:border-black" />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase tracking-wider text-black/40 mb-1 font-bold">Points</label>
                              <input type="number" value={editPoints} onChange={e => setEditPoints(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded px-2 py-2 text-sm focus:outline-none focus:border-black" />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase tracking-wider text-black/40 mb-1 font-bold">Haircuts</label>
                              <input type="number" value={editMembership.haircuts_left} onChange={e => setEditMembership({...editMembership, haircuts_left: parseInt(e.target.value)})}
                                className="w-full bg-white border border-gray-200 rounded px-2 py-2 text-sm focus:outline-none focus:border-black" />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase tracking-wider text-black/40 mb-1 font-bold">Beard Trims</label>
                              <input type="number" value={editMembership.beard_trims_left} onChange={e => setEditMembership({...editMembership, beard_trims_left: parseInt(e.target.value)})}
                                className="w-full bg-white border border-gray-200 rounded px-2 py-2 text-sm focus:outline-none focus:border-black" />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                              <input type="checkbox" id="is_sub" checked={editMembership.is_subscriber} onChange={e => setEditMembership({...editMembership, is_subscriber: e.target.checked})}
                                className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black" />
                              <label htmlFor="is_sub" className="text-xs font-bold text-black uppercase tracking-wider">Active Member</label>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase tracking-wider text-black/40 mb-1 font-bold">Expiry Date</label>
                              <input type="date" value={editMembership.subscription_expiry?.split('T')[0] || ''} onChange={e => setEditMembership({...editMembership, subscription_expiry: e.target.value})}
                                className="w-full bg-white border border-gray-200 rounded px-2 py-2 text-sm focus:outline-none focus:border-black" />
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <button 
                              type="button"
                              onClick={() => {
                                const newExpiry = new Date();
                                newExpiry.setDate(newExpiry.getDate() + 30);
                                setEditMembership({
                                  is_subscriber: true,
                                  subscription_expiry: newExpiry.toISOString(),
                                  haircuts_left: 2,
                                  beard_trims_left: 1
                                });
                              }}
                              className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              Renew Subscription (+30 Days)
                            </button>
                            <div className="flex gap-2">
                              <button onClick={() => setEditingUser(null)}
                                className="px-4 py-2 border border-gray-200 text-black text-[10px] font-bold uppercase rounded-lg hover:border-black transition-all">
                                Cancel
                              </button>
                              <button onClick={() => handleUpdateUser(u.id)} disabled={updateLoading === u.id}
                                className="px-6 py-2 bg-black text-white text-[10px] font-bold uppercase rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all">
                                {updateLoading === u.id ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-black/40 mb-0.5 font-medium">Membership</p>
                            <p className={`text-sm font-bold ${u.is_subscriber ? 'text-green-600' : 'text-black/20'}`}>
                              {u.is_subscriber ? 'Active' : 'None'}
                            </p>
                            {u.is_subscriber && (
                              <p className="text-[9px] text-black/40 font-bold">
                                {u.haircuts_left}H / {u.beard_trims_left}B left
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-black/40 mb-0.5 font-medium">Wallet Balance</p>
                            <p className="text-sm font-bold text-black">₹{(u.wallet_balance || 0).toFixed(0)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-black/40 mb-0.5 font-medium">Rewards Points</p>
                            <p className="text-sm font-bold text-black">{u.rewards_points || 0}</p>
                          </div>
                          <button onClick={() => {
                            setEditingUser(u.id);
                            setEditWallet(u.wallet_balance || 0);
                            setEditPoints(u.rewards_points || 0);
                            setEditMembership({
                              is_subscriber: u.is_subscriber || false,
                              subscription_expiry: u.subscription_expiry || '',
                              haircuts_left: u.haircuts_left || 0,
                              beard_trims_left: u.beard_trims_left || 0
                            });
                          }} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Edit User">
                            <Users size={16} className="text-black/60" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            disabled={updateLoading === u.id}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                            title="Delete User & History"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* New Booking Tab */}
        {tab === 'new_booking' && (
          <div data-testid="admin-new-booking-tab" className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-10 shadow-sm">
            <div className="max-w-2xl">
              <h2 className="font-serif text-2xl text-black mb-1">Manual Client Booking</h2>
              <p className="text-black/40 text-sm mb-8 font-medium uppercase tracking-wider">Book an appointment for a walk-in or phone-in client</p>

              <form onSubmit={handleAdminBooking} className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-black/40 font-bold mb-2">Client Name</label>
                  <input type="text" placeholder="Enter client's full name"
                    value={newBooking.client_name} onChange={e => setNewBooking({...newBooking, client_name: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition-all" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-black/40 font-bold mb-2">Service</label>
                    <select value={newBooking.service} onChange={e => setNewBooking({...newBooking, service: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition-all">
                      {SERVICES.map(s => <option key={s.id} value={s.id}>{s.name} (₹{s.price})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-black/40 font-bold mb-2">Barber</label>
                    <select value={newBooking.barber} onChange={e => setNewBooking({...newBooking, barber: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition-all">
                      {BARBERS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-black/40 font-bold mb-2">Slot Type</label>
                    <select value={newBooking.slot_type} onChange={e => setNewBooking({...newBooking, slot_type: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition-all">
                      {SLOT_TYPES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-black/40 font-bold mb-2">Date</label>
                    <input type="date" value={newBooking.date} onChange={e => setNewBooking({...newBooking, date: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition-all" />
                  </div>
                </div>

                {newBooking.slot_type !== 'right_now' && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-black/40 font-bold mb-3">Available Time Slots</label>
                    {slotsLoading ? (
                      <div className="flex items-center gap-2 text-black/40 text-xs py-2"><RefreshCw size={12} className="animate-spin" /> Loading slots...</div>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-orange-600 text-xs bg-orange-50 p-3 rounded-lg border border-orange-100">No slots available for this date/type.</p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {availableSlots.map(s => (
                          <button key={s.time} type="button" disabled={!s.available}
                            onClick={() => setNewBooking({...newBooking, time_slot: s.time})}
                            className={`py-2 rounded-lg text-[10px] font-bold border-2 transition-all 
                              ${!s.available ? 'bg-gray-50 text-black/10 border-transparent cursor-not-allowed' :
                                newBooking.time_slot === s.time ? 'bg-black border-black text-white' : 'bg-white border-gray-100 hover:border-black text-black/60'}`}>
                            {formatTime(s.time)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-4">
                  <button type="submit" disabled={updateLoading === 'submitting_booking'}
                    className="w-full sm:w-auto px-10 py-3.5 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50">
                    {updateLoading === 'submitting_booking' ? 'Creating...' : 'Confirm Manual Booking'}
                  </button>
                  <button type="button" onClick={() => setTab('overview')}
                    className="w-full sm:w-auto px-8 py-3.5 text-black/40 text-xs font-bold uppercase tracking-widest rounded-xl hover:text-black transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
