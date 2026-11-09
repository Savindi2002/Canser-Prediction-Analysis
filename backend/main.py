"""
CancerAI – FastAPI backend
Run:  uvicorn main:app --reload --port 8000
Needs: data/The_Cancer_data_1500_V2.csv  (same file used in your notebook)
"""
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score,
                             precision_score, recall_score)
from sklearn.model_selection import train_test_split

CSV_PATH = Path(__file__).parent / "data" / "The_Cancer_data_1500_V2.csv"

app = FastAPI(title="CancerAI API")

# Vite moves to 5174, 5175, 5176... when a port is busy, so allow ANY localhost port.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------
# Feature engineering – identical to the notebook, in the same order
# ---------------------------------------------------------------
AGE_BINS, AGE_LABELS = [0, 30, 45, 60, 100], ["Young", "Adult", "MiddleAge", "Senior"]
BMI_BINS, BMI_LABELS = [0, 18.5, 24.9, 29.9, 100], ["Underweight", "Normal", "Overweight", "Obese"]

# LabelEncoder sorts labels alphabetically
AGE_CODE = {k: i for i, k in enumerate(sorted(AGE_LABELS))}
BMI_CODE = {k: i for i, k in enumerate(sorted(BMI_LABELS))}
LEVEL_CODE = {k: i for i, k in enumerate(sorted(["Low", "Medium", "High"]))}

FEATURE_ORDER = [
    "Age", "Gender", "BMI", "Smoking", "GeneticRisk", "PhysicalActivity",
    "AlcoholIntake", "CancerHistory", "CancerHistory_log", "Smoking_log",
    "GeneticRisk_log", "AgeGroup", "BMICategory", "AlcoholLevel",
    "ActivityLevel", "BMI_AgeInteraction",
]


def build_training_frame(df: pd.DataFrame):
    df = df.copy()
    df["CancerHistory_log"] = np.log1p(df["CancerHistory"])
    df["Smoking_log"] = np.log1p(df["Smoking"])
    df["GeneticRisk_log"] = np.log1p(df["GeneticRisk"])

    df["AgeGroup"] = pd.cut(df["Age"], bins=AGE_BINS, labels=AGE_LABELS)
    df["BMICategory"] = pd.cut(df["BMI"], bins=BMI_BINS, labels=BMI_LABELS)
    df["AlcoholLevel"], alc_bins = pd.qcut(
        df["AlcoholIntake"], q=3, labels=["Low", "Medium", "High"], retbins=True)
    df["ActivityLevel"], act_bins = pd.qcut(
        df["PhysicalActivity"], q=3, labels=["Low", "Medium", "High"], retbins=True)
    df["BMI_AgeInteraction"] = df["BMI"] * df["Age"]

    df["AgeGroup"] = df["AgeGroup"].astype(str).map(AGE_CODE)
    df["BMICategory"] = df["BMICategory"].astype(str).map(BMI_CODE)
    df["AlcoholLevel"] = df["AlcoholLevel"].astype(str).map(LEVEL_CODE)
    df["ActivityLevel"] = df["ActivityLevel"].astype(str).map(LEVEL_CODE)

    return df[FEATURE_ORDER], df["Diagnosis"], alc_bins, act_bins


def level_from_bins(value, bins):
    """Same result as qcut, using the training cut points (values outside are clipped)."""
    if value <= bins[1]:
        label = "Low"
    elif value <= bins[2]:
        label = "Medium"
    else:
        label = "High"
    return LEVEL_CODE[label]


def category_code(value, bins, labels, codes):
    for i in range(len(labels)):
        if bins[i] < value <= bins[i + 1]:
            return codes[labels[i]]
    return codes[labels[0] if value <= bins[0] else labels[-1]]


# ---------------------------------------------------------------
# Train once when the server starts
# ---------------------------------------------------------------
if not CSV_PATH.exists():
    raise RuntimeError(f"Dataset not found: {CSV_PATH}")

X, y, ALC_BINS, ACT_BINS = build_training_frame(pd.read_csv(CSV_PATH))
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

_pred = (model.predict(X_test) >= 0.5).astype(int)
METRICS = {
    "accuracy": float(accuracy_score(y_test, _pred)),
    "precision": float(precision_score(y_test, _pred, zero_division=0)),
    "recall": float(recall_score(y_test, _pred, zero_division=0)),
    "f1_score": float(f1_score(y_test, _pred, zero_division=0)),
    "confusion_matrix": confusion_matrix(y_test, _pred, labels=[0, 1]).tolist(),
}


# ---------------------------------------------------------------
# Routes
# ---------------------------------------------------------------
class Patient(BaseModel):
    Age: float
    Gender: int
    BMI: float
    Smoking: int
    GeneticRisk: int
    PhysicalActivity: float
    AlcoholIntake: float
    CancerHistory: int


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/metrics")
def metrics():
    return METRICS


@app.post("/predict")
def predict(p: Patient):
    try:
        row = {
            "Age": p.Age, "Gender": p.Gender, "BMI": p.BMI, "Smoking": p.Smoking,
            "GeneticRisk": p.GeneticRisk, "PhysicalActivity": p.PhysicalActivity,
            "AlcoholIntake": p.AlcoholIntake, "CancerHistory": p.CancerHistory,
            "CancerHistory_log": float(np.log1p(p.CancerHistory)),
            "Smoking_log": float(np.log1p(p.Smoking)),
            "GeneticRisk_log": float(np.log1p(p.GeneticRisk)),
            "AgeGroup": category_code(p.Age, AGE_BINS, AGE_LABELS, AGE_CODE),
            "BMICategory": category_code(p.BMI, BMI_BINS, BMI_LABELS, BMI_CODE),
            "AlcoholLevel": level_from_bins(p.AlcoholIntake, ALC_BINS),
            "ActivityLevel": level_from_bins(p.PhysicalActivity, ACT_BINS),
            "BMI_AgeInteraction": p.BMI * p.Age,
        }
        frame = pd.DataFrame([row])[FEATURE_ORDER]
        score = float(np.clip(model.predict(frame)[0], 0, 1))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "prediction": int(score >= 0.5),
        "probabilities": [1 - score, score],
    }