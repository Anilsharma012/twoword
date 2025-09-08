import { useState, useEffect } from "react";
import { api, API_CONFIG } from "@/lib/api";

export const useUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchUnreadCount = async () => {
      try {
        const token =
          localStorage.getItem("token") || localStorage.getItem("auth_token");
        if (!token) return;

        // In Builder preview without a configured backend, skip network calls
        const isBuilder =
          typeof window !== "undefined" &&
          window.location.hostname.includes("projects.builder.codes");
        if (isBuilder && !API_CONFIG.baseUrl) {
          if (mounted) setUnreadCount(0);
          return;
        }

        const res = await api.get("chat/unread-count", token);
        if (!mounted) return;

        if (res && res.data && res.data.data) {
          setUnreadCount(res.data.data.totalUnread || 0);
        } else {
          setUnreadCount(0);
        }
      } catch (error: any) {
        const msg = String(error?.message || "").toLowerCase();
        if (
          msg.includes("http 404") ||
          msg.includes("failed to fetch") ||
          msg.includes("timeout") ||
          msg.includes("network")
        ) {
          if (mounted) setUnreadCount(0);
          return;
        }
        console.error("Error fetching unread count:", error?.message || error);
      }
    };

    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return unreadCount;
};
