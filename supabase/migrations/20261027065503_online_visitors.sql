begin;
create table private.online_visitors(visitor_id uuid primary key,user_id uuid references auth.users(id) on delete cascade,last_seen timestamptz not null default now());
create index online_visitors_seen_idx on private.online_visitors(last_seen);
alter table private.online_visitors enable row level security;
revoke all on private.online_visitors from public,anon,authenticated;
create function private.heartbeat(p_visitor_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_visitor_id is null then raise exception 'Visitor required'; end if;
 if auth.uid() is not null and private.is_admin() then
 delete from private.online_visitors where visitor_id=p_visitor_id;return;
 end if;
 insert into private.online_visitors(visitor_id,user_id) values(p_visitor_id,auth.uid())
 on conflict(visitor_id) do update set user_id=excluded.user_id,last_seen=now();
 delete from private.online_visitors where last_seen<now()-interval '1 day';
end;$$;
revoke all on function private.heartbeat(uuid) from public,anon,authenticated;
grant execute on function private.heartbeat(uuid) to anon,authenticated;
create function public.heartbeat(p_visitor_id uuid) returns void language sql security invoker set search_path='' as $$select private.heartbeat(p_visitor_id)$$;
revoke all on function public.heartbeat(uuid) from public;
grant execute on function public.heartbeat(uuid) to anon,authenticated;
create function private.online_summary() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r bigint;g bigint;
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'Administrator required';end if;
 select count(distinct user_id),count(*) filter(where user_id is null) into r,g from private.online_visitors where last_seen>now()-interval '5 minutes';
 return jsonb_build_object('total',r+g,'registered',r,'guests',g);
end;$$;
revoke all on function private.online_summary() from public,anon,authenticated;
grant execute on function private.online_summary() to authenticated;
create function public.online_summary() returns jsonb language sql stable security invoker set search_path='' as $$select private.online_summary()$$;
revoke all on function public.online_summary() from public,anon;
grant execute on function public.online_summary() to authenticated;
commit;
