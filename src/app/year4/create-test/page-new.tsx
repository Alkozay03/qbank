"use client";

import Shell from "@/components/Shell";
import CascadingFilterSystem from "@/components/CascadingFilterSystem";
import NoQuestionsModal from "@/components/NoQuestionsModal";
import { useEffect, useState, useCallback } from "react";
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
  { key: "im", label: "Internal Medicine" },
  { key: "gs", label: "General Surgery" },
  { key: "peds", label: "Pediatrics" },
  { key: "obgyn", label: "Obstetrics and Gynaecology" },
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
  { key: "psych", label: "Psychiatric/Behavioral & Substance Use Disorder" },
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

export default function CreateTest() {
  const title = "Create Your Test";
  const router = useRouter();

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

  const [qCount, setQCount] = useState<number>(10);
  const [busy, setBusy] = useState(false);
  const [showNoQuestionsModal, setShowNoQuestionsModal] = useState(false);

  const [modeCounts, setModeCounts] = useState<Record<string, number>>({
    unused: 0,
    incorrect: 0,
    correct: 0,
    omitted: 0,
    marked: 0,
  });

  // Fetch initial mode counts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await fetch("/api/quiz/filtered-counts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedModes: [],
            rotationKeys: [],
            resourceValues: [],
            disciplineValues: [],
            systemValues: [],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setModeCounts(data.modeCounts);
        }
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      }
    };

    fetchInitialData();

    // Refetch when tab becomes visible
    const onVisibilityChange = () => {
      if (!document.hidden) {
        fetchInitialData();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onFocus = () => fetchInitialData();
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const handleSelectionChange = useCallback(
    (newSelections: typeof selections) => {
      setSelections(newSelections);
    },
    []
  );

  // Validation
  const isValid =
    selections.mode !== null &&
    selections.rotations.length > 0 &&
    selections.resources.length > 0 &&
    selections.disciplines.length > 0 &&
    selections.systems.length > 0 &&
    qCount >= 1 &&
    qCount <= 100;

  async function submit() {
    if (!isValid || busy) return;

    try {
      setBusy(true);
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: "Y4",
          rotationKeys: selections.rotations,
          resources: selections.resources,
          disciplines: selections.disciplines,
          systems: selections.systems,
          count: qCount,
          types: [selections.mode],
          mode: "RANDOM",
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (data?.error?.includes("No questions")) {
          setShowNoQuestionsModal(true);
          return;
        }
        throw new Error(data?.error || "Failed to create quiz");
      }
      
      router.push(`/year4/quiz/${data.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error creating quiz";
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title={title} pageName="Create Test">
      <section className="space-y-6">
        <CascadingFilterSystem
          year="Y4"
          questionModes={modes}
          rotations={rotations}
          resources={resources}
          disciplines={disciplines}
          systems={systems}
          modeCounts={modeCounts}
          onSelectionChange={handleSelectionChange}
        />

        {/* Count + Create */}
        <div className="flex items-center justify-between gap-4 p-6 rounded-2xl bg-primary-light border-2 border-primary shadow-lg">
          <div className="flex items-center gap-4">
            <label className="text-lg font-semibold text-primary">
              Number of Questions
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={100}
                value={qCount || ""}
                onChange={(e) => setQCount(Number(e.target.value))}
                className="w-32 rounded-2xl border-2 border-border px-4 py-3 text-center text-lg font-bold text-primary bg-card outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                placeholder="1-100"
              />
            </div>
          </div>

          <button
            disabled={!isValid || busy}
            onClick={submit}
            className="
              group relative overflow-hidden rounded-2xl px-8 py-4 font-bold text-inverse text-lg
              bg-primary hover:bg-primary-hover
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg hover:shadow-xl 
              transition-all duration-300
            "
          >
            <span className="relative z-10">
              {busy ? "Creating..." : "Create Test!"}
            </span>
            {!busy && (
              <div className="absolute inset-0 bg-primary-hover opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            )}
          </button>
        </div>

        {!isValid && (
          <p className="text-sm text-red-600 text-center">
            Please complete all required selections to create a test
          </p>
        )}
      </section>

      <NoQuestionsModal
        isOpen={showNoQuestionsModal}
        onClose={() => setShowNoQuestionsModal(false)}
        selectedFilters={{
          mode: selections.mode || undefined,
          rotations: selections.rotations,
          resources: selections.resources,
          disciplines: selections.disciplines,
          systems: selections.systems,
        }}
      />
    </Shell>
  );
}
