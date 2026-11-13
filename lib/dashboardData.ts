import type { ContractType, InterestPeriodType } from "./financeCalculator";

export type AlertKind = "upcoming" | "overdue";
export type MatchReason = "name" | "phone" | "deed" | "contract";

export type DashboardContract = {
  id: string;
  contractNumber: string;
  contractType: ContractType | string;
  principal: string;
  interestRate: string;
  interestPeriodType: InterestPeriodType | string;
  startDate: string;
  endDate: string;
  alertBeforeDays: number | null;
  status: string;
  customerName: string;
  customerPhone: string;
  deedNumber: string;
  province: string;
  district: string;
};

export const MATCH_REASON_LABELS: Record<MatchReason, string> = {
  name: "ชื่อ",
  phone: "เบอร์โทร",
  deed: "เลขโฉนด",
  contract: "เลขสัญญา",
};

export function addIsoDays(iso: string, delta: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + delta);
  const nextYear = utc.getUTCFullYear();
  const nextMonth = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(utc.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function classifyAlert(contract: DashboardContract, today: string): AlertKind | null {
  if (contract.status === "closed" || !contract.endDate || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  if (today > contract.endDate) return "overdue";
  if (contract.alertBeforeDays == null || contract.alertBeforeDays < 0) return null;
  const windowStart = addIsoDays(contract.endDate, -contract.alertBeforeDays);
  if (today >= windowStart) return "upcoming";
  return null;
}

export function matchContracts(contracts: readonly DashboardContract[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const digits = needle.replace(/\D/g, "");
  return contracts.flatMap((contract) => {
    const reasons: MatchReason[] = [];
    if (contract.customerName.toLowerCase().includes(needle)) reasons.push("name");
    const phone = contract.customerPhone.toLowerCase();
    if (phone.includes(needle) || (digits.length > 0 && phone.replace(/\D/g, "").includes(digits))) reasons.push("phone");
    if (contract.deedNumber.toLowerCase().includes(needle)) reasons.push("deed");
    if (contract.contractNumber.toLowerCase().includes(needle)) reasons.push("contract");
    return reasons.length ? [{ contract, reasons }] : [];
  });
}

export const PREVIEW_TODAY = "2026-11-13";

export const PREVIEW_PROFILE = {
  id: "00000000-0000-4000-8000-000000000001",
  full_name: "บัญชีตัวอย่าง",
  phone: "0800000000",
  invite_code: "PREVIEW1",
  referred_by: "00000000-0000-4000-8000-000000000099",
};

export function previewContracts(today = PREVIEW_TODAY): { owned: DashboardContract[]; incoming: DashboardContract[] } {
  const upcomingEnd = addIsoDays(today, 7);
  const overdueEnd = addIsoDays(today, -12);
  const laterEnd = addIsoDays(today, 200);
  return {
    owned: [
      {
        id: "00000000-0000-4000-8000-000000000011",
        contractNumber: "LF-1001",
        contractType: "sale_redemption",
        principal: "100000",
        interestRate: "1.50",
        interestPeriodType: "monthly",
        startDate: addIsoDays(today, -30),
        endDate: upcomingEnd,
        alertBeforeDays: 14,
        status: "active",
        customerName: "สมชาย ใจดี",
        customerPhone: "0891112222",
        deedNumber: "1001",
        province: "เชียงใหม่",
        district: "เมือง",
      },
      {
        id: "00000000-0000-4000-8000-000000000012",
        contractNumber: "LF-2002",
        contractType: "mortgage",
        principal: "250000",
        interestRate: "2.00",
        interestPeriodType: "monthly",
        startDate: addIsoDays(today, -400),
        endDate: overdueEnd,
        alertBeforeDays: 7,
        status: "active",
        customerName: "สมหญิง รักดี",
        customerPhone: "0810000000",
        deedNumber: "089-55",
        province: "ลำพูน",
        district: "ป่าซาง",
      },
      {
        id: "00000000-0000-4000-8000-000000000013",
        contractNumber: "LF-0890",
        contractType: "pawn",
        principal: "80000",
        interestRate: "1.25",
        interestPeriodType: "monthly",
        startDate: addIsoDays(today, -10),
        endDate: laterEnd,
        alertBeforeDays: 7,
        status: "active",
        customerName: "วิชัย ตั้งตรง",
        customerPhone: "0820000000",
        deedNumber: "3003",
        province: "เชียงราย",
        district: "เมือง",
      },
    ],
    incoming: [
      {
        id: "00000000-0000-4000-8000-000000000021",
        contractNumber: "LF-DOWN-1",
        contractType: "pawn",
        principal: "50000",
        interestRate: "1.00",
        interestPeriodType: "monthly",
        startDate: addIsoDays(today, -20),
        endDate: addIsoDays(today, 40),
        alertBeforeDays: 5,
        status: "active",
        customerName: "ลูกข่าย ตัวอย่าง",
        customerPhone: "0900000000",
        deedNumber: "4410",
        province: "พะเยา",
        district: "เมือง",
      },
    ],
  };
}
