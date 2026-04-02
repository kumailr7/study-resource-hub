import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  component: React.FC;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component }) => {
  const { isLoaded, isSignedIn } = useUser();
  const { userIsAdmin, userRole, isLoaded: authLoaded } = useAuth();

  useEffect(() => {
    console.log('🔒 ProtectedRoute check:', { isSignedIn, isLoaded, authLoaded, userRole, userIsAdmin });
  }, [isSignedIn, isLoaded, authLoaded, userRole, userIsAdmin]);

  if (!isLoaded || !authLoaded) {
    console.log('⏳ ProtectedRoute: Loading...');
    return (
      <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center">
        <div className="text-slate-500 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    console.log('🚫 ProtectedRoute: Not signed in, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (!userIsAdmin) {
    console.log('🚫 ProtectedRoute: Not admin, redirecting to user. userRole:', userRole);
    return <Navigate to="/user" replace />;
  }

  console.log('✅ ProtectedRoute: Access granted');
  return <Component />;
};

export default ProtectedRoute;
