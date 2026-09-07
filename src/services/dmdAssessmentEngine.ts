export type ConcernLevel = "acute" | "limited" | "review" | "priority" | "urgent";

export type AssessmentRoute = "urgent-context" | "acute-context" | "non-dmd-context" | "dmd-context";

export type AlternativeContext = {
  category: string;
  title: string;
  summary: string;
  nextSteps: string[];
};

export type DmdAssessmentInput = {
  narrative: string;
  selectedSymptoms: string[];
  ageRange: string;
  duration: string;
  progression: string;
  walking: string;
  familyHistory: string;
  lostAbilities: string[];
  gowers: string;
  toeWalking: string;
  calfEnlargement: string;
  runningJumping: string;
  acuteContext?: "acute" | "recurrent" | "unsure" | "";
};

export type DetectedFeature = {
  key: string;
  label: string;
  source: "narrative" | "answer" | "selection";
  weight: number;
};

export type DmdAssessmentResult = {
  level: ConcernLevel;
  title: string;
  summary: string;
  detectedFeatures: DetectedFeature[];
  reasons: string[];
  uncertainty: string[];
  nextSteps: string[];
  clinicianSummary: string;
  urgentReasons: string[];
  internalPatternScore: number;
};

type NarrativeFeature = {
  key: string;
  label: string;
  patterns: RegExp[];
  weight: number;
};

const FEATURES: NarrativeFeature[] = [
  { key:"falls", label:"Frequent falls or clumsiness", weight:2, patterns:[/\bfall(?:s|ing)?\b/i,/\btrip(?:s|ping)?\b/i,/\bstumbl(?:e|es|ing)\b/i,/\bclums(?:y|iness)\b/i] },
  { key:"stairs", label:"Difficulty climbing stairs or steps", weight:2, patterns:[/\bclimb(?:ing)?\b.{0,28}\b(?:stair|step)s?\b/i,/\b(?:stair|step)s?\b.{0,28}\b(?:hard|difficult|struggl|trouble)\w*/i] },
  { key:"standing", label:"Difficulty rising from the floor or a chair", weight:2, patterns:[/\b(?:stand|rise|get up|getting up)\b.{0,35}\b(?:floor|chair|sitting|sit)\b/i,/\b(?:floor|chair)\b.{0,35}\b(?:stand|rise|get up|getting up)\b/i] },
  { key:"gowers", label:"Uses hands on thighs/legs to rise (Gowers-type manoeuvre)", weight:4, patterns:[/\b(?:hands?|arms?)\b.{0,35}\b(?:knees?|thighs?|legs?)\b.{0,35}\b(?:stand|rise|get up|push)\w*/i,/\bpush(?:es|ing)?\b.{0,28}\b(?:knees?|thighs?|legs?)\b/i,/\bgowers?\b/i] },
  { key:"run_jump", label:"Difficulty running or jumping", weight:2, patterns:[/\b(?:run|running|jump|jumping)\b.{0,30}\b(?:hard|difficult|cannot|can't|unable|struggl|trouble|slower)\w*/i,/\b(?:cannot|can't|unable|struggl\w*)\b.{0,25}\b(?:run|jump)\w*/i] },
  { key:"weakness", label:"Muscle weakness", weight:2, patterns:[/\bmuscle weakness\b/i,/\bweak(?:ness)?\b/i] },
  { key:"fatigue", label:"Reduced endurance or tiring easily", weight:1, patterns:[/\btir(?:e|ed|es|ing)\b/i,/\bfatigue\b/i,/\bendurance\b/i,/\bcan't keep up\b/i,/\bcannot keep up\b/i] },
  { key:"toe_walking", label:"Toe walking", weight:2, patterns:[/\btoe[- ]?walk(?:s|ing)?\b/i,/\bwalk(?:s|ing)? on (?:his|her|their)? ?toes\b/i] },
  { key:"calf", label:"Calf enlargement", weight:2, patterns:[/\bcalf\b.{0,25}\b(?:large|larger|big|bigger|enlarg)\w*/i,/\b(?:large|larger|big|bigger|enlarg)\w*\b.{0,25}\bcalves?\b/i,/\bpseudohypertroph\w*/i] },
  { key:"motor_delay", label:"Delayed motor milestones", weight:2, patterns:[/\b(?:late|delayed|delay)\b.{0,25}\b(?:walk|walking|motor|milestone)\w*/i,/\bnot walking\b/i] },
  { key:"loss", label:"Loss of previously acquired motor ability", weight:4, patterns:[/\b(?:lost|loss|no longer|stopped)\b.{0,30}\b(?:walk|run|jump|climb|stand|dress|bath|feed|raise)\w*/i] },
  { key:"difficulty_daily", label:"Difficulty with daily activities", weight:2, patterns:[/\b(?:bath|dress|clothe|feed|eat|raise (?:his|her|their) arms?)\w*\b.{0,25}\b(?:hard|difficult|cannot|can't|unable|help)\w*/i] },
  { key:"pain_only", label:"Pain associated with a recent activity or injury", weight:-2, patterns:[/\b(?:hurt|pain|sore|ache)\w*\b.{0,45}\b(?:today|yesterday|football|soccer|sports?|injur|after playing)\w*/i,/\b(?:today|yesterday|football|soccer|sports?|after playing)\b.{0,45}\b(?:hurt|pain|sore|ache)\w*/i] },
  { key:"acute_injury", label:"Recent injury", weight:-3, patterns:[/\b(?:injury|injured|sprain|fracture|twist(?:ed)?|hit|hurt my|hurt his|hurt her)\b/i] },
];

const ACUTE_CONTEXT_PATTERNS = [
  /\b(?:today|yesterday|this morning|this afternoon|this evening)\b/i,
  /\b(?:football|soccer|basketball|sports?|playing|game|match|training|practice)\b/i,
  /\b(?:injury|injured|sprain|twist(?:ed)?|hit|hurt my|hurt his|hurt her|knee pain|ankle pain)\b/i,
];

const CHRONIC_CONTEXT_PATTERNS = [
  /\b(?:weeks?|months?|years?|for a long time|since childhood|keeps happening|often|frequently|usually|every day|most days)\b/i,
  /\b(?:getting worse|worsening|progressive|gradually)\b/i,
  /\b(?:difficulty climbing stairs|difficulty running|difficulty jumping|uses? (?:his|her|their) hands?.{0,25}(?:legs?|thighs?|knees?)|toe walking|large calves?|delayed walking)\b/i,
];

const EMERGENCY_PATTERNS = [
  {label:"Severe breathing difficulty", regex:/\b(?:severe|struggling|cannot|can't)\b.{0,25}\b(?:breathe|breathing)\b/i},
  {label:"Blue or grey lips/skin", regex:/\b(?:blue|grey|gray)\b.{0,15}\b(?:lips?|skin|face)\b/i},
  {label:"Loss of consciousness", regex:/\b(?:unconscious|loss of consciousness|passed out|fainted and not waking)\b/i},
  {label:"Severe chest pain", regex:/\bsevere\b.{0,20}\bchest pain\b/i},
];

const NON_DMD_CONTEXTS: Array<{category:string; patterns:RegExp[]; title:string; summary:string; nextSteps:string[]}> = [
  {
    category:"respiratory_or_infectious",
    patterns:[/\b(?:cough|coughing|runny nose|sore throat|fever|flu|cold|sneez|congestion)\w*\b/i],
    title:"This sounds more like a respiratory or short-term illness concern than a typical DMD motor pattern",
    summary:"The description is focused on symptoms such as cough, fever, sore throat, congestion, or another short-term illness. Those are not the usual progressive motor features used to screen for DMD.",
    nextSteps:["Use ordinary medical care for the illness if symptoms are persistent, severe, or worsening.","If there are also repeated unexplained falls, progressive muscle weakness, difficulty climbing stairs or rising from the floor, describe those separately so DMD-AI can assess that motor pattern."],
  },
  {
    category:"digestive",
    patterns:[/\b(?:stomach|abdominal|belly|vomit|vomiting|diarrhea|constipation|nausea|food poisoning)\w*\b/i],
    title:"This sounds more like a digestive concern than a typical DMD motor pattern",
    summary:"The description is mainly about stomach, bowel, nausea, vomiting, or similar digestive symptoms. These do not by themselves match the progressive motor pattern DMD-AI is designed to assess.",
    nextSteps:["Seek appropriate medical advice if the digestive symptoms are severe, persistent, associated with dehydration, or otherwise concerning.","If progressive weakness or loss of motor abilities is also present, enter that as a separate concern."],
  },
  {
    category:"dental",
    patterns:[/\b(?:tooth|teeth|gum|dental|toothache)\w*\b/i],
    title:"This sounds more like a dental concern than a typical DMD motor pattern",
    summary:"The description is focused on teeth or gums rather than progressive muscle weakness or motor difficulty.",
    nextSteps:["A dentist or appropriate healthcare professional can assess persistent or severe dental pain, swelling, or infection concerns.","If there are separate progressive movement or muscle-strength concerns, describe those separately for DMD screening."],
  },
  {
    category:"skin_or_allergy",
    patterns:[/\b(?:rash|itch|itching|hives|skin|allergy|allergic|swelling)\w*\b/i],
    title:"This sounds more like a skin or allergic concern than a typical DMD motor pattern",
    summary:"The description is mainly about skin changes, itching, hives, allergy, or swelling. These symptoms alone do not match the typical progressive motor pattern considered in DMD screening.",
    nextSteps:["Seek appropriate medical care if the reaction is persistent or worsening; urgent help is appropriate for breathing difficulty or rapidly worsening swelling.","Describe any separate progressive weakness or motor changes independently if those are also occurring."],
  },
  {
    category:"urinary",
    patterns:[/\b(?:urine|urinating|urination|pee|peeing|burning when|bladder|uti)\b/i],
    title:"This sounds more like a urinary concern than a typical DMD motor pattern",
    summary:"The description is centered on urinary symptoms rather than progressive muscle weakness or loss of motor abilities.",
    nextSteps:["A healthcare professional can assess urinary pain, frequency, fever, blood in urine, or persistent symptoms.","If there are also progressive motor difficulties, describe them separately for DMD screening."],
  },
  {
    category:"headache_or_nonmotor_neurologic",
    patterns:[/\b(?:headache|migraine|dizzy|dizziness|vertigo)\w*\b/i],
    title:"This does not strongly match the progressive motor pattern DMD-AI is designed to assess",
    summary:"The description is focused on headache, dizziness, or a similar non-motor symptom rather than progressive proximal muscle weakness.",
    nextSteps:["Seek appropriate medical advice if the symptom is severe, new, recurrent, or worsening.","If there are separate repeated falls, difficulty rising, stair-climbing difficulty, or progressive weakness, describe those separately."],
  },
];

function detectAlternativeContext(text:string):AlternativeContext | null {
  for(const item of NON_DMD_CONTEXTS){
    if(item.patterns.some((pattern)=>pattern.test(text))){
      return {category:item.category,title:item.title,summary:item.summary,nextSteps:item.nextSteps};
    }
  }
  return null;
}

function isNegated(text:string, matchIndex:number){
  const before=text.slice(Math.max(0,matchIndex-45),matchIndex).toLowerCase();
  return /\b(?:no|not|never|doesn't|does not|isn't|is not|without|denies|didn't|did not)\b[^.!?]{0,30}$/.test(before);
}

function detectNarrative(text:string):DetectedFeature[]{
  const results:DetectedFeature[]=[];
  for(const feature of FEATURES){
    for(const pattern of feature.patterns){
      const match=pattern.exec(text);
      if(match && !isNegated(text,match.index)){
        results.push({key:feature.key,label:feature.label,source:"narrative",weight:feature.weight});
        break;
      }
    }
  }
  return results;
}

function dedupe(features:DetectedFeature[]){
  const map=new Map<string,DetectedFeature>();
  for(const f of features){
    const prior=map.get(f.key);
    if(!prior || f.weight>prior.weight) map.set(f.key,f);
  }
  return [...map.values()];
}

function addAnswerFeature(list:DetectedFeature[], key:string, label:string, weight:number){
  list.push({key,label,weight,source:"answer"});
}

function ageWeight(age:string){
  if(age==="3–5 years") return 2;
  if(age==="6–9 years") return 1;
  if(age==="Under 3 years") return 1;
  if(age==="10–13 years") return 0;
  if(age==="14–17 years"||age==="18+ years") return -1;
  return 0;
}

export function detectAssessmentRoute(text:string){
  const features=detectNarrative(text);
  const urgentReasons=EMERGENCY_PATTERNS.filter(x=>x.regex.test(text)).map(x=>x.label);
  const hasAcute=ACUTE_CONTEXT_PATTERNS.filter(p=>p.test(text)).length>=2 || features.some(f=>f.key==="acute_injury"||f.key==="pain_only");
  const hasChronic=CHRONIC_CONTEXT_PATTERNS.some(p=>p.test(text));
  const highSpecificity=features.some(f=>["gowers","toe_walking","calf","motor_delay","loss"].includes(f.key) && f.weight>0);
  const classicMotorCount=["falls","stairs","standing","run_jump","weakness"].filter(k=>features.some(f=>f.key===k && f.weight>0)).length;
  const meaningfulDmdPattern=highSpecificity || classicMotorCount>=2 || (hasChronic && classicMotorCount>=1);
  const alternative=detectAlternativeContext(text);

  let route:AssessmentRoute;
  if(urgentReasons.length) route="urgent-context";
  else if(hasAcute && !hasChronic && !meaningfulDmdPattern) route="acute-context";
  else if(!meaningfulDmdPattern) route="non-dmd-context";
  else route="dmd-context";

  const fallbackAlternative:AlternativeContext={
    category:"other_non_dmd",
    title:"This description does not strongly match a typical progressive DMD motor pattern",
    summary:"DMD-AI did not find enough DMD-relevant motor features in this description to start the Duchenne screening questions. This does not identify the cause of the symptom and does not rule out another medical condition.",
    nextSteps:["Use an appropriate healthcare professional for symptoms that are persistent, severe, recurrent, or worsening.","If you are also noticing repeated unexplained falls, difficulty climbing stairs, trouble rising from the floor, progressive muscle weakness, delayed motor development, toe walking, large calves, or loss of abilities, describe those motor changes separately."],
  };

  return {route,features,urgentReasons,alternative:alternative ?? fallbackAlternative};
}

export function analyzeDmdAssessment(input:DmdAssessmentInput):DmdAssessmentResult{
  const urgentReasons=EMERGENCY_PATTERNS.filter(x=>x.regex.test(input.narrative)).map(x=>x.label);
  const narrativeFeatures=detectNarrative(input.narrative);
  const features:DetectedFeature[]=[...narrativeFeatures];

  for(const symptom of input.selectedSymptoms){
    if(symptom==="falls") addAnswerFeature(features,"falls","Frequent falls",2);
    if(symptom==="stairs") addAnswerFeature(features,"stairs","Difficulty climbing stairs",2);
    if(symptom==="standing") addAnswerFeature(features,"standing","Difficulty standing/rising",2);
    if(symptom==="tired") addAnswerFeature(features,"fatigue","Gets tired easily",1);
    if(symptom==="weakness") addAnswerFeature(features,"weakness","Muscle weakness",2);
  }

  if(input.gowers==="Yes") addAnswerFeature(features,"gowers","Uses hands on thighs/legs to rise",4);
  if(input.toeWalking==="Yes") addAnswerFeature(features,"toe_walking","Toe walking",2);
  if(input.calfEnlargement==="Yes") addAnswerFeature(features,"calf","Calf enlargement",2);
  if(input.runningJumping==="Yes") addAnswerFeature(features,"run_jump","Difficulty running or jumping",2);
  if(input.lostAbilities.length) addAnswerFeature(features,"loss","Loss of previously acquired abilities",Math.min(6,input.lostAbilities.length*2));

  const unique=dedupe(features);
  const acuteConfirmed=input.acuteContext==="acute";
  const recurrentDespiteAcute=input.acuteContext==="recurrent";

  let score=unique.reduce((sum,f)=>sum+f.weight,0);

  if(input.progression==="worse") score+=4;
  else if(input.progression==="same") score+=1;
  else if(input.progression==="better") score-=3;

  if(input.duration==="More than 1 year") score+=2;
  else if(input.duration==="3–12 months") score+=1;
  else if(input.duration==="Less than 1 month") score-=1;

  if(input.walking==="Walks but sometimes needs support") score+=2;
  else if(input.walking==="Needs regular assistance") score+=3;
  else if(input.walking==="Uses a wheelchair") score+=3;

  if(input.familyHistory==="Yes") score+=2;
  score+=ageWeight(input.ageRange);

  const classicMotorCount=["falls","stairs","standing","gowers","run_jump","weakness","loss","toe_walking","calf","motor_delay"].filter(k=>unique.some(f=>f.key===k && f.weight>0)).length;
  const progressionStrong=input.progression==="worse" || input.lostAbilities.length>0 || unique.some(f=>f.key==="loss");

  let level:ConcernLevel;
  if(urgentReasons.length) level="urgent";
  else if(acuteConfirmed) level="acute";
  else if(score>=13 && classicMotorCount>=3 && progressionStrong) level="priority";
  else if(score>=6 && classicMotorCount>=2) level="review";
  else level="limited";

  const reasons:string[]=[];
  if(level==="acute"){
    reasons.push("The description links the falls to a recent sport/activity event and an injury.");
    reasons.push("A single acute injury episode is a different pattern from the progressive motor difficulties usually considered in DMD screening.");
  }else{
    if(classicMotorCount>=1) reasons.push(`${classicMotorCount} DMD-relevant motor feature${classicMotorCount===1?" was":"s were"} reported.`);
    if(unique.some(f=>f.key==="gowers")) reasons.push("A Gowers-type manoeuvre was reported (using the hands on the legs/thighs to rise).");
    if(input.progression==="worse") reasons.push("The difficulties were reported as worsening over time.");
    if(input.lostAbilities.length) reasons.push(`${input.lostAbilities.length} previously possible activit${input.lostAbilities.length===1?"y is":"ies are"} becoming harder or no longer possible.`);
    if(input.familyHistory==="Yes") reasons.push("A family history of DMD or unexplained muscle weakness was reported.");
    if(input.walking==="Needs regular assistance"||input.walking==="Uses a wheelchair") reasons.push(`Current mobility requires substantial support: ${input.walking.toLowerCase()}.`);
    if(unique.some(f=>f.key==="toe_walking")) reasons.push("Toe walking was reported.");
    if(unique.some(f=>f.key==="calf")) reasons.push("Calf enlargement was reported.");
    if(unique.some(f=>f.key==="motor_delay")) reasons.push("Delayed motor development was described.");
    if(recurrentDespiteAcute) reasons.push("Although an injury was mentioned, you indicated that falls or weakness also occur outside sports/injury.");
  }

  const uncertainty:string[]=[];
  if(level==="acute"){
    uncertainty.push("This online tool cannot examine the knee or determine the type or severity of an injury.");
    uncertainty.push("An acute injury result does not evaluate every possible medical cause of falling.");
    uncertainty.push("If unexplained falls, weakness, difficulty climbing stairs/running, or loss of abilities also occur outside injury or sport, a separate medical assessment is appropriate.");
  }else{
    uncertainty.push("These features can occur in conditions other than DMD, so symptom patterns cannot confirm a diagnosis.");
    if(input.familyHistory!=="Yes") uncertainty.push("DMD can occur without a known family history, so family history alone cannot rule it in or out.");
    if(input.progression==="unknown") uncertainty.push("The progression pattern is uncertain; changes over time are important clinical information.");
  }

  const nextSteps:string[]=[];
  if(level==="urgent"){
    nextSteps.push("Seek urgent medical assessment now rather than relying on this online tool.");
  }else if(level==="acute"){
    nextSteps.push("Because the falls occurred during sport and an injury was reported, focus first on assessing the injury rather than completing a DMD-pattern questionnaire.");
    nextSteps.push("Seek urgent medical advice if the knee is very painful, cannot be moved or bear weight, is badly swollen, or has changed shape.");
    nextSteps.push("If falls or weakness also happen repeatedly outside sports/injury, or motor abilities are progressively getting worse, discuss that separate pattern with a healthcare professional.");
  }else if(level==="priority"){
    nextSteps.push("Arrange a timely assessment with a pediatrician, pediatric neurologist, or neuromuscular clinic.");
    nextSteps.push("Bring a clear timeline of when the changes began, how they progressed, and which abilities became harder or were lost.");
    nextSteps.push("A clinician may consider serum creatine kinase (CK) testing and, when appropriate, DMD genetic testing or other investigations.");
  }else if(level==="review"){
    nextSteps.push("Discuss the reported changes with a qualified healthcare professional, especially if they persist or worsen.");
    nextSteps.push("Ask for assessment of motor development and muscle strength; the clinician can decide whether neuromuscular referral or testing is appropriate.");
  }else{
    nextSteps.push("The current information has limited overlap with a typical progressive DMD motor pattern, but this does not rule out DMD or another condition.");
    nextSteps.push("Seek medical review if symptoms persist, worsen, recur, or additional motor difficulties appear.");
  }

  const title = level==="urgent"
    ? "Some words in this description may indicate an urgent medical problem"
    : level==="acute"
      ? "This description sounds more like a recent sports injury than a progressive DMD motor pattern"
      : level==="priority"
        ? "Several reported features warrant prompt neuromuscular evaluation"
        : level==="review"
          ? "Some reported features deserve medical evaluation"
          : "The current information shows limited overlap with a typical progressive DMD motor pattern";

  const summary = level==="urgent"
    ? "DMD-AI detected language associated with symptoms that should not wait for an online screening result."
    : level==="acute"
      ? "The timing and injury context matter. Falls during a single football or sports event with a new knee injury are not the same pattern as unexplained, progressive motor difficulties occurring over weeks or months."
      : level==="priority"
        ? "The combination of progressive motor difficulties, functional loss, or characteristic weakness-related features deserves professional assessment. DMD is one possible cause among several; this result does not diagnose DMD."
        : level==="review"
          ? "The information includes motor changes that are worth discussing with a healthcare professional. The pattern is not specific enough to identify DMD from symptoms alone."
          : "The entered information currently contains fewer features typical of progressive Duchenne-pattern muscle weakness. A low-overlap result cannot exclude DMD or another medical condition.";

  const shownFeatures = level==="acute"
    ? unique.filter(f=>f.key==="acute_injury"||f.key==="pain_only"||f.key==="falls")
    : unique.filter(f=>f.weight>0);

  const reported=[...shownFeatures.map(f=>f.label),...input.lostAbilities.map(v=>`Ability becoming harder/lost: ${v}`)];
  const clinicianSummary=[
    input.ageRange?`Age range: ${input.ageRange}.`:"",
    input.duration?`Duration: ${input.duration}.`:"",
    input.progression?`Progression: ${input.progression}.`:"",
    input.walking?`Walking: ${input.walking}.`:"",
    input.familyHistory?`Family history: ${input.familyHistory}.`:"",
    input.acuteContext?`Context clarification: ${input.acuteContext==="acute"?"single recent sport/injury event":input.acuteContext==="recurrent"?"falls/weakness also occur outside sport or injury":"context uncertain"}.`:"",
    reported.length?`Information reported: ${[...new Set(reported)].join("; ")}.`:"No specific motor features were confirmed.",
    input.narrative.trim()?`Description: “${input.narrative.trim().replace(/\s+/g," ").slice(0,600)}${input.narrative.trim().length>600?"…":""}”`:"",
  ].filter(Boolean).join(" ");

  return {level,title,summary,detectedFeatures:shownFeatures,reasons,uncertainty,nextSteps,clinicianSummary,urgentReasons,internalPatternScore:score};
}

export function detectInitialSymptoms(text:string){
  const routeInfo=detectAssessmentRoute(text);
  const detected=routeInfo.features.filter(f=>f.weight>0);
  const selected:string[]=[];
  if(detected.some(f=>f.key==="falls")) selected.push("falls");
  if(detected.some(f=>f.key==="stairs")) selected.push("stairs");
  if(detected.some(f=>f.key==="standing"||f.key==="gowers")) selected.push("standing");
  if(detected.some(f=>f.key==="fatigue")) selected.push("tired");
  if(detected.some(f=>f.key==="weakness"||f.key==="run_jump"||f.key==="loss")) selected.push("weakness");
  return {selected:[...new Set(selected)],features:detected,route:routeInfo.route};
}
