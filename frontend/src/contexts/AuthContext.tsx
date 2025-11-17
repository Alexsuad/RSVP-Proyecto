
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { getToken, setToken, clearToken } from '@/utils/auth';

interface AuthContextType {
  token: string | null;
  isAdmin: boolean;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setAuthState] = useState<string | null>(getToken());

  // A simple way to check for admin "role" for the MVP.
  // In a real app, this would come from the JWT payload.
  const isAdmin = token === 'admin_placeholder_token';

  const login = (newToken: string) => {
    setToken(newToken);
    setAuthState(newToken);
  };

  const logout = () => {
    clearToken();
    setAuthState(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
