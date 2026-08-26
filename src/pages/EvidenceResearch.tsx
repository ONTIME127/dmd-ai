import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BrainCircuit, Database, Dna, ExternalLink,
  Globe2, RefreshCw, Satellite, Search, ShieldCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./EvidenceResearch.css";

const API = "http://127.0.0.1:8000";

type Source = {
  id:string;
  organization:"WHO"|"NASA";
  title:string;
  category:string;
  evidence_type:string;
  intended_use:string;
  population_or_model:string;
  summary:string;
  official_url:string;
  source_id?:string|null;
  last_verified_at?:string|null;
  live_status?:number|null;
  availability?:string;
};

export default function EvidenceResearch(){
  const navigate=useNavigate();
  const [sources,setSources]=useState<Source[]>([]);
  const [query,setQuery]=useState("");
  const [org,setOrg]=useState<"ALL"|"WHO"|"NASA">("ALL");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  const load=async(refresh=false)=>{
    setLoading(true);setError("");
    try{
      const r=await fetch(`${API}/api/evidence${refresh?"?verify=true":""}`);
      const data=await r.json();
      if(!r.ok)throw new Error(data.detail||"Evidence service unavailable.");
      setSources(data.sources||[]);
    }catch(e){setError(e instanceof Error?e.message:"Evidence service unavailable.")}
    finally{setLoading(false)}
  };

  useEffect(()=>{void load(false)},[]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return sources.filter(s=>{
      if(org!=="ALL"&&s.organization!==org)return false;
      if(!q)return true;
      return [s.title,s.category,s.evidence_type,s.intended_use,s.summary,s.population_or_model]
        .some(v=>String(v||"").toLowerCase().includes(q));
    });
  },[sources,query,org]);

  return <main className="ere-page">
    <header className="ere-header">
      <button onClick={()=>navigate("/family")}><ArrowLeft/> Family Portal</button>
      <div><span>EVIDENCE · RESEARCH · PROVENANCE</span><h1>DMD-AI Evidence & Research Engine</h1><p>Official-source intelligence kept separate from personal medical records and prediction models.</p></div>
    </header>

    <section className="ere-principle">
      <ShieldCheck/><div><strong>Evidence is labelled by source and intended use.</strong><p>WHO and NASA material can strengthen research, education and platform design, but DMD-AI does not treat experimental or public-health evidence as an individual diagnosis or treatment recommendation.</p></div>
    </section>

    <section className="ere-architecture">
      <article><Dna/><div><span>FAMILY / CLINICAL</span><strong>Patient-specific information</strong><p>Symptoms, genetics, records, care history and clinician-reviewed findings.</p></div></article>
      <article><BrainCircuit/><div><span>MACHINE LEARNING</span><strong>Validated model domain</strong><p>Only datasets appropriate to the model question are used for training or validation.</p></div></article>
      <article><Globe2/><div><span>WHO</span><strong>Global genomics evidence</strong><p>Precision medicine, genomics research landscapes, equity and genomic-data governance.</p></div></article>
      <article><Satellite/><div><span>NASA</span><strong>Muscle research evidence</strong><p>Muscle atrophy, regeneration, molecular mechanisms and experimental therapeutic platforms.</p></div></article>
    </section>

    <section className="ere-tools">
      <div className="ere-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search evidence, genomics, muscle atrophy, trials..."/></div>
      <div className="ere-filter">
        {(["ALL","WHO","NASA"] as const).map(v=><button key={v} className={org===v?"active":""} onClick={()=>setOrg(v)}>{v==="ALL"?"All sources":v}</button>)}
      </div>
      <button className="ere-refresh" disabled={loading} onClick={()=>void load(true)}><RefreshCw className={loading?"spin":""}/> Verify official sources</button>
    </section>

    {error&&<div className="ere-error">{error}<small>Make sure FastAPI is running on port 8000.</small></div>}

    <section className="ere-results">
      <div className="ere-results-head"><div><span>CURATED OFFICIAL SOURCES</span><h2>{filtered.length} evidence records</h2></div><p>Live verification checks whether the official source page is currently reachable; it does not imply endorsement of DMD-AI.</p></div>

      <div className="ere-grid">
        {filtered.map(s=><article className={`ere-card ${s.organization.toLowerCase()}`} key={s.id}>
          <header><div className="ere-org">{s.organization==="WHO"?<Globe2/>:<Satellite/>}<strong>{s.organization}</strong></div>
          <span className={`ere-status ${s.availability==="available"?"ok":""}`}>{s.availability==="available"?"Official source reachable":s.availability==="unchecked"||!s.availability?"Not live-checked":"Source check unavailable"}</span></header>
          <h3>{s.title}</h3>
          <p className="ere-summary">{s.summary}</p>
          <dl>
            <div><dt>Category</dt><dd>{s.category}</dd></div>
            <div><dt>Evidence type</dt><dd>{s.evidence_type}</dd></div>
            <div><dt>Model / population</dt><dd>{s.population_or_model}</dd></div>
            <div><dt>Use in DMD-AI</dt><dd>{s.intended_use}</dd></div>
          </dl>
          <footer><span>{s.source_id||"Official web source"}</span><a href={s.official_url} target="_blank" rel="noreferrer">Open official source <ExternalLink/></a></footer>
        </article>)}
      </div>
    </section>

    <section className="ere-boundary">
      <Database/><div><h2>What this engine will and will not do</h2>
      <p><strong>It can:</strong> organize authoritative evidence, expose provenance, support research discovery, inform future model design, and help clinicians/families find relevant official resources.</p>
      <p><strong>It will not:</strong> combine unrelated NASA muscle-loss experiments with DMD carrier labels to inflate prediction accuracy, infer a diagnosis from WHO population data, or silently turn experimental research into treatment advice.</p></div>
    </section>
  </main>;
}
