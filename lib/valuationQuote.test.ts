import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareAppraisals, quoteCommission, quoteInterest, quoteLoanToValue } from "./valuationQuote";

describe("quoteLoanToValue", () => {
  it("เปลี่ยนช่วงตามประเภทและใช้ฐานที่เลือก", () => {
    const plot = quoteLoanToValue("sale_redemption", "450000", "1000000", "800000", "plot");
    assert.equal(plot.minAllowed, 400000);
    assert.equal(plot.maxAllowed, 500000);
    assert.equal(plot.isWithinRecommended, true);

    const mortgage = quoteLoanToValue("mortgage", "450000", "1000000", "800000", "plot");
    assert.equal(mortgage.minAllowed, 100000);
    assert.equal(mortgage.maxAllowed, 300000);
    assert.match(mortgage.warning, /นอกช่วง/);

    const nearby = quoteLoanToValue("pawn", "450000", "1000000", "800000", "nearby");
    assert.equal(nearby.minAllowed, 80000);
    assert.equal(nearby.maxAllowed, 560000);
    assert.equal(nearby.isWithinRecommended, true);
  });
});

describe("quoteInterest", () => {
  it("อัตรา 0.5 และ 60 ต่อเดือนอัปเดตยอดปิด และรายปีใช้ตัวหาร 365", () => {
    const half = quoteInterest("100000", "0.5", "2026-01-01", "2026-01-31", true);
    assert.equal(half?.dailyInterest, 16.67);
    assert.equal(half?.monthlyInterest, 500);
    assert.equal(half?.yearlyInterest, 6000);
    assert.equal(half?.totalDays, 31);
    assert.equal(half?.accruedInterest, 516.67);
    assert.equal(half?.totalPayoffAmount, 100516.67);

    const high = quoteInterest("100000", "60", "2026-01-01", "2026-01-31", true);
    assert.equal(high?.accruedInterest, 62000);
    assert.equal(high?.totalPayoffAmount, 162000);

    const yearly = quoteInterest("100000", "0.5", "2026-01-01", "2026-01-31", false);
    assert.equal(yearly?.totalDays, 31);
    assert.equal(yearly?.accruedInterest, 42.47);
    assert.equal(yearly?.yearlyInterest, 500);
  });
});

describe("compareAppraisals and quoteCommission", () => {
  it("เทียบราคาและคิดส่วนแบ่งเป็นบาทโดยไม่บล็อกเมื่อรวมไม่ครบ 100", () => {
    const comparison = compareAppraisals("1000000", "1200000");
    assert.equal(comparison?.difference, 200000);
    assert.equal(comparison?.higher, "nearby");

    const splits = quoteCommission("100000", ["40", "25"]);
    assert.deepEqual(splits.lines.map((line) => line.amount), [40000, 25000]);
    assert.match(splits.warning, /100/);

    const even = quoteCommission("100000", ["60", "40"]);
    assert.equal(even.warning, "");
  });
});
