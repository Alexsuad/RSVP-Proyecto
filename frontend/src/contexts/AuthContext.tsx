import { createContext, useState, useContext, ReactNode, useMemo } from 'react';
import { 
  getToken, setToken, clearToken, 
  getAdminToken, setAdminToken, clearAdminToken 
} from '@/utils/auth';

interface AuthContextType {
  // Guest State
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;

  // Admin State
  adminToken: string | null;
  isAdmin: boolean;
  adminLogin: (token: string) => void;
  adminLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to decode JWT payload (base64url) safely without external lib for this simple check
const getJwtRole = (token: string | null): string | null => {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.role || null;
  } catch (e) {
    console.error("Failed to decode JWT role", e);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // --- Guest State ---
  const [token, setGuestState] = useState<string | null>(getToken());
  
  const login = (newToken: string) => {
    setToken(newToken);
    setGuestState(newToken);
  };

  const logout = () => {
    clearToken();
    setGuestState(null);
  };

  const isAuthenticated = !!token;

  // --- Admin State ---
  const [adminToken, setAdminState] = useState<string | null>(getAdminToken());

  const adminLogin = (newToken: string) => {
    setAdminToken(newToken);
    setAdminState(newToken);
  };

  const adminLogout = () => {
    clearAdminToken();
    setAdminState(null);
  };

  // Derive isAdmin from token presence AND role claim
  const isAdmin = useMemo(() => {
    if (!adminToken) return false;
    const role = getJwtRole(adminToken);
    return role === 'admin';
  }, [adminToken]);

  return (
    <AuthContext.Provider value={{ 
      token, isAuthenticated, login, logout,
      adminToken, isAdmin, adminLogin, adminLogout
    }}>
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
