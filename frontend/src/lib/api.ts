import axios from "axios";
import { clientEnv } from "@/config/env";
import type { AuthResponse, ApiResponse } from "@/types";

let accessToken: string | null = null;
let refreshPromise: Promise<AuthResponse> | null = null;

const CSRF_COOKIE_NAME = "ct_csrf";

type AuthSyncHandlers = {
  onTokenRefreshed?: (token: string) => void;
  onSessionCleared?: () => void;
};

let authSyncHandlers: AuthSyncHandlers = {};

export function registerAuthSyncHandlers(handlers: AuthSyncHandlers) {
  authSyncHandlers = handlers;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CSRF_COOKIE_NAME}=`));

  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
}

export async function refreshSession(): Promise<AuthResponse> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<ApiResponse<AuthResponse>>(
        `${clientEnv.NEXT_PUBLIC_API_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: buildCsrfHeaders(),
        },
      )
      .then((response) => response.data.data)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

const apiClient = axios.create({
  baseURL: clientEnv.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (isUnsafeMethod(config.method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshRequest
    ) {
      originalRequest._retry = true;

      try {
        const data = await refreshSession();
        setAccessToken(data.accessToken);
        authSyncHandlers.onTokenRefreshed?.(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        authSyncHandlers.onSessionCleared?.();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

function buildCsrfHeaders(): Record<string, string> {
  const csrfToken = getCsrfToken();
  return csrfToken ? { "X-CSRF-Token": csrfToken } : {};
}

function isUnsafeMethod(method?: string): boolean {
  return !["get", "head", "options"].includes((method || "get").toLowerCase());
}

export default apiClient;
