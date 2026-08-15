-- Remove direct SELECT access to public."Posts".
-- Reads must go through SECURITY DEFINER RPCs (e.g. get_home_feed) instead
-- of querying the table directly.
DROP POLICY IF EXISTS "Users can read visible posts" ON "public"."Posts";
DROP POLICY IF EXISTS "Sub-community posts require membership" ON "public"."Posts";
