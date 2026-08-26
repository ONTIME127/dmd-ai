import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CalendarDays, ClipboardList, FileText, Info, RefreshCw,
  ShieldCheck, TrendingUp, Activity, CheckCircle2, AlertTriangle, Printer,
  Copy, Home, ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { syncPendingAssessment } from "../lib/familyAssessment";
import "../styles/portal.css";
import "./FamilyAssessments.css";

type History = {
  age?: string; duration?: string; progression?: string; walking?: string;
  familyHistory?: string; lostAbilities?: string[]; selectedSymptoms?: string[];
  [key:string]: unknown;
};

type Assessment = {
  id:string; narrative:string; result_level:string; result_title:string; result_summary:string;
  clinician_summary:string; detected_features:string[]; reasons:string[]; occurred_at:string;
  structured_history:History; next_steps?:string[]; uncertainty?:string[];
};

type Tab = "timeline"|"progression"|"report";

const levelLabel=(level:string)=> level==="priority"?"Prompt evaluation":level==="review"?"Medical review recommended":"Limited pattern overlap";
const dateText=(value:string)=>new Date(value).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"});
const arr=(value:unknown)=>Array.isArray(value)?value.filter((x):x is string=>typeof x==="string"):[];
const uniq=(values:string[])=>[...new Set(values.filter(Boolean))];

export default function FamilyAssessments(){
  const navigate=useNavigate();
  const [items,setItems]=useState<Assessment[]>([]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [tab,setTab]=useState<Tab>("timeline");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [copied,setCopied]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true); setError("");
    try{
      await syncPendingAssessment();
      const {data,error:qError}=await supabase.from("family_assessments")
        .select("id,narrative,result_level,result_title,result_summary,clinician_summary,detected_features,reasons,occurred_at,structured_history,next_steps,uncertainty")
        .order("occurred_at",{ascending:false});
      if(qError) throw qError;
      const rows=(data||[]) as Assessment[];
      setItems(rows);
      setSelectedId(current=>current&&rows.some(x=>x.id===current)?current:(rows[0]?.id??null));
    }catch(e){setError(e instanceof Error?e.message:"Unable to load assessments.");}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load(); const h=()=>void load(); window.addEventListener("dmd-assessment-synced",h); return()=>window.removeEventListener("dmd-assessment-synced",h)},[load]);

  const selected=items.find(x=>x.id===selectedId)??items[0]??null;
  const chronological=useMemo(()=>[...items].sort((a,b)=>new Date(a.occurred_at).getTime()-new Date(b.occurred_at).getTime()),[items]);

  const progression=useMemo(()=>chronological.map((current,index)=>{
    const previous=index?chronological[index-1]:null;
    const currentFeatures=uniq([...(current.detected_features||[]),...arr(current.structured_history?.lostAbilities).map(x=>`Loss/difficulty: ${x}`)]);
    const previousFeatures=previous?uniq([...(previous.detected_features||[]),...arr(previous.structured_history?.lostAbilities).map(x=>`Loss/difficulty: ${x}`)]):[];
    const added=currentFeatures.filter(x=>!previousFeatures.includes(x));
    const noLongerReported=previousFeatures.filter(x=>!currentFeatures.includes(x));
    return {current,previous,added,noLongerReported};
  }),[chronological]);

  const latest=chronological.at(-1)??null;
  const earliest=chronological[0]??null;
  const allFeatures=uniq(items.flatMap(x=>x.detected_features||[]));
  const allLost=uniq(items.flatMap(x=>arr(x.structured_history?.lostAbilities)));

  const reportText=useMemo(()=>{
    if(!latest) return "";
    const lines=[
      "DMD-AI — FAMILY-REPORTED HISTORY SUMMARY",
      "Family-reported information — not a diagnosis",
      "",
      `Prepared: ${new Date().toLocaleString()}`,
      `Assessments recorded: ${items.length}`,
      earliest?`History period: ${new Date(earliest.occurred_at).toLocaleDateString()} to ${new Date(latest.occurred_at).toLocaleDateString()}`:"",
      "",
      "LATEST FAMILY-REPORTED HISTORY",
      latest.clinician_summary||latest.narrative,
      "",
      "FEATURES REPORTED ACROSS SAVED ASSESSMENTS",
      allFeatures.length?allFeatures.map(x=>`• ${x}`).join("\n"):"• None recorded",
      "",
      "ABILITIES REPORTED AS HARDER OR LOST",
      allLost.length?allLost.map(x=>`• ${x}`).join("\n"):"• None recorded",
      "",
      "LATEST GUIDANCE",
      latest.result_title,
      latest.result_summary,
      "",
      "QUESTIONS / NEXT STEPS TO DISCUSS WITH A QUALIFIED CLINICIAN",
      ...(latest.next_steps?.length?latest.next_steps:["Review the reported changes and progression history with a qualified healthcare professional."]).map(x=>`• ${x}`),
      "",
      "IMPORTANT",
      "This summary organizes family-reported observations. It is not a diagnosis and does not replace clinical examination, laboratory testing, genetic testing, or professional medical judgment."
    ];
    return lines.filter(x=>x!==undefined).join("\n");
  },[latest,earliest,items.length,allFeatures,allLost]);

  const copyReport=async()=>{try{await navigator.clipboard.writeText(reportText);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}catch{/* browser may block clipboard */}};

  return <main className="family-assessment-v5">
    <header className="fav5-header">
      <button className="fav5-back" onClick={()=>navigate('/family')}><ArrowLeft/> Family Portal</button>
      <div className="fav5-heading"><span>FAMILY HEALTH HISTORY</span><h1>Assessments & Progress</h1><p>Review saved observations, see what changed over time, and prepare a clear history for a healthcare visit.</p></div>
      <div className="fav5-header-actions"><button onClick={()=>navigate('/#assistant')}><Home/> New assessment</button><button onClick={()=>void load()}><RefreshCw/> Refresh</button></div>
    </header>

    <section className="fav5-safety"><ShieldCheck/><div><strong>Family-reported information — not a diagnosis.</strong><p>DMD-AI keeps your observations separate from clinical findings. Only a qualified healthcare professional can diagnose DMD or another condition.</p></div></section>

    <nav className="fav5-tabs" aria-label="Assessment views">
      <button className={tab==="timeline"?"active":""} onClick={()=>setTab("timeline")}><ClipboardList/> My Assessments <span>{items.length}</span></button>
      <button className={tab==="progression"?"active":""} onClick={()=>setTab("progression")}><TrendingUp/> Progression</button>
      <button className={tab==="report"?"active":""} onClick={()=>setTab("report")}><FileText/> Healthcare Visit Report</button>
    </nav>

    {error&&<div className="fav5-error"><AlertTriangle/>{error}</div>}
    {loading?<div className="fav5-empty"><Activity className="spin"/><h2>Loading your saved history…</h2></div>:items.length===0?<div className="fav5-empty"><ClipboardList/><h2>No saved assessments yet</h2><p>Complete the guided assessment. Once signed in, your saved assessment can appear here as part of your private history.</p><button onClick={()=>navigate('/#assistant')}>Start an assessment</button></div>:<>

      {tab==="timeline"&&<div className="fav5-timeline-layout">
        <section className="fav5-list" aria-label="Saved assessments">
          <div className="fav5-section-title"><div><span>PRIVATE TIMELINE</span><h2>Your saved assessments</h2></div><small>Newest first</small></div>
          {items.map((item,index)=><button key={item.id} className={`fav5-list-item ${selected?.id===item.id?'active':''}`} onClick={()=>setSelectedId(item.id)}>
            <div className="fav5-list-top"><span className={`fav5-level ${item.result_level}`}>{levelLabel(item.result_level)}</span>{index===0&&<em>Latest</em>}</div>
            <strong>{item.result_title}</strong><p>{item.narrative||item.result_summary}</p>
            <small><CalendarDays/> {dateText(item.occurred_at)}</small><ChevronRight className="chev"/>
          </button>)}
        </section>
        <aside className="fav5-detail">
          {selected&&<><div className="fav5-detail-head"><span className={`fav5-level ${selected.result_level}`}>{levelLabel(selected.result_level)}</span><small>{dateText(selected.occurred_at)}</small></div>
          <h2>{selected.result_title}</h2><p className="fav5-summary">{selected.result_summary}</p>
          <div className="fav5-detail-block"><h3>What your family described</h3><blockquote>{selected.narrative||"No free-text description was saved."}</blockquote></div>
          <div className="fav5-detail-block"><h3>Features recorded</h3><div className="fav5-chips">{(selected.detected_features||[]).length?(selected.detected_features||[]).map(x=><span key={x}>{x}</span>):<p>No structured features were saved.</p>}</div></div>
          <div className="fav5-detail-grid"><div><h3>Progression reported</h3><strong>{String(selected.structured_history?.progression||"Not recorded")}</strong></div><div><h3>Walking / mobility</h3><strong>{String(selected.structured_history?.walking||"Not recorded")}</strong></div></div>
          <div className="fav5-detail-block"><h3>Why this guidance was shown</h3><ul>{(selected.reasons||[]).map(x=><li key={x}>{x}</li>)}</ul></div>
          <div className="fav5-clinician"><Info/><div><strong>Clinician-ready history from this assessment</strong><p>{selected.clinician_summary}</p></div></div></>}
        </aside>
      </div>}

      {tab==="progression"&&<section className="fav5-progression">
        <div className="fav5-section-title"><div><span>CHANGE OVER TIME</span><h2>Family-reported progression timeline</h2><p>This view compares saved reports. A change here means the family reported something differently; it is not a clinical measurement.</p></div></div>
        <div className="fav5-stats"><article><span>Saved assessments</span><strong>{items.length}</strong></article><article><span>Features reported</span><strong>{allFeatures.length}</strong></article><article><span>Abilities harder/lost</span><strong>{allLost.length}</strong></article><article><span>Latest progression</span><strong className="text-stat">{String(latest?.structured_history?.progression||"Not recorded")}</strong></article></div>
        <div className="fav5-progress-list">{[...progression].reverse().map(({current,previous,added,noLongerReported},index)=><article key={current.id} className="fav5-progress-card">
          <div className="fav5-progress-marker"><span></span>{index<progression.length-1&&<i/>}</div>
          <div className="fav5-progress-body"><div className="fav5-progress-head"><div><small>{dateText(current.occurred_at)}</small><h3>{current.result_title}</h3></div><span className={`fav5-level ${current.result_level}`}>{levelLabel(current.result_level)}</span></div>
          {!previous?<div className="fav5-baseline"><CheckCircle2/><p><strong>Baseline saved.</strong> This is the first saved family report, so later assessments can be compared with it.</p></div>:<div className="fav5-change-grid"><div><h4>Newly reported in this assessment</h4>{added.length?<ul>{added.map(x=><li key={x}>{x}</li>)}</ul>:<p>No new structured features were reported compared with the previous saved assessment.</p>}</div><div><h4>Not reported this time</h4>{noLongerReported.length?<ul>{noLongerReported.map(x=><li key={x}>{x}</li>)}</ul>:<p>No previously saved structured features disappeared from this report.</p>}</div></div>}
          <div className="fav5-progress-meta"><span><b>Progression:</b> {String(current.structured_history?.progression||"Not recorded")}</span><span><b>Mobility:</b> {String(current.structured_history?.walking||"Not recorded")}</span></div></div>
        </article>)}</div>
      </section>}

      {tab==="report"&&<section className="fav5-report">
        <div className="fav5-report-toolbar"><div><span>FOR YOUR HEALTHCARE VISIT</span><h2>Family-reported history summary</h2><p>A concise record you can copy or print and bring to a qualified healthcare professional.</p></div><div><button onClick={copyReport}><Copy/>{copied?"Copied":"Copy summary"}</button><button className="primary" onClick={()=>window.print()}><Printer/> Print report</button></div></div>
        <article className="fav5-report-paper">
          <div className="fav5-report-brand"><div><ShieldCheck/><div><strong>DMD-AI</strong><span>Duchenne Intelligence</span></div></div><span>FAMILY-REPORTED HISTORY</span></div>
          <div className="fav5-report-warning"><Info/><div><strong>Family-reported information — not a diagnosis</strong><p>This document organizes observations entered by the family. It does not replace clinical examination, diagnostic testing, or professional medical judgment.</p></div></div>
          <div className="fav5-report-grid"><div><span>Assessments</span><strong>{items.length}</strong></div><div><span>History period</span><strong>{earliest&&latest?`${new Date(earliest.occurred_at).toLocaleDateString()} — ${new Date(latest.occurred_at).toLocaleDateString()}`:"—"}</strong></div><div><span>Latest progression</span><strong>{String(latest?.structured_history?.progression||"Not recorded")}</strong></div><div><span>Latest mobility</span><strong>{String(latest?.structured_history?.walking||"Not recorded")}</strong></div></div>
          <section><h3>Latest family description</h3><p>{latest?.narrative||"No narrative was saved."}</p></section>
          <section><h3>Latest structured history</h3><p>{latest?.clinician_summary}</p></section>
          <div className="fav5-report-columns"><section><h3>Features reported across saved assessments</h3>{allFeatures.length?<ul>{allFeatures.map(x=><li key={x}>{x}</li>)}</ul>:<p>None recorded.</p>}</section><section><h3>Abilities reported as harder or lost</h3>{allLost.length?<ul>{allLost.map(x=><li key={x}>{x}</li>)}</ul>:<p>None recorded.</p>}</section></div>
          <section><h3>Latest guidance shown by DMD-AI</h3><strong>{latest?.result_title}</strong><p>{latest?.result_summary}</p></section>
          <section><h3>Points to discuss with a healthcare professional</h3><ul>{(latest?.next_steps?.length?latest.next_steps:["Review the reported changes and progression history with a qualified healthcare professional."]).map(x=><li key={x}>{x}</li>)}</ul></section>
          <footer><ShieldCheck/><p><strong>Evidence-informed, not diagnostic.</strong> Clinical judgment and appropriate testing always take priority over an online assessment.</p></footer>
        </article>
      </section>}
    </>}
  </main>
}
