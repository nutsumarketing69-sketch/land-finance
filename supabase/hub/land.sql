-- Land Desk on the hub project https://aozoakeghslgnhdegdyr.supabase.co
-- Paste this file once in the Hub SQL editor. It creates schema land only.
-- Tables: profiles, customers, land_assets, contracts, commission_splits.
-- No rows are copied. No auth users are created. The old project
-- https://fahkknzinragbeizymny.supabase.co is not changed.
-- Schemas public, dmck, and coupon are not altered.
-- Air shop tables are not part of this file.
--
-- The signup trigger on auth.users returns immediately unless
-- raw_user_meta_data.account_kind is land_member.
-- Deed-image storage is the private bucket deed-images only.
--
-- After this paste, open Hub → Project Settings → Data API → Exposed schemas
-- and add land if it is not already listed. The block at the bottom appends
-- land to an existing authenticator schema list and does not remove names.

create schema if not exists land;

comment on schema land is
  'Land Desk. Hub auth users stay in auth.users. Air shop data is not stored here.';

revoke all on schema land from public;
grant usage on schema land to anon, authenticated, service_role, authenticator;

create table if not exists land.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text unique,
  full_name text,
  invite_code text unique,
  referred_by uuid references land.profiles (id) on delete set null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  constraint profiles_referred_by_not_self check (referred_by is null or referred_by <> id)
);

comment on table land.profiles is 'โปรไฟล์ผู้ใช้ ผูกกับบัญชี Supabase Auth และเป็นเจ้าของข้อมูลสัญญา';
comment on column land.profiles.role is
  'บทบาท: owner คือเจ้าของระบบที่จัดการทุกแถว, admin คือผู้ดูแลร้าน, member คือสมาชิก';
comment on column land.profiles.invite_code is 'รหัสเชิญที่ไม่ซ้ำ สำหรับอ้างอิงผู้แนะนำ';
comment on column land.profiles.referred_by is 'โปรไฟล์ของผู้ที่แนะนำสมาชิกคนนี้';

create or replace function land.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from land.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

comment on function land.is_admin() is
  'ตรวจบทบาท admin ของผู้ใช้ปัจจุบัน โดยไม่ทำให้ policy ของ profiles เรียกตัวเองซ้ำ';

create or replace function land.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from land.profiles
  where id = auth.uid();
$$;

comment on function land.current_profile_role() is
  'บทบาทที่บันทึกไว้แล้วของผู้ใช้ปัจจุบัน ใช้อ่านโดยไม่วนลูปกับ policy ของ profiles';

create or replace function land.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from land.profiles
    where id = auth.uid()
      and role = 'owner'
  );
$$;

comment on function land.is_owner() is
  'ตรวจบทบาท owner ของผู้ใช้ปัจจุบัน โดยไม่ทำให้ policy ของ profiles เรียกตัวเองซ้ำ';

create or replace function land.profile_role(target uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from land.profiles
  where id = target;
$$;

comment on function land.profile_role(uuid) is
  'บทบาทที่บันทึกไว้ของโปรไฟล์ที่ระบุ ใช้กันไม่ให้ admin แก้แถวของ owner';

create or replace function land.generate_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  candidate text;
  attempt int;
  index int;
begin
  for attempt in 1..20 loop
    candidate := '';
    for index in 1..8 loop
      candidate := candidate || substr(alphabet, (1 + floor(random() * length(alphabet)))::int, 1);
    end loop;
    exit when not exists (
      select 1 from land.profiles where invite_code = candidate
    );
  end loop;

  if exists (select 1 from land.profiles where invite_code = candidate) then
    raise exception 'invite_code_exhausted';
  end if;
  return candidate;
end;
$$;

comment on function land.generate_invite_code() is
  'สุ่มรหัสแนะนำ 8 ตัว ที่ไม่ชนของเดิม และไม่มีตัวอักษรที่อ่านสับสน';

create or replace function land.lookup_inviter(code text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from land.profiles
  where invite_code = upper(trim(coalesce(code, '')))
  limit 1;
$$;

comment on function land.lookup_inviter(text) is
  'คืนรหัสโปรไฟล์ของผู้แนะนำจากรหัสเชิญ โดยไม่เปิดข้อมูลแถวอื่นให้ผู้ที่ยังไม่เข้าสู่ระบบ';

create or replace function land.handle_land_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := new.raw_user_meta_data;
  chosen text;
  inviter uuid;
  phone text;
  full_name text;
  attempt int;
begin
  if coalesce(meta->>'account_kind', '') <> 'land_member' then
    return new;
  end if;

  phone := nullif(trim(coalesce(meta->>'phone', '')), '');
  full_name := nullif(trim(coalesce(meta->>'full_name', '')), '');
  inviter := land.lookup_inviter(meta->>'referral_code');
  if inviter is null or phone is null then
    raise exception 'invalid_referral';
  end if;

  chosen := upper(trim(coalesce(meta->>'invite_code', '')));
  if chosen = '' or exists (select 1 from land.profiles where invite_code = chosen) then
    chosen := land.generate_invite_code();
  end if;

  for attempt in 1..5 loop
    begin
      insert into land.profiles (id, phone, full_name, invite_code, referred_by, role)
      values (new.id, phone, full_name, chosen, inviter, 'member');
      return new;
    exception
      when unique_violation then
        chosen := land.generate_invite_code();
    end;
  end loop;

  raise exception 'invite_code_exhausted';
end;
$$;

comment on function land.handle_land_profile() is
  'สร้างโปรไฟล์สมาชิกสัญญาที่ดินเมื่อสมัครด้วยลิงก์แนะนำ และไม่ยุ่งกับบัญชีอื่นของ Hub';

revoke all on function land.is_admin() from public;
revoke all on function land.current_profile_role() from public;
revoke all on function land.is_owner() from public;
revoke all on function land.profile_role(uuid) from public;
revoke all on function land.generate_invite_code() from public;
revoke all on function land.lookup_inviter(text) from public;
revoke all on function land.handle_land_profile() from public;

grant execute on function land.is_admin() to authenticated, service_role;
grant execute on function land.current_profile_role() to authenticated, service_role;
grant execute on function land.is_owner() to authenticated, service_role;
grant execute on function land.profile_role(uuid) to authenticated, service_role;
grant execute on function land.generate_invite_code() to anon, authenticated;
grant execute on function land.lookup_inviter(text) to anon, authenticated;
grant execute on function land.handle_land_profile() to supabase_auth_admin;

drop trigger if exists on_auth_user_created_land on auth.users;
create trigger on_auth_user_created_land
after insert on auth.users
for each row
execute function land.handle_land_profile();

create table if not exists land.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references land.profiles (id) on delete restrict,
  full_name text,
  phone text,
  id_card text,
  address text,
  created_at timestamptz not null default now()
);

comment on table land.customers is 'ลูกค้าของสัญญาที่ดิน แต่ละแถวเป็นของสมาชิกคนเดียวตาม owner_id';
comment on column land.customers.id_card is 'เลขบัตรประชาชนหรือเลขประจำตัวที่บันทึกเป็นข้อความ';

create table if not exists land.land_assets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references land.customers (id) on delete restrict,
  owner_id uuid not null references land.profiles (id) on delete restrict,
  deed_number text,
  province text,
  district text,
  area_size text,
  latitude numeric,
  longitude numeric,
  map_url text,
  appraised_value numeric,
  nearby_appraised_value numeric,
  deed_images text[] not null default '{}',
  created_at timestamptz not null default now()
);

comment on table land.land_assets is 'โฉนดหรือที่ดินที่ใช้เป็นหลักทรัพย์ของสัญญา';
comment on column land.land_assets.area_size is 'ขนาดที่ดินตามที่ระบุบนโฉนด เก็บเป็นข้อความตามต้นฉบับ';
comment on column land.land_assets.appraised_value is 'ราคาประเมินที่ใช้คิดสัดส่วนเงินกู้ต่อราคาประเมิน (LTV) หน่วยเป็นบาท เก็บแบบ numeric';
comment on column land.land_assets.nearby_appraised_value is 'ราคาประเมินของที่ดินข้างเคียง หน่วยเป็นบาท เก็บแบบ numeric';
comment on column land.land_assets.deed_images is 'รายการที่อยู่ไฟล์รูปโฉนด';

create table if not exists land.contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text,
  owner_id uuid not null references land.profiles (id) on delete restrict,
  customer_id uuid references land.customers (id) on delete restrict,
  land_id uuid references land.land_assets (id) on delete restrict,
  contract_type text not null check (contract_type in ('sale_redemption', 'mortgage', 'pawn')),
  principal_amount numeric,
  interest_rate numeric,
  interest_period_type text not null check (interest_period_type in ('daily', 'monthly', 'yearly')),
  start_date date,
  end_date date,
  alert_before_days integer,
  notes text,
  status text not null default 'active' check (status in ('active', 'closed', 'overdue')),
  shared_with_upline_id uuid references land.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint contracts_amounts_nonnegative check (
    (principal_amount is null or principal_amount >= 0)
    and (interest_rate is null or interest_rate >= 0)
  ),
  constraint contracts_alert_nonnegative check (
    alert_before_days is null or alert_before_days >= 0
  ),
  constraint contracts_date_order check (
    start_date is null or end_date is null or end_date >= start_date
  )
);

comment on table land.contracts is 'สัญญาขายฝาก จำนอง หรือจำนำโฉนด';
comment on column land.contracts.contract_type is 'sale_redemption = ขายฝาก, mortgage = จำนอง, pawn = จำนำโฉนด';
comment on column land.contracts.principal_amount is 'เงินต้นหน่วยเป็นบาท เก็บแบบ numeric';
comment on column land.contracts.interest_rate is 'อัตราร้อยละต่องวดที่ interest_period_type ระบุ เช่น 1.50 แบบ monthly คือ 1.50% ต่อเดือน ไม่ใช่ดอกเบี้ยทบต้น';
comment on column land.contracts.interest_period_type is 'งวดของอัตรา: daily รายวัน, monthly รายเดือน, yearly รายปี';
comment on column land.contracts.status is 'สถานะสัญญา: active กำลังใช้, closed ปิดแล้ว, overdue เกินกำหนด';
comment on column land.contracts.shared_with_upline_id is 'โปรไฟล์สายบนที่อ่านสัญญานี้ได้ นอกเหนือจากเจ้าของสัญญา';

create table if not exists land.commission_splits (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references land.contracts (id) on delete cascade,
  person_name text,
  role_label text,
  percentage numeric,
  calculated_amount numeric,
  constraint commission_splits_amounts_nonnegative check (
    (percentage is null or percentage >= 0)
    and (calculated_amount is null or calculated_amount >= 0)
  )
);

comment on table land.commission_splits is 'ส่วนแบ่งค่าตอบแทนของสัญญา ลบตามสัญญาเมื่อสัญญาถูกลบ';
comment on column land.commission_splits.percentage is 'สัดส่วนเป็นร้อยละของฐานคำนวณ ไม่บังคับว่าทุกแถวต้องรวมกันได้ 100';
comment on column land.commission_splits.calculated_amount is 'ยอดที่คำนวณแล้ว หน่วยเป็นบาท เก็บแบบ numeric';

create index if not exists customers_owner_id_idx on land.customers (owner_id);
create index if not exists land_assets_owner_id_idx on land.land_assets (owner_id);
create index if not exists land_assets_customer_id_idx on land.land_assets (customer_id);
create index if not exists contracts_owner_id_idx on land.contracts (owner_id);
create index if not exists contracts_customer_id_idx on land.contracts (customer_id);
create index if not exists contracts_land_id_idx on land.contracts (land_id);
create index if not exists contracts_status_idx on land.contracts (status);
create index if not exists contracts_shared_with_upline_id_idx on land.contracts (shared_with_upline_id);
create index if not exists commission_splits_contract_id_idx on land.commission_splits (contract_id);

alter table land.profiles enable row level security;
alter table land.customers enable row level security;
alter table land.land_assets enable row level security;
alter table land.contracts enable row level security;
alter table land.commission_splits enable row level security;

drop policy if exists profiles_select_own_or_admin on land.profiles;
create policy profiles_select_own_or_admin
on land.profiles
for select
to authenticated
using (id = auth.uid() or land.is_admin());

drop policy if exists profiles_select_owner on land.profiles;
create policy profiles_select_owner
on land.profiles
for select
to authenticated
using (land.is_owner());

drop policy if exists profiles_insert_self_or_admin on land.profiles;
create policy profiles_insert_self_or_admin
on land.profiles
for insert
to authenticated
with check (
  land.is_owner()
  or (land.is_admin() and role in ('admin', 'member'))
  or (id = auth.uid() and role = 'member')
);

drop policy if exists profiles_update_own_or_admin on land.profiles;
create policy profiles_update_own_or_admin
on land.profiles
for update
to authenticated
using (
  land.is_owner()
  or (land.is_admin() and land.profile_role(id) is distinct from 'owner')
  or id = auth.uid()
)
with check (
  land.is_owner()
  or (
    land.is_admin()
    and land.profile_role(id) is distinct from 'owner'
    and role in ('admin', 'member')
  )
  or (
    id = auth.uid()
    and role = land.current_profile_role()
    and land.current_profile_role() is distinct from 'owner'
  )
);

drop policy if exists profiles_delete_own_or_admin on land.profiles;
create policy profiles_delete_own_or_admin
on land.profiles
for delete
to authenticated
using (
  land.is_owner()
  or (land.is_admin() and land.profile_role(id) is distinct from 'owner')
  or (id = auth.uid() and land.profile_role(id) is distinct from 'owner')
);

drop policy if exists customers_select_owner_shared_or_admin on land.customers;
create policy customers_select_owner_shared_or_admin
on land.customers
for select
to authenticated
using (
  land.is_admin()
  or owner_id = auth.uid()
  or exists (
    select 1
    from land.contracts
    where contracts.customer_id = customers.id
      and contracts.shared_with_upline_id = auth.uid()
  )
);

drop policy if exists customers_insert_owner_or_admin on land.customers;
create policy customers_insert_owner_or_admin
on land.customers
for insert
to authenticated
with check (land.is_admin() or owner_id = auth.uid());

drop policy if exists customers_update_owner_or_admin on land.customers;
create policy customers_update_owner_or_admin
on land.customers
for update
to authenticated
using (land.is_admin() or owner_id = auth.uid())
with check (land.is_admin() or owner_id = auth.uid());

drop policy if exists customers_delete_owner_or_admin on land.customers;
create policy customers_delete_owner_or_admin
on land.customers
for delete
to authenticated
using (land.is_admin() or owner_id = auth.uid());

drop policy if exists customers_owner_role_all on land.customers;
create policy customers_owner_role_all
on land.customers
for all
to authenticated
using (land.is_owner())
with check (land.is_owner());

drop policy if exists land_assets_select_owner_shared_or_admin on land.land_assets;
create policy land_assets_select_owner_shared_or_admin
on land.land_assets
for select
to authenticated
using (
  land.is_admin()
  or owner_id = auth.uid()
  or exists (
    select 1
    from land.contracts
    where contracts.land_id = land_assets.id
      and contracts.shared_with_upline_id = auth.uid()
  )
);

drop policy if exists land_assets_insert_owner_or_admin on land.land_assets;
create policy land_assets_insert_owner_or_admin
on land.land_assets
for insert
to authenticated
with check (land.is_admin() or owner_id = auth.uid());

drop policy if exists land_assets_update_owner_or_admin on land.land_assets;
create policy land_assets_update_owner_or_admin
on land.land_assets
for update
to authenticated
using (land.is_admin() or owner_id = auth.uid())
with check (land.is_admin() or owner_id = auth.uid());

drop policy if exists land_assets_delete_owner_or_admin on land.land_assets;
create policy land_assets_delete_owner_or_admin
on land.land_assets
for delete
to authenticated
using (land.is_admin() or owner_id = auth.uid());

drop policy if exists land_assets_owner_role_all on land.land_assets;
create policy land_assets_owner_role_all
on land.land_assets
for all
to authenticated
using (land.is_owner())
with check (land.is_owner());

drop policy if exists contracts_select_owner_shared_or_admin on land.contracts;
create policy contracts_select_owner_shared_or_admin
on land.contracts
for select
to authenticated
using (
  land.is_admin()
  or owner_id = auth.uid()
  or shared_with_upline_id = auth.uid()
);

drop policy if exists contracts_insert_owner_or_admin on land.contracts;
create policy contracts_insert_owner_or_admin
on land.contracts
for insert
to authenticated
with check (land.is_admin() or owner_id = auth.uid());

drop policy if exists contracts_update_owner_or_admin on land.contracts;
create policy contracts_update_owner_or_admin
on land.contracts
for update
to authenticated
using (land.is_admin() or owner_id = auth.uid())
with check (land.is_admin() or owner_id = auth.uid());

drop policy if exists contracts_delete_owner_or_admin on land.contracts;
create policy contracts_delete_owner_or_admin
on land.contracts
for delete
to authenticated
using (land.is_admin() or owner_id = auth.uid());

drop policy if exists contracts_owner_role_all on land.contracts;
create policy contracts_owner_role_all
on land.contracts
for all
to authenticated
using (land.is_owner())
with check (land.is_owner());

drop policy if exists commission_splits_select_owner_shared_or_admin on land.commission_splits;
create policy commission_splits_select_owner_shared_or_admin
on land.commission_splits
for select
to authenticated
using (
  exists (
    select 1
    from land.contracts
    where contracts.id = commission_splits.contract_id
      and (
        land.is_admin()
        or contracts.owner_id = auth.uid()
        or contracts.shared_with_upline_id = auth.uid()
      )
  )
);

drop policy if exists commission_splits_insert_owner_or_admin on land.commission_splits;
create policy commission_splits_insert_owner_or_admin
on land.commission_splits
for insert
to authenticated
with check (
  exists (
    select 1
    from land.contracts
    where contracts.id = commission_splits.contract_id
      and (land.is_admin() or contracts.owner_id = auth.uid())
  )
);

drop policy if exists commission_splits_update_owner_or_admin on land.commission_splits;
create policy commission_splits_update_owner_or_admin
on land.commission_splits
for update
to authenticated
using (
  exists (
    select 1
    from land.contracts
    where contracts.id = commission_splits.contract_id
      and (land.is_admin() or contracts.owner_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from land.contracts
    where contracts.id = commission_splits.contract_id
      and (land.is_admin() or contracts.owner_id = auth.uid())
  )
);

drop policy if exists commission_splits_delete_owner_or_admin on land.commission_splits;
create policy commission_splits_delete_owner_or_admin
on land.commission_splits
for delete
to authenticated
using (
  exists (
    select 1
    from land.contracts
    where contracts.id = commission_splits.contract_id
      and (land.is_admin() or contracts.owner_id = auth.uid())
  )
);

drop policy if exists commission_splits_owner_role_all on land.commission_splits;
create policy commission_splits_owner_role_all
on land.commission_splits
for all
to authenticated
using (land.is_owner())
with check (land.is_owner());

revoke all on table land.profiles from anon, public;
revoke all on table land.customers from anon, public;
revoke all on table land.land_assets from anon, public;
revoke all on table land.contracts from anon, public;
revoke all on table land.commission_splits from anon, public;

grant select, insert, update, delete on land.profiles to authenticated, service_role;
grant select, insert, update, delete on land.customers to authenticated, service_role;
grant select, insert, update, delete on land.land_assets to authenticated, service_role;
grant select, insert, update, delete on land.contracts to authenticated, service_role;
grant select, insert, update, delete on land.commission_splits to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deed-images',
  'deed-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists deed_images_insert_own on storage.objects;
drop policy if exists deed_images_select_own on storage.objects;
drop policy if exists deed_images_update_own on storage.objects;
drop policy if exists deed_images_delete_own on storage.objects;
drop policy if exists deed_images_owner_all on storage.objects;

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

create policy deed_images_owner_all
on storage.objects
for all
to authenticated
using (bucket_id = 'deed-images' and land.is_owner())
with check (bucket_id = 'deed-images' and land.is_owner());

-- Append land to the Data API schema list when that list already exists.
-- Existing names, including public, dmck, and coupon, stay on the list.
do $$
declare
  cfg text;
  names text[];
  item text;
  found boolean := false;
begin
  select split_part(entry, '=', 2)
    into cfg
  from pg_roles as r
  cross join lateral unnest(coalesce(r.rolconfig, array[]::text[])) as entry
  where r.rolname = 'authenticator'
    and entry like 'pgrst.db_schemas=%'
  limit 1;

  if cfg is null then
    return;
  end if;

  cfg := btrim(cfg);
  if cfg like '"%"' then
    cfg := btrim(cfg, '"');
  end if;
  if cfg = '' then
    return;
  end if;

  names := regexp_split_to_array(cfg, '\s*,\s*');
  foreach item in array names loop
    if btrim(item, ' "') = 'land' then
      found := true;
    end if;
  end loop;
  if found then
    return;
  end if;

  execute format('alter role authenticator set pgrst.db_schemas = %L', cfg || ', land');
end $$;

notify pgrst, 'reload schema';
