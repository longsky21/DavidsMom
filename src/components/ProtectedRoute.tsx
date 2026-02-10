import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useStore from '@/store/useStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = useStore((state: any) => state.token);
  const location = useLocation();

  if (!token) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
