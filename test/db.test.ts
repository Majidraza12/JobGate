// TLS choice for database URLs. No connection is made.
import { describe, expect, it } from "vitest";
import { LOCAL_DATABASE_URL, sslFor } from "../pipeline/db";

describe("sslFor", () => {
  it("uses no TLS for the local Supabase database", () => {
    expect(sslFor(LOCAL_DATABASE_URL)).toBe(false);
    expect(sslFor("postgresql://postgres:postgres@localhost:54322/postgres")).toBe(false);
  });

  it("uses TLS for hosted Supabase", () => {
    expect(sslFor("postgresql://postgres.abc:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres", undefined)).toEqual({ rejectUnauthorized: false });
  });

  it("verifies the server certificate when a CA is configured", () => {
    const hosted = "postgresql://postgres.abc:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres";
    const pem = "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----";
    expect(sslFor(hosted, `\n${pem}\n`)).toEqual({ rejectUnauthorized: true, ca: pem });
    // Blank means not configured, not "trust nothing".
    expect(sslFor(hosted, "  ")).toEqual({ rejectUnauthorized: false });
    // Local never uses TLS, whatever is configured.
    expect(sslFor(LOCAL_DATABASE_URL, pem)).toBe(false);
  });
});
