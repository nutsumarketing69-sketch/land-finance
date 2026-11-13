import Decimal from "decimal.js";
import { differenceInDays, parseISO } from "date-fns";
import { calculateContractPayoff } from "./financeEngine";

function day(iso: string) {
  return parseISO(`${iso.slice(0, 10)}T00:00:00`);
}

export function alertMonths(days: number | null): string {
  if (days == null) return "-";
  return new Decimal(days).div(30).toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toFixed(1);
}

export function contractSnapshot(input: {
  principal: string;
  interestRate: string;
  interestPeriodType: string;
  startDate: string;
  endDate: string;
  alertBeforeDays: number | null;
  today: string;
}) {
  const canQuote = Boolean(input.startDate);
  const todayQuote = canQuote && input.today
    ? calculateContractPayoff(input.principal || "0", input.interestRate || "0", input.interestPeriodType, input.startDate, input.today)
    : null;
  const endQuote = canQuote && input.endDate
    ? calculateContractPayoff(input.principal || "0", input.interestRate || "0", input.interestPeriodType, input.startDate, input.endDate)
    : null;
  let overdueDays = 0;
  let excessInterest = 0;
  if (input.endDate && input.today && input.today > input.endDate && todayQuote && endQuote) {
    overdueDays = Math.max(0, differenceInDays(day(input.today), day(input.endDate)));
    excessInterest = new Decimal(todayQuote.accruedInterest)
      .minus(endQuote.accruedInterest)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toNumber();
  }
  return {
    elapsedDays: todayQuote?.totalDays ?? 0,
    accruedToday: todayQuote?.accruedInterest ?? 0,
    payoffToday: todayQuote?.totalPayoffAmount ?? 0,
    payoffAtEnd: endQuote?.totalPayoffAmount ?? 0,
    overdueDays,
    excessInterest,
    alertMonthsLabel: alertMonths(input.alertBeforeDays),
  };
}
