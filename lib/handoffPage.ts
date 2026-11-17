import { LAND_SUPABASE_URL } from "./supabase/land";

export const LAND_SUPABASE_HOST = new URL(LAND_SUPABASE_URL).hostname;

export function isLandSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === LAND_SUPABASE_HOST;
  } catch {
    return false;
  }
}

export type HandoffStop = "invalid" | "missing" | "ambiguous" | "unavailable" | "session" | "direct";

export function accountStop(status: "none" | "ambiguous" | "unavailable"): HandoffStop {
  return status === "none" ? "missing" : status;
}

const COPY: Record<HandoffStop, { title: string; body: string }> = {
  invalid: {
    title: "ลิงก์จาก Hub ใช้ไม่ได้",
    body: "ลิงก์นี้ไม่ถูกต้องหรือหมดอายุแล้ว กลับไปที่ Hub แล้วเปิด Land Desk อีกครั้ง. This hub link is invalid or expired. Open Land Desk again from the hub.",
  },
  missing: {
    title: "ยังไม่มีบัญชี Land",
    body: "ไม่พบบัญชี Land สำหรับอีเมลของ Hub นี้ ระบบไม่ได้สร้างบัญชีใหม่ และไม่ได้ตั้งรหัสผ่าน. No Land Desk account exists for this hub email. Nothing was created.",
  },
  ambiguous: {
    title: "พบบัญชี Land มากกว่าหนึ่งบัญชี",
    body: "อีเมลนี้ตรงกับบัญชี Land มากกว่าหนึ่งบัญชี จึงไม่เปิดเซสชัน. More than one Land account matches this email, so sign-in stopped.",
  },
  unavailable: {
    title: "ยังตรวจบัญชี Land ไม่ได้",
    body: "Land Desk ยังตรวจการส่งต่อจาก Hub ไม่ได้ในขณะนี้. Land Desk cannot check the hub handoff right now.",
  },
  session: {
    title: "เปิดเซสชันไม่สำเร็จ",
    body: "พบบัญชี Land แล้ว แต่เปิดเซสชันไม่สำเร็จ รหัสผ่านเดิมไม่ถูกเปลี่ยน. The Land account exists, but a session could not be opened. The password was not changed.",
  },
  direct: {
    title: "เปิด Land Desk จาก Hub",
    body: "หน้านี้รับเฉพาะการส่งต่อจาก Hub ขณะที่ลงชื่อเข้าใช้อยู่. Open Land Desk from the hub while you are signed in there.",
  },
};

export function handoffStopPage(reason: HandoffStop): string {
  const copy = COPY[reason];
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex">
<title>${escapeHtml(copy.title)}</title>
<style>
  body { margin: 0; min-height: 100vh; background: #020617; color: #e2e8f0; font-family: sans-serif; }
  main { max-width: 28rem; margin: 0 auto; padding: 2rem 1rem 3rem; }
  h1 { font-size: 1.5rem; line-height: 1.3; }
  p { color: #94a3b8; line-height: 1.6; }
  a { display: block; margin-top: 0.75rem; min-height: 2.75rem; border-radius: 1rem; text-align: center; line-height: 2.75rem; text-decoration: none; }
  .primary { background: #fde68a; color: #020617; font-weight: 700; }
  .secondary { color: #fde68a; }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(copy.title)}</h1>
  <p>${escapeHtml(copy.body)}</p>
  <a class="primary" href="https://www.db357.com/dashboard">กลับไป Hub</a>
  <a class="secondary" href="/login">เข้าสู่ระบบด้วยเบอร์โทร</a>
</main>
</body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
