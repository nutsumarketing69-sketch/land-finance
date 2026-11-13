/**
 * ตัวคำนวณการเงินสำหรับสัญญาขายฝาก จำนอง และจำนำโฉนด
 *
 * ข้อตกลงการนับวันและดอกเบี้ย
 * - อัตราเป็นร้อยละของงวดใน interestPeriodType เช่น 1.50 แบบรายเดือนคือ 1.50% ต่อเดือน
 *   จะเป็นอัตราต่อปีก็ต่อเมื่องวดเป็น yearly เท่านั้น
 * - ดอกเบี้ยของงวด = เงินต้น × (อัตรา / 100) × จำนวนงวด
 * - ค่าเริ่มต้นเป็นดอกเบี้ยเชิงเดียว ไม่ทบต้น ถ้าต้องการทบต้นให้ส่ง compound เป็น true
 *   การทบต้นทบเฉพาะงวดที่ครบ และคิดเศษงวดแบบเชิงเดียวบนเงินต้นที่ทบแล้ว
 * - จำนวนวันคือส่วนต่างวันปฏิทินจริง (วันชำระ − วันเริ่ม) ไม่ปัดเป็น 30 วัน
 *   วันเริ่มกับวันชำระเป็นวันเดียวกันจึงได้ดอกเบี้ย 0
 * - งวดรายเดือนนับเดือนเต็มตามวันครบรอบ ถ้าเดือนนั้นไม่มีวันที่ตรงกันให้ใช้วันสุดท้ายของเดือน
 *   เศษที่เหลือ = จำนวนวันหลังวันครบรอบ ÷ จำนวนวันจริงจากวันครบรอบนั้นถึงวันครบรอบถัดไป
 * - งวดรายปีนับปีเต็มตามวันครบรอบปี แล้วคิดเศษวันด้วยความยาวจริงของช่วงครบรอบนั้น
 *   ซึ่งเป็น 365 หรือ 366 วันตามช่วงจริง ไม่ใช้ 365 คงที่
 * - ยอดดอกเบี้ยรายวัน รายเดือน และรายปีที่คืนคู่กันเป็นการแปลงเชิงเดียวเพื่อเทียบให้ดู
 *   รายปีจากรายเดือนใช้คูณ 12 และรายเดือนจากรายปีใช้หาร 12
 *   รายวันใช้จำนวนวันจริงของเดือนอ้างอิง หรือจำนวนวันของปีปฏิทินของวันเริ่มสัญญา
 *   การแปลงเพื่อแสดงผลนี้คนละค่ากับตัวหารที่ใช้คิดดอกเบี้ยค้างแบบรายปี
 * - ทุกจำนวนเงินและอัตราคำนวณด้วย decimal.js แล้วคืนเป็นสตริง
 *   ไม่ใช้เลขทศนิยมฐานสองของจาวาสคริปต์ในการคำนวณ
 *   ถ้าส่งค่าเข้ามาเป็น number จะถูกเปลี่ยนเป็นสตริงทันทีก่อนสร้าง Decimal
 * - ช่วงสัดส่วนเงินกู้ต่อราคาประเมินเป็นคำแนะนำ เงินต้นที่อยู่นอกช่วงยังคำนวณและคืนค่าได้
 */

import Decimal from "decimal.js";

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});

export const CONTRACT_TYPES = ["sale_redemption", "mortgage", "pawn"] as const;
export const INTEREST_PERIOD_TYPES = ["daily", "monthly", "yearly"] as const;
export const LTV_POSITIONS = ["inside", "below", "above"] as const;
export const RATE_CLASSES = ["preset", "high", "custom"] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];
export type InterestPeriodType = (typeof INTEREST_PERIOD_TYPES)[number];
export type LtvPosition = (typeof LTV_POSITIONS)[number];
export type RateClass = (typeof RATE_CLASSES)[number];

/** สตริงฐานสิบสองแบบ: fixed คือค่าแสดงผลที่ปัดแล้ว, exact คือค่าเต็มสำหรับคำนวณต่อ */
export interface DecimalString {
  fixed: string;
  exact: string;
}

export type MoneyValue = DecimalString;
export type MoneyInput = string | number | Decimal;

export const MONEY_DECIMAL_PLACES = 2;
export const RATE_DECIMAL_PLACES = 2;
export const RATIO_DECIMAL_PLACES = 6;
export const PERIOD_DECIMAL_PLACES = 8;

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  sale_redemption: "ขายฝาก",
  mortgage: "จำนอง",
  pawn: "จำนำโฉนด",
};

export const INTEREST_PERIOD_LABELS: Record<InterestPeriodType, string> = {
  daily: "รายวัน",
  monthly: "รายเดือน",
  yearly: "รายปี",
};

export const LTV_POSITION_LABELS: Record<LtvPosition, string> = {
  inside: "อยู่ในช่วงที่แนะนำ",
  below: "ต่ำกว่าช่วงที่แนะนำ",
  above: "สูงกว่าช่วงที่แนะนำ",
};

/** ช่วงสัดส่วนเงินต้นต่อราคาประเมินที่แนะนำ อัตราส่วนเก็บเป็นสตริงฐานสิบ */
export const LTV_BANDS: Record<ContractType, { minRatio: string; maxRatio: string }> = {
  sale_redemption: { minRatio: "0.40", maxRatio: "0.50" },
  mortgage: { minRatio: "0.10", maxRatio: "0.30" },
  pawn: { minRatio: "0.10", maxRatio: "0.70" },
};

/** อัตราสำเร็จรูปที่หน้าจอเลือกได้ ค่าเป็นร้อยละ เช่น "1.25" หมายถึง 1.25% */
export const PRESET_INTEREST_RATES = [
  "1.00",
  "1.25",
  "1.50",
  "1.75",
  "2.00",
  "2.25",
  "2.50",
  "2.75",
  "3.00",
] as const;

/** อัตราที่มากกว่าค่านี้ยังใช้คำนวณได้ และถูกจัดเป็นอัตราสูง */
export const HIGH_INTEREST_RATE_THRESHOLD = "50";

export interface LoanToValueInput {
  contractType: ContractType;
  appraisedValue: MoneyInput;
  principal: MoneyInput;
}

export interface LtvEvaluation {
  contractType: ContractType;
  contractTypeLabel: string;
  appraisedValue: MoneyValue;
  principal: MoneyValue;
  minRatio: MoneyValue;
  maxRatio: MoneyValue;
  suggestedMinPrincipal: MoneyValue;
  suggestedMaxPrincipal: MoneyValue;
  ltvRatio: MoneyValue | null;
  ltvPercent: MoneyValue | null;
  position: LtvPosition;
  positionLabel: string;
}

export interface InterestInput {
  principal: MoneyInput;
  interestRate: MoneyInput;
  interestPeriodType: InterestPeriodType;
  startDate: string;
  payoffDate: string;
  compound?: boolean;
}

export interface AccrualPeriodCount {
  dayCount: number;
  wholePeriods: number;
  remainderDays: number;
  partialPeriodDays: number;
  periodCount: DecimalString;
}

export interface InterestCalculation extends AccrualPeriodCount {
  principal: MoneyValue;
  interestRate: MoneyValue;
  interestPeriodType: InterestPeriodType;
  interestPeriodLabel: string;
  rateClass: RateClass;
  startDate: string;
  payoffDate: string;
  compound: boolean;
  dailyInterest: MoneyValue;
  monthlyInterest: MoneyValue;
  yearlyInterest: MoneyValue;
  accruedInterest: MoneyValue;
  totalPayoff: MoneyValue;
}

export interface CommissionRecipientInput {
  personName: string;
  roleLabel: string;
  percentage: MoneyInput;
}

export interface CommissionLine {
  personName: string;
  roleLabel: string;
  percentage: DecimalString;
  calculatedAmount: MoneyValue;
}

export interface CommissionSplitInput {
  baseAmount: MoneyInput;
  recipients: readonly CommissionRecipientInput[];
}

export interface CommissionSplitResult {
  baseAmount: MoneyValue;
  lines: CommissionLine[];
  totalPercentage: DecimalString;
  totalAmount: MoneyValue;
  remainderPercentage: DecimalString;
  remainderAmount: MoneyValue;
  sumsToFull: boolean;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function evaluateLoanToValue(input: LoanToValueInput): LtvEvaluation {
  const contractType = assertContractType(input.contractType);
  const appraised = nonNegative(toDecimal(input.appraisedValue, "ราคาประเมิน"), "ราคาประเมิน");
  const principal = nonNegative(toDecimal(input.principal, "เงินต้น"), "เงินต้น");
  const band = LTV_BANDS[contractType];
  const minRatio = new Decimal(band.minRatio);
  const maxRatio = new Decimal(band.maxRatio);
  const suggestedMin = appraised.mul(minRatio);
  const suggestedMax = appraised.mul(maxRatio);
  const position: LtvPosition = principal.lt(suggestedMin)
    ? "below"
    : principal.gt(suggestedMax)
      ? "above"
      : "inside";
  const ratio = appraised.isZero() ? null : principal.div(appraised);

  return {
    contractType,
    contractTypeLabel: CONTRACT_TYPE_LABELS[contractType],
    appraisedValue: money(appraised, MONEY_DECIMAL_PLACES),
    principal: money(principal, MONEY_DECIMAL_PLACES),
    minRatio: money(minRatio, RATIO_DECIMAL_PLACES),
    maxRatio: money(maxRatio, RATIO_DECIMAL_PLACES),
    suggestedMinPrincipal: money(suggestedMin, MONEY_DECIMAL_PLACES),
    suggestedMaxPrincipal: money(suggestedMax, MONEY_DECIMAL_PLACES),
    ltvRatio: ratio === null ? null : money(ratio, RATIO_DECIMAL_PLACES),
    ltvPercent: ratio === null ? null : money(ratio.mul(100), RATE_DECIMAL_PLACES),
    position,
    positionLabel: LTV_POSITION_LABELS[position],
  };
}

export function calculateInterest(input: InterestInput): InterestCalculation {
  const principal = nonNegative(toDecimal(input.principal, "เงินต้น"), "เงินต้น");
  const interestRate = nonNegative(toDecimal(input.interestRate, "อัตราดอกเบี้ย"), "อัตราดอกเบี้ย");
  const interestPeriodType = assertPeriodType(input.interestPeriodType);
  const counted = countAccrualPeriods(input.startDate, input.payoffDate, interestPeriodType);
  const compound = input.compound === true;
  const reference = parseIsoDate(input.startDate, "วันเริ่ม");
  const quoted = quotePeriodAmounts(principal, interestRate, interestPeriodType, reference);
  const accrued = accruedAmount(principal, interestRate, counted, compound);

  return {
    ...counted,
    principal: money(principal, MONEY_DECIMAL_PLACES),
    interestRate: money(interestRate, RATE_DECIMAL_PLACES),
    interestPeriodType,
    interestPeriodLabel: INTEREST_PERIOD_LABELS[interestPeriodType],
    rateClass: classifyRate(interestRate),
    startDate: formatIsoDate(reference),
    payoffDate: formatIsoDate(parseIsoDate(input.payoffDate, "วันชำระ")),
    compound,
    dailyInterest: money(quoted.daily, MONEY_DECIMAL_PLACES),
    monthlyInterest: money(quoted.monthly, MONEY_DECIMAL_PLACES),
    yearlyInterest: money(quoted.yearly, MONEY_DECIMAL_PLACES),
    accruedInterest: money(accrued, MONEY_DECIMAL_PLACES),
    totalPayoff: money(principal.plus(accrued), MONEY_DECIMAL_PLACES),
  };
}

export function countAccrualPeriods(
  startDate: string,
  payoffDate: string,
  interestPeriodType: InterestPeriodType,
): AccrualPeriodCount {
  const periodType = assertPeriodType(interestPeriodType);
  const start = parseIsoDate(startDate, "วันเริ่ม");
  const payoff = parseIsoDate(payoffDate, "วันชำระ");
  if (compareDates(payoff, start) < 0) {
    throw new Error("วันชำระต้องไม่อยู่ก่อนวันเริ่มสัญญา");
  }

  const dayCount = differenceInDays(start, payoff);
  if (periodType === "daily") {
    return {
      dayCount,
      wholePeriods: dayCount,
      remainderDays: 0,
      partialPeriodDays: 0,
      periodCount: decimalString(new Decimal(dayCount), PERIOD_DECIMAL_PLACES),
    };
  }

  const step = periodType === "monthly" ? addMonths : addYears;
  let wholePeriods = 0;
  let cursor = start;
  while (compareDates(step(cursor, 1), payoff) <= 0) {
    cursor = step(cursor, 1);
    wholePeriods += 1;
    if (wholePeriods > 100000) {
      throw new Error("ช่วงวันที่ยาวเกินกว่าที่คำนวณได้");
    }
  }

  const remainderDays = differenceInDays(cursor, payoff);
  const partialPeriodDays = remainderDays === 0 ? 0 : differenceInDays(cursor, step(cursor, 1));
  if (remainderDays > 0 && partialPeriodDays <= 0) {
    throw new Error("คำนวณความยาวของงวดส่วนที่เหลือไม่ได้");
  }

  const periodCount = periodCountDecimal(wholePeriods, remainderDays, partialPeriodDays);

  return {
    dayCount,
    wholePeriods,
    remainderDays,
    partialPeriodDays,
    periodCount: decimalString(periodCount, PERIOD_DECIMAL_PLACES),
  };
}

export function splitCommission(input: CommissionSplitInput): CommissionSplitResult {
  const base = nonNegative(toDecimal(input.baseAmount, "ฐานคำนวณ"), "ฐานคำนวณ");
  const drafted = input.recipients.map((recipient) => {
    const percentage = nonNegative(toDecimal(recipient.percentage, "เปอร์เซ็นต์"), "เปอร์เซ็นต์");
    return {
      personName: recipient.personName,
      roleLabel: recipient.roleLabel,
      percentage,
      calculated: base.mul(percentage).div(100),
    };
  });
  const totalPercentage = drafted.reduce(
    (sum, line) => sum.plus(line.percentage),
    new Decimal(0),
  );
  const totalAmount = drafted.reduce((sum, line) => sum.plus(line.calculated), new Decimal(0));
  const remainderPercentage = new Decimal(100).minus(totalPercentage);

  return {
    baseAmount: money(base, MONEY_DECIMAL_PLACES),
    lines: drafted.map((line) => ({
      personName: line.personName,
      roleLabel: line.roleLabel,
      percentage: decimalString(line.percentage, RATE_DECIMAL_PLACES),
      calculatedAmount: money(line.calculated, MONEY_DECIMAL_PLACES),
    })),
    totalPercentage: decimalString(totalPercentage, RATE_DECIMAL_PLACES),
    totalAmount: money(totalAmount, MONEY_DECIMAL_PLACES),
    remainderPercentage: decimalString(remainderPercentage, RATE_DECIMAL_PLACES),
    remainderAmount: money(base.mul(remainderPercentage).div(100), MONEY_DECIMAL_PLACES),
    sumsToFull: totalPercentage.eq(100),
  };
}

/** ดอกเบี้ยเชิงเดียวของจำนวนงวดที่ส่งเข้ามา โดยยังไม่ตีความปฏิทิน */
export function interestForPeriods(
  principal: MoneyInput,
  interestRate: MoneyInput,
  periods: MoneyInput,
): MoneyValue {
  const base = nonNegative(toDecimal(principal, "เงินต้น"), "เงินต้น");
  const rate = nonNegative(toDecimal(interestRate, "อัตราดอกเบี้ย"), "อัตราดอกเบี้ย");
  const count = nonNegative(toDecimal(periods, "จำนวนงวด"), "จำนวนงวด");
  return money(base.mul(rate).div(100).mul(count), MONEY_DECIMAL_PLACES);
}

/** ยอดปิดบัญชี = เงินต้น + ดอกเบี้ยค้างที่คำนวณไว้แล้ว */
export function totalPayoff(principal: MoneyInput, accruedInterestAmount: MoneyInput): MoneyValue {
  const base = nonNegative(toDecimal(principal, "เงินต้น"), "เงินต้น");
  const accrued = nonNegative(toDecimal(accruedInterestAmount, "ดอกเบี้ย"), "ดอกเบี้ย");
  return money(base.plus(accrued), MONEY_DECIMAL_PLACES);
}

export function classifyInterestRate(rate: MoneyInput): RateClass {
  return classifyRate(nonNegative(toDecimal(rate, "อัตราดอกเบี้ย"), "อัตราดอกเบี้ย"));
}

export function calendarDayDifference(startDate: string, endDate: string): number {
  return differenceInDays(parseIsoDate(startDate, "วันเริ่ม"), parseIsoDate(endDate, "วันสิ้นสุด"));
}

export function formatBaht(value: MoneyInput): string {
  const amount = toDecimal(value, "จำนวนเงิน");
  if (!amount.isFinite()) {
    throw new Error("จำนวนเงินต้องเป็นจำนวนที่จำกัด");
  }
  return `${groupFixed(amount.toFixed(MONEY_DECIMAL_PLACES))} บาท`;
}

export function toDecimal(value: MoneyInput, label = "ตัวเลข"): Decimal {
  if (value instanceof Decimal) {
    if (!value.isFinite()) {
      throw new Error(`${label}ต้องเป็นจำนวนที่จำกัด`);
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${label}ต้องเป็นจำนวนที่จำกัด`);
    }
    return new Decimal(value.toString());
  }
  if (typeof value !== "string") {
    throw new Error(`${label}ไม่ถูกต้อง`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`ต้องระบุ${label}`);
  }
  if (trimmed.includes(",")) {
    throw new Error(`${label}ต้องไม่มีเครื่องหมายคอมมา`);
  }
  try {
    const parsed = new Decimal(trimmed);
    if (!parsed.isFinite()) {
      throw new Error(`${label}ต้องเป็นจำนวนที่จำกัด`);
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(label)) {
      throw error;
    }
    throw new Error(`${label}ไม่ถูกต้อง`);
  }
}

function classifyRate(rate: Decimal): RateClass {
  if (PRESET_INTEREST_RATES.some((preset) => rate.eq(preset))) {
    return "preset";
  }
  if (rate.gt(HIGH_INTEREST_RATE_THRESHOLD)) {
    return "high";
  }
  return "custom";
}

function quotePeriodAmounts(
  principal: Decimal,
  ratePercent: Decimal,
  periodType: InterestPeriodType,
  reference: DateParts,
): { daily: Decimal; monthly: Decimal; yearly: Decimal } {
  const onePeriod = principal.mul(ratePercent).div(100);
  const monthDays = new Decimal(daysInMonth(reference.year, reference.month));
  const yearDays = new Decimal(
    differenceInDays(
      { year: reference.year, month: 1, day: 1 },
      { year: reference.year + 1, month: 1, day: 1 },
    ),
  );

  if (periodType === "daily") {
    return {
      daily: onePeriod,
      monthly: onePeriod.mul(monthDays),
      yearly: onePeriod.mul(yearDays),
    };
  }
  if (periodType === "monthly") {
    return {
      daily: onePeriod.div(monthDays),
      monthly: onePeriod,
      yearly: onePeriod.mul(12),
    };
  }
  return {
    daily: onePeriod.div(yearDays),
    monthly: onePeriod.div(12),
    yearly: onePeriod,
  };
}

function accruedAmount(
  principal: Decimal,
  ratePercent: Decimal,
  counted: AccrualPeriodCount,
  compound: boolean,
): Decimal {
  const rate = ratePercent.div(100);
  if (!compound) {
    if (counted.remainderDays === 0) {
      return principal.mul(rate).mul(counted.wholePeriods);
    }
    // คูณเศษเป็นจำนวนเต็มก่อนหารครั้งเดียว เพื่อไม่ปัดทศนิยมซ้ำสองรอบ
    return principal
      .mul(rate)
      .mul(new Decimal(counted.wholePeriods).mul(counted.partialPeriodDays).plus(counted.remainderDays))
      .div(counted.partialPeriodDays);
  }

  const grown = principal.mul(Decimal.pow(rate.plus(1), counted.wholePeriods));
  if (counted.remainderDays === 0) {
    return grown.minus(principal);
  }
  const remainderInterest = grown
    .mul(rate)
    .mul(counted.remainderDays)
    .div(counted.partialPeriodDays);
  return grown.minus(principal).plus(remainderInterest);
}

function periodCountDecimal(wholePeriods: number, remainderDays: number, partialPeriodDays: number): Decimal {
  if (remainderDays === 0) {
    return new Decimal(wholePeriods);
  }
  return new Decimal(wholePeriods).mul(partialPeriodDays).plus(remainderDays).div(partialPeriodDays);
}

function money(value: Decimal, scale: number): MoneyValue {
  return decimalString(value, scale);
}

function decimalString(value: Decimal, scale: number): DecimalString {
  if (!value.isFinite()) {
    throw new Error("ผลลัพธ์ตัวเลขไม่จำกัด");
  }
  return {
    fixed: value.toFixed(scale),
    exact: value.toFixed(),
  };
}

function nonNegative(value: Decimal, label: string): Decimal {
  if (value.isNeg()) {
    throw new Error(`${label}ต้องไม่ติดลบ`);
  }
  return value;
}

function assertContractType(value: string): ContractType {
  if (!(CONTRACT_TYPES as readonly string[]).includes(value)) {
    throw new Error("ประเภทสัญญาไม่ถูกต้อง");
  }
  return value as ContractType;
}

function assertPeriodType(value: string): InterestPeriodType {
  if (!(INTEREST_PERIOD_TYPES as readonly string[]).includes(value)) {
    throw new Error("งวดดอกเบี้ยไม่ถูกต้อง");
  }
  return value as InterestPeriodType;
}

function parseIsoDate(value: string, label: string): DateParts {
  const match = ISO_DATE.exec(value.trim());
  if (!match) {
    throw new Error(`${label}ต้องอยู่ในรูปแบบ ปี-เดือน-วัน เช่น 2026-11-13`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new Error(`${label}ไม่ถูกต้อง`);
  }
  return { year, month, day };
}

function formatIsoDate(parts: DateParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonths(parts: DateParts, months: number): DateParts {
  const monthIndex = parts.month - 1 + months;
  const year = parts.year + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  return {
    year,
    month: month + 1,
    day: Math.min(parts.day, daysInMonth(year, month + 1)),
  };
}

function addYears(parts: DateParts, years: number): DateParts {
  const year = parts.year + years;
  return {
    year,
    month: parts.month,
    day: Math.min(parts.day, daysInMonth(year, parts.month)),
  };
}

function compareDates(left: DateParts, right: DateParts): number {
  if (left.year !== right.year) return left.year < right.year ? -1 : 1;
  if (left.month !== right.month) return left.month < right.month ? -1 : 1;
  if (left.day !== right.day) return left.day < right.day ? -1 : 1;
  return 0;
}

function differenceInDays(start: DateParts, end: DateParts): number {
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  return Math.round((endUtc - startUtc) / 86_400_000);
}

function groupFixed(fixed: string): string {
  const negative = fixed.startsWith("-");
  const digits = negative ? fixed.slice(1) : fixed;
  const [whole, fraction] = digits.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = fraction === undefined ? grouped : `${grouped}.${fraction}`;
  return negative ? `-${body}` : body;
}
