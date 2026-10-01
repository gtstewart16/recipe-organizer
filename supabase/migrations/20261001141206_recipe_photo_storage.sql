-- The app currently uses one shared recipe library with anonymous recipe access.
-- Keep media private; signing and new uploads require an existing visible recipe.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif', 'image/avif'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Read photos for accessible recipes"
on storage.objects for select to anon, authenticated
using (bucket_id = 'recipe-photos' and exists (
  select 1 from public.recipes
  where recipes.id::text = (storage.foldername(name))[1]
));

create policy "Upload photos for accessible recipes"
on storage.objects for insert to anon, authenticated
with check (bucket_id = 'recipe-photos' and exists (
  select 1 from public.recipes
  where recipes.id::text = (storage.foldername(name))[1]
));

-- Allow compensation if an upload succeeds but saving its reference fails.
create policy "Remove photos for accessible recipes"
on storage.objects for delete to anon, authenticated
using (bucket_id = 'recipe-photos' and exists (
  select 1 from public.recipes
  where recipes.id::text = (storage.foldername(name))[1]
));
