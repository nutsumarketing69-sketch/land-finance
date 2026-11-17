import { createBrowserClient } from "@supabase/ssr";
import { LAND_SCHEMA, LAND_SUPABASE_URL, landAnonKey } from "./land";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./public";

/** Air shop session and public-schema tables. */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/** Land Desk session. Tables resolve in schema land on the hub project. */
export function createLandClient() {
  return createBrowserClient(LAND_SUPABASE_URL, landAnonKey(), {
    db: { schema: LAND_SCHEMA },
  });
}
