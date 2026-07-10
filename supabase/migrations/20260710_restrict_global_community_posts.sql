ALTER TABLE "public"."profiles"
ADD COLUMN IF NOT EXISTS "admin" boolean DEFAULT false NOT NULL;

ALTER TABLE "public"."profiles"
ADD COLUMN IF NOT EXISTS "FirstTimeOpen" boolean DEFAULT true NOT NULL;

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
          AND (
              NOT COALESCE("community"."global", false)
              OR EXISTS (
                  SELECT 1
                  FROM "public"."profiles" AS "profile"
                  WHERE "profile"."id" = auth.uid()
                    AND "profile"."admin" = true
              )
          )
    );
$$;

REVOKE ALL ON FUNCTION "public"."can_post_to_community"(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."can_post_to_community"(uuid) TO "authenticated";

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."Posts";
DROP POLICY IF EXISTS "Authenticated users can create permitted posts" ON "public"."Posts";

CREATE POLICY "Authenticated users can create permitted posts"
ON "public"."Posts"
FOR INSERT
TO "authenticated"
WITH CHECK ("public"."can_post_to_community"("community"));

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can create their own non-admin profile" ON "public"."profiles";

CREATE POLICY "Users can create their own non-admin profile"
ON "public"."profiles"
FOR INSERT
TO "authenticated"
WITH CHECK ((SELECT auth.uid()) = "id" AND "admin" = false);

REVOKE UPDATE ON TABLE "public"."profiles" FROM "authenticated";
GRANT UPDATE (
    "username",
    "display_name",
    "bio",
    "avatar_url",
    "joined_communities",
    "Language",
    "FirstTimeOpen"
) ON TABLE "public"."profiles" TO "authenticated";
