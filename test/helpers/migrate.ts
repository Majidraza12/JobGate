// Builds the schema in a fresh test database. Supabase provides the auth
// schema in its own databases; a bare `create database` doesn't have it, so a
// minimal stand-in (auth.users and auth.uid()) goes in first for the M3
// migrations that reference it.
import { readFileSync, readdirSync } from "node:fs";
import type pg from "pg";

const AUTH_STUB = `
  create schema if not exists auth;
  create table if not exists auth.users (id uuid primary key);
  create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
`;

export async function applyMigrations(db: pg.Client): Promise<void> {
  await db.query(AUTH_STUB);
  const dir = new URL("../../supabase/migrations/", import.meta.url);
  for (const f of readdirSync(dir).sort()) await db.query(readFileSync(new URL(f, dir), "utf8"));
}
