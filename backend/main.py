from __future__ import annotations
from pathlib import Path
import json, math
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT=Path(__file__).resolve().parents[1]
MODEL_PATH=ROOT/"public"/"ml"/"carrier_model.json"

app=FastAPI(
    title="DMD-AI ML API",
    version="1.0.0",
    description="Server-side research ML inference for DMD-AI. Not a diagnostic service.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET","POST"],
    allow_headers=["*"],
)

def load_model():
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model not found: {MODEL_PATH}")
    return json.loads(MODEL_PATH.read_text(encoding="utf-8"))

class CarrierInput(BaseModel):
    age: float = Field(ge=0, le=100)
    creatine_kinase: float = Field(gt=0)
    hemopexin: float = Field(gt=0)
    pyruvate_kinase: float = Field(gt=0)
    lactate_dehydrogenase: float = Field(gt=0)



DMD_AI_EVIDENCE_RECORDS = [
 {"id":"who-genomics","source":"WHO","title":"Genomics and global health","category":"Genomics","summary":"Official WHO genomics material for research and education.","official_url":"https://www.who.int/health-topics/genomics"},
 {"id":"who-precision","source":"WHO","title":"Human genomics and precision medicine","category":"Genomics","summary":"WHO context for responsible genomics and precision medicine.","official_url":"https://www.who.int/initiatives/genomics"},
 {"id":"nasa-muscle","source":"NASA","title":"Human muscle research in spaceflight","category":"Muscle research","summary":"NASA human-research context for muscle deconditioning and physiology; not DMD diagnostic data.","official_url":"https://www.nasa.gov/hrp/"},
 {"id":"nasa-space-biology","source":"NASA","title":"Space biology research","category":"Muscle research","summary":"NASA research context relevant to biological adaptation and experimental research.","official_url":"https://www.nasa.gov/humans-in-space/"}
]

@app.get("/api/health")
def health():
    try:
        m=load_model()
        return {"ok":True,"service":"dmd-ai-ml","model_version":m.get("model_version")}
    except Exception as e:
        raise HTTPException(status_code=503,detail=str(e))

@app.get("/api/ml/model-info")
def model_info():
    m=load_model()
    return {
        "model_name":m.get("model_name"),
        "model_type":m.get("model_type"),
        "model_version":m.get("model_version"),
        "purpose":m.get("purpose"),
        "validation":m.get("validation"),
        "dataset_note":m.get("dataset_note"),
        "warning":m.get("warning"),
        "trained_at":m.get("trained_at"),
    }

@app.post("/api/ml/carrier-screen")
def carrier_screen(payload:CarrierInput):
    m=load_model()
    names=m["features"]
    values={
        "age":payload.age,
        "creatine_kinase":payload.creatine_kinase,
        "hemopexin":payload.hemopexin,
        "pyruvate_kinase":payload.pyruvate_kinase,
        "lactate_dehydrogenase":payload.lactate_dehydrogenase,
    }
    try:
        z=[]
        for i,name in enumerate(names):
            x=float(values[name])
            mean=float(m["scaler_mean"][i])
            scale=float(m["scaler_scale"][i]) or 1.0
            z.append((x-mean)/scale)
        linear=float(m["intercept"])+sum(float(m["coefficients"][i])*z[i] for i in range(len(z)))
        score=1/(1+math.exp(-max(-40,min(40,linear))))
    except Exception as e:
        raise HTTPException(status_code=500,detail=f"Model inference failed: {e}")

    if score < .33: label="Lower research-model score"
    elif score < .67: label="Intermediate research-model score"
    else: label="Higher research-model score"

    return {
        "research_score":round(score,6),
        "research_score_percent":round(score*100,1),
        "label":label,
        "model_version":m.get("model_version"),
        "interpretation":"This score measures similarity to patterns in the historical carrier-screening training data. It is not a diagnosis, genetic confirmation, or a validated clinical probability.",
        "next_step":"If carrier status matters for reproductive or family decisions, discuss molecular DMD genetic testing and genetic counselling with a qualified genetics professional.",
    }

@app.get("/api/genetics/dmd-inheritance")
def dmd_inheritance():
    return {
        "inheritance":"X-linked",
        "known_carrier_mother":{
            "transmission_per_pregnancy":"50%",
            "son_if_variant_inherited":"Affected with a dystrophinopathy",
            "daughter_if_variant_inherited":"Heterozygous; clinical manifestations can vary",
        },
        "important":"Individual recurrence risk can be affected by de novo variants and germline mosaicism. Use the family-specific DMD variant and professional genetic counselling for reproductive decisions.",
        "confirmation":"Molecular genetic testing, not this ML model, is the appropriate method for carrier confirmation.",
    }



# ---------------------------------------------------------------------------
# DMD-AI Evidence & Research Engine (V11)
# Official-source records are intentionally separated from patient inference.
# ---------------------------------------------------------------------------
from datetime import datetime, timezone
import urllib.request
import urllib.error

EVIDENCE_SOURCES = [
    {
        "id":"who-genomics-landscape",
        "organization":"WHO",
        "title":"Human genomics technologies in clinical studies — research landscape",
        "category":"Human genomics",
        "evidence_type":"Global clinical-research landscape",
        "intended_use":"Research discovery, genomics strategy, equity awareness and study-landscape context",
        "population_or_model":"WHO ICTRP-registered clinical studies using human genomic technologies",
        "summary":"WHO analysis of registered clinical studies using human genomics, including disease focus, geography, participant age, phases and equity patterns.",
        "official_url":"https://www.who.int/observatories/global-observatory-on-health-research-and-development/monitoring/human-genomics-technologies-in-clinical-trials",
        "source_id":"WHO ICTRP / Global Observatory"
    },
    {
        "id":"who-precision-medicine",
        "organization":"WHO",
        "title":"Precision medicine: targeted, personalized and equitable care",
        "category":"Precision medicine",
        "evidence_type":"Global health policy / resolution",
        "intended_use":"Platform governance, ethical precision-medicine design and equitable-care principles",
        "population_or_model":"Global health systems",
        "summary":"WHO describes precision medicine as use of clinical, molecular, genomic and other health data while applying ethical and legal safeguards.",
        "official_url":"https://www.who.int/news/item/22-05-2026-world-health-assembly-endorses-resolution-on-precision-medicine",
        "source_id":"WHA79.8"
    },
    {
        "id":"who-genomic-data-governance",
        "organization":"WHO",
        "title":"WHO genomics and human genomic-data governance",
        "category":"Genomic data governance",
        "evidence_type":"WHO guidance / genomics resources",
        "intended_use":"Consent, privacy, genomic-data access/sharing and governance design",
        "population_or_model":"Human genomic data",
        "summary":"WHO genomics resources emphasize ethical, legal and equitable collection, access, use and sharing of human genomic data.",
        "official_url":"https://www.who.int/health-topics/genomics",
        "source_id":"WHO Genomics"
    },
    {
        "id":"who-rare-disease-trials",
        "organization":"WHO",
        "title":"WHO ICTRP and Orphanet rare-disease clinical-trial collaboration",
        "category":"Rare disease research",
        "evidence_type":"Clinical-trial discovery infrastructure",
        "intended_use":"Future DMD trial discovery and rare-disease research navigation",
        "population_or_model":"Registered rare-disease clinical trials",
        "summary":"WHO ICTRP and Orphanet collaborate to improve identification and discoverability of rare-disease clinical trials.",
        "official_url":"https://www.who.int/tools/clinical-trials-registry-platform/network/orphanet-collaboration",
        "source_id":"WHO ICTRP / Orphanet"
    },
    {
        "id":"nasa-os23",
        "organization":"NASA",
        "title":"OS-23: zero-gravity effects on skeletal-muscle function and metabolism",
        "category":"Muscle physiology",
        "evidence_type":"Spaceflight experimental dataset",
        "intended_use":"Mechanistic research context for muscle atrophy, contractile change and molecular adaptation",
        "population_or_model":"Experimental skeletal muscle / spaceflight",
        "summary":"NASA OSDR experiment studying muscle strength, power, endurance, contractile properties and molecular adaptation after microgravity exposure.",
        "official_url":"https://osdr.nasa.gov/bio/repo/data/experiments/OS-23",
        "source_id":"NASA OSDR OS-23"
    },
    {
        "id":"nasa-cardinal-muscle",
        "organization":"NASA",
        "title":"Cardinal Muscle: human skeletal muscle-on-a-chip in microgravity",
        "category":"Muscle regeneration",
        "evidence_type":"Human engineered-muscle experimental platform",
        "intended_use":"Research on impaired muscle regeneration, transcriptomics and drug-screening concepts",
        "population_or_model":"Engineered human skeletal muscle cells",
        "summary":"NASA Cardinal Muscle uses engineered human muscle in microgravity to model impaired regeneration and accelerate evaluation of muscle-loss therapeutics.",
        "official_url":"https://osdr.nasa.gov/bio/repo/data/payloads/CM",
        "source_id":"NASA OSDR Cardinal Muscle / OSD-781"
    },
    {
        "id":"nasa-os785",
        "organization":"NASA",
        "title":"OS-785: myostatin inhibition and microgravity-induced muscle loss",
        "category":"Therapeutic muscle research",
        "evidence_type":"Preclinical spaceflight experiment",
        "intended_use":"Research context for muscle-mass/strength pathways and therapeutic target discovery",
        "population_or_model":"Mouse spaceflight model",
        "summary":"NASA OSDR includes research reporting that inhibition of myostatin prevented microgravity-induced skeletal-muscle mass and strength loss in a mouse model.",
        "official_url":"https://osdr.nasa.gov/bio/repo/data/experiments/OS-785",
        "source_id":"NASA OSDR OS-785"
    },
    {
        "id":"nasa-dmd-protein-crystal",
        "organization":"NASA",
        "title":"Space-station protein crystal research associated with DMD therapeutic discovery",
        "category":"DMD therapeutic research",
        "evidence_type":"Experimental structural-biology research",
        "intended_use":"Historical research context for DMD drug discovery; not treatment guidance",
        "population_or_model":"Protein crystal growth / translational research",
        "summary":"NASA reports space-station protein-crystal studies of a protein associated with DMD that informed investigation of candidate compounds including TAS-205.",
        "official_url":"https://www.nasa.gov/missions/station/iss-research/creating-new-and-better-drugs-with-protein-crystal-growth-experiments/",
        "source_id":"NASA / JAXA PCG"
    }
]

def _verify_source(url: str):
    try:
        req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0 DMD-AI evidence verifier"})
        with urllib.request.urlopen(req, timeout=8) as response:
            return int(getattr(response, "status", 200)), "available"
    except urllib.error.HTTPError as e:
        return int(e.code), "unavailable"
    except Exception:
        return None, "unavailable"

@app.get("/api/evidence/sources")
def evidence_sources(verify: bool = False):
    now = datetime.now(timezone.utc).isoformat()
    records=[]
    for raw in EVIDENCE_SOURCES:
        item=dict(raw)
        if verify:
            status, availability=_verify_source(item["official_url"])
            item["live_status"]=status
            item["availability"]=availability
            item["last_verified_at"]=now
        else:
            item["live_status"]=None
            item["availability"]="unchecked"
            item["last_verified_at"]=None
        records.append(item)
    return {
        "sources":records,
        "count":len(records),
        "principle":"Official research/public-health evidence is kept separate from patient-specific inference and ML training labels.",
        "retrieved_at":now,
    }

@app.get("/api/evidence/who")
def evidence_who(verify: bool = False):
    result=evidence_sources(verify)
    result["sources"]=[x for x in result["sources"] if x["organization"]=="WHO"]
    result["count"]=len(result["sources"])
    return result

@app.get("/api/evidence/nasa")
def evidence_nasa(verify: bool = False):
    result=evidence_sources(verify)
    result["sources"]=[x for x in result["sources"] if x["organization"]=="NASA"]
    result["count"]=len(result["sources"])
    return result


@app.get("/api/evidence")
@app.get("/api/evidence/records")
@app.get("/api/research/evidence")
def dmd_ai_evidence_records(source: str = "", q: str = ""):
    rows = DMD_AI_EVIDENCE_RECORDS
    if source and source.lower() != "all":
        rows=[x for x in rows if x["source"].lower()==source.lower()]
    if q:
        n=q.lower().strip()
        rows=[x for x in rows if n in (x["title"]+" "+x["category"]+" "+x["summary"]+" "+x["source"]).lower()]
    return {"ok":True,"count":len(rows),"records":rows,"items":rows}

@app.get("/api/evidence/verify")
@app.get("/api/research/evidence/verify")
def dmd_ai_evidence_verify():
    return {"ok":True,"sources":[
      {"source":"WHO","official":True,"url":"https://www.who.int/"},
      {"source":"NASA","official":True,"url":"https://www.nasa.gov/"}
    ]}

