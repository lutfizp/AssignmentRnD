"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, AuthResponse, customFetch } from "@/lib/api-client";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("sv_token");
      if (storedToken) {
        setToken(storedToken);
        setIsLoadingUser(true);
        try {
          const userData = await customFetch<User>("/api/users/me");
          setUser(userData);
        } catch {
          localStorage.removeItem("sv_token");
          setToken(null);
        } finally {
          setIsLoadingUser(false);
        }
      }
      setIsLoaded(true);
    };
    initAuth();
  }, []);

  const login = (data: AuthResponse) => {
    localStorage.setItem("sv_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("sv_token");
    setToken(null);
    setUser(null);
  };

  if (!isLoaded) return null;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading: isLoadingUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
