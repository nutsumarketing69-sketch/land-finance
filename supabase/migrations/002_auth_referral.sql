-- สมัครสมาชิกขายฝากด้วยลิงก์แนะนำ
-- ทริกเกอร์สร้างโปรไฟล์เองตอนมีผู้ใช้ใหม่ เพื่อไม่ให้แทรกแถวช้ากว่านโยบาย RLS
-- ค้นรหัสแนะนำผ่านฟังก์ชัน security definer เพราะผู้ใช้ที่ยังไม่เข้าสู่ระบบอ่านตาราง profiles ไม่ได้
-- สมาชิกยังแทรกได้เฉพาะโปรไฟล์ของตนเองตามนโยบายเดิม

create or replace function public.generate_invite_code()
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
      select 1 from public.profiles where invite_code = candidate
    );
  end loop;

  if exists (select 1 from public.profiles where invite_code = candidate) then
    raise exception 'invite_code_exhausted';
  end if;
  return candidate;
end;
$$;

comment on function public.generate_invite_code() is
  'สุ่มรหัสแนะนำ 8 ตัว ที่ไม่ชนของเดิม และไม่มีตัวอักษรที่อ่านสับสน';

create or replace function public.lookup_inviter(code text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from public.profiles
  where invite_code = upper(trim(coalesce(code, '')))
  limit 1;
$$;

comment on function public.lookup_inviter(text) is
  'คืนรหัสโปรไฟล์ของผู้แนะนำจากรหัสเชิญ โดยไม่เปิดข้อมูลแถวอื่นให้ผู้ที่ยังไม่เข้าสู่ระบบ';

create or replace function public.handle_land_profile()
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
  inviter := public.lookup_inviter(meta->>'referral_code');
  if inviter is null or phone is null then
    raise exception 'invalid_referral';
  end if;

  chosen := upper(trim(coalesce(meta->>'invite_code', '')));
  if chosen = '' or exists (select 1 from public.profiles where invite_code = chosen) then
    chosen := public.generate_invite_code();
  end if;

  for attempt in 1..5 loop
    begin
      insert into public.profiles (id, phone, full_name, invite_code, referred_by, role)
      values (new.id, phone, full_name, chosen, inviter, 'member');
      return new;
    exception
      when unique_violation then
        chosen := public.generate_invite_code();
    end;
  end loop;

  raise exception 'invite_code_exhausted';
end;
$$;

comment on function public.handle_land_profile() is
  'สร้างโปรไฟล์สมาชิกสัญญาที่ดินเมื่อสมัครด้วยลิงก์แนะนำ และไม่ยุ่งกับบัญชีพนักงานร้าน';

drop trigger if exists on_auth_user_created_land on auth.users;
create trigger on_auth_user_created_land
after insert on auth.users
for each row
execute function public.handle_land_profile();

revoke all on function public.generate_invite_code() from public;
revoke all on function public.lookup_inviter(text) from public;
revoke all on function public.handle_land_profile() from public;

grant execute on function public.generate_invite_code() to anon, authenticated;
grant execute on function public.lookup_inviter(text) to anon, authenticated;
