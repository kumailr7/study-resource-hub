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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncAndGetRole = async () => {
      if (!user?.id) {
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      try {
        const userEmail = user.primaryEmailAddress?.emailAddress || '';
        console.log('🔐 Syncing user - Clerk ID:', user.id, '| Email:', userEmail);
        
        // First, sync user to MongoDB
        try {
          await axios.post(`${API_BASE_URL}/users/sync`, {
            clerkId: user.id,
            email: userEmail,
            name: user.fullName || user.username || '',
          });
          console.log('✅ User synced to MongoDB');
        } catch (syncErr: any) {
          console.warn('⚠️ Sync failed:', syncErr.message);
        }

        // Then get role from MongoDB (with email fallback)
        const res = await axios.get<{ role?: string; clerkId?: string; email?: string }>(`${API_BASE_URL}/users/me?clerkId=${user.id}&email=${encodeURIComponent(userEmail)}`);
        console.log('📊 User role response:', res.data);
        
        if (res.data?.role && ['super_admin', 'admin', 'user'].includes(res.data.role)) {
          setUserRole(res.data.role as 'super_admin' | 'admin' | 'user');
        } else {
        } else {
          // Fallback: Check Clerk metadata as backup
          console.log('🔄 No role in MongoDB, checking Clerk metadata...');
          const clerkRole = (user.publicMetadata as any)?.role;
          if (clerkRole === 'super_admin' || clerkRole === 'admin') {
            setUserRole(clerkRole as 'super_admin' | 'admin');
          } else {
            setUserRole('user');
          }
        }
      } catch (err: any) {
        console.error('❌ Error fetching user role:', err);
        // Fallback: Check Clerk metadata
        const clerkRole = (user.publicMetadata as any)?.role;
        if (clerkRole === 'super_admin' || clerkRole === 'admin') {
          console.log('🔄 Using Clerk metadata role:', clerkRole);
          setUserRole(clerkRole as 'super_admin' | 'admin');
        } else {
          setUserRole('user');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded && isSignedIn) {
      syncAndGetRole();
    } else if (isLoaded && !isSignedIn) {
      setUserRole(null);
      setIsLoading(false);
    }
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
