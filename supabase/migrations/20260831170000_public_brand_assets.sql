-- Brand imagery is rendered on public capture pages, so it needs stable public
-- URLs rather than signed links that expire and disappear from the landing.
update storage.buckets
set public = true
where id = 'brand-assets';

drop policy if exists "brand assets public read" on storage.objects;
create policy "brand assets public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'brand-assets');
