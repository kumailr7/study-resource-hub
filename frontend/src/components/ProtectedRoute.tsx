import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  isAdmin?: boolean;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ isAdmin = false, children }) => {
  const { isAuthenticated, userIsAdmin } = useAuth();

  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // If the route requires admin privileges but the user is not an admin, redirect to /user
  if (isAdmin && !userIsAdmin) {
    return <Navigate to="/user" />;
  }

  // Otherwise, render the children
  return <>{children}</>;
};

export default ProtectedRoute;