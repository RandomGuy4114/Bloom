create table if not exists public.message_public_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_jwk jsonb not null,
  updated_at timestamptz not null default now(),
  constraint message_public_keys_jwk_check check (
    public_jwk ->> 'kty' = 'EC'
    and public_jwk ->> 'crv' = 'P-256'
    and length(coalesce(public_jwk ->> 'x', '')) between 40 and 50
    and length(coalesce(public_jwk ->> 'y', '')) between 40 and 50
  )
);
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  ciphertext text not null,
  message_iv text not null,
  sender_public_jwk jsonb not null,
  recipient_public_jwk jsonb not null,
  image_path text,
  image_iv text,
  image_mime text,
  created_at timestamptz not null default now(),
  constraint direct_messages_different_users check (sender_id <> recipient_id),
  constraint direct_messages_ciphertext_size check (length(ciphertext) between 1 and 100000),
  constraint direct_messages_iv_size check (length(message_iv) between 12 and 32),
  constraint direct_messages_image_fields check (
    (image_path is null and image_iv is null and image_mime is null)
    or (image_path is not null and image_iv is not null and image_mime is not null)
  ),
  constraint direct_messages_image_path_check check (
    image_path is null or image_path = sender_id::text || '/' || id::text || '.bin'
  )
);
create index if not exists direct_messages_participants_created_idx
  on public.direct_messages (sender_id, recipient_id, created_at desc);
alter table public.message_public_keys enable row level security;
alter table public.direct_messages enable row level security;
create policy "Users manage their message key"
on public.message_public_keys
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
create policy "Connected users read message keys"
on public.message_public_keys
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.connect_encounters encounter
    where least(auth.uid(), user_id) = encounter.first_user_id
      and greatest(auth.uid(), user_id) = encounter.second_user_id
  )
);
create policy "Participants read direct messages"
on public.direct_messages
for select
to authenticated
using (auth.uid() in (sender_id, recipient_id));
create policy "Connected users send direct messages"
on public.direct_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.connect_encounters encounter
    where least(sender_id, recipient_id) = encounter.first_user_id
      and greatest(sender_id, recipient_id) = encounter.second_user_id
  )
  and sender_public_jwk = (
    select key.public_jwk from public.message_public_keys key where key.user_id = sender_id
  )
  and recipient_public_jwk = (
    select key.public_jwk from public.message_public_keys key where key.user_id = recipient_id
  )
);
revoke all on public.message_public_keys from anon;
revoke all on public.direct_messages from anon;
grant select, insert, update on public.message_public_keys to authenticated;
grant select, insert on public.direct_messages to authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('Message Images', 'Message Images', false, 15728640, array['application/octet-stream'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
create policy "Users upload encrypted message images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'Message Images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "Participants read encrypted message images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'Message Images'
  and exists (
    select 1
    from public.direct_messages message
    where message.image_path = name
      and auth.uid() in (message.sender_id, message.recipient_id)
  )
);
create policy "Senders remove encrypted message images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'Message Images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
