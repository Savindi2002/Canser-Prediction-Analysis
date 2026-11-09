"""Usage: python train.py data/The_Cancer_data_1500_V2.csv"""
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from features import RAW, build_features, tercile_edges

OUT = Path(__file__).parent / "model" / "rf_model.joblib"


def main(csv_path: str):
    df = pd.read_csv(csv_path)
    edges = {c: tercile_edges(df[c]) for c in ("AlcoholIntake", "PhysicalActivity")}
    X = build_features(df[RAW], edges)
    y = df["Diagnosis"].astype(int)

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
    rf = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1).fit(X_tr, y_tr)

    pred = rf.predict(X_te)
    metrics = {
        "r2": round(float(r2_score(y_te, pred)), 4),
        "mse": round(float(mean_squared_error(y_te, pred)), 4),
        "accuracy": round(float(((pred >= 0.5) == y_te).mean()), 4),
        "rows": int(len(df)),
    }
    OUT.parent.mkdir(exist_ok=True)
    joblib.dump({"model": rf, "edges": edges, "metrics": metrics}, OUT)
    print("Saved", OUT, metrics)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
