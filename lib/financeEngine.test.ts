import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateInterestAndPayoff, validateLTV } from "./financeEngine";

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
    assert.equal(result.totalDays, 30);
    assert.equal(result.accruedInterest, 1500);
    assert.equal(result.totalPayoffAmount, 101500);
    assert.equal(result.monthlyEstimate, 1500);
  });

  it("อัตรารายปีใช้ตัวหาร 365", () => {
    const result = calculateInterestAndPayoff(100000, 12, "2026-01-01", "2027-01-01", false);
    assert.equal(result.totalDays, 365);
    assert.equal(result.accruedInterest, 12000);
    assert.equal(result.totalPayoffAmount, 112000);
    assert.equal(result.monthlyEstimate, 12000);
  });

  it("วันเดียวกันได้ดอกเบี้ย 0 และวันก่อนวันเริ่มไม่ติดลบ", () => {
    const same = calculateInterestAndPayoff(100000, 1.5, "2026-05-01", "2026-05-01");
    assert.equal(same.totalDays, 0);
    assert.equal(same.accruedInterest, 0);
    assert.equal(same.totalPayoffAmount, 100000);
    const earlier = calculateInterestAndPayoff(100000, 1.5, "2026-05-10", "2026-05-01");
    assert.equal(earlier.totalDays, 0);
    assert.equal(earlier.accruedInterest, 0);
  });
});
