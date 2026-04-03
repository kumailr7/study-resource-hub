import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import { API_BASE_URL } from "../config";

interface AuthContextType {
  isAuthenticated: boolean;
  userIsAdmin: boolean;
  userIsSuperAdmin: boolean;
  userRole: 'super_admin' | 'admin' | 'user' | null;
  isLoaded: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userIsAdmin: false,
  userIsSuperAdmin: false,
  userRole: null,
  isLoaded: false,
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, isLoaded, isSignedIn } = useUser();
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'user' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setUserRole(null);
      return;
    }

    // PRIMARY: Check Clerk metadata first (faster, more reliable)
    const clerkRole = (user?.publicMetadata as { role?: string })?.role;
    if (clerkRole === 'super_admin') {
      setUserRole('super_admin');
      return;
    }
    
    // If Clerk says admin, still check MongoDB for super_admin status
    if (clerkRole === 'admin') {
      // Check MongoDB - if super_admin there, use that
      try {
        const res = await axios.get<{ role?: string }>(`${API_BASE_URL}/users/me?clerkId=${user?.id}`);
        if (res.data?.role === 'super_admin') {
          setUserRole('super_admin');
          return;
        }
      } catch {}
      setUserRole('admin');
      return;
    }
    
    // FALLBACK: Check MongoDB for non-Clerk metadata users
    const fetchRole = async () => {
      setIsLoading(true);
      const userEmail = user?.primaryEmailAddress?.emailAddress || '';
      
      try {
        const res = await axios.get<{ role?: string }>(`${API_BASE_URL}/users/me?clerkId=${user?.id}&email=${encodeURIComponent(userEmail)}`);
        if (res.data?.role && ['super_admin', 'admin', 'user'].includes(res.data.role)) {
          setUserRole(res.data.role as 'super_admin' | 'admin' | 'user');
        } else {
          setUserRole('user');
        }
      } catch {
        setUserRole('user');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRole();
  }, [user, isLoaded, isSignedIn]);

  const userIsAdmin = userRole === 'admin' || userRole === 'super_admin';
  const userIsSuperAdmin = userRole === 'super_admin';

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!isSignedIn,
      userIsAdmin,
      userIsSuperAdmin,
      userRole,
      isLoaded: isLoaded && !isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
