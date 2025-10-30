"use client";

import Shell from "@/components/Shell";
import SimpleTooltip from "@/components/SimpleTooltip";
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

const weeks: Option[] = [
  { key: "Week 1", label: "Week 1" },
  { key: "Week 2", label: "Week 2" },
  { key: "Week 3", label: "Week 3" },
  { key: "Week 4", label: "Week 4" },
  { key: "Week 5", label: "Week 5" },
  { key: "Week 6", label: "Week 6" },
  { key: "Week 7", label: "Week 7" },
  { key: "Week 8", label: "Week 8" },
  { key: "Week 9", label: "Week 9" },
  { key: "Week 10", label: "Week 10" },
];

const lectures: Option[] = [
  { key: "Lecture 1", label: "Lecture 1" },
  { key: "Lecture 2", label: "Lecture 2" },
  { key: "Lecture 3", label: "Lecture 3" },
  { key: "Lecture 4", label: "Lecture 4" },
  { key: "Lecture 5", label: "Lecture 5" },
  { key: "Lecture 6", label: "Lecture 6" },
  { key: "Lecture 7", label: "Lecture 7" },
  { key: "Lecture 8", label: "Lecture 8" },
  { key: "Lecture 9", label: "Lecture 9" },
  { key: "Lecture 10", label: "Lecture 10" },
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
  { key: "pharm", label: "Pharmacology" },
  { key: "physio", label: "Physiology" },
];

const systems: Option[] = [
  { key: "cardio", label: "Cardiovascular System" },
  { key: "gi", label: "Gastrointestinal System" },
  { key: "neuro", label: "Nervous System" },
  { key: "pulm", label: "Pulmonary System" },
  { key: "renal", label: "Renal System" },
  { key: "endocrine", label: "Endocrine System" },
  { key: "heme", label: "Hematology" },
  { key: "immuno", label: "Immunology" },
  { key: "repro", label: "Reproductive System" },
  { key: "musculoskeletal", label: "Musculoskeletal System" },
];

export default function CreateTest() {
  const title = "Create Your Test - Year 3";
  const router = useRouter();

  const [selModes, setSelModes] = useState<string[]>([]);
  const [selWeeks, setSelWeeks] = useState<string[]>([]);
  const [selLectures, setSelLectures] = useState<string[]>([]);
  const [selDisciplines, setSelDisciplines] = useState<string[]>([]);
  const [selSystems, setSelSystems] = useState<string[]>([]);
  const [qCount, setQCount] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  // Progressive disclosure locks
  const allowWeeks = selModes.length > 0;
  const allowLectures = selWeeks.length > 0;
  const allowDisciplines = selLectures.length > 0;
  const allowSystems = selDisciplines.length > 0;

  // validation
  const valid =
    selDisciplines.length > 0 &&
    selSystems.length > 0 &&
    qCount >= 1 &&
    qCount <= 40;

  // effective selections
  const effectiveModes = selModes.length ? selModes : ["unused"];
  const effectiveWeeks = selWeeks.length ? selWeeks : weeks.map((o) => o.key);
  const effectiveLectures = selLectures.length ? selLectures : lectures.map((o) => o.key);

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
      const res = await fetch("/api/preclerkship/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearLevel: 3,
          weekKeys: effectiveWeeks,
          lectureKeys: effectiveLectures,
          disciplines: selDisciplines,
          systems: selSystems,
          count: qCount,
          types: effectiveModes,
          mode: "RANDOM",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create quiz");
      router.push(`/year3/quiz/${data.id}`);
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

        {/* Weeks */}
        <Card locked={!allowWeeks}>
          <HeaderRow
            title="Week"
            withAll
            disabledAll={!allowWeeks}
            onAll={(_checked) => toggleAll(setSelWeeks, weeks, _checked)}
          />
          <CheckGrid
            list={weeks}
            selected={selWeeks}
            onToggle={(optKey) => toggle(setSelWeeks, optKey)}
            disabled={!allowWeeks}
          />
          {!allowWeeks && (
            <p className="mt-2 text-sm text-red-600">
              Select at least one question mode to choose weeks.
            </p>
          )}
        </Card>

        {/* Lectures */}
        <Card locked={!allowLectures}>
          <HeaderRow
            title="Lecture"
            withAll
            disabledAll={!allowLectures}
            onAll={(_checked) => toggleAll(setSelLectures, lectures, _checked)}
          />
          <CheckGrid
            list={lectures}
            selected={selLectures}
            onToggle={(optKey) => toggle(setSelLectures, optKey)}
            disabled={!allowLectures}
          />
          {!allowLectures && (
            <p className="mt-2 text-sm text-red-600">
              Select at least one week to choose lectures.
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
          />
          {!allowDisciplines && (
            <p className="mt-2 text-sm text-red-600">
              Select at least one lecture to choose disciplines.
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
                max={40}
                value={qCount || ""}
                onChange={(e) => setQCount(Number(e.target.value))}
                className="w-32 rounded-2xl border-2 border-border px-4 py-3 text-center text-lg font-bold text-primary bg-card outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                placeholder="1-40"
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
          If you do not select weeks/lectures/question mode, defaults are applied
          automatically (all weeks/lectures; Unanswered mode).
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
}: {
  list: Option[];
  selected: string[];
  onToggle: (_optKey: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {list.map((o) => {
        const isSelected = selected.includes(o.key);
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
