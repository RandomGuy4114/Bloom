-- Users can currently update their own "requestedDelete" column directly, but
-- nothing in the client or edge functions ever sets it. Column-level UPDATE
-- grants on public.profiles for the authenticated role should be limited to
-- the fields the app actually lets users change themselves: FirstTimeOpen,
-- Theme, and Language.

REVOKE UPDATE ("requestedDelete") ON TABLE "public"."profiles" FROM "authenticated";
