from __future__ import annotations
from pathlib import Path
import os, gzip
import json, math, re, urllib.parse, urllib.request, xml.etree.ElementTree as ET
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

_origins=[x.strip() for x in os.getenv("DMD_AI_ALLOWED_ORIGINS","").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
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



# ---------------------------------------------------------------------------
# DMD-AI V20.2 — molecular expression inference
# Uses the joblib model produced by ml/train_authoritative_dmd_model.py.
# This endpoint intentionally accepts molecular expression data only.
# ---------------------------------------------------------------------------
import csv
import io
from fastapi import UploadFile, File

MOLECULAR_MODEL_PATH = ROOT / "ml" / "models" / "dmd_molecular_model.joblib"
MOLECULAR_META_PATH = ROOT / "public" / "ml" / "dmd_molecular_model.json"

def load_molecular_bundle():
    if not MOLECULAR_MODEL_PATH.exists():
        raise HTTPException(status_code=503, detail="The trained DMD molecular model is not installed.")
    try:
        import joblib
        return joblib.load(MOLECULAR_MODEL_PATH)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"The molecular model could not be loaded: {exc}")

def load_molecular_meta():
    if not MOLECULAR_META_PATH.exists():
        return {}
    try:
        return json.loads(MOLECULAR_META_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}

def parse_expression_csv(raw: bytes):
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Upload a UTF-8 CSV file.")
    try:
        rows = list(csv.reader(io.StringIO(text)))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"The CSV could not be read: {exc}")
    rows = [r for r in rows if r and any(str(x).strip() for x in r)]
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail="The CSV does not contain expression rows.")
    header = [str(x).strip().lower() for x in rows[0]]
    probe_aliases = {"probe","probe_id","id_ref","id","feature","feature_id"}
    value_aliases = {"value","expression","expression_value","signal","intensity"}
    probe_i = next((i for i,h in enumerate(header) if h in probe_aliases), None)
    value_i = next((i for i,h in enumerate(header) if h in value_aliases), None)
    start = 1
    if probe_i is None or value_i is None:
        # Also support simple two-column files without a header.
        probe_i, value_i, start = 0, 1, 0
    values = {}
    bad = 0
    for row in rows[start:]:
        if len(row) <= max(probe_i, value_i):
            continue
        probe = str(row[probe_i]).strip().strip('"')
        if not probe:
            continue
        try:
            value = float(str(row[value_i]).strip())
        except Exception:
            bad += 1
            continue
        if math.isfinite(value):
            values[probe] = value
    if not values:
        raise HTTPException(status_code=400, detail="No numeric probe-expression values were found.")
    return values, bad

@app.get("/api/ml/dmd-molecular/info")
def dmd_molecular_info():
    meta = load_molecular_meta()
    return {
        "installed": MOLECULAR_MODEL_PATH.exists(),
        "model_name": meta.get("model_name"),
        "model_type": meta.get("model_type"),
        "model_version": meta.get("model_version"),
        "selected_feature_count": meta.get("selected_feature_count"),
        "training": meta.get("training"),
        "internal_validation": meta.get("internal_validation"),
        "external_validation": meta.get("external_validation"),
        "warning": meta.get("warning"),
    }

@app.post("/api/ml/dmd-molecular/predict")
async def dmd_molecular_predict(file: UploadFile = File(...)):
    filename = file.filename or "expression.csv"
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Upload a CSV expression profile.")
    raw = await file.read()
    if len(raw) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="The expression file is larger than 25 MB.")
    values, ignored_rows = parse_expression_csv(raw)
    bundle = load_molecular_bundle()
    meta = load_molecular_meta()
    pipeline = bundle.get("pipeline")
    common = bundle.get("common_probe_order") or []
    selected = bundle.get("selected_probes") or []
    if pipeline is None or not common or not selected:
        raise HTTPException(status_code=503, detail="The installed molecular model bundle is incomplete.")

    matched_selected = [p for p in selected if p in values]
    # A SelectKBest pipeline was trained with all common probes in a fixed order.
    # Therefore every common probe is required for technically faithful inference.
    missing_common = [p for p in common if p not in values]
    if missing_common:
        preview = missing_common[:8]
        raise HTTPException(
            status_code=422,
            detail={
                "message":"This expression profile is not compatible with the trained model.",
                "reason":"The model requires the same aligned GEO probe space used during training.",
                "input_probe_count":len(values),
                "required_probe_count":len(common),
                "missing_probe_count":len(missing_common),
                "matched_selected_probe_count":len(matched_selected),
                "required_selected_probe_count":len(selected),
                "missing_probe_examples":preview,
            },
        )

    try:
        import numpy as np
        X = np.asarray([[values[p] for p in common]], dtype=float)
        prob = float(pipeline.predict_proba(X)[0,1])
        pred = int(prob >= 0.5)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Molecular inference failed: {exc}")

    if prob >= 0.80:
        label = "High molecular DMD pattern"
    elif prob >= 0.50:
        label = "Molecular DMD pattern detected"
    elif prob >= 0.20:
        label = "Low molecular DMD pattern"
    else:
        label = "Control-like molecular pattern"

    return {
        "predicted_class":pred,
        "model_probability":round(prob,6),
        "model_probability_percent":round(prob*100,1),
        "result_label":label,
        "model_name":meta.get("model_name") or "DMD-AI Molecular Research Classifier",
        "model_type":meta.get("model_type") or "Logistic Regression (L2)",
        "model_version":meta.get("model_version") or "geo-molecular-v1",
        "input_filename":filename,
        "input_probe_count":len(values),
        "matched_selected_probe_count":len(matched_selected),
        "required_selected_probe_count":len(selected),
        "ignored_rows":ignored_rows,
        "validation_status":"compatible",
        "interpretation":"This result measures similarity to the DMD molecular pattern learned from the public research cohorts used to train this model.",
        "warning":"Research decision support only. This result does not confirm or exclude DMD and does not replace molecular genetic testing or clinical evaluation.",
    }

def _get_json(url:str):
    req=urllib.request.Request(url,headers={"User-Agent":"DMD-AI-Research/1.0"})
    with urllib.request.urlopen(req,timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def _text_get(url:str):
    req=urllib.request.Request(url,headers={"User-Agent":"DMD-AI-Research/1.0"})
    with urllib.request.urlopen(req,timeout=30) as response:
        return response.read().decode("utf-8")

@app.get("/api/research/publications")
def research_publications(q:str="Duchenne muscular dystrophy", source:str="pubmed", page:int=1, page_size:int=20):
    q=(q or "Duchenne muscular dystrophy").strip()
    page=max(1,page); page_size=max(5,min(50,page_size))
    try:
        if source.lower()=="europepmc":
            params=urllib.parse.urlencode({"query":q,"format":"json","pageSize":page_size,"page":page})
            data=_get_json("https://www.ebi.ac.uk/europepmc/webservices/rest/search?"+params)
            rows=[]
            for x in data.get("resultList",{}).get("result",[]):
                rows.append({
                    "source":"Europe PMC","source_id":x.get("pmid") or x.get("pmcid") or x.get("id"),
                    "title":x.get("title") or "Untitled","authors":x.get("authorString") or "",
                    "journal":x.get("journalTitle") or x.get("journalInfo",{}).get("journal",{}).get("title",""),
                    "year":int(x["pubYear"]) if str(x.get("pubYear","")).isdigit() else None,
                    "doi":x.get("doi"),"cited_by":x.get("citedByCount"),
                    "open_access":str(x.get("isOpenAccess","")).upper()=="Y",
                    "url":("https://europepmc.org/article/MED/"+str(x.get("pmid"))) if x.get("pmid") else ("https://europepmc.org/article/"+str(x.get("source","MED"))+"/"+str(x.get("id",""))),
                    "abstract":x.get("abstractText") or ""
                })
            return {"query":q,"source":"Europe PMC","total":int(data.get("hitCount",0)),"page":page,"items":rows}
        term=q
        es_params=urllib.parse.urlencode({"db":"pubmed","term":term,"retmode":"json","retmax":page_size,"retstart":(page-1)*page_size,"sort":"relevance"})
        es=_get_json("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?"+es_params)
        ids=es.get("esearchresult",{}).get("idlist",[])
        total=int(es.get("esearchresult",{}).get("count",0))
        if not ids:return {"query":q,"source":"PubMed","total":total,"page":page,"items":[]}
        sm_params=urllib.parse.urlencode({"db":"pubmed","id":",".join(ids),"retmode":"json"})
        sm=_get_json("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?"+sm_params)
        result=sm.get("result",{}); rows=[]
        for pmid in ids:
            x=result.get(pmid,{})
            authors=", ".join(a.get("name","") for a in x.get("authors",[]) if a.get("name"))
            year=None
            m=re.search(r"\b(19|20)\d{2}\b",str(x.get("pubdate","")))
            if m: year=int(m.group(0))
            doi=None
            for aid in x.get("articleids",[]):
                if aid.get("idtype")=="doi":doi=aid.get("value")
            rows.append({"source":"PubMed","source_id":pmid,"title":x.get("title") or "Untitled","authors":authors,
                         "journal":x.get("fulljournalname") or x.get("source") or "","year":year,"doi":doi,
                         "cited_by":None,"open_access":None,"url":"https://pubmed.ncbi.nlm.nih.gov/"+pmid+"/","abstract":""})
        return {"query":q,"source":"PubMed","total":total,"page":page,"items":rows}
    except Exception as e:
        raise HTTPException(status_code=502,detail="Publication service could not be reached: "+str(e))

@app.get("/api/research/publication/{pmid}")
def research_publication_detail(pmid:str):
    if not re.fullmatch(r"\d+",pmid): raise HTTPException(status_code=400,detail="A PubMed ID is required.")
    try:
        params=urllib.parse.urlencode({"db":"pubmed","id":pmid,"retmode":"xml"})
        req=urllib.request.Request("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?"+params,headers={"User-Agent":"DMD-AI-Research/1.0"})
        with urllib.request.urlopen(req,timeout=20) as response: root=ET.fromstring(response.read())
        article=root.find(".//PubmedArticle")
        if article is None: raise HTTPException(status_code=404,detail="Publication not found.")
        abstract=" ".join("".join(x.itertext()).strip() for x in article.findall(".//Abstract/AbstractText"))
        keywords=["".join(x.itertext()).strip() for x in article.findall(".//Keyword") if "".join(x.itertext()).strip()]
        return {"pmid":pmid,"abstract":abstract,"keywords":keywords}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=502,detail="Publication detail could not be reached: "+str(e))

DMD_RESEARCH_SOURCE_CATALOG = [
 {"id":"pubmed","name":"PubMed","scope":"Biomedical publications","url":"https://pubmed.ncbi.nlm.nih.gov/","direct_dmd":True},
 {"id":"geo","name":"NCBI GEO","scope":"Functional genomics datasets and expression profiles","url":"https://www.ncbi.nlm.nih.gov/geo/","direct_dmd":True},
 {"id":"clinicaltrials","name":"ClinicalTrials.gov","scope":"Registered DMD clinical studies","url":"https://clinicaltrials.gov/","direct_dmd":True},
 {"id":"who","name":"WHO Genomics","scope":"Genomics policy, ethics and global-health context","url":"https://www.who.int/health-topics/genomics","direct_dmd":False},
 {"id":"nasa","name":"NASA Human Research Program","scope":"Muscle physiology, deconditioning and life-science research context","url":"https://www.nasa.gov/hrp/","direct_dmd":False},
 {"id":"fda","name":"FDA","scope":"Regulatory and therapy safety information","url":"https://www.fda.gov/","direct_dmd":True},
 {"id":"orphanet","name":"Orphanet","scope":"Rare-disease knowledge","url":"https://www.orpha.net/","direct_dmd":True},
 {"id":"treatnmd","name":"TREAT-NMD","scope":"Neuromuscular datasets, registries and standards","url":"https://www.treat-nmd.org/","direct_dmd":True}
]

@app.get("/api/research/sources")
def research_sources():
    return {"items":DMD_RESEARCH_SOURCE_CATALOG}

@app.get("/api/research/geo")
def research_geo(q:str="Duchenne muscular dystrophy", page_size:int=20):
    page_size=max(5,min(50,page_size))
    try:
        params=urllib.parse.urlencode({"db":"gds","term":q,"retmode":"json","retmax":page_size,"sort":"relevance"})
        es=_get_json("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?"+params)
        ids=es.get("esearchresult",{}).get("idlist",[])
        total=int(es.get("esearchresult",{}).get("count",0))
        if not ids:return {"total":total,"items":[]}
        sm=_get_json("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?"+urllib.parse.urlencode({"db":"gds","id":",".join(ids),"retmode":"json"}))
        result=sm.get("result",{}); items=[]
        for uid in ids:
            x=result.get(uid,{})
            acc=x.get("accession") or x.get("gse") or uid
            items.append({"uid":uid,"accession":acc,"title":x.get("title","Untitled GEO record"),
              "summary":x.get("summary",""),"organism":x.get("taxon",""),"platform":x.get("gpl",""),
              "samples":x.get("n_samples"),"pubmed_ids":x.get("pubmedids",[]),
              "url":"https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc="+str(acc)})
        return {"query":q,"total":total,"items":items}
    except Exception as e: raise HTTPException(status_code=502,detail="GEO could not be reached: "+str(e))

def _geo_family_path(accession:str)->str:
    acc=re.sub(r"[^A-Za-z0-9_-]","",accession or "").upper()
    m=re.fullmatch(r"GSE(\d+)",acc)
    if not m: raise HTTPException(status_code=400,detail="A GSE accession is required.")
    n=m.group(1)
    family=("GSE"+n[:-3]+"nnn") if len(n)>3 else "GSEnnn"
    return f"https://ftp.ncbi.nlm.nih.gov/geo/series/{family}/{acc}/soft/{acc}_family.soft.gz"

def _geo_soft(accession:str)->str:
    acc=re.sub(r"[^A-Za-z0-9_-]","",accession or "").upper()
    if not acc.startswith("GSE"):
        raise HTTPException(status_code=400,detail="A GSE accession is required.")
    try:
        req=urllib.request.Request(_geo_family_path(acc),headers={"User-Agent":"DMD-AI research workspace/1.0"})
        with urllib.request.urlopen(req,timeout=35) as r:
            return gzip.decompress(r.read()).decode("utf-8","replace")
    except Exception:
        url="https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?"+urllib.parse.urlencode({"acc":acc,"targ":"self","form":"text","view":"full"})
        return _text_get(url)

def _geo_field(text:str,key:str)->list[str]:
    prefix="!"+key.lower()+" ="
    out=[]
    for line in text.splitlines():
        if line.lower().startswith(prefix): out.append(line.split("=",1)[1].strip())
    return out

def _geo_sections(text:str)->list[dict]:
    rows=[]; cur=None
    for raw in text.splitlines():
        line=raw.strip()
        if line.startswith("^SAMPLE ="):
            if cur: rows.append(cur)
            cur={"id":line.split("=",1)[1].strip(),"fields":{}}
            continue
        if cur and line.startswith("!") and "=" in line:
            k,v=line[1:].split("=",1);k=k.strip().lower();v=v.strip()
            cur["fields"].setdefault(k,[]).append(v)
    if cur: rows.append(cur)
    return rows

def _geo_summary(accession:str)->dict:
    try:
        q=f'{accession.upper()}[ACCN]'
        es=_get_json("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?"+urllib.parse.urlencode({"db":"gds","term":q,"retmode":"json","retmax":5}))
        ids=es.get("esearchresult",{}).get("idlist",[])
        if not ids:return {}
        sm=_get_json("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?"+urllib.parse.urlencode({"db":"gds","id":ids[0],"retmode":"json"}))
        return sm.get("result",{}).get(ids[0],{}) or {}
    except Exception:
        return {}

def _sample_blob(sample:dict)->str:
    f=sample.get("fields",{})
    keys=["sample_title","sample_source_name_ch1","sample_characteristics_ch1","sample_description","sample_treatment_protocol_ch1"]
    return " ".join(v for k in keys for v in f.get(k,[])).lower()

def _geo_compatibility(accession:str,hypothesis:str="independent external validation"):
    text=_geo_soft(accession)
    summary_row=_geo_summary(accession)
    title=(_geo_field(text,"Series_title") or [summary_row.get("title") or accession])[0]
    summary=" ".join(_geo_field(text,"Series_summary")) or str(summary_row.get("summary") or "")
    design=" ".join(_geo_field(text,"Series_overall_design"))
    samples=_geo_sections(text)
    sample_ids=[x.get("id") for x in samples if x.get("id")]

    organisms=[]; sources=[]; chars=[]; molecules=[]; sample_types=[]; platforms=[]; library_strategies=[]
    for x in samples:
        f=x.get("fields",{})
        organisms += f.get("sample_organism_ch1",[])
        sources += f.get("sample_source_name_ch1",[])
        chars += f.get("sample_characteristics_ch1",[])
        molecules += f.get("sample_molecule_ch1",[])
        sample_types += f.get("sample_type",[])
        platforms += f.get("sample_platform_id",[])
        library_strategies += f.get("sample_library_strategy",[])
    platforms += _geo_field(text,"Series_platform_id")

    taxon=str(summary_row.get("taxon") or "").strip()
    if taxon and not organisms: organisms=[taxon]
    n_summary=summary_row.get("n_samples")
    try:n_summary=int(n_summary) if n_summary is not None else None
    except Exception:n_summary=None
    if not platforms:
        gpl=summary_row.get("gpl")
        if gpl: platforms=[str(gpl)]

    org_blob=" ".join(organisms).lower()
    human=any(x in org_blob for x in ["homo sapiens","human"])
    animal=any(x in org_blob for x in ["mus musculus","canis lupus","rattus norvegicus","mouse","canine","rat"])
    species_resolved=bool(organisms)

    dmd_markers=["duchenne","dmd","dystrophin deficient","dystrophin-deficient","mdx"]
    control_markers=["healthy control","normal control","unaffected","wild type","wild-type","wt control","control","normal muscle"]
    dmd_samples=[]; control_samples=[]; ambiguous=[]
    for x in samples:
        b=_sample_blob(x)
        is_dmd=any(re.search(r"(?<![a-z])"+re.escape(t)+r"(?![a-z])",b) for t in dmd_markers)
        is_ctl=any(t in b for t in control_markers)
        if is_dmd and not is_ctl:dmd_samples.append(x.get("id"))
        elif is_ctl and not is_dmd:control_samples.append(x.get("id"))
        else: ambiguous.append(x.get("id"))

    series_blob=" ".join([title,summary,design,*sources,*chars]).lower()
    dmd_signal=bool(dmd_samples) or any(t in series_blob for t in ["duchenne muscular dystrophy","dmd patient","dmd muscle","dystrophin deficient","dystrophin-deficient"])
    control_signal=bool(control_samples) or any(t in series_blob for t in ["healthy control","normal control","unaffected control","wild type control","wild-type control"])
    intervention=any(x in series_blob for x in ["treated","treatment","therapy","crispr","exon skipping","drug","transduced","injection","oligonucleotide"])

    tissue="Unknown"
    for label,terms in [("Skeletal muscle",["skeletal muscle","quadriceps","muscle biopsy","gastrocnemius","tibialis anterior"]),("Cardiac / cardiomyocyte",["cardiac","cardiomyocyte","heart"]),("iPSC / cell model",["ipsc","induced pluripotent","cell line","myoblast","myotube"]),("Blood",["blood","serum","plasma","pbmc"]),("Brain / CNS",["brain","central nervous system","cortex","cerebellum"])]:
        if any(t in series_blob for t in terms): tissue=label; break

    assay_parts=library_strategies+sample_types
    if not assay_parts and platforms: assay_parts=["Expression profiling / GEO platform"]
    assay=" / ".join(dict.fromkeys([x for x in assay_parts if x])) or "Not resolved"
    sample_count=len(sample_ids) or n_summary
    resolved={"species":species_resolved,"samples":bool(sample_count),"material":tissue!="Unknown","assay":assay!="Not resolved","dmd_group":bool(dmd_samples),"control_group":bool(control_samples)}
    completeness=round(sum(resolved.values())/len(resolved)*100)

    reasons=[]; cautions=[]; score=0
    if human: score+=25; reasons.append("Human samples are identified.")
    elif animal: cautions.append("The available metadata identifies an animal/model-system study.")
    else: cautions.append("Species could not be resolved reliably from the available metadata.")
    if dmd_samples:
        score+=20; reasons.append(f"{len(dmd_samples)} sample(s) are annotated with a DMD/dystrophin-disease signal.")
    elif dmd_signal:
        score+=8; cautions.append("DMD is described at series level, but a DMD sample group could not be resolved from individual sample annotations.")
    else:cautions.append("A DMD case group could not be confirmed.")
    if control_samples:
        score+=20; reasons.append(f"{len(control_samples)} sample(s) are annotated as control/normal/unaffected.")
    elif control_signal:
        score+=8; cautions.append("A control comparison is described at series level, but control samples could not be resolved individually.")
    else:cautions.append("A control comparison could not be confirmed.")
    if sample_count:
        if sample_count>=20: score+=12; reasons.append(f"The series contains {sample_count} samples.")
        elif sample_count>=10: score+=8; reasons.append(f"The series contains {sample_count} samples; group balance still needs review.")
        else: score+=3; cautions.append(f"The series contains {sample_count} samples; statistical power and group balance need careful review.")
    else:cautions.append("Sample count could not be resolved.")
    if assay!="Not resolved": score+=8; reasons.append("The assay/platform can be identified from GEO metadata.")
    else:cautions.append("Assay/platform could not be resolved.")
    if tissue!="Unknown":score+=5; reasons.append(f"Biological material is consistent with {tissue.lower()}.")
    else:cautions.append("Biological material could not be resolved.")
    if intervention:cautions.append("The study includes an intervention or therapeutic manipulation; confirm that its comparison answers the selected validation question.")

    used={"GSE6011":"used to train the current molecular model","GSE38417":"already used as the current model's external-validation cohort"}
    prior=used.get(accession.upper())
    if prior:
        score-=50; cautions.insert(0,f"This dataset was {prior}, so it cannot serve as untouched independent evidence for that model.")
    else:
        score+=10; reasons.append("It is not one of the cohorts already recorded for the current molecular model.")

    score=max(0,min(100,score))
    positive_incompatibility=bool(prior) or (species_resolved and animal and not human)
    insufficient=(completeness<67) or not species_resolved or not sample_count or assay=="Not resolved"
    if positive_incompatibility:status="Not suitable"
    elif insufficient:status="Insufficient information — review required"
    elif human and dmd_samples and control_samples and score>=78 and not intervention:status="Strong candidate"
    else:status="Potential candidate — review required"

    return {"accession":accession.upper(),"title":title,"status":status,"score":score,"metadata_completeness":completeness,"species":sorted(set(organisms)) or ["Not resolved"],"sample_count":sample_count,"dmd_sample_count":len(dmd_samples),"control_sample_count":len(control_samples),"unresolved_sample_count":len([x for x in ambiguous if x]),"tissue":tissue,"molecule":" / ".join(dict.fromkeys(molecules)) or "Not resolved","assay":assay,"platforms":list(dict.fromkeys(platforms)),"intervention_likely":intervention,"dmd_group_identified":bool(dmd_samples),"control_group_identified":bool(control_samples),"previous_workspace_use":prior,"reasons":reasons,"cautions":cautions,"hypothesis":hypothesis,"official_url":"https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc="+accession.upper(),"note":"Review the study design, group annotations and original GEO record before using this dataset in an analysis."}

@app.get("/api/research/geo/{accession}/compatibility")
def research_geo_compatibility(accession:str,hypothesis:str="independent external validation"):
    try:return _geo_compatibility(accession,hypothesis)
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=502,detail="GEO metadata could not be evaluated: "+str(e))


def _first_field(sample:dict,key:str)->str:
    vals=(sample.get("fields",{}) or {}).get(key,[]) or []
    return " | ".join(str(x) for x in vals if x)

def _classify_geo_sample(sample:dict)->dict:
    f=sample.get("fields",{}) or {}
    title=_first_field(sample,"sample_title") or sample.get("id","")
    source=_first_field(sample,"sample_source_name_ch1")
    chars=_first_field(sample,"sample_characteristics_ch1")
    treatment=_first_field(sample,"sample_treatment_protocol_ch1")
    organism=_first_field(sample,"sample_organism_ch1")
    platform=_first_field(sample,"sample_platform_id")
    blob=" ".join([title,source,chars,treatment]).lower()
    dmd_terms=["duchenne","dmd","dystrophin deficient","dystrophin-deficient","mdx"]
    ctl_terms=["healthy control","normal control","unaffected","wild type","wild-type","control","normal donor","healthy donor"]
    dmd=any(re.search(r"(?<![a-z])"+re.escape(t)+r"(?![a-z])",blob) for t in dmd_terms)
    control=any(t in blob for t in ctl_terms)
    treated=any(t in blob for t in ["treated","treatment","therapy","crispr","exon skipping","oligonucleotide","drug","transduced","edited","aon","aso"])
    untreated=any(t in blob for t in ["untreated","vehicle","baseline","mock","untransduced","no treatment"])
    disease_group="DMD" if dmd and not control else "Control" if control and not dmd else "Unresolved"
    exposure="Treated/intervention" if treated and not untreated else "Untreated/baseline" if untreated and not treated else "Not resolved"
    return {"id":sample.get("id"),"title":title,"source":source,"characteristics":chars,"treatment":treatment,"organism":organism,"platform":platform,"disease_group":disease_group,"exposure":exposure}

def _geo_study_design(accession:str,hypothesis:str="independent external validation"):
    comp=_geo_compatibility(accession,hypothesis)
    text=_geo_soft(accession)
    raw=_geo_sections(text)
    rows=[_classify_geo_sample(x) for x in raw]
    dmd=[x for x in rows if x["disease_group"]=="DMD"]
    ctl=[x for x in rows if x["disease_group"]=="Control"]
    unresolved=[x for x in rows if x["disease_group"]=="Unresolved"]
    treated=[x for x in rows if x["disease_group"]=="DMD" and x["exposure"]=="Treated/intervention"]
    untreated=[x for x in rows if x["disease_group"]=="DMD" and x["exposure"]=="Untreated/baseline"]

    groups=[]
    for name,arr in [("DMD",dmd),("Control",ctl),("Unresolved",unresolved)]:
        if arr:groups.append({"name":name,"count":len(arr),"sample_ids":[x["id"] for x in arr]})
    comparisons=[]
    if dmd and ctl:
        comparisons.append({"id":"dmd_vs_control","label":"DMD vs control","left":"DMD","right":"Control","priority":"Primary","reason":"Direct disease-versus-comparison contrast is available."})
    if treated and untreated:
        comparisons.append({"id":"treated_vs_untreated_dmd","label":"Treated DMD vs untreated DMD","left":"Treated DMD","right":"Untreated DMD","priority":"Secondary","reason":"Useful for treatment-response questions, but not a substitute for an independent disease-versus-control validation."})

    if comp.get("previous_workspace_use"):
        suitability="Not suitable for untouched validation"
        decision="This cohort has already been used in the current molecular-model workflow."
    elif not rows or comp.get("metadata_completeness",0)<50:
        suitability="Needs clarification"
        decision="The available sample annotations are not sufficient to define a reliable comparison."
    elif dmd and ctl:
        suitability="Study design supports comparison"
        decision="The sample annotations contain both DMD and comparison samples. Confirm exact inclusion criteria before analysis."
    elif dmd and not ctl:
        suitability="Conditional — comparison missing"
        decision="DMD samples are identifiable, but a control/comparison group is not confirmed in this series."
    else:
        suitability="Needs clarification"
        decision="The sample groups cannot yet support the selected hypothesis without further review."

    primary=comparisons[0] if comparisons else None
    plan={
      "objective":f"Evaluate whether {accession.upper()} can provide independent evidence for: {hypothesis}",
      "primary_comparison":primary,
      "steps":[
        "Confirm sample inclusion/exclusion criteria and group labels from the GEO record.",
        "Obtain the processed expression matrix or other analysis-ready data and map samples to the confirmed groups.",
        "Lock the original feature definition/model or statistical method before examining validation outcomes.",
        "Apply the locked method to the independent cohort without refitting on validation labels.",
        "Report effect size or discrimination, uncertainty, calibration where applicable, and failure cases.",
        "Compare the result with the original report and document whether the hypothesis is supported, weakened, or unresolved."
      ],
      "support":"The pre-specified signal remains directionally consistent and materially useful in the independent comparison, with uncertainty reported.",
      "reject":"The signal reverses, collapses materially, cannot be reproduced under the locked method, or the cohort is not scientifically comparable.",
      "requirements":["Confirmed DMD group","Confirmed comparison/control group","Analysis-ready measurements","Locked analysis method","Independent cohort status"]
    }
    return {"accession":accession.upper(),"title":comp.get("title"),"hypothesis":hypothesis,"suitability":suitability,"decision":decision,"groups":groups,"comparisons":comparisons,"samples":rows[:80],"sample_count":len(rows),"dmd_count":len(dmd),"control_count":len(ctl),"unresolved_count":len(unresolved),"treated_dmd_count":len(treated),"untreated_dmd_count":len(untreated),"plan":plan,"official_url":comp.get("official_url"),"compatibility":comp}


def _deep_resolve_geo_sample(sample:dict)->dict:
    """Conservative second-pass resolver using all public GEO sample annotations.
    It never invents a control label: ambiguous samples remain unresolved.
    """
    base=_classify_geo_sample(sample)
    f=sample.get("fields",{}) or {}
    values=[]
    for key,vals in f.items():
        if key.startswith("sample_"):
            values.extend(str(v) for v in (vals or []))
    blob=" | ".join(values).lower()

    # Strong disease/control phrases only. Generic 'normal' is intentionally excluded.
    dmd_patterns=[r"duchenne muscular dystrophy",r"\bdmd\b",r"dystrophin[- ]deficient",r"dystrophinopathy"]
    ctl_patterns=[r"healthy (?:donor|control|individual|subject)",r"unaffected (?:donor|control|individual|subject)",r"non[- ]dmd",r"wild[- ]?type",r"\bcontrol (?:donor|sample|subject|cell|cells)\b"]
    dmd_hits=[x for x in dmd_patterns if re.search(x,blob)]
    ctl_hits=[x for x in ctl_patterns if re.search(x,blob)]

    if dmd_hits and not ctl_hits:
        group="DMD"; confidence="high"; evidence="DMD/dystrophin disease annotation found in the GEO sample metadata."
    elif ctl_hits and not dmd_hits:
        group="Control"; confidence="high"; evidence="Healthy/unaffected/control annotation found in the GEO sample metadata."
    elif base.get("disease_group") in {"DMD","Control"}:
        group=base["disease_group"]; confidence="moderate"; evidence="The existing GEO sample annotations support this group label."
    else:
        group="Unresolved"; confidence="low"; evidence="The public GEO annotations do not provide a safe DMD/control label."
    out=dict(base); out.update({"disease_group":group,"resolution_confidence":confidence,"resolution_evidence":evidence})
    return out

def _geo_resolve_groups(accession:str,hypothesis:str="independent external validation"):
    acc=re.sub(r"[^A-Za-z0-9_-]","",accession or "").upper()
    comp=_geo_compatibility(acc,hypothesis)
    text=_geo_soft(acc)
    rows=[_deep_resolve_geo_sample(x) for x in _geo_sections(text)]
    dmd=[x for x in rows if x["disease_group"]=="DMD"]
    ctl=[x for x in rows if x["disease_group"]=="Control"]
    unresolved=[x for x in rows if x["disease_group"]=="Unresolved"]
    treated=[x for x in rows if x["disease_group"]=="DMD" and x.get("exposure")=="Treated/intervention"]
    untreated=[x for x in rows if x["disease_group"]=="DMD" and x.get("exposure")=="Untreated/baseline"]
    comparisons=[]
    if dmd and ctl:
        comparisons.append({"id":"dmd_vs_control","label":"DMD vs control","left":"DMD","right":"Control","priority":"Primary","reason":"A disease-versus-control contrast is supported by the public sample annotations."})
    if treated and untreated:
        comparisons.append({"id":"treated_vs_untreated_dmd","label":"Treated DMD vs untreated DMD","left":"Treated DMD","right":"Untreated DMD","priority":"Secondary","reason":"This contrast can address treatment response, but it does not replace DMD-versus-control validation."})
    if dmd and ctl:
        outcome="Ready"; decision="DMD and control groups were confirmed from the available GEO sample annotations."
    elif dmd and not ctl:
        outcome="Rejected for this question"; decision="No defensible control/comparison group could be confirmed. This series should not be forced into the selected external-validation test."
    else:
        outcome="Needs review"; decision="The available annotations still do not define the disease and comparison groups required for this question."
    primary=comparisons[0] if comparisons else None
    plan={"objective":f"Evaluate whether {acc} can provide independent evidence for: {hypothesis}","primary_comparison":primary,
      "steps":["Confirm sample inclusion/exclusion criteria and group labels from the GEO record.","Obtain analysis-ready measurements and map samples to confirmed groups.","Lock the original feature definition/model or statistical method before examining validation outcomes.","Apply the locked method to the independent cohort without refitting on validation labels.","Report effect size or discrimination, uncertainty, calibration where applicable, and failure cases.","Compare the result with the original report and document whether the hypothesis is supported, weakened, or unresolved."],
      "support":"The pre-specified signal remains directionally consistent and materially useful in the independent comparison, with uncertainty reported.","reject":"The signal reverses, collapses materially, cannot be reproduced under the locked method, or the cohort is not scientifically comparable."}
    groups=[]
    for name,arr in [("DMD",dmd),("Control",ctl),("Unresolved",unresolved)]:
        if arr: groups.append({"name":name,"count":len(arr),"sample_ids":[x.get("id") for x in arr]})
    return {"accession":acc,"title":comp.get("title"),"hypothesis":hypothesis,"suitability":outcome,"decision":decision,"groups":groups,"comparisons":comparisons,"samples":rows[:80],"sample_count":len(rows),"dmd_count":len(dmd),"control_count":len(ctl),"unresolved_count":len(unresolved),"treated_dmd_count":len(treated),"untreated_dmd_count":len(untreated),"plan":plan,"official_url":comp.get("official_url"),"compatibility":comp,"resolution":{"attempted":True,"resolved_count":len(rows)-len(unresolved),"remaining_unresolved":len(unresolved),"method":"Conservative review of public GEO sample annotations"}}

@app.get("/api/research/geo/{accession}/resolve-groups")
def research_geo_resolve_groups(accession:str,hypothesis:str="independent external validation"):
    try:return _geo_resolve_groups(accession,hypothesis)
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=502,detail="Sample groups could not be resolved from GEO metadata: "+str(e))

@app.get("/api/research/geo/{accession}/study-design")
def research_geo_study_design(accession:str,hypothesis:str="independent external validation"):
    try:return _geo_study_design(accession,hypothesis)
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=502,detail="Study design could not be resolved from GEO metadata: "+str(e))

@app.get("/api/research/trials")
def research_trials(q:str="Duchenne muscular dystrophy", page_size:int=20):
    page_size=max(5,min(50,page_size))
    try:
        params=urllib.parse.urlencode({"query.cond":q,"pageSize":page_size,"format":"json"})
        data=_get_json("https://clinicaltrials.gov/api/v2/studies?"+params)
        items=[]
        for s in data.get("studies",[]):
            p=s.get("protocolSection",{}); ident=p.get("identificationModule",{}); stat=p.get("statusModule",{}); design=p.get("designModule",{})
            nct=ident.get("nctId","")
            items.append({"nct_id":nct,"title":ident.get("briefTitle","Untitled study"),"official_title":ident.get("officialTitle"),
              "status":stat.get("overallStatus"),"study_type":design.get("studyType"),"phases":design.get("phases",[]),
              "enrollment":(design.get("enrollmentInfo") or {}).get("count"),"url":"https://clinicaltrials.gov/study/"+nct})
        return {"query":q,"items":items,"next_page_token":data.get("nextPageToken")}
    except Exception as e: raise HTTPException(status_code=502,detail="ClinicalTrials.gov could not be reached: "+str(e))

@app.get("/api/research/molecular-visuals")
def molecular_visuals():
    meta=load_molecular_meta()
    try:
        bundle=load_molecular_bundle()
        selected=bundle.get("selected_probes") or []
        pipeline=bundle.get("pipeline")
        coefs=[]
        if pipeline is not None:
            clf=getattr(pipeline,"named_steps",{}).get("classifier") or getattr(pipeline,"named_steps",{}).get("logisticregression")
            if clf is not None and hasattr(clf,"coef_"): coefs=[float(x) for x in clf.coef_[0]]
        features=[{"feature":str(p),"weight":coefs[i] if i<len(coefs) else None} for i,p in enumerate(selected)]
    except Exception:
        features=[]
    return {"model_name":meta.get("model_name"),"model_version":meta.get("model_version"),
      "internal_validation":meta.get("internal_validation"),"external_validation":meta.get("external_validation"),
      "features":features}

# ---------------------------------------------------------------------------
# DMD-AI V21.0 — real scientific analysis + deployment readiness
# ---------------------------------------------------------------------------
GSE38417_MATRIX = ROOT / "ml" / "data" / "authoritative_dmd" / "GSE38417_series_matrix.txt.gz"
STRUCTURE_CACHE = ROOT / "ml" / "data" / "structures"
STRUCTURE_CACHE.mkdir(parents=True, exist_ok=True)

def _bh_fdr(pvals):
    import numpy as np
    p=np.asarray(pvals,dtype=float)
    n=len(p); order=np.argsort(p); ranked=p[order]
    q=np.empty(n,dtype=float); prev=1.0
    for i in range(n-1,-1,-1):
        val=min(prev, ranked[i]*n/(i+1))
        q[order[i]]=val; prev=val
    return np.clip(q,0,1)

def _load_gse38417():
    if not GSE38417_MATRIX.exists():
        raise HTTPException(status_code=503, detail="Bundled GSE38417 matrix is missing.")
    import numpy as np, csv as _csv
    with gzip.open(GSE38417_MATRIX,"rt",encoding="utf-8",errors="replace") as f:
        lines=f.readlines()
    try:
        start=next(i for i,x in enumerate(lines) if x.startswith("!series_matrix_table_begin"))+1
        end=next(i for i,x in enumerate(lines) if x.startswith("!series_matrix_table_end"))
    except StopIteration:
        raise HTTPException(status_code=500,detail="GSE38417 matrix table markers were not found.")
    rows=list(_csv.reader(lines[start:end],delimiter="\t",quotechar='"'))
    header=rows[0]; samples=header[1:]; probes=[]; vals=[]
    for r in rows[1:]:
        if len(r)!=len(header): continue
        try: arr=[float(x) for x in r[1:]]
        except Exception: continue
        probes.append(r[0]); vals.append(arr)
    X=np.asarray(vals,dtype=float)
    if X.shape[1]!=22:
        raise HTTPException(status_code=500,detail=f"Unexpected GSE38417 sample count: {X.shape[1]}")
    labels=np.asarray([0]*6+[1]*16,dtype=int)
    return probes,samples,X,labels

@app.get("/api/readiness")
def deployment_readiness():
    meta=load_molecular_meta()
    ready=MOLECULAR_MODEL_PATH.exists() and MOLECULAR_META_PATH.exists() and GSE38417_MATRIX.exists()
    return {
      "service":"dmd-ai","api":"ready","model_file_present":MOLECULAR_MODEL_PATH.exists(),
      "model_metadata_present":MOLECULAR_META_PATH.exists(),"gse38417_matrix_present":GSE38417_MATRIX.exists(),
      "model_version":meta.get("model_version"),"technical_deployment":"ready" if ready else "not_ready",
      "clinical_use_status":"research_decision_support_only","clinical_validation_complete":False,
      "regulatory_authorization_claimed":False,
      "important":"The software can be technically deployed, but the current molecular model is not clinically validated or authorized as an autonomous diagnostic device."
    }

@app.get("/api/ml/dmd-molecular/readiness")
def dmd_molecular_readiness():
    meta=load_molecular_meta(); ext=meta.get("external_validation") or {}
    return {
      "inference_engine":"working" if MOLECULAR_MODEL_PATH.exists() else "unavailable",
      "expected_input":"Aligned skeletal-muscle gene-expression profile matching the trained Affymetrix probe space",
      "training_cohort":meta.get("training"),"external_validation":ext,
      "known_external_validation_accession":ext.get("accession"),"clinical_validation":"not_completed",
      "independent_third_cohort":"not_completed","diagnostic_claim":"not_permitted_by_current_evidence",
      "safe_product_positioning":"Research / clinician decision-support molecular pattern analysis"
    }

@app.get("/api/research/gse38417/analysis")
def gse38417_analysis():
    import numpy as np
    from scipy.stats import ttest_ind
    from sklearn.decomposition import PCA
    probes,samples,X,labels=_load_gse38417()
    ctrl=X[:,labels==0]; dmd=X[:,labels==1]
    mean_c=ctrl.mean(axis=1); mean_d=dmd.mean(axis=1); delta=mean_d-mean_c
    with np.errstate(invalid="ignore",divide="ignore"):
        _,p=ttest_ind(dmd,ctrl,axis=1,equal_var=False,nan_policy="omit")
    p=np.where(np.isfinite(p),p,1.0); q=_bh_fdr(p)
    sig=(q<0.05)&(np.abs(delta)>=np.log2(1.5))
    # first by FDR, then larger effect
    order=np.lexsort((-np.abs(delta),q))[:60]
    top=[{"probe":probes[i],"log2_fold_change":round(float(delta[i]),4),
          "p_value":float(p[i]),"fdr":float(q[i]),
          "control_mean":round(float(mean_c[i]),4),"dmd_mean":round(float(mean_d[i]),4)}
         for i in order[:30]]
    vari=np.var(X,axis=1); sel=np.argsort(vari)[-1000:]
    Z=X[sel,:].T; Z=(Z-Z.mean(axis=0))/(Z.std(axis=0)+1e-8)
    coords=PCA(n_components=2,random_state=42).fit_transform(Z)
    pca=[{"sample":samples[i],"group":"DMD" if labels[i] else "Control",
          "x":round(float(coords[i,0]),4),"y":round(float(coords[i,1]),4)} for i in range(len(samples))]
    hm_idx=order[:24]; H=X[hm_idx,:]
    H=(H-H.mean(axis=1,keepdims=True))/(H.std(axis=1,keepdims=True)+1e-8)
    heatmap=[{"probe":probes[pi],"values":[round(float(v),3) for v in H[j]]} for j,pi in enumerate(hm_idx)]
    return {
      "accession":"GSE38417","platform":"GPL570","organism":"Homo sapiens","samples":len(samples),
      "controls":6,"dmd":16,"probe_count":len(probes),"significant_probe_count":int(sig.sum()),
      "thresholds":{"fdr":0.05,"absolute_log2_fold_change":round(float(np.log2(1.5)),4)},
      "sample_ids":samples,"sample_groups":["Control"]*6+["DMD"]*16,
      "top_differential_probes":top,"pca":pca,"heatmap":heatmap,
      "provenance":"Bundled NIH/NCBI GEO GSE38417 processed series matrix; gcrma-normalized log2 signal intensities.",
      "warning":"Exploratory transcriptomic research analysis; not a clinical diagnostic result."
    }

@app.get("/api/research/gse38417/model-validation")
def gse38417_model_validation():
    import numpy as np
    probes,samples,X,labels=_load_gse38417()
    bundle=load_molecular_bundle(); pipe=bundle.get("pipeline"); common=bundle.get("common_probe_order") or []
    idx={p:i for i,p in enumerate(probes)}; missing=[p for p in common if p not in idx]
    if missing: raise HTTPException(status_code=422,detail=f"GSE38417 is missing {len(missing)} required aligned probes.")
    M=np.asarray([[X[idx[p],j] for p in common] for j in range(X.shape[1])],dtype=float)
    prob=np.asarray(pipe.predict_proba(M)[:,1],dtype=float); pred=(prob>=.5).astype(int)
    tp=int(((pred==1)&(labels==1)).sum()); tn=int(((pred==0)&(labels==0)).sum())
    fp=int(((pred==1)&(labels==0)).sum()); fn=int(((pred==0)&(labels==1)).sum())
    return {"accession":"GSE38417",
      "samples":[{"sample":samples[i],"known":"DMD" if labels[i] else "Control","score":round(float(prob[i]),8),
                  "predicted":"DMD-pattern" if pred[i] else "Control-like"} for i in range(len(samples))],
      "confusion_matrix":{"tp":tp,"tn":tn,"fp":fp,"fn":fn},"accuracy":round(float((pred==labels).mean()),4),
      "status":"technically_working_on_known_external_validation_cohort",
      "important":"GSE38417 is the model's known external-validation cohort. This confirms pipeline execution and recorded external performance, but is not a new independent third-cohort validation."
    }

_ALLOWED_STRUCTURES={
 "1DXX":{"title":"N-terminal actin-binding domain of human dystrophin","method":"X-RAY DIFFRACTION","resolution":"2.60 Å","experimental":True},
 "9EC1":{"title":"Human dystrophin spectrin repeat 24","method":"X-RAY DIFFRACTION","resolution":"2.14 Å","experimental":True}
}
@app.get("/api/research/structure/{pdb_id}")
def research_structure(pdb_id:str):
    pdb_id=pdb_id.upper()
    if pdb_id not in _ALLOWED_STRUCTURES:
        raise HTTPException(status_code=400,detail="Supported dystrophin structures are 1DXX and 9EC1.")
    cache=STRUCTURE_CACHE/f"{pdb_id}.pdb"
    if not cache.exists():
        try:
            req=urllib.request.Request(f"https://files.rcsb.org/download/{pdb_id}.pdb",headers={"User-Agent":"DMD-AI-Research/1.0"})
            with urllib.request.urlopen(req,timeout=25) as r: cache.write_bytes(r.read())
        except Exception as e:
            raise HTTPException(status_code=502,detail=f"RCSB structure could not be downloaded: {e}")
    atoms=[]
    for line in cache.read_text(encoding="utf-8",errors="ignore").splitlines():
        if not line.startswith("ATOM") or line[12:16].strip()!="CA": continue
        try:
            atoms.append({"chain":line[21].strip() or "A","residue":int(line[22:26]),"aa":line[17:20].strip(),
                          "x":float(line[30:38]),"y":float(line[38:46]),"z":float(line[46:54])})
        except Exception: continue
        if len(atoms)>=2500: break
    if not atoms: raise HTTPException(status_code=500,detail="No alpha-carbon coordinates could be parsed.")
    return {"pdb_id":pdb_id,**_ALLOWED_STRUCTURES[pdb_id],"atom_count":len(atoms),"atoms":atoms,
            "source_url":f"https://www.rcsb.org/structure/{pdb_id}",
            "note":"Coordinates parsed directly from the RCSB PDB experimental structure file."}

# ---------------------------------------------------------------------------
# DMD-AI V21.1 — validation lab endpoints
# ---------------------------------------------------------------------------
@app.get("/api/research/gse38417/sample/{sample_id}/predict")
def gse38417_sample_predict(sample_id:str):
    import numpy as np
    probes,samples,X,labels=_load_gse38417()
    if sample_id not in samples:
        raise HTTPException(status_code=404,detail="Sample not found in GSE38417.")
    j=samples.index(sample_id)
    bundle=load_molecular_bundle()
    pipe=bundle.get("pipeline"); common=bundle.get("common_probe_order") or []
    idx={p:i for i,p in enumerate(probes)}
    missing=[p for p in common if p not in idx]
    if missing:
        raise HTTPException(status_code=422,detail=f"Sample matrix is missing {len(missing)} required probes.")
    row=np.asarray([[X[idx[p],j] for p in common]],dtype=float)
    prob=float(pipe.predict_proba(row)[0,1]); pred=int(prob>=.5)
    known=int(labels[j])
    return {
      "sample":sample_id,
      "known_class":"DMD" if known else "Control",
      "predicted_class":"DMD-pattern" if pred else "Control-like",
      "score":round(prob,8),
      "score_percent":round(prob*100,2),
      "match":bool(pred==known),
      "dataset":"GSE38417",
      "note":"This sample belongs to the known external-validation cohort. It is appropriate for pipeline verification, not independent validation."
    }

@app.get("/api/research/gse38417/volcano")
def gse38417_volcano(max_points:int=2200):
    import numpy as np
    from scipy.stats import ttest_ind
    probes,samples,X,labels=_load_gse38417()
    ctrl=X[:,labels==0]; dmd=X[:,labels==1]
    delta=dmd.mean(axis=1)-ctrl.mean(axis=1)
    with np.errstate(invalid="ignore",divide="ignore"):
        _,p=ttest_ind(dmd,ctrl,axis=1,equal_var=False,nan_policy="omit")
    p=np.where(np.isfinite(p),p,1.0); q=_bh_fdr(p)
    sig=(q<0.05)&(np.abs(delta)>=np.log2(1.5))
    sig_idx=np.where(sig)[0]
    nonsig_idx=np.where(~sig)[0]
    # preserve strongest significant signals; sample the background deterministically
    sig_order=sig_idx[np.argsort(q[sig_idx])[:min(len(sig_idx),max_points//2)]]
    remaining=max(0,max_points-len(sig_order))
    if len(nonsig_idx)>remaining and remaining>0:
        step=max(1,len(nonsig_idx)//remaining)
        bg=nonsig_idx[::step][:remaining]
    else:
        bg=nonsig_idx[:remaining]
    chosen=np.concatenate([sig_order,bg])
    return {"accession":"GSE38417","points":[
      {"probe":probes[i],"log2_fold_change":round(float(delta[i]),4),
       "fdr":float(q[i]),"neg_log10_fdr":round(float(-np.log10(max(q[i],1e-300))),4),
       "significant":bool(sig[i])} for i in chosen
    ],"total_probe_count":len(probes),"significant_probe_count":int(sig.sum()),
      "thresholds":{"fdr":0.05,"absolute_log2_fold_change":round(float(np.log2(1.5)),4)}}

# ---------------------------------------------------------------------------
# DMD-AI V22.0 — evidence discovery / gap scanner
# ---------------------------------------------------------------------------
def _pubmed_evidence(query:str,retmax:int=100):
    term=urllib.parse.quote(query)
    search=_get_json(f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax={min(max(retmax,10),200)}&sort=relevance&term={term}")
    ids=(search.get("esearchresult") or {}).get("idlist") or []
    total=int((search.get("esearchresult") or {}).get("count") or 0)
    if not ids:return total,[]
    xml=_text_get("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id="+",".join(ids))
    root=ET.fromstring(xml); rows=[]
    for art in root.findall(".//PubmedArticle"):
        med=art.find("MedlineCitation"); article=med.find("Article") if med is not None else None
        if article is None: continue
        pmid=(med.findtext("PMID") or "").strip()
        title="".join(article.find("ArticleTitle").itertext()).strip() if article.find("ArticleTitle") is not None else ""
        abst=" ".join("".join(x.itertext()).strip() for x in article.findall(".//Abstract/AbstractText")).strip()
        journal=article.findtext(".//Journal/Title") or ""
        year=article.findtext(".//JournalIssue/PubDate/Year") or article.findtext(".//ArticleDate/Year") or ""
        rows.append({"pmid":pmid,"title":title,"abstract":abst,"journal":journal,"year":year,
                     "url":f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"})
    return total,rows

_GAP_RULES=[
 ("small_cohorts","Small cohorts / sample-size constraints",["small sample","small cohort","sample size","limited sample","limited number"]),
 ("single_center","Single-center or narrow recruitment",["single center","single-centre","single site","single-site"]),
 ("short_followup","Short follow-up / longitudinal evidence",["short follow-up","short followup","follow-up period","long-term follow-up","longitudinal"]),
 ("external_validation","Independent/external validation",["external validation","independent validation","validation cohort","external cohort"]),
 ("diversity","Population diversity / representativeness",["diverse population","ethnic diversity","racial diversity","representative","generalizability","generalisability"]),
 ("data_sharing","Data/code availability and reproducibility",["data availability","code availability","reproducibility","open data","source code"]),
 ("biomarkers","Biomarker validation",["biomarker","biomarkers"]),
 ("gene_therapy","Gene / genome therapy",["gene therapy","crispr","genome editing","exon skipping","micro-dystrophin","microdystrophin"]),
 ("cardiac","Cardiac outcomes",["cardiac","cardiomyopathy","heart"]),
 ("respiratory","Respiratory outcomes",["respiratory","pulmonary","ventilation"]),
 ("quality_of_life","Quality of life / patient-reported outcomes",["quality of life","patient-reported","patient reported","caregiver"])
]
@app.get("/api/research/evidence-scan")
def evidence_scan(q:str="Duchenne muscular dystrophy",limit:int=100):
    total,rows=_pubmed_evidence(q,limit)
    corpus=[(r["title"]+" "+r["abstract"]).lower() for r in rows]
    themes=[]
    for key,label,terms in _GAP_RULES:
        matched=[i for i,text in enumerate(corpus) if any(t in text for t in terms)]
        themes.append({"key":key,"label":label,"papers":len(matched),
          "coverage_percent":round((len(matched)/len(rows)*100),1) if rows else 0,
          "example_pmids":[rows[i]["pmid"] for i in matched[:5]]})
    explicit_limitations=[]
    for r,text in zip(rows,corpus):
        hits=[]
        for phrase in ["limitation","limited by","small sample","further studies","future studies","further research","needs validation","external validation"]:
            if phrase in text:hits.append(phrase)
        if hits: explicit_limitations.append({"pmid":r["pmid"],"title":r["title"],"signals":hits,"url":r["url"]})
    years={}
    for r in rows:
        if str(r["year"]).isdigit(): years[r["year"]]=years.get(r["year"],0)+1
    return {"query":q,"pubmed_total":total,"papers_analyzed":len(rows),"themes":themes,
      "explicit_limitation_signals":explicit_limitations[:30],
      "year_distribution":years,
      "method":"Deterministic text-pattern scan of PubMed titles/abstracts. It surfaces candidates for human critical appraisal; it does not declare a publication flawed.",
      "papers":rows}

@app.get("/api/research/gene/dmd")
def dmd_gene_reference():
    return {
      "symbol":"DMD","name":"dystrophin","chromosome":"X","location":"Xp21.2-p21.1",
      "ncbi_gene_id":"1756","ensembl":"ENSG00000198947",
      "uniprot":"P11532","omim":"300377",
      "links":{
       "NCBI Gene":"https://www.ncbi.nlm.nih.gov/gene/1756",
       "Ensembl":"https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=ENSG00000198947",
       "UniProt":"https://www.uniprot.org/uniprotkb/P11532/entry",
       "ClinVar":"https://www.ncbi.nlm.nih.gov/clinvar/?term=DMD%5Bgene%5D"
      },
      "note":"Reference identifiers for the human DMD gene; variant interpretation must use appropriate clinical genetics standards."
    }

# ---------------------------------------------------------------------------
# V24 complete computational research pipeline orchestration
# ---------------------------------------------------------------------------

def _pipeline_readiness_from_design(d:dict)->tuple[str,str,int]:
    comp=d.get("compatibility") or {}
    if comp.get("previous_workspace_use"):
        return "Rejected","This cohort has already been used in the current molecular-model workflow.",0
    species=" ".join(comp.get("species") or []).lower()
    human="homo sapiens" in species or "human" in species
    if species and not human:
        return "Rejected","The available metadata indicates a non-human cohort for a human external-validation question.",1
    if d.get("dmd_count",0)>0 and d.get("control_count",0)>0 and d.get("plan",{}).get("primary_comparison"):
        return "Ready","A DMD-versus-comparison design is identifiable and can advance to a locked experiment plan.",4
    if d.get("dmd_count",0)>0:
        return "Conditional","DMD samples are identifiable, but a comparison/control group is not yet confirmed.",3
    return "Needs review","The sample groups are not sufficiently resolved to support the selected hypothesis.",2

@app.get("/api/research/pipeline/screen")
def research_pipeline_screen(accessions:str,hypothesis:str="Independent/external validation of a DMD research signal"):
    ids=[re.sub(r"[^A-Za-z0-9_-]","",x).upper() for x in (accessions or "").split(",") if x.strip()][:10]
    if not ids: raise HTTPException(status_code=400,detail="At least one GSE accession is required.")
    items=[]
    for acc in ids:
        try:
            d=_geo_study_design(acc,hypothesis)
            readiness,reason,rank=_pipeline_readiness_from_design(d)
            items.append({"accession":acc,"readiness":readiness,"reason":reason,"rank":rank,
                "sample_count":d.get("sample_count",0),"dmd_count":d.get("dmd_count",0),"control_count":d.get("control_count",0),
                "unresolved_count":d.get("unresolved_count",0),"assay":(d.get("compatibility") or {}).get("assay"),
                "material":(d.get("compatibility") or {}).get("tissue")})
        except Exception as e:
            items.append({"accession":acc,"readiness":"Needs review","reason":"Metadata review could not be completed: "+str(e),"rank":9,"sample_count":0,"dmd_count":0,"control_count":0,"unresolved_count":0})
    order={"Ready":0,"Conditional":1,"Needs review":2,"Rejected":3}
    items.sort(key=lambda x:(order.get(x["readiness"],9),-x.get("control_count",0),-x.get("dmd_count",0),x.get("rank",9)))
    ready=sum(1 for x in items if x["readiness"]=="Ready")
    conditional=sum(1 for x in items if x["readiness"]=="Conditional")
    return {"hypothesis":hypothesis,"items":items,"ready_count":ready,"conditional_count":conditional,
            "summary":f"{ready} ready candidate(s), {conditional} conditional candidate(s), {len(items)-ready-conditional} requiring review or rejection."}


@app.get("/api/research/pipeline/advance")
def research_pipeline_advance(accessions:str,current:str="",hypothesis:str="Independent/external validation of a DMD research signal"):
    ids=[re.sub(r"[^A-Za-z0-9_-]","",x).upper() for x in (accessions or "").split(",") if x.strip()][:10]
    cur=re.sub(r"[^A-Za-z0-9_-]","",current or "").upper()
    ids=[x for x in ids if x and x!=cur]
    if not ids: raise HTTPException(status_code=400,detail="No remaining candidate accessions are available.")
    reviewed=[]; selected=None; selected_design=None
    for acc in ids:
        try:
            d=_geo_resolve_groups(acc,hypothesis)
            readiness,reason,rank=_pipeline_readiness_from_design(d)
            row={"accession":acc,"readiness":readiness,"reason":reason,"dmd_count":d.get("dmd_count",0),"control_count":d.get("control_count",0),"unresolved_count":d.get("unresolved_count",0),"sample_count":d.get("sample_count",0)}
            reviewed.append(row)
            if readiness=="Ready" and d.get("plan",{}).get("primary_comparison"):
                selected=acc; selected_design=d; break
        except Exception as e:
            reviewed.append({"accession":acc,"readiness":"Needs review","reason":"Metadata review could not be completed: "+str(e),"dmd_count":0,"control_count":0,"unresolved_count":0,"sample_count":0})
    if selected:
        return {"status":"ready","selected":selected,"design":selected_design,"reviewed":reviewed,"message":f"{selected} is the first remaining candidate with a defensible comparison. It can enter the four-step validation path."}
    return {"status":"exhausted","selected":None,"reviewed":reviewed,"message":"None of the remaining visible candidates has a defensible comparison for this question. The correct next action is to search GEO for additional human DMD datasets rather than forcing an unsuitable cohort."}


def _pipeline_stage(number:int,name:str,status:str,message:str,required_result:str)->dict:
    return {"number":number,"name":name,"status":status,"message":message,"required_result":required_result}

@app.get("/api/research/pipeline/run")
def research_pipeline_run(accession:str,hypothesis:str="Independent/external validation of a DMD research signal"):
    acc=re.sub(r"[^A-Za-z0-9_-]","",accession or "").upper()
    if not re.fullmatch(r"GSE\d+",acc): raise HTTPException(status_code=400,detail="A GSE accession is required.")
    d=_geo_study_design(acc,hypothesis)
    comp=d.get("compatibility") or {}
    stages=[]
    stages.append(_pipeline_stage(1,"Evidence scan","passed","The research question is linked to an evidence-gap investigation.","A candidate gap supported by traceable literature evidence."))
    stages.append(_pipeline_stage(2,"Hypothesis","passed",hypothesis,"A falsifiable research question with defined support/rejection criteria."))
    if comp.get("previous_workspace_use"):
        stages.append(_pipeline_stage(3,"Dataset compatibility","blocked","This cohort is already recorded in the current molecular-model workflow and cannot be treated as untouched evidence.","A relevant cohort independent of development and prior validation data."))
        compat_ok=False
    else:
        species=" ".join(comp.get("species") or []).lower(); human=("homo sapiens" in species or "human" in species)
        compat_ok=human and bool(comp.get("dmd_group_identified"))
        stages.append(_pipeline_stage(3,"Dataset compatibility","passed" if compat_ok else "blocked",("Human DMD metadata is sufficiently compatible for study-design review." if compat_ok else "The dataset does not yet meet the minimum compatibility requirements for this question."),"Relevant species, disease group, assay/material and independent cohort status."))
    design_ok=bool(d.get("dmd_count")) and bool(d.get("control_count")) and bool((d.get("plan") or {}).get("primary_comparison")) and not comp.get("previous_workspace_use")
    stages.append(_pipeline_stage(4,"Study design","passed" if design_ok else "blocked",d.get("decision") or "Study design requires review.","Confirmed disease and comparison groups with a scientifically valid primary contrast."))
    can_create=compat_ok and design_ok
    stages.append(_pipeline_stage(5,"Research project","ready" if can_create else "blocked",("The question, dataset and primary comparison are sufficiently defined to record a project." if can_create else "Project creation should wait until the dataset and comparison are scientifically defensible."),"Locked question, dataset, comparison and objective."))
    plan=(d.get("plan") or {})
    plan_ok=can_create and bool(plan.get("primary_comparison"))
    stages.append(_pipeline_stage(6,"Experiment plan","ready" if plan_ok else "blocked",("A pre-specified analysis plan can be recorded before examining outcomes." if plan_ok else "A primary comparison is required before an experiment can be locked."),"Pre-specified preprocessing, features/method, endpoints and decision rules."))

    assay=(comp.get("assay") or "").lower(); platforms=" ".join(comp.get("platforms") or []).lower()
    current_model_platform_ok=("gpl96" in platforms or "gpl570" in platforms or "affymetrix" in assay)
    prior=bool(comp.get("previous_workspace_use")) or acc in {"GSE6011","GSE38417"}
    if not plan_ok:
        analysis_status="blocked"; analysis_message="Analysis is blocked because the study design does not yet contain a valid primary comparison."
    elif prior:
        analysis_status="blocked"; analysis_message="This cohort is not untouched for the current molecular model, so it cannot provide a new independent-validation result."
    elif not current_model_platform_ok:
        analysis_status="blocked"; analysis_message="The current locked molecular model cannot be applied directly to this assay/platform. A separately locked and validated harmonization or gene-level model is required before analysis."
    else:
        analysis_status="ready"; analysis_message="The cohort design and platform are potentially compatible. An analysis-ready matrix and exact feature mapping must be verified before executing the locked model."
    stages.append(_pipeline_stage(7,"Analysis",analysis_status,analysis_message,"A real analysis executed on analysis-ready data using a locked method without refitting on validation labels."))
    val_status="ready" if analysis_status=="completed" else "blocked"
    stages.append(_pipeline_stage(8,"Independent validation",val_status,("Independent validation metrics are available." if val_status=="ready" else "Validation cannot be claimed until a real locked analysis has executed on an untouched compatible cohort."),"Replication metrics/effect sizes with uncertainty on genuinely independent evidence."))
    interpretation={"label":"Unresolved","message":"The hypothesis remains unresolved until an appropriate independent analysis is completed."}
    stages.append(_pipeline_stage(9,"Interpretation","pending",interpretation["message"],"Supported, weakened, rejected or unresolved conclusion tied to the observed evidence."))
    stages.append(_pipeline_stage(10,"Research report","ready","A pre-analysis report can document the question, dataset review, decision rules and current blocker without overstating a result.","Traceable methods, evidence, limitations, results and conclusion."))
    comparison=((plan.get("primary_comparison") or {}).get("label") or "Not yet established")
    next_action=("Select or resolve a dataset with a confirmed DMD-versus-control comparison." if not design_ok else
                 "Use a genuinely independent assay/platform compatible with the locked model, or define and validate a new locked harmonization method before testing." if analysis_status=="blocked" else
                 "Verify the analysis-ready matrix and feature mapping, then execute the locked analysis.")
    report={"question":hypothesis,"dataset":acc,"comparison":comparison,"analysis":analysis_message,
            "interpretation":interpretation["message"],"limitation":"No clinical or therapeutic conclusion should be drawn until independent computational findings are biologically validated."}
    return {"accession":acc,"summary":f"{acc} progressed through the computational research pipeline as far as the current evidence permits.",
            "stages":stages,"can_create_project":can_create,"analysis_status":analysis_status,"analysis_message":analysis_message,
            "interpretation":interpretation,"next_action":next_action,"report":report,"study_design":d}
