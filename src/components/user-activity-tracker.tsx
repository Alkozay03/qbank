"use client";

import { useUserActivityHeartbeat } from "@/hooks/use-user-activity-heartbeat";

/**
 * Client component that tracks user activity
 * Must be mounted in the app to enable live user tracking
 */
export default function UserActivityTracker() {
  useUserActivityHeartbeat();
  return null; // This component doesn't render anything
}
