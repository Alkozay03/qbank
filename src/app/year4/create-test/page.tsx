"use client";

import Shell from "@/components/Shell";
import SimpleTooltip from "@/components/SimpleTooltip";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Option = { key: string; label: string; hint?: string };

const modes: Option[] = [
  { key: "unused", label: "Unused/Unanswered", hint: "Selects questions from a set of new/unseen questions" },
  { key: "incorrect", label: "Incorrect", hint: "Previously answered incorrectly" },
  { key: "omitted", label: "Omitted", hint: "Previously omitted after submitting exam" },
  { key: "correct", label: "Correct", hint: "Previously answered correctly" },
  { key: "marked", label: "Marked", hint: "Previously marked/flagged for review" },
  { key: "used", label: "Used (suspended)", hint: "Appeared in a suspended quiz and remains unanswered" },
];

const rotations: Option[] = [
  { key: "im", label: "Internal Medicine" },
  { key: "gs", label: "General Surgery" },
  { key: "peds", label: "Pediatrics" },
  { key: "obgyn", label: "Obstetrics and Gynaecology" },
];

const topicsByRotation: Record<string, Option[]> = {
  gs: [
    { key: "gs_large_bowel_disease", label: "Large bowel disease" },
    { key: "gs_diabetic_foot_pvd", label: "Diabetic foot and Peripheral Vascular Disease" },
    { key: "gs_abdominal_wall", label: "Abdominal wall" },
    { key: "gs_hernias", label: "Hernias" },
    { key: "gs_breast_disease", label: "Breast disease" },
    { key: "gs_pre_post_op", label: "Pre-operative & Post-operative" },
    { key: "gs_thyroid_neck_endocrine", label: "Thyroid, neck, and other endocrine organs" },
    { key: "gs_spleen_kidney", label: "Spleen and Kidney" },
    { key: "gs_hepatobiliary_pancreatic", label: "Hepatobiliary and pancreatic disease" },
    { key: "gs_wound_healing", label: "Wound healing" },
    { key: "gs_small_bowel", label: "Small Bowel diseases" },
    { key: "gs_skin_soft_tissue_infection", label: "Skin & Soft tissue infection" },
    { key: "gs_stomach_esophagus", label: "Stomach and Esophagus" },
    { key: "gs_ethics_misc", label: "Ethics and Misc." },
    { key: "gs_emergency_burns_icu_trauma", label: "Emergency, Burns, ICU, Electrolytes & Trauma" },
    { key: "gs_emqs", label: "EMQs" },
    { key: "topic_not_selected", label: "Not Selected" },
  ],
  obgyn: [
    { key: "obgyn_antenatal_care_complications", label: "Antenatal Care & Common Complications" },
    { key: "obgyn_early_pregnancy_complications", label: "Early Pregnancy Complications" },
    { key: "obgyn_fetal_growth_surveillance", label: "Fetal Growth & Surveillance" },
    { key: "obgyn_normal_abnormal_labor", label: "Normal & Abnormal Labor" },
    { key: "obgyn_obstetric_emergencies", label: "Obstetric Emergencies" },
    { key: "obgyn_postpartum_care", label: "Postpartum Care" },
    { key: "obgyn_menstrual_hormonal_disorders", label: "Menstrual & Hormonal Disorders" },
    { key: "obgyn_uterine_ovarian_pathologies", label: "Uterine & Ovarian Pathologies" },
    { key: "obgyn_gynecologic_malignancies", label: "Gynecologic Malignancies" },
    { key: "obgyn_infertility_contraception", label: "Infertility & Contraception" },
    { key: "obgyn_pelvic_floor_infections", label: "Pelvic Floor Disorders & Genital Infections" },
    { key: "obgyn_multiple_pregnancy_malpresentation", label: "Multiple Pregnancy & Malpresentation" },
    { key: "obgyn_preterm_labor_prom", label: "Preterm Labor & PROM" },
    { key: "obgyn_hyperemesis_gravidarum", label: "Hyperemesis Gravidarum" },
    { key: "obgyn_miscellaneous", label: "Miscellaneous & Others" },
    { key: "topic_not_selected", label: "Not Selected" },
  ],
  peds: [
    { key: "peds_development_growth_vaccines", label: "Development, growth, milestones, vaccines" },
    { key: "peds_neonatology", label: "Neonatology" },
    { key: "peds_gastroenterology", label: "Gastroenterology" },
    { key: "peds_pulmonology", label: "Pulmonology / Respiratory" },
    { key: "peds_infectious_disease", label: "Infectious Disease" },
    { key: "peds_cardiology", label: "Cardiology" },
    { key: "peds_haematology", label: "Haematology" },
    { key: "peds_endocrinology", label: "Endocrinology" },
    { key: "peds_msk_derma_rheum", label: "MSK, Derma & Rheumatology" },
    { key: "peds_genetics_metabolic", label: "Genetics / Metabolic" },
    { key: "peds_urology_nephrology", label: "Urology / Nephrology" },
    { key: "peds_neurology", label: "Neurology" },
    { key: "peds_psychiatry", label: "Psychiatry" },
    { key: "peds_miscellaneous", label: "Miscellaneous" },
    { key: "topic_not_selected", label: "Not Selected" },
  ],
  im: [
    { key: "im_cardiology", label: "Cardiology" },
    { key: "im_pulmonology", label: "Pulmonology" },
    { key: "im_msk_connective_rheum", label: "Musculoskeletal, Connective Tissues & Rheumatology" },
    { key: "im_gastroenterology", label: "Gastroenterology" },
    { key: "im_hematology_oncology", label: "Hematology & Oncology" },
    { key: "im_nephrology", label: "Nephrology" },
    { key: "im_infectious_diseases", label: "Infectious Diseases" },
    { key: "im_neurology", label: "Neurology" },
    { key: "im_endocrinology_others", label: "Endocrinology & Others" },
    { key: "topic_not_selected", label: "Not Selected" },
  ],
};

export default function CreateTest() {
  const title = "Create Your Test";
  const router = useRouter();

  const [selModes, setSelModes] = useState<string[]>([]);
  const [selRotations, setSelRotations] = useState<string[]>([]);
  const [selTopics, setSelTopics] = useState<string[]>([]);
  const [qCount, setQCount] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [modeCounts, setModeCounts] = useState<{
    unused: number;
    incorrect: number;
    correct: number;
    omitted: number;
    marked: number;
    used: number;
  }>({ unused: 0, incorrect: 0, correct: 0, omitted: 0, marked: 0, used: 0 });
  const [counts, setCounts] = useState<{
    rotations: Record<string, number>;
    topics: Record<string, number>;
  } | null>(null);

  // Test type (Tutored vs Review)
  const [testMode, setTestMode] = useState<"tutored" | "review">("tutored");

  // Progressive disclosure locks
  const allowRotations = testMode === "review" ? true : selModes.length > 0;
  const allowTopics = selRotations.length > 0;

  // validation
  const valid =
    testMode === "review"
      ? true
      : qCount >= 1 &&
        qCount <= 100;

  // effective selections
  const effectiveModes = selModes.length ? selModes : ["unused"];
  const effectiveRot = selRotations.length ? selRotations : rotations.map((o) => o.key);

  // toggle helpers
  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>, key: string) {
    setter((_prev) =>
      _prev.includes(key) ? _prev.filter((_k) => _k !== key) : [..._prev, key]
    );
  }

  function toggleAll(setter: (_v: string[]) => void, list: Option[], _checked: boolean) {
    setter(_checked ? list.map((o) => o.key) : []);
  }

  const topicOptions = Array.from(
    new Map(
      selRotations
        .flatMap((rot) => topicsByRotation[rot] ?? [])
        .map((opt) => [opt.key, opt])
    ).values()
  );
  const allowedTopicKeys = useMemo(() => new Set(topicOptions.map((o) => o.key)), [topicOptions]);
  const displayTopicOptions = topicOptions.filter((o) => o.key !== "topic_not_selected");

  useEffect(() => {
    setSelTopics((prev) => prev.filter((key) => allowedTopicKeys.has(key)));
  }, [allowedTopicKeys]);

  // Auto-include hidden "Not Selected" topic if supported
  useEffect(() => {
    if (allowedTopicKeys.has("topic_not_selected") && !selTopics.includes("topic_not_selected")) {
      setSelTopics((prev) => [...prev, "topic_not_selected"]);
    }
  }, [allowedTopicKeys, selTopics]);

  // Get count for specific mode
  function getModeCount(modeKey: string): number {
    switch (modeKey) {
      case "unused": return modeCounts.unused;
      case "incorrect": return modeCounts.incorrect;
      case "correct": return modeCounts.correct;
      case "omitted": return modeCounts.omitted;
      case "marked": return modeCounts.marked;
      case "used": return modeCounts.used;
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
            topicValues: selTopics,
          }),
        });
        if (!r.ok) return;
        const j = await r.json();
        // ONLY update tag counts, NOT mode counts (mode counts stay constant)
        setCounts({
          rotations: j.tagCounts?.rotations ?? {},
          topics: j.tagCounts?.topics ?? {},
        });
      } catch {
        // ignore
      }
    }, 500); // Increased from 250ms to 500ms to reduce API call frequency
    return () => { controller.abort(); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selModes.join(","), selRotations.join(","), selTopics.join(","), testMode]);

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
            topicValues: []
          }),
        });
        if (response.ok) {
          const data = await response.json();
          // Set mode counts ONCE - they never change after this
          setModeCounts(data.modeCounts);
          setCounts({
            rotations: data.tagCounts.rotations ?? {},
            topics: data.tagCounts.topics ?? {},
          });
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
      const payload =
        testMode === "review"
          ? {
              year: "Y4",
              rotationKeys: effectiveRot,
              topics: selTopics,
              reviewMode: true,
            }
          : {
              year: "Y4",
              rotationKeys: effectiveRot,       // ["im","gs",...]
              topics: selTopics,                // new topic filter
              count: qCount,
              types: effectiveModes,            // ["unused","incorrect","marked",...]
              mode: "RANDOM",
            };

      // Send exactly your chip keys; backend maps and randomizes
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        {/* Test Type */}
        <Card>
          <HeaderRow title="Test Type" />
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "tutored", label: "Tutored Test", description: "Use question modes and filters with a question limit." },
              { key: "review", label: "Review", description: "Pull every question from the selected rotations and show the answers." },
            ].map((opt) => {
              const active = testMode === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTestMode(opt.key as "tutored" | "review")}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-300 ${
                    active
                      ? "theme-gradient text-inverse shadow-lg"
                      : "bg-white border-border hover:bg-accent hover:border-primary"
                  }`}
                >
                  <div className="flex-1">
                    <div className={`font-semibold ${active ? "" : "text-primary"}`}>{opt.label}</div>
                    <p className={`text-sm mt-0.5 ${active ? "text-inverse/90" : "text-slate-600"}`}>{opt.description}</p>
                  </div>
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${
                      active ? "bg-white text-primary" : "theme-gradient text-inverse"
                    }`}
                  >
                    {active ? "Selected" : "Tap to choose"}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Question Mode */}
        <Card>
          <HeaderRow title="Question Mode" />
          {testMode === "review" ? (
            <p className="mt-3 text-sm text-primary">
              Review mode ignores question modes and adds every question from the chosen rotations with the correct answers revealed.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modes.map((m) => {
                const isSelected = selModes.includes(m.key);
                return (
                  <label
                    key={m.key}
                    className={`group relative flex items-center justify-between gap-2 rounded-xl px-4 py-3 cursor-pointer transition-all duration-300 ease-out btn-hover ${
                      isSelected
                        ? "theme-gradient text-inverse shadow-lg"
                        : "bg-white border border-border hover:bg-accent hover:border-primary"
                    }`}
                  >
                    <span className={`flex-1 font-semibold break-words ${isSelected ? "" : "text-primary"}`}>{m.label}</span>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs rounded-full px-3 py-1.5 min-w-8 text-center font-bold transition-colors ${
                          isSelected ? "bg-white" : "theme-gradient text-inverse"
                        }`}
                      >
                        <span className={isSelected ? "theme-gradient-text" : ""}>
                          {getModeCount(m.key)}
                        </span>
                      </span>
                      {m.hint && (
                        <SimpleTooltip text={m.hint}>
                          <span
                            className={`ml-1 text-base transition-colors cursor-help font-bold ${isSelected ? "text-inverse" : "theme-gradient-text"}`}
                          >
                            i
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
          )}
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

        {/* Topics */}
        <Card locked={!allowTopics}>
          <HeaderRow
            title="Topics"
            disabledAll={!allowTopics || topicOptions.length === 0}
            withAll
            onAll={(_checked) => toggleAll(setSelTopics, displayTopicOptions, _checked)}
          />
          {topicOptions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              Select a rotation that supports topics to see available options.
            </p>
          ) : (
            <CheckGrid
              list={displayTopicOptions}
              selected={selTopics}
              onToggle={(optKey) => toggle(setSelTopics, optKey)}
              disabled={!allowTopics}
              counts={counts}
              section="topics"
            />
          )}
          {!allowTopics && (
            <p className="mt-2 text-sm text-red-600">
              Select at least one rotation to choose topics.
            </p>
          )}
        </Card>

        {/* Count + Create */}
        {testMode === "review" ? (
          <div className="flex items-center justify-between gap-4 p-6 rounded-2xl bg-primary-light border-2 border-primary shadow-lg">
            <div className="flex-1">
              <div className="text-lg font-semibold text-primary">Create Review</div>
              <p className="text-sm text-slate-700">
                All questions from the selected rotation(s) will be added with answers revealed. No question limit.
              </p>
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
                {busy ? "Creating..." : "Start Review"}
              </span>
              {!busy && (
                <div className="absolute inset-0 bg-primary-hover opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              )}
            </button>
          </div>
        ) : (
          <>
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
              If you do not select rotations or question mode, defaults are applied automatically (all rotations; Unanswered mode).
            </p>
          </>
        )}
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
    topics: Record<string, number>;
  } | null;
  section: "rotations" | "topics";
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



