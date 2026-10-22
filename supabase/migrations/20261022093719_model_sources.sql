begin;
alter table public.orders add column model_source text not null default 'makeronline' check (model_source in ('makeronline','cults'));
alter table public.orders add column model_path text not null default '' check (length(model_path)<=1000 and (model_path='' or model_path like '/en/3d-model/%'));
alter table public.orders drop constraint orders_model_id_check;
alter table public.orders add constraint orders_model_id_check check ((model_source='makeronline' and model_id ~ '^[0-9]{1,15}$') or (model_source='cults' and model_id ~ '^[A-Za-z0-9_-]{1,100}$'));
grant insert(model_source,model_path) on public.orders to authenticated;
commit;
