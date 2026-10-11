
from pathlib import Path
import json

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


# Project paths
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "The_Cancer_data_1500_V2.csv"
MODEL_DIR = BASE_DIR / "backend" / "model"

MODEL_DIR.mkdir(parents=True, exist_ok=True)

# Features from the original notebook
FEATURES = [
    "Age",
    "Gender",
    "BMI",
    "Smoking",
    "GeneticRisk",
    "PhysicalActivity",
    "AlcoholIntake",
    "CancerHistory",
]

TARGET = "Diagnosis"

# Load data
df = pd.read_csv(DATA_PATH)

required_columns = FEATURES + [TARGET]
missing = set(required_columns) - set(df.columns)

if missing:
    raise ValueError(f"Missing dataset columns: {sorted(missing)}")

df = df[required_columns].copy()
df = df.dropna(subset=[TARGET])

X = df[FEATURES]
y = df[TARGET].astype(int)

if set(y.unique()) != {0, 1}:
    raise ValueError(
        f"Expected binary Diagnosis labels 0 and 1, got {sorted(y.unique())}"
    )

# Keep the same train/test split seed as the notebook
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y,
)

# Preprocessing and model are saved together
pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    (
        "classifier",
        RandomForestClassifier(
            n_estimators=200,
            random_state=42,
            class_weight="balanced",
        ),
    ),
])

pipeline.fit(X_train, y_train)

# Evaluate on held-out test data
y_pred = pipeline.predict(X_test)

metrics = {
    "accuracy": float(accuracy_score(y_test, y_pred)),
    "precision": float(
        precision_score(y_test, y_pred, zero_division=0)
    ),
    "recall": float(
        recall_score(y_test, y_pred, zero_division=0)
    ),
    "f1_score": float(
        f1_score(y_test, y_pred, zero_division=0)
    ),
    "confusion_matrix": confusion_matrix(
        y_test, y_pred
    ).tolist(),
}

# Save model and evaluation results
joblib.dump(pipeline, MODEL_DIR / "cancer_classifier.joblib")

with open(MODEL_DIR / "metrics.json", "w", encoding="utf-8") as f:
    json.dump(metrics, f, indent=4)

print("Model training completed.")
print("\nClassification report:")
print(classification_report(y_test, y_pred, zero_division=0))

print("Evaluation metrics:")
print(json.dumps(metrics, indent=4))

print(f"\nSaved model to: {MODEL_DIR}")
