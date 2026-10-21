begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default '' check(length(name)<=100),
 phone text not null default '' check(length(phone)<=30),
 address text not null default '' check(length(address)<=500),
 marketing_opt_in boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admins where user_id=auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
create table public.messages (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 150),
 body text not null check(length(body) between 1 and 4000),
 kind text not null default 'offer' check(kind in ('welcome','offer','announcement')),
 created_at timestamptz not null default now()
);
create index on public.messages(recipient_id,created_at desc);
create table public.orders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 model_id text not null check(model_id ~ '^[0-9]{1,15}$'),
 model_title text not null check(length(model_title) between 1 and 500),
 name text not null check(length(name) between 1 and 100),
 phone text not null check(length(phone) between 8 and 30),
 address text not null check(length(address) between 1 and 500),
 quantity integer not null check(quantity between 1 and 1000),
 notes text not null default '' check(length(notes)<=1000),
 status text not null default 'quote_requested' check(status in ('quote_requested','contacted','confirmed','completed','cancelled')),
 created_at timestamptz not null default now()
);
create index on public.orders(user_id,created_at desc);
alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.orders enable row level security;
revoke all on public.profiles,public.messages,public.orders,public.admins from anon,authenticated;
grant select on public.profiles,public.messages,public.orders to authenticated;
grant update(name,phone,address,marketing_opt_in) on public.profiles to authenticated;
grant insert(title,body,recipient_id,kind) on public.messages to authenticated;
grant delete on public.messages to authenticated;
grant insert(user_id,model_id,model_title,name,phone,address,quantity,notes) on public.orders to authenticated;
grant update(status) on public.orders to authenticated;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy messages_read on public.messages for select to authenticated using(
 public.is_admin() or ((recipient_id=auth.uid() or recipient_id is null) and
 (kind<>'offer' or exists(select 1 from public.profiles where id=auth.uid() and marketing_opt_in)))
);
create policy messages_insert on public.messages for insert to authenticated with check(public.is_admin());
create policy messages_delete on public.messages for delete to authenticated using(public.is_admin());
create policy orders_read on public.orders for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy orders_insert on public.orders for insert to authenticated with check(user_id=auth.uid() and status='quote_requested');
create policy orders_update on public.orders for update to authenticated using(public.is_admin()) with check(public.is_admin());
create function public.on_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,name,phone,address,marketing_opt_in)
 values(new.id,left(coalesce(new.raw_user_meta_data->>'name',''),100),left(coalesce(new.raw_user_meta_data->>'phone',''),30),left(coalesce(new.raw_user_meta_data->>'address',''),500),coalesce(new.raw_user_meta_data->>'marketing_opt_in','false')='true');
 insert into public.messages(recipient_id,title,body,kind) values(new.id,'أهلًا بك في Sparkle 3D','يسعدنا انضمامك! اختر النموذج الذي يعجبك واطلب عرض سعر، وسنتواصل معك لتحديد الكلفة ومدة التسليم.','welcome');
 return new;
end;
$$;
revoke all on function public.on_signup() from public,anon,authenticated;
create trigger sparkle_signup after insert on auth.users for each row execute function public.on_signup();
commit;
