"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStaff } from "./AuthShell";

export default function AdminShortcut() {
  const { account } = useStaff();
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    if (account?.role !== "admin" || account.status !== "approved") return;
    createClient()
      .from("staff_accounts")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => setPending(count ?? 0));
  }, [account?.role, account?.status]);

  if (account?.role !== "admin" || account.status !== "approved") return null;

  return (
    <a
      href="/approvals"
      className="group rounded-2xl border border-red-500/70 bg-red-950/40 p-3 text-center transition-all hover:bg-red-900/50 sm:p-6"
    >
      <div className="mb-2 text-3xl sm:text-4xl">✅</div>
      <div className="font-semibold text-white group-hover:text-red-200">อนุมัติพนักงาน</div>
      <div className="mt-1 text-xs leading-tight text-red-100">
        {pending ? `รออนุมัติ ${pending} คน` : "ตรวจคำขอสมัครและกำหนดสิทธิ์"}
      </div>
    </a>
  );
}
