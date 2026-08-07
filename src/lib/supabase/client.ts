import { createBrowserClient } from "@supabase/ssr"
import { supabaseAnonKey, supabaseUrl } from "./env"

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
