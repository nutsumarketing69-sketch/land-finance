"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isOpenPath, ROLE_LABEL, type StaffAccount } from "@/lib/staff";

type StaffState = {
  ready: boolean;
  account: StaffAccount | null;
};

const StaffContext = createContext<StaffState>({ ready: false, account: null });

export function useStaff() {
  return useContext(StaffContext);
}

async function loadAccount() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { user: null, account: null as StaffAccount | null };
  const { data: account } = await supabase
    .from("staff_accounts")
    .select("id, user_id, username, full_name, phone, branch_id, position, requested_role, role, status, employee_id, created_at, approved_at, branches(name)")
    .eq("user_id", user.id)
    .maybeSingle();
  return { user, account: (account || null) as StaffAccount | null };
}

export function SessionBar() {
  const path = usePathname() || "/";
  const { account } = useStaff();
  if (!account || account.status !== "approved" || isOpenPath(path)) return null;

  const logout = async () => {
    await createClient().auth.signOut();
    window.location.href = "/login";
  };

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print session-bar flex flex-wrap items-center justify-between gap-2 bg-black px-3 py-2 text-sm text-white">
        <div className="min-w-0 break-words">
          <span className="font-semibold">{account.full_name}</span>
          <span className="text-gray-300"> · {ROLE_LABEL[account.role] || account.role}</span>
          <span className="text-gray-500"> · {account.username}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {account.role === "admin" && (
            <a href="/approvals" className="rounded-full bg-red-600 px-3 py-2 font-medium">
              อนุมัติพนักงาน
            </a>
          )}
          <a href="/account" className="rounded-full border border-white/30 px-3 py-2">
            บัญชีของฉัน
          </a>
          <button type="button" onClick={logout} className="rounded-full border border-white/30 px-3 py-2">
            ออกจากระบบ
          </button>
        </div>
      </div>
    </>
  );
}

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "/";
  const router = useRouter();
  const open = isOpenPath(path);
  const [account, setAccount] = useState<StaffAccount | null>(null);
  const [ready, setReady] = useState(open);
  const [allowed, setAllowed] = useState(open);

  useEffect(() => {
    let cancel = false;
    const current = path;
    (async () => {
      const { user, account: row } = await loadAccount();
      if (cancel) return;
      setAccount(row);
      if (isOpenPath(current)) {
        setAllowed(true);
        setReady(true);
        return;
      }
      if (!user) {
        setAllowed(false);
        setReady(true);
        router.replace("/login");
        return;
      }
      if (!row || row.status !== "approved") {
        setAllowed(false);
        setReady(true);
        router.replace("/pending");
        return;
      }
      if (current.startsWith("/approvals") && row.role !== "admin") {
        setAllowed(false);
        setReady(true);
        router.replace("/");
        return;
      }
      setAllowed(true);
      setReady(true);
    })();
    return () => {
      cancel = true;
    };
  }, [path, router]);

  const show = open || (ready && allowed);

  return (
    <StaffContext.Provider value={{ ready, account }}>
      {show && <SessionBar />}
      {show ? (
        children
      ) : (
        <div className="flex min-h-screen items-center justify-center bg-[#140406] px-6 text-white">
          <div className="text-center">
            <img src="/ratsada-logo.png" alt="รัษฎาแอร์" className="mx-auto h-20 w-20 rounded-2xl bg-white p-2" />
            <p className="mt-4 text-sm text-red-100">กำลังตรวจสอบสิทธิ์เข้าใช้งาน</p>
          </div>
        </div>
      )}
    </StaffContext.Provider>
  );
}
