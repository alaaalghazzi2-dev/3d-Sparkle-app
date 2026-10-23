begin;
create table private.catalogue_key(id boolean primary key default true check(id),key_hash text not null);
create table private.catalogue_models(source text not null check(source in ('makeronline','cults')),model_id text not null,metadata jsonb not null,updated_at timestamptz not null default now(),primary key(source,model_id));
alter table private.catalogue_key enable row level security;
alter table private.catalogue_models enable row level security;
revoke all on private.catalogue_key,private.catalogue_models from public,anon,authenticated;
-- Server-only capability: permits catalogue metadata writes, never customer data reads.
create function private.cache_catalogue(p_key text,p_posts jsonb) returns void language plpgsql security definer set search_path='' as $$
declare p jsonb;
begin
 if p_key is null or not exists(select 1 from private.catalogue_key where key_hash=encode(sha256(convert_to(p_key,'UTF8')),'hex')) then raise exception 'Not authorized'; end if;
 if jsonb_typeof(p_posts)<>'array' or jsonb_array_length(p_posts)>100 then raise exception 'Invalid catalogue'; end if;
 for p in select value from jsonb_array_elements(p_posts) loop
  if p->>'source' not in ('makeronline','cults') or length(p->>'title') not between 1 and 500 or (p->>'image') !~ '^https://' then raise exception 'Invalid model'; end if;
  insert into private.catalogue_models(source,model_id,metadata) values(p->>'source',p->>'id',p)
  on conflict(source,model_id) do update set metadata=excluded.metadata,updated_at=now();
 end loop;
end;$$;
create function public.cache_catalogue(p_key text,p_posts jsonb) returns void language sql security invoker set search_path='' as $$select private.cache_catalogue(p_key,p_posts);$$;
revoke all on function private.cache_catalogue(text,jsonb),public.cache_catalogue(text,jsonb) from public;
grant execute on function private.cache_catalogue(text,jsonb),public.cache_catalogue(text,jsonb) to anon,authenticated;
-- Publish only product metadata and aggregate counts; no order/customer fields.
create function private.customer_choices() returns jsonb language sql stable security definer set search_path='' as $$
 with requests as (
 select model_source,model_id,quantity from public.orders where status<>'cancelled'
 union all select model_source,model_id,quantity from private.guest_order_requests
 ), ranked as (
 select model_source,model_id,count(*) as requests,sum(quantity) as units from requests group by model_source,model_id
 ), cards as (
 select r.*,c.metadata from ranked r join private.catalogue_models c on c.source=r.model_source and c.model_id=r.model_id
 order by r.requests desc,r.units desc,r.model_source,r.model_id limit 48
 ) select coalesce(jsonb_agg(jsonb_build_object('source',model_source,'id',model_id,'title',metadata->>'title','image',metadata->>'image','modelPath',coalesce(metadata->>'modelPath',''),'creator',coalesce(metadata->>'creator',''),'license',coalesce(metadata->>'license',''),'licenseUrl',coalesce(metadata->>'licenseUrl',''),'requests',requests,'units',units) order by requests desc,units desc,model_source,model_id),'[]'::jsonb) from cards;
$$;
create function public.customer_choices() returns jsonb language sql stable security invoker set search_path='' as $$select private.customer_choices();$$;
revoke all on function private.customer_choices(),public.customer_choices() from public;
grant execute on function private.customer_choices(),public.customer_choices() to anon,authenticated;
commit;
