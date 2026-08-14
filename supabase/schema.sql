


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."_get_my_profile_warning"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE v text;
BEGIN
  -- Avoid RLS on the lookup inside the function.
  PERFORM set_config('row_security', 'off', true);

  SELECT p.warning
  INTO v
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN v;
END;
$$;


ALTER FUNCTION "public"."_get_my_profile_warning"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_community_owner_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    NEW."members" := ARRAY[NEW."user_id"]::uuid[];
    UPDATE "public"."profiles"
    SET "joined_communities" = array_append(
        COALESCE("joined_communities", ARRAY[]::uuid[]),
        NEW."id"
    )
    WHERE "id" = NEW."user_id"
      AND NOT (NEW."id" = ANY(COALESCE("joined_communities", ARRAY[]::uuid[])));
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_community_owner_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."are_connect_users_linked"("first_user" "uuid", "second_user" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    auth.uid() is not null
    and auth.uid() in (first_user, second_user)
    and first_user <> second_user
    and not public.users_are_blocked(first_user, second_user)
    and exists (
      select 1
      from public.connect_encounters encounter
      where encounter.first_user_id = least(first_user, second_user)
        and encounter.second_user_id = greatest(first_user, second_user)
    );
$$;


ALTER FUNCTION "public"."are_connect_users_linked"("first_user" "uuid", "second_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_post_to_community"("target_community" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public."Communities" community
    where community.id = target_community
      and auth.uid() = any(coalesce(community.members, '{}'::uuid[]))
      and (not coalesce(community.global, false) or coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin')
      and (
        community.business is not true
        or (
          community.user_id = auth.uid()
          and exists (
            select 1 from public.profiles
            where id = auth.uid() and "isBusiness" is true and business_supporter is true
          )
        )
      )
  );
$$;


ALTER FUNCTION "public"."can_post_to_community"("target_community" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_post_to_subcommunity"("target_subcommunity" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.sub_communities subcommunity
    where subcommunity.id = target_subcommunity
      and auth.uid() = any(coalesce(subcommunity.members, '{}'::uuid[]))
  );
$$;


ALTER FUNCTION "public"."can_post_to_subcommunity"("target_subcommunity" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."community_distance_meters"("first_latitude" double precision, "first_longitude" double precision, "second_latitude" double precision, "second_longitude" double precision) RETURNS double precision
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
    SELECT 6371000 * 2 * asin(sqrt(
        power(sin(radians("second_latitude" - "first_latitude") / 2), 2)
        + cos(radians("first_latitude"))
        * cos(radians("second_latitude"))
        * power(sin(radians("second_longitude" - "first_longitude") / 2), 2)
    ));
$$;


ALTER FUNCTION "public"."community_distance_meters"("first_latitude" double precision, "first_longitude" double precision, "second_latitude" double precision, "second_longitude" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_oauth_profile"("requested_username" "text", "requested_birthday" "date") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_username text := nullif(trim(requested_username), '');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if v_username is null or char_length(v_username) < 3 or char_length(v_username) > 30
     or v_username !~ '^[A-Za-z0-9_]+$' then
    raise exception 'Invalid username';
  end if;

  if requested_birthday is null then
    raise exception 'Invalid birthday';
  end if;

  if not public.is_username_available(v_username) then
    raise exception 'Username already exists';
  end if;

  update public.profiles
  set username = v_username,
      display_name = v_username,
      birthday = requested_birthday
  where id = auth.uid()
    and username is null;

  if not found then
    raise exception 'Profile already set up';
  end if;
end;
$_$;


ALTER FUNCTION "public"."complete_oauth_profile"("requested_username" "text", "requested_birthday" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_patreon_oauth_state"("p_state_hash" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $_$
declare
  state_user_id uuid;
begin
  if p_state_hash !~ '^[a-f0-9]{64}$' then
    return null;
  end if;

  delete from public.patreon_oauth_states
    where state_hash = p_state_hash
      and expires_at > now()
    returning user_id into state_user_id;

  return state_user_id;
end;
$_$;


ALTER FUNCTION "public"."consume_patreon_oauth_state"("p_state_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_business_community"("community_name" "text", "community_description" "text", "location_name" "text", "community_latitude" double precision, "community_longitude" double precision, "community_radius_meters" integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  created_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.profiles
    where id = auth.uid()
      and "isBusiness" is true
      and business_supporter is true
  ) then
    raise exception 'Active Bloom Business Patreon membership required';
  end if;
  if char_length(trim(coalesce(community_name, ''))) not between 1 and 100
     or char_length(trim(coalesce(community_description, ''))) not between 1 and 1000
     or char_length(trim(coalesce(location_name, ''))) > 300
     or community_latitude not between -90 and 90
     or community_longitude not between -180 and 180
     or community_radius_meters not between 100 and 40000 then
    raise exception 'Invalid business community details';
  end if;

  insert into public."Communities" (
    name, description, user_id, members, global, business,
    location_label, latitude, longitude, radius_meters
  ) values (
    trim(community_name), trim(community_description), auth.uid(), array[auth.uid()], false, true,
    nullif(trim(location_name), ''), community_latitude, community_longitude, community_radius_meters
  ) returning id into created_id;

  update public.profiles
  set joined_communities = array_append(coalesce(joined_communities, '{}'::uuid[]), created_id)
  where id = auth.uid() and not (created_id = any(coalesce(joined_communities, '{}'::uuid[])));

  return created_id;
end;
$$;


ALTER FUNCTION "public"."create_business_community"("community_name" "text", "community_description" "text", "location_name" "text", "community_latitude" double precision, "community_longitude" double precision, "community_radius_meters" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_subcommunity"("parent_community" "uuid", "subcommunity_title" "text", "subcommunity_description" "text" DEFAULT ''::"text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  active_user uuid := auth.uid();
  created_id bigint;
  is_parent_owner boolean := false;
begin
  if active_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(subcommunity_title, ''))) not between 1 and 100
    or char_length(coalesce(subcommunity_description, '')) > 1000 then
    raise exception 'Invalid sub-community details' using errcode = '22023';
  end if;

  select community.user_id = active_user
  into is_parent_owner
  from public."Communities" community
  where community.id = parent_community
    and (
      community.user_id = active_user
      or active_user = any(coalesce(community.members, '{}'::uuid[]))
    );

  if not found then
    raise exception 'Parent community membership required' using errcode = '42501';
  end if;

  if not is_parent_owner then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(parent_community::text || active_user::text, 0)
    );

    if exists (
      select 1
      from public.sub_communities subcommunity
      where subcommunity.community_parent_uid = parent_community
        and subcommunity.owner_id = active_user
    ) then
      raise exception 'You can create only one sub-community in this community'
        using errcode = '23505';
    end if;
  end if;

  insert into public.sub_communities (
    title,
    description,
    community_parent_uid,
    owner_id,
    members
  )
  values (
    btrim(subcommunity_title),
    btrim(coalesce(subcommunity_description, '')),
    parent_community,
    active_user,
    array[active_user]
  )
  returning id into created_id;

  return created_id;
end;
$$;


ALTER FUNCTION "public"."create_subcommunity"("parent_community" "uuid", "subcommunity_title" "text", "subcommunity_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_owned_community"("target_community" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  active_user uuid := auth.uid();
  target_owner uuid;
  is_global boolean;
begin
  if active_user is null then
    raise exception 'Authentication required';
  end if;

  select user_id, global
    into target_owner, is_global
    from public."Communities"
    where id = target_community
    for update;

  if target_owner is null or target_owner <> active_user or is_global is true then
    raise exception 'Only the owner can delete a local community';
  end if;

  delete from public."Posts" where community = target_community;
  update public.profiles
    set joined_communities = array_remove(coalesce(joined_communities, array[]::uuid[]), target_community)
    where target_community = any(coalesce(joined_communities, array[]::uuid[]));
  delete from public."Communities" where id = target_community and user_id = active_user;

  return 'deleted';
end;
$$;


ALTER FUNCTION "public"."delete_owned_community"("target_community" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_subcommunity"("target_subcommunity" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_subcommunity_manager(target_subcommunity) then
    raise exception 'Sub-community owner access required' using errcode = '42501';
  end if;

  delete from public.sub_communities where id = target_subcommunity;
end;
$$;


ALTER FUNCTION "public"."delete_subcommunity"("target_subcommunity" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."event_trigger_fn"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Add logic here
END;
$$;


ALTER FUNCTION "public"."event_trigger_fn"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_connect_encounters"() RETURNS TABLE("user_id" "uuid", "username" "text", "display_name" "text", "avatar_url" "text", "supporter" boolean, "connected_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    other_profile.id,
    other_profile.username,
    other_profile.display_name,
    other_profile.avatar_url,
    coalesce(other_profile.supporter, false),
    encounter.notified_at
  from public.connect_encounters encounter
  join public.profiles other_profile on other_profile.id = case
    when encounter.first_user_id = auth.uid() then encounter.second_user_id
    else encounter.first_user_id
  end
  where auth.uid() is not null
    and auth.uid() in (encounter.first_user_id, encounter.second_user_id)
    and not public.users_are_blocked(
      encounter.first_user_id,
      encounter.second_user_id
    )
  order by encounter.notified_at desc;
$$;


ALTER FUNCTION "public"."get_connect_encounters"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"(),
    "community" "uuid" DEFAULT "gen_random_uuid"(),
    "title" "text",
    "body" "text",
    "communityName" "text",
    "post_type" "text",
    "img_link" "text",
    "location" "text",
    "img_links" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "date" "date",
    "subcommunity" bigint
);


ALTER TABLE "public"."Posts" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_home_feed"("user_latitude" double precision DEFAULT NULL::double precision, "user_longitude" double precision DEFAULT NULL::double precision, "feed_limit" integer DEFAULT 100) RETURNS SETOF "public"."Posts"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  with viewer as (
    select coalesce(joined_communities, '{}'::uuid[]) as joined
    from public.profiles
    where id = auth.uid()
  )
  select post.*
  from public."Posts" post
  join public."Communities" community on community.id = post.community
  cross join viewer
  where (
    post.community = any(viewer.joined)
    or community.user_id = auth.uid()
    or (
      coalesce(community.private, false) is false
      and community.business is true
      and exists (
        select 1
        from public.profiles owner_profile
        where owner_profile.id = community.user_id
          and owner_profile.business_supporter is true
      )
      and not (post.community = any(viewer.joined))
      and user_latitude is not null
      and user_longitude is not null
      and post.created_at >= now() - interval '30 days'
      and public.community_distance_meters(
        user_latitude,
        user_longitude,
        community.latitude,
        community.longitude
      ) <= community.radius_meters
      and mod(abs(hashtext(post.id::text || auth.uid()::text)::bigint), 4) = 0
    )
  )
  and (
    coalesce(community.private, false) is false
    or community.user_id = auth.uid()
    or post.community = any(viewer.joined)
  )
  order by post.created_at desc
  limit least(greatest(feed_limit, 1), 200);
$$;


ALTER FUNCTION "public"."get_home_feed"("user_latitude" double precision, "user_longitude" double precision, "feed_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_owned_community_request_uuids"("target_community" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  active_user uuid := auth.uid();
  request_uuids jsonb;
begin
  if active_user is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select to_jsonb(community."reqUUID")
    into request_uuids
  from public."Communities" community
  where community.id = target_community
    and community.user_id = active_user;

  if not found then
    raise exception 'Community owner required'
      using errcode = '42501';
  end if;

  return coalesce(request_uuids, '[]'::jsonb);
end;
$$;


ALTER FUNCTION "public"."get_owned_community_request_uuids"("target_community" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_profile"("target_user" "uuid") RETURNS TABLE("id" "uuid", "username" "text", "display_name" "text", "bio" "text", "avatar_url" "text", "supporter" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    profile.id,
    profile.username,
    profile.display_name,
    profile.bio,
    profile.avatar_url,
    profile.supporter
  from public.profiles as profile
  where profile.id = target_user;
$$;


ALTER FUNCTION "public"."get_public_profile"("target_user" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_public_profile"("target_user" "uuid") IS 'Returns display-safe profile fields and the server-controlled Supporter rank.';



CREATE OR REPLACE FUNCTION "public"."handle_auth_user_ban_or_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  -- If the user is being marked as deleted, clean up their profile.
  if new.deleted_at is not null and (old.deleted_at is distinct from new.deleted_at) then
    delete from public.profiles where id = new.id;
    return new;
  end if;

  -- If the user becomes banned/suspended, clean up their profile.
  if old.banned_until is null and new.banned_until is not null then
    delete from public.profiles where id = new.id;
    return new;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_auth_user_ban_or_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_auth_user_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := new.id;
begin
  -- 1) Remove from community members arrays
  update public."Communities"
  set members = array_remove(members, v_uid)
  where members is not null
    and members @> array[v_uid];

  -- 2) Delete posts authored by the user
  delete from public."Posts"
  where user_id = v_uid;

  -- 3) Delete communities owned by the user
  delete from public."Communities"
  where user_id = v_uid;

  -- 4) Delete profile row (FK cascade handles deletes too, but keep it consistent)
  delete from public.profiles where id = v_uid;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_auth_user_cleanup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, username, display_name, birthday, "isBusiness")
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'username', '')::text,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', '')::text,
      nullif(new.raw_user_meta_data->>'username', '')::text
    ),
    case
      when nullif(new.raw_user_meta_data->>'birthday', '') is null then null
      else (new.raw_user_meta_data->>'birthday')::date
    end,
    coalesce(new.raw_user_meta_data->>'account_type', '') = 'business'
  )
  on conflict (id) do update set
    username = excluded.username,
    display_name = excluded.display_name,
    birthday = excluded.birthday,
    "isBusiness" = excluded."isBusiness";

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_fn"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_username text;
begin
  v_username := nullif(new.raw_user_meta_data->>'username', '')::text;

  insert into public.profiles (id, username, display_name, birthday, "isBusiness")
  values (
    new.id,
    v_username,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', '')::text, v_username),
    case
      when nullif(new.raw_user_meta_data->>'birthday', '') is null then null
      else (new.raw_user_meta_data->>'birthday')::date
    end,
    coalesce(new.raw_user_meta_data->>'account_type', '') = 'business'
  )
  on conflict (id) do update set
    username = excluded.username,
    display_name = excluded.display_name,
    birthday = excluded.birthday,
    "isBusiness" = excluded."isBusiness";

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user_fn"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_subcommunity_manager"("target_subcommunity" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.sub_communities subcommunity
    join public."Communities" parent
      on parent.id = subcommunity.community_parent_uid
    where subcommunity.id = target_subcommunity
      and (
        subcommunity.owner_id = auth.uid()
        or parent.user_id = auth.uid()
      )
  );
$$;


ALTER FUNCTION "public"."is_subcommunity_manager"("target_subcommunity" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_username_available"("requested_username" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    SELECT NOT EXISTS (
        SELECT 1
        FROM "public"."profiles"
        WHERE lower("username") = lower(trim("requested_username"))
    );
$$;


ALTER FUNCTION "public"."is_username_available"("requested_username" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."leave_community"("target_community" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  active_user uuid := auth.uid();
  community_owner uuid;
  is_member boolean;
begin
  if active_user is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select
    community.user_id,
    active_user = any(coalesce(community.members, '{}'::uuid[]))
  into community_owner, is_member
  from public."Communities" community
  where community.id = target_community
  for update;

  if not found then
    return 'community_not_found';
  end if;

  if community_owner = active_user then
    return 'owner_cannot_leave';
  end if;

  if not coalesce(is_member, false) then
    return 'not_joined';
  end if;

  update public."Communities"
  set members = array_remove(coalesce(members, '{}'::uuid[]), active_user)
  where id = target_community;

  update public.profiles
  set joined_communities = array_remove(
    coalesce(joined_communities, '{}'::uuid[]),
    target_community
  )
  where id = active_user;

  return 'left';
end;
$$;


ALTER FUNCTION "public"."leave_community"("target_community" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_supporter_entitlements"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $_$
begin
  if new.supporter is not true then
    new.bio := left(coalesce(new.bio, ''), 500);
    if new."Theme" not in ('light', 'dark') then
      new."Theme" := 'light';
    end if;
    if new.avatar_url ~* '\.gif(\?|$)' then
      new.avatar_url := null;
    end if;
  end if;
  return new;
end;
$_$;


ALTER FUNCTION "public"."normalize_supporter_entitlements"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."process_patreon_webhook"("p_event_hash" "text", "p_event_type" "text", "p_patreon_user_id" "text", "p_membership_status" "text", "p_supporter" boolean) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $_$
declare
  inserted_hash text;
begin
  if p_event_hash !~ '^[a-f0-9]{64}$'
    or p_event_type not in (
      'members:create',
      'members:update',
      'members:delete',
      'members:pledge:create',
      'members:pledge:update',
      'members:pledge:delete'
    )
    or nullif(p_patreon_user_id, '') is null
    or char_length(coalesce(p_membership_status, '')) > 100 then
    raise exception 'Invalid Patreon webhook event';
  end if;

  insert into public.patreon_webhook_events (event_hash, event_type, patreon_user_id)
  values (p_event_hash, p_event_type, p_patreon_user_id)
  on conflict (event_hash) do nothing
  returning event_hash into inserted_hash;

  if inserted_hash is null then
    return 'duplicate';
  end if;

  update public.profiles
  set supporter = coalesce(p_supporter, false),
      patreon_membership_status = coalesce(p_membership_status, 'none'),
      supporter_verified_at = now()
  where patreon_user_id = p_patreon_user_id;

  delete from public.patreon_webhook_events
  where received_at < now() - interval '180 days';

  return 'processed';
end;
$_$;


ALTER FUNCTION "public"."process_patreon_webhook"("p_event_hash" "text", "p_event_type" "text", "p_patreon_user_id" "text", "p_membership_status" "text", "p_supporter" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_patreon_webhook"("p_event_hash" "text", "p_event_type" "text", "p_patreon_user_id" "text", "p_membership_status" "text", "p_supporter" boolean, "p_business_supporter" boolean) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $_$
declare inserted_hash text;
begin
  if p_event_hash !~ '^[a-f0-9]{64}$'
    or p_event_type not in ('members:create','members:update','members:delete','members:pledge:create','members:pledge:update','members:pledge:delete')
    or nullif(p_patreon_user_id, '') is null
    or char_length(coalesce(p_membership_status, '')) > 100 then
    raise exception 'Invalid Patreon webhook event';
  end if;
  insert into public.patreon_webhook_events (event_hash, event_type, patreon_user_id)
  values (p_event_hash, p_event_type, p_patreon_user_id)
  on conflict (event_hash) do nothing returning event_hash into inserted_hash;
  if inserted_hash is null then return 'duplicate'; end if;

  update public.profiles
  set supporter = coalesce(p_supporter, false),
      business_supporter = coalesce(p_business_supporter, false) and "isBusiness" is true,
      patreon_membership_status = coalesce(p_membership_status, 'none'),
      supporter_verified_at = now(),
      business_supporter_verified_at = now()
  where patreon_user_id = p_patreon_user_id;
  delete from public.patreon_webhook_events where received_at < now() - interval '180 days';
  return 'processed';
end;
$_$;


ALTER FUNCTION "public"."process_patreon_webhook"("p_event_hash" "text", "p_event_type" "text", "p_patreon_user_id" "text", "p_membership_status" "text", "p_supporter" boolean, "p_business_supporter" boolean) OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."search_bloom"("search_term" "text", "user_latitude" double precision DEFAULT NULL::double precision, "user_longitude" double precision DEFAULT NULL::double precision, "result_limit" integer DEFAULT 6) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    active_user uuid := auth.uid();
    normalized_term text := lower(trim(coalesce(search_term, '')));
    capped_limit integer := greatest(1, least(coalesce(result_limit, 6), 10));
    has_location boolean := user_latitude BETWEEN -90 AND 90
        AND user_longitude BETWEEN -180 AND 180;
    user_results jsonb;
    community_results jsonb;
    post_results jsonb;
BEGIN
    IF active_user IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    IF char_length(normalized_term) < 2 OR char_length(normalized_term) > 100 THEN
        RETURN jsonb_build_object('users', '[]'::jsonb, 'communities', '[]'::jsonb, 'posts', '[]'::jsonb);
    END IF;

    SELECT coalesce(jsonb_agg(to_jsonb(result_row)), '[]'::jsonb)
    INTO user_results
    FROM (
        SELECT
            profile.id,
            profile.username,
            profile.display_name,
            profile.avatar_url
        FROM public.profiles AS profile
        WHERE EXISTS (
            SELECT 1
            FROM public."Communities" AS shared_community
            WHERE active_user = ANY(coalesce(shared_community.members, ARRAY[]::uuid[]))
              AND profile.id = ANY(coalesce(shared_community.members, ARRAY[]::uuid[]))
        )
          AND (
              position(normalized_term IN lower(coalesce(profile.display_name, ''))) > 0
              OR position(normalized_term IN lower(coalesce(profile.username, ''))) > 0
          )
        ORDER BY
            (lower(profile.username) = normalized_term) DESC,
            lower(profile.display_name),
            lower(profile.username)
        LIMIT capped_limit
    ) AS result_row;

    SELECT coalesce(jsonb_agg(to_jsonb(result_row)), '[]'::jsonb)
    INTO community_results
    FROM (
        SELECT
            community.id,
            community.name,
            left(coalesce(community.description, ''), 180) AS description,
            CASE
                WHEN active_user = ANY(coalesce(community.members, ARRAY[]::uuid[])) THEN 'joined'
                WHEN coalesce(community.global, false) THEN 'global'
                ELSE 'nearby'
            END AS scope
        FROM public."Communities" AS community
        WHERE (
            active_user = ANY(coalesce(community.members, ARRAY[]::uuid[]))
            OR coalesce(community.global, false)
            OR (
                has_location
                AND community.latitude IS NOT NULL
                AND community.longitude IS NOT NULL
                AND community.radius_meters IS NOT NULL
                AND public.community_distance_meters(
                    user_latitude,
                    user_longitude,
                    community.latitude,
                    community.longitude
                ) <= community.radius_meters
            )
        )
          AND (
              position(normalized_term IN lower(coalesce(community.name, ''))) > 0
              OR position(normalized_term IN lower(coalesce(community.description, ''))) > 0
          )
        ORDER BY
            (active_user = ANY(coalesce(community.members, ARRAY[]::uuid[]))) DESC,
            coalesce(community.global, false) DESC,
            lower(community.name)
        LIMIT capped_limit
    ) AS result_row;

    SELECT coalesce(jsonb_agg(to_jsonb(result_row)), '[]'::jsonb)
    INTO post_results
    FROM (
        SELECT
            post.id,
            post.title,
            left(coalesce(post.body, ''), 180) AS body,
            post.post_type,
            community.name AS community_name
        FROM public."Posts" AS post
        JOIN public."Communities" AS community ON community.id = post.community
        WHERE active_user = ANY(coalesce(community.members, ARRAY[]::uuid[]))
          AND (
              position(normalized_term IN lower(coalesce(post.title, ''))) > 0
              OR position(normalized_term IN lower(coalesce(post.body, ''))) > 0
          )
        ORDER BY post.created_at DESC
        LIMIT capped_limit
    ) AS result_row;

    RETURN jsonb_build_object(
        'users', user_results,
        'communities', community_results,
        'posts', post_results
    );
END;
$$;


ALTER FUNCTION "public"."search_bloom"("search_term" "text", "user_latitude" double precision, "user_longitude" double precision, "result_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_community_picture"("target_community" "uuid", "new_picture_url" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if new_picture_url is not null
     and new_picture_url not like 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Community%20Images/' || auth.uid()::text || '/%'
     and new_picture_url not like 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Community Images/' || auth.uid()::text || '/%' then
    raise exception 'Invalid community image URL';
  end if;
  update public."Communities"
  set picture_url = new_picture_url
  where id = target_community and user_id = auth.uid();
  if not found then raise exception 'Community owner required'; end if;
end;
$$;


ALTER FUNCTION "public"."set_community_picture"("target_community" "uuid", "new_picture_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_community_privacy"("target_community" "uuid", "make_private" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  active_user uuid := auth.uid();
begin
  if active_user is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  update public."Communities"
  set
    private = coalesce(make_private, false),
    "reqUUID" = case
      when coalesce(make_private, false) then coalesce("reqUUID", '{}'::uuid[])
      else '{}'::uuid[]
    end
  where id = target_community
    and user_id = active_user;

  if not found then
    raise exception 'Community owner required'
      using errcode = '42501';
  end if;

  return coalesce(make_private, false);
end;
$$;


ALTER FUNCTION "public"."set_community_privacy"("target_community" "uuid", "make_private" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_connect_enabled"("enabled" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  active_user uuid := auth.uid();
  requested_state boolean := coalesce(enabled, false);
begin
  if active_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  update public.profiles
  set connect_enabled = requested_state
  where id = active_user;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if not requested_state then
    delete from public.connect_locations where user_id = active_user;
  end if;

  return requested_state;
end;
$$;


ALTER FUNCTION "public"."set_connect_enabled"("enabled" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_business_profile"("business_name" "text", "description" "text" DEFAULT NULL::"text", "location_text" "text" DEFAULT NULL::"text", "latitude" double precision DEFAULT NULL::double precision, "longitude" double precision DEFAULT NULL::double precision, "contact_email" "text" DEFAULT NULL::"text", "contact_phone" "text" DEFAULT NULL::"text", "website" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if char_length(trim(coalesce(business_name, ''))) not between 1 and 50 then
    raise exception 'Business name must contain 1 to 50 characters';
  end if;
  if contact_email is not null and trim(contact_email) <> '' and trim(contact_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid contact email';
  end if;
  if website is not null and trim(website) <> '' and trim(website) !~* '^https://[^[:space:]]+$' then
    raise exception 'Website must use HTTPS';
  end if;

  update public.profiles
  set display_name = nullif(trim(business_name), ''),
      business_description = nullif(trim(description), ''),
      business_location = nullif(trim(location_text), ''),
      business_latitude = latitude,
      business_longitude = longitude,
      business_contact_email = nullif(trim(contact_email), ''),
      business_contact_phone = nullif(trim(contact_phone), ''),
      business_website = nullif(trim(website), '')
  where id = auth.uid() and "isBusiness" is true;

  if not found then
    raise exception 'Business account required';
  end if;
end;
$_$;


ALTER FUNCTION "public"."update_business_profile"("business_name" "text", "description" "text", "location_text" "text", "latitude" double precision, "longitude" double precision, "contact_email" "text", "contact_phone" "text", "website" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_connect_location"("user_latitude" double precision, "user_longitude" double precision, "user_accuracy_meters" double precision DEFAULT NULL::double precision) RETURNS TABLE("encountered" boolean, "encounter_key" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  active_user uuid := auth.uid();
  nearby_user uuid;
  pair_first uuid;
  pair_second uuid;
begin
  if active_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if user_latitude is null
     or user_longitude is null
     or user_latitude::text in ('NaN', 'Infinity', '-Infinity')
     or user_longitude::text in ('NaN', 'Infinity', '-Infinity')
     or user_latitude not between -90 and 90
     or user_longitude not between -180 and 180
     or (
       user_accuracy_meters is not null
       and (
         user_accuracy_meters::text in ('NaN', 'Infinity', '-Infinity')
         or user_accuracy_meters not between 0 and 10000
       )
     ) then
    raise exception 'Invalid location' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = active_user and connect_enabled is true
  ) then
    delete from public.connect_locations where user_id = active_user;
    return query select false, null::text;
    return;
  end if;

  delete from public.connect_locations
  where updated_at < now() - interval '15 minutes';

  insert into public.connect_locations (
    user_id,
    latitude,
    longitude,
    accuracy_meters,
    updated_at
  )
  values (
    active_user,
    user_latitude,
    user_longitude,
    user_accuracy_meters,
    now()
  )
  on conflict (user_id) do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_meters = excluded.accuracy_meters,
    updated_at = excluded.updated_at;

  select candidate.user_id
  into nearby_user
  from public.connect_locations candidate
  join public.profiles candidate_profile
    on candidate_profile.id = candidate.user_id
  join public.profiles active_profile
    on active_profile.id = active_user
  where candidate.user_id <> active_user
    and candidate_profile.connect_enabled is true
    and candidate.updated_at > now() - interval '5 minutes'
    and coalesce(candidate.accuracy_meters, 50) <= 250
    and coalesce(user_accuracy_meters, 50) <= 250
    and coalesce(candidate_profile.joined_communities, '{}'::uuid[])
        && coalesce(active_profile.joined_communities, '{}'::uuid[])
    and public.community_distance_meters(
      user_latitude,
      user_longitude,
      candidate.latitude,
      candidate.longitude
    ) <= greatest(
      35.0,
      least(
        100.0,
        coalesce(user_accuracy_meters, 50.0)
          + coalesce(candidate.accuracy_meters, 50.0)
      )
    )
  order by public.community_distance_meters(
    user_latitude,
    user_longitude,
    candidate.latitude,
    candidate.longitude
  )
  limit 1;

  if nearby_user is null then
    return query select false, null::text;
    return;
  end if;

  pair_first := least(active_user, nearby_user);
  pair_second := greatest(active_user, nearby_user);

  insert into public.connect_encounters (
    first_user_id,
    second_user_id,
    notified_at
  )
  values (pair_first, pair_second, now())
  on conflict (first_user_id, second_user_id) do update
    set notified_at = excluded.notified_at
    where public.connect_encounters.notified_at < now() - interval '6 hours';

  if not found then
    return query select false, null::text;
    return;
  end if;

  return query
  select true, encode(
    extensions.digest(pair_first::text || pair_second::text, 'sha256'),
    'hex'
  );
end;
$$;


ALTER FUNCTION "public"."update_connect_location"("user_latitude" double precision, "user_longitude" double precision, "user_accuracy_meters" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subcommunity"("target_subcommunity" bigint, "subcommunity_title" "text", "subcommunity_description" "text" DEFAULT ''::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_subcommunity_manager(target_subcommunity) then
    raise exception 'Sub-community owner access required' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(subcommunity_title, ''))) not between 1 and 100
    or char_length(coalesce(subcommunity_description, '')) > 1000 then
    raise exception 'Invalid sub-community details' using errcode = '22023';
  end if;

  update public.sub_communities
  set
    title = btrim(subcommunity_title),
    description = btrim(coalesce(subcommunity_description, ''))
  where id = target_subcommunity;
end;
$$;


ALTER FUNCTION "public"."update_subcommunity"("target_subcommunity" bigint, "subcommunity_title" "text", "subcommunity_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."users_are_blocked"("first_user" "uuid", "second_user" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    first_user is not null
    and second_user is not null
    and exists (
      select 1
      from public.user_blocks block
      where (
        block.blocker_id = first_user
        and block.blocked_id = second_user
      ) or (
        block.blocker_id = second_user
        and block.blocked_id = first_user
      )
    );
$$;


ALTER FUNCTION "public"."users_are_blocked"("first_user" "uuid", "second_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_post_image_entitlements"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  author_is_supporter boolean := false;
  image_url text;
  image_limit integer;
begin
  select coalesce(profile.supporter, false)
    into author_is_supporter
    from public.profiles as profile
    where profile.id = new.user_id;

  image_limit := case when author_is_supporter then 5 else 1 end;
  if cardinality(new.img_links) > image_limit then
    raise exception 'Post image limit exceeded';
  end if;

  foreach image_url in array new.img_links loop
    if image_url not like 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Post%20Images/%'
      and image_url not like 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Post Images/%' then
      raise exception 'Invalid post image URL';
    end if;
  end loop;

  new.img_link := new.img_links[1];
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_post_image_entitlements"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Communities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "description" "text",
    "user_id" "uuid" DEFAULT "gen_random_uuid"(),
    "banner_url" "text",
    "members" "uuid"[],
    "global" boolean DEFAULT false,
    "latitude" double precision,
    "longitude" double precision,
    "radius_meters" integer,
    "location_label" "text",
    "business" boolean DEFAULT false NOT NULL,
    "picture_url" "text",
    "private" boolean DEFAULT false,
    "reqUUID" "uuid"[],
    CONSTRAINT "Communities_banner_origin_check" CHECK ((("banner_url" IS NULL) OR ("banner_url" = ''::"text") OR ("banner_url" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Community%20Banners/%'::"text") OR ("banner_url" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Community Banners/%'::"text"))),
    CONSTRAINT "Communities_location_label_check" CHECK (("char_length"(COALESCE("location_label", ''::"text")) <= 300)),
    CONSTRAINT "Communities_picture_origin_check" CHECK ((("picture_url" IS NULL) OR ("picture_url" = ''::"text") OR ("picture_url" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Community%20Images/%'::"text") OR ("picture_url" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Community Images/%'::"text")))
);


ALTER TABLE "public"."Communities" OWNER TO "postgres";


COMMENT ON COLUMN "public"."Communities"."latitude" IS '[SENSITIVE]';



COMMENT ON COLUMN "public"."Communities"."longitude" IS '[SENSITIVE]';



CREATE TABLE IF NOT EXISTS "public"."PostReports" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL
);


ALTER TABLE "public"."PostReports" OWNER TO "postgres";


ALTER TABLE "public"."PostReports" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."PostReports_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."connect_encounters" (
    "first_user_id" "uuid" NOT NULL,
    "second_user_id" "uuid" NOT NULL,
    "notified_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "connect_encounters_check" CHECK (("first_user_id" < "second_user_id"))
);


ALTER TABLE "public"."connect_encounters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."connect_locations" (
    "user_id" "uuid" NOT NULL,
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "accuracy_meters" double precision,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "connect_locations_accuracy_meters_check" CHECK ((("accuracy_meters" IS NULL) OR (("accuracy_meters" >= (0)::double precision) AND ("accuracy_meters" <= (10000)::double precision)))),
    CONSTRAINT "connect_locations_latitude_check" CHECK ((("latitude" >= ('-90'::integer)::double precision) AND ("latitude" <= (90)::double precision))),
    CONSTRAINT "connect_locations_longitude_check" CHECK ((("longitude" >= ('-180'::integer)::double precision) AND ("longitude" <= (180)::double precision)))
);


ALTER TABLE "public"."connect_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."direct_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "ciphertext" "text" NOT NULL,
    "message_iv" "text" NOT NULL,
    "sender_public_jwk" "jsonb" NOT NULL,
    "recipient_public_jwk" "jsonb" NOT NULL,
    "image_path" "text",
    "image_iv" "text",
    "image_mime" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "direct_messages_ciphertext_size" CHECK ((("length"("ciphertext") >= 1) AND ("length"("ciphertext") <= 100000))),
    CONSTRAINT "direct_messages_different_users" CHECK (("sender_id" <> "recipient_id")),
    CONSTRAINT "direct_messages_image_fields" CHECK (((("image_path" IS NULL) AND ("image_iv" IS NULL) AND ("image_mime" IS NULL)) OR (("image_path" IS NOT NULL) AND ("image_iv" IS NOT NULL) AND ("image_mime" IS NOT NULL)))),
    CONSTRAINT "direct_messages_image_path_check" CHECK ((("image_path" IS NULL) OR ("image_path" = (((("sender_id")::"text" || '/'::"text") || ("id")::"text") || '.bin'::"text")))),
    CONSTRAINT "direct_messages_iv_size" CHECK ((("length"("message_iv") >= 12) AND ("length"("message_iv") <= 32)))
);


ALTER TABLE "public"."direct_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_public_keys" (
    "user_id" "uuid" NOT NULL,
    "public_jwk" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "message_public_keys_jwk_check" CHECK (((("public_jwk" ->> 'kty'::"text") = 'EC'::"text") AND (("public_jwk" ->> 'crv'::"text") = 'P-256'::"text") AND (("length"(COALESCE(("public_jwk" ->> 'x'::"text"), ''::"text")) >= 40) AND ("length"(COALESCE(("public_jwk" ->> 'x'::"text"), ''::"text")) <= 50)) AND (("length"(COALESCE(("public_jwk" ->> 'y'::"text"), ''::"text")) >= 40) AND ("length"(COALESCE(("public_jwk" ->> 'y'::"text"), ''::"text")) <= 50))))
);


ALTER TABLE "public"."message_public_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "type" "text" NOT NULL,
    "post_id" "uuid",
    "community_id" "uuid",
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['post_reply'::"text", 'post_like'::"text", 'join_request'::"text", 'join_approved'::"text", 'join_denied'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patreon_oauth_states" (
    "state_hash" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "patreon_oauth_states_state_hash_check" CHECK (("state_hash" ~ '^[a-f0-9]{64}$'::"text"))
);


ALTER TABLE "public"."patreon_oauth_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patreon_webhook_events" (
    "event_hash" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "patreon_user_id" "text" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "patreon_webhook_events_event_hash_check" CHECK (("event_hash" ~ '^[a-f0-9]{64}$'::"text"))
);


ALTER TABLE "public"."patreon_webhook_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_likes" (
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."post_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "post_replies_body_check" CHECK ((("char_length"(TRIM(BOTH FROM "body")) >= 1) AND ("char_length"(TRIM(BOTH FROM "body")) <= 2000)))
);


ALTER TABLE "public"."post_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "display_name" "text",
    "bio" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "joined_communities" "uuid"[],
    "FirstTimeOpen" boolean DEFAULT true,
    "Language" "text" DEFAULT 'en'::"text",
    "birthday" "date",
    "requestedDelete" boolean DEFAULT false NOT NULL,
    "paddle_customer_id" "text",
    "supporter" boolean,
    "patreon_user_id" "text",
    "patreon_membership_status" "text",
    "supporter_verified_at" timestamp with time zone,
    "Theme" "text" DEFAULT 'light'::"text" NOT NULL,
    "isBusiness" boolean DEFAULT false,
    "business_description" "text",
    "business_location" "text",
    "business_latitude" double precision,
    "business_longitude" double precision,
    "business_contact_email" "text",
    "business_contact_phone" "text",
    "business_website" "text",
    "business_supporter" boolean DEFAULT false,
    "business_supporter_verified_at" timestamp with time zone,
    "connect_enabled" boolean DEFAULT false NOT NULL,
    "blocked_uuids" "uuid"[],
    "warning" "text",
    CONSTRAINT "profiles_bio_length_check" CHECK (("char_length"(COALESCE("bio", ''::"text")) <=
CASE
    WHEN "supporter" THEN 1500
    ELSE 500
END)),
    CONSTRAINT "profiles_business_details_check" CHECK ((("char_length"(COALESCE("business_description", ''::"text")) <= 1500) AND ("char_length"(COALESCE("business_location", ''::"text")) <= 300) AND ("char_length"(COALESCE("business_contact_email", ''::"text")) <= 254) AND ("char_length"(COALESCE("business_contact_phone", ''::"text")) <= 40) AND ("char_length"(COALESCE("business_website", ''::"text")) <= 2048) AND (("business_latitude" IS NULL) OR (("business_latitude" >= ('-90'::integer)::double precision) AND ("business_latitude" <= (90)::double precision))) AND (("business_longitude" IS NULL) OR (("business_longitude" >= ('-180'::integer)::double precision) AND ("business_longitude" <= (180)::double precision))) AND (("business_latitude" IS NULL) = ("business_longitude" IS NULL)))),
    CONSTRAINT "profiles_gif_avatar_supporter_check" CHECK (("supporter" OR ("avatar_url" IS NULL) OR ("avatar_url" !~* '\.gif(\?|$)'::"text"))),
    CONSTRAINT "profiles_theme_check" CHECK ((("Theme" = ANY (ARRAY['light'::"text", 'dark'::"text"])) OR (("supporter" IS TRUE) AND ("Theme" = ANY (ARRAY['forest'::"text", 'midnight'::"text", 'sunset'::"text", 'frutiger-aero'::"text"])))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."patreon_user_id" IS 'Patreon identity linked through the server-side OAuth callback. Unique to one Bloom account.';



CREATE TABLE IF NOT EXISTS "public"."sub_communities" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text",
    "description" "text",
    "community_parent_uid" "uuid",
    "members" "uuid"[],
    "owner_id" "uuid"
);


ALTER TABLE "public"."sub_communities" OWNER TO "postgres";


ALTER TABLE "public"."sub_communities" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sub_communities_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_blocks_different_users" CHECK (("blocker_id" <> "blocked_id"))
);


ALTER TABLE "public"."user_blocks" OWNER TO "postgres";


ALTER TABLE ONLY "public"."Communities"
    ADD CONSTRAINT "Communities_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."Communities"
    ADD CONSTRAINT "Communities_valid_details_check" CHECK (((("char_length"(COALESCE("name", ''::"text")) >= 1) AND ("char_length"(COALESCE("name", ''::"text")) <= 100)) AND (("char_length"(COALESCE("description", ''::"text")) >= 1) AND ("char_length"(COALESCE("description", ''::"text")) <= 1000)) AND (("global" IS TRUE) OR ((("latitude" >= ('-90'::integer)::double precision) AND ("latitude" <= (90)::double precision)) AND (("longitude" >= ('-180'::integer)::double precision) AND ("longitude" <= (180)::double precision)) AND (("radius_meters" >= 100) AND ("radius_meters" <= 40000)))))) NOT VALID;



ALTER TABLE ONLY "public"."PostReports"
    ADD CONSTRAINT "PostReports_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."Posts"
    ADD CONSTRAINT "Posts_content_length_check" CHECK (((("char_length"(COALESCE("title", ''::"text")) >= 1) AND ("char_length"(COALESCE("title", ''::"text")) <= 200)) AND (("char_length"(COALESCE("body", ''::"text")) >= 1) AND ("char_length"(COALESCE("body", ''::"text")) <= 10000)))) NOT VALID;



ALTER TABLE "public"."Posts"
    ADD CONSTRAINT "Posts_image_origin_check" CHECK ((("img_link" IS NULL) OR ("img_link" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Post%20Images/%'::"text") OR ("img_link" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Post Images/%'::"text"))) NOT VALID;



ALTER TABLE ONLY "public"."Posts"
    ADD CONSTRAINT "Posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."connect_encounters"
    ADD CONSTRAINT "connect_encounters_pkey" PRIMARY KEY ("first_user_id", "second_user_id");



ALTER TABLE ONLY "public"."connect_locations"
    ADD CONSTRAINT "connect_locations_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_public_keys"
    ADD CONSTRAINT "message_public_keys_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patreon_oauth_states"
    ADD CONSTRAINT "patreon_oauth_states_pkey" PRIMARY KEY ("state_hash");



ALTER TABLE ONLY "public"."patreon_webhook_events"
    ADD CONSTRAINT "patreon_webhook_events_pkey" PRIMARY KEY ("event_hash");



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_pkey" PRIMARY KEY ("post_id", "user_id");



ALTER TABLE ONLY "public"."post_replies"
    ADD CONSTRAINT "post_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."profiles"
    ADD CONSTRAINT "profiles_avatar_origin_check" CHECK ((("avatar_url" IS NULL) OR ("avatar_url" = ''::"text") OR ("avatar_url" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Profile%20Pictures/%'::"text") OR ("avatar_url" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Profile Pictures/%'::"text"))) NOT VALID;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE "public"."sub_communities"
    ADD CONSTRAINT "sub_communities_content_check" CHECK (((("char_length"("btrim"(COALESCE("title", ''::"text"))) >= 1) AND ("char_length"("btrim"(COALESCE("title", ''::"text"))) <= 100)) AND ("char_length"(COALESCE("description", ''::"text")) <= 1000))) NOT VALID;



ALTER TABLE ONLY "public"."sub_communities"
    ADD CONSTRAINT "sub_communities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("blocker_id", "blocked_id");



CREATE INDEX "Communities_members_search_idx" ON "public"."Communities" USING "gin" ("members");



CREATE UNIQUE INDEX "PostReports_post_reporter_key" ON "public"."PostReports" USING "btree" ("post_id", "reporter_id");



CREATE INDEX "connect_encounters_notified_at_idx" ON "public"."connect_encounters" USING "btree" ("notified_at" DESC);



CREATE INDEX "connect_locations_updated_at_idx" ON "public"."connect_locations" USING "btree" ("updated_at");



CREATE INDEX "direct_messages_participants_created_idx" ON "public"."direct_messages" USING "btree" ("sender_id", "recipient_id", "created_at" DESC);



CREATE INDEX "notifications_user_id_created_at_idx" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "notifications_user_id_read_idx" ON "public"."notifications" USING "btree" ("user_id", "read");



CREATE INDEX "patreon_oauth_states_expires_at_idx" ON "public"."patreon_oauth_states" USING "btree" ("expires_at");



CREATE INDEX "patreon_webhook_events_received_at_idx" ON "public"."patreon_webhook_events" USING "btree" ("received_at");



CREATE INDEX "post_likes_post_created_idx" ON "public"."post_likes" USING "btree" ("post_id", "created_at" DESC);



CREATE INDEX "post_replies_post_created_idx" ON "public"."post_replies" USING "btree" ("post_id", "created_at");



CREATE INDEX "posts_subcommunity_created_idx" ON "public"."Posts" USING "btree" ("subcommunity", "created_at" DESC) WHERE ("subcommunity" IS NOT NULL);



CREATE UNIQUE INDEX "profiles_patreon_user_id_key" ON "public"."profiles" USING "btree" ("patreon_user_id") WHERE ("patreon_user_id" IS NOT NULL);



CREATE INDEX "user_blocks_blocked_id_idx" ON "public"."user_blocks" USING "btree" ("blocked_id", "blocker_id");



CREATE OR REPLACE TRIGGER "add_community_owner_membership_trigger" BEFORE INSERT ON "public"."Communities" FOR EACH ROW EXECUTE FUNCTION "public"."add_community_owner_membership"();



CREATE OR REPLACE TRIGGER "normalize_supporter_entitlements_trigger" BEFORE INSERT OR UPDATE OF "supporter", "bio", "avatar_url", "Theme" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."normalize_supporter_entitlements"();



CREATE OR REPLACE TRIGGER "post_likes_notify" AFTER INSERT ON "public"."post_likes" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_post_like"();



CREATE OR REPLACE TRIGGER "post_replies_notify" AFTER INSERT ON "public"."post_replies" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_post_reply"();



CREATE OR REPLACE TRIGGER "validate_post_image_entitlements_trigger" BEFORE INSERT OR UPDATE OF "img_links", "user_id" ON "public"."Posts" FOR EACH ROW EXECUTE FUNCTION "public"."validate_post_image_entitlements"();



ALTER TABLE ONLY "public"."PostReports"
    ADD CONSTRAINT "PostReports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."Posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."PostReports"
    ADD CONSTRAINT "PostReports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Posts"
    ADD CONSTRAINT "Posts_subcommunity_fkey" FOREIGN KEY ("subcommunity") REFERENCES "public"."sub_communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."connect_encounters"
    ADD CONSTRAINT "connect_encounters_first_user_id_fkey" FOREIGN KEY ("first_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."connect_encounters"
    ADD CONSTRAINT "connect_encounters_second_user_id_fkey" FOREIGN KEY ("second_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."connect_locations"
    ADD CONSTRAINT "connect_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_public_keys"
    ADD CONSTRAINT "message_public_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."Communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."Posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patreon_oauth_states"
    ADD CONSTRAINT "patreon_oauth_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."Posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_replies"
    ADD CONSTRAINT "post_replies_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."Posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_replies"
    ADD CONSTRAINT "post_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sub_communities"
    ADD CONSTRAINT "sub_communities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can create permitted posts" ON "public"."Posts" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."can_post_to_community"("community")));



CREATE POLICY "Authenticated users can read communities" ON "public"."Communities" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can report posts" ON "public"."PostReports" FOR INSERT TO "authenticated" WITH CHECK ((("reporter_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."Posts"
  WHERE (("Posts"."id" = "PostReports"."post_id") AND ("Posts"."user_id" <> ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Authenticated users read post likes" ON "public"."post_likes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users read post replies" ON "public"."post_replies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Blocked users cannot read direct messages" ON "public"."direct_messages" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((NOT "public"."users_are_blocked"("sender_id", "recipient_id")));



CREATE POLICY "Blocked users cannot send direct messages" ON "public"."direct_messages" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ((NOT "public"."users_are_blocked"("sender_id", "recipient_id")));



ALTER TABLE "public"."Communities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Connected users read message keys" ON "public"."message_public_keys" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."are_connect_users_linked"("auth"."uid"(), "user_id")));



CREATE POLICY "Connected users send direct messages" ON "public"."direct_messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "auth"."uid"()) AND "public"."are_connect_users_linked"("sender_id", "recipient_id") AND ("sender_public_jwk" = ( SELECT "key"."public_jwk"
   FROM "public"."message_public_keys" "key"
  WHERE ("key"."user_id" = "direct_messages"."sender_id"))) AND ("recipient_public_jwk" = ( SELECT "key"."public_jwk"
   FROM "public"."message_public_keys" "key"
  WHERE ("key"."user_id" = "direct_messages"."recipient_id")))));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."Communities" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("global" IS NOT TRUE)));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."Posts" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Owners can edit community details" ON "public"."Communities" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Parent members can read sub-communities" ON "public"."sub_communities" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."Communities" "parent"
  WHERE (("parent"."id" = "sub_communities"."community_parent_uid") AND (("parent"."user_id" = "auth"."uid"()) OR ("auth"."uid"() = ANY (COALESCE("parent"."members", '{}'::"uuid"[]))))))));



CREATE POLICY "Participants read direct messages" ON "public"."direct_messages" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "recipient_id")));



ALTER TABLE "public"."PostReports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Prevent setting warning on insert" ON "public"."profiles" AS RESTRICTIVE FOR INSERT WITH CHECK (("warning" IS NULL));



CREATE POLICY "Profiles update own (warning only to null)" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK ((("id" = "auth"."uid"()) AND (("warning" = "public"."_get_my_profile_warning"()) OR ("warning" IS NULL))));



CREATE POLICY "Sub-community posting requires membership" ON "public"."Posts" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ((("subcommunity" IS NULL) OR "public"."can_post_to_subcommunity"("subcommunity")));



CREATE POLICY "Users can create their own local community" ON "public"."Communities" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND ("global" IS NOT TRUE) AND ("business" IS NOT TRUE) AND (("members" IS NULL) OR ("members" <@ ARRAY["auth"."uid"()])) AND (("radius_meters" >= 100) AND ("radius_meters" <=
CASE
    WHEN (EXISTS ( SELECT 1
       FROM "public"."profiles"
      WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."supporter" IS TRUE)))) THEN 40000
    ELSE 25000
END))));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users create their own post likes" ON "public"."post_likes" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."Posts" "post"
  WHERE ("post"."id" = "post_likes"."post_id")))));



CREATE POLICY "Users create their own post replies" ON "public"."post_replies" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."Posts" "post"
  WHERE ("post"."id" = "post_replies"."post_id")))));



CREATE POLICY "Users manage their message key" ON "public"."message_public_keys" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users remove their own post likes" ON "public"."post_likes" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users remove their own post replies" ON "public"."post_replies" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."connect_encounters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."connect_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."direct_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_public_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patreon_oauth_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patreon_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_replies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sub_communities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_blocks" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."_get_my_profile_warning"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_get_my_profile_warning"() TO "anon";
GRANT ALL ON FUNCTION "public"."_get_my_profile_warning"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_get_my_profile_warning"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_community_owner_membership"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_community_owner_membership"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_community_owner_membership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_community_owner_membership"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."are_connect_users_linked"("first_user" "uuid", "second_user" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."are_connect_users_linked"("first_user" "uuid", "second_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."are_connect_users_linked"("first_user" "uuid", "second_user" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_post_to_community"("target_community" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_post_to_community"("target_community" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_post_to_community"("target_community" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_post_to_community"("target_community" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_post_to_subcommunity"("target_subcommunity" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."can_post_to_subcommunity"("target_subcommunity" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_post_to_subcommunity"("target_subcommunity" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."community_distance_meters"("first_latitude" double precision, "first_longitude" double precision, "second_latitude" double precision, "second_longitude" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."community_distance_meters"("first_latitude" double precision, "first_longitude" double precision, "second_latitude" double precision, "second_longitude" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."community_distance_meters"("first_latitude" double precision, "first_longitude" double precision, "second_latitude" double precision, "second_longitude" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_oauth_profile"("requested_username" "text", "requested_birthday" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_oauth_profile"("requested_username" "text", "requested_birthday" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_oauth_profile"("requested_username" "text", "requested_birthday" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."consume_patreon_oauth_state"("p_state_hash" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_patreon_oauth_state"("p_state_hash" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_business_community"("community_name" "text", "community_description" "text", "location_name" "text", "community_latitude" double precision, "community_longitude" double precision, "community_radius_meters" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_business_community"("community_name" "text", "community_description" "text", "location_name" "text", "community_latitude" double precision, "community_longitude" double precision, "community_radius_meters" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_business_community"("community_name" "text", "community_description" "text", "location_name" "text", "community_latitude" double precision, "community_longitude" double precision, "community_radius_meters" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_subcommunity"("parent_community" "uuid", "subcommunity_title" "text", "subcommunity_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_subcommunity"("parent_community" "uuid", "subcommunity_title" "text", "subcommunity_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_subcommunity"("parent_community" "uuid", "subcommunity_title" "text", "subcommunity_description" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_owned_community"("target_community" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_owned_community"("target_community" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_owned_community"("target_community" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_subcommunity"("target_subcommunity" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_subcommunity"("target_subcommunity" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_subcommunity"("target_subcommunity" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."event_trigger_fn"() TO "anon";
GRANT ALL ON FUNCTION "public"."event_trigger_fn"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."event_trigger_fn"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_connect_encounters"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_connect_encounters"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_connect_encounters"() TO "service_role";



GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."Posts" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."Posts" TO "authenticated";
GRANT ALL ON TABLE "public"."Posts" TO "service_role";



GRANT SELECT("subcommunity") ON TABLE "public"."Posts" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_home_feed"("user_latitude" double precision, "user_longitude" double precision, "feed_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_home_feed"("user_latitude" double precision, "user_longitude" double precision, "feed_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_home_feed"("user_latitude" double precision, "user_longitude" double precision, "feed_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_owned_community_request_uuids"("target_community" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_owned_community_request_uuids"("target_community" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_owned_community_request_uuids"("target_community" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_public_profile"("target_user" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_profile"("target_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_profile"("target_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_profile"("target_user" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_auth_user_ban_or_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_auth_user_ban_or_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_auth_user_ban_or_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_auth_user_cleanup"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_auth_user_cleanup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_auth_user_cleanup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_fn"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_fn"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_fn"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_subcommunity_manager"("target_subcommunity" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."is_subcommunity_manager"("target_subcommunity" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_subcommunity_manager"("target_subcommunity" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_username_available"("requested_username" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_username_available"("requested_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_username_available"("requested_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_username_available"("requested_username" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."join_community"("target_community" "uuid", "user_latitude" double precision, "user_longitude" double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."join_community"("target_community" "uuid", "user_latitude" double precision, "user_longitude" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."join_community"("target_community" "uuid", "user_latitude" double precision, "user_longitude" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_community"("target_community" "uuid", "user_latitude" double precision, "user_longitude" double precision) TO "service_role";



REVOKE ALL ON FUNCTION "public"."leave_community"("target_community" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."leave_community"("target_community" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."leave_community"("target_community" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."normalize_supporter_entitlements"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."normalize_supporter_entitlements"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_post_like"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_post_like"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_post_like"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_post_reply"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_post_reply"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_post_reply"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_patreon_webhook"("p_event_hash" "text", "p_event_type" "text", "p_patreon_user_id" "text", "p_membership_status" "text", "p_supporter" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_patreon_webhook"("p_event_hash" "text", "p_event_type" "text", "p_patreon_user_id" "text", "p_membership_status" "text", "p_supporter" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_patreon_webhook"("p_event_hash" "text", "p_event_type" "text", "p_patreon_user_id" "text", "p_membership_status" "text", "p_supporter" boolean, "p_business_supporter" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_patreon_webhook"("p_event_hash" "text", "p_event_type" "text", "p_patreon_user_id" "text", "p_membership_status" "text", "p_supporter" boolean, "p_business_supporter" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."respond_to_community_join_request"("target_community" "uuid", "requester_id" "uuid", "approve_request" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."respond_to_community_join_request"("target_community" "uuid", "requester_id" "uuid", "approve_request" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."respond_to_community_join_request"("target_community" "uuid", "requester_id" "uuid", "approve_request" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_bloom"("search_term" "text", "user_latitude" double precision, "user_longitude" double precision, "result_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_bloom"("search_term" "text", "user_latitude" double precision, "user_longitude" double precision, "result_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_bloom"("search_term" "text", "user_latitude" double precision, "user_longitude" double precision, "result_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_community_picture"("target_community" "uuid", "new_picture_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_community_picture"("target_community" "uuid", "new_picture_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_community_picture"("target_community" "uuid", "new_picture_url" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_community_privacy"("target_community" "uuid", "make_private" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_community_privacy"("target_community" "uuid", "make_private" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_community_privacy"("target_community" "uuid", "make_private" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_connect_enabled"("enabled" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_connect_enabled"("enabled" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_connect_enabled"("enabled" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_business_profile"("business_name" "text", "description" "text", "location_text" "text", "latitude" double precision, "longitude" double precision, "contact_email" "text", "contact_phone" "text", "website" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_business_profile"("business_name" "text", "description" "text", "location_text" "text", "latitude" double precision, "longitude" double precision, "contact_email" "text", "contact_phone" "text", "website" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_business_profile"("business_name" "text", "description" "text", "location_text" "text", "latitude" double precision, "longitude" double precision, "contact_email" "text", "contact_phone" "text", "website" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_connect_location"("user_latitude" double precision, "user_longitude" double precision, "user_accuracy_meters" double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_connect_location"("user_latitude" double precision, "user_longitude" double precision, "user_accuracy_meters" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_connect_location"("user_latitude" double precision, "user_longitude" double precision, "user_accuracy_meters" double precision) TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_subcommunity"("target_subcommunity" bigint, "subcommunity_title" "text", "subcommunity_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_subcommunity"("target_subcommunity" bigint, "subcommunity_title" "text", "subcommunity_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subcommunity"("target_subcommunity" bigint, "subcommunity_title" "text", "subcommunity_description" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."users_are_blocked"("first_user" "uuid", "second_user" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."users_are_blocked"("first_user" "uuid", "second_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."users_are_blocked"("first_user" "uuid", "second_user" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_post_image_entitlements"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_post_image_entitlements"() TO "service_role";


















GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."Communities" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."Communities" TO "authenticated";
GRANT ALL ON TABLE "public"."Communities" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."Communities" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."Communities" TO "authenticated";



GRANT SELECT("name"),UPDATE("name") ON TABLE "public"."Communities" TO "authenticated";



GRANT SELECT("description"),UPDATE("description") ON TABLE "public"."Communities" TO "authenticated";



GRANT SELECT("user_id") ON TABLE "public"."Communities" TO "authenticated";



GRANT SELECT("banner_url") ON TABLE "public"."Communities" TO "authenticated";



GRANT SELECT("members") ON TABLE "public"."Communities" TO "authenticated";



GRANT SELECT("global") ON TABLE "public"."Communities" TO "authenticated";



GRANT SELECT("latitude") ON TABLE "public"."Communities" TO "authenticated";



GRANT SELECT("longitude") ON TABLE "public"."Communities" TO "authenticated";



GRANT SELECT("radius_meters") ON TABLE "public"."Communities" TO "authenticated";



GRANT SELECT("location_label") ON TABLE "public"."Communities" TO "authenticated";



GRANT SELECT("business") ON TABLE "public"."Communities" TO "authenticated";



GRANT SELECT("picture_url") ON TABLE "public"."Communities" TO "authenticated";



GRANT SELECT("private") ON TABLE "public"."Communities" TO "authenticated";



GRANT ALL ON TABLE "public"."PostReports" TO "anon";
GRANT ALL ON TABLE "public"."PostReports" TO "authenticated";
GRANT ALL ON TABLE "public"."PostReports" TO "service_role";



GRANT ALL ON SEQUENCE "public"."PostReports_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."PostReports_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."PostReports_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."connect_encounters" TO "service_role";



GRANT ALL ON TABLE "public"."connect_locations" TO "service_role";



GRANT ALL ON TABLE "public"."direct_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."direct_messages" TO "service_role";



GRANT ALL ON TABLE "public"."message_public_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."message_public_keys" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."patreon_oauth_states" TO "service_role";



GRANT ALL ON TABLE "public"."patreon_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."post_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."post_likes" TO "service_role";



GRANT ALL ON TABLE "public"."post_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."post_replies" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT INSERT("id") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("username") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("display_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("bio") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("avatar_url") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("created_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("joined_communities") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("FirstTimeOpen"),UPDATE("FirstTimeOpen") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("Language"),UPDATE("Language") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("birthday") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("requestedDelete") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("paddle_customer_id") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("supporter") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("patreon_user_id") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("patreon_membership_status") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("supporter_verified_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("Theme"),UPDATE("Theme") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("isBusiness") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("business_description") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("business_location") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("business_latitude") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("business_longitude") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("business_contact_email") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("business_contact_phone") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("business_website") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("business_supporter") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("business_supporter_verified_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("connect_enabled") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("blocked_uuids") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("warning") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."sub_communities" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."sub_communities" TO "authenticated";
GRANT ALL ON TABLE "public"."sub_communities" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sub_communities_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sub_communities_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sub_communities_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_blocks" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































