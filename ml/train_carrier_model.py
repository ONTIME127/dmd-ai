from __future__ import annotations
from pathlib import Path
import io, json, math, sys, urllib.request, datetime

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data"
MODEL_DIR = ROOT / "public" / "ml"
DATA_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)

URLS = [
    "https://biostat.app.vumc.org/wiki/pub/Main/DataSets/dmd.csv",
    "http://biostat.mc.vanderbilt.edu/wiki/pub/Main/DataSets/dmd.csv",
    "https://rstudio.r-universe.dev/academyDatasets/data/dmd/csv",
]

def download() -> tuple[bytes, str]:
    headers={"User-Agent":"Mozilla/5.0 DMD-AI research training"}
    last=None
    for url in URLS:
        try:
            req=urllib.request.Request(url,headers=headers)
            with urllib.request.urlopen(req,timeout=25) as r:
                raw=r.read()
            if len(raw)>500 and b"," in raw[:500]:
                return raw,url
        except Exception as e:
            last=e
            print("Dataset source failed:",url,"->",e)
    raise RuntimeError(f"Could not download the public DMD carrier dataset. Last error: {last}")

def normalize_columns(df):
    aliases = {
        "age":["age"],
        "creatine_kinase":["creatine_kinase","ck","creatine kinase"],
        "hemopexin":["hemopexin","h"],
        "pyruvate_kinase":["pyruvate_kinase","pk","pyruvate kinase"],
        "lactate_dehydrogenase":["lactate_dehydrogenase","lactate_dehydroginase","ld","lactate dehydrogenase"],
        "carrier":["carrier"],
        "hospid":["hospid","hospital_id","hospital id"],
    }
    lower={str(c).strip().lower():c for c in df.columns}
    rename={}
    for canonical,names in aliases.items():
        for name in names:
            if name in lower:
                rename[lower[name]]=canonical
                break
    return df.rename(columns=rename)

def main():
    try:
        import numpy as np
        import pandas as pd
        from sklearn.impute import SimpleImputer
        from sklearn.preprocessing import StandardScaler
        from sklearn.linear_model import LogisticRegression
        from sklearn.pipeline import Pipeline
        from sklearn.model_selection import StratifiedKFold, cross_val_predict
        from sklearn.metrics import (
            roc_auc_score, balanced_accuracy_score, confusion_matrix,
            accuracy_score, precision_score, recall_score
        )
    except Exception:
        print("Missing Python ML packages.")
        print("Run: python -m pip install pandas numpy scikit-learn")
        raise

    raw, source = download()
    raw_path = DATA_DIR/"dmd_carrier_source.csv"
    raw_path.write_bytes(raw)

    # Try ordinary comma CSV first, then whitespace.
    try:
        df=pd.read_csv(io.BytesIO(raw))
        if df.shape[1] < 5:
            raise ValueError("too few columns")
    except Exception:
        df=pd.read_csv(io.BytesIO(raw),sep=r"\s+",engine="python")

    df=normalize_columns(df)

    required=["age","creatine_kinase","hemopexin","pyruvate_kinase","lactate_dehydrogenase","carrier"]
    missing=[c for c in required if c not in df.columns]
    if missing:
        raise RuntimeError(f"Downloaded dataset format was not recognized. Missing columns: {missing}. Columns found: {list(df.columns)}")

    # Numeric conversion. Historical source may include NA-like values.
    for c in required:
        df[c]=pd.to_numeric(df[c],errors="coerce")
    df=df.dropna(subset=["carrier"]).copy()
    df["carrier"]=(df["carrier"]>0).astype(int)

    # Avoid subject leakage if the raw 209-sample version is returned.
    # The source documentation notes repeated hospital IDs and anomalous conflicting
    # carrier labels. Ambiguous repeated subjects are removed rather than guessed.
    if "hospid" in df.columns:
        df["hospid"]=df["hospid"].astype(str)
        ambiguous = (
            df.groupby("hospid")["carrier"].nunique()
              .loc[lambda s:s>1].index.tolist()
        )
        if ambiguous:
            print(f"Removing {len(ambiguous)} repeated subjects with conflicting historical carrier labels.")
            df=df[~df["hospid"].isin(ambiguous)].copy()
        df=df.sort_index().drop_duplicates("hospid",keep="first")

    features=["age","creatine_kinase","hemopexin","pyruvate_kinase","lactate_dehydrogenase"]
    X=df[features].copy()
    y=df["carrier"].astype(int)

    if len(df)<50 or y.nunique()!=2:
        raise RuntimeError("Dataset did not contain enough usable labeled observations after cleaning.")

    pipe=Pipeline([
        ("imputer",SimpleImputer(strategy="median")),
        ("scaler",StandardScaler()),
        ("model",LogisticRegression(max_iter=3000,class_weight="balanced",solver="liblinear",random_state=42)),
    ])

    folds=min(5,int(y.value_counts().min()))
    cv=StratifiedKFold(n_splits=folds,shuffle=True,random_state=42)
    proba=cross_val_predict(pipe,X,y,cv=cv,method="predict_proba")[:,1]
    pred=(proba>=0.5).astype(int)

    tn,fp,fn,tp=confusion_matrix(y,pred,labels=[0,1]).ravel()
    specificity=tn/(tn+fp) if tn+fp else None
    sensitivity=tp/(tp+fn) if tp+fn else None

    metrics={
        "rows_used":int(len(df)),
        "carriers":int(y.sum()),
        "non_carriers":int((1-y).sum()),
        "folds":int(folds),
        "roc_auc":round(float(roc_auc_score(y,proba)),4),
        "accuracy":round(float(accuracy_score(y,pred)),4),
        "balanced_accuracy":round(float(balanced_accuracy_score(y,pred)),4),
        "sensitivity":round(float(sensitivity),4) if sensitivity is not None else None,
        "specificity":round(float(specificity),4) if specificity is not None else None,
        "precision":round(float(precision_score(y,pred,zero_division=0)),4),
        "recall":round(float(recall_score(y,pred,zero_division=0)),4),
    }

    pipe.fit(X,y)
    imp=pipe.named_steps["imputer"]
    scaler=pipe.named_steps["scaler"]
    model=pipe.named_steps["model"]

    metadata={
        "model_name":"DMD-AI Carrier Screening Research Model",
        "model_type":"Logistic Regression",
        "model_version":"carrier-logreg-v1",
        "trained_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "purpose":"Historical DMD carrier-screening research for female relatives using serum markers; not DMD diagnosis.",
        "source_url":source,
        "features":features,
        "imputer_medians":[float(x) for x in imp.statistics_],
        "scaler_mean":[float(x) for x in scaler.mean_],
        "scaler_scale":[float(x) for x in scaler.scale_],
        "coefficients":[float(x) for x in model.coef_[0]],
        "intercept":float(model.intercept_[0]),
        "validation":metrics,
        "threshold":0.5,
        "warning":"Research/education only. This score is not genetic confirmation, a diagnosis, or a validated clinical decision rule.",
        "dataset_note":"Historical dataset of female relatives with serum markers and known DMD carrier status. Repeated subjects with conflicting labels are excluded when identifiable.",
    }

    (MODEL_DIR/"carrier_model.json").write_text(json.dumps(metadata,indent=2),encoding="utf-8")
    (DATA_DIR/"carrier_training_summary.json").write_text(json.dumps(metadata,indent=2),encoding="utf-8")

    print("")
    print("TRAINING COMPLETE")
    print(json.dumps(metrics,indent=2))
    print("Model metadata:",MODEL_DIR/"carrier_model.json")

if __name__=="__main__":
    main()
