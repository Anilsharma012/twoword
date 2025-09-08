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
  timeout: environment === "development" ? 10000 : 18000,
  retryAttempts: 3,
  retryDelay: 1200,
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

  // Build base path first (without query)
  const basePath = API_CONFIG.baseUrl
    ? API_CONFIG.baseUrl.endsWith("/api")
      ? `${API_CONFIG.baseUrl}/${cleanEndpoint}`
      : `${API_CONFIG.baseUrl}/api/${cleanEndpoint}`
    : `/api/${cleanEndpoint}`;

  // Auto-append location query for property/ads endpoints
  let urlObj: URL;
  try {
    urlObj = new URL(basePath, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  } catch {
    return basePath; // fallback
  }

  try {
    const shouldAttach = /^properties(\b|\/)|^ads(\b|\/)/.test(cleanEndpoint);
    if (shouldAttach && typeof window !== "undefined") {
      const saved = localStorage.getItem("app_city");
      if (saved) {
        const loc = JSON.parse(saved || "null");
        if (loc) {
          if (loc.coords && typeof loc.coords.lat === "number" && typeof loc.coords.lng === "number") {
            if (!urlObj.searchParams.has("lat")) urlObj.searchParams.set("lat", String(loc.coords.lat));
            if (!urlObj.searchParams.has("lng")) urlObj.searchParams.set("lng", String(loc.coords.lng));
            if (!urlObj.searchParams.has("radiusKm")) urlObj.searchParams.set("radiusKm", "10");
          } else if (loc.cityId && !urlObj.searchParams.has("cityId")) {
            urlObj.searchParams.set("cityId", String(loc.cityId));
          }
        }
      }
    }
  } catch {}

  const fullUrl = urlObj.toString().replace(/^https?:\/\/[^/]+/, "");
  console.log("🌐 Final API URL:", fullUrl);
  return fullUrl;
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

  // If running inside Builder preview without an explicit API base URL, warn and attempt relative requests
  const isBuilderPreview =
    typeof window !== "undefined" &&
    window.location.hostname.includes("projects.builder.codes");
  if (isBuilderPreview && !API_CONFIG.baseUrl) {
    console.warn(
      "⚠️ Running inside Builder preview without VITE_API_BASE_URL. Attempting relative /api/* requests with reduced timeouts. For reliable operation set VITE_API_BASE_URL to your backend.",
    );
  }

  const controller = new AbortController();
  // Allow some endpoints a longer timeout
  const longerEndpoints = [
    "chat/unread-count",
    "notifications/unread-count",
    "banners",
    "properties/featured",
    "properties",
  ];
  const needsLonger = longerEndpoints.some((k) => endpoint.includes(k));
  let effectiveTimeout = needsLonger
    ? Math.max(API_CONFIG.timeout, 25000)
    : API_CONFIG.timeout;

  // Extend timeout for uploads and category admin operations
  const extendedEndpoints = [
    "upload",
    "categories",
    "subcategories",
    "create",
    "delete",
  ];
  const isExtended = extendedEndpoints.some((k) => endpoint.includes(k));
  let finalTimeout = isExtended
    ? Math.max(effectiveTimeout, 45000)
    : effectiveTimeout;

  // In Builder preview without a configured base URL, still allow reasonable time
  if (
    typeof window !== "undefined" &&
    window.location.hostname.includes("projects.builder.codes") &&
    !API_CONFIG.baseUrl
  ) {
    finalTimeout = Math.max(finalTimeout, 12000);
  }

  const timeoutId = setTimeout(() => {
    try {
      // Use plain abort for maximum compatibility with instrumented fetch wrappers
      controller.abort();
    } catch (e) {
      // swallow
    }
  }, finalTimeout);

  // XHR fallback for environments where fetch may be intercepted or blocked
  const xhrFallback = () =>
    new Promise<{ ok: boolean; status: number; data: any }>((resolve) => {
      try {
        const method = String(options.method || "GET").toUpperCase();
        const callerHeaders = (options.headers as Record<string, string>) ?? {};
        const stored = getStoredToken();
        const headers: Record<string, string> = { ...callerHeaders };
        if (stored && !("Authorization" in headers)) {
          headers.Authorization = `Bearer ${stored}`;
        }
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
        xhr.timeout = finalTimeout;
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            let parsed: any = {};
            try {
              parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            } catch {
              parsed = { raw: xhr.responseText };
            }
            resolve({
              ok: xhr.status >= 200 && xhr.status < 300,
              status: xhr.status,
              data: parsed,
            });
          }
        };
        xhr.ontimeout = () =>
          resolve({ ok: false, status: 408, data: { error: "Request timeout" } });
        xhr.onerror = () =>
          resolve({ ok: false, status: 0, data: { error: "Network error" } });
        const body = (options as any).body ?? null;
        xhr.send(body || null);
      } catch (e: any) {
        resolve({ ok: false, status: 0, data: { error: e?.message || "Network error" } });
      }
    });

  try {
    const callerHeaders = (options.headers as Record<string, string>) ?? {};
    const stored = getStoredToken();
    const method = String(options.method || "GET").toUpperCase();

    // Build default headers; avoid forcing Content-Type for GET/HEAD or FormData bodies
    const defaultHeaders: Record<string, string> = {};
    const bodyIsFormData =
      options.body &&
      typeof FormData !== "undefined" &&
      options.body instanceof FormData;

    if (!bodyIsFormData && method !== "GET" && method !== "HEAD" && options.body) {
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
      mode: "cors",
      cache: (options as any).cache || "no-store",
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

    if (!response.ok) {
      console.warn("⚠️ API responded with error", {
        url,
        status: response.status,
        data: responseData,
      });
    }

    return { data: responseData, status: response.status, ok: response.ok };
  } catch (error: any) {
    clearTimeout(timeoutId);

    // If fetch failed (often instrumented as TypeError: Failed to fetch), try XHR fallback once
    const msg = String(error?.message || "").toLowerCase();
    if (msg.includes("failed to fetch") || msg.includes("network")) {
      try {
        const res = await xhrFallback();
        if (res.status !== 0) {
          return { data: res.data, status: res.status, ok: res.ok };
        }
      } catch {}
    }

    const retriable =
      error?.name === "AbortError" ||
      String(error?.message || "").toLowerCase().includes("timeout") ||
      msg.includes("failed to fetch") ||
      msg.includes("network error");

    if (retriable && retryCount < API_CONFIG.retryAttempts) {
      // backoff delay
      await new Promise((r) => setTimeout(r, API_CONFIG.retryDelay));
      return apiRequest(endpoint, options, retryCount + 1);
    }

    if (error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${finalTimeout}ms`);
    }
    if (msg.includes("failed to fetch")) {
      // For lightweight counters, return zero instead of throwing to avoid noisy errors
      const isUnread = /unread-count/.test(endpoint);
      if (isUnread) {
        const zero = endpoint.includes("notifications")
          ? { success: true, data: { unread: 0 } }
          : { success: true, data: { totalUnread: 0 } };
        return { data: zero, status: 200, ok: true } as any;
      }
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
    if (!response.ok)
      throw new Error(
        response.data?.error ||
          response.data?.message ||
          (typeof response.data?.raw === "string" ? response.data.raw : "") ||
          `HTTP ${response.status}`,
      );
    return response.data;
  },

  getUsers: async (token: string, limit = 10) => {
    const response = await apiRequest(`admin/users?limit=${limit}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok)
      throw new Error(
        response.data?.error ||
          response.data?.message ||
          (typeof response.data?.raw === "string" ? response.data.raw : "") ||
          `HTTP ${response.status}`,
      );
    return response.data;
  },

  getProperties: async (token: string, limit = 10) => {
    const response = await apiRequest(`admin/properties?limit=${limit}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok)
      throw new Error(
        response.data?.error ||
          response.data?.message ||
          (typeof response.data?.raw === "string" ? response.data.raw : "") ||
          `HTTP ${response.status}`,
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
    if (!response.ok)
      throw new Error(
        response.data?.error ||
          response.data?.message ||
          (typeof response.data?.raw === "string" ? response.data.raw : "") ||
          `HTTP ${response.status}`,
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
    if (!response.ok)
      throw new Error(
        response.data?.error ||
          response.data?.message ||
          (typeof response.data?.raw === "string" ? response.data.raw : "") ||
          `HTTP ${response.status}`,
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
    if (!response.ok)
      throw new Error(
        response.data?.error ||
          response.data?.message ||
          (typeof response.data?.raw === "string" ? response.data.raw : "") ||
          `HTTP ${response.status}`,
      );
    return { data: response.data };
  },

  delete: async (endpoint: string, token?: string) => {
    const authToken = token ?? getStoredToken();
    const headers: Record<string, string> = authToken
      ? { Authorization: `Bearer ${authToken}` }
      : {};
    const response = await apiRequest(endpoint, { method: "DELETE", headers });
    if (!response.ok)
      throw new Error(
        response.data?.error ||
          response.data?.message ||
          (typeof response.data?.raw === "string" ? response.data.raw : "") ||
          `HTTP ${response.status}`,
      );
    return { data: response.data };
  },
};
