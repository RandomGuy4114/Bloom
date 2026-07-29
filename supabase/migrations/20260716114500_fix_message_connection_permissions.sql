create or replace function public.are_connect_users_linked(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and auth.uid() in (first_user, second_user)
    and first_user <> second_user
    and exists (
      select 1
      from public.connect_encounters encounter
      where encounter.first_user_id = least(first_user, second_user)
        and encounter.second_user_id = greatest(first_user, second_user)
    );
$$;
revoke all on function public.are_connect_users_linked(uuid, uuid) from public;
grant execute on function public.are_connect_users_linked(uuid, uuid) to authenticated;
drop policy if exists "Connected users read message keys" on public.message_public_keys;
create policy "Connected users read message keys"
on public.message_public_keys
for select
to authenticated
using (
  user_id = auth.uid()
  or public.are_connect_users_linked(auth.uid(), user_id)
);
drop policy if exists "Connected users send direct messages" on public.direct_messages;
create policy "Connected users send direct messages"
on public.direct_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.are_connect_users_linked(sender_id, recipient_id)
  and sender_public_jwk = (
    select key.public_jwk from public.message_public_keys key where key.user_id = sender_id
  )
  and recipient_public_jwk = (
    select key.public_jwk from public.message_public_keys key where key.user_id = recipient_id
  )
);
