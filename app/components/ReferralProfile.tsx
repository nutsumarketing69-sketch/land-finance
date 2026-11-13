"use client";

import { useEffect, useState } from "react";
import { Check, Copy, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LandProfile } from "@/lib/landProfile";
import { referralPath } from "@/lib/phoneAuth";

export default function ReferralProfile({ profile }: { profile: LandProfile }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const name = profile.full_name?.trim() || profile.phone || "สมาชิก";
  const link = origin && profile.invite_code ? `${origin}${referralPath(profile.invite_code)}` : "";

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const area = document.createElement("textarea");
      area.value = link;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    window.location.href = "/login";
  };

  return (
    <section className="rounded-3xl border border-emerald-200/80 bg-white p-4 text-slate-900 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-emerald-700">บัญชีของฉัน</p>
          <h2 className="truncate text-lg font-semibold">{name}</h2>
          {profile.phone && profile.full_name?.trim() && (
            <p className="text-sm text-slate-500">{profile.phone}</p>
          )}
        </div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          ออกจากระบบ
        </button>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-slate-700">ลิงก์แนะนำของคุณ</p>
        <p className="mt-1 break-all rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {link || "กำลังเตรียมลิงก์"}
        </p>
        <button
          type="button"
          onClick={copyLink}
          disabled={!link}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white disabled:opacity-60 sm:w-auto"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์แนะนำ"}
        </button>
      </div>
    </section>
  );
}
