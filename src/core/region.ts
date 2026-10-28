// MVP region filter: US + remote-US. A listing is dropped only when every one
// of its locations is clearly outside the US. Anything we can't place stays,
// because hiding a job the user could apply to is the worst error.

export type Region = "us" | "non_us" | "unknown";

const STATES: Record<string, string> = {
  AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california", CO: "colorado",
  CT: "connecticut", DE: "delaware", DC: "district of columbia", FL: "florida", GA: "georgia",
  HI: "hawaii", ID: "idaho", IL: "illinois", IN: "indiana", IA: "iowa", KS: "kansas",
  KY: "kentucky", LA: "louisiana", ME: "maine", MD: "maryland", MA: "massachusetts",
  MI: "michigan", MN: "minnesota", MS: "mississippi", MO: "missouri", MT: "montana",
  NE: "nebraska", NV: "nevada", NH: "new hampshire", NJ: "new jersey", NM: "new mexico",
  NY: "new york", NC: "north carolina", ND: "north dakota", OH: "ohio", OK: "oklahoma",
  OR: "oregon", PA: "pennsylvania", RI: "rhode island", SC: "south carolina", SD: "south dakota",
  TN: "tennessee", TX: "texas", UT: "utah", VT: "vermont", VA: "virginia", WA: "washington",
  WV: "west virginia", WI: "wisconsin", WY: "wyoming", PR: "puerto rico",
};
const STATE_NAMES = new Set(Object.values(STATES));

const US_PHRASES = /\b(united states|u\.s\.a?\.?|usa|nyc|bay area|silicon valley)\b|^us\b|\bus$|^sf$/i;

const NON_US_COUNTRIES =
  /\b(canada|united kingdom|uk|england|scotland|wales|ireland|india|germany|netherlands|france|spain|italy|portugal|switzerland|austria|belgium|denmark|sweden|norway|finland|poland|czech( republic)?|czechia|hungary|romania|bulgaria|greece|serbia|croatia|ukraine|estonia|latvia|lithuania|luxembourg|israel|turkey|uae|united arab emirates|saudi arabia|qatar|egypt|nigeria|kenya|south africa|china|hong kong|taiwan|japan|korea|singapore|malaysia|indonesia|thailand|vietnam|philippines|pakistan|australia|new zealand|mexico|brazil|argentina|chile|colombia|costa rica|peru)\b/i;

const CANADIAN_PROVINCES = new Set(["ON", "BC", "QC", "AB", "MB", "SK", "NS", "NB", "NL", "PE"]);

// Cities only count when nothing else names a US state, since "Vancouver, WA"
// and "London, KY" exist.
const NON_US_CITIES =
  /\b(london|toronto|vancouver|montreal|ottawa|waterloo|calgary|bangalore|bengaluru|hyderabad|pune|chennai|mumbai|delhi|gurgaon|noida|dublin|berlin|munich|paris|amsterdam|zurich|tel aviv|tokyo|seoul|sydney|melbourne|shanghai|beijing|shenzhen|warsaw|krakow|bucharest|prague|madrid|barcelona|lisbon|stockholm|copenhagen)\b/i;

export function classifyLocation(raw: string): Region {
  const s = raw.trim();
  if (!s) return "unknown";
  const parts = s.split(/[,\-~()]/).map((p) => p.trim()).filter(Boolean);
  const hasUsState = parts.some((p) => p in STATES || STATE_NAMES.has(p.toLowerCase()));
  const explicitUs = US_PHRASES.test(s) || /^US-[A-Z]{2}\b/.test(s);
  if (explicitUs) return "us";
  // "London, England, New York, New York" is two places joined with commas.
  if (NON_US_COUNTRIES.test(s)) return hasUsState ? "unknown" : "non_us";
  if (parts.length > 1 && CANADIAN_PROVINCES.has(parts[parts.length - 1]!)) return "non_us";
  if (hasUsState) return "us";
  if (NON_US_CITIES.test(s)) return "non_us";
  return "unknown";
}

export function splitLocations(raw: string): string[] {
  return raw.split(/[;|]/).map((s) => s.trim()).filter(Boolean);
}

export function isInRegion(locations: string[]): boolean {
  if (locations.length === 0) return true;
  return locations.some((l) => classifyLocation(l) !== "non_us");
}
