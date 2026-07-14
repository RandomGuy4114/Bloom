


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



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


CREATE OR REPLACE FUNCTION "public"."event_trigger_fn"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Add logic here
END;
$$;


ALTER FUNCTION "public"."event_trigger_fn"() OWNER TO "postgres";

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
    "img_links" "text"[] DEFAULT '{}'::"text"[] NOT NULL
);


ALTER TABLE "public"."Posts" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_home_feed"("user_latitude" double precision DEFAULT NULL::double precision, "user_longitude" double precision DEFAULT NULL::double precision, "feed_limit" integer DEFAULT 100) RETURNS SETOF "public"."Posts"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  with viewer as (
    select coalesce(joined_communities, '{}'::uuid[]) as joined
    from public.profiles where id = auth.uid()
  )
  select post.*
  from public."Posts" post
  join public."Communities" community on community.id = post.community
  cross join viewer
  where post.community = any(viewer.joined)
     or (
       community.business is true
       and exists (
         select 1 from public.profiles owner_profile
         where owner_profile.id = community.user_id
           and owner_profile.business_supporter is true
       )
       and not (post.community = any(viewer.joined))
       and user_latitude is not null and user_longitude is not null
       and post.created_at >= now() - interval '30 days'
       and public.community_distance_meters(
         user_latitude, user_longitude, community.latitude, community.longitude
       ) <= community.radius_meters
       and mod(abs(hashtext(post.id::text || auth.uid()::text)::bigint), 4) = 0
     )
  order by post.created_at desc
  limit least(greatest(feed_limit, 1), 200);
$$;


ALTER FUNCTION "public"."get_home_feed"("user_latitude" double precision, "user_longitude" double precision, "feed_limit" integer) OWNER TO "postgres";


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
    AS $$
DECLARE
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
END;
$$;


ALTER FUNCTION "public"."join_community"("target_community" "uuid", "user_latitude" double precision, "user_longitude" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."leave_community"("target_community" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    "active_user" uuid := "auth"."uid"();
BEGIN
    IF "active_user" IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    UPDATE "public"."Communities"
    SET "members" = array_remove(COALESCE("members", ARRAY[]::uuid[]), "active_user")
    WHERE "id" = "target_community";

    UPDATE "public"."profiles"
    SET "joined_communities" = array_remove(
        COALESCE("joined_communities", ARRAY[]::uuid[]),
        "target_community"
    )
    WHERE "id" = "active_user";

    RETURN 'left';
END;
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
    CONSTRAINT "Communities_banner_origin_check" CHECK ((("banner_url" IS NULL) OR ("banner_url" = ''::"text") OR ("banner_url" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Community%20Banners/%'::"text") OR ("banner_url" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Community Banners/%'::"text"))),
    CONSTRAINT "Communities_location_label_check" CHECK (("char_length"(COALESCE("location_label", ''::"text")) <= 300))
);


ALTER TABLE "public"."Communities" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
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
    CONSTRAINT "profiles_bio_length_check" CHECK (("char_length"(COALESCE("bio", ''::"text")) <=
CASE
    WHEN "supporter" THEN 1500
    ELSE 500
END)),
    CONSTRAINT "profiles_business_details_check" CHECK ((("char_length"(COALESCE("business_description", ''::"text")) <= 1500) AND ("char_length"(COALESCE("business_location", ''::"text")) <= 300) AND ("char_length"(COALESCE("business_contact_email", ''::"text")) <= 254) AND ("char_length"(COALESCE("business_contact_phone", ''::"text")) <= 40) AND ("char_length"(COALESCE("business_website", ''::"text")) <= 2048) AND (("business_latitude" IS NULL) OR (("business_latitude" >= ('-90'::integer)::double precision) AND ("business_latitude" <= (90)::double precision))) AND (("business_longitude" IS NULL) OR (("business_longitude" >= ('-180'::integer)::double precision) AND ("business_longitude" <= (180)::double precision))) AND (("business_latitude" IS NULL) = ("business_longitude" IS NULL)))),
    CONSTRAINT "profiles_gif_avatar_supporter_check" CHECK (("supporter" OR ("avatar_url" IS NULL) OR ("avatar_url" !~* '\.gif(\?|$)'::"text"))),
    CONSTRAINT "profiles_theme_check" CHECK ((("Theme" = ANY (ARRAY['light'::"text", 'dark'::"text"])) OR ("supporter" AND ("Theme" = ANY (ARRAY['forest'::"text", 'midnight'::"text", 'sunset'::"text", 'frutiger-aero'::"text"])))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."patreon_user_id" IS 'Patreon identity linked through the server-side OAuth callback. Unique to one Bloom account.';



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



ALTER TABLE ONLY "public"."patreon_oauth_states"
    ADD CONSTRAINT "patreon_oauth_states_pkey" PRIMARY KEY ("state_hash");



ALTER TABLE ONLY "public"."patreon_webhook_events"
    ADD CONSTRAINT "patreon_webhook_events_pkey" PRIMARY KEY ("event_hash");



ALTER TABLE "public"."profiles"
    ADD CONSTRAINT "profiles_avatar_origin_check" CHECK ((("avatar_url" IS NULL) OR ("avatar_url" = ''::"text") OR ("avatar_url" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Profile%20Pictures/%'::"text") OR ("avatar_url" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Profile Pictures/%'::"text"))) NOT VALID;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



CREATE INDEX "Communities_members_search_idx" ON "public"."Communities" USING "gin" ("members");



CREATE UNIQUE INDEX "PostReports_post_reporter_key" ON "public"."PostReports" USING "btree" ("post_id", "reporter_id");



CREATE INDEX "patreon_oauth_states_expires_at_idx" ON "public"."patreon_oauth_states" USING "btree" ("expires_at");



CREATE INDEX "patreon_webhook_events_received_at_idx" ON "public"."patreon_webhook_events" USING "btree" ("received_at");



CREATE UNIQUE INDEX "profiles_patreon_user_id_key" ON "public"."profiles" USING "btree" ("patreon_user_id") WHERE ("patreon_user_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "add_community_owner_membership_trigger" BEFORE INSERT ON "public"."Communities" FOR EACH ROW EXECUTE FUNCTION "public"."add_community_owner_membership"();



CREATE OR REPLACE TRIGGER "normalize_supporter_entitlements_trigger" BEFORE INSERT OR UPDATE OF "supporter", "bio", "avatar_url", "Theme" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."normalize_supporter_entitlements"();



CREATE OR REPLACE TRIGGER "validate_post_image_entitlements_trigger" BEFORE INSERT OR UPDATE OF "img_links", "user_id" ON "public"."Posts" FOR EACH ROW EXECUTE FUNCTION "public"."validate_post_image_entitlements"();



ALTER TABLE ONLY "public"."PostReports"
    ADD CONSTRAINT "PostReports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."Posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."PostReports"
    ADD CONSTRAINT "PostReports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patreon_oauth_states"
    ADD CONSTRAINT "patreon_oauth_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can create permitted posts" ON "public"."Posts" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."can_post_to_community"("community")));



CREATE POLICY "Authenticated users can read communities" ON "public"."Communities" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read posts" ON "public"."Posts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can report posts" ON "public"."PostReports" FOR INSERT TO "authenticated" WITH CHECK ((("reporter_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."Posts"
  WHERE (("Posts"."id" = "PostReports"."post_id") AND ("Posts"."user_id" <> ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."Communities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Enable delete for users based on user_id" ON "public"."Communities" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("global" IS NOT TRUE)));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."Posts" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Enable update for users based on user_id" ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Owners can edit community details" ON "public"."Communities" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."PostReports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Users can create their own local community" ON "public"."Communities" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND ("global" IS NOT TRUE) AND ("business" IS NOT TRUE) AND (("members" IS NULL) OR ("members" <@ ARRAY["auth"."uid"()])) AND (("radius_meters" >= 100) AND ("radius_meters" <=
CASE
    WHEN (EXISTS ( SELECT 1
       FROM "public"."profiles"
      WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."supporter" IS TRUE)))) THEN 40000
    ELSE 25000
END))));



CREATE POLICY "Users can read their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."patreon_oauth_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patreon_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_community_owner_membership"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_community_owner_membership"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_community_owner_membership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_community_owner_membership"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_post_to_community"("target_community" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_post_to_community"("target_community" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_post_to_community"("target_community" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_post_to_community"("target_community" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."community_distance_meters"("first_latitude" double precision, "first_longitude" double precision, "second_latitude" double precision, "second_longitude" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."community_distance_meters"("first_latitude" double precision, "first_longitude" double precision, "second_latitude" double precision, "second_longitude" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."community_distance_meters"("first_latitude" double precision, "first_longitude" double precision, "second_latitude" double precision, "second_longitude" double precision) TO "service_role";



REVOKE ALL ON FUNCTION "public"."consume_patreon_oauth_state"("p_state_hash" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_patreon_oauth_state"("p_state_hash" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_business_community"("community_name" "text", "community_description" "text", "location_name" "text", "community_latitude" double precision, "community_longitude" double precision, "community_radius_meters" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_business_community"("community_name" "text", "community_description" "text", "location_name" "text", "community_latitude" double precision, "community_longitude" double precision, "community_radius_meters" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_business_community"("community_name" "text", "community_description" "text", "location_name" "text", "community_latitude" double precision, "community_longitude" double precision, "community_radius_meters" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_owned_community"("target_community" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_owned_community"("target_community" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_owned_community"("target_community" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."event_trigger_fn"() TO "anon";
GRANT ALL ON FUNCTION "public"."event_trigger_fn"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."event_trigger_fn"() TO "service_role";



GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."Posts" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."Posts" TO "authenticated";
GRANT ALL ON TABLE "public"."Posts" TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_home_feed"("user_latitude" double precision, "user_longitude" double precision, "feed_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_home_feed"("user_latitude" double precision, "user_longitude" double precision, "feed_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_home_feed"("user_latitude" double precision, "user_longitude" double precision, "feed_limit" integer) TO "service_role";



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



REVOKE ALL ON FUNCTION "public"."is_username_available"("requested_username" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_username_available"("requested_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_username_available"("requested_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_username_available"("requested_username" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."join_community"("target_community" "uuid", "user_latitude" double precision, "user_longitude" double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."join_community"("target_community" "uuid", "user_latitude" double precision, "user_longitude" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."join_community"("target_community" "uuid", "user_latitude" double precision, "user_longitude" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_community"("target_community" "uuid", "user_latitude" double precision, "user_longitude" double precision) TO "service_role";



REVOKE ALL ON FUNCTION "public"."leave_community"("target_community" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."leave_community"("target_community" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."leave_community"("target_community" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."leave_community"("target_community" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."normalize_supporter_entitlements"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."normalize_supporter_entitlements"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_patreon_webhook"("p_event_hash" "text", "p_event_type" "text", "p_patreon_user_id" "text", "p_membership_status" "text", "p_supporter" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_patreon_webhook"("p_event_hash" "text", "p_event_type" "text", "p_patreon_user_id" "text", "p_membership_status" "text", "p_supporter" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_patreon_webhook"("p_event_hash" "text", "p_event_type" "text", "p_patreon_user_id" "text", "p_membership_status" "text", "p_supporter" boolean, "p_business_supporter" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_patreon_webhook"("p_event_hash" "text", "p_event_type" "text", "p_patreon_user_id" "text", "p_membership_status" "text", "p_supporter" boolean, "p_business_supporter" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_bloom"("search_term" "text", "user_latitude" double precision, "user_longitude" double precision, "result_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_bloom"("search_term" "text", "user_latitude" double precision, "user_longitude" double precision, "result_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_bloom"("search_term" "text", "user_latitude" double precision, "user_longitude" double precision, "result_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_business_profile"("business_name" "text", "description" "text", "location_text" "text", "latitude" double precision, "longitude" double precision, "contact_email" "text", "contact_phone" "text", "website" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_business_profile"("business_name" "text", "description" "text", "location_text" "text", "latitude" double precision, "longitude" double precision, "contact_email" "text", "contact_phone" "text", "website" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_business_profile"("business_name" "text", "description" "text", "location_text" "text", "latitude" double precision, "longitude" double precision, "contact_email" "text", "contact_phone" "text", "website" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_post_image_entitlements"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_post_image_entitlements"() TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."Communities" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."Communities" TO "authenticated";
GRANT ALL ON TABLE "public"."Communities" TO "service_role";



GRANT UPDATE("name") ON TABLE "public"."Communities" TO "authenticated";



GRANT UPDATE("description") ON TABLE "public"."Communities" TO "authenticated";



GRANT ALL ON TABLE "public"."PostReports" TO "anon";
GRANT ALL ON TABLE "public"."PostReports" TO "authenticated";
GRANT ALL ON TABLE "public"."PostReports" TO "service_role";



GRANT ALL ON SEQUENCE "public"."PostReports_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."PostReports_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."PostReports_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."patreon_oauth_states" TO "service_role";



GRANT ALL ON TABLE "public"."patreon_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT UPDATE("FirstTimeOpen") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("Language") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("requestedDelete") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("Theme") ON TABLE "public"."profiles" TO "authenticated";



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






