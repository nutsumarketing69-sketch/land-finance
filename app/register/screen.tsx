"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Phone, UserRound } from "lucide-react";
import LandScreen, { landButtonClass, landFieldClass } from "@/app/components/LandScreen";
import { createClient } from "@/lib/supabase/client";
import { asUuid } from "@/lib/landProfile";
import {
  generateInviteCode,
  landAuthError,
  landPasswordError,
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
    const passwordProblem = landPasswordError(password);
    if (passwordProblem) {
      setError(passwordProblem);
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
      <LandScreen title="Access Restricted" lede="Referral Link Required. หน้านี้เปิดเฉพาะผู้ที่ได้รับลิงก์แนะนำ หากไม่มีรหัสเชิญ หรือรหัสไม่ตรงกับระบบ แบบฟอร์มจะไม่แสดง">
        <Link href="/login" className={`block text-center ${landButtonClass()}`}>
          กลับไปเข้าสู่ระบบ
        </Link>
      </LandScreen>
    );
  }

  return (
    <LandScreen title="เปิดบัญชีจากลิงก์แนะนำ" lede="รหัสแนะนำมาจากลิงก์ที่เปิดหน้านี้อยู่แล้ว">
      <form onSubmit={submit}>
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
          {inviterId && <p className="mt-3 text-xs text-emerald-300">ลิงก์แนะนำนี้ใช้เปิดบัญชีได้</p>}
          {error && <p className="mt-4 rounded-2xl bg-rose-950 px-3 py-2 text-sm text-rose-200">{error}</p>}
          <button type="submit" disabled={busy} className={`mt-5 ${landButtonClass()}`}>
            {busy ? "กำลังบันทึก..." : "สร้างบัญชี"}
          </button>
          <Link href="/login" className="mt-4 block text-center text-sm font-medium text-amber-100">
            มีบัญชีแล้ว เข้าสู่ระบบ
          </Link>
        </form>
    </LandScreen>
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
    <label className="mt-4 block text-sm font-medium text-slate-200 first:mt-0" htmlFor={id}>
      {label}
      <span className={landFieldClass()}>
        {icon}
        {children}
      </span>
    </label>
  );
}
