ALTER TABLE "public"."Posts"
ADD COLUMN IF NOT EXISTS "post_type" text DEFAULT 'post';

UPDATE "public"."Posts"
SET "post_type" = 'post'
WHERE "post_type" IS NULL OR "post_type" NOT IN ('post', 'activity', 'event');

ALTER TABLE "public"."Posts"
ALTER COLUMN "post_type" SET DEFAULT 'post';

ALTER TABLE "public"."Posts"
ALTER COLUMN "post_type" SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM "pg_constraint"
        WHERE "conname" = 'Posts_post_type_check'
    ) THEN
        ALTER TABLE "public"."Posts"
        ADD CONSTRAINT "Posts_post_type_check"
        CHECK ("post_type" IN ('post', 'activity', 'event'));
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "Posts_post_type_created_at_idx"
ON "public"."Posts" ("post_type", "created_at" DESC);
