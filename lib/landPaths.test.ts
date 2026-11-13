import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { signedOutEntry } from "./landPaths";

describe("ทางเข้าเมื่อยังไม่เข้าสู่ระบบ", () => {
  it("หน้าแรกและหน้าสัญญาที่ดินไปที่เข้าสู่ระบบขายฝาก", () => {
    assert.equal(signedOutEntry("/"), "/login");
    assert.equal(signedOutEntry("/dashboard"), "/login");
    assert.equal(signedOutEntry("/contracts/new"), "/login");
    assert.equal(signedOutEntry("/valuation"), "/login");
    assert.equal(signedOutEntry("/settings/backup"), "/login");
  });

  it("หน้าร้านแอร์ยังไปที่เข้าสู่ระบบพนักงาน", () => {
    assert.equal(signedOutEntry("/receive"), "/staff-login");
    assert.equal(signedOutEntry("/attendance"), "/staff-login");
  });
});
