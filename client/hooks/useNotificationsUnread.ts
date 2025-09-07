import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export const useNotificationsUnread = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      try {
        const token =
          localStorage.getItem("token") || localStorage.getItem("auth_token");
        if (!token) return;

        // Use centralized API with retries/XHR fallback
        const res = await api.get("notifications/unread-count", token);
        const data = res?.data;
        if (active) setCount(Number(data?.data?.unread || 0));
      } catch (e: any) {
        const msg = String(e?.message || "").toLowerCase();
        if (
          msg.includes("failed to fetch") ||
          msg.includes("timeout") ||
          msg.includes("network") ||
          msg.includes("http 404")
        ) {
          if (active) setCount(0);
          return;
        }
        // Non-transient unexpected errors can be logged
        console.warn("Unread notifications fetch error:", e?.message || e);
      }
    };

    fetchCount();
    const id = setInterval(fetchCount, 10000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return count;
};
