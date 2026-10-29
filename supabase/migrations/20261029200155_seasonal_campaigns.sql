begin;
create table public.campaigns(
 id uuid primary key default gen_random_uuid(),slug text unique not null check(slug~'^[a-z0-9-]{1,80}$'),
 title text not null check(length(title) between 1 and 100),description text not null default '' check(length(description)<=1000),
 keywords text not null default '' check(length(keywords)<=120),starts_on date not null,ends_on date not null,
 discount integer not null default 0 check(discount between 0 and 90),published boolean not null default false,paused boolean not null default false,
 poster text not null default '' check(length(poster)<=1800000 and (poster='' or poster~'^data:image/jpeg;base64,[A-Za-z0-9+/=]+$')),
 color text not null default '#6543a6' check(color~'^#[0-9a-fA-F]{6}$'),created_at timestamptz not null default now(),
 check(ends_on>=starts_on),exclude using gist (daterange(starts_on,ends_on,'[]') with &&) where(published and not paused)
);
create table public.campaign_items(
 campaign_id uuid not null references public.campaigns(id) on delete cascade,source text not null check(source in ('makeronline','cults')),model_id text not null check(length(model_id) between 1 and 100),
 title text not null check(length(title) between 1 and 500),image text not null check(image like 'https://%' and length(image)<=3000),model_path text not null default '' check(length(model_path)<=1500),creator text not null default '',license text not null default '',license_url text not null default '',approved boolean not null default false,
 primary key(campaign_id,source,model_id)
);
alter table public.campaigns enable row level security;alter table public.campaign_items enable row level security;
revoke all on public.campaigns,public.campaign_items from public,anon,authenticated;
grant select on public.campaigns,public.campaign_items to anon,authenticated;
grant insert,update,delete on public.campaigns,public.campaign_items to authenticated;
create policy campaign_public on public.campaigns for select to anon,authenticated using(published);
create policy campaign_admin on public.campaigns for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy items_public on public.campaign_items for select to anon,authenticated using(approved and exists(select 1 from public.campaigns c where c.id=campaign_id and c.published));
create policy items_admin on public.campaign_items for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.orders add column campaign_id uuid references public.campaigns(id) on delete set null,add column campaign_title text,add column campaign_discount integer;
grant insert(campaign_id) on public.orders to authenticated;
create function private.campaign_order() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.campaigns;today date:=(now() at time zone 'Asia/Damascus')::date;
begin
 new.campaign_title:=null;new.campaign_discount:=null;
 if new.campaign_id is not null then
 select * into c from public.campaigns where id=new.campaign_id and published and not paused and today between starts_on and ends_on;
 if c.id is null or not exists(select 1 from public.campaign_items where campaign_id=c.id and approved and source=new.model_source and model_id=new.model_id) then raise exception 'Campaign expired or product not approved';end if;
 new.campaign_title:=c.title;new.campaign_discount:=c.discount;
 end if;return new;
end;$$;
revoke all on function private.campaign_order() from public,anon,authenticated;
create trigger campaign_order before insert on public.orders for each row execute function private.campaign_order();
insert into public.campaigns(slug,title,description,keywords,starts_on,ends_on,discount) values('your-name-sparkle-nov-2026','اسمك… بلمسة Sparkle ✨','أسماء مخصصة وميداليات وتعليقات للحقائب والمفاتيح. خصم 20% على جميع منتجات الحملة مع استمرار بطاقة الولاء وفق شروطها.','personalized name keychain','2026-11-01','2026-11-15',20);
commit;
