export type LabItem = { name: string; conv: string; si: string };
export type LabSetKey = "serum" | "csf" | "hematologic" | "urine" | "bmi";

export const LAB_SETS: Record<LabSetKey, LabItem[]> = {
  serum: [
    { name: "ALT", conv: "10–40 U/L", si: "10–40 U/L" },
    { name: "AST", conv: "12–38 U/L", si: "12–38 U/L" },
    { name: "Alkaline phosphatase", conv: "25–100 U/L", si: "25–100 U/L" },
    { name: "Bilirubin (total)", conv: "0.1–1.0 mg/dL", si: "2–17 μmol/L" },
    { name: "Bilirubin (direct)", conv: "0.0–0.3 mg/dL", si: "0–5 μmol/L" },
    { name: "Calcium", conv: "8.4–10.2 mg/dL", si: "2.1–2.6 mmol/L" },
    { name: "Sodium (Na⁺)", conv: "136–146 mEq/L", si: "136–146 mmol/L" },
    { name: "Potassium (K⁺)", conv: "3.5–5.0 mEq/L", si: "3.5–5.0 mmol/L" },
    { name: "Chloride (Cl⁻)", conv: "95–105 mEq/L", si: "95–105 mmol/L" },
    { name: "Bicarbonate (HCO₃⁻)", conv: "22–28 mEq/L", si: "22–28 mmol/L" },
    { name: "Creatinine", conv: "0.6–1.2 mg/dL", si: "53–106 μmol/L" },
    { name: "Urea nitrogen (BUN)", conv: "7–18 mg/dL", si: "1.2–3.0 mmol/L" },
    { name: "Glucose, fasting", conv: "70–110 mg/dL", si: "3.8–5.6 mmol/L" },
    { name: "Magnesium", conv: "1.5–2.0 mEq/L", si: "0.75–1.0 mmol/L" },
  ],
  csf: [
    { name: "Cell count", conv: "0–5 / mm³", si: "0–5 ×10⁶/L" },
    { name: "Chloride", conv: "118–132 mEq/L", si: "118–132 mmol/L" },
    { name: "Glucose", conv: "40–70 mg/dL", si: "2.2–3.9 mmol/L" },
    { name: "Protein (total)", conv: "<40 mg/dL", si: "<0.40 g/L" },
    { name: "Opening pressure", conv: "70–180 mm H₂O", si: "70–180 mm H₂O" },
  ],
  hematologic: [
    { name: "WBC", conv: "4,500–11,000 / mm³", si: "4.5–11.0 ×10⁹/L" },
    { name: "Hemoglobin (male)", conv: "13.5–17.5 g/dL", si: "135–175 g/L" },
    { name: "Hemoglobin (female)", conv: "12.0–16.0 g/dL", si: "120–160 g/L" },
    { name: "Platelets", conv: "150,000–400,000 / mm³", si: "150–400 ×10⁹/L" },
    { name: "PT", conv: "11–15 sec", si: "11–15 sec" },
    { name: "aPTT", conv: "25–40 sec", si: "25–40 sec" },
    { name: "MCV", conv: "80–100 fL", si: "80–100 fL" },
  ],
  urine: [
    { name: "Osmolality", conv: "50–1200 mOsm/kg", si: "50–1200 mmol/kg" },
    { name: "Total protein (24 h)", conv: "<150 mg/24 h", si: "<0.15 g/24 h" },
    { name: "Calcium (24 h)", conv: "100–300 mg/24 h", si: "2.5–7.5 mmol/24 h" },
    { name: "Creatinine clearance (male)", conv: "97–137 mL/min", si: "97–137 mL/min" },
    { name: "Creatinine clearance (female)", conv: "88–128 mL/min", si: "88–128 mL/min" },
  ],
  bmi: [
    { name: "Adult BMI (normal)", conv: "19–25 kg/m²", si: "19–25 kg/m²" },
  ],
};
