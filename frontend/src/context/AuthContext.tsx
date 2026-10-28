import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isGoogleConfigured: boolean;
  googleClientId: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<void>;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleConfigured, setIsGoogleConfigured] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  const checkAuthStatus = async () => {
    try {
      // 1. Fetch server config status
      const statusRes = await api.get<{ googleOAuthConfigured: boolean; googleClientId: string | null }>(
        '/auth/status'
      );
      setIsGoogleConfigured(statusRes.googleOAuthConfigured);
      setGoogleClientId(statusRes.googleClientId);

      // 2. Fetch current user session
      const meRes = await api.get<{ user: User }>('/auth/me');
      setUser(meRes.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.post<{ user: User; token: string }>('/auth/login', {
        identifier,
        password,
      });
      if (data.token) {
        api.setToken(data.token);
      }
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    name: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ user: User; token: string }>('/auth/register', data);
      if (res.token) {
        api.setToken(res.token);
      }
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogleCredential = async (credential: string) => {
    setIsLoading(true);
    try {
      const data = await api.post<{ user: User; token: string }>('/auth/google/token', { credential });
      if (data.token) {
        api.setToken(data.token);
      }
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      api.setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const meRes = await api.get<{ user: User }>('/auth/me');
      setUser(meRes.user);
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isGoogleConfigured,
        googleClientId,
        login,
        register,
        loginWithGoogleCredential,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

