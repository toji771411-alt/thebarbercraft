import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, LayoutDashboard, LogOut, Shield } from 'lucide-react';
import AuthModal from './AuthModal';
import logo from '../assets/logo.png';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); };

  const openAuth = (tab = 'login') => { setAuthTab(tab); setAuthOpen(true); setMenuOpen(false); };

  return (
    <>
      <nav data-testid="navbar" className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-black/8 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" data-testid="nav-logo" className="flex items-center gap-2.5 group">
            <img src={logo} alt="The Barber Craft" className="h-10 w-auto object-contain" />
          </Link>



          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="/#services" className="text-sm text-black/60 hover:text-black transition-colors tracking-wide font-medium">Services</a>
            <a href="/#rewards" className="text-sm text-black/60 hover:text-black transition-colors tracking-wide font-medium">Rewards</a>
            <a href="/#policies" className="text-sm text-black/60 hover:text-black transition-colors tracking-wide font-medium">Policies</a>
            {user ? (
              <>
                {user.role === 'admin' ? (
                  <Link to="/admin" data-testid="admin-link" className="flex items-center gap-1.5 text-sm text-black/60 hover:text-black transition-colors font-medium">
                    <Shield size={14} /> Admin
                  </Link>
                ) : (
                  <Link to="/dashboard" data-testid="dashboard-link" className="flex items-center gap-1.5 text-sm text-black/60 hover:text-black transition-colors font-medium">
                    <LayoutDashboard size={14} /> Dashboard
                  </Link>
                )}
                <Link to="/book" data-testid="book-now-btn-nav"
                  className="px-5 py-2 bg-black text-white text-sm font-semibold rounded hover:bg-gray-800 transition-all active:scale-95 tracking-wide">
                  Book Now
                </Link>
                <button data-testid="logout-btn" onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-black/40 hover:text-black transition-colors">
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <>
                <button data-testid="login-btn-nav" onClick={() => openAuth('login')} className="text-sm text-black/60 hover:text-black transition-colors tracking-wide font-medium">
                  Login
                </button>
                <button data-testid="book-now-btn-nav-guest" onClick={() => openAuth('register')}
                  className="px-5 py-2 bg-black text-white text-sm font-semibold rounded hover:bg-gray-800 transition-all active:scale-95 tracking-wide">
                  Book Now
                </button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button data-testid="mobile-menu-btn" className="md:hidden text-black/60 hover:text-black" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-black/8 px-4 py-4 flex flex-col gap-4">
            <a href="/#services" onClick={() => setMenuOpen(false)} className="text-sm text-black/60 font-medium">Services</a>
            <a href="/#rewards" onClick={() => setMenuOpen(false)} className="text-sm text-black/60 font-medium">Rewards</a>
            <a href="/#policies" onClick={() => setMenuOpen(false)} className="text-sm text-black/60 font-medium">Policies</a>
            {user ? (
              <>
                {user.role === 'admin' ? (
                  <Link to="/admin" onClick={() => setMenuOpen(false)} className="text-sm text-black font-semibold">Admin Panel</Link>
                ) : (
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="text-sm text-black/60 font-medium">Dashboard</Link>
                )}
                <Link to="/book" onClick={() => setMenuOpen(false)} className="px-4 py-2 bg-black text-white text-sm font-semibold rounded text-center">Book Now</Link>
                <button onClick={handleLogout} className="text-sm text-black/40 text-left">Logout</button>
              </>
            ) : (
              <>
                <button onClick={() => openAuth('login')} className="text-sm text-black/60 text-left font-medium">Login</button>
                <button onClick={() => openAuth('register')} className="px-4 py-2 bg-black text-white text-sm font-semibold rounded">Register & Book</button>
              </>
            )}
          </div>
        )}
      </nav>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />
    </>
  );
}
