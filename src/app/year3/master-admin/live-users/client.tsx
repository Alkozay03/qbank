"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  image: string | null;
};

type Props = {
  users: User[];
};

export default function LiveUsersClient({ users: initialUsers }: Props) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refreshUsers = async () => {
    setIsRefreshing(true);
    try {
      // Fetch updated user list from API
      const res = await fetch('/api/live-users', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to refresh users:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshUsers();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "WEBSITE_CREATOR":
        return "bg-red-100 text-red-700";
      case "MASTER_ADMIN":
        return "bg-sky-100 text-[#0284c7]";
      case "ADMIN":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/year3/master-admin"
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </Link>
              <h1 className="text-3xl font-bold text-[#0ea5e9]">
                🔴 Live Users
              </h1>
            </div>
            <p className="mt-2 text-slate-600 ml-12">
              Currently online users (updated {lastUpdated.toLocaleTimeString()})
            </p>
          </div>
          
          <button
            onClick={refreshUsers}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* User Count */}
        <div className="bg-white rounded-xl shadow-lg border border-sky-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-[#0284c7]">{users.length}</div>
              <div className="text-slate-600 mt-1">Online Users</div>
            </div>
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-green-500 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-lg border border-sky-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-sky-50 border-b border-sky-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#0284c7]">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#0284c7]">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#0284c7]">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                      No users currently online
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-sky-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.firstName || "User"}
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-sky-200 flex items-center justify-center">
                              <span className="text-sm font-semibold text-[#0284c7]">
                                {user.firstName?.[0] || user.email[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-slate-900">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.firstName || "Unknown"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-500 text-center">
          Auto-refreshes every 30 seconds • Shows users with active sessions
        </div>
      </div>
    </div>
  );
}
