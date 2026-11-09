"""Feature engineering from the notebook, shared by training and the API."""
import numpy as np
import pandas as pd

RAW = ["Age", "Gender", "BMI", "Smoking", "GeneticRisk",
       "PhysicalActivity", "AlcoholIntake", "CancerHistory"]

# Same alphabetical codes that LabelEncoder produced in the notebook
AGE_CODE = {"Adult": 0, "MiddleAge": 1, "Senior": 2, "Young": 3}
BMI_CODE = {"Normal": 0, "Obese": 1, "Overweight": 2, "Underweight": 3}
LEVEL_CODE = {"High": 0, "Low": 1, "Medium": 2}


def tercile_edges(s: pd.Series) -> list:
    """Cut points that replace pd.qcut(q=3), so one patient can be scored."""
    q1, q2 = s.quantile([1 / 3, 2 / 3])
    return [float(q1), float(q2)]


def _cut(s, bins, labels, codes):
    return pd.cut(s, bins=bins, labels=labels).astype(str).map(codes).astype(int)


def build_features(raw: pd.DataFrame, edges: dict) -> pd.DataFrame:
    X = raw[RAW].astype(float).copy()
    X["CancerHistory_log"] = np.log1p(X["CancerHistory"])
    X["Smoking_log"] = np.log1p(X["Smoking"])
    X["GeneticRisk_log"] = np.log1p(X["GeneticRisk"])
    X["AgeGroup"] = _cut(X["Age"], [0, 30, 45, 60, 100],
                         ["Young", "Adult", "MiddleAge", "Senior"], AGE_CODE)
    X["BMICategory"] = _cut(X["BMI"], [0, 18.5, 24.9, 29.9, 100],
                            ["Underweight", "Normal", "Overweight", "Obese"], BMI_CODE)
    for col, name in (("AlcoholIntake", "AlcoholLevel"), ("PhysicalActivity", "ActivityLevel")):
        e = edges[col]
        X[name] = _cut(X[col], [-np.inf, e[0], e[1], np.inf], ["Low", "Medium", "High"], LEVEL_CODE)
    X["BMI_AgeInteraction"] = X["BMI"] * X["Age"]
    return X
