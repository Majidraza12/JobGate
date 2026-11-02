// Mirrors the pipeline's tables from local Supabase to the hosted project, until
// the scheduled pipeline writes to hosted directly. Upserts by primary key, in
// foreign-key order, inside one transaction. User tables (profiles,
// applications, verdict_feedback) are never read or written. Rows deleted
// locally are not deleted on hosted; listings close by status, not by delete.
//
//   npm run sync:hosted     reads HOSTED_DATABASE_URL from .env

import pg from "pg";
import { connect } from "./db";

const TABLES = ["sources", "pipeline_runs", "raw_listings", "listings", "listing_sources", "possible_duplicates", "extraction_runs", "requirements"];
const CHUNK = 500;

const hostedUrl = process.env.HOSTED_DATABASE_URL;
if (!hostedUrl) throw new Error("HOSTED_DATABASE_URL is not set in .env");

const local = await connect();
const hosted = new pg.Client({ connectionString: hostedUrl, ssl: { rejectUnauthorized: false } });
await hosted.connect();

async function primaryKey(table: string): Promise<string[]> {
  const r = await local.query<{ column_name: string }>(
    `select a.attname as column_name from pg_index i
     join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
     where i.indrelid = $1::regclass and i.indisprimary`,
    [`public.${table}`],
  );
  return r.rows.map((x) => x.column_name);
}

try {
  await hosted.query("begin");
  for (const table of TABLES) {
    const pk = await primaryKey(table);
    const { rows, fields } = await local.query(`select * from ${table}`);
    const cols = fields.map((f) => `"${f.name}"`).join(", ");
    const updates = fields.filter((f) => !pk.includes(f.name)).map((f) => `"${f.name}" = excluded."${f.name}"`).join(", ");
    for (let i = 0; i < rows.length; i += CHUNK) {
      await hosted.query(
        `insert into ${table} (${cols}) overriding system value
         select ${cols} from jsonb_populate_recordset(null::${table}, $1)
         on conflict (${pk.map((c) => `"${c}"`).join(", ")}) do ${updates ? `update set ${updates}` : "nothing"}`,
        [JSON.stringify(rows.slice(i, i + CHUNK))],
      );
    }
    // Keep identity sequences ahead of the copied ids (bigint ids only;
    // sources uses text ids and has no sequence).
    if (fields.some((f) => f.name === "id" && f.dataTypeID === 20) && rows.length)
      await hosted.query(`select setval(pg_get_serial_sequence('${table}', 'id')::regclass, (select max(id) from ${table}))`);
    console.log(`${table}: ${rows.length} rows`);
  }
  await hosted.query("commit");
} catch (e) {
  await hosted.query("rollback");
  throw e;
} finally {
  await local.end();
  await hosted.end();
}
