"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Phone, ShieldAlert, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { asUuid } from "@/lib/landProfile";
import {
  generateInviteCode,
  landAuthError,
  normalizeThaiPhone,
  phoneAuthError,
  phoneToAuthEmail,
} from "@/lib/phoneAuth";

type Gate = "restricted" | "form";

export default function RegisterScreen({ initialRef }: { initialRef: string }) {
  const router = useRouter();
  const ref = initialRef.trim();
  const [gate, setGate] = useState<Gate>(ref ? "form" : "restricted");
  const [inviterId, setInviterId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ref) {
      setGate("restricted");
      setInviterId(null);
      return;
    }
    let cancel = false;
    const supabase = createClient();
    void supabase.rpc("lookup_inviter", { code: ref }).then(({ data, error: lookupError }) => {
      if (cancel || lookupError) return;
      const id = asUuid(data);
      if (!id) {
        setInviterId(null);
        setGate("restricted");
        return;
      }
      setInviterId(id);
      setGate("form");
    });
    return () => {
      cancel = true;
    };
  }, [ref]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (fullName.trim().length < 2) {
      setError("กรอกชื่อ-นามสกุล");
      return;
    }
    const phoneProblem = phoneAuthError(phone);
    if (phoneProblem) {
      setError(phoneProblem);
      return;
    }
    if (password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัว");
      return;
    }
    if (password !== confirm) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    const normalized = normalizeThaiPhone(phone);
    if (!normalized || !ref) {
      setGate("restricted");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const lookup = await supabase.rpc("lookup_inviter", { code: ref });
    if (lookup.error) {
      setError("ยังตรวจรหัสแนะนำไม่ได้ ลองอีกครั้ง");
      setBusy(false);
      return;
    }
    const resolvedInviter = asUuid(lookup.data);
    if (!resolvedInviter) {
      setInviterId(null);
      setGate("restricted");
      setBusy(false);
      return;
    }
    setInviterId(resolvedInviter);

    let inviteCode = generateInviteCode();
    const remoteCode = await supabase.rpc("generate_invite_code");
    if (!remoteCode.error && typeof remoteCode.data === "string" && remoteCode.data) {
      inviteCode = remoteCode.data;
    }

    const email = phoneToAuthEmail(normalized);
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          account_kind: "land_member",
          phone: normalized,
          full_name: fullName.trim(),
          invite_code: inviteCode,
          referral_code: ref,
        },
      },
    });
    if (signError || !data.user) {
      const text = landAuthError(signError);
      if (text === "ลิงก์แนะนำไม่ถูกต้อง") {
        setGate("restricted");
        setBusy(false);
        return;
      }
      setError(text);
      setBusy(false);
      return;
    }

    if (!data.session) {
      const second = await supabase.auth.signInWithPassword({ email, password });
      if (second.error) {
        setError(landAuthError(second.error));
        setBusy(false);
        return;
      }
    }

    const existing = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
    if (!existing.data) {
      const inserted = await supabase.from("profiles").insert({
        id: data.user.id,
        phone: normalized,
        full_name: fullName.trim(),
        invite_code: inviteCode,
        referred_by: resolvedInviter,
        role: "member",
      });
      if (inserted.error) {
        const again = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
        if (!again.data) {
          setError("สมัครแล้ว แต่ยังบันทึกโปรไฟล์ไม่ได้");
          setBusy(false);
          return;
        }
      }
    }

    router.push("/dashboard");
    router.refresh();
  };

  if (gate === "restricted") {
    return (
      <main className="min-h-screen bg-[#0c1210] px-4 py-10 text-white">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mt-5 text-xs font-semibold tracking-[0.16em] text-amber-700">Access Restricted</p>
          <h1 className="mt-1 text-2xl font-semibold">ต้องใช้ลิงก์แนะนำ</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Referral Link Required. หน้าสมัครเปิดเฉพาะผู้ที่ได้รับลิงก์แนะนำ หากไม่มีรหัสเชิญ หรือรหัสไม่ตรงกับระบบ แบบฟอร์มจะไม่แสดง
          </p>
          <Link href="/login" className="mt-6 block rounded-2xl bg-slate-900 py-3 text-center text-base font-semibold text-white">
            กลับไปเข้าสู่ระบบ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0c1210] px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-md">
        <p className="text-xs font-semibold tracking-[0.16em] text-emerald-200/80">ขายฝาก · จำนอง · จำนำโฉนด</p>
        <h1 className="mt-1 text-2xl font-semibold">สมัครสมาชิก</h1>
        <p className="mt-1 text-sm text-emerald-50/80">รหัสแนะนำมาจากลิงก์ที่เปิดหน้านี้อยู่แล้ว</p>
        <form onSubmit={submit} className="mt-5 rounded-3xl bg-white p-5 text-slate-900 shadow-2xl sm:p-6">
          <Field id="full-name" label="ชื่อ-นามสกุล" icon={<UserRound className="h-4 w-4 text-slate-400" />}>
            <input
              id="full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              className="w-full bg-transparent py-3 text-base outline-none"
            />
          </Field>
          <Field id="phone" label="เบอร์โทรศัพท์" icon={<Phone className="h-4 w-4 text-slate-400" />}>
            <input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
              autoComplete="tel"
              placeholder="0891234567"
              className="w-full bg-transparent py-3 text-base outline-none"
            />
          </Field>
          <Field id="password" label="รหัสผ่าน" icon={<Lock className="h-4 w-4 text-slate-400" />}>
            <input
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={show ? "text" : "password"}
              autoComplete="new-password"
              className="w-full bg-transparent py-3 text-base outline-none"
            />
            <button type="button" onClick={() => setShow((value) => !value)} className="text-slate-500" aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </Field>
          <Field id="confirm" label="ยืนยันรหัสผ่าน" icon={<Lock className="h-4 w-4 text-slate-400" />}>
            <input
              id="confirm"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              type={show ? "text" : "password"}
              autoComplete="new-password"
              className="w-full bg-transparent py-3 text-base outline-none"
            />
          </Field>
          {inviterId && <p className="mt-3 text-xs text-emerald-700">ลิงก์แนะนำนี้ใช้สมัครได้</p>}
          {error && <p className="mt-4 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="mt-5 w-full rounded-2xl bg-emerald-700 py-3 text-base font-semibold text-white disabled:opacity-60">
            {busy ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>
          <Link href="/login" className="mt-4 block text-center text-sm font-medium text-emerald-800">
            มีบัญชีแล้ว เข้าสู่ระบบ
          </Link>
        </form>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-4 block text-sm font-medium first:mt-0" htmlFor={id}>
      {label}
      <span className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
        {icon}
        {children}
      </span>
    </label>
  );
}
