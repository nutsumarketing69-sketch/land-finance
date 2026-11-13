import Decimal from "decimal.js";
import { calculateInterestAndPayoff, validateLTV, type ContractBand, type LtvCheck } from "./financeEngine";

export type AppraisalBasis = "plot" | "nearby";

export type AppraisalComparison = {
  difference: number;
  higher: "plot" | "nearby" | "equal";
  label: string;
};

export type InterestQuote = {
  totalDays: number;
  dailyInterest: number;
  monthlyInterest: number;
  yearlyInterest: number;
  accruedInterest: number;
  totalPayoffAmount: number;
};

export type CommissionQuoteLine = {
  amount: number | null;
};

export type CommissionQuote = {
  lines: CommissionQuoteLine[];
  totalPercentage: number;
  warning: string;
};

const AMOUNT = /^-?\d+(\.\d+)?$/;

function amount(raw: string): Decimal | null {
  const text = raw.trim().replace(/,/g, "");
  if (!AMOUNT.test(text)) return null;
  const value = new Decimal(text);
  return value.isFinite() ? value : null;
}

function round2(value: Decimal): number {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

export function compareAppraisals(plotRaw: string, nearbyRaw: string): AppraisalComparison | null {
  const plot = amount(plotRaw);
  const nearby = amount(nearbyRaw);
  if (!plot || !nearby) return null;
  const higher = plot.gt(nearby) ? "plot" : nearby.gt(plot) ? "nearby" : "equal";
  const label = higher === "plot" ? "แปลงนี้สูงกว่า" : higher === "nearby" ? "ที่ดินข้างเคียงสูงกว่า" : "ราคาเท่ากัน";
  return { difference: round2(plot.minus(nearby).abs()), higher, label };
}

export function quoteLoanToValue(
  contractType: ContractBand,
  principalRaw: string,
  plotRaw: string,
  nearbyRaw: string,
  basis: AppraisalBasis,
): LtvCheck {
  const principal = amount(principalRaw) ?? new Decimal(0);
  const basisRaw = basis === "nearby" ? nearbyRaw : plotRaw;
  const appraisal = amount(basisRaw) ?? new Decimal(0);
  return validateLTV(contractType, principal.toNumber(), appraisal.toNumber());
}

export function quoteInterest(
  principalRaw: string,
  rateRaw: string,
  startDate: string,
  targetDate: string,
  isMonthlyRate: boolean,
): InterestQuote | null {
  const principal = amount(principalRaw);
  const rate = amount(rateRaw);
  if (!principal || !rate || principal.lt(0) || rate.lt(0) || !startDate || !targetDate) return null;
  const payoff = calculateInterestAndPayoff(principal.toNumber(), rate.toNumber(), startDate, targetDate, isMonthlyRate);
  const percent = rate.div(100);
  const monthly = isMonthlyRate ? principal.mul(percent) : principal.mul(percent).div(12);
  const yearly = isMonthlyRate ? principal.mul(percent).mul(12) : principal.mul(percent);
  const daily = isMonthlyRate ? principal.mul(percent).div(30) : principal.mul(percent).div(365);
  return {
    totalDays: payoff.totalDays,
    dailyInterest: round2(daily),
    monthlyInterest: round2(monthly),
    yearlyInterest: round2(yearly),
    accruedInterest: payoff.accruedInterest,
    totalPayoffAmount: payoff.totalPayoffAmount,
  };
}

export function quoteCommission(principalRaw: string, percentages: readonly string[]): CommissionQuote {
  const principal = amount(principalRaw) ?? new Decimal(0);
  let total = new Decimal(0);
  let counted = 0;
  const lines = percentages.map((raw) => {
    const percentage = amount(raw);
    if (!percentage) return { amount: null };
    counted += 1;
    total = total.plus(percentage);
    return { amount: round2(principal.mul(percentage).div(100)) };
  });
  const warning = counted > 0 && !total.eq(100) ? "ร้อยละรวมกันไม่เท่ากับ 100" : "";
  return { lines, totalPercentage: round2(total), warning };
}
