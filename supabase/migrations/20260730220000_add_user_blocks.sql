create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_different_users check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_id_idx
  on public.user_blocks (blocked_id, blocker_id);

alter table public.user_blocks enable row level security;

revoke all on public.user_blocks from public, anon, authenticated;
grant all on public.user_blocks to service_role;

create or replace function public.users_are_blocked(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    first_user is not null
    and second_user is not null
    and exists (
      select 1
      from public.user_blocks block
      where (
        block.blocker_id = first_user
        and block.blocked_id = second_user
      ) or (
        block.blocker_id = second_user
        and block.blocked_id = first_user
      )
    );
$$;

revoke all on function public.users_are_blocked(uuid, uuid)
  from public, anon;
grant execute on function public.users_are_blocked(uuid, uuid)
  to authenticated, service_role;

create or replace function public.are_connect_users_linked(
  first_user uuid,
  second_user uuid
)
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
    and not public.users_are_blocked(first_user, second_user)
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
  join public.profiles other_profile on other_profile.id = case
    when encounter.first_user_id = auth.uid() then encounter.second_user_id
    else encounter.first_user_id
  end
  where auth.uid() is not null
    and auth.uid() in (encounter.first_user_id, encounter.second_user_id)
    and not public.users_are_blocked(
      encounter.first_user_id,
      encounter.second_user_id
    )
  order by encounter.notified_at desc;
$$;

drop policy if exists "Blocked users cannot read direct messages"
  on public.direct_messages;
create policy "Blocked users cannot read direct messages"
  on public.direct_messages
  as restrictive
  for select
  to authenticated
  using (not public.users_are_blocked(sender_id, recipient_id));

drop policy if exists "Blocked users cannot send direct messages"
  on public.direct_messages;
create policy "Blocked users cannot send direct messages"
  on public.direct_messages
  as restrictive
  for insert
  to authenticated
  with check (not public.users_are_blocked(sender_id, recipient_id));
