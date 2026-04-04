import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import { API_BASE_URL } from "../config";

interface AuthContextType {
  isAuthenticated: boolean;
  userIsAdmin: boolean;
  userIsSuperAdmin: boolean;
  userRole: 'super_admin' | 'admin' | 'user' | null;
  userUsername: string | null;
  userEmail: string | null;
  isLoaded: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userIsAdmin: false,
  userIsSuperAdmin: false,
  userRole: null,
  userUsername: null,
  userEmail: null,
  isLoaded: false,
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, isLoaded, isSignedIn } = useUser();
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'user' | null>(null);
  const [userUsername, setUserUsername] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setUserRole(null);
      setUserUsername(null);
      setUserEmail(null);
      return;
    }

    // PRIMARY: Check Clerk metadata first (faster, more reliable)
    const clerkRole = (user?.publicMetadata as { role?: string })?.role;
    if (clerkRole === 'super_admin') {
      setUserRole('super_admin');
      setUserUsername(user?.username || user?.firstName?.toLowerCase().replace(/\s+/g, '') || null);
      setUserEmail(user?.primaryEmailAddress?.emailAddress || null);
      return;
    }
    
    // If Clerk says admin, still check MongoDB for super_admin status
    if (clerkRole === 'admin') {
      const fetchAndCheckRole = async () => {
        try {
          const res = await axios.get<{ role?: string; username?: string; email?: string }>(`${API_BASE_URL}/users/me?clerkId=${user?.id}`);
          if (res.data?.role === 'super_admin') {
            setUserRole('super_admin');
          } else {
            setUserRole('admin');
          }
          setUserUsername(res.data?.username || user?.username || user?.firstName?.toLowerCase().replace(/\s+/g, '') || null);
          setUserEmail(res.data?.email || user?.primaryEmailAddress?.emailAddress || null);
        } catch {}
      };
      fetchAndCheckRole();
      return;
    }
    
    // FALLBACK: Check MongoDB for non-Clerk metadata users
    const fetchRole = async () => {
      setIsLoading(true);
      const email = user?.primaryEmailAddress?.emailAddress || '';
      setUserEmail(email);
      
      try {
        const res = await axios.get<{ role?: string; username?: string; email?: string }>(`${API_BASE_URL}/users/me?clerkId=${user?.id}&email=${encodeURIComponent(email)}`);
        if (res.data?.role && ['super_admin', 'admin', 'user'].includes(res.data.role)) {
          setUserRole(res.data.role as 'super_admin' | 'admin' | 'user');
        } else {
          setUserRole('user');
        }
        setUserUsername(res.data?.username || user?.username || user?.firstName?.toLowerCase().replace(/\s+/g, '') || null);
      } catch {
        setUserRole('user');
        setUserUsername(user?.username || user?.firstName?.toLowerCase().replace(/\s+/g, '') || null);
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
      userUsername,
      userEmail,
      isLoaded: isLoaded && !isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
