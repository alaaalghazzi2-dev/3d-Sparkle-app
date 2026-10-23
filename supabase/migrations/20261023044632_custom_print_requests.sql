begin;
grant usage on schema private to anon,authenticated;
create table public.custom_requests (
 id uuid primary key,
 user_id uuid references auth.users(id) on delete set null,
 image_path text not null unique,
 name text not null check(length(btrim(name)) between 2 and 100),
 phone text not null check(phone ~ '^[+0-9 ()-]{8,30}$'),
 address text not null default '' check(length(address)<=500),
 description text not null check(length(btrim(description)) between 3 and 2000),
 color text not null check(length(btrim(color)) between 1 and 100),
 length_cm numeric not null check(length_cm>0 and length_cm<=200),
 width_cm numeric not null check(width_cm>0 and width_cm<=200),
 height_cm numeric not null check(height_cm>0 and height_cm<=200),
 quantity integer not null check(quantity between 1 and 100),
 status text not null default 'uploading' check(status in ('uploading','quote_requested','contacted','confirmed','completed','cancelled')),
 created_at timestamptz not null default now(),
 check(image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' and split_part(image_path,'/',1)=id::text)
);
create index custom_requests_user_idx on public.custom_requests(user_id,created_at desc);
create index custom_requests_date_idx on public.custom_requests(created_at desc);
alter table public.custom_requests enable row level security;
revoke all on public.custom_requests from public,anon,authenticated;
grant select on public.custom_requests to authenticated;
grant update(status) on public.custom_requests to authenticated;
create policy custom_requests_read on public.custom_requests for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy custom_requests_admin_update on public.custom_requests for update to authenticated using((select private.is_admin())) with check((select private.is_admin()) and status<>'uploading');

-- Guests use an unguessable, per-request upload capability; no guest read access.
-- The private definer functions deliberately support auth.uid() IS NULL for guests.
create function private.start_custom_request(p_id uuid,p_token uuid,p_details jsonb) returns text
language plpgsql security definer set search_path='' as $$
declare existing public.custom_requests; path text;
begin
 if p_id is null or p_token is null or p_details is null then raise exception 'Missing request'; end if;
 path:=p_id::text||'/'||p_token::text||'.jpg';
 perform pg_advisory_xact_lock(8294312);
 select * into existing from public.custom_requests where id=p_id;
 if found then
  if existing.image_path<>path or existing.user_id is distinct from auth.uid() then raise exception 'Invalid request'; end if;
  return existing.status;
 end if;
 if (select count(*) from public.custom_requests where created_at>now()-interval '1 day')>=200
 or (select count(*) from public.custom_requests where created_at>now()-interval '1 hour' and regexp_replace(phone,'[^0-9]','','g')=regexp_replace(p_details->>'phone','[^0-9]','','g'))>=5 then
  raise exception 'Request limit reached';
 end if;
 insert into public.custom_requests(id,user_id,image_path,name,phone,address,description,color,length_cm,width_cm,height_cm,quantity)
 values(p_id,auth.uid(),path,p_details->>'name',p_details->>'phone',coalesce(p_details->>'address',''),p_details->>'description',p_details->>'color',
 (p_details->>'length_cm')::numeric,(p_details->>'width_cm')::numeric,(p_details->>'height_cm')::numeric,(p_details->>'quantity')::integer);
 return 'uploading';
end;$$;
create function private.can_upload_custom(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.custom_requests where image_path=p_path and user_id is not distinct from auth.uid() and status='uploading' and created_at>now()-interval '1 day');
$$;
create function private.finish_custom_request(p_id uuid,p_token uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.custom_requests;
begin
 select * into r from public.custom_requests where id=p_id for update;
 if not found or p_token is null or r.image_path<>p_id::text||'/'||p_token::text||'.jpg' or r.user_id is distinct from auth.uid() then raise exception 'Invalid request'; end if;
 if not exists(select 1 from storage.objects where bucket_id='custom-requests' and name=r.image_path) then raise exception 'Image required'; end if;
 if r.status='uploading' then update public.custom_requests set status='quote_requested' where id=p_id; end if;
end;$$;
revoke all on function private.start_custom_request(uuid,uuid,jsonb),private.can_upload_custom(text),private.finish_custom_request(uuid,uuid) from public,anon,authenticated;
grant execute on function private.start_custom_request(uuid,uuid,jsonb),private.can_upload_custom(text),private.finish_custom_request(uuid,uuid) to anon,authenticated;
create function public.start_custom_request(p_id uuid,p_token uuid,p_details jsonb) returns text language sql security invoker set search_path='' as $$select private.start_custom_request(p_id,p_token,p_details);$$;
create function public.finish_custom_request(p_id uuid,p_token uuid) returns void language sql security invoker set search_path='' as $$select private.finish_custom_request(p_id,p_token);$$;
revoke all on function public.start_custom_request(uuid,uuid,jsonb),public.finish_custom_request(uuid,uuid) from public;
grant execute on function public.start_custom_request(uuid,uuid,jsonb),public.finish_custom_request(uuid,uuid) to anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('custom-requests','custom-requests',false,1048576,array['image/jpeg']);
create policy custom_image_upload on storage.objects for insert to anon,authenticated with check(bucket_id='custom-requests' and private.can_upload_custom(name));
create policy custom_image_read on storage.objects for select to authenticated using(bucket_id='custom-requests' and exists(select 1 from public.custom_requests r where r.image_path=name and (r.user_id=(select auth.uid()) or (select private.is_admin()))));
commit;
