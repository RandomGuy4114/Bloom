CREATE OR REPLACE FUNCTION "public"."can_post_to_community"("target_community" uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM "public"."Communities" AS "community"
        WHERE "community"."id" = "target_community"
          AND "auth"."uid"() = ANY(COALESCE("community"."members", ARRAY[]::uuid[]))
          AND (
              NOT COALESCE("community"."global", false)
              OR COALESCE("auth"."jwt"()->'app_metadata'->>'role', '') = 'admin'
          )
    );
$$;

REVOKE ALL ON FUNCTION "public"."can_post_to_community"(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."can_post_to_community"(uuid) TO "authenticated";
