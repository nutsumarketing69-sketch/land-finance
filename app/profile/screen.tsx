"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LandNav from "@/app/components/LandNav";
import { landControlClass } from "@/app/components/LandScreen";
import { LAND_BRAND } from "@/lib/brand";
import { landPasswordError, referralPath } from "@/lib/phoneAuth";
import { createClient } from "@/lib/supabase/client";

export default function ProfileScreen({ preview = false }: { preview?: boolean }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [nextPassword, setNextPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (preview) {
      setName("บัญชีตัวอย่าง");
      setPhone("0800000000");
      setLink(`${window.location.origin}/register?ref=PREVIEW1`);
      return;
    }
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;
      const profile = await supabase.from("profiles").select("full_name, phone, invite_code").eq("id", userId).maybeSingle();
      setName(profile.data?.full_name || "");
      setPhone(profile.data?.phone || "");
      if (profile.data?.invite_code) setLink(`${window.location.origin}${referralPath(profile.data.invite_code)}`);
    });
  }, [preview]);

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    const problem = landPasswordError(nextPassword);
    if (problem) {
      setMessage(problem);
      return;
    }
    if (nextPassword !== confirm) {
      setMessage("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    if (preview) {
      setMessage("โหมดตัวอย่างยังไม่เปลี่ยนรหัสผ่าน");
      return;
    }
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: nextPassword });
    setBusy(false);
    setNextPassword("");
    setConfirm("");
    setMessage(error ? "เปลี่ยนรหัสผ่านไม่สำเร็จ" : "เปลี่ยนรหัสผ่านแล้ว");
  }

  return (
    <LandNav preview={preview}>
      <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-8 text-white">
        <p className="text-xs text-amber-200">{LAND_BRAND}</p>
        <h1 className="text-2xl font-semibold">โปรไฟล์</h1>
        <section className="rounded-3xl border border-slate-700 bg-slate-900 p-4">
          <p className="text-lg font-semibold">{name || "ไม่ระบุชื่อ"}</p>
          <p className="mt-1 text-sm text-slate-300">{phone || "-"}</p>
          <p className="mt-4 text-sm text-slate-400">ลิงก์แนะนำ</p>
          <p className="mt-1 break-all text-sm">{link || "ยังไม่มีลิงก์"}</p>
          <button type="button" onClick={() => void copyLink()} className="mt-3 rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950">
            {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์แนะนำ"}
          </button>
        </section>
        <form onSubmit={(event) => void changePassword(event)} className="rounded-3xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="font-semibold">เปลี่ยนรหัสผ่าน</h2>
          <label className="mt-3 block text-sm text-slate-200">รหัสผ่านใหม่
            <input type="password" autoComplete="new-password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} className={`mt-1 ${landControlClass()}`} />
          </label>
          <label className="mt-3 block text-sm text-slate-200">ยืนยันรหัสผ่าน
            <input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className={`mt-1 ${landControlClass()}`} />
          </label>
          <button type="submit" disabled={busy} className="mt-4 rounded-full bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950">
            {busy ? "กำลังบันทึก" : "บันทึกรหัสผ่าน"}
          </button>
          {message ? <p className="mt-3 text-sm text-amber-100">{message}</p> : null}
        </form>
        <Link href="/dashboard" className="text-sm text-emerald-200">กลับแดชบอร์ด</Link>
      </main>
    </LandNav>
  );
}
