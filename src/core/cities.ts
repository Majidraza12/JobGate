// Listing locations come in many spellings ("NYC", "New York, NY, United
// States", "Seattle, Washington, USA", "Atlanta GA"). cityOf turns one into a
// single canonical "City, ST" so the profile's city picker and the feed's
// "My cities" filter agree. Anything that isn't one U.S. city (a state, a
// country, "Remote in USA") returns null.

const STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT",
  delaware: "DE", "district of columbia": "DC", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE",
  nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC",
  "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA",
  washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};
const CODES = new Set(Object.values(STATES));

// Short names the sources use for whole cities.
const ALIASES: Record<string, string> = {
  nyc: "New York, NY",
  "new york": "New York, NY",
  "new york city": "New York, NY",
  manhattan: "New York, NY",
  sf: "San Francisco, CA",
  "south sf": "South San Francisco, CA",
  la: "Los Angeles, CA",
  dc: "Washington, DC",
  "washington dc": "Washington, DC",
  "washington d.c.": "Washington, DC",
};

const COUNTRY = /^(united states( of america)?|usa|us|u\.s\.a?\.?)$/i;

function stateCode(s: string): string | null {
  const t = s.trim();
  if (/^[A-Z]{2}$/.test(t) && CODES.has(t)) return t;
  return STATES[t.toLowerCase()] ?? null;
}

// "SAN JOSE" -> "San Jose"; mixed case is left alone.
function cityName(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t === t.toUpperCase() ? t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : t;
}

export function cityOf(location: string): string | null {
  const raw = location.trim().replace(/\s+/g, " ");
  const alias = ALIASES[raw.toLowerCase()];
  if (alias) return alias;

  // "United States - California - Foster City"
  const dashed = raw.match(/^(?:united states|usa|us) - ([^-]+) - ([^-]+)$/i);
  if (dashed) {
    const st = stateCode(dashed[1]!);
    return st ? `${cityName(dashed[2]!)}, ${st}` : null;
  }

  // "Atlanta GA"
  const spaced = raw.match(/^([A-Za-z .'-]+) ([A-Z]{2})$/);
  if (spaced && CODES.has(spaced[2]!)) return `${cityName(spaced[1]!)}, ${spaced[2]}`;

  // "City, ST", "City, State, Country", "County, City, ST", "Boise, ID - Main Site"
  const parts = raw
    .split(",")
    .map((p) => p.replace(/ - .*$/, "").trim())
    .filter(Boolean);
  while (parts.length && COUNTRY.test(parts[parts.length - 1]!)) parts.pop();
  if (parts.length < 2) return null;
  const st = stateCode(parts[parts.length - 1]!);
  const city = parts[parts.length - 2]!;
  if (!st || /\d/.test(city)) return null;
  const known = ALIASES[city.toLowerCase()];
  return known?.endsWith(`, ${st}`) ? known : `${cityName(city)}, ${st}`;
}

// Distinct canonical cities with how many listings mention each, most first.
export function cityCounts(locationLists: string[][]): { city: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const list of locationLists) {
    for (const city of new Set(list.map(cityOf).filter((c): c is string => c !== null))) counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return [...counts].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
}
