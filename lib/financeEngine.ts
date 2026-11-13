import Decimal from "decimal.js";
import { differenceInDays, parseISO } from "date-fns";

/**
 * เครื่องนี้คือตัวที่ .cursorrules กำหนด: นับวันแบบ 30 วันต่องวดเดือน หรือ 365 วันต่อปี
 * This day-count (30 or 365) is the engine the rules file names.
 * lib/financeCalculator.ts remains the anniversary-month engine already used by the wizard and the dashboard payoff modal.
 */
Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});

export type ContractBand = "sale_redemption" | "mortgage" | "pawn";

export type LtvCheck = {
  ltvPercentage: number;
  minAllowed: number;
  maxAllowed: number;
  label: string;
  isWithinRecommended: boolean;
  warning: string;
};

export type InterestPayoff = {
  totalDays: number;
  accruedInterest: number;
  totalPayoffAmount: number;
  monthlyEstimate: number;
};

const BANDS: Record<ContractBand, { min: string; max: string; label: string }> = {
  sale_redemption: { min: "40", max: "50", label: "ขายฝาก" },
  mortgage: { min: "10", max: "30", label: "จำนอง" },
  pawn: { min: "10", max: "70", label: "จำนำโฉนด" },
};

function money(value: number | string): Decimal {
  return new Decimal(typeof value === "number" ? value.toString() : value);
}

function round2(value: Decimal): number {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

function parseDay(iso: string): Date {
  return parseISO(iso.length === 10 ? `${iso}T00:00:00` : iso);
}

export function validateLTV(contractType: string, principal: number, appraisedValue: number): LtvCheck {
  const band = BANDS[contractType as ContractBand];
  const label = band?.label ?? "ไม่ทราบประเภท";
  const principalAmount = money(principal);
  const appraised = money(appraisedValue);
  if (!band) {
    return {
      ltvPercentage: 0,
      minAllowed: 0,
      maxAllowed: 0,
      label,
      isWithinRecommended: false,
      warning: "ไม่รู้จักประเภทสัญญา",
    };
  }
  const minRatio = money(band.min);
  const maxRatio = money(band.max);
  if (!appraised.isFinite() || appraised.lte(0)) {
    return {
      ltvPercentage: 0,
      minAllowed: 0,
      maxAllowed: 0,
      label,
      isWithinRecommended: false,
      warning: "ราคาประเมินเป็นศูนย์ คำนวณสัดส่วนเงินกู้ไม่ได้",
    };
  }
  const ltv = principalAmount.div(appraised).mul(100);
  const inside = ltv.gte(minRatio) && ltv.lte(maxRatio);
  return {
    ltvPercentage: round2(ltv),
    minAllowed: round2(appraised.mul(minRatio).div(100)),
    maxAllowed: round2(appraised.mul(maxRatio).div(100)),
    label,
    isWithinRecommended: inside,
    warning: inside ? "" : "เงินต้นอยู่นอกช่วงที่แนะนำ",
  };
}

export function calculateInterestAndPayoff(
  principalAmount: number,
  annualInterestRatePercent: number,
  startDateStr: string,
  targetDateStr: string,
  isMonthlyRate = true,
): InterestPayoff {
  const principal = money(principalAmount);
  const percent = money(annualInterestRatePercent);
  const rawDays = differenceInDays(parseDay(targetDateStr), parseDay(startDateStr));
  const totalDays = rawDays < 0 ? 0 : rawDays;
  const dayDivisor = isMonthlyRate ? money(30) : money(365);
  const dailyRate = percent.div(100).div(dayDivisor);
  const accrued = principal.mul(dailyRate).mul(totalDays);
  return {
    totalDays,
    accruedInterest: round2(accrued),
    totalPayoffAmount: round2(principal.plus(accrued)),
    monthlyEstimate: round2(principal.mul(percent).div(100)),
  };
}
