import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALERT_DAYS_PER_MONTH, alertBeforeDays } from "./contractAlert";

describe("alertBeforeDays", () => {
  it("นับ 1 เดือนเป็น 30 วัน", () => {
    assert.equal(ALERT_DAYS_PER_MONTH, 30);
    assert.deepEqual(alertBeforeDays("2", "months"), { days: 60 });
    assert.deepEqual(alertBeforeDays("7", "days"), { days: 7 });
    assert.deepEqual(alertBeforeDays("0", "months"), { days: 0 });
  });

  it("ไม่รับทศนิยมหรือค่าติดลบ", () => {
    assert.deepEqual(alertBeforeDays("1.5", "months"), { error: "กรอกจำนวนเต็มตั้งแต่ 0" });
    assert.deepEqual(alertBeforeDays("-1", "days"), { error: "กรอกจำนวนเต็มตั้งแต่ 0" });
  });
});
