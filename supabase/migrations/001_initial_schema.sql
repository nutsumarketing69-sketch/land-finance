-- สคีมาเริ่มต้นของระบบขายฝาก จำนอง และจำนำโฉนดที่ดิน
-- เงินทุกคอลัมน์ใช้ numeric เพื่อคงความละเอียด ไม่ใช้ float หรือ double precision
-- เปิด Row Level Security ทุกตาราง
-- สมาชิกเห็นและแก้ไขเฉพาะแถวของตนเอง และอ่านสัญญาที่ถูกแชร์ให้ในฐานะสายบน
-- ผู้ดูแล (profiles.role = admin) จัดการได้ทุกแถว
-- ฟังก์ชัน is_admin() เป็น security definer และล็อก search_path
-- เพื่อไม่ให้ policy ของ profiles ไปอ่าน profiles แล้วเรียกตัวเองไม่จบ
--
-- หมายเหตุ: ตาราง public.customers ในไฟล์นี้คือลูกค้าของสัญญาที่ดิน
-- ถ้าฐานข้อมูลนี้มีตาราง customers ของระบบอื่นอยู่แล้ว การสร้างตารางจะไม่ทับของเดิม แต่จะหยุดที่ชื่อซ้ำ

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text unique,
  full_name text,
  invite_code text unique,
  referred_by uuid references public.profiles (id) on delete set null,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  constraint profiles_referred_by_not_self check (referred_by is null or referred_by <> id)
);

comment on table public.profiles is 'โปรไฟล์ผู้ใช้ ผูกกับบัญชี Supabase Auth และเป็นเจ้าของข้อมูลสัญญา';
comment on column public.profiles.role is 'บทบาท: admin คือผู้ดูแลทั้งระบบ, member คือสมาชิก';
comment on column public.profiles.invite_code is 'รหัสเชิญที่ไม่ซ้ำ สำหรับอ้างอิงผู้แนะนำ';
comment on column public.profiles.referred_by is 'โปรไฟล์ของผู้ที่แนะนำสมาชิกคนนี้';

-- คืนค่าจริงเมื่อผู้ใช้ปัจจุบันเป็นผู้ดูแลระบบ
-- สร้างหลังตาราง profiles เพราะตัวฟังก์ชันอ่านตารางนี้
create or replace function public.is_admin()
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
      and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'ตรวจบทบาท admin ของผู้ใช้ปัจจุบัน โดยไม่ทำให้ policy ของ profiles เรียกตัวเองซ้ำ';

-- อ่านบทบาทเดิมของผู้ใช้ปัจจุบัน ใช้ล็อกไม่ให้สมาชิกเปลี่ยนตนเองเป็น admin
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

comment on function public.current_profile_role() is
  'บทบาทที่บันทึกไว้แล้วของผู้ใช้ปัจจุบัน ใช้อ่านโดยไม่วนลูปกับ policy ของ profiles';

revoke all on function public.is_admin() from public;
revoke all on function public.current_profile_role() from public;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.current_profile_role() to authenticated, service_role;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  full_name text,
  phone text,
  id_card text,
  address text,
  created_at timestamptz not null default now()
);

comment on table public.customers is 'ลูกค้าของสัญญาที่ดิน แต่ละแถวเป็นของสมาชิกคนเดียวตาม owner_id';
comment on column public.customers.id_card is 'เลขบัตรประชาชนหรือเลขประจำตัวที่บันทึกเป็นข้อความ';

create table public.land_assets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete restrict,
  owner_id uuid not null references public.profiles (id) on delete restrict,
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

comment on table public.land_assets is 'โฉนดหรือที่ดินที่ใช้เป็นหลักทรัพย์ของสัญญา';
comment on column public.land_assets.area_size is 'ขนาดที่ดินตามที่ระบุบนโฉนด เก็บเป็นข้อความตามต้นฉบับ';
comment on column public.land_assets.appraised_value is 'ราคาประเมินที่ใช้คิดสัดส่วนเงินกู้ต่อราคาประเมิน (LTV) หน่วยเป็นบาท เก็บแบบ numeric';
comment on column public.land_assets.nearby_appraised_value is 'ราคาประเมินของที่ดินข้างเคียง หน่วยเป็นบาท เก็บแบบ numeric';
comment on column public.land_assets.deed_images is 'รายการที่อยู่ไฟล์รูปโฉนด';

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  customer_id uuid references public.customers (id) on delete restrict,
  land_id uuid references public.land_assets (id) on delete restrict,
  contract_type text not null check (contract_type in ('sale_redemption', 'mortgage', 'pawn')),
  principal_amount numeric,
  interest_rate numeric,
  interest_period_type text not null check (interest_period_type in ('daily', 'monthly', 'yearly')),
  start_date date,
  end_date date,
  alert_before_days integer,
  notes text,
  status text not null default 'active' check (status in ('active', 'closed', 'overdue')),
  shared_with_upline_id uuid references public.profiles (id) on delete set null,
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

comment on table public.contracts is 'สัญญาขายฝาก จำนอง หรือจำนำโฉนด';
comment on column public.contracts.contract_type is 'sale_redemption = ขายฝาก, mortgage = จำนอง, pawn = จำนำโฉนด';
comment on column public.contracts.principal_amount is 'เงินต้นหน่วยเป็นบาท เก็บแบบ numeric';
comment on column public.contracts.interest_rate is 'อัตราร้อยละต่องวดที่ interest_period_type ระบุ เช่น 1.50 แบบ monthly คือ 1.50% ต่อเดือน ไม่ใช่ดอกเบี้ยทบต้น';
comment on column public.contracts.interest_period_type is 'งวดของอัตรา: daily รายวัน, monthly รายเดือน, yearly รายปี';
comment on column public.contracts.status is 'สถานะสัญญา: active กำลังใช้, closed ปิดแล้ว, overdue เกินกำหนด';
comment on column public.contracts.shared_with_upline_id is 'โปรไฟล์สายบนที่อ่านสัญญานี้ได้ นอกเหนือจากเจ้าของสัญญา';

create table public.commission_splits (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  person_name text,
  role_label text,
  percentage numeric,
  calculated_amount numeric,
  constraint commission_splits_amounts_nonnegative check (
    (percentage is null or percentage >= 0)
    and (calculated_amount is null or calculated_amount >= 0)
  )
);

comment on table public.commission_splits is 'ส่วนแบ่งค่าตอบแทนของสัญญา ลบตามสัญญาเมื่อสัญญาถูกลบ';
comment on column public.commission_splits.percentage is 'สัดส่วนเป็นร้อยละของฐานคำนวณ ไม่บังคับว่าทุกแถวต้องรวมกันได้ 100';
comment on column public.commission_splits.calculated_amount is 'ยอดที่คำนวณแล้ว หน่วยเป็นบาท เก็บแบบ numeric';

create index customers_owner_id_idx on public.customers (owner_id);
create index land_assets_owner_id_idx on public.land_assets (owner_id);
create index land_assets_customer_id_idx on public.land_assets (customer_id);
create index contracts_owner_id_idx on public.contracts (owner_id);
create index contracts_customer_id_idx on public.contracts (customer_id);
create index contracts_land_id_idx on public.contracts (land_id);
create index contracts_status_idx on public.contracts (status);
create index contracts_shared_with_upline_id_idx on public.contracts (shared_with_upline_id);
create index commission_splits_contract_id_idx on public.commission_splits (contract_id);

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.land_assets enable row level security;
alter table public.contracts enable row level security;
alter table public.commission_splits enable row level security;

-- โปรไฟล์: เจ้าของแถวจัดการของตนเองได้ ผู้ใช้ใหม่สร้างได้เฉพาะแถวของตนเองและเป็นสมาชิก
-- การเปลี่ยนบทบาทเป็น admin ทำได้เฉพาะผู้ดูแล
create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy profiles_insert_self_or_admin
on public.profiles
for insert
to authenticated
with check (
  public.is_admin()
  or (id = auth.uid() and role = 'member')
);

create policy profiles_update_own_or_admin
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    id = auth.uid()
    and role = public.current_profile_role()
  )
);

create policy profiles_delete_own_or_admin
on public.profiles
for delete
to authenticated
using (id = auth.uid() or public.is_admin());

-- ลูกค้า: เจ้าของจัดการได้ทั้งหมด สายบนที่ได้รับแชร์สัญญาอ่านลูกค้าของสัญญานั้นได้
create policy customers_select_owner_shared_or_admin
on public.customers
for select
to authenticated
using (
  public.is_admin()
  or owner_id = auth.uid()
  or exists (
    select 1
    from public.contracts
    where contracts.customer_id = customers.id
      and contracts.shared_with_upline_id = auth.uid()
  )
);

create policy customers_insert_owner_or_admin
on public.customers
for insert
to authenticated
with check (public.is_admin() or owner_id = auth.uid());

create policy customers_update_owner_or_admin
on public.customers
for update
to authenticated
using (public.is_admin() or owner_id = auth.uid())
with check (public.is_admin() or owner_id = auth.uid());

create policy customers_delete_owner_or_admin
on public.customers
for delete
to authenticated
using (public.is_admin() or owner_id = auth.uid());

-- ที่ดิน: กติกาเดียวกับลูกค้า โดยสายบนอ่านได้เมื่อสัญญาที่แชร์อ้างถึงโฉนดนี้
create policy land_assets_select_owner_shared_or_admin
on public.land_assets
for select
to authenticated
using (
  public.is_admin()
  or owner_id = auth.uid()
  or exists (
    select 1
    from public.contracts
    where contracts.land_id = land_assets.id
      and contracts.shared_with_upline_id = auth.uid()
  )
);

create policy land_assets_insert_owner_or_admin
on public.land_assets
for insert
to authenticated
with check (public.is_admin() or owner_id = auth.uid());

create policy land_assets_update_owner_or_admin
on public.land_assets
for update
to authenticated
using (public.is_admin() or owner_id = auth.uid())
with check (public.is_admin() or owner_id = auth.uid());

create policy land_assets_delete_owner_or_admin
on public.land_assets
for delete
to authenticated
using (public.is_admin() or owner_id = auth.uid());

-- สัญญา: เจ้าของจัดการได้ สายบนอ่านได้อย่างเดียว ผู้ดูแลจัดการได้ทุกแถว
create policy contracts_select_owner_shared_or_admin
on public.contracts
for select
to authenticated
using (
  public.is_admin()
  or owner_id = auth.uid()
  or shared_with_upline_id = auth.uid()
);

create policy contracts_insert_owner_or_admin
on public.contracts
for insert
to authenticated
with check (public.is_admin() or owner_id = auth.uid());

create policy contracts_update_owner_or_admin
on public.contracts
for update
to authenticated
using (public.is_admin() or owner_id = auth.uid())
with check (public.is_admin() or owner_id = auth.uid());

create policy contracts_delete_owner_or_admin
on public.contracts
for delete
to authenticated
using (public.is_admin() or owner_id = auth.uid());

-- ส่วนแบ่ง: ผูกสิทธิ์กับสัญญา ไม่ให้สายบนแก้ไขส่วนแบ่งของสัญญาที่ได้รับเพียงสิทธิ์อ่าน
create policy commission_splits_select_owner_shared_or_admin
on public.commission_splits
for select
to authenticated
using (
  exists (
    select 1
    from public.contracts
    where contracts.id = commission_splits.contract_id
      and (
        public.is_admin()
        or contracts.owner_id = auth.uid()
        or contracts.shared_with_upline_id = auth.uid()
      )
  )
);

create policy commission_splits_insert_owner_or_admin
on public.commission_splits
for insert
to authenticated
with check (
  exists (
    select 1
    from public.contracts
    where contracts.id = commission_splits.contract_id
      and (public.is_admin() or contracts.owner_id = auth.uid())
  )
);

create policy commission_splits_update_owner_or_admin
on public.commission_splits
for update
to authenticated
using (
  exists (
    select 1
    from public.contracts
    where contracts.id = commission_splits.contract_id
      and (public.is_admin() or contracts.owner_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.contracts
    where contracts.id = commission_splits.contract_id
      and (public.is_admin() or contracts.owner_id = auth.uid())
  )
);

create policy commission_splits_delete_owner_or_admin
on public.commission_splits
for delete
to authenticated
using (
  exists (
    select 1
    from public.contracts
    where contracts.id = commission_splits.contract_id
      and (public.is_admin() or contracts.owner_id = auth.uid())
  )
);

revoke all on table public.profiles from anon, public;
revoke all on table public.customers from anon, public;
revoke all on table public.land_assets from anon, public;
revoke all on table public.contracts from anon, public;
revoke all on table public.commission_splits from anon, public;

grant select, insert, update, delete on public.profiles to authenticated, service_role;
grant select, insert, update, delete on public.customers to authenticated, service_role;
grant select, insert, update, delete on public.land_assets to authenticated, service_role;
grant select, insert, update, delete on public.contracts to authenticated, service_role;
grant select, insert, update, delete on public.commission_splits to authenticated, service_role;
