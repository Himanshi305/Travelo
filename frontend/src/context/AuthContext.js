'use client';

import React, { createContext, useState, useEffect } from 'react';
import supabase from '../lib/supabase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

const getLiveLocationStorageKey = (userId) => `live_location:${userId || 'guest'}`;
const getLiveLocationPromptSessionKey = (userId) => `live_location_prompted:${userId || 'guest'}`;

const clearClientUserData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('destination');

  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('destination:')) {
      localStorage.removeItem(key);
    }

    if (key.startsWith('live_location:')) {
      localStorage.removeItem(key);
    }
  });

  Object.keys(sessionStorage).forEach((key) => {
    if (key.startsWith('live_location_prompted:')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;

      if (currentUser) {
        const previousAuthUserId = localStorage.getItem('auth_user_id');
        if (previousAuthUserId && previousAuthUserId !== currentUser.id) {
          clearClientUserData();
        }
        localStorage.setItem('auth_user_id', currentUser.id);
      } else {
        localStorage.removeItem('auth_user_id');
      }

      setUser(currentUser);
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const nextUser = session?.user ?? null;

        if (event === 'SIGNED_IN' && nextUser) {
          const previousAuthUserId = localStorage.getItem('auth_user_id');
          if (previousAuthUserId && previousAuthUserId !== nextUser.id) {
            clearClientUserData();
          }
          localStorage.setItem('auth_user_id', nextUser.id);
        }

        setUser(nextUser);

        // Redirect on sign-out
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('auth_user_id');
          clearClientUserData();
          router.push('/login');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    const userId = user?.id;
    const role = String(user?.user_metadata?.role || '').toLowerCase();

    if (!userId || role !== 'user') {
      return;
    }

    if (typeof window === 'undefined' || !window.navigator?.geolocation) {
      return;
    }

    const storageKey = getLiveLocationStorageKey(userId);
    const promptSessionKey = getLiveLocationPromptSessionKey(userId);

    const hasStoredLocation = Boolean(localStorage.getItem(storageKey));
    const alreadyPromptedThisSession = sessionStorage.getItem(promptSessionKey) === '1';

    if (hasStoredLocation || alreadyPromptedThisSession) {
      return;
    }

    sessionStorage.setItem(promptSessionKey, '1');

    const shouldRequestLiveLocation = window.confirm(
      'Allow live location access to show distance from your current location to searched destinations?'
    );

    if (!shouldRequestLiveLocation) {
      return;
    }

    window.navigator.geolocation.getCurrentPosition(
      (position) => {
        const payload = {
          lat: Number(position.coords.latitude),
          lng: Number(position.coords.longitude),
          accuracy: Number(position.coords.accuracy || 0),
          captured_at: new Date().toISOString(),
        };

        localStorage.setItem(storageKey, JSON.stringify(payload));
      },
      () => {
        // User denied or location unavailable. They can enable manually later.
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  }, [user?.id, user?.user_metadata?.role]);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Redirect to dashboard after successful login
      router.push('/dashboard');

      // Save token for backend requests
      const token = data.session.access_token;
      localStorage.setItem('token', token);

      return { success: true };
    } catch (err) {
      console.error(err);
      return {
        success: false,
        error: err?.message || 'Unable to login. Please try again.',
      };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const allowedRoles = ['user', 'admin'];
      const normalizedRole =
        typeof role === 'string' ? role.trim().toLowerCase() : 'user';
      const safeRole = allowedRoles.includes(normalizedRole)
        ? normalizedRole
        : 'user';

      // Prevent previous logged-in user data from bleeding into a new registration flow.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.signOut();
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: safeRole,
          },
        },
      });
      if (error) throw error;
      // You might want to redirect to a "check your email" page
      router.push('/login');
      return { success: true };
    } catch (err) {
      console.error(err);
      return {
        success: false,
        error: err?.message || 'Unable to register. Please try again.',
      };
    }
  };

  const logout = async () => {
  try {
    await supabase.auth.signOut();
    localStorage.removeItem('auth_user_id');
    clearClientUserData();
    setUser(null);
    router.push("/login");
  } catch (err) {
    console.error(err);
  }
};

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
