import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Compass, FileText, HeartPulse, Info, LockKeyhole, MessageCircle, Mic, Paperclip, Send, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PublicNavbar from "../../components/public/PublicNavbar";
import { getPublicLanguage, type LanguageCode } from "../../lib/publicLanguage";
import { savePendingAssessment } from "../../lib/familyAssessment";
import { buildAssessmentFeatureVector } from "../../lib/assessmentMlFeatures";
import { detectAssessmentRoute, type AlternativeContext } from "../../services/dmdAssessmentEngine";
import "./HomeGuest.css";
import homeFamilyPeople from "../../assets/public/home-family-people-clean.jpg";

type TextPack = {
  badge:string; titleA:string; titleB:string; subtitle:string; private:string; privateSmall:string;
  families:string; familiesSmall:string; clinical:string; clinicalSmall:string; promptTitle:string; promptHelp:string;
  example:string; attach:string; examples:string; common:string; falls:string; stairs:string; standing:string; tired:string;
  weakness:string; more:string; disclaimerTitle:string; disclaimer:string; free:string; noCard:string;
  trusted:string; trustedSmall:string; expert:string; expertSmall:string; control:string; controlSmall:string; alone:string; aloneSmall:string;
  understood:string; confirm:string; continue:string; changeAnswers:string; signToSave:string;
};


function QuickSymptomIcon({type}:{type:"falls"|"stairs"|"standing"|"tired"|"weakness"|"more"}){
  const common={width:20,height:20,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true};
  if(type==="falls") return <svg {...common}><path d="M5 5.5 8.5 4l2 3.2 3.3 1.1"/><circle cx="7.5" cy="2.7" r="1.5"/><path d="m10 8-2 4 3 2 2.2 5"/><path d="m8 12-4 3"/><path d="m13 10 4-2 2 2"/></svg>;
  if(type==="stairs") return <svg {...common}><path d="M4 19h4v-4h4v-4h4V7h4"/><path d="M4 19h16"/></svg>;
  if(type==="standing") return <svg {...common}><circle cx="12" cy="4" r="2"/><path d="M12 6v6m0 0-4 3m4-3 4 3m-4-5-4-2m4 2 4-2m-6 7-1 5m5-5 1 5"/></svg>;
  if(type==="tired") return <svg {...common}><rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4"/><path d="M6 10v4"/></svg>;
  if(type==="weakness") return <svg {...common}><path d="M7 15c1-4 3-6 5-6 1.8 0 2.7 1 3.5 2.2"/><path d="M6 15c0 2.8 2.2 5 5 5h2c3 0 5-2 5-5"/><path d="M10 9 9 5m5 5 2-3"/><path d="M7 14h10"/></svg>;
  return <svg {...common}><rect x="4" y="4" width="5" height="5" rx="1"/><rect x="15" y="4" width="5" height="5" rx="1"/><rect x="4" y="15" width="5" height="5" rx="1"/><rect x="15" y="15" width="5" height="5" rx="1"/></svg>;
}

function HeartHandsMark(){
  return <div className="heart-hands-mark" aria-hidden="true">
    <svg viewBox="0 0 180 100" fill="none">
      <path className="hh-glow" d="M90 69S47 44 47 21c0-13 17-21 28-8l15 17 15-17c11-13 28-5 28 8 0 23-43 48-43 48Z"/>
      <path d="M14 82c14-7 24-9 35-5 10 4 18 11 29 11M166 82c-14-7-24-9-35-5-10 4-18 11-29 11"/>
      <path d="M18 74c8-17 20-24 33-19 10 4 16 13 25 18M162 74c-8-17-20-24-33-19-10 4-16 13-25 18"/>
      <path d="M29 89c15 1 31 0 43 7M151 89c-15 1-31 0-43 7"/>
    </svg>
  </div>
}

const EN:TextPack={
  badge:"Your AI companion for DMD guidance",titleA:"Understand what you're seeing.",titleB:"Know what to do next.",
  subtitle:"Describe the changes or concerns about your child in your own words. DMD-AI helps you organize the information and guide you on next steps.",
  private:"Private & Secure",privateSmall:"Your conversations are always private.",families:"Built for Families",familiesSmall:"Designed to support you every step of the way.",
  clinical:"Clinically Informed",clinicalSmall:"Grounded in trusted DMD information and professional care pathways.",promptTitle:"What have you noticed?",promptHelp:"Type in your own words. I'll help you understand and guide you.",
  example:"Example: My 7-year-old son falls often, has trouble climbing stairs, uses his hands on his legs to stand up, and gets tired easily...",attach:"Attach report or document (optional)",examples:"Examples",
  common:"Or try one of these common changes",falls:"Frequent falls",stairs:"Difficulty climbing stairs",standing:"Trouble standing up",tired:"Gets tired easily",weakness:"Muscle weakness",more:"More symptoms",
  disclaimerTitle:"DMD-AI does not provide medical diagnoses.",disclaimer:"I can help you organize patterns and prepare what to discuss with a qualified healthcare professional.",free:"Free to start",noCard:"No credit card required",
  trusted:"Families First",trustedSmall:"Built to help families describe and follow meaningful changes.",expert:"Evidence Focused",expertSmall:"Important guidance is linked to reliable clinical information.",control:"Your Data, Your Control",controlSmall:"You decide what to save and share.",alone:"You Are Not Alone",aloneSmall:"Support and clear next steps when you need them.",
  understood:"I understood these changes",confirm:"Please confirm what applies before we continue.",continue:"Continue",changeAnswers:"You can change your answers anytime",signToSave:"Create a free account later to save and track this assessment."
};

const packs: Partial<Record<LanguageCode,Partial<TextPack>>> = {
  es:{badge:"Tu asistente de IA para orientación sobre DMD",titleA:"Entiende lo que estás viendo.",titleB:"Sabe qué hacer después.",subtitle:"Describe con tus propias palabras los cambios o preocupaciones sobre tu hijo. DMD-AI te ayuda a organizar la información y orientarte sobre los próximos pasos.",promptTitle:"¿Qué has notado?",promptHelp:"Escríbelo con tus propias palabras. Te ayudaré a organizarlo y orientarte.",attach:"Adjuntar informe o documento (opcional)",examples:"Ejemplos",common:"O prueba uno de estos cambios frecuentes",falls:"Caídas frecuentes",stairs:"Dificultad para subir escaleras",standing:"Dificultad para ponerse de pie",tired:"Se cansa fácilmente",weakness:"Debilidad muscular",more:"Más síntomas",private:"Privado y seguro",families:"Hecho para familias",clinical:"Información clínica",disclaimerTitle:"DMD-AI no proporciona diagnósticos médicos.",free:"Gratis para empezar",noCard:"No se requiere tarjeta"},
  fr:{badge:"Votre assistant IA pour l'accompagnement DMD",titleA:"Comprenez ce que vous observez.",titleB:"Sachez quoi faire ensuite.",subtitle:"Décrivez avec vos propres mots les changements ou préoccupations concernant votre enfant. DMD-AI vous aide à organiser les informations et à envisager les prochaines étapes.",promptTitle:"Qu'avez-vous remarqué ?",promptHelp:"Écrivez avec vos propres mots. Je vous aiderai à organiser et comprendre.",attach:"Joindre un rapport ou document (facultatif)",examples:"Exemples",common:"Ou choisissez un changement fréquent",falls:"Chutes fréquentes",stairs:"Difficulté à monter les escaliers",standing:"Difficulté à se lever",tired:"Se fatigue facilement",weakness:"Faiblesse musculaire",more:"Plus de symptômes",private:"Privé et sécurisé",families:"Conçu pour les familles",clinical:"Éclairé cliniquement",disclaimerTitle:"DMD-AI ne fournit pas de diagnostic médical.",free:"Gratuit pour commencer",noCard:"Aucune carte requise"},
  de:{titleA:"Verstehen Sie, was Sie beobachten.",titleB:"Wissen Sie, was als Nächstes zu tun ist.",promptTitle:"Was haben Sie bemerkt?",attach:"Bericht oder Dokument anhängen (optional)",examples:"Beispiele",falls:"Häufige Stürze",stairs:"Schwierigkeiten beim Treppensteigen",standing:"Schwierigkeiten beim Aufstehen",tired:"Wird schnell müde",weakness:"Muskelschwäche",more:"Weitere Symptome",private:"Privat & sicher",families:"Für Familien",clinical:"Klinisch informiert",free:"Kostenlos starten"},
  pt:{titleA:"Entenda o que você está vendo.",titleB:"Saiba o que fazer a seguir.",promptTitle:"O que você percebeu?",attach:"Anexar relatório ou documento (opcional)",examples:"Exemplos",falls:"Quedas frequentes",stairs:"Dificuldade para subir escadas",standing:"Dificuldade para se levantar",tired:"Cansa-se facilmente",weakness:"Fraqueza muscular",more:"Mais sintomas",private:"Privado e seguro",families:"Feito para famílias",clinical:"Informado clinicamente",free:"Grátis para começar"},
  it:{titleA:"Comprendi ciò che stai osservando.",titleB:"Scopri cosa fare dopo.",promptTitle:"Che cosa hai notato?",attach:"Allega referto o documento (opzionale)",examples:"Esempi",falls:"Cadute frequenti",stairs:"Difficoltà a salire le scale",standing:"Difficoltà ad alzarsi",tired:"Si stanca facilmente",weakness:"Debolezza muscolare",more:"Altri sintomi",private:"Privato e sicuro",families:"Pensato per le famiglie",clinical:"Informato clinicamente",free:"Inizia gratis"},
  hi:{badge:"DMD मार्गदर्शन के लिए आपका AI साथी",titleA:"जो आप देख रहे हैं उसे समझें।",titleB:"जानें आगे क्या करना है।",subtitle:"अपने बच्चे में दिख रहे बदलाव या चिंताओं को अपने शब्दों में बताएं। DMD-AI जानकारी को व्यवस्थित करने और अगले कदम समझने में मदद करता है।",promptTitle:"आपने क्या देखा है?",promptHelp:"अपने शब्दों में लिखें। मैं इसे व्यवस्थित करने में मदद करूंगा।",attach:"रिपोर्ट या दस्तावेज़ जोड़ें (वैकल्पिक)",examples:"उदाहरण",common:"या इन सामान्य बदलावों में से चुनें",falls:"बार-बार गिरना",stairs:"सीढ़ियाँ चढ़ने में कठिनाई",standing:"खड़े होने में कठिनाई",tired:"जल्दी थकना",weakness:"मांसपेशियों की कमजोरी",more:"और लक्षण",private:"निजी और सुरक्षित",families:"परिवारों के लिए",clinical:"क्लिनिकल जानकारी पर आधारित",disclaimerTitle:"DMD-AI चिकित्सीय निदान नहीं करता।",free:"मुफ़्त शुरू करें",noCard:"क्रेडिट कार्ड आवश्यक नहीं"},
  pa:{titleA:"ਜੋ ਤੁਸੀਂ ਦੇਖ ਰਹੇ ਹੋ ਉਸਨੂੰ ਸਮਝੋ।",titleB:"ਅਗਲਾ ਕਦਮ ਕੀ ਹੈ ਜਾਣੋ।",promptTitle:"ਤੁਸੀਂ ਕੀ ਨੋਟ ਕੀਤਾ ਹੈ?",attach:"ਰਿਪੋਰਟ ਜਾਂ ਦਸਤਾਵੇਜ਼ ਜੋੜੋ (ਵਿਕਲਪਿਕ)",examples:"ਉਦਾਹਰਨਾਂ",falls:"ਵਾਰ-ਵਾਰ ਡਿੱਗਣਾ",stairs:"ਸੀੜ੍ਹੀਆਂ ਚੜ੍ਹਣ ਵਿੱਚ ਮੁਸ਼ਕਲ",standing:"ਖੜ੍ਹੇ ਹੋਣ ਵਿੱਚ ਮੁਸ਼ਕਲ",tired:"ਜਲਦੀ ਥੱਕਣਾ",weakness:"ਮਾਸਪੇਸ਼ੀਆਂ ਦੀ ਕਮਜ਼ੋਰੀ",more:"ਹੋਰ ਲੱਛਣ",private:"ਨਿੱਜੀ ਅਤੇ ਸੁਰੱਖਿਅਤ",families:"ਪਰਿਵਾਰਾਂ ਲਈ",free:"ਮੁਫ਼ਤ ਸ਼ੁਰੂ ਕਰੋ"},
  bn:{titleA:"আপনি যা দেখছেন তা বুঝুন।",titleB:"পরবর্তী পদক্ষেপ কী জানুন।",promptTitle:"আপনি কী লক্ষ্য করেছেন?",attach:"রিপোর্ট বা নথি সংযুক্ত করুন (ঐচ্ছিক)",examples:"উদাহরণ",falls:"বারবার পড়ে যাওয়া",stairs:"সিঁড়ি উঠতে কষ্ট",standing:"দাঁড়াতে কষ্ট",tired:"সহজেই ক্লান্ত হওয়া",weakness:"পেশির দুর্বলতা",more:"আরও উপসর্গ",private:"ব্যক্তিগত ও নিরাপদ",families:"পরিবারের জন্য",free:"বিনামূল্যে শুরু করুন"},
  ar:{titleA:"افهم ما تلاحظه.",titleB:"واعرف ما الخطوة التالية.",subtitle:"صِف التغيّرات أو المخاوف بشأن طفلك بكلماتك. يساعدك DMD-AI على تنظيم المعلومات وفهم الخطوات التالية.",promptTitle:"ماذا لاحظت؟",promptHelp:"اكتب بطريقتك الخاصة وسأساعدك على تنظيم ما تلاحظه.",attach:"إرفاق تقرير أو مستند (اختياري)",examples:"أمثلة",common:"أو اختر أحد التغيّرات الشائعة",falls:"السقوط المتكرر",stairs:"صعوبة صعود الدرج",standing:"صعوبة الوقوف",tired:"يتعب بسهولة",weakness:"ضعف العضلات",more:"أعراض أخرى",private:"خاص وآمن",families:"مصمم للعائلات",clinical:"مبني على معلومات سريرية",disclaimerTitle:"لا يقدم DMD-AI تشخيصًا طبيًا.",free:"ابدأ مجانًا",noCard:"لا تحتاج بطاقة ائتمان"},
  ur:{titleA:"جو آپ دیکھ رہے ہیں اسے سمجھیں۔",titleB:"جانیں کہ آگے کیا کرنا ہے۔",promptTitle:"آپ نے کیا محسوس کیا؟",attach:"رپورٹ یا دستاویز شامل کریں (اختیاری)",examples:"مثالیں",falls:"بار بار گرنا",stairs:"سیڑھیاں چڑھنے میں مشکل",standing:"کھڑے ہونے میں مشکل",tired:"جلدی تھکنا",weakness:"پٹھوں کی کمزوری",more:"مزید علامات",private:"نجی اور محفوظ",families:"خاندانوں کے لیے",free:"مفت شروع کریں"},
  ig:{badge:"Onye enyemaka AI maka nduzi DMD",titleA:"Ghọta ihe ị na-ahụ.",titleB:"Mara ihe ị ga-eme ọzọ.",subtitle:"Kọwaa mgbanwe ma ọ bụ nchegbu ị hụrụ n'ahụ nwa gị n'okwu nke gị. DMD-AI ga-enyere gị hazie ozi ahụ ma mara nzọụkwụ ọzọ.",promptTitle:"Gịnị ka ị chọpụtara?",promptHelp:"Dee ya n'okwu nke gị. Aga m enyere gị hazie ihe ị hụrụ.",attach:"Tinye akụkọ ma ọ bụ akwụkwọ (nhọrọ)",examples:"Ihe atụ",falls:"Ịda ugboro ugboro",stairs:"Nsogbu ịrị steepụ",standing:"Nsogbu ibili ọtọ",tired:"Ike na-agwụ ngwa ngwa",weakness:"Adịghị ike akwara",more:"Mgbaàmà ndị ọzọ",private:"Nzuzo na nchekwa",families:"Emere maka ezinụlọ",free:"Malite n'efu"},
  yo:{titleA:"Loye ohun tí o ń rí.",titleB:"Mọ ohun tí o yẹ kí o ṣe lẹ́yìn náà.",promptTitle:"Kí ni o ti ṣàkíyèsí?",attach:"Fi ìròyìn tàbí ìwé kún un (àṣàyàn)",examples:"Àpẹẹrẹ",falls:"Ìṣubú léraléra",stairs:"Ìṣòro gígun àtẹ̀gùn",standing:"Ìṣòro dídìde",tired:"Máa ń rẹ̀ ní kíákíá",weakness:"Àìlera iṣan",more:"Àwọn àmì míì",private:"Àṣírí àti ààbò",families:"Fún àwọn ẹbí",free:"Bẹ̀rẹ̀ lọ́fẹ̀ẹ́"},
  ha:{titleA:"Fahimci abin da kake gani.",titleB:"San abin da za a yi na gaba.",promptTitle:"Me ka lura da shi?",attach:"Haɗa rahoto ko takarda (na zaɓi)",examples:"Misalai",falls:"Yawan faɗuwa",stairs:"Wahala hawa matakala",standing:"Wahala tashi tsaye",tired:"Gajiya da sauri",weakness:"Raunin tsoka",more:"Ƙarin alamu",private:"Sirri da tsaro",families:"An gina don iyalai",free:"Fara kyauta"},
  sw:{titleA:"Elewa unachokiona.",titleB:"Jua hatua inayofuata.",promptTitle:"Umegundua nini?",attach:"Ambatisha ripoti au hati (si lazima)",examples:"Mifano",falls:"Kuanguka mara kwa mara",stairs:"Ugumu wa kupanda ngazi",standing:"Ugumu wa kusimama",tired:"Huchoka kwa urahisi",weakness:"Udhaifu wa misuli",more:"Dalili zaidi",private:"Faragha na salama",families:"Imeundwa kwa familia",free:"Anza bila malipo"},
  zh:{titleA:"了解你所观察到的变化。",titleB:"知道下一步该怎么做。",promptTitle:"你注意到了什么？",attach:"添加报告或文件（可选）",examples:"示例",falls:"经常跌倒",stairs:"上下楼梯困难",standing:"站立困难",tired:"容易疲劳",weakness:"肌无力",more:"更多症状",private:"隐私与安全",families:"为家庭而设计",clinical:"基于临床信息",free:"免费开始"},
  ja:{titleA:"今見えている変化を理解する。",titleB:"次に何をすべきかを知る。",promptTitle:"どんな変化に気づきましたか？",attach:"レポートや文書を添付（任意）",examples:"例",falls:"よく転ぶ",stairs:"階段を上るのが難しい",standing:"立ち上がりにくい",tired:"疲れやすい",weakness:"筋力低下",more:"その他の症状",private:"プライベートで安全",families:"家族のために",free:"無料で開始"},
  ko:{titleA:"지금 보이는 변화를 이해하세요.",titleB:"다음에 무엇을 할지 알아보세요.",promptTitle:"어떤 변화를 알아차리셨나요?",attach:"보고서 또는 문서 첨부(선택)",examples:"예시",falls:"자주 넘어짐",stairs:"계단 오르기 어려움",standing:"일어서기 어려움",tired:"쉽게 피곤함",weakness:"근력 약화",more:"더 많은 증상",private:"비공개 및 안전",families:"가족을 위해",free:"무료로 시작"},
  ru:{titleA:"Поймите, что вы наблюдаете.",titleB:"Узнайте, что делать дальше.",promptTitle:"Что вы заметили?",attach:"Прикрепить отчёт или документ (необязательно)",examples:"Примеры",falls:"Частые падения",stairs:"Трудно подниматься по лестнице",standing:"Трудно вставать",tired:"Быстро устаёт",weakness:"Мышечная слабость",more:"Другие симптомы",private:"Конфиденциально и безопасно",families:"Для семей",free:"Начать бесплатно"},
  tr:{titleA:"Gördüğünüz değişiklikleri anlayın.",titleB:"Sonra ne yapacağınızı bilin.",promptTitle:"Neler fark ettiniz?",attach:"Rapor veya belge ekle (isteğe bağlı)",examples:"Örnekler",falls:"Sık düşme",stairs:"Merdiven çıkmada zorluk",standing:"Ayağa kalkmada zorluk",tired:"Çabuk yorulma",weakness:"Kas güçsüzlüğü",more:"Daha fazla belirti",private:"Gizli ve güvenli",families:"Aileler için",free:"Ücretsiz başla"},
  tw:{titleA:"Te nea worehu no ase.",titleB:"Hu nea ɛsɛ sɛ woyɛ bio.",promptTitle:"Dɛn na woahyɛ no nsow?",attach:"Fa report anaa document ka ho (sɛ wopɛ)",examples:"Nhwɛso",falls:"Ɔtaa hwe ase",stairs:"Ɛyɛ den sɛ ɔforo atrapoe",standing:"Ɛyɛ den sɛ ɔsɔre gyina",tired:"Ɔbrɛ ntɛm",weakness:"Ntini mu ahoɔden sua",more:"Nsɛnkyerɛnne foforo",private:"Kokoam na ahobammɔ wom",families:"Wɔayɛ ama mmusua",free:"Fi ase kwa"},
  ta:{titleA:"நீங்கள் கவனிப்பதைப் புரிந்துகொள்ளுங்கள்.",titleB:"அடுத்து என்ன செய்ய வேண்டும் என்பதை அறியுங்கள்.",promptTitle:"நீங்கள் என்ன கவனித்தீர்கள்?",attach:"அறிக்கை அல்லது ஆவணத்தை இணைக்கவும் (விருப்பம்)",examples:"உதாரணங்கள்",falls:"அடிக்கடி விழுதல்",stairs:"படிக்கட்டுகள் ஏற சிரமம்",standing:"எழுந்து நிற்க சிரமம்",tired:"எளிதில் சோர்வு",weakness:"தசை பலவீனம்",more:"மேலும் அறிகுறிகள்",private:"தனியுரிமை மற்றும் பாதுகாப்பு",families:"குடும்பங்களுக்காக",free:"இலவசமாக தொடங்குங்கள்"},
  te:{titleA:"మీరు గమనిస్తున్న మార్పులను అర్థం చేసుకోండి.",titleB:"తర్వాత ఏమి చేయాలో తెలుసుకోండి.",promptTitle:"మీరు ఏమి గమనించారు?",attach:"రిపోర్ట్ లేదా పత్రాన్ని జోడించండి (ఐచ్ఛికం)",examples:"ఉదాహరణలు",falls:"తరచుగా పడిపోవడం",stairs:"మెట్లు ఎక్కడంలో ఇబ్బంది",standing:"లేచి నిలబడడంలో ఇబ్బంది",tired:"త్వరగా అలసిపోవడం",weakness:"కండరాల బలహీనత",more:"మరిన్ని లక్షణాలు",private:"గోప్యత & భద్రత",families:"కుటుంబాల కోసం",free:"ఉచితంగా ప్రారంభించండి"},
  ml:{titleA:"നിങ്ങൾ കാണുന്ന മാറ്റങ്ങൾ മനസ്സിലാക്കൂ.",titleB:"അടുത്തതായി എന്ത് ചെയ്യണമെന്ന് അറിയൂ.",promptTitle:"നിങ്ങൾ എന്താണ് ശ്രദ്ധിച്ചത്?",attach:"റിപ്പോർട്ട് അല്ലെങ്കിൽ രേഖ ചേർക്കുക (ഐച്ഛികം)",examples:"ഉദാഹരണങ്ങൾ",falls:"പതിവായി വീഴുന്നത്",stairs:"പടികൾ കയറാൻ ബുദ്ധിമുട്ട്",standing:"എഴുന്നേറ്റ് നിൽക്കാൻ ബുദ്ധിമുട്ട്",tired:"വേഗം ക്ഷീണിക്കുക",weakness:"പേശി ദൗർബല്യം",more:"കൂടുതൽ ലക്ഷണങ്ങൾ",private:"സ്വകാര്യവും സുരക്ഷിതവും",families:"കുടുംബങ്ങൾക്കായി",free:"സൗജന്യമായി തുടങ്ങുക"}
};

function getPack(language:LanguageCode):TextPack { return {...EN,...(packs[language]||{})}; }

const symptomKeys = ["falls","stairs","standing","tired","weakness"] as const;

export default function HomeGuest(){
  const navigate=useNavigate();
  const [language,setLanguage]=useState<LanguageCode>(getPublicLanguage());
  const [text,setText]=useState("");
  const [showMore,setShowMore]=useState(false);
  const [stage,setStage]=useState<"prompt"|"triage"|"confirm"|"questions"|"result"|"limit">("prompt");
  const [triage,setTriage]=useState<{kind:"urgent"|"acute"|"non-dmd";title:string;summary:string;nextSteps:string[];alternative?:AlternativeContext}|null>(null);
  const [selected,setSelected]=useState<string[]>([]);
  const [age,setAge]=useState("");
  const [duration,setDuration]=useState("");
  const [progression,setProgression]=useState("");
  const [walking,setWalking]=useState("");
  const [familyHistory,setFamilyHistory]=useState("");
  const [lostAbilities,setLostAbilities]=useState<string[]>([]);
  const [guestCount,setGuestCount]=useState(()=>Number(localStorage.getItem("dmd_guest_assessment_count")||"0"));
  const [privacyMessage,setPrivacyMessage]=useState("");
  const t=useMemo(()=>getPack(language),[language]);
  const GUEST_LIMIT=3;

  useEffect(()=>{
    const onChange=()=>setLanguage(getPublicLanguage());
    window.addEventListener("dmd-language-change",onChange);
    return()=>window.removeEventListener("dmd-language-change",onChange);
  },[]);

  const addSymptom=(label:string)=>{
    setText((current)=>current.trim()?`${current.trim()} ${label}.`:`${label}.`);
  };

  const startVoice=()=>{
    const w=window as typeof window & {webkitSpeechRecognition?:new()=>any;SpeechRecognition?:new()=>any};
    const Recognition=w.SpeechRecognition||w.webkitSpeechRecognition;
    if(!Recognition){alert("Voice input is not supported in this browser yet.");return;}
    const recognition=new Recognition();
    recognition.lang=language==="en"?"en-US":language;
    recognition.interimResults=false;
    recognition.onresult=(event:any)=>setText((current)=>`${current}${current?" ":""}${event.results[0][0].transcript}`);
    recognition.onerror=()=>alert("Voice input could not start. Please check microphone permission.");
    recognition.start();
  };

  const submit=()=>{
    if(!text.trim()) return;
    if(guestCount>=GUEST_LIMIT){
      setStage("limit");
      setTimeout(()=>document.getElementById("guest-assessment")?.scrollIntoView({behavior:"smooth",block:"center"}),50);
      return;
    }
    const route=detectAssessmentRoute(text.trim());
    if(route.route==="urgent-context"){
      setTriage({
        kind:"urgent",
        title:"This description may include an urgent medical problem",
        summary:"Some of the words entered can be associated with symptoms that should be assessed urgently rather than continuing an online DMD screening.",
        nextSteps:[...route.urgentReasons.map((reason)=>`Urgent concern detected: ${reason}.`),"Seek urgent medical assessment now. If the person is in immediate danger, use the local emergency service."],
      });
      setStage("triage");
    }else if(route.route==="acute-context"){
      setTriage({
        kind:"acute",
        title:"This sounds more like a recent injury or acute problem than a progressive DMD motor pattern",
        summary:"The timing and injury context are different from the unexplained, progressive motor difficulties DMD-AI is designed to screen for. This tool cannot determine the exact injury or diagnosis.",
        nextSteps:["Focus first on appropriate assessment of the injury or acute problem.","Seek urgent care for severe pain, inability to use or bear weight on the injured area, major swelling/deformity, or rapidly worsening symptoms.","If unexplained falls or weakness also happen repeatedly outside the injury, enter those as a separate concern."],
      });
      setStage("triage");
    }else if(route.route==="non-dmd-context"){
      setTriage({kind:"non-dmd",title:route.alternative.title,summary:route.alternative.summary,nextSteps:route.alternative.nextSteps,alternative:route.alternative});
      setStage("triage");
    }else{
      const detected=route.features.filter((feature)=>feature.weight>0);
      const found:string[]=[];
      if(detected.some((feature)=>feature.key==="falls")) found.push("falls");
      if(detected.some((feature)=>feature.key==="stairs")) found.push("stairs");
      if(detected.some((feature)=>feature.key==="standing"||feature.key==="gowers")) found.push("standing");
      if(detected.some((feature)=>feature.key==="fatigue")) found.push("tired");
      if(detected.some((feature)=>["weakness","run_jump","loss","toe_walking","calf","motor_delay"].includes(feature.key))) found.push("weakness");
      setSelected([...new Set(found)]);
      setTriage(null);
      setStage("confirm");
    }
    setTimeout(()=>document.getElementById("guest-assessment")?.scrollIntoView({behavior:"smooth",block:"center"}),60);
  };

  const beginQuestions=()=>{
    if(selected.length===0) return;
    setStage("questions");
  };

  const completeAssessment=()=>{
    if(!age||!duration||!progression||!walking||!familyHistory) return;
    const next=Math.min(GUEST_LIMIT,guestCount+1);
    localStorage.setItem("dmd_guest_assessment_count",String(next));
    setGuestCount(next);
    const featureLabels = selected.map((key)=>t[key as typeof symptomKeys[number]]);
    const nextSteps = guidanceLevel==="priority"
      ? ["Arrange a timely assessment with a pediatrician, pediatric neurologist, or neuromuscular clinic.","A clinician can decide whether CK testing, genetic testing, or other investigations are appropriate."]
      : guidanceLevel==="review"
        ? ["Discuss these changes with a qualified healthcare professional, particularly if they persist or worsen.","Bring the progression history and any abilities that have become harder."]
        : ["Continue observing the changes.","Seek professional assessment if concerns persist, worsen, recur, or additional motor difficulties appear."];
    const clinicianSummary = `Age range: ${age}. Duration: ${duration}. Progression: ${progression}. Walking: ${walking}. Family history: ${familyHistory}. Reported features: ${featureLabels.join("; ") || "None selected"}. Abilities becoming harder/lost: ${lostAbilities.join("; ") || "None reported"}. Family description: “${text.trim()}”`;
    savePendingAssessment({
      client_assessment_id: crypto.randomUUID(), source:"guest_transfer", subject_label:null, narrative:text.trim(),
      structured_history:{age,duration,progression,walking,familyHistory,lostAbilities,selectedSymptoms:selected,ml_features:buildAssessmentFeatureVector({age,duration,progression,walking,familyHistory,lostAbilities,selectedSymptoms:selected})},
      result_level:guidanceLevel,result_title:guidanceTitle,result_summary:guidanceSummary,clinician_summary:clinicianSummary,
      detected_features:[...featureLabels,...lostAbilities.map((v)=>`Loss/difficulty: ${v}`)],reasons,
      uncertainty:["This assessment is evidence-informed and not diagnostic.","A symptom pattern cannot confirm or exclude DMD."],
      next_steps:nextSteps,assessment_version:"v8",occurred_at:new Date().toISOString()
    });
    setStage("result");
    setTimeout(()=>document.getElementById("guest-assessment")?.scrollIntoView({behavior:"smooth",block:"start"}),60);
  };

  const resetAssessment=()=>{
    if(guestCount>=GUEST_LIMIT){setStage("limit");return;}
    setText("");setSelected([]);setTriage(null);setAge("");setDuration("");setProgression("");setWalking("");setFamilyHistory("");setLostAbilities([]);setStage("prompt");
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const toggleAbility=(value:string)=>setLostAbilities((current)=>current.includes(value)?current.filter((v)=>v!==value):[...current,value]);

  const keyMotorSymptoms=selected.filter((v)=>["falls","stairs","standing","weakness"].includes(v));
  const patternScore=
    keyMotorSymptoms.length*2 +
    (progression==="worse"?3:progression==="same"?1:0) +
    Math.min(lostAbilities.length*2,6) +
    (walking==="Walks but sometimes needs support"?2:walking==="Needs regular assistance"?3:walking==="Uses a wheelchair"?3:0) +
    (familyHistory==="Yes"?2:0) +
    (["3–5 years","6–9 years"].includes(age)?1:0);

  const guidanceLevel:"limited"|"review"|"priority" = patternScore>=9 ? "priority" : patternScore>=4 ? "review" : "limited";

  const guidanceTitle =
    guidanceLevel==="priority"
      ? "Several reported features warrant prompt neuromuscular evaluation"
      : guidanceLevel==="review"
        ? "Some reported features deserve medical evaluation"
        : "The current answers show limited overlap with a progressive neuromuscular pattern";

  const guidanceSummary =
    guidanceLevel==="priority"
      ? "Your answers include multiple features that can occur with progressive muscle weakness. Duchenne muscular dystrophy is one possible cause among several, but this assessment cannot confirm DMD. A qualified clinician should evaluate the child and decide which tests are appropriate."
      : guidanceLevel==="review"
        ? "There are enough reported changes to justify discussing them with a qualified healthcare professional. The information is not sufficient to say that DMD is present or absent."
        : "Based only on the answers entered here, the pattern is less suggestive of progressive neuromuscular weakness. That does not rule out DMD or another condition, especially if symptoms persist, worsen, or new abilities are lost.";

  const reasons:string[]=[];
  if(keyMotorSymptoms.length) reasons.push(`${keyMotorSymptoms.length} key motor change${keyMotorSymptoms.length>1?"s":""} reported`);
  if(progression==="worse") reasons.push("Changes reported as getting worse over time");
  if(lostAbilities.length) reasons.push(`${lostAbilities.length} previously possible activit${lostAbilities.length===1?"y":"ies"} becoming harder or lost`);
  if(walking==="Walks but sometimes needs support"||walking==="Needs regular assistance"||walking==="Uses a wheelchair") reasons.push(`Current walking status: ${walking}`);
  if(familyHistory==="Yes") reasons.push("Known family history reported");

  return <main className="guest-home">
    <PublicNavbar />
    <section className="guest-hero">
      <div className="guest-hero-inner">
        <div className="guest-hero-copy">
          <div className="guest-ai-badge"><Sparkles size={17}/>{t.badge}</div>
          <h1>{t.titleA}<br/><span>{t.titleB}</span></h1>
          <p>{t.subtitle}</p>
          <div className="guest-trust-row">
            <div><span><ShieldCheck/></span><b>{t.private}</b><small>{t.privateSmall}</small></div>
            <div><span><UsersRound/></span><b>{t.families}</b><small>{t.familiesSmall}</small></div>
            <div><span><Check/></span><b>{t.clinical}</b><small>{t.clinicalSmall}</small></div>
          </div>
        </div>

        <div className="guest-hero-visual">
          <div className="hero-photo-wrap">
            <img src={homeFamilyPeople} alt="Parent supporting a child" />
            <div className="hero-orbit hero-orbit-one"/>
            <div className="hero-orbit hero-orbit-two"/>
          </div>

          <div className="hero-bubble bubble-understand"><span><MessageCircle/></span><b>Understand</b></div>
          <div className="hero-bubble bubble-guide"><span><Compass/></span><b>Guide</b></div>
          <div className="hero-bubble bubble-organize"><span><FileText/></span><b>Organize</b></div>
          <div className="hero-bubble bubble-support"><span><HeartPulse/></span><b>Support</b></div>
          <div className="hero-bubble bubble-empower"><span><ShieldCheck/></span><b>Empower</b></div>
        </div>
      </div>
    </section>

    <section className="guest-prompt-card" id="assistant">
      <div className="guest-prompt-head"><div><Sparkles/><h2>{t.promptTitle}</h2><p>{t.promptHelp}</p></div><button onClick={()=>setText(t.example)}><Sparkles size={16}/>{t.examples}</button></div>
      <div className="guest-compose">
        <textarea value={text} onChange={(e)=>setText(e.target.value.slice(0,2000))} onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit();}}} placeholder={t.example}/>
        <div className="guest-compose-bar">
          <button className="attach" onClick={()=>{setPrivacyMessage("Create a free account to securely upload personal medical reports or documents. You can continue this symptom assessment as a guest without uploading anything.");}}><Paperclip/>{t.attach}</button>
          <span>{text.length} / 2000</span>
          <button className="voice" onClick={startVoice} aria-label="Voice input"><Mic/></button>
          <button className="send" onClick={submit} aria-label="Send"><Send/></button>
        </div>
      </div>
      {privacyMessage&&<div className="guest-inline-note"><LockKeyhole size={17}/><span>{privacyMessage}</span><button onClick={()=>navigate('/signup')}>Create free account</button><button className="note-close" onClick={()=>setPrivacyMessage('')}>×</button></div>}
      <div className="guest-access-note"><span>Guest access</span> Complete up to {GUEST_LIMIT} guided assessments before creating an account. Saving, tracking, sharing, and medical-document uploads require sign in.</div>
    </section>

    <section className="guest-quick">
      <div className="quick-title"><span/>{t.common}<span/></div>
      <div className="quick-buttons">
        {symptomKeys.map((key)=><button key={key} onClick={()=>addSymptom(t[key])}><QuickSymptomIcon type={key}/><span>{t[key]}</span></button>)}
        {showMore&&<><button onClick={()=>addSymptom("Difficulty running or jumping")}><QuickSymptomIcon type="falls"/><span>Running / jumping</span></button><button onClick={()=>addSymptom("Delayed motor milestones")}><QuickSymptomIcon type="standing"/><span>Delayed milestones</span></button><button onClick={()=>addSymptom("Calf enlargement")}><QuickSymptomIcon type="weakness"/><span>Calf enlargement</span></button></>}
        <button className="more" onClick={()=>setShowMore((v)=>!v)}><QuickSymptomIcon type="more"/><span>{t.more}</span><ArrowRight size={15}/></button>
      </div>
    </section>

    {stage!=="prompt"&&<section className="guest-assessment-shell" id="guest-assessment">
      {stage==="triage"&&triage&&<div className="guest-result assessment-v2">
        <div className="assessment-step">INITIAL GUIDANCE</div>
        <div className={`result-status ${triage.kind==="urgent"?"urgent":"limited"}`}><Info/><div><span className="result-level">{triage.kind==="urgent"?"URGENT REVIEW":"NOT A STRONG DMD PATTERN"}</span><h3>{triage.title}</h3><p>{triage.summary}</p></div></div>
        <div className="result-grid">
          <article><h4>What this means</h4><p>{triage.kind==="urgent"?"DMD-AI is stopping the Duchenne questionnaire because urgent symptoms should be assessed first.":triage.kind==="acute"?"DMD-AI is not treating an isolated recent injury as a Duchenne pattern.":"DMD-AI is not forcing unrelated symptoms into the Duchenne questionnaire."}</p></article>
          <article><h4>What it does not mean</h4><p>This is not a diagnosis of another disease and it does not prove that DMD is absent. It only determines whether the description is appropriate for this DMD-focused screening flow.</p></article>
          <article><h4>What to do next</h4><ul>{triage.nextSteps.map((step)=><li key={step}>{step}</li>)}</ul></article>
          <article><h4>When DMD screening is more relevant</h4><p>Repeated unexplained falls, progressive muscle weakness, difficulty climbing stairs or rising from the floor, delayed motor milestones, toe walking, calf enlargement, or loss of previously acquired motor abilities are examples of changes that should continue to the DMD questions.</p></article>
        </div>
        <div className="result-actions"><button className="secondary" onClick={resetAssessment}>Describe a different concern</button>{triage.kind!=="urgent"&&<button className="primary" onClick={()=>{setText("Repeated unexplained falls and progressive muscle weakness.");setSelected(["falls","weakness"]);setTriage(null);setStage("confirm");}}>I also notice progressive motor changes <ArrowRight/></button>}</div>
      </div>}

      {stage==="confirm"&&<div className="guest-confirm">
        <div className="assessment-step">STEP 1 OF 3 · CONFIRM WHAT YOU NOTICED</div>
        <div className="confirm-heading"><span><Check/></span><div><h3>{t.understood}</h3><p>{t.confirm}</p></div></div>
        <div className="confirm-grid">
          {symptomKeys.map((key)=>{const checked=selected.includes(key);return <button key={key} className={checked?"checked":""} onClick={()=>setSelected((s)=>checked?s.filter((v)=>v!==key):[...s,key])}><span>{checked&&<Check/>}</span>{t[key]}</button>})}
        </div>
        <div className="confirm-footer"><small>{t.changeAnswers}</small><button disabled={!selected.length} onClick={beginQuestions}>{t.continue}<ArrowRight/></button></div>
        <p className="save-note">No account is required for this step.</p>
      </div>}

      {stage==="questions"&&<div className="guest-followup">
        <div className="assessment-step">STEP 2 OF 3 · A FEW RELEVANT QUESTIONS</div>
        <h3>Help me understand the changes better</h3>
        <p className="assessment-intro">These questions do not diagnose your child. They help organize the history so you know what information may be useful to discuss with a healthcare professional.</p>
        <div className="followup-grid">
          <label><span>How old is the child?</span><select value={age} onChange={(e)=>setAge(e.target.value)}><option value="">Select age range</option><option>Under 3 years</option><option>3–5 years</option><option>6–9 years</option><option>10–13 years</option><option>14–17 years</option><option>18+ years</option></select></label>
          <label><span>How long have you noticed these changes?</span><select value={duration} onChange={(e)=>setDuration(e.target.value)}><option value="">Select</option><option>Less than 1 month</option><option>1–3 months</option><option>3–12 months</option><option>More than 1 year</option><option>Not sure</option></select></label>
          <label><span>Are the difficulties changing over time?</span><select value={progression} onChange={(e)=>setProgression(e.target.value)}><option value="">Select</option><option value="worse">They seem to be getting worse</option><option value="same">They seem about the same</option><option value="better">They seem to be improving</option><option value="unknown">Not sure</option></select></label>
          <label><span>How is walking currently?</span><select value={walking} onChange={(e)=>setWalking(e.target.value)}><option value="">Select</option><option>Walks independently</option><option>Walks but sometimes needs support</option><option>Needs regular assistance</option><option>Uses a wheelchair</option><option>Not sure / not applicable</option></select></label>
          <label><span>Known family history of DMD or unexplained muscle weakness?</span><select value={familyHistory} onChange={(e)=>setFamilyHistory(e.target.value)}><option value="">Select</option><option>Yes</option><option>No</option><option>Not sure</option></select></label>
        </div>
        <div className="ability-block"><strong>Has anything the child could previously do become noticeably harder or no longer possible?</strong><div className="ability-options">{["Running","Getting up from the floor","Getting up from a chair","Climbing stairs","Walking","Bathing or dressing","Feeding independently","Raising the arms"].map((v)=><button key={v} className={lostAbilities.includes(v)?"selected":""} onClick={()=>toggleAbility(v)}>{lostAbilities.includes(v)&&<Check/>}{v}</button>)}</div></div>
        <div className="assessment-actions"><button className="secondary" onClick={()=>setStage('confirm')}>Back</button><button className="primary" disabled={!age||!duration||!progression||!walking||!familyHistory} onClick={completeAssessment}>See preliminary guidance <ArrowRight/></button></div>
      </div>}

      {stage==="result"&&<div className="guest-result">
        <div className="assessment-step">STEP 3 OF 3 · PRELIMINARY GUIDANCE</div>
        <div className={`result-status ${guidanceLevel}`}><ShieldCheck/><div><span className="result-level">{guidanceLevel==="priority"?"HIGHER CONCERN PATTERN":guidanceLevel==="review"?"REVIEW RECOMMENDED":"LIMITED PATTERN OVERLAP"}</span><h3>{guidanceTitle}</h3><p>{guidanceSummary}</p></div></div>
        <div className="result-grid">
          <article><h4>What you reported</h4><ul>{selected.map((key)=><li key={key}>{t[key as typeof symptomKeys[number]]}</li>)}{lostAbilities.map((v)=><li key={v}>Loss or difficulty with: {v}</li>)}</ul></article>
          <article><h4>Why DMD-AI showed this guidance</h4>{reasons.length?<ul>{reasons.map((reason)=><li key={reason}>{reason}</li>)}</ul>:<p>No strong progression or loss-of-function signals were identified from the answers entered.</p>}</article>
          <article><h4>Does this mean DMD?</h4><p><strong>No online symptom assessment can answer “true” or “false” for DMD.</strong> The reported pattern can only show whether professional neuromuscular evaluation may be warranted. Diagnosis requires a clinician and appropriate testing.</p></article>
          <article><h4>What to do next</h4><p>{guidanceLevel==="priority"?"Arrange a timely assessment with a pediatrician, pediatric neurologist, or neuromuscular clinic. The clinician can examine the child and decide whether CK testing, genetic testing, or other investigations are appropriate.":guidanceLevel==="review"?"Discuss these changes with a qualified healthcare professional, particularly if they persist or worsen. Bring the progression history and any abilities that have become harder.":"Continue observing the child and seek professional assessment if the concerns persist, worsen, or additional motor difficulties appear. A low-overlap result here does not rule out disease."}</p></article>
        </div>
        <div className="result-warning"><Info/><div><strong>Seek urgent medical help for urgent symptoms.</strong><p>Severe breathing difficulty, blue/grey lips, loss of consciousness, severe chest pain, or another emergency should be assessed urgently rather than waiting for an online assessment.</p></div></div>
        <div className="result-actions"><button className="secondary" onClick={resetAssessment}>Start another guest assessment</button><button className="primary" onClick={()=>navigate('/signup?continue=assessment')}>Create free account to save & track <ArrowRight/></button></div>
        <div className="guest-remaining">Guest assessments used: {guestCount} of {GUEST_LIMIT}. Important safety guidance is never hidden behind payment.</div>
      </div>}

      {stage==="limit"&&<div className="guest-limit">
        <LockKeyhole/><h3>You've reached the guest assessment allowance</h3><p>You have already tried the guided assessment {GUEST_LIMIT} times on this browser. Create a free account to continue, save your history, track changes over time, and securely share information with your care team.</p><div><button className="secondary" onClick={()=>navigate('/login')}>Sign in</button><button className="primary" onClick={()=>navigate('/signup')}>Create free account <ArrowRight/></button></div><small>If there is an urgent medical problem, seek appropriate medical care immediately. Emergency guidance is never restricted by account status.</small>
      </div>}
    </section>}

    <section className="guest-disclaimer"><div><Info/><p><strong>{t.disclaimerTitle}</strong><br/>{t.disclaimer}</p></div><div><Sparkles/><p><strong>{t.free}</strong><br/>{t.noCard}</p></div></section>

    <section className="guest-bottom-trust">
      <div className="heart-visual"><HeartHandsMark/></div>
      <article><UsersRound/><div><strong>Trusted by Families</strong><p>Thousands of families use DMD-AI.</p></div></article>
      <article><ShieldCheck/><div><strong>Expert Reviewed</strong><p>Created with input from DMD specialists and clinicians.</p></div></article>
      <article><LockKeyhole/><div><strong>{t.control}</strong><p>{t.controlSmall}</p></div></article>
      <article><UsersRound/><div><strong>You Are Not Alone</strong><p>We're here to help you every step of the way.</p></div></article>
    </section>
  </main>
}
