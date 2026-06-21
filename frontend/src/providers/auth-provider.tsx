"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  User,
  AuthState,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from "@/types";
import axios from "axios";
import apiClient, {
  registerAuthSyncHandlers,
  setAccessToken as setApiToken,
} from "@/lib/api";
import { clientEnv } from "@/config/env";
import { useRouter } from "next/navigation";

interface AuthContextType extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  /** Keep React state and the axios module token in sync */
  const setAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    setApiToken(token);
    if (!token) {
      setUser(null);
    }
  }, []);

  /** Keep access token in memory; refresh token stays in HttpOnly cookie */
  const restoreSession = useCallback(async () => {
    try {
      const response = await axios.post<{
        success: boolean;
        data: { user: User; accessToken: string };
      }>(
        `${clientEnv.NEXT_PUBLIC_API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      if (response.data.success && response.data.data.accessToken) {
        setAccessToken(response.data.data.accessToken);
        setUser(response.data.data.user);
      } else {
        setAccessToken(null);
      }
    } catch {
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [setAccessToken]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    registerAuthSyncHandlers({
      onTokenRefreshed: (token) => setAccessToken(token),
      onSessionCleared: () => setAccessToken(null),
    });
    return () => registerAuthSyncHandlers({});
  }, [setAccessToken]);

  const login = async (data: LoginRequest) => {
    const response = await apiClient.post<{
      success: boolean;
      data: AuthResponse;
    }>("/auth/login", data);
    const { user: userData, accessToken: token } = response.data.data;
    setAccessToken(token);
    setUser(userData);
    router.push("/");
  };

  const register = async (data: RegisterRequest) => {
    const response = await apiClient.post<{
      success: boolean;
      data: AuthResponse;
    }>("/auth/register", data);
    const { user: userData, accessToken: token } = response.data.data;
    setAccessToken(token);
    setUser(userData);
    router.push("/");
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Logout endpoint may fail — still clear local state
    } finally {
      setAccessToken(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth Hook
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
