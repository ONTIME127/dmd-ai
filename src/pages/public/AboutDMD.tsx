import {
  Activity, ArrowRight, ChevronRight, Dna, Dumbbell, FileText,
  FlaskConical, Footprints, Heart, HeartPulse, Info, PersonStanding,
  Search, ShieldCheck, Stethoscope, UsersRound
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicNavbar from "../../components/public/PublicNavbar";
import "./AboutDMD.css";

type Country = {
  name:string; flag:string; region:string; population:string;
  prevalence:string; birth:string; quality:"High"|"Moderate"|"Limited";
};

const countries:Country[] = [
 {name:"United States",flag:"🇺🇸",region:"North America",population:"16,000 – 20,000",prevalence:"~1 in 5,000",birth:"~1 in 5,000",quality:"High"},
 {name:"Germany",flag:"🇩🇪",region:"Europe",population:"2,500 – 3,500",prevalence:"~1 in 4,500",birth:"~1 in 4,500",quality:"High"},
 {name:"India",flag:"🇮🇳",region:"Asia",population:"12,000 – 16,000",prevalence:"~1 in 6,000",birth:"~1 in 6,000",quality:"Moderate"},
 {name:"Nigeria",flag:"🇳🇬",region:"Africa",population:"3,000 – 5,000",prevalence:"~1 in 8,000",birth:"~1 in 8,000",quality:"Limited"},
];

const cards = [
 {icon:Dna,title:"Genetic condition",text:"DMD is caused by disease-causing variants affecting the dystrophin gene on the X chromosome. It primarily affects boys."},
 {icon:HeartPulse,title:"Progressive muscle weakness",text:"DMD affects muscle function over time and requires ongoing care. Early support can help maintain mobility and quality of life."},
 {icon:UsersRound,title:"Families + clinicians",text:"Families report lived changes; clinicians examine, test, and guide care. Strong partnerships lead to better outcomes."},
 {icon:ShieldCheck,title:"Care + management",text:"While there is currently no cure for DMD, coordinated care can help manage symptoms and improve daily life."}
];

export default function AboutDMD(){
 const navigate=useNavigate();
 const [selected,setSelected]=useState(countries[0]);
 const [q,setQ]=useState("");
 const filtered=useMemo(()=>countries.filter(c=>c.name.toLowerCase().includes(q.toLowerCase())),[q]);

 return <main className="dmd-about">
  <PublicNavbar/>
  <div className="dmd-about-shell">
   <span className="dmd-kicker"><Dna/> About Duchenne</span>
   <h1>Understanding Duchenne Muscular Dystrophy</h1>
   <p className="dmd-lead">This public page explains DMD in clear language and points families toward qualified healthcare professionals. DMD-AI educational content should support—not replace—clinical diagnosis and care.</p>

   <section className="dmd-info-grid">
    {cards.map(({icon:Icon,title,text})=><article key={title}><i><Icon/></i><h2>{title}</h2><p>{text}</p></article>)}
   </section>

   <section className="dmd-signs">
    <header><div><h2>Common Signs &amp; Symptoms</h2><p>Symptoms typically appear between ages 3 to 6 and progress over time.</p></div><button onClick={()=>navigate("/resources")}>View detailed guide <ArrowRight/></button></header>
    <div className="dmd-sign-row">
     <div><i><PersonStanding/></i><span><b>Delayed motor milestones</b><small>Walking later than usual</small></span></div>
     <div><i><Footprints/></i><span><b>Difficulty climbing stairs</b><small>Trouble with stairs or getting up</small></span></div>
     <div><i><Activity/></i><span><b>Frequent falls</b><small>More falls than other children</small></span></div>
     <div><i><Dumbbell/></i><span><b>Muscle weakness</b><small>Weakness in hips, legs, and shoulders</small></span></div>
     <div><i><PersonStanding/></i><span><b>Calf enlargement</b><small>Calf muscles may appear larger</small></span></div>
    </div>
   </section>

   <section className="dmd-mid">
    <article className="dmd-diagnosis"><h2>How DMD is Diagnosed</h2><p>Diagnosis is based on clinical evaluation, family history, and genetic testing.</p>
     <div>
      <span><i><Stethoscope/></i><b>Clinical evaluation</b><small>Doctors assess motor skills, strength, and development.</small></span>
      <span><i><FlaskConical/></i><b>Genetic testing</b><small>Confirms changes in the dystrophin gene (DMD gene).</small></span>
      <span><i><FileText/></i><b>Specialist care</b><small>Neurologists, therapists, and specialists build a care plan.</small></span>
     </div>
    </article>
    <article className="dmd-support"><i><Heart/></i><div><h2>You Are Not Alone</h2><p>Many families face DMD every day. Getting clear information, support, and the right care team can make a big difference.</p><button onClick={()=>navigate("/resources")}>Find support &amp; resources <ArrowRight/></button></div></article>
   </section>

   <div className="dmd-note"><Info/> DMD-AI provides educational content only. It does not replace professional medical advice, diagnosis, or treatment.</div>

   <section className="dmd-world">
    <div className="dmd-world-top">
     <article className="dmd-map-card">
      <h2>DMD Around the World</h2>
      <p>Explore DMD data by country. We distinguish between reported/registry data and statistical estimates to provide transparency and context.</p>
      <div className="dmd-legend"><span>● High data availability</span><span>● Moderate data availability</span><span>● Limited data availability</span><span>● No data</span></div>
      <div className="world-map-css" aria-label="Stylized world map">
       <div className="continent north-america"/><div className="continent south-america"/><div className="continent europe"/><div className="continent africa"/><div className="continent asia"/><div className="continent australia"/>
      </div>
      <small>Darker purple indicates higher quality and more complete DMD data.</small>
     </article>

     <article className="dmd-country">
      <div className="country-title"><span>{selected.flag}</span><h2>{selected.name}</h2><em>{selected.quality} data availability</em></div>
      <dl>
       <div><dt>Estimated DMD Population</dt><dd><b>{selected.population} people</b><small>Statistical estimate</small></dd></div>
       <div><dt>Prevalence (males)</dt><dd><b>{selected.prevalence} males</b><small>Estimate / available studies</small></dd></div>
       <div><dt>Birth Prevalence</dt><dd><b>{selected.birth} male births</b><small>Statistical estimate</small></dd></div>
       <div><dt>Data Quality</dt><dd><b className="stars">{selected.quality==="High"?"★★★★★":selected.quality==="Moderate"?"★★★☆☆":"★☆☆☆☆"}</b><small>{selected.quality}</small></dd></div>
       <div><dt>DMD Organizations / Registries</dt><dd><b>Country-specific organizations and registries</b><small>Reported resources should be independently verified.</small></dd></div>
       <div><dt>Specialist Centres / Resources</dt><dd><b>Neuromuscular and specialist services</b><small>Availability varies by country and region.</small></dd></div>
      </dl>
      <p className="data-warning">Figures shown in this prototype are statistical estimates unless specifically identified as registry/reported data.</p>
     </article>
    </div>

    <div className="dmd-table-card">
     <label className="country-search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search for a country..."/></label>
     <div className="dmd-table-head"><span>Country</span><span>Region</span><span>Estimated DMD Population</span><span>Prevalence (Males)</span><span>Birth Prevalence</span><span>Data Quality</span><span/></div>
     {filtered.map(c=><button key={c.name} className="dmd-table-row" onClick={()=>setSelected(c)}>
      <span><b>{c.flag}</b>{c.name}</span><span>{c.region}</span><span><b>{c.population}</b><small>Statistical estimate</small></span><span><b>{c.prevalence}</b><small>Available studies</small></span><span><b>{c.birth}</b><small>Statistical estimate</small></span><span><b className="stars">{c.quality==="High"?"★★★★★":c.quality==="Moderate"?"★★★☆☆":"★☆☆☆☆"}</b><small>{c.quality}</small></span><span><ChevronRight/></span>
     </button>)}
     <button className="all-countries">View all countries (195) <ChevronRight/></button>
    </div>
    <p className="dmd-world-foot">Estimates should be based on published prevalence studies and population data. Many countries lack comprehensive registries, so true numbers may differ due to underdiagnosis and incomplete reporting.</p>
   </section>
  </div>
 </main>
}
