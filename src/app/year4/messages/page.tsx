"use client";

import { useEffect, useState } from "react";
import AdminMessagesPage from "@/components/AdminMessagesPage";
import UserMessagesPage from "@/components/UserMessagesPage";

export default function MessagesPage() {
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const res = await fetch("/api/me/role");
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.role);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };

    fetchUserRole();
  }, []);

  // Show admin interface for website creator, master admin and regular admin, user interface for everyone else
  if (userRole === "WEBSITE_CREATOR" || userRole === "MASTER_ADMIN" || userRole === "ADMIN") {
    return <AdminMessagesPage />;
  }

  return <UserMessagesPage />;
}