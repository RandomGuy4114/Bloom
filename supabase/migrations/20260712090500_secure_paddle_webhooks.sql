alter table public.profiles
  add column if not exists supporter boolean not null default false,
  add column if not exists paddle_subscription_id text,
  add column if not exists subscription_status text;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (username, display_name, bio, avatar_url, "FirstTimeOpen", "Language", "requestedDelete")
  on table public.profiles to authenticated;

create unique index if not exists profiles_paddle_subscription_id_key
  on public.profiles (paddle_subscription_id)
  where paddle_subscription_id is not null;

create table if not exists public.paddle_webhook_events (
  event_id text primary key check (event_id ~ '^evt_[a-z0-9]{26}$'),
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.paddle_webhook_events enable row level security;
revoke all on table public.paddle_webhook_events from public, anon, authenticated;
grant select, insert on table public.paddle_webhook_events to service_role;

create or replace function public.process_paddle_subscription_event(
  p_event_id text,
  p_event_type text,
  p_subscription_id text,
  p_transaction_id text,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  mapped_user_id uuid;
  affected_rows integer;
begin
  if p_event_id !~ '^evt_[a-z0-9]{26}$'
    or p_subscription_id !~ '^sub_[a-z0-9]{26}$'
    or p_event_type not in ('subscription.created', 'subscription.updated', 'subscription.canceled')
    or char_length(p_status) not between 1 and 40 then
    raise exception 'Invalid Paddle event fields';
  end if;

  insert into public.paddle_webhook_events (event_id, event_type)
  values (p_event_id, p_event_type)
  on conflict (event_id) do nothing;

  if not found then
    return false;
  end if;

  if p_event_type = 'subscription.created' then
    if p_transaction_id is null or p_transaction_id !~ '^txn_[a-z0-9]{26}$' then
      raise exception 'Invalid Paddle transaction ID';
    end if;

    select user_id
      into mapped_user_id
      from public.supporter_checkout_transactions
      where transaction_id = p_transaction_id;

    if mapped_user_id is null then
      raise exception 'No authenticated owner for Paddle transaction';
    end if;

    update public.profiles
      set supporter = true,
          paddle_subscription_id = p_subscription_id,
          subscription_status = p_status
      where id = mapped_user_id;
  elsif p_event_type = 'subscription.canceled' then
    update public.profiles
      set supporter = false,
          subscription_status = 'canceled'
      where paddle_subscription_id = p_subscription_id;
  else
    update public.profiles
      set supporter = p_status in ('active', 'trialing'),
          subscription_status = p_status
      where paddle_subscription_id = p_subscription_id;
  end if;

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'Expected one Supporter profile, updated %', affected_rows;
  end if;

  return true;
end;
$$;

revoke all on function public.process_paddle_subscription_event(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.process_paddle_subscription_event(text, text, text, text, text)
  to service_role;

comment on table public.paddle_webhook_events is
  'Processed Paddle event IDs used to make webhook delivery idempotent.';
