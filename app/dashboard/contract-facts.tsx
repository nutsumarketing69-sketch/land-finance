import { contractSnapshot } from "@/lib/contractFigures";
import { formatBaht } from "@/lib/financeCalculator";
import type { DashboardContract } from "@/lib/dashboardData";

function baht(value: number) {
  try {
    return formatBaht(String(value));
  } catch {
    return String(value);
  }
}

export default function ContractFacts({ contract, today }: { contract: DashboardContract; today: string }) {
  const snap = contractSnapshot({
    principal: contract.principal,
    interestRate: contract.interestRate,
    interestPeriodType: contract.interestPeriodType,
    startDate: contract.startDate,
    endDate: contract.endDate,
    alertBeforeDays: contract.alertBeforeDays,
    today,
  });
  return (
    <div className="space-y-1 text-sm text-slate-300" data-testid={`facts-${contract.id}`}>
      <p>เริ่ม {contract.startDate || "-"} · สิ้นสุด {contract.endDate || "-"}</p>
      <p>
        แจ้งเตือน {contract.alertBeforeDays ?? "-"} วัน ({snap.alertMonthsLabel} เดือน) · ผ่านไปแล้ว {snap.elapsedDays} วัน
      </p>
      <p>ดอกเบี้ยถึงวันนี้ {baht(snap.accruedToday)} · ปิดวันนี้ {baht(snap.payoffToday)} · ปิดวันสิ้นสุด {baht(snap.payoffAtEnd)}</p>
      {snap.overdueDays > 0 ? (
        <p className="font-medium text-red-300" data-testid={`overdue-${contract.id}`}>
          เกินสัญญามาแล้ว {snap.overdueDays} วัน (เป็นยอดดอกเบี้ยส่วนเกิน {baht(snap.excessInterest)})
        </p>
      ) : null}
    </div>
  );
}
