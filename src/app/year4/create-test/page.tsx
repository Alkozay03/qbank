"use client";

import Shell from "@/components/Shell";
import SimpleTooltip from "@/components/SimpleTooltip";
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

  const [selModes, setSelModes] = useState<string[]>([]);
  const [selRotations, setSelRotations] = useState<string[]>([]);
  const [selResources, setSelResources] = useState<string[]>([]);
  const [selDisciplines, setSelDisciplines] = useState<string[]>([]);
  const [selSystems, setSelSystems] = useState<string[]>([]);
  const [qCount, setQCount] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [modeCounts, setModeCounts] = useState<{
    unused: number;
    incorrect: number;
    correct: number;
    omitted: number;
    marked: number;
  }>({ unused: 0, incorrect: 0, correct: 0, omitted: 0, marked: 0 });
  const [counts, setCounts] = useState<{
    rotations: Record<string, number>;
    resources: Record<string, number>;
    disciplines: Record<string, number>;
    systems: Record<string, number>;
    topics?: Record<string, number>;
  } | null>(null);

  // Progressive disclosure locks
  const allowRotations = selModes.length > 0;
  const allowResources = selRotations.length > 0;
  const allowDisciplines = selResources.length > 0;
  const allowSystems = selDisciplines.length > 0;

  // validation
  const valid =
    selDisciplines.length > 0 &&
    selSystems.length > 0 &&
    qCount >= 1 &&
    qCount <= 40;

  // effective selections
  const effectiveModes = selModes.length ? selModes : ["unused"];
  const effectiveRot = selRotations.length ? selRotations : rotations.map((o) => o.key);
  const effectiveRes = selResources.length ? selResources : resources.map((o) => o.key);

  // toggle helpers
  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>, key: string) {
    setter((_prev) =>
      _prev.includes(key) ? _prev.filter((_k) => _k !== key) : [..._prev, key]
    );
  }

  function toggleAll(setter: (_v: string[]) => void, list: Option[], _checked: boolean) {
    setter(_checked ? list.map((o) => o.key) : []);
  }

  // Get count for specific mode
  function getModeCount(modeKey: string): number {
    switch (modeKey) {
      case "unused": return modeCounts.unused;
      case "incorrect": return modeCounts.incorrect;
      case "correct": return modeCounts.correct;
      case "omitted": return modeCounts.omitted;
      case "marked": return modeCounts.marked;
      default: return 0;
    }
  }

  // Fetch ONLY tag counts when selections change (debounced) - MODE COUNTS NEVER CHANGE
  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/quiz/filtered-counts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ 
            selectedModes: selModes,
            rotationKeys: selRotations,
            resourceValues: selResources,
            disciplineValues: selDisciplines,
            systemValues: selSystems 
          }),
        });
        if (!r.ok) return;
        const j = await r.json();
        // ONLY update tag counts, NOT mode counts (mode counts stay constant)
        setCounts(j.tagCounts);
      } catch {
        // ignore
      }
    }, 500); // Increased from 250ms to 500ms to reduce API call frequency
    return () => { controller.abort(); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selModes.join(","), selRotations.join(","), selResources.join(","), selDisciplines.join(","), selSystems.join(",")]);

  // Fetch initial mode counts ONCE on mount (and refresh when page becomes visible)
  useEffect(() => {
    let lastFetchTime = Date.now();
    
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
            systemValues: [] 
          }),
        });
        if (response.ok) {
          const data = await response.json();
          // Set mode counts ONCE - they never change after this
          setModeCounts(data.modeCounts);
          setCounts(data.tagCounts);
          lastFetchTime = Date.now();
        }
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      }
    };
    
    fetchInitialData();
    
    // Throttled refetch when tab becomes visible (only if been away 60+ seconds)
    const onVisibilityChange = () => {
      if (!document.hidden && Date.now() - lastFetchTime > 60000) {
        fetchInitialData();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  async function submit() {
    if (!valid || busy) return;

    try {
      setBusy(true);
      // Send exactly your chip keys; backend maps and randomizes
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: "Y4",
          rotationKeys: effectiveRot,       // ["im","gs",...]
          resources: effectiveRes,          // kept for future use
          disciplines: selDisciplines,      // kept for future use
          systems: selSystems,              // kept for future use
          count: qCount,
          types: effectiveModes,            // ["unused","incorrect","marked",...]
          mode: "RANDOM",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create quiz");
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
        {/* Modes */}
        <Card>
          <HeaderRow title="Question Mode" />
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {modes.map((m) => {
              const isSelected = selModes.includes(m.key);
              return (
                <label
                  key={m.key}
                  className={`
                    group relative flex items-center justify-between gap-2 rounded-xl px-4 py-3 cursor-pointer transition-all duration-300 ease-out btn-hover
                    ${isSelected 
                      ? 'theme-gradient text-inverse shadow-lg' 
                      : 'bg-white border border-border hover:bg-accent hover:border-primary'
                    }
                  `}
                >
                  <span className={`flex-1 font-semibold break-words ${isSelected ? '' : 'text-primary'}`}>{m.label}</span>
                  <div className="flex items-center gap-3">
                    <span className={`
                      text-xs rounded-full px-3 py-1.5 min-w-8 text-center font-bold transition-colors
                      ${isSelected 
                        ? 'bg-white' 
                        : 'theme-gradient text-inverse'
                      }
                    `}>
                      <span className={isSelected ? 'theme-gradient-text' : ''}>
                        {getModeCount(m.key)}
                      </span>
                    </span>
                    {m.hint && (
                      <SimpleTooltip text={m.hint}>
                        <span 
                          className={`ml-1 text-base transition-colors cursor-help font-bold ${isSelected ? 'text-inverse' : 'theme-gradient-text'}`}
                        >
                          ⓘ
                        </span>
                      </SimpleTooltip>
                    )}
                    <div className="relative inline-flex items-center justify-center w-4 h-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(setSelModes, m.key)}
                        className="w-4 h-4 cursor-pointer appearance-none rounded border bg-white"
                        style={{
                          borderColor: 'var(--color-primary)',
                          borderWidth: '1.5px',
                          backgroundColor: isSelected ? 'var(--color-primary)' : 'white',
                        }}
                      />
                      {isSelected && (
                        <svg className="absolute w-2.5 h-2.5 pointer-events-none text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </Card>

        {/* Rotations */}
        <Card locked={!allowRotations}>
          <HeaderRow
            title="Rotation"
            withAll
            disabledAll={!allowRotations}
            onAll={(_checked) => toggleAll(setSelRotations, rotations, _checked)}
          />
          <CheckGrid
            list={rotations}
            selected={selRotations}
            onToggle={(optKey) => toggle(setSelRotations, optKey)}
            disabled={!allowRotations}
            counts={counts}
            section="rotations"
          />
          {!allowRotations && (
            <p className="mt-2 text-sm text-red-600">
              Select at least one question mode to choose rotations.
            </p>
          )}
        </Card>

        {/* Resources */}
        <Card locked={!allowResources}>
          <HeaderRow
            title="Resources"
            withAll
            disabledAll={!allowResources}
            onAll={(_checked) => toggleAll(setSelResources, resources, _checked)}
          />
          <CheckGrid
            list={resources}
            selected={selResources}
            onToggle={(optKey) => toggle(setSelResources, optKey)}
            disabled={!allowResources}
            counts={counts}
            section="resources"
          />
          {!allowResources && (
            <p className="mt-2 text-sm text-red-600">
              Select at least one rotation to choose resources.
            </p>
          )}
        </Card>

        {/* Disciplines */}
        <Card locked={!allowDisciplines}>
          <HeaderRow
            title="Discipline"
            withAll
            disabledAll={!allowDisciplines}
            onAll={(_checked) => toggleAll(setSelDisciplines, disciplines, _checked)}
          />
          <CheckGrid
            list={disciplines}
            selected={selDisciplines}
            onToggle={(optKey) => toggle(setSelDisciplines, optKey)}
            disabled={!allowDisciplines}
            counts={counts}
            section="disciplines"
          />
          {!allowDisciplines && (
            <p className="mt-2 text-sm text-red-600">
              Select at least one resource to choose disciplines.
            </p>
          )}
        </Card>

        {/* Systems */}
        <Card locked={!allowSystems}>
          <HeaderRow
            title="System"
            withAll
            disabledAll={!allowSystems}
            onAll={(_checked) => toggleAll(setSelSystems, systems, _checked)}
          />
          <CheckGrid
            list={systems}
            selected={selSystems}
            onToggle={(optKey) => toggle(setSelSystems, optKey)}
            disabled={!allowSystems}
            counts={counts}
            section="systems"
          />
          {!allowSystems && (
            <p className="mt-2 text-sm text-red-600">
              Select at least one discipline to choose systems.
            </p>
          )}
        </Card>

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
            disabled={!valid || busy}
            onClick={submit}
            className="
              group relative overflow-hidden rounded-2xl px-8 py-4 font-bold text-inverse text-lg btn-hover color-smooth
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

        <p className="text-xs text-muted-foreground">
          If you do not select rotations/resources/question mode, defaults are applied
          automatically (all rotations/resources; Unanswered mode).
        </p>
      </section>
    </Shell>
  );
}

function HeaderRow({
  title,
  withAll,
  onAll,
  disabledAll,
}: {
  title: string;
  withAll?: boolean;
  onAll?: (_checked: boolean) => void;
  disabledAll?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-lg font-bold theme-gradient-text">{title}</div>
      {withAll && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            onChange={(e) => onAll?.(e.target.checked)}
            disabled={disabledAll}
            className="h-4 w-4"
          />
          Select All
        </label>
      )}
    </div>
  );
}

function CheckGrid({
  list,
  selected,
  onToggle,
  disabled,
  counts,
  section,
}: {
  list: Option[];
  selected: string[];
  onToggle: (_optKey: string) => void;
  disabled?: boolean;
  counts?: {
    rotations: Record<string, number>;
    resources: Record<string, number>;
    disciplines: Record<string, number>;
    systems: Record<string, number>;
    topics?: Record<string, number>;
  } | null;
  section: "rotations" | "resources" | "disciplines" | "systems" | "topics";
}) {
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {list.map((o) => {
        const isSelected = selected.includes(o.key);
        const displayCount = disabled ? '—' : (counts?.[section]?.[o.key] ?? 0);
        return (
          <label
            key={o.key}
            className={`
              group relative flex items-center justify-between gap-2 rounded-xl px-4 py-3 cursor-pointer transition-all duration-300 ease-out btn-hover
              ${isSelected 
                ? 'theme-gradient text-inverse shadow-lg' 
                : 'bg-white border border-border hover:bg-accent hover:border-primary'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <span className={`flex-1 font-semibold break-words ${isSelected ? '' : 'text-primary'}`}>{o.label}</span>
            <div className="flex items-center gap-3">
              <span className={`
                text-xs rounded-full px-3 py-1.5 min-w-8 text-center font-bold transition-colors
                ${isSelected 
                  ? 'bg-white' 
                  : 'theme-gradient text-inverse'
                }
              `}>
                <span className={isSelected ? 'theme-gradient-text' : ''}>
                  {displayCount}
                </span>
              </span>
              <div className="relative inline-flex items-center justify-center w-4 h-4">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(o.key)}
                  disabled={disabled}
                  className="w-4 h-4 cursor-pointer appearance-none rounded border bg-white"
                  style={{
                    borderColor: 'var(--color-primary)',
                    borderWidth: '1.5px',
                    backgroundColor: isSelected ? 'var(--color-primary)' : 'white',
                  }}
                />
                {isSelected && (
                  <svg className="absolute w-2.5 h-2.5 pointer-events-none text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}

function Card({ children, locked }: { children: React.ReactNode; locked?: boolean }) {
  return (
    <div className={`
      rounded-2xl bg-primary-light border-2 border-primary p-6 shadow-lg transition-all duration-300
      ${locked ? 'opacity-50 pointer-events-none' : ''}
    `}>
      {children}
    </div>
  );
}



