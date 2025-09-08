// Import the existing API URL creation logic
import { createApiUrl, API_CONFIG } from "./api";
import { safeReadResponse } from "./response-utils";

// Make API helper available globally
function api(p: string, o: any = {}) {
  const t = localStorage.getItem("token");

  // Use the existing API URL logic to construct the proper URL
  const url = createApiUrl(p);

  console.log("🚀 Global API call:", {
    endpoint: p,
    url: url,
    method: o.method || "GET",
    hasToken: !!t,
    hasBody: !!o.body,
  });

  const method = (o.method || "GET").toUpperCase();

  // Short-circuit read-only calls in Builder preview when no backend is configured
  try {
    const isBuilder =
      typeof window !== "undefined" &&
      window.location.hostname.includes("projects.builder.codes");
    const noBackend = !API_CONFIG.baseUrl;
    const isRead = method === "GET";
    const endpoint = (p || "").replace(/^\/?api\//, "");
    const isSafeList = /^(properties|plans|banners|ads)(\b|\/)/.test(endpoint);
    if (isBuilder && noBackend && isRead && isSafeList) {
      const empty = { success: true, data: [] };
      return Promise.resolve({ ok: true, status: 200, success: true, data: empty, json: empty } as any);
    }
  } catch {}

  // Handle body - if it's already a string, use it as-is, otherwise stringify
  let bodyContent;
  if (o.body) {
    if (typeof o.body === "string") {
      bodyContent = o.body;
    } else {
      bodyContent = JSON.stringify(o.body);
    }
  }

  // Add timeout and better error handling
  const controller = new AbortController();
  const timeoutMs = typeof o.timeout === "number" ? o.timeout : 15000;
  const timeoutId = setTimeout(() => {
    try {
      controller.abort("timeout");
    } catch {}
    console.warn(`⏰ API request timeout after ${timeoutMs}ms:`, url);
  }, timeoutMs);

  const baseHeaders: Record<string, string> = {
    ...(o.headers || {}),
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
  // Only set Content-Type when we actually send a body
  if (bodyContent && !baseHeaders["Content-Type"]) {
    baseHeaders["Content-Type"] = "application/json";
  }

  const doFetch = () =>
    fetch(url, {
      method,
      headers: baseHeaders,
      body: bodyContent,
      signal: controller.signal,
      keepalive: !!o.keepalive,
      credentials: o.credentials || "same-origin",
      mode: "cors",
      cache: o.cache || "no-store",
      referrerPolicy: "no-referrer",
    });

  const xhrFallback = () =>
    new Promise<{ ok: boolean; status: number; data: any }>((resolve) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        Object.entries(baseHeaders).forEach(([k, v]) =>
          xhr.setRequestHeader(k, v),
        );
        xhr.timeout = timeoutMs;
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
          resolve({
            ok: false,
            status: 408,
            data: { error: "Request timeout" },
          });
        xhr.onerror = () =>
          resolve({ ok: false, status: 0, data: { error: "Network error" } });
        xhr.send(bodyContent || null);
      } catch (e: any) {
        resolve({
          ok: false,
          status: 0,
          data: { error: e?.message || "Network error" },
        });
      }
    });

  // Force XHR transport if requested
  if (o.transport === "xhr") {
    return xhrFallback().then(
      (res) =>
        ({
          ok: res.ok,
          status: res.status,
          success: res.ok,
          data: res.data,
          json: res.data,
        }) as any,
    );
  }

  try {
    return doFetch()
      .then(async (r) => {
        clearTimeout(timeoutId);

        console.log("✅ Global API response", {
          url,
          status: r.status,
          ok: r.ok,
        });
        const { ok, status, data } = await safeReadResponse(r);
        return { ok, status, success: ok, data, json: data };
      })
      .catch(async (error: any) => {
        // Try XHR fallback on generic fetch failure
        if (String(error?.message || "").includes("Failed to fetch")) {
          console.warn("⚠️ fetch failed, attempting XHR fallback:", url);
          const res = await xhrFallback();
          clearTimeout(timeoutId);
          return {
            ok: res.ok,
            status: res.status,
            success: res.ok,
            data: res.data,
            json: res.data,
          } as any;
        }

        clearTimeout(timeoutId);

        const method = (o.method || "GET").toUpperCase();
        const endpoint = (p || "").replace(/^\/?api\//, "");
        const isSafeList = /^(properties|plans|banners|ads)(\b|\/)/.test(endpoint);

        if (
          error.name === "AbortError" ||
          error?.message?.includes("aborted")
        ) {
          if (method === "GET" && isSafeList) {
            const empty = { success: true, data: [] };
            return { ok: true, status: 200, success: true, data: empty, json: empty } as any;
          }
          const timeoutError = new Error(`Request timeout: ${url}`);
          timeoutError.name = "TimeoutError";
          throw timeoutError;
        }

        if (method === "GET" && isSafeList) {
          const empty = { success: true, data: [] };
          return { ok: true, status: 200, success: true, data: empty, json: empty } as any;
        }

        const networkError = new Error(
          `Network error: Cannot connect to server at ${url}`,
        );
        networkError.name = "NetworkError";
        throw networkError;
      });
  } catch (syncError: any) {
    // Synchronous throw from instrumented fetch; fallback to XHR
    console.warn("⚠️ fetch threw synchronously, using XHR fallback:", url);
    return xhrFallback().then((res) => {
      clearTimeout(timeoutId);
      return {
        ok: res.ok,
        status: res.status,
        success: res.ok,
        data: res.data,
        json: res.data,
      } as any;
    });
  }
}

// Make it globally available
(window as any).api = api;

export { api };
