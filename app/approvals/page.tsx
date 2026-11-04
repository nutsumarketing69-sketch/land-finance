"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStaff } from "@/app/components/AuthShell";
import { authErrorText, branchName, formatBangkok, ROLE_LABEL, STATUS_LABEL, type StaffAccount } from "@/lib/staff";
import SectionBar from "@/app/components/SectionBar";

type Branch = { id: string; name: string };
type Draft = { role: string; branchId: string };

const FILTERS = [
  { id: "pending", label: "รออนุมัติ" },
  { id: "approved", label: "ใช้งานได้" },
  { id: "rejected", label: "ระงับ" },
  { id: "all", label: "ทั้งหมด" },
];

export default function ApprovalsPage() {
  const { account: me, ready } = useStaff();
  const [rows, setRows] = useState<StaffAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filter, setFilter] = useState("pending");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const supabase = createClient();
    const [people, branchRes] = await Promise.all([
      supabase
        .from("staff_accounts")
        .select("id, user_id, username, full_name, phone, branch_id, position, requested_role, role, status, employee_id, created_at, approved_at, branches(name)")
        .order("created_at", { ascending: false }),
      supabase.from("branches").select("id, name").order("name"),
    ]);
    if (people.error) setMsg(authErrorText(people.error));
    const list = (people.data || []) as StaffAccount[];
    setRows(list);
    setBranches(branchRes.data || []);
    setDrafts((prev) => {
      const next = { ...prev };
      list.forEach((row) => {
        if (!next[row.id]) {
          next[row.id] = {
            role: row.status === "pending" ? (row.requested_role === "manager" ? "manager" : "staff") : row.role,
            branchId: row.branch_id || "",
          };
        }
      });
      return next;
    });
    setLoading(false);
  };

  useEffect(() => {
    if (!ready) return;
    if (me?.role !== "admin") return;
    load();
  }, [ready, me?.role]);

  const review = async (row: StaffAccount, decision: "approved" | "rejected") => {
    const draft = drafts[row.id] || { role: "staff", branchId: row.branch_id || "" };
    if (decision === "approved" && !draft.role) {
      setMsg("เลือกสิทธิ์ก่อนอนุมัติ");
      return;
    }
    setBusyId(row.id);
    setMsg("");
    const { error } = await createClient().rpc("review_staff", {
      account_id: row.id,
      decision,
      new_role: decision === "approved" ? draft.role : row.role,
      new_branch: draft.branchId || null,
    });
    setBusyId("");
    if (error) {
      setMsg(authErrorText(error));
      return;
    }
    setMsg(decision === "approved" ? `อนุมัติ ${row.full_name} แล้ว เข้าใช้งานได้ทันที` : `ระงับ ${row.full_name} แล้ว`);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    await load();
  };

  if (!ready) return <div className="p-8 text-center text-white">กำลังตรวจสอบสิทธิ์...</div>;
  if (me?.role !== "admin") {
    return <div className="p-8 text-center text-white">หน้านี้ใช้ได้เฉพาะผู้ดูแลระบบ</div>;
  }

  const shown = rows.filter((row) => filter === "all" || row.status === filter);
  const counts = {
    pending: rows.filter((row) => row.status === "pending").length,
    approved: rows.filter((row) => row.status === "approved").length,
    rejected: rows.filter((row) => row.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black px-3 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-3xl pb-24">
        <SectionBar desk="shop" />
        <h1 className="text-2xl font-bold">อนุมัติพนักงาน</h1>
        <p className="mt-1 text-sm text-gray-400">
          คนที่สมัครใหม่ยังเข้าหน้าร้านไม่ได้ จนกว่าจะกดอนุมัติ จากนั้นชื่อจะไปอยู่ในรายชื่อพนักงาน และใช้สิทธิ์ตามที่กำหนด
          คำขอเดียวกันอยู่ในกลุ่มเทเลแกรม พร้อมปุ่มอนุมัติและไม่ผ่าน กดที่นี่หรือกดในกลุ่มได้ผลเหมือนกัน
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
          <Stat label="รออนุมัติ" value={counts.pending} />
          <Stat label="ใช้งานได้" value={counts.approved} />
          <Stat label="ระงับ" value={counts.rejected} />
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`shrink-0 rounded-full px-4 py-2 ${filter === item.id ? "bg-red-600" : "bg-gray-800"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {msg && <p className="mt-4 rounded-xl bg-gray-800 px-3 py-2 text-sm">{msg}</p>}
        {loading ? (
          <p className="mt-8 text-center text-gray-400">กำลังโหลด...</p>
        ) : shown.length === 0 ? (
          <p className="mt-8 text-center text-gray-400">ไม่มีรายการในกลุ่มนี้</p>
        ) : (
          <div className="mt-4 space-y-3">
            {shown.map((row) => {
              const draft = drafts[row.id] || { role: row.role, branchId: row.branch_id || "" };
              const locked = busyId === row.id;
              return (
                <article key={row.id} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold">{row.full_name}</h2>
                      <p className="text-sm text-gray-400">
                        {row.username} · {row.phone || "ไม่มีเบอร์"} · {branchName(row)}
                      </p>
                    </div>
                    <span className="rounded-full bg-black px-3 py-1 text-xs text-red-200">
                      {STATUS_LABEL[row.status] || row.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-300">
                    ขอเป็น{row.position || ROLE_LABEL[row.requested_role] || "พนักงาน"} · สมัคร {formatBangkok(row.created_at)}
                    {row.approved_at ? ` · อัปเดต ${formatBangkok(row.approved_at)}` : ""}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <select
                      value={draft.role}
                      onChange={(event) => setDrafts((prev) => ({ ...prev, [row.id]: { ...draft, role: event.target.value } }))}
                      className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-3 text-base"
                    >
                      <option value="staff">สิทธิ์พนักงาน</option>
                      <option value="manager">สิทธิ์ผู้จัดการสาขา</option>
                      <option value="admin">สิทธิ์ผู้ดูแลระบบ ทำได้ทุกอย่าง</option>
                    </select>
                    <select
                      value={draft.branchId}
                      onChange={(event) => setDrafts((prev) => ({ ...prev, [row.id]: { ...draft, branchId: event.target.value } }))}
                      className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-3 text-base"
                    >
                      <option value="">ไม่ผูกสาขา</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => review(row, "approved")}
                      className="rounded-xl bg-red-600 py-3 font-semibold disabled:opacity-60"
                    >
                      {row.status === "approved" ? "บันทึกสิทธิ์" : "อนุมัติ"}
                    </button>
                    <button
                      type="button"
                      disabled={locked || row.status === "rejected"}
                      onClick={() => review(row, "rejected")}
                      className="rounded-xl border border-gray-600 py-3 disabled:opacity-40"
                    >
                      ไม่ผ่าน / ระงับ
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// telegram buttons and this page approve the same request
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-gray-900 px-2 py-3">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}
