import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Dna, Globe2, Menu, Moon, Search, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPublicLanguage, PUBLIC_LANGUAGES, setPublicLanguage, type LanguageCode } from "../../lib/publicLanguage";
import "./PublicNavbar.css";

type MenuKey = "families" | "hospitals" | "resources" | null;
type MenuItem = { label: string; description: string; to: string };
type MenuGroup = { title: string; items: MenuItem[] };

const familyGroups: MenuGroup[] = [
  {title:"Understand & Learn",items:[
    {label:"About DMD",description:"Learn the basics",to:"/about-dmd"},
    {label:"Symptoms & Signs",description:"What families may notice",to:"/families#symptoms"},
    {label:"Diagnosis Journey",description:"Testing and what to expect",to:"/families#journey"},
    {label:"Treatment & Care",description:"Care across the DMD journey",to:"/families#care"},
    {label:"Living with DMD",description:"Daily life and family support",to:"/families#support"},
  ]},
  {title:"Tools & Support",items:[
    {label:"AI Symptom Assistant",description:"Tell us what you have noticed",to:"/#assistant"},
    {label:"Prepare for Appointment",description:"Organize questions and changes",to:"/families#appointments"},
    {label:"Track Changes Over Time",description:"Save observations to your account",to:"/families#tracking"},
    {label:"Genetics & Inheritance",description:"Understand family risk and counselling",to:"/families#genetics"},
    {label:"Support & Community",description:"Find reliable support resources",to:"/families#support"},
  ]},
];
const hospitalGroups: MenuGroup[] = [
  {title:"Clinical Solutions",items:[
    {label:"Clinical Intelligence",description:"DMD-focused longitudinal insight",to:"/hospitals#intelligence"},
    {label:"Patient 360°",description:"One DMD-specific patient view",to:"/hospitals#patient360"},
    {label:"Care Coordination",description:"Connect multidisciplinary teams",to:"/hospitals#coordination"},
    {label:"Outcomes & Analytics",description:"Track change across time",to:"/hospitals#analytics"},
  ]},
  {title:"Organizations",items:[
    {label:"Research & Registry",description:"Governed research infrastructure",to:"/hospitals#research"},
    {label:"How Verification Works",description:"Clinical organization onboarding",to:"/hospitals#verification"},
    {label:"Request a Pilot",description:"Explore DMD-AI with your team",to:"/hospitals#pilot"},
    {label:"Hospital Sign In",description:"Open your verified workspace",to:"/login"},
  ]},
];
const resourceGroups: MenuGroup[] = [
  {title:"Resource Library",items:[
    {label:"Understanding DMD",description:"Foundations, signs and diagnosis",to:"/resources?category=understanding"},
    {label:"Care & Management",description:"Practical care information",to:"/resources?category=care"},
    {label:"Research & Therapies",description:"Research and emerging therapies",to:"/resources?category=research"},
    {label:"Living & Support",description:"Daily life and support",to:"/resources?category=support"},
  ]},
  {title:"More",items:[
    {label:"For Professionals",description:"Clinical references and tools",to:"/resources?category=professional"},
    {label:"Global Resources",description:"Organizations and support networks",to:"/resources?category=global"},
    {label:"Appointment Prep",description:"Prepare a doctor-ready summary",to:"/families#appointments"},
    {label:"Genetics Guide",description:"Inheritance and counselling",to:"/families#genetics"},
  ]},
];

const navText: Partial<Record<LanguageCode,{home:string;families:string;hospitals:string;resources:string;about:string;signin:string;search:string}>> = {
  en:{home:"Home",families:"For Families",hospitals:"For Hospitals",resources:"Resources",about:"About DMD",signin:"Sign in / Sign up",search:"Search languages"},
  es:{home:"Inicio",families:"Para familias",hospitals:"Para hospitales",resources:"Recursos",about:"Sobre DMD",signin:"Iniciar sesión / Registrarse",search:"Buscar idiomas"},
  fr:{home:"Accueil",families:"Pour les familles",hospitals:"Pour les hôpitaux",resources:"Ressources",about:"À propos de DMD",signin:"Connexion / Inscription",search:"Rechercher une langue"},
  de:{home:"Startseite",families:"Für Familien",hospitals:"Für Kliniken",resources:"Ressourcen",about:"Über DMD",signin:"Anmelden / Registrieren",search:"Sprachen suchen"},
  pt:{home:"Início",families:"Para famílias",hospitals:"Para hospitais",resources:"Recursos",about:"Sobre DMD",signin:"Entrar / Criar conta",search:"Pesquisar idiomas"},
  it:{home:"Home",families:"Per le famiglie",hospitals:"Per gli ospedali",resources:"Risorse",about:"Informazioni su DMD",signin:"Accedi / Registrati",search:"Cerca lingue"},
  ar:{home:"الرئيسية",families:"للعائلات",hospitals:"للمستشفيات",resources:"المصادر",about:"حول DMD",signin:"تسجيل الدخول / إنشاء حساب",search:"البحث عن لغة"},
  hi:{home:"होम",families:"परिवारों के लिए",hospitals:"अस्पतालों के लिए",resources:"संसाधन",about:"DMD के बारे में",signin:"साइन इन / साइन अप",search:"भाषाएँ खोजें"},
  pa:{home:"ਮੁੱਖ",families:"ਪਰਿਵਾਰਾਂ ਲਈ",hospitals:"ਹਸਪਤਾਲਾਂ ਲਈ",resources:"ਸਰੋਤ",about:"DMD ਬਾਰੇ",signin:"ਸਾਈਨ ਇਨ / ਸਾਈਨ ਅਪ",search:"ਭਾਸ਼ਾਵਾਂ ਖੋਜੋ"},
  bn:{home:"হোম",families:"পরিবারের জন্য",hospitals:"হাসপাতালের জন্য",resources:"রিসোর্স",about:"DMD সম্পর্কে",signin:"সাইন ইন / সাইন আপ",search:"ভাষা খুঁজুন"},
  ur:{home:"ہوم",families:"خاندانوں کے لیے",hospitals:"ہسپتالوں کے لیے",resources:"وسائل",about:"DMD کے بارے میں",signin:"سائن ان / سائن اپ",search:"زبان تلاش کریں"},
  ig:{home:"Ụlọ",families:"Maka Ezinụlọ",hospitals:"Maka Ụlọ Ọgwụ",resources:"Akụrụngwa",about:"Banyere DMD",signin:"Banye / Debanye aha",search:"Chọọ asụsụ"},
  yo:{home:"Ilé",families:"Fún àwọn ẹbí",hospitals:"Fún ilé ìwòsàn",resources:"Àwọn ohun èlò",about:"Nípa DMD",signin:"Wọlé / Forúkọsílẹ̀",search:"Wa èdè"},
  ha:{home:"Gida",families:"Ga Iyalai",hospitals:"Ga Asibitoci",resources:"Albarkatu",about:"Game da DMD",signin:"Shiga / Yi rajista",search:"Nemo harshe"},
  sw:{home:"Nyumbani",families:"Kwa Familia",hospitals:"Kwa Hospitali",resources:"Rasilimali",about:"Kuhusu DMD",signin:"Ingia / Jisajili",search:"Tafuta lugha"},
  zh:{home:"首页",families:"家庭",hospitals:"医院",resources:"资源",about:"关于 DMD",signin:"登录 / 注册",search:"搜索语言"},
  ja:{home:"ホーム",families:"ご家族向け",hospitals:"医療機関向け",resources:"リソース",about:"DMDについて",signin:"ログイン / 登録",search:"言語を検索"},
  ko:{home:"홈",families:"가족용",hospitals:"병원용",resources:"자료",about:"DMD 소개",signin:"로그인 / 가입",search:"언어 검색"},
  ru:{home:"Главная",families:"Для семей",hospitals:"Для клиник",resources:"Ресурсы",about:"О DMD",signin:"Войти / Регистрация",search:"Поиск языка"},
  tr:{home:"Ana Sayfa",families:"Aileler İçin",hospitals:"Hastaneler İçin",resources:"Kaynaklar",about:"DMD Hakkında",signin:"Giriş / Kayıt",search:"Dil ara"},
  tw:{home:"Fie",families:"Mmusua",hospitals:"Ayaresabea",resources:"Nneɛma",about:"DMD ho nsɛm",signin:"Kɔ mu / Yɛ akonta",search:"Hwehwɛ kasa"},
  ta:{home:"முகப்பு",families:"குடும்பங்களுக்கு",hospitals:"மருத்துவமனைகளுக்கு",resources:"வளங்கள்",about:"DMD பற்றி",signin:"உள்நுழை / பதிவு",search:"மொழிகளைத் தேடு"},
  te:{home:"హోమ్",families:"కుటుంబాల కోసం",hospitals:"ఆసుపత్రుల కోసం",resources:"వనరులు",about:"DMD గురించి",signin:"సైన్ ఇన్ / సైన్ అప్",search:"భాషలను వెతకండి"},
  ml:{home:"ഹോം",families:"കുടുംബങ്ങൾക്ക്",hospitals:"ആശുപത്രികൾക്ക്",resources:"വിഭവങ്ങൾ",about:"DMDയെ കുറിച്ച്",signin:"സൈൻ ഇൻ / സൈൻ അപ്പ്",search:"ഭാഷകൾ തിരയുക"},
};

function PublicNavbar(){
  const navigate=useNavigate(); const location=useLocation();
  const [openMenu,setOpenMenu]=useState<MenuKey>(null); const [mobileOpen,setMobileOpen]=useState(false);
  const [darkMode,setDarkMode]=useState(()=>localStorage.getItem("dmd-public-theme")==="dark");
  const [language,setLanguageState]=useState<LanguageCode>(getPublicLanguage());
  const [languageOpen,setLanguageOpen]=useState(false); const [languageSearch,setLanguageSearch]=useState("");
  const languageWrap=useRef<HTMLDivElement>(null);
  const tx={...(navText.en!),...(navText[language]||{})};
  const activeLanguage=PUBLIC_LANGUAGES.find((item)=>item.code===language) || PUBLIC_LANGUAGES[0];
  const filteredLanguages=useMemo(()=>{const q=languageSearch.trim().toLowerCase();return !q?PUBLIC_LANGUAGES:PUBLIC_LANGUAGES.filter((item)=>`${item.name} ${item.nativeName}`.toLowerCase().includes(q));},[languageSearch]);

  useEffect(()=>{document.documentElement.classList.toggle("dmd-public-dark",darkMode);localStorage.setItem("dmd-public-theme",darkMode?"dark":"light");},[darkMode]);
  useEffect(()=>{const onPointer=(event:PointerEvent)=>{if(languageWrap.current&&!languageWrap.current.contains(event.target as Node))setLanguageOpen(false)};document.addEventListener("pointerdown",onPointer);return()=>document.removeEventListener("pointerdown",onPointer);},[]);

  const go=(to:string)=>{setOpenMenu(null);setMobileOpen(false);navigate(to);if(to.includes("#")){const id=to.split("#")[1];setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"}),80)}};
  const chooseLanguage=(code:LanguageCode)=>{setLanguageState(code);setPublicLanguage(code);setLanguageOpen(false);setLanguageSearch("");};
  const menu=(key:Exclude<MenuKey,null>,label:string,groups:MenuGroup[],target:string)=><div className="public-nav-menu-wrap" onMouseEnter={()=>setOpenMenu(key)} onMouseLeave={()=>setOpenMenu(null)}><button className={location.pathname===target?"public-nav-link active":"public-nav-link"} onClick={()=>go(target)}>{label}<ChevronDown size={15}/></button>{openMenu===key&&<div className="public-mega-menu">{groups.map(group=><div className="public-mega-column" key={group.title}><strong>{group.title}</strong>{group.items.map(item=><button key={item.label} onClick={()=>go(item.to)}><span>{item.label}</span><small>{item.description}</small></button>)}</div>)}</div>}</div>;

  return <header className="public-navbar"><div className="public-navbar-inner">
    <button className="public-brand" onClick={()=>go("/")}><span className="public-brand-mark"><Dna size={28}/></span><span><strong>DMD-AI</strong><small>Duchenne Intelligence</small></span></button>
    <nav className={mobileOpen?"public-nav-links mobile-open":"public-nav-links"}><button className={location.pathname==="/"?"public-nav-link active":"public-nav-link"} onClick={()=>go("/")}>{tx.home}</button>{menu("families",tx.families,familyGroups,"/families")}{menu("hospitals",tx.hospitals,hospitalGroups,"/hospitals")}{menu("resources",tx.resources,resourceGroups,"/resources")}<button className={location.pathname==="/about-dmd"?"public-nav-link active":"public-nav-link"} onClick={()=>go("/about-dmd")}>{tx.about}</button></nav>
    <div className="public-navbar-actions">
      <div className="public-language-wrap" ref={languageWrap}>
        <button className={languageOpen?"public-language open":"public-language"} onClick={()=>setLanguageOpen(v=>!v)}><Globe2 size={17}/><span>{activeLanguage.nativeName}</span><ChevronDown size={14}/></button>
        {languageOpen&&<div className="language-menu"><div className="language-menu-head"><strong>Language</strong><small>Choose your preferred language</small></div><label className="language-search"><Search size={16}/><input autoFocus value={languageSearch} onChange={(e)=>setLanguageSearch(e.target.value)} placeholder={tx.search}/></label><div className="language-list">{filteredLanguages.map(item=><button key={item.code} className={language===item.code?"selected":""} onClick={()=>chooseLanguage(item.code)}><span><b>{item.nativeName}</b><small>{item.name}</small></span>{language===item.code&&<Check size={17}/>}</button>)}</div></div>}
      </div>
      <button className="public-theme" aria-label="Toggle theme" onClick={()=>setDarkMode(v=>!v)}><Moon size={18}/></button>
      <button className="public-signin" onClick={()=>go("/login")}>{tx.signin}</button>
      <button className="public-mobile-toggle" onClick={()=>setMobileOpen(v=>!v)} aria-label="Menu">{mobileOpen?<X/>:<Menu/>}</button>
    </div>
  </div></header>
}
export default PublicNavbar;
