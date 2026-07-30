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
  is_parent_owner boolean := false;
begin
  if active_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(subcommunity_title, ''))) not between 1 and 100
    or char_length(coalesce(subcommunity_description, '')) > 1000 then
    raise exception 'Invalid sub-community details' using errcode = '22023';
  end if;

  select community.user_id = active_user
  into is_parent_owner
  from public."Communities" community
  where community.id = parent_community
    and (
      community.user_id = active_user
      or active_user = any(coalesce(community.members, '{}'::uuid[]))
    );

  if not found then
    raise exception 'Parent community membership required' using errcode = '42501';
  end if;

  if not is_parent_owner then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(parent_community::text || active_user::text, 0)
    );

    if exists (
      select 1
      from public.sub_communities subcommunity
      where subcommunity.community_parent_uid = parent_community
        and subcommunity.owner_id = active_user
    ) then
      raise exception 'You can create only one sub-community in this community'
        using errcode = '23505';
    end if;
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

drop index if exists public.sub_communities_one_per_member_parent_idx;

grant execute
  on function public.create_subcommunity(uuid, text, text)
  to authenticated;
