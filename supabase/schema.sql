


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
    SELECT EXISTS (
        SELECT 1
        FROM "public"."Communities" AS "community"
        WHERE "community"."id" = "target_community"
          AND "auth"."uid"() = ANY(COALESCE("community"."members", ARRAY[]::uuid[]))
          AND (
              NOT COALESCE("community"."global", false)
              OR EXISTS (
                  SELECT 1
                  FROM "public"."profiles" AS "profile"
                  WHERE "profile"."id" = "auth"."uid"()
                    AND "profile"."admin" = true
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


CREATE OR REPLACE FUNCTION "public"."event_trigger_fn"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Add logic here
END;
$$;


ALTER FUNCTION "public"."event_trigger_fn"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_profile"("target_user" "uuid") RETURNS TABLE("id" "uuid", "username" "text", "bio" "text", "avatar_url" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    SELECT "profile"."id", "profile"."username", "profile"."bio", "profile"."avatar_url"
    FROM "public"."profiles" AS "profile"
    WHERE "profile"."id" = "target_user";
$$;


ALTER FUNCTION "public"."get_public_profile"("target_user" "uuid") OWNER TO "postgres";


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
  insert into public.profiles (id, username, birthday)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'username', '')::text,
    case
      when nullif(new.raw_user_meta_data->>'birthday', '') is null then null
      else (new.raw_user_meta_data->>'birthday')::date
    end
  )
  on conflict (id) do update set
    username = excluded.username,
    birthday = excluded.birthday;

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

  insert into public.profiles (id, username, display_name, birthday)
  values (
    new.id,
    v_username,
    v_username,
    case
      when nullif(new.raw_user_meta_data->>'birthday', '') is null then null
      else (new.raw_user_meta_data->>'birthday')::date
    end
  )
  on conflict (id) do update set
    username = excluded.username,
    display_name = excluded.display_name,
    birthday = excluded.birthday;

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

SET default_tablespace = '';

SET default_table_access_method = "heap";


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
    "radius_meters" integer
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



CREATE TABLE IF NOT EXISTS "public"."Posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"(),
    "community" "uuid" DEFAULT "gen_random_uuid"(),
    "title" "text",
    "body" "text",
    "communityName" "text",
    "post_type" "text",
    "img_link" "text"
);


ALTER TABLE "public"."Posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "display_name" "text",
    "bio" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "joined_communities" "uuid"[],
    "admin" boolean DEFAULT false,
    "FirstTimeOpen" boolean DEFAULT true,
    "Language" "text" DEFAULT 'en'::"text",
    "birthday" "date",
    "requestedDelete" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."Communities"
    ADD CONSTRAINT "Communities_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."Communities"
    ADD CONSTRAINT "Communities_valid_details_check" CHECK (((("char_length"(COALESCE("name", ''::"text")) >= 1) AND ("char_length"(COALESCE("name", ''::"text")) <= 100)) AND (("char_length"(COALESCE("description", ''::"text")) >= 1) AND ("char_length"(COALESCE("description", ''::"text")) <= 1000)) AND (("global" IS TRUE) OR (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL) AND ("radius_meters" IS NOT NULL) AND (("latitude" >= ('-90'::integer)::double precision) AND ("latitude" <= (90)::double precision)) AND (("longitude" >= ('-180'::integer)::double precision) AND ("longitude" <= (180)::double precision)) AND (("radius_meters" >= 1) AND ("radius_meters" <= 20000)))))) NOT VALID;



ALTER TABLE ONLY "public"."PostReports"
    ADD CONSTRAINT "PostReports_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."Posts"
    ADD CONSTRAINT "Posts_content_length_check" CHECK (((("char_length"(COALESCE("title", ''::"text")) >= 1) AND ("char_length"(COALESCE("title", ''::"text")) <= 200)) AND (("char_length"(COALESCE("body", ''::"text")) >= 1) AND ("char_length"(COALESCE("body", ''::"text")) <= 10000)))) NOT VALID;



ALTER TABLE "public"."Posts"
    ADD CONSTRAINT "Posts_image_origin_check" CHECK ((("img_link" IS NULL) OR ("img_link" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Post%20Images/%'::"text") OR ("img_link" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Post Images/%'::"text"))) NOT VALID;



ALTER TABLE ONLY "public"."Posts"
    ADD CONSTRAINT "Posts_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."profiles"
    ADD CONSTRAINT "profiles_avatar_origin_check" CHECK ((("avatar_url" IS NULL) OR ("avatar_url" = ''::"text") OR ("avatar_url" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Profile%20Pictures/%'::"text") OR ("avatar_url" ~~ 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Profile Pictures/%'::"text"))) NOT VALID;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



CREATE UNIQUE INDEX "PostReports_post_reporter_key" ON "public"."PostReports" USING "btree" ("post_id", "reporter_id");



CREATE OR REPLACE TRIGGER "add_community_owner_membership_trigger" BEFORE INSERT ON "public"."Communities" FOR EACH ROW EXECUTE FUNCTION "public"."add_community_owner_membership"();



ALTER TABLE ONLY "public"."PostReports"
    ADD CONSTRAINT "PostReports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."Posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."PostReports"
    ADD CONSTRAINT "PostReports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow users to update everything except admin status" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK ((("auth"."uid"() = "id") AND (NOT ("admin" IS DISTINCT FROM ( SELECT "p"."admin"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))))));



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



ALTER TABLE "public"."PostReports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Users can create their own local community" ON "public"."Communities" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("global" IS NOT TRUE) AND (("members" IS NULL) OR ("members" <@ ARRAY[( SELECT "auth"."uid"() AS "uid")]))));



CREATE POLICY "Users can read their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_community_owner_membership"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_community_owner_membership"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_community_owner_membership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_community_owner_membership"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_post_to_community"("target_community" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_post_to_community"("target_community" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_post_to_community"("target_community" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."community_distance_meters"("first_latitude" double precision, "first_longitude" double precision, "second_latitude" double precision, "second_longitude" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."community_distance_meters"("first_latitude" double precision, "first_longitude" double precision, "second_latitude" double precision, "second_longitude" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."community_distance_meters"("first_latitude" double precision, "first_longitude" double precision, "second_latitude" double precision, "second_longitude" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."event_trigger_fn"() TO "anon";
GRANT ALL ON FUNCTION "public"."event_trigger_fn"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."event_trigger_fn"() TO "service_role";



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



GRANT ALL ON TABLE "public"."Communities" TO "anon";
GRANT ALL ON TABLE "public"."Communities" TO "authenticated";
GRANT ALL ON TABLE "public"."Communities" TO "service_role";



GRANT ALL ON TABLE "public"."PostReports" TO "anon";
GRANT ALL ON TABLE "public"."PostReports" TO "authenticated";
GRANT ALL ON TABLE "public"."PostReports" TO "service_role";



GRANT ALL ON SEQUENCE "public"."PostReports_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."PostReports_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."PostReports_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Posts" TO "anon";
GRANT ALL ON TABLE "public"."Posts" TO "authenticated";
GRANT ALL ON TABLE "public"."Posts" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT UPDATE("username") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("display_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("bio") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("avatar_url") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("FirstTimeOpen") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("Language") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("requestedDelete") ON TABLE "public"."profiles" TO "authenticated";



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







