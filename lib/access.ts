import type { StaffAccount } from "@/lib/staff";

export type Cap = {
  id: string;
  label: string;
  group: string;
  detail: string;
};

export const CAPS: Cap[] = [
  { id: "receive", label: "รับรถ", group: "งานหน้าร้าน", detail: "เปิดงาน ถ่ายหน้ารถ หลังรถ เลขไมล์" },
  { id: "receipt", label: "ดูบิล", group: "งานหน้าร้าน", detail: "เปิดใบเสร็จที่บันทึกแล้ว" },
  { id: "receipt_edit", label: "บันทึกบิล", group: "งานหน้าร้าน", detail: "แก้รายการและกดบันทึกบิล" },
  { id: "see_prices", label: "เห็นราคา", group: "งานหน้าร้าน", detail: "เห็นราคา อะไหล่ ส่วนลด และยอดเงินทั้งระบบ" },
  { id: "void_bill", label: "ยกเลิกบิล", group: "งานหน้าร้าน", detail: "ยกเลิกบิลและคืนสต็อกตามกติกา" },
  { id: "print_remote", label: "ส่งพิมพ์ไปสาขา", group: "งานหน้าร้าน", detail: "สั่งพิมพ์ไปเครื่องสาขา จากบัญชีที่ล็อกอิน" },
  { id: "parts", label: "ดูอะไหล่", group: "สินค้า", detail: "ค้นชื่ออะไหล่และบริการ" },
  { id: "parts_edit", label: "แก้อะไหล่", group: "สินค้า", detail: "เพิ่ม แก้ และลบรายการ" },
  { id: "stock", label: "สต็อก", group: "สินค้า", detail: "ดูจำนวนคงเหลือ" },
  { id: "supplier", label: "แหล่งซื้อ", group: "สินค้า", detail: "ดูว่ารายการซื้อมาจากร้านไหน และใส่รถคันไหน" },
  { id: "customers", label: "ลูกค้า", group: "ข้อมูล", detail: "ดูและแก้ข้อมูลลูกค้า" },
  { id: "history", label: "ประวัติรถ", group: "ข้อมูล", detail: "ค้นประวัติจากป้ายทะเบียน" },
  { id: "search", label: "ค้นหา", group: "ข้อมูล", detail: "ค้นป้าย ชื่อ เบอร์ และเลขที่บิล" },
  { id: "bills", label: "ประวัติบิล", group: "ข้อมูล", detail: "เปิดบิลเก่า" },
  { id: "jobs", label: "งานซ่อม", group: "งาน", detail: "ดูและเปลี่ยนสถานะงาน" },
  { id: "warranty", label: "รับประกัน", group: "งาน", detail: "ตรวจวันรับประกัน" },
  { id: "media", label: "ส่งรูปและวิดีโอ", group: "งาน", detail: "ส่งรูปอาการรถเข้าเทเลแกรม" },
  { id: "clock", label: "ตอกบัตรเข้างาน", group: "พนักงาน", detail: "ถ่ายรูปยืนยันเวลาก่อน 08:00 น." },
  { id: "clock_all", label: "สรุปเข้างานทุกคน", group: "พนักงาน", detail: "ดูมาสาย ขาดงาน และวันทำงานของทุกคน" },
  { id: "employees", label: "ข้อมูลพนักงาน", group: "พนักงาน", detail: "หน้าพนักงานของร้าน" },
  { id: "access", label: "กำหนดสิทธิ์", group: "พนักงาน", detail: "เปิดปิดฟังก์ชันของแต่ละคน" },
  { id: "branches", label: "สาขา", group: "ร้าน", detail: "จัดการสาขา" },
  { id: "reports", label: "รายงาน", group: "ร้าน", detail: "รายงานรายวันและแดชบอร์ด" },
  { id: "summary", label: "สรุปทุกสาขา", group: "ร้าน", detail: "สรุปรายวัน รายเดือน รายปี และช่วงวันที่เลือก" },
  { id: "sales", label: "ยอดขาย", group: "ร้าน", detail: "ยอดขายรายวัน" },
  { id: "daily_close", label: "ปิดยอดวัน", group: "ร้าน", detail: "สรุปก่อนเลิกงาน" },
  { id: "import_bills", label: "นำเข้าบิล Excel", group: "ร้าน", detail: "อัปโหลดบิลเก่าพร้อมรายการและยอด" },
  { id: "backup", label: "สำรองข้อมูล", group: "ร้าน", detail: "ส่งออก Excel ลูกค้า รถ และประวัติบิล เฉพาะผู้ดูแลระบบ" },
];

const PATHS: [string, string][] = [
  ["/backup", "backup"],
  ["/import-bills", "import_bills"],
  ["/report-advanced", "reports"],
  ["/jobs-by-branch", "jobs"],
  ["/bills-by-branch", "bills"],
  ["/send-media", "media"],
  ["/daily-close", "daily_close"],
  ["/print-queue", "receipt"],
  ["/attendance", "clock"],
  ["/customer", "customers"],
  ["/customers", "customers"],
  ["/employees", "employees"],
  ["/branches", "branches"],
  ["/dashboard", "reports"],
  ["/warranty", "warranty"],
  ["/history", "history"],
  ["/summary", "summary"],
  ["/receive", "receive"],
  ["/receipt", "receipt"],
  ["/invoice", "receipt"],
  ["/vehicle", "receive"],
  ["/upload", "media"],
  ["/search", "search"],
  ["/report", "reports"],
  ["/access", "access"],
  ["/stock", "stock"],
  ["/parts", "parts"],
  ["/sales", "sales"],
  ["/bills", "bills"],
  ["/jobs", "jobs"],
];

export function capForPath(pathname: string) {
  const path = pathname.split("?")[0] || "/";
  const hit = PATHS.find(([prefix]) => path === prefix || path.startsWith(prefix + "/"));
  return hit ? hit[1] : null;
}

export function capLabel(id: string) {
  return CAPS.find((item) => item.id === id)?.label || id;
}

function techCaps() {
  return ["receive", "receipt", "history", "search", "bills", "jobs", "warranty", "media", "clock", "parts"];
}

function frontCaps() {
  return [
    "receive", "receipt", "receipt_edit", "see_prices", "parts", "parts_edit", "stock", "supplier",
    "customers", "history", "search", "bills", "jobs", "warranty", "media", "clock", "sales",
    "daily_close", "reports",
  ];
}

export function defaultCapIds(account: Pick<StaffAccount, "role" | "position">) {
  if (account.role === "admin") return CAPS.map((item) => item.id);
  if (account.role === "manager") return CAPS.map((item) => item.id).filter((id) => id !== "access" && id !== "backup");
  if ((account.position || "").includes("ช่าง")) return techCaps();
  return frontCaps();
}

export function hasCap(account: StaffAccount | null | undefined, cap: string) {
  if (!account || account.status !== "approved") return false;
  if (cap === "backup") return account.role === "admin";
  if (cap === "access" && account.role === "admin") return true;
  const custom = account.permissions;
  if (custom && typeof custom === "object" && Object.prototype.hasOwnProperty.call(custom, cap)) {
    return custom[cap] === true;
  }
  return defaultCapIds(account).includes(cap);
}

export function explicitPermissions(account: Pick<StaffAccount, "role" | "position" | "permissions">) {
  const map: Record<string, boolean> = {};
  const defaults = new Set(defaultCapIds(account));
  for (const item of CAPS) {
    const custom = account.permissions;
    if (custom && typeof custom === "object" && Object.prototype.hasOwnProperty.call(custom, item.id)) {
      map[item.id] = custom[item.id] === true;
    } else {
      map[item.id] = defaults.has(item.id);
    }
  }
  if (account.role === "admin") map.access = true;
  map.backup = account.role === "admin";
  return map;
}
// backup stays with the admin account only
