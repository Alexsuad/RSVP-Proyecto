
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader } from './common';


interface PrivateRouteProps {
  children: React.ReactElement;
  adminOnly?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  
  // Decide auth status based on route requirement
  const isAuthorized = adminOnly ? isAdmin : isAuthenticated;

  useEffect(() => {
    // Only redirect if NOT loading and NOT authorized
    if (!isLoading && !isAuthorized) {
       if (adminOnly) {
           window.location.href = '/admin/login.html';
       } else {
           window.location.href = '/app/login.html';
       }
    }
  }, [isLoading, isAuthorized, adminOnly]);

  if (isLoading) {
      return (
          <div className="flex justify-center items-center h-screen bg-gray-50">
              <Loader />
          </div>
      );
  }

  if (!isAuthorized) {
    // Render nothing while the redirect occurs.
    return null;
  }

  return children;
};

export default PrivateRoute;
