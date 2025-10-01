"use client";

import { useState } from "react";

export default function RoleManagerClient() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("MEMBER");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/master-admin/update-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Successfully updated role for ${email} to ${role}`);
        setEmail("");
      } else {
        setMessage(`Error: ${data.error || "Failed to update role"}`);
      }
    } catch (error) {
      setMessage("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-6">
      <h1 className="text-2xl font-bold text-[#2F6F8F]">Role Manager</h1>
      <p className="mt-2 text-slate-600 mb-6">
        Assign roles to users by email address.
      </p>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              University Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#2F6F8F] focus:border-[#2F6F8F]"
              placeholder="user@sharjah.ac.ae"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#2F6F8F] focus:border-[#2F6F8F]"
              required
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="MASTER_ADMIN">Master Admin</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#2F6F8F] text-white px-4 py-2 rounded-md hover:bg-[#265C75] focus:outline-none focus:ring-2 focus:ring-[#2F6F8F] focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? "Updating..." : "Update Role"}
            </button>
            <a 
              href="/year4/master-admin" 
              className="text-[#2F6F8F] hover:underline"
            >
              Back to Master Admin
            </a>
          </div>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded ${message.startsWith("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
