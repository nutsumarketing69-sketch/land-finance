import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CONTRACT_TYPE_LABELS, formatBaht, type ContractType } from "@/lib/financeCalculator";

export default function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0c1210] px-4 py-10 text-white">กำลังเปิดสัญญา</main>}>
      <ContractDetail params={params} />
    </Suspense>
  );
}

async function ContractDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("contract_number, contract_type, status, principal_amount")
    .eq("id", id)
    .maybeSingle();

  const row = data as {
    contract_number: string | null;
    contract_type: string | null;
    status: string | null;
    principal_amount: string | number | null;
  } | null;
  const type = row?.contract_type;
  const typeLabel = type && type in CONTRACT_TYPE_LABELS ? CONTRACT_TYPE_LABELS[type as ContractType] : "สัญญา";
  let principal = "";
  if (row?.principal_amount !== null && row?.principal_amount !== undefined && row.principal_amount !== "") {
    try {
      principal = formatBaht(String(row.principal_amount));
    } catch {
      principal = "";
    }
  }

  return (
    <main className="min-h-screen bg-[#0c1210] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-200/80">สัญญาที่บันทึกแล้ว</p>
        <h1 className="text-2xl font-semibold" data-testid="saved-contract-number">
          {row?.contract_number || "สัญญานี้ยังไม่มีเลขที่"}
        </h1>
        {error || !row ? (
          <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
            เปิดรายละเอียดสัญญาไม่สำเร็จ
          </p>
        ) : (
          <dl className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-emerald-100/70">ประเภท</dt>
              <dd>{typeLabel}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-emerald-100/70">สถานะ</dt>
              <dd>{row.status === "active" ? "ใช้งานอยู่" : row.status}</dd>
            </div>
            {principal ? (
              <div className="flex justify-between gap-3">
                <dt className="text-emerald-100/70">เงินต้น</dt>
                <dd>{principal}</dd>
              </div>
            ) : null}
          </dl>
        )}
        <Link href="/dashboard" className="text-sm text-emerald-200 underline-offset-4 hover:underline">
          กลับแดชบอร์ด
        </Link>
      </div>
    </main>
  );
}
