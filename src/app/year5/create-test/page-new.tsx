"use client";

import Shell from "@/components/Shell";
import CascadingFilterSystem from "@/components/CascadingFilterSystem";
import NoQuestionsModal from "@/components/NoQuestionsModal";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Option = { key: string; label: string; hint?: string };

const modes: Option[] = [
  { key: "unused", label: "Unused/Unanswered", hint: "Selects questions from a set of new/unseen questions" },
  { key: "incorrect", label: "Incorrect", hint: "Previously answered incorrectly" },
  { key: "omitted", label: "Omitted", hint: "Previously omitted after submitting exam" },
  { key: "correct", label: "Correct", hint: "Previously answered correctly" },
  { key: "marked", label: "Marked", hint: "Previously marked/flagged for review" },
];

const rotations: Option[] = [
  { key: "fm", label: "Family Medicine" },
  { key: "psych", label: "Psychiatry" },
  { key: "gs2", label: "General Surgery 2" },
  { key: "im2", label: "Internal Medicine 2" },
];

const resources: Option[] = [
  { key: "uworld_s1", label: "UWorld - Step 1" },
  { key: "uworld_s2", label: "UWorld - Step 2" },
  { key: "amboss", label: "Amboss" },
  { key: "beyond", label: "Boards & beyond" },
  { key: "previouses", label: "Previouses" },
];

const disciplines: Option[] = [
  { key: "anatomy", label: "Anatomy" },
  { key: "behavioral", label: "Behavioral science" },
  { key: "biochem", label: "Biochemistry" },
  { key: "biostat", label: "Biostatistics" },
  { key: "development", label: "Development, Growth, Milestones & Vaccines" },
  { key: "embryology", label: "Embryology" },
  { key: "genetics", label: "Genetics" },
  { key: "histology", label: "Histology" },
  { key: "immunology", label: "Immunology" },
  { key: "micro", label: "Microbiology" },
  { key: "neonatology", label: "Neonatology" },
  { key: "path", label: "Pathology" },
  { key: "pathophys", label: "Pathophysiology" },
  { key: "pharm", label: "Pharmacology" },
  { key: "physio", label: "Physiology" },
];

const systems: Option[] = [
  { key: "bio_general", label: "Biochemistry (General Principles)" },
  { key: "gen_general", label: "Genetics (General Principles)" },
  { key: "micro_general", label: "Microbiology (General Principles)" },
  { key: "path_general", label: "Pathology (General Principles)" },
  { key: "pharm_general", label: "Pharmacology (General Principles)" },
  { key: "biostat_epi", label: "Biostatistics & Epidemiology" },
  { key: "poison_env", label: "Poisoning & Environmental Exposure" },
  { key: "psych_sys", label: "Psychiatric/Behavioral & Substance Use Disorder" },
  { key: "social", label: "Social Sciences (Ethics/Legal/Professional)" },
  { key: "misc", label: "Miscellaneous (Multisystem)" },
  { key: "allergy_immuno", label: "Allergy & Immunology" },
  { key: "cardio", label: "Cardiovascular System" },
  { key: "derm", label: "Dermatology" },
  { key: "ent", label: "Ear, Nose & Throat (ENT)" },
  { key: "endocrine", label: "Endocrine, Diabetes & Metabolism" },
  { key: "female_repro", label: "Female Reproductive System & Breast" },
  { key: "gi", label: "Gastrointestinal & Nutrition" },
  { key: "heme_onc", label: "Hematology & Oncology" },
  { key: "id", label: "Infectious Diseases" },
  { key: "male_repro", label: "Male Reproductive System" },
  { key: "neuro", label: "Nervous System" },
  { key: "ophtho", label: "Ophthalmology" },
  { key: "pregnancy", label: "Pregnancy, Childbirth & Puerperium" },
  { key: "pulm", label: "Pulmonary & Critical Care" },
  { key: "renal", label: "Renal, Urinary Systems & Electrolytes" },
  { key: "rheum", label: "Rheumatology, Orthopedics & Sports" },
];

type ModeCounts = Record<string, number>;

export default function CreateTestPage() {
  const router = useRouter();
  const [modeCounts, setModeCounts] = useState<ModeCounts>({});
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<{
    mode: string | null;
    rotations: string[];
    resources: string[];
    disciplines: string[];
    systems: string[];
  }>({
    mode: null,
    rotations: [],
    resources: [],
    disciplines: [],
    systems: [],
  });
  const [showNoQuestionsModal, setShowNoQuestionsModal] = useState(false);

  // Fetch initial mode counts
  useEffect(() => {
    async function fetchModeCounts() {
      try {
        const response = await fetch("/api/quiz/mode-counts?year=year5");
        if (!response.ok) throw new Error("Failed to fetch mode counts");
        const data = await response.json();
        setModeCounts(data.modeCounts || {});
      } catch (error) {
        console.error("Error fetching mode counts:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchModeCounts();
  }, []);

  // Handle selection changes from CascadingFilterSystem
  const handleSelectionChange = (newSelections: {
    mode: string | null;
    rotations: string[];
    resources: string[];
    disciplines: string[];
    systems: string[];
  }) => {
    setSelections(newSelections);
  };

  // Validate selections
  const isValid = () => {
    return (
      selections.mode !== null &&
      selections.rotations.length > 0 &&
      selections.resources.length > 0 &&
      selections.disciplines.length > 0 &&
      selections.systems.length > 0
    );
  };

  // Handle quiz creation
  const handleCreateQuiz = async () => {
    if (!isValid()) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: "year5",
        mode: selections.mode!,
        rotations: selections.rotations.join(","),
        resources: selections.resources.join(","),
        disciplines: selections.disciplines.join(","),
        systems: selections.systems.join(","),
      });

      const response = await fetch(`/api/quiz/select?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to create quiz");

      const data = await response.json();

      if (data.questionIds && data.questionIds.length > 0) {
        // Store in sessionStorage and navigate
        sessionStorage.setItem("currentQuizIds", JSON.stringify(data.questionIds));
        sessionStorage.setItem("currentQuizIndex", "0");
        router.push("/year5/quiz");
      } else {
        // Show no questions modal
        setShowNoQuestionsModal(true);
      }
    } catch (error) {
      console.error("Error creating quiz:", error);
      alert("Error creating quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && Object.keys(modeCounts).length === 0) {
    return (
      <Shell title="Create Custom Quiz - Year 5">
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <div className="text-center text-gray-400">Loading...</div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Create Custom Quiz - Year 5">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold text-white">Create Custom Quiz - Year 5</h1>

        <CascadingFilterSystem
          year="year5"
          modeCounts={modeCounts}
          questionModes={modes}
          rotations={rotations}
          resources={resources}
          disciplines={disciplines}
          systems={systems}
          onSelectionChange={handleSelectionChange}
        />

        {/* Create Quiz Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleCreateQuiz}
            disabled={!isValid() || loading}
            className={`
              rounded-lg px-8 py-3 text-lg font-semibold transition-all
              ${
                isValid() && !loading
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "cursor-not-allowed bg-gray-700 text-gray-400"
              }
            `}
          >
            {loading ? "Creating Quiz..." : "Create Quiz"}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 rounded-lg bg-gray-800/50 p-6">
          <h2 className="mb-3 text-xl font-semibold text-white">How it works:</h2>
          <ul className="list-inside list-disc space-y-2 text-gray-300">
            <li>Select a question mode first to unlock rotation filters</li>
            <li>Select at least one rotation to unlock resource filters</li>
            <li>Select at least one resource to unlock discipline filters</li>
            <li>Select at least one discipline to unlock system filters</li>
            <li>Select at least one system to enable quiz creation</li>
            <li>Counts update automatically as you make selections</li>
            <li>You can select multiple options within each category</li>
          </ul>
        </div>
      </div>

      {/* No Questions Modal */}
      <NoQuestionsModal
        isOpen={showNoQuestionsModal}
        onClose={() => setShowNoQuestionsModal(false)}
        selectedFilters={{
          mode: selections.mode || "",
          rotations: selections.rotations,
          resources: selections.resources,
          disciplines: selections.disciplines,
          systems: selections.systems,
        }}
      />
    </Shell>
  );
}
