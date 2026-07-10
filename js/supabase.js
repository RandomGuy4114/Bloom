// The Supabase browser SDK is loaded as a global (`window.supabase`) by
// js/vendor/supabase-umd.js, which each page includes via a plain <script>
// tag before its module scripts. Vendoring it keeps Bloom fully offline —
// nothing is fetched from a CDN at runtime.
const { createClient } = window.supabase;

// Pick the backend automatically: when the site is opened on localhost we talk
// to the local Supabase stack (`supabase start`); anywhere else we use the
// hosted project. The anon keys are safe to ship in the frontend — access is
// governed by the database's Row Level Security policies.
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"];
const isLocal = LOCAL_HOSTS.includes(window.location.hostname);

const backends = {
  local: {
    url: "http://127.0.0.1:54321",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
  },
  hosted: {
    url: "https://auilmosognuitlpoqchn.supabase.co",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aWxtb3NvZ251aXRscG9xY2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTk4NDQsImV4cCI6MjA5ODU5NTg0NH0.13MZws5hs7hg7o3N6Ojz-nEi0qVBhGMkxJcwc9o-DVc",
  },
};

const backend = isLocal ? backends.local : backends.hosted;
console.info(`[Bloom] Using ${isLocal ? "local" : "hosted"} Supabase: ${backend.url}`);

export const supabase = createClient(backend.url, backend.anonKey);
