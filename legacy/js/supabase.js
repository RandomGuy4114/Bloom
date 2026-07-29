// Dependencies

import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Definitions

const clientKey = "__bloomSupabaseClient";

if (!globalThis[clientKey]) {
  globalThis[clientKey] = createClient(
    "https://auilmosognuitlpoqchn.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aWxtb3NvZ251aXRscG9xY2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTk4NDQsImV4cCI6MjA5ODU5NTg0NH0.13MZws5hs7hg7o3N6Ojz-nEi0qVBhGMkxJcwc9o-DVc",
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
      },
      global: {
        headers: {
          "X-Client-Info": "bloom-web",
        },
      },
    },
  );
}

export const supabase = globalThis[clientKey];
