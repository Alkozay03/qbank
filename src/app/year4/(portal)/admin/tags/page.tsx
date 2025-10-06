// src/app/year4/(portal)/admin/tags/page.tsx
"use client";

import { useState, useEffect } from "react";

type Tag = {
  id: string;
  type: string;
  value: string;
  _count?: {
    questions: number;
  };
};

export default function TagManagementPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState({ type: "SUBJECT", value: "" });

  const tagTypes = ["SUBJECT", "SYSTEM", "TOPIC", "ROTATION", "RESOURCE", "MODE"];

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags");
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoading(false);
    }
  };

  const addTag = async () => {
    if (!newTag.value.trim()) {
      alert("Tag value is required");
      return;
    }

    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTag),
      });

      if (response.ok) {
        alert("Tag added successfully!");
        setNewTag({ type: "SUBJECT", value: "" });
        fetchTags();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add tag");
      }
    } catch (error) {
      console.error("Error adding tag:", error);
      alert("Failed to add tag");
    }
  };

  const deleteTag = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tag?")) return;

    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Tag deleted successfully!");
        fetchTags();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete tag");
      }
    } catch (error) {
      console.error("Error deleting tag:", error);
      alert("Failed to delete tag");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-[#0284c7] mb-2">Tag Management</h1>
        <p className="text-[#0284c7]">Manage question tags and categories</p>
      </div>

      {/* Add New Tag */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New Tag</h2>
        <div className="flex items-center space-x-4">
          <select
            value={newTag.type}
            onChange={(e) => setNewTag({ ...newTag, type: e.target.value })}
            className="px-3 py-2 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-transparent"
          >
            {tagTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newTag.value}
            onChange={(e) => setNewTag({ ...newTag, value: e.target.value })}
            placeholder="Tag value..."
            className="flex-1 px-3 py-2 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-transparent"
          />
          <button
            onClick={addTag}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Tag
          </button>
        </div>
      </div>

      {/* Tags List */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Existing Tags</h2>
        
        {tags.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No tags found</p>
        ) : (
          <div className="space-y-4">
            {tagTypes.map((type) => {
              const typeTags = tags.filter((tag) => tag.type === type);
              if (typeTags.length === 0) return null;

              return (
                <div key={type} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3 text-blue-800">{type}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {typeTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between p-3 bg-accent rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-[#0284c7]">{tag.value}</span>
                          {typeof tag._count?.questions === "number" && (
                            <span className="text-sm text-slate-500 ml-2">
                              ({tag._count.questions} questions)
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => deleteTag(tag.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

