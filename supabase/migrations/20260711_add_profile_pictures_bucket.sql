INSERT INTO "storage"."buckets" (
    "id",
    "name",
    "public",
    "file_size_limit",
    "allowed_mime_types"
)
VALUES (
    'Profile Pictures',
    'Profile Pictures',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT ("id") DO UPDATE
SET
    "public" = EXCLUDED."public",
    "file_size_limit" = EXCLUDED."file_size_limit",
    "allowed_mime_types" = EXCLUDED."allowed_mime_types";

DROP POLICY IF EXISTS "Users can view their own profile pictures" ON "storage"."objects";
DROP POLICY IF EXISTS "Users can upload their own profile pictures" ON "storage"."objects";
DROP POLICY IF EXISTS "Users can update their own profile pictures" ON "storage"."objects";
DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON "storage"."objects";

CREATE POLICY "Users can view their own profile pictures"
ON "storage"."objects"
FOR SELECT
TO "authenticated"
USING (
    "bucket_id" = 'Profile Pictures'
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."uid"())::text
);

CREATE POLICY "Users can upload their own profile pictures"
ON "storage"."objects"
FOR INSERT
TO "authenticated"
WITH CHECK (
    "bucket_id" = 'Profile Pictures'
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."uid"())::text
);

CREATE POLICY "Users can update their own profile pictures"
ON "storage"."objects"
FOR UPDATE
TO "authenticated"
USING (
    "bucket_id" = 'Profile Pictures'
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."uid"())::text
)
WITH CHECK (
    "bucket_id" = 'Profile Pictures'
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."uid"())::text
);

CREATE POLICY "Users can delete their own profile pictures"
ON "storage"."objects"
FOR DELETE
TO "authenticated"
USING (
    "bucket_id" = 'Profile Pictures'
    AND ("storage"."foldername"("name"))[1] = (SELECT "auth"."uid"())::text
);
