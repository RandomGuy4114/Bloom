ALTER TABLE "public"."profiles"
ADD COLUMN IF NOT EXISTS "display_name" text;

UPDATE "public"."profiles"
SET "display_name" = "username"
WHERE "display_name" IS NULL OR trim("display_name") = '';

ALTER TABLE "public"."profiles"
ALTER COLUMN "display_name" SET NOT NULL;

ALTER TABLE "public"."profiles"
DROP CONSTRAINT IF EXISTS "profiles_display_name_length_check";

ALTER TABLE "public"."profiles"
ADD CONSTRAINT "profiles_display_name_length_check"
CHECK (char_length(trim("display_name")) BETWEEN 1 AND 50);

ALTER TABLE "public"."profiles"
DROP CONSTRAINT IF EXISTS "profiles_username_format_check";

ALTER TABLE "public"."profiles"
ADD CONSTRAINT "profiles_username_format_check"
CHECK ("username" ~ '^[A-Za-z0-9_]{3,30}$') NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS "profiles_username_lower_key"
ON "public"."profiles" (lower("username"));

DROP FUNCTION IF EXISTS "public"."get_public_profile"(uuid);

CREATE FUNCTION "public"."get_public_profile"("target_user" uuid)
RETURNS TABLE (
    "id" uuid,
    "username" text,
    "display_name" text,
    "bio" text,
    "avatar_url" text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        "profile"."id",
        "profile"."username",
        "profile"."display_name",
        "profile"."bio",
        "profile"."avatar_url"
    FROM "public"."profiles" AS "profile"
    WHERE "profile"."id" = "target_user";
$$;

REVOKE ALL ON FUNCTION "public"."get_public_profile"(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."get_public_profile"(uuid) TO "authenticated";

GRANT UPDATE ("display_name") ON TABLE "public"."profiles" TO "authenticated";

CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO "public"."profiles" ("id", "username", "display_name", "birthday")
    VALUES (
        NEW."id",
        nullif(NEW."raw_user_meta_data"->>'username', '')::text,
        coalesce(
            nullif(NEW."raw_user_meta_data"->>'display_name', '')::text,
            nullif(NEW."raw_user_meta_data"->>'username', '')::text
        ),
        CASE
            WHEN nullif(NEW."raw_user_meta_data"->>'birthday', '') IS NULL THEN NULL
            ELSE (NEW."raw_user_meta_data"->>'birthday')::date
        END
    )
    ON CONFLICT ("id") DO UPDATE SET
        "username" = EXCLUDED."username",
        "display_name" = EXCLUDED."display_name",
        "birthday" = EXCLUDED."birthday";
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_new_user_fn"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    "new_username" text := nullif(NEW."raw_user_meta_data"->>'username', '')::text;
BEGIN
    INSERT INTO "public"."profiles" ("id", "username", "display_name", "birthday")
    VALUES (
        NEW."id",
        "new_username",
        coalesce(nullif(NEW."raw_user_meta_data"->>'display_name', '')::text, "new_username"),
        CASE
            WHEN nullif(NEW."raw_user_meta_data"->>'birthday', '') IS NULL THEN NULL
            ELSE (NEW."raw_user_meta_data"->>'birthday')::date
        END
    )
    ON CONFLICT ("id") DO UPDATE SET
        "username" = EXCLUDED."username",
        "display_name" = EXCLUDED."display_name",
        "birthday" = EXCLUDED."birthday";
    RETURN NEW;
END;
$$;
