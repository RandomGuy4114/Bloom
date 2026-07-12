create table if not exists public.supporter_checkout_transactions (
  transaction_id text primary key check (transaction_id ~ '^txn_[a-z0-9]{26}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.supporter_checkout_transactions enable row level security;

revoke all on table public.supporter_checkout_transactions from public, anon, authenticated;
grant select, insert, update, delete on table public.supporter_checkout_transactions to service_role;

comment on table public.supporter_checkout_transactions is
  'Server-owned Paddle transaction-to-user bindings. Fulfillment must use this table instead of client-provided custom data.';
