import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ChevronDown, ChevronUp, Dna, FileCheck2, HeartHandshake,
  Info, ShieldCheck, Sparkles, TestTube2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./CarrierMlResearch.css";

const API = "http://127.0.0.1:8000";

type ModelInfo = {
  model_name?: string;
  model_type?: string;
  model_version?: string;
  validation?: Record<string, number | null>;
  dataset_note?: string;
};

type Prediction = {
  research_score: number;
  research_score_percent: number;
  label: string;
  model_version: string;
  interpretation: string;
  next_step: string;
};

const labels: Record<string,string> = {
  age: "Age (years)",
  creatine_kinase: "Creatine kinase (CK)",
  hemopexin: "Hemopexin",
  pyruvate_kinase: "Pyruvate kinase (PK)",
  lactate_dehydrogenase: "Lactate dehydrogenase (LDH)"
};

function familyLabel(score:number){
  if(score < .33) return {
    level:"Lower pattern match",
    copy:"The entered values show a lower similarity to carrier patterns in the historical research dataset."
  };
  if(score < .67) return {
    level:"Intermediate pattern match",
    copy:"The entered values show an intermediate similarity to carrier patterns in the historical research dataset."
  };
  return {
    level:"Higher pattern match",
    copy:"The entered values show a higher similarity to carrier patterns in the historical research dataset."
  };
}

export default function CarrierMlResearch(){
  const navigate = useNavigate();
  const [model,setModel] = useState<ModelInfo|null>(null);
  const [serverOk,setServerOk] = useState(false);
  const [error,setError] = useState("");
  const [prediction,setPrediction] = useState<Prediction|null>(null);
  const [busy,setBusy] = useState(false);
  const [technical,setTechnical] = useState(false);
  const [values,setValues] = useState<Record<string,string>>({
    age:"",creatine_kinase:"",hemopexin:"",
    pyruvate_kinase:"",lactate_dehydrogenase:""
  });

  useEffect(()=>{
    Promise.all([
      fetch(`${API}/api/health`).then(r=>{if(!r.ok) throw new Error("DMD-AI intelligence service is unavailable."); return r.json();}),
      fetch(`${API}/api/ml/model-info`).then(r=>{if(!r.ok) throw new Error("Model information is unavailable."); return r.json();})
    ]).then(([,info])=>{
      setServerOk(true);
      setModel(info);
      setError("");
    }).catch(e=>{
      setServerOk(false);
      setError(e instanceof Error ? e.message : "Carrier support service is unavailable.");
    });
  },[]);

  const ready = useMemo(
    ()=>Object.values(values).every(v=>v!=="" && !Number.isNaN(Number(v)) && Number(v)>0),
    [values]
  );

  const run = async()=>{
    if(!ready || !serverOk) return;
    setBusy(true); setError(""); setPrediction(null);
    try{
      const body = Object.fromEntries(Object.entries(values).map(([k,v])=>[k,Number(v)]));
      const r = await fetch(`${API}/api/ml/carrier-screen`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body)
      });
      const data = await r.json();
      if(!r.ok) throw new Error(data.detail || "DMD-AI could not review these values.");
      setPrediction(data);
    }catch(e){
      setError(e instanceof Error ? e.message : "Unable to review these values.");
    }finally{
      setBusy(false);
    }
  };

  const friendly = prediction ? familyLabel(prediction.research_score) : null;

  return <main className="carrier-family-page">
    <header className="carrier-family-header">
      <button onClick={()=>navigate("/family")}><ArrowLeft/> Family Portal</button>
      <div>
        <span>GENETICS & FAMILY PLANNING SUPPORT</span>
        <h1>DMD Carrier Screening Support</h1>
        <p>Use selected laboratory information as a research-supported prompt for what to discuss with a genetics professional.</p>
      </div>
    </header>

    <section className="carrier-family-warning">
      <ShieldCheck/>
      <div>
        <strong>This does not diagnose DMD or confirm carrier status.</strong>
        <p>A real carrier determination should be based on molecular DMD genetic testing, the family's known DMD variant where available, and qualified genetic counselling.</p>
      </div>
    </section>

    <div className="carrier-family-grid">
      <section className="carrier-family-card">
        <div className="carrier-card-title"><TestTube2/><div><span>LABORATORY INFORMATION</span><h2>Enter available serum-marker values</h2></div></div>
        <p className="carrier-help">Only enter values from an actual laboratory report. If you do not have these tests, do not guess the numbers.</p>
        <div className="carrier-fields">
          {Object.keys(values).map(k=><label key={k}>
            <span>{labels[k]}</span>
            <input type="number" step="any" value={values[k]}
              onChange={e=>{setValues(v=>({...v,[k]:e.target.value}));setPrediction(null)}}
              placeholder="Enter value"/>
          </label>)}
        </div>
        <button className="carrier-run" disabled={!ready || !serverOk || busy} onClick={run}>
          <Sparkles/> {busy ? "Reviewing values…" : "Review research pattern"}
        </button>
        {!serverOk && <p className="carrier-error">{error || "DMD-AI intelligence service is not connected."}</p>}
      </section>

      <section className="carrier-family-card carrier-result">
        <div className="carrier-card-title"><Dna/><div><span>SCREENING SUPPORT</span><h2>What the research pattern shows</h2></div></div>

        {!prediction ? <div className="carrier-empty">
          <HeartHandshake/>
          <h3>No result yet</h3>
          <p>Enter the available laboratory values and DMD-AI will compare their pattern with the historical research dataset.</p>
        </div> : <>
          <div className={`carrier-level ${prediction.research_score < .33 ? "lower" : prediction.research_score < .67 ? "middle" : "higher"}`}>
            <span>RESEARCH-PATTERN RESULT</span>
            <strong>{friendly?.level}</strong>
            <p>{friendly?.copy}</p>
          </div>

          <div className="carrier-next">
            <FileCheck2/>
            <div>
              <strong>Recommended next step</strong>
              <p>Discuss molecular DMD genetic testing and genetic counselling with a qualified healthcare professional, especially if there is a known DMD diagnosis or variant in the family.</p>
            </div>
          </div>

          <div className="carrier-boundary">
            <Info/>
            <p><strong>Why no carrier percentage is shown:</strong> the model score is not a person's probability of being a carrier. Showing it as a large percentage can be medically misleading.</p>
          </div>
        </>}
      </section>
    </div>

    <section className="carrier-genetic-path">
      <div><span>1</span><strong>Family history</strong><p>Document who is affected and any known DMD variant.</p></div>
      <i/>
      <div><span>2</span><strong>Genetic counselling</strong><p>Review inheritance, testing choices and reproductive questions.</p></div>
      <i/>
      <div><span>3</span><strong>Molecular testing</strong><p>Use appropriate DMD genetic testing for confirmation.</p></div>
      <i/>
      <div><span>4</span><strong>Clinical interpretation</strong><p>Discuss the verified result and next steps with the care team.</p></div>
    </section>

    <section className="carrier-technical">
      <button onClick={()=>setTechnical(v=>!v)}>
        <span><Info/> Model & validation details</span>
        {technical ? <ChevronUp/> : <ChevronDown/>}
      </button>
      {technical && <div className="carrier-tech-body">
        <p>This section is provided for transparency. These metrics describe model performance on historical research data; they do not establish clinical validity for an individual person.</p>
        <div className="carrier-tech-grid">
          <div><span>Model</span><strong>{model?.model_type || "—"}</strong></div>
          <div><span>Version</span><strong>{model?.model_version || "—"}</strong></div>
          <div><span>Training rows</span><strong>{model?.validation?.rows_used ?? "—"}</strong></div>
          <div><span>Cross-validation AUROC</span><strong>{model?.validation?.roc_auc ?? "—"}</strong></div>
          <div><span>Sensitivity</span><strong>{model?.validation?.sensitivity ?? "—"}</strong></div>
          <div><span>Specificity</span><strong>{model?.validation?.specificity ?? "—"}</strong></div>
        </div>
        <p className="carrier-tech-note">{model?.dataset_note || "Historical labelled carrier-screening dataset."}</p>
      </div>}
    </section>
  </main>;
}
