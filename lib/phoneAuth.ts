/**
 * แปลงเบอร์โทรไทยเป็นบัญชี Supabase โดยไม่แสดงอีเมลสังเคราะห์บนหน้าจอ
 * เบอร์ 0891234567 ใช้เข้าสู่ระบบเป็น 0891234567@landfinance.local
 */

export const LAND_AUTH_EMAIL_DOMAIN = "landfinance.local";

const INVITE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function normalizeThaiPhone(raw: string): string | null {
  const compact = raw.trim().replace(/[\s\-().]/g, "");
  if (!compact) return null;
  let digits = compact;
  if (digits.startsWith("+66")) {
    digits = `0${digits.slice(3)}`;
  } else if (digits.startsWith("66") && digits.length === 11) {
    digits = `0${digits.slice(2)}`;
  }
  if (!/^0\d{8,9}$/.test(digits)) return null;
  return digits;
}

export function phoneToAuthEmail(phone: string): string {
  return `${phone}@${LAND_AUTH_EMAIL_DOMAIN}`;
}

export function phoneAuthError(raw: string): string | null {
  if (!raw.trim()) return "กรุณากรอกเบอร์โทรศัพท์";
  if (!normalizeThaiPhone(raw)) return "เบอร์โทรศัพท์ไม่ถูกต้อง ใช้รูปแบบ 0891234567";
  return null;
}

export function generateInviteCode(length = 8): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += INVITE_ALPHABET[bytes[index] % INVITE_ALPHABET.length];
  }
  return code;
}

export function referralPath(inviteCode: string): string {
  return `/register?ref=${encodeURIComponent(inviteCode)}`;
}

export function landAuthError(error: { message?: string } | null | undefined): string {
  const message = error?.message || "";
  const low = message.toLowerCase();
  if (!message) return "ทำรายการไม่สำเร็จ";
  if (low.includes("invalid login") || low.includes("invalid credentials")) {
    return "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง";
  }
  if (low.includes("email not confirmed") || low.includes("not confirmed")) {
    return "บัญชียังเข้าใช้งานไม่ได้ ผู้ดูแลต้องปิดการยืนยันอีเมลใน Supabase เพราะเบอร์โทรไม่มีกล่องจดหมาย";
  }
  if (low.includes("invalid_referral")) {
    return "ลิงก์แนะนำไม่ถูกต้อง";
  }
  if (low.includes("already") || low.includes("registered") || low.includes("duplicate") || low.includes("unique")) {
    return "เบอร์นี้ถูกใช้สมัครแล้ว";
  }
  if (low.includes("password")) return "รหัสผ่านต้องมีอย่างน้อย 8 ตัว";
  if (low.includes("rate") || low.includes("too many")) return "ทำรายการถี่เกินไป รอสักครู่แล้วลองใหม่";
  if (message.includes("@")) return "ทำรายการไม่สำเร็จ";
  return "ทำรายการไม่สำเร็จ";
}
