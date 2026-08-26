import { BookOpen, Dna, FileHeart, FlaskConical, Globe2, HeartHandshake, Search, Stethoscope, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PublicNavbar from "../../components/public/PublicNavbar";
import resourcesHero from "../../assets/public/resources-hero.jpg";
import resourcesStrip from "../../assets/public/resources-strip.jpg";
import "./PublicPages.css";

const resources=[
 {category:"understanding",type:"Guide",title:"What is Duchenne?",desc:"A clear introduction to DMD for families who are new to the condition.",time:"10 min read"},
 {category:"understanding",type:"Factsheet",title:"Signs & Symptoms",desc:"Common changes families may notice and why professional evaluation matters.",time:"8 min read"},
 {category:"care",type:"Guide",title:"Preparing for Your Doctor Visit",desc:"Questions to ask and information to bring to appointments.",time:"6 min read"},
 {category:"understanding",type:"Article",title:"Genetics & Inheritance",desc:"Understand X-linked inheritance, carrier testing and genetic counselling.",time:"12 min read"},
 {category:"research",type:"Research",title:"DMD Research Overview",desc:"A plain-language overview of research directions and clinical trials.",time:"15 min read"},
 {category:"support",type:"Resource List",title:"Support Organizations",desc:"Find reliable DMD foundations, support groups and communities.",time:"Links"},
 {category:"professional",type:"Clinical",title:"Multidisciplinary DMD Care",desc:"A professional overview of coordinated neuromuscular, cardiac, respiratory and rehabilitation care.",time:"Professional"},
 {category:"global",type:"Directory",title:"Global DMD Resources",desc:"Organizations and support networks across regions and countries.",time:"Directory"},
];

export default function ResourcesHub(){
 const navigate=useNavigate();const [params,setParams]=useSearchParams();const [query,setQuery]=useState("");
 const category=params.get("category")||"all";
 const filtered=useMemo(()=>resources.filter(r=>(category==="all"||r.category===category)&&(`${r.title} ${r.desc}`.toLowerCase().includes(query.toLowerCase()))),[category,query]);
 const cats=[
  ["understanding",BookOpen,"Understanding DMD","Duchenne basics, symptoms, diagnosis and genetics."],
  ["care",Stethoscope,"Care & Management","Practical care and appointment guidance."],
  ["research",FlaskConical,"Research & Therapies","Research updates and emerging therapies."],
  ["support",HeartHandshake,"Living & Support","Daily life, education and emotional support."],
  ["professional",UsersRound,"For Professionals","Clinical references and healthcare tools."],
  ["global",Globe2,"Global Resources","Organizations, registries and support networks."],
 ] as const;
 return <main className="public-page"><PublicNavbar/>
  <section className="public-hero resources-hero"><div className="public-section"><div><h1>Resources that <em>inform, empower, and support.</em></h1><p>Curated information and practical tools for families, healthcare professionals and the wider DMD community.</p><div className="resources-search"><Search size={19}/><input placeholder="Search resources, guides, topics..." value={query} onChange={e=>setQuery(e.target.value)}/></div></div><div className="hero-image-shell"><img src={resourcesHero} alt="DMD resources and educational books"/></div></div></section>
  <section className="public-section"><h2 className="section-title">Explore by category</h2><div className="resource-categories"><button className={category==="all"?"resource-category active":"resource-category"} onClick={()=>setParams({})}><span className="choice-icon"><Search/></span><strong>All resources</strong><p>Browse everything available in the DMD-AI resource hub.</p></button>{cats.map(([key,Icon,title,desc])=><button className={category===key?"resource-category active":"resource-category"} key={key} onClick={()=>setParams({category:key})}><span className="choice-icon"><Icon/></span><strong>{title}</strong><p>{desc}</p></button>)}</div>
  <div className="featured-head"><div><h2 className="section-title">Featured resources</h2><p className="section-subtitle">Clear information without pretending educational content replaces professional care.</p></div></div>{filtered.length?<div className="featured-grid">{filtered.map((r,i)=><article className="resource-card" key={r.title}><div className="resource-thumb"><img src={resourcesStrip} alt=""/><span className="resource-type">{r.type}</span></div><div className="resource-body"><strong>{r.title}</strong><p>{r.desc}</p><div className="resource-meta"><span>{r.time}</span><button onClick={()=>navigate(i%2===0?"/families":"/hospitals")}>Open →</button></div></div></article>)}</div>:<div className="empty-results">No resources match your current search.</div>}
  <h2 className="section-title" style={{marginTop:34}}>Tools & practical support</h2><div className="tools-row">{[[ActivityIcon,"Change Tracker","Record family-observed changes over time.","/signup"],[FileHeart,"Symptom Journal","Organize observations before a medical visit.","/#assistant"],[Stethoscope,"Appointment Prep","Prepare a concise doctor-ready summary.","/families#appointments"],[Dna,"Genetics Guide","Learn about inheritance and counselling.","/families#genetics"],[BookOpen,"DMD Learning Path","Start with reliable educational basics.","/families#journey"]].map(([Icon,title,desc,to]:any)=><button className="tool-card" key={title} onClick={()=>navigate(to)}><Icon size={19}/><strong>{title}</strong><small>{desc}</small></button>)}</div></section>
  <section className="public-section library-section"><article className="library-list"><h3>Latest from the library</h3>{["DMD Care Across the Lifespan","Respiratory Care: Family Guide","Physical Therapy & Function","Understanding Genetic Testing","Preparing for Specialist Visits"].map(x=><button key={x} onClick={()=>setQuery(x.split(":")[0])}>{x}</button>)}</article><aside className="request-resource"><h3>Can’t find what you need?</h3><p>Tell us the topic you are looking for. During development this button opens the full library view; later it can submit a resource request.</p><button className="public-primary" onClick={()=>{setQuery("");setParams({})}}>View all resources</button></aside></section>
 </main>;
}
function ActivityIcon(){return <FileHeart size={19}/>}
