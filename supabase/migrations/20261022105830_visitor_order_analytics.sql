begin;
-- Browser identifiers are random; no IP address or browsing history is stored.
create table private.visitor_days (
 visitor_id uuid not null,
 visit_day date not null,
 user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 primary key(visitor_id,visit_day)
);
create index visitor_days_date_idx on private.visitor_days(visit_day,visitor_id);
alter table private.visitor_days enable row level security;
revoke all on private.visitor_days from public,anon,authenticated;
create table private.guest_order_requests (
 request_id uuid primary key,
 model_source text not null check(model_source in ('makeronline','cults')),
 model_id text not null,
 model_title text not null check(length(model_title) between 1 and 500),
 quantity integer not null check(quantity between 1 and 1000),
 created_at timestamptz not null default now(),
 check ((model_source='makeronline' and model_id ~ '^[0-9]{1,15}$') or
 (model_source='cults' and model_id ~ '^[A-Za-z0-9_-]{1,100}$'))
);
create index guest_order_requests_date_idx on private.guest_order_requests(created_at);
create index orders_analytics_date_idx on public.orders(created_at) where status<>'cancelled';
alter table private.guest_order_requests enable row level security;
revoke all on private.guest_order_requests from public,anon,authenticated;
-- Narrow write-only entry points intentionally allow guests. Identity comes from auth.uid().
create function private.record_visit(p_visitor_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_visitor_id is null then raise exception 'Visitor id required'; end if;
 if auth.uid() is not null and private.is_admin() then return; end if;
 insert into private.visitor_days(visitor_id,visit_day,user_id)
 values(p_visitor_id,(now() at time zone 'Asia/Damascus')::date,auth.uid())
 on conflict(visitor_id,visit_day) do update set user_id=coalesce(excluded.user_id,private.visitor_days.user_id)
 where excluded.user_id is not null and private.visitor_days.user_id is distinct from excluded.user_id;
end;$$;
revoke all on function private.record_visit(uuid) from public,anon,authenticated;
grant usage on schema private to anon;
grant execute on function private.record_visit(uuid) to anon,authenticated;
create function public.record_visit(p_visitor_id uuid) returns void
language sql security invoker set search_path='' as $$ select private.record_visit(p_visitor_id); $$;
revoke all on function public.record_visit(uuid) from public;
grant execute on function public.record_visit(uuid) to anon,authenticated;
create function private.record_guest_request(p_request_id uuid,p_source text,p_model_id text,p_title text,p_quantity integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null then raise exception 'Guest entry point only'; end if;
 insert into private.guest_order_requests(request_id,model_source,model_id,model_title,quantity)
 values(p_request_id,p_source,p_model_id,p_title,p_quantity) on conflict(request_id) do nothing;
end;$$;
revoke all on function private.record_guest_request(uuid,text,text,text,integer) from public,anon,authenticated;
grant execute on function private.record_guest_request(uuid,text,text,text,integer) to anon;
create function public.record_guest_request(p_request_id uuid,p_source text,p_model_id text,p_title text,p_quantity integer) returns void
language sql security invoker set search_path='' as $$ select private.record_guest_request(p_request_id,p_source,p_model_id,p_title,p_quantity); $$;
revoke all on function public.record_guest_request(uuid,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.record_guest_request(uuid,text,text,text,integer) to anon;
create function private.dashboard_analytics(p_days integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare start_day date; visitors jsonb; products jsonb; request_count bigint; daily jsonb;
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'Administrator required'; end if;
 if p_days is null or p_days not in (0,1,7,30,90) then raise exception 'Invalid period'; end if;
 start_day:=case when p_days=0 then null else (now() at time zone 'Asia/Damascus')::date-(p_days-1) end;
 select jsonb_build_object('total',count(*),'registered',count(*) filter(where registered),'guests',count(*) filter(where not registered)) into visitors
 from (select visitor_id,bool_or(user_id is not null) as registered from private.visitor_days
 where start_day is null or visit_day>=start_day group by visitor_id) v;
 with requests as (
 select model_source,model_id,model_title,quantity,created_at,true as registered from public.orders where status<>'cancelled'
 union all select model_source,model_id,model_title,quantity,created_at,false from private.guest_order_requests
 ), filtered as (select * from requests where start_day is null or created_at>=start_day::timestamp at time zone 'Asia/Damascus'),
 ranked as (select model_source,model_id,(array_agg(model_title order by created_at desc))[1] as title,
 count(*) as requests,sum(quantity) as units,count(*) filter(where registered) as registered_requests,count(*) filter(where not registered) as guest_requests
 from filtered group by model_source,model_id order by count(*) desc,sum(quantity) desc,model_source,model_id limit 50)
 select coalesce((select jsonb_agg(to_jsonb(r) order by r.requests desc,r.units desc,r.model_source,r.model_id) from ranked r),'[]'::jsonb),(select count(*) from filtered) into products,request_count;
 select coalesce(jsonb_agg(to_jsonb(d) order by visit_day desc),'[]'::jsonb) into daily from
 (select visit_day,count(*) as total,count(*) filter(where user_id is not null) as registered,count(*) filter(where user_id is null) as guests
 from private.visitor_days where start_day is null or visit_day>=start_day group by visit_day order by visit_day desc limit 90) d;
 return jsonb_build_object('visitors',visitors,'products',products,'requests',request_count,'daily',daily,'days',p_days);
end;$$;
revoke all on function private.dashboard_analytics(integer) from public,anon,authenticated;
grant execute on function private.dashboard_analytics(integer) to authenticated;
create function public.dashboard_analytics(p_days integer default 30) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.dashboard_analytics(p_days); $$;
revoke all on function public.dashboard_analytics(integer) from public,anon;
grant execute on function public.dashboard_analytics(integer) to authenticated;
commit;
