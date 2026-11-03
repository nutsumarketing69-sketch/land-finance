"use client";

import { useEffect, useState } from "react";
import AuthFrame from "@/app/components/AuthFrame";
import { createClient } from "@/lib/supabase/client";
import { branchName, formatBangkok, ROLE_LABEL, STATUS_LABEL, type StaffAccount } from "@/lib/staff";

export default function PendingPage() {
  const [sent, setSent] = useState("");
  const [account, setAccount] = useState<StaffAccount | null>(null);
  const [missing, setMissing] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setSignedOut(true);
      setAccount(null);
      return;
    }
    setSignedOut(false);
    const { data: row } = await supabase
      .from("staff_accounts")
      .select("id, user_id, username, full_name, phone, branch_id, position, requested_role, role, status, employee_id, created_at, approved_at, branches(name)")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!row) {
      setMissing(true);
      setAccount(null);
      return;
    }
    const next = row as StaffAccount;
    setAccount(next);
    setMissing(false);
    if (next.status === "approved") window.location.href = "/";
  };

  useEffect(() => {
    setSent(new URLSearchParams(window.location.search).get("sent") || "");
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  const logout = async () => {
    await createClient().auth.signOut();
    window.location.href = "/login";
  };

  const status = account?.status || "";
  const waiting = status === "pending" || missing;

  return (
    <AuthFrame
      title={status === "rejected" ? "บัญชียังใช้ไม่ได้" : "รอผู้ดูแลระบบอนุมัติ"}
      subtitle={account?.full_name || "รัษฎาแอร์"}
    >
      <div className="space-y-4 text-sm leading-6 text-gray-700">
        {signedOut && (
          <>
            <p>ยังไม่ได้เข้าสู่ระบบ</p>
            <a href="/login" className="block rounded-xl bg-red-600 py-3 text-center font-semibold text-white">
              ไปหน้าเข้าสู่ระบบ
            </a>
          </>
        )}
        {missing && <p>สมัครเข้ามาแล้ว แต่ยังไม่พบใบคำขอในระบบ กรุณาแจ้งผู้ดูแลระบบ</p>}
        {account && (
          <div className="space-y-2 rounded-2xl bg-gray-50 p-4">
            <Row label="สถานะ" value={STATUS_LABEL[status] || status} />
            <Row label="ชื่อผู้ใช้" value={account.username} />
            <Row label="หน้าที่ที่ขอ" value={account.position || ROLE_LABEL[account.requested_role] || "-"} />
            <Row label="สาขา" value={branchName(account)} />
            <Row label="สมัครเมื่อ" value={formatBangkok(account.created_at)} />
          </div>
        )}
        {waiting && sent === "1" && (
          <p>
            ส่งคำขอเข้ากลุ่มเทเลแกรมของร้านแล้ว มีชื่อผู้ใช้ เบอร์ สาขา และหน้าที่
            ผู้ดูแลกดอนุมัติหรือไม่ผ่านในกลุ่มได้เลย หรือเปิดหน้าอนุมัติพนักงานก็กดได้เหมือนกัน
          </p>
        )}
        {waiting && sent === "0" && (
          <p>
            บัญชีถูกสร้างแล้ว แต่ส่งเข้ากลุ่มเทเลแกรมไม่สำเร็จในรอบนี้
            ให้ผู้ดูแลเปิดหน้าอนุมัติพนักงานแล้วกดอนุมัติจากที่นั่นได้
          </p>
        )}
        {waiting && (
          <p>
            บัญชีนี้ยังเปิดหน้าร้านไม่ได้ ผู้ดูแลระบบต้องกดอนุมัติก่อน จึงจะรับรถ ออกบิล และดูข้อมูลได้
            หน้านี้จะตรวจใหม่อัตโนมัติ
          </p>
        )}
        {status === "rejected" && (
          <p>ผู้ดูแลระบบยังไม่อนุมัติบัญชีนี้ หรือระงับการใช้งานไว้ ติดต่อผู้ดูแลร้านหากต้องการให้เปิดอีกครั้ง</p>
        )}
        {!signedOut && (
          <button type="button" onClick={load} className="w-full rounded-xl border border-gray-300 py-3 font-medium">
            ตรวจสถานะอีกครั้ง
          </button>
        )}
        {account && (
          <button type="button" onClick={logout} className="w-full rounded-xl border border-red-200 py-3 font-medium text-red-700">
            ออกจากระบบ
          </button>
        )}
      </div>
    </AuthFrame>
  );
}

// the waiting page tells the new staff that the group has the request
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}
