import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contractSnapshot } from "./contractFigures";

describe("ยอดสัญญาบนแดชบอร์ด", () => {
  it("วันเดียวกันนับ 1 วัน และเลยกำหนดแสดงดอกส่วนเกิน", () => {
    const same = contractSnapshot({
      principal: "100000",
      interestRate: "1.50",
      interestPeriodType: "monthly",
      startDate: "2026-05-01",
      endDate: "2026-05-01",
      alertBeforeDays: 30,
      today: "2026-05-01",
    });
    assert.equal(same.elapsedDays, 1);
    assert.equal(same.accruedToday, 50);
    assert.equal(same.payoffToday, 100050);
    assert.equal(same.overdueDays, 0);

    const late = contractSnapshot({
      principal: "100000",
      interestRate: "1.50",
      interestPeriodType: "monthly",
      startDate: "2026-05-01",
      endDate: "2026-05-01",
      alertBeforeDays: 15,
      today: "2026-05-11",
    });
    assert.equal(late.overdueDays, 10);
    assert.equal(late.alertMonthsLabel, "0.5");
    assert.equal(late.excessInterest, 500);
  });
});
