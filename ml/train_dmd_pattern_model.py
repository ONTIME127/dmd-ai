"""
DMD-AI ML training scaffold

This file intentionally does NOT train on synthetic/fabricated DMD labels.
To train a real model, provide a reviewed CSV with one row per assessment,
the feature columns listed in FEATURE_COLUMNS, and a clinically appropriate
target label agreed by the project supervisor/clinical advisor.

Recommended first model:
- LogisticRegression(class_weight="balanced")
- stratified train/validation split
- AUROC, PR-AUC, sensitivity, specificity, calibration
- external validation before any clinical use

Current production DMD-AI remains evidence/rule-based and non-diagnostic.
"""
FEATURE_COLUMNS = [
    "falls","stairs","standing","tired","weakness",
    "progression_worse","progression_same",
    "mobility_support","mobility_assistance","wheelchair",
    "family_history_yes","lost_abilities_count","age_3_9",
]

def main():
    print("DMD-AI ML scaffold ready.")
    print("No model trained: a labeled, reviewed dataset is required.")
    print("Expected features:")
    for c in FEATURE_COLUMNS:
        print(" -", c)

if __name__ == "__main__":
    main()
