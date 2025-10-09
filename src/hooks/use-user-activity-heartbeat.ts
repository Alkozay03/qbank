"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Hook that sends periodic heartbeats to track user activity
 * Updates the UserActivity table every 2 minutes
 */
export function useUserActivityHeartbeat() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user?.email) return;

    // Send initial heartbeat
    const sendHeartbeat = async () => {
      try {
        await fetch("/api/user-activity/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.error("Failed to send activity heartbeat:", error);
      }
    };

    // Send immediately
    sendHeartbeat();

    // Then send every 2 minutes
    const interval = setInterval(sendHeartbeat, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session?.user?.email]);
}
