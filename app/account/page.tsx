"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStaff } from "@/app/components/AuthShell";
import { authErrorText, branchName, ROLE_LABEL, staffEmail } from "@/lib/staff";

export default function AccountPage() {
  const { account, ready } = useStaff();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    await createClient().auth.signOut();
    window.location.href = "/staff-login";
  };

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!account) return;
    if (next.length < 8 || !/\d/.test(next)) {
      setMsg("รหัสใหม่ต้องมีอย่างน้อย 8 ตัว และมีตัวเลข");
      return;
    }
    if (next !== confirm) {
      setMsg("รหัสใหม่ทั้งสองช่องไม่ตรงกัน");
      return;
    }
    setBusy(true);
    setMsg("");
    const supabase = createClient();
    const check = await supabase.auth.signInWithPassword({
      email: staffEmail(account.username),
      password: current,
    });
    if (check.error) {
      setMsg("รหัสผ่านเดิมไม่ถูกต้อง");
      setBusy(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) {
      setMsg(authErrorText(error));
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setMsg("เปลี่ยนรหัสผ่านแล้ว ใช้รหัสใหม่ในครั้งถัดไป");
  };

  if (!ready) return <div className="p-8 text-center text-white">กำลังโหลด...</div>;
  if (!account) return <div className="p-8 text-center text-white">ไม่พบบัญชี</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black px-3 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-lg pb-24">
        <h1 className="text-2xl font-bold">บัญชีของฉัน</h1>
        <div className="mt-4 space-y-2 rounded-2xl bg-gray-900 p-4 text-sm">
          <Line label="ชื่อ" value={account.full_name} />
          <Line label="ชื่อผู้ใช้" value={account.username} />
          <Line label="สิทธิ์" value={ROLE_LABEL[account.role] || account.role} />
          <Line label="สาขา" value={branchName(account)} />
          <Line label="โทร" value={account.phone || "-"} />
        </div>
        <form onSubmit={changePassword} className="mt-6 space-y-3">
          <h2 className="font-semibold">เปลี่ยนรหัสผ่าน</h2>
          <input value={current} onChange={(event) => setCurrent(event.target.value)} type="password" placeholder="รหัสผ่านเดิม" autoComplete="current-password" className={inputClass} required />
          <input value={next} onChange={(event) => setNext(event.target.value)} type="password" placeholder="รหัสผ่านใหม่" autoComplete="new-password" className={inputClass} required />
          <input value={confirm} onChange={(event) => setConfirm(event.target.value)} type="password" placeholder="ยืนยันรหัสผ่านใหม่" autoComplete="new-password" className={inputClass} required />
          {msg && <p className="text-sm text-red-200">{msg}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-red-600 py-3 font-semibold disabled:opacity-60">
            {busy ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
          </button>
        </form>
        <button type="button" onClick={logout} className="mt-3 w-full rounded-xl border border-white/20 py-3">
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-base outline-none focus:border-red-500";

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-400">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
