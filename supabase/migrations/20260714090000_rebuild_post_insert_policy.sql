DO $$
DECLARE
    "policy_record" record;
BEGIN
    FOR "policy_record" IN
        SELECT "policyname"
        FROM "pg_policies"
        WHERE "schemaname" = 'public'
          AND "tablename" = 'Posts'
          AND "cmd" = 'INSERT'
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON public.%I',
            "policy_record"."policyname",
            'Posts'
        );
    END LOOP;
END;
$$;

CREATE POLICY "Authenticated users can create permitted posts"
ON "public"."Posts"
FOR INSERT
TO "authenticated"
WITH CHECK (
    "user_id" = (SELECT "auth"."uid"())
    AND EXISTS (
        SELECT 1
        FROM "public"."Communities" AS "community_record"
        WHERE "community_record"."id" = "Posts"."community"
          AND (SELECT "auth"."uid"()) = ANY(
              COALESCE("community_record"."members", ARRAY[]::uuid[])
          )
          AND (
              NOT COALESCE("community_record"."global", false)
              OR COALESCE("auth"."jwt"()->'app_metadata'->>'role', '') = 'admin'
          )
    )
);

NOTIFY "pgrst", 'reload schema';
