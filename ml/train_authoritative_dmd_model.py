from __future__ import annotations
from pathlib import Path
import csv, gzip, io, json, math, urllib.request, datetime, sys, subprocess, os

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data" / "authoritative_dmd"
MODEL_DIR = ROOT / "ml" / "models"
PUBLIC_DIR = ROOT / "public" / "ml"
for d in (DATA_DIR, MODEL_DIR, PUBLIC_DIR):
    d.mkdir(parents=True, exist_ok=True)

SOURCES = {
    "train": {
        "accession": "GSE6011",
        "title": "Expression data from quadriceps muscle of young DMD patients and age matched controls",
        "organization": "NIH / NCBI Gene Expression Omnibus (GEO)",
        "urls": [
            "https://ftp.ncbi.nlm.nih.gov/geo/series/GSE6nnn/GSE6011/matrix/GSE6011_series_matrix.txt.gz",
            "https://www.ncbi.nlm.nih.gov/geo/download/?acc=GSE6011&format=file&file=GSE6011_series_matrix.txt.gz",
        ],
    },
    "external": {
        "accession": "GSE38417",
        "title": "Gene expression data from Duchenne muscular dystrophy patients versus controls",
        "organization": "NIH / NCBI Gene Expression Omnibus (GEO)",
        "urls": [
            "https://ftp.ncbi.nlm.nih.gov/geo/series/GSE38nnn/GSE38417/matrix/GSE38417_series_matrix.txt.gz",
            "https://www.ncbi.nlm.nih.gov/geo/download/?acc=GSE38417&format=file&file=GSE38417_series_matrix.txt.gz",
        ],
    },
}

def download(name: str, source: dict) -> Path:
    out = DATA_DIR / f"{source['accession']}_series_matrix.txt.gz"
    if out.exists() and out.stat().st_size > 10000:
        print(f"Using cached {source['accession']}: {out}")
        return out

    # On Windows, prefer curl.exe (Schannel) because it uses the Windows
    # certificate store. This avoids Python/OpenSSL certificate-chain
    # problems caused by antivirus/proxy HTTPS inspection.
    if os.name == "nt":
        for url in source["urls"]:
            try:
                print("Downloading", source["accession"], "with Windows curl from", url)
                cmd = [
                    "curl.exe", "-L", "--fail", "--silent", "--show-error",
                    "--retry", "3", "--connect-timeout", "30",
                    "-A", "DMD-AI research model / educational project",
                    "-o", str(out), url
                ]
                r = subprocess.run(cmd, check=False)
                if r.returncode == 0 and out.exists() and out.stat().st_size > 10000:
                    return out
                if out.exists():
                    out.unlink(missing_ok=True)
            except Exception as e:
                print("  Windows curl source failed:", e)

    # Standard-library fallback for systems whose Python trust store works.
    headers = {"User-Agent": "DMD-AI research model / educational project"}
    last = None
    for url in source["urls"]:
        try:
            print("Downloading", source["accession"], "with Python from", url)
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read()
            if len(raw) < 10000:
                raise RuntimeError("downloaded file is unexpectedly small")
            out.write_bytes(raw)
            return out
        except Exception as e:
            last = e
            print("  Python source failed:", e)

    raise RuntimeError(
        f"Could not download {source['accession']} from NCBI GEO. "
        f"Windows curl and Python HTTPS both failed. Last error: {last}"
    )

def _parse_meta_line(line: str) -> list[str]:
    # GEO matrix metadata is tab-delimited and values are usually quoted.
    return next(csv.reader([line], delimiter="\t", quotechar='"'))

def parse_series_matrix(path: Path):
    opener = gzip.open if path.suffix == ".gz" else open
    sample_titles = []
    sample_ids = []
    table_lines = []
    in_table = False
    with opener(path, "rt", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.rstrip("\n\r")
            if line.startswith("!Sample_title"):
                row = _parse_meta_line(line)
                sample_titles = row[1:]
            elif line.startswith("!Sample_geo_accession"):
                row = _parse_meta_line(line)
                sample_ids = row[1:]
            elif line.startswith("!series_matrix_table_begin"):
                in_table = True
            elif line.startswith("!series_matrix_table_end"):
                in_table = False
                break
            elif in_table and line:
                table_lines.append(line)
    if not table_lines:
        raise RuntimeError(f"No expression matrix was found in {path}")
    reader = csv.reader(table_lines, delimiter="\t", quotechar='"')
    header = next(reader)
    matrix_sample_ids = header[1:]
    if not sample_ids:
        sample_ids = matrix_sample_ids
    if len(sample_titles) != len(matrix_sample_ids):
        sample_titles = matrix_sample_ids
    probe_ids = []
    columns = [[] for _ in matrix_sample_ids]
    for row in reader:
        if len(row) < len(matrix_sample_ids) + 1:
            continue
        probe_ids.append(row[0])
        for i, value in enumerate(row[1:1+len(matrix_sample_ids)]):
            try:
                columns[i].append(float(value))
            except Exception:
                columns[i].append(float("nan"))
    return probe_ids, matrix_sample_ids, sample_titles, columns

def label_titles(titles: list[str]):
    labels = []
    keep = []
    for i, title in enumerate(titles):
        t = str(title).lower()
        if "technical" in t:
            continue
        if "dmd" in t or "duchenne" in t:
            labels.append(1); keep.append(i)
        elif "control" in t or "normal" in t:
            labels.append(0); keep.append(i)
    return keep, labels

def safe_metrics(y, prob, threshold=0.5):
    import numpy as np
    from sklearn.metrics import roc_auc_score, average_precision_score, confusion_matrix, accuracy_score, balanced_accuracy_score, precision_score, recall_score, f1_score, brier_score_loss
    y = np.asarray(y, dtype=int); prob = np.asarray(prob, dtype=float)
    pred = (prob >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0,1]).ravel()
    specificity = tn/(tn+fp) if (tn+fp) else None
    sensitivity = tp/(tp+fn) if (tp+fn) else None
    return {
        "roc_auc": round(float(roc_auc_score(y, prob)), 4),
        "pr_auc": round(float(average_precision_score(y, prob)), 4),
        "accuracy": round(float(accuracy_score(y, pred)), 4),
        "balanced_accuracy": round(float(balanced_accuracy_score(y, pred)), 4),
        "sensitivity": round(float(sensitivity), 4) if sensitivity is not None else None,
        "specificity": round(float(specificity), 4) if specificity is not None else None,
        "precision": round(float(precision_score(y, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y, pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y, pred, zero_division=0)), 4),
        "brier": round(float(brier_score_loss(y, prob)), 4),
    }

def main():
    try:
        import numpy as np
        import joblib
        from sklearn.pipeline import Pipeline
        from sklearn.impute import SimpleImputer
        from sklearn.feature_selection import SelectKBest, f_classif
        from sklearn.preprocessing import StandardScaler
        from sklearn.linear_model import LogisticRegression
        from sklearn.svm import SVC
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import StratifiedKFold, cross_val_predict
    except Exception:
        print("Required packages are missing.")
        print("Run: python -m pip install numpy scikit-learn joblib")
        raise

    train_path = download("train", SOURCES["train"])
    ext_path = download("external", SOURCES["external"])

    tr_probes, tr_ids, tr_titles, tr_cols = parse_series_matrix(train_path)
    ex_probes, ex_ids, ex_titles, ex_cols = parse_series_matrix(ext_path)

    tr_keep, y_train = label_titles(tr_titles)
    ex_keep, y_ext = label_titles(ex_titles)
    if len(set(y_train)) != 2 or len(set(y_ext)) != 2:
        raise RuntimeError("Could not identify both DMD and control labels from GEO sample titles.")

    tr_map = {p:i for i,p in enumerate(tr_probes)}
    ex_map = {p:i for i,p in enumerate(ex_probes)}
    common = sorted(set(tr_map).intersection(ex_map))
    if len(common) < 500:
        raise RuntimeError(f"Only {len(common)} common probes were found; expected many more.")

    X_train = np.asarray([[tr_cols[s][tr_map[p]] for p in common] for s in tr_keep], dtype=float)
    X_ext = np.asarray([[ex_cols[s][ex_map[p]] for p in common] for s in ex_keep], dtype=float)
    y_train = np.asarray(y_train, dtype=int)
    y_ext = np.asarray(y_ext, dtype=int)

    # Small-n/high-dimensional transcriptomics: feature selection is INSIDE each CV fold.
    k = min(50, X_train.shape[1])
    candidates = {
        "Logistic Regression (L2)": LogisticRegression(
            C=1.0, max_iter=5000, class_weight="balanced", solver="liblinear", random_state=42
        ),
        "Linear SVM": SVC(
            kernel="linear", C=0.5, probability=True, class_weight="balanced", random_state=42
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=500, max_depth=4, min_samples_leaf=2,
            class_weight="balanced_subsample", random_state=42, n_jobs=-1
        ),
    }

    folds = min(5, int(np.bincount(y_train).min()))
    if folds < 3:
        raise RuntimeError("Not enough samples in one class for reliable cross-validation.")
    cv = StratifiedKFold(n_splits=folds, shuffle=True, random_state=42)

    comparison = {}
    best_name = None
    best_auc = -1.0
    best_pipe = None

    for name, model in candidates.items():
        pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("select", SelectKBest(score_func=f_classif, k=k)),
            ("scale", StandardScaler()),
            ("model", model),
        ])
        prob = cross_val_predict(pipe, X_train, y_train, cv=cv, method="predict_proba")[:,1]
        metrics = safe_metrics(y_train, prob)
        comparison[name] = metrics
        print("\n", name)
        print(json.dumps(metrics, indent=2))
        if metrics["roc_auc"] > best_auc:
            best_auc = metrics["roc_auc"]
            best_name = name
            best_pipe = pipe

    assert best_pipe is not None and best_name is not None
    best_pipe.fit(X_train, y_train)
    ext_prob = best_pipe.predict_proba(X_ext)[:,1]
    ext_metrics = safe_metrics(y_ext, ext_prob)

    selector = best_pipe.named_steps["select"]
    selected_idx = selector.get_support(indices=True)
    selected_probes = [common[int(i)] for i in selected_idx]

    model_path = MODEL_DIR / "dmd_molecular_model.joblib"
    joblib.dump({
        "pipeline": best_pipe,
        "common_probe_order": common,
        "selected_probes": selected_probes,
        "trained_accession": SOURCES["train"]["accession"],
    }, model_path)

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    metadata = {
        "model_name": "DMD-AI Molecular Research Classifier",
        "model_type": best_name,
        "model_version": "geo-molecular-v1",
        "trained_at": now,
        "purpose": "Research classification of DMD vs control skeletal-muscle gene-expression profiles.",
        "training": {
            "accession": SOURCES["train"]["accession"],
            "title": SOURCES["train"]["title"],
            "organization": SOURCES["train"]["organization"],
            "samples_used": int(len(y_train)),
            "dmd_samples": int(y_train.sum()),
            "control_samples": int((1-y_train).sum()),
        },
        "external_validation": {
            "accession": SOURCES["external"]["accession"],
            "title": SOURCES["external"]["title"],
            "organization": SOURCES["external"]["organization"],
            "samples_used": int(len(y_ext)),
            "dmd_samples": int(y_ext.sum()),
            "control_samples": int((1-y_ext).sum()),
            **ext_metrics,
        },
        "internal_validation": comparison[best_name],
        "model_comparison": comparison,
        "common_probe_count": int(len(common)),
        "selected_feature_count": int(len(selected_probes)),
        "selected_probes": selected_probes,
        "selection_rule": "Winner selected by stratified cross-validated ROC-AUC on GSE6011 only. GSE38417 is then used as external validation and is not used to select the winner.",
        "limitations": [
            "Small retrospective public datasets.",
            "Different Affymetrix platforms and preprocessing across studies may introduce batch effects.",
            "Muscle-biopsy transcriptomics are not a substitute for DMD molecular genetic confirmation.",
            "This research model is not clinically validated, calibrated for population disease risk, or approved for diagnosis.",
            "Do not apply this model to symptom-only inputs, CK-only inputs, or unrelated laboratory data."
        ],
        "warning": "Research/education only. Not for diagnosis or autonomous clinical decision-making."
    }

    (PUBLIC_DIR / "dmd_molecular_model.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (DATA_DIR / "training_report.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (DATA_DIR / "sources_manifest.json").write_text(json.dumps(SOURCES, indent=2), encoding="utf-8")

    print("\n============================================================")
    print("DMD-AI AUTHORITATIVE ML TRAINING COMPLETE")
    print("============================================================")
    print("Selected model:", best_name)
    print("Internal ROC-AUC:", metadata["internal_validation"]["roc_auc"])
    print("External ROC-AUC:", metadata["external_validation"]["roc_auc"])
    print("Model file:", model_path)
    print("UI metadata:", PUBLIC_DIR / "dmd_molecular_model.json")
    print("\nIMPORTANT: This is a research molecular classifier, not a diagnosis.")

if __name__ == "__main__":
    main()
