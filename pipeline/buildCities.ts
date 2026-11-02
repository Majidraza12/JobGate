// Builds src/core/usCities.json from the Census Bureau's city population
// estimates (public domain), so the profile can offer cities that have no
// postings yet without accepting free-text typos.
//
// Download once, then run:
//   curl -o sub-est2023.csv https://www2.census.gov/programs-surveys/popest/datasets/2020-2023/cities/totals/sub-est2023.csv
//   npx tsx pipeline/buildCities.ts sub-est2023.csv

import { readFileSync, writeFileSync } from "node:fs";

const MIN_POPULATION = 10_000;

const STATE_CODES: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT",
  Delaware: "DE", "District of Columbia": "DC", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL",
  Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE",
  Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
  "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI",
  "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA",
  Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};

// Consolidated city-counties and alternate names, as people say them.
const RENAMES: Record<string, string> = {
  "Nashville-Davidson": "Nashville",
  "Louisville/Jefferson County": "Louisville",
  "Lexington-Fayette": "Lexington",
  "Urban Honolulu": "Honolulu",
  "Boise City": "Boise",
  "Augusta-Richmond County": "Augusta",
  "Athens-Clarke County": "Athens",
  "Macon-Bibb County": "Macon",
  "San Buenaventura (Ventura)": "Ventura",
  "El Paso de Robles (Paso Robles)": "Paso Robles",
  "Hartsville/Trousdale County": "Hartsville",
};

// "Nashville-Davidson metropolitan government (balance)" -> "Nashville"
export function placeName(census: string): string {
  const name = census
    .replace(/\s*\(balance\)$/, "")
    .replace(/\s+(city and borough|unified government|consolidated government|metropolitan government|metro government|urban county|municipality|city|town|village|borough|township|CDP)$/i, "")
    .trim();
  return RENAMES[name] ?? name;
}

function main(path: string) {
  // The file is Latin-1 (Española, Cañon City).
  const lines = readFileSync(path, "latin1").trim().split(/\r?\n/);
  const header = lines[0]!.split(",");
  const col = (n: string) => header.indexOf(n);
  const [sumlev, name, state, pop] = [col("SUMLEV"), col("NAME"), col("STNAME"), col("POPESTIMATE2023")];

  const best = new Map<string, number>();
  for (const line of lines.slice(1)) {
    const f = line.split(",");
    // 162 = incorporated place. Names in this file contain no commas.
    if (f[sumlev] !== "162") continue;
    const population = Number(f[pop]);
    const code = STATE_CODES[f[state]!];
    if (!code || !(population >= MIN_POPULATION)) continue;
    const city = `${placeName(f[name]!)}, ${code}`;
    best.set(city, Math.max(best.get(city) ?? 0, population));
  }
  const cities = [...best].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  writeFileSync("src/core/usCities.json", JSON.stringify(cities) + "\n");
  console.log(`${cities.length} cities with population >= ${MIN_POPULATION.toLocaleString()} -> src/core/usCities.json`);
}

if (process.argv[2]) main(process.argv[2]);
