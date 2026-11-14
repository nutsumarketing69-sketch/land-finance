-- บทบาท owner อยู่เหนือ admin
-- owner อ่าน เขียน และลบข้อมูลที่ดินทุกแถว รวมรูปโฉนดและโปรไฟล์
-- admin และ member ยังอยู่ในขอบเขตเดิม และ admin ตั้งบทบาท owner ไม่ได้

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('owner', 'admin', 'member'));

comment on column public.profiles.role is
  'บทบาท: owner คือเจ้าของระบบที่จัดการทุกแถว, admin คือผู้ดูแลร้าน, member คือสมาชิก';

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'owner'
  );
$$;

comment on function public.is_owner() is
  'ตรวจบทบาท owner ของผู้ใช้ปัจจุบัน โดยไม่ทำให้ policy ของ profiles เรียกตัวเองซ้ำ';

create or replace function public.profile_role(target uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = target;
$$;

comment on function public.profile_role(uuid) is
  'บทบาทที่บันทึกไว้ของโปรไฟล์ที่ระบุ ใช้กันไม่ให้ admin แก้แถวของ owner';

revoke all on function public.is_owner() from public;
revoke all on function public.profile_role(uuid) from public;
grant execute on function public.is_owner() to authenticated, service_role;
grant execute on function public.profile_role(uuid) to authenticated, service_role;

drop policy if exists profiles_insert_self_or_admin on public.profiles;
drop policy if exists profiles_update_own_or_admin on public.profiles;
drop policy if exists profiles_delete_own_or_admin on public.profiles;
drop policy if exists profiles_select_owner on public.profiles;

create policy profiles_select_owner
on public.profiles
for select
to authenticated
using (public.is_owner());

create policy profiles_insert_self_or_admin
on public.profiles
for insert
to authenticated
with check (
  public.is_owner()
  or (public.is_admin() and role in ('admin', 'member'))
  or (id = auth.uid() and role = 'member')
);

create policy profiles_update_own_or_admin
on public.profiles
for update
to authenticated
using (
  public.is_owner()
  or (public.is_admin() and public.profile_role(id) is distinct from 'owner')
  or id = auth.uid()
)
with check (
  public.is_owner()
  or (
    public.is_admin()
    and public.profile_role(id) is distinct from 'owner'
    and role in ('admin', 'member')
  )
  or (
    id = auth.uid()
    and role = public.current_profile_role()
    and public.current_profile_role() is distinct from 'owner'
  )
);

create policy profiles_delete_own_or_admin
on public.profiles
for delete
to authenticated
using (
  public.is_owner()
  or (public.is_admin() and public.profile_role(id) is distinct from 'owner')
  or (id = auth.uid() and public.profile_role(id) is distinct from 'owner')
);

drop policy if exists customers_owner_role_all on public.customers;
create policy customers_owner_role_all
on public.customers
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists land_assets_owner_role_all on public.land_assets;
create policy land_assets_owner_role_all
on public.land_assets
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists contracts_owner_role_all on public.contracts;
create policy contracts_owner_role_all
on public.contracts
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists commission_splits_owner_role_all on public.commission_splits;
create policy commission_splits_owner_role_all
on public.commission_splits
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists deed_images_owner_all on storage.objects;
create policy deed_images_owner_all
on storage.objects
for all
to authenticated
using (bucket_id = 'deed-images' and public.is_owner())
with check (bucket_id = 'deed-images' and public.is_owner());
