import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { LAND_SCHEMA, LAND_SUPABASE_URL, landAnonKey } from "./land";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./public";

/** Air shop session and public-schema tables. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component. The proxy refreshes the session.
        }
      },
    },
  });
}

/** Land Desk session. Tables resolve in schema land on the hub project. */
export async function createLandClient() {
  const cookieStore = await cookies();

  return createServerClient(LAND_SUPABASE_URL, landAnonKey(), {
    db: { schema: LAND_SCHEMA },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component. The proxy refreshes the session.
        }
      },
    },
  });
}
