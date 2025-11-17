
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_KEY = (import.meta as any).env.VITE_ADMIN_KEY;

interface PrivateRouteProps {
  children: React.ReactElement;
  adminOnly?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, adminOnly = false }) => {
  const { isAuthenticated } = useAuth();
  
  // For this MVP, an "admin session" is considered active if the admin key is present in the environment variables.
  // This allows access to admin pages without a separate admin login flow.
  const isAdminSession = !!ADMIN_KEY;

  const isAuthorized = adminOnly ? isAdminSession : isAuthenticated;

  useEffect(() => {
    if (!isAuthorized) {
      window.location.href = '/app/login.html';
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    // Render nothing while the redirect occurs.
    return null;
  }

  return children;
};

export default PrivateRoute;
