CREATE TABLE IF NOT EXISTS "public"."PostReports" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "post_id" uuid NOT NULL REFERENCES "public"."Posts"("id") ON DELETE CASCADE,
    "reporter_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "PostReports_post_reporter_key" UNIQUE ("post_id", "reporter_id")
);

ALTER TABLE "public"."PostReports" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM "pg_policies"
        WHERE "schemaname" = 'public'
          AND "tablename" = 'PostReports'
          AND "policyname" = 'Authenticated users can report posts'
    ) THEN
        CREATE POLICY "Authenticated users can report posts"
        ON "public"."PostReports"
        FOR INSERT
        TO "authenticated"
        WITH CHECK ((SELECT auth.uid()) = "reporter_id");
    END IF;
END
$$;

GRANT INSERT ON TABLE "public"."PostReports" TO "authenticated";
