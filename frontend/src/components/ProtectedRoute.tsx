import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  component: React.FC;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component }) => {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  console.log('Is Admin:', isAdmin);

  return isAdmin ? <Component /> : <Navigate to="/login" />;
};

export default ProtectedRoute;