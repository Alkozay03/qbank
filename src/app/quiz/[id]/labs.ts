export type LabEntry = {
  name: string;
  range: string;
  unit?: string;
  section: "Serum" | "Urine" | "CSF" | "Blood/BMI";
};

export const LABS: LabEntry[] = [
  // Serum
  { name: "Sodium", range: "135 – 145", unit: "mmol/L", section: "Serum" },
  { name: "Potassium", range: "3.5 – 5.0", unit: "mmol/L", section: "Serum" },
  { name: "Chloride", range: "98 – 106", unit: "mmol/L", section: "Serum" },
  { name: "Bicarbonate (HCO₃⁻)", range: "22 – 28", unit: "mmol/L", section: "Serum" },
  { name: "Creatinine", range: "0.6 – 1.3", unit: "mg/dL", section: "Serum" },
  { name: "Urea (BUN)", range: "7 – 20", unit: "mg/dL", section: "Serum" },
  { name: "Glucose (fasting)", range: "70 – 99", unit: "mg/dL", section: "Serum" },
  { name: "Calcium (total)", range: "8.5 – 10.5", unit: "mg/dL", section: "Serum" },
  { name: "Magnesium", range: "1.7 – 2.2", unit: "mg/dL", section: "Serum" },

  // Urine
  { name: "Urine Specific Gravity", range: "1.002 – 1.030", section: "Urine" },
  { name: "Urine pH", range: "4.5 – 8.0", section: "Urine" },

  // CSF
  { name: "CSF Opening Pressure", range: "10 – 20", unit: "cm H₂O", section: "CSF" },
  { name: "CSF Protein", range: "15 – 45", unit: "mg/dL", section: "CSF" },
  { name: "CSF Glucose", range: "50 – 80", unit: "mg/dL", section: "CSF" },

  // Blood / BMI
  { name: "Hemoglobin (male)", range: "13.5 – 17.5", unit: "g/dL", section: "Blood/BMI" },
  { name: "Hemoglobin (female)", range: "12.0 – 15.5", unit: "g/dL", section: "Blood/BMI" },
  { name: "WBC count", range: "4.0 – 11.0", unit: "×10⁹/L", section: "Blood/BMI" },
  { name: "Platelets", range: "150 – 400", unit: "×10⁹/L", section: "Blood/BMI" },
  { name: "BMI (normal)", range: "18.5 – 24.9", unit: "kg/m²", section: "Blood/BMI" },
];
