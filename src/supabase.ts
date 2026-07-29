import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "https://auilmosognuitlpoqchn.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aWxtb3NvZ251aXRscG9xY2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTk4NDQsImV4cCI6MjA5ODU5NTg0NH0.13MZws5hs7hg7o3N6Ojz-nEi0qVBhGMkxJcwc9o-DVc"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
    },
})
