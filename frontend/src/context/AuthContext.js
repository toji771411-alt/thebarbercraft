import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('barber_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('barber_token');
    if (token) {
      axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setUser(r.data))
        .catch(() => localStorage.removeItem('barber_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem('barber_token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, phone, password) => {
    const { data } = await axios.post(`${API}/auth/register`, { name, email, phone, password });
    localStorage.setItem('barber_token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('barber_token');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('barber_token');
    if (!token) return;
    try {
      const { data } = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      setUser(data);
    } catch (_) {}
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, getHeaders, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { API };
