import { Activity, BarChart3, FlaskConical, Network, ShieldCheck, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PublicNavbar from "../../components/public/PublicNavbar";
import hospitalHero from "../../assets/public/hospital-hero.jpg";
import "./PublicPages.css";

export default function ForHospitals(){
 const navigate=useNavigate();
 const solutions=[
  [Activity,"Clinical Intelligence","Bring DMD-specific longitudinal data together so clinicians can review changes and underlying evidence.","intelligence"],
  [UsersRound,"Patient 360°","See family-reported history, verified clinical records, genetics, labs, function and care history in one place.","patient360"],
  [Network,"DMD Care Coordination","Support multidisciplinary teams around one disease-focused patient record.","coordination"],
  [BarChart3,"Outcomes & Analytics","Track trends, follow-up gaps and changes across time without replacing your existing EHR.","analytics"],
  [FlaskConical,"Research & Registry","Build governed research and registry infrastructure with clear consent and role boundaries.","research"],
 ] as const;
 return <main className="public-page"><PublicNavbar/>
  <section className="public-hero hospital-hero"><div className="public-section"><div className="hospital-hero-copy"><span className="public-kicker"><ShieldCheck size={15}/> Built for healthcare</span><h1>Smarter DMD care. <em>Stronger clinical insight.</em></h1><p>DMD-AI is a Duchenne-specific intelligence and care-coordination layer designed to complement existing hospital systems—not replace them.</p><div className="public-hero-buttons"><button className="public-primary" onClick={()=>document.getElementById("pilot")?.scrollIntoView({behavior:"smooth"})}>Request a pilot</button><button className="public-secondary" onClick={()=>document.getElementById("solutions")?.scrollIntoView({behavior:"smooth"})}>Explore hospital solutions</button></div></div><div className="hero-image-shell"><img src={hospitalHero} alt="Clinicians reviewing patient information"/></div></div></section>
  <section className="public-section hospital-solutions" id="solutions"><h2 className="section-title">DMD-specific capabilities alongside your existing workflow</h2><p className="section-subtitle">The value is not another generic medical record. It is a disease-focused view that helps teams understand what changed, why it matters and where the evidence came from.</p><div className="solution-grid">{solutions.map(([Icon,title,desc,id])=><article id={id} className="solution-card" key={title}><span className="choice-icon"><Icon/></span><strong>{title}</strong><p>{desc}</p><button onClick={()=>document.getElementById("workflow")?.scrollIntoView({behavior:"smooth"})}>Learn more →</button></article>)}</div></section>
  <section className="public-section workflow-panel" id="workflow"><h2 className="section-title">Designed for the clinical workflow</h2><p className="section-subtitle">DMD-AI should sit beside or integrate with existing systems and add the DMD-specific longitudinal layer.</p><div className="workflow-steps">{[["1","Identify","Family-reported change or referral"],["2","Assess","Professional clinical assessment"],["3","Verify","Tests and clinical evidence"],["4","Coordinate","Multidisciplinary care"],["5","Monitor","Longitudinal change and follow-up"]].map(([n,t,d])=><div className="workflow-step" key={n}><span>{n}</span><strong>{t}</strong><small>{d}</small></div>)}</div></section>
  <section className="public-section pilot-banner" id="verification"><div><h2>Verified clinical organizations only</h2><p>Clinical access is unlocked only after organization verification. Hospital applicants submit institution details and evidence for administrator review before patient functionality becomes available.</p></div><button className="public-secondary" onClick={()=>navigate("/signup")}>Start hospital registration</button></section>
  <section className="public-section pilot-banner" id="pilot"><div><h2>Explore DMD-AI with your clinical team</h2><p>For early pilots, we should work directly with neuromuscular clinics and hospitals, observe their workflow and measure whether DMD-AI saves time or improves longitudinal understanding.</p></div><div className="public-hero-buttons"><button className="public-primary" onClick={()=>navigate("/signup")}>Request access</button><button className="public-secondary" onClick={()=>navigate("/login")}>Hospital sign in</button></div></section>
 </main>;
}
