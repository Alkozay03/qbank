"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction, type KeyboardEvent, type ReactNode } from "react";

import { useRouter } from "next/navigation";
import { getTagLabel, type TagCategory } from "@/lib/tags/catalog";



type Option = { key: string; label: string };

const DISPLAYABLE_TAG_CATEGORIES: ReadonlyArray<TagCategory> = ["rotation", "resource", "discipline", "system"];
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



const RETURN_DEST_KEY = "view-questions-return";

type QuestionRow = {

  id: string;

  customId: number | null;

  questionText: string;

  correctAnswer: string;

  rotation: string | null;

  resource: string | null;

  discipline: string | null;

  system: string | null;

  tags: string[];

  updatedAt: string;

  isAnswerConfirmed: boolean;

};



export default function ViewQuestionsPage() {

  const router = useRouter();

  const [selRotations, setSelRotations] = useState<string[]>([]);

  const [selResources, setSelResources] = useState<string[]>([]);

  const [selDisciplines, setSelDisciplines] = useState<string[]>([]);

  const [selSystems, setSelSystems] = useState<string[]>([]);

  const [questionIdQuery, setQuestionIdQuery] = useState("");

  const [keywordQuery, setKeywordQuery] = useState("");

  const [questions, setQuestions] = useState<QuestionRow[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<"ADMIN" | "MASTER_ADMIN" | "WEBSITE_CREATOR" | null>(null);



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

  const toggle = (setter: Dispatch<SetStateAction<string[]>>, key: string) => {

    setter((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));

  };



  const resetFilters = () => {

    setSelRotations([]);

    setSelResources([]);

    setSelDisciplines([]);

    setSelSystems([]);

    setQuestionIdQuery("");

    setKeywordQuery("");

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

          resources: selResources,

          disciplines: selDisciplines,

          systems: selSystems,

        }),

      });



      if (!response.ok) {

        const message = await response.json().catch(() => null);

        throw new Error(message?.error ?? 'Unable to load questions');

      }



      const payload = await response.json();

      setQuestions(Array.isArray(payload?.questions) ? payload.questions : []);

    } catch (err) {

      console.error('Error loading questions:', err);

      setError(err instanceof Error ? err.message : 'Failed to load questions');

    } finally {

      setLoading(false);

    }

  }, [keywordQuery, questionIdQuery, selDisciplines, selResources, selRotations, selSystems]);



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

  const handleConfirmationToggle = async (questionId: string, newStatus: boolean) => {
    try {
      // If confirming the answer (true), prompt for vote management
      let voteAction: 'keep' | 'archive' | 'delete' | null = null;
      
      if (newStatus === true) {
        // Check if there are any votes for this question
        const votesCheckResponse = await fetch(`/api/questions/${questionId}/votes`);
        if (votesCheckResponse.ok) {
          const votesData = await votesCheckResponse.json();
          const hasVotes = votesData.currentVotes?.totalVotes > 0 || votesData.historicalVotes?.length > 0;
          
          if (hasVotes) {
            // Show prompt for vote management
            const choice = prompt(
              `⚠️ This question has student votes.\n\nWhat would you like to do with the votes?\n\n` +
              `Type one of the following:\n` +
              `• "keep" - Keep votes visible (students can still see them)\n` +
              `• "archive" - Archive votes (hide from students, keep data for admins)\n` +
              `• "delete" - Permanently delete all votes\n` +
              `• "cancel" - Cancel confirmation\n\n` +
              `Your choice:`,
              "archive"
            );
            
            if (!choice || choice.toLowerCase() === 'cancel') {
              return; // User cancelled
            }
            
            const normalizedChoice = choice.toLowerCase().trim();
            if (normalizedChoice === 'keep' || normalizedChoice === 'archive' || normalizedChoice === 'delete') {
              voteAction = normalizedChoice;
            } else {
              alert('Invalid choice. Please enter "keep", "archive", "delete", or "cancel".');
              return;
            }
          }
        }
      }

      // Update the question confirmation status
      const response = await fetch(`/api/admin/questions/${questionId}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAnswerConfirmed: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update confirmation status');
      }

      // If vote action is archive or delete, handle it
      if (voteAction === 'archive') {
        const archiveResponse = await fetch(`/api/admin/questions/${questionId}/votes/archive`, {
          method: 'POST',
        });
        if (!archiveResponse.ok) {
          console.error('Failed to archive votes');
          alert('Answer confirmed, but failed to archive votes.');
        }
      } else if (voteAction === 'delete') {
        const deleteResponse = await fetch(`/api/admin/questions/${questionId}/votes/delete`, {
          method: 'DELETE',
        });
        if (!deleteResponse.ok) {
          console.error('Failed to delete votes');
          alert('Answer confirmed, but failed to delete votes.');
        }
      }

      // Update local state
      setQuestions(prev =>
        prev.map(q =>
          q.id === questionId ? { ...q, isAnswerConfirmed: newStatus } : q
        )
      );
    } catch (err) {
      console.error('Error updating confirmation status:', err);
      alert('Failed to update confirmation status');
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

            />

            <FilterSection

              title="Resources"

              options={resources}

              selected={selResources}

              onToggle={(key) => toggle(setSelResources, key)}

            />

            <FilterSection

              title="Disciplines"

              options={disciplines}

              selected={selDisciplines}

              onToggle={(key) => toggle(setSelDisciplines, key)}

            />

            <FilterSection

              title="Systems"

              options={systems}

              selected={selSystems}

              onToggle={(key) => toggle(setSelSystems, key)}

            />

          </div>



          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            <div className="text-sm text-slate-500">

              {questions.length > 0 ? `${questions.length} question${questions.length === 1 ? '' : 's'} loaded` : 'No questions loaded'}

            </div>

            <button

              onClick={loadQuestions}

              disabled={loading}

              className="px-6 py-3 bg-[#0ea5e9] text-white rounded-lg font-medium hover:bg-[#0284c7] transition-all duration-300 btn-hover disabled:opacity-50 disabled:cursor-not-allowed"

            >

              {loading ? 'Loading...' : 'Load Questions'}

            </button>

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

                    <th className="px-4 py-3 text-left font-medium text-[#0284c7]">ID</th>

                    <th className="px-4 py-3 text-left font-medium text-[#0284c7]">Question</th>

                    <th className="px-4 py-3 text-left font-medium text-[#0284c7]">Correct Answer</th>

                    <th className="px-4 py-3 text-left font-medium text-[#0284c7]">Tags</th>

                    <th className="px-4 py-3 text-left font-medium text-[#0284c7]">Updated</th>

                    <th className="px-4 py-3 text-left font-medium text-[#0284c7]">Confirmation</th>

                    <th className="px-4 py-3 text-left font-medium text-[#0284c7]">Actions</th>

                  </tr>

                </thead>

                <tbody>

                  {questions.map((question) => (
                    <tr key={question.id} className="border-b border-sky-100 hover:bg-sky-50/50 transition-colors">

                      <td className="px-4 py-3 text-xs text-slate-600">

                        {question.customId ?? question.id}

                      </td>

                      <td className="px-4 py-3 max-w-xl text-slate-700">

                        <div className="line-clamp-3" title={question.questionText}>

                          {question.questionText}

                        </div>

                      </td>

                      <td className="px-4 py-3 font-medium text-[#0284c7]">{question.correctAnswer}</td>

                      <td className="px-4 py-3">

                        <div className="flex flex-wrap gap-1">

                          {(() => {
                            const displayTags = (question.tags ?? [])
                              .map((tag) => resolveTagLabel(tag))
                              .filter((label): label is string => Boolean(label));

                            if (displayTags.length === 0) {
                              return <span className="text-xs text-slate-400">No tags</span>;
                            }

                            const shown = displayTags.slice(0, 3);

                            return (
                              <>
                                {shown.map((label) => (
                                  <span
                                    key={label}
                                    className="inline-block px-2 py-1 bg-sky-100 text-[#0284c7] rounded-full text-[11px]"
                                  >
                                    {label}
                                  </span>
                                ))}
                                {displayTags.length > shown.length ? (
                                  <span className="text-xs text-slate-400">+{displayTags.length - shown.length}</span>
                                ) : null}
                              </>
                            );
                          })()}

                        </div>

                      </td>

                      <td className="px-4 py-3 text-xs text-slate-500">

                        {new Date(question.updatedAt).toLocaleDateString()}

                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleConfirmationToggle(question.id, true)}
                            className={`px-2 py-1 text-xs rounded transition-all ${
                              question.isAnswerConfirmed
                                ? 'bg-green-500 text-white font-semibold'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                            title="Mark as confirmed"
                          >
                            ✓ Confirmed
                          </button>
                          <button
                            onClick={() => handleConfirmationToggle(question.id, false)}
                            className={`px-2 py-1 text-xs rounded transition-all ${
                              !question.isAnswerConfirmed
                                ? 'bg-red-500 text-white font-semibold'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                            title="Mark as unconfirmed"
                          >
                            ⚠ Unconfirmed
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3">
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

                  ))}

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



function FilterSection({ title, options, selected, onToggle }: { title: string; options: Option[]; selected: string[]; onToggle: (_key: string) => void }) {

  return (

    <div>

      <HeaderRow title={title} />

      <CheckGrid list={options} selected={selected} onToggle={onToggle} />

    </div>

  );

}



function HeaderRow({ title }: { title: string }) {

  return (

    <div className="flex items-center justify-between">

      <div className="text-lg font-semibold text-[#0284c7]">{title}</div>

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

















