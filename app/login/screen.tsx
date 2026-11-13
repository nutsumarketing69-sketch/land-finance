"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Landmark, Lock, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { landAuthError, normalizeThaiPhone, phoneAuthError, phoneToAuthEmail } from "@/lib/phoneAuth";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = phoneAuthError(phone);
    if (problem) {
      setError(problem);
      return;
    }
    if (password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัว");
      return;
    }
    const normalized = normalizeThaiPhone(phone);
    if (!normalized) {
      setError("เบอร์โทรศัพท์ไม่ถูกต้อง ใช้รูปแบบ 0891234567");
      return;
    }
    setBusy(true);
    setError("");
    const { error: signError } = await createClient().auth.signInWithPassword({
      email: phoneToAuthEmail(normalized),
      password,
    });
    if (signError) {
      setError(landAuthError(signError));
      setBusy(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#0c1210] px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200">
            <Landmark className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-emerald-200/80">ขายฝาก · จำนอง · จำนำโฉนด</p>
            <h1 className="text-2xl font-semibold">เข้าสู่ระบบ</h1>
          </div>
        </div>
        <form onSubmit={submit} className="rounded-3xl bg-white p-5 text-slate-900 shadow-2xl sm:p-6">
          <label className="block text-sm font-medium" htmlFor="phone">
            เบอร์โทรศัพท์
            <span className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
              <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                autoComplete="username"
                placeholder="0891234567"
                className="w-full bg-transparent py-3 text-base outline-none"
              />
            </span>
          </label>
          <label className="mt-4 block text-sm font-medium" htmlFor="password">
            รหัสผ่าน
            <span className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
              <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={show ? "text" : "password"}
                autoComplete="current-password"
                className="w-full bg-transparent py-3 text-base outline-none"
              />
              <button type="button" onClick={() => setShow((value) => !value)} className="text-slate-500" aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          {error && <p className="mt-4 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-2xl bg-emerald-700 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
          <p className="mt-4 text-center text-sm text-slate-500">
            ยังไม่มีบัญชี สมัครได้จากลิงก์แนะนำเท่านั้น
          </p>
          <Link href="/register" className="mt-2 block text-center text-sm font-medium text-emerald-800">
            ดูหน้าสมัคร
          </Link>
        </form>
      </div>
    </main>
  );
}
