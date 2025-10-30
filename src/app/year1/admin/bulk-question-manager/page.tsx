// src/app/year1/admin/bulk-question-manager/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";

export default function Year1BulkQuestionManager() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<"ADMIN" | "MASTER_ADMIN" | "WEBSITE_CREATOR" | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/me/role', { cache: 'no-store' });
        const data = await response.json();
        
        if (!data?.role || (data.role !== "ADMIN" && data.role !== "MASTER_ADMIN" && data.role !== "WEBSITE_CREATOR")) {
          router.push('/year1');
          return;
        }
        
        setUserRole(data.role);
      } catch (error) {
        console.error('Error fetching user role:', error);
        router.push('/year1');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserRole();
  }, [router]);

  if (isLoading) {
    return (
      <Shell title="Year 1 - Bulk Question Manager" pageName="Admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </Shell>
    );
  }

  if (!userRole) {
    return null;
  }

  return (
    <Shell title="Year 1 - Bulk Question Manager" pageName="Admin">
      <div className="rounded-2xl bg-primary-light border-2 border-primary p-6 shadow-lg">
        <div className="bg-white rounded-xl shadow-inner p-6">
          <h2 className="text-2xl font-bold text-primary mb-4">
            Pre-Clerkship Question Manager - Year 1
          </h2>
          
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-blue-800 font-semibold">🚧 Under Construction</p>
            <p className="text-blue-700 text-sm mt-2">
              This is the Pre-Clerkship bulk question manager for Year 1.
              Unlike Year 4/5, this system uses <strong>Week</strong> and <strong>Lecture</strong> tags
              instead of rotation tags.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border-2 border-primary rounded-xl p-4">
              <h3 className="font-semibold text-primary mb-2">Features:</h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-gray-700">
                <li>Add/Edit questions specific to Year 1</li>
                <li>Tag with Week 1-10</li>
                <li>Tag with Lecture 1-10</li>
                <li>Maintain Systems and Disciplines</li>
                <li>Completely separated from Year 4/5 clerkship questions</li>
              </ul>
            </div>

            <div className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-700 mb-2">Tag Structure:</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white p-3 rounded-lg border">
                  <strong>Weeks:</strong> Week 1, Week 2, ..., Week 10
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <strong>Lectures:</strong> Lecture 1, Lecture 2, ..., Lecture 10
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <strong>Systems:</strong> Cardiovascular, GI, Respiratory, etc.
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <strong>Disciplines:</strong> Anatomy, Physiology, Pathology, etc.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
