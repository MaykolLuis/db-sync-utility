"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string) => void;
  logout: () => void;
  verifyPassword: (password: string) => Promise<boolean>;
  changePassword: (newPassword: string) => Promise<void>;
  username: string;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  verifyPassword: async () => false,
  changePassword: async () => {},
  username: "",
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("Technické oddělení");
  const router = useRouter();

  // Check if user is authenticated on initial load
  useEffect(() => {
    const authData = localStorage.getItem("db-sync-auth");
    if (authData) {
      try {
        const { authenticated, username } = JSON.parse(authData);
        setIsAuthenticated(authenticated);
        if (username) setUsername(username);
      } catch (error) {
        console.error("Error parsing auth data:", error);
      }
    }
  }, []);

  const login = (username: string) => {
    // Store auth data in localStorage
    localStorage.setItem(
      "db-sync-auth",
      JSON.stringify({
        authenticated: true,
        username,
        timestamp: new Date().toISOString(),
      })
    );
    setIsAuthenticated(true);
    setUsername(username);
  };

  const logout = () => {
    // Remove auth data from localStorage
    localStorage.removeItem("db-sync-auth");
    setIsAuthenticated(false);
    
    // Redirect to login page
    router.push("/login");
  };

  const verifyPassword = async (password: string) => {
    try {
      // Use Electron IPC to verify password if available
      if (window.electron?.verifyPassword) {
        return await window.electron.verifyPassword(password);
      } else {
        // Fallback for development environment
        const storedPassword = localStorage.getItem("db-sync-password") || "admin";
        return password === storedPassword;
      }
    } catch (error) {
      console.error("Error verifying password:", error);
      return false;
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      // Use Electron IPC to set password if available
      if (window.electron?.setPassword) {
        await window.electron.setPassword(newPassword);
      } else {
        // Fallback for development environment
        localStorage.setItem("db-sync-password", newPassword);
      }
    } catch (error) {
      console.error("Error changing password:", error);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        login, 
        logout, 
        verifyPassword, 
        changePassword,
        username 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
