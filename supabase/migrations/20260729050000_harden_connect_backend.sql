-- Connect functions

create or replace function public.are_connect_users_linked(
  first_user uuid,
  second_user uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and auth.uid() in (first_user, second_user)
    and first_user is not null
    and second_user is not null
    and first_user <> second_user
    and exists (
      select 1
      from public.connect_encounters encounter
      where encounter.first_user_id = least(first_user, second_user)
        and encounter.second_user_id = greatest(first_user, second_user)
    );
$$;

create or replace function public.get_connect_encounters()
returns table(
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  supporter boolean,
  connected_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    other_profile.id,
    other_profile.username,
    other_profile.display_name,
    other_profile.avatar_url,
    coalesce(other_profile.supporter, false),
    encounter.notified_at
  from public.connect_encounters encounter
  join public.profiles other_profile
    on other_profile.id = case
      when encounter.first_user_id = auth.uid() then encounter.second_user_id
      else encounter.first_user_id
    end
  where auth.uid() is not null
    and auth.uid() in (encounter.first_user_id, encounter.second_user_id)
  order by encounter.notified_at desc;
$$;

create or replace function public.set_connect_enabled(enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_user uuid := auth.uid();
  requested_state boolean := coalesce(enabled, false);
begin
  if active_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  update public.profiles
  set connect_enabled = requested_state
  where id = active_user;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if not requested_state then
    delete from public.connect_locations where user_id = active_user;
  end if;

  return requested_state;
end;
$$;

create or replace function public.update_connect_location(
  user_latitude double precision,
  user_longitude double precision,
  user_accuracy_meters double precision default null
) returns table(encountered boolean, encounter_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_user uuid := auth.uid();
  nearby_user uuid;
  pair_first uuid;
  pair_second uuid;
begin
  if active_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if user_latitude is null
     or user_longitude is null
     or user_latitude::text in ('NaN', 'Infinity', '-Infinity')
     or user_longitude::text in ('NaN', 'Infinity', '-Infinity')
     or user_latitude not between -90 and 90
     or user_longitude not between -180 and 180
     or (
       user_accuracy_meters is not null
       and (
         user_accuracy_meters::text in ('NaN', 'Infinity', '-Infinity')
         or user_accuracy_meters not between 0 and 10000
       )
     ) then
    raise exception 'Invalid location' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = active_user and connect_enabled is true
  ) then
    delete from public.connect_locations where user_id = active_user;
    return query select false, null::text;
    return;
  end if;

  delete from public.connect_locations
  where updated_at < now() - interval '15 minutes';

  insert into public.connect_locations (
    user_id,
    latitude,
    longitude,
    accuracy_meters,
    updated_at
  )
  values (
    active_user,
    user_latitude,
    user_longitude,
    user_accuracy_meters,
    now()
  )
  on conflict (user_id) do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_meters = excluded.accuracy_meters,
    updated_at = excluded.updated_at;

  select candidate.user_id
  into nearby_user
  from public.connect_locations candidate
  join public.profiles candidate_profile
    on candidate_profile.id = candidate.user_id
  join public.profiles active_profile
    on active_profile.id = active_user
  where candidate.user_id <> active_user
    and candidate_profile.connect_enabled is true
    and candidate.updated_at > now() - interval '5 minutes'
    and coalesce(candidate.accuracy_meters, 50) <= 250
    and coalesce(user_accuracy_meters, 50) <= 250
    and coalesce(candidate_profile.joined_communities, '{}'::uuid[])
        && coalesce(active_profile.joined_communities, '{}'::uuid[])
    and public.community_distance_meters(
      user_latitude,
      user_longitude,
      candidate.latitude,
      candidate.longitude
    ) <= greatest(
      35.0,
      least(
        100.0,
        coalesce(user_accuracy_meters, 50.0)
          + coalesce(candidate.accuracy_meters, 50.0)
      )
    )
  order by public.community_distance_meters(
    user_latitude,
    user_longitude,
    candidate.latitude,
    candidate.longitude
  )
  limit 1;

  if nearby_user is null then
    return query select false, null::text;
    return;
  end if;

  pair_first := least(active_user, nearby_user);
  pair_second := greatest(active_user, nearby_user);

  insert into public.connect_encounters (
    first_user_id,
    second_user_id,
    notified_at
  )
  values (pair_first, pair_second, now())
  on conflict (first_user_id, second_user_id) do update
    set notified_at = excluded.notified_at
    where public.connect_encounters.notified_at < now() - interval '6 hours';

  if not found then
    return query select false, null::text;
    return;
  end if;

  return query
  select true, encode(
    extensions.digest(pair_first::text || pair_second::text, 'sha256'),
    'hex'
  );
end;
$$;

-- Connect permissions

revoke all on function public.are_connect_users_linked(uuid, uuid) from public, anon;
revoke all on function public.get_connect_encounters() from public, anon;
revoke all on function public.set_connect_enabled(boolean) from public, anon;
revoke all on function public.update_connect_location(double precision, double precision, double precision) from public, anon;

grant execute on function public.are_connect_users_linked(uuid, uuid) to authenticated, service_role;
grant execute on function public.get_connect_encounters() to authenticated, service_role;
grant execute on function public.set_connect_enabled(boolean) to authenticated, service_role;
grant execute on function public.update_connect_location(double precision, double precision, double precision) to authenticated, service_role;

-- Connect indexes

create index if not exists connect_locations_updated_at_idx
  on public.connect_locations (updated_at);

create index if not exists connect_encounters_notified_at_idx
  on public.connect_encounters (notified_at desc);
