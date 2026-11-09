from pathlib import Path
from typing import Literal

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from features import RAW, build_features

BASE = Path(__file__).parent
MODEL_PATH = BASE / "model" / "rf_model.joblib"

bundle = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None
explainer = None
if bundle:
    try:
        import shap
        explainer = shap.TreeExplainer(bundle["model"])
    except Exception:  # the app still works without explanations
        explainer = None

# Engineered columns are folded back into the input they came from
GROUP = {"CancerHistory_log": "CancerHistory", "Smoking_log": "Smoking",
         "GeneticRisk_log": "GeneticRisk", "AgeGroup": "Age", "BMICategory": "BMI",
         "AlcoholLevel": "AlcoholIntake", "ActivityLevel": "PhysicalActivity",
         "BMI_AgeInteraction": "BMI"}
LABEL = {"Age": "Age", "Gender": "Gender", "BMI": "BMI", "Smoking": "Smoking",
         "GeneticRisk": "Genetic risk", "PhysicalActivity": "Physical activity",
         "AlcoholIntake": "Alcohol intake", "CancerHistory": "Cancer history"}


class Patient(BaseModel):
    Age: int = Field(ge=18, le=100)
    Gender: Literal[0, 1]
    BMI: float = Field(ge=10, le=60)
    Smoking: Literal[0, 1]
    GeneticRisk: Literal[0, 1, 2]
    PhysicalActivity: float = Field(ge=0, le=10)
    AlcoholIntake: float = Field(ge=0, le=5)
    CancerHistory: Literal[0, 1]


app = FastAPI(title="Cancer risk API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/api/meta")
def meta():
    return {"trained": bundle is not None, "metrics": bundle["metrics"] if bundle else {}}


@app.post("/api/predict")
def predict(p: Patient):
    if bundle is None:
        raise HTTPException(503, "Model not trained yet. Run: python train.py data/The_Cancer_data_1500_V2.csv")
    X = build_features(pd.DataFrame([p.model_dump()]), bundle["edges"])
    risk = min(max(float(bundle["model"].predict(X)[0]), 0.0), 1.0)
    level = "low" if risk < 0.33 else "moderate" if risk < 0.66 else "high"

    factors = []
    if explainer is not None:
        totals = {}
        for name, v in zip(X.columns, explainer.shap_values(X)[0]):
            g = GROUP.get(name, name)
            totals[g] = totals.get(g, 0.0) + float(v)
        factors = sorted(({"label": LABEL[g], "impact": round(v, 4)} for g, v in totals.items()),
                         key=lambda f: -abs(f["impact"]))[:5]
    return {"risk": round(risk, 4), "level": level, "factors": factors}


# Serve the frontend from the same server: http://localhost:8000
app.mount("/", StaticFiles(directory=BASE.parent / "frontend", html=True), name="frontend")
