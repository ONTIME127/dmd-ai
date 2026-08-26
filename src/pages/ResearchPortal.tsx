import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BrainCircuit, Database, Dna, ExternalLink, FlaskConical,
  Globe2, Search, ShieldCheck, UsersRound
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./ResearchPortal.css";

const API="http://127.0.0.1:8000";

type Source={
  id:string;organization:string;title:string;category:string;
  evidence_type:string;intended_use:string;population_or_model:string;
  summary:string;official_url:string;source_id?:string;
};

type ModelInfo={
  model_name?:string;model_type?:string;model_version?:string;
  purpose?:string;dataset_note?:string;warning?:string;
  validation?:Record<string,number|null>;trained_at?:string;
};

export default function ResearchPortal(){
  const navigate=useNavigate();
  const [sources,setSources]=useState<Source[]>([]);
  const [model,setModel]=useState<ModelInfo|null>(null);
  const [query,setQuery]=useState("");
  const [source,setSource]=useState<"ALL"|"WHO"|"NASA">("ALL");
  const [error,setError]=useState("");

  useEffect(()=>{
    Promise.all([
      fetch(`${API}/api/evidence`).then(r=>{if(!r.ok)throw new Error("Evidence service unavailable.");return r.json()}),
      fetch(`${API}/api/ml/model-info`).then(r=>{if(!r.ok)throw new Error("Model registry unavailable.");return r.json()})
    ]).then(([e,m])=>{
      setSources(e.sources||e.records||e.items||[]);
      setModel(m);
      setError("");
    }).catch(e=>setError(e instanceof Error?e.message:"Research services unavailable."));
  },[]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return sources.filter(s=>{
      if(source!=="ALL"&&s.organization!==source)return false;
      if(!q)return true;
      return [s.title,s.category,s.evidence_type,s.intended_use,s.summary,s.population_or_model]
        .some(v=>String(v||"").toLowerCase().includes(q));
    });
  },[sources,query,source]);

  return <main className="research-page">
    <header className="research-header">
      <button onClick={()=>navigate("/")}><ArrowLeft/> DMD-AI</button>
      <div><span>RESEARCH · EVIDENCE · MODEL TRANSPARENCY</span><h1>DMD-AI Research Portal</h1><p>A research workspace for evidence discovery, model transparency and future collaboration—kept separate from identifiable family records.</p></div>
    </header>

    <section className="research-governance">
      <ShieldCheck/><div><strong>Research access does not mean access to private patient records.</strong>
      <p>This workspace currently uses official research sources and model metadata. Any future use of participant-level DMD data must follow appropriate consent, governance, de-identification and applicable approvals.</p></div>
    </section>

    <section className="research-kpis">
      <article><Database/><div><span>Evidence records</span><strong>{sources.length}</strong><p>Curated official-source records currently connected.</p></div></article>
      <article><BrainCircuit/><div><span>Registered ML models</span><strong>{model?1:0}</strong><p>Transparent model metadata and validation.</p></div></article>
      <article><Globe2/><div><span>Evidence organizations</span><strong>{new Set(sources.map(s=>s.organization)).size}</strong><p>WHO, NASA and future DMD-specific sources.</p></div></article>
      <article><UsersRound/><div><span>Identifiable patient data</span><strong>0</strong><p>No private family records exposed in Research Portal.</p></div></article>
    </section>

    {model&&<section className="research-model">
      <div className="research-section-title"><BrainCircuit/><div><span>MODEL REGISTRY</span><h2>{model.model_name||"DMD-AI Carrier Screening Research Model"}</h2></div></div>
      <div className="research-model-grid">
        <div><span>Algorithm</span><strong>{model.model_type||"—"}</strong></div>
        <div><span>Version</span><strong>{model.model_version||"—"}</strong></div>
        <div><span>Training rows</span><strong>{model.validation?.rows_used??"—"}</strong></div>
        <div><span>AUROC</span><strong>{model.validation?.roc_auc??"—"}</strong></div>
        <div><span>Sensitivity</span><strong>{model.validation?.sensitivity??"—"}</strong></div>
        <div><span>Specificity</span><strong>{model.validation?.specificity??"—"}</strong></div>
        <div><span>Precision</span><strong>{model.validation?.precision??"—"}</strong></div>
        <div><span>Balanced accuracy</span><strong>{model.validation?.balanced_accuracy??"—"}</strong></div>
      </div>
      <div className="research-model-note"><InfoIcon/><p><strong>Intended use:</strong> {model.purpose||"Historical carrier-screening research."}<br/>{model.dataset_note}</p></div>
    </section>}

    <section className="research-evidence">
      <div className="research-section-title"><FlaskConical/><div><span>EVIDENCE LIBRARY</span><h2>Connected official-source research</h2></div></div>
      <div className="research-tools">
        <div><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search genomics, trials, muscle research..."/></div>
        <span>
          {(["ALL","WHO","NASA"] as const).map(v=><button key={v} className={source===v?"active":""} onClick={()=>setSource(v)}>{v==="ALL"?"All":v}</button>)}
        </span>
      </div>
      {error&&<p className="research-error">{error} Keep FastAPI running on port 8000.</p>}
      <div className="research-evidence-grid">
        {filtered.map(s=><article key={s.id}>
          <header><strong>{s.organization}</strong><span>{s.category}</span></header>
          <h3>{s.title}</h3>
          <p>{s.summary}</p>
          <dl><div><dt>Evidence type</dt><dd>{s.evidence_type}</dd></div><div><dt>Use in DMD-AI</dt><dd>{s.intended_use}</dd></div><div><dt>Population / model</dt><dd>{s.population_or_model}</dd></div></dl>
          <a href={s.official_url} target="_blank" rel="noreferrer">Open official source <ExternalLink/></a>
        </article>)}
      </div>
    </section>

    <section className="research-roadmap">
      <div className="research-section-title"><Dna/><div><span>DATA PROGRAM ROADMAP</span><h2>How DMD-AI should grow beyond one small model</h2></div></div>
      <div className="research-roadmap-grid">
        <article><span>01</span><strong>Genetic intelligence</strong><p>Curate DMD variants and mutation classes from appropriate variant resources and licensed/authorized datasets.</p></article>
        <article><span>02</span><strong>Progression intelligence</strong><p>Build longitudinal models from appropriately consented motor, respiratory and cardiac outcomes.</p></article>
        <article><span>03</span><strong>Trial intelligence</strong><p>Connect mutation, age and clinical context to potentially relevant registered trials for professional review.</p></article>
        <article><span>04</span><strong>External validation</strong><p>Validate each model on independent cohorts before considering any clinical deployment.</p></article>
      </div>
    </section>
  </main>;
}

function InfoIcon(){return <ShieldCheck/>}
