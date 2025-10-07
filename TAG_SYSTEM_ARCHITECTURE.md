# Tag System Architecture - Complete Technical Documentation

## Overview
The tag system is a **category:value** based classification system for questions. Tags are stored as strings in the format `"category:value"` (e.g., `"rotation:im"`, `"system:cardio"`).

---

## Tag Categories

### 🎯 DYNAMIC (Year-Specific) - ROTATION ONLY
**Only the ROTATION category changes based on year context.**

#### Year 4 Rotation Tags
- `rotation:im` → "Internal Medicine"
- `rotation:gs` → "General Surgery"  
- `rotation:peds` → "Pediatrics"
- `rotation:obgyn` → "Obstetrics and Gynaecology"

#### Year 5 Rotation Tags
- `rotation:fm` → "Family Medicine"
- `rotation:psych` → "Psychiatry"
- `rotation:gs2` → "General Surgery 2"
- `rotation:im2` → "Internal Medicine 2"

**Storage Format**: `"rotation:im"`, `"rotation:fm"`, etc.

---

### 📚 STATIC (Same for Both Years) - RESOURCE, DISCIPLINE, SYSTEM

#### RESOURCE Tags (5 options - STATIC)
- `resource:uworld_s1` → "UWorld - Step 1"
- `resource:uworld_s2` → "UWorld - Step 2"
- `resource:amboss` → "Amboss"
- `resource:beyond` → "Boards & Beyond"
- `resource:previouses` → "Previouses"

**Storage Format**: `"resource:uworld_s1"`, `"resource:amboss"`, etc.

#### DISCIPLINE Tags (13 options - STATIC)
- `discipline:anatomy` → "Anatomy"
- `discipline:behavioral` → "Behavioral Science"
- `discipline:biochem` → "Biochemistry"
- `discipline:biostat` → "Biostatistics"
- `discipline:embryology` → "Embryology"
- `discipline:genetics` → "Genetics"
- `discipline:histology` → "Histology"
- `discipline:immunology` → "Immunology"
- `discipline:micro` → "Microbiology"
- `discipline:path` → "Pathology"
- `discipline:pathophys` → "Pathophysiology"
- `discipline:pharm` → "Pharmacology"
- `discipline:physio` → "Physiology"

**Storage Format**: `"discipline:anatomy"`, `"discipline:pharm"`, etc.

#### SYSTEM Tags (26 options - STATIC)
- `system:bio_general` → "Biochemistry (General Principles)"
- `system:gen_general` → "Genetics (General Principles)"
- `system:micro_general` → "Microbiology (General Principles)"
- `system:path_general` → "Pathology (General Principles)"
- `system:pharm_general` → "Pharmacology (General Principles)"
- `system:biostat_epi` → "Biostatistics & Epidemiology"
- `system:poison_env` → "Poisoning & Environmental Exposure"
- `system:psych` → "Psychiatric / Behavioral & Substance Use Disorder"
- `system:social` → "Social Sciences (Ethics / Legal / Professional)"
- `system:misc` → "Miscellaneous (Multisystem)"
- `system:allergy_immuno` → "Allergy & Immunology"
- `system:cardio` → "Cardiovascular System"
- `system:derm` → "Dermatology"
- `system:ent` → "Ear, Nose & Throat (ENT)"
- `system:endocrine` → "Endocrine, Diabetes & Metabolism"
- `system:female_repro` → "Female Reproductive System & Breast"
- `system:gi` → "Gastrointestinal & Nutrition"
- `system:heme_onc` → "Hematology & Oncology"
- `system:id` → "Infectious Diseases"
- `system:male_repro` → "Male Reproductive System"
- `system:neuro` → "Nervous System"
- `system:ophtho` → "Ophthalmology"
- `system:pregnancy` → "Pregnancy, Childbirth & Puerperium"
- `system:pulm` → "Pulmonary & Critical Care"
- `system:renal` → "Renal, Urinary Systems & Electrolytes"
- `system:rheum` → "Rheumatology / Orthopedics & Sports"

**Storage Format**: `"system:cardio"`, `"system:neuro"`, etc.

---

## How The System Works

### 1. Tag Storage in Database
Tags are stored in the `Question` table as an **array of strings**:
```typescript
tags: ["rotation:im", "resource:uworld_s1", "discipline:pharm", "system:cardio"]
```

### 2. Tag Selection in Admin UI (TagSelector Component)

#### Year 4 Bulk Question Manager
```typescript
<TagSelector
  selectedTags={editedQuestion.tags}
  onChange={(tags) => setEditedQuestion(prev => ({ ...prev, tags }))}
  year="Y4"  // ✅ Filters rotation to show only Y4 tags
/>
```

**What admins see in Year 4:**
- **Rotation dropdown**: Internal Medicine, General Surgery, Pediatrics, Obstetrics and Gynaecology
- **Resource dropdown**: UWorld - Step 1, UWorld - Step 2, Amboss, Boards & Beyond, Previouses
- **Discipline dropdown**: All 13 discipline options (same for both years)
- **System dropdown**: All 26 system options (same for both years)

#### Year 5 Bulk Question Manager
```typescript
<TagSelector
  selectedTags={editedQuestion.tags}
  onChange={(tags) => setEditedQuestion(prev => ({ ...prev, tags }))}
  year="Y5"  // ✅ Filters rotation to show only Y5 tags
/>
```

**What admins see in Year 5:**
- **Rotation dropdown**: Family Medicine, Psychiatry, General Surgery 2, Internal Medicine 2
- **Resource dropdown**: UWorld - Step 1, UWorld - Step 2, Amboss, Boards & Beyond, Previouses (SAME)
- **Discipline dropdown**: All 13 discipline options (SAME)
- **System dropdown**: All 26 system options (SAME)

### 3. TagSelector Component Logic

```typescript
// Inside TagSelector component
export default function TagSelector({ year, selectedTags, onChange }) {
  
  // Dynamic rotation options based on year prop
  const filterOptions = {
    rotation: year === "Y5" ? allRotationOptions.Y5 : allRotationOptions.Y4,
    resource: baseFilterOptions.resource,    // ✅ STATIC - same for both
    discipline: baseFilterOptions.discipline, // ✅ STATIC - same for both
    system: baseFilterOptions.system,        // ✅ STATIC - same for both
  };
  
  // Render dropdowns with filtered options
  return (
    <div>
      {Object.keys(filterOptions).map(category => (
        <Dropdown category={category} options={filterOptions[category]} />
      ))}
    </div>
  );
}
```

### 4. Single Selection Rule (Important!)

**Each category allows ONLY ONE selection:**
```typescript
function applySingleCategoryTag(tags, category, value, shouldSelect) {
  const prefix = `${category}:`;
  // Remove any existing tag from this category
  const withoutCategory = tags.filter(tag => !tag.startsWith(prefix));
  // Add new selection if shouldSelect is true
  if (!shouldSelect) return withoutCategory;
  return [...withoutCategory, `${category}:${value}`];
}
```

**Example:**
- Admin selects `rotation:im` → Tags: `["rotation:im"]`
- Admin then selects `rotation:gs` → Tags: `["rotation:gs"]` (replaced, not added)
- Admin selects `resource:uworld_s1` → Tags: `["rotation:gs", "resource:uworld_s1"]` (different category, added)

### 5. Tag Display Format

Tags are stored as `"category:value"` but displayed as `"Category: Label"`:

```typescript
function formatTagDisplay(tag: string): string {
  const [category, value] = tag.split(":");
  const options = allOptionsForLookup[category];
  const match = options?.find(opt => opt.value === value);
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
  return match ? `${categoryLabel}: ${match.label}` : tag;
}
```

**Examples:**
- Stored: `"rotation:im"` → Displayed: `"Rotation: Internal Medicine"`
- Stored: `"system:cardio"` → Displayed: `"System: Cardiovascular System"`
- Stored: `"resource:amboss"` → Displayed: `"Resource: Amboss"`

---

## Year 4 vs Year 5 - Complete Comparison

### Year 4 Question Example
```json
{
  "id": "abc123",
  "questionText": "A 45-year-old man presents with...",
  "tags": [
    "rotation:im",           // ✅ Year 4 rotation
    "resource:uworld_s2",    // ✅ STATIC - same for both years
    "discipline:pharm",      // ✅ STATIC - same for both years
    "system:cardio"          // ✅ STATIC - same for both years
  ]
}
```

**Admin Experience (Year 4 Bulk Question Manager):**
- Opens bulk-question-manager in `/year4/admin/bulk-question-manager`
- TagSelector receives `year="Y4"` prop
- **Rotation dropdown shows**: Internal Medicine, General Surgery, Pediatrics, Obstetrics and Gynaecology
- **Resource dropdown shows**: UWorld - Step 1, UWorld - Step 2, Amboss, Boards & Beyond, Previouses
- **Discipline dropdown shows**: All 13 disciplines
- **System dropdown shows**: All 26 systems
- Selects `rotation:im`, `resource:uworld_s2`, `discipline:pharm`, `system:cardio`
- Tags saved: `["rotation:im", "resource:uworld_s2", "discipline:pharm", "system:cardio"]`

### Year 5 Question Example
```json
{
  "id": "xyz789",
  "questionText": "A 30-year-old woman presents with anxiety...",
  "tags": [
    "rotation:psych",        // ✅ Year 5 rotation
    "resource:amboss",       // ✅ STATIC - same for both years
    "discipline:behavioral", // ✅ STATIC - same for both years
    "system:psych"           // ✅ STATIC - same for both years
  ]
}
```

**Admin Experience (Year 5 Bulk Question Manager):**
- Opens bulk-question-manager in `/year5/admin/bulk-question-manager`
- TagSelector receives `year="Y5"` prop
- **Rotation dropdown shows**: Family Medicine, Psychiatry, General Surgery 2, Internal Medicine 2
- **Resource dropdown shows**: UWorld - Step 1, UWorld - Step 2, Amboss, Boards & Beyond, Previouses (SAME)
- **Discipline dropdown shows**: All 13 disciplines (SAME)
- **System dropdown shows**: All 26 systems (SAME)
- Selects `rotation:psych`, `resource:amboss`, `discipline:behavioral`, `system:psych`
- Tags saved: `["rotation:psych", "resource:amboss", "discipline:behavioral", "system:psych"]`

---

## Student View (Quiz Results)

When students answer questions in a quiz, they see tags displayed in the results:

```typescript
// ClientSideQuestionDetails.tsx
const TAG_LABELS: Record<DisplayTagType, string> = {
  SUBJECT: "Subject/Discipline",  // Maps to "discipline" category
  SYSTEM: "System",                // Maps to "system" category
  ROTATION: "Rotation",            // Maps to "rotation" category
  RESOURCE: "Resource",            // Maps to "resource" category
};
```

**Student sees (after answering):**
- **Rotation**: Internal Medicine (if `rotation:im`)
- **Resource**: UWorld - Step 2 (if `resource:uworld_s2`)
- **Subject/Discipline**: Pharmacology (if `discipline:pharm`)
- **System**: Cardiovascular System (if `system:cardio`)

**Note**: Students see ALL rotation tags that exist on questions, regardless of year. The year filtering ONLY applies to the admin UI when creating/editing questions.

---

## Tag Lookup System

### Central Catalog (`src/lib/tags/catalog.ts`)
```typescript
export const TAG_OPTIONS: Record<TagCategory, TagOption[]> = {
  rotation: [
    // Year 4
    { key: "im", label: "Internal Medicine", aliases: ["internal medicine", "im"] },
    { key: "gs", label: "General Surgery", aliases: ["general surgery", "gs"] },
    { key: "peds", label: "Pediatrics", aliases: ["pediatrics", "peds"] },
    { key: "obgyn", label: "Obstetrics and Gynaecology", aliases: ["ob-gyn", "obgyn"] },
    // Year 5
    { key: "fm", label: "Family Medicine", aliases: ["family medicine", "fm"] },
    { key: "psych", label: "Psychiatry", aliases: ["psychiatry", "psych"] },
    { key: "gs2", label: "General Surgery 2", aliases: ["general surgery 2", "gs2"] },
    { key: "im2", label: "Internal Medicine 2", aliases: ["internal medicine 2", "im2"] },
  ],
  resource: [...],  // STATIC
  discipline: [...], // STATIC
  system: [...],     // STATIC
  mode: [...],       // Not used in admin UI
};
```

### Tag Resolution Functions
```typescript
// Get label from tag key
export function getTagLabel(category: TagCategory, key: string): string | null {
  const option = TAG_OPTIONS[category].find(opt => opt.key === key);
  return option?.label ?? null;
}

// Normalize user input to tag key
export function normalizeTagKey(category: TagCategory, input: string): string | null {
  const lookup = buildLookup();
  const map = lookup.get(category);
  const option = map?.get(input.toLowerCase());
  return option?.key ?? null;
}
```

---

## Critical Architecture Points

### ✅ Year-Based Filtering is UI-Only
- **Database**: Stores ALL rotation tags (`im`, `gs`, `peds`, `obgyn`, `fm`, `psych`, `gs2`, `im2`)
- **Admin UI**: Filters which rotation tags to SHOW based on `year` prop
- **Student Quiz**: Shows whatever rotation tag is on the question (no filtering)

### ✅ Single Selection Per Category
- Each question can have **exactly ONE tag per category**
- Selecting a new rotation replaces the old rotation
- You CAN have `rotation:im` + `resource:amboss` + `discipline:pharm` + `system:cardio` (all different categories)
- You CANNOT have `rotation:im` + `rotation:gs` (same category)

### ✅ Tag Validation
```typescript
// Check if question has required tags
const requiredCategories = ["rotation", "resource", "discipline", "system"];
const missing = requiredCategories.filter(
  category => !tags.some(tag => tag.startsWith(`${category}:`))
);
if (missing.length > 0) {
  alert(`Missing required tags: ${missing.join(", ")}`);
}
```

### ✅ Tag Normalization
All tags go through normalization before saving:
```typescript
function normalizeTagValues(tags?: string[]) {
  if (!Array.isArray(tags)) return [];
  return Array.from(
    new Set(
      tags
        .map(tag => typeof tag === "string" ? tag.trim() : "")
        .filter(tag => tag.length > 0)
    )
  );
}
```

---

## Summary: Dynamic vs Static

| Category | Year 4 Options | Year 5 Options | Type |
|----------|----------------|----------------|------|
| **ROTATION** | im, gs, peds, obgyn | fm, psych, gs2, im2 | 🎯 **DYNAMIC** |
| **RESOURCE** | uworld_s1, uworld_s2, amboss, beyond, previouses | (same) | 📚 **STATIC** |
| **DISCIPLINE** | anatomy, behavioral, biochem... (13 total) | (same) | 📚 **STATIC** |
| **SYSTEM** | bio_general, cardio, neuro... (26 total) | (same) | 📚 **STATIC** |

**Key Insight**: Only ROTATION tags change between Year 4 and Year 5. All other categories (resource, discipline, system) remain exactly the same across both years. The TagSelector component filters the rotation dropdown based on the `year` prop, but resource/discipline/system dropdowns show identical options in both Year 4 and Year 5 admin interfaces.
