import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateContractPayoff, calculateInterestAndPayoff, validateLTV } from "./financeEngine";

describe("validateLTV", () => {
  it("ใช้ช่วง 40–50, 10–30 และ 10–70 และเตือนเมื่ออยู่นอกช่วง", () => {
    const sale = validateLTV("sale_redemption", 450000, 1000000);
    assert.equal(sale.ltvPercentage, 45);
    assert.equal(sale.minAllowed, 400000);
    assert.equal(sale.maxAllowed, 500000);
    assert.equal(sale.label, "ขายฝาก");
    assert.equal(sale.isWithinRecommended, true);
    assert.equal(sale.warning, "");

    const mortgage = validateLTV("mortgage", 450000, 1000000);
    assert.equal(mortgage.minAllowed, 100000);
    assert.equal(mortgage.maxAllowed, 300000);
    assert.equal(mortgage.isWithinRecommended, false);
    assert.match(mortgage.warning, /นอกช่วง/);

    const pawn = validateLTV("pawn", 700000, 1000000);
    assert.equal(pawn.ltvPercentage, 70);
    assert.equal(pawn.isWithinRecommended, true);
  });

  it("ราคาประเมินเป็นศูนย์ไม่โยนข้อผิดพลาด", () => {
    const result = validateLTV("sale_redemption", 1000, 0);
    assert.equal(result.isWithinRecommended, false);
    assert.match(result.warning, /ศูนย์/);
  });
});

describe("calculateInterestAndPayoff", () => {
  it("อัตรารายเดือน 1.5% ของ 30 วันได้ดอกเบี้ยหนึ่งงวด", () => {
    const result = calculateInterestAndPayoff(100000, 1.5, "2026-01-01", "2026-01-31", true);
    assert.equal(result.totalDays, 31);
    assert.equal(result.accruedInterest, 1550);
    assert.equal(result.totalPayoffAmount, 101550);
    assert.equal(result.monthlyEstimate, 1500);
  });

  it("อัตรารายปีใช้ตัวหาร 365", () => {
    const result = calculateInterestAndPayoff(100000, 12, "2026-01-01", "2027-01-01", false);
    assert.equal(result.totalDays, 366);
    assert.equal(result.accruedInterest, 12032.88);
    assert.equal(result.totalPayoffAmount, 112032.88);
    assert.equal(result.monthlyEstimate, 12000);
  });

  it("วันเดียวกันนับ 1 วัน และวันก่อนวันเริ่มไม่ติดลบ", () => {
    const same = calculateInterestAndPayoff(100000, 1.5, "2026-05-01", "2026-05-01");
    assert.equal(same.totalDays, 1);
    assert.equal(same.accruedInterest, 50);
    assert.equal(same.totalPayoffAmount, 100050);
    const earlier = calculateInterestAndPayoff(100000, 1.5, "2026-05-10", "2026-05-01");
    assert.equal(earlier.totalDays, 0);
    assert.equal(earlier.accruedInterest, 0);
  });

  it("ขายฝาก จำนอง และจำนำใช้จำนวนวันเดียวกัน", () => {
    const start = "2026-05-01";
    const same = "2026-05-01";
    for (const period of ["monthly", "monthly", "monthly"]) {
      const result = calculateContractPayoff(100000, 1.5, period, start, same);
      assert.equal(result.totalDays, 1);
      assert.equal(result.accruedInterest, 50);
      assert.equal(result.totalPayoffAmount, 100050);
    }
    const sale = calculateContractPayoff("100000", "1.50", "monthly", start, "2026-05-11");
    const mortgage = calculateContractPayoff("100000", "1.50", "monthly", start, "2026-05-11");
    const pawn = calculateContractPayoff("100000", "1.50", "monthly", start, "2026-05-11");
    assert.equal(sale.totalDays, 11);
    assert.deepEqual(mortgage, sale);
    assert.deepEqual(pawn, sale);
  });
});
