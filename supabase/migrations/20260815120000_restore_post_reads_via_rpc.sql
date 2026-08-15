-- The previous migration removed direct SELECT access to public."Posts".
-- That also broke:
--   1. every legacy/mobile/web page that read Posts directly (post detail,
--      profile, activity, calendar, map, community/sub-community pages), and
--   2. the post_replies / post_likes / PostReports INSERT policies, whose
--      WITH CHECK clauses run an implicit SELECT against Posts as the
--      calling user and were silently failing under the new RLS.
--
-- Fix: reintroduce reads through a SECURITY DEFINER RPC that reimplements
-- the same visibility rules the old SELECT policies enforced (community
-- privacy/membership + sub-community membership), and point the dependent
-- policies at it instead of querying Posts directly.

CREATE OR REPLACE FUNCTION "public"."get_visible_posts"(
    "post_id" "uuid" DEFAULT NULL,
    "target_user" "uuid" DEFAULT NULL,
    "community_ids" "uuid"[] DEFAULT NULL,
    "subcommunity_id" bigint DEFAULT NULL,
    "post_types" "text"[] DEFAULT NULL,
    "top_level_only" boolean DEFAULT false
) RETURNS SETOF "public"."Posts"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select post.*
  from public."Posts" post
  join public."Communities" community on community.id = post.community
  where (get_visible_posts.post_id is null or post.id = get_visible_posts.post_id)
    and (get_visible_posts.target_user is null or post.user_id = get_visible_posts.target_user)
    and (get_visible_posts.community_ids is null or post.community = any(get_visible_posts.community_ids))
    and (get_visible_posts.subcommunity_id is null or post.subcommunity = get_visible_posts.subcommunity_id)
    and (get_visible_posts.post_types is null or post.post_type = any(get_visible_posts.post_types))
    and (not get_visible_posts.top_level_only or post.subcommunity is null)
    and (
      coalesce(community.private, false) is false
      or community.user_id = auth.uid()
      or auth.uid() = any(coalesce(community.members, '{}'::uuid[]))
    )
    and (
      post.subcommunity is null
      or public.can_post_to_subcommunity(post.subcommunity)
      or public.is_subcommunity_manager(post.subcommunity)
    )
$$;

ALTER FUNCTION "public"."get_visible_posts"("uuid", "uuid", "uuid"[], bigint, "text"[], boolean) OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."get_visible_posts"("uuid", "uuid", "uuid"[], bigint, "text"[], boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_visible_posts"("uuid", "uuid", "uuid"[], bigint, "text"[], boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_visible_posts"("uuid", "uuid", "uuid"[], bigint, "text"[], boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_visible_posts"("uuid", "uuid", "uuid"[], bigint, "text"[], boolean) TO "service_role";

CREATE OR REPLACE FUNCTION "public"."can_view_post"("target_post" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (select 1 from public.get_visible_posts(post_id => target_post));
$$;

ALTER FUNCTION "public"."can_view_post"("uuid") OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."can_view_post"("uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_view_post"("uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_view_post"("uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_post"("uuid") TO "service_role";

-- Re-point the policies whose checks implicitly read Posts.

DROP POLICY IF EXISTS "Users create their own post replies" ON "public"."post_replies";
CREATE POLICY "Users create their own post replies" ON "public"."post_replies" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."can_view_post"("post_id")));

DROP POLICY IF EXISTS "Users create their own post likes" ON "public"."post_likes";
CREATE POLICY "Users create their own post likes" ON "public"."post_likes" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."can_view_post"("post_id")));

DROP POLICY IF EXISTS "Authenticated users can report posts" ON "public"."PostReports";
CREATE POLICY "Authenticated users can report posts" ON "public"."PostReports" FOR INSERT TO "authenticated" WITH CHECK ((
  ("reporter_id" = "auth"."uid"())
  AND "public"."can_view_post"("post_id")
  AND NOT EXISTS (SELECT 1 FROM public.get_visible_posts(post_id => "PostReports"."post_id") post WHERE post.user_id = "auth"."uid"())
));
