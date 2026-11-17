/** Land Desk data lives in schema land on the hub project. Air stays on its own project. */
export const LAND_SCHEMA = "land" as const;
export const LAND_SUPABASE_URL = "https://aozoakeghslgnhdegdyr.supabase.co";

export function landAnonKey() {
  return (
    process.env.NEXT_PUBLIC_LAND_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_LAND_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).replace(/\s+/g, "");
}

export function landAuthConfigured() {
  return landAnonKey().length > 0;
}
