import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  component: React.FC;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component }) => {
  const { isLoaded, isSignedIn } = useUser();
  const { userIsAdmin, isLoaded: authLoaded } = useAuth();

  if (!isLoaded || !authLoaded) {
    return (
      <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center">
        <div className="text-slate-500 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/login" replace />;
  if (!userIsAdmin) return <Navigate to="/user" replace />;

  return <Component />;
};

export default ProtectedRoute;
