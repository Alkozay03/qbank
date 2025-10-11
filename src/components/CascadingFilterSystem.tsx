// src/components/CascadingFilterSystem.tsx
"use client";

import { useState, useEffect } from "react";

interface Option {
  key: string;
  label: string;
  hint?: string;
}

interface CascadingFilterSystemProps {
  year: string;
  questionModes: Option[];
  rotations: Option[];
  resources: Option[];
  disciplines: Option[];
  systems: Option[];
  modeCounts: Record<string, number>;
  onSelectionChange: (_selections: {
    mode: string | null;
    rotations: string[];
    resources: string[];
    disciplines: string[];
    systems: string[];
  }) => void;
}

export default function CascadingFilterSystem({
  year,
  questionModes,
  rotations,
  resources,
  disciplines,
  systems,
  modeCounts,
  onSelectionChange,
}: CascadingFilterSystemProps) {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedRotations, setSelectedRotations] = useState<string[]>([]);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);

  const [dynamicCounts, setDynamicCounts] = useState<{
    rotations: Record<string, number>;
    resources: Record<string, number>;
    disciplines: Record<string, number>;
    systems: Record<string, number>;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  // Fetch dynamic counts whenever upstream selections change
  useEffect(() => {
    if (!selectedMode) {
      setDynamicCounts(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const fetchCounts = async () => {
      try {
        const response = await fetch("/api/quiz/dynamic-counts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year,
            selectedMode,
            selectedRotations,
            selectedResources,
            selectedDisciplines,
          }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Failed to fetch counts");

        const data = await response.json();
        setDynamicCounts(data);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error fetching dynamic counts:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();

    return () => controller.abort();
  }, [year, selectedMode, selectedRotations, selectedResources, selectedDisciplines]);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange({
      mode: selectedMode,
      rotations: selectedRotations,
      resources: selectedResources,
      disciplines: selectedDisciplines,
      systems: selectedSystems,
    });
  }, [selectedMode, selectedRotations, selectedResources, selectedDisciplines, selectedSystems, onSelectionChange]);

  const toggleSelection = (
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    key: string
  ) => {
    const newSelection = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    setter(newSelection);
  };

  const isRotationsUnlocked = selectedMode !== null;
  const isResourcesUnlocked = isRotationsUnlocked && selectedRotations.length > 0;
  const isDisciplinesUnlocked = isResourcesUnlocked && selectedResources.length > 0;
  const isSystemsUnlocked = isDisciplinesUnlocked && selectedDisciplines.length > 0;

  return (
    <div className="space-y-6">
      {/* QUESTION MODE */}
      <div>
        <h3 className="text-lg font-bold mb-3 text-primary">
          1. Question Mode (Required)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {questionModes.map((mode) => {
            const count = modeCounts[mode.key] || 0;
            const isSelected = selectedMode === mode.key;

            return (
              <button
                key={mode.key}
                onClick={() => {
                  setSelectedMode(mode.key);
                  // Reset downstream selections when mode changes
                  setSelectedRotations([]);
                  setSelectedResources([]);
                  setSelectedDisciplines([]);
                  setSelectedSystems([]);
                }}
                className={`rounded-xl border-2 p-4 transition-all ${
                  isSelected
                    ? "border-primary bg-primary-light"
                    : "border-gray-300 hover:border-primary"
                }`}
              >
                <div className="text-sm font-semibold">{mode.label}</div>
                <div className="text-2xl font-bold text-primary mt-1">{count}</div>
                {mode.hint && (
                  <div className="text-xs text-gray-500 mt-1">{mode.hint}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ROTATIONS */}
      <div className={!isRotationsUnlocked ? "opacity-50 pointer-events-none" : ""}>
        <h3 className="text-lg font-bold mb-3 text-primary">
          2. Rotations {!isRotationsUnlocked && "(Select Question Mode First)"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {rotations.map((rotation) => {
            const count = isRotationsUnlocked
              ? dynamicCounts?.rotations[rotation.key] || 0
              : 0;
            const isSelected = selectedRotations.includes(rotation.key);

            return (
              <button
                key={rotation.key}
                onClick={() => {
                  if (isRotationsUnlocked) {
                    toggleSelection(selectedRotations, setSelectedRotations, rotation.key);
                    // Reset downstream when rotations change
                    setSelectedResources([]);
                    setSelectedDisciplines([]);
                    setSelectedSystems([]);
                  }
                }}
                disabled={!isRotationsUnlocked}
                className={`rounded-xl border-2 p-3 transition-all ${
                  !isRotationsUnlocked
                    ? "border-gray-200 bg-gray-50"
                    : isSelected
                    ? "border-primary bg-primary-light"
                    : "border-gray-300 hover:border-primary"
                }`}
              >
                <div className="text-sm font-semibold">{rotation.label}</div>
                <div className="text-xl font-bold text-primary mt-1">
                  {isRotationsUnlocked ? count : "—"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RESOURCES */}
      <div className={!isResourcesUnlocked ? "opacity-50 pointer-events-none" : ""}>
        <h3 className="text-lg font-bold mb-3 text-primary">
          3. Resources {!isResourcesUnlocked && "(Select Rotation(s) First)"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {resources.map((resource) => {
            const count = isResourcesUnlocked
              ? dynamicCounts?.resources[resource.key] || 0
              : 0;
            const isSelected = selectedResources.includes(resource.key);

            return (
              <button
                key={resource.key}
                onClick={() => {
                  if (isResourcesUnlocked) {
                    toggleSelection(selectedResources, setSelectedResources, resource.key);
                    // Reset downstream when resources change
                    setSelectedDisciplines([]);
                    setSelectedSystems([]);
                  }
                }}
                disabled={!isResourcesUnlocked}
                className={`rounded-xl border-2 p-3 transition-all ${
                  !isResourcesUnlocked
                    ? "border-gray-200 bg-gray-50"
                    : isSelected
                    ? "border-primary bg-primary-light"
                    : "border-gray-300 hover:border-primary"
                }`}
              >
                <div className="text-sm font-semibold">{resource.label}</div>
                <div className="text-xl font-bold text-primary mt-1">
                  {isResourcesUnlocked ? count : "—"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* DISCIPLINES */}
      <div className={!isDisciplinesUnlocked ? "opacity-50 pointer-events-none" : ""}>
        <h3 className="text-lg font-bold mb-3 text-primary">
          4. Disciplines {!isDisciplinesUnlocked && "(Select Resource(s) First)"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {disciplines.map((discipline) => {
            const count = isDisciplinesUnlocked
              ? dynamicCounts?.disciplines[discipline.key] || 0
              : 0;
            const isSelected = selectedDisciplines.includes(discipline.key);

            return (
              <button
                key={discipline.key}
                onClick={() => {
                  if (isDisciplinesUnlocked) {
                    toggleSelection(selectedDisciplines, setSelectedDisciplines, discipline.key);
                    // Reset systems when disciplines change
                    setSelectedSystems([]);
                  }
                }}
                disabled={!isDisciplinesUnlocked}
                className={`rounded-xl border-2 p-3 transition-all ${
                  !isDisciplinesUnlocked
                    ? "border-gray-200 bg-gray-50"
                    : isSelected
                    ? "border-primary bg-primary-light"
                    : "border-gray-300 hover:border-primary"
                }`}
              >
                <div className="text-xs font-semibold">{discipline.label}</div>
                <div className="text-lg font-bold text-primary mt-1">
                  {isDisciplinesUnlocked ? count : "—"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SYSTEMS */}
      <div className={!isSystemsUnlocked ? "opacity-50 pointer-events-none" : ""}>
        <h3 className="text-lg font-bold mb-3 text-primary">
          5. Systems {!isSystemsUnlocked && "(Select Discipline(s) First)"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {systems.map((system) => {
            const count = isSystemsUnlocked
              ? dynamicCounts?.systems[system.key] || 0
              : 0;
            const isSelected = selectedSystems.includes(system.key);

            return (
              <button
                key={system.key}
                onClick={() => {
                  if (isSystemsUnlocked) {
                    toggleSelection(selectedSystems, setSelectedSystems, system.key);
                  }
                }}
                disabled={!isSystemsUnlocked}
                className={`rounded-xl border-2 p-3 transition-all ${
                  !isSystemsUnlocked
                    ? "border-gray-200 bg-gray-50"
                    : isSelected
                    ? "border-primary bg-primary-light"
                    : "border-gray-300 hover:border-primary"
                }`}
              >
                <div className="text-xs font-semibold">{system.label}</div>
                <div className="text-lg font-bold text-primary mt-1">
                  {isSystemsUnlocked ? count : "—"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="text-center text-sm text-gray-500">
          Updating counts...
        </div>
      )}
    </div>
  );
}
