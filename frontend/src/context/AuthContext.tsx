import React, { createContext, useContext } from "react";
import { useUser } from "@clerk/clerk-react";

interface AuthContextType {
  isAuthenticated: boolean;
  userIsAdmin: boolean;
  isLoaded: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userIsAdmin: false,
  isLoaded: false,
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, isLoaded, isSignedIn } = useUser();
  const userIsAdmin = (user?.publicMetadata as { role?: string })?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!isSignedIn,
      userIsAdmin,
      isLoaded,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
