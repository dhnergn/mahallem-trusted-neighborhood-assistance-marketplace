import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, PublicTrustProfile } from '../types/index.ts';
import { api, getStoredToken, setStoredToken } from '../api/client.ts';

interface AuthContextType {
  user: User | null;
  trustProfile: PublicTrustProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requestOtp: (identifier: string, type: 'phone' | 'email') => Promise<{ success: boolean; message: string; debugCode?: string }>;
  verifyOtp: (identifier: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  switchAccount: (targetUserId: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [trustProfile, setTrustProfile] = useState<PublicTrustProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshAuth = useCallback(async () => {
    try {
      const token = getStoredToken();
      if (!token) {
        // Automatically default to demo session if none is stored
        setStoredToken('demo_session_deniz_kaya');
      }

      const res = await api.getMe();
      if (res.authenticated && res.user && res.trustProfile) {
        setUser(res.user);
        setTrustProfile(res.trustProfile);
      } else {
        setUser(null);
        setTrustProfile(null);
      }
    } catch {
      setUser(null);
      setTrustProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const requestOtp = async (identifier: string, type: 'phone' | 'email') => {
    return await api.requestOtp(identifier, type);
  };

  const verifyOtp = async (identifier: string, code: string) => {
    setIsLoading(true);
    try {
      const res = await api.verifyOtp(identifier, code);
      setStoredToken(res.token);
      setUser(res.user);
      setTrustProfile(res.trustProfile);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setStoredToken(null);
      setUser(null);
      setTrustProfile(null);
      setIsLoading(false);
    }
  };

  const switchAccount = async (targetUserId: string) => {
    setIsLoading(true);
    try {
      const res = await api.switchAccount(targetUserId);
      setStoredToken(res.token);
      setUser(res.user);
      setTrustProfile(res.trustProfile);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        trustProfile,
        isAuthenticated: !!user,
        isLoading,
        requestOtp,
        verifyOtp,
        logout,
        switchAccount,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
