import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    'https://jdtdnrxilcjsmozkrved.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGRucnhpbGNqc21vemtydmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzAwNTcsImV4cCI6MjEwODk0NjA1N30.JscNaZlrP_HVTg2utsj3YF8htkvdkwzSsvvuKWpuhFQ'
  )
}
