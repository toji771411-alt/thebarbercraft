import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import logo from '../assets/logo.png';


export default function AuthModal({ open, onClose, defaultTab = 'login' }) {
  const [tab, setTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPw, setRegPw] = useState('');

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const reset = () => {
    setError(''); setLoginEmail(''); setLoginPw('');
    setRegName(''); setRegEmail(''); setRegPhone(''); setRegPw('');
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const user = await login(loginEmail, loginPw);
      onClose(); reset();
      if (user.role === 'admin') navigate('/admin'); else navigate('/dashboard');
    } catch (err) {
      const d = err?.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regPw.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      await register(regName, regEmail, regPhone, regPw);
      onClose(); reset(); navigate('/dashboard');
    } catch (err) {
      const d = err?.response?.data?.detail;
      setError(typeof d === 'string' ? d : Array.isArray(d) ? d.map(x => x.msg).join(', ') : 'Registration failed');
    } finally { setLoading(false); }
  };

  const switchTab = (t) => { setTab(t); setError(''); };

  const inputClass = "w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-black text-sm placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="bg-white border border-gray-200 text-black max-w-md w-full p-0 overflow-hidden rounded-xl shadow-2xl">
        <DialogTitle className="sr-only">{tab === 'login' ? 'Login' : 'Register'}</DialogTitle>
        <DialogDescription className="sr-only">{tab === 'login' ? 'Sign in to your account' : 'Create a new account'}</DialogDescription>

        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center border-b border-gray-100">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="The Barber Craft" className="h-14 w-auto object-contain" />
          </div>

          <h2 className="font-serif text-2xl text-black mt-2">
            {tab === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button data-testid="tab-login" onClick={() => switchTab('login')}
            className={`flex-1 py-3 text-sm font-semibold tracking-wide transition-colors ${tab === 'login' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}>
            Login
          </button>
          <button data-testid="tab-register" onClick={() => switchTab('register')}
            className={`flex-1 py-3 text-sm font-semibold tracking-wide transition-colors ${tab === 'register' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}>
            Register
          </button>
        </div>

        <div className="px-8 py-6">
          {error && (
            <div data-testid="auth-error" className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} data-testid="login-form" className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5 font-semibold">Email</label>
                <input data-testid="login-email" type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  placeholder="your@email.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5 font-semibold">Password</label>
                <div className="relative">
                  <input data-testid="login-password" type={showPw ? 'text' : 'password'} required value={loginPw} onChange={e => setLoginPw(e.target.value)}
                    placeholder="••••••••" className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <button data-testid="login-submit-btn" type="submit" disabled={loading}
                className="w-full py-3 bg-black text-white font-semibold text-sm rounded-lg hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 tracking-wide mt-2">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} data-testid="register-form" className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5 font-semibold">Full Name</label>
                <input data-testid="reg-name" type="text" required value={regName} onChange={e => setRegName(e.target.value)}
                  placeholder="John Doe" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5 font-semibold">Email</label>
                <input data-testid="reg-email" type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)}
                  placeholder="your@email.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5 font-semibold">Phone</label>
                <input data-testid="reg-phone" type="tel" required value={regPhone} onChange={e => setRegPhone(e.target.value)}
                  placeholder="+91 99999 99999" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5 font-semibold">Password</label>
                <div className="relative">
                  <input data-testid="reg-password" type={showPw ? 'text' : 'password'} required value={regPw} onChange={e => setRegPw(e.target.value)}
                    placeholder="Min 6 characters" className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <button data-testid="register-submit-btn" type="submit" disabled={loading}
                className="w-full py-3 bg-black text-white font-semibold text-sm rounded-lg hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 tracking-wide mt-2">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
