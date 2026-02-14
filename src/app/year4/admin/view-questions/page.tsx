"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction, type KeyboardEvent, type ReactNode } from "react";

import { useRouter } from "next/navigation";
import { getTagLabel, type TagCategory } from "@/lib/tags/catalog";



type Option = { key: string; label: string };

const DISPLAYABLE_TAG_CATEGORIES: ReadonlyArray<TagCategory> = ["rotation", "topic", "resource", "discipline", "system"];
const displayableCategorySet = new Set(DISPLAYABLE_TAG_CATEGORIES);

function resolveTagLabel(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const [category, value] = raw.split(":");
  if (!category || !value) return raw;
  const normalized = category.toLowerCase() as TagCategory;
  if (!displayableCategorySet.has(normalized)) return null;
  return getTagLabel(normalized, value) ?? value;
}



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



const RETURN_DEST_KEY = "view-questions-return";

type QuestionRow = {

  id: string;

  customId: number | null;

  questionText: string;

  correctAnswer: string;

  rotation: string | null;
  topic?: string | null;

  tags: string[];
  answers?: { label: string; text: string; isCorrect: boolean; correctOptionIds?: string[] }[];
  questionType?: string;

  createdAt?: string;
  updatedAt: string;

};



export default function ViewQuestionsPage() {

  const router = useRouter();

  const [selRotations, setSelRotations] = useState<string[]>([]);
  const [selTopics, setSelTopics] = useState<string[]>([]);

  const [questionIdQuery, setQuestionIdQuery] = useState("");

  const [keywordQuery, setKeywordQuery] = useState("");

  const [questions, setQuestions] = useState<QuestionRow[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<"ADMIN" | "MASTER_ADMIN" | "WEBSITE_CREATOR" | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const topicOptions = useMemo(() => {
    const merged = selRotations
      .flatMap((rot) => topicsByRotation[rot] ?? [])
      .reduce((map, opt) => map.set(opt.key, opt), new Map<string, Option>());
    return Array.from(merged.values());
  }, [selRotations]);

  const allowedTopicKeys = useMemo(() => new Set(topicOptions.map((o) => o.key)), [topicOptions]);



  // Fetch user role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/me/role', { cache: 'no-store' });
        const data = await response.json();
        setUserRole(data?.role);
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const referrer = document.referrer;
      if (!referrer) return;
      const origin = window.location.origin;
      const refUrl = new URL(referrer);
      if (refUrl.origin === origin) {
        sessionStorage.setItem(RETURN_DEST_KEY, refUrl.pathname + refUrl.search + refUrl.hash);
      }
    } catch {
      // ignore referrer parsing errors
    }
  }, []);

  // keep topic selections valid for chosen rotations
  useEffect(() => {
    setSelTopics((prev) => prev.filter((key) => allowedTopicKeys.has(key)));
  }, [allowedTopicKeys]);

  // auto-include "Not Selected" placeholder when applicable
  useEffect(() => {
    if (allowedTopicKeys.has("topic_not_selected") && !selTopics.includes("topic_not_selected")) {
      setSelTopics((prev) => [...prev, "topic_not_selected"]);
    }
  }, [allowedTopicKeys, selTopics]);

  const toggle = (setter: Dispatch<SetStateAction<string[]>>, key: string) => {

    setter((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));

  };

  const toggleAll = (setter: Dispatch<SetStateAction<string[]>>, list: Option[], checked: boolean) => {
    setter(checked ? list.map((o) => o.key) : []);
  };



  const resetFilters = () => {

    setSelRotations([]);

    setSelTopics([]);

    setQuestionIdQuery("");

    setKeywordQuery("");

    setSelectedIds(new Set());
    setExpandedIds(new Set());
  };



  const loadQuestions = useCallback(async () => {

    setLoading(true);

    setError(null);

    try {

      const idPayload = questionIdQuery.trim();

      const keywordPayload = keywordQuery.trim();

      const response = await fetch('/api/admin/questions/search', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          year: 'Y4',

          questionId: idPayload || undefined,

          keywords: keywordPayload || undefined,

          rotations: selRotations,
          topics: selTopics,

        }),

      });



      if (!response.ok) {

        const message = await response.json().catch(() => null);

        throw new Error(message?.error ?? 'Unable to load questions');

      }



      const payload = await response.json();

      const normalized = Array.isArray(payload?.questions)
        ? payload.questions.map((q: QuestionRow) => {
            const fallback = new Date().toISOString();
            const created = q.createdAt ?? q.updatedAt ?? fallback;
            const updated = q.updatedAt ?? q.createdAt ?? fallback;
            return { ...q, createdAt: created, updatedAt: updated };
          })
        : [];

      setQuestions(normalized);
      setSelectedIds(new Set());
      setExpandedIds(new Set());

    } catch (err) {

      console.error('Error loading questions:', err);

      setError(err instanceof Error ? err.message : 'Failed to load questions');

    } finally {

      setLoading(false);

    }

  }, [keywordQuery, questionIdQuery, selRotations, selTopics]);



  const handleSearchKey = useCallback((event: KeyboardEvent<HTMLInputElement>) => {

    if (event.key === 'Enter') {

      event.preventDefault();

      void loadQuestions();

    }

  }, [loadQuestions]);



  const handleEdit = (id: string, customId: number | null) => {

    const targetId = customId ?? id;

    router.push(`/year4/admin/bulk-question-manager?questionId=${targetId}`);

  };

  const handleDelete = async (questionId: string, questionText: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this question?\n\n"${questionText.substring(0, 100)}..."\n\nThis action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/admin/questions/${questionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete question');
      }

      // Remove from local state
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      alert('Question deleted successfully');
    } catch (err) {
      console.error('Error deleting question:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete question');
    }
  };



  const handleBack = () => {
    // Navigate based on user role
    if (userRole === "MASTER_ADMIN" || userRole === "WEBSITE_CREATOR") {
      router.push("/year4/master-admin");
    } else {
      router.push("/year4/admin");
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 flex flex-col">

      <header className="bg-white/90 backdrop-blur border-b border-sky-200">

        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-4">

          <button

            type="button"

            onClick={handleBack}

            className="flex items-center gap-2 rounded-lg border border-sky-200 px-3 py-2 text-sm font-medium text-[#0284c7] transition-colors hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0ea5e9]"

          >

            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">

              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

            </svg>

            <span className="font-medium">Back</span>

          </button>

          <div className="flex flex-col gap-1">

            <h1 className="text-2xl font-bold text-[#0ea5e9]">View Questions</h1>

            <p className="text-sm text-slate-600">

              Filter questions by the same options used to create a test and open any record for editing.

            </p>

          </div>

        </div>

      </header>



      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">

        <section className="flex flex-col gap-4">

        <Card>

          <div className="flex items-center justify-between">

            <h2 className="text-xl font-semibold text-[#0ea5e9]">Filter Options</h2>

            <button

              onClick={resetFilters}

              className="text-sm text-[#0284c7] hover:text-[#0ea5e9] transition-colors"

            >

              Clear All

            </button>

          </div>



          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">

              <div>

                <label className="block text-sm font-medium text-[#0284c7]">Question ID</label>

                <input

                  type="text"

                  value={questionIdQuery}

                  onChange={(event) => setQuestionIdQuery(event.target.value)}

                  onKeyDown={handleSearchKey}

                  placeholder="e.g. 142 or ck6dke4dwn"

                  className="mt-1 w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-200 outline-none"

                  autoComplete="off"

                />

                <p className="mt-2 text-xs text-slate-500">Search by internal numeric ID or the full database identifier.</p>

              </div>

              <div>

                <label className="block text-sm font-medium text-[#0284c7]">Keyword search</label>

                <input

                  type="text"

                  value={keywordQuery}

                  onChange={(event) => setKeywordQuery(event.target.value)}

                  onKeyDown={handleSearchKey}

                  placeholder="Terms from the stem, answers, explanation, objective, or tags"

                  className="mt-1 w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-200 outline-none"

                  autoComplete="off"

                />

                <p className="mt-2 text-xs text-slate-500">We’ll match any keyword across question text, answer choices, explanations, objectives, tags, and occurrences.</p>

              </div>

            </div>

            <FilterSection

              title="Rotations"

              options={rotations}

              selected={selRotations}

              onToggle={(key) => toggle(setSelRotations, key)}
              onSelectAll={(checked) => toggleAll(setSelRotations, rotations, checked)}

            />

            <FilterSection

              title="Topics"

              options={topicOptions.filter((t) => t.key !== "topic_not_selected")}

              selected={selTopics}

              onToggle={(key) => toggle(setSelTopics, key)}
              onSelectAll={(checked) => toggleAll(setSelTopics, topicOptions.filter((t) => t.key !== "topic_not_selected"), checked)}
              helper="Topics follow selected rotations; untagged questions are included when 'Not Selected' is present."

            />

          </div>



          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            <div className="text-sm text-slate-500">

              {questions.length > 0 ? `${questions.length} question${questions.length === 1 ? '' : 's'} loaded` : 'No questions loaded'}

            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  if (selectedIds.size === 0) return;
                  const ids = Array.from(selectedIds);
                  router.push(`/year4/admin/bulk-question-manager?questionIds=${encodeURIComponent(ids.join(","))}`);
                }}
                disabled={loading || selectedIds.size === 0}
                className="px-5 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all duration-300 btn-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedIds.size > 0 ? `Edit ${selectedIds.size} Selected` : "Edit Selected"}
              </button>

              <button

                onClick={loadQuestions}

                disabled={loading}

                className="px-6 py-3 bg-[#0ea5e9] text-white rounded-lg font-medium hover:bg-[#0284c7] transition-all duration-300 btn-hover disabled:opacity-50 disabled:cursor-not-allowed"

              >

                {loading ? 'Loading...' : 'Load Questions'}

              </button>
            </div>

          </div>



          {error && (

            <p className="mt-3 text-sm text-red-600">{error}</p>

          )}

        </Card>

        <Card>

          <h2 className="text-xl font-semibold text-[#0ea5e9] mb-4">Results</h2>

          {questions.length === 0 ? (

            <div className="rounded-lg border border-dashed border-sky-200 p-8 text-center text-slate-500">

              Select your filters and load questions to preview the data.

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead className="bg-sky-50">

                  <tr>
                    <th className="px-3 py-3 w-10 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size > 0 && selectedIds.size === questions.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(new Set(questions.map((q) => q.id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                        className="h-4 w-4"
                      />
                    </th>
                    <th className="px-3 py-3 w-8 text-left"></th>
                    <th className="px-4 py-3 text-left font-medium text-[#0284c7]">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-[#0284c7]">Question</th>
                    <th className="px-4 py-3 text-left font-medium text-[#0284c7]">Correct Answer</th>
                    <th className="px-4 py-3 text-left font-medium text-[#0284c7]">Tags</th>
                    <th className="px-4 py-3 text-left font-medium text-[#0284c7]">Updated</th>
                    <th className="px-4 py-3 text-left font-medium text-[#0284c7]">Actions</th>
                  </tr>

                </thead>

                <tbody>

                  {questions.map((question) => {
                    const isSelected = selectedIds.has(question.id);
                    const isExpanded = expandedIds.has(question.id);
                    const displayTags = (question.tags ?? [])
                      .map((tag) => resolveTagLabel(tag))
                      .filter((label): label is string => Boolean(label));

                    return (
                      <Fragment key={question.id}>
                        <tr key={question.id} className="border-b border-sky-100 hover:bg-sky-50/50 transition-colors">

                          <td className="px-3 py-3 align-top">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(question.id)) next.delete(question.id);
                                  else next.add(question.id);
                                  return next;
                                });
                              }}
                              className="h-4 w-4"
                            />
                          </td>

                          <td className="px-3 py-3 align-top">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(question.id)) next.delete(question.id);
                                  else next.add(question.id);
                                  return next;
                                })
                              }
                              className={`h-8 w-8 flex items-center justify-center rounded-full border transition-all ${
                                isExpanded ? "border-[#0284c7] bg-[#0284c7]/10 text-[#0284c7]" : "border-slate-300 text-slate-500 hover:border-[#0284c7] hover:text-[#0284c7]"
                              }`}
                              aria-label="Toggle details"
                            >
                              {isExpanded ? "▼" : "▶"}
                            </button>
                          </td>

                          <td className="px-4 py-3 text-xs text-slate-600 align-top">

                            {question.customId ?? question.id}

                          </td>

                          <td className="px-4 py-3 max-w-xl text-slate-700 align-top">

                            <div className="line-clamp-3" title={question.questionText}>

                              {question.questionText}

                            </div>

                          </td>

                          <td className="px-4 py-3 font-medium text-[#0284c7] align-top">{question.correctAnswer}</td>

                          <td className="px-4 py-3 align-top">

                            <div className="flex flex-wrap gap-1">

                              {displayTags.length === 0 ? (
                                <span className="text-xs text-slate-400">No tags</span>
                              ) : (
                                <>
                                  {displayTags.slice(0, 3).map((label) => (
                                    <span
                                      key={label}
                                      className="inline-block px-2 py-1 bg-sky-100 text-[#0284c7] rounded-full text-[11px]"
                                    >
                                      {label}
                                    </span>
                                  ))}
                                  {displayTags.length > 3 ? (
                                    <span className="text-xs text-slate-400">+{displayTags.length - 3}</span>
                                  ) : null}
                                </>
                              )}

                            </div>

                          </td>

                          <td className="px-4 py-3 text-xs text-slate-500 align-top">
                            {new Date(question.createdAt ?? question.updatedAt).toLocaleDateString()}
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="flex gap-2">
                              <button

                                onClick={() => handleEdit(question.id, question.customId)}

                                className="px-3 py-1 text-xs bg-[#0ea5e9] text-white rounded hover:bg-[#0284c7] transition-all btn-hover"

                              >

                                Edit

                              </button>

                              <button
                                onClick={() => handleDelete(question.id, question.questionText)}
                                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-all btn-hover"
                              >
                                Delete
                              </button>
                            </div>

                          </td>

                        </tr>
                        {isExpanded && (
                          <tr className="bg-sky-50/40">
                            <td colSpan={8} className="px-12 py-4">
                              <div className="space-y-3 text-sm text-slate-700">
                                <div>
                                  <span className="font-semibold text-[#0284c7]">Question:</span>{" "}
                                  <span>{question.questionText}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-[#0284c7]">Correct Answer:</span>{" "}
                                  <span>{question.correctAnswer}</span>
                                </div>
                                {question.answers && question.answers.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="font-semibold text-[#0284c7]">Answers</div>
                                    <div className="grid sm:grid-cols-2 gap-2">
                                      {question.answers.map((a) => (
                                        <div
                                          key={a.label}
                                          className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${a.isCorrect ? "border-emerald-500 bg-emerald-50" : "border-sky-100 bg-white"}`}
                                        >
                                          <span className={`text-xs font-bold ${a.isCorrect ? "text-emerald-700" : "text-slate-600"}`}>
                                            {a.label}
                                          </span>
                                          <span className="text-slate-700">{a.text}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {displayTags.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {displayTags.map((label) => (
                                      <span
                                        key={label}
                                        className="inline-block px-2 py-1 bg-sky-100 text-[#0284c7] rounded-full text-[11px]"
                                      >
                                        {label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="text-xs text-slate-500">
                                  Updated: {new Date(question.createdAt ?? question.updatedAt).toLocaleString()}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}

                </tbody>

              </table>

            </div>

          )}

        </Card>

        </section>

      </main>

    </div>
  );

}



function FilterSection({
  title,
  options,
  selected,
  onToggle,
  onSelectAll,
  helper,
}: {
  title: string;
  options: Option[];
  selected: string[];
  onToggle: (_key: string) => void;
  onSelectAll?: (_checked: boolean) => void;
  helper?: string;
}) {

  return (

    <div>

      <HeaderRow title={title} onSelectAll={onSelectAll} />

      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}

      <CheckGrid list={options} selected={selected} onToggle={onToggle} />

    </div>

  );

}



function HeaderRow({ title, onSelectAll }: { title: string; onSelectAll?: (_checked: boolean) => void }) {

  return (

    <div className="flex items-center justify-between">

      <div className="text-lg font-semibold text-[#0284c7]">{title}</div>

      {onSelectAll && (
        <label className="flex items-center gap-2 text-sm text-[#0284c7]">
          <input
            type="checkbox"
            className="h-4 w-4"
            onChange={(e) => onSelectAll(e.target.checked)}
          />
          Select All
        </label>
      )}

    </div>

  );

}



function CheckGrid({ list, selected, onToggle }: { list: Option[]; selected: string[]; onToggle: (_optKey: string) => void }) {

  return (

    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

      {list.map((option) => {

        const isSelected = selected.includes(option.key);

        return (

          <button

            key={option.key}

            onClick={() => onToggle(option.key)}

            className={`group relative inline-flex items-center justify-between gap-2 rounded-xl px-4 py-3 transition-all duration-300 btn-hover ${

              isSelected

                ? 'bg-gradient-to-r from-[#2F6F8F] to-[#56A2CD] text-white shadow-lg'

                : 'bg-white border border-[#E6F0F7] hover:bg-gradient-to-r hover:from-[#F8FCFF] hover:to-[#A5CDE4]/10 hover:border-[#56A2CD]'

            }`}

            type="button"

          >

            <span className="flex-1 text-left font-medium">{option.label}</span>

            <span

              className={`text-xs rounded-full px-3 py-1 min-w-8 text-center font-semibold transition-colors ${

                isSelected ? 'bg-white text-[#0284c7]' : 'bg-sky-100 text-[#0284c7]'

              }`}

            >

              {isSelected ? 'Selected' : 'Add'}

            </span>

            {isSelected && (
              <div className="absolute inset-0 rounded-xl bg-sky-100/30 animate-pulse"></div>
            )}

          </button>

        );

      })}

    </div>

  );

}



function Card({ children }: { children: ReactNode }) {

  return (

    <div className="rounded-2xl bg-white border border-sky-200 p-6 shadow-lg space-y-4">

      {children}

    </div>

  );

}

















