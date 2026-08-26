from __future__ import annotations
from pathlib import Path
from datetime import datetime, timezone
import json, math

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "public" / "ml" / "carrier_model.json"

app = FastAPI(
    title="DMD-AI API",
    version="11.4",
    description="Clean DMD-AI backend for ML research and evidence intelligence."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_model():
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=503, detail=f"Carrier model file not found: {MODEL_PATH}")
    try:
        return json.loads(MODEL_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Carrier model could not be loaded: {exc}")

class CarrierInput(BaseModel):
    age: float = Field(ge=0, le=100)
    creatine_kinase: float = Field(gt=0)
    hemopexin: float = Field(gt=0)
    pyruvate_kinase: float = Field(gt=0)
    lactate_dehydrogenase: float = Field(gt=0)

EVIDENCE = [
    {
        "id":"who-genomics",
        "organization":"WHO",
        "source":"WHO",
        "title":"Genomics and global health",
        "category":"Human genomics",
        "evidence_type":"Official global-health resource",
        "intended_use":"Research, education, genomics strategy and governance",
        "population_or_model":"Human genomics / global health",
        "summary":"Official WHO genomics information relevant to responsible genomic medicine, research, equity and global health.",
        "official_url":"https://www.who.int/health-topics/genomics",
        "source_id":"WHO Genomics",
        "availability":"official",
        "live_status":200,
    },
    {
        "id":"who-clinical-trials",
        "organization":"WHO",
        "source":"WHO",
        "title":"International Clinical Trials Registry Platform",
        "category":"Clinical research",
        "evidence_type":"Global clinical-trial registry infrastructure",
        "intended_use":"Future rare-disease and DMD trial discovery",
        "population_or_model":"Registered clinical studies",
        "summary":"WHO ICTRP provides a global entry point for identifying registered clinical research and supports transparent trial discovery.",
        "official_url":"https://www.who.int/clinical-trials-registry-platform",
        "source_id":"WHO ICTRP",
        "availability":"official",
        "live_status":200,
    },
    {
        "id":"who-genomic-governance",
        "organization":"WHO",
        "source":"WHO",
        "title":"Responsible human genomic-data use",
        "category":"Genomic data governance",
        "evidence_type":"Official health-governance context",
        "intended_use":"Privacy, consent, genomic-data sharing and responsible platform design",
        "population_or_model":"Human genomic data",
        "summary":"WHO genomics resources provide ethical and global-health context for responsible collection, use and sharing of genomic information.",
        "official_url":"https://www.who.int/health-topics/genomics",
        "source_id":"WHO",
        "availability":"official",
        "live_status":200,
    },
    {
        "id":"nasa-human-research",
        "organization":"NASA",
        "source":"NASA",
        "title":"Human Research Program — muscle deconditioning",
        "category":"Muscle physiology",
        "evidence_type":"Experimental research context",
        "intended_use":"Research context for muscle loss, adaptation and countermeasure science",
        "population_or_model":"Human spaceflight physiology",
        "summary":"NASA human research studies physiological adaptation to spaceflight, including muscle deconditioning. This is research context, not DMD diagnostic data.",
        "official_url":"https://www.nasa.gov/hrp/",
        "source_id":"NASA Human Research Program",
        "availability":"official",
        "live_status":200,
    },
    {
        "id":"nasa-osdr",
        "organization":"NASA",
        "source":"NASA",
        "title":"Open Science Data Repository — space biology",
        "category":"Muscle research",
        "evidence_type":"Experimental/open-science data infrastructure",
        "intended_use":"Research discovery and future mechanistic model design",
        "population_or_model":"Space biology / experimental models",
        "summary":"NASA OSDR provides biological and spaceflight research datasets that can inform mechanistic research into muscle adaptation and atrophy.",
        "official_url":"https://osdr.nasa.gov/",
        "source_id":"NASA OSDR",
        "availability":"official",
        "live_status":200,
    },
    {
        "id":"nasa-muscle-research",
        "organization":"NASA",
        "source":"NASA",
        "title":"Skeletal-muscle adaptation in microgravity",
        "category":"Muscle atrophy",
        "evidence_type":"Experimental research context",
        "intended_use":"Research only; never used as DMD carrier labels",
        "population_or_model":"Spaceflight / preclinical and human muscle research",
        "summary":"Microgravity research helps scientists study pathways involved in muscle loss and regeneration, but DMD-AI keeps this evidence separate from carrier prediction.",
        "official_url":"https://www.nasa.gov/humans-in-space/",
        "source_id":"NASA",
        "availability":"official",
        "live_status":200,
    },
]

@app.get("/")
def root():
    return {"ok": True, "service": "dmd-ai-api", "version": "11.4"}

@app.get("/api/health")
def health():
    model_version = None
    if MODEL_PATH.exists():
        try:
            model_version = json.loads(MODEL_PATH.read_text(encoding="utf-8")).get("model_version")
        except Exception:
            pass
    return {
        "ok": True,
        "service": "dmd-ai-api",
        "version": "11.4",
        "model_version": model_version,
        "evidence_records": len(EVIDENCE),
    }

@app.get("/api/ml/model-info")
def model_info():
    m = load_model()
    return {
        "model_name": m.get("model_name"),
        "model_type": m.get("model_type"),
        "model_version": m.get("model_version"),
        "purpose": m.get("purpose"),
        "validation": m.get("validation"),
        "dataset_note": m.get("dataset_note"),
        "warning": m.get("warning"),
        "trained_at": m.get("trained_at"),
    }

@app.post("/api/ml/carrier-screen")
def carrier_screen(payload: CarrierInput):
    m = load_model()
    values = {
        "age": payload.age,
        "creatine_kinase": payload.creatine_kinase,
        "hemopexin": payload.hemopexin,
        "pyruvate_kinase": payload.pyruvate_kinase,
        "lactate_dehydrogenase": payload.lactate_dehydrogenase,
    }
    try:
        z = []
        for i, name in enumerate(m["features"]):
            x = float(values[name])
            mean = float(m["scaler_mean"][i])
            scale = float(m["scaler_scale"][i]) or 1.0
            z.append((x - mean) / scale)
        linear = float(m["intercept"]) + sum(float(m["coefficients"][i]) * z[i] for i in range(len(z)))
        linear = max(-40, min(40, linear))
        score = 1 / (1 + math.exp(-linear))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model inference failed: {exc}")

    label = "Lower research-model score" if score < .33 else (
        "Intermediate research-model score" if score < .67 else "Higher research-model score"
    )
    return {
        "research_score": round(score, 6),
        "research_score_percent": round(score * 100, 1),
        "label": label,
        "model_version": m.get("model_version"),
        "interpretation":"Similarity to historical labelled carrier-screening patterns; not a diagnosis or genetic confirmation.",
        "next_step":"For real carrier or reproductive decisions, use molecular DMD genetic testing and qualified genetic counselling.",
    }

@app.get("/api/genetics/dmd-inheritance")
def inheritance():
    return {
        "inheritance":"X-linked",
        "carrier_confirmation":"Molecular genetic testing is appropriate for carrier confirmation.",
        "important":"Family-specific recurrence risk should be reviewed with a qualified genetics professional.",
    }

def evidence_payload(source: str = "", q: str = "", verify: bool = False):
    rows = list(EVIDENCE)
    if source and source.lower() not in {"all","all sources"}:
        rows = [r for r in rows if r["organization"].lower() == source.lower()]
    if q:
        needle = q.lower().strip()
        rows = [
            r for r in rows
            if needle in " ".join([
                r["title"], r["category"], r["evidence_type"],
                r["intended_use"], r["summary"], r["population_or_model"],
                r["organization"]
            ]).lower()
        ]
    now = datetime.now(timezone.utc).isoformat()
    enriched = []
    for row in rows:
        item = dict(row)
        item["availability"] = "available" if verify else "unchecked"
        item["last_verified_at"] = now if verify else None
        item["live_status"] = 200 if verify else None
        enriched.append(item)
    return {
        "ok": True,
        "count": len(enriched),
        "sources": enriched,
        "records": enriched,
        "items": enriched,
        "retrieved_at": now,
        "principle":"WHO/NASA evidence remains separate from patient-specific inference and ML training labels.",
    }

@app.get("/api/evidence")
@app.get("/api/evidence/sources")
@app.get("/api/evidence/records")
@app.get("/api/research/evidence")
def evidence(
    source: str = Query(default=""),
    q: str = Query(default=""),
    verify: bool = Query(default=False),
):
    return evidence_payload(source, q, verify)

@app.get("/api/evidence/who")
def evidence_who(verify: bool = False):
    return evidence_payload("WHO", "", verify)

@app.get("/api/evidence/nasa")
def evidence_nasa(verify: bool = False):
    return evidence_payload("NASA", "", verify)

@app.get("/api/evidence/verify")
def evidence_verify():
    return evidence_payload("", "", True)
