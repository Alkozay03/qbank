"use client";

import ForceBlueTheme from "@/components/ForceBlueTheme";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FormattedText from "@/components/FormattedText";

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
  const [showPreview, setShowPreview] = useState(false);

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
    setShowPreview(false);
  };

  // Formatting helper functions
  const insertFormatting = (format: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.description.substring(start, end);
    
    let newText = "";
    let cursorOffset = 0;
    
    switch (format) {
      case 'bold':
        newText = selectedText ? `**${selectedText}**` : '**bold text**';
        cursorOffset = selectedText ? 2 : 2;
        break;
      case 'bullet':
        newText = selectedText ? `• ${selectedText}` : '• ';
        cursorOffset = 2;
        break;
      case 'paragraph':
        newText = '\n\n';
        cursorOffset = 2;
        break;
    }
    
    const before = formData.description.substring(0, start);
    const after = formData.description.substring(end);
    const updatedDescription = before + newText + after;
    
    setFormData(prev => ({ ...prev, description: updatedDescription }));
    
    // Set cursor position after formatting
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start + cursorOffset, start + cursorOffset + (selectedText ? selectedText.length : newText.length - (format === 'bold' ? 4 : 0)));
      } else {
        textarea.setSelectionRange(start + cursorOffset, start + newText.length);
      }
    }, 0);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6">
        <div className="text-center py-8">Loading help items...</div>
      </div>
    );
  }

  return (
    <ForceBlueTheme>
    <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">Help Page Editor</h1>
          <p className="mt-2 text-slate-600">Manage help content for users</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-border rounded-lg text-primary hover:bg-accent transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-primary text-inverse rounded-lg hover:bg-primary/90 transition-colors"
          >
            + Add Help Item
          </button>
        </div>
      </div>

      {/* Editor Form */}
      {(isCreating || editingItem) && (
        <div className="bg-card rounded-lg border border-border shadow-sm mb-6 p-6">
          <h2 className="text-lg font-semibold text-primary mb-4">
            {editingItem ? "Edit Help Item" : "Create New Help Item"}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Enter help item title..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-[#2F6F8F]">
                  Description
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="px-3 py-1 text-xs bg-[#E6F0F7] text-[#2F6F8F] rounded hover:bg-[#7DB8D9] hover:text-white transition-colors"
                  >
                    {showPreview ? 'Edit' : 'Preview'}
                  </button>
                </div>
              </div>
              
              {/* Formatting Toolbar */}
              <div className="mb-2 flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => insertFormatting('bold')}
                  className="px-2 py-1 text-xs bg-[#F7FBFF] border border-[#E6F0F7] rounded hover:bg-[#E6F0F7] transition-colors"
                  title="Make text bold"
                >
                  <strong>B</strong>
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('bullet')}
                  className="px-2 py-1 text-xs bg-[#F7FBFF] border border-[#E6F0F7] rounded hover:bg-[#E6F0F7] transition-colors"
                  title="Add bullet point"
                >
                  •
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('paragraph')}
                  className="px-2 py-1 text-xs bg-[#F7FBFF] border border-[#E6F0F7] rounded hover:bg-[#E6F0F7] transition-colors"
                  title="Add paragraph break"
                >
                  ¶
                </button>
                <div className="text-xs text-slate-500 px-2 py-1">
                  Tip: Use **text** for bold, • for bullets
                </div>
              </div>

              {showPreview ? (
                <div className="w-full min-h-[150px] p-3 border border-[#E6F0F7] rounded-lg bg-[#F7FBFF]">
                  <div className="text-sm text-slate-600 mb-2">Preview:</div>
                  <FormattedText text={formData.description} />
                </div>
              ) : (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={8}
                  className="w-full px-3 py-2 border border-[#E6F0F7] rounded-lg focus:border-[#56A2CD] focus:ring-2 focus:ring-[#56A2CD] outline-none resize-vertical"
                  placeholder="Enter detailed description or instructions...

Use **bold text** for emphasis
Use • for bullet points  
Use double line breaks for new paragraphs"
                />
              )}
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
    </ForceBlueTheme>
  );
}