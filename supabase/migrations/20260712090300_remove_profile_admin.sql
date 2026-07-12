DROP POLICY IF EXISTS "Allow users to update everything except admin status" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."profiles";

ALTER TABLE "public"."profiles"
DROP COLUMN IF EXISTS "admin";

CREATE POLICY "Users can update their own profile"
ON "public"."profiles"
FOR UPDATE
TO "authenticated"
USING ((SELECT "auth"."uid"()) = "id")
WITH CHECK ((SELECT "auth"."uid"()) = "id");
