export const STAFF_EMAIL_DOMAIN = "staff.aircon.tppth.cam";

export type StaffAccount = {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  phone: string | null;
  branch_id: string | null;
  position: string | null;
  requested_role: string;
  role: string;
  status: string;
  employee_id: string | null;
  permissions?: Record<string, boolean> | null;
  created_at?: string;
  approved_at?: string | null;
  branches?: { name: string } | { name: string }[] | null;
};

export const SIGNUP_JOBS = [
  { id: "front", label: "พนักงานหน้าร้าน", role: "staff", position: "พนักงานหน้าร้าน" },
  { id: "tech", label: "ช่าง", role: "staff", position: "ช่าง" },
  { id: "manager", label: "ผู้จัดการสาขา", role: "manager", position: "ผู้จัดการสาขา" },
] as const;

export const ROLE_LABEL: Record<string, string> = {
  staff: "พนักงาน",
  manager: "ผู้จัดการสาขา",
  admin: "ผู้ดูแลระบบ",
};

export const STATUS_LABEL: Record<string, string> = {
  pending: "รออนุมัติ",
  approved: "ใช้งานได้",
  rejected: "ระงับ / ไม่ผ่าน",
};

export function isOpenPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/pending" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/branch-printer") ||
    pathname.startsWith("/telegram")
  );
}

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase();
}

export function usernameError(raw: string) {
  const name = normalizeUsername(raw);
  if (name.length < 3) return "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัว";
  if (name.length > 32) return "ชื่อผู้ใช้ยาวได้ไม่เกิน 32 ตัว";
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
    return "ใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข จุด ขีดล่าง และขีดกลาง";
  }
  return null;
}

export function staffEmail(username: string) {
  return `${normalizeUsername(username)}@${STAFF_EMAIL_DOMAIN}`;
}

export function branchName(account: { branches?: StaffAccount["branches"] }) {
  const value = account.branches;
  if (!value) return "ยังไม่ระบุสาขา";
  if (Array.isArray(value)) return value[0]?.name || "ยังไม่ระบุสาขา";
  return value.name || "ยังไม่ระบุสาขา";
}

export function formatBangkok(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function authErrorText(error: { message?: string } | null | undefined) {
  const msg = error?.message || "";
  const low = msg.toLowerCase();
  if (!msg) return "ทำรายการไม่สำเร็จ";
  if (low.includes("invalid login") || low.includes("invalid credentials")) {
    return "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
  }
  if (low.includes("email not confirmed")) {
    return "บัญชียังยืนยันไม่สำเร็จ กรุณาแจ้งผู้ดูแลระบบ";
  }
  if (low.includes("username_taken") || low.includes("already registered") || low.includes("already been registered")) {
    return "ชื่อผู้ใช้นี้มีคนใช้แล้ว";
  }
  if (low.includes("invalid_username")) {
    return "ชื่อผู้ใช้ใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข จุด และขีด";
  }
  if (low.includes("last_admin")) return "ต้องเหลือผู้ดูแลระบบอย่างน้อย 1 คน";
  if (low.includes("not_admin")) return "เฉพาะผู้ดูแลระบบที่อนุมัติแล้วทำรายการนี้ได้";
  if (low.includes("not_found")) return "ไม่พบบัญชีนี้";
  if (low.includes("password")) return "รหัสผ่านยังไม่ผ่านเงื่อนไข ใช้อย่างน้อย 8 ตัว และมีตัวเลข";
  if (low.includes("rate limit") || low.includes("too many")) return "ทำรายการถี่เกินไป รอสักครู่แล้วลองใหม่";
  if (low.includes("network") || low.includes("fetch")) return "เชื่อมต่อระบบไม่สำเร็จ ลองใหม่อีกครั้ง";
  return "ทำรายการไม่สำเร็จ";
}
