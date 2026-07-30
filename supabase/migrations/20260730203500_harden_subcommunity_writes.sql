revoke insert, update, delete, truncate
  on public.sub_communities
  from anon, authenticated;

revoke all
  on function public.create_subcommunity(uuid, text, text)
  from public, anon;
revoke all
  on function public.update_subcommunity(bigint, text, text)
  from public, anon;
revoke all
  on function public.delete_subcommunity(bigint)
  from public, anon;

grant execute
  on function public.create_subcommunity(uuid, text, text)
  to authenticated;
grant execute
  on function public.update_subcommunity(bigint, text, text)
  to authenticated;
grant execute
  on function public.delete_subcommunity(bigint)
  to authenticated;
