-- Notifications table + triggers so users get notified about replies, likes,
-- and community join-request activity without polling every page for it.

CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "type" "text" NOT NULL,
    "post_id" "uuid",
    "community_id" "uuid",
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['post_reply'::"text", 'post_like'::"text", 'join_request'::"text", 'join_approved'::"text", 'join_denied'::"text"]))),
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "notifications_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."Posts"("id") ON DELETE CASCADE,
    CONSTRAINT "notifications_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."Communities"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."notifications" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx" ON "public"."notifications" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_idx" ON "public"."notifications" ("user_id", "read");

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON "public"."notifications";
CREATE POLICY "Users can view their own notifications"
    ON "public"."notifications" FOR SELECT
    TO "authenticated"
    USING ("auth"."uid"() = "user_id");

DROP POLICY IF EXISTS "Users can update their own notifications" ON "public"."notifications";
CREATE POLICY "Users can update their own notifications"
    ON "public"."notifications" FOR UPDATE
    TO "authenticated"
    USING ("auth"."uid"() = "user_id")
    WITH CHECK ("auth"."uid"() = "user_id");

-- Notify a post's author when someone replies to it.

CREATE OR REPLACE FUNCTION "public"."notify_on_post_reply"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  post_owner uuid;
begin
  select "user_id" into post_owner from public."Posts" where "id" = new."post_id";
  if post_owner is not null and post_owner <> new."user_id" then
    insert into public."notifications" ("user_id", "actor_id", "type", "post_id")
    values (post_owner, new."user_id", 'post_reply', new."post_id");
  end if;
  return new;
end;
$$;

ALTER FUNCTION "public"."notify_on_post_reply"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "post_replies_notify" ON "public"."post_replies";
CREATE TRIGGER "post_replies_notify"
    AFTER INSERT ON "public"."post_replies"
    FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_post_reply"();

-- Notify a post's author when someone likes it.

CREATE OR REPLACE FUNCTION "public"."notify_on_post_like"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  post_owner uuid;
begin
  select "user_id" into post_owner from public."Posts" where "id" = new."post_id";
  if post_owner is not null and post_owner <> new."user_id" then
    insert into public."notifications" ("user_id", "actor_id", "type", "post_id")
    values (post_owner, new."user_id", 'post_like', new."post_id");
  end if;
  return new;
end;
$$;

ALTER FUNCTION "public"."notify_on_post_like"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "post_likes_notify" ON "public"."post_likes";
CREATE TRIGGER "post_likes_notify"
    AFTER INSERT ON "public"."post_likes"
    FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_post_like"();

-- Notify the community owner when someone requests to join a private community.

CREATE OR REPLACE FUNCTION "public"."join_community"("target_community" "uuid", "user_latitude" double precision, "user_longitude" double precision) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$DECLARE
    "active_user" uuid := "auth"."uid"();
    "community_record" "public"."Communities"%ROWTYPE;
BEGIN
    IF "active_user" IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;


    IF NOT EXISTS (
        SELECT 1 FROM "public"."profiles" WHERE "id" = "active_user"
    ) THEN
        RAISE EXCEPTION 'Profile required';
    END IF;

    IF "user_latitude" IS NOT NULL AND ("user_latitude" < -90 OR "user_latitude" > 90) THEN
        RETURN 'out_of_range';
    END IF;
    IF "user_longitude" IS NOT NULL AND ("user_longitude" < -180 OR "user_longitude" > 180) THEN
        RETURN 'out_of_range';
    END IF;

    SELECT * INTO "community_record"
    FROM "public"."Communities"
    WHERE "id" = "target_community"
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN 'not_found';
    END IF;


    IF "active_user" = ANY(COALESCE("community_record"."members", ARRAY[]::uuid[])) THEN
        RETURN 'already_joined';
    END IF;

    IF COALESCE("community_record"."private", TRUE) THEN
        IF "active_user" = ANY("community_record"."reqUUID") THEN
            RETURN 'already_requested';
        END IF;

        UPDATE "public"."Communities"
        SET "reqUUID" = array_append("reqUUID", "active_user")
        WHERE "id" = "target_community";

        IF "community_record"."user_id" IS NOT NULL AND "community_record"."user_id" <> "active_user" THEN
            INSERT INTO "public"."notifications" ("user_id", "actor_id", "type", "community_id")
            VALUES ("community_record"."user_id", "active_user", 'join_request', "target_community");
        END IF;

        RETURN 'private_requested';
    END IF;

    IF NOT COALESCE("community_record"."global", false) AND (
        "user_latitude" IS NULL
        OR "user_longitude" IS NULL
        OR "community_record"."latitude" IS NULL
        OR "community_record"."longitude" IS NULL
        OR "community_record"."radius_meters" IS NULL
        OR "public"."community_distance_meters"(
            "user_latitude",
            "user_longitude",
            "community_record"."latitude",
            "community_record"."longitude"
        ) > "community_record"."radius_meters"
    ) THEN
        RETURN 'out_of_range';
    END IF;

    UPDATE "public"."Communities"
    SET "members" = array_append(COALESCE("members", ARRAY[]::uuid[]), "active_user")
    WHERE "id" = "target_community";

    UPDATE "public"."profiles"
    SET "joined_communities" = array_append(
        COALESCE("joined_communities", ARRAY[]::uuid[]),
        "target_community"
    )
    WHERE "id" = "active_user";

    RETURN 'joined';
END;$$;

ALTER FUNCTION "public"."join_community"("target_community" "uuid", "user_latitude" double precision, "user_longitude" double precision) OWNER TO "postgres";

-- Notify the requester when a community owner approves or denies their join request.

CREATE OR REPLACE FUNCTION "public"."respond_to_community_join_request"("target_community" "uuid", "requester_id" "uuid", "approve_request" boolean) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  active_user uuid := auth.uid();
  request_exists boolean;
begin
  if active_user is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select requester_id = any(coalesce(community."reqUUID", '{}'::uuid[]))
    into request_exists
  from public."Communities" community
  where community.id = target_community
    and community.user_id = active_user
  for update;

  if not found then
    raise exception 'Community owner required'
      using errcode = '42501';
  end if;

  if not coalesce(request_exists, false) then
    return 'request_not_found';
  end if;

  update public."Communities"
  set
    "reqUUID" = array_remove(coalesce("reqUUID", '{}'::uuid[]), requester_id),
    members = case
      when approve_request
        and not (requester_id = any(coalesce(members, '{}'::uuid[])))
      then array_append(
        coalesce(members, '{}'::uuid[]),
        requester_id
      )
      else members
    end
  where id = target_community;

  if approve_request then
    update public.profiles
    set joined_communities = array_append(
      coalesce(joined_communities, '{}'::uuid[]),
      target_community
    )
    where id = requester_id
      and not (
        target_community = any(coalesce(joined_communities, '{}'::uuid[]))
      );

    insert into public."notifications" ("user_id", "actor_id", "type", "community_id")
    values (requester_id, active_user, 'join_approved', target_community);

    return 'approved';
  end if;

  insert into public."notifications" ("user_id", "actor_id", "type", "community_id")
  values (requester_id, active_user, 'join_denied', target_community);

  return 'denied';
end;
$$;

ALTER FUNCTION "public"."respond_to_community_join_request"("target_community" "uuid", "requester_id" "uuid", "approve_request" boolean) OWNER TO "postgres";
