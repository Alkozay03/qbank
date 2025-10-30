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
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-6 min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
      <h1 className="text-3xl font-bold text-[#0ea5e9]">Role Manager</h1>
      <p className="mt-2 text-slate-600 mb-6">
        Assign roles to users by email address.
      </p>

      <div className="bg-white rounded-xl shadow-lg border border-sky-200 p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-[#0284c7] mb-2">
              University Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
              placeholder="user@sharjah.ac.ae"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="role" className="block text-sm font-medium text-[#0284c7] mb-2">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
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
              className="bg-[#0ea5e9] text-white px-6 py-2.5 rounded-lg hover:bg-[#0284c7] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 disabled:opacity-50 transition-all font-medium shadow-md"
            >
              {isLoading ? "Updating..." : "Update Role"}
            </button>
            <a 
              href="/year4/master-admin" 
              className="text-[#0ea5e9] hover:text-[#0284c7] hover:underline font-medium transition-colors"
            >
              Back to Master Admin
            </a>
          </div>
        </form>

        {message && (
          <div className={`mt-4 p-4 rounded-lg font-medium ${message.startsWith("Error") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
