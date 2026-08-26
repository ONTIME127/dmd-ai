export type WorldBankCountry = {
  iso2: string;
  iso3: string;
  name: string;
  region: string;
  malePopulation: number;
  populationYear: string;
  estimatedDmdPopulation: number;
};

const CACHE_KEY = "dmd_ai_world_bank_male_population_v1";
const CACHE_TTL = 6 * 60 * 60 * 1000;

export const DMD_GLOBAL_MALE_PREVALENCE_PER_100K = 7.1;
export const DMD_GLOBAL_BIRTH_PREVALENCE_PER_100K_MALE_BIRTHS = 19.8;

type CountryMeta = {
  id: string;
  iso2Code: string;
  name: string;
  region?: { id?: string; value?: string };
};

type PopulationRow = {
  country?: { id?: string; value?: string };
  countryiso3code?: string;
  date?: string;
  value?: number | null;
};

function estimateDmdPopulation(malePopulation:number){
  return Math.round((malePopulation * DMD_GLOBAL_MALE_PREVALENCE_PER_100K) / 100000);
}

function normalizeResult(meta:CountryMeta[], population:PopulationRow[]):WorldBankCountry[]{
  const metaByIso2 = new Map(
    meta
      .filter(c=>c.iso2Code && c.region?.value && c.region.value !== "Aggregates")
      .map(c=>[c.iso2Code.toUpperCase(),c])
  );

  const seen = new Set<string>();
  const out:WorldBankCountry[]=[];

  for(const row of population){
    const iso2 = String(row.country?.id || "").toUpperCase();
    if(!iso2 || seen.has(iso2) || !row.value) continue;
    const country = metaByIso2.get(iso2);
    if(!country) continue;
    seen.add(iso2);

    out.push({
      iso2,
      iso3:String(row.countryiso3code||""),
      name:country.name,
      region:String(country.region?.value||""),
      malePopulation:Number(row.value),
      populationYear:String(row.date||""),
      estimatedDmdPopulation:estimateDmdPopulation(Number(row.value)),
    });
  }

  return out.sort((a,b)=>a.name.localeCompare(b.name));
}

export async function fetchWorldDmdData():Promise<{countries:WorldBankCountry[]; fetchedAt:string; source:"live"|"cache"}>{
  const cachedRaw = localStorage.getItem(CACHE_KEY);
  if(cachedRaw){
    try{
      const cached=JSON.parse(cachedRaw);
      if(Date.now()-Number(cached.savedAt)<CACHE_TTL && Array.isArray(cached.countries)){
        return {countries:cached.countries,fetchedAt:cached.fetchedAt,source:"cache"};
      }
    }catch{}
  }

  const [metaRes,popRes]=await Promise.all([
    fetch("https://api.worldbank.org/v2/country?format=json&per_page=400"),
    fetch("https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL.MA.IN?format=json&per_page=400&mrnev=1"),
  ]);

  if(!metaRes.ok || !popRes.ok) throw new Error("World Bank data service is temporarily unavailable.");

  const metaJson=await metaRes.json();
  const popJson=await popRes.json();

  const countries=normalizeResult(
    Array.isArray(metaJson?.[1])?metaJson[1]:[],
    Array.isArray(popJson?.[1])?popJson[1]:[],
  );

  const fetchedAt=new Date().toISOString();
  localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),fetchedAt,countries}));
  return {countries,fetchedAt,source:"live"};
}

export function formatInteger(value:number){
  return new Intl.NumberFormat(undefined,{maximumFractionDigits:0}).format(value);
}
