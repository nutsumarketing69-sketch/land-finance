/** 1 เดือนของการแจ้งเตือน = 30 วันเสมอ ไม่ใช้ความยาวเดือนปฏิทิน */
export const ALERT_DAYS_PER_MONTH = 30;

export type AlertUnit = "days" | "months";

export function alertBeforeDays(
  amount: string,
  unit: AlertUnit,
): { days: number } | { error: string } {
  const trimmed = amount.trim();
  if (!/^\d+$/.test(trimmed)) {
    return { error: "กรอกจำนวนเต็มตั้งแต่ 0" };
  }
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 0) {
    return { error: "กรอกจำนวนเต็มตั้งแต่ 0" };
  }
  const days = unit === "months" ? value * ALERT_DAYS_PER_MONTH : value;
  if (days > 20000) {
    return { error: "จำนวนวันมากเกินไป" };
  }
  return { days };
}
