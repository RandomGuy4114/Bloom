alter table public."Communities"
  add column if not exists picture_url text;

alter table public."Communities"
  drop constraint if exists "Communities_picture_origin_check";

alter table public."Communities"
  add constraint "Communities_picture_origin_check" check (
    picture_url is null
    or picture_url = ''
    or picture_url like 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Community%20Images/%'
    or picture_url like 'https://auilmosognuitlpoqchn.supabase.co/storage/v1/object/public/Community Images/%'
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'Community Images',
  'Community Images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Community images can be uploaded by their owner" on storage.objects;
create policy "Community images can be uploaded by their owner"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'Community Images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Community images can be deleted by their owner" on storage.objects;
create policy "Community images can be deleted by their owner"
on storage.objects for delete to authenticated
using (
  bucket_id = 'Community Images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.set_community_picture(target_community uuid, new_picture_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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

revoke all on function public.set_community_picture(uuid, text) from public, anon;
grant execute on function public.set_community_picture(uuid, text) to authenticated, service_role;
