"use client";

import { useState } from "react";
import type { ApprovalStatus, Role } from "@prisma/client";

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  approvalStatus: ApprovalStatus;
  createdAt: Date;
  gradYear: number | null;
};

type Props = {
  users: User[];
};

export default function UserListClient({ users }: Props) {
  const [filter, setFilter] = useState<"ALL" | ApprovalStatus>("ALL");
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredUsers = users.filter((user) => {
    if (filter === "ALL") return true;
    return user.approvalStatus === filter;
  });

  const handleApprove = async (userId: string, email: string) => {
    if (processing.has(userId)) return;
    
    setProcessing((prev) => new Set(prev).add(userId));
    setMessage(null);

    try {
      const res = await fetch("/api/master-admin/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to approve user");
      }

      const data = await res.json();
      setMessage({ type: "success", text: data.message || `✅ User approved and login email sent to ${email}` });
      
      // Refresh the page to show updated status
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleBlock = async (userId: string) => {
    if (processing.has(userId)) return;
    if (!confirm("Are you sure you want to block this user?")) return;

    setProcessing((prev) => new Set(prev).add(userId));
    setMessage(null);

    try {
      const res = await fetch("/api/master-admin/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: "BLOCKED" }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to block user");
      }

      setMessage({ type: "success", text: "User blocked successfully" });
      
      // Refresh the page to show updated status
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleUnblock = async (userId: string) => {
    if (processing.has(userId)) return;

    setProcessing((prev) => new Set(prev).add(userId));
    setMessage(null);

    try {
      const res = await fetch("/api/master-admin/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: "APPROVED" }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to unblock user");
      }

      setMessage({ type: "success", text: "User unblocked successfully" });
      
      // Refresh the page to show updated status
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleUnapprove = async (userId: string, email: string) => {
    if (processing.has(userId)) return;
    if (!confirm("Set this user back to PENDING status? (For testing)")) return;

    setProcessing((prev) => new Set(prev).add(userId));
    setMessage(null);

    try {
      const res = await fetch("/api/master-admin/users/unapprove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to unapprove user");
      }

      setMessage({ type: "success", text: "User set back to PENDING" });
      
      // Refresh the page to show updated status
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case "APPROVED":
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Approved</span>;
      case "PENDING":
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
      case "BLOCKED":
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Blocked</span>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">User Management</h1>
        <a href="/year4/master-admin" className="text-primary hover:underline">
          Back to Master Admin
        </a>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-6 flex items-center gap-4">
        <label htmlFor="filter" className="font-medium text-gray-700">
          Filter by Status:
        </label>
        <select
          id="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="ALL">All Users ({users.length})</option>
          <option value="APPROVED">
            Approved ({users.filter((u) => u.approvalStatus === "APPROVED").length})
          </option>
          <option value="PENDING">
            Awaiting Approval ({users.filter((u) => u.approvalStatus === "PENDING").length})
          </option>
          <option value="BLOCKED">
            Blocked ({users.filter((u) => u.approvalStatus === "BLOCKED").length})
          </option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const isProcessing = processing.has(user.id);
                return (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">
                        {user.firstName ?? "Unknown"} {user.lastName ?? "User"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-secondary">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === "MASTER_ADMIN"
                            ? "bg-primary/20 text-primary"
                            : user.role === "ADMIN"
                            ? "bg-warning/20 text-warning"
                            : "bg-accent text-secondary"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(user.approvalStatus)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {user.approvalStatus === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleApprove(user.id, user.email)}
                            disabled={isProcessing}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleBlock(user.id)}
                            disabled={isProcessing}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? "..." : "Block"}
                          </button>
                        </>
                      )}
                      {user.approvalStatus === "APPROVED" && (
                        <>
                          <button
                            onClick={() => handleUnapprove(user.id, user.email)}
                            disabled={isProcessing}
                            className="text-orange-600 hover:text-orange-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? "..." : "Unapprove"}
                          </button>
                          <button
                            onClick={() => handleBlock(user.id)}
                            disabled={isProcessing}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? "..." : "Block"}
                          </button>
                        </>
                      )}
                      {user.approvalStatus === "BLOCKED" && (
                        <button
                          onClick={() => handleUnblock(user.id)}
                          disabled={isProcessing}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? "..." : "Unblock"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No users found with the selected filter.
          </div>
        )}
      </div>
    </div>
  );
}
