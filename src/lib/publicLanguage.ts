export type LanguageCode =
  | "en" | "es" | "fr" | "de" | "pt" | "it" | "ar" | "hi" | "pa" | "bn"
  | "ur" | "ig" | "yo" | "ha" | "sw" | "zh" | "ja" | "ko" | "ru" | "tr"
  | "tw" | "ta" | "te" | "ml";

export const PUBLIC_LANGUAGES: { code: LanguageCode; name: string; nativeName: string; rtl?: boolean }[] = [
  {code:"en",name:"English",nativeName:"English"},
  {code:"es",name:"Spanish",nativeName:"Español"},
  {code:"fr",name:"French",nativeName:"Français"},
  {code:"de",name:"German",nativeName:"Deutsch"},
  {code:"pt",name:"Portuguese",nativeName:"Português"},
  {code:"it",name:"Italian",nativeName:"Italiano"},
  {code:"ar",name:"Arabic",nativeName:"العربية",rtl:true},
  {code:"hi",name:"Hindi",nativeName:"हिन्दी"},
  {code:"pa",name:"Punjabi",nativeName:"ਪੰਜਾਬੀ"},
  {code:"bn",name:"Bengali",nativeName:"বাংলা"},
  {code:"ur",name:"Urdu",nativeName:"اردو",rtl:true},
  {code:"ig",name:"Igbo",nativeName:"Igbo"},
  {code:"yo",name:"Yoruba",nativeName:"Yorùbá"},
  {code:"ha",name:"Hausa",nativeName:"Hausa"},
  {code:"sw",name:"Swahili",nativeName:"Kiswahili"},
  {code:"zh",name:"Chinese",nativeName:"中文"},
  {code:"ja",name:"Japanese",nativeName:"日本語"},
  {code:"ko",name:"Korean",nativeName:"한국어"},
  {code:"ru",name:"Russian",nativeName:"Русский"},
  {code:"tr",name:"Turkish",nativeName:"Türkçe"},
  {code:"tw",name:"Twi",nativeName:"Twi"},
  {code:"ta",name:"Tamil",nativeName:"தமிழ்"},
  {code:"te",name:"Telugu",nativeName:"తెలుగు"},
  {code:"ml",name:"Malayalam",nativeName:"മലയാളം"},
];

export const getPublicLanguage = (): LanguageCode => {
  const value = localStorage.getItem("dmd-public-language") as LanguageCode | null;
  return PUBLIC_LANGUAGES.some((item)=>item.code===value) ? value! : "en";
};

export const setPublicLanguage = (code: LanguageCode) => {
  localStorage.setItem("dmd-public-language", code);
  const language = PUBLIC_LANGUAGES.find((item)=>item.code===code);
  document.documentElement.lang = code;
  document.documentElement.dir = language?.rtl ? "rtl" : "ltr";
  window.dispatchEvent(new CustomEvent("dmd-language-change", {detail:code}));
};
