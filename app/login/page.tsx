"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthFrame from "@/app/components/AuthFrame";
import { createClient } from "@/lib/supabase/client";
import { authErrorText, staffEmail, usernameError } from "@/lib/staff";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ratsada-saved-login") || "null");
      if (saved?.username) setUsername(String(saved.username));
      if (saved?.password) setPassword(String(saved.password));
    } catch {
      localStorage.removeItem("ratsada-saved-login");
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: row } = await supabase
        .from("staff_accounts")
        .select("status")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (row?.status === "approved") router.replace("/");
      else if (row) router.replace("/pending");
    });
  }, [router]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nameError = usernameError(username);
    if (nameError) {
      setError(nameError);
      return;
    }
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: staffEmail(username),
      password,
    });
    if (signError) {
      setError(authErrorText(signError));
      setBusy(false);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const { data: row } = await supabase
      .from("staff_accounts")
      .select("status")
      .eq("user_id", userData.user?.id || "")
      .maybeSingle();
    if (row?.status === "approved") {
      window.location.href = "/";
      return;
    }
    window.location.href = "/pending";
  };

  return (
    <AuthFrame title="รัษฎาแอร์" subtitle="เข้าสู่ระบบพนักงาน">
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          ชื่อผู้ใช้ USER
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            placeholder="ภาษาอังกฤษเท่านั้น"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          รหัสผ่าน
          <span className="mt-1 flex gap-2">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
            <button
              type="button"
              onClick={() => setShow((value) => !value)}
              className="shrink-0 rounded-xl border border-gray-300 px-3 text-sm"
            >
              {show ? "ซ่อน" : "แสดง"}
            </button>
          </span>
        </label>
        <button
          type="button"
          onClick={() => {
            const nameError = usernameError(username);
            if (nameError) {
              setError(nameError);
              return;
            }
            if (!password) {
              setError("ใส่รหัสผ่านก่อนกด Save User/pass");
              return;
            }
            localStorage.setItem("ratsada-saved-login", JSON.stringify({ username: username.trim(), password }));
            setError("");
            setSavedNote("บันทึกในเครื่องนี้แล้ว ครั้งต่อไปไม่ต้องพิมพ์ใหม่");
          }}
          className="w-full rounded-xl border border-gray-300 py-3 text-base font-semibold text-gray-800"
        >
          Save User/pass
        </button>
        {savedNote && <p className="text-center text-sm text-green-700">{savedNote}</p>}
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-red-600 py-3 text-base font-semibold text-white disabled:opacity-60"
        >
          {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
        <a href="/forgot" className="block text-center text-sm font-medium text-red-700">
          ลืมรหัสผ่าน
        </a>
        <a
          href="/signup"
          className="block w-full rounded-xl border border-red-200 py-3 text-center text-base font-semibold text-red-700"
        >
          สมัครสมาชิก
        </a>
        <p className="text-center text-xs leading-5 text-gray-500">
          พนักงานใหม่สมัครได้เอง แต่ยังเปิดบิลหรือดูข้อมูลร้านไม่ได้ จนกว่าผู้ดูแลระบบจะอนุมัติ
        </p>
      </form>
    </AuthFrame>
  );
}
// forgot password opens from this screen
