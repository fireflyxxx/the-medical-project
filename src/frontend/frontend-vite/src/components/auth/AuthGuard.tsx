import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useStore';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'doctor' | 'tech')[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, allowedRoles }) => {
  const { token, role } = useAuthStore();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to the appropriate dashboard based on their actual role
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'doctor') return <Navigate to="/doctor" replace />;
    if (role === 'tech') return <Navigate to="/tech" replace />;
    
    // Fallback
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
