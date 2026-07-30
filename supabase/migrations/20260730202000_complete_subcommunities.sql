alter table public.sub_communities
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public."Posts"
  add column if not exists subcommunity bigint references public.sub_communities(id) on delete cascade;

alter table public.sub_communities
  drop constraint if exists sub_communities_content_check;

alter table public.sub_communities
  add constraint sub_communities_content_check check (
    char_length(btrim(coalesce(title, ''))) between 1 and 100
    and char_length(coalesce(description, '')) <= 1000
  ) not valid;

create unique index if not exists sub_communities_one_per_member_parent_idx
  on public.sub_communities (community_parent_uid, owner_id)
  where owner_id is not null;

create index if not exists posts_subcommunity_created_idx
  on public."Posts" (subcommunity, created_at desc)
  where subcommunity is not null;

create or replace function public.is_subcommunity_manager(target_subcommunity bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
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

create or replace function public.can_post_to_subcommunity(target_subcommunity bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sub_communities subcommunity
    where subcommunity.id = target_subcommunity
      and auth.uid() = any(coalesce(subcommunity.members, '{}'::uuid[]))
  );
$$;

create or replace function public.create_subcommunity(
  parent_community uuid,
  subcommunity_title text,
  subcommunity_description text default ''
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_user uuid := auth.uid();
  created_id bigint;
begin
  if active_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(subcommunity_title, ''))) not between 1 and 100
    or char_length(coalesce(subcommunity_description, '')) > 1000 then
    raise exception 'Invalid sub-community details' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public."Communities" community
    where community.id = parent_community
      and (
        community.user_id = active_user
        or active_user = any(coalesce(community.members, '{}'::uuid[]))
      )
  ) then
    raise exception 'Parent community membership required' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.sub_communities subcommunity
    where subcommunity.community_parent_uid = parent_community
      and subcommunity.owner_id = active_user
  ) then
    raise exception 'You can create only one sub-community in this community'
      using errcode = '23505';
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

create or replace function public.update_subcommunity(
  target_subcommunity bigint,
  subcommunity_title text,
  subcommunity_description text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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

create or replace function public.delete_subcommunity(target_subcommunity bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_subcommunity_manager(target_subcommunity) then
    raise exception 'Sub-community owner access required' using errcode = '42501';
  end if;

  delete from public.sub_communities where id = target_subcommunity;
end;
$$;

alter table public.sub_communities enable row level security;

drop policy if exists "Parent members can read sub-communities"
  on public.sub_communities;
create policy "Parent members can read sub-communities"
  on public.sub_communities
  for select
  to authenticated
  using (
    exists (
      select 1
      from public."Communities" parent
      where parent.id = community_parent_uid
        and (
          parent.user_id = auth.uid()
          or auth.uid() = any(coalesce(parent.members, '{}'::uuid[]))
        )
    )
  );

drop policy if exists "Sub-community posts require membership"
  on public."Posts";
create policy "Sub-community posts require membership"
  on public."Posts"
  as restrictive
  for select
  to authenticated
  using (
    subcommunity is null
    or public.can_post_to_subcommunity(subcommunity)
    or public.is_subcommunity_manager(subcommunity)
  );

drop policy if exists "Sub-community posting requires membership"
  on public."Posts";
create policy "Sub-community posting requires membership"
  on public."Posts"
  as restrictive
  for insert
  to authenticated
  with check (
    subcommunity is null
    or public.can_post_to_subcommunity(subcommunity)
  );

grant select on public.sub_communities to authenticated;
grant select (subcommunity) on public."Posts" to authenticated;
grant execute on function public.is_subcommunity_manager(bigint) to authenticated;
grant execute on function public.can_post_to_subcommunity(bigint) to authenticated;
grant execute on function public.create_subcommunity(uuid, text, text) to authenticated;
grant execute on function public.update_subcommunity(bigint, text, text) to authenticated;
grant execute on function public.delete_subcommunity(bigint) to authenticated;
