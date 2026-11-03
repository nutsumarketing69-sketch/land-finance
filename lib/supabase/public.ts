const fallbackUrl = "https://jdtdnrxilcjsmozkrved.supabase.co";
const fallbackKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGRucnhpbGNqc21vemtydmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzAwNTcsImV4cCI6MjEwODk0NjA1N30.JscNaZlrP_HVTg2utsj3YF8htkvdkwzSsvvuKWpuhFQ";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl;
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  fallbackKey;
