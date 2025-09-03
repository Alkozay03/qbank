"use client";

import Shell from "@/components/Shell";
import { useState } from "react";
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
  { key: "uworld", label: "UWorld" },
  { key: "amboss", label: "Amboss" },
  { key: "beyond", label: "Boards & beyond" },
  { key: "previouses", label: "Previouses" },
];

const disciplines: Option[] = [
  { key: "anatomy", label: "Anatomy" },
  { key: "behavioral", label: "Behavioral science" },
  { key: "biochem", label: "Biochemistry" },
  { key: "biostat", label: "Biostatistics" },
  { key: "embryology", label: "Embryology" },
  { key: "genetics", label: "Genetics" },
  { key: "histology", label: "Histology" },
  { key: "immunology", label: "Immunology" },
  { key: "micro", label: "Microbiology" },
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
  { key: "rheum", label: "Rheumatology/Orthopedics & Sports" },
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
    } catch (e: any) {
      alert(e.message || "Error creating quiz");
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
          <div className="mt-3 flex flex-wrap gap-3">
            {modes.map((m) => (
              <label
                key={m.key}
                className="inline-flex items-center gap-2 bg-white border border-[#E6F0F7] rounded-xl px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={selModes.includes(m.key)}
                  onChange={() => toggle(setSelModes, m.key)}
                  className="h-4 w-4"
                />
                <span>{m.label}</span>
                {m.hint && (
                  <span className="ml-1 text-xs text-slate-500" title={m.hint}>
                    ⓘ
                  </span>
                )}
                <CountPill />
              </label>
            ))}
          </div>
        </Card>

        {/* Rotations */}
        <Card>
          <HeaderRow
            title="Rotation"
            withAll
            onAll={(_checked) => toggleAll(setSelRotations, rotations, _checked)}
          />
          <CheckGrid
            list={rotations}
            selected={selRotations}
            onToggle={(optKey) => toggle(setSelRotations, optKey)}
          />
        </Card>

        {/* Resources */}
        <Card>
          <HeaderRow
            title="Resources"
            withAll
            onAll={(_checked) => toggleAll(setSelResources, resources, _checked)}
          />
          <CheckGrid
            list={resources}
            selected={selResources}
            onToggle={(optKey) => toggle(setSelResources, optKey)}
          />
        </Card>

        {/* Disciplines */}
        <Card>
          <HeaderRow
            title="Discipline"
            withAll
            onAll={(_checked) => toggleAll(setSelDisciplines, disciplines, _checked)}
          />
          <CheckGrid
            list={disciplines}
            selected={selDisciplines}
            onToggle={(optKey) => toggle(setSelDisciplines, optKey)}
          />
        </Card>

        {/* Systems */}
        <Card>
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
          />
          {!allowSystems && (
            <p className="mt-2 text-sm text-red-600">
              Select at least one discipline to choose systems.
            </p>
          )}
        </Card>

        {/* Count + Create */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">
              Number of Questions
            </label>
            <input
              type="number"
              min={1}
              max={40}
              value={qCount || ""}
              onChange={(e) => setQCount(Number(e.target.value))}
              className="w-24 rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#A5CDE4]"
              placeholder="1-40"
            />
          </div>

          <button
            disabled={!valid || busy}
            onClick={submit}
            className="
              rounded-2xl px-6 py-2 font-semibold text-white
              bg-[#7DB8D9] hover:bg-[#56A2CD]
              disabled:opacity-60 disabled:cursor-not-allowed
              shadow transition
            "
          >
            {busy ? "Creating..." : "Create Test!"}
          </button>
        </div>

        <p className="text-xs text-slate-500">
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
      <div className="text-lg font-semibold text-[#2F6F8F]">{title}</div>
      {withAll && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
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
}: {
  list: Option[];
  selected: string[];
  onToggle: (_optKey: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {list.map((o) => (
        <label
          key={o.key}
          className="inline-flex items-center justify-between gap-2 bg-white border border-[#E6F0F7] rounded-xl px-3 py-2"
        >
          <span className="flex-1">{o.label}</span>
          <div className="flex items-center gap-3">
            <CountPill />
            <input
              type="checkbox"
              checked={selected.includes(o.key)}
              onChange={() => onToggle(o.key)}
              disabled={disabled}
              className="h-4 w-4"
            />
          </div>
        </label>
      ))}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-[#E6F0F7] p-4 shadow">
      {children}
    </div>
  );
}

function CountPill() {
  return (
    <span className="text-xs rounded-full bg-[#F3F9FC] text-[#2F6F8F] px-2 py-0.5">
      —
    </span>
  );
}
