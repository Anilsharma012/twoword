import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export const useUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchUnreadCount = async () => {
      try {
        const token =
          localStorage.getItem("token") || localStorage.getItem("auth_token");
        if (!token) return;

        // Use centralized API helper which handles timeouts, retries and fallbacks
        const res = await api.get("chat/unread-count", token);
        if (!mounted) return;

        if (res && res.data && res.data.data) {
          setUnreadCount(res.data.data.totalUnread || 0);
        }
      } catch (error: any) {
        // Log concise error for diagnostics
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
