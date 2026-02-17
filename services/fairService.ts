
export interface FAIRRequirement {
  id: string;
  label: string;
  mandatory: boolean;
}

export interface FAIRCategory {
  id: string;
  label: string;
  requirements: string[];
}

export const FAIR_CATEGORIES: FAIRCategory[] = [
  { id: 'mechanical', label: 'Mechanical / Fabricated', requirements: ['cover', 'report', 'coc', 'mat_cert', 'pop', 'photos'] },
  { id: 'electrical', label: 'Electrical / PCBA', requirements: ['cover', 'report', 'coc', 'mat_cert', 'pop', 'photos', 'elec_test'] },
  { id: 'cable', label: 'Cables / Wire Harness', requirements: ['cover', 'report', 'coc', 'mat_cert', 'pop', 'photos', 'pull_test'] },
  { id: 'cots', label: 'COTS / Standard Parts', requirements: ['coc', 'pop'] },
];

/**
 * Labels aligned with the requested checkFAIRCriteria logic
 */
export const FAIR_DOC_MAP: Record<string, string> = {
  cover: "Cover Note",
  report: "FA Report",
  coc: "CoC",
  mat_cert: "Material Cert",
  pop: "Proof of Purchase",
  photos: "FA Photos",
  elec_test: "Electrical Test",
  pull_test: "Pull Test"
};

export interface FAIRCheckResult {
  compliant: boolean;
  missing: string[];
}

/**
 * Implements the specific criteria check logic provided
 */
export const checkFAIRCriteria = (files: Record<string, boolean>, componentType: string): FAIRCheckResult => {
  const required: string[] = [
    "Cover Note",
    "FA Report",
    "CoC",
    "Material Cert",
    "Proof of Purchase",
    "FA Photos"
  ];

  const typeLower = componentType.toLowerCase();
  
  if (typeLower.includes("electrical") || typeLower.includes("pcb")) {
    required.push("Electrical Test");
  }
  if (typeLower.includes("cable")) {
    required.push("Pull Test");
  }
  if (typeLower.includes("cots")) {
    // COTS has specialized logic usually, but we stick to provided base
    return {
       compliant: files["CoC"] && files["Proof of Purchase"],
       missing: [!files["CoC"] && "CoC", !files["Proof of Purchase"] && "Proof of Purchase"].filter(Boolean) as string[]
    };
  }

  const missing = required.filter(req => !files[req]);

  return {
    compliant: missing.length === 0,
    missing
  };
};

export interface FAIRAnalysis {
  isCompliant: boolean;
  missing: string[];
  provided: string[];
}

export const evaluateFAIRCompliance = (selectedIds: string[], categoryId: string): FAIRAnalysis => {
  const category = FAIR_CATEGORIES.find(c => c.id === categoryId) || FAIR_CATEGORIES[0];
  const required = category.requirements;
  
  const provided = selectedIds.filter(id => required.includes(id));
  const missing = required.filter(id => !selectedIds.includes(id));
  
  return {
    isCompliant: missing.length === 0,
    missing: missing.map(id => FAIR_DOC_MAP[id]),
    provided: provided.map(id => FAIR_DOC_MAP[id])
  };
};
