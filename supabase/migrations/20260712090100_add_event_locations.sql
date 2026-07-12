ALTER TABLE "public"."Posts"
ADD COLUMN IF NOT EXISTS "location" text;

CREATE OR REPLACE FUNCTION "public"."is_valid_event_location"("event_location" text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
    "latitude_value" double precision;
    "longitude_value" double precision;
BEGIN
    IF "event_location" IS NULL OR "event_location" !~ '^[+-]?[0-9]+(\.[0-9]+)?\s*,\s*[+-]?[0-9]+(\.[0-9]+)?$' THEN
        RETURN false;
    END IF;
    "latitude_value" := trim(split_part("event_location", ',', 1))::double precision;
    "longitude_value" := trim(split_part("event_location", ',', 2))::double precision;
    RETURN "latitude_value" BETWEEN -90 AND 90
       AND "longitude_value" BETWEEN -180 AND 180;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

ALTER TABLE "public"."Posts"
DROP CONSTRAINT IF EXISTS "Posts_event_location_check";

ALTER TABLE "public"."Posts"
ADD CONSTRAINT "Posts_event_location_check"
CHECK (
    ("post_type" = 'event' AND "public"."is_valid_event_location"("location"))
    OR ("post_type" <> 'event' AND "location" IS NULL)
) NOT VALID;
