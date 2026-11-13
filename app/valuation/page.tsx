import { Suspense } from "react";
import { redirect } from "next/navigation";
import { asLandProfile } from "@/lib/landProfile";
import { createClient } from "@/lib/supabase/server";
import ValuationScreen, { type ValuationCustomer } from "./screen";

export const instant = false;

const PREVIEW_CUSTOMERS: ValuationCustomer[] = [
  { id: "preview-customer-1", full_name: "สมชาย ใจดี", phone: "0812345678" },
  { id: "preview-customer-2", full_name: "มาลี ทองดี", phone: "0891112222" },
];

export default function Page({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  return (
    <Suspense fallback={<main className="bg-slate-950 p-8 text-center text-slate-200">กำลังเปิดหน้าประเมิน</main>}>
      <ValuationContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ValuationContent({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  const query = await searchParams;
  const previewFlag = (Array.isArray(query.preview) ? query.preview[0] : query.preview) === "1";
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user && previewFlag) {
    return <ValuationScreen preview customers={PREVIEW_CUSTOMERS} />;
  }
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase.from("profiles").select("id, full_name, phone, invite_code, referred_by").eq("id", user.id).maybeSingle();
  const profile = asLandProfile(profileRow);
  if (!profile) redirect("/login");

  const { data } = await supabase.from("customers").select("id, full_name, phone").eq("owner_id", profile.id).order("full_name");
  const customers = (data ?? []).flatMap((row) => {
    if (!row || typeof row.id !== "string") return [];
    return [{
      id: row.id,
      full_name: typeof row.full_name === "string" ? row.full_name : null,
      phone: typeof row.phone === "string" ? row.phone : null,
    }];
  });
  return <ValuationScreen preview={false} customers={customers} />;
}
