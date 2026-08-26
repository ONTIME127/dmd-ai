import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Users, ClipboardList, FileText, Heart, CalendarDays, Dna, Pill,
  UserRoundCheck, MessageSquareText, BookOpen, Bell, ChevronDown, HeartHandshake,
  ShieldCheck, TrendingUp, ArrowRight, Info, Stethoscope, BookOpenCheck, FlaskConical
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { syncPendingAssessment } from "../lib/familyAssessment";
import FamilyPortalLegacy from "./FamilyPortalLegacy";
import familyHero from "../assets/hero.png";
import "../styles/familyDashboardV6.css";

import FamilyConnectedCare from "../components/FamilyConnectedCare";
type AssessmentRow = {
  id:string;
  result_level:string;
  result_title:string;
  result_summary:string;
  detected_features:string[] | null;
  next_steps:string[] | null;
  occurred_at:string;
  structured_history:Record<string,unknown> | null;
};

type LegacySection =
  | "Family Members" | "Medical Records" | "Care Journey" | "Appointments"
  | "Genetics & Testing" | "Medications" | "Care Team" | "Questions" | "Resources";

const navigation = [
  {label:"Overview",icon:Home},
  {label:"Family Members",icon:Users},
  {label:"Assessments & Progress",icon:ClipboardList},
  {label:"Medical Records",icon:FileText},
  {label:"Care Journey",icon:Heart},
  {label:"Appointments",icon:CalendarDays},
  {label:"Genetics & Testing",icon:Dna},
  {label:"ML Carrier Research",icon:FlaskConical},
  {label:"Medications",icon:Pill},
  {label:"Care Team",icon:UserRoundCheck},
  {label:"Questions",icon:MessageSquareText},
  {label:"Resources",icon:BookOpen},
  {label:"Evidence & Research",icon:BookOpenCheck},
] as const;

const prettyDate=(value?:string|null)=>{
  if(!value) return "No saved assessment";
  return new Date(value).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
};

function initials(name:string){
  const parts=name.trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return "FA";
  return parts.slice(0,2).map(x=>x[0]?.toUpperCase()).join("");
}

function levelLabel(level?:string){
  if(level==="priority") return "Review";
  if(level==="review") return "Review";
  if(level==="urgent") return "Urgent";
  if(level==="acute") return "Review";
  return "Saved";
}

function LegacyBridge({section,onOverview}:{section:LegacySection;onOverview:()=>void}){
  useEffect(()=>{
    let tries=0;
    const timer=window.setInterval(()=>{
      tries+=1;
      const buttons=[...document.querySelectorAll<HTMLButtonElement>(".family-nav button")];
      const target=buttons.find(btn=>btn.textContent?.replace(/\s+/g," ").trim().includes(section));
      if(target){target.click();window.clearInterval(timer)}
      if(tries>20) window.clearInterval(timer);
    },80);
    return()=>window.clearInterval(timer);
  },[section]);

  return <div
    className="fdv6-legacy-bridge"
    onClickCapture={(event)=>{
      const el=event.target as HTMLElement;
      const button=el.closest("button");
      if(button?.textContent?.replace(/\s+/g," ").trim()==="Overview"){
        event.preventDefault();
        event.stopPropagation();
        onOverview();
      }
    }}
  ><FamilyPortalLegacy/></div>;
}

export default function FamilyPortal(){
  const navigate=useNavigate();
  const [legacySection,setLegacySection]=useState<LegacySection|null>(null);
  const [name,setName]=useState("Family");
  const [assessmentRows,setAssessmentRows]=useState<AssessmentRow[]>([]);
  const [familyCount,setFamilyCount]=useState(0);
  const [appointmentCount,setAppointmentCount]=useState(0);
  const [,setLoading]=useState(true);

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      setLoading(true);
      try{await syncPendingAssessment()}catch(e){console.warn("Pending assessment sync:",e)}
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){if(active)setLoading(false);return}
      const profile=await supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle();
      if(active){
        const full=(profile.data as {full_name?:string}|null)?.full_name?.trim();
        setName(full||user.user_metadata?.full_name||"Family");
      }
      const assessments=await supabase.from("family_assessments")
        .select("id,result_level,result_title,result_summary,detected_features,next_steps,occurred_at,structured_history")
        .eq("user_id",user.id).order("occurred_at",{ascending:false}).limit(8);
      if(!assessments.error&&active)setAssessmentRows((assessments.data||[]) as AssessmentRow[]);

      // Optional existing tables: failures are intentionally non-fatal.
      const families=await supabase.from("patients").select("id",{count:"exact",head:true}).eq("family_owner_id",user.id);
      if(!families.error&&active)setFamilyCount(families.count||0);

      const appointments=await supabase.from("family_appointments").select("id",{count:"exact",head:true}).eq("created_by",user.id).gte("appointment_at",new Date().toISOString()).neq("status","cancelled");
      if(!appointments.error&&active)setAppointmentCount(appointments.count||0);
      setLoading(false);
    };
    void load();
    const refresh=()=>void load();
    window.addEventListener("dmd-assessment-synced",refresh);
    return()=>{active=false;window.removeEventListener("dmd-assessment-synced",refresh)};
  },[]);

  const latest=assessmentRows[0]||null;
  const previous=assessmentRows.slice(1,3);
  const features=useMemo(()=>latest?.detected_features?.slice(0,3)||[],[latest]);
  const latestProgression=String(latest?.structured_history?.progression||"Not recorded");
  const familyTitle=name.endsWith("Family")?name:`${name.split(" ")[0] || "Your"}'s Family`;

  if(legacySection){
    return <LegacyBridge section={legacySection} onOverview={()=>setLegacySection(null)}/>;
  }

  const openNav=(label:string)=>{
    if(label==="Overview") return;
    if(label==="Assessments & Progress"){navigate("/family/assessments");return}
    if(label==="Evidence & Research"){navigate("/family/evidence");return}
    if(label==="ML Carrier Research"){navigate("/family/genetics-ml");return}
    setLegacySection(label as LegacySection);
  };

  return <div className="fdv6-shell">
    <aside className="fdv6-sidebar">
      <div className="fdv6-brand">
        <HeartHandshake/>
        <div><strong>DMD-AI</strong><span>Family Portal</span></div>
      </div>

      <nav className="fdv6-nav">
        {navigation.map(({label,icon:Icon})=><button key={label} className={label==="Overview"?"active":""} onClick={()=>openNav(label)}>
          <Icon/><span>{label}</span>
        </button>)}
      </nav>

      <section className="fdv6-alone">
        <Heart/>
        <div><strong>You are not alone.</strong><p>DMD-AI is here to support your family every step of the way.</p></div>
      </section>

      <div className="fdv6-account">
        <span>{initials(name)}</span>
        <div><strong>{name}</strong><small>Family Account</small></div>
        <ChevronDown/>
      </div>
    </aside>

    <main className="fdv6-main">
      <header className="fdv6-topbar">
        <div className="fdv6-slogan"><Heart/> <strong>Smarter information. Stronger decisions. A better tomorrow.</strong></div>
        <div className="fdv6-topright"><button aria-label="Notifications"><Bell/><i/></button><div className="fdv6-mini-avatar">{initials(name)}</div><div><strong>Welcome, {familyTitle}</strong><small>Family Member</small></div><ChevronDown/></div>
      </header>

      <div className="fdv6-content">
        <section className="fdv6-hero">
          <img src={familyHero} alt="" />
          <div className="fdv6-hero-fade"/>
          <div className="fdv6-hero-copy"><h1>Welcome back!<span>{familyTitle}</span></h1><p>Track changes, stay informed, and take<br/>confident next steps.</p><i/></div>
        </section>

        <section className="fdv6-stats">
          <article><Users/><div><span>Family Members</span><strong>{familyCount}</strong><small>Active in your account</small></div></article>
          <article><ClipboardList/><div><span>Assessments</span><strong>{assessmentRows.length}</strong><small>{latest?`Latest: ${prettyDate(latest.occurred_at)}`:"No saved assessments yet"}</small></div></article>
          <article><Heart/><div><span>Care Reminders</span><strong>{appointmentCount}</strong><small>Upcoming visits / checks</small></div></article>
          <article><ShieldCheck/><div><span>Account Status</span><strong className="secure">Secure</strong><small>Your data is private</small></div></article>
        </section>

        <section className="fdv6-dashboard-grid">
          <article className="fdv6-card fdv6-latest">
            <header><div><ClipboardList/><h2>Latest Assessment</h2></div>{latest&&<span className="saved">Saved</span>}</header>
            {latest?<div className="fdv6-latest-body">
              <div className="fdv6-date-row"><CalendarDays/><strong>{prettyDate(latest.occurred_at)}</strong><span className="review">{levelLabel(latest.result_level)}</span></div>
              <h3>Key reported changes:</h3>
              <ul>{features.length?features.map(x=><li key={x}>{x}</li>):<li>No structured features recorded</li>}</ul>
              <div className="fdv6-guidance"><Heart/><div><strong>DMD-AI Guidance:</strong><p>{latest.result_summary}</p></div></div>
              <button onClick={()=>navigate("/family/assessments")}>View Assessment History <ArrowRight/></button>
            </div>:<div className="fdv6-empty-assessment"><ClipboardList/><h3>No saved assessment yet</h3><p>Complete a guided assessment to begin your family history.</p><button onClick={()=>navigate("/#assistant")}>Take an assessment <ArrowRight/></button></div>}
          </article>

          <article className="fdv6-card fdv6-progress">
            <header><TrendingUp/><h2>Progression Timeline</h2></header>
            <div className="fdv6-timeline">
              {latest?<><div className="fdv6-time active"><i/><div><strong>{prettyDate(latest.occurred_at)}</strong><b>Latest assessment</b><span>{latestProgression==="worse"?"Review needed":"Saved assessment"}</span></div></div>
              {previous.map((row,index)=><div className="fdv6-time" key={row.id}><i/><div><strong>{prettyDate(row.occurred_at)}</strong><b>{index===0?"Previous assessment":"Baseline assessment"}</b><span>{String(row.structured_history?.progression||"Monitoring changes")}</span></div></div>)}</>:<div className="fdv6-time active"><i/><div><strong>Start here</strong><b>Baseline assessment</b><span>Your first saved assessment will appear here.</span></div></div>}
            </div>
            <div className="fdv6-trend"><Info/><span><strong>Trend:</strong> {assessmentRows.length>1?"Changes can be compared across your saved assessments.":"Complete more than one assessment to compare changes over time."}</span></div>
          </article>

          <div className="fdv6-right">
            <article className="fdv6-card fdv6-reminders">
              <header><CalendarDays/><h2>Upcoming Care Reminders</h2><button onClick={()=>setLegacySection("Appointments")}>View All</button></header>
              {appointmentCount>0?<><div className="fdv6-reminder"><CalendarDays/><div><strong>Upcoming care visit</strong><span>Open Appointments for details</span></div><em>Upcoming</em></div><div className="fdv6-reminder"><CalendarDays/><div><strong>Care follow-up</strong><span>Review your scheduled care</span></div><em>Upcoming</em></div></>:<div className="fdv6-reminder-empty"><CalendarDays/><p>No upcoming care reminders yet.</p></div>}
            </article>
            <article className="fdv6-family-first"><HeartHandshake/><div><h2>Families First</h2><p>You are not alone. DMD-AI is here with information, support and clear next steps.</p></div><ArrowRight/></article>
            <article className="fdv6-privacy"><ShieldCheck/><div><h3>Privacy & Trust</h3><p>Your family's information is private and always secure.</p></div></article>
          </div>
        </section>

        <FamilyConnectedCare />

        <section className="fdv6-actions">
          <button onClick={()=>navigate("/#assistant")}><ClipboardList/><span>Take an<br/>Assessment</span></button>
          <button onClick={()=>setLegacySection("Family Members")}><Users/><span>Manage<br/>Family Members</span></button>
          <button onClick={()=>setLegacySection("Medical Records")}><FileText/><span>View Medical<br/>Records</span></button>
          <button onClick={()=>setLegacySection("Questions")}><Stethoscope/><span>Questions for<br/>Clinician</span></button>
          <button onClick={()=>setLegacySection("Resources")}><BookOpen/><span>Resources</span></button>
        </section>
      </div>
    </main>
  </div>;
}
