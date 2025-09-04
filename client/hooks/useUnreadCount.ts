import { useState, useEffect } from "react";

export const useUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token =
          localStorage.getItem("token") || localStorage.getItem("auth_token");
        if (!token) return;

        const response = await fetch("/api/chat/unread-count", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.data.totalUnread || 0);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();

    // Poll for updates every 10 seconds for near real-time badge updates
    const interval = setInterval(fetchUnreadCount, 10000);

    return () => clearInterval(interval);
  }, []);

  return unreadCount;
};
