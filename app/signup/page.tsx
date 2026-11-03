"use client";

import { useEffect, useState } from "react";
import AuthFrame from "@/app/components/AuthFrame";
import { createClient } from "@/lib/supabase/client";
import { authErrorText, SIGNUP_JOBS, staffEmail, usernameError } from "@/lib/staff";

type Branch = { id: string; name: string };

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameHint, setUsernameHint] = useState("");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState("");
  const [jobId, setJobId] = useState<string>(SIGNUP_JOBS[0].id);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    createClient()
      .from("branches")
      .select("id, name")
      .order("name")
      .then(({ data }) => setBranches(data || []));
  }, []);

  const checkUsername = async (value: string) => {
    const problem = usernameError(value);
    if (problem) {
      setUsernameHint(problem);
      return problem;
    }
    const { data, error: rpcError } = await createClient().rpc("username_available", {
      name: value.trim().toLowerCase(),
    });
    if (rpcError) {
      setUsernameHint("");
      return null;
    }
    if (data === false) {
      setUsernameHint("ชื่อผู้ใช้นี้มีคนใช้แล้ว");
      return "ชื่อผู้ใช้นี้มีคนใช้แล้ว";
    }
    setUsernameHint("ใช้ชื่อนี้ได้");
    return null;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (fullName.trim().length < 2) {
      setError("กรอกชื่อ-นามสกุล");
      return;
    }
    const nameProblem = await checkUsername(username);
    if (nameProblem) {
      setError(nameProblem);
      return;
    }
    if (password.length < 8 || !/\d/.test(password)) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวเลขอย่างน้อย 1 ตัว");
      return;
    }
    if (password !== confirm) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    if (branches.length > 0 && !branchId) {
      setError("เลือกสาขาที่ทำงาน");
      return;
    }
    const job = SIGNUP_JOBS.find((item) => item.id === jobId) || SIGNUP_JOBS[0];
    setBusy(true);
    const supabase = createClient();
    const email = staffEmail(username);
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim().toLowerCase(),
          full_name: fullName.trim(),
          phone: phone.trim(),
          branch_id: branchId,
          requested_role: job.role,
          position: job.position,
        },
      },
    });
    if (signError) {
      setError(authErrorText(signError));
      setBusy(false);
      return;
    }
    if (!data.session) {
      const second = await supabase.auth.signInWithPassword({ email, password });
      if (second.error) {
        setError("สมัครแล้ว แต่ยังเข้าสู่ระบบไม่ได้ กรุณาแจ้งผู้ดูแลระบบ");
        setBusy(false);
        return;
      }
    }
    await fetch("/telegram/signup", { method: "POST" }).catch(() => null);
    window.location.href = "/pending";
  };

  return (
    <AuthFrame title="สมัครสมาชิก" subtitle="บัญชีจะรอผู้ดูแลระบบอนุมัติก่อนใช้งาน" wide>
      <form onSubmit={submit} className="space-y-4">
        <Field label="ชื่อ-นามสกุล">
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} required className={inputClass} placeholder="ชื่อที่ใช้ในร้าน" />
        </Field>
        <Field label="ชื่อผู้ใช้ USER">
          <input
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setUsernameHint("");
            }}
            onBlur={() => {
              if (username.trim()) checkUsername(username);
            }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            className={inputClass}
            placeholder="ภาษาอังกฤษเท่านั้น"
          />
          {usernameHint && (
            <p className={`mt-1 text-xs ${usernameHint === "ใช้ชื่อนี้ได้" ? "text-green-700" : "text-red-600"}`}>{usernameHint}</p>
          )}
        </Field>
        <Field label="เบอร์โทร">
          <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" className={inputClass} placeholder="ว่างได้" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="สาขา">
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={inputClass} required={branches.length > 0}>
              <option value="">เลือกสาขา</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </Field>
          <Field label="หน้าที่ในร้าน">
            <select value={jobId} onChange={(event) => setJobId(event.target.value)} className={inputClass}>
              {SIGNUP_JOBS.map((job) => (
                <option key={job.id} value={job.id}>{job.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="รหัสผ่าน">
          <span className="flex gap-2">
            <input value={password} onChange={(event) => setPassword(event.target.value)} type={show ? "text" : "password"} autoComplete="new-password" required className={inputClass} />
            <button type="button" onClick={() => setShow((value) => !value)} className="shrink-0 rounded-xl border border-gray-300 px-3 text-sm">
              {show ? "ซ่อน" : "แสดง"}
            </button>
          </span>
          <p className="mt-1 text-xs text-gray-500">อย่างน้อย 8 ตัว และมีตัวเลข</p>
        </Field>
        <Field label="ยืนยันรหัสผ่าน">
          <input value={confirm} onChange={(event) => setConfirm(event.target.value)} type={show ? "text" : "password"} autoComplete="new-password" required className={inputClass} />
        </Field>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-red-600 py-3 text-base font-semibold text-white disabled:opacity-60">
          {busy ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </button>
        <a href="/login" className="block text-center text-sm font-medium text-red-700">
          มีบัญชีแล้ว เข้าสู่ระบบ
        </a>
        <p className="text-center text-xs leading-5 text-gray-500">
          หลังสมัครจะเข้าหน้าสถานะรออนุมัติ ยังเปิดหน้าร้านไม่ได้จนกว่าผู้ดูแลระบบจะกดอนุมัติ
        </p>
      </form>
    </AuthFrame>
  );
}

const inputClass =
  "mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      {children}
    </label>
  );
}
// signup notifies the shop group
