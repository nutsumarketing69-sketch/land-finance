-- ถังเก็บรูปโฉนดแบบส่วนตัว
-- สมาชิกอัปโหลดและอ่านได้เฉพาะไฟล์ที่อยู่ในโฟลเดอร์ของตนเอง
-- พาธไฟล์ต้องขึ้นต้นด้วยรหัสผู้ใช้ เช่น {auth.uid()}/ชื่อไฟล์.jpg
-- ถ้ายังไม่มีสคีมา storage ให้รันไฟล์นี้บนโปรเจกต์ Supabase ที่มี Storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deed-images',
  'deed-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists deed_images_insert_own on storage.objects;
drop policy if exists deed_images_select_own on storage.objects;
drop policy if exists deed_images_update_own on storage.objects;
drop policy if exists deed_images_delete_own on storage.objects;

create policy deed_images_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'deed-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy deed_images_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'deed-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy deed_images_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'deed-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'deed-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy deed_images_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'deed-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
