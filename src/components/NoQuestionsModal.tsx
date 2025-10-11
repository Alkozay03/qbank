// src/components/NoQuestionsModal.tsx
"use client";

import { X } from "lucide-react";

interface NoQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFilters: {
    mode?: string;
    rotations?: string[];
    resources?: string[];
    disciplines?: string[];
    systems?: string[];
  };
}

export default function NoQuestionsModal({
  isOpen,
  onClose,
  selectedFilters,
}: NoQuestionsModalProps) {
  if (!isOpen) return null;

  const formatFilterName = (key: string): string => {
    const names: Record<string, string> = {
      peds: "Pediatrics",
      surgery: "Surgery",
      medicine: "Internal Medicine",
      obgyn: "Obstetrics & Gynecology",
      psych: "Psychiatry",
      fp: "Family Practice",
      fa: "First Aid",
      uworld: "UWorld",
      amboss: "Amboss",
      previouses: "Previouses",
      unused: "Unused/Unanswered",
      correct: "Correct",
      incorrect: "Incorrect",
      omitted: "Omitted",
      marked: "Marked",
      anatomy: "Anatomy",
      behavioral: "Behavioral Science",
      biochem: "Biochemistry",
      biostat: "Biostatistics",
      development: "Development, Growth, Milestones & Vaccines",
      embryology: "Embryology",
      genetics: "Genetics",
      histology: "Histology",
      immunology: "Immunology",
      micro: "Microbiology",
      neonatology: "Neonatology",
      path: "Pathology",
      pathophys: "Pathophysiology",
      pharm: "Pharmacology",
      physio: "Physiology",
    };
    return names[key] || key;
  };

  const hasFilters =
    selectedFilters.mode ||
    (selectedFilters.rotations && selectedFilters.rotations.length > 0) ||
    (selectedFilters.resources && selectedFilters.resources.length > 0) ||
    (selectedFilters.disciplines && selectedFilters.disciplines.length > 0) ||
    (selectedFilters.systems && selectedFilters.systems.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border-2 border-primary bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X size={24} className="text-gray-600" />
        </button>

        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-yellow-100 p-4">
            <svg
              className="h-12 w-12 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-4 text-center text-2xl font-bold text-gray-900">
          No Questions Found
        </h2>

        {/* Message */}
        <p className="mb-6 text-center text-gray-600">
          {hasFilters ? (
            <>
              There are no questions matching your selected filters. Try
              adjusting your selection or choosing different combinations.
            </>
          ) : (
            <>No questions available. Please select your filters first.</>
          )}
        </p>

        {/* Selected Filters Summary */}
        {hasFilters && (
          <div className="mb-6 rounded-xl bg-gray-50 p-4">
            <p className="mb-2 text-sm font-semibold text-gray-700">
              Your selections:
            </p>
            <ul className="space-y-1 text-sm text-gray-600">
              {selectedFilters.mode && (
                <li>
                  • <span className="font-medium">Mode:</span>{" "}
                  {formatFilterName(selectedFilters.mode)}
                </li>
              )}
              {selectedFilters.rotations &&
                selectedFilters.rotations.length > 0 && (
                  <li>
                    • <span className="font-medium">Rotations:</span>{" "}
                    {selectedFilters.rotations.map(formatFilterName).join(", ")}
                  </li>
                )}
              {selectedFilters.resources &&
                selectedFilters.resources.length > 0 && (
                  <li>
                    • <span className="font-medium">Resources:</span>{" "}
                    {selectedFilters.resources.map(formatFilterName).join(", ")}
                  </li>
                )}
              {selectedFilters.disciplines &&
                selectedFilters.disciplines.length > 0 && (
                  <li>
                    • <span className="font-medium">Disciplines:</span>{" "}
                    {selectedFilters.disciplines
                      .map(formatFilterName)
                      .join(", ")}
                  </li>
                )}
              {selectedFilters.systems && selectedFilters.systems.length > 0 && (
                <li>
                  • <span className="font-medium">Systems:</span>{" "}
                  {selectedFilters.systems.map(formatFilterName).join(", ")}
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-primary py-3 font-bold text-white shadow-md hover:opacity-90 transition-opacity"
        >
          Adjust Filters
        </button>
      </div>
    </div>
  );
}
