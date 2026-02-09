"use client";



import { useState } from "react";



interface TagSelectorProps {
  selectedTags: string[];
  onChange: (_tags: string[]) => void;
  className?: string;
  aiSuggestions?: string[];
  year?: "Y1" | "Y2" | "Y3" | "Y4" | "Y5"; // Year prop to determine mode and filter options
  mode?: "clerkship" | "preclerkship"; // Explicit mode override
}

type Option = { value: string; label: string };

type OptionsByCategory = {
  rotation: Option[];
  resource: Option[];
  discipline: Option[];
  system: Option[];
  topic?: Option[];
};



// All rotation options - will be filtered based on year (for clerkship Y4/Y5)

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



// Week and Lecture options for preclerkship years (Y1, Y2, Y3)

// IMPORTANT: These values must match create-test page exactly (capital W/L)

const weekOptions: Option[] = [

  { value: "Week 1", label: "Week 1" },

  { value: "Week 2", label: "Week 2" },

  { value: "Week 3", label: "Week 3" },

  { value: "Week 4", label: "Week 4" },

  { value: "Week 5", label: "Week 5" },

  { value: "Week 6", label: "Week 6" },

  { value: "Week 7", label: "Week 7" },

  { value: "Week 8", label: "Week 8" },

  { value: "Week 9", label: "Week 9" },

  { value: "Week 10", label: "Week 10" },

];



const lectureOptions: Option[] = [

  { value: "Lecture 1", label: "Lecture 1" },

  { value: "Lecture 2", label: "Lecture 2" },

  { value: "Lecture 3", label: "Lecture 3" },

  { value: "Lecture 4", label: "Lecture 4" },

  { value: "Lecture 5", label: "Lecture 5" },

  { value: "Lecture 6", label: "Lecture 6" },

  { value: "Lecture 7", label: "Lecture 7" },

  { value: "Lecture 8", label: "Lecture 8" },

  { value: "Lecture 9", label: "Lecture 9" },

  { value: "Lecture 10", label: "Lecture 10" },

];



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

    { value: "development", label: "Development, Growth, Milestones & Vaccination" },

    { value: "embryology", label: "Embryology" },

    { value: "genetics", label: "Genetics" },

    { value: "histology", label: "Histology" },

    { value: "immunology", label: "Immunology" },

    { value: "micro", label: "Microbiology" },

    { value: "neonatology", label: "Neonatology" },

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

// Topics scoped to rotations (currently General Surgery rotations)
const topicOptionsByRotation: Record<string, Option[]> = {
  gs: [
    { value: "gs_large_bowel_disease", label: "Large bowel disease" },
    { value: "gs_diabetic_foot_pvd", label: "Diabetic foot and Peripheral Vascular Disease" },
    { value: "gs_abdominal_wall", label: "Abdominal wall" },
    { value: "gs_hernias", label: "Hernias" },
    { value: "gs_breast_disease", label: "Breast disease" },
    { value: "gs_pre_post_op", label: "Pre-operative & Post-operative" },
    { value: "gs_thyroid_neck_endocrine", label: "Thyroid, neck, and other endocrine organs" },
    { value: "gs_spleen_kidney", label: "Spleen and Kidney" },
    { value: "gs_hepatobiliary_pancreatic", label: "Hepatobiliary and pancreatic disease" },
    { value: "gs_wound_healing", label: "Wound healing" },
    { value: "gs_small_bowel", label: "Small Bowel diseases" },
    { value: "gs_skin_soft_tissue_infection", label: "Skin & Soft tissue infection" },
    { value: "gs_stomach_esophagus", label: "Stomach and Esophagus" },
    { value: "gs_ethics_misc", label: "Ethics and Misc." },
    { value: "gs_emergency_burns_icu_trauma", label: "Emergency, Burns, ICU, Electrolytes & Trauma" },
    { value: "gs_emqs", label: "EMQs" },
  ],
  gs2: [
    { value: "gs_large_bowel_disease", label: "Large bowel disease" },
    { value: "gs_diabetic_foot_pvd", label: "Diabetic foot and Peripheral Vascular Disease" },
    { value: "gs_abdominal_wall", label: "Abdominal wall" },
    { value: "gs_hernias", label: "Hernias" },
    { value: "gs_breast_disease", label: "Breast disease" },
    { value: "gs_pre_post_op", label: "Pre-operative & Post-operative" },
    { value: "gs_thyroid_neck_endocrine", label: "Thyroid, neck, and other endocrine organs" },
    { value: "gs_spleen_kidney", label: "Spleen and Kidney" },
    { value: "gs_hepatobiliary_pancreatic", label: "Hepatobiliary and pancreatic disease" },
    { value: "gs_wound_healing", label: "Wound healing" },
    { value: "gs_small_bowel", label: "Small Bowel diseases" },
    { value: "gs_skin_soft_tissue_infection", label: "Skin & Soft tissue infection" },
    { value: "gs_stomach_esophagus", label: "Stomach and Esophagus" },
    { value: "gs_ethics_misc", label: "Ethics and Misc." },
    { value: "gs_emergency_burns_icu_trauma", label: "Emergency, Burns, ICU, Electrolytes & Trauma" },
    { value: "gs_emqs", label: "EMQs" },
  ],
  obgyn: [
    { value: "obgyn_antenatal_care_complications", label: "Antenatal Care & Common Complications" },
    { value: "obgyn_early_pregnancy_complications", label: "Early Pregnancy Complications" },
    { value: "obgyn_fetal_growth_surveillance", label: "Fetal Growth & Surveillance" },
    { value: "obgyn_normal_abnormal_labor", label: "Normal & Abnormal Labor" },
    { value: "obgyn_obstetric_emergencies", label: "Obstetric Emergencies" },
    { value: "obgyn_postpartum_care", label: "Postpartum Care" },
    { value: "obgyn_menstrual_hormonal_disorders", label: "Menstrual & Hormonal Disorders" },
    { value: "obgyn_uterine_ovarian_pathologies", label: "Uterine & Ovarian Pathologies" },
    { value: "obgyn_gynecologic_malignancies", label: "Gynecologic Malignancies" },
    { value: "obgyn_infertility_contraception", label: "Infertility & Contraception" },
    { value: "obgyn_pelvic_floor_infections", label: "Pelvic Floor Disorders & Genital Infections" },
    { value: "obgyn_multiple_pregnancy_malpresentation", label: "Multiple Pregnancy & Malpresentation" },
    { value: "obgyn_preterm_labor_prom", label: "Preterm Labor & PROM" },
    { value: "obgyn_hyperemesis_gravidarum", label: "Hyperemesis Gravidarum" },
    { value: "obgyn_miscellaneous", label: "Miscellaneous & Others" },
  ],
  peds: [
    { value: "peds_development_growth_vaccines", label: "Development, growth, milestones, vaccines" },
    { value: "peds_neonatology", label: "Neonatology" },
    { value: "peds_gastroenterology", label: "Gastroenterology" },
    { value: "peds_pulmonology", label: "Pulmonology / Respiratory" },
    { value: "peds_infectious_disease", label: "Infectious Disease" },
    { value: "peds_cardiology", label: "Cardiology" },
    { value: "peds_haematology", label: "Haematology" },
    { value: "peds_endocrinology", label: "Endocrinology" },
    { value: "peds_msk_derma_rheum", label: "MSK, Derma & Rheumatology" },
    { value: "peds_genetics_metabolic", label: "Genetics / Metabolic" },
    { value: "peds_urology_nephrology", label: "Urology / Nephrology" },
    { value: "peds_neurology", label: "Neurology" },
    { value: "peds_psychiatry", label: "Psychiatry" },
    { value: "peds_miscellaneous", label: "Miscellaneous" },
  ],
  im: [
    { value: "im_cardiology", label: "Cardiology" },
    { value: "im_pulmonology", label: "Pulmonology" },
    { value: "im_msk_connective_rheum", label: "Musculoskeletal, Connective Tissues & Rheumatology" },
    { value: "im_gastroenterology", label: "Gastroenterology" },
    { value: "im_hematology_oncology", label: "Hematology & Oncology" },
    { value: "im_nephrology", label: "Nephrology" },
    { value: "im_infectious_diseases", label: "Infectious Diseases" },
    { value: "im_neurology", label: "Neurology" },
    { value: "im_endocrinology_others", label: "Endocrinology & Others" },
  ],
  im2: [
    { value: "im_cardiology", label: "Cardiology" },
    { value: "im_pulmonology", label: "Pulmonology" },
    { value: "im_msk_connective_rheum", label: "Musculoskeletal, Connective Tissues & Rheumatology" },
    { value: "im_gastroenterology", label: "Gastroenterology" },
    { value: "im_hematology_oncology", label: "Hematology & Oncology" },
    { value: "im_nephrology", label: "Nephrology" },
    { value: "im_infectious_diseases", label: "Infectious Diseases" },
    { value: "im_neurology", label: "Neurology" },
    { value: "im_endocrinology_others", label: "Endocrinology & Others" },
  ],
};



type Category = string; // Can be rotation, week, lecture, resource, discipline, or system



// All options combined for lookup purposes (used in formatTagDisplay)

const allOptionsForLookup: Record<string, Option[]> = {

  rotation: [...allRotationOptions.Y4, ...allRotationOptions.Y5],

  week: weekOptions,

  lecture: lectureOptions,

  ...baseFilterOptions,

  topic: Array.from(
    new Map(
      Object.values(topicOptionsByRotation)
        .flat()
        .map((opt) => [opt.value, opt])
    ).values()
  ),

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



export default function TagSelector({ selectedTags, onChange, className = "", aiSuggestions = [], year, mode }: TagSelectorProps) {

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);



  // Determine if we're in preclerkship mode based on year or explicit mode prop

  const isPreclerkship = mode === "preclerkship" || year === "Y1" || year === "Y2" || year === "Y3";



  // Year-specific system options (must match create-test pages exactly)

  const year1And3SystemOptions: Option[] = [

    { value: "cardio", label: "Cardiovascular System" },

    { value: "gi", label: "Gastrointestinal System" },

    { value: "neuro", label: "Nervous System" },

    { value: "pulm", label: "Pulmonary System" },

    { value: "renal", label: "Renal System" },

    { value: "endocrine", label: "Endocrine System" },

    { value: "heme", label: "Hematology" },

    { value: "immuno", label: "Immunology" },

    { value: "repro", label: "Reproductive System" },

    { value: "musculoskeletal", label: "Musculoskeletal System" },

  ];



  const year2SystemOptions: Option[] = [

    { value: "cardio", label: "Cardiovascular System" },

    { value: "pulm", label: "Pulmonary System" },

    { value: "endocrine", label: "Endocrine System" },

    { value: "gi", label: "Gastrointestinal System" },

    { value: "renal", label: "Renal System" },

    { value: "female_repro", label: "Female Reproductive System & Breast" },

    { value: "male_repro", label: "Male Reproductive System" },

  ];



  // Preclerkship disciplines (same for all years)

  const preclerkshipDisciplineOptions: Option[] = [

    { value: "anatomy", label: "Anatomy" },

    { value: "behavioral", label: "Behavioral science" },

    { value: "biochem", label: "Biochemistry" },

    { value: "biostat", label: "Biostatistics" },

    { value: "embryology", label: "Embryology" },

    { value: "genetics", label: "Genetics" },

    { value: "histology", label: "Histology" },

    { value: "immunology", label: "Immunology" },

    { value: "micro", label: "Microbiology" },

    { value: "path", label: "Pathology" },

    { value: "pharm", label: "Pharmacology" },

    { value: "physio", label: "Physiology" },

  ];



  const safeSelectedTags = Array.isArray(selectedTags) ? selectedTags : [];

  const getSelectedForCategory = (category: Category) =>

    safeSelectedTags.filter((tag) => tag.startsWith(`${category}:`)).map((tag) => tag.split(":")[1]);

  const selectedRotations = getSelectedForCategory("rotation");
  const topicOptions = Array.from(
    new Map(
      selectedRotations
        .flatMap((rot) => topicOptionsByRotation[rot] ?? [])
        .map((opt) => [opt.value, opt])
    ).values()
  );

  // Build filterOptions based on mode and year
  const filterOptions: Record<string, Option[]> = isPreclerkship
    ? {
        week: weekOptions,
        lecture: lectureOptions,
        discipline: preclerkshipDisciplineOptions,
        system: year === "Y2" ? year2SystemOptions : year1And3SystemOptions,
        // PreClerkship: No rotation or resource tags
      }
    : {
        rotation: year === "Y5" ? allRotationOptions.Y5 : allRotationOptions.Y4,
        ...baseFilterOptions,
        topic: topicOptions,
      };



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





