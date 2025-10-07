export type TagCategory = "rotation" | "resource" | "discipline" | "system" | "mode";

export interface TagOption {
  key: string;
  label: string;
  aliases?: string[];
  hint?: string;
}

const rotationOptions: TagOption[] = [
  // Year 4 Rotations
  { key: "im", label: "Internal Medicine", aliases: ["internal medicine", "im"] },
  { key: "gs", label: "General Surgery", aliases: ["general surgery", "gs"] },
  { key: "peds", label: "Pediatrics", aliases: ["pediatrics", "peds"] },
  { key: "obgyn", label: "Obstetrics and Gynaecology", aliases: ["obstetrics and gynaecology", "ob-gyn", "obgyn"] },
  // Year 5 Rotations
  { key: "fm", label: "Family Medicine", aliases: ["family medicine", "fm"] },
  { key: "psych", label: "Psychiatry", aliases: ["psychiatry", "psych"] },
  { key: "gs2", label: "General Surgery 2", aliases: ["general surgery 2", "gs2"] },
  { key: "im2", label: "Internal Medicine 2", aliases: ["internal medicine 2", "im2"] },
];

const resourceOptions: TagOption[] = [
  { key: "uworld_s1", label: "UWorld - Step 1", aliases: ["uworld s1", "uworld step 1"] },
  { key: "uworld_s2", label: "UWorld - Step 2", aliases: ["uworld s2", "uworld step 2"] },
  { key: "amboss", label: "Amboss" },
  { key: "beyond", label: "Boards & Beyond", aliases: ["boards and beyond", "boards & beyond"] },
  { key: "previouses", label: "Previouses", aliases: ["previouses"] },
];

const disciplineOptions: TagOption[] = [
  { key: "anatomy", label: "Anatomy" },
  { key: "behavioral", label: "Behavioral Science", aliases: ["behavioral", "behavioral science"] },
  { key: "biochem", label: "Biochemistry", aliases: ["biochemistry", "biochem"] },
  { key: "biostat", label: "Biostatistics", aliases: ["biostat", "biostatistics"] },
  { key: "embryology", label: "Embryology" },
  { key: "genetics", label: "Genetics" },
  { key: "histology", label: "Histology" },
  { key: "immunology", label: "Immunology" },
  { key: "micro", label: "Microbiology", aliases: ["microbiology", "micro"] },
  { key: "path", label: "Pathology", aliases: ["path", "pathology"] },
  { key: "pathophys", label: "Pathophysiology", aliases: ["pathophysiology", "pathophys"] },
  { key: "pharm", label: "Pharmacology", aliases: ["pharmacology", "pharm"] },
  { key: "physio", label: "Physiology", aliases: ["physiology", "physio"] },
];

const systemOptions: TagOption[] = [
  { key: "bio_general", label: "Biochemistry (General Principles)", aliases: ["biochemistry (general principles)"] },
  { key: "gen_general", label: "Genetics (General Principles)", aliases: ["genetics (general principles)"] },
  { key: "micro_general", label: "Microbiology (General Principles)" },
  { key: "path_general", label: "Pathology (General Principles)" },
  { key: "pharm_general", label: "Pharmacology (General Principles)" },
  { key: "biostat_epi", label: "Biostatistics & Epidemiology", aliases: ["biostatistics & epidemiology", "biostat epi"] },
  { key: "poison_env", label: "Poisoning & Environmental Exposure", aliases: ["poisoning & environmental exposure", "poison env"] },
  { key: "psych", label: "Psychiatric / Behavioral & Substance Use Disorder", aliases: ["psychiatric", "behavioral", "psych"] },
  { key: "social", label: "Social Sciences (Ethics / Legal / Professional)", aliases: ["social sciences", "social"] },
  { key: "misc", label: "Miscellaneous (Multisystem)", aliases: ["misc", "multisystem"] },
  { key: "allergy_immuno", label: "Allergy & Immunology", aliases: ["allergy", "immunology"] },
  { key: "cardio", label: "Cardiovascular System", aliases: ["cardiovascular", "cardio"] },
  { key: "derm", label: "Dermatology", aliases: ["dermatology", "derm"] },
  { key: "ent", label: "Ear, Nose & Throat (ENT)", aliases: ["ent", "ear nose throat"] },
  { key: "endocrine", label: "Endocrine, Diabetes & Metabolism", aliases: ["endocrine", "endocrine diabetes metabolism"] },
  { key: "female_repro", label: "Female Reproductive System & Breast", aliases: ["female reproductive", "female reproductive system", "breast"] },
  { key: "gi", label: "Gastrointestinal & Nutrition", aliases: ["gi", "gastrointestinal"] },
  { key: "heme_onc", label: "Hematology & Oncology", aliases: ["hematology", "oncology", "heme onc"] },
  { key: "id", label: "Infectious Diseases", aliases: ["infectious diseases", "id"] },
  { key: "male_repro", label: "Male Reproductive System", aliases: ["male reproductive", "male reproductive system"] },
  { key: "neuro", label: "Nervous System", aliases: ["nervous system", "neuro"] },
  { key: "ophtho", label: "Ophthalmology", aliases: ["ophthalmology", "ophtho"] },
  { key: "pregnancy", label: "Pregnancy, Childbirth & Puerperium", aliases: ["pregnancy", "childbirth", "puerperium"] },
  { key: "pulm", label: "Pulmonary & Critical Care", aliases: ["pulmonary", "critical care", "pulm"] },
  { key: "renal", label: "Renal, Urinary Systems & Electrolytes", aliases: ["renal", "urinary systems", "electrolytes"] },
  { key: "rheum", label: "Rheumatology / Orthopedics & Sports", aliases: ["rheumatology", "orthopedics", "sports", "rheum"] },
];

const modeOptions: TagOption[] = [
  { key: "unused", label: "Unused/Unanswered", hint: "Selects questions from a set of new/unseen questions", aliases: ["unused", "unanswered"] },
  { key: "incorrect", label: "Incorrect", hint: "Previously answered incorrectly" },
  { key: "omitted", label: "Omitted", hint: "Previously omitted after submitting exam" },
  { key: "correct", label: "Correct", hint: "Previously answered correctly" },
  { key: "marked", label: "Marked", hint: "Previously marked/flagged for review" },
];

export const TAG_OPTIONS: Record<TagCategory, TagOption[]> = {
  rotation: rotationOptions,
  resource: resourceOptions,
  discipline: disciplineOptions,
  system: systemOptions,
  mode: modeOptions,
};

function buildLookup() {
  const lookup = new Map<TagCategory, Map<string, TagOption>>();
  (Object.keys(TAG_OPTIONS) as TagCategory[]).forEach((category) => {
    const map = new Map<string, TagOption>();
    TAG_OPTIONS[category].forEach((option) => {
      map.set(option.key.toLowerCase(), option);
      map.set(option.label.toLowerCase(), option);
      option.aliases?.forEach((alias) => {
        map.set(alias.toLowerCase(), option);
      });
    });
    lookup.set(category, map);
  });
  return lookup;
}

const LOOKUP = buildLookup();

export function normalizeTagKey(category: TagCategory, rawValue: string): string | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  const map = LOOKUP.get(category);
  if (!map) return trimmed;
  const found = map.get(trimmed.toLowerCase());
  return found ? found.key : trimmed;
}

export function getTagLabel(category: TagCategory, key: string): string | undefined {
  const map = LOOKUP.get(category);
  if (!map) return undefined;
  const option = map.get(key.toLowerCase());
  if (option?.key.toLowerCase() === key.toLowerCase()) {
    return option.label;
  }
  // fallback lookup by key only
  const direct = TAG_OPTIONS[category].find((opt) => opt.key.toLowerCase() === key.toLowerCase());
  return direct?.label;
}

export function listTagKeys(category: TagCategory): string[] {
  return TAG_OPTIONS[category].map((option) => option.key);
}
