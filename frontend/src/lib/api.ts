import axios from "axios";
import { clientEnv } from "@/config/env";

/**
 * Axios API Client Instance
 *
 * Pre-configured Axios instance for communicating with the Express backend.
 *
 * Security Design:
 * - Access token stored in module-level variable (memory only, NOT localStorage)
 * - Refresh token stored in HttpOnly cookie (set by backend, invisible to JS)
 * - Request interceptor attaches the access token from memory via Bearer header
 * - Response interceptor handles 401 errors with automatic token refresh
 * - On refresh failure, clears token state and redirects to login
 * - Queue pattern handles concurrent requests during token refresh
 */

// ── In-memory token store (NOT localStorage) ──────────────
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

const apiClient = axios.create({
  baseURL: clientEnv.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// ── Request Interceptor: Attach access token from memory ──
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor: Handle token refresh ────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue requests while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${clientEnv.NEXT_PUBLIC_API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        if (data.success && data.data?.accessToken) {
          setAccessToken(data.data.accessToken);
          processQueue(null);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError);
        setAccessToken(null);

        // Only redirect to login if not already on an auth page
        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          const isAuthPage = path === "/login" || path === "/register";
          if (!isAuthPage) {
            window.location.href = "/login";
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
