"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus, Trash2, Edit2, CheckCircle, XCircle } from "lucide-react";

type RotationPeriod = {
  id: string;
  academicYear: number;
  rotationNumber: string;
  rotationName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const ROTATION_NAMES = [
  "Pediatrics",
  "Internal Medicine",
  "General Surgery",
  "Obstetrics & Gynecology",
];

const ROTATION_NUMBERS = ["R1", "R2", "R3", "R4"];

export default function RotationSchedulePage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<"ADMIN" | "MASTER_ADMIN" | null>(null);
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<RotationPeriod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<RotationPeriod | null>(null);

  // Form state
  const [academicYear, setAcademicYear] = useState(2027);
  const [rotationNumber, setRotationNumber] = useState("R1");
  const [rotationName, setRotationName] = useState("Pediatrics");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/me/role', { cache: 'no-store' });
        const data = await response.json();
        setUserRole(data?.role);
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
    fetchUserRole();
  }, []);

  // Fetch rotation periods
  useEffect(() => {
    fetchPeriods();
  }, []);

  async function fetchPeriods() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/rotation-periods');
      if (!res.ok) {
        throw new Error('Failed to fetch rotation periods');
      }
      const data = await res.json();
      setPeriods(data.periods || []);
    } catch (err) {
      console.error('Error fetching periods:', err);
      setError('Failed to load rotation periods');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingPeriod(null);
    setAcademicYear(2027);
    setRotationNumber("R1");
    setRotationName("Pediatrics");
    setStartDate("");
    setEndDate("");
    setShowCreateModal(true);
  }

  function openEditModal(period: RotationPeriod) {
    setEditingPeriod(period);
    setAcademicYear(period.academicYear);
    setRotationNumber(period.rotationNumber);
    setRotationName(period.rotationName);
    setStartDate(new Date(period.startDate).toISOString().split('T')[0]);
    setEndDate(new Date(period.endDate).toISOString().split('T')[0]);
    setShowCreateModal(true);
  }

  function closeModal() {
    setShowCreateModal(false);
    setEditingPeriod(null);
  }

  async function handleSave() {
    if (!startDate || !endDate) {
      alert("Please fill in all fields");
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      alert("Start date must be before end date");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (editingPeriod) {
        // Update existing period
        const res = await fetch(`/api/admin/rotation-periods/${editingPeriod.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to update period');
        }
      } else {
        // Create new period
        const res = await fetch('/api/admin/rotation-periods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            academicYear,
            rotationNumber,
            rotationName,
            startDate,
            endDate,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create period');
        }
      }

      closeModal();
      await fetchPeriods();
    } catch (err) {
      console.error('Error saving period:', err);
      setError(err instanceof Error ? err.message : 'Failed to save period');
    } finally {
      setSaving(false);
    }
  }

  async function handleEndPeriod(period: RotationPeriod) {
    if (!confirm(`End this rotation period? All votes will be locked and marked as final.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/rotation-periods/${period.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to end period');
      }

      await fetchPeriods();
    } catch (err) {
      console.error('Error ending period:', err);
      alert(err instanceof Error ? err.message : 'Failed to end period');
    }
  }

  async function handleDelete(period: RotationPeriod) {
    if (!confirm(`Delete this rotation period and all associated votes? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/rotation-periods/${period.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete period');
      }

      await fetchPeriods();
    } catch (err) {
      console.error('Error deleting period:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete period');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0ea5e9]">Rotation Schedule Manager</h1>
            <p className="mt-2 text-[#0284c7]">Manage rotation periods and voting schedules</p>
          </div>
          <button
            onClick={() => {
              if (userRole === "MASTER_ADMIN") {
                router.push("/year2/master-admin");
              } else {
                router.push("/year2/admin");
              }
            }}
            className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-[#0284c7] hover:bg-sky-50"
          >
            ← {userRole === "MASTER_ADMIN" ? "Master Admin" : "Admin"}
          </button>
        </div>

        {/* Create Period Button */}
        <div className="mb-6">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-[#0ea5e9] px-4 py-2 font-semibold text-white hover:bg-[#0284c7] transition-colors"
          >
            <Plus size={20} />
            Create Rotation Period
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Rotation Periods List */}
        <div className="rounded-2xl border border-sky-200 bg-white shadow-lg">
          <div className="px-4 py-3 border-b border-sky-200">
            <div className="font-semibold text-[#0ea5e9]">Rotation Periods</div>
          </div>

          {loading ? (
            <div className="px-4 py-10 text-center text-slate-500">Loading...</div>
          ) : periods.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Calendar className="w-12 h-12 text-sky-400 mx-auto mb-4" />
              <p className="text-slate-500">No rotation periods created yet.</p>
              <button
                onClick={openCreateModal}
                className="mt-4 text-[#0ea5e9] hover:text-[#0284c7] font-medium"
              >
                Create your first rotation period
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[#0284c7] bg-sky-50">
                    <th className="px-4 py-3 font-semibold">Class of</th>
                    <th className="px-4 py-3 font-semibold">Rotation</th>
                    <th className="px-4 py-3 font-semibold">Number</th>
                    <th className="px-4 py-3 font-semibold">Start Date</th>
                    <th className="px-4 py-3 font-semibold">End Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => {
                    const startDate = new Date(period.startDate);
                    const endDate = new Date(period.endDate);
                    const now = new Date();
                    const isOngoing = period.isActive && now >= startDate && now <= endDate;
                    const isUpcoming = period.isActive && now < startDate;
                    const isEnded = !period.isActive || now > endDate;

                    return (
                      <tr key={period.id} className="border-t border-sky-100 hover:bg-sky-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#0ea5e9]">{period.academicYear}</td>
                        <td className="px-4 py-3 text-slate-700">{period.rotationName}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">{period.rotationNumber}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {startDate.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {endDate.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td className="px-4 py-3">
                          {isOngoing && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                              <CheckCircle size={14} />
                              Active
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                              <Calendar size={14} />
                              Upcoming
                            </span>
                          )}
                          {isEnded && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                              <XCircle size={14} />
                              Ended
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => openEditModal(period)}
                              className="rounded-lg border border-[#0ea5e9] bg-white px-3 py-1.5 text-[#0ea5e9] font-medium hover:bg-[#0ea5e9] hover:text-white transition-colors"
                              title="Edit dates"
                            >
                              <Edit2 size={16} />
                            </button>
                            {period.isActive && (
                              <button
                                onClick={() => handleEndPeriod(period)}
                                className="rounded-lg border border-orange-500 bg-white px-3 py-1.5 text-orange-600 font-medium hover:bg-orange-500 hover:text-white transition-colors"
                                title="End period"
                              >
                                End
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(period)}
                              className="rounded-lg border border-red-500 bg-white px-3 py-1.5 text-red-600 font-medium hover:bg-red-500 hover:text-white transition-colors"
                              title="Delete period"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 rounded-xl border border-sky-200 bg-white p-4">
          <h3 className="font-semibold text-[#0ea5e9] mb-2">How It Works:</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>• <strong>Create Rotation Periods:</strong> Set start and end dates for each rotation (10-week periods)</li>
            <li>• <strong>Students Vote:</strong> During active periods, students in matching rotations can vote on unconfirmed IDU answers</li>
            <li>• <strong>End Period:</strong> Marks all votes as final and prevents further changes</li>
            <li>• <strong>Historical Data:</strong> Previous rotation votes are displayed to future students as reference</li>
          </ul>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-sky-200">
              <h2 className="text-2xl font-bold text-[#0ea5e9]">
                {editingPeriod ? 'Edit Rotation Period' : 'Create Rotation Period'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {editingPeriod ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-[#0284c7]">Class of (Graduation Year)</label>
                    <input
                      type="number"
                      value={academicYear}
                      disabled
                      className="mt-1 w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#0284c7]">Rotation Name</label>
                    <input
                      type="text"
                      value={rotationName}
                      disabled
                      className="mt-1 w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#0284c7]">Rotation Number</label>
                    <input
                      type="text"
                      value={rotationNumber}
                      disabled
                      className="mt-1 w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-slate-800"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-[#0284c7]">Class of (Graduation Year)</label>
                    <input
                      type="number"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
                      min={2020}
                      max={2100}
                      placeholder="e.g., 2027"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#0284c7]">Rotation Name</label>
                    <select
                      value={rotationName}
                      onChange={(e) => setRotationName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
                    >
                      {ROTATION_NAMES.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#0284c7]">Rotation Number</label>
                    <select
                      value={rotationNumber}
                      onChange={(e) => setRotationNumber(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
                    >
                      {ROTATION_NUMBERS.map((num) => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium text-[#0284c7]">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#0284c7]">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
                />
              </div>
            </div>

            <div className="p-6 border-t border-sky-200 flex gap-3 justify-end">
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-sky-200 bg-white px-4 py-2 font-medium text-[#0284c7] hover:bg-sky-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-[#0ea5e9] px-4 py-2 font-semibold text-white hover:bg-[#0284c7] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
