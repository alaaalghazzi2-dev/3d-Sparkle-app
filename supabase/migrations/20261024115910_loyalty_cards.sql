begin;
alter table public.orders add column unit_price_syp numeric(14,2) check(unit_price_syp>=0 and unit_price_syp<=999999999999.99);
alter table public.custom_requests add column unit_price_syp numeric(14,2) check(unit_price_syp>=0 and unit_price_syp<=999999999999.99);
grant update(unit_price_syp) on public.orders,public.custom_requests to authenticated;
create table public.loyalty_rewards(
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 gift text not null check(length(btrim(gift)) between 1 and 200),
 delivered_by uuid references auth.users(id) on delete set null,
 delivered_at timestamptz not null default now()
);
create index loyalty_rewards_user_idx on public.loyalty_rewards(user_id,delivered_at desc);
alter table public.loyalty_rewards enable row level security;
revoke all on public.loyalty_rewards from public,anon,authenticated;
grant select on public.loyalty_rewards to authenticated;
create policy loyalty_rewards_read on public.loyalty_rewards for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
-- Serialize qualifying order edits with gift redemption for the same customer.
create function private.lock_loyalty_order() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.user_id is not null then perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,741)); end if;
 if new.status='completed' and new.unit_price_syp is null then raise exception 'Unit price required before completion'; end if;
 return new;
end;$$;
revoke all on function private.lock_loyalty_order() from public,anon,authenticated;
create trigger loyalty_order_update before update of status,unit_price_syp on public.orders for each row execute function private.lock_loyalty_order();
create trigger loyalty_custom_update before update of status,unit_price_syp on public.custom_requests for each row execute function private.lock_loyalty_order();
create function private.loyalty_status(p_user uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare total bigint; redeemed bigint; remaining bigint;
begin
 if auth.uid() is null or (p_user is distinct from auth.uid() and not private.is_admin()) then raise exception 'Not authorized'; end if;
 select coalesce(sum(quantity),0) into total from (
 select quantity from public.orders where user_id=p_user and status='completed' and unit_price_syp>500
 union all select quantity from public.custom_requests where user_id=p_user and status='completed' and unit_price_syp>500
 ) q;
 select count(*) into redeemed from public.loyalty_rewards where user_id=p_user;
 remaining:=greatest(total-redeemed*5,0);
 return jsonb_build_object('eligible_units',total,'delivered_rewards',redeemed,'available_rewards',remaining/5,'progress',remaining%5,'next_needed',5-remaining%5,'adjustment_units',greatest(redeemed*5-total,0));
end;$$;
create function public.loyalty_status(p_user uuid default auth.uid()) returns jsonb language sql stable security invoker set search_path='' as $$select private.loyalty_status(p_user);$$;
create function private.loyalty_customers(p_ids uuid[]) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'Administrator required'; end if;
 if coalesce(cardinality(p_ids),0)>50 then raise exception 'Too many customers'; end if;
 return coalesce((select jsonb_object_agg(u::text,private.loyalty_status(u)) from unnest(p_ids) u),'{}'::jsonb);
end;$$;
create function public.loyalty_customers(p_ids uuid[]) returns jsonb language sql stable security invoker set search_path='' as $$select private.loyalty_customers(p_ids);$$;
create function private.deliver_loyalty_gift(p_user uuid,p_request uuid,p_gift text) returns jsonb language plpgsql security definer set search_path='' as $$
declare existing uuid; info jsonb;
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'Administrator required'; end if;
 if p_user is null or p_request is null or length(btrim(p_gift)) not between 1 and 200 or p_gift is null then raise exception 'Invalid gift'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,741));
 select user_id into existing from public.loyalty_rewards where id=p_request;
 if found then
  if existing<>p_user then raise exception 'Invalid request'; end if;
  return private.loyalty_status(p_user);
 end if;
 info:=private.loyalty_status(p_user);
 if (info->>'available_rewards')::bigint<1 then raise exception 'No gift available'; end if;
 insert into public.loyalty_rewards(id,user_id,gift,delivered_by) values(p_request,p_user,btrim(p_gift),auth.uid());
 return private.loyalty_status(p_user);
end;$$;
create function public.deliver_loyalty_gift(p_user uuid,p_request uuid,p_gift text) returns jsonb language sql security invoker set search_path='' as $$select private.deliver_loyalty_gift(p_user,p_request,p_gift);$$;
revoke all on function private.loyalty_status(uuid),public.loyalty_status(uuid),private.loyalty_customers(uuid[]),public.loyalty_customers(uuid[]),private.deliver_loyalty_gift(uuid,uuid,text),public.deliver_loyalty_gift(uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.loyalty_status(uuid),public.loyalty_status(uuid),private.loyalty_customers(uuid[]),public.loyalty_customers(uuid[]),private.deliver_loyalty_gift(uuid,uuid,text),public.deliver_loyalty_gift(uuid,uuid,text) to authenticated;
commit;
