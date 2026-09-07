import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Users, ClipboardList, FileText, Heart, CalendarDays, HeartPulse,
  MessageSquareText, BookOpen, Bell, ChevronDown, ChevronRight, HeartHandshake, ShieldCheck,
  TrendingUp, ArrowRight, Info, FlaskConical, MapPin,
  Settings, Sparkles, Download, Search, ExternalLink, LogOut, Save, Mail, LockKeyhole, SlidersHorizontal, Check, UserRoundCheck, Activity, Zap, Wind, Moon, Apple, Smile, Footprints, ZoomIn, Layers, Maximize2, PersonStanding
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { syncPendingAssessment } from "../lib/familyAssessment";
import FamilyPortalLegacy from "./FamilyPortalLegacy";
import FamilyProfessionalCare from "../components/FamilyProfessionalCare";
import familyHero from "../assets/hero.png";
import "../styles/familyDashboardV6.css";
import "../styles/familyPortalV16.css";

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

type PortalView =
  | "Dashboard" | "My DMD Journey" | "Health & Wellbeing" | "Reports & Documents"
  | "Find Care" | "Community & Support" | "Resources" | "Clinical Trials" | "Settings"
  | "Assessments";

const navigation = [
  {label:"Dashboard",icon:Home},
  {label:"My DMD Journey",icon:Heart},
  {label:"Health & Wellbeing",icon:HeartPulse},
  {label:"Assessments",icon:ClipboardList},
  {label:"Reports & Documents",icon:FileText},
  {label:"Find Care",icon:MapPin},
  {label:"Community & Support",icon:Users},
  {label:"Resources",icon:BookOpen},
  {label:"Clinical Trials",icon:FlaskConical},
  {label:"Settings",icon:Settings},
] as const;


type JourneySubView =
  | "Family Profiles"
  | "Journey Timeline"
  | "Diagnosis & Medical History"
  | "Appointments"
  | "Medications & Treatments"
  | "Questions for My Appointment";

const journeySubItems:JourneySubView[]=[
  "Family Profiles",
  "Journey Timeline",
  "Diagnosis & Medical History",
  "Appointments",
  "Medications & Treatments",
  "Questions for My Appointment"
];

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
  if(["priority","review","urgent","acute"].includes(level||"")) return "Review";
  return "Saved";
}

function EmptyFeature({icon:Icon,title,body,action,onAction}:{icon:any;title:string;body:string;action?:string;onAction?:()=>void}){
  return <div className="fp16-empty">
    <span><Icon/></span><h3>{title}</h3><p>{body}</p>
    {action&&onAction&&<button onClick={onAction}>{action}<ArrowRight/></button>}
  </div>;
}

function JourneyView({activeSub}:{activeSub:JourneySubView}){
  const legacyView =
    activeSub==="Family Profiles" ? "members" :
    activeSub==="Journey Timeline" ? "journey" :
    activeSub==="Diagnosis & Medical History" ? "documents" :
    activeSub==="Appointments" ? "appointments" :
    activeSub==="Medications & Treatments" ? "medications" :
    "questions";

  return <section className="fp16-page fp19-journey-page">
    <div className="fp16-page-head">
      <div>
        <span>MY DMD JOURNEY</span>
        <h1>{activeSub}</h1>
        <p>Your family's real records and working tools stay inside one permanent Family Portal.</p>
      </div>
    </div>
    <FamilyPortalLegacy embeddedView={legacyView}/>
  </section>;
}

type NearbyCarePlace={
  id:string;
  name:string;
  lat:number;
  lon:number;
  distanceKm:number;
  kind:string;
  address:string;
  phone:string;
  website:string;
  services:string[];
  matchScore:number;
  specialtyConfirmed:boolean;
  specialtyEvidence:string[];
};

function FindCareView(){
  const [location,setLocation]=useState("Locating you...");
  const [need,setNeed]=useState("Neuromuscular specialist");
  const [coords,setCoords]=useState<{lat:number;lon:number}|null>(null);
  const [places,setPlaces]=useState<NearbyCarePlace[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [searched,setSearched]=useState(false);

  const distanceKm=(lat1:number,lon1:number,lat2:number,lon2:number)=>{
    const toRad=(v:number)=>v*Math.PI/180;
    const R=6371;
    const dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);
    const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  };

  const specialtyRules:Record<string,{exact:string[];support:string[]}> = {
    "Neuromuscular specialist":{
      exact:["neuromuscular","muscular dystrophy","duchenne","dmd clinic","neuromuscular medicine"],
      support:["neurology","neurologist"]
    },
    "Neurologist":{
      exact:["neurologist","neurology","neurosciences","neuroscience"],
      support:[]
    },
    "Genetic testing":{
      exact:["genetic testing","genetics laboratory","genetic laboratory","molecular genetics","genomic diagnostics","dna testing"],
      support:["genetics","diagnostic laboratory","laboratory"]
    },
    "Genetic counsellor":{
      exact:["genetic counsellor","genetic counselor","genetic counselling","genetic counseling"],
      support:["genetics"]
    },
    "Physiotherapy":{
      exact:["physiotherapy","physiotherapist","physical therapy","physical therapist"],
      support:["rehabilitation","rehab"]
    },
    "Cardiology":{
      exact:["cardiology","cardiologist","cardiac medicine","heart specialist"],
      support:["cardiac"]
    },
    "Respiratory care":{
      exact:["pulmonology","pulmonologist","respiratory medicine","respiratory care","chest medicine","chest physician"],
      support:["pulmonary","respiratory"]
    },
    "Rehabilitation":{
      exact:["rehabilitation","rehab medicine","physical medicine and rehabilitation","pm&r","physiatry","physiatrist"],
      support:["physiotherapy","physical therapy"]
    },
    "Psychological support":{
      exact:["psychology","psychologist","psychiatry","psychiatrist","mental health","clinical psychologist","counselling","counseling"],
      support:["behavioural health","behavioral health"]
    }
  };

  const specialtyEvidence=(selectedNeed:string,searchable:string)=>{
    const rule=specialtyRules[selectedNeed]||{exact:[selectedNeed.toLowerCase()],support:[]};
    const exactHits=rule.exact.filter(term=>searchable.includes(term));
    const supportHits=rule.support.filter(term=>searchable.includes(term));
    return {
      confirmed:exactHits.length>0,
      exactHits,
      supportHits,
      score:(exactHits.length*10)+(supportHits.length*2)
    };
  };

  const reverseGeocode=async(lat:number,lon:number)=>{
    try{
      const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,{
        headers:{"Accept":"application/json"}
      });
      if(!r.ok)throw new Error("Reverse geocoding failed");
      const data=await r.json();
      const a=data?.address||{};
      const concise=[a.suburb||a.neighbourhood||a.village||a.town||a.city,a.state,a.country].filter(Boolean).join(", ");
      setLocation(concise||data?.display_name||`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    }catch{
      setLocation(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    }
  };

  const fetchNearby=async(lat:number,lon:number,selectedNeed=need)=>{
    setLoading(true);
    setError("");
    setSearched(true);

    const controller=new AbortController();
    const timeoutId=window.setTimeout(()=>controller.abort(),12000);

    const searchNominatim=async(q:string,limit=12,bounded=true)=>{
      const span=0.42;
      const viewbox=`${lon-span},${lat+span},${lon+span},${lat-span}`;
      const params=new URLSearchParams({
        format:"jsonv2",
        addressdetails:"1",
        namedetails:"1",
        extratags:"1",
        limit:String(limit),
        q
      });
      if(bounded){
        params.set("viewbox",viewbox);
        params.set("bounded","1");
      }
      const response=await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`,{
        headers:{"Accept":"application/json"},
        signal:controller.signal
      });
      if(!response.ok)throw new Error(`Place search returned ${response.status}`);
      return await response.json();
    };

    try{
      const rule=specialtyRules[selectedNeed]||{exact:[selectedNeed.toLowerCase()],support:[]};
      const serviceQueries=[
        selectedNeed,
        ...rule.exact.slice(0,3),
        ...rule.support.slice(0,1),
        "hospital",
        "clinic"
      ];

      // Search multiple healthcare terms in parallel around the user's coordinates.
      const batches=await Promise.allSettled(
        [...new Set(serviceQueries)].map(q=>searchNominatim(q,10,true))
      );

      let raw:any[]=[];
      for(const result of batches){
        if(result.status==="fulfilled"&&Array.isArray(result.value))raw.push(...result.value);
      }

      // If the specialty search is sparse, broaden to general healthcare nearby.
      if(raw.length<5){
        const fallback=await Promise.allSettled([
          searchNominatim("hospital",20,true),
          searchNominatim("clinic",20,true),
          searchNominatim("medical centre",15,true),
          searchNominatim("healthcare",15,true)
        ]);
        for(const result of fallback){
          if(result.status==="fulfilled"&&Array.isArray(result.value))raw.push(...result.value);
        }
      }

      const seen=new Set<string>();
      const mapped:NearbyCarePlace[]=raw.map((item:any)=>{
        const pLat=Number(item.lat);
        const pLon=Number(item.lon);
        if(!Number.isFinite(pLat)||!Number.isFinite(pLon))return null;

        const extra=item.extratags||{};
        const addr=item.address||{};
        const display=String(item.display_name||"");
        const searchable=[
          item.name,
          item.display_name,
          item.type,
          item.category,
          extra.healthcare,
          extra.amenity,
          extra.speciality,
          extra["healthcare:speciality"],
          extra.description,
          extra.operator
        ].filter(Boolean).join(" ").toLowerCase();

        const evidence=specialtyEvidence(selectedNeed,searchable);
        const matchScore=evidence.score;

        const services=[
          extra["healthcare:speciality"],
          extra.speciality,
          extra.healthcare,
          extra.amenity,
          item.type
        ].filter(Boolean).flatMap((v:any)=>String(v).split(/[;,]/)).map((v:string)=>v.trim()).filter(Boolean);

        const name=String(
          item.namedetails?.name||
          item.name||
          display.split(",")[0]||
          "Healthcare facility"
        );

        const address=[
          addr.road||addr.pedestrian,
          addr.suburb||addr.neighbourhood||addr.village,
          addr.town||addr.city||addr.county,
          addr.state
        ].filter(Boolean).join(", ");

        return {
          id:`osm-${item.osm_type||"place"}-${item.osm_id||`${pLat}-${pLon}`}`,
          name,
          lat:pLat,
          lon:pLon,
          distanceKm:distanceKm(lat,lon,pLat,pLon),
          kind:String(extra.healthcare||extra.amenity||item.type||"healthcare").replaceAll("_"," "),
          address,
          phone:String(extra.phone||extra["contact:phone"]||""),
          website:String(extra.website||extra["contact:website"]||""),
          services:[...new Set(services)].slice(0,5),
          matchScore,
          specialtyConfirmed:evidence.confirmed,
          specialtyEvidence:evidence.exactHits
        };
      }).filter((p): p is NearbyCarePlace => p !== null).filter((p)=>{
        const key=`${p.name.toLowerCase()}-${p.lat.toFixed(4)}-${p.lon.toFixed(4)}`;
        if(seen.has(key))return false;
        seen.add(key);
        return p.distanceKm<=65;
      });

      mapped.sort((a:NearbyCarePlace,b:NearbyCarePlace)=>{
        const aConfirmed=a.specialtyConfirmed?1:0;
        const bConfirmed=b.specialtyConfirmed?1:0;
        if(aConfirmed!==bConfirmed)return bConfirmed-aConfirmed;
        if(a.matchScore!==b.matchScore)return b.matchScore-a.matchScore;
        return a.distanceKm-b.distanceKm;
      });

      setPlaces(mapped.slice(0,30));

      if(!mapped.length){
        setError("No healthcare records were returned for this exact area. Try Current location again or choose a broader care type such as Hospital/Clinic.");
      }
    }catch(e:any){
      setPlaces([]);
      if(e?.name==="AbortError"){
        setError("The live place service was slow. Please press Search nearby care again.");
      }else{
        setError(e?.message||"Could not load live healthcare places.");
      }
    }finally{
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const useCurrentLocation=()=>{
    setError("");
    if(!navigator.geolocation){
      setError("Your browser does not support location access.");
      setLocation("");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async position=>{
      const next={lat:position.coords.latitude,lon:position.coords.longitude};
      setCoords(next);
      await reverseGeocode(next.lat,next.lon);
      await fetchNearby(next.lat,next.lon);
    },err=>{
      setLoading(false);
      setLocation("");
      setError(err.code===1
        ?"Location permission was denied. Allow location access in your browser, or type a city/state/country."
        :"Your current location could not be detected. Type a location and search instead.");
    },{enableHighAccuracy:true,timeout:12000,maximumAge:300000});
  };

  useEffect(()=>{useCurrentLocation()},[]);

  const geocodeTypedLocation=async()=>{
    const value=location.trim();
    if(!value||value==="Locating you..."){useCurrentLocation();return}
    setLoading(true);setError("");
    try{
      const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(value)}`,{
        headers:{"Accept":"application/json"}
      });
      if(!r.ok)throw new Error("Location search failed.");
      const data=await r.json();
      if(!data?.length)throw new Error("That location could not be found.");
      const next={lat:Number(data[0].lat),lon:Number(data[0].lon)};
      setCoords(next);
      setLocation(data[0].display_name||value);
      await fetchNearby(next.lat,next.lon);
    }catch(e:any){
      setLoading(false);
      setError(e?.message||"Unable to search this location.");
    }
  };

  const runSearch=()=>{
    if(coords&&location!=="Locating you...")void fetchNearby(coords.lat,coords.lon,need);
    else void geocodeTypedLocation();
  };

  const directions=(place:NearbyCarePlace)=>{
    const destination=encodeURIComponent(`${place.lat},${place.lon}`);
    const origin=coords?`&origin=${encodeURIComponent(`${coords.lat},${coords.lon}`)}`:"";
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}${origin}`,"_blank","noopener,noreferrer");
  };

  return <section className="fp16-page fp20-findcare-page">
    <div className="fp16-page-head"><div><span>FIND DMD CARE</span><h1>Find appropriate care near you</h1><p>DMD-AI uses your location to find nearby hospitals, clinics and healthcare services, then prioritizes recorded service matches and distance.</p></div></div>

    <div className="fp16-find-card fp20-find-card">
      <label>Where are you?<div><MapPin/><input value={location} onChange={e=>{setLocation(e.target.value);setCoords(null)}} placeholder="Current location, city, state or country"/></div></label>
      <label>What do you need?<select value={need} onChange={e=>setNeed(e.target.value)}>
        <option>Neuromuscular specialist</option><option>Neurologist</option><option>Genetic testing</option>
        <option>Genetic counsellor</option><option>Physiotherapy</option><option>Cardiology</option>
        <option>Respiratory care</option><option>Rehabilitation</option><option>Psychological support</option>
      </select></label>
      <button type="button" onClick={runSearch} disabled={loading}><Search/> {loading?"Searching...":"Search nearby care"}</button>
      <button className="fp20-current-location" type="button" onClick={useCurrentLocation} disabled={loading}><MapPin/><span>Current location</span></button>
    </div>

    {error&&<div className="fp20-find-error fp21-find-notice"><Info/><span>{error}</span></div>}

    <div className="fp16-note"><Info/><p><strong>How ranking works:</strong> facilities with public records that explicitly match <b>{need}</b> are prioritized first, followed by other nearby healthcare options. Distance is used to order comparable results. Always confirm services directly with the provider before visiting.</p></div>

    <article className="fp20-care-results">
      <header>
        <div><MapPin/><div><strong>Nearby healthcare</strong><span>{coords?"Sorted using your location":"Waiting for a location"}</span></div></div>
        <b>{loading?"Searching":places.length?`${places.length} found`:"Ready"}</b>
      </header>
      {loading&&<div className="fp20-care-loading"><span className="fp20-loader"/><strong>Finding nearby healthcare...</strong></div>}
      {!loading&&searched&&places.length===0&&!error&&<div className="fp20-care-empty">No nearby facilities found.</div>}
      {!loading&&places.length>0&&<div className="fp20-care-list">
        {places.map((place,index)=><div className="fp20-care-place" key={place.id}>
          <div className="fp20-care-rank">{index+1}</div>
          <div className="fp20-care-place-main">
            <div className="fp20-care-title"><strong>{place.name}</strong><span>{place.distanceKm<1?`${Math.round(place.distanceKm*1000)} m`:`${place.distanceKm.toFixed(1)} km`}</span></div>
            <div className="fp20-care-meta"><span>{place.kind}</span>{place.specialtyConfirmed&&<em>Recorded match for {need}</em>}</div>
            {place.address&&<p><MapPin/> {place.address}</p>}
            <div className="fp20-care-services">
              {place.services.length?place.services.map(service=><span key={service}>{service}</span>):<span className="muted">No specialty details recorded publicly</span>}
            </div>
          </div>
          <div className="fp20-care-actions">
            <button type="button" onClick={()=>directions(place)}>Directions <ArrowRight/></button>
            {place.website&&<button type="button" className="secondary" onClick={()=>window.open(place.website,"_blank","noopener,noreferrer")}>Website</button>}
            {place.phone&&<a href={`tel:${place.phone}`}>Call</a>}
          </div>
        </div>)}
      </div>}
    </article>
  </section>;
}

type NearbyCommunityMember={
  user_id:string;display_name:string;avatar_url:string|null;city:string|null;state:string|null;country:string|null;approx_distance_km:number;
};
type CommunityDiscussion={
  id:string;group_id:string;group_name:string;author_id:string;author_name:string;author_avatar_url:string|null;
  title:string;body:string;created_at:string;
};
type CommunityPreviewMember={user_id:string;display_name:string;avatar_url:string|null};

function CommunityView(){
  const groups=[
    {slug:"bereaved-families",name:"Bereaved Families",desc:"A compassionate space for families remembering loved ones and supporting one another.",tone:"purple"},
    {slug:"living-with-dmd",name:"Living with DMD",desc:"A space for people living with DMD to connect and share experiences.",tone:"blue"},
    {slug:"newly-diagnosed",name:"Newly Diagnosed",desc:"Support and practical guidance for families at the beginning of the DMD journey.",tone:"green"},
    {slug:"parents-caregivers",name:"Parents & Caregivers",desc:"Peer support for parents and caregivers navigating DMD day to day.",tone:"pink"},
    {slug:"siblings-support",name:"Siblings Support",desc:"A supportive space for siblings affected by the DMD journey.",tone:"orange"}
  ];
  const [groupRows,setGroupRows]=useState<any[]>([]);
  const [groupCounts,setGroupCounts]=useState<Record<string,number>>({});
  const [groupPreviews,setGroupPreviews]=useState<Record<string,CommunityPreviewMember[]>>({});
  const [joined,setJoined]=useState<Set<string>>(new Set());
  const [nearby,setNearby]=useState<NearbyCommunityMember[]>([]);
  const [discoverable,setDiscoverable]=useState(false);
  const [communityLocation,setCommunityLocation]=useState("");
  const [locating,setLocating]=useState(false);
  const [communityMessage,setCommunityMessage]=useState("");
  const [title,setTitle]=useState("");const [body,setBody]=useState("");
  const [discussionGroup,setDiscussionGroup]=useState("living-with-dmd");
  const [posting,setPosting]=useState(false);
  const [postSuccess,setPostSuccess]=useState("");
  const [sharePost,setSharePost]=useState<{title:string;body:string;group:string}|null>(null);
  const [discussions,setDiscussions]=useState<CommunityDiscussion[]>([]);
  const [connections,setConnections]=useState<Record<string,string>>({});

  const loadNearby=async(lat:number,lon:number)=>{
    const {data,error}=await supabase.rpc("get_dmd_nearby_members",{p_lat:lat,p_lon:lon,p_limit:8,p_radius_km:250});
    if(error){setCommunityMessage("Nearby members could not be loaded right now.");return}
    setNearby(((data||[]) as any[]).map(p=>({...p,approx_distance_km:Number(p.approx_distance_km)})));
  };

  const loadCommunity=async()=>{
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    const [{data:g},{data:m},{data:p},{data:c},{data:counts},{data:previews},{data:d}]=await Promise.all([
      supabase.from("dmd_community_groups").select("*").order("created_at"),
      supabase.from("dmd_community_memberships").select("group_id").eq("user_id",user.id),
      supabase.from("dmd_community_presence").select("city,state,country,latitude_coarse,longitude_coarse,discoverable").eq("user_id",user.id).maybeSingle(),
      supabase.from("dmd_community_connections").select("*").or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`),
      supabase.rpc("get_dmd_community_group_counts"),
      supabase.rpc("get_dmd_community_group_previews"),
      supabase.rpc("get_dmd_community_discussions",{p_limit:20})
    ]);
    setGroupRows(g||[]);
    setJoined(new Set((m||[]).map((x:any)=>x.group_id)));
    setDiscussions((d||[]) as CommunityDiscussion[]);
    const nextCounts:Record<string,number>={};(counts||[]).forEach((x:any)=>{nextCounts[x.group_id]=Number(x.member_count)||0});setGroupCounts(nextCounts);
    const nextPreviews:Record<string,CommunityPreviewMember[]>={};(previews||[]).forEach((x:any)=>{nextPreviews[x.group_id]=Array.isArray(x.members)?x.members:[]});setGroupPreviews(nextPreviews);
    if(p){
      setDiscoverable(Boolean(p.discoverable));
      setCommunityLocation([p.city,p.state,p.country].filter(Boolean).join(", "));
      if(p.discoverable&&p.latitude_coarse!=null&&p.longitude_coarse!=null)await loadNearby(Number(p.latitude_coarse),Number(p.longitude_coarse));
    }
    const cm:Record<string,string>={};(c||[]).forEach((r:any)=>{cm[r.requester_id===user.id?r.recipient_id:r.requester_id]=r.status});setConnections(cm);
  };
  useEffect(()=>{void loadCommunity()},[]);

  const enableNearby=async()=>{
    setLocating(true);setCommunityMessage("");const {data:{user}}=await supabase.auth.getUser();if(!user){setLocating(false);return}
    if(!navigator.geolocation){setCommunityMessage("Location is not supported by this browser.");setLocating(false);return}
    navigator.geolocation.getCurrentPosition(async pos=>{
      const lat=pos.coords.latitude,lon=pos.coords.longitude;let city="",state="",country="";
      try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`);const j=await r.json(),a=j?.address||{};
        city=a.city||a.town||a.village||a.suburb||"";state=a.state||"";country=a.country||"";}catch{}
      const {data:profile}=await supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle();
      const coarseLat=Number(lat.toFixed(2)),coarseLon=Number(lon.toFixed(2));
      const {error}=await supabase.from("dmd_community_presence").upsert({user_id:user.id,display_name:profile?.full_name||user.email?.split("@")[0]||"DMD-AI Family",city,state,country,latitude_coarse:coarseLat,longitude_coarse:coarseLon,discoverable:true,updated_at:new Date().toISOString()},{onConflict:"user_id"});
      if(error)setCommunityMessage(error.message);else{setDiscoverable(true);setCommunityLocation([city,state,country].filter(Boolean).join(", ")||"Your area");setCommunityMessage("Nearby discovery is on. Only your approximate area is shared.");await loadNearby(coarseLat,coarseLon)}setLocating(false);
    },()=>{setCommunityMessage("Location permission was not granted. Nearby discovery remains off.");setLocating(false)},{enableHighAccuracy:false,timeout:10000,maximumAge:600000});
  };
  const disableNearby=async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;await supabase.from("dmd_community_presence").update({discoverable:false,updated_at:new Date().toISOString()}).eq("user_id",user.id);setDiscoverable(false);setNearby([]);setCommunityMessage("Nearby discovery is off.")};
  const toggleGroup=async(slug:string)=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const row=groupRows.find((g:any)=>g.slug===slug);if(!row)return;
    if(joined.has(row.id))await supabase.from("dmd_community_memberships").delete().eq("group_id",row.id).eq("user_id",user.id);else await supabase.from("dmd_community_memberships").insert({group_id:row.id,user_id:user.id});await loadCommunity()};
  const connect=async(recipientId:string)=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {error}=await supabase.from("dmd_community_connections").insert({requester_id:user.id,recipient_id:recipientId,status:"pending"});if(error&&error.code!=="23505")setCommunityMessage(error.message);else{setConnections(p=>({...p,[recipientId]:"pending"}));setCommunityMessage("Connection request sent.")}};
  const postDiscussion=async()=>{
    setPostSuccess("");
    setCommunityMessage("");
    if(!title.trim()||!body.trim()){setCommunityMessage("Add both a discussion title and message.");return}
    const {data:{user}}=await supabase.auth.getUser();if(!user){setCommunityMessage("Please sign in again before posting.");return}
    const group=groupRows.find((g:any)=>g.slug===discussionGroup);
    if(!group){setCommunityMessage("That support group is unavailable right now.");return}
    setPosting(true);
    try{
      if(!joined.has(group.id)){
        const {error:joinError}=await supabase.from("dmd_community_memberships").upsert({group_id:group.id,user_id:user.id},{onConflict:"group_id,user_id"});
        if(joinError)throw joinError;
      }
      const {data:created,error}=await supabase.from("dmd_community_discussions")
        .insert({group_id:group.id,author_id:user.id,title:title.trim(),body:body.trim(),status:"published"})
        .select("id").single();
      if(error)throw error;
      setSharePost({title:title.trim(),body:body.trim(),group:group.name});
      setTitle("");setBody("");
      setPostSuccess(`Posted successfully in ${group.name}. Your discussion is now live.`);
      await loadCommunity();
      window.setTimeout(()=>document.getElementById(`discussion-${created.id}`)?.scrollIntoView({behavior:"smooth",block:"center"}),120);
    }catch(e:any){
      setCommunityMessage(e?.message||"Your discussion could not be posted. Please try again.");
    }finally{
      setPosting(false);
    }
  };
  const groupName=(id:string)=>groupRows.find((g:any)=>g.id===id)?.name||"DMD Community";
  const avatar=(url:string|null|undefined,name:string,className:string)=>
    url?<img className={className} src={url} alt="" loading="lazy"/>:<div className={className}>{initials(name)}</div>;

  const externalCommunities=[
    {name:"PPMD Connect",org:"Parent Project Muscular Dystrophy",scope:"Regional + virtual",desc:"Parent- and grandparent-led regional connections for Duchenne and Becker families.",url:"https://www.parentprojectmd.org/get-involved/connect/find-a-local-connect-group-2/"},
    {name:"PPMD Virtual Connections",org:"Parent Project Muscular Dystrophy",scope:"Worldwide online",desc:"Virtual connections for dads, grandparents, siblings, carriers, newly diagnosed families and more.",url:"https://www.parentprojectmd.org/care/for-families/for-newly-diagnosed/get-support/"},
    {name:"CureDuchenne Cares",org:"CureDuchenne",scope:"Family support",desc:"Family guidance, community events, workshops and one-to-one support for Duchenne families.",url:"https://cureduchenne.org/family-resource-guide/"},
    {name:"MDA Community Groups",org:"Muscular Dystrophy Association",scope:"Neuromuscular community",desc:"Community support groups for adults, parents and guardians navigating neuromuscular disease.",url:"https://www.mda.org/care/community-groups"}
  ];
  const shareText=sharePost?`${sharePost.title}\n\n${sharePost.body}\n\nShared from DMD-AI · ${sharePost.group}`:"";
  const copyExternalPost=async()=>{if(!shareText)return;await navigator.clipboard.writeText(shareText);setCommunityMessage("Discussion copied. Open a verified community and paste it there if their rules allow.");};

  return <section className="fp23-community">
    <div className="fp23-hero"><div className="fp23-hero-copy"><span>COMMUNITY & SUPPORT</span><h1>You don't have to navigate DMD alone</h1><p>Connect with families and people who understand the DMD journey.<br/>Share experiences, ask questions, and support each other.</p><div className="fp23-trust"><span><ShieldCheck/> Private & safe</span><span><Heart/> Family focused</span><span><Users/> Real connections</span></div></div><div className="fp23-family-art" aria-hidden="true"><div className="fp23-heart-bg">♡</div><div className="fp23-family-people"><span>👨</span><span>👩🏾</span><span>👩🏻</span><span className="child">👦</span></div></div></div>

    <div className="fp23-top-row"><div className="fp23-groups-wrap"><div className="fp23-section-title"><h2>DMD-AI support groups</h2><span>Post and connect directly inside DMD-AI</span></div><div className="fp23-groups">{groups.map(g=>{const row=groupRows.find((x:any)=>x.slug===g.slug);const isJoined=row?joined.has(row.id):false;const count=row?(groupCounts[row.id]||0):0;const previews=row?(groupPreviews[row.id]||[]):[];return <article className={`fp23-group ${g.tone}`} key={g.slug}><div className="fp23-group-icon"><HeartHandshake/></div><h3>{g.name}</h3><p>{g.desc}</p><div className="fp23-member-strip"><div className="fp23-mini-avatars">{previews.length?previews.slice(0,3).map(member=>member.avatar_url?<img key={member.user_id} src={member.avatar_url} alt="" loading="lazy"/>:<i key={member.user_id}>{initials(member.display_name)}</i>):<i className="empty"><Users/></i>}</div><strong>{count} {count===1?"member":"members"}</strong></div><button type="button" className={isJoined?"joined":""} onClick={()=>toggleGroup(g.slug)}>{isJoined?"Joined ✓":"Join group"}</button></article>})}</div></div>
      <aside className="fp23-compose"><MessageSquareText/><h2>Start a discussion</h2><p>Ask a question or share your family's experience. Please do not post private medical records or emergency requests.</p><select value={discussionGroup} onChange={e=>setDiscussionGroup(e.target.value)}>{groups.map(g=><option key={g.slug} value={g.slug}>{g.name}</option>)}</select><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Discussion title" maxLength={120}/><div className="fp23-textarea"><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="What would you like to share?" maxLength={1000}/><small>{body.length}/1000</small></div><button type="button" onClick={postDiscussion} disabled={posting}>{posting?"Posting...":"Post discussion"}</button>{postSuccess&&<div className="fp24-post-success"><Check/>{postSuccess}</div>}</aside>
    </div>

    {sharePost&&<div className="fp25-share-panel"><div><span className="fp25-eyebrow">YOUR POST IS LIVE ON DMD-AI</span><h3>Share this discussion externally</h3><p>External communities are separate from DMD-AI. We never claim to publish there automatically. Copy your post, then open the verified community and share it only if its rules allow.</p></div><button type="button" onClick={copyExternalPost}>Copy discussion</button></div>}

    <section className="fp25-external"><div className="fp25-external-head"><div><span>VERIFIED EXTERNAL COMMUNITIES</span><h2>Connect beyond DMD-AI</h2><p>Real Duchenne and neuromuscular support communities operated by established organizations. Membership and activity stay on their own platforms.</p></div><ShieldCheck/></div><div className="fp25-external-grid">{externalCommunities.map(c=><article className="fp25-external-card" key={c.name}><div className="fp25-org-icon"><HeartHandshake/></div><div className="fp25-external-copy"><span>{c.scope}</span><h3>{c.name}</h3><strong>{c.org}</strong><p>{c.desc}</p></div><a href={c.url} target="_blank" rel="noreferrer">Open community <ExternalLink/></a></article>)}</div></section>

    {communityMessage&&<div className="fp23-message"><Info/>{communityMessage}</div>}

    <div className="fp23-bottom-row"><article className="fp23-discussions"><header><h2>Recent discussions</h2><span>{discussions.length?"Latest community posts":"No discussions yet"}</span></header>{discussions.length?<div>{discussions.map((d,i)=><div className="fp23-discussion-row" id={`discussion-${d.id}`} key={d.id}>{avatar(d.author_avatar_url,d.author_name,`fp23-disc-avatar a${i%5}`)}<div className="fp23-disc-copy"><strong>{d.title}</strong><span>{d.author_name} · {d.group_name||groupName(d.group_id)} · {new Date(d.created_at).toLocaleString()}</span><p>{d.body}</p></div><MessageSquareText/></div>)}</div>:<div className="fp23-empty"><MessageSquareText/><strong>Be the first to start a conversation</strong><span>Join a support group and share with the community.</span></div>}<footer><ShieldCheck/><div><strong>Be kind, be respectful, and protect each other's privacy.</strong><span>This is a peer support community, not a substitute for professional medical advice.</span></div></footer></article>

      <article className="fp23-nearby"><header><div><h2>Nearby DMD-AI families</h2><span className="fp23-optin"><MapPin/> {discoverable?"Opted in":"Opt in"}</span></div>{discoverable?<button type="button" onClick={disableNearby}>Turn off</button>:<button type="button" onClick={enableNearby} disabled={locating}>{locating?"Locating...":"Enable nearby"}</button>}</header><p>Real DMD-AI members near your approximate area who have chosen to be discoverable.</p>{communityLocation&&<div className="fp23-location"><MapPin/>{communityLocation}</div>}{discoverable?(nearby.length?<div className="fp23-nearby-list">{nearby.map((person,i)=><div className="fp23-nearby-person" key={person.user_id}>{avatar(person.avatar_url,person.display_name,`fp23-person-avatar p${i%4}`)}<div><strong>{person.display_name}</strong><span>{[person.city,person.state,person.country].filter(Boolean).join(", ")||"DMD-AI community"}</span></div><b>{person.approx_distance_km<1?"<1":Math.round(person.approx_distance_km)} km</b><button type="button" disabled={Boolean(connections[person.user_id])} onClick={()=>connect(person.user_id)}>{connections[person.user_id]==="accepted"?"Connected":connections[person.user_id]==="pending"?"Sent":"Connect"}</button></div>)}</div>:<div className="fp23-nearby-empty"><Users/><strong>No opted-in families nearby yet</strong><span>Real members will appear here as they enable nearby discovery.</span></div>):<div className="fp23-nearby-empty"><MapPin/><strong>Find families near you</strong><span>Enable nearby discovery to see real opted-in DMD-AI members sorted by approximate distance.</span><button type="button" onClick={enableNearby} disabled={locating}>{locating?"Finding your area...":"Enable nearby discovery"}</button></div>}<footer><MapPin/><span>Your exact GPS location is never shown to other members.</span></footer></article>
    </div>
  </section>;
}

type FamilyResourceKey="understanding"|"newly-diagnosed"|"genetics"|"care"|"daily-living"|"support";

function ResourcesView(){
  const [active,setActive]=useState<FamilyResourceKey|null>(null);
  const resources:{key:FamilyResourceKey;title:string;desc:string;items:{title:string;body:string}[];links:{label:string;url:string}[]}[]=[
    {key:"understanding",title:"Understanding DMD",desc:"A clear starting point for understanding Duchenne.",items:[
      {title:"What DMD affects",body:"Duchenne is a genetic condition that mainly affects muscles. Muscle weakness usually changes over time, so regular care and monitoring are important."},
      {title:"What families may notice",body:"Families may notice difficulty running, climbing stairs or getting up from the floor, frequent falls, toe walking or enlarged calf muscles."},
      {title:"Why ongoing care matters",body:"DMD care can involve neuromuscular, heart, breathing, bone, rehabilitation and other specialists across different stages of life."}
    ],links:[
      {label:"PPMD care materials",url:"https://www.parentprojectmd.org/care/care-and-support-materials/"},
      {label:"CureDuchenne family guide",url:"https://cureduchenne.org/resource-library/a-family-guide-to-dealing-with-duchenne-muscular-dystrophy/"}
    ]},
    {key:"newly-diagnosed",title:"Newly Diagnosed",desc:"Practical next steps when DMD is suspected or confirmed.",items:[
      {title:"Keep your records together",body:"Save laboratory results, genetic reports, clinic notes, medication lists and questions for your next appointment."},
      {title:"Build your care team",body:"Ask about coordinated neuromuscular care and which specialists should be involved for your family member."},
      {title:"Get support early",body:"Family support organizations can help with education, school planning, physical therapy resources and connecting with other families."}
    ],links:[
      {label:"CureDuchenne newly diagnosed support",url:"https://cureduchenne.org/family-resource-guide/"},
      {label:"PPMD support materials",url:"https://www.parentprojectmd.org/care/care-and-support-materials/"}
    ]},
    {key:"genetics",title:"Genetics & Testing",desc:"Understand genetic testing and family implications.",items:[
      {title:"The DMD gene",body:"Duchenne is caused by disease-causing changes in the DMD gene, which provides instructions for dystrophin."},
      {title:"Genetic testing",body:"Genetic testing can identify a disease-causing DMD variant and can also help guide testing for relatives when appropriate."},
      {title:"Carrier testing",body:"At-risk female relatives may be offered molecular genetic testing. Genetic counselling can help families understand results and inheritance."}
    ],links:[
      {label:"GeneReviews: Dystrophinopathies",url:"https://www.ncbi.nlm.nih.gov/books/NBK1119/"},
      {label:"PPMD care materials",url:"https://www.parentprojectmd.org/care/care-and-support-materials/"}
    ]},
    {key:"care",title:"Treatment & Care",desc:"Topics families can discuss with their DMD care team.",items:[
      {title:"Coordinated care",body:"DMD care commonly involves regular review of muscle function, heart health, breathing, bone health, nutrition and daily function."},
      {title:"Physical therapy",body:"A DMD-aware physical therapist can guide stretching, safe activity, transfers, mobility and equipment decisions for different stages."},
      {title:"Emergency preparation",body:"Keep important medical information accessible and tell emergency teams about the DMD diagnosis, current medicines and relevant care considerations."}
    ],links:[
      {label:"CureDuchenne physical therapy resources",url:"https://cureduchenne.org/physical-therapy/for-families/"},
      {label:"CureDuchenne family resource guide",url:"https://cureduchenne.org/family-resource-guide/"}
    ]},
    {key:"daily-living",title:"Daily Living",desc:"Everyday support for home, school and independence.",items:[
      {title:"School",body:"Work with the school on accessibility, fatigue, mobility, bathroom access, classroom participation and reasonable accommodations."},
      {title:"Energy and mobility",body:"Plan activities around energy levels and use appropriate mobility or transfer support recommended by the care team."},
      {title:"Family wellbeing",body:"DMD affects the whole family. Make room for questions, emotional support, sibling needs and practical help when it is needed."}
    ],links:[
      {label:"CureDuchenne resource library",url:"https://cureduchenne.org/resource-library-home/"},
      {label:"CureDuchenne physical therapy resources",url:"https://cureduchenne.org/physical-therapy/for-families/"}
    ]},
    {key:"support",title:"Support Network",desc:"Find practical help and people who understand DMD.",items:[
      {title:"Family organizations",body:"DMD organizations can provide education, family guidance, support programs and connections to community resources."},
      {title:"Peer connection",body:"Speaking with other parents, adults living with DMD, siblings or caregivers can help families feel less isolated."},
      {title:"Use DMD-AI Community",body:"You can also use Community & Support in DMD-AI to join native support groups, find opted-in nearby families and open verified external communities."}
    ],links:[
      {label:"CureDuchenne family support",url:"https://cureduchenne.org/family-resource-guide/"},
      {label:"PPMD support materials",url:"https://www.parentprojectmd.org/care/care-and-support-materials/"}
    ]}
  ];
  const selected=active?resources.find(r=>r.key===active):null;
  if(selected)return <section className="fp16-page fp26-resource-detail">
    <button className="fp26-back" type="button" onClick={()=>setActive(null)}>← Back to Family Resources</button>
    <div className="fp26-resource-hero"><BookOpen/><div><span>FAMILY RESOURCES</span><h1>{selected.title}</h1><p>{selected.desc}</p></div></div>
    <div className="fp26-resource-content">{selected.items.map(item=><article key={item.title}><h2>{item.title}</h2><p>{item.body}</p></article>)}</div>
    <aside className="fp26-trusted-links"><div><ShieldCheck/><div><strong>Trusted places to learn more</strong><span>Open the source when you want more detailed guidance.</span></div></div><div>{selected.links.map(link=><a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label}<ExternalLink/></a>)}</div></aside>
  </section>;

  return <section className="fp16-page">
    <div className="fp16-page-head"><div><span>FAMILY RESOURCES</span><h1>Information for everyday DMD care</h1><p>Choose a topic to open guidance inside your Family Portal.</p></div></div>
    <div className="fp16-resource-grid fp26-resource-grid">{resources.map(r=><article key={r.key}><BookOpen/><h3>{r.title}</h3><p>{r.desc}</p><button type="button" onClick={()=>setActive(r.key)}>Explore <ArrowRight/></button></article>)}</div>
  </section>;
}

function TrialsView(){
  return <section className="fp16-page">
    <div className="fp16-page-head"><div><span>CLINICAL TRIALS</span><h1>Explore DMD research opportunities responsibly</h1><p>Trial listings can help families discover studies to discuss with their clinician or the study team. DMD-AI should never claim eligibility without investigator confirmation.</p></div></div>
    <div className="fp16-trials">
      <article><FlaskConical/><h2>ClinicalTrials.gov</h2><p>Search the U.S. National Library of Medicine registry for Duchenne muscular dystrophy studies.</p><button onClick={()=>window.open("https://clinicaltrials.gov/search?cond=Duchenne%20Muscular%20Dystrophy","_blank","noopener,noreferrer")}>Search registry <ExternalLink/></button></article>
      <article><ShieldCheck/><h2>Before joining a study</h2><p>Discuss the study with your clinical team, read the consent information carefully, and confirm eligibility with the research site.</p></article>
    </div>
  </section>;
}

function HealthView(){
  const bodyViewerRef=useRef<HTMLElement|null>(null);
  const [bodyZoom,setBodyZoom]=useState(1);
  const [bodyInfoOpen,setBodyInfoOpen]=useState(false);

  const resetBodyView=()=>{
    setBodyZoom(1);
    setBodyInfoOpen(false);
  };

  const zoomBody=()=>{
    setBodyZoom(current=>current>=1.36?1:Number((current+0.12).toFixed(2)));
  };

  const toggleBodyFullscreen=async()=>{
    const viewer=bodyViewerRef.current;
    if(!viewer)return;
    try{
      if(!document.fullscreenElement)await viewer.requestFullscreen?.();
      else await document.exitFullscreen?.();
    }catch(error){
      console.warn("Body viewer fullscreen unavailable:",error);
    }
  };
  const [patients,setPatients]=useState<any[]>([]);
  const [patient,setPatient]=useState("");
  const [rows,setRows]=useState<any[]>([]);
  const [showAllCheckins,setShowAllCheckins]=useState(false);
  const [form,setForm]=useState({mobility:4,fatigue:3,pain:2,breathing:4,sleep:4,appetite:4,mood:4,falls:0,notes:""});
  const [msg,setMsg]=useState("");

  const load=async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    const p=await supabase.from("patients").select("id,first_name,last_name").eq("family_owner_id",user.id).order("created_at");
    if(p.error)return;
    setPatients(p.data||[]);
    const id=patient||p.data?.[0]?.id||"";
    if(id&&!patient)setPatient(id);
    if(id){
      const r=await supabase.from("dmd_daily_checkins").select("*").eq("family_owner_id",user.id).eq("patient_id",id).order("checkin_date",{ascending:false}).limit(14);
      if(!r.error)setRows(r.data||[]);
    }else setRows([]);
  };

  useEffect(()=>{void load()},[patient]);

  const save=async()=>{
    setMsg("");
    const {data:{user}}=await supabase.auth.getUser();
    if(!user||!patient){setMsg("Add or select a family member first.");return}
    const today=new Date().toISOString().slice(0,10);
    const {error}=await supabase.from("dmd_daily_checkins").upsert({
      family_owner_id:user.id,patient_id:patient,checkin_date:today,...form,updated_at:new Date().toISOString()
    },{onConflict:"family_owner_id,patient_id,checkin_date"});
    setMsg(error?error.message:"Today's wellbeing check-in was saved.");
    if(!error)await load();
  };

  const latest=rows[0]||null;
  const last7=[...rows].slice(0,7).reverse();
  const score=(key:string,fallback:number)=>Number(latest?.[key]??fallback);
  const metricStatus=(key:string,value:number)=>{
    if(key==="fatigue"||key==="pain"){
      if(value<=1)return {label:"None",tone:"good"};
      if(value===2)return {label:"Mild",tone:"good"};
      if(value===3)return {label:"Moderate",tone:"moderate"};
      if(value===4)return {label:"High",tone:"watch"};
      return {label:"Severe",tone:"watch"};
    }
    if(value<=1)return {label:"Poor",tone:"watch"};
    if(value===2)return {label:"Low",tone:"watch"};
    if(value===3)return {label:"Moderate",tone:"moderate"};
    if(value===4)return {label:"Good",tone:"good"};
    return {label:"Very good",tone:"good"};
  };
  const metrics=[
    {key:"mobility",label:"Mobility & Function",icon:Activity,value:Number(form.mobility),tone:"green"},
    {key:"fatigue",label:"Fatigue",icon:Zap,value:Number(form.fatigue),tone:"orange"},
    {key:"pain",label:"Pain",icon:HeartPulse,value:Number(form.pain),tone:"red"},
    {key:"breathing",label:"Breathing",icon:Wind,value:Number(form.breathing),tone:"blue"},
    {key:"sleep",label:"Sleep",icon:Moon,value:Number(form.sleep),tone:"purple"},
    {key:"appetite",label:"Appetite",icon:Apple,value:Number(form.appetite),tone:"green"},
    {key:"mood",label:"Mood",icon:Smile,value:Number(form.mood),tone:"purple"},
    {key:"falls",label:"Falls (Today)",icon:Footprints,value:Number(form.falls),tone:"orange",falls:true}
  ];

  const setMetric=(key:string,value:number)=>{
    if(key==="falls")return;
    setForm(prev=>({...prev,[key]:value}));
  };

  const summaryValues=[
    score("mobility",4),
    6-score("fatigue",3),
    6-score("pain",2),
    score("breathing",4),
    score("sleep",4),
    score("appetite",4),
    score("mood",4)
  ];
  const avg=summaryValues.reduce((a,b)=>a+b,0)/summaryValues.length;
  const overall=avg>=4?"Stable":avg>=3?"Monitor":"Needs attention";
  const watch=score("fatigue",3)>=4?"Fatigue":score("pain",2)>=4?"Pain":Number(latest?.falls||0)>0?"Falls":"None flagged";

  const linePoints=(key:string,reverse=false)=>{
    const vals=last7.map((r:any)=>{
      const raw=Number(r?.[key]??3);
      return reverse?6-raw:raw;
    });
    if(!vals.length)return "";
    const width=430,height=105;
    return vals.map((v:number,i:number)=>{
      const x=20+(i*(width-40)/Math.max(1,vals.length-1));
      const y=10+((5-v)/4)*(height-20);
      return `${x},${y}`;
    }).join(" ");
  };

  return <section className="fp19-health-page">
    <div className="fp19-health-heading">
      <div className="fp19-title-wrap"><Heart/><div><h1>Health &amp; Wellbeing Overview</h1><p>Track daily health, view trends, and understand overall wellbeing.</p></div></div>
      <select value={patient} onChange={e=>setPatient(e.target.value)}>
        <option value="">All Members</option>
        {patients.map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
      </select>
    </div>

    <div className="fp19-health-top">
      <article className="fp19-checkin-card">
        <header>
          <div><CalendarDays/><strong>TODAY'S WELLBEING CHECK-IN</strong></div>
          <span>{new Date().toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</span>
          <button type="button" onClick={()=>setForm({mobility:4,fatigue:3,pain:2,breathing:4,sleep:4,appetite:4,mood:4,falls:0,notes:""})}>+ New Check-in</button>
        </header>
        <div className="fp19-metric-grid">
          {metrics.map(({key,label,icon:Icon,value,tone,falls})=>{
            const s=falls?{label:value===0?"No falls":`${value} ${value===1?"fall":"falls"}`,tone:value===0?"good":"moderate"}:metricStatus(key,value);
            return <button type="button" className={`fp19-metric fp19-${tone}`} key={key} onClick={()=>{
              if(falls)return;
              const next=value>=5?1:value+1;
              setMetric(key,next);
            }}>
              <div className="fp19-metric-top"><span><Icon/></span><strong>{label}</strong></div>
              <b className={`fp19-status ${s.tone}`}>{s.label}</b>
              {!falls&&<>
                <div className="fp19-radio-dots" role="radiogroup" aria-label={`${label} rating`}>
                  {[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={`${label} ${n} of 5`} className={Number(form[key as keyof typeof form])===n?"selected":""} onClick={(e)=>{e.stopPropagation();setMetric(key,n)}}><i/></button>)}
                </div>
                <small className="fp27-scale-hint">{key==="fatigue"||key==="pain"?"1 = none · 5 = severe":"1 = poor · 5 = very good"}</small>
              </>}
            </button>
          })}
        </div>
        <div className="fp19-checkin-bottom">
          <label><strong>Notes (optional)</strong><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="How is your family member feeling today?"/></label>
          <div className="fp19-falls-input"><span>Falls today</span><input type="number" min="0" value={form.falls} onChange={e=>setForm({...form,falls:Number(e.target.value)})}/></div>
          <button className="fp19-save" type="button" onClick={save}><Save/> Save Check-in</button>
        </div>
        {msg&&<div className="fp19-message">{msg}</div>}
      </article>

      <article className="fp19-body-card fp20-static-body-card" ref={bodyViewerRef}>
        <header><div><PersonStanding/><strong>BODY VIEW</strong></div><span className="fp20-body-mode">Anatomy</span></header>
        <div className="fp19-body-stage fp20-body-stage">
          <div className="fp19-body-tools fp20-body-tools" aria-label="Body viewer controls">
            <button className="active" type="button" onClick={resetBodyView} title="Reset view" aria-label="Reset body view"><Activity/></button>
            <button type="button" onClick={zoomBody} title="Zoom in" aria-label="Zoom anatomy"><ZoomIn/></button>
            <button className={bodyInfoOpen?"selected":""} type="button" onClick={()=>setBodyInfoOpen(open=>!open)} title="Anatomy information" aria-label="Anatomy information" aria-pressed={bodyInfoOpen}><Layers/></button>
            <button type="button" onClick={toggleBodyFullscreen} title="Fullscreen" aria-label="Open body viewer fullscreen"><Maximize2/></button>
          </div>

          {bodyInfoOpen&&<div className="fp20-body-info"><strong>Muscular anatomy</strong><span>Static anatomical reference</span><p>Use the zoom control for a closer view. The anatomy image does not rotate automatically.</p></div>}

          <div className="fp19-body-volume fp20-body-volume" style={{transform:`scale(${bodyZoom})`}}>
            <img src="/dmd-anatomy-body.png" alt="Muscular anatomy visualization" className="fp19-anatomy fp19-body-single fp20-anatomy-static" draggable={false}/>
          </div>
          <div className="fp19-body-ring fp20-body-platform" aria-hidden="true"/>
        </div>
      </article>
    </div>

    <div className="fp19-health-bottom">
      <article className="fp19-summary-card">
        <header><ShieldCheck/><strong>WELLBEING SUMMARY</strong></header>
        <div className="fp19-summary-grid">
          <div><span>Overall Status</span><b className="good-text">{overall}</b><small>Compared to recent entries</small></div>
          <div><span>Best Area</span><b className="good-text">Mobility</b><small>Based on latest check-in</small></div>
          <div><span>Area to Watch</span><b className="orange-text">{watch}</b><small>Review family observations</small></div>
          <div><span>Total Check-ins</span><b className="purple-text">{rows.length}</b><small>Recent records loaded</small></div>
        </div>
      </article>

      <article className="fp19-trend-card">
        <header><strong>TREND OVERVIEW <small>(Last 7 Days)</small></strong></header>
        <div className="fp19-legend"><span className="g">Mobility</span><span className="o">Fatigue</span><span className="r">Pain</span><span className="p">Mood</span><span className="b">Breathing</span></div>
        {last7.length>=2?<div className="fp19-chart-wrap">
          <div className="fp19-ylabels"><span>High</span><span>Moderate</span><span>Low</span></div>
          <svg viewBox="0 0 430 120" preserveAspectRatio="none" aria-label="Wellbeing trend chart">
            <line x1="20" y1="15" x2="410" y2="15"/><line x1="20" y1="58" x2="410" y2="58"/><line x1="20" y1="100" x2="410" y2="100"/>
            <polyline className="mobility" points={linePoints("mobility")}/>
            <polyline className="fatigue" points={linePoints("fatigue",true)}/>
            <polyline className="pain" points={linePoints("pain",true)}/>
            <polyline className="mood" points={linePoints("mood")}/>
            <polyline className="breathing" points={linePoints("breathing")}/>
          </svg>
          <div className="fp19-xlabels">{last7.map((r:any)=><span key={r.id}>{new Date(r.checkin_date).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span>)}</div>
        </div>:<div className="fp26-trend-empty"><TrendingUp/><strong>{last7.length===1?"One check-in saved":"No check-ins yet"}</strong><span>{last7.length===1?"Add another check-in on a different day to start seeing a real trend.":"Save daily check-ins to build your wellbeing trend."}</span></div>}
      </article>

      <article className="fp19-recent-card">
        <header><strong>RECENT CHECK-INS</strong></header>
        <div className="fp19-recent-list">
          {rows.slice(0,5).map((r:any)=>{
            const v=(Number(r.mobility||3)+(6-Number(r.fatigue||3))+(6-Number(r.pain||3))+Number(r.breathing||3))/4;
            const label=v>=4?"Good":"Moderate";
            return <div key={r.id}><strong>{prettyDate(r.checkin_date)}</strong><span>{new Date(r.created_at||r.checkin_date).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}</span><em className={label==="Good"?"good":"moderate"}>{label}</em></div>
          })}
          {!rows.length&&<div className="fp19-no-checkins">No check-ins yet.</div>}
        </div>
        <button type="button" onClick={()=>setShowAllCheckins(true)}>View All Check-ins <ArrowRight/></button>
      </article>
    </div>

    {showAllCheckins&&<div className="fp26-modal-backdrop" role="dialog" aria-modal="true" aria-label="Check-in history" onClick={()=>setShowAllCheckins(false)}>
      <section className="fp26-history-modal" onClick={e=>e.stopPropagation()}>
        <header><div><CalendarDays/><div><span>HEALTH &amp; WELLBEING</span><h2>Check-in history</h2></div></div><button type="button" onClick={()=>setShowAllCheckins(false)} aria-label="Close">×</button></header>
        <div className="fp26-history-list">
          {rows.map((r:any)=><article key={r.id}>
            <div className="fp26-history-date"><strong>{prettyDate(r.checkin_date)}</strong><span>{r.notes||"No note added"}</span></div>
            <div className="fp26-history-metrics">
              <span>Mobility <b>{r.mobility ?? "—"}/5</b></span>
              <span>Fatigue <b>{r.fatigue ?? "—"}/5</b></span>
              <span>Pain <b>{r.pain ?? "—"}/5</b></span>
              <span>Breathing <b>{r.breathing ?? "—"}/5</b></span>
              <span>Sleep <b>{r.sleep ?? "—"}/5</b></span>
              <span>Mood <b>{r.mood ?? "—"}/5</b></span>
              <span>Falls <b>{r.falls ?? 0}</b></span>
            </div>
          </article>)}
          {!rows.length&&<div className="fp26-history-empty"><CalendarDays/><strong>No check-ins saved yet</strong><span>Your saved daily check-ins will appear here.</span></div>}
        </div>
      </section>
    </div>}

    <FamilyProfessionalCare patientId={patient} patientName={patients.find((p:any)=>p.id===patient)?.first_name || "your family member"}/>
    <div className="fp19-health-note"><Info/><div><strong>Daily tracking helps you and your care team make better decisions.</strong><span>Consistent check-ins reveal trends that might not be obvious day to day.</span></div></div>
  </section>;
}

function DocumentsView(){
  const [assessments,setAssessments]=useState<any[]>([]);
  const [patients,setPatients]=useState<any[]>([]);
  const [checkins,setCheckins]=useState<any[]>([]);
  const [showSummary,setShowSummary]=useState(false);
  useEffect(()=>{void(async()=>{
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    const [a,p,c]=await Promise.all([
      supabase.from("family_assessments").select("id,result_title,occurred_at,result_summary").eq("user_id",user.id).order("occurred_at",{ascending:false}),
      supabase.from("patients").select("id,first_name,last_name").eq("family_owner_id",user.id).order("created_at"),
      supabase.from("dmd_daily_checkins").select("*").eq("family_owner_id",user.id).order("checkin_date",{ascending:false}).limit(10)
    ]);
    if(!a.error)setAssessments(a.data||[]);
    if(!p.error)setPatients(p.data||[]);
    if(!c.error)setCheckins(c.data||[]);
  })()},[]);
  const latest=checkins[0];
  const latestAssessment=assessments[0];
  const memberName=patients.length?`${patients[0].first_name||""} ${patients[0].last_name||""}`.trim():"Family member";
  const openSummary=()=>setShowSummary(true);
  const printSummary=()=>window.print();

  return <section className="fp16-page">
    <div className="fp16-page-head"><div><span>REPORTS &amp; DOCUMENTS</span><h1>Reports &amp; Documents</h1><p>Keep reports, assessments and care information together for appointments and family reference.</p></div><button onClick={openSummary}><Download/> Family Report Summary</button></div>
    <FamilyPortalLegacy embeddedView="documents"/>
    <article className="fp17-panel"><header><div><ClipboardList/><h2>Assessment Summaries</h2></div><span>{assessments.length}</span></header>{assessments.map(a=><div className="fp17-row" key={a.id}><span className="fp17-icon"><FileText/></span><div><strong>{a.result_title||"Assessment summary"}</strong><small>{prettyDate(a.occurred_at)}</small><p>{a.result_summary}</p></div></div>)}{!assessments.length&&<EmptyFeature icon={FileText} title="No assessment summaries yet" body="Completed assessment summaries will appear here."/>}</article>
    <article className="fp16-care-summary"><div><Sparkles/><span>FOR APPOINTMENTS</span><h2>Family Report Summary</h2><p>Review a clean summary before printing or saving it as a PDF.</p></div><button onClick={openSummary}><FileText/> Open Summary</button></article>

    {showSummary&&<div className="fp26-modal-backdrop fp26-report-backdrop" role="dialog" aria-modal="true" aria-label="Family report summary" onClick={()=>setShowSummary(false)}>
      <section className="fp26-report-modal" onClick={e=>e.stopPropagation()}>
        <div className="fp26-report-actions"><button type="button" onClick={()=>setShowSummary(false)}>Close</button><button type="button" className="primary" onClick={printSummary}><Download/> Print / Save PDF</button></div>
        <article className="fp26-report-sheet">
          <header><div><HeartHandshake/><div><strong>DMD-AI</strong><span>Family Report Summary</span></div></div><small>Generated {new Date().toLocaleDateString()}</small></header>
          <section className="fp26-report-intro"><span>FAMILY MEMBER</span><h1>{memberName}</h1><p>A concise summary of information saved by your family in DMD-AI.</p></section>
          <div className="fp26-report-grid">
            <section><h3>Latest wellbeing</h3>{latest?<div className="fp26-report-metrics">
              <span>Mobility <b>{latest.mobility ?? "—"}/5</b></span><span>Fatigue <b>{latest.fatigue ?? "—"}/5</b></span>
              <span>Pain <b>{latest.pain ?? "—"}/5</b></span><span>Breathing <b>{latest.breathing ?? "—"}/5</b></span>
              <span>Sleep <b>{latest.sleep ?? "—"}/5</b></span><span>Mood <b>{latest.mood ?? "—"}/5</b></span>
              <span>Falls <b>{latest.falls ?? 0}</b></span><span>Date <b>{prettyDate(latest.checkin_date)}</b></span>
            </div>:<p>No wellbeing check-in has been saved yet.</p>}</section>
            <section><h3>Latest assessment</h3>{latestAssessment?<><strong>{latestAssessment.result_title||"Assessment summary"}</strong><small>{prettyDate(latestAssessment.occurred_at)}</small><p>{latestAssessment.result_summary}</p></>:<p>No assessment summary has been saved yet.</p>}</section>
          </div>
          <section className="fp26-report-recent"><h3>Recent check-ins</h3>{checkins.length?<div>{checkins.slice(0,5).map((r:any)=><p key={r.id}><strong>{prettyDate(r.checkin_date)}</strong><span>Mobility {r.mobility ?? "—"}/5 · Breathing {r.breathing ?? "—"}/5 · Pain {r.pain ?? "—"}/5 · Falls {r.falls ?? 0}</span></p>)}</div>:<p>No check-ins available.</p>}</section>
          <footer><ShieldCheck/><p>This summary reflects information saved in the family account. Take original clinical records and test reports to appointments when available.</p></footer>
        </article>
      </section>
    </div>}
  </section>;
}

type FamilySettings={email_notifications:boolean;care_reminders:boolean;community_notifications:boolean;research_updates:boolean;compact_sidebar:boolean;reduce_motion:boolean};
function SettingsView({name,onNameChange}:{name:string;onNameChange:(n:string)=>void}){
 const [email,setEmail]=useState(""),[phone,setPhone]=useState(""),[fullName,setFullName]=useState(name),[saved,setSaved]=useState("");
 const [prefs,setPrefs]=useState<FamilySettings>({email_notifications:true,care_reminders:true,community_notifications:true,research_updates:false,compact_sidebar:false,reduce_motion:false});
 useEffect(()=>{void(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;setEmail(user.email||"");const p=await supabase.from("profiles").select("full_name,phone").eq("id",user.id).maybeSingle();if(p.data){setFullName(p.data.full_name||name);setPhone(p.data.phone||"")}const s=await supabase.from("dmd_family_settings").select("*").eq("user_id",user.id).maybeSingle();if(s.data)setPrefs({email_notifications:s.data.email_notifications,care_reminders:s.data.care_reminders,community_notifications:s.data.community_notifications,research_updates:s.data.research_updates,compact_sidebar:s.data.compact_sidebar,reduce_motion:s.data.reduce_motion})})()},[]);
 const saveProfile=async()=>{setSaved("");const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {error}=await supabase.from("profiles").update({full_name:fullName.trim(),phone:phone.trim()||null,updated_at:new Date().toISOString()}).eq("id",user.id);if(error)setSaved(error.message);else{onNameChange(fullName.trim()||"Family");setSaved("Profile saved.")}};
 const savePrefs=async(next:FamilySettings)=>{setPrefs(next);const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {error}=await supabase.from("dmd_family_settings").upsert({user_id:user.id,...next,updated_at:new Date().toISOString()});setSaved(error?error.message:"Preferences saved.")};
 const toggle=(key:keyof FamilySettings)=><button className={`fp17-toggle ${prefs[key]?"on":""}`} onClick={()=>void savePrefs({...prefs,[key]:!prefs[key]})} aria-pressed={prefs[key]}><i/></button>;
 const signout=async()=>{await supabase.auth.signOut();window.location.href="/"};
 return <section className="fp16-page"><div className="fp16-page-head"><div><span>SETTINGS</span><h1>Account & preferences</h1><p>Manage your family account, notifications, accessibility and security from one familiar settings area.</p></div></div>
 <div className="fp17-settings-layout"><nav className="fp17-settings-nav"><a href="#profile"><UserRoundCheck/> Profile</a><a href="#notifications"><Bell/> Notifications</a><a href="#accessibility"><SlidersHorizontal/> Accessibility</a><a href="#security"><LockKeyhole/> Security</a><a href="#account"><Settings/> Account</a></nav><div className="fp17-settings-main">
 <article id="profile" className="fp17-settings-card"><header><UserRoundCheck/><div><h2>Profile information</h2><p>Basic information shown in your Family Portal.</p></div></header><div className="fp17-form-grid"><label>Full name<input value={fullName} onChange={e=>setFullName(e.target.value)}/></label><label>Email address<div className="fp17-readonly"><Mail/>{email||"No email"}</div></label><label>Phone number<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 ..."/></label></div><button className="fp17-primary" onClick={saveProfile}><Save/> Save profile</button></article>
 <article id="notifications" className="fp17-settings-card"><header><Bell/><div><h2>Notifications</h2><p>Choose what DMD-AI should notify you about.</p></div></header>{[["email_notifications","Email notifications","Important account and platform messages"],["care_reminders","Care reminders","Reminders for saved appointments and care tasks"],["community_notifications","Community activity","Replies and activity in communities you join"],["research_updates","Research updates","Optional DMD research and clinical-trial updates"]].map(([k,t,d])=><div className="fp17-setting-row" key={k}><div><strong>{t}</strong><span>{d}</span></div>{toggle(k as keyof FamilySettings)}</div>)}</article>
 <article id="accessibility" className="fp17-settings-card"><header><SlidersHorizontal/><div><h2>Accessibility & display</h2><p>Adjust the portal experience for comfort.</p></div></header><div className="fp17-setting-row"><div><strong>Compact sidebar</strong><span>Use a denser navigation layout on supported screens.</span></div>{toggle("compact_sidebar")}</div><div className="fp17-setting-row"><div><strong>Reduce motion</strong><span>Reduce non-essential interface animation.</span></div>{toggle("reduce_motion")}</div></article>
 <article id="security" className="fp17-settings-card"><header><LockKeyhole/><div><h2>Security</h2><p>Your password is managed securely through your authenticated account.</p></div></header><button className="fp17-secondary" onClick={async()=>{if(!email)return;const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/login`});setSaved(error?error.message:"Password reset instructions were sent to your email.")}}>Change password</button></article>
 <article id="account" className="fp17-settings-card"><header><Settings/><div><h2>Account</h2><p>Session and account controls.</p></div></header><button className="fp17-danger" onClick={signout}><LogOut/> Sign out</button></article>{saved&&<div className="fp17-save-toast"><Check/> {saved}</div>}</div></div></section>
}
export default function FamilyPortal(){
  const navigate=useNavigate();
  const [view,setView]=useState<PortalView>("Dashboard");
  const [journeySub,setJourneySub]=useState<JourneySubView>("Family Profiles");
  const [expanded,setExpanded]=useState<Record<string,boolean>>({
    "My DMD Journey":false
  });
  const [name,setName]=useState("Family");
  const [assessmentRows,setAssessmentRows]=useState<AssessmentRow[]>([]);
  const [familyCount,setFamilyCount]=useState(0);
  const [appointmentCount,setAppointmentCount]=useState(0);

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      try{await syncPendingAssessment()}catch(e){console.warn("Pending assessment sync:",e)}
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)return;
      const profile=await supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle();
      if(active){const full=(profile.data as {full_name?:string}|null)?.full_name?.trim();setName(full||user.user_metadata?.full_name||"Family")}
      const assessments=await supabase.from("family_assessments").select("id,result_level,result_title,result_summary,detected_features,next_steps,occurred_at,structured_history").eq("user_id",user.id).order("occurred_at",{ascending:false}).limit(8);
      if(!assessments.error&&active)setAssessmentRows((assessments.data||[]) as AssessmentRow[]);
      const families=await supabase.from("patients").select("id",{count:"exact",head:true}).eq("family_owner_id",user.id);
      if(!families.error&&active)setFamilyCount(families.count||0);
      const appointments=await supabase.from("family_appointments").select("id",{count:"exact",head:true}).eq("created_by",user.id).gte("appointment_at",new Date().toISOString()).neq("status","cancelled");
      if(!appointments.error&&active)setAppointmentCount(appointments.count||0);
    };
    void load(); const refresh=()=>void load(); window.addEventListener("dmd-assessment-synced",refresh);
    return()=>{active=false;window.removeEventListener("dmd-assessment-synced",refresh)};
  },[]);

  const latest=assessmentRows[0]||null;
  const previous=assessmentRows.slice(1,3);
  const features=useMemo(()=>latest?.detected_features?.slice(0,3)||[],[latest]);
  const latestProgression=String(latest?.structured_history?.progression||"Not recorded");
  const familyTitle=name.endsWith("Family")?name:`${name.split(" ")[0] || "Your"}'s Family`;
  const openNav=(label:string)=>{
    if(label==="Assessments"){navigate("/family/assessments");return}
    if(label==="Health & Wellbeing"){setView("Health & Wellbeing");return}
        setView(label as PortalView);
  };

  const dashboard=<>
    <section className="fdv6-hero"><img src={familyHero} alt=""/><div className="fdv6-hero-fade"/><div className="fdv6-hero-copy"><h1>Welcome back!<span>{familyTitle}</span></h1><p>Your DMD journey, information and support<br/>in one organized place.</p><i/></div></section>
    <section className="fdv6-stats">
      <article><Users/><div><span>Family Members</span><strong>{familyCount}</strong><small>Active in your account</small></div></article>
      <article><ClipboardList/><div><span>Assessments</span><strong>{assessmentRows.length}</strong><small>{latest?`Latest: ${prettyDate(latest.occurred_at)}`:"No saved assessments yet"}</small></div></article>
      <article><Heart/><div><span>Care Reminders</span><strong>{appointmentCount}</strong><small>Upcoming visits / checks</small></div></article>
      <article><ShieldCheck/><div><span>Account Status</span><strong className="secure">Private</strong><small>Family-controlled information</small></div></article>
    </section>
    <section className="fp16-quick">
      <button onClick={()=>navigate("/#assistant")}><ClipboardList/><div><strong>Take an Assessment</strong><span>Organize concerns before seeking care</span></div><ArrowRight/></button>
      <button onClick={()=>setView("My DMD Journey")}><FileText/><div><strong>Prepare Care Summary</strong><span>Print or save information for an appointment</span></div><ArrowRight/></button>
      <button onClick={()=>setView("Find Care")}><MapPin/><div><strong>Find DMD Care</strong><span>Search hospitals, specialists and services</span></div><ArrowRight/></button>
      <button onClick={()=>setView("Community & Support")}><HeartHandshake/><div><strong>Community & Support</strong><span>Connect with families who understand</span></div><ArrowRight/></button>
    </section>
    <section className="fdv6-dashboard-grid">
      <article className="fdv6-card fdv6-latest"><header><div><ClipboardList/><h2>Latest Assessment</h2></div>{latest&&<span className="saved">Saved</span>}</header>
        {latest?<div className="fdv6-latest-body"><div className="fdv6-date-row"><CalendarDays/><strong>{prettyDate(latest.occurred_at)}</strong><span className="review">{levelLabel(latest.result_level)}</span></div><h3>Key reported changes:</h3><ul>{features.length?features.map(x=><li key={x}>{x}</li>):<li>No structured features recorded</li>}</ul><div className="fdv6-guidance"><Heart/><div><strong>DMD-AI Guidance:</strong><p>{latest.result_summary}</p></div></div><button onClick={()=>navigate("/family/assessments")}>View Assessment History <ArrowRight/></button></div>:<EmptyFeature icon={ClipboardList} title="No saved assessment yet" body="Complete a guided assessment to begin your family's DMD-AI history." action="Take an assessment" onAction={()=>navigate("/#assistant")}/>}
      </article>
      <article className="fdv6-card fdv6-progress"><header><TrendingUp/><h2>My DMD Journey</h2></header><div className="fdv6-timeline">{latest?<><div className="fdv6-time active"><i/><div><strong>{prettyDate(latest.occurred_at)}</strong><b>Latest assessment</b><span>{latestProgression==="worse"?"Review needed":"Saved assessment"}</span></div></div>{previous.map((row,index)=><div className="fdv6-time" key={row.id}><i/><div><strong>{prettyDate(row.occurred_at)}</strong><b>{index===0?"Previous assessment":"Earlier assessment"}</b><span>{String(row.structured_history?.progression||"Monitoring changes")}</span></div></div>)}</>:<div className="fdv6-time active"><i/><div><strong>Start here</strong><b>Build your journey</b><span>Saved assessments and care milestones can appear here.</span></div></div>}</div><div className="fdv6-trend"><Info/><span><strong>Important:</strong> DMD-AI assessment history is not the same as a confirmed medical diagnosis.</span></div></article>
      <div className="fdv6-right">
        <article className="fdv6-card fdv6-reminders"><header><CalendarDays/><h2>Care Reminders</h2><button onClick={()=>setView("My DMD Journey")}>View All</button></header>{appointmentCount>0?<div className="fdv6-reminder"><CalendarDays/><div><strong>Upcoming care visit</strong><span>Open Appointments for details</span></div><em>Upcoming</em></div>:<div className="fdv6-reminder-empty"><CalendarDays/><p>No upcoming care reminders yet.</p></div>}</article>
        <button className="fp16-community-card" onClick={()=>setView("Community & Support")}><HeartHandshake/><div><h2>Community & Support</h2><p>Find peer support, join groups and share experiences.</p></div><ArrowRight/></button>
        <article className="fdv6-privacy"><ShieldCheck/><div><h3>Privacy & Trust</h3><p>Your family decides what information to store and share.</p></div></article>
      </div>
    </section>
  </>;

  let content:any=dashboard;
  if(view==="My DMD Journey")content=<JourneyView activeSub={journeySub}/>;
  if(view==="Health & Wellbeing")content=<HealthView/>;
  if(view==="Assessments"){navigate("/family/assessments");return null}
  if(view==="Reports & Documents")content=<DocumentsView/>;
  if(view==="Find Care")content=<FindCareView/>;
  if(view==="Community & Support")content=<CommunityView/>;
  if(view==="Resources")content=<ResourcesView/>;
  if(view==="Clinical Trials")content=<TrialsView/>;
  if(view==="Settings")content=<SettingsView name={name} onNameChange={setName}/>;

  return <div className="fdv6-shell fp16-shell">
    <aside className="fdv6-sidebar fp16-sidebar">
      <div className="fdv6-brand"><HeartHandshake/><div><strong>DMD-AI</strong><span>Family Portal</span></div></div>
      <nav className="fdv6-nav fp17-tree-nav">{navigation.map(({label,icon:Icon})=>{
        const hasChildren=label==="My DMD Journey";
        const isOpen=!!expanded[label];
        return <div className={`fp17-nav-group ${view===label?"active-group":""}`} key={label}>
          <button className={(view===label||(view==="Dashboard"&&label==="Dashboard"))?"active":""} onClick={()=>{
            openNav(label);
            if(hasChildren)setExpanded(prev=>({...prev,[label]:!prev[label]}));
          }}><Icon/><span>{label}</span>{hasChildren&&(isOpen?<ChevronDown className="fp17-nav-chevron"/>:<ChevronRight className="fp17-nav-chevron"/>)}</button>
          {label==="My DMD Journey"&&isOpen&&<div className="fp17-submenu">{journeySubItems.map(item=><button key={item} className={view==="My DMD Journey"&&journeySub===item?"sub-active":""} onClick={()=>{setView("My DMD Journey");setJourneySub(item)}}><span>{item}</span></button>)}</div>}
        </div>
      })}</nav>
      <section className="fdv6-alone"><Heart/><div><strong>You are not alone.</strong><p>Find information, care and people who understand the DMD journey.</p></div></section>
      <div className="fdv6-account"><span>{initials(name)}</span><div><strong>{name}</strong><small>Family Account</small></div><ChevronDown/></div>
    </aside>
    <main className="fdv6-main">
      <header className="fdv6-topbar"><div className="fdv6-slogan"><Heart/> <strong>Stronger together, beyond Duchenne.</strong></div><div className="fdv6-topright"><button aria-label="Notifications"><Bell/></button><div className="fdv6-mini-avatar">{initials(name)}</div><div><strong>{familyTitle}</strong><small>Family Account</small></div><ChevronDown/></div></header>
      <div className="fdv6-content fp16-content">{content}</div>
    </main>
  </div>;
}
