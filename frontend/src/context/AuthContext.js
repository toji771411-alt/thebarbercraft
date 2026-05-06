import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { setAuthToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  }, []);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setAuthToken(session.access_token);
        fetchProfile(session.user.id).then(profile => {
          setUser({ ...session.user, ...profile });
          setLoading(false);
        });
      } else {
        setAuthToken(null);
        setLoading(false);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        setAuthToken(session.access_token);
        const profile = await fetchProfile(session.user.id);
        setUser({ ...session.user, ...profile });
      } else {
        setAuthToken(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const getHeaders = useCallback(() => {
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, [session]);

  const login = async (email, password) => {
    // Create a timeout promise
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Login timed out. Please check your internet connection or try again.')), 10000)
    );

    try {
      // Race the login against the timeout
      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout
      ]);

      if (error) {
        throw error;
      }
      
      const profile = await fetchProfile(data.user.id);
      const fullUser = { ...data.user, ...profile };
      setUser(fullUser);
      return fullUser;
    } catch (err) {
      throw err;
    }
  };

  const loginWithGoogle = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  }, []);

  const register = useCallback(async (name, email, phone, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, phone: phone }
      }
    });
    if (error) throw error;
    
    // Note: Profile creation should be handled by a Supabase trigger for reliability,
    // but we can also do a manual insert here if needed.
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
  }, []);

  const refreshUser = useCallback(async () => {
    if (session) {
      const profile = await fetchProfile(session.user.id);
      setUser({ ...session.user, ...profile });
    }
  }, [session, fetchProfile]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      loading, 
      login, 
      loginWithGoogle,
      register, 
      logout, 
      getHeaders, 
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

const API = process.env.REACT_APP_API_URL || 'https://barber-craft-backend.onrender.com/api';
export { API };
