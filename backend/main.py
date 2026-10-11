
from pathlib import Path
import json

import joblib
import pandas as pd

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "cancer_classifier.joblib"
METRICS_PATH = BASE_DIR / "model" / "metrics.json"


# --------------------------------------------------
# Load trained model
# --------------------------------------------------

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        "Trained model not found. Run backend/train_model.py first."
    )

model = joblib.load(MODEL_PATH)

if METRICS_PATH.exists():
    with open(METRICS_PATH, "r", encoding="utf-8") as file:
        metrics = json.load(file)
else:
    metrics = {}


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


# --------------------------------------------------
# Create FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="Cancer Prediction API",
    description=(
        "Educational machine learning API for demonstrating "
        "binary classification on a cancer-related dataset. "
        "Not intended for medical diagnosis."
    ),
    version="1.0.0",
)


# --------------------------------------------------
# Allow React frontend to communicate with the API
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# --------------------------------------------------
# Request validation
# --------------------------------------------------

class PatientData(BaseModel):
    Age: float = Field(ge=0, le=120)
    Gender: int = Field(ge=0, le=1)
    BMI: float = Field(gt=0, le=100)
    Smoking: int = Field(ge=0, le=1)
    GeneticRisk: int = Field(ge=0, le=2)
    PhysicalActivity: float = Field(ge=0, le=24)
    AlcoholIntake: float = Field(ge=0, le=100)
    CancerHistory: int = Field(ge=0, le=1)


# --------------------------------------------------
# Routes
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Cancer Prediction API is running",
        "docs": "/docs",
        "warning": "Educational use only. Not for medical diagnosis.",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": True,
    }


@app.get("/metrics")
def get_metrics():
    return metrics


@app.post("/predict")
def predict(patient: PatientData):
    try:
        patient_data = patient.model_dump()

        # Preserve the feature order used during training
        input_df = pd.DataFrame(
            [[patient_data[name] for name in FEATURES]],
            columns=FEATURES,
        )

        prediction = int(model.predict(input_df)[0])

        # Return a probability only when supported by the model
        probabilities = None

        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(input_df)[0].tolist()

        return {
            "prediction": prediction,
            "probabilities": probabilities,
            "message": (
                "Model predicted class 1"
                if prediction == 1
                else "Model predicted class 0"
            ),
            "disclaimer": (
                "Educational output only. This is not a medical "
                "diagnosis or a validated clinical risk estimate."
            ),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Prediction failed. Check the server logs.",
        ) from exc
