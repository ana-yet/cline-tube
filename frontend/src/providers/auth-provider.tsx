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
import apiClient, { setAccessToken as setApiToken } from "@/lib/api";
import { clientEnv } from "@/config/env";
import { useRouter } from "next/navigation";

/**
 * Authentication Context
 *
 * Manages the global authentication state for the application.
 *
 * Security Design:
 * - Access token stored IN MEMORY ONLY (useState) — never localStorage
 * - Refresh token stored in HttpOnly cookie (set by backend, invisible to JS)
 * - On mount, attempts to restore session by calling /auth/refresh
 *   (uses the HttpOnly refresh cookie to get a new access token)
 * - Login/Register store the access token in memory and user data in state
 * - Logout clears memory state and calls backend to revoke refresh token
 */

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

  /** Sync token to both React state and Axios module store */
  const setAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    setApiToken(token);
  }, []);

  /**
   * Restore session on mount.
   * Uses raw axios to bypass the apiClient interceptor — prevents
   * infinite redirect loop when no refresh cookie exists.
   */
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

      if (response.data.success) {
        setAccessToken(response.data.data.accessToken);
        setUser(response.data.data.user);
      }
    } catch {
      // No valid refresh cookie — user is not authenticated
      setAccessToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [setAccessToken]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

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
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
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
 *
 * Access the authentication context from any component.
 * Throws if used outside AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
