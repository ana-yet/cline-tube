"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type {
  AuthResponse,
  AuthState,
  LoginRequest,
  RegisterRequest,
  User,
} from "@/types";
import apiClient, {
  refreshSession,
  registerAuthSyncHandlers,
  setAccessToken as setApiToken,
} from "@/lib/api";

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
  const queryClient = useQueryClient();
  const router = useRouter();

  const setAuthenticatedSession = useCallback((userData: User, token: string) => {
    setUser(userData);
    setAccessTokenState(token);
    setApiToken(token);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessTokenState(null);
    setApiToken(null);
    queryClient.clear();
  }, [queryClient]);

  const restoreSession = useCallback(async () => {
    try {
      const data = await refreshSession();
      setAuthenticatedSession(data.user, data.accessToken);
    } catch {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [clearSession, setAuthenticatedSession]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    registerAuthSyncHandlers({
      onTokenRefreshed: (token) => {
        setAccessTokenState(token);
        setApiToken(token);
      },
      onSessionCleared: clearSession,
    });

    return () => registerAuthSyncHandlers({});
  }, [clearSession]);

  const login = async (data: LoginRequest) => {
    const response = await apiClient.post<{
      success: boolean;
      data: AuthResponse;
    }>("/auth/login", data);
    const { user: userData, accessToken: token } = response.data.data;
    setAuthenticatedSession(userData, token);
  };

  const register = async (data: RegisterRequest) => {
    const response = await apiClient.post<{
      success: boolean;
      data: AuthResponse;
    }>("/auth/register", data);
    const { user: userData, accessToken: token } = response.data.data;
    setAuthenticatedSession(userData, token);
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Local private state must be cleared even if the network is gone.
    } finally {
      clearSession();
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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
