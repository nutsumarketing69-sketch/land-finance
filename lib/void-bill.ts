import { createClient } from "@/lib/supabase/client";

const STOCK_TRACKING_FROM = Date.parse("2026-11-03T00:00:00+07:00");

type VoidLine = { name?: string; qty?: number };
type VoidTarget = { id: string; items?: VoidLine[] | null; created_at?: string | null };

export async function voidBill(bill: VoidTarget, reason: string) {
  const text = reason.trim();
  if (!text) return { error: "ใส่เหตุผลก่อนยกเลิก", restored: false };
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "ต้องเข้าสู่ระบบก่อนยกเลิกบิล", restored: false };
  const account = await supabase
    .from("staff_accounts")
    .select("role, status")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  const role = account.data?.role;
  if (account.data?.status !== "approved" || (role !== "admin" && role !== "manager")) {
    return { error: "ยกเลิกบิลได้เฉพาะผู้ดูแลระบบหรือผู้จัดการสาขา", restored: false };
  }
  const res = await supabase
    .from("bills")
    .update({ voided_at: new Date().toISOString(), void_reason: text })
    .eq("id", bill.id)
    .is("voided_at", null)
    .select("id");
  if (res.error) return { error: res.error.message, restored: false };
  if (!res.data?.length) return { error: "บิลนี้ถูกยกเลิกไปแล้ว", restored: false };

  const created = bill.created_at ? Date.parse(bill.created_at) : NaN;
  const restore = Number.isFinite(created) && created >= STOCK_TRACKING_FROM;
  if (!restore) return { error: null, restored: false };

  const items = Array.isArray(bill.items) ? bill.items : [];
  for (const line of items) {
    const name = String(line?.name || "").trim();
    const qty = Number(line?.qty || 0);
    if (!name || qty <= 0) continue;
    const part = await supabase.from("parts_services").select("id, stock, type").eq("name", name).limit(1);
    const row = part.data?.[0];
    if (!row || row.type === "labor" || row.type === "service") continue;
    await supabase
      .from("parts_services")
      .update({ stock: Number(row.stock || 0) + qty })
      .eq("id", row.id);
  }
  return { error: null, restored: true };
}
