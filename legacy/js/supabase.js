// Dependencies

import { createBrowserClient } from "https://esm.sh/@supabase/ssr";

// Definitions
//
// This must use the same cookie-backed session storage as the Next.js app's
// client (src/lib/supabase/client.ts). The legacy pages previously created a
// separate client backed by localStorage, so a session established via the
// new login/Google OAuth flow (which is cookie-based) was invisible here,
// causing getCurrentUserOrRedirect() to bounce logged-in users back to the
// legacy login screen.

const clientKey = "__bloomSupabaseClient";

if (!globalThis[clientKey]) {
  globalThis[clientKey] = createBrowserClient(
    "https://auilmosognuitlpoqchn.supabase.co",
    "sb_publishable_tk45nARRDwS9I4iLJ-8KbA_iqq_avnG",
  );
}

export const supabase = globalThis[clientKey];
