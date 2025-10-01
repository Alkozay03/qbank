"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type HelpItem = {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  isPublished: boolean;
  createdAt: string;
};

export default function HelpEditor() {
  const router = useRouter();
  const [helpItems, setHelpItems] = useState<HelpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<HelpItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  // Fetch help items
  const fetchHelpItems = async () => {
    try {
      const response = await fetch("/api/admin/help");
      if (response.ok) {
        const data = await response.json();
        setHelpItems(data);
      } else {
        console.error("Failed to fetch help items");
      }
    } catch (error) {
      console.error("Error fetching help items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHelpItems();
  }, []);

  // Handle create/update
  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      alert("Please fill in both title and description");
      return;
    }

    setSaving(true);
    try {
      const url = editingItem 
        ? `/api/admin/help/${editingItem.id}` 
        : "/api/admin/help";
      const method = editingItem ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
        }),
      });

      if (response.ok) {
        await fetchHelpItems();
        setEditingItem(null);
        setIsCreating(false);
        setFormData({ title: "", description: "" });
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save help item");
      }
    } catch (error) {
      console.error("Error saving help item:", error);
      alert("Failed to save help item");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this help item?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/help/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchHelpItems();
      } else {
        alert("Failed to delete help item");
      }
    } catch (error) {
      console.error("Error deleting help item:", error);
      alert("Failed to delete help item");
    }
  };

  // Handle edit
  const handleEdit = (item: HelpItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
    });
    setIsCreating(false);
  };

  // Handle create new
  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingItem(null);
    setFormData({ title: "", description: "" });
  };

  // Handle cancel
  const handleCancel = () => {
    setEditingItem(null);
    setIsCreating(false);
    setFormData({ title: "", description: "" });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6">
        <div className="text-center py-8">Loading help items...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2F6F8F]">Help Page Editor</h1>
          <p className="mt-2 text-slate-600">Manage help content for users</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-[#E6F0F7] rounded-lg text-[#2F6F8F] hover:bg-[#F7FBFF] transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-[#7DB8D9] text-white rounded-lg hover:bg-[#56A2CD] transition-colors"
          >
            + Add Help Item
          </button>
        </div>
      </div>

      {/* Editor Form */}
      {(isCreating || editingItem) && (
        <div className="bg-white rounded-lg border border-[#E6F0F7] shadow-sm mb-6 p-6">
          <h2 className="text-lg font-semibold text-[#2F6F8F] mb-4">
            {editingItem ? "Edit Help Item" : "Create New Help Item"}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#2F6F8F] mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-[#E6F0F7] rounded-lg focus:border-[#56A2CD] focus:ring-2 focus:ring-[#56A2CD] outline-none"
                placeholder="Enter help item title..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2F6F8F] mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-[#E6F0F7] rounded-lg focus:border-[#56A2CD] focus:ring-2 focus:ring-[#56A2CD] outline-none resize-vertical"
                placeholder="Enter detailed description or instructions..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#7DB8D9] text-white rounded-lg hover:bg-[#56A2CD] disabled:bg-slate-400 transition-colors"
              >
                {saving ? "Saving..." : (editingItem ? "Update" : "Create")}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-[#E6F0F7] text-[#2F6F8F] rounded-lg hover:bg-[#F7FBFF] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Items List */}
      <div className="bg-white rounded-lg border border-[#E6F0F7] shadow-sm">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-[#2F6F8F] mb-4">
            Current Help Items ({helpItems.length})
          </h2>

          {helpItems.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No help items created yet. Click &quot;Add Help Item&quot; to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {helpItems.map((item) => (
                <div
                  key={item.id}
                  className="border border-[#E6F0F7] rounded-lg p-4 hover:bg-[#F7FBFF] transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#2F6F8F] mb-2">
                        {item.title}
                      </h3>
                      <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                        {item.description}
                      </p>
                      <p className="text-xs text-slate-400">
                        Created: {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(item)}
                        className="px-3 py-1 text-sm bg-[#7DB8D9] text-white rounded hover:bg-[#56A2CD] transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}