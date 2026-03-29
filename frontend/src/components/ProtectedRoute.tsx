import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

interface ProtectedRouteProps {
  component: React.FC;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component }) => {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center">
        <div className="text-slate-500 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/login" replace />;

  const isAdmin = (user?.publicMetadata as { role?: string })?.role === 'admin';
  if (!isAdmin) return <Navigate to="/user" replace />;

  return <Component />;
};

export default ProtectedRoute;
