import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Decimal from "decimal.js";
import {
  CONTRACT_TYPE_LABELS,
  HIGH_INTEREST_RATE_THRESHOLD,
  LTV_BANDS,
  PRESET_INTEREST_RATES,
  calculateInterest,
  calendarDayDifference,
  classifyInterestRate,
  countAccrualPeriods,
  evaluateLoanToValue,
  formatBaht,
  interestForPeriods,
  splitCommission,
  totalPayoff,
  type ContractType,
  type DecimalString,
} from "./financeCalculator";

function assertDecimal(value: DecimalString, fixed: string, exact?: string) {
  assert.equal(typeof value.fixed, "string");
  assert.equal(typeof value.exact, "string");
  assert.equal(value.fixed.includes("e") || value.fixed.includes("E"), false);
  assert.equal(value.exact.includes("e") || value.exact.includes("E"), false);
  assert.equal(value.fixed, fixed);
  if (exact !== undefined) {
    assert.equal(value.exact, exact);
  }
}

describe("สัดส่วนเงินกู้ต่อราคาประเมิน", () => {
  it("ขายฝากอยู่ในช่วง 40% ถึง 50% แบบรวมขอบ", () => {
    const inside = evaluateLoanToValue({
      contractType: "sale_redemption",
      appraisedValue: "1000000",
      principal: "450000",
    });
    assert.equal(inside.position, "inside");
    assert.equal(inside.positionLabel, "อยู่ในช่วงที่แนะนำ");
    assert.equal(inside.contractTypeLabel, "ขายฝาก");
    assertDecimal(inside.suggestedMinPrincipal, "400000.00", "400000");
    assertDecimal(inside.suggestedMaxPrincipal, "500000.00", "500000");
    assertDecimal(inside.ltvRatio!, "0.450000", "0.45");
    assertDecimal(inside.ltvPercent!, "45.00", "45");

    assert.equal(
      evaluateLoanToValue({
        contractType: "sale_redemption",
        appraisedValue: "1000000",
        principal: "400000",
      }).position,
      "inside",
    );
    assert.equal(
      evaluateLoanToValue({
        contractType: "sale_redemption",
        appraisedValue: "1000000",
        principal: "500000",
      }).position,
      "inside",
    );
    assert.equal(
      evaluateLoanToValue({
        contractType: "sale_redemption",
        appraisedValue: "1000000",
        principal: "399999.99",
      }).position,
      "below",
    );
    assert.equal(
      evaluateLoanToValue({
        contractType: "sale_redemption",
        appraisedValue: "1000000",
        principal: "500000.01",
      }).position,
      "above",
    );
  });

  it("จำนองใช้ช่วง 10% ถึง 30% และจำนำโฉนดใช้ช่วง 10% ถึง 70%", () => {
    assert.deepEqual(LTV_BANDS.mortgage, { minRatio: "0.10", maxRatio: "0.30" });
    assert.deepEqual(LTV_BANDS.pawn, { minRatio: "0.10", maxRatio: "0.70" });
    assert.equal(CONTRACT_TYPE_LABELS.pawn, "จำนำโฉนด");

    assert.equal(
      evaluateLoanToValue({
        contractType: "mortgage",
        appraisedValue: "1000000",
        principal: "100000",
      }).position,
      "inside",
    );
    assert.equal(
      evaluateLoanToValue({
        contractType: "mortgage",
        appraisedValue: "1000000",
        principal: "300000.01",
      }).position,
      "above",
    );
    assert.equal(
      evaluateLoanToValue({
        contractType: "pawn",
        appraisedValue: "1000000",
        principal: "700000",
      }).position,
      "inside",
    );
    assert.equal(
      evaluateLoanToValue({
        contractType: "pawn",
        appraisedValue: "1000000",
        principal: "99999.99",
      }).position,
      "below",
    );
  });

  it("เงินต้นนอกช่วงยังคืนตัวเลข และราคาประเมินเป็นศูนย์ไม่มีอัตราส่วน", () => {
    const above = evaluateLoanToValue({
      contractType: "sale_redemption",
      appraisedValue: "1000000",
      principal: "800000",
    });
    assert.equal(above.position, "above");
    assertDecimal(above.principal, "800000.00", "800000");
    assertDecimal(above.ltvPercent!, "80.00", "80");

    const empty = evaluateLoanToValue({
      contractType: "mortgage",
      appraisedValue: "0",
      principal: "0",
    });
    assert.equal(empty.position, "inside");
    assert.equal(empty.ltvRatio, null);

    const unbounded = evaluateLoanToValue({
      contractType: "pawn",
      appraisedValue: "0",
      principal: "1",
    });
    assert.equal(unbounded.position, "above");
    assert.equal(unbounded.ltvRatio, null);
  });
});

describe("ดอกเบี้ยเชิงเดียว", () => {
  it("มีอัตราสำเร็จรูปและรองรับอัตราสูงกับอัตรากำหนดเอง", () => {
    assert.deepEqual(PRESET_INTEREST_RATES, [
      "1.00",
      "1.25",
      "1.50",
      "1.75",
      "2.00",
      "2.25",
      "2.50",
      "2.75",
      "3.00",
    ]);
    assert.equal(HIGH_INTEREST_RATE_THRESHOLD, "50");
    for (const rate of PRESET_INTEREST_RATES) {
      assert.equal(classifyInterestRate(rate), "preset");
    }
    assert.equal(classifyInterestRate("1.5"), "preset");
    assert.equal(classifyInterestRate("3"), "preset");
    assert.equal(classifyInterestRate("0.5"), "custom");
    assert.equal(classifyInterestRate("3.01"), "custom");
    assert.equal(classifyInterestRate("50"), "custom");
    assert.equal(classifyInterestRate("50.01"), "high");
    assert.equal(classifyInterestRate("60"), "high");
  });

  it("อัตรา 1.25% ต่อเดือนของหนึ่งงวดได้เงินต้นคูณอัตราแบบไม่คลาดเคลื่อน", () => {
    const result = calculateInterest({
      principal: "1000000",
      interestRate: "1.25",
      interestPeriodType: "monthly",
      startDate: "2026-01-01",
      payoffDate: "2026-02-01",
    });
    assert.equal(result.rateClass, "preset");
    assert.equal(result.compound, false);
    assert.equal(result.wholePeriods, 1);
    assert.equal(result.remainderDays, 0);
    assertDecimal(result.monthlyInterest, "12500.00", "12500");
    assertDecimal(result.yearlyInterest, "150000.00", "150000");
    assertDecimal(result.accruedInterest, "12500.00", "12500");
    assertDecimal(result.totalPayoff, "1012500.00", "1012500");
    assert.equal(result.dailyInterest.exact, new Decimal(12500).div(31).toFixed());
  });

  it("เดือนที่ไม่ครบคิดเศษด้วยจำนวนวันจริงของช่วงครบรอบ", () => {
    const result = calculateInterest({
      principal: "100000",
      interestRate: "1.50",
      interestPeriodType: "monthly",
      startDate: "2024-01-15",
      payoffDate: "2024-03-20",
    });
    assert.equal(result.dayCount, calendarDayDifference("2024-01-15", "2024-03-20"));
    assert.equal(result.wholePeriods, 2);
    assert.equal(result.remainderDays, 5);
    assert.equal(result.partialPeriodDays, 31);
    assertDecimal(result.monthlyInterest, "1500.00", "1500");
    assertDecimal(result.yearlyInterest, "18000.00", "18000");
    assertDecimal(result.accruedInterest, "3241.94", new Decimal(100500).div(31).toFixed());
    assertDecimal(result.totalPayoff, "103241.94");
    assert.equal(result.interestPeriodLabel, "รายเดือน");
  });

  it("วันสิ้นเดือนถูกหนีบเมื่อเดือนถัดไปไม่มีวันที่นั้น", () => {
    const leap = countAccrualPeriods("2024-01-31", "2024-02-29", "monthly");
    assert.equal(leap.wholePeriods, 1);
    assert.equal(leap.remainderDays, 0);

    const nonLeap = countAccrualPeriods("2025-01-31", "2025-02-28", "monthly");
    assert.equal(nonLeap.wholePeriods, 1);
    assert.equal(nonLeap.remainderDays, 0);

    const clamped = countAccrualPeriods("2025-01-31", "2025-03-31", "monthly");
    assert.equal(clamped.wholePeriods, 2);
    assert.equal(clamped.remainderDays, 3);
    assert.equal(clamped.partialPeriodDays, 31);
  });

  it("รายวันใช้ส่วนต่างวันปฏิทิน รวมวันอธิกสุรทิน และวันเดียวกันได้ศูนย์", () => {
    const tenDays = calculateInterest({
      principal: "10000",
      interestRate: "1",
      interestPeriodType: "daily",
      startDate: "2024-01-01",
      payoffDate: "2024-01-11",
    });
    assert.equal(tenDays.dayCount, 10);
    assertDecimal(tenDays.dailyInterest, "100.00", "100");
    assertDecimal(tenDays.accruedInterest, "1000.00", "1000");
    assertDecimal(tenDays.totalPayoff, "11000.00", "11000");

    const acrossLeap = calculateInterest({
      principal: 100,
      interestRate: 5,
      interestPeriodType: "daily",
      startDate: "2024-02-28",
      payoffDate: "2024-03-01",
    });
    assert.equal(acrossLeap.dayCount, 2);
    assertDecimal(acrossLeap.accruedInterest, "10.00", "10");

    const sameDay = calculateInterest({
      principal: "5000",
      interestRate: "3",
      interestPeriodType: "daily",
      startDate: "2026-11-13",
      payoffDate: "2026-11-13",
    });
    assert.equal(sameDay.dayCount, 0);
    assertDecimal(sameDay.accruedInterest, "0.00", "0");
    assertDecimal(sameDay.totalPayoff, "5000.00", "5000");
  });

  it("รายปีคิดเศษด้วยความยาวจริงของช่วงครบรอบ ไม่ใช้ 365 คงที่", () => {
    const leapYear = calculateInterest({
      principal: "36600",
      interestRate: "12",
      interestPeriodType: "yearly",
      startDate: "2024-01-01",
      payoffDate: "2024-07-01",
    });
    assert.equal(leapYear.wholePeriods, 0);
    assert.equal(leapYear.remainderDays, 182);
    assert.equal(leapYear.partialPeriodDays, 366);
    assertDecimal(leapYear.accruedInterest, "2184.00", "2184");
    assertDecimal(leapYear.yearlyInterest, "4392.00", "4392");
    assertDecimal(leapYear.monthlyInterest, "366.00", "366");

    const commonYear = calculateInterest({
      principal: "36500",
      interestRate: "10",
      interestPeriodType: "yearly",
      startDate: "2025-01-01",
      payoffDate: "2025-07-01",
    });
    assert.equal(commonYear.remainderDays, 181);
    assert.equal(commonYear.partialPeriodDays, 365);
    assertDecimal(commonYear.accruedInterest, "1810.00", "1810");
  });

  it("อัตรา 0.5 และอัตรา 60 คำนวณได้ และทบต้นต้องสั่งชัดเจน", () => {
    const custom = calculateInterest({
      principal: "10000",
      interestRate: "0.5",
      interestPeriodType: "monthly",
      startDate: "2024-01-31",
      payoffDate: "2024-02-29",
    });
    assert.equal(custom.rateClass, "custom");
    assertDecimal(custom.accruedInterest, "50.00", "50");

    const high = calculateInterest({
      principal: "10000",
      interestRate: "60",
      interestPeriodType: "yearly",
      startDate: "2024-01-01",
      payoffDate: "2025-01-01",
    });
    assert.equal(high.rateClass, "high");
    assert.equal(high.wholePeriods, 1);
    assertDecimal(high.accruedInterest, "6000.00", "6000");

    const simple = calculateInterest({
      principal: "1000",
      interestRate: "10",
      interestPeriodType: "monthly",
      startDate: "2024-01-01",
      payoffDate: "2024-03-01",
    });
    const compounded = calculateInterest({
      principal: "1000",
      interestRate: "10",
      interestPeriodType: "monthly",
      startDate: "2024-01-01",
      payoffDate: "2024-03-01",
      compound: true,
    });
    assertDecimal(simple.accruedInterest, "200.00", "200");
    assertDecimal(compounded.accruedInterest, "210.00", "210");
    assert.equal(compounded.compound, true);

    const partialCompound = calculateInterest({
      principal: "1000",
      interestRate: "10",
      interestPeriodType: "monthly",
      startDate: "2025-02-15",
      payoffDate: "2025-04-17",
      compound: true,
    });
    assert.equal(partialCompound.wholePeriods, 2);
    assert.equal(partialCompound.remainderDays, 2);
    assert.equal(partialCompound.partialPeriodDays, 30);
    assertDecimal(partialCompound.accruedInterest, "218.07", new Decimal(3271).div(15).toFixed());
  });

  it("ตัวช่วยงวดและยอดปิดบัญชีไม่ใช้เลขทศนิยมฐานสอง", () => {
    assertDecimal(interestForPeriods("2000", "1.5", "3"), "90.00", "90");
    assertDecimal(totalPayoff("2000", "90"), "2090.00", "2090");
    assert.equal(formatBaht("1234.5"), "1,234.50 บาท");
    assert.equal(formatBaht("-1000.2"), "-1,000.20 บาท");
  });

  it("ปฏิเสธวันชำระที่อยู่ก่อนวันเริ่มและวันที่ไม่มีอยู่จริง", () => {
    assert.throws(
      () => countAccrualPeriods("2026-05-02", "2026-05-01", "monthly"),
      /วันชำระต้องไม่อยู่ก่อนวันเริ่มสัญญา/,
    );
    assert.throws(
      () => calendarDayDifference("2024-02-30", "2024-03-01"),
      /วันเริ่มไม่ถูกต้อง/,
    );
    assert.throws(
      () =>
        calculateInterest({
          principal: "-1",
          interestRate: "1",
          interestPeriodType: "monthly",
          startDate: "2026-01-01",
          payoffDate: "2026-02-01",
        }),
      /เงินต้นต้องไม่ติดลบ/,
    );
    assert.throws(
      () =>
        evaluateLoanToValue({
          contractType: "lease" as ContractType,
          appraisedValue: "1",
          principal: "1",
        }),
      /ประเภทสัญญาไม่ถูกต้อง/,
    );
  });
});

describe("ส่วนแบ่งค่าตอบแทน", () => {
  it("หารตามเปอร์เซ็นต์และรายงานส่วนที่เหลือเมื่อรวมไม่ครบร้อย", () => {
    const complete = splitCommission({
      baseAmount: "10000",
      recipients: [
        { personName: "สมชาย", roleLabel: "นายหน้า", percentage: "60" },
        { personName: "สมหญิง", roleLabel: "ผู้แนะนำ", percentage: "40" },
      ],
    });
    assert.equal(complete.sumsToFull, true);
    assertDecimal(complete.lines[0].calculatedAmount, "6000.00", "6000");
    assertDecimal(complete.lines[1].calculatedAmount, "4000.00", "4000");
    assertDecimal(complete.remainderPercentage, "0.00", "0");
    assertDecimal(complete.remainderAmount, "0.00", "0");

    const partial = splitCommission({
      baseAmount: "10000",
      recipients: [
        { personName: "สมชาย", roleLabel: "นายหน้า", percentage: "30" },
        { personName: "สมหญิง", roleLabel: "ผู้แนะนำ", percentage: "30" },
      ],
    });
    assert.equal(partial.sumsToFull, false);
    assertDecimal(partial.totalPercentage, "60.00", "60");
    assertDecimal(partial.totalAmount, "6000.00", "6000");
    assertDecimal(partial.remainderPercentage, "40.00", "40");
    assertDecimal(partial.remainderAmount, "4000.00", "4000");
    assertDecimal(partial.lines[0].calculatedAmount, "3000.00", "3000");
  });

  it("เปอร์เซ็นต์เกินร้อยยังคำนวณทีละบรรทัดและไม่โยนข้อผิดพลาด", () => {
    const over = splitCommission({
      baseAmount: "1000",
      recipients: [
        { personName: "เอ", roleLabel: "สายบน", percentage: "80" },
        { personName: "บี", roleLabel: "ผู้ปิดงาน", percentage: "50" },
      ],
    });
    assert.equal(over.sumsToFull, false);
    assertDecimal(over.lines[0].calculatedAmount, "800.00", "800");
    assertDecimal(over.lines[1].calculatedAmount, "500.00", "500");
    assertDecimal(over.totalAmount, "1300.00", "1300");
    assertDecimal(over.remainderPercentage, "-30.00", "-30");
    assertDecimal(over.remainderAmount, "-300.00", "-300");

    const empty = splitCommission({ baseAmount: "800", recipients: [] });
    assert.equal(empty.lines.length, 0);
    assertDecimal(empty.remainderPercentage, "100.00", "100");
    assertDecimal(empty.remainderAmount, "800.00", "800");
  });
});
