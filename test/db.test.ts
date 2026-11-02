// TLS choice for database URLs. No connection is made.
import { describe, expect, it } from "vitest";
import { LOCAL_DATABASE_URL, sslFor } from "../pipeline/db";

describe("sslFor", () => {
  it("uses no TLS for the local Supabase database", () => {
    expect(sslFor(LOCAL_DATABASE_URL)).toBe(false);
    expect(sslFor("postgresql://postgres:postgres@localhost:54322/postgres")).toBe(false);
  });

  it("uses TLS for hosted Supabase", () => {
    expect(sslFor("postgresql://postgres.abc:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres")).toEqual({ rejectUnauthorized: false });
  });
});
