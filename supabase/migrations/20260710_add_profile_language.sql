ALTER TABLE "public"."profiles"
ADD COLUMN IF NOT EXISTS "Language" text DEFAULT 'en';

UPDATE "public"."profiles"
SET "Language" = 'en'
WHERE "Language" IS NULL OR "Language" NOT IN ('en', 'es');

ALTER TABLE "public"."profiles"
ALTER COLUMN "Language" SET DEFAULT 'en';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM "pg_constraint"
        WHERE "conname" = 'profiles_language_check'
    ) THEN
        ALTER TABLE "public"."profiles"
        ADD CONSTRAINT "profiles_language_check"
        CHECK ("Language" IN ('en', 'es'));
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM "pg_policies"
        WHERE "schemaname" = 'public'
          AND "tablename" = 'profiles'
          AND "policyname" = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile"
        ON "public"."profiles"
        FOR UPDATE
        TO "authenticated"
        USING ((SELECT "auth"."uid"()) = "id")
        WITH CHECK ((SELECT "auth"."uid"()) = "id");
    END IF;
END
$$;
