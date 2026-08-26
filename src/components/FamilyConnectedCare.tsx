import {useEffect,useMemo,useState} from "react";
import {Activity,Apple,Building2,CheckCircle2,HeartPulse,MapPin,Send,ShieldCheck,Stethoscope,Utensils,Wind} from "lucide-react";
import {supabase} from "../lib/supabase";
import "../styles/familyConnectedCare.css";

type Patient={id:string;full_name?:string;patient_name?:string;name?:string;first_name?:string};
type Checkin={mobility:number;fatigue:number;pain:number;breathing:number;appetite:number;mood:number;falls:number;notes:string};
const blank:Checkin={mobility:3,fatigue:3,pain:1,breathing:4,appetite:4,mood:4,falls:0,notes:""};
const pname=(p?:Patient)=>p?.full_name||p?.patient_name||p?.name||p?.first_name||"family member";
const day=()=>new Date().toISOString().slice(0,10);
const bodyImage="/dmd-care-human.png";

export default function FamilyConnectedCare(){
 const [patients,setPatients]=useState<Patient[]>([]),[patientId,setPatientId]=useState("");
 const [form,setForm]=useState<Checkin>(blank),[saved,setSaved]=useState("");
 const [updates,setUpdates]=useState<any[]>([]),[requests,setRequests]=useState<any[]>([]);
 const [helpOpen,setHelpOpen]=useState(false),[helpMessage,setHelpMessage]=useState("");
 const [help,setHelp]=useState({country:"",region:"",city:"",urgency:"routine",summary:"",shareAssessment:true,shareMedical:false,shareGenetics:false});
 const selected=useMemo(()=>patients.find(p=>p.id===patientId),[patients,patientId]);

 const load=async()=>{
  const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
  const p=await supabase.from("patients").select("*").eq("family_owner_id",user.id);
  if(!p.error){const r=(p.data||[]) as Patient[];setPatients(r);setPatientId(x=>x||r[0]?.id||"")}
  const u=await supabase.from("dmd_provider_updates").select("*").eq("family_owner_id",user.id).order("created_at",{ascending:false}).limit(3);if(!u.error)setUpdates(u.data||[]);
  const q=await supabase.from("dmd_care_requests").select("*").eq("family_owner_id",user.id).order("created_at",{ascending:false}).limit(3);if(!q.error)setRequests(q.data||[]);
 };
 useEffect(()=>{void load()},[]);
 useEffect(()=>{if(!patientId)return;void(async()=>{const r=await supabase.from("dmd_daily_checkins").select("*").eq("patient_id",patientId).eq("checkin_date",day()).maybeSingle();
  if(r.data)setForm({mobility:r.data.mobility??3,fatigue:r.data.fatigue??3,pain:r.data.pain??1,breathing:r.data.breathing??4,appetite:r.data.appetite??4,mood:r.data.mood??4,falls:r.data.falls??0,notes:r.data.notes??""});else setForm(blank)})()},[patientId]);

 const change=(k:keyof Checkin,v:number|string)=>setForm(f=>({...f,[k]:v}));
 const save=async()=>{setSaved("");const {data:{user}}=await supabase.auth.getUser();if(!user||!patientId)return;
  const r=await supabase.from("dmd_daily_checkins").upsert({family_owner_id:user.id,patient_id:patientId,checkin_date:day(),...form},{onConflict:"family_owner_id,patient_id,checkin_date"});
  setSaved(r.error?r.error.message:"Today's wellbeing update is saved.")};
 const sendHelp=async()=>{setHelpMessage("");const {data:{user}}=await supabase.auth.getUser();if(!user||!patientId)return;
  if(!help.country.trim()||!help.city.trim()||!help.summary.trim()){setHelpMessage("Country, city and a short reason for help are required.");return}
  const r=await supabase.from("dmd_care_requests").insert({family_owner_id:user.id,patient_id:patientId,country:help.country.trim(),region:help.region.trim(),city:help.city.trim(),urgency:help.urgency,summary:help.summary.trim(),share_assessment:help.shareAssessment,share_medical_records:help.shareMedical,share_genetics:help.shareGenetics,status:"open"});
  if(r.error)setHelpMessage(r.error.message);else{setHelpMessage(`Request created. For privacy, it is visible only to verified providers whose approved organization matches ${help.country.trim()}${help.region.trim()?` / ${help.region.trim()}`:""}.`);setHelp(x=>({...x,summary:""}));await load()}
 };

 if(!patients.length)return <section className="fcc-empty"><HeartPulse/><div><b>Today's care starts with a family member</b><p>Add a family member from the sidebar, then their daily wellbeing and professional updates will appear here.</p></div></section>;

 return <section className="fcc">
  <div className="fcc-heading"><div><span>TODAY</span><h2>{pname(selected)}'s daily care</h2><p>A simple morning check-in, supportive nutrition reminders and updates from verified professionals.</p></div><select value={patientId} onChange={e=>setPatientId(e.target.value)}>{patients.map(p=><option value={p.id} key={p.id}>{pname(p)}</option>)}</select></div>
  <div className="fcc-grid">
   <article className="fcc-card fcc-body"><div className="fcc-card-head"><div><HeartPulse/><span><b>Body & wellbeing</b><small>Family observation · today</small></span></div><span className="fcc-live">DAILY</span></div>
    <div className="fcc-body-content"><div className="fcc-figure fcc-human"><img src={bodyImage} alt="Full-body daily care figure"/></div><div className="fcc-sliders">
     {([["mobility","Mobility",Activity],["fatigue","Energy",Activity],["pain","Comfort",HeartPulse],["breathing","Breathing",Wind],["appetite","Appetite",Utensils],["mood","Mood",HeartPulse]] as const).map(([k,l,I])=><label key={k}><span><I/>{l}<b>{form[k]}/5</b></span><input type="range" min="1" max="5" value={form[k]} onChange={e=>change(k,Number(e.target.value))}/></label>)}
    </div></div>
    <div className="fcc-observe"><label>Falls today<input type="number" min="0" value={form.falls} onChange={e=>change("falls",Number(e.target.value))}/></label><label>Anything different today?<input value={form.notes} onChange={e=>change("notes",e.target.value)} placeholder="Walking, sleep, pain, breathing, appetite…"/></label><button onClick={save}>Save update</button></div>
    {saved&&<p className="fcc-success"><CheckCircle2/> {saved}</p>}
   </article>
   <article className="fcc-card fcc-food"><div className="fcc-card-head"><div><Apple/><span><b>Today's nutrition</b><small>Supportive food reminders</small></span></div></div>
    <p className="fcc-disclaimer">Food does not cure DMD. Individual needs can change with age, medicines, bone health and swallowing ability.</p>
    <div className="fcc-foods"><div>🥚<span><b>Protein foods</b><small>Eggs, fish, beans, yoghurt or suitable alternatives.</small></span></div><div>🥛<span><b>Calcium-rich foods</b><small>Support bone health as advised by the care team.</small></span></div><div>🥬<span><b>Vegetables</b><small>Include a variety across meals.</small></span></div><div>🍊<span><b>Fruit</b><small>Whole fruit as part of a balanced diet.</small></span></div><div>💧<span><b>Hydration</b><small>Regular fluids unless advised otherwise.</small></span></div></div>
   </article>
  </div>
  <div className="fcc-grid fcc-bottom">
   <article className="fcc-card"><div className="fcc-card-head"><div><Stethoscope/><span><b>Professional care connection</b><small>Get help from a verified provider</small></span></div><button className="fcc-help" onClick={()=>setHelpOpen(v=>!v)}>{helpOpen?"Close":"Request professional help"}</button></div>
    {helpOpen?<div className="fcc-helpform"><div className="fcc-location"><label>Country<input value={help.country} onChange={e=>setHelp({...help,country:e.target.value})}/></label><label>State / region<input value={help.region} onChange={e=>setHelp({...help,region:e.target.value})}/></label><label>City<input value={help.city} onChange={e=>setHelp({...help,city:e.target.value})}/></label></div><label>Priority<select value={help.urgency} onChange={e=>setHelp({...help,urgency:e.target.value})}><option value="routine">Routine follow-up</option><option value="soon">Needs review soon</option><option value="priority">Priority review</option></select></label><label>What help do you need?<textarea rows={3} value={help.summary} onChange={e=>setHelp({...help,summary:e.target.value})}/></label><div className="fcc-consent"><ShieldCheck/><div><b>You control what is shared</b><label><input type="checkbox" checked={help.shareAssessment} onChange={e=>setHelp({...help,shareAssessment:e.target.checked})}/> Latest assessment</label><label><input type="checkbox" checked={help.shareMedical} onChange={e=>setHelp({...help,shareMedical:e.target.checked})}/> Medical records</label><label><input type="checkbox" checked={help.shareGenetics} onChange={e=>setHelp({...help,shareGenetics:e.target.checked})}/> Genetics & testing</label></div></div><button className="fcc-send" onClick={sendHelp}><Send/> Send request</button>{helpMessage&&<p className="fcc-success">{helpMessage}</p>}</div>:
    <div className="fcc-requests">{requests.length?requests.map(r=><div key={r.id}><MapPin/><span><b>{r.provider_organization_name||`${r.city}, ${r.country}`}</b><small>{r.provider_organization_name?`${r.city}, ${r.country} · ${r.summary}`:r.summary}</small>{r.status==="open"&&!r.assigned_organization_id&&<small className="fcc-routing-wait"><ShieldCheck/> Waiting for an approved provider matching {r.country}{r.region?` / ${r.region}`:""}</small>}</span><em className={r.status}>{r.status.replaceAll("_"," ")}</em></div>):<p>No professional care requests yet.</p>}</div>}
   </article>
   <article className="fcc-card"><div className="fcc-card-head"><div><ShieldCheck/><span><b>Latest professional updates</b><small>Updates sent after care/review</small></span></div></div>
    <div className="fcc-updates">{updates.length?updates.map(u=><div key={u.id}><CheckCircle2/><span><b>{u.title||"Care update"}</b><small>{u.summary}</small>{u.provider_organization_name&&<small className="fcc-provider"><Building2/> {u.provider_organization_name}{u.provider_name?` · ${u.provider_name}`:""}</small>}<time>{new Date(u.created_at).toLocaleString()}</time></span></div>):<p>No professional updates yet. When a verified provider sends an update, it will appear here.</p>}</div>
   </article>
  </div>
 </section>
}