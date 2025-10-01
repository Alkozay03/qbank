// src/app/year4/help/page.tsx
"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";

type HelpItem = {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  createdAt: string;
};

export default function Help() {
  const [helpItems, setHelpItems] = useState<HelpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
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

    fetchHelpItems();
  }, []);

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <Shell title="Frequently Asked Questions" pageName="Help">
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-slate-600">Loading help content...</div>
          </div>
        ) : helpItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-slate-600">No help content available at the moment.</div>
            <div className="text-sm text-slate-400 mt-2">
              Please check back later or contact support if you need assistance.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {helpItems.map((item) => {
              const isExpanded = expandedItems.has(item.id);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-lg border border-[#E6F0F7] shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 hover-lift"
                >
                  <button
                    onClick={() => toggleExpanded(item.id)}
                    className="group relative w-full px-6 py-4 text-left hover:bg-[#F7FBFF] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#56A2CD] focus:ring-inset"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#56A2CD] to-[#A5CDE4] opacity-0 group-hover:opacity-5 transition-opacity duration-200"></div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-[#2F6F8F] pr-4">
                        {item.title}
                      </h3>
                      <div className="flex-shrink-0">
                        <svg
                          className={`w-5 h-5 text-[#7DB8D9] transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>
                  
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="px-6 pb-4 border-t border-[#E6F0F7] bg-[#F7FBFF]">
                      <div className="pt-4 text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {item.description}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
