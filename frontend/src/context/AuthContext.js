'use client';

import React, { createContext, useState, useEffect } from 'react';
import supabase from '../lib/supabase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_IN') {
          router.push('/dashboard');
        }
        if (event === 'SIGNED_OUT') {
          router.push('/login');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const login = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Save token for backend requests
    const token = data.session.access_token;
    localStorage.setItem("token", token);

  } catch (err) {
    console.error(err);
  }
};

  const register = async (email, password, role) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
          },
        },
      });
      if (error) throw error;
      // You might want to redirect to a "check your email" page
      router.push('/login');
    } catch (err) {
      console.error(err);
    }
  };

  const logout = async () => {
  try {
    await supabase.auth.signOut();
    localStorage.removeItem("token");
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
