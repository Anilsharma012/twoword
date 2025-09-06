// Environment Detection
const detectEnvironment = () => {
  if (typeof window === "undefined") return "server";

  const { protocol, hostname, port } = window.location;

  // Development environment
  if (hostname === "localhost" || hostname === "127.0.0.1" || port === "8080") {
    return "development";
  }

  // Fly.dev deployment
  if (hostname.includes(".fly.dev")) {
    return "fly";
  }

  // Netlify deployment
  if (hostname.includes(".netlify.app")) {
    return "netlify";
  }

  // Other production
  return "production";
};

// API Configuration
const getApiBaseUrl = () => {
  // Check for environment variable first
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log(
      "���� Using configured VITE_API_BASE_URL:",
      import.meta.env.VITE_API_BASE_URL,
    );
    return import.meta.env.VITE_API_BASE_URL;
  }

  const environment = detectEnvironment();
  console.log("🎯 Detected environment:", environment);

  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    console.log("📍 Current location:", {
      protocol,
      hostname,
      port,
      href: window.location.href,
    });

    switch (environment) {
      case "development":
        // Development: Vite proxy handles API requests
        return "";

      case "fly":
        // Fly.dev: Backend and frontend served by same Vite dev server
        return "";

      case "netlify":
        // Netlify: Use Netlify Functions
        return "";

      case "production":
      default:
        // Other production: Try same domain first, fallback to common ports
        if (port && port !== "80" && port !== "443") {
          return `${protocol}//${hostname}`;
        }
        return "";
    }
  }

  return "";
};

const API_BASE_URL = getApiBaseUrl();
const environment = detectEnvironment();

export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  timeout: environment === "development" ? 8000 : 15000, // Reduced timeout for faster fallback
  retryAttempts: 2, // Reduced retry attempts
  retryDelay: 1000, // 1 second
  environment,
};
// ⬇️ add this small helper near the top of the file

// Helper function to create API URLs
export const createApiUrl = (endpoint: string): string => {
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;

  // Log API configuration for debugging
  console.log("🔗 API Config:", {
    baseUrl: API_CONFIG.baseUrl,
    endpoint: cleanEndpoint,
    currentLocation:
      typeof window !== "undefined" ? window.location.href : "server",
  });

  // If we have a base URL, use it
  if (API_CONFIG.baseUrl) {
    // Handle case where baseUrl already contains '/api'
    if (API_CONFIG.baseUrl.endsWith("/api")) {
      const fullUrl = `${API_CONFIG.baseUrl}/${cleanEndpoint}`;
      console.log("🌐 Full API URL (baseUrl has /api):", fullUrl);
      return fullUrl;
    } else {
      const fullUrl = `${API_CONFIG.baseUrl}/api/${cleanEndpoint}`;
      console.log("🌐 Full API URL:", fullUrl);
      return fullUrl;
    }
  }

  // For development or same-domain, use relative URLs
  const relativeUrl = `/api/${cleanEndpoint}`;
  console.log("🏠 Relative API URL:", relativeUrl);
  console.log("🌍 Environment:", environment);
  return relativeUrl;
};

// ---------- helpers ----------
const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
};

// ---------- core request with auto Authorization ----------
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0,
): Promise<{ data: any; status: number; ok: boolean }> => {
  const url = createApiUrl(endpoint);
  const controller = new AbortController();
  // Allow some endpoints (chat unread count) a longer timeout
  const effectiveTimeout = endpoint.includes("chat/unread-count")
    ? Math.max(API_CONFIG.timeout, 30000)
    : API_CONFIG.timeout;

  const timeoutId = setTimeout(() => {
    try {
      // Abort with a reason when supported for better diagnostics
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (typeof controller.abort === "function") {
        try {
          // some browsers support abort with reason
          controller.abort(new Error("timeout"));
        } catch {
          controller.abort();
        }
      } else {
        controller.abort();
      }
    } catch (e) {
      // swallow
    }
  }, effectiveTimeout);

  try {
    const callerHeaders = (options.headers as Record<string, string>) ?? {};
    const stored = getStoredToken();

    // Build default headers but avoid forcing Content-Type for FormData or Blob bodies
    const defaultHeaders: Record<string, string> = {};
    const bodyIsFormData =
      options.body && typeof FormData !== "undefined" && options.body instanceof FormData;

    if (!bodyIsFormData) {
      defaultHeaders["Content-Type"] = "application/json";
    }

    if (stored && !("Authorization" in callerHeaders)) {
      defaultHeaders.Authorization = `Bearer ${stored}`;
    }

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { ...defaultHeaders, ...callerHeaders },
      credentials: "include",
    });

    clearTimeout(timeoutId);

    // Safely parse response without consuming original body (prevents "body stream already read")
    let responseData: any = {};
    try {
      const clone = response.clone();
      const t = await clone.text();
      if (t && t.trim()) {
        try {
          responseData = JSON.parse(t);
        } catch {
          responseData = { raw: t };
        }
      }
    } catch (e) {
      // As a fallback, try to read as JSON directly (may fail if already consumed)
      try {
        responseData = await response.json();
      } catch {
        responseData = {};
      }
    }

    return { data: responseData, status: response.status, ok: response.ok };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${effectiveTimeout}ms`);
    }
    if (error.message?.includes("Failed to fetch")) {
      throw new Error(`Network error: Unable to connect to server at ${url}`);
    }
    // If the abort was triggered with a reason, provide that reason
    if (error?.message && error.message !== "AbortError") {
      throw new Error(error.message);
    }
    throw error;
  }
}; // 👈 NOTE: function yahin close ho rahi hai

// ---------- Specific API calls ----------
export const adminApi = {
  getStats: async (token: string) => {
    const response = await apiRequest("admin/stats", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(
      response.data?.error || response.data?.message || (typeof response.data?.raw === "string" ? response.data.raw : "") || `HTTP ${response.status}`
    );
    return response.data;
  },

  getUsers: async (token: string, limit = 10) => {
    const response = await apiRequest(`admin/users?limit=${limit}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(
      response.data?.error || response.data?.message || (typeof response.data?.raw === "string" ? response.data.raw : "") || `HTTP ${response.status}`
    );
    return response.data;
  },

  getProperties: async (token: string, limit = 10) => {
    const response = await apiRequest(`admin/properties?limit=${limit}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(
      response.data?.error || response.data?.message || (typeof response.data?.raw === "string" ? response.data.raw : "") || `HTTP ${response.status}`
    );
    return response.data;
  },
};

// ---------- Auth API ----------
export const authApi = {
  login: async (credentials: any) => {
    const response = await apiRequest("auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    if (!response.ok) throw new Error(response.data.error || "Login failed");
    return response.data;
  },

  sendOTP: async (data: any) => {
    const response = await apiRequest("auth/send-otp", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok)
      throw new Error(response.data.error || "Failed to send OTP");
    return response.data;
  },

  verifyOTP: async (data: any) => {
    const response = await apiRequest("auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok)
      throw new Error(response.data.error || "OTP verification failed");
    return response.data;
  },
};

// ---------- General purpose API ----------
export const api = {
  get: async (endpoint: string, token?: string) => {
    const authToken = token ?? getStoredToken();
    const headers: Record<string, string> = authToken
      ? { Authorization: `Bearer ${authToken}` }
      : {};
    const response = await apiRequest(endpoint, { method: "GET", headers });
    if (!response.ok) throw new Error(
      response.data?.error || response.data?.message || (typeof response.data?.raw === "string" ? response.data.raw : "") || `HTTP ${response.status}`
    );
    return { data: response.data };
  },

  post: async (endpoint: string, data?: any, token?: string) => {
    const authToken = token ?? getStoredToken();
    const headers: Record<string, string> = authToken
      ? { Authorization: `Bearer ${authToken}` }
      : {};
    const response = await apiRequest(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
    if (!response.ok) throw new Error(
      response.data?.error || response.data?.message || (typeof response.data?.raw === "string" ? response.data.raw : "") || `HTTP ${response.status}`
    );
    return { data: response.data };
  },

  put: async (endpoint: string, data?: any, token?: string) => {
    const authToken = token ?? getStoredToken();
    const headers: Record<string, string> = authToken
      ? { Authorization: `Bearer ${authToken}` }
      : {};
    const response = await apiRequest(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
    if (!response.ok) throw new Error(response.data.error || "Request failed");
    return { data: response.data };
  },

  delete: async (endpoint: string, token?: string) => {
    const authToken = token ?? getStoredToken();
    const headers: Record<string, string> = authToken
      ? { Authorization: `Bearer ${authToken}` }
      : {};
    const response = await apiRequest(endpoint, { method: "DELETE", headers });
    if (!response.ok) throw new Error(response.data.error || "Request failed");
    return { data: response.data };
  },
};
