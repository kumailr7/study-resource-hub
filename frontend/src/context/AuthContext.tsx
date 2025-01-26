import React, { createContext, useState, useContext } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  userIsAdmin: boolean;
  login: (isAdmin: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  const login = (isAdmin: boolean) => {
    setIsAuthenticated(true);
    setUserIsAdmin(isAdmin);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, userIsAdmin, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
