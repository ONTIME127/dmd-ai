import {
  Activity, ArrowRight, ChevronDown, ChevronRight, Dna, Dumbbell,
  ExternalLink, FileText, FlaskConical, Footprints, Heart, HeartPulse,
  Info, LoaderCircle, PersonStanding, RefreshCw, Search, ShieldCheck,
  Stethoscope, UsersRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import World from "@svg-maps/world";
import PublicNavbar from "../../components/public/PublicNavbar";
import {
  DMD_GLOBAL_BIRTH_PREVALENCE_PER_100K_MALE_BIRTHS,
  DMD_GLOBAL_MALE_PREVALENCE_PER_100K,
  fetchWorldDmdData,
  formatInteger,
  type WorldBankCountry,
} from "../../services/dmdWorldData";
import "./AboutDmdPage.css";

const overview = [
  {icon:<Dna/>,title:"Genetic condition",text:"DMD is caused by disease-causing variants affecting the dystrophin gene on the X chromosome. It primarily affects boys."},
  {icon:<HeartPulse/>,title:"Progressive muscle weakness",text:"DMD affects muscle function over time and requires ongoing care. Early support can help maintain mobility and quality of life."},
  {icon:<UsersRound/>,title:"Families + clinicians",text:"Families report lived changes; clinicians examine, test, and guide care. Strong partnerships lead to better outcomes."},
  {icon:<ShieldCheck/>,title:"Care + management",text:"While there is currently no cure for DMD, coordinated care can help manage symptoms and improve daily life."},
];

const symptoms = [
  {icon:<PersonStanding/>,title:"Delayed motor milestones",text:"Walking later than usual"},
  {icon:<Footprints/>,title:"Difficulty climbing stairs",text:"Trouble with stairs or getting up"},
  {icon:<Activity/>,title:"Frequent falls",text:"More falls than other children"},
  {icon:<Dumbbell/>,title:"Muscle weakness",text:"Weakness in hips, legs, and shoulders"},
  {icon:<PersonStanding/>,title:"Calf enlargement",text:"Calf muscles may appear larger"},
];

const diagnosis = [
  {icon:<Stethoscope/>,title:"Clinical evaluation",text:"Doctors assess motor skills, strength, and development."},
  {icon:<FlaskConical/>,title:"Genetic testing",text:"Confirms changes in the dystrophin gene (DMD gene)."},
  {icon:<FileText/>,title:"Specialist care",text:"Neurologists, therapists, and specialists build a care plan."},
];

type MapLocation = { id:string; name:string; path:string };
const world = World as unknown as {viewBox:string;locations:MapLocation[]};

function qualityFor(country:WorldBankCountry){
  return country.populationYear ? "Population data available" : "Limited data";
}

export default function AboutDmdPage(){
  const [countries,setCountries]=useState<WorldBankCountry[]>([]);
  const [selected,setSelected]=useState<WorldBankCountry|null>(null);
  const [query,setQuery]=useState("");
  const [region,setRegion]=useState("All Regions");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [updatedAt,setUpdatedAt]=useState("");

  const load=async()=>{
    setLoading(true); setError("");
    try{
      const result=await fetchWorldDmdData();
      setCountries(result.countries);
      setUpdatedAt(result.fetchedAt);
      setSelected(current=>current || result.countries.find(c=>c.iso2==="US") || result.countries[0] || null);
    }catch(e){
      setError(e instanceof Error?e.message:"Unable to load live country data.");
    }finally{setLoading(false)}
  };

  useEffect(()=>{void load()},[]);

  const regions=useMemo(()=>["All Regions",...Array.from(new Set(countries.map(c=>c.region))).sort()],[countries]);
  const filtered=useMemo(()=>countries.filter(c=>{
    const q=query.trim().toLowerCase();
    return (!q || c.name.toLowerCase().includes(q)) && (region==="All Regions" || c.region===region);
  }),[countries,query,region]);

  const byIso=useMemo(()=>new Map(countries.map(c=>[c.iso2.toUpperCase(),c])),[countries]);

  return <main className="about-dmd-page">
    <PublicNavbar/>

    <section className="about-dmd-shell">
      <span className="about-dmd-kicker"><Dna/> About Duchenne</span>
      <h1>Understanding Duchenne<br/>Muscular Dystrophy</h1>
      <p className="about-lead">This public page explains DMD in clear language and points families toward qualified healthcare professionals. DMD-AI educational content should support—not replace—clinical diagnosis and care.</p>

      <section className="overview-grid">
        {overview.map(item=><article key={item.title}><i>{item.icon}</i><h2>{item.title}</h2><p>{item.text}</p></article>)}
      </section>

      <section className="signs-section">
        <header><div><h2>Common Signs &amp; Symptoms</h2><p>Symptoms typically appear between ages 3 to 6 and progress over time.</p></div></header>
        <div className="sign-row">{symptoms.map(item=><article key={item.title}><i>{item.icon}</i><div><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div>
      </section>

      <section className="mid-grid">
        <article className="diagnosis-card"><h2>How DMD is Diagnosed</h2><p>Diagnosis is based on clinical evaluation, family history, and genetic testing.</p><div className="diagnosis-row">{diagnosis.map(item=><div key={item.title}><i>{item.icon}</i><span><h3>{item.title}</h3><p>{item.text}</p></span></div>)}</div></article>
        <article className="alone-card"><i><Heart/></i><div><h2>You Are Not Alone</h2><p>Many families face DMD every day. Getting clear information, support, and the right care team can make a big difference.</p><a href="/resources">Find support &amp; resources <ArrowRight/></a></div></article>
      </section>

      <div className="medical-note"><Info/> DMD-AI provides educational content only. It does not replace professional medical advice, diagnosis, or treatment.</div>

      <section className="world-section">
        <div className="world-section-heading">
          <div>
            <span className="world-eyebrow">GLOBAL DMD DATA</span>
            <h2>DMD Around the World</h2>
            <p>Explore country-level statistical estimates using the latest available male-population data from the World Bank / UN Population Division. Estimates are calculated transparently from the pooled global DMD prevalence reported in the published meta-analysis.</p>
          </div>
          <button className="refresh-data" onClick={()=>void load()} disabled={loading}><RefreshCw/> Refresh live data</button>
        </div>

        <div className="method-banner">
          <strong>How the estimate works</strong>
          <span>Latest male population × {DMD_GLOBAL_MALE_PREVALENCE_PER_100K} DMD cases per 100,000 males.</span>
          <span>Birth prevalence reference: {DMD_GLOBAL_BIRTH_PREVALENCE_PER_100K_MALE_BIRTHS} per 100,000 live male births.</span>
          <span className="estimate-label">STATISTICAL ESTIMATE — NOT A REGISTRY COUNT</span>
        </div>

        {loading && <div className="world-loading"><LoaderCircle/> Loading current country data…</div>}
        {error && <div className="world-error">{error} <button onClick={()=>void load()}>Try again</button></div>}

        {!loading && countries.length>0 && <div className="world-main-grid">
          <article className="map-card">
            <div className="map-meta"><span>Live country population data</span><span>{updatedAt?`Fetched ${new Date(updatedAt).toLocaleString()}`:""}</span></div>
            <div className="real-map-wrap">
              <svg viewBox={world.viewBox} role="img" aria-label="Interactive world map">
                {world.locations.map(loc=>{
                  const iso=loc.id.toUpperCase();
                  const data=byIso.get(iso);
                  const active=selected?.iso2===iso;
                  return <path
                    key={loc.id}
                    d={loc.path}
                    className={`country-shape ${data?"has-data":"no-data"} ${active?"active":""}`}
                    onClick={()=>data&&setSelected(data)}
                    tabIndex={data?0:-1}
                    onKeyDown={e=>{if(data&&(e.key==="Enter"||e.key===" ")){e.preventDefault();setSelected(data)}}}
                    aria-label={data?`${data.name}: estimated ${formatInteger(data.estimatedDmdPopulation)} people with DMD`:`${loc.name}: no live population match`}
                  >
                    <title>{data?`${data.name} — estimated DMD population ${formatInteger(data.estimatedDmdPopulation)} (${data.populationYear})`:loc.name}</title>
                  </path>
                })}
              </svg>
            </div>
            <div className="map-legend"><span><i className="data-dot"/>Live population data matched</span><span><i className="no-dot"/>No matched World Bank record</span></div>
          </article>

          <article className="country-card">
            {selected && <>
              <div className="country-topline"><span className="country-code">{selected.iso2}</span><div><h3>{selected.name}</h3><p>{selected.region}</p></div><span className="live-badge">LIVE POPULATION</span></div>
              <dl>
                <div><dt>Estimated DMD population</dt><dd><strong>{formatInteger(selected.estimatedDmdPopulation)}</strong><small>Statistical estimate</small></dd></div>
                <div><dt>Male population used</dt><dd><strong>{formatInteger(selected.malePopulation)}</strong><small>World Bank / UN • {selected.populationYear}</small></dd></div>
                <div><dt>Prevalence basis</dt><dd><strong>{DMD_GLOBAL_MALE_PREVALENCE_PER_100K} / 100,000 males</strong><small>Pooled global prevalence, systematic review/meta-analysis</small></dd></div>
                <div><dt>Birth prevalence basis</dt><dd><strong>{DMD_GLOBAL_BIRTH_PREVALENCE_PER_100K_MALE_BIRTHS} / 100,000 male births</strong><small>Pooled global birth prevalence</small></dd></div>
                <div><dt>Data classification</dt><dd><strong>Statistical estimate</strong><small>{qualityFor(selected)}</small></dd></div>
              </dl>

              <div className="verified-resources">
                <h4>Verified global resources</h4>
                <a href="https://www.treat-nmd.org/what-we-do/global-registry-network/" target="_blank" rel="noreferrer">TREAT-NMD Global Registry Network <ExternalLink/></a>
                <a href="https://www.treat-nmd.org/resources-and-support/care-guides/dmd-care/" target="_blank" rel="noreferrer">TREAT-NMD DMD Care Guides <ExternalLink/></a>
              </div>
            </>}
          </article>
        </div>}

        {!loading && countries.length>0 && <article className="country-table-card">
          <div className="filters">
            <label><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a country"/></label>
            <label><select value={region} onChange={e=>setRegion(e.target.value)}>{regions.map(r=><option key={r}>{r}</option>)}</select><ChevronDown/></label>
          </div>
          <div className="table-head"><span>Country</span><span>Region</span><span>Male population</span><span>Estimated DMD population</span><span>Prevalence basis</span><span>Population year</span><span/></div>
          {filtered.slice(0,30).map(c=><button key={c.iso2} className={`table-row ${selected?.iso2===c.iso2?"selected":""}`} onClick={()=>setSelected(c)}>
            <span><b>{c.iso2}</b>{c.name}</span><span>{c.region}</span><span>{formatInteger(c.malePopulation)}</span><span><strong>{formatInteger(c.estimatedDmdPopulation)}</strong><small>Statistical estimate</small></span><span>{DMD_GLOBAL_MALE_PREVALENCE_PER_100K}/100k males</span><span>{c.populationYear}</span><span><ChevronRight/></span>
          </button>)}
          {filtered.length>30 && <div className="table-more">Showing first 30 of {filtered.length} matching countries. Search to narrow results.</div>}
        </article>}

        <div className="source-panel">
          <h3>About these estimates</h3>
          <p><b>Population data:</b> Country population figures are based on the latest available World Bank and United Nations population estimates.</p>
          <p><b>DMD prevalence:</b> Estimated DMD populations are calculated using published global prevalence research. Current evidence suggests approximately <b>{DMD_GLOBAL_MALE_PREVALENCE_PER_100K} people with DMD per 100,000 males</b>, with an estimated birth prevalence of about <b>{DMD_GLOBAL_BIRTH_PREVALENCE_PER_100K_MALE_BIRTHS} per 100,000 male births</b>.</p>
          <p><b>Reported vs estimated data:</b> Where reliable national registry or published country data are available, DMD-AI identifies them as reported data. Where they are not available, figures are clearly marked as <b>statistical estimates</b>.</p>
          <p><b>Data may change:</b> DMD epidemiology continues to improve as more people are diagnosed, registries expand, and new studies are published. Figures on DMD-AI may therefore be updated as stronger evidence becomes available.</p>
        </div>
      </section>
    </section>
  </main>
}
