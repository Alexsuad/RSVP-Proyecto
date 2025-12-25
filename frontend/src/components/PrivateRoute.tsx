
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';


interface PrivateRouteProps {
  children: React.ReactElement;
  adminOnly?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  
  // Decide auth status based on route requirement
  const isAuthorized = adminOnly ? isAdmin : isAuthenticated;

  useEffect(() => {
    if (!isAuthorized) {
       if (adminOnly) {
           window.location.href = '/admin/login.html';
       } else {
           window.location.href = '/app/login.html';
       }
    }
  }, [isAuthorized, adminOnly]);

  if (!isAuthorized) {
    // Render nothing while the redirect occurs.
    return null;
  }

  return children;
};

export default PrivateRoute;
