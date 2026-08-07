-- 20260805090000 locked down column-level UPDATE grants on public.profiles so
-- "authenticated" can no longer write username/display_name/birthday directly.
-- That's correct for normal profile edits, but it also blocks the one-time
-- "finish setting up your account" step a new Google OAuth user goes through
-- on /callback, since their profile row already exists (created with a null
-- username by handle_new_user_fn) and needs those columns set.
--
-- This SECURITY DEFINER RPC is the only sanctioned way to fill that in: it
-- only ever touches the caller's own row, only when username is still unset,
-- and reuses the same availability check the regular signup form uses.
CREATE OR REPLACE FUNCTION "public"."complete_oauth_profile"("requested_username" "text", "requested_birthday" "date")
    RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;

ALTER FUNCTION "public"."complete_oauth_profile"("text", "date") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."complete_oauth_profile"("text", "date") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_oauth_profile"("text", "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_oauth_profile"("text", "date") TO "service_role";
