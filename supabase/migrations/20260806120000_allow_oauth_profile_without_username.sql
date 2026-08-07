-- Google OAuth sign-ins create an auth.users row with no "username" in
-- raw_user_meta_data. handle_new_user()/handle_new_user_fn() insert a
-- public.profiles row for every new auth user, and that insert was failing
-- (and rolling back the whole sign-in) because profiles.username was NOT NULL.
-- The client now sends the user through a "complete your profile" step on
-- /callback to set a username after the OAuth round trip, so the column only
-- needs to be nullable until that happens.
ALTER TABLE "public"."profiles" ALTER COLUMN "username" DROP NOT NULL;
