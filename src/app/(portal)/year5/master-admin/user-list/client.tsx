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
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6 min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#0ea5e9]">User Management</h1>
        <a href="/year5/master-admin" className="text-[#0ea5e9] hover:text-[#0284c7] hover:underline font-medium transition-colors">
          Back to Master Admin
        </a>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg font-medium ${
            message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-6 flex items-center gap-4">
        <label htmlFor="filter" className="font-semibold text-[#0284c7]">
          Filter by Status:
        </label>
        <select
          id="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-4 py-2 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
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

      <div className="bg-white rounded-xl shadow-lg border border-sky-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-sky-100">
            <thead className="bg-sky-50">
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
            <tbody className="bg-white divide-y divide-sky-100">
              {filteredUsers.map((user) => {
                const isProcessing = processing.has(user.id);
                return (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-800">
                        {user.firstName ?? "Unknown"} {user.lastName ?? "User"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === "MASTER_ADMIN"
                            ? "bg-sky-100 text-[#0284c7]"
                            : user.role === "ADMIN"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(user.approvalStatus)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(user.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {user.approvalStatus === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleApprove(user.id, user.email)}
                            disabled={isProcessing}
                            className="text-green-600 hover:text-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isProcessing ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleBlock(user.id)}
                            disabled={isProcessing}
                            className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                            className="text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isProcessing ? "..." : "Unapprove"}
                          </button>
                          <button
                            onClick={() => handleBlock(user.id)}
                            disabled={isProcessing}
                            className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isProcessing ? "..." : "Block"}
                          </button>
                        </>
                      )}
                      {user.approvalStatus === "BLOCKED" && (
                        <button
                          onClick={() => handleUnblock(user.id)}
                          disabled={isProcessing}
                          className="text-[#0ea5e9] hover:text-[#0284c7] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          <div className="text-center py-12 text-slate-500">
            No users found with the selected filter.
          </div>
        )}
      </div>
    </div>
  );
}
