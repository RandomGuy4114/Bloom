


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


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Communities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "description" "text",
    "owner" "uuid" DEFAULT "gen_random_uuid"(),
    "banner_url" "text",
    "members" "uuid"[],
    "global" boolean DEFAULT false,
    "latitude" double precision,
    "longitude" double precision,
    "radius_meters" integer
);


ALTER TABLE "public"."Communities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author" "uuid" DEFAULT "gen_random_uuid"(),
    "community" "uuid" DEFAULT "gen_random_uuid"(),
    "title" "text",
    "body" "text",
    "communityName" "text",
    "post_type" "text" DEFAULT 'post'::"text" NOT NULL,
    CONSTRAINT "Posts_post_type_check" CHECK ("post_type" = ANY (ARRAY['post'::"text", 'activity'::"text", 'event'::"text"]))
);


ALTER TABLE "public"."Posts" OWNER TO "postgres";


CREATE INDEX IF NOT EXISTS "Posts_post_type_created_at_idx" ON "public"."Posts" USING "btree" ("post_type", "created_at" DESC);


CREATE TABLE IF NOT EXISTS "public"."PostReports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    CONSTRAINT "PostReports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PostReports_post_reporter_key" UNIQUE ("post_id", "reporter_id"),
    CONSTRAINT "PostReports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."Posts"("id") ON DELETE CASCADE,
    CONSTRAINT "PostReports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);


ALTER TABLE "public"."PostReports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "display_name" "text",
    "bio" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "joined_communities" "uuid"[],
    "Language" "text" DEFAULT 'en'::"text",
    "FirstTimeOpen" boolean DEFAULT true NOT NULL,
    "admin" boolean DEFAULT false NOT NULL,
    CONSTRAINT "profiles_language_check" CHECK ("Language" = ANY (ARRAY['en'::"text", 'es'::"text"]))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_post_to_community"("target_community" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM "public"."Communities" AS "community"
        WHERE "community"."id" = "target_community"
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


ALTER FUNCTION "public"."can_post_to_community"("uuid") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."can_post_to_community"("uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."can_post_to_community"("uuid") TO "authenticated";


ALTER TABLE ONLY "public"."Communities"
    ADD CONSTRAINT "Communities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Posts"
    ADD CONSTRAINT "Posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."Communities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Enable insert for authenticated users only" ON "public"."Communities" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can create permitted posts" ON "public"."Posts" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_post_to_community"("community"));



CREATE POLICY "Users can create their own non-admin profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "id") AND ("admin" = false)));



CREATE POLICY "Enable read access for all users" ON "public"."Communities" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."Posts" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."profiles" FOR SELECT USING (true);


CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."Posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."PostReports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Authenticated users can report posts" ON "public"."PostReports" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "reporter_id"));


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."Communities" TO "anon";
GRANT ALL ON TABLE "public"."Communities" TO "authenticated";
GRANT ALL ON TABLE "public"."Communities" TO "service_role";



GRANT ALL ON TABLE "public"."Posts" TO "anon";
GRANT ALL ON TABLE "public"."Posts" TO "authenticated";
GRANT ALL ON TABLE "public"."Posts" TO "service_role";


GRANT INSERT ON TABLE "public"."PostReports" TO "authenticated";
GRANT ALL ON TABLE "public"."PostReports" TO "service_role";



GRANT SELECT ON TABLE "public"."profiles" TO "anon";
GRANT SELECT, INSERT ON TABLE "public"."profiles" TO "authenticated";
GRANT UPDATE ("username", "display_name", "bio", "avatar_url", "joined_communities", "Language", "FirstTimeOpen") ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



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
