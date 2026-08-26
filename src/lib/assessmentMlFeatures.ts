export type AssessmentFeatureInput = {
  age?: string;
  duration?: string;
  progression?: string;
  walking?: string;
  familyHistory?: string;
  selectedSymptoms?: string[];
  lostAbilities?: string[];
};

export type AssessmentFeatureVector = {
  falls: number;
  stairs: number;
  standing: number;
  tired: number;
  weakness: number;
  progression_worse: number;
  progression_same: number;
  mobility_support: number;
  mobility_assistance: number;
  wheelchair: number;
  family_history_yes: number;
  lost_abilities_count: number;
  age_3_9: number;
};

export function buildAssessmentFeatureVector(input: AssessmentFeatureInput): AssessmentFeatureVector {
  const symptoms = new Set(input.selectedSymptoms ?? []);
  const walking = input.walking ?? "";
  return {
    falls: symptoms.has("falls") ? 1 : 0,
    stairs: symptoms.has("stairs") ? 1 : 0,
    standing: symptoms.has("standing") ? 1 : 0,
    tired: symptoms.has("tired") ? 1 : 0,
    weakness: symptoms.has("weakness") ? 1 : 0,
    progression_worse: input.progression === "worse" ? 1 : 0,
    progression_same: input.progression === "same" ? 1 : 0,
    mobility_support: walking === "Walks but sometimes needs support" ? 1 : 0,
    mobility_assistance: walking === "Needs regular assistance" ? 1 : 0,
    wheelchair: walking === "Uses a wheelchair" ? 1 : 0,
    family_history_yes: input.familyHistory === "Yes" ? 1 : 0,
    lost_abilities_count: Math.min((input.lostAbilities ?? []).length, 8),
    age_3_9: input.age === "3–5 years" || input.age === "6–9 years" ? 1 : 0,
  };
}

export const ML_MODEL_STATUS = {
  status: "dataset_required" as const,
  modelVersion: null as string | null,
  message:
    "No clinically validated ML model is active. DMD-AI currently uses transparent evidence-informed rules while storing a stable feature vector for future validated model training.",
};
