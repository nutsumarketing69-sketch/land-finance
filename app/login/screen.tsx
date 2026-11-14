"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Phone } from "lucide-react";
import LandScreen, { landButtonClass, landFieldClass } from "@/app/components/LandScreen";
import { createClient } from "@/lib/supabase/client";
import { landAuthError, landPasswordError, normalizeThaiPhone, phoneAuthError, phoneToAuthEmail } from "@/lib/phoneAuth";

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
    const passwordProblem = landPasswordError(password);
    if (passwordProblem) {
      setError(passwordProblem);
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
    <LandScreen title="เข้าสู่ระบบ" lede="ใช้เบอร์โทรที่ลงทะเบียนไว้กับสัญญาขายฝาก">
      <form onSubmit={submit}>
        <label className="block text-sm font-medium text-slate-200" htmlFor="phone">
          เบอร์โทรศัพท์
          <span className={landFieldClass()}>
            <Phone className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
              autoComplete="username"
              placeholder="0891234567"
              className="land-control h-11 min-h-11 w-full border-0 bg-slate-900 text-base text-slate-100 outline-none placeholder:text-slate-400"
            />
          </span>
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-200" htmlFor="password">
          รหัสผ่าน
          <span className={landFieldClass()}>
            <Lock className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <input
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={show ? "text" : "password"}
              autoComplete="current-password"
              className="land-control h-11 min-h-11 w-full border-0 bg-slate-900 text-base text-slate-100 outline-none placeholder:text-slate-400"
            />
            <button type="button" onClick={() => setShow((value) => !value)} className="text-slate-400" aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>
        {error && <p className="mt-4 rounded-2xl bg-rose-950 px-3 py-2 text-sm text-rose-200">{error}</p>}
        <button type="submit" disabled={busy} className={`mt-5 ${landButtonClass()}`}>
          {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </LandScreen>
  );
}
