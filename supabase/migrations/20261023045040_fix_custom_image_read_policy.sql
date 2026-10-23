begin;
alter policy custom_image_read on storage.objects using(bucket_id='custom-requests' and exists(select 1 from public.custom_requests r where r.image_path=storage.objects.name and (r.user_id=(select auth.uid()) or (select private.is_admin()))));
commit;
