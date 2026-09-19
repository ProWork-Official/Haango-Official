import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const AuthContext = createContext(undefined);

async function apiRequest(path, options = {}) {
  const accessToken = localStorage.getItem('haango_access_token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Request failed';
    throw new Error(message);
  }

  return payload?.data ?? payload;
}

function normalizeProfile(user) {
  if (!user) return null;

  return {
    id: user._id || user.id,
    full_name: user.name || user.full_name || 'User',
    name: user.name || user.full_name || 'User',
    email: user.email,
    phone: user.phone,
    user_type: String(user.role || 'CUSTOMER').toLowerCase(),
    role: user.role || 'CUSTOMER',
    is_buddy: Boolean(user.isBuddy || user.is_buddy || user.role === 'BUDDY'),
    dob: user.dateOfBirth || user.dob || null,
    gender: user.gender || 'PREFER_NOT_TO_SAY',
    hobbies: Array.isArray(user.hobbies) ? user.hobbies : [],
    address: user.address || '',
    gallery: Array.isArray(user.gallery) ? user.gallery : [],
    profile_completion: user.profileCompletion || user.profile_completion || 0,
    profile_prompt_dismissed_at: user.profilePromptDismissedAt || user.profile_prompt_dismissed_at || null,
    referral_code: user.referralCode || user.referral_code || '',
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const storeAccessToken = (token) => {
    if (token) {
      localStorage.setItem('haango_access_token', token);
    } else {
      localStorage.removeItem('haango_access_token');
    }
  };

  const hydrateSession = async () => {
    try {
      const storedToken = localStorage.getItem('haango_access_token');
      let activeToken = storedToken;
      let userPayload;

      if (!storedToken) {
        setSession(null);
        setProfile(null);
        return;
      }

      try {
        userPayload = await apiRequest('/auth/me');
      } catch (error) {
        const refreshed = await apiRequest('/auth/refresh', { method: 'POST' });
        activeToken = refreshed?.token || refreshed?.accessToken;

        if (!activeToken) throw error;

        storeAccessToken(activeToken);
        userPayload = refreshed;
      }

      const nextProfile = normalizeProfile(userPayload?.user || userPayload);
      setSession({ user: { id: nextProfile?.id }, token: activeToken });
      setProfile(nextProfile);
    } catch (error) {
      console.warn('Session restore failed:', error.message);
      storeAccessToken(null);
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hydrateSession();
  }, []);

  const signUp = async ({ fullName, email, phone, password, userType, otp, signupCode }) => {
    const payload = {
      name: fullName,
      email,
      phone,
      password,
      role: String(userType || 'customer').toUpperCase(),
      otp,
      signupCode,
    };

    try {
      const response = await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const user = response?.user;
      const token = response?.token || response?.accessToken || null;
      const normalizedUser = normalizeProfile(user);
      storeAccessToken(token);
      setSession({ user: { id: normalizedUser?.id }, token });
      setProfile(normalizedUser);

      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  };

  const requestSignupOtp = async ({ fullName, email, phone, password, userType, signupCode }) => {
    try {
      await apiRequest('/auth/signup/request-otp', {
        method: 'POST',
        body: JSON.stringify({
          name: fullName,
          email,
          phone,
          password,
          role: String(userType || 'customer').toUpperCase(),
          signupCode,
        }),
      });

      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  };

  const requestSignInOtp = async (email) => {
    try {
      await apiRequest('/auth/login/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  };

  const signIn = async (email, password, otp = null) => {
    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, ...(otp ? { otp } : {}) }),
      });

      const user = response?.user;
      const token = response?.token || response?.accessToken || null;
      const normalizedUser = normalizeProfile(user);
      storeAccessToken(token);
      setSession({ user: { id: normalizedUser?.id }, token });
      setProfile(normalizedUser);

      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // ignore logout errors and clear local session state
    }

    storeAccessToken(null);
    setSession(null);
    setProfile(null);
  };

  const updateProfile = async (payload) => {
    try {
      const response = await apiRequest('/profile/me', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const nextProfile = normalizeProfile(response?.user || response);
      setProfile(nextProfile);
      return { error: null, profile: nextProfile };
    } catch (error) {
      return { error: error.message, profile: null };
    }
  };

  const dismissProfilePrompt = async () => {
    try {
      await apiRequest('/profile/dismiss-prompt', { method: 'POST' });
      setProfile((current) => current ? { ...current, profile_prompt_dismissed_at: new Date().toISOString() } : current);
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signUp,
        requestSignupOtp,
        requestSignInOtp,
        signIn,
        signOut,
        updateProfile,
        dismissProfilePrompt,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}
