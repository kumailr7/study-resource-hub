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
        await axios.post(`${API_BASE_URL}/users/sync`, {
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: user.fullName || user.username || '',
        });

        const res = await axios.get<{ role?: 'super_admin' | 'admin' | 'user' }>(`${API_BASE_URL}/users/me?clerkId=${user.id}`);
        setUserRole(res.data?.role || 'user');
      } catch (err) {
        console.error('Error fetching user role:', err);
        setUserRole('user');
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
