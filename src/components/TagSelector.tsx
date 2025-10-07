"use client";



import { useState } from "react";



interface TagSelectorProps {

  selectedTags: string[];

  onChange: (_tags: string[]) => void;

  className?: string;

  aiSuggestions?: string[];

  year?: "Y4" | "Y5"; // Optional year prop to filter rotation options

}



type Option = { value: string; label: string };



type OptionsByCategory = {

  rotation: Option[];

  resource: Option[];

  discipline: Option[];

  system: Option[];

};



// All rotation options - will be filtered based on year

const allRotationOptions = {

  Y4: [

    { value: "im", label: "Internal Medicine" },

    { value: "gs", label: "General Surgery" },

    { value: "peds", label: "Pediatrics" },

    { value: "obgyn", label: "Obstetrics and Gynaecology" },

  ],

  Y5: [

    { value: "fm", label: "Family Medicine" },

    { value: "psych", label: "Psychiatry" },

    { value: "gs2", label: "General Surgery 2" },

    { value: "im2", label: "Internal Medicine 2" },

  ],

};



const baseFilterOptions: Omit<OptionsByCategory, "rotation"> = {

  resource: [

    { value: "uworld_s1", label: "UWorld - Step 1" },

    { value: "uworld_s2", label: "UWorld - Step 2" },

    { value: "amboss", label: "Amboss" },

    { value: "beyond", label: "Boards & Beyond" },

    { value: "previouses", label: "Previouses" },

  ],

  discipline: [

    { value: "anatomy", label: "Anatomy" },

    { value: "behavioral", label: "Behavioral Science" },

    { value: "biochem", label: "Biochemistry" },

    { value: "biostat", label: "Biostatistics" },

    { value: "embryology", label: "Embryology" },

    { value: "genetics", label: "Genetics" },

    { value: "histology", label: "Histology" },

    { value: "immunology", label: "Immunology" },

    { value: "micro", label: "Microbiology" },

    { value: "path", label: "Pathology" },

    { value: "pathophys", label: "Pathophysiology" },

    { value: "pharm", label: "Pharmacology" },

    { value: "physio", label: "Physiology" },

  ],

  system: [

    { value: "bio_general", label: "Biochemistry (General Principles)" },

    { value: "gen_general", label: "Genetics (General Principles)" },

    { value: "micro_general", label: "Microbiology (General Principles)" },

    { value: "path_general", label: "Pathology (General Principles)" },

    { value: "pharm_general", label: "Pharmacology (General Principles)" },

    { value: "biostat_epi", label: "Biostatistics & Epidemiology" },

    { value: "poison_env", label: "Poisoning & Environmental Exposure" },

    { value: "psych", label: "Psychiatric / Behavioral & Substance Use Disorder" },

    { value: "social", label: "Social Sciences (Ethics / Legal / Professional)" },

    { value: "misc", label: "Miscellaneous (Multisystem)" },

    { value: "allergy_immuno", label: "Allergy & Immunology" },

    { value: "cardio", label: "Cardiovascular System" },

    { value: "derm", label: "Dermatology" },

    { value: "ent", label: "Ear, Nose & Throat (ENT)" },

    { value: "endocrine", label: "Endocrine, Diabetes & Metabolism" },

    { value: "female_repro", label: "Female Reproductive System & Breast" },

    { value: "gi", label: "Gastrointestinal & Nutrition" },

    { value: "heme_onc", label: "Hematology & Oncology" },

    { value: "id", label: "Infectious Diseases" },

    { value: "male_repro", label: "Male Reproductive System" },

    { value: "neuro", label: "Nervous System" },

    { value: "ophtho", label: "Ophthalmology" },

    { value: "pregnancy", label: "Pregnancy, Childbirth & Puerperium" },

    { value: "pulm", label: "Pulmonary & Critical Care" },

    { value: "renal", label: "Renal, Urinary Systems & Electrolytes" },

    { value: "rheum", label: "Rheumatology / Orthopedics & Sports" },

  ],

};



type Category = keyof OptionsByCategory;



// All options combined for lookup purposes (used in formatTagDisplay)

const allOptionsForLookup: OptionsByCategory = {

  rotation: [...allRotationOptions.Y4, ...allRotationOptions.Y5],

  ...baseFilterOptions,

};



function formatTagDisplay(tag: string): string {

  const [category, value] = tag.split(":");

  const options = allOptionsForLookup[category as Category];

  const match = options?.find((opt: Option) => opt.value === value);

  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

  return match ? `${categoryLabel}: ${match.label}` : tag;

}



function applySingleCategoryTag(tags: string[], category: Category, value: string, shouldSelect: boolean): string[] {

  const prefix = `${category}:`;

  const withoutCategory = tags.filter((tag) => !tag.startsWith(prefix));

  if (!shouldSelect) return withoutCategory;

  return [...withoutCategory, `${category}:${value}`];

}



export default function TagSelector({ selectedTags, onChange, className = "", aiSuggestions = [], year }: TagSelectorProps) {

  const [openDropdown, setOpenDropdown] = useState<Category | null>(null);



  // Build filterOptions based on year prop - defaults to Y4 if not provided for backwards compatibility

  const filterOptions: OptionsByCategory = {

    rotation: year === "Y5" ? allRotationOptions.Y5 : allRotationOptions.Y4,

    ...baseFilterOptions,

  };



  const safeSelectedTags = Array.isArray(selectedTags) ? selectedTags : [];



  const getSelectedForCategory = (category: Category) =>

    safeSelectedTags.filter((tag) => tag.startsWith(`${category}:`)).map((tag) => tag.split(":")[1]);



  const handleToggle = (category: Category, value: string) => {

    const isSelected = safeSelectedTags.includes(`${category}:${value}`);

    const updated = applySingleCategoryTag(safeSelectedTags, category, value, !isSelected);

    onChange(updated);

  };



  const handleSuggestion = (suggestion: string) => {

    const [category, value] = suggestion.split(":");

    if (!category || !value) return;

    const typedCategory = category as Category;

    const isSelected = safeSelectedTags.includes(suggestion);

    const updated = applySingleCategoryTag(safeSelectedTags, typedCategory, value, !isSelected);

    onChange(updated);

  };



  return (

    <div className={className}>

      <label className="block text-sm font-medium text-slate-700 mb-2">

        Tags & Categories

        {aiSuggestions.length > 0 && (

          <span className="ml-2 text-xs text-[#2F6F8F]">AI suggestions available</span>

        )}

      </label>



      {aiSuggestions.length > 0 && (

        <div className="mb-4 rounded-lg border border-[#CFE5F2] bg-[#F3FAFF] p-3">

          <div className="text-sm font-semibold text-[#2F6F8F] mb-2">Suggested tags</div>

          <div className="flex flex-wrap gap-2">

            {aiSuggestions.map((suggestion) => {

              const isSelected = safeSelectedTags.includes(suggestion);

              return (

                <button

                  key={suggestion}

                  type="button"

                  onClick={() => handleSuggestion(suggestion)}

                  className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${

                    isSelected

                      ? "bg-[#2F6F8F] text-white"

                      : "bg-white text-[#2F6F8F] border border-[#99C1D9] hover:bg-[#E6F2FA]"

                  }`}

                >

                  {formatTagDisplay(suggestion)}

                  <span className="ml-1 text-xs">{isSelected ? "Remove" : "Add"}</span>

                </button>

              );

            })}

          </div>

        </div>

      )}



      {safeSelectedTags.length > 0 && (

        <div className="mb-4 flex flex-wrap gap-2">

          {safeSelectedTags.map((tag) => (

            <span

              key={tag}

              className="inline-flex items-center rounded-full bg-[#E6F2FA] px-3 py-1 text-sm text-[#2F6F8F]"

            >

              {formatTagDisplay(tag)}

              <button

                type="button"

                className="ml-2 text-xs font-semibold text-[#2F6F8F] hover:text-[#1D4D66]"

                onClick={() => onChange(safeSelectedTags.filter((candidate) => candidate !== tag))}

              >

                Remove

              </button>

            </span>

          ))}

        </div>

      )}



      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {(Object.keys(filterOptions) as Category[]).map((category) => {

          const selectedValues = getSelectedForCategory(category);

          return (

            <div key={category} className="relative">

              <button

                type="button"

                onClick={() => setOpenDropdown(openDropdown === category ? null : category)}

                className="w-full rounded-lg border border-[#D7E6F0] bg-white px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-[#2F6F8F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6F8F]"

              >

                <span className="capitalize">{category.replace("_", " ")}</span>

                {selectedValues.length > 0 && (

                  <span className="ml-2 rounded-full bg-[#2F6F8F] px-2 py-0.5 text-xs text-white">

                    {selectedValues.length}

                  </span>

                )}

                <span className="float-right text-slate-400">

                  {openDropdown === category ? "Hide" : "Show"}

                </span>

              </button>

              {openDropdown === category && (

                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-[#D7E6F0] bg-white shadow-lg">

                  <div className="max-h-52 overflow-y-auto">

                    {filterOptions[category].map((option) => {

                      const isSelected = selectedValues.includes(option.value);

                      return (

                        <button

                          key={option.value}

                          type="button"

                          onClick={() => handleToggle(category, option.value)}

                          className={`flex w-full items-center justify-between px-4 py-2 text-sm transition ${

                            isSelected ? "bg-[#2F6F8F]/10 text-[#1D4D66]" : "text-slate-700 hover:bg-[#F3FAFF]"

                          }`}

                        >

                          <span>{option.label}</span>

                          <span className={`text-xs font-semibold ${isSelected ? "text-[#2F6F8F]" : "text-slate-400"}`}>

                            {isSelected ? "Selected" : "Select"}

                          </span>

                        </button>

                      );

                    })}

                  </div>

                </div>

              )}

            </div>

          );

        })}

      </div>



      {openDropdown && (

        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />

      )}

    </div>

  );

}





